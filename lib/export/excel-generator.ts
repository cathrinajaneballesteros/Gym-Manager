import * as XLSX from 'xlsx';
import { DashboardKPIs, MonthlyTrendData, Expense, Member, Payment } from '@/types/database';
import { getPaymentMemberName } from '@/lib/ui/format';
import { getTodayKey } from '@/lib/ui/date';

interface ExcelReportOptions {
  gymName: string;
  currency: string;
  reportPeriod: string;
  kpis: DashboardKPIs;
  trends: MonthlyTrendData[];
  expenses: Expense[];
  members: Member[];
  payments: Payment[];
}

export function generateFinancialExcelReport(options: ExcelReportOptions): void {
  const { gymName, currency, reportPeriod, kpis, trends, expenses, members, payments } = options;

  const workbook = XLSX.utils.book_new();

  // 1. Executive Summary Sheet
  const summaryData = [
    ['SMART GYM FINANCE MANAGER - EXECUTIVE SUMMARY'],
    ['Gym Name', gymName],
    ['Report Period', reportPeriod],
    ['Generated On', getTodayKey()],
    ['Currency', currency],
    [],
    ['KEY PERFORMANCE INDICATORS', 'VALUE', 'REMARKS'],
    ['Total Revenue', kpis.totalRevenue, 'All recorded membership dues and payments'],
    ['Total Expenses', kpis.totalExpenses, 'Operational facilities, staff, and overhead'],
    ['Net Profit (EBITDA)', kpis.netProfit, kpis.netProfit >= 0 ? 'Surplus' : 'Deficit'],
    ['Profit Margin (%)', `${kpis.profitMargin}%`, 'Operating efficiency ratio'],
    ['Active Memberships', kpis.activeMembers, 'Current active subscribers'],
    ['Expiring Memberships', kpis.expiringMemberships, 'Due for renewal within 7-14 days'],
    ['Expired Memberships', kpis.expiredMemberships, 'Lapsed subscriptions'],
    ['Renewal Retention Rate (%)', `${kpis.renewalRate}%`, 'Percentage of members renewing'],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');

  // 2. Monthly P&L Trend Sheet
  const pnlHeaders = ['Month / Period', 'Revenue', 'Operating Expenses', 'Net Profit', 'Active Members'];
  const pnlRows = trends.map((t) => [
    t.monthKey,
    t.revenue,
    t.expenses,
    t.profit,
    t.memberCount,
  ]);
  const pnlSheet = XLSX.utils.aoa_to_sheet([pnlHeaders, ...pnlRows]);
  XLSX.utils.book_append_sheet(workbook, pnlSheet, 'Profit & Loss');

  // 3. Operational Expenses Sheet
  const expenseHeaders = ['Expense ID', 'Date', 'Category', 'Description', 'Amount', 'Payment Method'];
  const expenseRows = expenses.map((e) => [
    e.id,
    e.expense_date,
    e.category,
    e.title,
    Number(e.amount),
    e.payment_method,
  ]);
  const expenseSheet = XLSX.utils.aoa_to_sheet([expenseHeaders, ...expenseRows]);
  XLSX.utils.book_append_sheet(workbook, expenseSheet, 'Expenses');

  // 4. Membership Payments Sheet
  const paymentHeaders = ['Payment ID', 'Member ID', 'Member', 'Date', 'Amount', 'Method', 'Status', 'Ref No.', 'Notes'];
  const paymentRows = payments.map((p) => [
    p.id,
    p.member_id,
    getPaymentMemberName(p),
    p.payment_date,
    Number(p.amount),
    p.payment_method,
    p.payment_status,
    p.reference_number || 'N/A',
    p.notes || '',
  ]);
  const paymentSheet = XLSX.utils.aoa_to_sheet([paymentHeaders, ...paymentRows]);
  XLSX.utils.book_append_sheet(workbook, paymentSheet, 'Payments');

  // 5. Active & Expiring Members Sheet
  const memberHeaders = ['Member ID', 'Name', 'Email', 'Phone', 'Plan', 'Start Date', 'Expiration Date', 'Status', 'Last Visit'];
  const memberRows = members.map((m) => [
    m.id,
    `${m.first_name} ${m.last_name}`,
    m.email,
    m.phone,
    m.plan?.name || 'N/A',
    m.start_date,
    m.end_date,
    m.status,
    m.last_visit_date || 'N/A',
  ]);
  const memberSheet = XLSX.utils.aoa_to_sheet([memberHeaders, ...memberRows]);
  XLSX.utils.book_append_sheet(workbook, memberSheet, 'Member Directory');

  // Write file
  const filename = `${gymName.toLowerCase().replace(/\s+/g, '-')}-finance-${reportPeriod.replace(/\s+/g, '-')}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
