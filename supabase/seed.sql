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

  -- 3. Starting on Zero (No sample members, payments, or expenses seeded)

END $$;

