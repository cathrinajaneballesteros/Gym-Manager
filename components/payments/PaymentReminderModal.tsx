'use client';

import React, { useState } from 'react';
import { Mail, MessageSquare, Send, Smartphone } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { DBService } from '@/lib/data/db-service';
import { Member, Payment } from '@/types/database';
import { getPaymentMemberName } from '@/lib/ui/format';
import { buildReminderSms } from '@/lib/ui/reminder-text';
import { formatDisplayDate, getTodayKey } from '@/lib/ui/date';
import { showAlert, showError } from '@/lib/ui/swal';
import { escapeHtml } from '@/lib/ui/escape';

interface PaymentReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  member?: Member | null;
  payment?: Payment | null;
  onSuccess?: () => void;
}

export const PaymentReminderModal: React.FC<PaymentReminderModalProps> = ({
  isOpen,
  onClose,
  member,
  payment,
  onSuccess,
}) => {
  const [channel, setChannel] = useState<'both' | 'sms' | 'email'>('both');
  const [customNote, setCustomNote] = useState('');
  const [isSending, setIsSending] = useState(false);

  // This modal stays mounted between uses, so start each opening fresh; otherwise one member's note
  // would be pre-filled (and sent) for the next.
  const openKey = isOpen ? `${member?.id ?? ''}:${payment?.id ?? ''}` : null;
  const [lastOpenKey, setLastOpenKey] = useState(openKey);
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey);
    if (openKey) {
      setChannel('both');
      setCustomNote('');
    }
  }

  // Everything below comes from the member or payment; the server looks the contact details up again.
  const profile = DBService.getProfile();
  const gym = DBService.getGym();
  const targetMember = member || (payment?.member_id ? DBService.getMemberById(payment.member_id) : null);
  const targetPlan =
    targetMember?.plan ||
    (payment?.membership_plan_id ? DBService.getPlans().find((p) => p.id === payment.membership_plan_id) : null);
  const memberId = targetMember?.id || payment?.member_id || '';
  const email = targetMember?.email || '';
  const phone = targetMember?.phone || '';
  const dueDate = targetMember?.end_date || payment?.payment_date || getTodayKey();
  const amount = payment ? String(payment.amount) : targetPlan ? String(targetPlan.price) : '0';
  const planName = targetPlan?.name || 'Gym Membership';

  const currency = gym?.currency || profile.currency || '₱';
  const gymName = gym?.name || profile.gym_name || 'Your Gym';
  const memberFullName = targetMember
    ? `${targetMember.first_name} ${targetMember.last_name}`
    : payment?.member
    ? getPaymentMemberName(payment)
    : 'Valued Member';

  const amountText = `${currency}${Number(amount || 0).toLocaleString()}`;
  // Same text the server sends, including the gym's phone so members can call back.
  const smsPreview = buildReminderSms({
    gymName,
    memberName: memberFullName,
    planName,
    amount: amountText,
    dueDate,
    note: customNote,
    gymPhone: gym?.phone,
  });

  const handleSendReminder = async () => {
    if (!memberId) {
      showError('No Member', 'This reminder is not linked to a member.');
      return;
    }
    if (channel === 'email' && !email) {
      showError('Missing Email', 'This member has no email address. Edit the member to add one.');
      return;
    }
    if (channel === 'sms' && !phone) {
      showError('Missing Phone', 'This member has no phone number. Edit the member to add one.');
      return;
    }
    if (channel === 'both' && !email && !phone) {
      showError('Missing Contacts', 'This member has no phone number or email. Edit the member to add one.');
      return;
    }

    setIsSending(true);
    const results: string[] = [];
    let successCount = 0;

    try {
      // 1. Send Email Reminder
      if (channel === 'email' || channel === 'both') {
        if (email) {
          const res = await fetch('/api/email/reminder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              memberId,
              amount: amountText,
              planName,
              dueDate,
              customNote,
            }),
          });
          const data: { success?: boolean; error?: string; simulated?: boolean } = await res
            .json()
            .catch(() => ({}));
          if (res.ok && data.success) {
            successCount += 1;
            results.push(`Email reminder sent to ${email}${data.simulated ? ' (Simulated)' : ''}`);
          } else {
            results.push(`Email failed: ${data.error || `HTTP ${res.status}`}`);
          }
        }
      }

      // 2. Send SMS Reminder
      if (channel === 'sms' || channel === 'both') {
        if (phone) {
          const res = await fetch('/api/sms/reminder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              memberId,
              amount: amountText,
              planName,
              dueDate,
              customMessage: customNote || undefined,
            }),
          });
          const data: { success?: boolean; error?: string; simulated?: boolean } = await res
            .json()
            .catch(() => ({}));
          if (res.ok && data.success) {
            successCount += 1;
            results.push(`SMS reminder sent to ${phone}${data.simulated ? ' (Simulated)' : ''}`);
          } else {
            results.push(`SMS failed: ${data.error || `HTTP ${res.status}`}`);
          }
        }
      }

      // Stop if every channel failed. Keep the modal open so the user can retry.
      if (successCount === 0) {
        showError('Reminder Not Sent', results.join(' ') || 'All channels failed.');
        return;
      }

      // 3. Record User Audit Entry (only after a real success)
      DBService.recordAudit({
        action: 'member.reminder_sent',
        entity_type: 'member',
        entity_id: memberId,
        entity_label: `${memberFullName} · ${channel === 'both' ? 'SMS & Email' : channel === 'sms' ? 'SMS' : 'Email'}`,
        metadata: {
          channel,
          email: email || 'N/A',
          phone: phone || 'N/A',
          amount: Number(amount),
          due_date: dueDate,
          plan: planName,
        },
      });

      const failureCount = results.filter((r) => r.includes('failed:')).length;

      showAlert({
        icon: failureCount > 0 ? 'warning' : 'success',
        title: failureCount > 0 ? 'Reminder Partially Sent' : 'Payment Reminder Sent!',
        html: `
          <div style="text-align: left; font-size: 0.875rem; color: #334155; line-height: 1.5;">
            <p style="margin-bottom: 0.5rem; font-weight: 600; color: #0f172a;">${failureCount > 0 ? 'Some channels failed:' : 'Reminder sent:'}</p>
            <ul style="padding-left: 1.25rem; margin-bottom: 0.85rem;">
              ${results.map((r) => `<li style="margin-bottom: 0.25rem;">${escapeHtml(r)}</li>`).join('')}
            </ul>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem; font-size: 0.8rem; color: #64748b;">
              Saved in the Audit Log.
            </div>
          </div>
        `,
        confirmButtonText: 'Done',
        confirmButtonColor: '#0071e3',
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      showError('Sending Failed', err instanceof Error ? err.message : 'Failed to dispatch reminder');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send Payment Reminder" maxWidth="560px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Recipient Overview Header */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
              Recipient Member
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
              {memberFullName}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Plan: {planName}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
              Amount Due
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#d97706' }}>
              {currency}{Number(amount || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Due on {formatDisplayDate(dueDate)}
            </div>
          </div>
        </div>

        {/* Channel Selection Toggle */}
        <div>
          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
            Delivery Channel
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
            <button
              type="button"
              onClick={() => setChannel('both')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                padding: '0.65rem 0.5rem',
                borderRadius: '8px',
                border: '1.5px solid',
                borderColor: channel === 'both' ? '#0071e3' : '#e2e8f0',
                backgroundColor: channel === 'both' ? '#eff6ff' : '#ffffff',
                color: channel === 'both' ? '#0071e3' : '#475569',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Smartphone size={15} />
              <span>SMS & Email</span>
            </button>

            <button
              type="button"
              onClick={() => setChannel('sms')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                padding: '0.65rem 0.5rem',
                borderRadius: '8px',
                border: '1.5px solid',
                borderColor: channel === 'sms' ? '#0071e3' : '#e2e8f0',
                backgroundColor: channel === 'sms' ? '#eff6ff' : '#ffffff',
                color: channel === 'sms' ? '#0071e3' : '#475569',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <MessageSquare size={15} />
              <span>SMS Only</span>
            </button>

            <button
              type="button"
              onClick={() => setChannel('email')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                padding: '0.65rem 0.5rem',
                borderRadius: '8px',
                border: '1.5px solid',
                borderColor: channel === 'email' ? '#0071e3' : '#e2e8f0',
                backgroundColor: channel === 'email' ? '#eff6ff' : '#ffffff',
                color: channel === 'email' ? '#0071e3' : '#475569',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Mail size={15} />
              <span>Email Only</span>
            </button>
          </div>
        </div>

        {/* Inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#475569', marginBottom: '0.35rem' }}>
              Mobile Number (SMS)
            </label>
            <input
              type="text"
              value={phone}
              readOnly
              placeholder="No phone on file"
              className="input-field"
              style={{ width: '100%', fontSize: '0.85rem', padding: '0.55rem 0.75rem', backgroundColor: '#f8fafc' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#475569', marginBottom: '0.35rem' }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              readOnly
              placeholder="No email on file"
              className="input-field"
              style={{ width: '100%', fontSize: '0.85rem', padding: '0.55rem 0.75rem', backgroundColor: '#f8fafc' }}
            />
          </div>
          <p style={{ gridColumn: '1 / -1', fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
            Reminders go to the contact details saved on the member. Edit the member to change them.
          </p>
        </div>

        {/* Custom Note */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#475569', marginBottom: '0.35rem' }}>
            Custom Message / Special Instructions (Optional)
          </label>
          <textarea
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            maxLength={300}
            rows={2}
            placeholder="e.g. Pay before Friday to claim your free 1-week gym buddy pass!"
            className="input-field"
            style={{ width: '100%', fontSize: '0.825rem', padding: '0.55rem 0.75rem', resize: 'vertical' }}
          />
        </div>

        {/* Live SMS Preview */}
        {(channel === 'sms' || channel === 'both') && (
          <div
            style={{
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                📱 Live SMS Preview
              </span>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                {smsPreview.length} characters
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#1e293b', fontStyle: 'italic', lineHeight: 1.45 }}>
              &ldquo;{smsPreview}&rdquo;
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline"
            disabled={isSending}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSendReminder}
            disabled={isSending}
            className="btn btn-primary"
            style={{ minWidth: '160px', maxWidth: '100%' }}
          >
            {isSending ? (
              <span>Sending...</span>
            ) : (
              <>
                <Send size={15} />
                <span>
                  Send via {channel === 'both' ? 'SMS & Email' : channel.toUpperCase()}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
