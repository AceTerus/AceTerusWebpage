-- ============================================================================
-- TIER 2: STANDARDIZE ADMIN-CHECK RLS POLICIES
-- Replaces inline subqueries like:
--   (SELECT is_admin FROM profiles WHERE user_id = auth.uid()) = true
-- with the centralized SECURITY DEFINER function:
--   public.is_admin()
--
-- The is_admin() function was created in migration 20260427000001 but only
-- applied to the events table. This migration standardizes all admin-gated
-- policies to use it, improving performance (avoids N+1 subquery per row)
-- and reliability (SECURITY DEFINER bypasses RLS on profiles).
-- ============================================================================

-- ── Ensure is_admin() function exists (idempotent) ──────────────────────────
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


-- ── decks ───────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can insert decks" ON public.decks;
CREATE POLICY "Admins can insert decks"
  ON public.decks FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update decks" ON public.decks;
CREATE POLICY "Admins can update decks"
  ON public.decks FOR UPDATE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete decks" ON public.decks;
CREATE POLICY "Admins can delete decks"
  ON public.decks FOR DELETE TO authenticated
  USING (public.is_admin());


-- ── questions ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can insert questions" ON public.questions;
CREATE POLICY "Admins can insert questions"
  ON public.questions FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update questions" ON public.questions;
CREATE POLICY "Admins can update questions"
  ON public.questions FOR UPDATE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete questions" ON public.questions;
CREATE POLICY "Admins can delete questions"
  ON public.questions FOR DELETE TO authenticated
  USING (public.is_admin());


-- ── answers ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can insert answers" ON public.answers;
CREATE POLICY "Admins can insert answers"
  ON public.answers FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update answers" ON public.answers;
CREATE POLICY "Admins can update answers"
  ON public.answers FOR UPDATE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete answers" ON public.answers;
CREATE POLICY "Admins can delete answers"
  ON public.answers FOR DELETE TO authenticated
  USING (public.is_admin());


-- ── quiz_categories ─────────────────────────────────────────────────────────
-- Original policies used auth.role() = 'authenticated' which is too permissive.
-- Now only admins can write to quiz_categories.

DROP POLICY IF EXISTS "quiz_categories_insert" ON public.quiz_categories;
CREATE POLICY "quiz_categories_insert"
  ON public.quiz_categories FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "quiz_categories_update" ON public.quiz_categories;
CREATE POLICY "quiz_categories_update"
  ON public.quiz_categories FOR UPDATE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "quiz_categories_delete" ON public.quiz_categories;
CREATE POLICY "quiz_categories_delete"
  ON public.quiz_categories FOR DELETE TO authenticated
  USING (public.is_admin());


-- ── omr_exams ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can insert exams" ON public.omr_exams;
CREATE POLICY "Admins can insert exams"
  ON public.omr_exams FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update exams" ON public.omr_exams;
CREATE POLICY "Admins can update exams"
  ON public.omr_exams FOR UPDATE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete exams" ON public.omr_exams;
CREATE POLICY "Admins can delete exams"
  ON public.omr_exams FOR DELETE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Read published exams or admin" ON public.omr_exams;
CREATE POLICY "Read published exams or admin"
  ON public.omr_exams FOR SELECT TO authenticated
  USING (is_published = true OR public.is_admin());


-- ── omr_scan_results ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Read own scans or admin" ON public.omr_scan_results;
CREATE POLICY "Read own scans or admin"
  ON public.omr_scan_results FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins can delete scan results" ON public.omr_scan_results;
CREATE POLICY "Admins can delete scan results"
  ON public.omr_scan_results FOR DELETE TO authenticated
  USING (public.is_admin());


-- ── deals ───────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "deals_insert_admin" ON public.deals;
CREATE POLICY "deals_insert_admin"
  ON public.deals FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
