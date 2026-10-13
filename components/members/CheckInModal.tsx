'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { MemberPicker } from '@/components/payments/MemberPicker';
import { DBService } from '@/lib/data/db-service';
import { checkInWithPrompt } from '@/lib/ui/check-in';

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Modal unmounts its children when closed, so the form starts fresh with the latest members each time it opens.
const CheckInForm: React.FC<Omit<CheckInModalProps, 'isOpen'>> = ({ onClose, onSuccess }) => {
  const [members] = useState(() => DBService.getMembers());
  const [memberId, setMemberId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCheckIn = async () => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;
    setIsSubmitting(true);
    const checkedIn = await checkInWithPrompt(member);
    setIsSubmitting(false);
    if (checkedIn) onSuccess();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <MemberPicker members={members} value={memberId} onChange={setMemberId} />

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={handleCheckIn} disabled={!memberId || isSubmitting}>
          Check In
        </button>
      </div>
    </div>
  );
};

export const CheckInModal: React.FC<CheckInModalProps> = ({ isOpen, onClose, onSuccess }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Check In Member" subtitle="Record today's gym visit">
    <CheckInForm onClose={onClose} onSuccess={onSuccess} />
  </Modal>
);
