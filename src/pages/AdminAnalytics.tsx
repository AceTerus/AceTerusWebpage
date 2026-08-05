import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from "recharts";
import {
  Users, UserPlus, Sparkles, Coins, CalendarDays, Loader2, AlertTriangle, RefreshCw,
} from "lucide-react";
import {
  fetchAllRollups, fmtDate,
  type DailyActiveUsers, type DailySignups, type DailyEngagement,
  type DailyEconomy, type DailyEvents,
} from "@/lib/analytics-client";

const C = {
  cyan: "#3BD6F5", blue: "#2F7CFF", indigo: "#2E2BE5", ink: "#0F172A",
  peach: "#FF7A59", sun: "#FFD65C", mint: "#22C55E", grey: "#94A3B8",
};

const CARD    = "border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A] bg-white";
const DISPLAY = "font-['Baloo_2'] tracking-tight";

type RangePreset = "7d" | "30d" | "90d";

const PRESETS: { key: RangePreset; label: string; days: number }[] = [
  { key: "7d",  label: "Last 7 days",  days: 7 },
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "90d", label: "Last 90 days", days: 90 },
];

const fmtLabel = (isoDate: string) => {
  const d = new Date(`${isoDate}T00:00:00`);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

const nice = (n: number) => n.toLocaleString();

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

type Rollups = {
  activeUsers: DailyActiveUsers[];
  signups: DailySignups[];
  engagement: DailyEngagement[];
  economy: DailyEconomy[];
  events: DailyEvents[];
};

export default function AdminAnalytics() {
  const [range, setRange] = useState<RangePreset>("30d");
  const [data, setData]   = useState<Rollups | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { fromDate, toDate } = useMemo(() => {
    const days = PRESETS.find(p => p.key === range)!.days;
    const to = new Date();
    to.setDate(to.getDate() - 1); // yesterday — rollups don't cover today yet
    const from = new Date(to);
    from.setDate(from.getDate() - (days - 1));
    return { fromDate: fmtDate(from), toDate: fmtDate(to) };
  }, [range]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const rollups = await fetchAllRollups(fromDate, toDate);
      setData(rollups);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // load closes over fromDate/toDate via useMemo — re-running when those change
  // is exactly the intended behaviour, so silence the exhaustive-deps warning.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [fromDate, toDate]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className={`${DISPLAY} font-extrabold text-[32px] text-[#0F172A]`}>Analytics</h1>
          <p className="font-['Nunito'] text-[14px] text-[#0F172A]/60">
            Real numbers from Supabase — rolled up nightly at 01:00 MYT.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RangePicker value={range} onChange={setRange} />
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-[2.5px] border-[#0F172A] bg-white text-[13px] font-bold font-['Nunito'] text-[#0F172A] shadow-[2px_2px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#0F172A] transition-all disabled:opacity-60"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Date range note */}
      <p className="font-['Nunito'] text-[12px] text-[#0F172A]/40">
        Showing <span className="font-bold text-[#0F172A]/70">{fromDate}</span> → <span className="font-bold text-[#0F172A]/70">{toDate}</span> (MYT)
      </p>

      {error && <ErrorPanel message={error} onRetry={load} />}
      {loading && !data && <LoadingPanel />}
      {data && (
        <>
          <OverviewSection data={data} />
          <AcquisitionSection signups={data.signups} />
          <EngagementSection engagement={data.engagement} activeUsers={data.activeUsers} />
          <LearningSection engagement={data.engagement} />
          <CommercialSection economy={data.economy} events={data.events} />
        </>
      )}
      {data && data.activeUsers.length === 0 && data.signups.length === 0 && !loading && !error && (
        <EmptyPanel />
      )}
    </div>
  );
}

// ── Range picker ────────────────────────────────────────────────────────────

function RangePicker({ value, onChange }: { value: RangePreset; onChange: (v: RangePreset) => void }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl border-[2.5px] border-[#0F172A] bg-white shadow-[2px_2px_0_0_#0F172A]">
      <CalendarDays className="w-4 h-4 text-[#0F172A]/50 ml-2" />
      {PRESETS.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-bold font-['Nunito'] transition-all ${
            value === p.key
              ? "bg-[#2E2BE5] text-white"
              : "text-[#0F172A]/60 hover:bg-[#0F172A]/5"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ── State panels ────────────────────────────────────────────────────────────

function LoadingPanel() {
  return (
    <div className={`${CARD} p-16 flex flex-col items-center justify-center gap-3`}>
      <Loader2 className="w-8 h-8 animate-spin text-[#2E2BE5]" />
      <p className="font-['Nunito'] text-[13px] text-[#0F172A]/50">Loading rollups…</p>
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className={`${CARD} p-8 flex items-start gap-4 border-red-300`}>
      <div className="w-10 h-10 rounded-xl bg-red-50 border-[2px] border-red-200 flex items-center justify-center shrink-0">
        <AlertTriangle className="w-5 h-5 text-red-500" />
      </div>
      <div className="flex-1 space-y-2">
        <h3 className={`${DISPLAY} font-extrabold text-[16px] text-[#0F172A]`}>Couldn't load analytics</h3>
        <p className="font-['Nunito'] text-[13px] text-[#0F172A]/60 break-words">{message}</p>
        <button
          onClick={onRetry}
          className="mt-1 px-3 py-1.5 rounded-lg border-[2px] border-[#0F172A] text-[12px] font-bold font-['Nunito'] shadow-[2px_2px_0_0_#0F172A] hover:-translate-y-0.5 transition-all"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

function EmptyPanel() {
  return (
    <div className={`${CARD} p-12 text-center space-y-3`}>
      <div className="text-5xl">📭</div>
      <h3 className={`${DISPLAY} font-extrabold text-[18px] text-[#0F172A]`}>No rollups yet</h3>
      <p className="font-['Nunito'] text-[13px] text-[#0F172A]/60 max-w-md mx-auto">
        The nightly job runs at 01:00 MYT. If you just deployed, run <code className="px-1.5 py-0.5 rounded bg-[#0F172A]/5 text-[#0F172A]/80 text-[12px]">SELECT refresh_analytics_backfill('2025-01-01', current_date - 1);</code> to populate historical data.
      </p>
    </div>
  );
}

// ── Overview ────────────────────────────────────────────────────────────────

function OverviewSection({ data }: { data: Rollups }) {
  const latestActive = data.activeUsers[data.activeUsers.length - 1];
  const totalSignups = sum(data.signups.map(s => s.signups));
  const totalActivated = sum(data.signups.map(s => s.activated_within_7d));
  const activationRate = totalSignups > 0 ? Math.round((totalActivated / totalSignups) * 100) : null;
  const totalQuizzes = sum(data.engagement.map(e => e.quizzes_completed));
  const netCoins = sum(data.economy.map(e => e.coins_earned)) - sum(data.economy.map(e => e.coins_spent));

  const kpis = [
    { label: "DAU (latest)",  value: latestActive ? nice(latestActive.dau) : "—", sub: latestActive?.date ?? "—", color: C.indigo, icon: Users },
    { label: "WAU (latest)",  value: latestActive ? nice(latestActive.wau) : "—", sub: "7-day rolling",            color: C.blue,   icon: Users },
    { label: "MAU (latest)",  value: latestActive ? nice(latestActive.mau) : "—", sub: "30-day rolling",           color: C.cyan,   icon: Users },
    { label: "Signups",       value: nice(totalSignups),                          sub: "in range",                 color: C.mint,   icon: UserPlus },
    { label: "Activation",    value: activationRate !== null ? `${activationRate}%` : "—", sub: `${nice(totalActivated)}/${nice(totalSignups)} within 7d`, color: C.peach, icon: Sparkles },
    { label: "Quizzes done",  value: nice(totalQuizzes),                          sub: "in range",                 color: C.sun,    icon: Sparkles },
    { label: "Net coins",     value: nice(netCoins),                              sub: "earned − spent",           color: netCoins >= 0 ? C.mint : C.peach, icon: Coins },
  ];

  return (
    <section className="space-y-3">
      <h2 className={`${DISPLAY} font-extrabold text-[20px] text-[#0F172A] flex items-center gap-2`}>
        <span className="text-xl">📊</span> Overview
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className={`${CARD} p-4 space-y-1`}>
              <div className="flex items-center justify-between">
                <Icon className="w-4 h-4" style={{ color: k.color }} />
              </div>
              <p className="font-['Nunito'] text-[11px] text-[#0F172A]/50 font-semibold uppercase tracking-wide">{k.label}</p>
              <p className={`${DISPLAY} font-extrabold text-[22px] leading-none`} style={{ color: k.color }}>{k.value}</p>
              <p className="font-['Nunito'] text-[10px] text-[#0F172A]/40 font-medium truncate">{k.sub}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Acquisition ─────────────────────────────────────────────────────────────

function AcquisitionSection({ signups }: { signups: DailySignups[] }) {
  const chartData = signups.map((s) => ({
    date: fmtLabel(s.date),
    Signups: s.signups,
    Onboarded: s.onboarded,
    "Activated (7d)": s.activated_within_7d,
  }));

  return (
    <section className="space-y-3">
      <h2 className={`${DISPLAY} font-extrabold text-[20px] text-[#0F172A] flex items-center gap-2`}>
        <span className="text-xl">🌱</span> Acquisition
      </h2>
      <div className={`${CARD} p-5 space-y-3`}>
        <h3 className={`${DISPLAY} font-extrabold text-[15px] text-[#0F172A]`}>Signups & activation over time</h3>
        {chartData.length === 0 ? (
          <p className="font-['Nunito'] text-[13px] text-[#0F172A]/50 py-8 text-center">No signup data in this range.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#0F172A11" vertical={false} />
                <XAxis dataKey="date" stroke="#94A3B8" tick={{ fontSize: 11, fontFamily: "Nunito" }} />
                <YAxis stroke="#94A3B8" tick={{ fontSize: 11, fontFamily: "Nunito" }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "2px solid #0F172A", fontFamily: "Nunito" }} />
                <Legend wrapperStyle={{ fontFamily: "Nunito", fontSize: 12 }} />
                <Line type="monotone" dataKey="Signups"          stroke={C.indigo} strokeWidth={2.5} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="Onboarded"        stroke={C.blue}   strokeWidth={2}   dot={{ r: 2 }} />
                <Line type="monotone" dataKey="Activated (7d)"   stroke={C.mint}   strokeWidth={2}   dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="font-['Nunito'] text-[11px] text-[#0F172A]/40">
          Activated = signup + username set + ≥1 meaningful action within 7 days.
          Days within the last week may still climb as new users activate.
        </p>
      </div>
    </section>
  );
}

// ── Engagement ──────────────────────────────────────────────────────────────

function EngagementSection({ engagement, activeUsers }: { engagement: DailyEngagement[]; activeUsers: DailyActiveUsers[] }) {
  const activeChart = activeUsers.map((a) => ({
    date: fmtLabel(a.date),
    DAU: a.dau,
    WAU: a.wau,
    MAU: a.mau,
  }));

  const socialChart = engagement.map((e) => ({
    date: fmtLabel(e.date),
    Posts: e.posts,
    Comments: e.comments,
    Likes: e.likes,
    Follows: e.follows,
  }));

  const chatChart = engagement.map((e) => ({
    date: fmtLabel(e.date),
    "DM messages": e.dm_messages,
    "Mascot messages": e.mascot_messages,
  }));

  return (
    <section className="space-y-3">
      <h2 className={`${DISPLAY} font-extrabold text-[20px] text-[#0F172A] flex items-center gap-2`}>
        <span className="text-xl">🔥</span> Engagement
      </h2>

      {/* Active users */}
      <div className={`${CARD} p-5 space-y-3`}>
        <h3 className={`${DISPLAY} font-extrabold text-[15px] text-[#0F172A]`}>Active users (DAU / WAU / MAU)</h3>
        {activeChart.length === 0 ? (
          <p className="font-['Nunito'] text-[13px] text-[#0F172A]/50 py-8 text-center">No active-user data in this range.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activeChart} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#0F172A11" vertical={false} />
                <XAxis dataKey="date" stroke="#94A3B8" tick={{ fontSize: 11, fontFamily: "Nunito" }} />
                <YAxis stroke="#94A3B8" tick={{ fontSize: 11, fontFamily: "Nunito" }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "2px solid #0F172A", fontFamily: "Nunito" }} />
                <Legend wrapperStyle={{ fontFamily: "Nunito", fontSize: 12 }} />
                <Line type="monotone" dataKey="DAU" stroke={C.indigo} strokeWidth={2.5} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="WAU" stroke={C.blue}   strokeWidth={2}   dot={{ r: 2 }} />
                <Line type="monotone" dataKey="MAU" stroke={C.cyan}   strokeWidth={2}   dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Social + chat side by side on wide screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`${CARD} p-5 space-y-3`}>
          <h3 className={`${DISPLAY} font-extrabold text-[15px] text-[#0F172A]`}>Social feed</h3>
          {socialChart.length === 0 ? (
            <p className="font-['Nunito'] text-[13px] text-[#0F172A]/50 py-8 text-center">No social activity in this range.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={socialChart} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#0F172A11" vertical={false} />
                  <XAxis dataKey="date" stroke="#94A3B8" tick={{ fontSize: 11, fontFamily: "Nunito" }} />
                  <YAxis stroke="#94A3B8" tick={{ fontSize: 11, fontFamily: "Nunito" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "2px solid #0F172A", fontFamily: "Nunito" }} />
                  <Legend wrapperStyle={{ fontFamily: "Nunito", fontSize: 11 }} />
                  <Bar dataKey="Posts"    stackId="a" fill={C.indigo} />
                  <Bar dataKey="Comments" stackId="a" fill={C.blue} />
                  <Bar dataKey="Likes"    stackId="a" fill={C.cyan} />
                  <Bar dataKey="Follows"  stackId="a" fill={C.peach} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className={`${CARD} p-5 space-y-3`}>
          <h3 className={`${DISPLAY} font-extrabold text-[15px] text-[#0F172A]`}>Chat volume</h3>
          {chatChart.length === 0 ? (
            <p className="font-['Nunito'] text-[13px] text-[#0F172A]/50 py-8 text-center">No chat activity in this range.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chatChart} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#0F172A11" vertical={false} />
                  <XAxis dataKey="date" stroke="#94A3B8" tick={{ fontSize: 11, fontFamily: "Nunito" }} />
                  <YAxis stroke="#94A3B8" tick={{ fontSize: 11, fontFamily: "Nunito" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "2px solid #0F172A", fontFamily: "Nunito" }} />
                  <Legend wrapperStyle={{ fontFamily: "Nunito", fontSize: 11 }} />
                  <Line type="monotone" dataKey="DM messages"     stroke={C.blue}  strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="Mascot messages" stroke={C.peach} strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="font-['Nunito'] text-[10px] text-[#0F172A]/40">Mascot logging started on deploy — earlier days will show 0.</p>
        </div>
      </div>
    </section>
  );
}

// ── Learning ────────────────────────────────────────────────────────────────

function LearningSection({ engagement }: { engagement: DailyEngagement[] }) {
  const chartData = engagement.map((e) => ({
    date: fmtLabel(e.date),
    Completed: e.quizzes_completed,
    Created: e.decks_created,
    Published: e.decks_published,
    OMR: e.omr_scans,
  }));

  return (
    <section className="space-y-3">
      <h2 className={`${DISPLAY} font-extrabold text-[20px] text-[#0F172A] flex items-center gap-2`}>
        <span className="text-xl">📚</span> Learning
      </h2>
      <div className={`${CARD} p-5 space-y-3`}>
        <h3 className={`${DISPLAY} font-extrabold text-[15px] text-[#0F172A]`}>Quizzes & OMR</h3>
        {chartData.length === 0 ? (
          <p className="font-['Nunito'] text-[13px] text-[#0F172A]/50 py-8 text-center">No learning activity in this range.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#0F172A11" vertical={false} />
                <XAxis dataKey="date" stroke="#94A3B8" tick={{ fontSize: 11, fontFamily: "Nunito" }} />
                <YAxis stroke="#94A3B8" tick={{ fontSize: 11, fontFamily: "Nunito" }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "2px solid #0F172A", fontFamily: "Nunito" }} />
                <Legend wrapperStyle={{ fontFamily: "Nunito", fontSize: 12 }} />
                <Bar dataKey="Completed" fill={C.indigo} />
                <Bar dataKey="Created"   fill={C.blue} />
                <Bar dataKey="Published" fill={C.cyan} />
                <Bar dataKey="OMR"       fill={C.peach} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Commercial ──────────────────────────────────────────────────────────────

function CommercialSection({ economy, events }: { economy: DailyEconomy[]; events: DailyEvents[] }) {
  const economyChart = economy.map((e) => ({
    date: fmtLabel(e.date),
    Earned: e.coins_earned,
    Spent: e.coins_spent,
  }));

  const eventsChart = events.map((e) => ({
    date: fmtLabel(e.date),
    Registrations: e.event_registrations,
    Redemptions: e.code_redemptions,
  }));

  return (
    <section className="space-y-3">
      <h2 className={`${DISPLAY} font-extrabold text-[20px] text-[#0F172A] flex items-center gap-2`}>
        <span className="text-xl">💰</span> Commercial
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`${CARD} p-5 space-y-3`}>
          <h3 className={`${DISPLAY} font-extrabold text-[15px] text-[#0F172A]`}>ACE Coin economy</h3>
          {economyChart.length === 0 ? (
            <p className="font-['Nunito'] text-[13px] text-[#0F172A]/50 py-8 text-center">No coin transactions in this range.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={economyChart} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#0F172A11" vertical={false} />
                  <XAxis dataKey="date" stroke="#94A3B8" tick={{ fontSize: 11, fontFamily: "Nunito" }} />
                  <YAxis stroke="#94A3B8" tick={{ fontSize: 11, fontFamily: "Nunito" }} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "2px solid #0F172A", fontFamily: "Nunito" }} />
                  <Legend wrapperStyle={{ fontFamily: "Nunito", fontSize: 11 }} />
                  <Bar dataKey="Earned" fill={C.mint} />
                  <Bar dataKey="Spent"  fill={C.peach} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className={`${CARD} p-5 space-y-3`}>
          <h3 className={`${DISPLAY} font-extrabold text-[15px] text-[#0F172A]`}>Events</h3>
          {eventsChart.length === 0 ? (
            <p className="font-['Nunito'] text-[13px] text-[#0F172A]/50 py-8 text-center">No event activity in this range.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eventsChart} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#0F172A11" vertical={false} />
                  <XAxis dataKey="date" stroke="#94A3B8" tick={{ fontSize: 11, fontFamily: "Nunito" }} />
                  <YAxis stroke="#94A3B8" tick={{ fontSize: 11, fontFamily: "Nunito" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "2px solid #0F172A", fontFamily: "Nunito" }} />
                  <Legend wrapperStyle={{ fontFamily: "Nunito", fontSize: 11 }} />
                  <Bar dataKey="Registrations" fill={C.indigo} />
                  <Bar dataKey="Redemptions"   fill={C.sun} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
