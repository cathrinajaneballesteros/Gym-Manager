'use client';

import { Member } from '@/types/database';
import { DBService } from '@/lib/data/db-service';
import { showConfirm, showToast } from '@/lib/ui/swal';

// Checks a member in, asking first when their membership isn't active. Returns true if a visit was recorded.
export async function checkInWithPrompt(member: Member): Promise<boolean> {
  const name = `${member.first_name} ${member.last_name}`.trim();

  if (DBService.isCheckedInToday(member.id)) {
    showToast(`${name} is already checked in today`, 'info');
    return false;
  }

  if (member.status === 'expired' || member.status === 'pending') {
    const reason =
      member.status === 'expired'
        ? `${name}'s membership expired on ${member.end_date}.`
        : `${name} has no completed payment yet.`;
    const confirmed = await showConfirm('Check in anyway?', `${reason} You may want to ask them to renew.`, 'Check in', '#d97706');
    if (!confirmed) return false;
  }

  try {
    DBService.checkInMember(member.id);
    showToast(`${name} checked in`);
    return true;
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Check-in failed', 'error');
    return false;
  }
}
