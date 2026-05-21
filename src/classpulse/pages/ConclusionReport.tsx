import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, ArrowLeft, TrendingUp, Users, Target, Loader2, Sparkles } from "lucide-react";
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
            <span className="text-[12px] font-bold font-['Nunito'] text-[#0F172A]/30 border border-[#0F172A]/10 rounded-full px-3 py-1">
              Private — Teacher only
            </span>
          </div>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Coverage score */}
          <div className={`${CARD} p-5 flex flex-col items-center gap-3`}>
            <Target className="w-5 h-5 text-[#0F172A]/40" />
            <ScoreRing score={report.coverage_score} />
            <div className="text-center">
              <p className={`${DISPLAY} font-extrabold text-[15px] text-[#0F172A]`}>Coverage Score</p>
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
