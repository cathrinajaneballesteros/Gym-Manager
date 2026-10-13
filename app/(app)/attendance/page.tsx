import React from 'react';
import { AttendanceView } from '@/components/attendance/AttendanceView';

export const metadata = {
  title: 'Attendance | Smart Gym Finance Manager',
  description: 'Check members in and track who has stopped coming',
};

export default function AttendancePage() {
  return <AttendanceView />;
}
