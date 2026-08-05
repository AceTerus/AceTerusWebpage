-- Rollup computation functions for the analytics dashboard.
-- All functions are SECURITY DEFINER so the pg_cron job (running as postgres) can
-- populate rollups regardless of RLS on the source tables.
--
-- Timezone note: we compute "yesterday" in Asia/Kuala_Lumpur, since AceTerus is
-- a Malaysian product. All `date` columns in analytics_daily_* tables are MYT dates.

-- Helper: cast timestamptz → MYT date
CREATE OR REPLACE FUNCTION public.analytics_myt_date(ts TIMESTAMPTZ)
RETURNS DATE LANGUAGE sql IMMUTABLE AS $$
  SELECT (ts AT TIME ZONE 'Asia/Kuala_Lumpur')::date;
$$;

-- ── Refresh one day's rollups (idempotent upsert) ───────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_analytics_for_date(target_date DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d_start TIMESTAMPTZ;  -- inclusive
  d_end   TIMESTAMPTZ;  -- exclusive
BEGIN
  d_start := (target_date::text || ' 00:00:00 Asia/Kuala_Lumpur')::timestamptz;
  d_end   := ((target_date + 1)::text || ' 00:00:00 Asia/Kuala_Lumpur')::timestamptz;

  -- ── analytics_daily_active_users ────────────────────────────────────────
  WITH
    dau AS (
      SELECT COUNT(DISTINCT user_id) AS n FROM (
        SELECT user_id FROM public.quiz_performance_results WHERE completed_at >= d_start AND completed_at < d_end
        UNION ALL
        SELECT user_id FROM public.omr_scan_results          WHERE created_at   >= d_start AND created_at   < d_end
        UNION ALL
        SELECT user_id FROM public.posts                     WHERE created_at   >= d_start AND created_at   < d_end
        UNION ALL
        SELECT user_id FROM public.comments                  WHERE created_at   >= d_start AND created_at   < d_end
        UNION ALL
        SELECT user_id FROM public.likes                     WHERE created_at   >= d_start AND created_at   < d_end
        UNION ALL
        SELECT follower_id AS user_id FROM public.follows    WHERE created_at   >= d_start AND created_at   < d_end
        UNION ALL
        SELECT sender_id   AS user_id FROM public.chat_messages WHERE created_at >= d_start AND created_at < d_end
        UNION ALL
        SELECT user_id FROM public.mascot_messages           WHERE created_at   >= d_start AND created_at   < d_end
      ) u
    ),
    wau AS (
      SELECT COUNT(DISTINCT user_id) AS n FROM (
        SELECT user_id FROM public.quiz_performance_results WHERE completed_at >= d_end - INTERVAL '7 days' AND completed_at < d_end
        UNION ALL
        SELECT user_id FROM public.omr_scan_results          WHERE created_at   >= d_end - INTERVAL '7 days' AND created_at   < d_end
        UNION ALL
        SELECT user_id FROM public.posts                     WHERE created_at   >= d_end - INTERVAL '7 days' AND created_at   < d_end
        UNION ALL
        SELECT user_id FROM public.comments                  WHERE created_at   >= d_end - INTERVAL '7 days' AND created_at   < d_end
        UNION ALL
        SELECT user_id FROM public.likes                     WHERE created_at   >= d_end - INTERVAL '7 days' AND created_at   < d_end
        UNION ALL
        SELECT follower_id FROM public.follows               WHERE created_at   >= d_end - INTERVAL '7 days' AND created_at   < d_end
        UNION ALL
        SELECT sender_id   FROM public.chat_messages         WHERE created_at   >= d_end - INTERVAL '7 days' AND created_at   < d_end
        UNION ALL
        SELECT user_id FROM public.mascot_messages           WHERE created_at   >= d_end - INTERVAL '7 days' AND created_at   < d_end
      ) u
    ),
    mau AS (
      SELECT COUNT(DISTINCT user_id) AS n FROM (
        SELECT user_id FROM public.quiz_performance_results WHERE completed_at >= d_end - INTERVAL '30 days' AND completed_at < d_end
        UNION ALL
        SELECT user_id FROM public.omr_scan_results          WHERE created_at   >= d_end - INTERVAL '30 days' AND created_at   < d_end
        UNION ALL
        SELECT user_id FROM public.posts                     WHERE created_at   >= d_end - INTERVAL '30 days' AND created_at   < d_end
        UNION ALL
        SELECT user_id FROM public.comments                  WHERE created_at   >= d_end - INTERVAL '30 days' AND created_at   < d_end
        UNION ALL
        SELECT user_id FROM public.likes                     WHERE created_at   >= d_end - INTERVAL '30 days' AND created_at   < d_end
        UNION ALL
        SELECT follower_id FROM public.follows               WHERE created_at   >= d_end - INTERVAL '30 days' AND created_at   < d_end
        UNION ALL
        SELECT sender_id   FROM public.chat_messages         WHERE created_at   >= d_end - INTERVAL '30 days' AND created_at   < d_end
        UNION ALL
        SELECT user_id FROM public.mascot_messages           WHERE created_at   >= d_end - INTERVAL '30 days' AND created_at   < d_end
      ) u
    )
  INSERT INTO public.analytics_daily_active_users (date, dau, wau, mau, computed_at)
  SELECT target_date, dau.n, wau.n, mau.n, now() FROM dau, wau, mau
  ON CONFLICT (date) DO UPDATE
    SET dau = EXCLUDED.dau,
        wau = EXCLUDED.wau,
        mau = EXCLUDED.mau,
        computed_at = EXCLUDED.computed_at;

  -- ── analytics_daily_signups ─────────────────────────────────────────────
  INSERT INTO public.analytics_daily_signups (date, signups, onboarded, activated_within_7d, computed_at)
  SELECT
    target_date,
    COUNT(*)                                                                                    AS signups,
    COUNT(*) FILTER (WHERE username IS NOT NULL)                                                AS onboarded,
    COUNT(*) FILTER (WHERE activated_at IS NOT NULL)                                            AS activated_within_7d,
    now()
  FROM public.profiles
  WHERE created_at >= d_start AND created_at < d_end
  ON CONFLICT (date) DO UPDATE
    SET signups             = EXCLUDED.signups,
        onboarded           = EXCLUDED.onboarded,
        activated_within_7d = EXCLUDED.activated_within_7d,
        computed_at         = EXCLUDED.computed_at;

  -- ── analytics_daily_engagement ──────────────────────────────────────────
  INSERT INTO public.analytics_daily_engagement (
    date, quizzes_completed, decks_created, decks_published,
    omr_scans, posts, comments, likes, follows, dm_messages, mascot_messages, computed_at
  )
  SELECT
    target_date,
    (SELECT COUNT(*) FROM public.quiz_performance_results WHERE completed_at >= d_start AND completed_at < d_end),
    (SELECT COUNT(*) FROM public.decks                    WHERE created_at   >= d_start AND created_at   < d_end),
    (SELECT COUNT(*) FROM public.decks                    WHERE created_at   >= d_start AND created_at   < d_end AND is_published = true),
    (SELECT COUNT(*) FROM public.omr_scan_results         WHERE created_at   >= d_start AND created_at   < d_end),
    (SELECT COUNT(*) FROM public.posts                    WHERE created_at   >= d_start AND created_at   < d_end),
    (SELECT COUNT(*) FROM public.comments                 WHERE created_at   >= d_start AND created_at   < d_end),
    (SELECT COUNT(*) FROM public.likes                    WHERE created_at   >= d_start AND created_at   < d_end),
    (SELECT COUNT(*) FROM public.follows                  WHERE created_at   >= d_start AND created_at   < d_end),
    (SELECT COUNT(*) FROM public.chat_messages            WHERE created_at   >= d_start AND created_at   < d_end),
    (SELECT COUNT(*) FROM public.mascot_messages          WHERE created_at   >= d_start AND created_at   < d_end),
    now()
  ON CONFLICT (date) DO UPDATE
    SET quizzes_completed = EXCLUDED.quizzes_completed,
        decks_created     = EXCLUDED.decks_created,
        decks_published   = EXCLUDED.decks_published,
        omr_scans         = EXCLUDED.omr_scans,
        posts             = EXCLUDED.posts,
        comments          = EXCLUDED.comments,
        likes             = EXCLUDED.likes,
        follows           = EXCLUDED.follows,
        dm_messages       = EXCLUDED.dm_messages,
        mascot_messages   = EXCLUDED.mascot_messages,
        computed_at       = EXCLUDED.computed_at;

  -- ── analytics_daily_economy ─────────────────────────────────────────────
  INSERT INTO public.analytics_daily_economy (
    date, coins_earned, coins_spent, unique_earners, unique_spenders, computed_at
  )
  SELECT
    target_date,
    COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0)                        AS coins_earned,
    COALESCE(ABS(SUM(amount) FILTER (WHERE amount < 0)), 0)                   AS coins_spent,
    COUNT(DISTINCT user_id) FILTER (WHERE amount > 0)                         AS unique_earners,
    COUNT(DISTINCT user_id) FILTER (WHERE amount < 0)                         AS unique_spenders,
    now()
  FROM public.coin_transactions
  WHERE created_at >= d_start AND created_at < d_end
  ON CONFLICT (date) DO UPDATE
    SET coins_earned    = EXCLUDED.coins_earned,
        coins_spent     = EXCLUDED.coins_spent,
        unique_earners  = EXCLUDED.unique_earners,
        unique_spenders = EXCLUDED.unique_spenders,
        computed_at     = EXCLUDED.computed_at;

  -- ── analytics_daily_events ──────────────────────────────────────────────
  INSERT INTO public.analytics_daily_events (
    date, event_registrations, code_redemptions, computed_at
  )
  SELECT
    target_date,
    (SELECT COUNT(*) FROM public.event_registrations    WHERE registered_at >= d_start AND registered_at < d_end),
    (SELECT COUNT(*) FROM public.event_code_redemptions WHERE redeemed_at   >= d_start AND redeemed_at   < d_end),
    now()
  ON CONFLICT (date) DO UPDATE
    SET event_registrations = EXCLUDED.event_registrations,
        code_redemptions    = EXCLUDED.code_redemptions,
        computed_at         = EXCLUDED.computed_at;
END;
$$;

-- ── Mark activation for users past their 7-day window ───────────────────────
-- Populates profiles.activated_at for users whose 7-day activation window closed
-- yesterday. Idempotent: only touches rows where activated_at IS NULL and username IS NOT NULL.
CREATE OR REPLACE FUNCTION public.refresh_user_activation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH candidates AS (
    SELECT
      p.user_id,
      p.created_at AS signup_at,
      LEAST(
        (SELECT MIN(completed_at) FROM public.quiz_performance_results WHERE user_id = p.user_id AND completed_at <= p.created_at + INTERVAL '7 days'),
        (SELECT MIN(created_at)   FROM public.omr_scan_results          WHERE user_id = p.user_id AND created_at   <= p.created_at + INTERVAL '7 days'),
        (SELECT MIN(created_at)   FROM public.posts                     WHERE user_id = p.user_id AND created_at   <= p.created_at + INTERVAL '7 days'),
        (SELECT MIN(created_at)   FROM public.comments                  WHERE user_id = p.user_id AND created_at   <= p.created_at + INTERVAL '7 days'),
        (SELECT MIN(created_at)   FROM public.likes                     WHERE user_id = p.user_id AND created_at   <= p.created_at + INTERVAL '7 days'),
        (SELECT MIN(created_at)   FROM public.follows                   WHERE follower_id = p.user_id AND created_at <= p.created_at + INTERVAL '7 days'),
        (SELECT MIN(created_at)   FROM public.chat_messages             WHERE sender_id = p.user_id AND created_at <= p.created_at + INTERVAL '7 days'),
        (SELECT MIN(created_at)   FROM public.mascot_messages           WHERE user_id = p.user_id AND created_at   <= p.created_at + INTERVAL '7 days')
      ) AS first_action_at
    FROM public.profiles p
    WHERE p.username IS NOT NULL
      AND p.activated_at IS NULL
      AND p.created_at <= now() - INTERVAL '7 days'
  )
  UPDATE public.profiles p
  SET activated_at = c.first_action_at
  FROM candidates c
  WHERE p.user_id = c.user_id
    AND c.first_action_at IS NOT NULL;
END;
$$;

-- ── Convenience: refresh yesterday's rollups (in MYT) ───────────────────────
-- Also re-computes the previous 7 days so that activated_within_7d in
-- analytics_daily_signups can converge as users hit activation.
CREATE OR REPLACE FUNCTION public.refresh_analytics_yesterday()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  yesterday_myt DATE;
  d DATE;
BEGIN
  yesterday_myt := (now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date - 1;

  -- Mark activations first so today's signup rollup reflects any newly activated users
  PERFORM public.refresh_user_activation();

  -- Re-compute yesterday and the previous 7 days (activation window)
  FOR d IN SELECT generate_series(yesterday_myt - 7, yesterday_myt, INTERVAL '1 day')::date LOOP
    PERFORM public.refresh_analytics_for_date(d);
  END LOOP;
END;
$$;

-- ── Backfill helper (one-shot, run manually after deploy) ───────────────────
CREATE OR REPLACE FUNCTION public.refresh_analytics_backfill(start_date DATE, end_date DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d DATE;
BEGIN
  PERFORM public.refresh_user_activation();
  FOR d IN SELECT generate_series(start_date, end_date, INTERVAL '1 day')::date LOOP
    PERFORM public.refresh_analytics_for_date(d);
  END LOOP;
END;
$$;

-- Restrict execution: only postgres role (pg_cron) and admins should call these.
-- The RLS on rollup tables handles read protection; write access is only via these
-- SECURITY DEFINER functions, and only pg_cron calls them in normal operation.
REVOKE ALL ON FUNCTION public.refresh_analytics_for_date(DATE)          FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_analytics_yesterday()             FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_analytics_backfill(DATE, DATE)    FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_user_activation()                 FROM PUBLIC;
