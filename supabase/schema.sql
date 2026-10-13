-- Smart Gym Finance Manager Database Schema
-- Supabase PostgreSQL Schema with RLS and Performance Optimization

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin', 'manager', 'accountant')),
  gym_name TEXT NOT NULL DEFAULT 'My Fitness Gym',
  currency TEXT NOT NULL DEFAULT '₱',
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Membership Plans Table
CREATE TABLE IF NOT EXISTS public.membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  duration_months INTEGER NOT NULL DEFAULT 1 CHECK (duration_months > 0),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Members Table
CREATE TABLE IF NOT EXISTS public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  emergency_contact TEXT,
  membership_plan_id UUID REFERENCES public.membership_plans(id) ON DELETE SET NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'expiring', 'expired', 'inactive', 'pending')),
  last_visit_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Payments outlive their member (revenue history), keeping the name in member_name.
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  member_name TEXT,
  membership_plan_id UUID REFERENCES public.membership_plans(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'GCash')),
  payment_status TEXT NOT NULL DEFAULT 'completed' CHECK (payment_status IN ('completed', 'pending', 'refunded')),
  receipt_status TEXT NOT NULL DEFAULT 'unverified' CHECK (receipt_status IN ('verified', 'unverified', 'rejected')),
  receipt_url TEXT,
  receipt_notes TEXT,
  verified_at TIMESTAMPTZ,
  verified_by TEXT,
  rejection_reason TEXT,
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('Equipment', 'Utilities', 'Salaries', 'Rent', 'Maintenance', 'Supplies', 'Marketing', 'Other')),
  title TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'GCash')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Attendance Logs Table (for Churn Prediction & Retention Analytics)
CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Audit Log (entries can be added and read, never edited or deleted)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_email TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_label TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_members_admin_status ON public.members(admin_id, status);
CREATE INDEX IF NOT EXISTS idx_members_end_date ON public.members(end_date);
CREATE INDEX IF NOT EXISTS idx_payments_admin_date ON public.payments(admin_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_member ON public.payments(member_id);
CREATE INDEX IF NOT EXISTS idx_expenses_admin_date ON public.expenses(admin_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_admin_category ON public.expenses(admin_id, category);
CREATE INDEX IF NOT EXISTS idx_attendance_member_time ON public.attendance_logs(member_id, check_in_time);
CREATE INDEX IF NOT EXISTS idx_attendance_admin_time ON public.attendance_logs(admin_id, check_in_time);
CREATE INDEX IF NOT EXISTS idx_audit_admin_created ON public.audit_logs(admin_id, created_at DESC);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

-- Membership Plans Policies
CREATE POLICY "Admins can view their own membership plans"
  ON public.membership_plans FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = admin_id);

CREATE POLICY "Admins can create their own membership plans"
  ON public.membership_plans FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = admin_id);

CREATE POLICY "Admins can update their own membership plans"
  ON public.membership_plans FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = admin_id)
  WITH CHECK ((SELECT auth.uid()) = admin_id);

CREATE POLICY "Admins can delete their own membership plans"
  ON public.membership_plans FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = admin_id);

-- Members Policies
CREATE POLICY "Admins can view their own members"
  ON public.members FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = admin_id);

CREATE POLICY "Admins can create their own members"
  ON public.members FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = admin_id);

CREATE POLICY "Admins can update their own members"
  ON public.members FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = admin_id)
  WITH CHECK ((SELECT auth.uid()) = admin_id);

CREATE POLICY "Admins can delete their own members"
  ON public.members FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = admin_id);

-- Payments Policies
CREATE POLICY "Admins can view their own payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = admin_id);

CREATE POLICY "Admins can create their own payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = admin_id);

CREATE POLICY "Admins can update their own payments"
  ON public.payments FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = admin_id)
  WITH CHECK ((SELECT auth.uid()) = admin_id);

CREATE POLICY "Admins can delete their own payments"
  ON public.payments FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = admin_id);

-- Expenses Policies
CREATE POLICY "Admins can view their own expenses"
  ON public.expenses FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = admin_id);

CREATE POLICY "Admins can create their own expenses"
  ON public.expenses FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = admin_id);

CREATE POLICY "Admins can update their own expenses"
  ON public.expenses FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = admin_id)
  WITH CHECK ((SELECT auth.uid()) = admin_id);

CREATE POLICY "Admins can delete their own expenses"
  ON public.expenses FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = admin_id);

-- Attendance Policies
CREATE POLICY "Admins can view their attendance logs"
  ON public.attendance_logs FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = admin_id);

CREATE POLICY "Admins can create attendance logs"
  ON public.attendance_logs FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = admin_id);

CREATE POLICY "Admins can delete attendance logs"
  ON public.attendance_logs FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = admin_id);

-- Audit Log Policies
CREATE POLICY "Admins can view their audit log"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = admin_id);

CREATE POLICY "Admins can add to their audit log"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = admin_id);

-- Keep updated_at current
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

-- Automatic Profile Creation Trigger on Auth Signup
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
