'use client';

import {
  Member,
  PaymentMethod,
  MemberStatus,
  MembershipPlan,
  Payment,
  Expense,
  UserProfile,
  DashboardKPIs,
  MonthlyTrendData,
  AuditLogEntry,
} from '@/types/database';
import {
  INITIAL_PROFILE,
  INITIAL_PLANS,
  INITIAL_MEMBERS,
  INITIAL_PAYMENTS,
  INITIAL_EXPENSES,
} from './mock-data';

/** Only Cash and GCash are supported; anything else (legacy data) is treated as Cash. */
const normalizeMethod = (method: string | undefined): PaymentMethod =>
  method === 'GCash' ? 'GCash' : 'Cash';

const STORAGE_KEYS = {
  PROFILE: 'sgfm_profile_clean',
  MEMBERS: 'sgfm_members_clean',
  PLANS: 'sgfm_plans_clean',
  PAYMENTS: 'sgfm_payments_clean',
  EXPENSES: 'sgfm_expenses_clean',
  AUDIT: 'sgfm_audit_log_clean',
};

const MAX_AUDIT_ENTRIES = 1000;

// Clear legacy sample data and previous demo sessions for a completely clean slate
if (typeof window !== 'undefined') {
  try {
    if (!localStorage.getItem('sgfm_fresh_slate_v4')) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('sgfm_')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem('sgfm_fresh_slate_v4', 'true');
    }
    // Hard reset all legacy example members and payments
    if (!localStorage.getItem('sgfm_purge_legacy_mock_all_v2')) {
      localStorage.setItem(STORAGE_KEYS.MEMBERS, '[]');
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, '[]');
      localStorage.setItem(STORAGE_KEYS.AUDIT, '[]');
      localStorage.removeItem(STORAGE_KEYS.EXPENSES);
      localStorage.setItem('sgfm_purge_legacy_mock_all_v2', 'true');
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

// Derive the most recent N month buckets, ending with the current month.
function getRecentMonthBuckets(count: number): { month: string; monthKey: string }[] {
  const now = new Date();
  const buckets: { month: string; monthKey: string }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      month: d.toLocaleString('en-US', { month: 'short' }),
      monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    });
  }
  return buckets;
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
    const changed = Object.keys(updates).filter(
      (k) => (current as unknown as Record<string, unknown>)[k] !== (updates as Record<string, unknown>)[k]
    );
    if (changed.length > 0) {
      this.recordAudit({
        action: 'settings.update',
        entity_type: 'settings',
        entity_id: updated.id,
        entity_label: updated.gym_name || updated.email || 'Settings',
        metadata: { changed: changed.join(', ') },
      });
    }
    return updated;
  }

  // 1b. User Audit Trail
  static getAuditLogs(): AuditLogEntry[] {
    const rawLogs = getStoredItem<AuditLogEntry[]>(STORAGE_KEYS.AUDIT, []);
    const logs = rawLogs.filter(
      (l) =>
        !l.entity_id ||
        !['mem_1', 'mem_2', 'mem_3', 'mem_4', 'mem_5', 'pay_101', 'pay_102', 'pay_103', 'pay_104', 'pay_105'].includes(l.entity_id)
    );
    if (logs.length !== rawLogs.length) {
      setStoredItem(STORAGE_KEYS.AUDIT, logs);
    }
    return logs;
  }

  static recordAudit(
    input: Omit<AuditLogEntry, 'id' | 'admin_id' | 'actor_email' | 'created_at'>
  ): AuditLogEntry {
    const profile = this.getProfile();
    const entry: AuditLogEntry = {
      ...input,
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      admin_id: profile.id,
      actor_email: profile.email,
      created_at: new Date().toISOString(),
    };
    const logs = getStoredItem<AuditLogEntry[]>(STORAGE_KEYS.AUDIT, []);
    setStoredItem(STORAGE_KEYS.AUDIT, [entry, ...logs].slice(0, MAX_AUDIT_ENTRIES));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sgfm_audit_updated', { detail: entry }));
    }
    return entry;
  }

  private static memberLabel(member?: Member): string {
    if (!member) return 'Unknown member';
    return `${member.first_name} ${member.last_name}`.trim() || member.id;
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
    const rawMembers = getStoredItem<Member[]>(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS);
    // Sanitize: eliminate any legacy example members (mem_1 ... mem_5)
    const members = rawMembers.filter(
      (m) => !['mem_1', 'mem_2', 'mem_3', 'mem_4', 'mem_5'].includes(m.id)
    );
    if (members.length !== rawMembers.length) {
      setStoredItem(STORAGE_KEYS.MEMBERS, members);
    }
    const plans = this.getPlans();
    const planMap = new Map(plans.map((p) => [p.id, p]));

    // Check expiration and payment presence dynamically
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);

    const rawPayments = getStoredItem<Payment[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
    const validPayments = rawPayments.filter(
      (p) =>
        !['pay_101', 'pay_102', 'pay_103', 'pay_104', 'pay_105'].includes(p.id) &&
        !p.reference_number?.startsWith('REG-')
    );
    const memberIdsWithPayments = new Set(validPayments.map((p) => p.member_id));

    return members.map((m) => {
      let status: MemberStatus = m.status;

      // If the member is not on the payment list yet, mark as pending (waiting to get listed on payments)
      if (!memberIdsWithPayments.has(m.id)) {
        status = 'pending';
      } else if (m.end_date) {
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
    
    // Newly registered member starts as pending until recorded on payments page
    const status: Member['status'] = 'pending';

    const newMember: Member = {
      ...data,
      id: `mem_${Date.now()}`,
      admin_id: this.getProfile().id,
      status,
      created_at: new Date().toISOString(),
    };

    const updated = [newMember, ...members];
    setStoredItem(STORAGE_KEYS.MEMBERS, updated);

    this.recordAudit({
      action: 'member.create',
      entity_type: 'member',
      entity_id: newMember.id,
      entity_label: this.memberLabel(newMember),
      metadata: {
        plan_id: newMember.membership_plan_id,
        start_date: newMember.start_date,
        end_date: newMember.end_date,
      },
    });

    return newMember;
  }

  static updateMember(id: string, updates: Partial<Member>): Member {
    const members = getStoredItem<Member[]>(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS);
    const index = members.findIndex((m) => m.id === id);
    if (index === -1) throw new Error('Member not found');

    const previous = members[index];
    const updatedMember = {
      ...previous,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    members[index] = updatedMember;
    setStoredItem(STORAGE_KEYS.MEMBERS, members);

    const changed = Object.keys(updates).filter(
      (key) =>
        (previous as unknown as Record<string, unknown>)[key] !==
        (updates as Record<string, unknown>)[key]
    );
    this.recordAudit({
      action: 'member.update',
      entity_type: 'member',
      entity_id: id,
      entity_label: this.memberLabel(updatedMember),
      metadata: { changed: changed.join(', ') || 'none' },
    });

    return updatedMember;
  }

  static deleteMember(id: string): void {
    const members = getStoredItem<Member[]>(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS);
    const member = members.find((m) => m.id === id);
    const filtered = members.filter((m) => m.id !== id);
    setStoredItem(STORAGE_KEYS.MEMBERS, filtered);

    // Clean up payments for this deleted member
    const payments = getStoredItem<Payment[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
    const remainingPayments = payments.filter((p) => p.member_id !== id);
    setStoredItem(STORAGE_KEYS.PAYMENTS, remainingPayments);

    this.recordAudit({
      action: 'member.delete',
      entity_type: 'member',
      entity_id: id,
      entity_label: this.memberLabel(member),
    });
  }

  // 4. Payments
  static getPayments(): Payment[] {
    const rawPayments = getStoredItem<Payment[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
    // Sanitize: eliminate any legacy example payments (pay_101 ... pay_105) and any auto-created REG payments
    const payments = rawPayments
      .filter(
        (p) =>
          !['pay_101', 'pay_102', 'pay_103', 'pay_104', 'pay_105'].includes(p.id) &&
          !p.reference_number?.startsWith('REG-')
      )
      .map((p) => ({ ...p, payment_method: normalizeMethod(p.payment_method) }));
    if (
      payments.length !== rawPayments.length ||
      rawPayments.some((p) => p.payment_method !== normalizeMethod(p.payment_method))
    ) {
      setStoredItem(STORAGE_KEYS.PAYMENTS, payments);
    }
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
      receipt_status: data.receipt_status || (data.payment_method === 'Cash' ? 'verified' : 'unverified'),
      created_at: new Date().toISOString(),
    };
    const updated = [newPayment, ...payments];
    setStoredItem(STORAGE_KEYS.PAYMENTS, updated);

    const member = this.getMemberById(newPayment.member_id);
    const currency = this.getProfile().currency || '';
    this.recordAudit({
      action: 'payment.create',
      entity_type: 'payment',
      entity_id: newPayment.id,
      entity_label: `${this.memberLabel(member)} · ${currency}${Number(newPayment.amount).toLocaleString()}`,
      metadata: {
        amount: Number(newPayment.amount),
        method: newPayment.payment_method,
        status: newPayment.payment_status,
        receipt_status: newPayment.receipt_status || 'unverified',
        member_id: newPayment.member_id,
      },
    });

    return newPayment;
  }

  static updatePayment(id: string, updates: Partial<Payment>): Payment {
    const payments = getStoredItem<Payment[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
    const index = payments.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Payment not found');

    const previous = payments[index];
    const updatedPayment: Payment = {
      ...previous,
      ...updates,
    };
    payments[index] = updatedPayment;
    setStoredItem(STORAGE_KEYS.PAYMENTS, payments);

    this.recordAudit({
      action: 'payment.update',
      entity_type: 'payment',
      entity_id: id,
      entity_label: `Payment #${updatedPayment.reference_number || id}`,
      metadata: {
        payment_status: updatedPayment.payment_status,
        amount: Number(updatedPayment.amount),
        receipt_status: updatedPayment.receipt_status || 'unverified',
      },
    });

    return updatedPayment;
  }

  static verifyPaymentReceipt(id: string, options?: { notes?: string }): Payment {
    const profile = this.getProfile();
    const payments = getStoredItem<Payment[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
    const index = payments.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Payment not found');

    const current = payments[index];
    const updatedPayment: Payment = {
      ...current,
      payment_status: 'completed',
      receipt_status: 'verified',
      verified_at: new Date().toISOString(),
      verified_by: profile.full_name || profile.email || 'Admin',
      receipt_notes: options?.notes || current.receipt_notes,
    };
    payments[index] = updatedPayment;
    setStoredItem(STORAGE_KEYS.PAYMENTS, payments);

    const member = this.getMemberById(updatedPayment.member_id);
    const currency = profile.currency || '₱';

    this.recordAudit({
      action: 'payment.receipt_verify',
      entity_type: 'payment',
      entity_id: id,
      entity_label: `${this.memberLabel(member)} · ${currency}${Number(updatedPayment.amount).toLocaleString()}`,
      metadata: {
        receipt_status: 'verified',
        reference_number: updatedPayment.reference_number || '',
        verified_by: updatedPayment.verified_by || 'Admin',
        notes: options?.notes || '',
      },
    });

    return updatedPayment;
  }

  static rejectPaymentReceipt(id: string, reason: string): Payment {
    const profile = this.getProfile();
    const payments = getStoredItem<Payment[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
    const index = payments.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Payment not found');

    const current = payments[index];
    const updatedPayment: Payment = {
      ...current,
      payment_status: 'pending',
      receipt_status: 'rejected',
      verified_at: new Date().toISOString(),
      verified_by: profile.full_name || profile.email || 'Admin',
      rejection_reason: reason,
    };
    payments[index] = updatedPayment;
    setStoredItem(STORAGE_KEYS.PAYMENTS, payments);

    const member = this.getMemberById(updatedPayment.member_id);
    const currency = profile.currency || '₱';

    this.recordAudit({
      action: 'payment.receipt_reject',
      entity_type: 'payment',
      entity_id: id,
      entity_label: `${this.memberLabel(member)} · ${currency}${Number(updatedPayment.amount).toLocaleString()}`,
      metadata: {
        receipt_status: 'rejected',
        payment_status: 'pending',
        reference_number: current.reference_number || '',
        rejection_reason: reason,
        verified_by: updatedPayment.verified_by || 'Admin',
      },
    });

    return updatedPayment;
  }

  static deletePayment(id: string): void {
    const payments = getStoredItem<Payment[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
    const payment = payments.find((p) => p.id === id);
    const filtered = payments.filter((p) => p.id !== id);
    setStoredItem(STORAGE_KEYS.PAYMENTS, filtered);

    this.recordAudit({
      action: 'payment.delete',
      entity_type: 'payment',
      entity_id: id,
      entity_label: `Payment #${payment?.reference_number || id}`,
      metadata: { amount: payment?.amount || 0 },
    });
  }

  // 5. Expenses
  static getExpenses(): Expense[] {
    const rawExpenses = getStoredItem<Expense[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    // Sanitize: eliminate any legacy mock expenses
    const expenses = rawExpenses
      .filter((e) => !e.id.startsWith('exp_curr_') && !e.id.startsWith('exp_hist'))
      .map((e) => ({ ...e, payment_method: normalizeMethod(e.payment_method) }));
    if (
      expenses.length !== rawExpenses.length ||
      rawExpenses.some((e) => e.payment_method !== normalizeMethod(e.payment_method))
    ) {
      setStoredItem(STORAGE_KEYS.EXPENSES, expenses);
    }
    return expenses;
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

    const currency = this.getProfile().currency || '';
    this.recordAudit({
      action: 'expense.create',
      entity_type: 'expense',
      entity_id: newExpense.id,
      entity_label: `${newExpense.title} · ${currency}${Number(newExpense.amount).toLocaleString()}`,
      metadata: {
        category: newExpense.category,
        amount: Number(newExpense.amount),
      },
    });

    return newExpense;
  }

  static updateExpense(id: string, updates: Partial<Expense>): Expense {
    const expenses = getStoredItem<Expense[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    const index = expenses.findIndex((e) => e.id === id);
    if (index === -1) throw new Error('Expense not found');

    const previous = expenses[index];
    const updatedExpense = {
      ...previous,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    expenses[index] = updatedExpense;
    setStoredItem(STORAGE_KEYS.EXPENSES, expenses);

    const changed = Object.keys(updates).filter(
      (key) =>
        (previous as unknown as Record<string, unknown>)[key] !==
        (updates as Record<string, unknown>)[key]
    );
    this.recordAudit({
      action: 'expense.update',
      entity_type: 'expense',
      entity_id: id,
      entity_label: updatedExpense.title || id,
      metadata: { changed: changed.join(', ') || 'none' },
    });

    return updatedExpense;
  }

  static deleteExpense(id: string): void {
    const expenses = getStoredItem<Expense[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    const expense = expenses.find((e) => e.id === id);
    const filtered = expenses.filter((e) => e.id !== id);
    setStoredItem(STORAGE_KEYS.EXPENSES, filtered);

    this.recordAudit({
      action: 'expense.delete',
      entity_type: 'expense',
      entity_id: id,
      entity_label: expense?.title || id,
    });
  }

  // 6. Reset to seed data
  static resetToSeedData(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
    localStorage.removeItem(STORAGE_KEYS.MEMBERS);
    localStorage.removeItem(STORAGE_KEYS.PLANS);
    localStorage.removeItem(STORAGE_KEYS.PAYMENTS);
    localStorage.removeItem(STORAGE_KEYS.EXPENSES);
    localStorage.removeItem(STORAGE_KEYS.AUDIT);
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
      filteredPayments = filteredPayments.filter((p) => (p.payment_date || '').startsWith(thisMonthKey));
      filteredExpenses = filteredExpenses.filter((e) => (e.expense_date || '').startsWith(thisMonthKey));
    } else if (timeframe === 'last-3-months' || timeframe === 'last-6-months') {
      const count = timeframe === 'last-3-months' ? 3 : 6;
      label = timeframe === 'last-3-months' ? 'Last 3 Months' : 'Last 6 Months';
      const monthKeys = getRecentMonthBuckets(count).map((b) => b.monthKey);
      filteredPayments = filteredPayments.filter((p) =>
        monthKeys.some((k) => (p.payment_date || '').startsWith(k))
      );
      filteredExpenses = filteredExpenses.filter((e) =>
        monthKeys.some((k) => (e.expense_date || '').startsWith(k))
      );
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
    const inactiveMembers = members.filter((m) => m.status === 'inactive').length;
    const pendingMembers = members.filter((m) => m.status === 'pending').length;
    const totalMembers = activeMembers + expiringMemberships + expiredMemberships + inactiveMembers + pendingMembers;
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

    const buckets = getRecentMonthBuckets(6);

    return buckets.map(({ month, monthKey }) => {
      const key = monthKey;
      const revenue = payments
        .filter((p) => p.payment_status === 'completed' && (p.payment_date || '').startsWith(key))
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const expenseTotal = expenses
        .filter((e) => (e.expense_date || '').startsWith(key))
        .reduce((sum, e) => sum + Number(e.amount), 0);
      const memberCount = members.filter((m) => (m.start_date || '') <= `${key}-31`).length;

      return {
        month,
        monthKey,
        revenue,
        expenses: expenseTotal,
        profit: revenue - expenseTotal,
        memberCount,
      };
    });
  }

  // 9. Historical Expense Analytics
  static getExpenseHistoryMonths(): { monthKey: string; monthLabel: string }[] {
    const expenses = this.getExpenses();
    const map = new Map<string, string>();

    // Always include current month and previous 5 months
    const recentBuckets = getRecentMonthBuckets(6);
    recentBuckets.forEach((b) => {
      const [y, m] = b.monthKey.split('-');
      const d = new Date(Number(y), Number(m) - 1, 1);
      map.set(b.monthKey, d.toLocaleString('en-US', { month: 'short', year: 'numeric' }));
    });

    // Also include any other month present in expense dates
    expenses.forEach((e) => {
      if (e.expense_date && e.expense_date.length >= 7) {
        const key = e.expense_date.slice(0, 7);
        if (!map.has(key)) {
          const [y, m] = key.split('-');
          const d = new Date(Number(y), Number(m) - 1, 1);
          map.set(key, d.toLocaleString('en-US', { month: 'short', year: 'numeric' }));
        }
      }
    });

    return Array.from(map.entries())
      .map(([monthKey, monthLabel]) => ({ monthKey, monthLabel }))
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }

  static getHistoricalExpenseSummary(): {
    categories: Record<string, { total: number; monthlyAvg: number; count: number; recentMonths: { month: string; amount: number }[] }>;
    monthlyTotals: { month: string; monthKey: string; total: number }[];
    overallMonthlyAverage: number;
  } {
    const expenses = this.getExpenses();
    const months = this.getExpenseHistoryMonths();
    const monthKeys = months.map((m) => m.monthKey).slice(0, 6);

    const monthlyTotals = monthKeys.map((key) => {
      const match = months.find((m) => m.monthKey === key);
      const total = expenses
        .filter((e) => (e.expense_date || '').startsWith(key))
        .reduce((sum, e) => sum + Number(e.amount), 0);
      return {
        monthKey: key,
        month: match ? match.monthLabel : key,
        total,
      };
    });

    const categories: Record<string, { total: number; monthlyAvg: number; count: number; recentMonths: { month: string; amount: number }[] }> = {};
    const catList = [
      'Rent', 'Utilities', 'Salaries', 'Equipment', 'Maintenance', 'Supplies', 'Marketing', 'Other'
    ];

    // Compute monthly average based on months that actually contain recorded expenses
    const recordedMonthKeys = monthKeys.filter((key) =>
      expenses.some((e) => (e.expense_date || '').startsWith(key))
    );
    const divisor = recordedMonthKeys.length || 1;

    catList.forEach((cat) => {
      const catExpenses = expenses.filter((e) => e.category === cat);
      const total = catExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const recentMonths = monthKeys.map((key) => {
        const match = months.find((m) => m.monthKey === key);
        const amount = catExpenses
          .filter((e) => (e.expense_date || '').startsWith(key))
          .reduce((sum, e) => sum + Number(e.amount), 0);
        return {
          month: match ? match.monthLabel : key,
          amount,
        };
      });

      categories[cat] = {
        total,
        monthlyAvg: Math.round(total / divisor),
        count: catExpenses.length,
        recentMonths,
      };
    });

    const overallTotal = monthlyTotals.reduce((sum, m) => sum + m.total, 0);
    const overallMonthlyAverage = Math.round(overallTotal / divisor);

    return {
      categories,
      monthlyTotals,
      overallMonthlyAverage,
    };
  }
}
