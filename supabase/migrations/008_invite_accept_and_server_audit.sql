-- 1. Invited staff choose to join instead of being added the moment they sign in.
-- 2. The audit log can't be faked, and payment changes / check-in undos are logged by the database
--    itself, so changing them straight through the API still leaves a record.
-- Safe to run more than once. Run it in the Supabase SQL editor after 007_api_rate_limits.sql.

-- ---------------------------------------------------------------------------
-- 1. Invites
-- ---------------------------------------------------------------------------

-- Older app versions call this on every load; it no longer joins anyone to a gym.
CREATE OR REPLACE FUNCTION public.claim_invites()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT public.my_gym_id()
$$;

-- The oldest invite waiting for the caller's (verified) email, if they aren't on a gym's team yet.
CREATE OR REPLACE FUNCTION public.pending_invite()
RETURNS TABLE (invite_id UUID, gym_name TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT s.id, g.name
  FROM public.gym_staff s
  JOIN public.gyms g ON g.id = s.gym_id
  WHERE s.user_id IS NULL AND s.status = 'invited'
    AND lower(s.email) = lower(COALESCE(auth.email(), ''))
    AND auth.uid() IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.gym_staff me WHERE me.user_id = auth.uid())
  ORDER BY s.created_at
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.accept_invite(p_invite UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT := lower(COALESCE(auth.email(), ''));
  v_gym UUID;
BEGIN
  IF v_uid IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  IF EXISTS (SELECT 1 FROM public.gym_staff WHERE user_id = v_uid) THEN
    RAISE EXCEPTION 'You are already part of a gym';
  END IF;

  UPDATE public.gym_staff
  SET user_id = v_uid, status = 'active', full_name = (SELECT full_name FROM public.profiles WHERE id = v_uid)
  WHERE id = p_invite AND user_id IS NULL AND status = 'invited' AND lower(email) = v_email
  RETURNING gym_id INTO v_gym;

  IF v_gym IS NULL THEN
    RAISE EXCEPTION 'This invite is no longer available';
  END IF;
  RETURN v_gym;
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_invite(p_invite UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  DELETE FROM public.gym_staff
  WHERE id = p_invite AND user_id IS NULL AND status = 'invited'
    AND lower(email) = lower(COALESCE(auth.email(), ''));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_invites() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.pending_invite() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_invite(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.decline_invite(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_invites() TO authenticated;
GRANT EXECUTE ON FUNCTION public.pending_invite() TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invite(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_invite(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Audit log
-- ---------------------------------------------------------------------------

-- Whoever is signed in is who the entry is about; the app can't claim to be someone else.
CREATE OR REPLACE FUNCTION public.audit_set_actor()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Without a signed-in user it's a seed script or the dashboard, which may backdate entries.
  IF auth.uid() IS NOT NULL THEN
    NEW.admin_id := auth.uid();
    NEW.actor_email := COALESCE(auth.email(), '');
    NEW.created_at := timezone('utc'::text, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_set_actor ON public.audit_logs;
CREATE TRIGGER audit_set_actor BEFORE INSERT ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_set_actor();

-- "Juan Cruz · ₱1,500" for a payment row.
CREATE OR REPLACE FUNCTION public.audit_payment_label(p public.payments)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT concat_ws(' · ',
    COALESCE(
      (SELECT NULLIF(trim(m.first_name || ' ' || m.last_name), '') FROM public.members m WHERE m.id = p.member_id),
      NULLIF(trim(p.member_name), ''),
      CASE WHEN p.is_walk_in THEN 'Walk-in' ELSE 'Unknown member' END
    ),
    COALESCE((SELECT g.currency FROM public.gyms g WHERE g.id = p.gym_id), '₱') || to_char(p.amount, 'FM999,999,990.00')
  )
$$;

-- Payments: every add, change and delete is logged here, whichever way it was made.
CREATE OR REPLACE FUNCTION public.audit_payment_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_row public.payments := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  v_action TEXT;
  v_meta JSONB;
  v_changed TEXT[] := ARRAY[]::TEXT[];
  v_field TEXT;
BEGIN
  -- Seed scripts and dashboard edits aren't someone using the app.
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  -- Payments removed because their whole gym was deleted aren't logged one by one (and can't be: the log goes too).
  IF NOT EXISTS (SELECT 1 FROM public.gyms WHERE id = v_row.gym_id) THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'payment.create';
    v_meta := jsonb_build_object(
      'amount', NEW.amount, 'method', NEW.payment_method, 'status', NEW.payment_status,
      'receipt_status', NEW.receipt_status, 'member_id', NEW.member_id
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'payment.delete';
    v_meta := jsonb_build_object(
      'amount', OLD.amount, 'payment_date', OLD.payment_date, 'method', OLD.payment_method,
      'status', OLD.payment_status, 'member_id', OLD.member_id
    );
  ELSE
    v_meta := '{}'::jsonb;
    FOREACH v_field IN ARRAY ARRAY[
      'member_name', 'membership_plan_id', 'amount', 'payment_date', 'payment_method', 'payment_status',
      'receipt_status', 'reference_number', 'notes', 'receipt_notes', 'rejection_reason'
    ] LOOP
      IF (to_jsonb(OLD) -> v_field) IS DISTINCT FROM (to_jsonb(NEW) -> v_field) THEN
        v_changed := v_changed || v_field;
        v_meta := v_meta
          || jsonb_build_object(v_field || '.from', to_jsonb(OLD) -> v_field)
          || jsonb_build_object(v_field || '.to', to_jsonb(NEW) -> v_field);
      END IF;
    END LOOP;
    IF cardinality(v_changed) = 0 THEN
      RETURN NULL; -- e.g. only verified_at was touched
    END IF;
    v_action := CASE
      WHEN NEW.receipt_status IS DISTINCT FROM OLD.receipt_status AND NEW.receipt_status = 'verified' THEN 'payment.receipt_verify'
      WHEN NEW.receipt_status IS DISTINCT FROM OLD.receipt_status AND NEW.receipt_status = 'rejected' THEN 'payment.receipt_reject'
      ELSE 'payment.update'
    END;
    v_meta := v_meta || jsonb_build_object('changed', array_to_string(v_changed, ', '));
  END IF;

  INSERT INTO public.audit_logs (gym_id, admin_id, actor_email, action, entity_type, entity_id, entity_label, metadata)
  VALUES (
    v_row.gym_id, auth.uid(), COALESCE(auth.email(), ''), v_action, 'payment', v_row.id::TEXT,
    public.audit_payment_label(v_row), v_meta
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_payment_change ON public.payments;
CREATE TRIGGER audit_payment_change AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.audit_payment_change();

-- Check-ins: undoing one is logged here.
CREATE OR REPLACE FUNCTION public.audit_check_in_undo()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Check-ins removed along with their member or gym aren't undos.
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.members WHERE id = OLD.member_id) THEN
    RETURN NULL;
  END IF;
  INSERT INTO public.audit_logs (gym_id, admin_id, actor_email, action, entity_type, entity_id, entity_label, metadata)
  VALUES (
    OLD.gym_id, auth.uid(), COALESCE(auth.email(), ''), 'member.check_in_undo', 'member', OLD.member_id::TEXT,
    COALESCE(
      (SELECT NULLIF(trim(m.first_name || ' ' || m.last_name), '') FROM public.members m WHERE m.id = OLD.member_id),
      'Unknown member'
    ),
    jsonb_build_object('check_in_time', OLD.check_in_time)
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_check_in_undo ON public.attendance_logs;
CREATE TRIGGER audit_check_in_undo AFTER DELETE ON public.attendance_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_check_in_undo();

REVOKE EXECUTE ON FUNCTION public.audit_payment_label(public.payments) FROM PUBLIC, anon, authenticated;
