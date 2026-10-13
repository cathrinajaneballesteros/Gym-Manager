-- Walk-ins: one-time visitors who pay at the door without becoming members.
-- Safe to run more than once. Run it in the Supabase SQL editor after 002_gyms_and_staff.sql.

-- A walk-in is a completed payment with no member; the name (if given) is kept in member_name.
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS is_walk_in BOOLEAN NOT NULL DEFAULT false;

-- The usual walk-in fee, filled in on the walk-in form.
ALTER TABLE public.gyms ADD COLUMN IF NOT EXISTS walk_in_price NUMERIC(10, 2) CHECK (walk_in_price IS NULL OR walk_in_price >= 0);

-- Onboarding can now set the walk-in price too.
DROP FUNCTION IF EXISTS public.create_gym(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.create_gym(
  p_name TEXT,
  p_address TEXT,
  p_city TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_currency TEXT,
  p_opening_hours JSONB,
  p_walk_in_price NUMERIC DEFAULT NULL
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
      walk_in_price = p_walk_in_price,
      onboarded_at = timezone('utc'::text, now())
    WHERE id = v_gym;
    RETURN v_gym;
  END IF;

  INSERT INTO public.gyms (owner_id, name, address, city, phone, email, currency, opening_hours, walk_in_price, onboarded_at)
  VALUES (
    v_uid, trim(p_name), NULLIF(trim(p_address), ''), NULLIF(trim(p_city), ''),
    NULLIF(trim(p_phone), ''), NULLIF(trim(p_email), ''), COALESCE(NULLIF(p_currency, ''), '₱'),
    p_opening_hours, p_walk_in_price, timezone('utc'::text, now())
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

REVOKE EXECUTE ON FUNCTION public.create_gym(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, NUMERIC) FROM anon;
