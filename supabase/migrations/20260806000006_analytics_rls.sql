-- Row-level security for analytics rollup tables.
-- Only admins (profiles.is_admin = true) can read. Writes are performed exclusively
-- by SECURITY DEFINER functions, so no INSERT/UPDATE/DELETE policies are exposed.

ALTER TABLE public.analytics_daily_active_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily_signups      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily_engagement   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily_economy      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily_events       ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners (defence-in-depth against connection role changes).
ALTER TABLE public.analytics_daily_active_users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily_signups      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily_engagement   FORCE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily_economy      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily_events       FORCE ROW LEVEL SECURITY;

-- Reusable admin check helper (used by all five policies).
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

DO $$ BEGIN
  CREATE POLICY "analytics_active_users_admin_read"
    ON public.analytics_daily_active_users FOR SELECT USING (public.is_admin_user());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "analytics_signups_admin_read"
    ON public.analytics_daily_signups FOR SELECT USING (public.is_admin_user());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "analytics_engagement_admin_read"
    ON public.analytics_daily_engagement FOR SELECT USING (public.is_admin_user());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "analytics_economy_admin_read"
    ON public.analytics_daily_economy FOR SELECT USING (public.is_admin_user());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "analytics_events_admin_read"
    ON public.analytics_daily_events FOR SELECT USING (public.is_admin_user());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
