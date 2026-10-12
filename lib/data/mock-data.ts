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

// Sample plans older versions showed before the owner made any. New gyms start with no plans;
// these are only kept for members and payments that already use them.
export const LEGACY_SAMPLE_PLANS: MembershipPlan[] = [
  {
    id: 'plan_monthly',
    admin_id: '',
    name: 'Monthly Standard Pass',
    price: 1500,
    duration_months: 1,
    description: 'Unlimited access to gym facilities, free weights, and cardio equipment.',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'plan_quarterly',
    admin_id: '',
    name: 'Quarterly Fitness Pass',
    price: 4000,
    duration_months: 3,
    description: '3 months full access with locker perks and 1 body composition checkup.',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'plan_annual',
    admin_id: '',
    name: 'Annual VIP All-Access',
    price: 14000,
    duration_months: 12,
    description: '1 year unlimited access, free guest passes, and priority sauna booking.',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

// Helper to generate dynamic ISO dates relative to today
const now = new Date();
const currentY = now.getFullYear();
const currentM = now.getMonth();

const formatDateRel = (monthsOffset: number, day: number) => {
  const d = new Date(currentY, currentM - monthsOffset, day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const INITIAL_MEMBERS: Member[] = [];

export const INITIAL_PAYMENTS: Payment[] = [];

// October only expenses — past months have no records (reset to 0)
export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp_oct_rent',
    admin_id: '',
    category: 'Rent',
    title: 'Rent',
    amount: 10000,
    expense_date: formatDateRel(0, 1),
    payment_method: 'Cash',
    description: 'Monthly facility lease / rent (₱10,000 per month).',
    created_at: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'exp_oct_internet',
    admin_id: '',
    category: 'Utilities',
    title: 'Internet',
    amount: 1399,
    expense_date: formatDateRel(0, 2),
    payment_method: 'GCash',
    description: 'Monthly internet subscription (₱1,399 per month).',
    created_at: '2026-10-02T00:00:00.000Z',
  },
  {
    id: 'exp_oct_electric',
    admin_id: '',
    category: 'Utilities',
    title: 'Electric',
    amount: 1500,
    expense_date: formatDateRel(0, 3),
    payment_method: 'Cash',
    description: 'Monthly electricity bill (₱1,500 per month).',
    created_at: '2026-10-03T00:00:00.000Z',
  },
  {
    id: 'exp_oct_water',
    admin_id: '',
    category: 'Supplies',
    title: 'Mineral water',
    amount: 500,
    expense_date: formatDateRel(0, 4),
    payment_method: 'Cash',
    description: 'Monthly mineral water refill and dispenser supply (₱500 monthly).',
    created_at: '2026-10-04T00:00:00.000Z',
  },
  {
    id: 'exp_oct_snacks',
    admin_id: '',
    category: 'Supplies',
    title: 'Drinks & snacks',
    amount: 500,
    expense_date: formatDateRel(0, 5),
    payment_method: 'Cash',
    description: 'Monthly drinks & snacks inventory (₱500 monthly).',
    created_at: '2026-10-05T00:00:00.000Z',
  },
];
