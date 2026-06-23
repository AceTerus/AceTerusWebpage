-- ============================================================================
-- TIER 1: CRITICAL SECURITY CLEANUP
-- Fixes: Ghost authenthication table, duplicate follower trigger, unread_count auth bypass
-- ============================================================================

-- ── FIX #1: Drop ghost "authenthication" table ──────────────────────────────
-- This misspelled table stores email/password with no RLS, no migration origin,
-- no app references, and duplicates what Supabase Auth already handles.
-- SECURITY RISK: Potential plaintext credential exposure via PostgREST.

DROP TABLE IF EXISTS public.authenthication;


-- ── FIX #2: Remove duplicate follower count trigger ─────────────────────────
-- Migration 20250925 created `update_follower_counts_trigger` → update_follower_counts()
-- Migration 20251028 created `on_follow_created` → handle_new_follow()
--                    and    `on_follow_deleted` → handle_delete_follow()
-- Both trigger sets fire on INSERT/DELETE on follows, causing DOUBLE counting.
-- The handle_new_follow/handle_delete_follow versions are kept because they
-- use GREATEST(x - 1, 0) to prevent negative counts and have SECURITY DEFINER.

DROP TRIGGER IF EXISTS update_follower_counts_trigger ON public.follows;
DROP FUNCTION IF EXISTS public.update_follower_counts();


-- ── FIX #3: Fix reset_unread_count authorization bypass ─────────────────────
-- The original function accepts any user UUID with no auth check, allowing
-- User A to clear User B's unread counts.

CREATE OR REPLACE FUNCTION public.reset_unread_count(target_user UUID, target_sender UUID)
RETURNS void AS $$
BEGIN
  -- SECURITY: Verify the caller is resetting their own unread counts
  IF target_user != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: can only reset your own unread counts';
  END IF;

  UPDATE public.chat_unread_counts
  SET unread_count = 0,
      updated_at = now()
  WHERE user_id = target_user
    AND sender_id = target_sender;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── FIX #4: Fix add_ace_coins negative amount vulnerability ─────────────────
-- The original function allowed negative amounts, enabling users to drain coins.

CREATE OR REPLACE FUNCTION add_ace_coins(p_amount INTEGER)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  UPDATE public.profiles
  SET ace_coins = ace_coins + p_amount
  WHERE user_id = auth.uid();
END;
$$;
