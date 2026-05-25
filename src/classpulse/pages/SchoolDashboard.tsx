import { useEffect, useState } from "react";
import {
  BarChart3, TrendingUp, Download, Loader2, Users, AlertTriangle,
  ChevronDown, ChevronUp, FileText, X, CheckCircle2, XCircle, School,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "../../hooks/useAuth";
import { format } from "date-fns";

const DISPLAY = "font-['Baloo_2'] tracking-tight";
const CARD = "border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[3px_3px_0_0_#0F172A] bg-white";

interface SessionData {
  id: string;
  teacher_id: string;
  class_name: string;
  subject: string;
  objective_text: string;
  key_concepts: string[];
  started_at: string | null;
  ended_at: string | null;
  transcript_text: string | null;
  coverage_score: number;
  teacher_talk_ratio: number;
  student_participation_count: number;
  concepts_covered: string[];
  concepts_missed: string[];
  ai_coaching_note: string;
}

interface TeacherGroup {
  user_id: string;
  display_name: string;
  sessions: SessionData[];
  avg_coverage: number;
  total_sessions: number;
  goals_achieved: number;
}

function scoreColor(score: number) {
  return score >= 80 ? "#22C55E" : score >= 60 ? "#F59E0B" : "#EF4444";
}

function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const r = size * 0.36;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreColor(score);
  const center = size / 2;
  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={center} cy={center} r={r} strokeWidth="6" stroke="#0F172A10" fill="none" />
        <circle
          cx={center} cy={center} r={r} strokeWidth="6" stroke={color} fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`${DISPLAY} font-extrabold leading-none`} style={{ fontSize: size * 0.22 }}>{score}%</span>
      </div>
    </div>
  );
}

function TranscriptModal({ session, onClose }: { session: SessionData; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-[#0F172A]/60 backdrop-blur-sm" />
      <div
        className={`relative ${CARD} w-full max-w-2xl max-h-[85vh] flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="p-5 border-b-[2.5px] border-[#0F172A] flex items-start justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[11px] font-bold font-['Nunito'] text-[#2F7CFF] bg-[#DDF3FF] border border-[#2F7CFF]/20 rounded-full px-2.5 py-0.5">
                {session.subject}
              </span>
              <span className="text-[11px] font-bold font-['Nunito'] text-[#0F172A]/50 border border-[#0F172A]/15 rounded-full px-2.5 py-0.5">
                {session.class_name}
              </span>
            </div>
            <h3 className={`${DISPLAY} font-extrabold text-[17px] text-[#0F172A]`}>Session Transcript</h3>
            <p className="font-['Nunito'] text-[12px] text-[#0F172A]/50 mt-0.5">
              {session.ended_at && format(new Date(session.ended_at), "EEEE, d MMMM yyyy")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl border-[2px] border-[#0F172A]/15 hover:bg-[#0F172A]/5 transition-colors shrink-0"
          >
            <X className="w-4 h-4 text-[#0F172A]/60" />
          </button>
        </div>

        {/* Modal body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {session.objective_text && (
            <div className="bg-[#D6D4FF]/30 rounded-[16px] border-[2px] border-[#2E2BE5]/20 p-4">
              <p className="font-['Nunito'] text-[11px] font-bold text-[#2E2BE5] uppercase tracking-wider mb-1.5">Lesson Objective</p>
              <p className="font-['Nunito'] text-[13px] text-[#0F172A]/80">{session.objective_text}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="font-['Nunito'] text-[11px] font-bold text-green-600 uppercase tracking-wider mb-2">
                Covered ({session.concepts_covered.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {session.concepts_covered.length === 0 ? (
                  <span className="font-['Nunito'] text-[12px] text-[#0F172A]/40">None detected</span>
                ) : session.concepts_covered.map(c => (
                  <span key={c} className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold font-['Nunito'] bg-green-50 text-green-700 border border-green-200">
                    <CheckCircle2 className="w-3 h-3" /> {c}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="font-['Nunito'] text-[11px] font-bold text-red-500 uppercase tracking-wider mb-2">
                Missed ({session.concepts_missed.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {session.concepts_missed.length === 0 ? (
                  <span className="font-['Nunito'] text-[12px] text-[#22C55E] font-bold">All covered ✓</span>
                ) : session.concepts_missed.map(c => (
                  <span key={c} className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold font-['Nunito'] bg-red-50 text-red-600 border border-red-200">
                    <XCircle className="w-3 h-3" /> {c}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className="font-['Nunito'] text-[11px] font-bold text-[#0F172A]/50 uppercase tracking-wider mb-2">Transcript</p>
            {session.transcript_text ? (
              <div className="bg-[#F8F9FF] rounded-[16px] border-[2px] border-[#0F172A]/10 p-4">
                <p className="font-['Nunito'] text-[13px] text-[#0F172A]/80 leading-relaxed whitespace-pre-wrap">
                  {session.transcript_text}
                </p>
              </div>
            ) : (
              <div className="bg-[#F8F9FF] rounded-[16px] border-[2px] border-[#0F172A]/10 p-6 flex flex-col items-center gap-2 text-center">
                <FileText className="w-6 h-6 text-[#0F172A]/20" />
                <p className="font-['Nunito'] text-[13px] text-[#0F172A]/40">No transcript recorded for this session.</p>
              </div>
            )}
          </div>

          {session.ai_coaching_note && (
            <div className="bg-[#D6D4FF]/30 rounded-[16px] border-[2px] border-[#2E2BE5]/20 p-4">
              <p className="font-['Nunito'] text-[11px] font-bold text-[#2E2BE5] uppercase tracking-wider mb-1.5">AI Coaching Note</p>
              <p className="font-['Nunito'] text-[13px] text-[#0F172A]/80 leading-relaxed">{session.ai_coaching_note}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TeacherCard({ group }: { group: TeacherGroup }) {
  const [expanded, setExpanded] = useState(false);
  const [transcript, setTranscript] = useState<SessionData | null>(null);

  const displayed = expanded ? group.sessions : group.sessions.slice(0, 3);
  const avg = group.avg_coverage;
  const efficiencyLabel = avg >= 80 ? "High Efficiency" : avg >= 60 ? "Moderate" : "Needs Attention";
  const effColor = scoreColor(avg);

  return (
    <>
      <div className={CARD}>
        {/* Teacher header */}
        <div className="p-5 border-b-[2.5px] border-[#0F172A]">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-[14px] border-[2.5px] border-[#0F172A] flex items-center justify-center shrink-0"
                style={{ background: "#DDF3FF" }}
              >
                <span className={`${DISPLAY} font-extrabold text-[18px] text-[#2F7CFF]`}>
                  {group.display_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className={`${DISPLAY} font-extrabold text-[16px] text-[#0F172A]`}>{group.display_name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="font-['Nunito'] text-[11px] font-bold text-[#0F172A]/50">
                    {group.total_sessions} session{group.total_sessions !== 1 ? "s" : ""}
                  </span>
                  <span className="text-[#0F172A]/20">·</span>
                  <span
                    className="text-[11px] font-bold font-['Nunito'] px-2 py-0.5 rounded-full border"
                    style={{ color: effColor, background: effColor + "15", borderColor: effColor + "40" }}
                  >
                    {efficiencyLabel}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ScoreRing score={avg} size={72} />
              <div className="text-right">
                <p className="font-['Nunito'] text-[10px] font-bold text-[#0F172A]/40 uppercase tracking-wider">Avg Coverage</p>
                <p className="font-['Nunito'] text-[13px] font-bold mt-1" style={{ color: group.goals_achieved === group.total_sessions ? "#22C55E" : "#F59E0B" }}>
                  {group.goals_achieved}/{group.total_sessions} goals achieved
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sessions table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-[2px] border-[#0F172A]/10">
                {["Class", "Subject", "Coverage", "Goals", "Date", ""].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-['Nunito'] text-[11px] font-bold text-[#0F172A]/40 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map(s => {
                const goalsOk = s.concepts_missed.length === 0;
                const duration = s.started_at && s.ended_at
                  ? Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000)
                  : null;
                return (
                  <tr key={s.id} className="border-b border-[#0F172A]/5 hover:bg-[#0F172A]/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-['Nunito'] text-[13px] font-bold text-[#0F172A]">{s.class_name}</span>
                      {duration && <span className="font-['Nunito'] text-[11px] text-[#0F172A]/40 ml-1.5">{duration}m</span>}
                    </td>
                    <td className="px-5 py-3 font-['Nunito'] text-[13px] text-[#0F172A]/60">{s.subject}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 rounded-full bg-[#0F172A]/10 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${s.coverage_score}%`, background: scoreColor(s.coverage_score) }} />
                        </div>
                        <span className="font-['Nunito'] text-[12px] font-bold" style={{ color: scoreColor(s.coverage_score) }}>
                          {s.coverage_score}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {goalsOk ? (
                        <span className="flex items-center gap-1 text-[12px] font-bold font-['Nunito'] text-green-600">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Achieved
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[12px] font-bold font-['Nunito'] text-red-500">
                          <XCircle className="w-3.5 h-3.5" /> {s.concepts_missed.length} missed
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-['Nunito'] text-[12px] text-[#0F172A]/40">
                      {s.ended_at && format(new Date(s.ended_at), "d MMM")}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => setTranscript(s)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border-[2px] border-[#0F172A]/20 text-[11px] font-bold font-['Nunito'] text-[#0F172A]/60 hover:border-[#2F7CFF] hover:text-[#2F7CFF] hover:bg-[#DDF3FF] transition-all"
                      >
                        <FileText className="w-3 h-3" /> Transcript
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {group.sessions.length > 3 && (
          <div className="px-5 py-3 border-t border-[#0F172A]/5">
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1.5 text-[12px] font-bold font-['Nunito'] text-[#2E2BE5] hover:underline"
            >
              {expanded
                ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
                : <><ChevronDown className="w-3.5 h-3.5" /> Show {group.sessions.length - 3} more session{group.sessions.length - 3 !== 1 ? "s" : ""}</>
              }
            </button>
          </div>
        )}
      </div>

      {transcript && <TranscriptModal session={transcript} onClose={() => setTranscript(null)} />}
    </>
  );
}

export default function SchoolDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [teacherGroups, setTeacherGroups] = useState<TeacherGroup[]>([]);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);

    // Get school authority's school_name
    const { data: cpUser } = await supabase
      .from("classpulse_users")
      .select("school_name")
      .eq("user_id", user!.id)
      .single();

    const sName = cpUser?.school_name ?? null;
    setSchoolName(sName);

    // Get all teachers in this school
    let teacherQuery = supabase
      .from("classpulse_users")
      .select("user_id")
      .eq("role", "teacher");

    if (sName) teacherQuery = teacherQuery.eq("school_name", sName);

    const { data: teachers } = await teacherQuery;

    if (!teachers || teachers.length === 0) {
      setLoading(false);
      return;
    }

    const teacherIds = teachers.map((t: any) => t.user_id);

    // Get profiles for teachers
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", teacherIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.username]));

    // Get all completed sessions for these teachers
    const { data: sessions } = await supabase
      .from("class_sessions")
      .select("id, teacher_id, class_name, subject, objective_text, key_concepts, started_at, ended_at, transcript_text, status")
      .in("teacher_id", teacherIds)
      .eq("status", "completed")
      .order("ended_at", { ascending: false });

    if (!sessions || sessions.length === 0) {
      setLoading(false);
      return;
    }

    const sessionIds = sessions.map((s: any) => s.id);

    // Get conclusion reports
    const { data: reports } = await supabase
      .from("conclusion_reports")
      .select("session_id, coverage_score, teacher_talk_ratio, student_participation_count, concepts_covered, concepts_missed, ai_coaching_note")
      .in("session_id", sessionIds);

    const reportMap = new Map((reports || []).map((r: any) => [r.session_id, r]));

    // Merge sessions + reports
    const merged: SessionData[] = sessions.map((s: any) => {
      const r = (reportMap.get(s.id) as any) || {};
      return {
        id: s.id,
        teacher_id: s.teacher_id,
        class_name: s.class_name,
        subject: s.subject,
        objective_text: s.objective_text || "",
        key_concepts: s.key_concepts || [],
        started_at: s.started_at,
        ended_at: s.ended_at,
        transcript_text: s.transcript_text,
        coverage_score: r.coverage_score ?? 0,
        teacher_talk_ratio: r.teacher_talk_ratio ?? 0,
        student_participation_count: r.student_participation_count ?? 0,
        concepts_covered: r.concepts_covered ?? [],
        concepts_missed: r.concepts_missed ?? [],
        ai_coaching_note: r.ai_coaching_note ?? "",
      };
    });

    // Group by teacher
    const groupMap = new Map<string, SessionData[]>();
    merged.forEach(s => {
      if (!groupMap.has(s.teacher_id)) groupMap.set(s.teacher_id, []);
      groupMap.get(s.teacher_id)!.push(s);
    });

    const groups: TeacherGroup[] = teacherIds
      .filter((id: string) => groupMap.has(id))
      .map((id: string, idx: number) => {
        const teacherSessions = groupMap.get(id)!;
        const avgCoverage = Math.round(
          teacherSessions.reduce((a, s) => a + s.coverage_score, 0) / teacherSessions.length
        );
        return {
          user_id: id,
          display_name: profileMap.get(id) || `Teacher ${idx + 1}`,
          sessions: teacherSessions,
          avg_coverage: avgCoverage,
          total_sessions: teacherSessions.length,
          goals_achieved: teacherSessions.filter(s => s.concepts_missed.length === 0).length,
        };
      })
      .sort((a: TeacherGroup, b: TeacherGroup) => b.avg_coverage - a.avg_coverage);

    setTeacherGroups(groups);
    setLoading(false);
  };

  // Overall stats
  const allSessions = teacherGroups.flatMap(g => g.sessions);
  const overallAvg = allSessions.length > 0
    ? Math.round(allSessions.reduce((a, s) => a + s.coverage_score, 0) / allSessions.length)
    : 0;
  const avgStudentTalk = allSessions.length > 0
    ? Math.round(allSessions.reduce((a, s) => a + (100 - s.teacher_talk_ratio), 0) / allSessions.length)
    : 0;
  const totalGoalsAchieved = allSessions.filter(s => s.concepts_missed.length === 0).length;
  const flaggedCount = allSessions.filter(s => s.coverage_score < 60).length;

  // Subject breakdown
  const subjectMap = new Map<string, number[]>();
  allSessions.forEach(s => {
    if (!subjectMap.has(s.subject)) subjectMap.set(s.subject, []);
    subjectMap.get(s.subject)!.push(s.coverage_score);
  });
  const subjectRows = Array.from(subjectMap.entries())
    .map(([subject, scores]) => ({
      subject,
      avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      count: scores.length,
    }))
    .sort((a, b) => b.avg - a.avg);

  const handleExport = () => {
    const lines = [
      "ClassPulse School Analytics Report",
      schoolName ? `School: ${schoolName}` : "",
      `Generated: ${format(new Date(), "d MMM yyyy")}`,
      "",
      "Overall Performance",
      `Total Sessions: ${allSessions.length}`,
      `Average Coverage: ${overallAvg}%`,
      `Average Student Talk: ${avgStudentTalk}%`,
      `Goals Achieved: ${totalGoalsAchieved}/${allSessions.length}`,
      `Flagged (below 60%): ${flaggedCount}`,
      "",
      "Teacher Performance",
      teacherGroups
        .map(g => `${g.display_name}: ${g.total_sessions} sessions | avg ${g.avg_coverage}% | goals ${g.goals_achieved}/${g.total_sessions}`)
        .join("\n"),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `classpulse-school-${format(new Date(), "yyyy-MM-dd")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      <div className="max-w-5xl mx-auto px-4 py-8 pb-16 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-[16px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] flex items-center justify-center"
              style={{ background: "#2E2BE5" }}
            >
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`${DISPLAY} font-extrabold text-2xl text-[#0F172A]`}>School Analytics</h1>
              {schoolName && (
                <p className="font-['Nunito'] text-[13px] text-[#0F172A]/50 font-semibold">{schoolName}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={allSessions.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-[2.5px] border-[#0F172A] bg-white font-bold font-['Nunito'] text-[13px] shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-[3px_3px_0_0_#0F172A]"
          >
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#2E2BE5]" />
          </div>
        ) : teacherGroups.length === 0 ? (
          <div className={`${CARD} py-20 flex flex-col items-center gap-3 text-center`}>
            <div className="text-5xl">🏫</div>
            <p className={`${DISPLAY} font-extrabold text-xl text-[#0F172A]`}>No teacher sessions yet</p>
            <p className="font-['Nunito'] text-[14px] text-[#0F172A]/50 max-w-sm">
              Session reports will appear here once teachers in your school complete their classes.
            </p>
          </div>
        ) : (
          <>
            {/* ── Overall School Performance ── */}
            <div
              className="border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[3px_3px_0_0_#0F172A] overflow-hidden"
              style={{ background: "linear-gradient(135deg, #2E2BE5 0%, #2F7CFF 100%)" }}
            >
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-2">
                  <School className="w-5 h-5 text-white/70" />
                  <p className={`${DISPLAY} font-extrabold text-[19px] text-white`}>Overall School Performance</p>
                </div>

                {/* KPI grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Total Sessions", value: `${allSessions.length}`, icon: "📋" },
                    { label: "Avg Coverage", value: `${overallAvg}%`, icon: "🎯" },
                    { label: "Avg Student Talk", value: `${avgStudentTalk}%`, icon: "🗣️" },
                    { label: "Goals Achieved", value: `${totalGoalsAchieved}/${allSessions.length}`, icon: "✅" },
                  ].map(kpi => (
                    <div
                      key={kpi.label}
                      className="bg-white/15 rounded-[16px] border-[2px] border-white/20 p-4 text-center"
                    >
                      <div className="text-2xl mb-1">{kpi.icon}</div>
                      <p className={`${DISPLAY} font-extrabold text-2xl text-white`}>{kpi.value}</p>
                      <p className="font-['Nunito'] text-[11px] font-bold text-white/60 mt-0.5">{kpi.label}</p>
                    </div>
                  ))}
                </div>

                {/* Subject bars */}
                {subjectRows.length > 0 && (
                  <div className="bg-white/10 rounded-[16px] border-[2px] border-white/15 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-3.5 h-3.5 text-white/60" />
                      <p className="font-['Nunito'] text-[11px] font-bold text-white/60 uppercase tracking-wider">Performance by Subject</p>
                    </div>
                    <div className="space-y-2.5">
                      {subjectRows.map(row => (
                        <div key={row.subject} className="flex items-center gap-3">
                          <span className="font-['Nunito'] text-[12px] font-bold text-white w-28 shrink-0 truncate">{row.subject}</span>
                          <div className="flex-1 h-2 rounded-full bg-white/20 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${row.avg}%`,
                                background: row.avg >= 80 ? "#22C55E" : row.avg >= 60 ? "#F59E0B" : "#EF4444",
                              }}
                            />
                          </div>
                          <span className="font-['Nunito'] text-[12px] font-bold text-white w-10 text-right shrink-0">{row.avg}%</span>
                          <span className="font-['Nunito'] text-[11px] text-white/40 w-16 shrink-0">
                            {row.count} session{row.count !== 1 ? "s" : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Flagged alert */}
                {flaggedCount > 0 && (
                  <div className="bg-red-500/20 rounded-[12px] border-[2px] border-red-400/30 px-4 py-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-300 shrink-0" />
                    <p className="font-['Nunito'] text-[12px] font-bold text-red-200">
                      {flaggedCount} session{flaggedCount !== 1 ? "s" : ""} flagged — objective coverage below 60%
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Individual Teacher Performance ── */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-[#0F172A]/40" />
                <p className={`${DISPLAY} font-extrabold text-[18px] text-[#0F172A]`}>Teacher Performance</p>
                <span className="font-['Nunito'] text-[12px] font-bold text-[#0F172A]/40">
                  · {teacherGroups.length} teacher{teacherGroups.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-4">
                {teacherGroups.map(group => (
                  <TeacherCard key={group.user_id} group={group} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
