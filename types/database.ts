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
  /** The member's name, saved when the member is deleted so their payments still show who paid. */
  member_name?: string;
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
  | 'settings.update';

export type AuditEntityType = 'auth' | 'member' | 'payment' | 'expense' | 'plan' | 'settings';

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
