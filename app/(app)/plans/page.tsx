import React from 'react';
import { PlansView } from '@/components/plans/PlansView';

export const metadata = {
  title: 'Membership Plans | Smart Gym Finance Manager',
  description: 'Create and review the membership tiers members can subscribe to',
};

export default function PlansPage() {
  return <PlansView />;
}
