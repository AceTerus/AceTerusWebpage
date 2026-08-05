-- Schedule nightly analytics rollups via pg_cron.
--
-- MYT is UTC+8, so 01:00 MYT = 17:00 UTC (previous day).
-- Cron expression uses UTC in Supabase.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Nightly rollup at 01:00 MYT (17:00 UTC).
-- Uses cron.schedule which is idempotent by jobname — re-running this migration
-- (or a future one that re-declares) replaces the schedule cleanly.
DO $$
BEGIN
  -- Remove any prior job with the same name so we don't stack duplicates.
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'analytics_refresh_yesterday';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'analytics_refresh_yesterday',
  '0 17 * * *',
  $$SELECT public.refresh_analytics_yesterday();$$
);

-- 3-year retention on rollup tables. Runs weekly (Sundays 18:00 UTC = 02:00 MYT Mon).
DO $$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'analytics_retention_prune';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'analytics_retention_prune',
  '0 18 * * 0',
  $$
  DELETE FROM public.analytics_daily_active_users WHERE date < (CURRENT_DATE - INTERVAL '3 years');
  DELETE FROM public.analytics_daily_signups      WHERE date < (CURRENT_DATE - INTERVAL '3 years');
  DELETE FROM public.analytics_daily_engagement   WHERE date < (CURRENT_DATE - INTERVAL '3 years');
  DELETE FROM public.analytics_daily_economy      WHERE date < (CURRENT_DATE - INTERVAL '3 years');
  DELETE FROM public.analytics_daily_events       WHERE date < (CURRENT_DATE - INTERVAL '3 years');
  $$
);
