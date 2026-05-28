import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  BookOpen, Search, AlertTriangle, CheckCircle2,
  Sparkles, RefreshCw, ChevronDown, ChevronUp, X,
  ClipboardList, BookMarked, Layers,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

// ─── Design tokens ────────────────────────────────────────────────────────────
const D = "font-['Baloo_2'] tracking-tight";
const CARD = "bg-white border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A]";
const LS_CLASS_KEY = "classpulse_student_class";

// ─── Types ────────────────────────────────────────────────────────────────────
interface GapNote {
  concept: string;
  advice: string;
}
interface KeyTerm {
  term: string;
  definition?: string;
}

interface SessionSummary {
  id: string;
  session_id: string;
  class_name: string;
  subject: string;
  date: string;
  covered_notes: string | null;
  key_terms: KeyTerm[];
  gap_notes: GapNote[];
  created_at: string;
}

interface ConclusionReport {
  id: string;
  session_id: string;
  coverage_score: number | null;
  concepts_covered: string[];
  concepts_missed: string[];
  ai_coaching_note: string | null;
}

interface FlaggedConcept {
  id: string;
  session_id: string;
  class_name: string;
  concept_name: string;
  resolved: boolean;
}

interface ClassSession {
  id: string;
  teacher_id: string;
  class_name: string;
  subject: string;
  objective_text: string;
  key_concepts: string[];
  ended_at: string | null;
  created_at: string;
  conclusion_reports: ConclusionReport[];
  student_session_summaries: SessionSummary[];
}

function scoreColor(s: number) {
  return s >= 80 ? "#16A56B" : s >= 65 ? "#2F7CFF" : s >= 50 ? "#C77800" : "#DC2626";
}
function scoreBg(s: number) {
  return s >= 80 ? "#ECFAF3" : s >= 65 ? "#DDF3FF" : s >= 50 ? "#FFF6E2" : "#FEEFEC";
}

// ─── Gap card (one session) ───────────────────────────────────────────────────
function GapCard({ session, flagged }: { session: ClassSession; flagged: FlaggedConcept[] }) {
  const [expanded, setExpanded] = useState(false);
  const report = session.conclusion_reports[0] ?? null;
  const summary = session.student_session_summaries[0] ?? null;
  if (!report || report.concepts_missed.length === 0) return null;

  const coverage = report.coverage_score ?? 0;
  const sessionDate = session.ended_at ?? session.created_at;
  const flaggedForSession = flagged.filter(f => f.session_id === session.id && !f.resolved);

  // Merge gap_notes from student_session_summaries into a map for quick lookup
  const gapNoteMap = new Map<string, string>(
    (summary?.gap_notes ?? []).map((g: GapNote) => [g.concept?.toLowerCase(), g.advice])
  );

  // Generate a study tip for each missed concept
  const getStudyTip = (concept: string): string => {
    const fromSummary = gapNoteMap.get(concept.toLowerCase());
    if (fromSummary) return fromSummary;
    return `Review ${concept} — this was not fully covered in class. Check your textbook or ask your teacher for notes on this topic.`;
  };

  return (
    <div className={CARD}>
      {/* Card header */}
      <div className="px-5 pt-4 pb-3 border-b-[2px] border-[#0F172A]/10">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Subject pill */}
            <span className="inline-flex items-center font-['Nunito'] font-extrabold text-[11px] px-2.5 py-1 rounded-full text-[#2F7CFF] bg-[#DDF3FF] border-[1.5px] border-[#2F7CFF]/25">
              {session.subject}
            </span>
            {/* Class badge */}
            <span className="inline-flex items-center font-['Nunito'] font-extrabold text-[11px] px-2.5 py-1 rounded-full text-[#2E2BE5] bg-[#EEEDFF] border-[1.5px] border-[#2E2BE5]/25">
              {session.class_name}
            </span>
            {/* Flagged badge */}
            {flaggedForSession.length > 0 && (
              <span className="inline-flex items-center gap-1 font-['Nunito'] font-extrabold text-[11px] px-2.5 py-1 rounded-full text-[#C77800] bg-[#FFF6E2] border-[1.5px] border-[#C77800]/25">
                <AlertTriangle className="w-2.5 h-2.5" /> {flaggedForSession.length} flagged
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Coverage badge */}
            <div className="flex flex-col items-end">
              <span className={`${D} font-extrabold text-[18px] leading-none`} style={{ color: scoreColor(coverage) }}>
                {coverage}%
              </span>
              <span className="font-['Nunito'] font-extrabold text-[9px] uppercase tracking-wider" style={{ color: scoreColor(coverage), opacity: 0.7 }}>
                covered
              </span>
            </div>
            {/* Date */}
            <div className="text-right">
              <p className="font-['Nunito'] font-bold text-[12px] text-[#0F172A]">{format(new Date(sessionDate), "d MMM yyyy")}</p>
              <p className="font-['Nunito'] font-bold text-[11px] text-[#0F172A]/40">{formatDistanceToNow(new Date(sessionDate), { addSuffix: true })}</p>
            </div>
          </div>
        </div>

        {/* Objective */}
        <p className={`${D} font-extrabold text-[16px] text-[#0F172A] mt-2 leading-snug`} style={{ letterSpacing: "-0.015em" }}>
          {session.objective_text}
        </p>
      </div>

      {/* Missed concepts — always visible */}
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full bg-[#FEEFEC] border-[1.5px] border-[#DC2626]/30 flex items-center justify-center flex-shrink-0">
            <X className="w-2.5 h-2.5 text-[#DC2626]" />
          </div>
          <span className="font-['Nunito'] font-extrabold text-[12px] text-[#0F172A] uppercase tracking-wider">
            {report.concepts_missed.length} concept{report.concepts_missed.length !== 1 ? "s" : ""} not covered — study these
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {report.concepts_missed.map((concept) => {
            const isFlagged = flaggedForSession.some(f => f.concept_name.toLowerCase() === concept.toLowerCase());
            const tip = getStudyTip(concept);
            return (
              <div key={concept} className="rounded-[14px] border-[2px] border-[#DC2626]/20 bg-[#FEEFEC] overflow-hidden">
                <div className="flex items-center gap-2.5 px-4 py-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#DC2626] flex-shrink-0" />
                  <span className={`${D} font-extrabold text-[14px] text-[#0F172A] flex-1`}>{concept}</span>
                  {isFlagged && (
                    <span className="inline-flex items-center gap-1 font-['Nunito'] font-extrabold text-[10px] px-2 py-0.5 rounded-full text-[#C77800] bg-[#FFF6E2] border border-[#C77800]/25 uppercase tracking-wider">
                      <AlertTriangle className="w-2 h-2" /> Priority
                    </span>
                  )}
                </div>
                <div className="px-4 pb-3 pt-0 flex items-start gap-2">
                  <Sparkles className="w-3 h-3 text-[#2E2BE5] flex-shrink-0 mt-0.5" />
                  <p className="font-['Nunito'] font-semibold text-[12px] text-[#0F172A]/70 leading-relaxed m-0">{tip}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI coaching note for students */}
        {report.ai_coaching_note && (
          <div className="mt-3 rounded-[12px] bg-[#EEEDFF] border-[1.5px] border-[#2E2BE5]/20 px-4 py-3 flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#2E2BE5] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-['Nunito'] font-extrabold text-[11px] text-[#2E2BE5] uppercase tracking-wider mb-1">Teacher's note</p>
              <p className="font-['Nunito'] font-semibold text-[12.5px] text-[#2E2BE5]/80 leading-relaxed m-0">{report.ai_coaching_note}</p>
            </div>
          </div>
        )}

        {/* Covered concepts — collapsible */}
        {report.concepts_covered.length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1.5 font-['Nunito'] font-extrabold text-[11.5px] text-[#0F172A]/50 hover:text-[#0F172A] transition-colors"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {expanded ? "Hide" : "Show"} covered topics ({report.concepts_covered.length})
            </button>
            {expanded && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {report.concepts_covered.map(c => (
                  <span key={c} className="inline-flex items-center gap-1 font-['Nunito'] font-extrabold text-[10.5px] px-2.5 py-1 rounded-full border-[1.5px] text-[#16A56B] bg-[#ECFAF3] border-[#16A56B]/25">
                    <CheckCircle2 className="w-2.5 h-2.5" /> {c}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Key terms from student_session_summaries */}
        {summary?.key_terms && (summary.key_terms as KeyTerm[]).length > 0 && (
          <div className="mt-3 pt-3 border-t-[1.5px] border-[#0F172A]/08">
            <p className="font-['Nunito'] font-extrabold text-[11px] text-[#0F172A]/50 uppercase tracking-wider mb-2">Key terms to know</p>
            <div className="flex flex-wrap gap-1.5">
              {(summary.key_terms as KeyTerm[]).map(kt => (
                <span key={kt.term} className="font-['Nunito'] font-extrabold text-[10.5px] px-2.5 py-1 rounded-full text-[#0F172A] bg-[#EEF1F9] border border-[#0F172A]/12">
                  {kt.term}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ClassNotes() {
  const { user } = useAuth();
  const [className, setClassName] = useState(() => localStorage.getItem(LS_CLASS_KEY) ?? "");
  const [classInput, setClassInput] = useState(() => localStorage.getItem(LS_CLASS_KEY) ?? "");
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [flagged, setFlagged] = useState<FlaggedConcept[]>([]);
  const [loading, setLoading] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [hasSearched, setHasSearched] = useState(!!localStorage.getItem(LS_CLASS_KEY));

  const fetchNotes = async (cls: string) => {
    setLoading(true);
    const trimmed = cls.trim();

    // 1. Fetch completed sessions for this class
    const query = supabase
      .from("class_sessions")
      .select("*, conclusion_reports(*), student_session_summaries(*)")
      .eq("status", "completed")
      .order("ended_at", { ascending: false });

    if (trimmed) query.ilike("class_name", `%${trimmed}%`);

    const { data: sessionData } = await query;

    // 2. Filter to only sessions that have missed concepts
    const withGaps = ((sessionData ?? []) as ClassSession[]).filter(
      s => (s.conclusion_reports?.[0]?.concepts_missed?.length ?? 0) > 0
    );

    setSessions(withGaps);

    // 3. Fetch flagged concepts for this class
    const flagQuery = supabase
      .from("flagged_concepts")
      .select("*")
      .eq("resolved", false);
    if (trimmed) flagQuery.ilike("class_name", `%${trimmed}%`);
    const { data: flagData } = await flagQuery;
    setFlagged((flagData ?? []) as FlaggedConcept[]);

    setLoading(false);
  };

  // Auto-fetch if class name is already saved
  useEffect(() => {
    if (className) fetchNotes(className);
  }, []);

  const handleSearch = () => {
    const trimmed = classInput.trim();
    setClassName(trimmed);
    if (trimmed) localStorage.setItem(LS_CLASS_KEY, trimmed);
    else localStorage.removeItem(LS_CLASS_KEY);
    setHasSearched(true);
    setSubjectFilter("All");
    fetchNotes(trimmed);
  };

  const handleClear = () => {
    setClassInput("");
    setClassName("");
    localStorage.removeItem(LS_CLASS_KEY);
    setSessions([]);
    setFlagged([]);
    setHasSearched(false);
    setSubjectFilter("All");
  };

  // Computed stats + filters
  const subjects = useMemo(() => {
    const s = new Set(sessions.map(s => s.subject));
    return ["All", ...Array.from(s).sort()];
  }, [sessions]);

  const filtered = useMemo(() =>
    subjectFilter === "All" ? sessions : sessions.filter(s => s.subject === subjectFilter),
    [sessions, subjectFilter]
  );

  const totalMissed = useMemo(() =>
    sessions.reduce((sum, s) => sum + (s.conclusion_reports[0]?.concepts_missed?.length ?? 0), 0),
    [sessions]
  );

  const unresolvedFlagged = flagged.filter(f => !f.resolved).length;

  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      <div className="max-w-[860px] mx-auto px-5 pt-7 pb-24">

        {/* ── Hero header ── */}
        <div
          className="border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A] overflow-hidden mb-6"
          style={{ background: "radial-gradient(ellipse 80% 60% at 100% 0%, rgba(255,255,255,.14) 0%, rgba(255,255,255,0) 60%), linear-gradient(135deg, #0F172A 0%, #1E293B 100%)" }}
        >
          <div className="px-6 pt-5 pb-2">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-[12px] bg-white/15 border-[2px] border-white/25 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-['Nunito'] font-extrabold text-[11px] text-white/50 uppercase tracking-widest">AceTerus · ClassPulse</span>
                <h1 className={`${D} font-extrabold text-[30px] text-white leading-none`} style={{ letterSpacing: "-0.025em" }}>Class Notes</h1>
              </div>
            </div>
            <p className="font-['Nunito'] font-semibold text-[14px] text-white/65 mb-5 leading-relaxed">
              Topics your class missed during recent lessons — study these to fill your knowledge gaps.
            </p>

            {/* Class name search */}
            <div className="flex gap-2 mb-5">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Enter your class (e.g. 3 Bestari, 4 Amanah)"
                  value={classInput}
                  onChange={e => setClassInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/12 border-[2px] border-white/20 rounded-[12px] font-['Nunito'] font-bold text-[14px] text-white placeholder-white/35 outline-none focus:border-white/50 focus:bg-white/18 transition-all"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-[12px] bg-white text-[#0F172A] font-['Nunito'] font-extrabold text-[13px] border-[2px] border-white/80 hover:-translate-y-0.5 transition-all disabled:opacity-60 flex-shrink-0"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {className && classInput === className ? "Refresh" : "Search"}
              </button>
              {className && (
                <button onClick={handleClear} className="flex items-center justify-center w-10 h-10 rounded-[12px] bg-white/10 border-[2px] border-white/20 text-white/60 hover:text-white hover:bg-white/20 transition-all flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Stats row — only when we have data */}
          {!loading && hasSearched && sessions.length > 0 && (
            <div className="grid grid-cols-3 gap-2 px-5 pb-5">
              {[
                { icon: BookMarked, label: "Sessions with gaps", value: sessions.length },
                { icon: X,          label: "Missed concepts",    value: totalMissed },
                { icon: Layers,     label: "Subjects",           value: subjects.length - 1 },
              ].map(stat => (
                <div key={stat.label} className="rounded-[14px] px-3 py-3" style={{ background: "rgba(255,255,255,0.10)", border: "2px solid rgba(255,255,255,0.15)" }}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <stat.icon className="w-3 h-3 text-white/50" />
                    <span style={{ fontFamily: "'Nunito',sans-serif", fontSize: 10.5, fontWeight: 800, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {stat.label}
                    </span>
                  </div>
                  <span className={`${D} font-extrabold text-[26px] text-white leading-none`} style={{ letterSpacing: "-0.02em" }}>
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          )}
          {unresolvedFlagged > 0 && (
            <div className="mx-5 mb-5 rounded-[12px] px-4 py-2.5 flex items-center gap-2.5" style={{ background: "rgba(199,120,0,0.20)", border: "1.5px solid rgba(199,120,0,0.35)" }}>
              <AlertTriangle className="w-4 h-4 text-[#FDE68A] flex-shrink-0" />
              <p className="font-['Nunito'] font-bold text-[12.5px] text-[#FDE68A] m-0">
                <strong className="font-extrabold">{unresolvedFlagged} concept{unresolvedFlagged !== 1 ? "s" : ""}</strong> flagged by your teacher as priority review items.
              </p>
            </div>
          )}
        </div>

        {/* ── Subject filter chips ── */}
        {!loading && sessions.length > 1 && subjects.length > 2 && (
          <div className="flex items-center gap-2 flex-wrap mb-5">
            {subjects.map(sub => {
              const isOn = subjectFilter === sub;
              return (
                <button key={sub} onClick={() => setSubjectFilter(sub)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border-[2px] font-['Nunito'] font-extrabold text-[12px] transition-all"
                  style={{ borderColor: isOn ? "#0F172A" : "rgba(15,23,42,0.20)", background: isOn ? "#0F172A" : "#fff", color: isOn ? "#fff" : "rgba(15,23,42,0.55)", boxShadow: isOn ? "2px 2px 0 0 #0F172A" : "none" }}
                >
                  {sub}
                  {sub !== "All" && (
                    <span className="px-1.5 py-px rounded-full text-[10px] font-extrabold" style={{ background: isOn ? "rgba(255,255,255,0.22)" : "#EEF1F9", color: isOn ? "#fff" : "#0F172A" }}>
                      {sessions.filter(s => s.subject === sub).length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── States ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <RefreshCw className="w-7 h-7 animate-spin text-[#2E2BE5]" />
            <p className="font-['Nunito'] font-bold text-[14px] text-[#0F172A]/50">Fetching class notes…</p>
          </div>

        ) : !hasSearched ? (
          <div className="flex flex-col items-center py-20 text-center gap-4">
            <div className="w-16 h-16 rounded-[18px] bg-white border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-[#0F172A]/40" />
            </div>
            <div>
              <h2 className={`${D} font-extrabold text-[20px] text-[#0F172A] mb-1`}>Find your class notes</h2>
              <p className="font-['Nunito'] font-semibold text-[14px] text-[#0F172A]/50 max-w-sm">
                Enter your class name above to see topics your teacher didn't cover — so you know exactly what to revise.
              </p>
            </div>
          </div>

        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center gap-4">
            <div className="w-16 h-16 rounded-[18px] bg-[#ECFAF3] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-[#16A56B]" />
            </div>
            <div>
              <h2 className={`${D} font-extrabold text-[20px] text-[#0F172A] mb-1`}>
                {sessions.length === 0 ? `No gap notes for "${className}"` : `No gaps in ${subjectFilter}`}
              </h2>
              <p className="font-['Nunito'] font-semibold text-[14px] text-[#0F172A]/50 max-w-sm">
                {sessions.length === 0
                  ? "Either no sessions have been recorded for this class yet, or all lessons covered their topics fully."
                  : "All recorded sessions for this subject covered their topics. Switch filter to see other subjects."
                }
              </p>
            </div>
          </div>

        ) : (
          <>
            {/* Section label */}
            <div className="flex items-baseline justify-between mb-4">
              <h2 className={`${D} font-extrabold text-[18px] text-[#0F172A]`} style={{ letterSpacing: "-0.015em" }}>
                {subjectFilter === "All" ? "All Gap Notes" : subjectFilter}
              </h2>
              <span className="font-['Nunito'] font-bold text-[12px] text-[#0F172A]/50">
                {filtered.length} session{filtered.length !== 1 ? "s" : ""}{className ? ` · ${className}` : ""}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-4">
              {filtered.map(session => (
                <GapCard key={session.id} session={session} flagged={flagged} />
              ))}
            </div>

            {/* Footer tip */}
            <div className="mt-8 rounded-[16px] bg-white border-[2px] border-[#0F172A]/12 px-5 py-4 flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-[#2E2BE5] flex-shrink-0 mt-0.5" />
              <p className="font-['Nunito'] font-semibold text-[13px] text-[#0F172A]/60 leading-relaxed m-0">
                <strong className="text-[#0F172A] font-extrabold">Tip:</strong> Use your quiz section to test yourself on these missed concepts.
                Create flashcards or practice questions for each topic above to reinforce your understanding before the next exam.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
