-- ============================================================================
-- TIER 2: DROP GHOST QUIZ TABLES
-- The legacy quiz system (quizzes → questions(quiz_id) → question_options,
-- quiz_results(quiz_id) → quiz_answers) was superseded by the deck-based
-- system (decks → questions(deck_id) → answers).
--
-- These tables are:
-- - Not referenced in the app code (verified via grep)
-- - Not in the generated types.ts (except through migration artifacts)
-- - Structurally incompatible with the active deck-based system
--
-- DROP order respects FK dependencies (children first).
-- ============================================================================

-- ── Drop legacy quiz system tables ──────────────────────────────────────────

-- quiz_answers depends on quiz_results and questions — drop first
DROP TABLE IF EXISTS public.quiz_answers;

-- question_options depends on questions — drop next
DROP TABLE IF EXISTS public.question_options;

-- quiz_results references quizzes — but ALSO has a deck_id column used by the
-- active system. We keep quiz_results alive (it's handled in the merge migration).
-- Only drop the legacy quiz container table.

-- Drop trigger that references the legacy quizzes table
DROP TRIGGER IF EXISTS update_quiz_on_question_change ON public.questions;
-- Also drop from questions_legacy if it exists on remote
DROP TRIGGER IF EXISTS update_quiz_on_question_change ON public.questions_legacy;
-- Use CASCADE to handle any remaining dependent objects
DROP FUNCTION IF EXISTS update_quiz_updated_at() CASCADE;

-- Drop helper functions that reference the legacy quizzes table
DROP FUNCTION IF EXISTS get_quiz_question_count(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_quiz_completion_count(uuid) CASCADE;


-- Drop the legacy quizzes table itself, cascading to dependent policies and constraints
DROP TABLE IF EXISTS public.quizzes CASCADE;

-- ── Clean up questions table: remove legacy quiz_id column if it exists ─────
-- The questions table may have a quiz_id FK from the legacy system.
-- The active system uses deck_id exclusively.

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'questions'
      AND column_name = 'quiz_id'
  ) THEN
    ALTER TABLE public.questions DROP COLUMN quiz_id;
  END IF;
END $$;

-- ── Drop legacy quiz indexes ────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_questions_quiz_id;
DROP INDEX IF EXISTS idx_question_options_question_id;
DROP INDEX IF EXISTS idx_quiz_answers_result_id;
DROP INDEX IF EXISTS idx_quiz_answers_question_id;
