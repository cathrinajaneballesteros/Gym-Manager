import React from 'react';
import { MemberList } from '@/components/members/MemberList';

export const metadata = {
  title: 'Members Management | Smart Gym Finance Manager',
  description: 'Manage gym members, renewals, and expiration schedules',
};

// Statuses the Members page filter can show (e.g. /members?status=expiring).
const STATUS_FILTERS = ['pending', 'active', 'expiring', 'expired'];

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { status } = await searchParams;
  const initialStatus = typeof status === 'string' && STATUS_FILTERS.includes(status) ? status : 'all';
  return <MemberList initialStatus={initialStatus} />;
}
