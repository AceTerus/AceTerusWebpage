-- ============================================================================
-- TIER 1: MISSING INDEXES
-- Adds indexes for the most common query patterns on high-traffic tables.
-- All use IF NOT EXISTS for idempotency.
-- ============================================================================

-- ── posts: user profile feed + global feed ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_posts_user_created
  ON public.posts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_created
  ON public.posts (created_at DESC);

-- ── comments: thread loading by post ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_comments_post_created
  ON public.comments (post_id, created_at);

-- ── follows: "who follows me?" and "who do I follow?" ──────────────────────
CREATE INDEX IF NOT EXISTS idx_follows_followed
  ON public.follows (followed_id);

CREATE INDEX IF NOT EXISTS idx_follows_follower
  ON public.follows (follower_id);

-- ── uploads: user's upload listing ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_uploads_user_created
  ON public.uploads (user_id, created_at DESC);

-- ── upload_comments: comment thread loading ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_upload_comments_upload_created
  ON public.upload_comments (upload_id, created_at);

-- ── likes: count queries by post ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_likes_post
  ON public.likes (post_id);

-- ── upload_likes: count queries by upload ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_upload_likes_upload
  ON public.upload_likes (upload_id);
