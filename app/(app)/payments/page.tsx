import React from 'react';
import { PaymentList } from '@/components/payments/PaymentList';

export const metadata = {
  title: 'Payment Tracking | Smart Gym Finance Manager',
  description: 'Track member payments, receipts, and payment methods',
};

export default function PaymentsPage() {
  return <PaymentList />;
}
