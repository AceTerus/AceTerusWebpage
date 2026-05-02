import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  BarChart2, Bookmark, BookmarkCheck, BookOpen, BookOpenCheck, CalendarDays,
  CheckCircle2, ChevronLeft, ChevronRight, Flame, GraduationCap,
  Layers, Loader2, PenLine, ScanLine, Search, Sparkles, Star, Target, Trophy, X, XCircle, Zap, Coins,
} from "lucide-react";
const StreakFireOverlay = lazy(() => import("@/components/StreakFireOverlay"));
import { GoalSheet } from "@/components/GoalSheet";
import { TodayGoalBanner } from "@/components/TodayGoalBanner";
import QuizAnalysis from "@/components/QuizAnalysis";
import type { PerformanceAnalysis } from "@/components/QuizAnalysis";
import PerformanceTracker from "@/components/PerformanceTracker";
import type { SubjectAttempt } from "@/components/PerformanceTracker";
import { BossRaidArena } from "@/components/BossRaidArena";
import Logo from "@/assets/logo.webp";
import { useAuth } from "@/hooks/useAuth";
import { useStreak } from "@/hooks/useStreak";
import { useMascot } from "@/context/MascotContext";
import { fetchCategories, fetchDecks, fetchQuiz } from "@/lib/quiz-client";
import type { Category, Deck, Question, QuizPayload } from "@/types/quiz";
import { cn, vibrate, triggerConfetti } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedNumber } from "@/components/AnimatedNumber";

type QuizView = "categories" | "decks" | "taking";

/* ── brand colours ──────────────────────────────────────────────────────── */
const C = {
  cyan: "#3BD6F5", blue: "#2F7CFF", indigo: "#2E2BE5",
  ink: "#0F172A", skySoft: "#DDF3FF", blueSoft: "#C8DEFF",
  indigoSoft: "#D6D4FF", cloud: "#F3FAFF", sun: "#FFD65C", pop: "#FF7A59",
};

/* ── shared styles ──────────────────────────────────────────────────────── */
const DISPLAY = "font-['Baloo_2'] tracking-tight";
const STICKER = "border-[3px] border-[#0F172A] rounded-[28px] shadow-[4px_4px_0_0_#0F172A] bg-white";
const STICKER_CARD = STICKER + " transition-all duration-200 ease-out hover:-translate-y-2 hover:shadow-[7px_8px_0_0_#0F172A]";
const STICKER_SM = "border-[2.5px] border-[#0F172A] rounded-[18px] shadow-[4px_4px_0_0_#0F172A] bg-white transition-all duration-200 ease-out";
const SIDE_CARD = "border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[3px_3px_0_0_#0F172A] bg-white p-5";
const BTN = "inline-flex items-center gap-2.5 font-extrabold font-['Baloo_2'] border-[3px] border-[#0F172A] rounded-full px-6 py-3.5 shadow-[4px_4px_0_0_#0F172A] transition-all duration-150 cursor-pointer hover:-translate-y-1 hover:shadow-[6px_7px_0_0_#0F172A] active:translate-y-0.5 active:shadow-[2px_2px_0_0_#0F172A] disabled:opacity-40 disabled:pointer-events-none";
const BTN_SM = "inline-flex items-center gap-2 font-bold font-['Baloo_2'] border-[2.5px] border-[#0F172A] rounded-full px-4 py-2 shadow-[4px_4px_0_0_#0F172A] transition-all duration-150 cursor-pointer hover:-translate-y-0.5 hover:shadow-[5px_6px_0_0_#0F172A] active:translate-y-0.5 active:shadow-[2px_2px_0_0_#0F172A] text-sm font-semibold disabled:opacity-40 disabled:pointer-events-none";
const TAG = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-[2.5px] border-[#0F172A] font-extrabold text-xs";

const OPTS = ["A", "B", "C", "D", "E", "F"];

const getCategoryImage = (name: string): string | null => {
  const lower = name.toLowerCase();
  if (lower.includes("biologi"))   return "/quiz-pics/biology.jpg";
  if (lower.includes("kimia"))     return "/quiz-pics/chemistry.jpg";
  if (lower.includes("fizik"))     return "/quiz-pics/physics.jpg";
  if (lower.includes("sejarah"))   return "/quiz-pics/history.jpg";
  if (lower.includes("history"))   return "/quiz-pics/history.jpg";
  if (lower.includes("biology"))   return "/quiz-pics/biology.jpg";
  if (lower.includes("chemistry")) return "/quiz-pics/chemistry.jpg";
  if (lower.includes("physics"))   return "/quiz-pics/physics.jpg";
  if (lower.includes("general"))   return "/quiz-pics/general.jpg";
  return null;
};

const Quiz = () => {
  const { user, isLoading: authLoading, isAdmin, aceCoins, setAceCoins } = useAuth();
  const { streak, updateStreak } = useStreak();
  const { pushMessage } = useMascot();
  useEffect(() => {
    document.title = "Quizzes – AceTerus";
    return () => { document.title = "AceTerus – AI Tutor & Quiz Platform for Malaysian Students"; };
  }, []);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const previewDeckId = searchParams.get("preview");

  const [categories, setCategories] = useState<Category[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [deckError, setDeckError] = useState<string | null>(null);
  const [view, setView] = useState<QuizView>("categories");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const [quizPayload, setQuizPayload] = useState<QuizPayload | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answeredMap, setAnsweredMap] = useState<Map<number, string>>(new Map());
  const [sessionComplete, setSessionComplete] = useState(false);
  const [submitConfirmPending, setSubmitConfirmPending] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [showBookmarkPanel, setShowBookmarkPanel] = useState(false);
  const bookmarkPanelRef = useRef<HTMLDivElement>(null);
  const [fireOverlay, setFireOverlay] = useState<{ show: boolean; newStreak: number }>({ show: false, newStreak: 0 });
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<PerformanceAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [subjectHistory, setSubjectHistory] = useState<SubjectAttempt[]>([]);
  const [currentQuizScore, setCurrentQuizScore] = useState<number | null>(null);
  const [currentQuizCategory, setCurrentQuizCategory] = useState<string | null>(null);
  const [showGoalSheet, setShowGoalSheet] = useState(false);
  const [subjectiveAnswerMap, setSubjectiveAnswerMap] = useState<Map<number, string>>(new Map());
  const [checkboxAnswerMap, setCheckboxAnswerMap] = useState<Map<number, Set<string>>>(new Map());
  const [subjectiveGrading, setSubjectiveGrading] = useState(false);
  const [subjectiveResults, setSubjectiveResults] = useState<Map<number, { marksEarned: number; maxMarks: number; isCorrect: boolean; feedback: string }>>(new Map());
  const [categorySearch, setCategorySearch] = useState("");
  const [categorySort, setCategorySort] = useState<"az" | "questions" | "quizzes">("az");
  const [deckSearch, setDeckSearch] = useState("");
  const [mode, setMode] = useState<"standard" | "boss_raid">("standard");
  const raidIdParam = searchParams.get("raid");

  useEffect(() => {
    if (raidIdParam) {
      setMode("boss_raid");
    }
  }, [raidIdParam]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const refAiAnalysis   = useRef<HTMLDivElement>(null);
  const refAnswerReview = useRef<HTMLDivElement>(null);
  const [activeReviewTab, setActiveReviewTab] = useState<"ai" | "tracker" | "review" | null>(null);
  const scrollTo = (ref: React.RefObject<HTMLDivElement>) =>
    setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (authLoading || !user || !isAdmin || !previewDeckId) return;
    let cancelled = false;
    setQuizLoading(true);
    setQuizError(null);
    fetchQuiz(previewDeckId)
      .then((payload) => {
        if (cancelled) return;
        const shuffled = [...payload.questions].sort(() => Math.random() - 0.5);
        setQuizPayload({ ...payload, questions: shuffled });
        setActiveDeck(payload.deck);
        setCurrentIndex(0);
        setAnsweredMap(new Map());
        setSessionComplete(false);
        setSubmitConfirmPending(false);
        setFlaggedQuestions(new Set());
        setShowBookmarkPanel(false);
        setAnalysisResult(null);
        setAnalysisError(null);
        setAnalysisLoading(false);
        setView("taking");
      })
      .catch((e: any) => { if (!cancelled) setQuizError(e.message ?? "Failed to load the quiz deck."); })
      .finally(() => { if (!cancelled) setQuizLoading(false); });
    return () => { cancelled = true; };
  }, [authLoading, user, isAdmin, previewDeckId]);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    setLoadingDecks(true);
    setDeckError(null);
    Promise.all([fetchCategories(), fetchDecks(true)])
      .then(([cats, data]) => {
        if (!cancelled) {
          setCategories(cats.filter((c) => c.is_published));
          setDecks(data ?? []);
        }
      })
      .catch((e) => { if (!cancelled) setDeckError(e.message ?? "Failed to load quizzes."); })
      .finally(() => { if (!cancelled) setLoadingDecks(false); });
    return () => { cancelled = true; };
  }, [authLoading, user]);

  useEffect(() => {
    if (!activeDeck) return;
    localStorage.setItem(`quiz_bookmarks_${activeDeck.id}`, JSON.stringify(Array.from(flaggedQuestions)));
  }, [flaggedQuestions, activeDeck]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bookmarkPanelRef.current && !bookmarkPanelRef.current.contains(e.target as Node))
        setShowBookmarkPanel(false);
    };
    if (showBookmarkPanel) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showBookmarkPanel]);

  useEffect(() => {
    if (view !== "taking" || sessionComplete) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in a textarea or input
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        vibrate(30);
        setCurrentIndex((p) => Math.min((quizPayload?.questions?.length ?? 1) - 1, p + 1));
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        vibrate(30);
        setCurrentIndex((p) => Math.max(0, p - 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [view, sessionComplete, quizPayload?.questions?.length]);

  /* ── derived ── */
  const deckCount = decks.length;
  const totalQuestions = useMemo(() => decks.reduce((acc, d) => acc + (d.question_count ?? 0), 0), [decks]);
  const subjectCount = categories.length;

  const enrichedCategories = useMemo(() => categories.map((cat) => {
    const catDecks = decks.filter((d) => (d.subject ?? "General") === cat.name);
    return { ...cat, decks: catDecks, totalQuestions: catDecks.reduce((acc, d) => acc + (d.question_count ?? 0), 0) };
  }), [categories, decks]);

  const visibleCategories = useMemo(() => {
    let list = enrichedCategories;
    if (categorySearch.trim()) {
      const q = categorySearch.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q));
    }
    if (categorySort === "questions") list = [...list].sort((a, b) => b.totalQuestions - a.totalQuestions);
    else if (categorySort === "quizzes") list = [...list].sort((a, b) => b.decks.length - a.decks.length);
    else list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [enrichedCategories, categorySearch, categorySort]);

  const filteredDecks = useMemo(() => {
    let list = decks.filter((d) => (d.subject ?? "General") === selectedCategory);
    if (deckSearch.trim()) {
      const q = deckSearch.toLowerCase();
      list = list.filter((d) => d.name.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q));
    }
    return list;
  }, [decks, selectedCategory, deckSearch]);

  const questions: Question[] = quizPayload?.questions ?? [];
  const currentQuestion = questions[currentIndex];
  const selectedAnswerId = answeredMap.get(currentIndex) ?? null;
  const isSubjective = quizPayload?.deck.quiz_type === "subjective";

  const answeredCount = isSubjective
    ? questions.filter((q, idx) => {
        const isCheckbox = q.answers.some((a) => !a.is_correct);
        if (isCheckbox) return (checkboxAnswerMap.get(idx)?.size ?? 0) > 0;
        return (subjectiveAnswerMap.get(idx) ?? "").trim().length > 0;
      }).length
    : answeredMap.size;

  const correctCount = useMemo(() => {
    if (!sessionComplete) return 0;
    if (isSubjective) { let c = 0; subjectiveResults.forEach((r) => { if (r.isCorrect) c++; }); return c; }
    return questions.reduce((acc, q, idx) => {
      const selected = answeredMap.get(idx);
      const correct = q.answers.find((a) => a.is_correct);
      return acc + (selected === correct?.id ? 1 : 0);
    }, 0);
  }, [sessionComplete, isSubjective, answeredMap, subjectiveResults, questions]);

  const totalMaxMarks = useMemo(() => (isSubjective ? questions.reduce((acc, q) => acc + (q.marks ?? 1), 0) : 0), [isSubjective, questions]);
  const totalMarksEarned = useMemo(() => { let t = 0; subjectiveResults.forEach((r) => { t += r.marksEarned; }); return t; }, [subjectiveResults]);
  const accuracy = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;
  const isLastQuestion = currentIndex >= questions.length - 1;
  const progressPercent = questions.length ? (answeredCount / questions.length) * 100 : 0;
  const sortedBookmarks = useMemo(() => Array.from(flaggedQuestions).sort((a, b) => a - b), [flaggedQuestions]);

  /* ── handlers ── */
  const resetSessionState = () => {
    setCurrentIndex(0); setAnsweredMap(new Map()); setSessionComplete(false);
    setSubmitConfirmPending(false); setFlaggedQuestions(new Set()); setShowBookmarkPanel(false);
    setAnalysisResult(null); setAnalysisError(null); setAnalysisLoading(false);
    setSubjectiveAnswerMap(new Map()); setCheckboxAnswerMap(new Map());
    setSubjectiveGrading(false); setSubjectiveResults(new Map());
    setReviewIndex(0);
    setActiveReviewTab(null);
  };

  const handleStartQuiz = async (deck: Deck) => {
    setActiveDeck(deck); setQuizLoading(true); setQuizError(null);
    try {
      const payload = await fetchQuiz(deck.id);
      const shuffled = [...payload.questions].sort(() => Math.random() - 0.5);
      setQuizPayload({ ...payload, questions: shuffled });
      resetSessionState();
      try {
        const saved = localStorage.getItem(`quiz_bookmarks_${deck.id}`);
        if (saved) setFlaggedQuestions(new Set(JSON.parse(saved) as number[]));
      } catch { /* ignore */ }
      setView("taking");
    } catch (e: any) { setQuizError(e.message ?? "Failed to load the quiz deck."); }
    finally { setQuizLoading(false); }
  };

  const handleAnswerSelect = (choiceId: string) => {
    if (sessionComplete) return;
    vibrate(30);
    setAnsweredMap((prev) => { const n = new Map(prev); n.set(currentIndex, choiceId); return n; });
    setSubmitConfirmPending(false);
  };

  const handleSubjectiveAnswer = (text: string) => {
    if (sessionComplete) return;
    setSubjectiveAnswerMap((prev) => { const n = new Map(prev); if (text.trim()) n.set(currentIndex, text); else n.delete(currentIndex); return n; });
  };

  const handleCheckboxToggle = (answerId: string) => {
    if (sessionComplete) return;
    setCheckboxAnswerMap((prev) => {
      const n = new Map(prev);
      const sel = new Set(n.get(currentIndex) ?? []);
      if (sel.has(answerId)) sel.delete(answerId); else sel.add(answerId);
      n.set(currentIndex, sel); return n;
    });
  };

  const handleNextQuestion = () => { vibrate(30); if (!isLastQuestion) setCurrentIndex((p) => p + 1); };
  const handlePrevQuestion = () => { vibrate(30); setCurrentIndex((p) => Math.max(0, p - 1)); };

  const handleSubmitQuiz = async () => {
    vibrate([40, 50, 40]);
    setSessionComplete(true); setShowBookmarkPanel(false); setSubmitConfirmPending(false);
    setSessionComplete(true); setShowBookmarkPanel(false); setSubmitConfirmPending(false); setActiveReviewTab("review");
    const snapshotQuestions = quizPayload?.questions ?? [];
    const snapshotAnsweredMap = new Map(answeredMap);
    const { data: { session } } = await supabase.auth.getSession();

    if (activeDeck) {
      const result = await updateStreak(activeDeck.id);
      if (result?.success && result.newStreak) {
        setFireOverlay({ show: true, newStreak: result.newStreak });
        const milestones = [7, 14, 30, 60, 100];
        if (milestones.includes(result.newStreak)) {
           triggerConfetti();
           pushMessage(`🎉 ${result.newStreak}-day streak! You're on fire — I'm so proud of you! ⭐`, 'high', 'celebrating');
        } else {
          pushMessage(`Great job finishing the quiz! Your streak is now ${result.newStreak} days! 🔥`, 'normal', 'happy');
        }
      } else if (!result?.success) {
        pushMessage(`Nice work! You've already kept your ${streak}-day streak today. Keep it up! ⭐`, 'normal', 'happy');
      }
    }

    if (quizPayload?.deck.quiz_type === "subjective") {
      const snapshotSubjective = new Map(subjectiveAnswerMap);
      const snapshotCheckbox = new Map(checkboxAnswerMap);
      const resultsMap = new Map<number, { marksEarned: number; maxMarks: number; isCorrect: boolean; feedback: string }>();
      const textItems: { idx: number; q: typeof snapshotQuestions[0] }[] = [];
      snapshotQuestions.forEach((q, idx) => {
        const isCheckbox = q.answers.some((a) => !a.is_correct);
        if (isCheckbox) {
          const selected = snapshotCheckbox.get(idx) ?? new Set<string>();
          const correctIds = new Set(q.answers.filter((a) => a.is_correct).map((a) => a.id));
          const allCorrectSelected = correctIds.size > 0 && [...correctIds].every((id) => selected.has(id));
          const noWrongSelected = [...selected].every((id) => correctIds.has(id));
          const isCorrect = allCorrectSelected && noWrongSelected;
          const maxMarks = q.marks ?? 1;
          resultsMap.set(idx, { marksEarned: isCorrect ? maxMarks : 0, maxMarks, isCorrect, feedback: isCorrect ? "All correct options selected." : "Some options were incorrect or missing." });
        } else { textItems.push({ idx, q }); }
      });
      if (textItems.length > 0) {
        setSubjectiveGrading(true);
        try {
          const items = textItems.map(({ idx, q }) => ({ question: q.text, userAnswer: snapshotSubjective.get(idx) ?? "", modelAnswers: q.answers.filter((a) => a.is_correct).map((a) => a.text), maxMarks: q.marks ?? 1 }));
          const { data: gradeData, error: gradeError } = await supabase.functions.invoke("subjective-quiz-grader", { body: { items } });
          if (!gradeError && Array.isArray(gradeData?.results)) {
            (gradeData.results as any[]).forEach((r: any, i: number) => {
              const { idx, q } = textItems[i];
              resultsMap.set(idx, { marksEarned: r.marksEarned ?? 0, maxMarks: q.marks ?? 1, isCorrect: r.isCorrect ?? false, feedback: r.feedback ?? "" });
            });
          }
        } catch { /* non-fatal */ } finally { setSubjectiveGrading(false); }
      }
      setSubjectiveResults(resultsMap);

      // Reward ACE Coins based on correct answers
      const correctSubjCount = Array.from(resultsMap.values()).filter(r => r.isCorrect).length;
      if (correctSubjCount > 0 && session) {
         const coinsEarned = correctSubjCount * 5;
         try {
            const { data: profile, error: selectError } = await (supabase as any).from('profiles').select('*').eq('user_id', session.user.id).single();
            if (selectError) throw selectError;
            const currentCoins = (profile as any)?.ace_coins || 0;
            const { error: updateError } = await (supabase as any).from('profiles').update({ ace_coins: currentCoins + coinsEarned }).eq('user_id', session.user.id);
            if (updateError) throw updateError;
            setAceCoins(prev => prev + coinsEarned);
            pushMessage(`You earned ${coinsEarned} ACE Coins for your correct answers! 💰`, 'normal', 'happy');
         } catch (e) { console.error("Coin error", e); }
      }
      return;
    }

    const questionsData = snapshotQuestions.map((q) => {
      const selectedId = snapshotAnsweredMap.get(snapshotQuestions.indexOf(q)) ?? null;
      const correctAnswer = q.answers.find((a) => a.is_correct);
      const wasSkipped = selectedId === null;
      const isCorrect = !wasSkipped && selectedId === correctAnswer?.id;
      return { text: q.text, is_correct: isCorrect, was_skipped: wasSkipped };
    });
    const snapshotCorrect = questionsData.filter((q) => q.is_correct).length;
    const snapshotWrong = questionsData.filter((q) => !q.is_correct && !q.was_skipped).length;
    const snapshotSkipped = questionsData.filter((q) => q.was_skipped).length;
    const snapshotTotal = snapshotQuestions.length;
    const snapshotScore = snapshotTotal > 0 ? Math.round((snapshotCorrect / snapshotTotal) * 100 * 100) / 100 : 0;
    const deckCategory = activeDeck?.subject ?? "General";

    const { data: { session: authSession2 } } = await supabase.auth.getSession();
    if (authSession2 && activeDeck) {
      await supabase.from("quiz_performance_results" as any).insert({ user_id: authSession2.user.id, deck_id: activeDeck.id, deck_name: activeDeck.name, category: deckCategory, score: snapshotScore, correct_count: snapshotCorrect, wrong_count: snapshotWrong, skipped_count: snapshotSkipped, total_count: snapshotTotal, questions_data: questionsData });
      
      if (snapshotTotal > 0 && snapshotScore === 1) {
         triggerConfetti();
      }

      if (snapshotCorrect > 0) {
         const coinsEarned = snapshotCorrect * 5;
         try {
            const { data: profile, error: selectError } = await (supabase as any).from('profiles').select('*').eq('user_id', authSession2.user.id).single();
            if (selectError) throw selectError;
            const currentCoins = (profile as any)?.ace_coins || 0;
            const { error: updateError } = await (supabase as any).from('profiles').update({ ace_coins: currentCoins + coinsEarned }).eq('user_id', authSession2.user.id);
            if (updateError) throw updateError;
            setAceCoins(prev => prev + coinsEarned);
            pushMessage(`You earned ${coinsEarned} ACE Coins for your correct answers! 💰`, 'normal', 'happy');
         } catch (e) { console.error("Coin error", e); }
      }
    }
    if (authSession2 && activeDeck) {
      const { data: subjectRows } = await supabase.from("quiz_performance_results" as any).select("score, completed_at, deck_name").eq("user_id", authSession2.user.id).eq("category", deckCategory).order("completed_at", { ascending: false }).limit(10);
      const pastRows = (subjectRows ?? []).slice(1);
      setSubjectHistory(pastRows as unknown as SubjectAttempt[]);
      setCurrentQuizScore(snapshotScore);
      setCurrentQuizCategory(deckCategory);
    }
    if (authSession2 && activeDeck) {
      setAnalysisLoading(true); setAnalysisError(null);
      try {
        const { data: historyRows } = await supabase.from("quiz_performance_results" as any).select("deck_name, category, score, correct_count, total_count, completed_at").eq("user_id", authSession2.user.id).order("completed_at", { ascending: false }).limit(10);
        const current = { deck_name: activeDeck.name, category: deckCategory, score: snapshotScore, correct_count: snapshotCorrect, wrong_count: snapshotWrong, skipped_count: snapshotSkipped, total_count: snapshotTotal, questions_data: questionsData };
        const { data: resData, error: fnError } = await supabase.functions.invoke("quiz-performance-analyzer", { body: { current, history: historyRows ?? [] } });
        if (fnError) { let msg = fnError.message ?? "Edge function error"; try { const body = await (fnError as any).context?.json(); if (body?.error) msg = body.error; } catch { /* ignore parse error */ } throw new Error(msg); }
        const analysis = resData.analysis;
        setAnalysisResult(analysis);
        if (analysis?.weak_areas?.length > 0) pushMessage(`Ace AI spotted it: you can improve on "${analysis.weak_areas[0]}". Check your analysis below! 🧠`, 'normal', 'happy');
        else if (analysis?.trend === 'improving') pushMessage(`AI says you're improving! Keep up this momentum — you're getting sharper every quiz! 📈`, 'normal', 'happy');
        const { data: latestRow, error: selectError } = await supabase.from("quiz_performance_results" as any).select("id").eq("user_id", authSession2.user.id).eq("deck_id", activeDeck.id).order("completed_at", { ascending: false }).limit(1).single();
        if (!selectError && latestRow) await supabase.from("quiz_performance_results" as any).update({ ai_analysis: analysis }).eq("id", (latestRow as any).id);
      } catch (e: any) { setAnalysisError(e.message ?? "Could not generate analysis."); }
      finally { setAnalysisLoading(false); }
    }
  };

  const runAiAnalysis = async () => {
    if (analysisLoading || analysisResult) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !activeDeck) return;
    const deckCategory = activeDeck.subject ?? "General";
    const questionsData = questions.map((q, idx) => {
      const selectedId = answeredMap.get(idx) ?? null;
      const correctAnswer = q.answers.find((a) => a.is_correct);
      const wasSkipped = selectedId === null;
      const isCorrect = !wasSkipped && selectedId === correctAnswer?.id;
      return { text: q.text, is_correct: isCorrect, was_skipped: wasSkipped };
    });
    const correct  = questionsData.filter((q) => q.is_correct).length;
    const wrong    = questionsData.filter((q) => !q.is_correct && !q.was_skipped).length;
    const skipped  = questionsData.filter((q) => q.was_skipped).length;
    const total    = questions.length;
    const score    = total > 0 ? Math.round((correct / total) * 10000) / 100 : 0;
    setAnalysisLoading(true); setAnalysisError(null);
    try {
      const { data: historyRows } = await supabase.from("quiz_performance_results" as any).select("deck_name, category, score, correct_count, total_count, completed_at").eq("user_id", session.user.id).order("completed_at", { ascending: false }).limit(10);
      const current = { deck_name: activeDeck.name, category: deckCategory, score, correct_count: correct, wrong_count: wrong, skipped_count: skipped, total_count: total, questions_data: questionsData };
      const { data: resData, error: fnError } = await supabase.functions.invoke("quiz-performance-analyzer", { body: { current, history: historyRows ?? [] } });
      if (fnError) { let msg = fnError.message ?? "Edge function error"; try { const body = await (fnError as any).context?.json(); if (body?.error) msg = body.error; } catch { /* ignore parse error, keep original message */ } throw new Error(msg); }
      const analysis = resData.analysis;
      setAnalysisResult(analysis);
      if (analysis?.weak_areas?.length > 0) pushMessage(`Ace AI spotted it: you can improve on "${analysis.weak_areas[0]}". Check your analysis! 🧠`, 'normal', 'happy');
      const { data: latestRow } = await supabase.from("quiz_performance_results" as any).select("id").eq("user_id", session.user.id).eq("deck_id", activeDeck.id).order("completed_at", { ascending: false }).limit(1).single();
      if (latestRow?.id) await supabase.from("quiz_performance_results" as any).update({ ai_analysis: analysis }).eq("id", latestRow.id);
    } catch (e: any) { setAnalysisError(e.message ?? "Could not generate analysis."); }
    finally { setAnalysisLoading(false); }
  };

  const handleToggleFlag = (index: number) => {
    setFlaggedQuestions((prev) => { const n = new Set(prev); if (n.has(index)) n.delete(index); else n.add(index); return n; });
  };
  const handleJumpToBookmark = (idx: number) => { setCurrentIndex(idx); setShowBookmarkPanel(false); };

  /* ── auth guard ── */
  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" style={{ color: C.blue }} /></div>;
  if (!user) return null;

  const isInActiveQuiz = view === "taking" && !sessionComplete && !quizLoading && !!questions.length;
  const unansweredCount = questions.length - answeredCount;

  const statCards = [
    { Icon: Flame,        value: streak.toString(),                         label: "day streak", bg: C.pop,    ic: "#fff" },
    { Icon: BookOpen,     value: loadingDecks ? "…" : deckCount.toString(), label: "quizzes",    bg: C.blue,   ic: "#fff" },
    { Icon: Target,       value: loadingDecks ? "…" : totalQuestions.toString(), label: "questions", bg: C.cyan, ic: C.ink },
    { Icon: GraduationCap,value: loadingDecks ? "…" : subjectCount.toString(), label: "subjects",  bg: C.indigo, ic: "#fff" },
  ];

  return (
    <div
      className="font-['Nunito'] relative text-[#0F172A] min-h-screen pb-24"
      style={{
        backgroundImage: `
          radial-gradient(900px 500px at 90% -5%,  rgba(59,214,245,.40), transparent 60%),
          radial-gradient(700px 400px at -5% 15%,  rgba(47,124,255,.35), transparent 60%),
          radial-gradient(600px 500px at 50% 100%, rgba(46,43,229,.20), transparent 60%)
        `,
        backgroundColor: C.cloud,
      }}
    >
      {/* grain */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[1] opacity-[0.04] mix-blend-multiply"
        style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")" }} />

      {/* keyframes */}
      <style>{`
        @keyframes atl-float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes atl-float2 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)}  }
        .atl-float  { animation: atl-float  4s ease-in-out infinite; }
        .atl-float2 { animation: atl-float2 5s ease-in-out infinite .6s; }
        @keyframes atl-fade-up {
          from { opacity:0; transform:translateY(28px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .atl-fade-up { animation: atl-fade-up 0.55s cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes atl-pop {
          0%   { opacity:0; transform:scale(0.75) rotate(-3deg); }
          65%  { transform:scale(1.06) rotate(1deg); }
          100% { opacity:1; transform:scale(1) rotate(0deg); }
        }
        .atl-pop { animation: atl-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) both; }
        @keyframes atl-q-in {
          from { opacity:0; transform:translateX(20px); }
          to   { opacity:1; transform:translateX(0); }
        }
        .atl-q-in { animation: atl-q-in 0.4s cubic-bezier(0.22,1,0.36,1) both; }
        .atl-logo { transition:transform 0.2s ease; }
        .atl-logo:hover { transform:rotate(8deg) scale(1.12); transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        .q-nav-btn { transition: transform 0.15s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.15s; }
        .q-nav-btn:hover { transform: translateY(-2px); }
      `}</style>

      <div className="relative z-[2] max-w-6xl mx-auto px-5 pt-8">

        {/* ── COMPACT HEADER ── */}
        <div className="flex items-center justify-between gap-4 mb-7 atl-fade-up">
          <div className="flex items-center gap-4">
            <img src={Logo} alt="AceTerus" className="w-12 h-12 rounded-[16px] border-[3px] border-[#0F172A] shadow-[4px_4px_0_0_#0F172A] shrink-0 atl-logo" />
            <div>
              <h1 className={`${DISPLAY} font-extrabold text-3xl md:text-4xl leading-none`}>Quiz Arena 🎯</h1>
              <p className="text-sm font-medium text-slate-500 mt-0.5 hidden sm:block">Practice with authentic exam papers</p>
            </div>
          </div>
          {/* Right: streak badge + mobile Goals button */}
          <div className="flex items-center gap-2 shrink-0">
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] font-extrabold text-sm bg-white"
              style={{ color: C.ink }}
            >
              <Coins className="w-4 h-4 text-amber-500" />
              <span className={`${DISPLAY}`}><AnimatedNumber value={aceCoins} /> ACE</span>
            </div>
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] font-extrabold text-sm"
              style={{ background: C.pop, color: "#fff" }}
            >
              <Flame className="w-4 h-4" />
              <span className={`${DISPLAY}`}>{streak}</span>
            </div>
            <button
              onClick={() => setShowGoalSheet(true)}
              className={`${BTN_SM} text-white lg:hidden`}
              style={{ background: C.blue }}
            >
              <CalendarDays className="w-4 h-4" /> Goals
            </button>
          </div>
        </div>

        {/* ── MODE TABS ── */}
        <div className="flex items-center gap-3 mb-8 atl-fade-up" style={{ animationDelay: '50ms' }}>
          <button
            onClick={() => setMode("standard")}
            className={cn(
              "flex-1 md:flex-none px-6 py-3 rounded-full border-[3px] border-[#0F172A] shadow-[4px_4px_0_0_#0F172A] font-extrabold font-['Baloo_2'] text-base transition-all hover:-translate-y-1 hover:shadow-[6px_7px_0_0_#0F172A]",
              mode === "standard" ? "text-white" : "bg-white text-[#0F172A]"
            )}
            style={mode === "standard" ? { background: C.blue } : {}}
          >
            📚 Standard Quizzes
          </button>
          <button
            onClick={() => setMode("boss_raid")}
            className={cn(
              "flex-1 md:flex-none px-6 py-3 rounded-full border-[3px] border-[#0F172A] shadow-[4px_4px_0_0_#0F172A] font-extrabold font-['Baloo_2'] text-base transition-all hover:-translate-y-1 hover:shadow-[6px_7px_0_0_#0F172A]",
              mode === "boss_raid" ? "text-white" : "bg-white text-[#0F172A]"
            )}
            style={mode === "boss_raid" ? { background: "#9333ea" } : {}}
          >
            💀 Boss Raids
          </button>
        </div>

        {mode === "boss_raid" ? (
          <BossRaidArena
            initialRaidId={raidIdParam}
            aceCoins={aceCoins}
            onCoinsChanged={(newAmount) => setAceCoins(newAmount)}
            onNavigate={(path) => navigate(path)}
          />
        ) : (
          <div className="lg:grid lg:grid-cols-[1fr_272px] lg:gap-6 lg:items-start">

          {/* ════════════════════════════════════════════════════════════
              LEFT: MAIN CONTENT
          ════════════════════════════════════════════════════════════ */}
          <div className="min-w-0">

            {/* Stats strip — inside left column so sidebar aligns with it */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {statCards.map(({ Icon, value, label, bg, ic }, i) => (
                <div
                  key={label}
                  className={`${STICKER_SM} p-3.5 flex items-center gap-2.5 atl-fade-up hover:-translate-y-1 hover:shadow-[5px_6px_0_0_#0F172A]`}
                  style={{ animationDelay: `${80 + i * 60}ms` }}
                >
                  <div className="w-9 h-9 rounded-[12px] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center shrink-0" style={{ background: bg }}>
                    <Icon className="w-4.5 h-4.5" style={{ color: ic }} />
                  </div>
                  <div>
                    <div className={`${DISPLAY} font-extrabold text-xl leading-none`}>{value}</div>
                    <div className="font-bold text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide">{label}</div>
                  </div>
                </div>
              ))}
            </div>

            {deckError && (
              <div className={`${STICKER_SM} p-5 mb-5 border-l-[6px]`} style={{ borderLeftColor: C.pop }}>
                <p className={`${DISPLAY} font-extrabold text-lg`} style={{ color: C.pop }}>Couldn't load quizzes</p>
                <p className="font-medium text-slate-600 mt-1">{deckError}</p>
              </div>
            )}

            {/* Mobile: goal banner (sidebar handles desktop) */}
            <div className="lg:hidden mb-4">
              <TodayGoalBanner onSetGoal={() => setShowGoalSheet(true)} />
            </div>

            {/* ── VIEW: CATEGORIES ── */}
            {view === "categories" && (
              <div className="mb-10">

                {/* Header row */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`${DISPLAY} font-extrabold text-2xl`}>Subjects</h2>
                  <div className="flex items-center gap-2">
                    {!loadingDecks && enrichedCategories.length > 0 && (
                      <span className="text-xs font-bold text-slate-400 hidden sm:block">
                        {visibleCategories.length} of {enrichedCategories.length}
                      </span>
                    )}
                    {/* Mobile OMR chip */}
                    <button
                      className={`${BTN_SM} text-white lg:hidden shrink-0`}
                      style={{ background: C.indigo }}
                      onClick={() => navigate("/omr-scan")}
                    >
                      <ScanLine className="w-3.5 h-3.5" /> OMR
                    </button>
                  </div>
                </div>

                {/* Search + sort bar */}
                {!loadingDecks && enrichedCategories.length > 0 && (
                  <div className="flex gap-2 mb-4">
                    {/* Search */}
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      <input
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        placeholder="Search subjects…"
                        className="w-full pl-9 pr-3 py-2 text-sm font-semibold border-[2px] border-[#0F172A] rounded-full shadow-[2px_2px_0_0_#0F172A] bg-white outline-none focus:shadow-[3px_3px_0_0_#0F172A] transition-shadow placeholder:text-slate-400"
                      />
                    </div>
                    {/* Sort pills */}
                    {(["az", "quizzes", "questions"] as const).map((s) => {
                      const labels = { az: "A–Z", quizzes: "Most quizzes", questions: "Most questions" };
                      const active = categorySort === s;
                      return (
                        <button
                          key={s}
                          onClick={() => setCategorySort(s)}
                          className="shrink-0 px-3 py-2 rounded-full border-[2px] border-[#0F172A] text-xs font-extrabold font-['Baloo_2'] transition-all cursor-pointer"
                          style={{
                            background: active ? C.indigo : "white",
                            color: active ? "white" : C.ink,
                            boxShadow: active ? "2px 2px 0 0 #0F172A" : "1px 1px 0 0 #0F172A",
                          }}
                        >
                          {labels[s]}
                        </button>
                      );
                    })}
                  </div>
                )}

                {loadingDecks ? (
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[3px_3px_0_0_#0F172A] bg-white overflow-hidden">
                        <Skeleton className="h-[100px] w-full rounded-none" />
                        <div className="p-4 space-y-2">
                          <Skeleton className="h-4 w-28 rounded-lg" />
                          <Skeleton className="h-3 w-20 rounded-lg" />
                          <div className="flex gap-1 pt-1">
                            <Skeleton className="h-5 w-16 rounded-full" />
                            <Skeleton className="h-5 w-16 rounded-full" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : enrichedCategories.length === 0 ? (
                  <div className={`${STICKER_SM} p-10 text-center`}>
                    <p className={`${DISPLAY} font-extrabold text-xl`}>No quizzes yet!</p>
                    <p className="font-medium text-slate-500 mt-1">Check back soon — content is coming.</p>
                  </div>
                ) : visibleCategories.length === 0 ? (
                  <div className={`${STICKER_SM} p-8 text-center`}>
                    <p className={`${DISPLAY} font-extrabold text-base`}>No subjects match "{categorySearch}"</p>
                    <button onClick={() => setCategorySearch("")} className="mt-3 text-xs font-bold underline" style={{ color: C.blue }}>Clear search</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visibleCategories.map((cat, i) => {
                      const catImage = getCategoryImage(cat.name);
                      const accentColors = [C.cyan, C.blue, C.indigo, C.sun, C.pop, "#22c55e", "#f59e0b", "#ec4899"];
                      const accent = accentColors[i % accentColors.length];
                      const isEmpty = cat.decks.length === 0;
                      return (
                        <button
                          key={cat.name}
                          disabled={isEmpty}
                          onClick={() => { if (!isEmpty) { setSelectedCategory(cat.name); setView("decks"); } }}
                          className={`text-left border-[2.5px] border-[#0F172A] rounded-[20px] bg-white overflow-hidden atl-fade-up flex flex-col group
                            ${isEmpty ? "opacity-60 cursor-not-allowed shadow-[2px_2px_0_0_#0F172A]" : "shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-1 hover:shadow-[6px_7px_0_0_#0F172A] cursor-pointer"} transition-all duration-200`}
                          style={{ animationDelay: `${i * 40}ms` }}
                        >
                          {/* Cover image / accent banner */}
                          <div className="relative h-[100px] w-full shrink-0 border-b-[2.5px] border-[#0F172A]">
                            {catImage
                              ? <img src={catImage} alt={cat.name} className="absolute inset-0 w-full h-full object-cover" />
                              : <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent}cc, ${accent})` }} />
                            }
                            <div className="absolute inset-0 bg-black/20" />
                            {/* Subject icon badge */}
                            <div
                              className="absolute bottom-3 left-3 w-10 h-10 rounded-[12px] border-[2px] border-white flex items-center justify-center shadow-[2px_2px_0_0_rgba(0,0,0,0.3)]"
                              style={{ background: accent }}
                            >
                              <BookOpenCheck className="w-5 h-5" style={{ color: accent === C.sun ? C.ink : "#fff" }} />
                            </div>
                          </div>

                          {/* Card body */}
                          <div className="p-4 flex flex-col flex-1">
                            <p className={`${DISPLAY} font-extrabold text-base leading-tight mb-1`}>{cat.name}</p>
                            {isEmpty ? (
                              <p className="text-xs font-semibold text-slate-400">Coming soon</p>
                            ) : (
                              <>
                                <p className="text-xs font-semibold text-slate-400 mb-3">
                                  {cat.decks.length} {cat.decks.length === 1 ? "quiz" : "quizzes"} · {cat.totalQuestions.toLocaleString()} Qs
                                </p>
                                {/* Deck pills */}
                                <div className="flex flex-wrap gap-1 mt-auto">
                                  {cat.decks.slice(0, 3).map((d) => (
                                    <span
                                      key={d.id}
                                      className="px-2 py-0.5 rounded-full border-[1.5px] border-[#0F172A] text-[10px] font-bold truncate max-w-[90px]"
                                      style={{ background: C.skySoft }}
                                    >
                                      {d.name}
                                    </span>
                                  ))}
                                  {cat.decks.length > 3 && (
                                    <span className="px-2 py-0.5 rounded-full border-[1.5px] border-[#0F172A] text-[10px] font-bold" style={{ background: C.indigoSoft }}>
                                      +{cat.decks.length - 3}
                                    </span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── VIEW: DECKS ── */}
            {view === "decks" && (
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <button className={`${BTN_SM} bg-white`} onClick={() => { setView("categories"); setDeckSearch(""); }}>
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <h2 className={`${DISPLAY} font-extrabold text-2xl`}>{selectedCategory}</h2>
                  {!loadingDecks && (
                    <span className="ml-auto text-xs font-bold text-slate-400">
                      {filteredDecks.length} quiz{filteredDecks.length !== 1 ? "zes" : ""}
                    </span>
                  )}
                </div>

                {quizError && (
                  <div className={`${STICKER_SM} p-5 mb-4`} style={{ borderLeft: `6px solid ${C.pop}` }}>
                    <p className="font-bold" style={{ color: C.pop }}>{quizError}</p>
                  </div>
                )}

                {/* Deck search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    value={deckSearch}
                    onChange={(e) => setDeckSearch(e.target.value)}
                    placeholder="Search quizzes…"
                    className="w-full pl-9 pr-3 py-2 text-sm font-semibold border-[2px] border-[#0F172A] rounded-full shadow-[2px_2px_0_0_#0F172A] bg-white outline-none focus:shadow-[3px_3px_0_0_#0F172A] transition-shadow placeholder:text-slate-400"
                  />
                </div>

                {filteredDecks.length === 0 ? (
                  <div className={`${STICKER_SM} p-8 text-center`}>
                    {deckSearch ? (
                      <>
                        <p className={`${DISPLAY} font-extrabold text-base`}>No quizzes match "{deckSearch}"</p>
                        <button onClick={() => setDeckSearch("")} className="mt-2 text-xs font-bold underline" style={{ color: C.blue }}>Clear</button>
                      </>
                    ) : (
                      <p className={`${DISPLAY} font-extrabold text-base`}>No quizzes here yet.</p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredDecks.map((deck, i) => (
                      <div key={deck.id} className={`${STICKER_CARD} p-5 flex flex-col gap-3 atl-fade-up`} style={{ animationDelay: `${i * 60}ms` }}>
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-[13px] border-[2px] border-[#0F172A] flex items-center justify-center shrink-0 mt-0.5" style={{ background: C.blueSoft, boxShadow: "2px 2px 0 0 #0F172A" }}>
                            <Layers className="w-5 h-5" style={{ color: C.indigo }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`${DISPLAY} font-extrabold text-lg leading-tight`}>{deck.name}</h3>
                            {deck.subject && (
                              <span className={`${TAG} mt-1.5`} style={{ background: C.skySoft }}>{deck.subject}</span>
                            )}
                          </div>
                        </div>
                        {deck.description && (
                          <p className="text-sm font-medium text-slate-500 leading-relaxed">{deck.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-auto">
                          <span className={`${TAG}`} style={{ background: C.blueSoft }}>
                            <Layers className="w-3 h-3" /> {deck.question_count.toLocaleString()} questions
                          </span>
                        </div>
                        <button
                          className={`${BTN} w-full justify-center text-white`}
                          style={{ background: quizLoading && activeDeck?.id === deck.id ? "#94a3b8" : C.blue }}
                          disabled={quizLoading && activeDeck?.id === deck.id}
                          onClick={() => handleStartQuiz(deck)}
                        >
                          {quizLoading && activeDeck?.id === deck.id
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</>
                            : <><Zap className="w-4 h-4" /> Start Quiz</>}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── VIEW: TAKING ── */}
            {view === "taking" && (
              <div className="space-y-5 mb-10">

                {quizLoading && (
                  <div className={`${STICKER} p-8 space-y-4`}>
                    <Skeleton className="h-6 w-1/3 rounded-xl" />
                    <Skeleton className="h-4 w-2/3 rounded-xl" />
                    <Skeleton className="h-52 w-full rounded-2xl" />
                  </div>
                )}

                {!quizLoading && quizError && (
                  <div className={`${STICKER_SM} p-6`} style={{ borderLeft: `6px solid ${C.pop}` }}>
                    <p className={`${DISPLAY} font-extrabold text-xl`} style={{ color: C.pop }}>Couldn't load quiz</p>
                    <p className="font-medium text-slate-600 mt-1">{quizError}</p>
                  </div>
                )}

                {!quizLoading && !quizError && (!quizPayload || !questions.length) && (
                  <div className={`${STICKER} p-10 text-center`}>
                    <p className={`${DISPLAY} font-extrabold text-xl`}>This deck has no questions yet.</p>
                  </div>
                )}

                {/* ── RESULTS ── */}
                {!quizLoading && !quizError && quizPayload && questions.length > 0 && sessionComplete && (
                  <div className="space-y-5 atl-fade-up">

                    {/* Score hero */}
                    <div className="rounded-[28px] border-[3px] border-[#0F172A] shadow-[5px_6px_0_0_#0F172A] p-10 text-center text-white relative overflow-hidden"
                      style={{ background: `linear-gradient(135deg, ${C.cyan} 0%, ${C.blue} 55%, ${C.indigo} 100%)` }}>
                      <Star     className="absolute atl-float"  style={{ top: 20,    left: 28,  color: C.sun, fill: C.sun, width: 32, height: 32 }} />
                      <Sparkles className="absolute atl-float2" style={{ bottom: 20, right: 28, color: "#fff", width: 28, height: 28 }} />
                      <Trophy   className="absolute atl-float2" style={{ top: 20,   right: 28,  color: C.sun, fill: C.sun, width: 28, height: 28 }} />
                      <p className="font-bold text-sm uppercase tracking-widest opacity-75 mb-1">{activeDeck?.name}</p>
                      <p className="font-bold opacity-60 text-sm mb-3">Quiz Complete!</p>
                      {isSubjective ? (
                        subjectiveGrading ? (
                          <div className="flex flex-col items-center gap-3 py-4">
                            <Loader2 className="w-12 h-12 animate-spin" />
                            <p className="font-bold text-lg">AI is grading your answers…</p>
                          </div>
                        ) : (
                          <>
                            <div className={`${DISPLAY} font-extrabold leading-none atl-pop`} style={{ fontSize: "clamp(56px,14vw,96px)" }}>
                              {totalMarksEarned}<span style={{ fontSize: "0.45em", opacity: 0.7 }}>/{totalMaxMarks}</span>
                            </div>
                            <p className="font-bold text-lg opacity-90 mt-2">marks earned</p>
                          </>
                        )
                      ) : (
                        <>
                          <div className={`${DISPLAY} font-extrabold leading-none atl-pop`} style={{ fontSize: "clamp(72px,18vw,120px)" }}>
                            {accuracy}%
                          </div>
                          <p className="font-bold text-xl opacity-90 mt-2">{correctCount} / {questions.length} correct</p>
                        </>
                      )}
                    </div>

                    {/* Stat chips */}
                    {!isSubjective && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: "Score",   value: `${accuracy}%`,               bg: C.blue,   ic: "#fff" },
                          { label: "Correct", value: correctCount,                 bg: "#22c55e", ic: "#fff" },
                          { label: "Wrong",   value: answeredCount - correctCount,  bg: C.pop,   ic: "#fff" },
                          { label: "Skipped", value: questions.length - answeredCount, bg: C.ink, ic: "#fff" },
                        ].map((s, i) => (
                          <div key={s.label} className="rounded-[20px] border-[3px] border-[#0F172A] shadow-[4px_4px_0_0_#0F172A] p-4 text-center atl-fade-up" style={{ background: s.bg, color: s.ic, animationDelay: `${i * 70}ms` }}>
                            <div className={`${DISPLAY} font-extrabold text-3xl leading-none`}>{s.value}</div>
                            <div className="font-bold text-xs opacity-80 mt-1">{s.label}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {isSubjective && !subjectiveGrading && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                          { label: "Marks",    value: `${totalMarksEarned}/${totalMaxMarks}`, bg: C.blue,   ic: "#fff" },
                          { label: "Answered", value: answeredCount,                         bg: "#22c55e", ic: "#fff" },
                          { label: "Skipped",  value: questions.length - answeredCount,      bg: C.ink,    ic: "#fff" },
                        ].map((s, i) => (
                          <div key={s.label} className="rounded-[20px] border-[3px] border-[#0F172A] shadow-[4px_4px_0_0_#0F172A] p-4 text-center atl-fade-up" style={{ background: s.bg, color: s.ic, animationDelay: `${i * 70}ms` }}>
                            <div className={`${DISPLAY} font-extrabold text-3xl leading-none`}>{s.value}</div>
                            <div className="font-bold text-xs opacity-80 mt-1">{s.label}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── Active section (controlled by sidebar tabs) ── */}
                    {activeReviewTab === null && (
                      <div className="rounded-[20px] border-[2px] border-[#0F172A]/10 p-6 text-center" style={{ background: C.cloud }}>
                        <p className={`${DISPLAY} font-extrabold text-base text-slate-500`}>Select a section from the sidebar →</p>
                        <p className="text-sm font-semibold text-slate-400 mt-1">AI Analysis · Score Tracker · Answer Review</p>
                      </div>
                    )}

                    {activeReviewTab === "ai" && (
                      <div ref={refAiAnalysis}>
                        <QuizAnalysis analysis={analysisResult} loading={analysisLoading} error={analysisError} />
                      </div>
                    )}

                    {activeReviewTab === "tracker" && currentQuizScore !== null && currentQuizCategory && (
                      <PerformanceTracker category={currentQuizCategory} currentScore={currentQuizScore} history={subjectHistory} />
                    )}

                    {activeReviewTab === "review" && (
                      <div ref={refAnswerReview}>
                        {/* Header with prev/next always at the top */}
                        <div className="flex items-center justify-between mb-4">
                          <h4 className={`${DISPLAY} font-extrabold text-2xl`}>Answer Review 📋</h4>
                          <div className="flex items-center gap-2">
                            <button
                              className={BTN_SM}
                              disabled={reviewIndex === 0}
                              onClick={() => setReviewIndex(i => i - 1)}
                            >
                              <ChevronLeft className="w-4 h-4" /> Prev
                            </button>
                            <span className="text-sm font-extrabold font-['Baloo_2'] text-slate-500 px-1">
                              {reviewIndex + 1} / {questions.length}
                            </span>
                            <button
                              className={BTN_SM}
                              disabled={reviewIndex === questions.length - 1}
                              onClick={() => setReviewIndex(i => i + 1)}
                            >
                              Next <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Single question card */}
                        {(() => {
                          const idx = reviewIndex;
                          const q = questions[idx];
                          if (!q) return null;
                          const isBookmarked = flaggedQuestions.has(idx);

                          if (isSubjective) {
                            const result = subjectiveResults.get(idx);
                            const isCheckbox = q.answers.some((a) => !a.is_correct);
                            const userAnswer = subjectiveAnswerMap.get(idx) ?? "";
                            const selectedIds = checkboxAnswerMap.get(idx) ?? new Set<string>();
                            const modelAnswers = q.answers.filter((a) => a.is_correct);
                            const isSkipped = isCheckbox ? selectedIds.size === 0 : !userAnswer.trim();
                            const accentColor = isSkipped ? "#94a3b8" : result?.isCorrect ? "#22c55e" : C.pop;
                            return (
                              <div className={`${STICKER} p-6`} style={{ borderLeft: `6px solid ${accentColor}` }}>
                                <div className="flex items-center gap-3 flex-wrap mb-3">
                                  <span className={`${TAG}`} style={{ background: C.skySoft }}>Q{idx + 1} / {questions.length}</span>
                                  {subjectiveGrading ? (
                                    <span className={`${TAG} gap-1`}><Loader2 className="w-3 h-3 animate-spin" /> Grading…</span>
                                  ) : isSkipped ? (
                                    <span className={`${TAG}`} style={{ background: "#f1f5f9" }}>Skipped</span>
                                  ) : result ? (
                                    <span className={`${TAG} text-white`} style={{ background: result.isCorrect ? "#22c55e" : C.pop }}>
                                      {result.isCorrect ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                      {result.marksEarned}/{result.maxMarks} marks
                                    </span>
                                  ) : null}
                                  {isBookmarked && <span className={`${TAG}`} style={{ background: C.sun }}><BookmarkCheck className="w-3 h-3" /> Bookmarked</span>}
                                </div>
                                <p className="font-semibold text-base mb-4">{q.text}</p>
                                {q.image_url && <img src={q.image_url} alt="Question" className="w-full max-h-48 object-contain rounded-[20px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] mb-4" />}
                                {isCheckbox ? (
                                  <div className="space-y-2">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Your Selections</p>
                                    {q.answers.map((a) => {
                                      const wasSelected = selectedIds.has(a.id);
                                      const isRight = a.is_correct;
                                      const bg = isRight && wasSelected ? "#dcfce7" : !isRight && wasSelected ? "#fee2e2" : isRight ? "#fef9c3" : "#f8fafc";
                                      const border = isRight && wasSelected ? "#22c55e" : !isRight && wasSelected ? C.pop : isRight ? "#eab308" : "#e2e8f0";
                                      return (
                                        <div key={a.id} className="rounded-[16px] border-[2.5px] px-4 py-2.5 text-sm flex items-center gap-3" style={{ background: bg, borderColor: border }}>
                                          <span className="shrink-0">
                                            {isRight && wasSelected ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                                              : !isRight && wasSelected ? <XCircle className="w-4 h-4" style={{ color: C.pop }} />
                                              : isRight ? <CheckCircle2 className="w-4 h-4 text-yellow-500" />
                                              : <span className="w-4 h-4 block rounded border-2 border-slate-300" />}
                                          </span>
                                          <span className="flex-1 font-medium">{a.text}</span>
                                          <span className="text-xs font-bold">{isRight && wasSelected ? "✓ Correct" : !isRight && wasSelected ? "✗ Wrong" : isRight ? "Missed" : ""}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <>
                                    <div className="rounded-[16px] border-[2.5px] border-[#0F172A] p-3 mb-3">
                                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Your Answer</p>
                                      <p className="text-sm font-medium">{userAnswer || <span className="italic text-slate-400">No answer given</span>}</p>
                                    </div>
                                    {modelAnswers.length > 0 && (
                                      <div className="rounded-[16px] border-[2.5px] p-3" style={{ background: C.skySoft, borderColor: C.blue }}>
                                        <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: C.blue }}>Model Answer</p>
                                        {modelAnswers.map((a, i) => <p key={i} className="text-sm font-medium">{a.text}</p>)}
                                      </div>
                                    )}
                                  </>
                                )}
                                {result?.feedback && (
                                  <div className="rounded-[16px] border-[2.5px] p-3 mt-3" style={{ background: C.indigoSoft, borderColor: C.indigo }}>
                                    <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: C.indigo }}>AI Feedback</p>
                                    <p className="text-sm font-medium">{result.feedback}</p>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          // Objective
                          const selected = answeredMap.get(idx) ?? null;
                          const correctAnswer = q.answers.find((a) => a.is_correct);
                          const isCorrect = selected === correctAnswer?.id;
                          const isSkipped = selected === null;
                          const accentColor = isSkipped ? "#94a3b8" : isCorrect ? "#22c55e" : C.pop;
                          return (
                            <div className={`${STICKER} p-6`} style={{ borderLeft: `6px solid ${accentColor}` }}>
                              <div className="flex items-center gap-3 flex-wrap mb-3">
                                <span className={`${TAG}`} style={{ background: C.skySoft }}>Q{idx + 1} / {questions.length}</span>
                                {isSkipped ? (
                                  <span className={`${TAG}`} style={{ background: "#f1f5f9" }}>Skipped</span>
                                ) : isCorrect ? (
                                  <span className={`${TAG} text-white`} style={{ background: "#22c55e" }}><CheckCircle2 className="w-3 h-3" /> Correct</span>
                                ) : (
                                  <span className={`${TAG} text-white`} style={{ background: C.pop }}><XCircle className="w-3 h-3" /> Wrong</span>
                                )}
                                {isBookmarked && <span className={`${TAG}`} style={{ background: C.sun }}><BookmarkCheck className="w-3 h-3" /> Bookmarked</span>}
                              </div>
                              <p className="font-semibold text-base mb-4">{q.text}</p>
                              {q.image_url && <img src={q.image_url} alt="Question" className="w-full max-h-48 object-contain rounded-[20px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] mb-4" />}
                              <div className="space-y-2">
                                {q.answers.map((a, aIdx) => {
                                  const isThisCorrect = a.is_correct;
                                  const isThisSelected = a.id === selected;
                                  const isThisWrong = isThisSelected && !isThisCorrect;
                                  const bg = isThisCorrect ? "#dcfce7" : isThisWrong ? "#fee2e2" : "#f8fafc";
                                  const border = isThisCorrect ? "#22c55e" : isThisWrong ? C.pop : "#e2e8f0";
                                  return (
                                    <div key={a.id} className="rounded-[16px] border-[2.5px] px-4 py-2.5 text-sm" style={{ background: bg, borderColor: border }}>
                                      {a.image_url && <img src={a.image_url} alt="" className="w-full max-h-36 object-contain rounded-[12px] border border-slate-200 mb-2" />}
                                      <div className="flex items-center gap-3">
                                        <span className="shrink-0 w-7 h-7 rounded-[10px] border-[2px] border-current flex items-center justify-center font-['Baloo_2'] font-extrabold text-xs" style={{ background: isThisCorrect ? "#22c55e" : isThisWrong ? C.pop : "#e2e8f0", color: (isThisCorrect || isThisWrong) ? "#fff" : C.ink, borderColor: "transparent" }}>
                                          {OPTS[aIdx] ?? String(aIdx + 1)}
                                        </span>
                                        {a.text && <span className="flex-1 font-medium">{a.text}</span>}
                                        {isThisCorrect && <span className="shrink-0 text-xs font-bold text-green-700">✓ Answer</span>}
                                        {isThisWrong && <span className="shrink-0 text-xs font-bold" style={{ color: C.pop }}>✗ Yours</span>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              {q.explanation && (
                                <div className="rounded-[16px] border-[2.5px] p-3 mt-3" style={{ background: C.indigoSoft, borderColor: C.indigo }}>
                                  <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: C.indigo }}>Explanation</p>
                                  <p className="text-sm font-medium">{q.explanation}</p>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Bookmarked questions summary */}
                        {flaggedQuestions.size > 0 && (
                          <div className={`${STICKER} p-6 mt-4`}>
                            <h4 className={`${DISPLAY} font-extrabold text-xl flex items-center gap-2 mb-4`}>
                              <BookmarkCheck className="w-5 h-5" style={{ color: C.sun }} /> Bookmarked ({flaggedQuestions.size})
                            </h4>
                            <div className="space-y-2">
                              {sortedBookmarks.map((idx) => {
                                const q = questions[idx];
                                if (!q) return null;
                                const correctAnswer = q.answers.find((a) => a.is_correct);
                                const wasCorrect = answeredMap.get(idx) === correctAnswer?.id;
                                const wasSkipped = !answeredMap.has(idx);
                                const statusBg = wasSkipped ? "#f1f5f9" : wasCorrect ? "#dcfce7" : "#fee2e2";
                                const statusColor = wasSkipped ? C.ink : wasCorrect ? "#16a34a" : C.pop;
                                return (
                                  <div key={idx} className="flex items-center gap-3 p-3 rounded-[16px] border-[2px] border-[#0F172A]/10 bg-slate-50">
                                    <span className={`${TAG}`} style={{ background: C.skySoft }}>Q{idx + 1}</span>
                                    <p className="text-sm font-medium text-slate-600 line-clamp-2 flex-1">{q.text}</p>
                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold border-[2px] border-current" style={{ background: statusBg, color: statusColor }}>
                                      {wasSkipped ? "Skipped" : wasCorrect ? "Correct" : "Wrong"}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Mobile section tabs (hidden on lg — sidebar handles desktop) */}
                    <div className="lg:hidden flex flex-col gap-2 mt-2 p-4 rounded-[20px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] bg-white">
                      <p className={`${DISPLAY} font-extrabold text-xs uppercase tracking-widest mb-1`} style={{ color: C.indigo }}>Review Sections</p>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { tab: "review" as const,  icon: PenLine,   label: "Answer Review",  activeBg: "#92400e", bg: "#FEF9C3" },
                          { tab: "ai" as const,      icon: Sparkles,  label: "AI Analysis",    activeBg: C.indigo,  bg: C.indigoSoft },
                          { tab: "tracker" as const, icon: BarChart2, label: "Score Tracker",  activeBg: C.blue,    bg: C.skySoft },
                        ] as const).map(({ tab, icon: Icon, label, bg, activeBg }) => {
                          const isActive = activeReviewTab === tab;
                          return (
                            <button
                              key={tab}
                              onClick={() => {
                                if (tab === "ai" && activeReviewTab !== "ai") runAiAnalysis();
                                setActiveReviewTab(isActive ? null : tab);
                              }}
                              className="flex flex-col items-center gap-1 rounded-[14px] border-[2.5px] border-[#0F172A] p-3 text-center font-bold text-xs transition-all cursor-pointer"
                              style={{ background: isActive ? activeBg : bg, color: isActive ? "#fff" : C.ink, boxShadow: "2px 2px 0 0 #0F172A" }}
                            >
                              <Icon className="w-4 h-4" />
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t-[2px] border-[#0F172A]/10">
                        <button className="flex flex-col items-center gap-1 rounded-[14px] border-[2.5px] border-[#0F172A] p-3 font-bold text-xs bg-white transition-all cursor-pointer hover:-translate-y-0.5" style={{ boxShadow: "2px 2px 0 0 #0F172A", color: C.blue }} onClick={resetSessionState}>
                          <Target className="w-4 h-4" /> Retake
                        </button>
                        <button className="flex flex-col items-center gap-1 rounded-[14px] border-[2.5px] border-[#0F172A] p-3 font-bold text-xs bg-white transition-all cursor-pointer hover:-translate-y-0.5 disabled:opacity-40" style={{ boxShadow: "2px 2px 0 0 #0F172A" }} disabled={!activeDeck} onClick={() => activeDeck && handleStartQuiz(activeDeck)}>
                          <Zap className="w-4 h-4" /> Fresh Order
                        </button>
                        <button className="flex flex-col items-center gap-1 rounded-[14px] border-[2.5px] border-[#0F172A] p-3 font-bold text-xs bg-white transition-all cursor-pointer hover:-translate-y-0.5" style={{ boxShadow: "2px 2px 0 0 #0F172A" }} onClick={() => { resetSessionState(); setView("decks"); }}>
                          <ChevronLeft className="w-4 h-4" /> Back
                        </button>
                      </div>
                    </div>

                    <GoalSheet open={showGoalSheet} onClose={() => setShowGoalSheet(false)}
                      deckName={activeDeck?.name ?? ""} subject={activeDeck?.subject ?? null} accuracy={accuracy}
                      wrongQuestions={questions.filter((q, idx) => { const c = q.answers.find((a) => a.is_correct); return answeredMap.get(idx) !== c?.id; }).map((q) => q.text).slice(0, 3)} />
                  </div>
                )}

                {/* ── ACTIVE QUIZ ── */}
                {!quizLoading && !quizError && quizPayload && questions.length > 0 && !sessionComplete && currentQuestion && (
                  <div className={`${STICKER} p-5 md:p-7`}>

                    {/* Top bar */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <span className={`${TAG} text-white`} style={{ background: C.blue }}>
                          Q{currentIndex + 1} <span className="opacity-60 font-bold">/ {questions.length}</span>
                        </span>
                        <p className="text-xs font-bold text-slate-400 mt-1.5">{answeredCount} answered · {unansweredCount} remaining</p>
                      </div>
                      <button
                        onClick={() => handleToggleFlag(currentIndex)}
                        className={cn(BTN_SM, flaggedQuestions.has(currentIndex) ? "text-[#0F172A]" : "bg-white")}
                        style={flaggedQuestions.has(currentIndex) ? { background: C.sun } : {}}
                      >
                        {flaggedQuestions.has(currentIndex) ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                        {flaggedQuestions.has(currentIndex) ? "Marked" : "Mark"}
                      </button>
                    </div>

                    {/* Progress bar */}
                    <div className="h-3 rounded-full border-[2px] border-[#0F172A] bg-slate-100 overflow-hidden shadow-[1px_1px_0_0_#0F172A] mb-5">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%`, background: `linear-gradient(90deg, ${C.cyan}, ${C.blue})` }} />
                    </div>

                    {/* Question body */}
                    <div key={`q-${currentIndex}`} className="atl-q-in space-y-5">
                      <p className={`${DISPLAY} font-bold text-xl md:text-2xl leading-snug`}>{currentQuestion.text}</p>

                      {currentQuestion.image_url && (
                        <img src={currentQuestion.image_url} alt="Question" className="w-full max-h-72 object-contain rounded-[20px] border-[2.5px] border-[#0F172A] shadow-[4px_4px_0_0_#0F172A]" />
                      )}

                      {/* Subjective: checkbox or text */}
                      {isSubjective && (() => {
                        const isCheckbox = currentQuestion.answers.some((a) => !a.is_correct);
                        const selectedIds = checkboxAnswerMap.get(currentIndex) ?? new Set<string>();
                        if (isCheckbox) {
                          return (
                            <div className="space-y-3">
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Select all correct options
                              </p>
                              {currentQuestion.answers.map((a) => {
                                const checked = selectedIds.has(a.id);
                                return (
                                  <button key={a.id} onClick={() => handleCheckboxToggle(a.id)}
                                    className={cn("w-full rounded-[20px] border-[3px] border-[#0F172A] p-4 text-left shadow-[4px_4px_0_0_#0F172A] transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[2px_2px_0_0_#0F172A] flex items-center gap-4",
                                      checked ? "text-white" : "bg-white")}
                                    style={checked ? { background: C.indigo } : {}}
                                  >
                                    <span className={cn("shrink-0 w-9 h-9 rounded-[12px] border-[2.5px] flex items-center justify-center", checked ? "bg-white border-white/40" : "bg-slate-100 border-slate-300")}>
                                      {checked ? <CheckCircle2 className="w-5 h-5" style={{ color: C.indigo }} /> : <span className="w-3 h-3 rounded-sm border-2 border-slate-400" />}
                                    </span>
                                    <span className="text-sm font-semibold">{a.text}</span>
                                  </button>
                                );
                              })}
                              {currentQuestion.marks != null && (
                                <p className="text-xs font-bold text-slate-400">{currentQuestion.marks} mark{currentQuestion.marks !== 1 ? "s" : ""}</p>
                              )}
                            </div>
                          );
                        }
                        return (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                              <PenLine className="w-4 h-4" /> Write your answer below
                            </div>
                            <Textarea
                              placeholder="Type your answer here..."
                              value={subjectiveAnswerMap.get(currentIndex) ?? ""}
                              onChange={(e) => handleSubjectiveAnswer(e.target.value)}
                              className="min-h-[140px] text-sm resize-none rounded-[16px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] focus:shadow-[5px_5px_0_0_#0F172A] transition-shadow"
                              disabled={sessionComplete}
                            />
                            {currentQuestion.answers.filter((a) => a.is_correct).length > 0 && (
                              <div className="rounded-[16px] border-[2.5px] p-4" style={{ background: C.skySoft, borderColor: C.blue }}>
                                <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: C.blue }}>Model Answer</p>
                                {currentQuestion.answers.filter((a) => a.is_correct).map((a, i) => (
                                  <p key={i} className="text-sm font-medium">{a.text}</p>
                                ))}
                                {currentQuestion.marks != null && (
                                  <p className="text-xs font-bold mt-2" style={{ color: C.blue }}>{currentQuestion.marks} mark{currentQuestion.marks !== 1 ? "s" : ""}</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Objective: A/B/C/D */}
                      {!isSubjective && (
                        <div className="space-y-3">
                          {currentQuestion.answers.length ? (
                            currentQuestion.answers.map((a, aIdx) => {
                              const label = OPTS[aIdx] ?? String(aIdx + 1);
                              const isSelected = selectedAnswerId === a.id;
                              return (
                                <button
                                  key={a.id}
                                  onClick={() => handleAnswerSelect(a.id)}
                                  className={cn(
                                    "w-full rounded-[20px] border-[3px] border-[#0F172A] p-4 text-left",
                                    "shadow-[4px_4px_0_0_#0F172A]",
                                    "transition-all duration-150",
                                    "hover:-translate-y-0.5",
                                    "active:translate-y-0.5 active:shadow-[2px_2px_0_0_#0F172A]",
                                    isSelected ? "text-white" : "bg-white hover:bg-[#DDF3FF]"
                                  )}
                                  style={isSelected ? { background: C.blue } : {}}
                                >
                                  {a.image_url && (
                                    <img src={a.image_url} alt="" className="w-full max-h-40 object-contain rounded-[16px] border-[2px] border-current/20 mb-3" />
                                  )}
                                  <div className="flex items-center gap-4">
                                    <span className={cn(
                                      "shrink-0 w-9 h-9 rounded-[12px] border-[2.5px] flex items-center justify-center",
                                      `${DISPLAY} font-extrabold text-sm`,
                                      isSelected ? "bg-white border-white/30 text-[#2F7CFF]" : "bg-[#0F172A] border-[#0F172A] text-white"
                                    )}>
                                      {label}
                                    </span>
                                    {a.text && <span className="text-sm font-semibold flex-1 text-left">{a.text}</span>}
                                  </div>
                                </button>
                              );
                            })
                          ) : (
                            <div className={`${STICKER_SM} p-4 text-center`}>
                              <p className="font-bold text-slate-500">No answer options yet.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Submit confirm */}
                    {submitConfirmPending && (
                      <div className="rounded-[20px] border-[3px] border-[#0F172A] shadow-[5px_5px_0_0_#0F172A] p-5 mt-5" style={{ background: "#fff7ed" }}>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className={`${DISPLAY} font-extrabold text-lg`} style={{ color: C.pop }}>Submit quiz?</p>
                            <p className="text-sm font-medium text-slate-600 mt-1">
                              {unansweredCount > 0 ? `You have ${unansweredCount} unanswered question${unansweredCount > 1 ? "s" : ""}. ` : ""}
                              You cannot change answers after submitting.
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button className={`${BTN_SM} bg-white`} onClick={() => setSubmitConfirmPending(false)}>Cancel</button>
                            <button className={`${BTN_SM} text-white`} style={{ background: C.pop }} onClick={handleSubmitQuiz}>Confirm</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Navigation */}
                    <div className="flex flex-wrap items-center gap-2.5 pt-5 mt-4 border-t-[2px] border-slate-100">
                      <button className={`${BTN_SM} bg-white`} disabled={currentIndex === 0} onClick={handlePrevQuestion}>
                        <ChevronLeft className="w-4 h-4" /> Previous
                      </button>
                      <button className={`${BTN_SM} bg-white`} disabled={isLastQuestion} onClick={handleNextQuestion}>
                        Next <ChevronRight className="w-4 h-4" />
                      </button>
                      <div className="flex-1" />
                      <button className={`${BTN_SM} text-white`} style={{ background: C.indigo }}
                        onClick={() => { setSubmitConfirmPending(true); setShowBookmarkPanel(false); }}>
                        <Sparkles className="w-4 h-4" /> Submit
                      </button>
                      <button className={`${BTN_SM} bg-white`} onClick={() => { resetSessionState(); setView("decks"); }}>
                        <X className="w-4 h-4" /> Exit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════════
              RIGHT SIDEBAR (desktop only)
          ════════════════════════════════════════════════════════════ */}
          <aside className="hidden lg:flex flex-col gap-4 sticky top-4">

            {/* Goals card — merged today's goal + open goals */}
            <div className={SIDE_CARD}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-[12px] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center shrink-0" style={{ background: C.blue }}>
                  <CalendarDays className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className={`${DISPLAY} font-extrabold text-sm`}>My Goals</p>
                  <p className="text-xs font-semibold text-slate-400">Track your study plan</p>
                </div>
              </div>
              {/* Today's goal inline — no separate card border */}
              <div className="rounded-[14px] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] overflow-hidden mb-3">
                <div className="p-3">
                  <TodayGoalBanner onSetGoal={() => setShowGoalSheet(true)} inline />
                </div>
              </div>
              <button
                onClick={() => setShowGoalSheet(true)}
                className="w-full inline-flex items-center justify-center gap-2 font-extrabold font-['Baloo_2'] text-sm border-[2.5px] border-[#0F172A] rounded-full py-2.5 shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] transition-all text-white cursor-pointer"
                style={{ background: C.blue }}
              >
                <CalendarDays className="w-4 h-4" /> Open Goals
              </button>
            </div>

            {/* OMR Scanner card — visible when not in quiz */}
            {view !== "taking" && (
              <div className={SIDE_CARD}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-[12px] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center shrink-0" style={{ background: C.indigo }}>
                    <ScanLine className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className={`${DISPLAY} font-extrabold text-sm`}>OMR Scanner</p>
                    <p className="text-xs font-semibold text-slate-400">Grade answer sheets</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/omr-scan")}
                  className="w-full inline-flex items-center justify-center gap-2 font-extrabold font-['Baloo_2'] text-sm border-[2.5px] border-[#0F172A] rounded-full py-2.5 shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] transition-all cursor-pointer"
                  style={{ background: C.indigoSoft, color: C.indigo }}
                >
                  <ScanLine className="w-4 h-4" /> Open Scanner
                </button>
              </div>
            )}

            {/* Results navigator — visible after quiz completion */}
            {view === "taking" && sessionComplete && (
              <div className={SIDE_CARD}>
                {/* Section tabs */}
                <p className={`${DISPLAY} font-extrabold text-xs uppercase tracking-widest mb-3`} style={{ color: C.indigo }}>
                  Review Sections
                </p>
                <div className="flex flex-col gap-2 mb-4">
                  {([
                    { tab: "review" as const,  icon: PenLine,   label: "Answer Review",  bg: "#FEF9C3",    activeBg: "#92400e" },
                    { tab: "ai" as const,      icon: Sparkles,  label: "AI Analysis",    bg: C.indigoSoft, activeBg: C.indigo },
                    { tab: "tracker" as const, icon: BarChart2, label: "Score Tracker",  bg: C.skySoft,    activeBg: C.blue },
                  ] as const).map(({ tab, icon: Icon, label, bg, activeBg }) => {
                    const isActive = activeReviewTab === tab;
                    return (
                      <button
                        key={tab}
                        onClick={() => {
                          if (tab === "ai" && activeReviewTab !== "ai") { runAiAnalysis(); }
                          setActiveReviewTab(isActive ? null : tab);
                        }}
                        className="w-full flex items-center gap-3 rounded-[14px] border-[2.5px] border-[#0F172A] px-3 py-2.5 text-left font-bold text-sm transition-all cursor-pointer hover:-translate-y-0.5"
                        style={{
                          background: isActive ? activeBg : bg,
                          color: isActive ? "#fff" : C.ink,
                          boxShadow: isActive ? `3px 3px 0 0 #0F172A` : "2px 2px 0 0 #0F172A",
                        }}
                      >
                        <Icon className="w-4 h-4 shrink-0" style={{ color: isActive ? "#fff" : activeBg }} />
                        <span className={DISPLAY}>{label}</span>
                        {isActive && <span className="ml-auto text-[10px] font-bold opacity-70">▲ Hide</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Jump-to-question grid — only when answer review active */}
                {activeReviewTab === "review" && questions.length > 0 && (
                  <>
                    <p className={`${DISPLAY} font-extrabold text-xs uppercase tracking-widest mb-2`} style={{ color: C.ink }}>
                      Jump to Question
                    </p>
                    <div className="max-h-52 overflow-y-auto mb-3 -mx-1">
                    <div className="grid grid-cols-5 gap-2 px-1 py-1">
                      {questions.map((_, idx) => {
                        const isActive = idx === reviewIndex;
                        const isBookmarked = flaggedQuestions.has(idx);
                        let dotBg = "#e2e8f0";
                        let dotColor = C.ink;
                        if (isSubjective) {
                          const r = subjectiveResults.get(idx);
                          const isCheckbox = questions[idx].answers.some((a) => !a.is_correct);
                          const skipped = isCheckbox ? (checkboxAnswerMap.get(idx)?.size ?? 0) === 0 : !(subjectiveAnswerMap.get(idx) ?? "").trim();
                          if (subjectiveGrading) { dotBg = "#fef9c3"; dotColor = "#92400e"; }
                          else if (skipped) { dotBg = "#e2e8f0"; dotColor = "#64748b"; }
                          else if (r?.isCorrect) { dotBg = "#22c55e"; dotColor = "#fff"; }
                          else if (r) { dotBg = C.pop; dotColor = "#fff"; }
                        } else {
                          const sel = answeredMap.get(idx) ?? null;
                          const correct = questions[idx].answers.find((a) => a.is_correct);
                          if (sel === null) { dotBg = "#e2e8f0"; dotColor = "#64748b"; }
                          else if (sel === correct?.id) { dotBg = "#22c55e"; dotColor = "#fff"; }
                          else { dotBg = C.pop; dotColor = "#fff"; }
                        }
                        return (
                          <button
                            key={idx}
                            onClick={() => setReviewIndex(idx)}
                            className="relative aspect-square rounded-[10px] border-[2px] border-[#0F172A] font-['Baloo_2'] font-extrabold text-xs cursor-pointer transition-all"
                            style={{
                              background: isActive ? C.indigo : dotBg,
                              color: isActive ? "#fff" : dotColor,
                              boxShadow: isActive ? "2px 2px 0 0 #0F172A" : "1px 1px 0 0 #0F172A",
                              transform: isActive ? "scale(1.1)" : "scale(1)",
                            }}
                          >
                            {idx + 1}
                            {isBookmarked && (
                              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white" style={{ background: C.sun }} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mb-4">
                      {[
                        { bg: "#22c55e", label: "Correct" },
                        { bg: C.pop,    label: "Wrong" },
                        { bg: "#e2e8f0", label: "Skipped" },
                      ].map(({ bg, label }) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-[3px] border border-[#0F172A]/20 shrink-0" style={{ background: bg }} />
                          <span className="text-[10px] font-semibold text-slate-500">{label}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Action buttons */}
                <div className="flex flex-col gap-2 pt-3 border-t-[2px] border-[#0F172A]/10">
                  <button
                    className="w-full inline-flex items-center justify-center gap-2 font-extrabold font-['Baloo_2'] text-sm border-[2.5px] border-[#0F172A] rounded-full py-2.5 shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] transition-all text-white cursor-pointer"
                    style={{ background: C.blue }}
                    onClick={resetSessionState}
                  >
                    <Target className="w-4 h-4" /> Retake
                  </button>
                  <button
                    className="w-full inline-flex items-center justify-center gap-2 font-extrabold font-['Baloo_2'] text-sm border-[2.5px] border-[#0F172A] rounded-full py-2.5 shadow-[2px_2px_0_0_#0F172A] hover:-translate-y-0.5 transition-all cursor-pointer bg-white"
                    disabled={!activeDeck}
                    onClick={() => activeDeck && handleStartQuiz(activeDeck)}
                  >
                    <Zap className="w-4 h-4" /> Fresh Order
                  </button>
                  <button
                    className="w-full inline-flex items-center justify-center gap-2 font-extrabold font-['Baloo_2'] text-sm border-[2.5px] border-[#0F172A] rounded-full py-2.5 shadow-[2px_2px_0_0_#0F172A] hover:-translate-y-0.5 transition-all cursor-pointer bg-white"
                    onClick={() => { resetSessionState(); setView("decks"); }}
                  >
                    <ChevronLeft className="w-4 h-4" /> Back to Category
                  </button>
                </div>
              </div>
            )}

            {/* Question navigator — visible during active quiz */}
            {view === "taking" && !sessionComplete && questions.length > 0 && (
              <div className={SIDE_CARD}>
                <p className={`${DISPLAY} font-extrabold text-xs uppercase tracking-widest mb-3`} style={{ color: C.indigo }}>
                  Questions
                </p>
                <div className="grid grid-cols-5 gap-1.5 max-h-72 overflow-y-auto">
                  {questions.map((_, idx) => {
                    const isActive = idx === currentIndex;
                    const isAnswered = isSubjective
                      ? subjectiveAnswerMap.has(idx) || (checkboxAnswerMap.get(idx)?.size ?? 0) > 0
                      : answeredMap.has(idx);
                    const isMarked = flaggedQuestions.has(idx);
                    return (
                      <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className="q-nav-btn aspect-square rounded-[10px] border-[2px] border-[#0F172A] font-['Baloo_2'] font-extrabold text-xs cursor-pointer"
                        style={{
                          background: isActive ? C.indigo : isMarked ? C.sun : isAnswered ? C.cyan : "white",
                          color: isActive ? "white" : isMarked ? C.ink : isAnswered ? C.ink : "#94a3b8",
                          boxShadow: isActive ? `2px 2px 0 0 #0F172A` : "1px 1px 0 0 #0F172A",
                        }}
                        title={`Question ${idx + 1}${isAnswered ? " (answered)" : ""}${isMarked ? " (flagged)" : ""}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
                  {[
                    { color: C.indigo, label: "Current", textColor: "white" },
                    { color: C.cyan, label: "Answered", textColor: C.ink },
                    { color: C.sun, label: "Flagged", textColor: C.ink },
                    { color: "white", label: "Unanswered", textColor: "#94a3b8" },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-[4px] border border-[#0F172A]/30 shrink-0" style={{ background: color }} />
                      <span className="text-[10px] font-semibold text-slate-500">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}


          </aside>
        </div>
        )}
      </div>

      {/* ── STREAK OVERLAY ── */}
      {fireOverlay.show && (
        <Suspense fallback={null}>
          <StreakFireOverlay streak={fireOverlay.newStreak} onDismiss={() => setFireOverlay({ show: false, newStreak: 0 })} />
        </Suspense>
      )}

      {/* ── FLOATING BOOKMARKS (mobile) ── */}
      {isInActiveQuiz && flaggedQuestions.size > 0 && (
        <div ref={bookmarkPanelRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 lg:hidden">
          {showBookmarkPanel && (
            <div className={`${STICKER} w-72 overflow-hidden`} style={{ padding: 0 }}>
              <div className="flex items-center justify-between px-4 py-3 border-b-[2px] border-[#0F172A]" style={{ background: C.sun }}>
                <div className="flex items-center gap-2">
                  <BookmarkCheck className="w-4 h-4" />
                  <span className={`${DISPLAY} font-extrabold text-sm`}>Bookmarks ({flaggedQuestions.size})</span>
                </div>
                <button onClick={() => setShowBookmarkPanel(false)} className="hover:opacity-60 transition-opacity">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                {sortedBookmarks.map((idx) => {
                  const q = questions[idx];
                  if (!q) return null;
                  const isCurrent = idx === currentIndex;
                  const isAnswered = answeredMap.has(idx);
                  return (
                    <button key={idx} onClick={() => handleJumpToBookmark(idx)}
                      className={cn("w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-[#DDF3FF]", isCurrent && "bg-[#FFF9C4]")}>
                      <span className={cn(`${TAG} shrink-0 mt-0.5 text-[10px]`, isCurrent ? "text-white" : "")} style={{ background: isCurrent ? C.indigo : C.skySoft }}>
                        Q{idx + 1}
                      </span>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-snug flex-1">{q.text || "(No prompt)"}</p>
                      {isAnswered && <span className="shrink-0 w-2 h-2 rounded-full mt-1" style={{ background: C.blue }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <button onClick={() => setShowBookmarkPanel((p) => !p)}
            className={`${BTN_SM} text-[#0F172A]`} style={{ background: C.sun }}>
            <BookmarkCheck className="w-4 h-4" />
            <span className="font-bold">Bookmarks</span>
            <span className="ml-0.5 px-1.5 py-0.5 rounded-full border-[2px] border-[#0F172A] text-[10px] font-extrabold bg-white">{flaggedQuestions.size}</span>
          </button>
        </div>
      )}

      {/* Goal sheet */}
      {!sessionComplete && (
        <GoalSheet open={showGoalSheet} onClose={() => setShowGoalSheet(false)} />
      )}
    </div>
  );
};

export default Quiz;
