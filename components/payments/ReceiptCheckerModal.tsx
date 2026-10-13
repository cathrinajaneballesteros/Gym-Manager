'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Printer,
  Copy,
  Receipt,
  Clock,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { DBService } from '@/lib/data/db-service';
import { printReceipt } from '@/lib/export/receipt-print';
import { Payment } from '@/types/database';
import { showToast, showError } from '@/lib/ui/swal';
import { getPaymentMemberName } from '@/lib/ui/format';

interface ReceiptCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  onSuccess: () => void;
}

export const ReceiptCheckerModal: React.FC<ReceiptCheckerModalProps> = ({
  isOpen,
  onClose,
  payment,
  onSuccess,
}) => {
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);

  // Clear any typed note/reason and the reject box when a different payment is opened.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset form state when the opened payment changes */
    setRejectReason('');
    setAdminNotes('');
    setIsRejecting(false);
    setIsProcessing(false);
    processingRef.current = false;
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isOpen, payment?.id]);

  if (!payment) return null;

  const profile = DBService.getProfile();
  const currency = profile.currency || '₱';
  const member = payment.member || (payment.member_id ? DBService.getMemberById(payment.member_id) : undefined);
  const memberName = getPaymentMemberName({ ...payment, member });
  const planName = payment.plan?.name || 'Membership Plan';

  // Automated Fraud / Sanity Verification Checks
  // GCash reference numbers are 13 digits; spaces are ignored so "1012 345 678901" matches "1012345678901".
  const normalizeRef = (value?: string) => (value || '').replace(/\s+/g, '');
  const ref = normalizeRef(payment.reference_number);
  const allPayments = DBService.getPayments();
  const duplicatePayments = ref
    ? allPayments.filter((p) => p.id !== payment.id && normalizeRef(p.reference_number) === ref)
    : [];
  const isDuplicateRef = duplicatePayments.length > 0;
  const isFormatValid = /^\d{13}$/.test(ref);
  const isAmountMatching = payment.plan ? payment.amount === payment.plan.price : true;

  const handleVerify = async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);
    try {
      await DBService.verifyPaymentReceipt(payment.id, { notes: adminNotes });
      showToast('Receipt verified and approved successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      showError('Verification Failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      showError('Rejection Reason Required', 'Please provide a clear reason for rejecting this receipt.');
      return;
    }

    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);
    try {
      await DBService.rejectPaymentReceipt(payment.id, rejectReason.trim());
      showToast('Receipt marked as rejected');
      onSuccess();
      onClose();
    } catch (err) {
      showError('Rejection Failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    const opened = printReceipt({
      payment: { ...payment, member },
      gym: DBService.getGym(),
      gymName: profile.gym_name || 'Gym',
      currency,
      validUntil: member?.end_date,
    });
    if (!opened) showError('Pop-up blocked', 'Allow pop-ups for this site to print the receipt.');
  };

  const copyRefNumber = () => {
    if (ref) {
      navigator.clipboard.writeText(ref);
      showToast('Reference number copied!');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manual Receipt Checker" maxWidth="620px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Top Header Card with Status Badge */}
        <div
          style={{
            backgroundColor:
              payment.receipt_status === 'verified'
                ? '#f0fdf4'
                : payment.receipt_status === 'rejected'
                ? '#fef2f2'
                : '#fffbeb',
            border: '1px solid',
            borderColor:
              payment.receipt_status === 'verified'
                ? '#bbf7d0'
                : payment.receipt_status === 'rejected'
                ? '#fecaca'
                : '#fde68a',
            borderRadius: '12px',
            padding: '1.1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>
                Receipt Verification Status
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {payment.receipt_status === 'verified' ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#15803d', fontWeight: 700, fontSize: '1rem' }}>
                  <CheckCircle size={18} /> Verified & Approved
                </span>
              ) : payment.receipt_status === 'rejected' ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#b91c1c', fontWeight: 700, fontSize: '1rem' }}>
                  <XCircle size={18} /> Receipt Rejected
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#b45309', fontWeight: 700, fontSize: '1rem' }}>
                  <Clock size={18} /> Pending Manual Review
                </span>
              )}
            </div>
            {payment.verified_at && (
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                Reviewed by {payment.verified_by || 'Admin'} on {new Date(payment.verified_at).toLocaleDateString()}
              </div>
            )}
            {payment.rejection_reason && (
              <div style={{ fontSize: '0.8rem', color: '#b91c1c', marginTop: '0.35rem', fontWeight: 500 }}>
                Reason: {payment.rejection_reason}
              </div>
            )}
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
              Transaction Total
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
              {currency}{Number(payment.amount).toLocaleString()}
            </div>
            <span
              style={{
                display: 'inline-block',
                fontSize: '0.75rem',
                padding: '0.2rem 0.5rem',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                color: '#475569',
                fontWeight: 600,
              }}
            >
              {payment.payment_method}
            </span>
          </div>
        </div>

        {/* Automated Inspection Warnings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
            Automated Checker Checklist
          </div>

          {/* Three across in the modal on wider screens, stacked on phones. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.65rem' }}>
            {/* Check 1: Ref format */}
            <div
              style={{
                padding: '0.65rem',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: isFormatValid ? '#bbf7d0' : '#fed7aa',
                backgroundColor: isFormatValid ? '#f0fdf4' : '#fff7ed',
                fontSize: '0.75rem',
              }}
            >
              <div style={{ fontWeight: 600, color: isFormatValid ? '#166534' : '#c2410c', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                {isFormatValid ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
                <span>Ref Format</span>
              </div>
              <div style={{ color: '#64748b', marginTop: '0.2rem' }}>
                {isFormatValid ? '13-digit GCash ref' : ref ? 'Not 13 digits; double-check it' : 'No reference entered'}
              </div>
            </div>

            {/* Check 2: Duplicate check */}
            <div
              style={{
                padding: '0.65rem',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: isDuplicateRef ? '#fecaca' : '#bbf7d0',
                backgroundColor: isDuplicateRef ? '#fef2f2' : '#f0fdf4',
                fontSize: '0.75rem',
              }}
            >
              <div style={{ fontWeight: 600, color: isDuplicateRef ? '#b91c1c' : '#166534', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                {isDuplicateRef ? <XCircle size={13} /> : <CheckCircle size={13} />}
                <span>Uniqueness</span>
              </div>
              <div style={{ color: '#64748b', marginTop: '0.2rem' }}>
                {isDuplicateRef ? 'Duplicate ref detected!' : 'No duplicates found'}
              </div>
            </div>

            {/* Check 3: Plan fee alignment */}
            <div
              style={{
                padding: '0.65rem',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: isAmountMatching ? '#bbf7d0' : '#fed7aa',
                backgroundColor: isAmountMatching ? '#f0fdf4' : '#fff7ed',
                fontSize: '0.75rem',
              }}
            >
              <div style={{ fontWeight: 600, color: isAmountMatching ? '#166534' : '#c2410c', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                {isAmountMatching ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
                <span>Amount Match</span>
              </div>
              <div style={{ color: '#64748b', marginTop: '0.2rem' }}>
                {isAmountMatching ? 'Matches plan price' : 'Mismatch with plan'}
              </div>
            </div>
          </div>
        </div>

        {/* Digital Proof Voucher Slip */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '2px dashed #cbd5e1',
            borderRadius: '12px',
            padding: '1.25rem',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Receipt size={18} color="#0071e3" />
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                Proof of Payment Slip
              </span>
            </div>
            <button
              onClick={copyRefNumber}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem',
                color: '#0071e3',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              <Copy size={13} />
              <span>Copy Ref #{ref || payment.id}</span>
            </button>
          </div>

          <table style={{ width: '100%', fontSize: '0.825rem', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '0.4rem 0', color: '#64748b' }}>Member:</td>
                <td style={{ padding: '0.4rem 0', fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>
                  {memberName}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '0.4rem 0', color: '#64748b' }}>Plan / Subscription:</td>
                <td style={{ padding: '0.4rem 0', fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>
                  {planName}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '0.4rem 0', color: '#64748b' }}>Payment Date:</td>
                <td style={{ padding: '0.4rem 0', fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>
                  {payment.payment_date}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '0.4rem 0', color: '#64748b' }}>Method & Reference:</td>
                <td style={{ padding: '0.4rem 0', fontWeight: 600, color: '#0071e3', textAlign: 'right' }}>
                  {payment.payment_method} · {ref || 'No Ref Number'}
                </td>
              </tr>
              {payment.receipt_notes && (
                <tr>
                  <td style={{ padding: '0.4rem 0', color: '#64748b' }}>Member Submission Notes:</td>
                  <td style={{ padding: '0.4rem 0', fontStyle: 'italic', color: '#475569', textAlign: 'right' }}>
                    &ldquo;{payment.receipt_notes}&rdquo;
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Verification Admin Notes or Rejection Reason Input */}
        {isRejecting ? (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.85rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#991b1b', marginBottom: '0.35rem' }}>
              Reason for Rejecting Receipt:
            </label>
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Reference number not found in GCash merchant account"
              className="input-field"
              style={{ width: '100%', fontSize: '0.825rem', padding: '0.5rem 0.75rem', marginBottom: '0.5rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setIsRejecting(false)}
                className="btn btn-outline btn-sm"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isProcessing}
                style={{
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        ) : (
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#475569', marginBottom: '0.35rem' }}>
              Admin Verification Note (Optional)
            </label>
            <input
              type="text"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="e.g. Verified with GCash transaction log #982"
              className="input-field"
              style={{ width: '100%', fontSize: '0.825rem', padding: '0.5rem 0.75rem' }}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Printer size={15} />
            <span>Print Receipt</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {!isRejecting && payment.receipt_status !== 'rejected' && (
              <button
                type="button"
                onClick={() => setIsRejecting(true)}
                disabled={isProcessing}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #fecaca',
                  backgroundColor: '#ffffff',
                  color: '#dc2626',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <XCircle size={15} />
                <span>Reject</span>
              </button>
            )}

            {payment.receipt_status !== 'verified' && (
              <button
                type="button"
                onClick={handleVerify}
                disabled={isProcessing}
                className="btn btn-primary"
                style={{
                  backgroundColor: '#059669',
                  borderColor: '#059669',
                  minWidth: '150px',
                }}
              >
                <CheckCircle size={15} />
                <span>Approve & Verify</span>
              </button>
            )}

            {payment.receipt_status === 'verified' && (
              <button
                type="button"
                onClick={onClose}
                className="btn btn-primary"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
