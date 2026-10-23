-- Smart Gym Finance Manager demo data, for presentations.
-- 1. Sign up in the app with the demo email below (or change it to the account you present with).
-- 2. Run this in the Supabase SQL editor (after all the migrations).
-- It fills the demo gym with plans, 16 sample members, 6 months of payments, walk-ins, check-ins and expenses,
-- all dated relative to today, so it looks current whenever it's run. Running it again replaces the sample rows
-- (matched by the names and expense titles below) and leaves anything you added yourself alone.
-- Other accounts are not touched: real gym owners start with no data and go through onboarding.

DO $$
DECLARE
  v_demo_email TEXT := 'demo@smartgym.com';
  -- Optional: your own email and mobile number, put on Kristine Mendoza (expiring soon), so email and SMS
  -- reminders can be shown arriving on your own inbox and phone. The other sample numbers aren't real contacts,
  -- so don't send SMS reminders to them.
  v_demo_member_email TEXT := NULL;  -- e.g. 'you@gmail.com'
  v_demo_member_phone TEXT := NULL;  -- e.g. '09171234567'
  v_admin_id UUID;
  v_gym_id UUID;
  -- The gym's calendar day (Philippine time); CURRENT_DATE on Supabase is UTC.
  v_today DATE := (now() AT TIME ZONE 'Asia/Manila')::date;
  v_month DATE := date_trunc('month', (now() AT TIME ZONE 'Asia/Manila'))::date;
  v_hours JSONB := '{
    "mon": {"open": "06:00", "close": "22:00", "closed": false},
    "tue": {"open": "06:00", "close": "22:00", "closed": false},
    "wed": {"open": "06:00", "close": "22:00", "closed": false},
    "thu": {"open": "06:00", "close": "22:00", "closed": false},
    "fri": {"open": "06:00", "close": "22:00", "closed": false},
    "sat": {"open": "07:00", "close": "20:00", "closed": false},
    "sun": {"open": "08:00", "close": "17:00", "closed": true}
  }';
  v_walk_in_names TEXT[] := ARRAY['Jomar Pascual', 'Ella Dizon', 'Rico Salazar'];
  v_m RECORD;
  v_plan RECORD;
  v_member_id UUID;
  v_end DATE;
  v_start DATE;
  v_n INT;
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

  -- Sample members. Days are counted back from today:
  --   join_days  = how far back their payment history may go
  --   end_offset = membership end date minus today (negative = expired, 0-7 = expiring, NULL = never paid)
  --   away_days  = days since their last check-in (NULL = no visits); visit_gap = days between visits
  --   unverified = paid their next period by GCash yesterday; that receipt still needs checking
  DROP TABLE IF EXISTS pg_temp.seed_members;
  CREATE TEMP TABLE seed_members (
    idx INT, first_name TEXT, last_name TEXT, plan_name TEXT, method TEXT,
    join_days INT, end_offset INT, away_days INT, visit_gap INT, unverified BOOLEAN
  ) ON COMMIT DROP;
  INSERT INTO seed_members VALUES
    (1,  'Juan',      'Dela Cruz',  'Monthly Regular',          'Cash',  210,  20,    0,    2, false),
    (2,  'Maria',     'Santos',     'Monthly Regular',          'GCash', 210,  9,     1,    3, false),
    (3,  'Mark',      'Reyes',      'Monthly Regular',          'Cash',  200,  25,    0,    2, false),
    (4,  'Angelica',  'Bautista',   'Monthly Regular',          'GCash', 190,  3,     2,    3, true),
    (5,  'Paolo',     'Garcia',     'Monthly Regular',          'Cash',  60,   11,    1,    4, false),
    (6,  'Kristine',  'Mendoza',    'Monthly Regular',          'GCash', 25,   5,     3,    3, false),
    (7,  'Ramon',     'Villanueva', 'Monthly Regular',          'Cash',  200,  -10,   22,   3, false),
    (8,  'Bea',       'Navarro',    'Student Monthly Discount', 'GCash', 200,  4,     1,    2, true),
    (9,  'Carlo',     'Aquino',     'Student Monthly Discount', 'Cash',  45,   2,     2,    3, false),
    (10, 'Janine',    'Flores',     'Student Monthly Discount', 'GCash', 190,  -18,   30,   4, false),
    (11, 'Miguel',    'Torres',     'Quarterly Pro',            'Cash',  200,  40,    1,    2, false),
    (12, 'Patricia',  'Lim',        'Quarterly Pro',            'GCash', 200,  15,    2,    3, false),
    (13, 'Joshua',    'Ramos',      'Quarterly Pro',            'Cash',  200,  30,    20,   4, false),
    (14, 'Andrea',    'Castillo',   'Quarterly Pro',            'GCash', 200,  70,    3,    4, false),
    (15, 'Daniel',    'Cruz',       'Annual VIP Access',        'Cash',  10,   355,   0,    2, false),
    (16, 'Liza',      'Manalo',     'Monthly Regular',          'Cash',  NULL, NULL,  NULL, 2, false);

  -- Clear the previous sample rows. Payments first: deleting a member keeps their payments.
  -- Check-ins go with their member.
  DELETE FROM public.payments
  WHERE gym_id = v_gym_id
    AND (
      member_id IN (
        SELECT mb.id FROM public.members mb
        JOIN seed_members s ON s.first_name = mb.first_name AND s.last_name = mb.last_name
        WHERE mb.gym_id = v_gym_id
      )
      OR (is_walk_in AND member_name = ANY (v_walk_in_names))
    );
  DELETE FROM public.members mb
  USING seed_members s
  WHERE mb.gym_id = v_gym_id AND s.first_name = mb.first_name AND s.last_name = mb.last_name;

  FOR v_m IN SELECT * FROM seed_members ORDER BY idx LOOP
    SELECT id, price, duration_months INTO v_plan
    FROM public.membership_plans
    WHERE gym_id = v_gym_id AND name = v_m.plan_name
    ORDER BY created_at
    LIMIT 1;
    CONTINUE WHEN NOT FOUND;

    IF v_m.end_offset IS NULL THEN
      -- Just signed up at the front desk today; her first payment isn't recorded yet
      v_n := 0;
      v_start := v_today;
      v_end := (v_start + make_interval(months => v_plan.duration_months))::date;
    ELSE
      -- Count the paid periods that fit between the join window and the end date
      v_end := v_today + v_m.end_offset;
      v_n := 0;
      LOOP
        EXIT WHEN (v_end - make_interval(months => (v_n + 1) * v_plan.duration_months))::date < v_today - v_m.join_days;
        v_n := v_n + 1;
      END LOOP;
      CONTINUE WHEN v_n = 0;
      v_start := (v_end - make_interval(months => v_n * v_plan.duration_months))::date;
    END IF;

    INSERT INTO public.members (
      gym_id, admin_id, first_name, last_name, email, phone, membership_plan_id,
      start_date, end_date, status, last_visit_date, created_at
    )
    VALUES (
      v_gym_id, v_admin_id, v_m.first_name, v_m.last_name,
      CASE WHEN v_m.idx = 6 THEN v_demo_member_email END,
      CASE WHEN v_m.idx = 6 AND v_demo_member_phone IS NOT NULL THEN v_demo_member_phone
        ELSE '0917555' || lpad((100 + v_m.idx)::text, 4, '0') END,
      v_plan.id, v_start, v_end,
      CASE
        WHEN v_m.end_offset IS NULL THEN 'pending'
        WHEN v_m.end_offset < 0 THEN 'expired'
        WHEN v_m.end_offset <= 7 THEN 'expiring'
        ELSE 'active'
      END,
      CASE WHEN v_m.away_days IS NULL THEN NULL ELSE v_today - v_m.away_days END,
      (v_start + time '10:00') AT TIME ZONE 'Asia/Manila'
    )
    RETURNING id INTO v_member_id;

    -- One payment at the start of each paid period (k = 1 is the latest)
    INSERT INTO public.payments (
      gym_id, admin_id, member_id, member_name, membership_plan_id, amount, payment_date,
      payment_method, payment_status, receipt_status, verified_at, verified_by, reference_number, created_at
    )
    SELECT
      v_gym_id, v_admin_id, v_member_id, v_m.first_name || ' ' || v_m.last_name, v_plan.id, v_plan.price, p.pay_date,
      v_m.method, 'completed', 'verified',
      CASE WHEN v_m.method = 'GCash' THEN (p.pay_date + time '18:00') AT TIME ZONE 'Asia/Manila' END,
      CASE WHEN v_m.method = 'GCash' THEN 'Limar Glen Calderon' END,
      -- 13-digit GCash reference, fixed per member and period so re-runs match
      CASE WHEN v_m.method = 'GCash'
        THEN '10' || substr(translate(md5(v_m.idx || '-' || p.k), 'abcdef', '123456'), 1, 11) END,
      (p.pay_date + time '09:00') AT TIME ZONE 'Asia/Manila'
    FROM (
      SELECT k, (v_end - make_interval(months => k * v_plan.duration_months))::date AS pay_date
      FROM generate_series(1, v_n) AS k
    ) p
    WHERE p.pay_date <= v_today;

    -- Renewal paid early by GCash, waiting on the receipt check. Like a GCash payment recorded in the app,
    -- it's pending: not counted as revenue and the membership isn't extended until it's verified.
    IF v_m.unverified THEN
      INSERT INTO public.payments (
        gym_id, admin_id, member_id, member_name, membership_plan_id, amount, payment_date,
        payment_method, payment_status, receipt_status, reference_number, created_at
      )
      VALUES (
        v_gym_id, v_admin_id, v_member_id, v_m.first_name || ' ' || v_m.last_name, v_plan.id, v_plan.price, v_today - 1,
        'GCash', 'pending', 'unverified',
        '10' || substr(translate(md5(v_m.idx || '-next'), 'abcdef', '123456'), 1, 11),
        ((v_today - 1) + time '19:30') AT TIME ZONE 'Asia/Manila'
      );
    END IF;

    -- Check-ins every few days over the last two months, mornings, at most once a day.
    -- Two months lets the churn check compare the last 30 days with the 30 before (Joshua's visits drop off).
    IF v_m.away_days IS NOT NULL THEN
      INSERT INTO public.attendance_logs (gym_id, admin_id, member_id, check_in_date, check_in_time)
      SELECT
        v_gym_id, v_admin_id, v_member_id, v.d,
        (v.d + time '06:30' + ((v_m.idx * 37 + extract(day FROM v.d)::int * 11) % 180) * interval '1 minute')
          AT TIME ZONE 'Asia/Manila'
      FROM (
        SELECT (v_today - g)::date AS d
        FROM generate_series(v_m.away_days, 59, v_m.visit_gap) AS g
      ) v
      WHERE v.d >= v_start;
    END IF;
  END LOOP;

  -- Walk-ins: about two ₱100 day passes a week
  INSERT INTO public.payments (
    gym_id, admin_id, member_name, amount, payment_date, payment_method,
    payment_status, receipt_status, is_walk_in, created_at
  )
  SELECT
    v_gym_id, v_admin_id, v_walk_in_names[((m * 8 + j) % 3) + 1], 100.00, w.d, 'Cash',
    'completed', 'verified', true, (w.d + time '17:00') AT TIME ZONE 'Asia/Manila'
  FROM generate_series(0, 5) AS m
  CROSS JOIN generate_series(0, 7) AS j
  CROSS JOIN LATERAL (
    SELECT ((v_month - make_interval(months => m))::date + 2 + (j * 7) / 2) AS d
  ) w
  WHERE w.d <= v_today;

  -- Monthly running costs for this month and the 5 before it
  DELETE FROM public.expenses
  WHERE gym_id = v_gym_id
    AND expense_date >= (v_month - INTERVAL '5 months') AND expense_date < (v_month + INTERVAL '1 month')
    AND title IN ('Rent', 'Internet', 'Electric', 'Mineral water', 'Drinks & snacks');

  INSERT INTO public.expenses (gym_id, admin_id, category, title, amount, expense_date, payment_method, description)
  SELECT
    v_gym_id, v_admin_id, e.category, e.title,
    -- The electric bill moves a little from month to month
    CASE WHEN e.title = 'Electric' AND m > 0 THEN e.amount + ((m * 173) % 401) - 200 ELSE e.amount END,
    (v_month - make_interval(months => m))::date + e.day_offset,
    e.method, e.description
  FROM generate_series(0, 5) AS m
  CROSS JOIN (
    VALUES
      ('Rent', 'Rent', 8000.00, 0, 'Cash', 'Monthly facility lease / rent (₱8,000 per month).'),
      ('Utilities', 'Internet', 1399.00, 1, 'GCash', 'Monthly internet subscription (₱1,399 per month).'),
      ('Utilities', 'Electric', 1500.00, 2, 'Cash', 'Monthly electricity bill (about ₱1,500 per month).'),
      ('Supplies', 'Mineral water', 500.00, 3, 'Cash', 'Monthly mineral water refill and dispenser supply (₱500 monthly).'),
      ('Supplies', 'Drinks & snacks', 500.00, 4, 'Cash', 'Monthly drinks & snacks inventory (₱500 monthly).')
  ) AS e (category, title, amount, day_offset, method, description);
END $$;
