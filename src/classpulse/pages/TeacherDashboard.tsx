import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Clock, CheckCircle2, PlayCircle, BookOpen,
  Loader2, X, Sparkles, Trash2, RefreshCw, Zap,
  CalendarDays, Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow, format } from "date-fns";

const DISPLAY = "font-['Baloo_2'] tracking-tight";
const C = { cyan: "#3BD6F5", blue: "#2F7CFF", indigo: "#2E2BE5", ink: "#0F172A" };
const CARD = "border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[3px_3px_0_0_#0F172A] bg-white";
const INPUT = "w-full px-4 py-3 border-[2px] border-[#0F172A]/20 rounded-[12px] font-['Nunito'] text-[14px] outline-none focus:border-[#2E2BE5] transition-all bg-white";

const SUBJECTS = [
  "Matematik", "Sains", "Bahasa Melayu", "English", "Sejarah",
  "Geografi", "Pendidikan Islam", "Pendidikan Moral", "Fizik",
  "Kimia", "Biologi", "Ekonomi", "Perniagaan", "Pendidikan Jasmani",
  "Seni Visual", "Muzik", "Teknologi Maklumat",
];

const PERIODS = ["Period 1", "Period 2", "Period 3", "Period 4", "Period 5", "Period 6", "Period 7", "Period 8"];

interface ConclReport {
  coverage_score: number | null;
  teaching_effectiveness_score?: number | null;
  ai_coaching_note: string | null;
  concepts_covered: string[];
  concepts_missed: string[];
}

interface ClassSession {
  id: string;
  class_name: string;
  subject: string;
  objective_text: string;
  key_concepts: string[];
  status: "pending" | "active" | "completed";
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  conclusion_reports?: ConclReport[] | null;
}

interface NewSessionForm {
  subject: string;
  class_name: string;
  objective_text: string;
  key_concepts_input: string;
  date: string;
  period: string;
}

/* ── Score ring (56 px, label underneath) ── */
function ScoreRing({ score }: { score: number }) {
  const r = 27;
  const circ = 2 * Math.PI * r;
  const color = score >= 80 ? "#16A56B" : score >= 60 ? "#C77800" : "#DC2626";
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="68" height="68" viewBox="0 0 68 68">
        <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(15,23,42,0.08)" strokeWidth="5" />
        <circle
          cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${(score / 100) * circ} ${circ}`}
          strokeLinecap="round" transform="rotate(-90 34 34)"
        />
        <text x="34" y="40" textAnchor="middle" fontSize="15" fontWeight="800"
          fill={color} fontFamily="Baloo 2, sans-serif">{score}%</text>
      </svg>
      <span
        className="font-['Nunito'] font-extrabold text-[#0F172A]/50 uppercase"
        style={{ fontSize: "10px", letterSpacing: "0.06em" }}
      >
        TES
      </span>
    </div>
  );
}

/* ── Status icon box for pending / active ── */
function StatusBox({ status }: { status: "pending" | "active" }) {
  if (status === "active") return (
    <div className="relative w-[68px] h-[68px] rounded-[16px] bg-red-50 border-[2px] border-red-200 flex items-center justify-center overflow-hidden">
      <span className="absolute inset-0 bg-red-400/15 animate-pulse rounded-[16px]" />
      <PlayCircle className="w-8 h-8 text-red-500 relative z-10" />
    </div>
  );
  return (
    <div className="w-[68px] h-[68px] rounded-[16px] bg-amber-50 border-[2px] border-amber-200 flex items-center justify-center">
      <Clock className="w-8 h-8 text-amber-500" />
    </div>
  );
}

/* ── Status badge ── */
function StatusBadge({ status }: { status: ClassSession["status"] }) {
  const base = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border font-['Nunito'] font-extrabold uppercase";
  const size = "text-[12px]";
  const ls = { letterSpacing: "0.04em" };

  if (status === "pending") return (
    <span className={`${base} ${size} bg-[#FFF6E2] text-[#C77800] border-[#C77800]/30`} style={ls}>
      <Clock className="w-2.5 h-2.5" /> Pending
    </span>
  );
  if (status === "active") return (
    <span className={`${base} ${size} bg-[#FEEFEC] text-[#DC2626] border-[#DC2626]/30`} style={ls}>
      <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-pulse" /> Live
    </span>
  );
  return (
    <span className={`${base} ${size} bg-[#ECFAF3] text-[#16A56B] border-[#16A56B]/30`} style={ls}>
      <CheckCircle2 className="w-2.5 h-2.5" /> Done
    </span>
  );
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ id: string; type: "delete" | "rerecord" } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [form, setForm] = useState<NewSessionForm>({
    subject: "",
    class_name: "",
    objective_text: "",
    key_concepts_input: "",
    date: new Date().toISOString().split("T")[0],
    period: "Period 1",
  });

  useEffect(() => {
    fetchSessions();
  }, [user]);

  const fetchSessions = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("class_sessions")
      .select("*, conclusion_reports(*)")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });
    setSessions((data as ClassSession[]) || []);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    setActionLoading(true);
    await supabase.from("conclusion_reports").delete().eq("session_id", id);
    await supabase.from("class_sessions").delete().eq("id", id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setConfirmAction(null);
    setActionLoading(false);
  };

  const handleRerecord = async (id: string) => {
    setActionLoading(true);
    await supabase.from("conclusion_reports").delete().eq("session_id", id);
    await supabase.from("class_sessions").update({
      status: "pending", started_at: null, ended_at: null, transcript_text: null,
    }).eq("id", id);
    setSessions((prev) =>
      prev.map((s) => s.id === id
        ? { ...s, status: "pending", started_at: null, ended_at: null, conclusion_reports: null }
        : s)
    );
    setConfirmAction(null);
    setActionLoading(false);
    navigate(`/session/${id}`);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.subject || !form.class_name || !form.objective_text) {
      setFormError("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    setFormError("");

    const concepts = form.key_concepts_input.split(",").map((c) => c.trim()).filter(Boolean);
    const { data, error } = await supabase
      .from("class_sessions")
      .insert({
        teacher_id: user.id,
        class_name: form.class_name,
        subject: form.subject,
        objective_text: form.objective_text,
        key_concepts: concepts,
        status: "pending",
      })
      .select()
      .single();

    if (error) { setFormError(error.message); setSaving(false); return; }

    setSessions((prev) => [data as ClassSession, ...prev]);
    setShowForm(false);
    setForm({
      subject: "", class_name: "", objective_text: "",
      key_concepts_input: "", date: new Date().toISOString().split("T")[0], period: "Period 1",
    });
    setSaving(false);
    navigate(`/session/${data.id}`);
  };

  /* ── KPI stats ── */
  const completedWithReport = sessions.filter(s => s.conclusion_reports?.[0]?.coverage_score != null);
  const avgCoverage = completedWithReport.length > 0
    ? Math.round(completedWithReport.reduce((sum, s) => {
        const r = s.conclusion_reports![0];
        return sum + (r.teaching_effectiveness_score ?? r.coverage_score ?? 0);
      }, 0) / completedWithReport.length)
    : null;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeekCount = sessions.filter(s => new Date(s.created_at).getTime() > sevenDaysAgo).length;
  const completedCount = sessions.filter(s => s.status === "completed").length;
  const avgColor = avgCoverage == null ? "rgba(255,255,255,0.9)" : avgCoverage >= 80 ? "#B6F7CE" : avgCoverage >= 60 ? "#FDE68A" : "#FCA5A5";

  const kpis = [
    { label: "Total Sessions", value: sessions.length, sub: "all time" },
    { label: "Avg TES", value: avgCoverage != null ? `${avgCoverage}%` : "—", sub: "analysed", color: avgColor },
    { label: "This Week", value: thisWeekCount, sub: "sessions" },
    { label: "Completed", value: completedCount, sub: "sessions" },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      <div className="max-w-[1200px] mx-auto px-5 pt-7 pb-20">

        {/* ── Hero ── */}
        <div
          className="rounded-[20px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] overflow-hidden mb-6"
          style={{ background: "radial-gradient(ellipse 80% 60% at 100% 0%, rgba(255,255,255,.14) 0%, rgba(255,255,255,0) 60%), linear-gradient(135deg, #2E2BE5 0%, #2F7CFF 100%)" }}
        >
          {/* Hero top row */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-[13px] border-[2.5px] border-white/30 bg-white/15 flex items-center justify-center shadow-[2px_2px_0_0_rgba(0,0,0,0.18)]">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className="font-['Nunito'] font-extrabold text-white/80 uppercase"
                    style={{ fontSize: "12px", letterSpacing: "0.08em" }}
                  >
                    Teacher Dashboard
                  </span>
                </div>
                <h1 className={`${DISPLAY} font-extrabold text-[38px] text-white leading-none`} style={{ letterSpacing: "-0.025em" }}>
                  My Sessions
                </h1>
              </div>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-[13px] border-[2.5px] border-[#0F172A] bg-white font-['Nunito'] font-extrabold text-[13px] text-[#2E2BE5] shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] transition-all"
            >
              <Plus className="w-4 h-4" /> New Session
            </button>
          </div>

          {/* KPI grid */}
          {!loading && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 px-5 pb-5">
              {kpis.map((k) => (
                <div
                  key={k.label}
                  className="rounded-[14px] px-4 py-3.5"
                  style={{ background: "rgba(255,255,255,0.13)", border: "2px solid rgba(255,255,255,0.22)" }}
                >
                  <p
                    className="font-['Nunito'] font-extrabold text-white/80 uppercase mb-1.5"
                    style={{ fontSize: "12px", letterSpacing: "0.05em" }}
                  >
                    {k.label}
                  </p>
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`${DISPLAY} font-extrabold leading-none`}
                      style={{ fontSize: "40px", letterSpacing: "-0.025em", color: k.color ?? "white" }}
                    >
                      {loading ? "—" : k.value}
                    </span>
                    <span className="font-['Nunito'] font-bold text-white/60 text-[14px]">{k.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Today's Schedule ── */}
        {!loading && (() => {
          const PERIOD_TIMES = ["07:40","08:20","09:00","09:40","10:10","10:50","11:30","12:10"];

          // Slot assignment: completed (high TES first) → P1-P3,
          // active → first post-break slot, pending → remaining, FREE for rest
          const completedSorted = sessions
            .filter(s => s.status === "completed")
            .sort((a, b) => {
              const aTes = a.conclusion_reports?.[0]?.teaching_effectiveness_score ?? a.conclusion_reports?.[0]?.coverage_score ?? 0;
              const bTes = b.conclusion_reports?.[0]?.teaching_effectiveness_score ?? b.conclusion_reports?.[0]?.coverage_score ?? 0;
              return bTes - aTes;
            });
          const activeSessions = sessions.filter(s => s.status === "active");
          const pendingSorted  = sessions.filter(s => s.status === "pending");

          let compIdx = 0, actIdx = 0, pendIdx = 0;
          type Slot =
            | { kind: "done" | "live" | "upnext"; session: ClassSession; period: number; time: string }
            | { kind: "break" | "free"; period: number; time: string };

          const slots: Slot[] = [1,2,3,4,5,6,7,8].map((p, i) => {
            const time = PERIOD_TIMES[i];
            if (p === 4) return { kind: "break" as const, period: p, time };
            if (p <= 3 && compIdx < completedSorted.length)
              return { kind: "done" as const,   session: completedSorted[compIdx++], period: p, time };
            if (p > 4 && actIdx < activeSessions.length)
              return { kind: "live" as const,   session: activeSessions[actIdx++],  period: p, time };
            if (p > 4 && pendIdx < pendingSorted.length)
              return { kind: "upnext" as const, session: pendingSorted[pendIdx++],  period: p, time };
            if (compIdx < completedSorted.length)
              return { kind: "done" as const,   session: completedSorted[compIdx++], period: p, time };
            return { kind: "free" as const, period: p, time };
          });

          return (
            <div className={`${CARD} mb-6 overflow-hidden`}>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b-[2px] border-[#0F172A]/10 bg-[#F8F9FF]">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-[9px] border-[2px] border-[#0F172A] bg-[#2E2BE5] flex items-center justify-center shadow-[2px_2px_0_0_#0F172A]">
                    <CalendarDays className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h2 className={`${DISPLAY} font-extrabold text-[20px] text-[#0F172A]`}>Today's Schedule</h2>
                </div>
                <p className="font-['Nunito'] font-semibold text-[12px] text-[#0F172A]/40">
                  {format(new Date(), "EEEE, d MMMM yyyy")} · {sessions.length} session{sessions.length !== 1 ? "s" : ""}
                </p>
              </div>

              {/* 2×4 period grid */}
              <div className="p-6 grid grid-cols-4 gap-4">
                {slots.map((slot) => {
                  /* ── BREAK ── */
                  if (slot.kind === "break") return (
                    <div key={slot.period}
                      className="flex flex-col rounded-[16px] p-4 border-[2px] border-dashed border-[#0F172A]/15 bg-white"
                      style={{ minHeight: "200px" }}>
                      <div className="flex items-center justify-between">
                        <span className="font-['Nunito'] font-semibold text-[13px] uppercase text-[#0F172A]/35" style={{ letterSpacing: "0.05em" }}>
                          P{slot.period} · Break
                        </span>
                        <span className="font-mono text-[13px] font-semibold text-[#0F172A]/35">{slot.time}</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-center gap-1">
                        <p className="font-['Nunito'] font-bold text-[17px] text-[#0F172A]/40">Recess</p>
                        <p className="font-['Nunito'] text-[13px] text-[#0F172A]/25">No class</p>
                      </div>
                    </div>
                  );

                  /* ── FREE ── */
                  if (slot.kind === "free") return (
                    <div key={slot.period}
                      className="flex flex-col rounded-[16px] p-4 border-[2px] border-dashed border-[#0F172A]/10 bg-white"
                      style={{
                        minHeight: "200px",
                        background: "repeating-linear-gradient(45deg,transparent,transparent 6px,rgba(15,23,42,0.035) 6px,rgba(15,23,42,0.035) 7px)",
                      }}>
                      <div className="flex items-center justify-between">
                        <span className="font-['Nunito'] font-semibold text-[13px] uppercase text-[#0F172A]/30" style={{ letterSpacing: "0.05em" }}>
                          P{slot.period}
                        </span>
                        <span className="font-mono text-[13px] font-semibold text-[#0F172A]/25">{slot.time}</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-center gap-1">
                        <p className="font-['Nunito'] font-bold text-[17px] text-[#0F172A]/30">Free</p>
                        <p className="font-['Nunito'] text-[14px] text-[#0F172A]/20">—</p>
                      </div>
                    </div>
                  );

                  /* ── SESSION CARDS (DONE / LIVE / UP NEXT) ── */
                  const s = slot.session;
                  const report    = s.conclusion_reports?.[0] ?? null;
                  const hasReport = s.status === "completed" && report?.coverage_score != null;
                  const tes       = hasReport ? Math.round((report!.teaching_effectiveness_score ?? report!.coverage_score)!) : null;
                  const tesColor  = tes == null ? "#0F172A" : tes >= 80 ? "#16A56B" : tes >= 60 ? "#C77800" : "#DC2626";

                  const topics = hasReport
                    ? [
                        ...report!.concepts_covered.slice(0, 2).map(c => ({ label: c, dot: "#16A56B", bg: "#ECFAF3", text: "#16A56B" })),
                        ...report!.concepts_missed.slice(0, 1).map(c  => ({ label: c, dot: "#DC2626", bg: "#FEEFEC", text: "#DC2626" })),
                      ]
                    : s.key_concepts.slice(0, 3).map(c => ({ label: c, dot: "#2F7CFF", bg: "#DDF3FF", text: "#2F7CFF" }));

                  const cfg = {
                    done:   { bg: "#e6f9f0", border: "rgba(22,165,107,0.5)", shadow: "none",                                                      labelColor: "#16A56B", badgeText: `P${slot.period} · DONE`,    nameColor: "#0F172A", emoji: "📊" },
                    live:   { bg: "#fde8e8", border: "#DC2626",               shadow: "0 0 0 3px rgba(220,38,38,0.12),0 0 20px rgba(220,38,38,0.1)", labelColor: "#DC2626", badgeText: "LIVE",                nameColor: "#0F172A", emoji: "🎙️" },
                    upnext: { bg: "#eeeaff", border: "#2E2BE5",               shadow: "none",                                                      labelColor: "#2E2BE5", badgeText: `P${slot.period} · UP NEXT`, nameColor: "#2E2BE5", emoji: "▶️" },
                  }[slot.kind];

                  const shortObj = s.objective_text.length > 40 ? s.objective_text.slice(0, 40) + "…" : s.objective_text;

                  return (
                    <div
                      key={s.id}
                      onClick={() => s.status === "completed" ? navigate(`/report/${s.id}`) : navigate(`/session/${s.id}`)}
                      className="flex flex-col justify-between rounded-[16px] p-4 cursor-pointer transition-all hover:-translate-y-0.5"
                      style={{ minHeight: "200px", background: cfg.bg, border: `2px solid ${cfg.border}`, boxShadow: cfg.shadow }}
                    >
                      {/* Top: badge + time */}
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-['Nunito'] font-semibold text-[13px] uppercase leading-tight" style={{ letterSpacing: "0.05em", color: cfg.labelColor }}>
                          {cfg.badgeText}
                          {slot.kind === "live" && <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-[#DC2626] animate-pulse align-middle" />}
                        </span>
                        <span className="font-mono text-[13px] font-semibold flex-shrink-0" style={{ color: cfg.labelColor }}>{slot.time}</span>
                      </div>

                      {/* Bottom: class name + subject·topic + TES + pills + button */}
                      <div>
                        <p className="font-['Nunito'] font-bold text-[20px] leading-tight mb-0.5" style={{ color: cfg.nameColor }}>
                          {s.class_name}
                        </p>
                        <p className="font-['Nunito'] text-[14px] text-[#0F172A]/50 mb-2 leading-snug">{s.subject} · {shortObj}</p>

                        {/* TES % for done cards */}
                        {slot.kind === "done" && tes != null && (
                          <p className={`${DISPLAY} font-extrabold text-[18px] mb-2`} style={{ color: tesColor }}>{tes}%</p>
                        )}

                        {/* Topic pills */}
                        {topics.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {topics.map(t => (
                              <span key={t.label} className="font-['Nunito'] font-bold inline-flex items-center gap-1 px-2 py-0.5 rounded-full border-[1.5px]"
                                style={{ fontSize: "11px", color: t.text, background: t.bg, borderColor: `${t.dot}40` }}>
                                <span className="rounded-full flex-shrink-0" style={{ width: "5px", height: "5px", background: t.dot }} />
                                {t.label}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Emoji button */}
                        <div className="flex justify-end" onClick={e => e.stopPropagation()}>
                          <button
                            title={slot.kind === "done" ? "View Report" : slot.kind === "live" ? "Join Live" : "Start Session"}
                            onClick={() => { if (s.status === "completed") navigate(`/report/${s.id}`); else navigate(`/session/${s.id}`); }}
                            className="flex items-center justify-center rounded-full bg-white border-[1.5px] border-[#0F172A]/20 shadow-[1px_1px_0_0_rgba(15,23,42,0.15)] hover:-translate-y-0.5 transition-all"
                            style={{ width: "32px", height: "32px", fontSize: "16px" }}
                          >
                            {cfg.emoji}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── Toolbar ── */}
        {!loading && sessions.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <p className="font-['Nunito'] font-bold text-[13px] text-[#0F172A]/50">
              {sessions.length} session{sessions.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {/* ── Session list ── */}
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-[#2E2BE5]" />
          </div>
        ) : sessions.length === 0 ? (
          <div className={`${CARD} py-24 flex flex-col items-center gap-4 text-center`}>
            <div className="text-5xl">📋</div>
            <p className={`${DISPLAY} font-extrabold text-xl text-[#0F172A]`}>No sessions yet</p>
            <p className="font-['Nunito'] text-[14px] text-[#0F172A]/50 max-w-xs">
              Create your first session to start monitoring your class.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border-[2.5px] border-[#0F172A] bg-[#2E2BE5] text-white font-bold font-['Nunito'] text-[14px] shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 transition-all"
            >
              <Plus className="w-4 h-4" /> Create Session
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sessions.map((s) => {
              const isConfirming = confirmAction?.id === s.id;
              const report = s.conclusion_reports?.[0] ?? null;
              const hasReport = s.status === "completed" && report != null && report.coverage_score != null;

              return (
                <div
                  key={s.id}
                  onClick={() => {
                    if (isConfirming) return;
                    if (s.status === "completed") navigate(`/report/${s.id}`);
                    else navigate(`/session/${s.id}`);
                  }}
                  className={`${CARD} transition-all overflow-hidden ${isConfirming ? "cursor-default" : "hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#0F172A] cursor-pointer"}`}
                >
                  {/* Card body — 3-column: ring | content | actions */}
                  <div className="p-5 grid gap-4" style={{ gridTemplateColumns: "68px 1fr 120px" }}>

                    {/* Ring / status icon */}
                    <div className="flex items-start pt-0.5">
                      {hasReport
                        ? <ScoreRing score={Math.round((report!.teaching_effectiveness_score ?? report!.coverage_score)!)} />
                        : <StatusBox status={s.status as "pending" | "active"} />
                      }
                    </div>

                    {/* Content */}
                    <div className="min-w-0">
                      {/* Badges */}
                      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        <StatusBadge status={s.status} />
                        <span
                          className="font-['Nunito'] font-extrabold text-[#0F172A]/40 border border-[#0F172A]/15 rounded-full px-2 py-0.5"
                          style={{ fontSize: "12.5px", letterSpacing: "0.02em" }}
                        >
                          {s.subject}
                        </span>
                        <span
                          className="font-['Nunito'] font-extrabold text-[#0F172A]/40 border border-[#0F172A]/15 rounded-full px-2 py-0.5"
                          style={{ fontSize: "12.5px", letterSpacing: "0.02em" }}
                        >
                          {s.class_name}
                        </span>
                      </div>

                      {/* Objective */}
                      <p className={`${DISPLAY} font-extrabold text-[18px] text-[#0F172A] mb-2 leading-snug`}
                        style={{ letterSpacing: "-0.018em" }}>
                        {s.objective_text}
                      </p>

                      {/* Concept pills */}
                      {hasReport ? (
                        <div className="flex flex-wrap gap-1">
                          {report!.concepts_covered.slice(0, 3).map((c) => (
                            <span key={c} className="font-['Nunito'] font-extrabold px-2 py-0.5 rounded-full bg-[#ECFAF3] text-[#16A56B] border-[1.5px] border-[#16A56B]/25"
                              style={{ fontSize: "12.5px" }}>
                              ✓ {c}
                            </span>
                          ))}
                          {report!.concepts_missed.slice(0, 2).map((c) => (
                            <span key={c} className="font-['Nunito'] font-extrabold px-2 py-0.5 rounded-full bg-[#FEEFEC] text-[#DC2626] border-[1.5px] border-[#DC2626]/25"
                              style={{ fontSize: "12.5px" }}>
                              ✗ {c}
                            </span>
                          ))}
                          {(report!.concepts_covered.length + report!.concepts_missed.length) > 5 && (
                            <span className="font-['Nunito'] font-extrabold px-2 py-0.5 rounded-full bg-[#EEF1F9] text-[#0F172A]/50 border-[1.5px] border-[#0F172A]/10"
                              style={{ fontSize: "12.5px" }}>
                              +{(report!.concepts_covered.length + report!.concepts_missed.length) - 5} more
                            </span>
                          )}
                        </div>
                      ) : s.key_concepts.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {s.key_concepts.slice(0, 4).map((c) => (
                            <span key={c} className="font-['Nunito'] font-extrabold px-2 py-0.5 rounded-full bg-[#DDF3FF] text-[#2F7CFF] border-[1.5px] border-[#2F7CFF]/20"
                              style={{ fontSize: "12.5px" }}>
                              {c}
                            </span>
                          ))}
                          {s.key_concepts.length > 4 && (
                            <span className="font-['Nunito'] font-extrabold px-2 py-0.5 rounded-full bg-[#EEF1F9] text-[#0F172A]/50 border-[1.5px] border-[#0F172A]/10"
                              style={{ fontSize: "12.5px" }}>
                              +{s.key_concepts.length - 4} more
                            </span>
                          )}
                        </div>
                      ) : null}

                      {/* AI coaching note */}
                      {hasReport && report!.ai_coaching_note && (
                        <div className="mt-2.5 flex items-start gap-1.5 bg-[#EEEDFF] rounded-[10px] px-3 py-2">
                          <Sparkles className="w-3 h-3 text-[#2E2BE5] flex-shrink-0 mt-0.5" />
                          <p className="font-['Nunito'] font-semibold text-[#2E2BE5] leading-relaxed overflow-hidden"
                            style={{ fontSize: "11px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                            {report!.ai_coaching_note}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions column */}
                    <div className="flex flex-col items-end justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                      {/* Timestamp */}
                      <div className="text-right">
                        <p className="font-['Nunito'] font-bold text-[11px] text-[#0F172A]/40 leading-relaxed">
                          {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                        </p>
                        {s.ended_at && (
                          <p className="font-['Nunito'] font-bold text-[11px] text-[#0F172A]/40">
                            {format(new Date(s.ended_at), "d MMM yyyy")}
                          </p>
                        )}
                      </div>

                      {/* Buttons */}
                      <div className="flex flex-col gap-1.5 items-end w-full">
                        {s.status === "pending" && (
                          <button
                            onClick={() => navigate(`/session/${s.id}`)}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[10px] border-[2px] border-[#0F172A] bg-[#2E2BE5] text-white font-['Nunito'] font-extrabold shadow-[2px_2px_0_0_#0F172A] hover:-translate-y-0.5 transition-all"
                            style={{ fontSize: "11.5px" }}
                          >
                            <Zap className="w-3 h-3" /> Go Live
                          </button>
                        )}
                        {s.status === "completed" && (
                          <button
                            onClick={() => setConfirmAction({ id: s.id, type: "rerecord" })}
                            className="w-full flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-[10px] border-[2px] border-[#0F172A]/15 font-['Nunito'] font-extrabold text-[#2E2BE5] hover:border-[#2E2BE5] hover:bg-[#EEEDFF] transition-all"
                            style={{ fontSize: "11px" }}
                          >
                            <RefreshCw className="w-3 h-3" /> Re-record
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmAction({ id: s.id, type: "delete" })}
                          className="w-full flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-[10px] border-[2px] border-[#0F172A]/15 font-['Nunito'] font-extrabold text-red-500 hover:border-red-300 hover:bg-red-50 transition-all"
                          style={{ fontSize: "11px" }}
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Inline confirm strip */}
                  {isConfirming && (
                    <div
                      className="px-5 pb-5 pt-4 border-t-[2px] border-[#0F172A]/10 flex items-center justify-between gap-3 flex-wrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div>
                        <p className="font-['Nunito'] text-[13px] font-bold text-[#0F172A]">
                          {confirmAction!.type === "delete" ? "Delete this session permanently?" : "Reset and re-record this session?"}
                        </p>
                        <p className="font-['Nunito'] text-[11px] text-[#0F172A]/50 mt-0.5">
                          {confirmAction!.type === "delete"
                            ? "This will remove all session data and the report. This cannot be undone."
                            : "The existing report will be deleted and you'll re-record from scratch."}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setConfirmAction(null)}
                          className="px-3 py-1.5 rounded-[10px] border-[2px] border-[#0F172A]/20 text-[12px] font-bold font-['Nunito'] text-[#0F172A]/60 hover:border-[#0F172A] hover:text-[#0F172A] transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => confirmAction!.type === "delete" ? handleDelete(s.id) : handleRerecord(s.id)}
                          disabled={actionLoading}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border-[2px] border-[#0F172A] text-[12px] font-bold font-['Nunito'] text-white shadow-[2px_2px_0_0_#0F172A] hover:-translate-y-0.5 transition-all disabled:opacity-60 ${
                            confirmAction!.type === "delete" ? "bg-red-500 border-red-600 shadow-[2px_2px_0_0_#991B1B]" : "bg-[#2E2BE5]"
                          }`}
                        >
                          {actionLoading
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : confirmAction!.type === "delete"
                              ? <><Trash2 className="w-3 h-3" /> Delete</>
                              : <><RefreshCw className="w-3 h-3" /> Re-record</>}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Fixed settings button ── */}
      <button
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center rounded-[16px] bg-white border-[2.5px] border-[#0F172A] shadow-[4px_4px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#0F172A] transition-all"
        style={{ width: "56px", height: "56px" }}
        title="Settings"
      >
        <Settings className="w-6 h-6 text-[#0F172A]/70" />
      </button>

      {/* ── New Session Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-sm">
          <div className={`${CARD} w-full max-w-lg max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between p-6 border-b-[2.5px] border-[#0F172A]">
              <h2 className={`${DISPLAY} font-extrabold text-xl text-[#0F172A]`}>New Session</h2>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl border-[2px] border-[#0F172A]/20 hover:border-[#0F172A] hover:bg-[#0F172A]/5 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block font-['Nunito'] text-[13px] font-bold text-[#0F172A]/70 mb-1.5">
                  Subject <span className="text-red-500">*</span>
                </label>
                <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={INPUT} required>
                  <option value="">Select subject…</option>
                  {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-['Nunito'] text-[13px] font-bold text-[#0F172A]/70 mb-1.5">
                  Class Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" placeholder="e.g. 3 Bestari"
                  value={form.class_name} onChange={(e) => setForm({ ...form, class_name: e.target.value })}
                  className={INPUT} required
                />
              </div>

              <div>
                <label className="block font-['Nunito'] text-[13px] font-bold text-[#0F172A]/70 mb-1.5">
                  Lesson Objective <span className="text-red-500">*</span>
                </label>
                <textarea
                  placeholder="e.g. Students understand osmosis and concentration gradient"
                  value={form.objective_text} onChange={(e) => setForm({ ...form, objective_text: e.target.value })}
                  className={`${INPUT} resize-none`} rows={3} required
                />
              </div>

              <div>
                <label className="block font-['Nunito'] text-[13px] font-bold text-[#0F172A]/70 mb-1.5">
                  Key Concepts to Track
                  <span className="font-normal text-[#0F172A]/40 ml-1">(comma-separated)</span>
                </label>
                <div className="relative">
                  <input
                    type="text" placeholder="osmosis, concentration gradient, semi-permeable membrane"
                    value={form.key_concepts_input} onChange={(e) => setForm({ ...form, key_concepts_input: e.target.value })}
                    className={INPUT}
                  />
                  {form.objective_text && !form.key_concepts_input && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold font-['Nunito'] text-[#2E2BE5]/70">
                      <Sparkles className="w-3 h-3" /> Type concepts above or they will be auto-detected from your objective
                    </div>
                  )}
                </div>
                {form.key_concepts_input && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {form.key_concepts_input.split(",").map((c) => c.trim()).filter(Boolean).map((c) => (
                      <span key={c} className="text-[10px] font-bold font-['Nunito'] px-2 py-0.5 rounded-full bg-[#DDF3FF] text-[#2F7CFF] border border-[#2F7CFF]/20">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-['Nunito'] text-[13px] font-bold text-[#0F172A]/70 mb-1.5">Date</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={INPUT} />
                </div>
                <div>
                  <label className="block font-['Nunito'] text-[13px] font-bold text-[#0F172A]/70 mb-1.5">Period</label>
                  <select value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} className={INPUT}>
                    {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {formError && <p className="font-['Nunito'] text-[13px] text-red-500 font-semibold">{formError}</p>}

              <button
                type="submit" disabled={saving}
                className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl border-[2.5px] border-[#0F172A] bg-[#2E2BE5] text-white font-bold font-['Nunito'] text-[15px] shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] transition-all disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create & Go to Session →"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
