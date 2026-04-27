import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Plus, Pencil, Trash2, ChevronLeft, Loader2, ShieldAlert,
  ImagePlus, X, Globe, EyeOff, Sparkles, FolderOpen, BookOpen,
  FileText, CheckSquare, Eye, BadgeCheck, Building2, MapPin,
  Calendar, Clock, CheckCircle2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchCategories, createCategory, updateCategory, deleteCategory, toggleCategoryPublished,
  fetchDecks, createDeck, updateDeck, deleteDeck, toggleDeckPublished,
  fetchQuestionsForDeck, createQuestion, updateQuestion,
  replaceAnswers, deleteQuestion, uploadQuizImage, deleteQuizImage,
} from "@/lib/quiz-client";
import type { Category, Deck, Question } from "@/types/quiz";
import { PdfQuizGenerator } from "@/components/PdfQuizGenerator";
import { TextQuizImporter } from "@/components/TextQuizImporter";

// ── Blank form shapes ─────────────────────────────────────────────────────────

const blankCategoryForm = () => ({ name: "", description: "" });
const blankDeckForm = () => ({ name: "", subject: "", description: "", quiz_type: "objective" as "objective" | "subjective" });
const blankQuestionForm = () => ({
  text: "",
  explanation: "",
  answers: ["", "", "", ""],
  correctIndex: 0,
  marks: 2,
  // subjective-specific
  questionType: "text" as "text" | "checkbox",
  modelAnswer: "",
  checkboxOptions: [
    { text: "", is_correct: false },
    { text: "", is_correct: false },
    { text: "", is_correct: false },
    { text: "", is_correct: false },
  ] as { text: string; is_correct: boolean }[],
});

const LABELS = ["A", "B", "C", "D"];

// ── Main component ────────────────────────────────────────────────────────────

const AdminQuiz = () => {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Top-level section: quiz admin vs events admin
  const [section, setSection] = useState<"quiz" | "events">("quiz");
  const qc = useQueryClient();

  // Events admin queries
  const { data: unverifiedOrgs = [], isLoading: orgsLoading } = useQuery({
    queryKey: ["admin-unverified-orgs"],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("event_organizers").select("*").eq("verified", false).order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const verifyOrgMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("event_organizers").update({ verified: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "✅ Organisation verified!" });
      qc.invalidateQueries({ queryKey: ["admin-unverified-orgs"] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const { data: pendingEvents = [], isLoading: pendingLoading, error: pendingError, refetch: refetchEvents } = useQuery({
    queryKey: ["admin-pending-events"],
    enabled: !!user && isAdmin,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("events").select("*, event_organizers(name, verified)").eq("status", "pending").order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "published" | "rejected" }) => {
      const { error } = await (supabase as any).from("events").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast({ title: status === "published" ? "✅ Event published!" : "❌ Event rejected." });
      qc.invalidateQueries({ queryKey: ["admin-pending-events"] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  // View hierarchy: categories → decks → questions
  const [view, setView] = useState<"categories" | "decks" | "questions">("categories");

  // Category state
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Deck state
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);

  // Question state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Category dialog
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState(blankCategoryForm());
  const [savingCategory, setSavingCategory] = useState(false);

  // Deck dialog
  const [deckDialogOpen, setDeckDialogOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [deckForm, setDeckForm] = useState(blankDeckForm());
  const [savingDeck, setSavingDeck] = useState(false);

  // Quiz type picker
  const [quizTypeDialogOpen, setQuizTypeDialogOpen] = useState(false);

  // Question dialog
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionForm, setQuestionForm] = useState(blankQuestionForm());
  const [savingQuestion, setSavingQuestion] = useState(false);

  // PDF generator
  const [pdfGeneratorOpen, setPdfGeneratorOpen] = useState(false);

  // Text importer
  const [textImporterOpen, setTextImporterOpen] = useState(false);

  // Question image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Answer image state (one slot per answer option A–D)
  const [answerImageFiles, setAnswerImageFiles] = useState<(File | null)[]>([null, null, null, null]);
  const [answerImagePreviews, setAnswerImagePreviews] = useState<(string | null)[]>([null, null, null, null]);
  const [existingAnswerImageUrls, setExistingAnswerImageUrls] = useState<(string | null)[]>([null, null, null, null]);
  const answerImageInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);

  // ── Auth guard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  // ── Load categories ──────────────────────────────────────────────────────────
  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      setCategories(await fetchCategories());
    } catch (e: any) {
      toast({ title: "Error loading categories", description: e.message, variant: "destructive" });
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => { loadCategories(); }, []);

  // ── Load decks for a category ────────────────────────────────────────────────
  const loadDecksForCategory = async (category: Category) => {
    setSelectedCategory(category);
    setView("decks");
    setLoadingDecks(true);
    try {
      const all = await fetchDecks();
      setDecks(all.filter((d) => d.subject === category.name));
    } catch (e: any) {
      toast({ title: "Error loading decks", description: e.message, variant: "destructive" });
    } finally {
      setLoadingDecks(false);
    }
  };

  // ── Load questions for a deck ────────────────────────────────────────────────
  const loadQuestions = async (deck: Deck) => {
    setSelectedDeck(deck);
    setView("questions");
    setLoadingQuestions(true);
    try {
      setQuestions(await fetchQuestionsForDeck(deck.id));
    } catch (e: any) {
      toast({ title: "Error loading questions", description: e.message, variant: "destructive" });
    } finally {
      setLoadingQuestions(false);
    }
  };

  // ── Category dialog helpers ──────────────────────────────────────────────────
  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm(blankCategoryForm());
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name, description: cat.description ?? "" });
    setCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast({ title: "Category name is required", variant: "destructive" });
      return;
    }
    setSavingCategory(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryForm, editingCategory.name);
        toast({ title: "Category updated" });
      } else {
        await createCategory(categoryForm);
        toast({ title: "Category created" });
      }
      setCategoryDialogOpen(false);
      loadCategories();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!confirm(`Delete category "${cat.name}"? This will NOT delete its quizzes, but they will become uncategorised.`)) return;
    try {
      await deleteCategory(cat.id);
      toast({ title: "Category deleted" });
      loadCategories();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const handleToggleCategoryPublish = async (cat: Category) => {
    try {
      await toggleCategoryPublished(cat.id, !cat.is_published);
      toast({ title: cat.is_published ? "Category unpublished" : "Category published" });
      loadCategories();
    } catch (e: any) {
      toast({ title: "Failed to update", description: e.message, variant: "destructive" });
    }
  };

  // ── Deck dialog helpers ──────────────────────────────────────────────────────
  const openCreateDeck = () => {
    setQuizTypeDialogOpen(true);
  };

  const openCreateDeckWithType = (quizType: "objective" | "subjective") => {
    setEditingDeck(null);
    setDeckForm({ name: "", subject: selectedCategory?.name ?? "", description: "", quiz_type: quizType });
    setDeckDialogOpen(true);
  };

  const openEditDeck = (deck: Deck) => {
    setEditingDeck(deck);
    setDeckForm({ name: deck.name, subject: deck.subject ?? "", description: deck.description ?? "", quiz_type: deck.quiz_type ?? "objective" });
    setDeckDialogOpen(true);
  };

  const handleSaveDeck = async () => {
    if (!deckForm.name.trim()) {
      toast({ title: "Deck name is required", variant: "destructive" });
      return;
    }
    if (!deckForm.subject.trim()) {
      toast({ title: "You must select a category", variant: "destructive" });
      return;
    }
    setSavingDeck(true);
    try {
      if (editingDeck) {
        await updateDeck(editingDeck.id, deckForm);
        toast({ title: "Deck updated" });
      } else {
        await createDeck(deckForm);
        toast({ title: "Deck created" });
      }
      setDeckDialogOpen(false);
      if (selectedCategory) loadDecksForCategory(selectedCategory);
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingDeck(false);
    }
  };

  const handleTogglePublish = async (deck: Deck) => {
    try {
      await toggleDeckPublished(deck.id, !deck.is_published);
      setDecks((prev) =>
        prev.map((d) => d.id === deck.id ? { ...d, is_published: !d.is_published } : d)
      );
      toast({ title: deck.is_published ? "Deck unpublished" : "Deck published" });
    } catch (e: any) {
      toast({ title: "Failed to update", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteDeck = async (deck: Deck) => {
    if (!confirm(`Delete "${deck.name}" and all its questions?`)) return;
    try {
      await deleteDeck(deck.id);
      toast({ title: "Deck deleted" });
      if (selectedCategory) loadDecksForCategory(selectedCategory);
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  // ── Question dialog helpers ──────────────────────────────────────────────────
  const resetImageState = () => {
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    setAnswerImageFiles([null, null, null, null]);
    setAnswerImagePreviews([null, null, null, null]);
    setExistingAnswerImageUrls([null, null, null, null]);
    answerImageInputRefs.current.forEach((ref) => { if (ref) ref.value = ""; });
  };

  const openAddQuestion = () => {
    setEditingQuestion(null);
    setQuestionForm(blankQuestionForm());
    resetImageState();
    setQuestionDialogOpen(true);
  };

  const openEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    const answers = [...q.answers];
    while (answers.length < 4) answers.push({ id: "", question_id: q.id, text: "", is_correct: false });
    const correctIndex = answers.findIndex((a) => a.is_correct);

    // Detect subjective question type from stored answers:
    // - checkbox: has both correct and wrong options (is_correct mix)
    // - text: all stored answers are model answers (all is_correct true), or none stored
    const isSubjectiveDeck = selectedDeck?.quiz_type === "subjective";
    const hasWrongOptions = q.answers.some((a) => !a.is_correct);
    const questionType: "text" | "checkbox" =
      isSubjectiveDeck && hasWrongOptions ? "checkbox" : "text";

    const modelAnswer =
      isSubjectiveDeck && questionType === "text"
        ? (q.answers.find((a) => a.is_correct)?.text ?? "")
        : "";

    let checkboxOptions = blankQuestionForm().checkboxOptions;
    if (questionType === "checkbox") {
      checkboxOptions = q.answers.map((a) => ({ text: a.text, is_correct: a.is_correct }));
      while (checkboxOptions.length < 2) checkboxOptions.push({ text: "", is_correct: false });
    }

    setQuestionForm({
      text: q.text,
      explanation: q.explanation ?? "",
      answers: answers.slice(0, 4).map((a) => a.text),
      correctIndex: correctIndex >= 0 ? correctIndex : 0,
      marks: q.marks ?? 2,
      questionType,
      modelAnswer,
      checkboxOptions,
    });
    resetImageState();
    setExistingImageUrl(q.image_url ?? null);
    // Load existing answer image URLs (answers padded to 4)
    const paddedAnswers = [...q.answers];
    while (paddedAnswers.length < 4) paddedAnswers.push({ id: "", question_id: q.id, text: "", is_correct: false, image_url: null });
    setExistingAnswerImageUrls(paddedAnswers.slice(0, 4).map((a) => a.image_url ?? null));
    setQuestionDialogOpen(true);
  };

  const handleSaveQuestion = async () => {
    if (!questionForm.text.trim()) {
      toast({ title: "Question text is required", variant: "destructive" });
      return;
    }

    const isSubjective = selectedDeck?.quiz_type === "subjective";

    let answers: { text: string; is_correct: boolean; image_url?: string | null }[] = [];
    let replaceAnswersOnSave = false;

    if (!isSubjective) {
      // ── Objective MCQ ───────────────────────────────────────────────────────
      const filledAnswers = questionForm.answers.filter(
        (a, idx) => a.trim() || answerImageFiles[idx] || existingAnswerImageUrls[idx]
      );
      if (filledAnswers.length < 2) {
        toast({ title: "At least 2 answer choices are required", variant: "destructive" });
        return;
      }
      const resolvedAnswerImageUrls: (string | null)[] = await Promise.all(
        questionForm.answers.map(async (_, idx) => {
          const newFile = answerImageFiles[idx];
          const existingUrl = existingAnswerImageUrls[idx];
          if (newFile) {
            if (existingUrl) await deleteQuizImage(existingUrl).catch(() => {});
            return uploadQuizImage(newFile);
          }
          if (!answerImagePreviews[idx] && !existingUrl) return null;
          return existingUrl ?? null;
        })
      );
      answers = questionForm.answers
        .map((text, idx) => ({
          text: text.trim(),
          is_correct: idx === questionForm.correctIndex,
          image_url: resolvedAnswerImageUrls[idx] ?? null,
        }))
        .filter((a) => a.text || a.image_url);
      replaceAnswersOnSave = true;
    } else if (questionForm.questionType === "text") {
      // ── Subjective text — save model answer as a single is_correct answer ──
      if (!questionForm.modelAnswer.trim()) {
        toast({ title: "Model answer is required", variant: "destructive" });
        return;
      }
      answers = [{ text: questionForm.modelAnswer.trim(), is_correct: true }];
      replaceAnswersOnSave = true;
    } else {
      // ── Subjective checkbox ─────────────────────────────────────────────────
      const filled = questionForm.checkboxOptions.filter((o) => o.text.trim());
      if (filled.length < 2) {
        toast({ title: "At least 2 checkbox options are required", variant: "destructive" });
        return;
      }
      if (!filled.some((o) => o.is_correct)) {
        toast({ title: "At least one option must be marked as correct", variant: "destructive" });
        return;
      }
      answers = filled.map((o) => ({ text: o.text.trim(), is_correct: o.is_correct }));
      replaceAnswersOnSave = true;
    }

    setSavingQuestion(true);
    try {
      let finalImageUrl: string | null | undefined = undefined;
      if (imageFile) {
        if (existingImageUrl) await deleteQuizImage(existingImageUrl).catch(() => {});
        finalImageUrl = await uploadQuizImage(imageFile);
      } else if (existingImageUrl === null && editingQuestion?.image_url) {
        await deleteQuizImage(editingQuestion.image_url).catch(() => {});
        finalImageUrl = null;
      }

      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, {
          text: questionForm.text,
          explanation: isSubjective ? undefined : (questionForm.explanation || undefined),
          marks: isSubjective ? questionForm.marks : undefined,
          ...(finalImageUrl !== undefined ? { image_url: finalImageUrl } : {}),
        });
        if (replaceAnswersOnSave) await replaceAnswers(editingQuestion.id, answers);
        toast({ title: "Question updated" });
      } else {
        await createQuestion({
          deck_id: selectedDeck!.id,
          text: questionForm.text,
          explanation: isSubjective ? undefined : (questionForm.explanation || undefined),
          image_url: finalImageUrl ?? undefined,
          order: questions.length,
          marks: isSubjective ? questionForm.marks : undefined,
          answers,
        });
        toast({ title: "Question added" });
      }
      setQuestionDialogOpen(false);
      loadQuestions(selectedDeck!);
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (q: Question) => {
    if (!confirm("Delete this question?")) return;
    try {
      await deleteQuestion(q.id);
      toast({ title: "Question deleted" });
      setQuestions((prev) => prev.filter((x) => x.id !== q.id));
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  // ── Render guards ────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You need admin privileges to access this page.</p>
        <Button variant="outline" onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  // ── Breadcrumb ───────────────────────────────────────────────────────────────
  const breadcrumb = (
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <button
        className="hover:text-foreground transition-colors"
        onClick={() => setView("categories")}
      >
        Categories
      </button>
      {(view === "decks" || view === "questions") && selectedCategory && (
        <>
          <span>/</span>
          <button
            className="hover:text-foreground transition-colors"
            onClick={() => loadDecksForCategory(selectedCategory)}
          >
            {selectedCategory.name}
          </button>
        </>
      )}
      {view === "questions" && selectedDeck && (
        <>
          <span>/</span>
          <span className="text-foreground font-medium">{selectedDeck.name}</span>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-transparent p-6 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          {window.location.hostname.startsWith("admin.") ? (
            <a href="https://aceterus.com" className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
              <ChevronLeft className="w-4 h-4" /> Back to AceTerus Web
            </a>
          ) : (
            <Button variant="outline" size="sm" onClick={() => navigate("/profile")} className="gap-2 mb-3">
              <ChevronLeft className="w-4 h-4" /> Back to Profile
            </Button>
          )}
          <h1 className="text-3xl font-bold">Admin Tools</h1>
          {section === "quiz" && breadcrumb}
        </div>

        <div className="flex gap-2">
          {view === "categories" && (
            <Button onClick={openCreateCategory} className="gap-2">
              <Plus className="w-4 h-4" /> New Category
            </Button>
          )}

          {view === "decks" && (
            <>
              <Button variant="outline" onClick={() => setView("categories")} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
              <Button variant="outline" onClick={() => setPdfGeneratorOpen(true)} className="gap-2">
                <Sparkles className="w-4 h-4" /> Generate from PDF
              </Button>
              <Button onClick={openCreateDeck} className="gap-2">
                <Plus className="w-4 h-4" /> New Quiz
              </Button>
            </>
          )}

          {view === "questions" && (
            <>
              <Button
                variant="outline"
                onClick={() => selectedCategory && loadDecksForCategory(selectedCategory)}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
              {selectedDeck && (
                <Button
                  variant="outline"
                  onClick={() => navigate(`/quiz?preview=${selectedDeck.id}`)}
                  className="gap-2"
                >
                  <Eye className="w-4 h-4" /> Preview
                </Button>
              )}
              <Button variant="outline" onClick={() => setTextImporterOpen(true)} className="gap-2">
                <Sparkles className="w-4 h-4" /> Import from Text
              </Button>
              <Button onClick={openAddQuestion} className="gap-2">
                <Plus className="w-4 h-4" /> Add Question
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Section tabs ── */}
      <div className="flex gap-2 mb-8 border-b border-border pb-4">
        <Button variant={section === "quiz" ? "default" : "outline"} onClick={() => setSection("quiz")} className="gap-2">
          <BookOpen className="w-4 h-4" /> Quiz Admin
        </Button>
        <Button variant={section === "events" ? "default" : "outline"} onClick={() => setSection("events")} className="gap-2 relative">
          <BadgeCheck className="w-4 h-4" /> Events Admin
          {(unverifiedOrgs.length + pendingEvents.length) > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[1.1rem] h-[1.1rem] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
              {unverifiedOrgs.length + pendingEvents.length}
            </span>
          )}
        </Button>
      </div>

      {/* ── Events Admin ── */}
      {section === "events" && (
        <div className="space-y-6">

          {/* Organiser verification */}
          <div className="border-[2.5px] border-amber-400 rounded-[16px] shadow-[4px_4px_0_0_#D97706] bg-white overflow-hidden">
            <div className="bg-gradient-to-r from-[#D97706] to-[#F59E0B] p-5 flex items-center gap-3">
              <BadgeCheck className="w-5 h-5 text-white shrink-0" />
              <div className="flex-1">
                <h3 className="font-bold text-[17px] text-white">Verify Organisers</h3>
                <p className="text-white/70 text-[13px]">Grant the verified badge to registered organisations.</p>
              </div>
              <span className="px-3 py-1 rounded-xl bg-white/20 border-[2px] border-white/30 text-white font-extrabold text-[13px]">{unverifiedOrgs.length} pending</span>
            </div>
            {orgsLoading ? (
              <div className="p-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-amber-500" /></div>
            ) : unverifiedOrgs.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">All organisations are verified ✅</div>
            ) : (
              <div className="divide-y">
                {unverifiedOrgs.map((org: any) => (
                  <div key={org.id} className="p-4 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-[12px] bg-amber-100 border-[2px] border-amber-300 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[15px]">{org.name}</p>
                      <p className="text-[12px] text-muted-foreground capitalize">{org.type} · Registered {format(new Date(org.created_at), "d MMM yyyy")}</p>
                    </div>
                    <Button size="sm" onClick={() => verifyOrgMutation.mutate(org.id)} disabled={verifyOrgMutation.isPending} className="gap-1.5 bg-amber-400 hover:bg-amber-500 text-[#0F172A] border border-amber-600">
                      <BadgeCheck className="w-3.5 h-3.5" /> Verify
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Event review */}
          <div className="border-[2.5px] border-indigo-400 rounded-[16px] shadow-[4px_4px_0_0_#2E2BE5] bg-white overflow-hidden">
            <div className="bg-gradient-to-r from-[#2E2BE5] to-[#7C3AED] p-5 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
              <div className="flex-1">
                <h3 className="font-bold text-[17px] text-white">Event Review</h3>
                <p className="text-white/70 text-[13px]">Approve or reject organiser submissions.</p>
              </div>
              <span className="px-3 py-1 rounded-xl bg-white/20 border-[2px] border-white/30 text-white font-extrabold text-[13px]">{pendingEvents.length} pending</span>
            </div>
            {pendingLoading ? (
              <div className="p-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-indigo-500" /></div>
            ) : pendingError ? (
              <div className="p-6 text-center space-y-2">
                <p className="text-red-500 text-[13px] font-semibold">{(pendingError as Error).message}</p>
                <Button size="sm" variant="outline" onClick={() => refetchEvents()}>Retry</Button>
              </div>
            ) : pendingEvents.length === 0 ? (
              <div className="p-10 text-center space-y-2 text-muted-foreground">
                <p>All caught up — no pending events 🎉</p>
                <Button size="sm" variant="outline" onClick={() => refetchEvents()}>Refresh</Button>
              </div>
            ) : (
              <div className="divide-y">
                {pendingEvents.map((ev: any) => (
                  <div key={ev.id} className="p-5 space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-[15px]">{ev.title}</h4>
                        <Badge>{ev.type}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 text-[12px] text-muted-foreground">
                        {ev.event_organizers && (
                          <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{ev.event_organizers.name}{ev.event_organizers.verified && <BadgeCheck className="w-3 h-3 text-blue-500" />}</span>
                        )}
                        {ev.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{ev.location}</span>}
                        {ev.start_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Start: {format(new Date(ev.start_date), "d MMM yyyy, h:mm a")}</span>}
                        {ev.end_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />End: {format(new Date(ev.end_date), "d MMM yyyy, h:mm a")}</span>}
                        <span className="flex items-center gap-1 opacity-60"><Clock className="w-3 h-3" />Submitted {format(new Date(ev.created_at), "d MMM, h:mm a")}</span>
                      </div>
                      {ev.description && <p className="text-[13px] text-muted-foreground line-clamp-2">{ev.description}</p>}
                      {ev.registration_url && (
                        <a href={ev.registration_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] font-semibold text-blue-600 hover:underline">
                          <Eye className="w-3 h-3" /> Preview link
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => reviewMutation.mutate({ id: ev.id, status: "published" })} disabled={reviewMutation.isPending} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve &amp; Publish
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => reviewMutation.mutate({ id: ev.id, status: "rejected" })} disabled={reviewMutation.isPending} className="gap-1.5 text-red-600 border-red-300 hover:bg-red-50">
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Quiz Admin (existing content below) ── */}
      {section === "quiz" && <>

      {/* ── Categories view ── */}
      {view === "categories" && (
        <>
          {loadingCategories ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : categories.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium">No categories yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create a category first, then add quizzes inside it.
                </p>
                <Button className="mt-4 gap-2" onClick={openCreateCategory}>
                  <Plus className="w-4 h-4" /> New Category
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categories.map((cat) => (
                <Card
                  key={cat.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => loadDecksForCategory(cat)}
                >
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FolderOpen className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base truncate">{cat.name}</h3>
                        <Badge
                          variant={cat.is_published ? "default" : "outline"}
                          className={cat.is_published
                            ? "bg-green-500 hover:bg-green-500 text-white border-green-500"
                            : "text-muted-foreground"}
                        >
                          {cat.is_published ? "Published" : "Draft"}
                        </Badge>
                      </div>
                      {cat.description && (
                        <p className="text-sm text-muted-foreground truncate">{cat.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant={cat.is_published ? "outline" : "default"}
                        className={cat.is_published
                          ? "gap-1.5 text-muted-foreground"
                          : "gap-1.5 bg-green-500 hover:bg-green-600 text-white border-0"}
                        onClick={() => handleToggleCategoryPublish(cat)}
                      >
                        {cat.is_published
                          ? <><EyeOff className="w-3.5 h-3.5" /> Unpublish</>
                          : <><Globe className="w-3.5 h-3.5" /> Publish</>}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEditCategory(cat)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteCategory(cat)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Decks view ── */}
      {view === "decks" && (
        <>
          {loadingDecks ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : decks.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium">No quizzes in this category</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add a quiz to <span className="font-semibold">{selectedCategory?.name}</span>.
                </p>
                <Button className="mt-4 gap-2" onClick={openCreateDeck}>
                  <Plus className="w-4 h-4" /> New Quiz
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {decks.map((deck) => (
                <Card key={deck.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{deck.name}</h3>
                        <Badge
                          variant={deck.is_published ? "default" : "outline"}
                          className={deck.is_published
                            ? "bg-green-500 hover:bg-green-500 text-white border-green-500"
                            : "text-muted-foreground"}
                        >
                          {deck.is_published ? "Published" : "Draft"}
                        </Badge>
                        <Badge variant="outline" className={`text-xs capitalize ${deck.quiz_type === "subjective" ? "border-blue-400 text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`}>
                          {deck.quiz_type === "subjective" ? <><FileText className="w-3 h-3 inline mr-1" />Subjective</> : <><CheckSquare className="w-3 h-3 inline mr-1" />Objective</>}
                        </Badge>
                      </div>
                      {deck.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{deck.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {deck.question_count} question{deck.question_count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => loadQuestions(deck)}>
                        Manage Questions
                      </Button>
                      <Button
                        size="sm"
                        variant={deck.is_published ? "outline" : "default"}
                        className={deck.is_published
                          ? "gap-1.5 text-muted-foreground"
                          : "gap-1.5 bg-green-500 hover:bg-green-600 text-white border-0"}
                        onClick={() => handleTogglePublish(deck)}
                      >
                        {deck.is_published
                          ? <><EyeOff className="w-3.5 h-3.5" /> Unpublish</>
                          : <><Globe className="w-3.5 h-3.5" /> Publish</>}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEditDeck(deck)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteDeck(deck)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Questions view ── */}
      {view === "questions" && (
        <>
          {loadingQuestions ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : questions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No questions yet. Click "Add Question" to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <Card key={q.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <Badge variant="outline" className="shrink-0 mt-0.5">Q{idx + 1}</Badge>
                        <CardTitle className="text-base font-medium leading-snug">{q.text}</CardTitle>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" variant="ghost" onClick={() => openEditQuestion(q)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteQuestion(q)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-1.5">
                    {q.image_url && (
                      <img
                        src={q.image_url}
                        alt="Question image"
                        className="w-full max-h-48 object-contain rounded-lg border bg-muted/20 mb-3"
                      />
                    )}
                    {selectedDeck?.quiz_type === "subjective" ? (
                      <div className="flex items-center gap-3 mt-1">
                        <Badge variant="outline" className="border-blue-400 text-blue-600 dark:text-blue-400 text-sm font-semibold px-3 py-1">
                          [ {q.marks ?? 0} mark{(q.marks ?? 0) !== 1 ? "s" : ""} ]
                        </Badge>
                        <span className="text-xs text-muted-foreground italic">Open-ended — student writes answer</span>
                      </div>
                    ) : (
                      q.answers.map((a, i) => (
                        <div
                          key={a.id}
                          className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border ${
                            a.is_correct
                              ? "border-green-500 bg-green-50 dark:bg-green-500/10 text-green-800 dark:text-green-300"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          <span className="font-semibold shrink-0">{LABELS[i]}.</span>
                          <span>{a.text}</span>
                          {a.is_correct && (
                            <span className="ml-auto text-xs font-semibold text-green-600 dark:text-green-400">
                              Correct
                            </span>
                          )}
                        </div>
                      ))
                    )}
                    {q.explanation && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        Explanation: {q.explanation}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── PDF Quiz Generator ── */}
      <PdfQuizGenerator
        open={pdfGeneratorOpen}
        onOpenChange={setPdfGeneratorOpen}
        onSuccess={() => selectedCategory && loadDecksForCategory(selectedCategory)}
      />

      {/* ── Text Quiz Importer ── */}
      {selectedDeck && (
        <TextQuizImporter
          open={textImporterOpen}
          onOpenChange={setTextImporterOpen}
          deck={selectedDeck}
          existingCount={questions.length}
          onSuccess={() => selectedDeck && loadQuestions(selectedDeck)}
        />
      )}

      {/* ── Quiz Type Picker Dialog ── */}
      <Dialog open={quizTypeDialogOpen} onOpenChange={setQuizTypeDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Choose Quiz Type</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Select the type of quiz you want to create.
          </p>
          <div className="grid grid-cols-2 gap-3 py-2">
            <button
              onClick={() => { setQuizTypeDialogOpen(false); openCreateDeckWithType("objective"); }}
              className="flex flex-col items-center gap-3 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 p-5 text-center transition-all"
            >
              <CheckSquare className="w-9 h-9 text-primary" />
              <div>
                <p className="font-semibold text-sm">Objective</p>
                <p className="text-xs text-muted-foreground mt-0.5">Multiple choice (MCQ)</p>
              </div>
            </button>
            <button
              onClick={() => { setQuizTypeDialogOpen(false); openCreateDeckWithType("subjective"); }}
              className="flex flex-col items-center gap-3 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 p-5 text-center transition-all"
            >
              <FileText className="w-9 h-9 text-primary" />
              <div>
                <p className="font-semibold text-sm">Subjective</p>
                <p className="text-xs text-muted-foreground mt-0.5">Essay / open-ended (SPM)</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Category Dialog ── */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                placeholder="e.g. Biology, Mathematics, History"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Short description of this category"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCategory} disabled={savingCategory}>
              {savingCategory && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingCategory ? "Save Changes" : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Deck Dialog ── */}
      <Dialog open={deckDialogOpen} onOpenChange={setDeckDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDeck ? "Edit Quiz" : "New Quiz"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editingDeck && (
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border ${deckForm.quiz_type === "subjective" ? "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400" : "bg-muted/40 border-border text-muted-foreground"}`}>
                {deckForm.quiz_type === "subjective" ? <FileText className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                {deckForm.quiz_type === "subjective" ? "Subjective quiz (SPM essay style)" : "Objective quiz (MCQ)"}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Quiz Name *</Label>
              <Input
                placeholder="e.g. Biology Paper 1 2023"
                value={deckForm.name}
                onChange={(e) => setDeckForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select
                value={deckForm.subject}
                onValueChange={(val) => setDeckForm((f) => ({ ...f, subject: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categories.length === 0 && (
                <p className="text-xs text-destructive">
                  No categories exist. Create a category first.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Optional short description"
                value={deckForm.description}
                onChange={(e) => setDeckForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeckDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveDeck} disabled={savingDeck || categories.length === 0}>
              {savingDeck && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingDeck ? "Save Changes" : "Create Quiz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Question Dialog ── */}
      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? "Edit Question" : "Add Question"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Question *</Label>
              <Textarea
                placeholder="Enter your question here"
                value={questionForm.text}
                onChange={(e) => setQuestionForm((f) => ({ ...f, text: e.target.value }))}
                rows={3}
              />
            </div>

            {selectedDeck?.quiz_type === "subjective" ? (
              /* ── Subjective question form ── */
              <>
                {/* Question image */}
                <div className="space-y-2">
                  <Label>Question Image (optional)</Label>
                  {(imagePreview || existingImageUrl) && (
                    <div className="relative w-full rounded-lg overflow-hidden border bg-muted/20">
                      <img src={imagePreview ?? existingImageUrl!} alt="Question preview" className="w-full max-h-48 object-contain" />
                      <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); setExistingImageUrl(null); if (imageInputRef.current) imageInputRef.current.value = ""; }} className="absolute top-2 right-2 rounded-full bg-background/80 border p-1 hover:bg-destructive hover:text-destructive-foreground transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; setImageFile(file); setImagePreview(URL.createObjectURL(file)); }} />
                  {!imagePreview && !existingImageUrl && (
                    <Button type="button" variant="outline" className="w-full gap-2 border-dashed" onClick={() => imageInputRef.current?.click()}>
                      <ImagePlus className="w-4 h-4" /> Upload image
                    </Button>
                  )}
                </div>

                {/* Question type selector */}
                <div className="space-y-2">
                  <Label>Answer Type</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setQuestionForm((f) => ({ ...f, questionType: "text" }))}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${questionForm.questionType === "text" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                    >
                      Text Answer
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuestionForm((f) => ({ ...f, questionType: "checkbox" }))}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${questionForm.questionType === "checkbox" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                    >
                      Checkbox Options
                    </button>
                  </div>
                </div>

                {questionForm.questionType === "text" ? (
                  /* Text answer: model answer + preview */
                  <>
                    <div className="space-y-1.5">
                      <Label>Model Answer *</Label>
                      <Textarea
                        placeholder="Enter the expected model answer here"
                        value={questionForm.modelAnswer}
                        onChange={(e) => setQuestionForm((f) => ({ ...f, modelAnswer: e.target.value }))}
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">This is shown to students as a format reference and used by AI for grading.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" /> Student view (preview)
                      </Label>
                      <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10 p-3">
                        <Textarea disabled placeholder="Students will type their answer here..." rows={3} className="resize-none opacity-50 cursor-not-allowed bg-transparent" />
                      </div>
                    </div>
                  </>
                ) : (
                  /* Checkbox options */
                  <div className="space-y-2">
                    <Label>Options <span className="text-muted-foreground font-normal text-xs">(check the correct ones)</span></Label>
                    {questionForm.checkboxOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={opt.is_correct}
                          onChange={(e) => {
                            const opts = [...questionForm.checkboxOptions];
                            opts[idx] = { ...opts[idx], is_correct: e.target.checked };
                            setQuestionForm((f) => ({ ...f, checkboxOptions: opts }));
                          }}
                          className="accent-primary w-4 h-4 shrink-0 rounded"
                        />
                        <Input
                          placeholder={`Option ${idx + 1}`}
                          value={opt.text}
                          onChange={(e) => {
                            const opts = [...questionForm.checkboxOptions];
                            opts[idx] = { ...opts[idx], text: e.target.value };
                            setQuestionForm((f) => ({ ...f, checkboxOptions: opts }));
                          }}
                        />
                        {questionForm.checkboxOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setQuestionForm((f) => ({ ...f, checkboxOptions: f.checkboxOptions.filter((_, i) => i !== idx) }))}
                            className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5 border-dashed"
                      onClick={() => setQuestionForm((f) => ({ ...f, checkboxOptions: [...f.checkboxOptions, { text: "", is_correct: false }] }))}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add option
                    </Button>
                    <p className="text-xs text-muted-foreground">Check the box next to each correct option. Students must select all correct options to earn full marks.</p>
                  </div>
                )}

                {/* Marks */}
                <div className="space-y-1.5">
                  <Label>Marks for this question</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={questionForm.marks}
                      onChange={(e) => setQuestionForm((f) => ({ ...f, marks: Math.max(1, parseInt(e.target.value) || 1) }))}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">mark{questionForm.marks !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              </>
            ) : (
              /* ── Objective (MCQ) question form ── */
              <>
                <div className="space-y-3">
                  <Label>Answer Choices (select the correct one)</Label>
                  {questionForm.answers.map((answer, idx) => {
                    const preview = answerImagePreviews[idx];
                    const existing = existingAnswerImageUrls[idx];
                    const hasImage = preview || existing;
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="correctAnswer"
                            checked={questionForm.correctIndex === idx}
                            onChange={() => setQuestionForm((f) => ({ ...f, correctIndex: idx }))}
                            className="accent-primary w-4 h-4 shrink-0"
                          />
                          <span className="font-semibold text-sm w-5 shrink-0">{LABELS[idx]}.</span>
                          <Input
                            placeholder={`Answer ${LABELS[idx]}`}
                            value={answer}
                            onChange={(e) => {
                              const answers = [...questionForm.answers];
                              answers[idx] = e.target.value;
                              setQuestionForm((f) => ({ ...f, answers }));
                            }}
                          />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={(el) => { answerImageInputRefs.current[idx] = el; }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const files = [...answerImageFiles]; files[idx] = file;
                              const previews = [...answerImagePreviews]; previews[idx] = URL.createObjectURL(file);
                              setAnswerImageFiles(files);
                              setAnswerImagePreviews(previews);
                            }}
                          />
                          <button
                            type="button"
                            title={hasImage ? "Change image" : "Add image"}
                            onClick={() => answerImageInputRefs.current[idx]?.click()}
                            className={`shrink-0 rounded-md border p-1.5 transition-colors ${hasImage ? "border-primary bg-primary/10 text-primary" : "border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary"}`}
                          >
                            <ImagePlus className="w-4 h-4" />
                          </button>
                        </div>
                        {hasImage && (
                          <div className="ml-12 relative w-full max-w-[200px] rounded-lg overflow-hidden border bg-muted/20">
                            <img
                              src={preview ?? existing!}
                              alt={`Answer ${LABELS[idx]} image`}
                              className="w-full max-h-28 object-contain"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const files = [...answerImageFiles]; files[idx] = null;
                                const previews = [...answerImagePreviews]; previews[idx] = null;
                                const urls = [...existingAnswerImageUrls]; urls[idx] = null;
                                setAnswerImageFiles(files);
                                setAnswerImagePreviews(previews);
                                setExistingAnswerImageUrls(urls);
                                const ref = answerImageInputRefs.current[idx];
                                if (ref) ref.value = "";
                              }}
                              className="absolute top-1 right-1 rounded-full bg-background/80 border p-0.5 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <p className="text-xs text-muted-foreground">
                    Select the radio button next to the correct answer. Use 📷 to add an image to any option.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Explanation (optional)</Label>
                  <Textarea
                    placeholder="Explain why this answer is correct"
                    value={questionForm.explanation}
                    onChange={(e) => setQuestionForm((f) => ({ ...f, explanation: e.target.value }))}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Image (optional)</Label>
                  {(imagePreview || existingImageUrl) && (
                    <div className="relative w-full rounded-lg overflow-hidden border bg-muted/20">
                      <img
                        src={imagePreview ?? existingImageUrl!}
                        alt="Question preview"
                        className="w-full max-h-48 object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                          setExistingImageUrl(null);
                          if (imageInputRef.current) imageInputRef.current.value = "";
                        }}
                        className="absolute top-2 right-2 rounded-full bg-background/80 border p-1 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setImageFile(file);
                      setImagePreview(URL.createObjectURL(file));
                    }}
                  />
                  {!imagePreview && !existingImageUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2 border-dashed"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      <ImagePlus className="w-4 h-4" /> Upload image
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveQuestion} disabled={savingQuestion}>
              {savingQuestion && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingQuestion ? "Save Changes" : "Add Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </> /* end section === "quiz" */}

    </div>
  );
};

export default AdminQuiz;
