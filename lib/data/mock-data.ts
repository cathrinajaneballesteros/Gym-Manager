import {
  Member,
  MembershipPlan,
  Payment,
  Expense,
  UserProfile,
} from '@/types/database';

export const INITIAL_PROFILE: UserProfile = {
  id: 'usr_admin_001',
  email: 'admin@smartgym.com',
  full_name: 'Limar Glen Calderon',
  role: 'admin',
  gym_name: 'IronPeak Fitness & Gym',
  currency: '₱',
  phone: '+63 917 123 4567',
  created_at: '2026-01-01T00:00:00Z',
};

export const INITIAL_PLANS: MembershipPlan[] = [
  {
    id: 'plan_regular',
    admin_id: 'usr_admin_001',
    name: 'Monthly Regular',
    price: 1500,
    duration_months: 1,
    description: 'Full access to all standard gym machines, free weights, and lockers.',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'plan_quarterly',
    admin_id: 'usr_admin_001',
    name: 'Quarterly Pro',
    price: 4200,
    duration_months: 3,
    description: '3 months full access + 1 body composition scan and locker reservation.',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'plan_annual',
    admin_id: 'usr_admin_001',
    name: 'Annual VIP Access',
    price: 15000,
    duration_months: 12,
    description: 'Year-round unlimited gym access, sauna privileges, and 2 free PT sessions.',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'plan_student',
    admin_id: 'usr_admin_001',
    name: 'Student Monthly',
    price: 1100,
    duration_months: 1,
    description: 'Special student rate with valid school ID. Active hours 6:00 AM – 5:00 PM.',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
];

// Starting on zero: No sample members, payments, or expenses
export const INITIAL_MEMBERS: Member[] = [];
export const INITIAL_PAYMENTS: Payment[] = [];
export const INITIAL_EXPENSES: Expense[] = [];
export const HISTORICAL_MONTHLY_DATA: { month: string; monthKey: string; revenue: number; expenses: number; profit: number; memberCount: number }[] = [];

