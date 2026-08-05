-- Nightly rollup tables for the admin analytics dashboard.
-- All tables are keyed on `date DATE PRIMARY KEY` (one row per day, Asia/Kuala_Lumpur).
-- Populated by refresh_analytics_for_date() (see 20260806000004_analytics_functions.sql)
-- and scheduled nightly via pg_cron (see 20260806000005_analytics_pg_cron.sql).

-- ── Active users ─────────────────────────────────────────────────────────────
-- DAU  = distinct user_ids with >=1 tracked action on that date
-- WAU  = distinct user_ids with >=1 tracked action in the 7 days ending on that date
-- MAU  = distinct user_ids with >=1 tracked action in the 30 days ending on that date
CREATE TABLE IF NOT EXISTS public.analytics_daily_active_users (
  date        DATE PRIMARY KEY,
  dau         INTEGER NOT NULL DEFAULT 0,
  wau         INTEGER NOT NULL DEFAULT 0,
  mau         INTEGER NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Signups + activation ────────────────────────────────────────────────────
-- signups            = profiles created that day
-- onboarded          = profiles created that day where username is now set
-- activated_within_7d = profiles created that day where activated_at IS NOT NULL
--                      (i.e., they hit the activation bar within 7 days of signup)
-- Note: activated_within_7d for a given date will keep changing until 7 days after
-- that date, then stabilise. The nightly job re-computes the last 8 days on each run.
CREATE TABLE IF NOT EXISTS public.analytics_daily_signups (
  date                DATE PRIMARY KEY,
  signups             INTEGER NOT NULL DEFAULT 0,
  onboarded           INTEGER NOT NULL DEFAULT 0,
  activated_within_7d INTEGER NOT NULL DEFAULT 0,
  computed_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Engagement counts per day ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.analytics_daily_engagement (
  date               DATE PRIMARY KEY,
  quizzes_completed  INTEGER NOT NULL DEFAULT 0,
  decks_created      INTEGER NOT NULL DEFAULT 0,
  decks_published    INTEGER NOT NULL DEFAULT 0,
  omr_scans          INTEGER NOT NULL DEFAULT 0,
  posts              INTEGER NOT NULL DEFAULT 0,
  comments           INTEGER NOT NULL DEFAULT 0,
  likes              INTEGER NOT NULL DEFAULT 0,
  follows            INTEGER NOT NULL DEFAULT 0,
  dm_messages        INTEGER NOT NULL DEFAULT 0,
  mascot_messages    INTEGER NOT NULL DEFAULT 0,
  computed_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── ACE Coin economy ────────────────────────────────────────────────────────
-- coins_earned/spent split by sign of coin_transactions.amount.
-- unique_earners/spenders = distinct users with a positive/negative txn that day.
CREATE TABLE IF NOT EXISTS public.analytics_daily_economy (
  date            DATE PRIMARY KEY,
  coins_earned    BIGINT  NOT NULL DEFAULT 0,
  coins_spent     BIGINT  NOT NULL DEFAULT 0,
  unique_earners  INTEGER NOT NULL DEFAULT 0,
  unique_spenders INTEGER NOT NULL DEFAULT 0,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Events platform ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.analytics_daily_events (
  date                DATE PRIMARY KEY,
  event_registrations INTEGER NOT NULL DEFAULT 0,
  code_redemptions    INTEGER NOT NULL DEFAULT 0,
  computed_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- All rollups are additionally indexed by (date DESC) via the PK — no extra indexes needed.
