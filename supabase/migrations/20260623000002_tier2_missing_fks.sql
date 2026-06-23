-- ============================================================================
-- TIER 2: MISSING FOREIGN KEYS
-- Adds FK constraints with CASCADE delete on tables that reference auth.users
-- but were created without proper FK declarations.
-- Includes orphan cleanup (safe: deletes rows referencing non-existent users).
-- ============================================================================

-- ── Clean up orphaned rows before adding constraints ────────────────────────

-- follows: remove rows where follower or followed user no longer exists
DELETE FROM public.follows
WHERE follower_id NOT IN (SELECT id FROM auth.users);

DELETE FROM public.follows
WHERE followed_id NOT IN (SELECT id FROM auth.users);

-- likes: remove rows where user no longer exists
DELETE FROM public.likes
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- comments: remove rows where user no longer exists
DELETE FROM public.comments
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- upload_likes: remove rows where user no longer exists
DELETE FROM public.upload_likes
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- upload_comments: remove rows where user no longer exists
DELETE FROM public.upload_comments
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- quiz_completions: remove rows where user no longer exists
DELETE FROM public.quiz_completions
WHERE user_id NOT IN (SELECT id FROM auth.users);


-- ── Add foreign key constraints ─────────────────────────────────────────────

-- follows.follower_id → auth.users(id)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'follows_follower_id_fkey'
      AND table_name = 'follows'
  ) THEN
    ALTER TABLE public.follows
      ADD CONSTRAINT follows_follower_id_fkey
      FOREIGN KEY (follower_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- follows.followed_id → auth.users(id)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'follows_followed_id_fkey'
      AND table_name = 'follows'
  ) THEN
    ALTER TABLE public.follows
      ADD CONSTRAINT follows_followed_id_fkey
      FOREIGN KEY (followed_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- likes.user_id → auth.users(id)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'likes_user_id_fkey'
      AND table_name = 'likes'
  ) THEN
    ALTER TABLE public.likes
      ADD CONSTRAINT likes_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- comments.user_id → auth.users(id)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'comments_user_id_fkey'
      AND table_name = 'comments'
  ) THEN
    ALTER TABLE public.comments
      ADD CONSTRAINT comments_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- upload_likes.user_id → auth.users(id)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'upload_likes_user_id_fkey'
      AND table_name = 'upload_likes'
  ) THEN
    ALTER TABLE public.upload_likes
      ADD CONSTRAINT upload_likes_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- upload_comments.user_id → auth.users(id)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'upload_comments_user_id_fkey'
      AND table_name = 'upload_comments'
  ) THEN
    ALTER TABLE public.upload_comments
      ADD CONSTRAINT upload_comments_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- quiz_completions.user_id → auth.users(id)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'quiz_completions_user_id_fkey'
      AND table_name = 'quiz_completions'
  ) THEN
    ALTER TABLE public.quiz_completions
      ADD CONSTRAINT quiz_completions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;
