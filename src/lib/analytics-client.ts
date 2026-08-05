import { supabase } from "@/integrations/supabase/client";

// Row shapes mirror migration 20260806000003_analytics_rollups.sql.
// `date` is returned as an ISO date string (YYYY-MM-DD).

export type DailyActiveUsers = {
  date: string;
  dau: number;
  wau: number;
  mau: number;
};

export type DailySignups = {
  date: string;
  signups: number;
  onboarded: number;
  activated_within_7d: number;
};

export type DailyEngagement = {
  date: string;
  quizzes_completed: number;
  decks_created: number;
  decks_published: number;
  omr_scans: number;
  posts: number;
  comments: number;
  likes: number;
  follows: number;
  dm_messages: number;
  mascot_messages: number;
};

export type DailyEconomy = {
  date: string;
  coins_earned: number;
  coins_spent: number;
  unique_earners: number;
  unique_spenders: number;
};

export type DailyEvents = {
  date: string;
  event_registrations: number;
  code_redemptions: number;
};

// Local yyyy-mm-dd formatter — avoids UTC drift from toISOString().
export const fmtDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// Generic rollup fetch — tables aren't in the generated Supabase types,
// so we cast through `any` (same pattern used elsewhere in the codebase).
const fetchRollup = async <T>(table: string, columns: string, from: string, to: string): Promise<T[]> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from(table)
    .select(columns)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true });
  if (error) throw new Error(error.message ?? String(error));
  return (data ?? []) as T[];
};

export const fetchDailyActiveUsers = (from: string, to: string) =>
  fetchRollup<DailyActiveUsers>("analytics_daily_active_users", "date,dau,wau,mau", from, to);

export const fetchDailySignups = (from: string, to: string) =>
  fetchRollup<DailySignups>("analytics_daily_signups", "date,signups,onboarded,activated_within_7d", from, to);

export const fetchDailyEngagement = (from: string, to: string) =>
  fetchRollup<DailyEngagement>(
    "analytics_daily_engagement",
    "date,quizzes_completed,decks_created,decks_published,omr_scans,posts,comments,likes,follows,dm_messages,mascot_messages",
    from,
    to,
  );

export const fetchDailyEconomy = (from: string, to: string) =>
  fetchRollup<DailyEconomy>(
    "analytics_daily_economy",
    "date,coins_earned,coins_spent,unique_earners,unique_spenders",
    from,
    to,
  );

export const fetchDailyEvents = (from: string, to: string) =>
  fetchRollup<DailyEvents>(
    "analytics_daily_events",
    "date,event_registrations,code_redemptions",
    from,
    to,
  );

export const fetchAllRollups = async (from: string, to: string) => {
  const [activeUsers, signups, engagement, economy, events] = await Promise.all([
    fetchDailyActiveUsers(from, to),
    fetchDailySignups(from, to),
    fetchDailyEngagement(from, to),
    fetchDailyEconomy(from, to),
    fetchDailyEvents(from, to),
  ]);
  return { activeUsers, signups, engagement, economy, events };
};
