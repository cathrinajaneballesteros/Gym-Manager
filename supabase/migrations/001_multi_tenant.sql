-- Brings an existing database in line with what the app stores, so every gym owner's data lives in Supabase.
-- Safe to run more than once. Run it in the Supabase SQL editor after schema.sql.

-- Members: new members stay 'pending' until their first payment.
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_status_check;
ALTER TABLE public.members ADD CONSTRAINT members_status_check
  CHECK (status IN ('active', 'expiring', 'expired', 'inactive', 'pending'));
ALTER TABLE public.members ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.members ALTER COLUMN end_date DROP NOT NULL;

-- Payments: keep a payment (and the revenue) when its member is deleted, with the member's name saved on it.
ALTER TABLE public.payments ALTER COLUMN member_id DROP NOT NULL;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_member_id_fkey;
ALTER TABLE public.payments ADD CONSTRAINT payments_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE SET NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS member_name TEXT;

-- Payments: GCash receipt checking.
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS receipt_status TEXT NOT NULL DEFAULT 'unverified';
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_receipt_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_receipt_status_check
  CHECK (receipt_status IN ('verified', 'unverified', 'rejected'));
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS receipt_notes TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS verified_by TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Attendance: undo a check-in.
DROP POLICY IF EXISTS "Admins can delete attendance logs" ON public.attendance_logs;
CREATE POLICY "Admins can delete attendance logs"
  ON public.attendance_logs FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = admin_id);
CREATE INDEX IF NOT EXISTS idx_attendance_admin_time ON public.attendance_logs(admin_id, check_in_time);

-- Audit log: who changed what. Entries can be added and read, never edited or deleted.
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_email TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_label TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_audit_admin_created ON public.audit_logs(admin_id, created_at DESC);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view their audit log" ON public.audit_logs;
CREATE POLICY "Admins can view their audit log"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = admin_id);

DROP POLICY IF EXISTS "Admins can add to their audit log" ON public.audit_logs;
CREATE POLICY "Admins can add to their audit log"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = admin_id);

-- Every row belongs to whoever is signed in, so the app never has to send admin_id itself.
ALTER TABLE public.membership_plans ALTER COLUMN admin_id SET DEFAULT auth.uid();
ALTER TABLE public.members ALTER COLUMN admin_id SET DEFAULT auth.uid();
ALTER TABLE public.payments ALTER COLUMN admin_id SET DEFAULT auth.uid();
ALTER TABLE public.expenses ALTER COLUMN admin_id SET DEFAULT auth.uid();
ALTER TABLE public.attendance_logs ALTER COLUMN admin_id SET DEFAULT auth.uid();
ALTER TABLE public.audit_logs ALTER COLUMN admin_id SET DEFAULT auth.uid();

-- Keep updated_at current.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.membership_plans;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.membership_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.members;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.expenses;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- New signups get their own gym name instead of the sample one.
ALTER TABLE public.profiles ALTER COLUMN gym_name SET DEFAULT 'My Fitness Gym';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, gym_name, currency)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Gym Administrator'),
    COALESCE(NEW.raw_user_meta_data->>'gym_name', 'My Fitness Gym'),
    COALESCE(NEW.raw_user_meta_data->>'currency', '₱')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Accounts created before the trigger existed still need a profile row.
INSERT INTO public.profiles (id, email, full_name, gym_name, currency)
SELECT u.id, COALESCE(u.email, ''), COALESCE(u.raw_user_meta_data->>'full_name', 'Gym Administrator'),
       COALESCE(u.raw_user_meta_data->>'gym_name', 'My Fitness Gym'), '₱'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;
