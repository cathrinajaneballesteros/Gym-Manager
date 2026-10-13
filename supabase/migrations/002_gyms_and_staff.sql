-- Data now belongs to a gym instead of a single login, so an owner can invite staff to share it.
-- Owners can do everything; staff handle members, check-ins and payments. Safe to run more than once.
-- Run it in the Supabase SQL editor after 001_multi_tenant.sql.

-- 1. Gyms and the people who work there
CREATE TABLE IF NOT EXISTS public.gyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  currency TEXT NOT NULL DEFAULT '₱',
  -- {"mon": {"open": "06:00", "close": "22:00", "closed": false}, ...}
  opening_hours JSONB,
  -- Null until the owner finishes onboarding.
  onboarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.gym_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  -- Empty until the invited person signs in with this email.
  user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'staff')),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_gym_staff_gym_email ON public.gym_staff(gym_id, lower(email));

DROP TRIGGER IF EXISTS set_updated_at ON public.gyms;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.gyms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Who is asking: their gym and their role there. Used by every policy below.
CREATE OR REPLACE FUNCTION public.my_gym_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT gym_id FROM public.gym_staff WHERE user_id = auth.uid() AND status = 'active' LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.my_gym_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT role FROM public.gym_staff WHERE user_id = auth.uid() AND status = 'active' LIMIT 1
$$;

-- 3. Onboarding: create the gym and make the caller its owner, in one step.
-- A gym made by the backfill below (not onboarded yet) is filled in instead of creating a second one.
CREATE OR REPLACE FUNCTION public.create_gym(
  p_name TEXT,
  p_address TEXT,
  p_city TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_currency TEXT,
  p_opening_hours JSONB
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_gym UUID;
  v_role TEXT;
  v_onboarded TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  IF COALESCE(trim(p_name), '') = '' THEN
    RAISE EXCEPTION 'Gym name is required';
  END IF;

  SELECT s.gym_id, s.role INTO v_gym, v_role
  FROM public.gym_staff s WHERE s.user_id = v_uid AND s.status = 'active';

  IF v_gym IS NOT NULL THEN
    IF v_role <> 'owner' THEN
      RAISE EXCEPTION 'You are already on the staff of a gym';
    END IF;
    SELECT onboarded_at INTO v_onboarded FROM public.gyms WHERE id = v_gym;
    IF v_onboarded IS NOT NULL THEN
      RAISE EXCEPTION 'Your gym is already set up';
    END IF;
    UPDATE public.gyms SET
      name = trim(p_name), address = NULLIF(trim(p_address), ''), city = NULLIF(trim(p_city), ''),
      phone = NULLIF(trim(p_phone), ''), email = NULLIF(trim(p_email), ''),
      currency = COALESCE(NULLIF(p_currency, ''), '₱'), opening_hours = p_opening_hours,
      onboarded_at = timezone('utc'::text, now())
    WHERE id = v_gym;
    RETURN v_gym;
  END IF;

  INSERT INTO public.gyms (owner_id, name, address, city, phone, email, currency, opening_hours, onboarded_at)
  VALUES (
    v_uid, trim(p_name), NULLIF(trim(p_address), ''), NULLIF(trim(p_city), ''),
    NULLIF(trim(p_phone), ''), NULLIF(trim(p_email), ''), COALESCE(NULLIF(p_currency, ''), '₱'),
    p_opening_hours, timezone('utc'::text, now())
  )
  RETURNING id INTO v_gym;

  INSERT INTO public.gym_staff (gym_id, user_id, email, full_name, role, status)
  VALUES (
    v_gym, v_uid, COALESCE(auth.email(), ''),
    (SELECT full_name FROM public.profiles WHERE id = v_uid), 'owner', 'active'
  );
  RETURN v_gym;
END;
$$;

-- 4. Staff invites: link a pending invite for the caller's (verified) email to their account.
CREATE OR REPLACE FUNCTION public.claim_invites()
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT := lower(COALESCE(auth.email(), ''));
  v_gym UUID;
  v_invite UUID;
BEGIN
  IF v_uid IS NULL OR v_email = '' THEN
    RETURN NULL;
  END IF;

  SELECT gym_id INTO v_gym FROM public.gym_staff WHERE user_id = v_uid;
  IF v_gym IS NOT NULL THEN
    RETURN v_gym;
  END IF;

  SELECT id, gym_id INTO v_invite, v_gym
  FROM public.gym_staff
  WHERE user_id IS NULL AND status = 'invited' AND lower(email) = v_email
  ORDER BY created_at
  LIMIT 1;
  IF v_invite IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.gym_staff
  SET user_id = v_uid, status = 'active', full_name = (SELECT full_name FROM public.profiles WHERE id = v_uid)
  WHERE id = v_invite;
  RETURN v_gym;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_gym(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_invites() FROM anon;

-- 5. Every row belongs to a gym. The database fills it in from whoever is signed in.
ALTER TABLE public.membership_plans ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;

-- 6. Backfill: every account that already has data becomes the owner of a gym named after its profile.
-- onboarded_at stays empty, so they still go through onboarding (with the name filled in) and keep their data.
DO $$
DECLARE
  p RECORD;
  v_gym UUID;
BEGIN
  FOR p IN
    SELECT pr.* FROM public.profiles pr
    WHERE NOT EXISTS (SELECT 1 FROM public.gym_staff s WHERE s.user_id = pr.id)
      AND (
        EXISTS (SELECT 1 FROM public.membership_plans t WHERE t.admin_id = pr.id)
        OR EXISTS (SELECT 1 FROM public.members t WHERE t.admin_id = pr.id)
        OR EXISTS (SELECT 1 FROM public.payments t WHERE t.admin_id = pr.id)
        OR EXISTS (SELECT 1 FROM public.expenses t WHERE t.admin_id = pr.id)
        OR EXISTS (SELECT 1 FROM public.attendance_logs t WHERE t.admin_id = pr.id)
      )
  LOOP
    INSERT INTO public.gyms (owner_id, name, email, currency)
    VALUES (p.id, COALESCE(NULLIF(p.gym_name, ''), 'My Fitness Gym'), p.email, COALESCE(p.currency, '₱'))
    RETURNING id INTO v_gym;
    INSERT INTO public.gym_staff (gym_id, user_id, email, full_name, role, status)
    VALUES (v_gym, p.id, COALESCE(p.email, ''), p.full_name, 'owner', 'active');
  END LOOP;

  UPDATE public.membership_plans t SET gym_id = s.gym_id FROM public.gym_staff s WHERE t.gym_id IS NULL AND s.user_id = t.admin_id;
  UPDATE public.members t SET gym_id = s.gym_id FROM public.gym_staff s WHERE t.gym_id IS NULL AND s.user_id = t.admin_id;
  UPDATE public.payments t SET gym_id = s.gym_id FROM public.gym_staff s WHERE t.gym_id IS NULL AND s.user_id = t.admin_id;
  UPDATE public.expenses t SET gym_id = s.gym_id FROM public.gym_staff s WHERE t.gym_id IS NULL AND s.user_id = t.admin_id;
  UPDATE public.attendance_logs t SET gym_id = s.gym_id FROM public.gym_staff s WHERE t.gym_id IS NULL AND s.user_id = t.admin_id;
  UPDATE public.audit_logs t SET gym_id = s.gym_id FROM public.gym_staff s WHERE t.gym_id IS NULL AND s.user_id = t.admin_id;
  -- Sign-in entries from accounts that never set up a gym have nowhere to go.
  DELETE FROM public.audit_logs WHERE gym_id IS NULL;
END $$;

ALTER TABLE public.membership_plans ALTER COLUMN gym_id SET DEFAULT public.my_gym_id(), ALTER COLUMN gym_id SET NOT NULL;
ALTER TABLE public.members ALTER COLUMN gym_id SET DEFAULT public.my_gym_id(), ALTER COLUMN gym_id SET NOT NULL;
ALTER TABLE public.payments ALTER COLUMN gym_id SET DEFAULT public.my_gym_id(), ALTER COLUMN gym_id SET NOT NULL;
ALTER TABLE public.expenses ALTER COLUMN gym_id SET DEFAULT public.my_gym_id(), ALTER COLUMN gym_id SET NOT NULL;
ALTER TABLE public.attendance_logs ALTER COLUMN gym_id SET DEFAULT public.my_gym_id(), ALTER COLUMN gym_id SET NOT NULL;
ALTER TABLE public.audit_logs ALTER COLUMN gym_id SET DEFAULT public.my_gym_id(), ALTER COLUMN gym_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_plans_gym ON public.membership_plans(gym_id);
CREATE INDEX IF NOT EXISTS idx_members_gym_status ON public.members(gym_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_gym_date ON public.payments(gym_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_expenses_gym_date ON public.expenses(gym_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_attendance_gym_time ON public.attendance_logs(gym_id, check_in_time);
CREATE INDEX IF NOT EXISTS idx_audit_gym_created ON public.audit_logs(gym_id, created_at DESC);

-- 7. Replace the one-login policies with gym policies.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('gyms', 'gym_staff', 'membership_plans', 'members', 'payments', 'expenses', 'attendance_logs', 'audit_logs')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_staff ENABLE ROW LEVEL SECURITY;

-- Gyms: everyone there can read it; only the owner edits it. New gyms come from create_gym().
CREATE POLICY "Gym team can view their gym" ON public.gyms FOR SELECT TO authenticated
  USING (id = (SELECT public.my_gym_id()));
CREATE POLICY "Owner can update their gym" ON public.gyms FOR UPDATE TO authenticated
  USING (id = (SELECT public.my_gym_id()) AND (SELECT public.my_gym_role()) = 'owner')
  WITH CHECK (id = (SELECT public.my_gym_id()));

-- Staff list: the owner manages it; staff only see their own row.
CREATE POLICY "Staff see themselves, owner sees the team" ON public.gym_staff FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (gym_id = (SELECT public.my_gym_id()) AND (SELECT public.my_gym_role()) = 'owner'));
CREATE POLICY "Owner can invite staff" ON public.gym_staff FOR INSERT TO authenticated
  WITH CHECK (
    gym_id = (SELECT public.my_gym_id()) AND (SELECT public.my_gym_role()) = 'owner'
    AND role = 'staff' AND status = 'invited' AND user_id IS NULL
  );
CREATE POLICY "Owner can remove staff" ON public.gym_staff FOR DELETE TO authenticated
  USING (gym_id = (SELECT public.my_gym_id()) AND (SELECT public.my_gym_role()) = 'owner' AND role <> 'owner');

-- Plans: the team reads them (to register members and record payments); the owner sets them.
CREATE POLICY "Gym team can view plans" ON public.membership_plans FOR SELECT TO authenticated
  USING (gym_id = (SELECT public.my_gym_id()));
CREATE POLICY "Owner can add plans" ON public.membership_plans FOR INSERT TO authenticated
  WITH CHECK (gym_id = (SELECT public.my_gym_id()) AND (SELECT public.my_gym_role()) = 'owner');
CREATE POLICY "Owner can update plans" ON public.membership_plans FOR UPDATE TO authenticated
  USING (gym_id = (SELECT public.my_gym_id()) AND (SELECT public.my_gym_role()) = 'owner')
  WITH CHECK (gym_id = (SELECT public.my_gym_id()));
CREATE POLICY "Owner can delete plans" ON public.membership_plans FOR DELETE TO authenticated
  USING (gym_id = (SELECT public.my_gym_id()) AND (SELECT public.my_gym_role()) = 'owner');

-- Members: the team handles them; only the owner deletes.
CREATE POLICY "Gym team can view members" ON public.members FOR SELECT TO authenticated
  USING (gym_id = (SELECT public.my_gym_id()));
CREATE POLICY "Gym team can add members" ON public.members FOR INSERT TO authenticated
  WITH CHECK (gym_id = (SELECT public.my_gym_id()));
CREATE POLICY "Gym team can update members" ON public.members FOR UPDATE TO authenticated
  USING (gym_id = (SELECT public.my_gym_id()))
  WITH CHECK (gym_id = (SELECT public.my_gym_id()));
CREATE POLICY "Owner can delete members" ON public.members FOR DELETE TO authenticated
  USING (gym_id = (SELECT public.my_gym_id()) AND (SELECT public.my_gym_role()) = 'owner');

-- Payments: the team records and approves them; only the owner deletes.
CREATE POLICY "Gym team can view payments" ON public.payments FOR SELECT TO authenticated
  USING (gym_id = (SELECT public.my_gym_id()));
CREATE POLICY "Gym team can add payments" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (gym_id = (SELECT public.my_gym_id()));
CREATE POLICY "Gym team can update payments" ON public.payments FOR UPDATE TO authenticated
  USING (gym_id = (SELECT public.my_gym_id()))
  WITH CHECK (gym_id = (SELECT public.my_gym_id()));
CREATE POLICY "Owner can delete payments" ON public.payments FOR DELETE TO authenticated
  USING (gym_id = (SELECT public.my_gym_id()) AND (SELECT public.my_gym_role()) = 'owner');

-- Expenses: owner only.
CREATE POLICY "Owner can view expenses" ON public.expenses FOR SELECT TO authenticated
  USING (gym_id = (SELECT public.my_gym_id()) AND (SELECT public.my_gym_role()) = 'owner');
CREATE POLICY "Owner can add expenses" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (gym_id = (SELECT public.my_gym_id()) AND (SELECT public.my_gym_role()) = 'owner');
CREATE POLICY "Owner can update expenses" ON public.expenses FOR UPDATE TO authenticated
  USING (gym_id = (SELECT public.my_gym_id()) AND (SELECT public.my_gym_role()) = 'owner')
  WITH CHECK (gym_id = (SELECT public.my_gym_id()));
CREATE POLICY "Owner can delete expenses" ON public.expenses FOR DELETE TO authenticated
  USING (gym_id = (SELECT public.my_gym_id()) AND (SELECT public.my_gym_role()) = 'owner');

-- Check-ins: the whole team.
CREATE POLICY "Gym team can view check-ins" ON public.attendance_logs FOR SELECT TO authenticated
  USING (gym_id = (SELECT public.my_gym_id()));
CREATE POLICY "Gym team can check members in" ON public.attendance_logs FOR INSERT TO authenticated
  WITH CHECK (gym_id = (SELECT public.my_gym_id()));
CREATE POLICY "Gym team can undo check-ins" ON public.attendance_logs FOR DELETE TO authenticated
  USING (gym_id = (SELECT public.my_gym_id()));

-- Audit log: everyone's actions are recorded under their own account; only the owner reads it.
CREATE POLICY "Owner can view the audit log" ON public.audit_logs FOR SELECT TO authenticated
  USING (gym_id = (SELECT public.my_gym_id()) AND (SELECT public.my_gym_role()) = 'owner');
CREATE POLICY "Gym team actions are recorded" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (gym_id = (SELECT public.my_gym_id()) AND admin_id = (SELECT auth.uid()));
