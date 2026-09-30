'use client';

import {
  Member,
  MembershipPlan,
  Payment,
  Expense,
  UserProfile,
  DashboardKPIs,
  MonthlyTrendData,
} from '@/types/database';
import {
  INITIAL_PROFILE,
  INITIAL_PLANS,
  INITIAL_MEMBERS,
  INITIAL_PAYMENTS,
  INITIAL_EXPENSES,
  HISTORICAL_MONTHLY_DATA,
} from './mock-data';

const STORAGE_KEYS = {
  PROFILE: 'sgfm_profile_v2',
  MEMBERS: 'sgfm_members_v2',
  PLANS: 'sgfm_plans_v2',
  PAYMENTS: 'sgfm_payments_v2',
  EXPENSES: 'sgfm_expenses_v2',
};

// Clear legacy sample data from previous local browser sessions
if (typeof window !== 'undefined') {
  try {
    if (!localStorage.getItem('sgfm_zero_init_v2')) {
      localStorage.removeItem('sgfm_members');
      localStorage.removeItem('sgfm_payments');
      localStorage.removeItem('sgfm_expenses');
      localStorage.removeItem('sgfm_members_v2');
      localStorage.removeItem('sgfm_payments_v2');
      localStorage.removeItem('sgfm_expenses_v2');
      localStorage.setItem('sgfm_zero_init_v2', 'true');
    }
  } catch (err) {
    // Ignore storage errors in private browsing
  }
}

// Safe client-side storage retrieval
function getStoredItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.warn(`Error reading localStorage for key ${key}:`, err);
    return fallback;
  }
}

function setStoredItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Error writing to localStorage for key ${key}:`, err);
  }
}

export class DBService {
  // 1. Profile / Settings
  static getProfile(): UserProfile {
    return getStoredItem<UserProfile>(STORAGE_KEYS.PROFILE, INITIAL_PROFILE);
  }

  static getFirstName(fullName?: string): string {
    if (!fullName || !fullName.trim()) return 'Admin';
    const first = fullName.trim().split(/\s+/)[0];
    return first || 'Admin';
  }

  static getInitials(fullName?: string): string {
    if (!fullName || !fullName.trim()) return 'AD';
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'AD';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  static updateProfile(updates: Partial<UserProfile>): UserProfile {
    const current = this.getProfile();
    const updated = { ...current, ...updates, updated_at: new Date().toISOString() };
    setStoredItem(STORAGE_KEYS.PROFILE, updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sgfm_profile_updated', { detail: updated }));
    }
    return updated;
  }

  // 2. Membership Plans
  static getPlans(): MembershipPlan[] {
    return getStoredItem<MembershipPlan[]>(STORAGE_KEYS.PLANS, INITIAL_PLANS);
  }

  static addPlan(plan: Omit<MembershipPlan, 'id' | 'admin_id' | 'created_at'>): MembershipPlan {
    const plans = this.getPlans();
    const newPlan: MembershipPlan = {
      ...plan,
      id: `plan_${Date.now()}`,
      admin_id: this.getProfile().id,
      created_at: new Date().toISOString(),
    };
    const updated = [...plans, newPlan];
    setStoredItem(STORAGE_KEYS.PLANS, updated);
    return newPlan;
  }

  // 3. Members
  static getMembers(): Member[] {
    const members = getStoredItem<Member[]>(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS);
    const plans = this.getPlans();
    const planMap = new Map(plans.map((p) => [p.id, p]));

    // Check expiration dynamically
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);

    return members.map((m) => {
      let status = m.status;
      if (m.end_date) {
        const endDate = new Date(m.end_date);
        const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          status = 'expired';
        } else if (diffDays <= 7) {
          status = 'expiring';
        } else {
          status = 'active';
        }
      }
      return {
        ...m,
        status,
        plan: planMap.get(m.membership_plan_id),
      };
    });
  }

  static getMemberById(id: string): Member | undefined {
    return this.getMembers().find((m) => m.id === id);
  }

  static addMember(
    data: Omit<Member, 'id' | 'admin_id' | 'created_at' | 'updated_at' | 'status'>
  ): Member {
    const members = getStoredItem<Member[]>(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS);
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);
    const endDate = new Date(data.end_date);
    const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let status: Member['status'] = 'active';
    if (diffDays < 0) status = 'expired';
    else if (diffDays <= 7) status = 'expiring';

    const newMember: Member = {
      ...data,
      id: `mem_${Date.now()}`,
      admin_id: this.getProfile().id,
      status,
      created_at: new Date().toISOString(),
    };

    const updated = [newMember, ...members];
    setStoredItem(STORAGE_KEYS.MEMBERS, updated);

    // If an initial plan was selected, record the payment automatically if desired
    const plans = this.getPlans();
    const plan = plans.find((p) => p.id === data.membership_plan_id);
    if (plan) {
      this.addPayment({
        member_id: newMember.id,
        membership_plan_id: plan.id,
        amount: plan.price,
        payment_date: data.start_date || todayStr,
        payment_method: 'Cash',
        payment_status: 'completed',
        notes: `Initial registration fee for ${plan.name}`,
      });
    }

    return newMember;
  }

  static updateMember(id: string, updates: Partial<Member>): Member {
    const members = getStoredItem<Member[]>(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS);
    const index = members.findIndex((m) => m.id === id);
    if (index === -1) throw new Error('Member not found');

    const updatedMember = {
      ...members[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    members[index] = updatedMember;
    setStoredItem(STORAGE_KEYS.MEMBERS, members);
    return updatedMember;
  }

  static deleteMember(id: string): void {
    const members = getStoredItem<Member[]>(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS);
    const filtered = members.filter((m) => m.id !== id);
    setStoredItem(STORAGE_KEYS.MEMBERS, filtered);
  }

  // 4. Payments
  static getPayments(): Payment[] {
    const payments = getStoredItem<Payment[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
    const members = this.getMembers();
    const plans = this.getPlans();

    const memberMap = new Map(members.map((m) => [m.id, m]));
    const planMap = new Map(plans.map((p) => [p.id, p]));

    return payments.map((p) => ({
      ...p,
      member: memberMap.get(p.member_id),
      plan: p.membership_plan_id ? planMap.get(p.membership_plan_id) : undefined,
    }));
  }

  static addPayment(
    data: Omit<Payment, 'id' | 'admin_id' | 'created_at'>
  ): Payment {
    const payments = getStoredItem<Payment[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
    const newPayment: Payment = {
      ...data,
      id: `pay_${Date.now()}`,
      admin_id: this.getProfile().id,
      created_at: new Date().toISOString(),
    };
    const updated = [newPayment, ...payments];
    setStoredItem(STORAGE_KEYS.PAYMENTS, updated);
    return newPayment;
  }

  // 5. Expenses
  static getExpenses(): Expense[] {
    return getStoredItem<Expense[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
  }

  static addExpense(
    data: Omit<Expense, 'id' | 'admin_id' | 'created_at' | 'updated_at'>
  ): Expense {
    const expenses = getStoredItem<Expense[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    const newExpense: Expense = {
      ...data,
      id: `exp_${Date.now()}`,
      admin_id: this.getProfile().id,
      created_at: new Date().toISOString(),
    };
    const updated = [newExpense, ...expenses];
    setStoredItem(STORAGE_KEYS.EXPENSES, updated);
    return newExpense;
  }

  static updateExpense(id: string, updates: Partial<Expense>): Expense {
    const expenses = getStoredItem<Expense[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    const index = expenses.findIndex((e) => e.id === id);
    if (index === -1) throw new Error('Expense not found');

    const updatedExpense = {
      ...expenses[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    expenses[index] = updatedExpense;
    setStoredItem(STORAGE_KEYS.EXPENSES, expenses);
    return updatedExpense;
  }

  static deleteExpense(id: string): void {
    const expenses = getStoredItem<Expense[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    const filtered = expenses.filter((e) => e.id !== id);
    setStoredItem(STORAGE_KEYS.EXPENSES, filtered);
  }

  // 6. Reset to seed data
  static resetToSeedData(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
    localStorage.removeItem(STORAGE_KEYS.MEMBERS);
    localStorage.removeItem(STORAGE_KEYS.PLANS);
    localStorage.removeItem(STORAGE_KEYS.PAYMENTS);
    localStorage.removeItem(STORAGE_KEYS.EXPENSES);
  }

  // 7. Dashboard Financial KPI Calculation
  static getDashboardKPIs(timeframe: 'this-month' | 'last-month' | 'last-3-months' | 'last-6-months' | 'this-year' = 'this-month'): DashboardKPIs {
    const members = this.getMembers();
    const payments = this.getPayments();
    const expenses = this.getExpenses();

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0 to 11

    const thisMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

    let filteredPayments = payments.filter((p) => p.payment_status === 'completed');
    let filteredExpenses = expenses;
    let label = 'This Month';

    if (timeframe === 'last-month') {
      label = 'Last Month';
      filteredPayments = filteredPayments.filter((p) => (p.payment_date || '').startsWith(lastMonthKey));
      filteredExpenses = filteredExpenses.filter((e) => (e.expense_date || '').startsWith(lastMonthKey));
    } else if (timeframe === 'this-month') {
      label = 'This Month';
      filteredPayments = filteredPayments.filter((p) => (p.payment_date || '').startsWith(thisMonthKey) || !p.payment_date);
      filteredExpenses = filteredExpenses.filter((e) => (e.expense_date || '').startsWith(thisMonthKey) || !e.expense_date);
    } else if (timeframe === 'last-3-months') {
      label = 'Last 3 Months';
    } else if (timeframe === 'last-6-months') {
      label = 'Last 6 Months';
    } else if (timeframe === 'this-year') {
      label = 'Year to Date';
      filteredPayments = filteredPayments.filter((p) => (p.payment_date || '').startsWith(`${currentYear}-`));
      filteredExpenses = filteredExpenses.filter((e) => (e.expense_date || '').startsWith(`${currentYear}-`));
    }

    const totalRevenue = filteredPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

    const activeMembers = members.filter((m) => m.status === 'active').length;
    const expiringMemberships = members.filter((m) => m.status === 'expiring').length;
    const expiredMemberships = members.filter((m) => m.status === 'expired').length;
    const totalMembers = activeMembers + expiringMemberships + expiredMemberships;
    const renewalRate = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 1000) / 10 : 0;

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      activeMembers,
      expiringMemberships,
      expiredMemberships,
      renewalRate,
      profitMargin,
      periodLabel: label,
    };
  }

  // 8. Monthly Trends for Charts
  static getMonthlyTrends(): MonthlyTrendData[] {
    const payments = this.getPayments();
    const expenses = this.getExpenses();
    const members = this.getMembers();

    const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
    const monthKeys = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];

    return months.map((month, idx) => {
      const key = monthKeys[idx];
      const revenue = payments
        .filter((p) => p.payment_status === 'completed' && (p.payment_date || '').startsWith(key))
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const expenseTotal = expenses
        .filter((e) => (e.expense_date || '').startsWith(key))
        .reduce((sum, e) => sum + Number(e.amount), 0);
      const memberCount = members.filter((m) => (m.start_date || '') <= `${key}-31`).length;

      return {
        month,
        monthKey: key,
        revenue,
        expenses: expenseTotal,
        profit: revenue - expenseTotal,
        memberCount,
      };
    });
  }
}
