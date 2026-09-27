import React from 'react';
import { MemberDetailView } from '@/components/members/MemberDetailView';

export const metadata = {
  title: 'Member Profile | Smart Gym Finance Manager',
  description: 'View member profile, payment history, and churn risk evaluation',
};

interface MemberPageProps {
  params: Promise<{ id: string }>;
}

export default async function MemberDetailPage({ params }: MemberPageProps) {
  const resolvedParams = await params;
  return <MemberDetailView memberId={resolvedParams.id} />;
}
