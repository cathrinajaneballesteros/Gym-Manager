import {
  Member,
  MembershipPlan,
  Payment,
  Expense,
  UserProfile,
} from '@/types/database';

export const INITIAL_PROFILE: UserProfile = {
  id: '',
  email: '',
  full_name: 'Gym Administrator',
  role: 'admin',
  gym_name: 'My Fitness Gym',
  currency: '₱',
  phone: '',
  created_at: new Date().toISOString(),
};

// Clean slate: No sample plans, members, payments, or expenses
export const INITIAL_PLANS: MembershipPlan[] = [];
export const INITIAL_MEMBERS: Member[] = [];
export const INITIAL_PAYMENTS: Payment[] = [];
export const INITIAL_EXPENSES: Expense[] = [];
export const HISTORICAL_MONTHLY_DATA: {
  month: string;
  monthKey: string;
  revenue: number;
  expenses: number;
  profit: number;
  memberCount: number;
}[] = [];
