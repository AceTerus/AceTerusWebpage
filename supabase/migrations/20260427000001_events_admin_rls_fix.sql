-- Replace the events RLS policies with a SECURITY DEFINER function for the admin check.
-- The original inline subquery against profiles can fail if the caller's role doesn't have
-- unrestricted access to profiles at policy-evaluation time.  A SECURITY DEFINER function
-- runs as the function owner (postgres) and always bypasses RLS, making the check reliable.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1),
    false
  );
$$;

-- events SELECT: published visible to all; submitter sees own; admins see everything
DROP POLICY IF EXISTS "events_select" ON public.events;
CREATE POLICY "events_select" ON public.events FOR SELECT USING (
  status = 'published'
  OR submitter_user_id = auth.uid()
  OR public.is_admin()
);

-- events UPDATE: submitter or admin
DROP POLICY IF EXISTS "events_update" ON public.events;
CREATE POLICY "events_update" ON public.events FOR UPDATE USING (
  submitter_user_id = auth.uid()
  OR public.is_admin()
);
