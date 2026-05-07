-- ── Event registration forms ─────────────────────────────────────────────────

-- 1. Drop old type constraint so new event notification types are accepted
--    (do not re-add a closed list — existing rows may contain types from other features)
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 2. Add requires_approval to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN NOT NULL DEFAULT false;

-- 3. Extend event_registrations with status + metadata
ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS status       TEXT NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 4. Organizer-defined form fields per event
CREATE TABLE IF NOT EXISTS public.event_form_fields (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  field_type  TEXT NOT NULL
    CHECK (field_type IN ('text','email','phone','number','textarea','select','file')),
  options     TEXT[],
  is_required BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. One response row per field per registration
CREATE TABLE IF NOT EXISTS public.event_registration_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.event_registrations(id) ON DELETE CASCADE,
  field_id        UUID NOT NULL REFERENCES public.event_form_fields(id) ON DELETE CASCADE,
  value           TEXT,
  file_url        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (registration_id, field_id)
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.event_form_fields           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registration_responses ENABLE ROW LEVEL SECURITY;

-- event_form_fields
DO $$ BEGIN CREATE POLICY "eff_select_all" ON public.event_form_fields FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "eff_insert_owner" ON public.event_form_fields FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND submitter_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "eff_update_owner" ON public.event_form_fields FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND submitter_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "eff_delete_owner" ON public.event_form_fields FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND submitter_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- event_registration_responses
DO $$ BEGIN CREATE POLICY "err_select" ON public.event_registration_responses FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.event_registrations WHERE id = registration_id AND user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.event_registrations er
    JOIN public.events e ON e.id = er.event_id
    WHERE er.id = registration_id AND e.submitter_user_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "err_insert_own" ON public.event_registration_responses FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.event_registrations WHERE id = registration_id AND user_id = auth.uid())
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Organizer can update (approve/reject) and delete (remove) registrations
DO $$ BEGIN CREATE POLICY "er_update_organizer" ON public.event_registrations FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND submitter_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "er_delete_organizer" ON public.event_registrations FOR DELETE USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND submitter_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow event owner to update and delete their own events
DO $$ BEGIN CREATE POLICY "events_update_owner" ON public.events FOR UPDATE USING (
  submitter_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "events_delete_owner" ON public.events FOR DELETE USING (
  submitter_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── RPC: fan-out cancellation notification ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_event_cancelled(
  p_event_id     UUID,
  p_organizer_id UUID,
  p_event_title  TEXT
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, actor_id, type, metadata)
  SELECT er.user_id, p_organizer_id, 'event_cancelled',
    jsonb_build_object('event_id', p_event_id, 'event_title', p_event_title)
  FROM public.event_registrations er
  WHERE er.event_id = p_event_id
    AND er.user_id <> p_organizer_id
    AND er.status IN ('pending', 'approved');
END;
$$;

-- ── Reimagined coin trigger: coins only on approval ───────────────────────────
DROP TRIGGER IF EXISTS trg_credit_registration_coins ON public.event_registrations;

CREATE OR REPLACE FUNCTION public.credit_registration_coins()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_reward INTEGER;
BEGIN
  -- Fire when status becomes 'approved' (either on insert or update)
  IF (TG_OP = 'INSERT' AND NEW.status = 'approved') OR
     (TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM 'approved') AND NEW.status = 'approved') THEN
    SELECT ace_coins_reward INTO v_reward FROM public.events WHERE id = NEW.event_id;
    IF v_reward IS NOT NULL AND v_reward > 0 THEN
      UPDATE public.profiles SET ace_coins = ace_coins + v_reward WHERE user_id = NEW.user_id;
    END IF;
    -- Referral coins awarded at same time, verified by same approval
    IF NEW.referrer_id IS NOT NULL AND NEW.referrer_id != NEW.user_id THEN
      PERFORM public.award_event_promoter(NEW.event_id, NEW.referrer_id, 50);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_credit_registration_coins
  AFTER INSERT OR UPDATE ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.credit_registration_coins();
