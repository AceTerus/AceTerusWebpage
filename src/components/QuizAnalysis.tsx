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
  userName?: string | null;
}

const C = {
  cyan: "#3BD6F5", blue: "#2F7CFF", indigo: "#2E2BE5",
  ink: "#0F172A", skySoft: "#DDF3FF", indigoSoft: "#D6D4FF",
  pop: "#FF7A59", sun: "#FFD65C", mintSoft: "#D1FAE5",
};

const CARD  = "border-[3px] border-[#0F172A] rounded-[24px] shadow-[4px_4px_0_0_#0F172A] bg-white overflow-hidden";
const PANEL = "rounded-[18px] border-[2px] border-[#0F172A] bg-white h-full flex flex-col";
const DISPLAY = "font-['Baloo_2'] tracking-tight";
const TAG   = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-[2.5px] border-[#0F172A] font-extrabold text-xs";

const trendConfig = {
  improving:    { icon: TrendingUp,   label: "Improving",       bg: "#D1FAE5", color: "#15803d" },
  declining:    { icon: TrendingDown, label: "Needs Attention", bg: "#FFE4E6", color: C.pop },
  stable:       { icon: Minus,        label: "Stable",          bg: C.skySoft, color: C.blue },
  first_attempt:{ icon: Sparkles,     label: "First Attempt",   bg: C.indigoSoft, color: C.indigo },
};

// Normalise legacy strings and v2 objects into a uniform AreaItem.
function toAreaItem(area: string | AreaItem): AreaItem {
  return typeof area === "string" ? { topic: area } : area;
}

const severityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };

const severityStyle: Record<string, { bg: string; color: string; label: string }> = {
  high:   { bg: "#FFE4E6", color: C.pop,     label: "High" },
  medium: { bg: "#FFF3C4", color: "#B45309", label: "Medium" },
  low:    { bg: "#F1F5F9", color: "#475569", label: "Low" },
};

const causeLabel: Record<string, string> = {
  conceptual:  "Conceptual",
  careless:    "Careless slip",
  unattempted: "Not attempted",
};

// Small shared header for each insight panel.
function PanelHead({ icon: Icon, label, iconBg, iconColor, labelColor }: { icon: typeof Brain; label: string; iconBg: string; iconColor: string; labelColor: string }) {
  return (
    <div className="flex items-center gap-2 px-4 pt-4 pb-2.5">
      <div className="w-7 h-7 rounded-[9px] border-[2px] border-[#0F172A] flex items-center justify-center shrink-0" style={{ background: iconBg }}>
        <Icon className="w-4 h-4" style={{ color: iconColor }} />
      </div>
      <p className={`${DISPLAY} font-extrabold text-sm`} style={{ color: labelColor }}>{label}</p>
    </div>
  );
}

export default function QuizAnalysis({ analysis, loading, error, userName }: QuizAnalysisProps) {
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
  const tips = analysis.improvement_tips ?? [];
  const displayName = (userName && userName.trim()) || null;

  return (
    <div className={CARD}>
      {/* ── Personalised hero ── */}
      <div className="p-5 text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${C.indigo} 0%, ${C.blue} 60%, ${C.cyan} 100%)` }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 opacity-90" />
              <p className="font-extrabold text-[10px] uppercase tracking-widest opacity-80">AI Performance Analysis · Gemini</p>
            </div>
            <p className={`${DISPLAY} font-extrabold text-xl sm:text-2xl leading-tight`}>
              {displayName ? <>Personalised feedback for <span style={{ color: C.sun }}>{displayName}</span></> : "Your personalised feedback"}
            </p>
          </div>
          <span className={`${TAG} shrink-0 bg-white`} style={{ color: trend.color }}>
            <TrendIcon className="w-3.5 h-3.5" />
            {trend.label}
          </span>
        </div>
        <p className="text-sm font-semibold leading-relaxed opacity-95 mt-3 max-w-3xl">{analysis.performance_summary}</p>
        {analysis.comparison_note && (
          <p className="text-xs font-semibold opacity-75 mt-1.5 italic">{analysis.comparison_note}</p>
        )}
      </div>

      <div className="p-4 space-y-4 bg-[#F8FAFC]">
        {/* ── Insight row: habits · strengths · weaknesses (horizontal) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {/* How You Learn */}
          {hasProfile && (
            <div className={PANEL} style={{ background: "#FFFBEB" }}>
              <PanelHead icon={Brain} label="How You Learn" iconBg={C.sun} iconColor={C.indigo} labelColor={C.ink} />
              <div className="px-4 pb-4 space-y-2">
                {(profile?.study_habits?.length ?? 0) > 0 && (
                  <ul className="space-y-1.5">
                    {profile!.study_habits!.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] font-semibold text-[#0F172A] leading-snug">
                        <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#0F172A] mt-1.5" />
                        {h}
                      </li>
                    ))}
                  </ul>
                )}
                {profile?.learning_style_note && (
                  <p className="text-[13px] font-semibold leading-snug text-[#0F172A]/90">{profile.learning_style_note}</p>
                )}
                {profile?.consistency_note && (
                  <p className="text-xs font-semibold text-[#0F172A]/60 italic leading-snug">{profile.consistency_note}</p>
                )}
              </div>
            </div>
          )}

          {/* Strengths */}
          {strongAreas.length > 0 && (
            <div className={PANEL} style={{ background: C.mintSoft }}>
              <PanelHead icon={CheckCircle2} label="Strengths" iconBg="#86EFAC" iconColor="#15803d" labelColor="#15803d" />
              <ul className="px-4 pb-4 space-y-2.5">
                {strongAreas.map((area, i) => (
                  <li key={i} className="text-[13px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-800 leading-snug">{area.topic}</span>
                      {area.confidence && (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-emerald-200 text-emerald-800">
                          {area.confidence === "high" ? "Strong" : "Good"}
                        </span>
                      )}
                    </div>
                    {area.detail && <p className="text-xs font-medium text-slate-500 mt-0.5 leading-snug">{area.detail}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses */}
          {weakAreas.length > 0 && (
            <div className={PANEL} style={{ background: "#FFF1EA" }}>
              <PanelHead icon={AlertTriangle} label="Areas to Improve" iconBg="#FFC7B0" iconColor={C.pop} labelColor={C.pop} />
              <ul className="px-4 pb-4 space-y-2.5">
                {weakAreas.map((area, i) => {
                  const sev = severityStyle[area.severity ?? ""] ?? null;
                  return (
                    <li key={i} className="text-[13px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-800 leading-snug">{area.topic}</span>
                        {sev && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full" style={{ background: sev.bg, color: sev.color }}>
                            {sev.label}
                          </span>
                        )}
                        {area.cause && causeLabel[area.cause] && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/80 text-slate-500 border border-slate-300">
                            {causeLabel[area.cause]}
                          </span>
                        )}
                      </div>
                      {area.detail && <p className="text-xs font-medium text-slate-500 mt-0.5 leading-snug">{area.detail}</p>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* ── Tips (horizontal) ── */}
        {tips.length > 0 && (
          <div className="rounded-[18px] border-[2px] border-[#0F172A] bg-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-[9px] border-[2px] border-[#0F172A] flex items-center justify-center shrink-0" style={{ background: C.indigoSoft }}>
                <Lightbulb className="w-4 h-4" style={{ color: C.indigo }} />
              </div>
              <p className={`${DISPLAY} font-extrabold text-sm`} style={{ color: C.indigo }}>Tips to Improve</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-[12px] border-[1.5px] border-[#0F172A]/10 bg-[#F8FAFC] p-2.5">
                  <span className="shrink-0 w-5 h-5 rounded-full border-[2px] border-[#0F172A] font-extrabold text-[10px] flex items-center justify-center text-white" style={{ background: C.indigo }}>
                    {i + 1}
                  </span>
                  <span className="text-[13px] font-medium text-slate-700 leading-snug">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 7-Day study plan (horizontal scroll strip) ── */}
        {plan.length > 0 && (
          <div className="rounded-[18px] border-[2px] border-[#0F172A] bg-white p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-[9px] border-[2px] border-[#0F172A] flex items-center justify-center shrink-0" style={{ background: C.cyan }}>
                  <CalendarDays className="w-4 h-4 text-[#0F172A]" />
                </div>
                <p className={`${DISPLAY} font-extrabold text-sm text-[#0F172A]`}>7-Day Study Plan</p>
              </div>
              <span className="text-[10px] font-bold text-slate-400 hidden sm:block">scroll to see all →</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x" style={{ scrollbarWidth: "thin" }}>
              {plan.map((d, i) => (
                <div key={i} className="snap-start shrink-0 w-[210px] rounded-[14px] border-[2px] border-[#0F172A] flex flex-col" style={{ background: i % 2 === 0 ? C.skySoft : "#FFFFFF" }}>
                  <div className="flex items-center justify-between gap-1 px-3 pt-3 pb-2 border-b-[1.5px] border-[#0F172A]/10">
                    <span className="inline-flex items-center justify-center h-6 px-2.5 rounded-full border-[2px] border-[#0F172A] font-extrabold text-[11px] text-white" style={{ background: C.indigo }}>
                      Day {d.day}
                    </span>
                    {typeof d.est_minutes === "number" && d.est_minutes > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500">
                        <Clock className="w-3 h-3" /> {d.est_minutes}m
                      </span>
                    )}
                  </div>
                  <div className="px-3 py-2.5 flex-1">
                    <p className={`${DISPLAY} font-extrabold text-[13px] text-[#0F172A] leading-tight mb-2`}>{d.focus}</p>
                    {d.tasks?.length > 0 && (
                      <ul className="space-y-1.5">
                        {d.tasks.map((t, ti) => (
                          <li key={ti} className="flex items-start gap-1.5 text-[11px] font-medium text-slate-600 leading-snug">
                            <span className="shrink-0 w-3 h-3 rounded-[4px] border-[1.5px] border-slate-400 mt-0.5" />
                            {t}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
