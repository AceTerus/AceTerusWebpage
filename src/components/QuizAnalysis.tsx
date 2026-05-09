import { AlertTriangle, CheckCircle2, Lightbulb, Loader2, Sparkles, TrendingDown, TrendingUp, Minus } from "lucide-react";

export interface PerformanceAnalysis {
  overall_trend: "improving" | "declining" | "stable" | "first_attempt";
  performance_summary: string;
  weak_areas: string[];
  strong_areas: string[];
  improvement_tips: string[];
  comparison_note: string;
}

interface QuizAnalysisProps {
  analysis: PerformanceAnalysis | null;
  loading: boolean;
  error: string | null;
}

const C = {
  cyan: "#3BD6F5", blue: "#2F7CFF", indigo: "#2E2BE5",
  ink: "#0F172A", skySoft: "#DDF3FF", indigoSoft: "#D6D4FF",
  pop: "#FF7A59", sun: "#FFD65C", mintSoft: "#D1FAE5",
};

const CARD  = "border-[3px] border-[#0F172A] rounded-[24px] shadow-[4px_4px_0_0_#0F172A] bg-white overflow-hidden";
const DISPLAY = "font-['Baloo_2'] tracking-tight";
const TAG   = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-[2.5px] border-[#0F172A] font-extrabold text-xs";

const trendConfig = {
  improving:    { icon: TrendingUp,   label: "Improving",     bg: "#D1FAE5", color: "#15803d" },
  declining:    { icon: TrendingDown, label: "Needs Attention", bg: "#FFE4E6", color: C.pop },
  stable:       { icon: Minus,        label: "Stable",        bg: C.skySoft, color: C.blue },
  first_attempt:{ icon: Sparkles,     label: "First Attempt", bg: C.indigoSoft, color: C.indigo },
};

export default function QuizAnalysis({ analysis, loading, error }: QuizAnalysisProps) {
  if (loading) {
    return (
      <div className={CARD}>
        <div className="p-6 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-[14px] border-[2.5px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center" style={{ background: C.indigoSoft }}>
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: C.indigo }} />
          </div>
          <p className={`${DISPLAY} font-extrabold text-base`} style={{ color: C.indigo }}>Analysing your performance…</p>
          <p className="text-sm font-semibold text-slate-400">Gemini AI is reviewing your answers and past quizzes</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={CARD}>
        <div className="p-5 flex items-start gap-3">
          <div className="w-9 h-9 rounded-[10px] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center shrink-0" style={{ background: "#FFE4E6" }}>
            <AlertTriangle className="w-4 h-4" style={{ color: C.pop }} />
          </div>
          <div className="min-w-0">
            <p className={`${DISPLAY} font-extrabold text-sm`} style={{ color: C.pop }}>AI analysis failed</p>
            <p className="text-xs font-semibold text-slate-500 mt-0.5 break-words">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const trend = trendConfig[analysis.overall_trend];
  const TrendIcon = trend.icon;

  return (
    <div className={CARD}>
      {/* Header bar */}
      <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${C.indigo}, ${C.cyan})` }} />

      <div className="p-5 space-y-4">
        {/* Title row */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[12px] border-[2.5px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center shrink-0" style={{ background: C.indigoSoft }}>
            <Sparkles className="w-5 h-5" style={{ color: C.indigo }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`${DISPLAY} font-extrabold text-lg leading-tight`}>AI Performance Analysis</p>
            <p className="text-xs font-semibold text-slate-400">Powered by Gemini AI</p>
          </div>
          <span className={`${TAG} shrink-0`} style={{ background: trend.bg, color: trend.color }}>
            <TrendIcon className="w-3.5 h-3.5" />
            {trend.label}
          </span>
        </div>

        {/* Summary */}
        <div className="rounded-[16px] border-[2px] border-[#0F172A]/10 p-4" style={{ background: C.skySoft }}>
          <p className="text-sm font-semibold leading-relaxed text-slate-700">{analysis.performance_summary}</p>
          {analysis.comparison_note && (
            <p className="text-xs font-semibold text-slate-400 mt-2 italic">{analysis.comparison_note}</p>
          )}
        </div>

        {/* Strong / Weak areas */}
        {(analysis.strong_areas.length > 0 || analysis.weak_areas.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {analysis.strong_areas.length > 0 && (
              <div className="rounded-[16px] border-[2px] border-[#0F172A]/10 p-4" style={{ background: C.mintSoft }}>
                <div className="flex items-center gap-2 mb-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <p className={`${DISPLAY} font-extrabold text-sm text-emerald-700`}>Strong Areas</p>
                </div>
                <ul className="space-y-1.5">
                  {analysis.strong_areas.map((area, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm font-medium text-slate-700">
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
                      {area}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.weak_areas.length > 0 && (
              <div className="rounded-[16px] border-[2px] border-[#0F172A]/10 p-4" style={{ background: "#FFE4D6" }}>
                <div className="flex items-center gap-2 mb-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: C.pop }} />
                  <p className={`${DISPLAY} font-extrabold text-sm`} style={{ color: C.pop }}>Areas to Improve</p>
                </div>
                <ul className="space-y-1.5">
                  {analysis.weak_areas.map((area, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm font-medium text-slate-700">
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full mt-2" style={{ background: C.pop }} />
                      {area}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Tips */}
        {analysis.improvement_tips.length > 0 && (
          <div className="rounded-[16px] border-[2px] border-[#0F172A]/10 p-4" style={{ background: C.indigoSoft }}>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 shrink-0" style={{ color: C.indigo }} />
              <p className={`${DISPLAY} font-extrabold text-sm`} style={{ color: C.indigo }}>Tips to Improve</p>
            </div>
            <ul className="space-y-2.5">
              {analysis.improvement_tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="shrink-0 w-5 h-5 rounded-full border-[2px] border-[#0F172A] font-extrabold text-[10px] flex items-center justify-center mt-0.5 text-white" style={{ background: C.indigo }}>
                    {i + 1}
                  </span>
                  <span className="font-medium text-slate-700 leading-relaxed">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
