import React from 'react';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';

export const metadata = {
  title: 'Financial Dashboard | Smart Gym Finance Manager',
  description: 'Real-time telemetry, revenue, expenses, profit and member metrics',
};

export default function DashboardPage() {
  return <DashboardOverview />;
}
