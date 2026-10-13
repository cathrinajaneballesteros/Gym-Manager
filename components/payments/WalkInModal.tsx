'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { DBService } from '@/lib/data/db-service';
import { Payment, PaymentMethod } from '@/types/database';
import { showError } from '@/lib/ui/swal';

interface WalkInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (payment: Payment) => void;
  /** Edit this walk-in instead of recording a new one. */
  initialPayment?: Payment | null;
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: '0.35rem',
};

// A one-time visitor who pays at the door. No member record is created.
export const WalkInModal: React.FC<WalkInModalProps> = ({ isOpen, onClose, onSuccess, initialPayment }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={initialPayment ? 'Edit Walk-in' : 'Record Walk-in'}
    subtitle="A one-time visitor who pays at the door. They won't be added to your members."
  >
    {/* Mounted fresh on every open, so it starts from the walk-in being edited or the gym's usual price. */}
    {isOpen && (
      <WalkInForm key={initialPayment?.id ?? 'new'} onClose={onClose} onSuccess={onSuccess} initialPayment={initialPayment} />
    )}
  </Modal>
);

const WalkInForm: React.FC<Omit<WalkInModalProps, 'isOpen'>> = ({ onClose, onSuccess, initialPayment }) => {
  const currency = DBService.getProfile().currency || '₱';
  const usualPrice = DBService.getGym()?.walk_in_price;
  const [name, setName] = useState(initialPayment?.member_name || '');
  const [amount, setAmount] = useState(
    initialPayment ? String(initialPayment.amount) : usualPrice != null ? String(usualPrice) : ''
  );
  const [method, setMethod] = useState<PaymentMethod>(initialPayment?.payment_method || 'Cash');
  const [reference, setReference] = useState(initialPayment?.reference_number || '');
  const [notes, setNotes] = useState(initialPayment?.notes || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!amount.trim() || !Number.isFinite(value) || value <= 0) {
      showError('Amount needed', 'Enter how much the walk-in paid.');
      return;
    }
    if (method === 'GCash' && !reference.trim()) {
      showError('Reference needed', 'Enter the GCash reference number so the receipt can be checked.');
      return;
    }
    setSaving(true);
    try {
      const fields = {
        amount: value,
        payment_method: method,
        reference_number: method === 'GCash' ? reference.trim() : '',
        notes: notes.trim(),
      };
      const payment = initialPayment
        ? await DBService.updatePayment(initialPayment.id, { ...fields, member_name: name.trim() })
        : await DBService.addWalkIn({ ...fields, name });
      onSuccess(payment);
      onClose();
    } catch (err) {
      showError('Save Failed', err instanceof Error ? err.message : 'Could not save the walk-in.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <label style={labelStyle}>Name (optional)</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Juan Dela Cruz"
          style={{ width: '100%' }}
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label style={labelStyle}>Amount ({currency}) *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 100"
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={labelStyle}>Payment Method *</label>
          <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} style={{ width: '100%' }}>
            <option value="Cash">Cash (On-site)</option>
            <option value="GCash">GCash</option>
          </select>
        </div>
      </div>

      {method === 'GCash' && (
        <div>
          <label style={labelStyle}>GCash Reference No. *</label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. 1012 345 678901"
            style={{ width: '100%' }}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Pending until the receipt is verified on the Payments page; it counts as revenue once verified.
          </p>
        </div>
      )}

      <div>
        <label style={labelStyle}>Notes</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Student rate"
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : initialPayment ? 'Update Walk-in' : 'Record Walk-in'}
        </button>
      </div>
    </form>
  );
};
