-- OMR Exams: admin-authored answer keys + saved student scan results.
-- The printed OMR sheet is a fixed 20-question A–D layout; an exam may use 1–20
-- of those questions (only the first N are graded by the OMR service).

-- ── omr_exams ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.omr_exams (
  id             UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title          TEXT        NOT NULL,
  question_count INTEGER     NOT NULL CHECK (question_count BETWEEN 1 AND 20),
  answers        JSONB       NOT NULL,  -- ordered array of answer letters, length = question_count
  marking        JSONB       NOT NULL DEFAULT '{"correct":"1","incorrect":"0","unmarked":"0"}'::jsonb,
  is_published   BOOLEAN     NOT NULL DEFAULT true,
  created_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_omr_exams_is_published ON public.omr_exams (is_published);

ALTER TABLE public.omr_exams ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Users see published exams; admins see all.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='omr_exams' AND policyname='Read published exams or admin') THEN
    CREATE POLICY "Read published exams or admin"
      ON public.omr_exams FOR SELECT TO authenticated
      USING (
        is_published = true
        OR (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='omr_exams' AND policyname='Admins can insert exams') THEN
    CREATE POLICY "Admins can insert exams"
      ON public.omr_exams FOR INSERT TO authenticated
      WITH CHECK ((SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='omr_exams' AND policyname='Admins can update exams') THEN
    CREATE POLICY "Admins can update exams"
      ON public.omr_exams FOR UPDATE TO authenticated
      USING ((SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='omr_exams' AND policyname='Admins can delete exams') THEN
    CREATE POLICY "Admins can delete exams"
      ON public.omr_exams FOR DELETE TO authenticated
      USING ((SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true);
  END IF;
END $$;

-- ── omr_scan_results ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.omr_scan_results (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id       UUID        NOT NULL REFERENCES public.omr_exams(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score         NUMERIC,
  max_score     NUMERIC,
  correct_count INTEGER,
  total_count   INTEGER,
  responses     JSONB,   -- { question: marked_answer }
  per_question  JSONB,   -- [{ question, marked, answer, verdict, delta }]
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_omr_scan_results_exam_id ON public.omr_scan_results (exam_id);
CREATE INDEX IF NOT EXISTS idx_omr_scan_results_user_id ON public.omr_scan_results (user_id);

ALTER TABLE public.omr_scan_results ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='omr_scan_results' AND policyname='Insert own scan results') THEN
    CREATE POLICY "Insert own scan results"
      ON public.omr_scan_results FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='omr_scan_results' AND policyname='Read own scans or admin') THEN
    CREATE POLICY "Read own scans or admin"
      ON public.omr_scan_results FOR SELECT TO authenticated
      USING (
        user_id = auth.uid()
        OR (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='omr_scan_results' AND policyname='Admins can delete scan results') THEN
    CREATE POLICY "Admins can delete scan results"
      ON public.omr_scan_results FOR DELETE TO authenticated
      USING ((SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true);
  END IF;
END $$;
