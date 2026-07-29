import { AlertTriangle, Brain, CalendarDays, CheckCircle2, Clock, Lightbulb, Loader2, Sparkles, TrendingDown, TrendingUp, Minus } from "lucide-react";

// --- v2 analysis shape (backward compatible with legacy string arrays) ---
export interface AreaItem {
  topic: string;
  detail?: string;
  confidence?: "high" | "medium";
  severity?: "high" | "medium" | "low";
  cause?: "conceptual" | "careless" | "unattempted";
}

export interface LearnerProfile {
  study_habits?: string[];
  learning_style_note?: string;
  consistency_note?: string;
}

export interface StudyPlanDay {
  day: number;
  focus: string;
  tasks: string[];
  est_minutes?: number;
}

export interface PerformanceAnalysis {
  schema_version?: number;
  overall_trend: "improving" | "declining" | "stable" | "first_attempt";
  performance_summary: string;
  comparison_note: string;
  // Legacy rows store string[]; v2 stores AreaItem[]. Accept both.
  weak_areas: Array<string | AreaItem>;
  strong_areas: Array<string | AreaItem>;
  improvement_tips: string[];
  learner_profile?: LearnerProfile;
  study_plan?: StudyPlanDay[];
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

// Normalise legacy strings and v2 objects into a uniform AreaItem.
function toAreaItem(area: string | AreaItem): AreaItem {
  return typeof area === "string" ? { topic: area } : area;
}

const severityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };

const severityStyle: Record<string, { bg: string; color: string; label: string }> = {
  high:   { bg: "#FFE4E6", color: C.pop,     label: "Utama" },
  medium: { bg: "#FFF3C4", color: "#B45309", label: "Sederhana" },
  low:    { bg: "#F1F5F9", color: "#475569", label: "Ringan" },
};

const causeLabel: Record<string, string> = {
  conceptual:  "Kefahaman konsep",
  careless:    "Silap cuai",
  unattempted: "Tidak dicuba",
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

  const trend = trendConfig[analysis.overall_trend] ?? trendConfig.stable;
  const TrendIcon = trend.icon;

  const strongAreas = (analysis.strong_areas ?? []).map(toAreaItem);
  const weakAreas = (analysis.weak_areas ?? []).map(toAreaItem).sort(
    (a, b) => (severityRank[a.severity ?? "medium"] ?? 1) - (severityRank[b.severity ?? "medium"] ?? 1)
  );
  const profile = analysis.learner_profile;
  const hasProfile = !!profile && (
    (profile.study_habits?.length ?? 0) > 0 ||
    !!profile.learning_style_note ||
    !!profile.consistency_note
  );
  const plan = (analysis.study_plan ?? []).filter((d) => d && d.focus);

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

        {/* How You Learn */}
        {hasProfile && (
          <div className="rounded-[16px] border-[2px] border-[#0F172A] p-4" style={{ background: C.sun }}>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-7 h-7 rounded-[9px] border-[2px] border-[#0F172A] bg-white flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4" style={{ color: C.indigo }} />
              </div>
              <p className={`${DISPLAY} font-extrabold text-sm text-[#0F172A]`}>Cara Kamu Belajar</p>
            </div>
            {(profile?.study_habits?.length ?? 0) > 0 && (
              <ul className="space-y-1.5 mb-2">
                {profile!.study_habits!.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm font-semibold text-[#0F172A]">
                    <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#0F172A] mt-2" />
                    {h}
                  </li>
                ))}
              </ul>
            )}
            {profile?.learning_style_note && (
              <p className="text-sm font-semibold leading-relaxed text-[#0F172A]/90">{profile.learning_style_note}</p>
            )}
            {profile?.consistency_note && (
              <p className="text-xs font-semibold text-[#0F172A]/70 mt-1.5 italic">{profile.consistency_note}</p>
            )}
          </div>
        )}

        {/* Strong / Weak areas */}
        {(strongAreas.length > 0 || weakAreas.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {strongAreas.length > 0 && (
              <div className="rounded-[16px] border-[2px] border-[#0F172A]/10 p-4" style={{ background: C.mintSoft }}>
                <div className="flex items-center gap-2 mb-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <p className={`${DISPLAY} font-extrabold text-sm text-emerald-700`}>Strong Areas</p>
                </div>
                <ul className="space-y-2.5">
                  {strongAreas.map((area, i) => (
                    <li key={i} className="text-sm">
                      <div className="flex items-start gap-2">
                        <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-800">{area.topic}</span>
                            {area.confidence && (
                              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-emerald-200 text-emerald-800">
                                {area.confidence === "high" ? "Kukuh" : "Baik"}
                              </span>
                            )}
                          </div>
                          {area.detail && <p className="text-xs font-medium text-slate-500 mt-0.5 leading-snug">{area.detail}</p>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {weakAreas.length > 0 && (
              <div className="rounded-[16px] border-[2px] border-[#0F172A]/10 p-4" style={{ background: "#FFE4D6" }}>
                <div className="flex items-center gap-2 mb-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: C.pop }} />
                  <p className={`${DISPLAY} font-extrabold text-sm`} style={{ color: C.pop }}>Areas to Improve</p>
                </div>
                <ul className="space-y-2.5">
                  {weakAreas.map((area, i) => {
                    const sev = severityStyle[area.severity ?? ""] ?? null;
                    return (
                      <li key={i} className="text-sm">
                        <div className="flex items-start gap-2">
                          <span className="shrink-0 w-1.5 h-1.5 rounded-full mt-2" style={{ background: C.pop }} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-800">{area.topic}</span>
                              {sev && (
                                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full" style={{ background: sev.bg, color: sev.color }}>
                                  {sev.label}
                                </span>
                              )}
                              {area.cause && causeLabel[area.cause] && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/70 text-slate-500 border border-slate-300">
                                  {causeLabel[area.cause]}
                                </span>
                              )}
                            </div>
                            {area.detail && <p className="text-xs font-medium text-slate-500 mt-0.5 leading-snug">{area.detail}</p>}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Tips */}
        {analysis.improvement_tips?.length > 0 && (
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

        {/* 7-Day Study Plan */}
        {plan.length > 0 && (
          <div className="rounded-[16px] border-[2px] border-[#0F172A] p-4 bg-white">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-[9px] border-[2px] border-[#0F172A] flex items-center justify-center shrink-0" style={{ background: C.cyan }}>
                <CalendarDays className="w-4 h-4 text-[#0F172A]" />
              </div>
              <p className={`${DISPLAY} font-extrabold text-sm text-[#0F172A]`}>Pelan Belajar 7 Hari</p>
            </div>
            <div className="space-y-2.5">
              {plan.map((d, i) => (
                <div key={i} className="rounded-[14px] border-[2px] border-[#0F172A]/10 p-3" style={{ background: i % 2 === 0 ? C.skySoft : "#F8FAFC" }}>
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="shrink-0 inline-flex items-center justify-center min-w-[52px] h-6 px-2 rounded-full border-[2px] border-[#0F172A] font-extrabold text-[11px] text-white" style={{ background: C.indigo }}>
                      Hari {d.day}
                    </span>
                    <span className={`${DISPLAY} font-extrabold text-sm text-[#0F172A] flex-1 min-w-0`}>{d.focus}</span>
                    {typeof d.est_minutes === "number" && d.est_minutes > 0 && (
                      <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-slate-500">
                        <Clock className="w-3 h-3" /> {d.est_minutes} min
                      </span>
                    )}
                  </div>
                  {d.tasks?.length > 0 && (
                    <ul className="space-y-1 pl-1">
                      {d.tasks.map((t, ti) => (
                        <li key={ti} className="flex items-start gap-2 text-xs font-medium text-slate-600">
                          <span className="shrink-0 w-3.5 h-3.5 rounded-[4px] border-[1.5px] border-slate-400 mt-0.5" />
                          {t}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
