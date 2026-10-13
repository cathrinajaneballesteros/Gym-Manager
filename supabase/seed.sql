-- Smart Gym Finance Manager demo data, for presentations.
-- 1. Sign up in the app with the demo email below (or change it to the account you present with).
-- 2. Run this in the Supabase SQL editor (after all the migrations). Running it again replaces this month's sample expenses.
-- Other accounts are not touched: real gym owners start with no data and go through onboarding.

DO $$
DECLARE
  v_demo_email TEXT := 'demo@smartgym.com';
  v_admin_id UUID;
  v_gym_id UUID;
  v_month DATE := date_trunc('month', CURRENT_DATE)::date;
  v_hours JSONB := '{
    "mon": {"open": "06:00", "close": "22:00", "closed": false},
    "tue": {"open": "06:00", "close": "22:00", "closed": false},
    "wed": {"open": "06:00", "close": "22:00", "closed": false},
    "thu": {"open": "06:00", "close": "22:00", "closed": false},
    "fri": {"open": "06:00", "close": "22:00", "closed": false},
    "sat": {"open": "07:00", "close": "20:00", "closed": false},
    "sun": {"open": "08:00", "close": "17:00", "closed": true}
  }';
BEGIN
  SELECT id INTO v_admin_id FROM auth.users WHERE email = v_demo_email;
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'No account for %. Sign up with that email in the app first.', v_demo_email;
  END IF;

  UPDATE public.profiles SET full_name = 'Limar Glen Calderon' WHERE id = v_admin_id;

  -- The demo gym, already onboarded
  SELECT gym_id INTO v_gym_id FROM public.gym_staff WHERE user_id = v_admin_id;
  IF v_gym_id IS NULL THEN
    INSERT INTO public.gyms (owner_id, name) VALUES (v_admin_id, 'IronPeak Fitness & Gym') RETURNING id INTO v_gym_id;
    INSERT INTO public.gym_staff (gym_id, user_id, email, full_name, role, status)
    VALUES (v_gym_id, v_admin_id, v_demo_email, 'Limar Glen Calderon', 'owner', 'active');
  END IF;
  UPDATE public.gyms SET
    name = 'IronPeak Fitness & Gym',
    address = '123 Rizal Avenue, Brgy. San Roque, Quezon City',
    phone = '+63 917 123 4567',
    email = v_demo_email,
    currency = '₱',
    opening_hours = v_hours,
    walk_in_price = 100.00,
    onboarded_at = COALESCE(onboarded_at, timezone('utc'::text, now()))
  WHERE id = v_gym_id;

  -- Membership plans (only added if the demo gym has none yet)
  IF NOT EXISTS (SELECT 1 FROM public.membership_plans WHERE gym_id = v_gym_id) THEN
    INSERT INTO public.membership_plans (gym_id, admin_id, name, price, duration_months, description, is_active)
    VALUES
      (v_gym_id, v_admin_id, 'Monthly Regular', 1500.00, 1, 'Full access to gym equipment and locker rooms', true),
      (v_gym_id, v_admin_id, 'Quarterly Pro', 4200.00, 3, 'Includes group classes and free body composition analysis', true),
      (v_gym_id, v_admin_id, 'Annual VIP Access', 15000.00, 12, 'Unlimited access, free sauna, guest passes, and 2 PT sessions', true),
      (v_gym_id, v_admin_id, 'Student Monthly Discount', 1100.00, 1, 'Valid student ID required. Gym hours 6AM - 5PM', true);
  END IF;

  -- This month's running costs
  DELETE FROM public.expenses
  WHERE gym_id = v_gym_id
    AND expense_date >= v_month AND expense_date < (v_month + INTERVAL '1 month')
    AND title IN ('Rent', 'Internet', 'Electric', 'Mineral water', 'Drinks & snacks');

  INSERT INTO public.expenses (gym_id, admin_id, category, title, amount, expense_date, payment_method, description)
  VALUES
    (v_gym_id, v_admin_id, 'Rent', 'Rent', 10000.00, v_month, 'Cash', 'Monthly facility lease / rent (₱10,000 per month).'),
    (v_gym_id, v_admin_id, 'Utilities', 'Internet', 1399.00, v_month + 1, 'GCash', 'Monthly internet subscription (₱1,399 per month).'),
    (v_gym_id, v_admin_id, 'Utilities', 'Electric', 1500.00, v_month + 2, 'Cash', 'Monthly electricity bill (₱1,500 per month).'),
    (v_gym_id, v_admin_id, 'Supplies', 'Mineral water', 500.00, v_month + 3, 'Cash', 'Monthly mineral water refill and dispenser supply (₱500 monthly).'),
    (v_gym_id, v_admin_id, 'Supplies', 'Drinks & snacks', 500.00, v_month + 4, 'Cash', 'Monthly drinks & snacks inventory (₱500 monthly).');
END $$;
