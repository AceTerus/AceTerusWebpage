-- Purpose: log each mascot chat invocation so we can measure mascot engagement volume.
-- Only stores (user_id, created_at) — no message content, no session id, no PII.
-- This is aggregate operational logging, not behavioral analytics.

CREATE TABLE IF NOT EXISTS public.mascot_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mascot_messages_created_at ON public.mascot_messages (created_at);
CREATE INDEX IF NOT EXISTS idx_mascot_messages_user_created ON public.mascot_messages (user_id, created_at DESC);

ALTER TABLE public.mascot_messages ENABLE ROW LEVEL SECURITY;

-- Users can insert their own rows (edge function calls this with the caller's JWT).
DO $$ BEGIN
  CREATE POLICY "mascot_messages_insert_own"
    ON public.mascot_messages FOR INSERT
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Users can read their own rows (for future per-user stats).
DO $$ BEGIN
  CREATE POLICY "mascot_messages_select_own"
    ON public.mascot_messages FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admins can read all rows.
DO $$ BEGIN
  CREATE POLICY "mascot_messages_select_admin"
    ON public.mascot_messages FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
