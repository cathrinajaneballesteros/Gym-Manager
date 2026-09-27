import React from 'react';
import { ExpenseList } from '@/components/expenses/ExpenseList';

export const metadata = {
  title: 'Expense Management | Smart Gym Finance Manager',
  description: 'Manage gym operational expenses, bills, rent, and trainer payroll',
};

export default function ExpensesPage() {
  return <ExpenseList />;
}
