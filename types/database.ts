// Database and Domain Types for Smart Gym Finance Manager

export type UserRole = 'owner' | 'admin' | 'manager' | 'accountant';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  gym_name: string;
  currency: string;
  phone?: string;
  created_at: string;
  updated_at?: string;
}

export type GymRole = 'owner' | 'staff';

export type WeekDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export const WEEK_DAYS: { key: WeekDay; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

export interface DayHours {
  open: string; // HH:MM
  close: string; // HH:MM
  closed: boolean;
}

export type OpeningHours = Record<WeekDay, DayHours>;

export interface Gym {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  currency: string;
  opening_hours: OpeningHours | null;
  /** Usual fee for a one-time visitor; prefilled on the walk-in form. */
  walk_in_price: number | null;
  /** Public link to the gym's uploaded logo; the app logo is shown when empty. */
  logo_url: string | null;
  onboarded_at: string | null;
  created_at: string;
  updated_at?: string;
}

export type GymDetails = Pick<
  Gym,
  'name' | 'address' | 'city' | 'phone' | 'email' | 'currency' | 'opening_hours' | 'walk_in_price'
>;

export interface StaffMember {
  id: string;
  gym_id: string;
  user_id: string | null;
  email: string;
  full_name: string;
  role: GymRole;
  status: 'invited' | 'active';
  created_at: string;
}

export interface MembershipPlan {
  id: string;
  admin_id: string;
  name: string;
  price: number;
  duration_months: number;
  description: string;
  is_active: boolean;
  created_at: string;
}

export type MemberStatus = 'active' | 'expiring' | 'expired' | 'inactive' | 'pending';

export interface Member {
  id: string;
  admin_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  emergency_contact: string;
  membership_plan_id: string;
  plan?: MembershipPlan;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  status: MemberStatus;
  last_visit_date: string; // YYYY-MM-DD
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export type PaymentMethod = 'Cash' | 'GCash';
export const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'GCash'];
export type PaymentStatus = 'completed' | 'pending' | 'refunded';

export type ReceiptStatus = 'verified' | 'unverified' | 'rejected';

export interface Payment {
  id: string;
  admin_id: string;
  member_id: string;
  member?: Member;
  /** The member's name, saved when the member is deleted so their payments still show who paid. Also a walk-in's name. */
  member_name?: string;
  /** A one-time visitor who paid at the door; has no member. */
  is_walk_in?: boolean;
  membership_plan_id?: string;
  plan?: MembershipPlan;
  amount: number;
  payment_date: string; // YYYY-MM-DD
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  receipt_status?: ReceiptStatus;
  receipt_url?: string;
  receipt_notes?: string;
  verified_at?: string;
  verified_by?: string;
  rejection_reason?: string;
  reference_number?: string;
  notes?: string;
  created_at: string;
}

export type ExpenseCategory =
  | 'Equipment'
  | 'Utilities'
  | 'Salaries'
  | 'Rent'
  | 'Maintenance'
  | 'Supplies'
  | 'Marketing'
  | 'Other';

export interface Expense {
  id: string;
  admin_id: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  expense_date: string; // YYYY-MM-DD
  payment_method: PaymentMethod;
  description?: string;
  created_at: string;
  updated_at?: string;
}

export interface AttendanceLog {
  id: string;
  admin_id: string;
  member_id: string;
  check_in_time: string;
}

export type AuditAction =
  | 'auth.login'
  | 'auth.logout'
  | 'auth.signup'
  | 'member.create'
  | 'member.update'
  | 'member.delete'
  | 'member.reminder_sent'
  | 'member.check_in_undo'
  | 'payment.create'
  | 'payment.update'
  | 'payment.delete'
  | 'payment.receipt_verify'
  | 'payment.receipt_reject'
  | 'payment.reminder_sent'
  | 'expense.create'
  | 'expense.update'
  | 'expense.delete'
  | 'plan.create'
  | 'plan.update'
  | 'plan.activate'
  | 'plan.deactivate'
  | 'settings.update'
  | 'gym.onboard'
  | 'staff.invite'
  | 'staff.remove';

export type AuditEntityType = 'auth' | 'member' | 'payment' | 'expense' | 'plan' | 'settings' | 'staff';

export interface AuditLogEntry {
  id: string;
  admin_id: string;
  actor_email: string;
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id?: string;
  entity_label?: string;
  metadata?: Record<string, string | number | boolean | null>;
  created_at: string;
}

export interface DashboardKPIs {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  activeMembers: number;
  expiringMemberships: number;
  expiredMemberships: number;
  renewalRate: number; // percentage
  profitMargin: number; // percentage
  periodLabel: string;
}

export interface MonthlyTrendData {
  month: string; // e.g. "Jan", "Feb"
  monthKey: string; // e.g. "2026-01"
  revenue: number;
  expenses: number;
  profit: number;
  memberCount: number;
}
