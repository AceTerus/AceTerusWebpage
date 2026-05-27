import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, ArrowLeft, TrendingUp, Users, Target, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const DISPLAY = "font-['Baloo_2'] tracking-tight";
const CARD = "border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[3px_3px_0_0_#0F172A] bg-white";

interface ReportData {
  session: {
    id: string;
    class_name: string;
    subject: string;
    objective_text: string;
    key_concepts: string[];
    started_at: string;
    ended_at: string;
  };
  report: {
    coverage_score: number;
    teacher_talk_ratio: number;
    student_participation_count: number;
    concepts_covered: string[];
    concepts_missed: string[];
    ai_coaching_note: string;
    created_at: string;
    teaching_effectiveness_score?: number | null;
    criteria_scores?: Record<string, { score: number; weight: number }> | null;
  };
  history: { coverage_score: number; created_at: string }[];
}

function ScoreRing({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#22C55E" : score >= 60 ? "#F59E0B" : "#EF4444";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="100" height="100" className="-rotate-90">
        <circle cx="50" cy="50" r={radius} strokeWidth="8" stroke="#0F172A10" fill="none" />
        <circle
          cx="50" cy="50" r={radius} strokeWidth="8" stroke={color} fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`${DISPLAY} font-extrabold text-[22px] text-[#0F172A]`}>{score}%</span>
      </div>
    </div>
  );
}

function MiniScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  const color = score >= 80 ? "#16A56B" : score >= 60 ? "#C77800" : "#DC2626";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(15,23,42,0.08)" strokeWidth="4.5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4.5"
        strokeDasharray={`${(score/100)*circ} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2 + 4} textAnchor="middle" fontSize={size < 50 ? "10" : "12"} fontWeight="800"
        fill={color} fontFamily="Baloo 2, sans-serif">{score}%</text>
    </svg>
  );
}

const CRITERIA_META: Record<string, { name: string; desc: string }> = {
  content_coverage:     { name: "Content Coverage",      desc: "% of planned topics mentioned in lesson" },
  lesson_pacing:        { name: "Lesson Pacing",          desc: "Teacher vs student talk balance" },
  student_engagement:   { name: "Student Engagement",     desc: "Volume of participation turns" },
  concept_clarity:      { name: "Concept Clarity",        desc: "Depth of explanation per topic" },
  delivery_consistency: { name: "Delivery Consistency",   desc: "Sustained pacing over full session" },
};

function MiniSparkline({ history, today }: { history: number[]; today: number }) {
  const all = [...history, today];
  const max = Math.max(...all, 1);
  const w = 160;
  const h = 40;
  const pts = all.map((v, i) => ({
    x: (i / (all.length - 1 || 1)) * w,
    y: h - (v / max) * h,
  }));
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  return (
    <svg width={w} height={h} className="overflow-visible">
      <path d={d} stroke="#2F7CFF" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 5 : 3}
          fill={i === pts.length - 1 ? "#2E2BE5" : "#2F7CFF"} />
      ))}
    </svg>
  );
}

export default function ConclusionReport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRerecordConfirm, setShowRerecordConfirm] = useState(false);
  const [rerecordLoading, setRerecordLoading] = useState(false);

  const handleRerecord = async () => {
    if (!id) return;
    setRerecordLoading(true);
    await supabase.from("conclusion_reports").delete().eq("session_id", id);
    await supabase.from("class_sessions").update({
      status: "pending",
      started_at: null,
      ended_at: null,
      transcript_text: null,
    }).eq("id", id);
    setRerecordLoading(false);
    navigate(`/session/${id}`);
  };

  useEffect(() => {
    if (!id) return;

    Promise.all([
      supabase.from("class_sessions").select("*").eq("id", id).single(),
      supabase.from("conclusion_reports").select("*").eq("session_id", id).single(),
    ]).then(async ([{ data: session }, { data: report }]) => {
      if (!session || !report) { setLoading(false); return; }

      const { data: hist } = await supabase
        .from("conclusion_reports")
        .select("coverage_score, created_at, class_sessions!inner(teacher_id)")
        .eq("class_sessions.teacher_id", (session as any).teacher_id)
        .neq("session_id", id)
        .order("created_at", { ascending: true })
        .limit(5);

      setData({
        session: session as any,
        report: report as any,
        history: (hist || []).map((h: any) => ({ coverage_score: h.coverage_score, created_at: h.created_at })),
      });
      setLoading(false);
    });
  }, [id]);

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <Loader2 className="w-6 h-6 animate-spin text-[#2E2BE5]" />
    </div>
  );

  if (!data) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3">
      <p className="font-['Nunito'] text-[#0F172A]/60">Report not found.</p>
      <button onClick={() => navigate("/")} className="font-['Nunito'] text-sm text-[#2E2BE5] font-bold hover:underline">
        ← Back to Dashboard
      </button>
    </div>
  );

  const { session, report, history } = data;
  const sessionDuration = session.started_at && session.ended_at
    ? Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000)
    : null;

  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      <div className="max-w-4xl mx-auto px-4 py-8 pb-16 space-y-6">

        {/* Back + header */}
        <div>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-[13px] font-bold font-['Nunito'] text-[#0F172A]/50 hover:text-[#0F172A] mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[11px] font-bold font-['Nunito'] text-[#2F7CFF] bg-[#DDF3FF] border border-[#2F7CFF]/20 rounded-full px-2.5 py-0.5">
                  {session.subject}
                </span>
                <span className="text-[11px] font-bold font-['Nunito'] text-[#0F172A]/50 border border-[#0F172A]/15 rounded-full px-2.5 py-0.5">
                  {session.class_name}
                </span>
              </div>
              <h1 className={`${DISPLAY} font-extrabold text-2xl text-[#0F172A]`}>Session Report</h1>
              <p className="font-['Nunito'] text-[13px] text-[#0F172A]/50 mt-0.5">
                {session.ended_at && format(new Date(session.ended_at), "EEEE, d MMMM yyyy")}
                {sessionDuration && ` · ${sessionDuration} min`}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-[12px] font-bold font-['Nunito'] text-[#0F172A]/30 border border-[#0F172A]/10 rounded-full px-3 py-1">
                Private — Teacher only
              </span>
              {!showRerecordConfirm ? (
                <button
                  onClick={() => setShowRerecordConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border-[2px] border-[#0F172A]/20 text-[12px] font-bold font-['Nunito'] text-[#2E2BE5] hover:border-[#2E2BE5] hover:bg-[#EEEDFF] transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Re-record Session
                </button>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-[14px] border-[2px] border-[#0F172A]/15 bg-white shadow-[2px_2px_0_0_#0F172A]">
                  <p className="font-['Nunito'] text-[12px] font-bold text-[#0F172A]/70 mr-1">Reset and re-record?</p>
                  <button
                    onClick={() => setShowRerecordConfirm(false)}
                    className="px-2.5 py-1 rounded-[8px] border-[2px] border-[#0F172A]/20 text-[11px] font-bold font-['Nunito'] text-[#0F172A]/60 hover:border-[#0F172A] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRerecord}
                    disabled={rerecordLoading}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-[8px] border-[2px] border-[#0F172A] bg-[#2E2BE5] text-white text-[11px] font-bold font-['Nunito'] shadow-[2px_2px_0_0_#0F172A] hover:-translate-y-0.5 transition-all disabled:opacity-60"
                  >
                    {rerecordLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <><RefreshCw className="w-3 h-3" /> Re-record</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TES Hero */}
        {(() => {
          const tes = report.teaching_effectiveness_score ?? report.coverage_score;
          const tesColor = tes >= 80 ? "#16A56B" : tes >= 60 ? "#C77800" : "#DC2626";
          return (
            <div className={`${CARD} p-6 flex items-center gap-6`}>
              <ScoreRing score={tes} />
              <div className="flex-1 min-w-0">
                <p className="font-['Nunito'] font-extrabold text-[10.5px] text-[#0F172A]/40 uppercase mb-1" style={{ letterSpacing: "0.06em" }}>
                  Teaching Effectiveness Score
                </p>
                <p className={`${DISPLAY} font-extrabold leading-none mb-1`} style={{ fontSize: "34px", letterSpacing: "-0.022em", color: tesColor }}>
                  {tes}%
                </p>
                <p className="font-['Nunito'] font-semibold text-[13px] text-[#0F172A]/50">
                  Composite of 5 teaching criteria
                </p>
              </div>
              <Target className="w-8 h-8 text-[#0F172A]/15 flex-shrink-0" />
            </div>
          );
        })()}

        {/* 5-Criteria Breakdown */}
        {report.criteria_scores && Object.keys(report.criteria_scores).length > 0 && (
          <div className={`${CARD} p-5`}>
            <p className={`${DISPLAY} font-extrabold text-[15px] text-[#0F172A] mb-4`}>Criteria Breakdown</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(report.criteria_scores).map(([key, { score, weight }]) => {
                const meta = CRITERIA_META[key];
                if (!meta) return null;
                const color = score >= 80 ? "#16A56B" : score >= 60 ? "#C77800" : "#DC2626";
                const bg    = score >= 80 ? "#ECFAF3"  : score >= 60 ? "#FFF6E2"  : "#FEEFEC";
                return (
                  <div key={key} className="flex flex-col items-center gap-2 p-3 rounded-[14px] border-[2px] border-[#0F172A]/10 text-center" style={{ background: bg }}>
                    <MiniScoreRing score={score} size={52} />
                    <p className="font-['Nunito'] font-extrabold text-[11px] text-[#0F172A] leading-tight">{meta.name}</p>
                    <p className="font-['Nunito'] font-semibold text-[10px] text-[#0F172A]/50 leading-tight">{meta.desc}</p>
                    <span className="font-['Nunito'] font-extrabold text-[9.5px] px-2 py-0.5 rounded-full border"
                      style={{ color, borderColor: `${color}40`, background: "white" }}>
                      {weight}% weight
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Metrics row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Coverage score (kept for reference) */}
          <div className={`${CARD} p-5 flex flex-col items-center gap-3`}>
            <Target className="w-5 h-5 text-[#0F172A]/40" />
            <ScoreRing score={report.coverage_score} />
            <div className="text-center">
              <p className={`${DISPLAY} font-extrabold text-[15px] text-[#0F172A]`}>Content Coverage</p>
              <p className="font-['Nunito'] text-[12px] text-[#0F172A]/50">
                {report.concepts_covered.length} / {session.key_concepts.length} concepts covered
              </p>
            </div>
          </div>

          {/* Talk ratio */}
          <div className={`${CARD} p-5 space-y-3`}>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0F172A]/40" />
              <p className={`${DISPLAY} font-extrabold text-[15px] text-[#0F172A]`}>Talk Ratio</p>
            </div>
            <div className="flex rounded-full overflow-hidden h-6 border-[2px] border-[#0F172A]">
              <div className="h-full bg-[#2F7CFF] flex items-center justify-center text-[10px] font-bold text-white"
                style={{ width: `${report.teacher_talk_ratio}%` }}>
                {report.teacher_talk_ratio >= 20 ? `${report.teacher_talk_ratio}%` : ""}
              </div>
              <div className="h-full bg-[#22C55E] flex items-center justify-center text-[10px] font-bold text-white"
                style={{ width: `${100 - report.teacher_talk_ratio}%` }}>
                {100 - report.teacher_talk_ratio >= 20 ? `${100 - report.teacher_talk_ratio}%` : ""}
              </div>
            </div>
            <div className="flex justify-between text-[12px] font-bold font-['Nunito']">
              <span className="text-[#2F7CFF]">Teacher {report.teacher_talk_ratio}%</span>
              <span className="text-[#22C55E]">Student {100 - report.teacher_talk_ratio}%</span>
            </div>
            <p className="font-['Nunito'] text-[12px] text-[#0F172A]/50">
              ~{report.student_participation_count} student turns
            </p>
          </div>

          {/* Historical sparkline */}
          <div className={`${CARD} p-5 space-y-3`}>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#0F172A]/40" />
              <p className={`${DISPLAY} font-extrabold text-[15px] text-[#0F172A]`}>Trend</p>
            </div>
            {history.length > 0 ? (
              <>
                <MiniSparkline history={history.map(h => h.coverage_score)} today={report.coverage_score} />
                <p className="font-['Nunito'] text-[12px] text-[#0F172A]/50">
                  Your last {history.length} session avg:{" "}
                  <strong>{Math.round(history.reduce((a, h) => a + h.coverage_score, 0) / history.length)}%</strong>
                </p>
              </>
            ) : (
              <p className="font-['Nunito'] text-[13px] text-[#0F172A]/40">This is your first session. Trend will appear after more sessions.</p>
            )}
          </div>
        </div>

        {/* Concept breakdown */}
        <div className={`${CARD} p-6 space-y-4`}>
          <p className={`${DISPLAY} font-extrabold text-[17px] text-[#0F172A]`}>Concept Breakdown</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="font-['Nunito'] text-[12px] font-bold text-green-600 mb-2 uppercase tracking-wider">
                Covered ({report.concepts_covered.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {report.concepts_covered.length === 0 ? (
                  <p className="font-['Nunito'] text-[13px] text-[#0F172A]/40">None detected</p>
                ) : (
                  report.concepts_covered.map((c) => (
                    <span key={c} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-bold font-['Nunito'] bg-green-50 text-green-700 border border-green-200">
                      <CheckCircle2 className="w-3 h-3" /> {c}
                    </span>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="font-['Nunito'] text-[12px] font-bold text-red-500 mb-2 uppercase tracking-wider">
                Missed ({report.concepts_missed.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {report.concepts_missed.length === 0 ? (
                  <p className="font-['Nunito'] text-[13px] text-[#0F172A]/40">All concepts covered! 🎉</p>
                ) : (
                  report.concepts_missed.map((c) => (
                    <span key={c} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-bold font-['Nunito'] bg-red-50 text-red-600 border border-red-200">
                      <XCircle className="w-3 h-3" /> {c}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AI Coaching Note */}
        <div className={`${CARD} p-6`} style={{ background: "#D6D4FF30" }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[#2E2BE5]" />
            <p className={`${DISPLAY} font-extrabold text-[17px] text-[#0F172A]`}>AI Coaching Note</p>
          </div>
          <p className="font-['Nunito'] text-[14px] text-[#0F172A]/80 leading-relaxed">
            {report.ai_coaching_note}
          </p>
          {report.concepts_missed.length > 0 && (
            <div className="mt-4 pt-4 border-t-[2px] border-[#0F172A]/10">
              <p className="font-['Nunito'] text-[12px] font-bold text-[#0F172A]/50 mb-1">Gap notes pushed to students for:</p>
              <div className="flex flex-wrap gap-1">
                {report.concepts_missed.map((c) => (
                  <span key={c} className="text-[11px] font-bold font-['Nunito'] px-2 py-0.5 rounded-full bg-[#2E2BE5]/10 text-[#2E2BE5]">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
