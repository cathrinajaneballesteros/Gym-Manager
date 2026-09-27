-- Smart Gym Finance Manager Seed Data
-- Aligned with Project Proposal metrics: 180 members, utilities, equipment, rent, P&L

-- Note: In production Supabase, replace '00000000-0000-0000-0000-000000000001' with your auth.uid()
DO $$
DECLARE
  v_admin_id UUID := '00000000-0000-0000-0000-000000000001';
  v_plan_basic UUID := '11111111-1111-1111-1111-111111111111';
  v_plan_regular UUID := '22222222-2222-2222-2222-222222222222';
  v_plan_vip UUID := '33333333-3333-3333-3333-333333333333';
  v_plan_student UUID := '44444444-4444-4444-4444-444444444444';
  v_member_1 UUID := '55555555-5555-5555-5555-555555555551';
  v_member_2 UUID := '55555555-5555-5555-5555-555555555552';
  v_member_3 UUID := '55555555-5555-5555-5555-555555555553';
  v_member_4 UUID := '55555555-5555-5555-5555-555555555554';
  v_member_5 UUID := '55555555-5555-5555-5555-555555555555';
BEGIN
  -- 1. Profile
  INSERT INTO public.profiles (id, email, full_name, role, gym_name, currency, phone)
  VALUES (v_admin_id, 'admin@smartgym.com', 'Limar Glen Calderon', 'admin', 'IronPeak Fitness & Gym', '₱', '+63 917 123 4567')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    gym_name = EXCLUDED.gym_name,
    currency = EXCLUDED.currency;

  -- 2. Membership Plans
  INSERT INTO public.membership_plans (id, admin_id, name, price, duration_months, description, is_active)
  VALUES
    (v_plan_basic, v_admin_id, 'Monthly Regular', 1500.00, 1, 'Full access to gym equipment and locker rooms', true),
    (v_plan_regular, v_admin_id, 'Quarterly Pro', 4200.00, 3, 'Includes group classes and free body composition analysis', true),
    (v_plan_vip, v_admin_id, 'Annual VIP Access', 15000.00, 12, 'Unlimited access, free sauna, guest passes, and 2 PT sessions', true),
    (v_plan_student, v_admin_id, 'Student Monthly Discount', 1100.00, 1, 'Valid student ID required. Gym hours 6AM - 5PM', true)
  ON CONFLICT (id) DO NOTHING;

  -- 3. Sample Members
  INSERT INTO public.members (id, admin_id, first_name, last_name, email, phone, emergency_contact, membership_plan_id, start_date, end_date, status, last_visit_date, notes)
  VALUES
    (v_member_1, v_admin_id, 'Aaron', 'Cabato', 'aaron.cabato@example.com', '+63 920 111 2233', 'Maria Cabato (Mother) 09201112234', v_plan_regular, CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE + INTERVAL '30 days', 'active', CURRENT_DATE - INTERVAL '1 day', 'Loyal member, attends mornings'),
    (v_member_2, v_admin_id, 'Gerardo', 'David', 'gerardo.david@example.com', '+63 918 333 4455', 'Elena David (Spouse) 09183334456', v_plan_vip, CURRENT_DATE - INTERVAL '180 days', CURRENT_DATE + INTERVAL '185 days', 'active', CURRENT_DATE - INTERVAL '3 days', 'VIP member, powerlifting enthusiast'),
    (v_member_3, v_admin_id, 'Justine', 'Villano', 'justine.v@example.com', '+63 915 555 6677', 'Robert Villano 09155556678', v_plan_basic, CURRENT_DATE - INTERVAL '25 days', CURRENT_DATE + INTERVAL '5 days', 'expiring', CURRENT_DATE - INTERVAL '20 days', 'High risk of churn: has not visited in 20 days'),
    (v_member_4, v_admin_id, 'Mark', 'Bautista', 'mark.b@example.com', '+63 916 777 8899', 'Sarah Bautista 09167778800', v_plan_student, CURRENT_DATE - INTERVAL '40 days', CURRENT_DATE - INTERVAL '10 days', 'expired', CURRENT_DATE - INTERVAL '35 days', 'Expired subscription - pending follow-up call'),
    (v_member_5, v_admin_id, 'Kathryn', 'Bernardo', 'kathryn.b@example.com', '+63 919 888 9900', 'Min Bernardo 09198889901', v_plan_basic, CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '20 days', 'active', CURRENT_DATE, 'Enrolled in cardio conditioning')
  ON CONFLICT (id) DO NOTHING;

  -- 4. Sample Payments
  INSERT INTO public.payments (admin_id, member_id, membership_plan_id, amount, payment_date, payment_method, payment_status, reference_number, notes)
  VALUES
    (v_admin_id, v_member_1, v_plan_regular, 4200.00, CURRENT_DATE - INTERVAL '60 days', 'GCash', 'completed', 'GC-892104-X', 'Quarterly upfront payment'),
    (v_admin_id, v_member_2, v_plan_vip, 15000.00, CURRENT_DATE - INTERVAL '180 days', 'Credit Card', 'completed', 'TXN-902148', 'Annual VIP fee'),
    (v_admin_id, v_member_3, v_plan_basic, 1500.00, CURRENT_DATE - INTERVAL '25 days', 'Cash', 'completed', 'REC-00129', 'Monthly walk-in fee'),
    (v_admin_id, v_member_5, v_plan_basic, 1500.00, CURRENT_DATE - INTERVAL '10 days', 'GCash', 'completed', 'GC-994120-A', 'Monthly subscription');

  -- 5. Sample Expenses
  INSERT INTO public.expenses (admin_id, category, title, amount, expense_date, payment_method, description)
  VALUES
    (v_admin_id, 'Rent', 'Gym Commercial Space Lease', 45000.00, CURRENT_DATE - INTERVAL '5 days', 'Bank Transfer', 'Monthly floor space lease for 350 sqm gym facility'),
    (v_admin_id, 'Salaries', 'Staff & Floor Coaches Payroll', 35000.00, CURRENT_DATE - INTERVAL '12 days', 'Bank Transfer', 'Bi-monthly salary for 2 floor trainers and 1 front desk receptionist'),
    (v_admin_id, 'Utilities', 'Commercial Meralco Electricity Bill', 15000.00, CURRENT_DATE - INTERVAL '3 days', 'GCash', 'Air conditioning 16 hrs/day + water dispenser heating (Spike detected: Avg ₱8,000)'),
    (v_admin_id, 'Maintenance', 'Treadmill Belt Replacement & Lubrication', 6500.00, CURRENT_DATE - INTERVAL '15 days', 'Cash', 'Bi-monthly scheduled technician maintenance for 4 commercial treadmills'),
    (v_admin_id, 'Supplies', 'Disinfectant Spray, Paper Towels & Chalk', 3200.00, CURRENT_DATE - INTERVAL '20 days', 'Cash', 'Sanitary gym cleaning supplies and lifting chalk refills'),
    (v_admin_id, 'Marketing', 'Facebook & Instagram Local Awareness Ad Campaign', 4000.00, CURRENT_DATE - INTERVAL '22 days', 'Credit Card', 'Targeted campaign for fitness enthusiasts within 5km radius');

END $$;
