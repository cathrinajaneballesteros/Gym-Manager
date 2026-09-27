import React from 'react';
import { MemberList } from '@/components/members/MemberList';

export const metadata = {
  title: 'Members Management | Smart Gym Finance Manager',
  description: 'Manage gym members, renewals, and expiration schedules',
};

export default function MembersPage() {
  return <MemberList />;
}
