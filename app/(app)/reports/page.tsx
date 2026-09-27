import React from 'react';
import { ReportsView } from '@/components/reports/ReportsView';

export const metadata = {
  title: 'Financial Reports & P&L | Smart Gym Finance Manager',
  description: 'Downloadable Profit & Loss statements, monthly summaries, and PDF/Excel exports',
};

export default function ReportsPage() {
  return <ReportsView />;
}
