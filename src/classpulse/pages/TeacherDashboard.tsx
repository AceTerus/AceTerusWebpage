import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Clock, CheckCircle2, PlayCircle, Mic,
  Loader2, X, Sparkles, Trash2, RefreshCw, Zap,
  CalendarDays, Settings, Search, BarChart3, BookOpen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow, format } from "date-fns";

// ─── Design tokens ────────────────────────────────────────────────────────────
const D = "font-['Baloo_2'] tracking-tight";
const CARD = "bg-white border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[3px_3px_0_0_#0F172A]";
const BTN = "inline-flex items-center gap-1.5 font-['Nunito'] font-extrabold border-[2px] transition-all";
const INPUT_CLS =
  "w-full px-3.5 py-2.5 border-[2px] border-[#0F172A]/20 rounded-[12px] font-['Nunito'] font-bold text-[14px] text-[#0F172A] outline-none focus:border-[#2E2BE5] focus:ring-4 focus:ring-[#EEEDFF] transition-all bg-white";

const SUBJECTS = [
  "Mathematics","Science","Malay Language","English","History","Geography",
  "Islamic Studies","Moral Education","Physics","Chemistry","Biology",
  "Economics","Business Studies","Physical Education","Visual Arts","Music","Information Technology",
];
const PERIODS = ["Period 1","Period 2","Period 3","Period 4","Period 5","Period 6","Period 7","Period 8"];
const PERIOD_TIMES = ["07:40","08:20","09:00","09:40","10:10","10:50","11:30","12:10"];

// ─── Types ────────────────────────────────────────────────────────────────────
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
  subject: string; class_name: string; objective_text: string;
  key_concepts_input: string; date: string; period: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function scoreColor(s: number) {
  return s >= 80 ? "#16A56B" : s >= 65 ? "#2F7CFF" : s >= 50 ? "#C77800" : "#DC2626";
}
function formatElapsed(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ─── Score ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r = 24, circ = 2 * Math.PI * r, color = scoreColor(score);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: 56, height: 56 }}>
        <svg width="56" height="56" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
          <circle cx="28" cy="28" r={r} stroke="rgba(15,23,42,0.10)" strokeWidth="4" fill="none" />
          <circle cx="28" cy="28" r={r} stroke={color} strokeWidth="4" fill="none"
            strokeDasharray={`${(score / 100) * circ} ${circ}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{ fontFamily:"'Baloo 2',sans-serif", fontWeight:800, fontSize:15, color, letterSpacing:"-0.02em", fontVariantNumeric:"tabular-nums" }}>
            {score}
          </span>
        </div>
      </div>
      <span className="font-['Nunito'] font-extrabold text-[#0F172A]/50 uppercase" style={{ fontSize:"9.5px", letterSpacing:"0.06em" }}>TES</span>
    </div>
  );
}

// ─── Status box ───────────────────────────────────────────────────────────────
function StatusBox({ status }: { status: "pending" | "active" }) {
  if (status === "active") return (
    <div className="relative flex items-center justify-center rounded-[14px] bg-[#FEEFEC] border-[2px] border-[#DC2626]" style={{ width:56, height:56 }}>
      <span className="absolute inset-0 rounded-[14px] bg-[#DC2626] animate-ping opacity-30" />
      <Mic className="w-6 h-6 text-[#DC2626] relative z-10" />
    </div>
  );
  return (
    <div className="flex items-center justify-center rounded-[14px] bg-[#FFF6E2] border-[2px] border-[#C77800]/40" style={{ width:56, height:56 }}>
      <Clock className="w-6 h-6 text-[#C77800]" />
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ClassSession["status"] }) {
  const base = "inline-flex items-center gap-1 px-2.5 py-1 rounded-full border-[1.5px] font-['Nunito'] font-extrabold uppercase text-[11px]";
  const ls = { letterSpacing:"0.04em" };
  if (status === "pending") return (
    <span className={`${base} text-[#C77800] bg-[#FFF6E2] border-[#C77800]/25`} style={ls}>
      <Clock className="w-2.5 h-2.5" /> Pending
    </span>
  );
  if (status === "active") return (
    <span className={`${base} text-[#DC2626] bg-[#FEEFEC] border-[#DC2626]/25`} style={ls}>
      <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-pulse" /> Live
    </span>
  );
  return (
    <span className={`${base} text-[#16A56B] bg-[#ECFAF3] border-[#16A56B]/25`} style={ls}>
      <CheckCircle2 className="w-2.5 h-2.5" /> Done
    </span>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
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
  const [filter, setFilter] = useState<"all" | "live" | "pending" | "done">("all");
  const [sortBy, setSortBy] = useState<"recent" | "coverage" | "subject">("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [form, setForm] = useState<NewSessionForm>({
    subject:"", class_name:"", objective_text:"", key_concepts_input:"",
    date: new Date().toISOString().split("T")[0], period:"Period 1",
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchSessions(); }, [user]);

  // Real-time: keep session statuses in sync so live callout appears/disappears instantly
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("teacher-sessions-status")
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "class_sessions",
        filter: `teacher_id=eq.${user.id}`,
      }, (payload) => {
        setSessions(prev =>
          prev.map(s => s.id === payload.new.id ? { ...s, ...(payload.new as ClassSession) } : s)
        );
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const activeSession = sessions.find(s => s.status === "active") ?? null;

  useEffect(() => {
    if (!activeSession?.started_at) return;
    const update = () => setElapsedSec(Math.floor((Date.now() - new Date(activeSession.started_at!).getTime()) / 1000));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [activeSession?.started_at]);

  const fetchSessions = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("class_sessions").select("*, conclusion_reports(*)")
      .eq("teacher_id", user.id).order("created_at", { ascending: false });
    setSessions((data as ClassSession[]) || []);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    setActionLoading(true);
    await supabase.from("conclusion_reports").delete().eq("session_id", id);
    await supabase.from("class_sessions").delete().eq("id", id);
    setSessions(prev => prev.filter(s => s.id !== id));
    setConfirmAction(null);
    setActionLoading(false);
  };

  const handleRerecord = async (id: string) => {
    setActionLoading(true);
    await supabase.from("conclusion_reports").delete().eq("session_id", id);
    await supabase.from("class_sessions").update({ status:"pending", started_at:null, ended_at:null, transcript_text:null }).eq("id", id);
    setSessions(prev => prev.map(s => s.id === id ? { ...s, status:"pending" as const, started_at:null, ended_at:null, conclusion_reports:null } : s));
    setConfirmAction(null);
    setActionLoading(false);
    navigate(`/session/${id}`);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.subject || !form.class_name || !form.objective_text) {
      setFormError("Please fill in all required fields."); return;
    }
    setSaving(true); setFormError("");
    const concepts = form.key_concepts_input.split(",").map(c => c.trim()).filter(Boolean);
    const { data, error } = await supabase.from("class_sessions").insert({
      teacher_id: user.id, class_name: form.class_name, subject: form.subject,
      objective_text: form.objective_text, key_concepts: concepts, status: "pending",
    }).select().single();
    if (error) { setFormError(error.message); setSaving(false); return; }
    setSessions(prev => [data as ClassSession, ...prev]);
    setShowForm(false);
    setForm({ subject:"", class_name:"", objective_text:"", key_concepts_input:"", date: new Date().toISOString().split("T")[0], period:"Period 1" });
    setSaving(false);
    navigate(`/session/${data.id}`);
  };

  // ─── Computed ──────────────────────────────────────────────────────────────
  const completedWithReport = sessions.filter(s => s.conclusion_reports?.[0]?.coverage_score != null);
  const avgTES = completedWithReport.length > 0
    ? Math.round(completedWithReport.reduce((sum, s) => sum + (s.conclusion_reports![0].teaching_effectiveness_score ?? s.conclusion_reports![0].coverage_score ?? 0), 0) / completedWithReport.length)
    : null;

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeekCount = sessions.filter(s => new Date(s.created_at).getTime() > sevenDaysAgo).length;
  const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0);
  const todaySessions = sessions.filter(s => new Date(s.created_at) >= todayMidnight);
  const completedSessions = sessions.filter(s => s.status === "completed");
  const goalsHit = completedSessions.filter(s => (s.conclusion_reports?.[0]?.concepts_missed?.length ?? 1) === 0).length;

  const counts = {
    all: sessions.length,
    live: sessions.filter(s => s.status === "active").length,
    pending: sessions.filter(s => s.status === "pending").length,
    done: sessions.filter(s => s.status === "completed").length,
  };

  const filteredSessions = useMemo(() => {
    let list = sessions.slice();
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s =>
        s.class_name.toLowerCase().includes(q) ||
        s.subject.toLowerCase().includes(q) ||
        s.objective_text.toLowerCase().includes(q)
      );
    }
    if (filter === "live")    list = list.filter(s => s.status === "active");
    if (filter === "pending") list = list.filter(s => s.status === "pending");
    if (filter === "done")    list = list.filter(s => s.status === "completed");
    if (sortBy === "coverage") list.sort((a, b) => {
      const aS = a.conclusion_reports?.[0]?.coverage_score ?? -1;
      const bS = b.conclusion_reports?.[0]?.coverage_score ?? -1;
      return bS - aS;
    });
    if (sortBy === "subject") list.sort((a, b) => a.subject.localeCompare(b.subject));
    return list;
  }, [sessions, filter, sortBy, searchQuery]);

  // ─── Schedule slots ────────────────────────────────────────────────────────
  const scheduleSlots = useMemo(() => {
    const done = sessions.filter(s => s.status === "completed").sort((a, b) => {
      const aT = a.conclusion_reports?.[0]?.teaching_effectiveness_score ?? a.conclusion_reports?.[0]?.coverage_score ?? 0;
      const bT = b.conclusion_reports?.[0]?.teaching_effectiveness_score ?? b.conclusion_reports?.[0]?.coverage_score ?? 0;
      return bT - aT;
    });
    const live    = sessions.filter(s => s.status === "active");
    const pending = sessions.filter(s => s.status === "pending");
    type Slot =
      | { kind: "done" | "live" | "upnext"; session: ClassSession; period: number; time: string }
      | { kind: "break" | "free"; period: number; time: string };
    let dI=0, lI=0, pI=0;
    return [1,2,3,4,5,6,7,8].map((p, i): Slot => {
      const time = PERIOD_TIMES[i];
      if (p === 4) return { kind:"break", period:p, time };
      if (p <= 3 && dI < done.length)    return { kind:"done",   session: done[dI++],    period:p, time };
      if (p > 4  && lI < live.length)    return { kind:"live",   session: live[lI++],    period:p, time };
      if (p > 4  && pI < pending.length) return { kind:"upnext", session: pending[pI++], period:p, time };
      if (dI < done.length)              return { kind:"done",   session: done[dI++],    period:p, time };
      return { kind:"free", period:p, time };
    });
  }, [sessions]);

  // ─── Greeting ─────────────────────────────────────────────────────────────
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const displayName = user?.email?.split("@")[0] ?? "Teacher";
  const dayAbbr = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][now.getDay()];
  const avgColor = avgTES == null ? "white" : avgTES >= 80 ? "#B6F7CE" : avgTES >= 60 ? "#FDE68A" : "#FCA5A5";

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      <main style={{ maxWidth:1200, margin:"0 auto", padding:"26px 22px 80px" }}>

        {/* ── Page header ── */}
        <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-[14px] bg-[#2E2BE5] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1" style={{ fontFamily:"'Nunito',sans-serif", fontSize:11.5, fontWeight:700, color:"rgba(15,23,42,0.40)", textTransform:"uppercase", letterSpacing:"0.06em" }}>
                <span>ClassPulse</span>
                <span style={{ color:"rgba(15,23,42,0.20)" }}>›</span>
                <span style={{ color:"#0F172A" }}>My Sessions</span>
              </div>
              <h1 className={`${D} font-extrabold text-[26px] text-[#0F172A] m-0 leading-tight`} style={{ letterSpacing:"-0.02em" }}>My Sessions</h1>
              <p style={{ fontFamily:"'Nunito',sans-serif", fontSize:13, fontWeight:700, color:"rgba(15,23,42,0.50)", margin:"3px 0 0" }}>
                <strong style={{ color:"#0F172A", fontWeight:800 }}>{sessions.length} sessions</strong> all time
                {todaySessions.length > 0 && <> · <strong style={{ color:"#0F172A", fontWeight:800 }}>{todaySessions.length} today</strong></>}
                {avgTES != null && <> · avg TES <strong style={{ color:"#0F172A", fontWeight:800 }}>{avgTES}%</strong></>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setShowSearch(v => !v); if (showSearch) setSearchQuery(""); }}
              className={`${BTN} px-3.5 py-2 rounded-[12px] text-[13px] bg-transparent border-[#0F172A]/20 text-[#0F172A]/50 hover:text-[#0F172A] hover:border-[#0F172A] hover:bg-[#0F172A]/5 shadow-none`}
            >
              <Search className="w-3.5 h-3.5" /> Search
            </button>
            <button
              onClick={() => setShowForm(true)}
              className={`${BTN} px-4 py-2.5 rounded-[14px] text-[14px] bg-[#2E2BE5] text-white border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_0_#0F172A]`}
            >
              <Plus className="w-4 h-4" /> New Session
            </button>
          </div>
        </div>

        {/* Search input */}
        {showSearch && (
          <div className="mb-4">
            <input
              autoFocus type="text"
              placeholder="Search by class, subject, or objective…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={INPUT_CLS}
            />
          </div>
        )}

        {/* ── Hero ── */}
        <section
          className="border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[3px_3px_0_0_#0F172A] overflow-hidden mb-4"
          style={{ background:"radial-gradient(ellipse 80% 60% at 100% 0%, rgba(255,255,255,.14) 0%, rgba(255,255,255,0) 60%), linear-gradient(135deg, #2E2BE5 0%, #2F7CFF 100%)" }}
        >
          <div className="flex items-center justify-between px-5 pt-4 pb-0 gap-4 flex-wrap">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-[14px] flex flex-col items-center justify-center flex-shrink-0" style={{ background:"rgba(255,255,255,0.16)", border:"2px solid rgba(255,255,255,0.28)" }}>
                <span style={{ fontFamily:"'Nunito',sans-serif", fontSize:10, fontWeight:800, letterSpacing:"0.08em", textTransform:"uppercase", color:"rgba(255,255,255,0.78)" }}>{dayAbbr}</span>
                <span className={`${D} font-extrabold text-white leading-none`} style={{ fontSize:22, letterSpacing:"-0.02em" }}>{now.getDate()}</span>
              </div>
              <div>
                <h2 className={`${D} font-extrabold text-white m-0`} style={{ fontSize:22, letterSpacing:"-0.015em" }}>
                  {greeting}, {displayName} 👋
                </h2>
                <p style={{ margin:"4px 0 0", fontFamily:"'Nunito',sans-serif", fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.78)" }}>
                  {todaySessions.length > 0
                    ? <>You have <strong style={{ color:"#fff", fontWeight:800 }}>{todaySessions.length} class{todaySessions.length !== 1 ? "es" : ""}</strong> today{activeSession ? <>, <strong style={{ color:"#fff", fontWeight:800 }}>1 recording now</strong></> : ""}.</>
                    : "No classes today. Create a session to get started."
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background:"rgba(255,255,255,0.18)", border:"2px solid rgba(255,255,255,0.22)", fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:11, color:"#fff" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              {activeSession ? "Recording · live now" : "Connected · synced now"}
            </div>
          </div>
          <div className="grid gap-2.5 px-4 pb-4 pt-4" style={{ gridTemplateColumns:"repeat(4, minmax(0,1fr))" }}>
            {[
              { label:"Classes Today",  value: todaySessions.length,                       sub: sessions.length > 0 ? `/ ${sessions.length} total` : undefined },
              { label:"Avg TES",        value: avgTES != null ? `${avgTES}%` : "—",        sub: avgTES != null ? "analysed" : "no data", color: avgColor },
              { label:"Goals Hit",      value: goalsHit,                                   sub: `/ ${completedSessions.length}` },
              { label:"This Week",      value: thisWeekCount,                              sub: "sessions" },
            ].map(k => (
              <div key={k.label} className="rounded-[14px] p-3.5" style={{ background:"rgba(255,255,255,0.13)", border:"2px solid rgba(255,255,255,0.22)" }}>
                <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:11, fontWeight:800, color:"rgba(255,255,255,0.82)", letterSpacing:"0.02em", marginBottom:6 }}>{k.label}</div>
                <div className="flex items-baseline gap-1">
                  <span className={`${D} font-extrabold leading-none`} style={{ fontSize:30, letterSpacing:"-0.022em", color: k.color ?? "#fff" }}>
                    {loading ? "—" : k.value}
                  </span>
                  {k.sub && <span style={{ fontFamily:"'Nunito',sans-serif", fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.65)", marginLeft:2 }}>{k.sub}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Live callout — only renders while a session is actively recording ── */}
        {!loading && activeSession && (
          <div className="flex mb-4 rounded-[20px] overflow-hidden border-[2.5px] border-[#0F172A] bg-white shadow-[4px_4px_0_0_#DC2626]">
            <div className="w-2 flex-shrink-0" style={{ background:"repeating-linear-gradient(45deg,#DC2626,#DC2626 8px,#fff 8px,#fff 16px)" }} />
            <div className="flex flex-1 items-center justify-between gap-4 p-4 flex-wrap">
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative flex items-center justify-center rounded-[14px] bg-[#DC2626] border-2 border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex-shrink-0" style={{ width:52, height:52 }}>
                  <span className="absolute inset-0 rounded-[14px] bg-[#DC2626] animate-ping opacity-40" />
                  <Mic className="w-6 h-6 text-white relative z-10" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="inline-flex items-center gap-1 font-['Nunito'] font-extrabold text-[11px] uppercase px-2.5 py-1 rounded-full text-[#DC2626] bg-[#FEEFEC] border-[1.5px] border-[#DC2626]/25" style={{ letterSpacing:"0.06em" }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-pulse" /> Recording now
                    </span>
                    <span className="font-['Nunito'] font-extrabold text-[11px] px-2.5 py-1 rounded-full text-[#2F7CFF] bg-[#DDF3FF] border-[1.5px] border-[#2F7CFF]/22">{activeSession.subject}</span>
                    <span className="font-['Nunito'] font-extrabold text-[11px] px-2.5 py-1 rounded-full text-[#2E2BE5] bg-[#EEEDFF] border-[1.5px] border-[#2E2BE5]/22">{activeSession.class_name}</span>
                  </div>
                  <h3 className={`${D} font-extrabold text-[18px] text-[#0F172A] m-0`} style={{ letterSpacing:"-0.015em" }}>
                    {activeSession.objective_text.length > 70 ? activeSession.objective_text.slice(0,70) + "…" : activeSession.objective_text}
                  </h3>
                  <div className="flex items-center gap-3 flex-wrap mt-1" style={{ fontFamily:"'Nunito',sans-serif", fontSize:12.5, fontWeight:700, color:"rgba(15,23,42,0.50)" }}>
                    {activeSession.started_at && (
                      <span className="font-mono text-[#DC2626] font-semibold" style={{ fontSize:12.5 }}>● {formatElapsed(elapsedSec)} elapsed</span>
                    )}
                    <span>{activeSession.key_concepts.length} concepts tracked</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate(`/session/${activeSession.id}`)}
                className={`${BTN} px-4 py-2.5 rounded-[12px] text-[13px] bg-[#DC2626] text-white border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] hover:-translate-x-px hover:-translate-y-px hover:shadow-[3px_3px_0_0_#0F172A]`}
              >
                <PlayCircle className="w-4 h-4" /> Resume recording
              </button>
            </div>
          </div>
        )}

        {/* ── Today's schedule ── */}
        {!loading && (
          <div className={`${CARD} mb-6 overflow-hidden`}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b-[2px] border-[#0F172A]/10">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-[9px] bg-[#2E2BE5] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center">
                  <CalendarDays className="w-3.5 h-3.5 text-white" />
                </div>
                <h3 className={`${D} font-extrabold text-[16px] text-[#0F172A] m-0`}>Today's Schedule</h3>
              </div>
              <p style={{ fontFamily:"'Nunito',sans-serif", fontSize:11.5, fontWeight:700, color:"rgba(15,23,42,0.50)" }}>
                {format(new Date(), "EEEE, d MMMM yyyy")} · {sessions.length} session{sessions.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="p-4 grid gap-2" style={{ gridTemplateColumns:"repeat(8, minmax(0,1fr))" }}>
              {scheduleSlots.map(slot => {
                const base = "flex flex-col justify-between rounded-[12px] p-2.5 transition-all";
                const topSt: React.CSSProperties = { fontFamily:"'Nunito',sans-serif", fontSize:10.5, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.05em" };
                const timeSt: React.CSSProperties = { fontFamily:"monospace", fontSize:10, fontWeight:600 };

                if (slot.kind === "break") return (
                  <div key={slot.period} className={base} style={{ minHeight:80, border:"2px dashed rgba(15,23,42,0.15)", borderRadius:12, background:"white" }}>
                    <div className="flex items-center justify-between" style={{ ...topSt, color:"rgba(15,23,42,0.40)" }}>
                      <span>P{slot.period} · Break</span><span style={timeSt}>{slot.time}</span>
                    </div>
                    <div>
                      <div className={`${D} font-extrabold text-[14px] text-[#0F172A]/40 leading-tight`}>Recess</div>
                      <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:10.5, fontWeight:700, color:"rgba(15,23,42,0.30)", marginTop:2 }}>No class</div>
                    </div>
                  </div>
                );

                if (slot.kind === "free") return (
                  <div key={slot.period} className={base} style={{ minHeight:80, border:"2px dashed rgba(15,23,42,0.10)", borderRadius:12, background:"repeating-linear-gradient(135deg,transparent 0 6px,rgba(15,23,42,0.04) 6px 7px)" }}>
                    <div className="flex items-center justify-between" style={{ ...topSt, color:"rgba(15,23,42,0.35)" }}>
                      <span>P{slot.period}</span><span style={timeSt}>{slot.time}</span>
                    </div>
                    <div>
                      <div className={`${D} font-bold text-[13px] text-[#0F172A]/30 leading-tight`}>Free</div>
                      <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:10.5, fontWeight:700, color:"rgba(15,23,42,0.20)", marginTop:2 }}>—</div>
                    </div>
                  </div>
                );

                const s = slot.session;
                const cfg = {
                  done:   { bg:"#ECFAF3", border:"rgba(22,165,107,0.4)",  shadow:"none",                       labelColor:"#16A56B", topLabel:`P${slot.period} · Done` },
                  live:   { bg:"#FFF1ED", border:"#DC2626",                shadow:"2px 2px 0 0 #DC2626",        labelColor:"#DC2626", topLabel:"● Live" },
                  upnext: { bg:"#EEEDFF", border:"#2E2BE5",                shadow:"2px 2px 0 0 #2E2BE5",        labelColor:"#2E2BE5", topLabel:`P${slot.period} · Up next` },
                }[slot.kind];

                const report = s.conclusion_reports?.[0] ?? null;
                const slotTes = slot.kind === "done" && report != null
                  ? Math.round((report.teaching_effectiveness_score ?? report.coverage_score) ?? 0)
                  : null;
                const slotTesColor = slotTes != null ? scoreColor(slotTes) : "#16A56B";

                return (
                  <div
                    key={s.id} className={`${base} cursor-pointer hover:-translate-y-px`}
                    style={{ minHeight:80, borderRadius:12, border:`2px solid ${cfg.border}`, background:cfg.bg, boxShadow:cfg.shadow }}
                    onClick={() => s.status === "completed" ? navigate(`/report/${s.id}`) : navigate(`/session/${s.id}`)}
                  >
                    <div className="flex items-center justify-between" style={{ ...topSt, color:cfg.labelColor }}>
                      <span>
                        {cfg.topLabel}
                        {slot.kind === "live" && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-pulse align-middle" />}
                      </span>
                      <span style={timeSt}>{slot.time}</span>
                    </div>
                    <div>
                      <div className="flex items-end justify-between gap-1">
                        <div>
                          <div className={`${D} font-extrabold text-[14px] text-[#0F172A] leading-tight`} style={{ letterSpacing:"-0.01em" }}>{s.class_name}</div>
                          <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:10.5, fontWeight:700, color:"rgba(15,23,42,0.50)", marginTop:2 }}>{s.subject}</div>
                        </div>
                        {slotTes != null && (
                          <div className="flex flex-col items-end flex-shrink-0">
                            <span className={`${D} font-extrabold leading-none`} style={{ fontSize:15, color: slotTesColor }}>{slotTes}%</span>
                            <span style={{ fontFamily:"'Nunito',sans-serif", fontSize:8.5, fontWeight:800, color: slotTesColor, opacity:0.7, textTransform:"uppercase", letterSpacing:"0.05em" }}>TES</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Section head ── */}
        <div className="flex items-baseline justify-between gap-2.5 mb-3.5" style={{ marginTop:28 }}>
          <h2 className={`${D} font-extrabold text-[19px] text-[#0F172A] m-0`} style={{ letterSpacing:"-0.015em" }}>All Sessions</h2>
          <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:12, fontWeight:700, color:"rgba(15,23,42,0.50)" }}>
            {filteredSessions.length} of {sessions.length} sessions
          </div>
        </div>

        {/* ── Filter + sort ── */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {([ ["all","All"], ["live","Live"], ["pending","Pending"], ["done","Completed"] ] as const).map(([key, label]) => {
              const isOn = filter === key;
              const dot = key === "live" ? "#DC2626" : key === "pending" ? "#C77800" : key === "done" ? "#16A56B" : null;
              return (
                <button key={key} onClick={() => setFilter(key)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border-[2px] font-['Nunito'] font-extrabold text-[12px] transition-all"
                  style={{ borderColor: isOn ? "#0F172A" : "rgba(15,23,42,0.20)", background: isOn ? "#0F172A" : "#fff", color: isOn ? "#fff" : "rgba(15,23,42,0.50)", boxShadow: isOn ? "2px 2px 0 0 #0F172A" : "none" }}
                >
                  {dot && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: isOn ? "#fff" : dot }} />}
                  {label}
                  <span className="px-1.5 py-px rounded-full text-[10.5px] font-extrabold" style={{ background: isOn ? "rgba(255,255,255,0.22)" : "#EEF1F9", color: isOn ? "#fff" : "#0F172A" }}>
                    {counts[key]}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1 bg-white rounded-[12px] p-[3px] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A]">
            {([ ["recent","Recent"], ["coverage","Coverage"], ["subject","Subject"] ] as const).map(([key, label]) => (
              <button key={key} onClick={() => setSortBy(key)}
                className="px-3 py-1.5 rounded-[8px] font-['Nunito'] font-extrabold text-[12px] transition-all"
                style={{ background: sortBy === key ? "#0F172A" : "transparent", color: sortBy === key ? "#fff" : "rgba(15,23,42,0.50)" }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Session list ── */}
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-[#2E2BE5]" />
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="py-16 text-center rounded-[20px] bg-white" style={{ border:"2.5px dashed rgba(15,23,42,0.20)" }}>
            <div className="w-14 h-14 mx-auto mb-4 rounded-[14px] bg-[#EEF1F9] border-2 border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-[#0F172A]/50" />
            </div>
            <h3 className={`${D} font-extrabold text-[17px] text-[#0F172A] mb-2`}>
              {sessions.length === 0 ? "No sessions yet" : "No sessions match this filter"}
            </h3>
            <p style={{ fontFamily:"'Nunito',sans-serif", fontSize:13, fontWeight:700, color:"rgba(15,23,42,0.50)", margin:"0 0 16px" }}>
              {sessions.length === 0 ? "Create your first session to start monitoring your class." : "Try adjusting your filter or search query."}
            </p>
            {sessions.length === 0 && (
              <button onClick={() => setShowForm(true)}
                className={`${BTN} px-5 py-2.5 rounded-[14px] text-[14px] bg-[#2E2BE5] text-white border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_0_#0F172A]`}
              >
                <Plus className="w-4 h-4" /> Create Session
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredSessions.map(s => {
              const isConfirming = confirmAction?.id === s.id;
              const report = s.conclusion_reports?.[0] ?? null;
              const hasReport = s.status === "completed" && report?.coverage_score != null;
              const tes = hasReport ? Math.round((report!.teaching_effectiveness_score ?? report!.coverage_score)!) : null;

              return (
                <div
                  key={s.id}
                  onClick={() => { if (isConfirming) return; if (s.status === "completed") navigate(`/report/${s.id}`); else navigate(`/session/${s.id}`); }}
                  className={`${CARD} overflow-hidden transition-all ${isConfirming ? "cursor-default" : "cursor-pointer hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_0_#0F172A]"}`}
                >
                  <div className="p-5 grid gap-4" style={{ gridTemplateColumns:"minmax(0,1fr) 78px 140px", alignItems:"flex-start" }}>

                    {/* Left */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-2">
                        <StatusBadge status={s.status} />
                        <span className="font-['Nunito'] font-extrabold text-[11px] px-2.5 py-1 rounded-full text-[#2F7CFF] bg-[#DDF3FF] border-[1.5px] border-[#2F7CFF]/22">{s.subject}</span>
                        <span className="font-['Nunito'] font-extrabold text-[11px] px-2.5 py-1 rounded-full text-[#2E2BE5] bg-[#EEEDFF] border-[1.5px] border-[#2E2BE5]/22">{s.class_name}</span>
                      </div>
                      <p className={`${D} font-extrabold text-[17px] text-[#0F172A] m-0 leading-snug`} style={{ letterSpacing:"-0.015em" }}>
                        {s.objective_text}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {hasReport ? (
                          <>
                            {report!.concepts_covered.slice(0,3).map(c => (
                              <span key={c} className="inline-flex items-center gap-1 font-['Nunito'] font-extrabold text-[10.5px] px-2 py-0.5 rounded-full border-[1.5px] text-[#16A56B] bg-[#ECFAF3] border-[#16A56B]/25">
                                <span className="w-1 h-1 rounded-full bg-[#16A56B]" /> {c}
                              </span>
                            ))}
                            {report!.concepts_missed.slice(0,2).map(c => (
                              <span key={c} className="inline-flex items-center gap-1 font-['Nunito'] font-extrabold text-[10.5px] px-2 py-0.5 rounded-full border-[1.5px] text-[#DC2626] bg-[#FEEFEC] border-[#DC2626]/25">
                                <span className="w-1 h-1 rounded-full bg-[#DC2626]" /> {c}
                              </span>
                            ))}
                            {(report!.concepts_covered.length + report!.concepts_missed.length) > 5 && (
                              <span className="font-['Nunito'] font-extrabold text-[10.5px] px-2 py-0.5 rounded-full border-[1.5px] text-[#0F172A]/50 bg-[#EEF1F9] border-[#0F172A]/10">
                                +{report!.concepts_covered.length + report!.concepts_missed.length - 5} more
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            {s.key_concepts.slice(0,4).map(c => (
                              <span key={c} className="inline-flex items-center gap-1 font-['Nunito'] font-extrabold text-[10.5px] px-2 py-0.5 rounded-full border-[1.5px] text-[#2F7CFF] bg-[#DDF3FF] border-[#2F7CFF]/22">
                                <span className="w-1 h-1 rounded-full bg-[#2F7CFF]" /> {c}
                              </span>
                            ))}
                            {s.key_concepts.length > 4 && (
                              <span className="font-['Nunito'] font-extrabold text-[10.5px] px-2 py-0.5 rounded-full border-[1.5px] text-[#0F172A]/50 bg-[#EEF1F9] border-[#0F172A]/10">
                                +{s.key_concepts.length - 4} more
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      {hasReport && report!.ai_coaching_note && (
                        <div className="flex items-start gap-1.5 rounded-[10px] px-3 py-2 mt-2.5 bg-[#EEEDFF]">
                          <Sparkles className="w-3 h-3 text-[#2E2BE5] flex-shrink-0 mt-0.5" />
                          <p className="font-['Nunito'] font-semibold text-[#2E2BE5] m-0 leading-relaxed"
                            style={{ fontSize:11, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                            {report!.ai_coaching_note}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Mid: ring */}
                    <div className="flex flex-col items-center pt-1">
                      {hasReport && tes != null ? <ScoreRing score={tes} /> : <StatusBox status={s.status as "pending" | "active"} />}
                    </div>

                    {/* Right: timestamp + actions */}
                    <div className="flex flex-col items-end justify-between gap-2" style={{ minHeight:80 }} onClick={e => e.stopPropagation()}>
                      <div className="text-right">
                        {s.ended_at && (
                          <strong className={`${D} font-extrabold text-[13px] text-[#0F172A] block`}>{format(new Date(s.ended_at), "d MMM yyyy")}</strong>
                        )}
                        <p className="font-['Nunito'] font-bold text-[11.5px] text-[#0F172A]/50 m-0">
                          {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1.5 w-full">
                        {s.status === "pending" && (
                          <button onClick={() => navigate(`/session/${s.id}`)}
                            className={`${BTN} w-full justify-center px-3 py-1.5 rounded-[10px] text-[11.5px] bg-[#2E2BE5] text-white border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] hover:-translate-y-px`}>
                            <Zap className="w-3 h-3" /> Go Live
                          </button>
                        )}
                        {s.status === "active" && (
                          <button onClick={() => navigate(`/session/${s.id}`)}
                            className={`${BTN} w-full justify-center px-3 py-1.5 rounded-[10px] text-[11.5px] bg-[#DC2626] text-white border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] hover:-translate-y-px`}>
                            <PlayCircle className="w-3 h-3" /> Resume
                          </button>
                        )}
                        {s.status === "completed" && (
                          <>
                            <button onClick={() => navigate(`/report/${s.id}`)}
                              className={`${BTN} w-full justify-center px-3 py-1.5 rounded-[10px] text-[11px] border-[#0F172A]/20 text-[#0F172A]/60 hover:border-[#0F172A] hover:text-[#0F172A] hover:bg-[#0F172A]/5`}>
                              <BarChart3 className="w-3 h-3" /> View Report
                            </button>
                            <button onClick={() => setConfirmAction({ id: s.id, type:"rerecord" })}
                              className={`${BTN} w-full justify-center px-2.5 py-1.5 rounded-[10px] text-[11px] border-[#0F172A]/15 text-[#2E2BE5] hover:border-[#2E2BE5] hover:bg-[#EEEDFF]`}>
                              <RefreshCw className="w-3 h-3" /> Re-record
                            </button>
                          </>
                        )}
                        <button onClick={() => setConfirmAction({ id: s.id, type:"delete" })}
                          className={`${BTN} w-full justify-center px-2.5 py-1.5 rounded-[10px] text-[11px] border-[#0F172A]/15 text-[#DC2626] hover:border-[#DC2626]/30 hover:bg-[#FEEFEC]`}>
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Confirm strip */}
                  {isConfirming && (
                    <div className="px-5 py-4 border-t-[2px] border-[#0F172A]/10 flex items-center justify-between gap-3 flex-wrap" onClick={e => e.stopPropagation()}>
                      <div>
                        <p className="font-['Nunito'] font-extrabold text-[12.5px] text-[#0F172A] m-0">
                          {confirmAction!.type === "delete" ? "Delete this session permanently?" : "Reset and re-record this session?"}
                        </p>
                        <p className="font-['Nunito'] font-bold text-[11px] text-[#0F172A]/50 mt-0.5 m-0">
                          {confirmAction!.type === "delete"
                            ? "This removes all session data and the report. Cannot be undone."
                            : "The existing report will be deleted and you'll re-record from scratch."}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => setConfirmAction(null)}
                          className={`${BTN} px-3 py-1.5 rounded-[10px] text-[12px] border-[#0F172A]/20 text-[#0F172A]/60 hover:border-[#0F172A] hover:text-[#0F172A]`}>
                          Cancel
                        </button>
                        <button
                          onClick={() => confirmAction!.type === "delete" ? handleDelete(s.id) : handleRerecord(s.id)}
                          disabled={actionLoading}
                          className={`${BTN} px-3 py-1.5 rounded-[10px] text-[12px] text-white hover:-translate-y-px disabled:opacity-60 ${
                            confirmAction!.type === "delete"
                              ? "bg-[#DC2626] border-[#991B1B] shadow-[2px_2px_0_0_#991B1B]"
                              : "bg-[#2E2BE5] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A]"
                          }`}
                        >
                          {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" />
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

        {/* ── Footer ── */}
        <div className="flex justify-between flex-wrap gap-3 mt-9 pt-4" style={{ borderTop:"1.5px solid rgba(15,23,42,0.10)", fontFamily:"'Nunito',sans-serif", fontSize:11.5, fontWeight:700, color:"rgba(15,23,42,0.50)", textTransform:"uppercase", letterSpacing:"0.04em" }}>
          <div>ClassPulse · Teacher Dashboard</div>
          <div>Last sync {format(new Date(), "HH:mm")}</div>
        </div>
      </main>

      {/* ── Settings FAB ── */}
      <button
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center rounded-[16px] bg-white border-[2.5px] border-[#0F172A] shadow-[4px_4px_0_0_#0F172A] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#0F172A] transition-all"
        style={{ width:56, height:56 }} title="Settings"
        onClick={() => {}}
      >
        <Settings className="w-6 h-6 text-[#0F172A]/70" />
      </button>

      {/* ── New Session Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-[#0F172A]/50 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div
            className="w-full max-w-[540px] max-h-[92vh] overflow-y-auto bg-white border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal head */}
            <div className="flex items-center justify-between px-5 py-4 border-b-[2px] border-[#0F172A] bg-[#F8F9FF] rounded-t-[17px]">
              <div>
                <h3 className={`${D} font-extrabold text-[19px] text-[#0F172A] m-0`}>New Session</h3>
                <p className="font-['Nunito'] font-bold text-[12px] text-[#0F172A]/50 mt-0.5 m-0">Set up your lesson before you go live</p>
              </div>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-[10px] border-2 border-[#0F172A]/20 hover:border-[#0F172A] hover:bg-[#0F172A]/5 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block font-['Nunito'] font-extrabold text-[12px] text-[#0F172A] mb-1.5 uppercase tracking-[0.04em]">
                  Subject <span className="text-[#DC2626]">*</span>
                </label>
                <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className={INPUT_CLS} required
                  style={{ appearance:"none", backgroundImage:"linear-gradient(45deg,transparent 50%,#0F172A 50%),linear-gradient(135deg,#0F172A 50%,transparent 50%)", backgroundPosition:"calc(100% - 16px) 50%,calc(100% - 12px) 50%", backgroundSize:"5px 5px,5px 5px", backgroundRepeat:"no-repeat", paddingRight:36 }}>
                  <option value="">Select subject…</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-['Nunito'] font-extrabold text-[12px] text-[#0F172A] mb-1.5 uppercase tracking-[0.04em]">
                  Class <span className="text-[#DC2626]">*</span>
                </label>
                <input type="text" placeholder="e.g. 3 Bestari" value={form.class_name} onChange={e => setForm({ ...form, class_name: e.target.value })} className={INPUT_CLS} required />
              </div>

              <div>
                <label className="block font-['Nunito'] font-extrabold text-[12px] text-[#0F172A] mb-1.5 uppercase tracking-[0.04em]">
                  Lesson Objective <span className="text-[#DC2626]">*</span>
                </label>
                <textarea placeholder="e.g. Students understand osmosis and concentration gradient"
                  value={form.objective_text} onChange={e => setForm({ ...form, objective_text: e.target.value })}
                  className={`${INPUT_CLS} resize-none`} rows={3} required />
              </div>

              <div>
                <label className="block font-['Nunito'] font-extrabold text-[12px] text-[#0F172A] mb-1.5 uppercase tracking-[0.04em]">
                  Key Concepts
                  <span className="font-bold text-[#0F172A]/40 text-[11px] normal-case tracking-normal ml-1">(comma-separated)</span>
                </label>
                <input type="text" placeholder="osmosis, concentration gradient, semi-permeable membrane"
                  value={form.key_concepts_input} onChange={e => setForm({ ...form, key_concepts_input: e.target.value })} className={INPUT_CLS} />
                {form.objective_text && !form.key_concepts_input && (
                  <div className="flex items-center gap-1.5 mt-2 font-['Nunito'] font-bold text-[11px] text-[#2E2BE5]/70">
                    <Sparkles className="w-3 h-3" /> Concepts will be auto-detected from your objective
                  </div>
                )}
                {form.key_concepts_input && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {form.key_concepts_input.split(",").map(c => c.trim()).filter(Boolean).map(c => (
                      <span key={c} className="font-['Nunito'] font-extrabold text-[10px] px-2 py-0.5 rounded-full bg-[#DDF3FF] text-[#2F7CFF] border border-[#2F7CFF]/20">{c}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-['Nunito'] font-extrabold text-[12px] text-[#0F172A] mb-1.5 uppercase tracking-[0.04em]">Date</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={INPUT_CLS} />
                </div>
                <div>
                  <label className="block font-['Nunito'] font-extrabold text-[12px] text-[#0F172A] mb-1.5 uppercase tracking-[0.04em]">Period</label>
                  <select value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} className={INPUT_CLS}
                    style={{ appearance:"none", backgroundImage:"linear-gradient(45deg,transparent 50%,#0F172A 50%),linear-gradient(135deg,#0F172A 50%,transparent 50%)", backgroundPosition:"calc(100% - 16px) 50%,calc(100% - 12px) 50%", backgroundSize:"5px 5px,5px 5px", backgroundRepeat:"no-repeat", paddingRight:36 }}>
                    {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {formError && <p className="font-['Nunito'] font-semibold text-[13px] text-[#DC2626]">{formError}</p>}

              <div className="flex items-center justify-between pt-2 mt-1 border-t-[2px] border-[#0F172A]/10">
                <p className="font-['Nunito'] font-bold text-[11.5px] text-[#0F172A]/50 m-0">You'll go to the live session right away.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowForm(false)}
                    className={`${BTN} px-3.5 py-2 rounded-[10px] text-[13px] border-[#0F172A]/20 text-[#0F172A]/60 hover:border-[#0F172A] hover:text-[#0F172A]`}>
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className={`${BTN} px-4 py-2 rounded-[12px] text-[13px] bg-[#2E2BE5] text-white border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] hover:-translate-y-px disabled:opacity-60`}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create & Go Live →"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
