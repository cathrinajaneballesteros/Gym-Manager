import React from 'react';
import { CalendarView } from '@/components/calendar/CalendarView';

export const metadata = {
  title: 'Operations Calendar | Smart Gym Finance Manager',
  description: 'Calendar view of membership expirations, payment due dates, and operational cashflow',
};

export default function CalendarPage() {
  return <CalendarView />;
}
