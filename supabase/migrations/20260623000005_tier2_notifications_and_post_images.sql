-- ============================================================================
-- TIER 2: NOTIFICATION TYPE CONSTRAINT + POST_IMAGES RLS
-- Re-adds a CHECK constraint on notifications.type to prevent typos,
-- covering all notification types used across the codebase.
-- Also adds missing write policies on post_images.
-- ============================================================================

-- ── Notification type constraint ────────────────────────────────────────────
-- The constraint was dropped in migration 20260507000002 to avoid breakage
-- when adding new types. We restore it now with the complete list of types.

-- First, delete any notifications with invalid types to prevent constraint violations
DELETE FROM public.notifications WHERE type NOT IN (
  'follow',
  'like',
  'comment',
  'material_like',
  'material_comment',
  'quiz_published',
  'streak_milestone',
  'streak_broken',
  'goal_reminder',
  'event_cancelled',
  'boss_raid_invite',
  'level_up'
);

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'follow',
    'like',
    'comment',
    'material_like',
    'material_comment',
    'quiz_published',
    'streak_milestone',
    'streak_broken',
    'goal_reminder',
    'event_cancelled',
    'boss_raid_invite',
    'level_up'
  ));


-- ── post_images: add missing write RLS policies ─────────────────────────────
-- Currently only has a SELECT policy. Users need INSERT/DELETE for their posts.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'post_images'
      AND policyname = 'Users can insert images for own posts'
  ) THEN
    CREATE POLICY "Users can insert images for own posts"
      ON public.post_images FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.posts
          WHERE posts.id = post_images.post_id
            AND posts.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'post_images'
      AND policyname = 'Users can delete images for own posts'
  ) THEN
    CREATE POLICY "Users can delete images for own posts"
      ON public.post_images FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.posts
          WHERE posts.id = post_images.post_id
            AND posts.user_id = auth.uid()
        )
      );
  END IF;
END $$;
