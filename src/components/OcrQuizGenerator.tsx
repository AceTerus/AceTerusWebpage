import { useRef, useState } from "react";
import {
  ChevronDown, ChevronUp, FileText, ImagePlus, Loader2, ScanText, Trash2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createDeck, createQuestion, uploadQuizImage } from "@/lib/quiz-client";
import { processPdfWithOcr } from "@/utils/ocrPdfProcessor";
import type { GeneratedQuestion } from "@/utils/inBrowserQuizGenerator";

interface OcrQuizGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  categoryName?: string;
}

interface OcrQuestion extends GeneratedQuestion {
  imageFile?: File;
  imagePreview?: string;
}

type Step = "configure" | "ocr" | "ai" | "review";

const LABELS = ["A", "B", "C", "D"];

// Strip OCR control characters before sending to edge function.
// Uses Unicode escapes (\uNNNN) instead of hex (\xNN) to satisfy no-control-regex.
function sanitizeOcrText(text: string): string {
  return text
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export const OcrQuizGenerator = ({ open, onOpenChange, onSuccess, categoryName }: OcrQuizGeneratorProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // One hidden file input for image uploads; we track which question it targets
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageTargetIdx, setImageTargetIdx] = useState<number | null>(null);

  const [step, setStep] = useState<Step>("configure");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [deckName, setDeckName] = useState("");
  const [language, setLanguage] = useState<"eng" | "msa">("eng");

  const [ocrPage, setOcrPage] = useState(0);
  const [ocrTotal, setOcrTotal] = useState(0);

  const [questions, setQuestions] = useState<OcrQuestion[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setStep("configure");
    setPdfFile(null);
    setDeckName("");
    setLanguage("eng");
    setOcrPage(0);
    setOcrTotal(0);
    setQuestions([]);
    setExpandedIdx(null);
    setImageTargetIdx(null);
    setSaving(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleClose = () => {
    if (step === "ocr" || step === "ai") return;
    reset();
    onOpenChange(false);
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast({ title: "Invalid file", description: "Please select a PDF file.", variant: "destructive" });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "File too large", description: "PDF must be under 50 MB.", variant: "destructive" });
      return;
    }
    setPdfFile(file);
    if (!deckName) {
      const name = file.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
      setDeckName(name.charAt(0).toUpperCase() + name.slice(1));
    }
  };

  // Triggered when user picks an image for a question
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || imageTargetIdx === null) return;
    const preview = URL.createObjectURL(file);
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === imageTargetIdx ? { ...q, imageFile: file, imagePreview: preview } : q
      )
    );
    // Reset input so the same file can be re-selected later
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const openImagePicker = (idx: number) => {
    setImageTargetIdx(idx);
    imageInputRef.current?.click();
  };

  const removeImage = (idx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, imageFile: undefined, imagePreview: undefined } : q))
    );
  };

  const handleStart = async () => {
    if (!pdfFile || !deckName.trim()) return;

    try {
      // ── Phase 1: Tesseract OCR — scan every page ─────────────────────────────
      setStep("ocr");
      setOcrPage(0);
      setOcrTotal(0);

      const ocrPages = await processPdfWithOcr(pdfFile, language, (_s, page, total) => {
        setOcrPage(page);
        setOcrTotal(total);
      });

      if (ocrPages.length === 0) throw new Error("No pages could be read from this PDF.");

      const rawText = ocrPages
        .map((p) => `[Page ${p.pageNum}]\n${p.text}`)
        .join("\n\n");

      const cleanText = sanitizeOcrText(rawText);

      // ── Phase 2: AI extracts ALL questions from the OCR text ─────────────────
      setStep("ai");

      const { data, error } = await supabase.functions.invoke("text-quiz-parser", {
        body: { text: cleanText },
      });

      if (error) throw new Error(error.message);
      if (!data?.questions?.length) {
        throw new Error("No questions found in the scanned text. Make sure the PDF contains numbered MCQ questions.");
      }

      setQuestions(data.questions as OcrQuestion[]);
      setStep("review");
      toast({
        title: `${data.questions.length} questions extracted`,
        description: "Review, add images if needed, then save.",
      });
    } catch (err: unknown) {
      setStep("configure");
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast({ title: "Processing failed", description: msg, variant: "destructive" });
    }
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
    if (expandedIdx === idx) setExpandedIdx(null);
  };

  const handleSave = async () => {
    if (!questions.length) return;
    setSaving(true);
    try {
      const deck = await createDeck({
        name: deckName.trim(),
        subject: categoryName,
        description: `Generated via OCR from PDF: ${pdfFile?.name}`,
      });

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        let imageUrl: string | undefined;
        if (q.imageFile) {
          try { imageUrl = await uploadQuizImage(q.imageFile); } catch { /* non-fatal */ }
        }
        await createQuestion({
          deck_id: deck.id,
          text: q.text,
          explanation: q.explanation,
          image_url: imageUrl,
          order: i,
          answers: q.answers,
        });
      }

      toast({ title: "Deck saved!", description: `"${deckName}" — ${questions.length} questions added.` });
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const isProcessing = step === "ocr" || step === "ai";

  return (
    <>
      {/* Hidden image file input */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageChange}
      />

      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanText className="w-5 h-5 text-primary" />
              Import from Scanned PDF (OCR)
            </DialogTitle>
          </DialogHeader>

          {/* ── Configure ── */}
          {step === "configure" && (
            <div className="space-y-4 py-1">
              <div className="space-y-2">
                <Label>PDF File *</Label>
                {pdfFile ? (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-muted/30">
                    <FileText className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-sm font-medium flex-1 truncate">{pdfFile.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {(pdfFile.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                    <button
                      onClick={() => { setPdfFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center gap-2 px-4 py-8 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-muted/20 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <FileText className="w-8 h-8" />
                    <span className="text-sm font-medium">Click to upload PDF</span>
                    <span className="text-xs">Max 50 MB · All pages scanned · Malay &amp; English</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={handlePdfChange}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Deck Name *</Label>
                <Input
                  placeholder="e.g. Biology Paper 1 2024"
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>OCR Language</Label>
                <div className="flex gap-2">
                  {(["eng", "msa"] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setLanguage(lang)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        language === lang
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {lang === "eng" ? "English" : "Bahasa Melayu"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── OCR progress ── */}
          {step === "ocr" && (
            <div className="py-8 space-y-6">
              <div className="flex flex-col items-center gap-3 text-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="font-medium text-sm">
                  {ocrTotal > 0 ? `Scanning page ${ocrPage} of ${ocrTotal}…` : "Initialising OCR…"}
                </p>
                <p className="text-xs text-muted-foreground">Do not close this window.</p>
              </div>
              {ocrTotal > 0 && (
                <div className="space-y-1.5">
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${(ocrPage / ocrTotal) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-right">{ocrPage} / {ocrTotal} pages</p>
                </div>
              )}
            </div>
          )}

          {/* ── AI parsing ── */}
          {step === "ai" && (
            <div className="py-12 flex flex-col items-center gap-4 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
              <div>
                <p className="font-medium text-sm">AI is checking and arranging questions…</p>
                <p className="text-xs text-muted-foreground mt-1">This usually takes 10–30 seconds.</p>
              </div>
            </div>
          )}

          {/* ── Review ── */}
          {step === "review" && questions.length > 0 && (
            <div className="space-y-3 py-1">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{questions.length}</span> questions extracted — add images if needed, then save.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setStep("configure"); setQuestions([]); }}
                  className="gap-1.5 text-xs"
                >
                  <X className="w-3.5 h-3.5" /> Restart
                </Button>
              </div>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {questions.map((q, idx) => (
                  <Card key={idx} className="text-sm">
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="shrink-0 mt-0.5 text-xs">Q{idx + 1}</Badge>
                        <p className="flex-1 font-medium leading-snug">{q.text}</p>
                        <div className="flex gap-1 shrink-0 items-center ml-2">
                          {/* Add / change image */}
                          <button
                            onClick={() => openImagePicker(idx)}
                            title={q.imagePreview ? "Change image" : "Add image"}
                            className={`rounded p-1 transition-colors ${
                              q.imagePreview
                                ? "border border-primary text-primary"
                                : "border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
                            }`}
                          >
                            <ImagePlus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                            className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                          >
                            {expandedIdx === idx ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleRemoveQuestion(idx)}
                            className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </CardHeader>

                    {expandedIdx === idx && (
                      <CardContent className="pt-0 pb-3 px-4 space-y-1.5">
                        {/* Image preview */}
                        {q.imagePreview && (
                          <div className="relative mb-2">
                            <img
                              src={q.imagePreview}
                              alt="Question image"
                              className="w-full max-h-48 object-contain rounded-lg border bg-muted/20"
                            />
                            <button
                              onClick={() => removeImage(idx)}
                              className="absolute top-1 right-1 rounded-full bg-background border p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {/* Answer options */}
                        {q.answers.map((a, i) => (
                          <div
                            key={i}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${
                              a.is_correct
                                ? "border-green-500 bg-green-50 dark:bg-green-500/10 text-green-800 dark:text-green-300"
                                : "border-border text-muted-foreground"
                            }`}
                          >
                            <span className="font-semibold shrink-0">{LABELS[i]}.</span>
                            <span className="flex-1">{a.text}</span>
                            {a.is_correct && (
                              <span className="font-semibold text-green-600 dark:text-green-400">Correct</span>
                            )}
                          </div>
                        ))}

                        {q.explanation && (
                          <p className="text-xs text-muted-foreground italic mt-1">
                            Explanation: {q.explanation}
                          </p>
                        )}
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isProcessing || saving}>
              Cancel
            </Button>
            {step === "configure" && (
              <Button onClick={handleStart} disabled={!pdfFile || !deckName.trim()} className="gap-2">
                <ScanText className="w-4 h-4" /> Scan &amp; Generate
              </Button>
            )}
            {step === "review" && (
              <Button onClick={handleSave} disabled={saving || questions.length === 0} className="gap-2">
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  : `Save Deck (${questions.length} questions)`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
