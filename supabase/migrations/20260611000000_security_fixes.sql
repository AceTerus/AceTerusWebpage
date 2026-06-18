-- ============================================================================
-- SECURITY FIX MIGRATION — AceTerus
-- Fixes: Admin escalation, coin manipulation, boss raid cheating, race conditions
-- ============================================================================

-- ── FIX #1: Profiles UPDATE RLS — block is_admin and ace_coins self-writes ──

-- Drop the old permissive update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create a restrictive update policy: users can update their own row BUT
-- is_admin and ace_coins must remain unchanged
CREATE POLICY "Users can update own profile safely" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND is_admin IS NOT DISTINCT FROM (SELECT p.is_admin FROM public.profiles p WHERE p.user_id = auth.uid())
    AND ace_coins IS NOT DISTINCT FROM (SELECT p.ace_coins FROM public.profiles p WHERE p.user_id = auth.uid())
  );


-- ── FIX #2: Atomic ACE Coin increment (prevents race condition) ─────────────

CREATE OR REPLACE FUNCTION add_ace_coins(p_amount INTEGER)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE public.profiles
  SET ace_coins = ace_coins + p_amount
  WHERE user_id = auth.uid();
END;
$$;


-- ── FIX #3: Server-side Boss Raid scoring ───────────────────────────────────

CREATE OR REPLACE FUNCTION finish_raid_attempt(
  p_attempt_id UUID,
  p_answers JSONB  -- array of { question_id, selected_answer_id }
)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_attempt public.boss_raid_attempts%ROWTYPE;
  v_raid public.boss_raids%ROWTYPE;
  v_result TEXT;
  v_total_payout INTEGER;
  v_score INTEGER := 0;
  v_max_score INTEGER := 0;
  q RECORD;
  v_selected_id TEXT;
BEGIN
  -- Validate attempt
  SELECT * INTO v_attempt FROM public.boss_raid_attempts WHERE id = p_attempt_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Attempt not found'; END IF;
  IF v_attempt.status != 'playing' THEN RAISE EXCEPTION 'Attempt already finished'; END IF;
  IF v_attempt.challenger_id != auth.uid() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  -- Validate raid
  SELECT * INTO v_raid FROM public.boss_raids WHERE id = v_attempt.raid_id;
  IF v_raid.status != 'active' THEN RAISE EXCEPTION 'Raid no longer active'; END IF;

  -- SERVER-SIDE SCORING: iterate questions and check answers
  FOR q IN SELECT id, answers FROM public.boss_raid_questions WHERE raid_id = v_attempt.raid_id
  LOOP
    v_max_score := v_max_score + 1;
    -- Get the user's selected answer for this question
    v_selected_id := p_answers ->> q.id::text;
    -- Check if it matches the correct answer
    IF v_selected_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(q.answers) a
      WHERE (a->>'is_correct')::boolean = true
      AND a->>'id' = v_selected_id
    ) THEN
      v_score := v_score + 1;
    END IF;
  END LOOP;

  IF v_score = v_max_score AND v_max_score > 0 THEN
    -- Won! Give bounty + pot + bet back
    v_total_payout := v_raid.initial_bounty + v_raid.bounty_pot + v_attempt.bet_amount;
    UPDATE public.profiles SET ace_coins = ace_coins + v_total_payout WHERE user_id = v_attempt.challenger_id;
    UPDATE public.boss_raid_attempts
      SET status = 'won', score = v_score, max_score = v_max_score, completed_at = now()
      WHERE id = p_attempt_id;
    UPDATE public.boss_raids
      SET status = 'cleared', cleared_by = v_attempt.challenger_id, bounty_pot = 0
      WHERE id = v_raid.id;
    v_result := 'won';
  ELSE
    -- Lost — add bet to pot
    UPDATE public.boss_raids SET bounty_pot = bounty_pot + v_attempt.bet_amount WHERE id = v_raid.id;
    UPDATE public.boss_raid_attempts
      SET status = 'lost', score = v_score, max_score = v_max_score, completed_at = now()
      WHERE id = p_attempt_id;
    v_result := 'lost';
  END IF;

  RETURN v_result;
END;
$$;


-- ── FIX #4: Stop Boss Raid with server-side refund ──────────────────────────

CREATE OR REPLACE FUNCTION stop_boss_raid(p_raid_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_raid public.boss_raids%ROWTYPE;
  v_refund INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_raid FROM public.boss_raids WHERE id = p_raid_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Raid not found'; END IF;
  IF v_raid.creator_id != auth.uid() THEN RAISE EXCEPTION 'Only the creator can stop a raid'; END IF;
  IF v_raid.status != 'active' THEN RAISE EXCEPTION 'Raid is not active'; END IF;

  -- Calculate refund
  v_refund := v_raid.initial_bounty + v_raid.bounty_pot;

  -- Refund atomically
  UPDATE public.profiles SET ace_coins = ace_coins + v_refund WHERE user_id = auth.uid();

  -- Mark raid as cleared
  UPDATE public.boss_raids SET status = 'cleared', bounty_pot = 0 WHERE id = p_raid_id;
END;
$$;


-- ── FIX #5: Rate limiting table for Edge Functions ──────────────────────────

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only allow inserts (from SECURITY DEFINER functions or edge functions with service role)
CREATE POLICY "No direct access to rate limits" ON public.api_rate_limits
  FOR SELECT USING (false);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint
  ON public.api_rate_limits (user_id, endpoint, created_at DESC);

-- Auto-cleanup old rate limit entries (older than 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.api_rate_limits
  WHERE created_at < now() - interval '5 minutes';
END;
$$;
