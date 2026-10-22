import React from 'react';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';

export const metadata = {
  title: 'Financial Dashboard | Smart Gym Finance Manager',
  description: 'Revenue, expenses, profit and member numbers',
};

export default function DashboardPage() {
  return <DashboardOverview />;
}
