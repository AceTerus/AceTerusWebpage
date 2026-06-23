-- ============================================================================
-- TIER 2: DROP LEGACY QUIZ RESULTS
-- quiz_results was originally created in 20251126 with quiz_id for the legacy
-- quiz system. The active deck-based system uses quiz_performance_results.
-- Since the legacy quizzes table is dropped, we drop quiz_results as well.
-- ============================================================================

-- ── Drop quiz_results indexes ───────────────────────────────────────
DROP INDEX IF EXISTS idx_quiz_results_user_id;
DROP INDEX IF EXISTS idx_quiz_results_user_completed;
DROP INDEX IF EXISTS idx_quiz_results_user_category;
DROP INDEX IF EXISTS idx_quiz_results_quiz_id;

-- ── Drop quiz_results table ─────────────────────────────────────────
DROP TABLE IF EXISTS public.quiz_results CASCADE;

