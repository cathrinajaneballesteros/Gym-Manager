'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  MessageSquare,
  Send,
  CheckCircle,
  AlertCircle,
  Calendar,
  DollarSign,
  User,
  Smartphone,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { DBService } from '@/lib/data/db-service';
import { Member, Payment, UserProfile } from '@/types/database';
import { showToast, showAlert, showError } from '@/lib/ui/swal';
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [channel, setChannel] = useState<'both' | 'sms' | 'email'>('both');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [planName, setPlanName] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const prof = DBService.getProfile();
    setProfile(prof);

    // Populate data based on member or payment
    const targetMember = member || (payment?.member_id ? DBService.getMemberById(payment.member_id) : null);
    const targetPlan = targetMember?.plan || (payment?.membership_plan_id ? DBService.getPlans().find(p => p.id === payment.membership_plan_id) : null);

    // Local YYYY-MM-DD. toISOString() is UTC and can be a day off in the Philippines.
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    if (targetMember) {
      setEmail(targetMember.email || '');
      setPhone(targetMember.phone || '');
    }

    const resolvedDueDate =
      (targetMember && targetMember.end_date) || (payment && payment.payment_date) || todayStr;
    setDueDate(resolvedDueDate);

    if (payment) {
      setAmount(String(payment.amount));
    } else if (targetPlan) {
      setAmount(String(targetPlan.price));
    } else {
      setAmount('1500');
    }

    setPlanName(targetPlan?.name || 'Monthly Gym Membership');
  }, [member, payment, isOpen]);

  const currency = profile?.currency || '₱';
  const gymName = profile?.gym_name || 'IronPeak Fitness & Gym';
  const memberFullName = member
    ? `${member.first_name} ${member.last_name}`
    : payment?.member
    ? `${payment.member.first_name} ${payment.member.last_name}`
    : 'Valued Member';

  const smsPreview = `[${gymName}] Hi ${memberFullName.split(' ')[0]}! Friendly reminder that your ${planName} renewal (${currency}${Number(amount || 0).toLocaleString()}) is due on ${dueDate}.${customNote ? ` Note: ${customNote}` : ''} Please renew at the front desk (Cash) or via GCash. Stay strong!`;

  const handleSendReminder = async () => {
    if (channel === 'email' && !email) {
      showError('Missing Email', 'Please enter a valid member email address.');
      return;
    }
    if (channel === 'sms' && !phone) {
      showError('Missing Phone', 'Please enter a valid member phone number.');
      return;
    }
    if (channel === 'both' && !email && !phone) {
      showError('Missing Contacts', 'Please provide at least a phone number or email address.');
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
              to: email,
              memberName: memberFullName,
              gymName,
              amount: `${currency}${Number(amount).toLocaleString()}`,
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
              phone,
              memberName: memberFullName,
              gymName,
              amount: `${currency}${Number(amount).toLocaleString()}`,
              planName,
              dueDate,
              customMessage: customNote ? `Hi ${memberFullName.split(' ')[0]}, reminder that your ${planName} renewal (${currency}${Number(amount).toLocaleString()}) is due on ${dueDate}. ${customNote}` : undefined,
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
        entity_id: member?.id || payment?.member_id || 'unknown',
        entity_label: `${memberFullName} · ${channel.toUpperCase()}`,
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
            <p style="margin-bottom: 0.5rem; font-weight: 600; color: #0f172a;">${failureCount > 0 ? 'Some channels failed:' : 'Reminder dispatched successfully:'}</p>
            <ul style="padding-left: 1.25rem; margin-bottom: 0.85rem;">
              ${results.map((r) => `<li style="margin-bottom: 0.25rem;">${escapeHtml(r)}</li>`).join('')}
            </ul>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem; font-size: 0.8rem; color: #64748b;">
              Logged to the User Audit Trail for compliance records.
            </div>
          </div>
        `,
        confirmButtonText: 'Done',
        confirmButtonColor: '#0071e3',
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      showError('Sending Failed', err.message || 'Failed to dispatch reminder');
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
              Due on {dueDate}
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
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09171234567"
              className="input-field"
              style={{ width: '100%', fontSize: '0.85rem', padding: '0.55rem 0.75rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#475569', marginBottom: '0.35rem' }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="member@example.com"
              className="input-field"
              style={{ width: '100%', fontSize: '0.85rem', padding: '0.55rem 0.75rem' }}
            />
          </div>
        </div>

        {/* Custom Note */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#475569', marginBottom: '0.35rem' }}>
            Custom Message / Special Instructions (Optional)
          </label>
          <textarea
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
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
            style={{ minWidth: '160px' }}
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
