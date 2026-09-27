import React from 'react';
import { SettingsView } from '@/components/settings/SettingsView';

export const metadata = {
  title: 'Settings & Profile | Smart Gym Finance Manager',
  description: 'Administrator account settings, gym profile, and database configuration',
};

export default function SettingsPage() {
  return <SettingsView />;
}
