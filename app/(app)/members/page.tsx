import React, { Suspense } from 'react';
import { MemberList } from '@/components/members/MemberList';

export const metadata = {
  title: 'Members Management | Smart Gym Finance Manager',
  description: 'Manage gym members, renewals, and expiration schedules',
};

// MemberList reads ?status= in the browser; Suspense lets this page be prebuilt instead of rendered per visit.
export default function MembersPage() {
  return (
    <Suspense fallback={null}>
      <MemberList />
    </Suspense>
  );
}
