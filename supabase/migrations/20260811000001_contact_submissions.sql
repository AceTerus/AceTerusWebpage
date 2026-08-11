-- Purpose: capture messages submitted via the public /contacts landing page (QR-code target on the business card).
-- Anonymous visitors need to insert; only admins should be able to read.

CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  email      TEXT NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),
  message    TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 4000),
  source     TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at
  ON public.contact_submissions (created_at DESC);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated visitors from the QR code) can submit a message.
DO $$ BEGIN
  CREATE POLICY "contact_submissions_insert_public"
    ON public.contact_submissions FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Only admins can read submissions.
DO $$ BEGIN
  CREATE POLICY "contact_submissions_select_admin"
    ON public.contact_submissions FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
