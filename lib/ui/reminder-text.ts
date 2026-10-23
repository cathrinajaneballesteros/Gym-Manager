import { formatDisplayDate, getManilaDateKey } from '@/lib/ui/date';

/** True when the due date has passed, so the reminder asks a lapsed member to come back instead of renewing early. */
export function hasMembershipEnded(dueDate: string): boolean {
  return dueDate < getManilaDateKey();
}

/** The reminder SMS text. Shared by the preview in the app and the server that sends it, so they always match. */
export function buildReminderSms(options: {
  gymName: string;
  memberName: string;
  planName: string;
  amount: string;
  dueDate: string;
  note?: string;
  gymPhone?: string;
}): string {
  const { gymName, memberName, planName, amount, dueDate, note, gymPhone } = options;
  const firstName = memberName.trim().split(/\s+/)[0] || 'Member';
  const contact = gymPhone?.trim() ? ` Questions? Call ${gymPhone.trim()}.` : '';
  if (hasMembershipEnded(dueDate)) {
    const extra = note?.trim() ? ` ${note.trim()}` : ' Renew anytime at the front desk (Cash) or via GCash. See you soon!';
    return `[${gymName}] Hi ${firstName}! We miss you. Your ${planName} ended on ${formatDisplayDate(dueDate)} (renewal is ${amount}).${extra}${contact}`;
  }
  const extra = note?.trim() ? ` ${note.trim()}` : ' Please renew at the front desk (Cash) or via GCash. Stay strong!';
  return `[${gymName}] Hi ${firstName}! Friendly reminder that your ${planName} renewal (${amount}) is due on ${formatDisplayDate(dueDate)}.${extra}${contact}`;
}
