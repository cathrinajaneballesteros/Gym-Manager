import type { Member, Payment } from '@/types/database';

// Formats an amount in a short form for tight spaces,
// e.g. 950 -> "₱950", 1500 -> "₱1.5k", 12400 -> "₱12k", -400 -> "-₱400".
export function formatCompactAmount(value: number, currency: string): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs < 1000) return `${sign}${currency}${Math.round(abs).toLocaleString()}`;
  const k = abs / 1000;
  const short = k < 10 ? String(Number(k.toFixed(1))) : Math.round(k).toLocaleString();
  return `${sign}${currency}${short}k`;
}

// Name to show for who made a payment. Walk-ins are marked "(walk-in)"; deleted members keep their saved name, marked "(deleted)".
export function getPaymentMemberName(
  payment: Pick<Payment, 'member_name' | 'is_walk_in'> & { member?: Member }
): string {
  if (payment.is_walk_in) return payment.member_name ? `${payment.member_name} (walk-in)` : 'Walk-in guest';
  if (payment.member) return `${payment.member.first_name} ${payment.member.last_name}`.trim();
  if (payment.member_name) return `${payment.member_name} (deleted)`;
  return 'Unknown member';
}
