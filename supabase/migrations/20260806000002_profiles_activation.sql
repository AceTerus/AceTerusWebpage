-- Adds profiles.activated_at — timestamp of when the user first met the activation bar:
--   signup + username set + >=1 meaningful action within 7 days of signup.
-- The nightly analytics rollup job populates this for new users; below is a one-time backfill
-- for existing users based on historical activity we already have in the DB.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_activated_at ON public.profiles (activated_at);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles (created_at);

-- One-time backfill: for each profile with a username, find the earliest activity
-- from any tracked source within 7 days of signup and mark that as the activation timestamp.
-- Uses least(...) across sources, then filters to activity within 7 days of created_at.
-- Idempotent: only sets rows where activated_at is currently NULL.
WITH earliest_activity AS (
  SELECT
    p.user_id,
    p.created_at AS signup_at,
    LEAST(
      (SELECT MIN(completed_at) FROM public.quiz_performance_results WHERE user_id = p.user_id),
      (SELECT MIN(created_at)   FROM public.omr_scan_results          WHERE user_id = p.user_id),
      (SELECT MIN(created_at)   FROM public.posts                     WHERE user_id = p.user_id),
      (SELECT MIN(created_at)   FROM public.comments                  WHERE user_id = p.user_id),
      (SELECT MIN(created_at)   FROM public.likes                     WHERE user_id = p.user_id),
      (SELECT MIN(created_at)   FROM public.follows                   WHERE follower_id = p.user_id),
      (SELECT MIN(created_at)   FROM public.chat_messages             WHERE sender_id = p.user_id)
    ) AS first_action_at
  FROM public.profiles p
  WHERE p.username IS NOT NULL
    AND p.activated_at IS NULL
)
UPDATE public.profiles p
SET activated_at = ea.first_action_at
FROM earliest_activity ea
WHERE p.user_id = ea.user_id
  AND ea.first_action_at IS NOT NULL
  AND ea.first_action_at <= ea.signup_at + INTERVAL '7 days';
