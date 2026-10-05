import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DashboardKPIs, MonthlyTrendData, Expense } from '@/types/database';

interface PDFReportOptions {
  gymName: string;
  currency: string;
  reportPeriod: string;
  kpis: DashboardKPIs;
  trends: MonthlyTrendData[];
  expenses: Expense[];
}

export function generateFinancialPDFReport(options: PDFReportOptions): void {
  const { gymName, currency, reportPeriod, kpis, trends, expenses } = options;
  const pdfCurrency = currency === '₱' ? 'PHP ' : currency;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(gymName.toUpperCase(), 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('SMART GYM FINANCIAL MANAGEMENT SYSTEM • OFFICIAL REPORT', 14, 25);
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}`, 14, 32);

  // Report Period Badge
  doc.setFillColor(37, 99, 235); // blue-600
  doc.roundedRect(pageWidth - 65, 12, 51, 16, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTING PERIOD', pageWidth - 60, 18);
  doc.setFontSize(9);
  doc.text(reportPeriod, pageWidth - 60, 24);

  // 2. Executive KPI Summary Cards
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Financial Performance Summary', 14, 50);

  const kpiData = [
    ['Metric', 'Amount / Value', 'Analysis / Status'],
    ['Total Gross Revenue', `${pdfCurrency}${kpis.totalRevenue.toLocaleString()}`, 'All membership collections'],
    ['Total Operating Expenses', `${pdfCurrency}${kpis.totalExpenses.toLocaleString()}`, 'Rent, utilities, staff, upkeep'],
    ['Net Profit (EBITDA)', `${pdfCurrency}${kpis.netProfit.toLocaleString()}`, kpis.netProfit >= 0 ? 'Profitable (Positive Return)' : 'Deficit'],
    ['Operating Profit Margin', `${kpis.profitMargin}%`, 'Target benchmark > 15%'],
    ['Active Member Community', `${kpis.activeMembers} Members`, `${kpis.renewalRate}% renewal rate`],
    ['Expiring Memberships', `${kpis.expiringMemberships} Members`, 'Next 7-14 day renewal queue'],
  ];

  autoTable(doc, {
    startY: 54,
    head: [kpiData[0]],
    body: kpiData.slice(1),
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // 3. Monthly Profit & Loss Trend Table
  // @ts-expect-error autoTable adds lastAutoTable to doc instance
  const nextY1 = (doc.lastAutoTable?.finalY || 100) + 12;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Monthly Revenue vs. Expense Breakdown (P&L)', 14, nextY1);

  const monthlyRows = trends.map((t) => [
    t.monthKey,
    `${pdfCurrency}${t.revenue.toLocaleString()}`,
    `${pdfCurrency}${t.expenses.toLocaleString()}`,
    `${pdfCurrency}${t.profit.toLocaleString()}`,
    `${t.memberCount} members`,
  ]);

  autoTable(doc, {
    startY: nextY1 + 4,
    head: [['Period', 'Gross Revenue', 'Expenses', 'Net Profit', 'Total Members']],
    body: monthlyRows,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 2.8 },
  });

  // 4. Expense Categorization Summary
  // @ts-expect-error autoTable adds lastAutoTable to doc instance
  const nextY2 = (doc.lastAutoTable?.finalY || 180) + 12;

  if (nextY2 < 230) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Recent Operational Expenses', 14, nextY2);

    const expenseRows = expenses.slice(0, 5).map((e) => [
      e.expense_date,
      e.category,
      e.title,
      e.payment_method,
      `${pdfCurrency}${Number(e.amount).toLocaleString()}`,
    ]);

    autoTable(doc, {
      startY: nextY2 + 4,
      head: [['Date', 'Category', 'Expense Description', 'Payment Method', 'Amount']],
      body: expenseRows,
      theme: 'grid',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2.5 },
    });
  }

  // Footer Disclaimer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'CONFIDENTIAL • Prepared by Smart Gym Finance Manager • For internal administrative audit and accounting use only.',
    14,
    285
  );

  // Trigger browser download
  const filename = `${gymName.toLowerCase().replace(/\s+/g, '-')}-financial-report-${reportPeriod.replace(/\s+/g, '-')}.pdf`;
  doc.save(filename);
}
