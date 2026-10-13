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
  const extra = note?.trim() ? ` ${note.trim()}` : ' Please renew at the front desk (Cash) or via GCash. Stay strong!';
  const contact = gymPhone?.trim() ? ` Questions? Call ${gymPhone.trim()}.` : '';
  return `[${gymName}] Hi ${firstName}! Friendly reminder that your ${planName} renewal (${amount}) is due on ${dueDate}.${extra}${contact}`;
}
