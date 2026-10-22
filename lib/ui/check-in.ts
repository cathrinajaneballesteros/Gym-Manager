'use client';

import { Member } from '@/types/database';
import { DBService } from '@/lib/data/db-service';
import { showConfirm, showToast } from '@/lib/ui/swal';
import { formatDisplayDate } from '@/lib/ui/date';

// Members with a check-in on its way, so a double-click doesn't send a second one.
const inFlight = new Set<string>();

// Checks a member in, asking first when their membership isn't active. Returns true if a visit was recorded.
export async function checkInWithPrompt(member: Member): Promise<boolean> {
  const name = `${member.first_name} ${member.last_name}`.trim();

  if (inFlight.has(member.id)) return false;
  if (DBService.isCheckedInToday(member.id)) {
    showToast(`${name} is already checked in today`, 'info');
    return false;
  }

  if (member.status === 'expired' || member.status === 'pending') {
    const reason =
      member.status === 'expired'
        ? `${name}'s membership expired on ${formatDisplayDate(member.end_date)}.`
        : `${name} has no completed payment yet.`;
    const confirmed = await showConfirm('Check in anyway?', `${reason} You may want to ask them to renew.`, 'Check in', '#d97706');
    if (!confirmed) return false;
  }

  if (inFlight.has(member.id)) return false;
  inFlight.add(member.id);
  try {
    await DBService.checkInMember(member.id);
    showToast(`${name} checked in`);
    return true;
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Check-in failed', 'error');
    return false;
  } finally {
    inFlight.delete(member.id);
  }
}
