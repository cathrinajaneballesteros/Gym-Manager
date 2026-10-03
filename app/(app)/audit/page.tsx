import React from 'react';
import { AuditLogView } from '@/components/audit/AuditLogView';

export const metadata = {
  title: 'Audit Log | Smart Gym Finance Manager',
  description: 'Administrator activity audit trail for members, payments, expenses, and authentication',
};

export default function AuditLogPage() {
  return <AuditLogView />;
}
