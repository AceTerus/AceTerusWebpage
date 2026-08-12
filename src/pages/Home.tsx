import { useEffect, useMemo } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Rocket,
  Flame,
  Coins,
  Sparkles,
  Timer,
  Play,
  Pause,
  Swords,
  Skull,
  ChevronRight,
  Compass,
  BookOpen,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Lightbulb,
  Star,
  Zap,
  Heart,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useStreak } from "@/hooks/useStreak";
import { usePomodoro, WORK_SECS, BREAK_SECS } from "@/context/PomodoroContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchDecks } from "@/lib/quiz-client";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { TodayGoalBanner } from "@/components/TodayGoalBanner";
import Logo from "@/assets/logo.webp";

/* ── brand colours (extended for the dashboard) ─────────────────────────── */
const C = {
  cyan:       "#3BD6F5",
  blue:       "#2F7CFF",
  indigo:     "#2E2BE5",
  ink:        "#0F172A",
  skySoft:    "#DDF3FF",
  blueSoft:   "#C8DEFF",
  indigoSoft: "#D6D4FF",
  cloud:      "#F3FAFF",
  sun:        "#FFD65C",
  pop:        "#FF7A59",
  mint:       "#B7F5CE",
  lilac:      "#EBD9FF",
  peach:      "#FFE0D3",
};

/* ── style tokens (redeclared locally per project convention) ───────────── */
const DISPLAY = "font-['Baloo_2'] tracking-tight";
const CARD =
  "border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[3px_3px_0_0_#0F172A] bg-white";
const BIG_CARD =
  "border-[3px] border-[#0F172A] rounded-[28px] shadow-[5px_5px_0_0_#0F172A]";
const PILL =
  "border-[2.5px] border-[#0F172A] rounded-full shadow-[3px_3px_0_0_#0F172A]";
const SECTION_LABEL = `${DISPLAY} font-extrabold text-[11px] uppercase tracking-[0.16em] text-[#0F172A]/60`;
const BTN =
  "inline-flex items-center gap-2 font-extrabold font-['Baloo_2'] border-[2.5px] border-[#0F172A] rounded-full px-4 py-2 shadow-[3px_3px_0_0_#0F172A] transition-all duration-150 cursor-pointer hover:-translate-y-0.5 hover:shadow-[4px_5px_0_0_#0F172A] active:translate-y-0.5 active:shadow-[1px_1px_0_0_#0F172A]";

/* ── Scoped keyframes (namespaced with `home-` to avoid global collisions) */
const HOME_STYLES = `
@keyframes home-float {
  0%,100% { transform: translateY(0) rotate(var(--r,0deg)); }
  50%     { transform: translateY(-12px) rotate(calc(var(--r,0deg) + 4deg)); }
}
@keyframes home-drift {
  0%,100% { transform: translate(0,0) rotate(0deg); }
  50%     { transform: translate(10px,-16px) rotate(-6deg); }
}
@keyframes home-wiggle {
  0%,100% { transform: rotate(-10deg); }
  50%     { transform: rotate(10deg); }
}
@keyframes home-flicker {
  0%,100% { transform: scale(1) rotate(-3deg); }
  50%     { transform: scale(1.08) rotate(3deg); }
}
@keyframes home-sparkle {
  0%,100% { opacity: .35; transform: scale(.85); }
  50%     { opacity: 1;   transform: scale(1.15); }
}
@keyframes home-shine {
  0%   { transform: translateX(-120%) skewX(-18deg); }
  100% { transform: translateX(260%)  skewX(-18deg); }
}
@keyframes home-enter {
  0%   { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes home-wave-scroll {
  from { background-position: 0 100%; }
  to   { background-position: -720px 100%; }
}
@keyframes home-bubble {
  0%   { transform: translateY(0)   scale(.6); opacity: 0; }
  15%  { opacity: .75; }
  100% { transform: translateY(-90px) scale(1); opacity: 0; }
}
.home-float   { animation: home-float 6s ease-in-out infinite; }
.home-drift   { animation: home-drift 8s ease-in-out infinite; }
.home-wiggle  { animation: home-wiggle 2.4s ease-in-out infinite; transform-origin: 60% 80%; }
.home-flicker { animation: home-flicker 1.6s ease-in-out infinite; transform-origin: 50% 100%; }
.home-sparkle { animation: home-sparkle 2s ease-in-out infinite; }
.home-enter   { animation: home-enter .55s ease-out both; }
.home-shine   { animation: home-shine 1.1s ease-out; }
.home-wave-a  { animation: home-wave-scroll 26s linear infinite; }
.home-wave-b  { animation: home-wave-scroll 17s linear infinite reverse; }
.home-wave-c  { animation: home-wave-scroll 11s linear infinite; }
.home-bubble  { animation: home-bubble 7s ease-in infinite; }
@media (prefers-reduced-motion: reduce) {
  .home-float,.home-drift,.home-wiggle,.home-flicker,.home-sparkle,.home-shine,.home-enter,
  .home-wave-a,.home-wave-b,.home-wave-c,.home-bubble { animation: none; }
}
`;

type BossRaidTeaser = {
  id: string;
  title: string | null;
  pot: number | null;
  ends_at: string | null;
};

/* Time-of-day theming (icon + tint + short label) */
const timeVibe = () => {
  const h = new Date().getHours();
  if (h < 5)  return { Icon: Moon,    tint: "#6366F1", label: "Late night" };
  if (h < 11) return { Icon: Sunrise, tint: "#F59E0B", label: "Morning" };
  if (h < 15) return { Icon: Sun,     tint: "#F59E0B", label: "Midday" };
  if (h < 18) return { Icon: Sun,     tint: C.cyan,    label: "Afternoon" };
  if (h < 21) return { Icon: Sunset,  tint: C.pop,     label: "Evening" };
  return { Icon: Moon, tint: "#6366F1", label: "Night" };
};

const greetingFor = (name: string) => {
  const h = new Date().getHours();
  if (h < 5)  return `Studying late, ${name}?`;
  if (h < 12) return `Good morning, ${name}`;
  if (h < 17) return `Good afternoon, ${name}`;
  if (h < 21) return `Good evening, ${name}`;
  return `Winding down, ${name}?`;
};

const TIPS = [
  "Explain a concept out loud — it locks memory in place.",
  "Fifteen focused minutes beats two distracted hours.",
  "Mix subjects in one session — it boosts retention.",
  "Sleep is when your brain files today's learning.",
  "Small wins compound. Just show up today.",
  "Set one clear goal before you open a book.",
  "Struggle means you're learning — keep going.",
];
const todayTip = () => TIPS[new Date().getDate() % TIPS.length];

/* ── Layered animated seawave ─────────────────────────────────────────────
   Uses `background-image: repeat-x` + `background-position-x` so the tile
   wraps at exact pixel widths and never shows a seam or blink on loop.
   Each tile is 720px wide with one full wave period; every tile's start/
   end tangent matches so consecutive tiles read as one continuous wave.
   Sits inside the Home root (which is inside <main>'s left-padded box),
   so on desktop it never crosses under the sidebar. */
const WAVE_TILE_W = 720;
const WAVE_TILE_H = 220;

const buildWaveSvg = (fill: string, opacity: number, y: number, amp: number) => {
  const up = y - amp;
  const dn = y + amp;
  return (
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${WAVE_TILE_W} ${WAVE_TILE_H}' preserveAspectRatio='none'>` +
      `<path d='M0,${y} Q180,${up} 360,${y} Q540,${dn} ${WAVE_TILE_W},${y} L${WAVE_TILE_W},${WAVE_TILE_H} L0,${WAVE_TILE_H} Z' ` +
      `fill='${fill}' opacity='${opacity}'/>` +
    `</svg>`
  );
};

const buildFoamSvg = (y: number, amp: number) => {
  const up = y - amp;
  const dn = y + amp;
  return (
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${WAVE_TILE_W} ${WAVE_TILE_H}' preserveAspectRatio='none'>` +
      `<path d='M0,${y} Q180,${up} 360,${y} Q540,${dn} ${WAVE_TILE_W},${y}' ` +
      `fill='none' stroke='#ffffff' stroke-opacity='0.55' stroke-width='2' stroke-linecap='round'/>` +
    `</svg>`
  );
};

const encodeSvg = (svg: string) =>
  `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;

const BG_WAVE_A = encodeSvg(buildWaveSvg(C.cyan,   0.35, 80,  22));
const BG_WAVE_B = encodeSvg(buildWaveSvg(C.blue,   0.55, 118, 28));
const BG_WAVE_C = encodeSvg(buildWaveSvg(C.indigo, 0.85, 150, 32));
const BG_FOAM   = encodeSvg(buildFoamSvg(150, 32));

const waveLayerStyle = (bg: string): React.CSSProperties => ({
  backgroundImage: bg,
  backgroundRepeat: "repeat-x",
  backgroundSize: `${WAVE_TILE_W}px 100%`,
  backgroundPosition: "0 100%",
});

const BUBBLES = [
  { left: "16%", size: 10, delay: "0s"   },
  { left: "31%", size: 6,  delay: "1.6s" },
  { left: "48%", size: 13, delay: "3.2s" },
  { left: "63%", size: 8,  delay: "2.1s" },
  { left: "79%", size: 5,  delay: "4.4s" },
  { left: "40%", size: 4,  delay: "5.8s" },
];

const SeaWave = () => (
  <div
    className="pointer-events-none absolute inset-x-0 bottom-20 lg:bottom-0 h-[200px] sm:h-[240px] overflow-hidden z-0"
    aria-hidden
  >
    {/* Bubbles rising through the water */}
    <div className="absolute inset-0">
      {BUBBLES.map((b, i) => (
        <span
          key={i}
          className="home-bubble absolute bottom-6 rounded-full bg-white/70 border border-white/90"
          style={{
            left: b.left,
            width: b.size,
            height: b.size,
            animationDelay: b.delay,
          }}
        />
      ))}
    </div>

    {/* Back layer — slow, translucent cyan */}
    <div
      className="home-wave-a absolute inset-x-0 bottom-0 h-full will-change-[background-position]"
      style={waveLayerStyle(BG_WAVE_A)}
    />
    {/* Mid layer — blue, drifting the other way */}
    <div
      className="home-wave-b absolute inset-x-0 bottom-0 h-full will-change-[background-position]"
      style={waveLayerStyle(BG_WAVE_B)}
    />
    {/* Front layer — deep indigo, fastest */}
    <div
      className="home-wave-c absolute inset-x-0 bottom-0 h-full will-change-[background-position]"
      style={waveLayerStyle(BG_WAVE_C)}
    />
    {/* Foam highlight riding the front wave (same tile & speed as layer C) */}
    <div
      className="home-wave-c absolute inset-x-0 bottom-0 h-full will-change-[background-position]"
      style={waveLayerStyle(BG_FOAM)}
    />
  </div>
);

/* Decorative floating stickers behind the content — subtle, non-interactive. */
const FloatingStickers = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
    <div
      className="home-float absolute right-[6%] top-[9%] w-11 h-11 rounded-[12px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] flex items-center justify-center"
      style={{ background: C.sun, ...({ "--r": "-8deg" } as React.CSSProperties) }}
    >
      <Star className="w-5 h-5" fill="#0F172A" stroke="#0F172A" />
    </div>
    <div
      className="home-drift absolute left-[3%] top-[42%] w-16 h-16 rounded-full border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A]"
      style={{ background: C.mint }}
    />
    <div
      className="home-float absolute right-[9%] bottom-[16%] w-12 h-12 rounded-[14px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] flex items-center justify-center"
      style={{
        background: C.pop,
        ...({ "--r": "10deg" } as React.CSSProperties),
        animationDelay: "1.4s",
      }}
    >
      <Zap className="w-5 h-5 text-white" fill="#fff" strokeWidth={2.5} />
    </div>
    <div
      className="home-drift absolute right-[38%] top-[5%] w-7 h-7 rounded-full border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A]"
      style={{ background: C.lilac, animationDelay: "2s" }}
    />
    <div
      className="home-float absolute left-[11%] bottom-[22%] w-9 h-9 rounded-[10px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A]"
      style={{
        background: C.cyan,
        ...({ "--r": "18deg" } as React.CSSProperties),
        animationDelay: "3s",
      }}
    />
    <div
      className="home-drift absolute left-[46%] bottom-[6%] w-8 h-8 rounded-[10px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] flex items-center justify-center"
      style={{ background: "#fff", animationDelay: "1s" }}
    >
      <Heart className="w-4 h-4 text-[#FF7A59]" fill="#FF7A59" />
    </div>
  </div>
);

const Home = () => {
  const { user, isLoading: authLoading, aceCoins, username } = useAuth();
  const navigate = useNavigate();
  const { streak, lastQuizDate, isLoading: streakLoading } = useStreak();
  const pomodoro = usePomodoro();
  const { Icon: TimeIcon, tint: timeTint, label: timeLabel } = timeVibe();
  const tip = todayTip();

  useEffect(() => {
    const prev = document.title;
    document.title = "Home – AceTerus";
    return () => {
      document.title = prev;
    };
  }, []);

  // TODO: personalize based on quiz history once quiz_results is wired up.
  const { data: decks = [] } = useQuery({
    queryKey: ["home-latest-published-deck"],
    enabled: !!user,
    queryFn: () => fetchDecks(true),
    staleTime: 1000 * 60 * 5,
  });
  const nextDeck = decks[0] ?? null;

  const { data: activeRaid, isLoading: raidLoading } = useQuery<BossRaidTeaser | null>({
    queryKey: ["home-active-boss-raid"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("boss_raids")
        .select("id, title, pot, ends_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as BossRaidTeaser | null;
    },
    staleTime: 1000 * 30,
  });

  const displayName = useMemo(() => {
    if (username) return username;
    return user?.email?.split("@")[0] ?? "friend";
  }, [username, user]);

  const todayISO = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const streakAtRisk = !!lastQuizDate && lastQuizDate !== todayISO && streak > 0;

  const dateLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    [],
  );

  if (authLoading) return null;
  if (!user) return <Navigate to="/" replace />;

  return (
    <div
      className="font-['Nunito'] min-h-screen pb-24 lg:pb-10 text-[#0F172A] relative"
      style={{
        backgroundColor: C.cloud,
        backgroundImage: `
          radial-gradient(720px 480px at 92% -8%, rgba(59,214,245,.45), transparent 60%),
          radial-gradient(620px 420px at -6% 10%, rgba(47,124,255,.32), transparent 60%),
          radial-gradient(520px 400px at 50% 108%, rgba(255,214,92,.24), transparent 60%)
        `,
      }}
    >
      <style>{HOME_STYLES}</style>
      <SeaWave />
      <FloatingStickers />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 lg:pt-10 relative z-10">
        {/* ── Greeting + coins ── */}
        <header className="home-enter flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <img
                src={Logo}
                alt="AceTerus"
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-[16px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A]"
              />
              <div
                className="home-wiggle absolute -top-2 -right-2 w-7 h-7 rounded-full border-[2.5px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center"
                style={{ background: timeTint }}
                title={timeLabel}
              >
                <TimeIcon className="w-3.5 h-3.5 text-white" strokeWidth={2.75} />
              </div>
            </div>
            <div className="min-w-0">
              <p className={`${SECTION_LABEL} flex items-center gap-1.5`}>
                <span>{timeLabel}</span>
                <span className="w-1 h-1 rounded-full bg-[#0F172A]/40" />
                <span className="text-[#0F172A]/60 normal-case tracking-normal font-bold text-[11px]">
                  {dateLabel}
                </span>
              </p>
              <h1
                className={`${DISPLAY} font-extrabold text-[24px] sm:text-[34px] leading-none truncate`}
              >
                {greetingFor(displayName)}
              </h1>
            </div>
          </div>

          <div
            className={`${PILL} shrink-0 flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white font-extrabold text-sm`}
            title="ACE Coins balance"
          >
            <Coins className="w-4 h-4 text-amber-500" />
            <span className={DISPLAY}>
              <AnimatedNumber value={aceCoins} /> ACE
            </span>
          </div>
        </header>

        {/* ── Grid: LEFT = primary + raid + tip · RIGHT = status stack ── */}
        <div
          className="home-enter grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
          style={{ animationDelay: "80ms" }}
        >
          {/* ── LEFT column ── */}
          <div className="flex flex-col gap-5 min-w-0">
            <PrimaryCta deckName={nextDeck?.name ?? null} deckId={nextDeck?.id ?? null} />
            <BossRaidTeaserCard
              raid={activeRaid ?? null}
              isLoading={raidLoading}
              onOpen={() => navigate("/quiz?mode=boss_raid")}
            />
            <TipCard tip={tip} />
          </div>

          {/* ── RIGHT column ── */}
          <div className="flex flex-col gap-5 min-w-0">
            <StreakCard
              streak={streak}
              atRisk={streakAtRisk}
              isLoading={streakLoading}
              onAction={() => navigate("/quiz")}
            />
            <GoalCard onSetGoal={() => navigate("/profile")} />
            <PomodoroCard
              active={pomodoro.active}
              mode={pomodoro.mode}
              secs={pomodoro.secs}
              onToggle={pomodoro.toggle}
            />
            <QuickLinks />
          </div>
        </div>
      </main>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
 * Primary CTA — hero card with decorative circles, sparkle particles,
 * hover shimmer sweep.
 * ─────────────────────────────────────────────────────────────────────── */
const PrimaryCta = ({
  deckName,
  deckId,
}: {
  deckName: string | null;
  deckId: string | null;
}) => {
  const hasDeck = !!deckName;
  const headline = hasDeck ? "Continue studying" : "Ready to level up?";
  const subtitle = hasDeck
    ? deckName
    : "Pick a deck and warm up with a few questions.";
  const href = deckId ? `/quiz?deck=${deckId}` : "/quiz";
  const label = hasDeck ? "Jump back in" : "Explore quizzes";

  return (
    <Link
      to={href}
      className={`${BIG_CARD} group block relative overflow-hidden p-6 sm:p-9 text-white transition-all duration-200 hover:-translate-y-1 hover:shadow-[8px_10px_0_0_#0F172A]`}
      style={{
        background: `linear-gradient(135deg, ${C.cyan} 0%, ${C.blue} 55%, ${C.indigo} 100%)`,
        minHeight: "220px",
      }}
    >
      {/* Big background circles */}
      <div className="pointer-events-none absolute -right-16 -top-20 w-64 h-64 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute right-6 top-28 w-32 h-32 rounded-full bg-white/[0.06]" />
      <div className="pointer-events-none absolute right-56 -bottom-10 w-40 h-40 rounded-full bg-white/[0.05]" />

      {/* Sparkle particles */}
      <Sparkles className="home-sparkle absolute right-8 top-6 w-6 h-6 text-white/90" />
      <Sparkles
        className="home-sparkle absolute right-28 top-14 w-4 h-4 text-white/75"
        style={{ animationDelay: ".4s" }}
      />
      <Sparkles
        className="home-sparkle absolute right-14 top-28 w-3 h-3 text-white/65"
        style={{ animationDelay: ".9s" }}
      />
      <Sparkles
        className="home-sparkle absolute right-48 top-8 w-3 h-3 text-white/55"
        style={{ animationDelay: "1.4s" }}
      />

      {/* Hover shimmer sweep */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full w-1/3 -translate-x-full group-hover:home-shine"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,.28), transparent)",
          }}
        />
      </div>

      <div className="relative">
        <span className={`${SECTION_LABEL} text-white/85`}>Today's focus</span>
        <h2
          className={`${DISPLAY} font-extrabold mt-2 leading-[1.05] drop-shadow-[0_2px_0_rgba(15,23,42,.12)]`}
          style={{ fontSize: "clamp(30px, 5vw, 48px)" }}
        >
          {headline}
        </h2>
        <p className="mt-2 font-semibold text-white/90 text-[15px] sm:text-[17px] max-w-md leading-snug">
          {subtitle}
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white text-[#0F172A] font-extrabold font-['Baloo_2'] px-5 py-2.5 border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] group-hover:-translate-y-0.5 group-hover:shadow-[4px_5px_0_0_#0F172A] transition-all">
          <Rocket className="w-4 h-4" />
          {label}
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </Link>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
 * Streak card — flame flickers when active; warm glow behind it.
 * ─────────────────────────────────────────────────────────────────────── */
const StreakCard = ({
  streak,
  atRisk,
  isLoading,
  onAction,
}: {
  streak: number;
  atRisk: boolean;
  isLoading: boolean;
  onAction: () => void;
}) => {
  const hasStreak = !isLoading && streak > 0;
  const showAtRisk = !isLoading && atRisk && streak > 0;
  const bgColor = showAtRisk ? "#FFF0ED" : hasStreak ? "#FFF9E8" : "#FBFDFF";
  const glow = showAtRisk ? C.pop : C.sun;
  const label = isLoading
    ? "Loading…"
    : streak === 0
    ? "No streak yet — take today's quiz to start one."
    : showAtRisk
    ? "Take a quiz today or your streak resets."
    : "Nice — you're on fire today.";

  return (
    <div
      className={`${CARD} p-5 flex items-center gap-4 relative overflow-hidden`}
      style={{ background: bgColor }}
    >
      {hasStreak && (
        <div
          className="pointer-events-none absolute -left-6 -top-6 w-40 h-40 rounded-full opacity-40 blur-2xl"
          style={{ background: glow }}
        />
      )}
      <div
        className={`shrink-0 w-14 h-14 rounded-[16px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] flex items-center justify-center relative ${
          hasStreak ? "home-flicker" : ""
        }`}
        style={{ background: showAtRisk ? C.pop : "#F59E0B" }}
      >
        <Flame className="w-7 h-7 text-white" strokeWidth={2.5} fill="#fff" />
      </div>
      <div className="flex-1 min-w-0 relative">
        <div className="flex items-baseline gap-2">
          <span className={`${DISPLAY} font-extrabold text-[28px] leading-none`}>
            {isLoading ? "—" : streak}
          </span>
          <span className={`${DISPLAY} font-extrabold text-[13px] text-[#0F172A]/60`}>
            day streak
          </span>
        </div>
        <p className="text-[12.5px] font-semibold text-[#0F172A]/70 mt-1 leading-snug">
          {label}
        </p>
      </div>
      {showAtRisk && (
        <button
          type="button"
          onClick={onAction}
          className={`${BTN} bg-white text-[#0F172A] !py-1.5 !px-3 !text-[12px]`}
        >
          Save it
        </button>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
 * Today's Goal — reuse TodayGoalBanner inline
 * ─────────────────────────────────────────────────────────────────────── */
const GoalCard = ({ onSetGoal }: { onSetGoal: () => void }) => (
  <div className={`${CARD} p-5`} style={{ background: C.skySoft }}>
    <p className={`${SECTION_LABEL} mb-3`}>Today's goal</p>
    <TodayGoalBanner inline onSetGoal={onSetGoal} />
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────
 * Pomodoro quick-start
 * ─────────────────────────────────────────────────────────────────────── */
const PomodoroCard = ({
  active,
  mode,
  secs,
  onToggle,
}: {
  active: boolean;
  mode: "work" | "break";
  secs: number;
  onToggle: () => void;
}) => {
  const total = mode === "work" ? WORK_SECS : BREAK_SECS;
  const progress = Math.max(0, Math.min(1, 1 - secs / total));
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const label = active
    ? `${mode === "work" ? "Focus" : "Break"} in progress`
    : "Start a focus session";

  return (
    <div className={`${CARD} p-5`} style={{ background: C.indigoSoft }}>
      <div className="flex items-center gap-4">
        <div
          className="shrink-0 w-14 h-14 rounded-[16px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] flex items-center justify-center"
          style={{ background: C.indigo }}
        >
          <Timer className="w-7 h-7 text-white" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`${DISPLAY} font-extrabold text-[16px] leading-none`}>
            {active ? `${mm}:${ss}` : "25 min focus"}
          </p>
          <p className="text-[12.5px] font-semibold text-[#0F172A]/70 mt-1">
            {label}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`${BTN} text-white !py-2 !px-3.5 !text-[13px]`}
          style={{ background: active ? C.pop : C.indigo }}
        >
          {active ? (
            <>
              <Pause className="w-3.5 h-3.5" /> Pause
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" /> Start
            </>
          )}
        </button>
      </div>
      {active && (
        <div className="mt-4 h-2 rounded-full border-[1.5px] border-[#0F172A] bg-white overflow-hidden">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${progress * 100}%`,
              background: mode === "work" ? C.indigo : C.cyan,
            }}
          />
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
 * Boss Raid teaser
 * ─────────────────────────────────────────────────────────────────────── */
const BossRaidTeaserCard = ({
  raid,
  isLoading,
  onOpen,
}: {
  raid: BossRaidTeaser | null;
  isLoading: boolean;
  onOpen: () => void;
}) => {
  if (isLoading) {
    return (
      <div className={`${CARD} p-5 h-[120px] flex items-center justify-center`}>
        <div className="w-6 h-6 rounded-full border-[2.5px] border-[#0F172A]/20 border-t-[#0F172A] animate-spin" />
      </div>
    );
  }

  if (!raid) {
    return (
      <div
        className={`${CARD} p-5 flex items-center gap-4`}
        style={{ background: "#F8FAFC" }}
      >
        <div
          className="shrink-0 w-14 h-14 rounded-[16px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] flex items-center justify-center"
          style={{ background: "#94A3B8" }}
        >
          <Skull className="w-7 h-7 text-white" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`${DISPLAY} font-extrabold text-[16px] leading-none`}>
            No active raid right now
          </p>
          <p className="text-[12.5px] font-semibold text-[#0F172A]/60 mt-1">
            Check back soon — or spawn one from the Quiz Arena.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className={`${BTN} bg-white text-[#0F172A] !py-1.5 !px-3 !text-[12px]`}
        >
          Open <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${BIG_CARD} group block text-left p-5 sm:p-6 text-white transition-all duration-200 hover:-translate-y-1 hover:shadow-[8px_10px_0_0_#0F172A] w-full relative overflow-hidden`}
      style={{
        background: "linear-gradient(135deg, #9333EA 0%, #6B21A8 100%)",
      }}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
      <Sparkles className="home-sparkle absolute right-6 top-5 w-4 h-4 text-white/70" />
      <div className="relative flex items-center gap-4">
        <div className="shrink-0 w-14 h-14 rounded-[16px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] flex items-center justify-center bg-white/15 backdrop-blur">
          <Swords className="w-7 h-7 text-white" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`${SECTION_LABEL} text-white/80`}>Boss Raid · Live</p>
          <p className={`${DISPLAY} font-extrabold text-[20px] leading-tight truncate mt-0.5`}>
            {raid.title ?? "Boss Raid open"}
          </p>
          <p className="text-[12.5px] font-semibold text-white/80 mt-1">
            {raid.pot != null
              ? `Pot · ${raid.pot} ACE Coins`
              : "Join the arena and battle for the pot."}
          </p>
        </div>
        <div className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white text-[#0F172A] font-extrabold font-['Baloo_2'] text-[13px] px-3.5 py-2 border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] group-hover:-translate-y-0.5 transition-transform">
          Enter <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </button>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
 * Daily nudge — rotating study tip.
 * ─────────────────────────────────────────────────────────────────────── */
const TipCard = ({ tip }: { tip: string }) => (
  <div
    className={`${CARD} p-4 flex items-center gap-3 relative overflow-hidden`}
    style={{ background: C.lilac }}
  >
    <div
      className="home-wiggle shrink-0 w-11 h-11 rounded-[12px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] bg-white flex items-center justify-center"
      style={{ animationDuration: "3.4s" }}
    >
      <Lightbulb className="w-5 h-5 text-amber-500" fill={C.sun} />
    </div>
    <div className="flex-1 min-w-0">
      <p className={SECTION_LABEL}>Daily nudge</p>
      <p className="text-[14px] font-semibold text-[#0F172A]/85 mt-1 leading-snug">
        {tip}
      </p>
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────
 * Secondary quick-links
 * ─────────────────────────────────────────────────────────────────────── */
const QuickLinks = () => {
  const links: {
    href: string;
    label: string;
    icon: typeof Compass;
    bg: string;
  }[] = [
    { href: "/materials", label: "Materials", icon: BookOpen, bg: C.skySoft },
    { href: "/feed",      label: "Feed",      icon: Compass,   bg: C.peach },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {links.map(({ href, label, icon: Icon, bg }) => (
        <Link
          key={href}
          to={href}
          className={`${CARD} group flex items-center gap-3 p-4 hover:-translate-y-0.5 hover:shadow-[4px_5px_0_0_#0F172A] transition-all`}
          style={{ background: bg }}
        >
          <div className="w-10 h-10 rounded-[12px] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center bg-white group-hover:rotate-[-6deg] transition-transform">
            <Icon className="w-5 h-5 text-[#0F172A]" strokeWidth={2.25} />
          </div>
          <span className={`${DISPLAY} font-extrabold text-[15px]`}>{label}</span>
        </Link>
      ))}
    </div>
  );
};

export default Home;
