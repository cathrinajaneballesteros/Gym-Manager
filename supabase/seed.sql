-- Smart Gym Finance Manager demo data, for presentations.
-- 1. Sign up in the app with the demo email below (or change it to the account you present with).
-- 2. Run this in the Supabase SQL editor. Running it again replaces this month's sample expenses.
-- Other accounts are not touched: real gym owners start with no data.

DO $$
DECLARE
  v_demo_email TEXT := 'demo@smartgym.com';
  v_admin_id UUID;
  v_month DATE := date_trunc('month', CURRENT_DATE)::date;
BEGIN
  SELECT id INTO v_admin_id FROM auth.users WHERE email = v_demo_email;
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'No account for %. Sign up with that email in the app first.', v_demo_email;
  END IF;

  UPDATE public.profiles
  SET full_name = 'Limar Glen Calderon', gym_name = 'IronPeak Fitness & Gym', currency = '₱'
  WHERE id = v_admin_id;

  -- Membership plans (only added if the demo gym has none yet)
  IF NOT EXISTS (SELECT 1 FROM public.membership_plans WHERE admin_id = v_admin_id) THEN
    INSERT INTO public.membership_plans (admin_id, name, price, duration_months, description, is_active)
    VALUES
      (v_admin_id, 'Monthly Regular', 1500.00, 1, 'Full access to gym equipment and locker rooms', true),
      (v_admin_id, 'Quarterly Pro', 4200.00, 3, 'Includes group classes and free body composition analysis', true),
      (v_admin_id, 'Annual VIP Access', 15000.00, 12, 'Unlimited access, free sauna, guest passes, and 2 PT sessions', true),
      (v_admin_id, 'Student Monthly Discount', 1100.00, 1, 'Valid student ID required. Gym hours 6AM - 5PM', true);
  END IF;

  -- This month's running costs
  DELETE FROM public.expenses
  WHERE admin_id = v_admin_id
    AND expense_date >= v_month AND expense_date < (v_month + INTERVAL '1 month')
    AND title IN ('Rent', 'Internet', 'Electric', 'Mineral water', 'Drinks & snacks');

  INSERT INTO public.expenses (admin_id, category, title, amount, expense_date, payment_method, description)
  VALUES
    (v_admin_id, 'Rent', 'Rent', 10000.00, v_month, 'Cash', 'Monthly facility lease / rent (₱10,000 per month).'),
    (v_admin_id, 'Utilities', 'Internet', 1399.00, v_month + 1, 'GCash', 'Monthly internet subscription (₱1,399 per month).'),
    (v_admin_id, 'Utilities', 'Electric', 1500.00, v_month + 2, 'Cash', 'Monthly electricity bill (₱1,500 per month).'),
    (v_admin_id, 'Supplies', 'Mineral water', 500.00, v_month + 3, 'Cash', 'Monthly mineral water refill and dispenser supply (₱500 monthly).'),
    (v_admin_id, 'Supplies', 'Drinks & snacks', 500.00, v_month + 4, 'Cash', 'Monthly drinks & snacks inventory (₱500 monthly).');
END $$;
