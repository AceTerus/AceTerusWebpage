import { useRef, useState } from "react";
import { FileText, Loader2, Sparkles, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RichTextEditor } from "@/components/RichTextEditor";
import { RichContent } from "@/components/RichContent";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { createDeck, createQuestion } from "@/lib/quiz-client";
import { supabase } from "@/integrations/supabase/client";

interface GeneratedAnswer {
  text: string;
  is_correct: boolean;
}

interface GeneratedQuestion {
  text: string;
  answers: GeneratedAnswer[];
  explanation?: string;
}

interface PdfQuizGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const LABELS = ["A", "B", "C", "D"];

export const PdfQuizGenerator = ({ open, onOpenChange, onSuccess }: PdfQuizGeneratorProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [deckName, setDeckName] = useState("");
  const [subject, setSubject] = useState("");
  const [numQuestions, setNumQuestions] = useState(10);

  const [status, setStatus] = useState<"idle" | "generating" | "done">("idle");
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<GeneratedQuestion[] | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const busy = status === "generating";

  const reset = () => {
    setPdfFile(null);
    setDeckName("");
    setSubject("");
    setNumQuestions(10);
    setStatus("idle");
    setSaving(false);
    setQuestions(null);
    setExpandedIdx(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setQuestions(null);
    setStatus("idle");
    if (!deckName) {
      const name = file.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
      setDeckName(name.charAt(0).toUpperCase() + name.slice(1));
    }
  };

  const handleGenerate = async () => {
    if (!pdfFile) {
      toast({ title: "No PDF selected", variant: "destructive" });
      return;
    }
    if (!deckName.trim()) {
      toast({ title: "Deck name required", variant: "destructive" });
      return;
    }

    setQuestions(null);
    setStatus("generating");

    try {
      const formData = new FormData();
      formData.append("pdf", pdfFile);
      formData.append("numQuestions", String(numQuestions));

      const { data, error } = await supabase.functions.invoke("pdf-quiz-generator", {
        body: formData,
      });
      if (error) throw new Error(error.message ?? "Edge function error");

      const generated: GeneratedQuestion[] = data.questions;
      if (!generated || generated.length === 0) {
        throw new Error("No questions returned. Try a different PDF.");
      }

      setQuestions(generated);
      setStatus("done");
      toast({ title: `${generated.length} questions generated!`, description: "Review and save the deck." });
    } catch (err: any) {
      setStatus("idle");
      toast({
        title: "Generation failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuestions((prev) => prev ? prev.filter((_, i) => i !== idx) : prev);
    if (expandedIdx === idx) setExpandedIdx(null);
  };

  const handleSave = async () => {
    if (!questions || questions.length === 0) return;
    setSaving(true);
    try {
      const deck = await createDeck({
        name: deckName.trim(),
        subject: subject.trim() || undefined,
        description: `Generated from PDF: ${pdfFile?.name}`,
      });
      for (let i = 0; i < questions.length; i++) {
        await createQuestion({
          deck_id: deck.id,
          text: questions[i].text,
          explanation: questions[i].explanation || undefined,
          order: i,
          answers: questions[i].answers,
        });
      }
      toast({ title: "Deck saved!", description: `"${deckName}" with ${questions.length} questions is ready.` });
      handleClose();
      onSuccess();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Generate Quiz from PDF
          </DialogTitle>
        </DialogHeader>

        {/* Config form */}
        <div className="space-y-4 py-1">
          {/* PDF upload */}
          <div className="space-y-2">
            <Label>Exam Paper PDF *</Label>
            {pdfFile ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-muted/30">
                <FileText className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm font-medium flex-1 truncate">{pdfFile.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {(pdfFile.size / 1024 / 1024).toFixed(1)} MB
                </span>
                <button
                  onClick={() => { setPdfFile(null); setQuestions(null); setStatus("idle"); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  disabled={busy}
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
                <span className="text-xs">Max 50 MB · Supports scanned &amp; digital PDFs · Malay &amp; English</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Deck Name *</Label>
              <Input
                placeholder="e.g. Biology Paper 1 2024"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input
                placeholder="e.g. Biology, Maths"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={busy}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Number of Questions — <span className="font-semibold">{numQuestions}</span></Label>
            <input
              type="range"
              min={5}
              max={30}
              step={5}
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className="w-full mt-2 accent-primary"
              disabled={busy}
            />
          </div>
        </div>

        {/* Status indicator */}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating questions with Gemini AI…
          </div>
        )}

        {/* Preview generated questions */}
        {questions && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{questions.length}</span> questions — review then save.
              </p>
              <Button variant="outline" size="sm" onClick={() => { setQuestions(null); setStatus("idle"); }} className="gap-1.5 text-xs">
                <X className="w-3.5 h-3.5" /> Regenerate
              </Button>
            </div>

            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {questions.map((q, idx) => (
                <Card key={idx} className="text-sm">
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="shrink-0 mt-0.5 text-xs">Q{idx + 1}</Badge>
                      <div className="flex-1 font-medium leading-snug text-sm">
                        {expandedIdx === idx ? (
                          <RichTextEditor
                            value={q.text}
                            onChange={(html) => {
                              setQuestions((prev) =>
                                prev ? prev.map((item, i) => (i === idx ? { ...item, text: html } : item)) : prev
                              );
                            }}
                            placeholder="Question text"
                          />
                        ) : (
                          <RichContent html={q.text} />
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
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
                      {q.answers.map((a, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${a.is_correct
                            ? "border-green-500 bg-green-50 dark:bg-green-500/10 text-green-800 dark:text-green-300"
                            : "border-border text-muted-foreground"
                            }`}
                        >
                          <span className="font-semibold shrink-0">{LABELS[i]}.</span>
                          <div className="flex-1">
                            <RichTextEditor
                              value={a.text}
                              onChange={(html) => {
                                setQuestions((prev) =>
                                  prev
                                    ? prev.map((item, qi) =>
                                      qi === idx
                                        ? {
                                          ...item,
                                          answers: item.answers.map((ans, ai) =>
                                            ai === i ? { ...ans, text: html } : ans
                                          ),
                                        }
                                        : item
                                    )
                                    : prev
                                );
                              }}
                              minimal
                              placeholder={`Answer ${LABELS[i]}`}
                            />
                          </div>
                          <button
                            type="button"
                            title={a.is_correct ? "Mark as wrong" : "Mark as correct"}
                            onClick={() => {
                              setQuestions((prev) =>
                                prev
                                  ? prev.map((item, qi) =>
                                    qi === idx
                                      ? {
                                        ...item,
                                        answers: item.answers.map((ans, ai) => ({
                                          ...ans,
                                          is_correct: ai === i,
                                        })),
                                      }
                                      : item
                                  )
                                  : prev
                              );
                            }}
                            className={`ml-auto font-semibold text-xs shrink-0 ${a.is_correct ? "text-green-600 dark:text-green-400" : "text-muted-foreground hover:text-green-600"}`}
                          >
                            {a.is_correct ? "✓ Correct" : "Set correct"}
                          </button>
                        </div>
                      ))}
                      {q.explanation && (
                        <div className="text-xs text-muted-foreground italic mt-1">
                          <span className="font-semibold not-italic">Explanation:</span> <RichContent html={q.explanation} inline className="text-xs" />
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={busy || saving}>
            Cancel
          </Button>
          {!questions ? (
            <Button onClick={handleGenerate} disabled={busy || !pdfFile || !deckName.trim()} className="gap-2">
              {busy
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                : <><Sparkles className="w-4 h-4" /> Generate Quiz</>}
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving || questions.length === 0} className="gap-2">
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : `Save Deck (${questions.length} questions)`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
