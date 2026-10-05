'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Modal } from '@/components/ui/Modal';
import { DBService } from '@/lib/data/db-service';
import { Payment, Member, MembershipPlan } from '@/types/database';
import { showError } from '@/lib/ui/swal';

const paymentSchema = z.object({
  member_id: z.string().min(1, 'Please select a member'),
  membership_plan_id: z.string().optional(),
  amount: z.number().positive('Payment amount must be greater than 0'),
  payment_date: z.string().min(10, 'Payment date is required'),
  payment_method: z.enum(['Cash', 'GCash', 'Bank Transfer', 'Credit Card', 'Debit Card', 'Other']),
  payment_status: z.enum(['completed', 'pending', 'refunded']),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (payment: Payment) => void;
  preselectedMemberId?: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedMemberId,
}) => {
  const members: Member[] = DBService.getMembers();
  const plans: MembershipPlan[] = DBService.getPlans();
  const todayStr = new Date().toISOString().split('T')[0];

  const defaultMember = preselectedMemberId
    ? members.find((m) => m.id === preselectedMemberId)
    : members[0];

  const defaultPlan = defaultMember
    ? plans.find((p) => p.id === defaultMember.membership_plan_id) || plans[0]
    : plans[0];

  const buildDefaultValues = (): PaymentFormData => ({
    member_id: defaultMember?.id || '',
    membership_plan_id: defaultPlan?.id || '',
    amount: defaultPlan?.price || 1500,
    payment_date: todayStr,
    payment_method: 'GCash',
    payment_status: 'completed',
    reference_number: '',
    notes: '',
  });

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: buildDefaultValues(),
  });

  // Refill the form with the correct values every time the modal opens or the preselected member changes.
  useEffect(() => {
    if (!isOpen) return;
    reset(buildDefaultValues());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, preselectedMemberId]);

  const handleMemberChange = (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    if (member && member.membership_plan_id) {
      const plan = plans.find((p) => p.id === member.membership_plan_id);
      if (plan) {
        setValue('membership_plan_id', plan.id);
        setValue('amount', plan.price);
      }
    }
  };

  const handlePlanChange = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      setValue('amount', plan.price);
    }
  };

  const onSubmit = (data: PaymentFormData) => {
    try {
      const payment = DBService.addPayment(data);

      // If it's a completed payment, advance the member's subscription date
      if (data.payment_status === 'completed' && data.membership_plan_id) {
        const plan = plans.find((p) => p.id === data.membership_plan_id);
        const member = members.find((m) => m.id === data.member_id);
        if (member && plan) {
          const baseDate = new Date(member.end_date > todayStr ? member.end_date : todayStr);
          baseDate.setMonth(baseDate.getMonth() + plan.duration_months);
          DBService.updateMember(member.id, {
            end_date: baseDate.toISOString().split('T')[0],
            status: 'active',
            membership_plan_id: plan.id,
          });
        }
      }

      onSuccess(payment);
      reset();
      onClose();
    } catch (err: any) {
      showError('Payment Failed', err.message || 'Failed to record payment');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Membership Payment"
      subtitle="Track member renewal or new enrollment transaction into revenue stream"
    >
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            Member *
          </label>
          {members.length === 0 ? (
            <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', color: '#92400e', fontSize: '0.825rem', lineHeight: 1.4 }}>
              ⚠️ No members registered yet. Please add a member in the <strong>Members</strong> tab before recording a payment.
            </div>
          ) : (
            <select
              {...register('member_id')}
              onChange={(e) => {
                register('member_id').onChange(e);
                handleMemberChange(e.target.value);
              }}
              style={{ width: '100%' }}
            >
              <option value="">Select a member...</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.first_name} {m.last_name} ({m.email})
                </option>
              ))}
            </select>
          )}
          {errors.member_id && (
            <span style={{ fontSize: '0.725rem', color: 'var(--danger)', marginTop: '0.2rem', display: 'block' }}>
              {errors.member_id.message}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Membership Plan
            </label>
            <select
              {...register('membership_plan_id')}
              onChange={(e) => {
                register('membership_plan_id').onChange(e);
                handlePlanChange(e.target.value);
              }}
              style={{ width: '100%' }}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (₱{p.price.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Payment Amount (₱) *
            </label>
            <input
              type="number"
              step="0.01"
              {...register('amount', { valueAsNumber: true })}
              style={{ width: '100%' }}
            />
            {errors.amount && (
              <span style={{ fontSize: '0.725rem', color: 'var(--danger)', marginTop: '0.2rem', display: 'block' }}>
                {errors.amount.message}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Payment Date *
            </label>
            <input type="date" {...register('payment_date')} style={{ width: '100%' }} />
            {errors.payment_date && (
              <span style={{ fontSize: '0.725rem', color: 'var(--danger)', marginTop: '0.2rem', display: 'block' }}>
                {errors.payment_date.message}
              </span>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Payment Method *
            </label>
            <select {...register('payment_method')} style={{ width: '100%' }}>
              <option value="Cash">Cash (Counter)</option>
              <option value="GCash">GCash / QRPh</option>
              <option value="Bank Transfer">Bank Transfer / InstaPay</option>
              <option value="Credit Card">Credit Card (POS Terminal)</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Status *
            </label>
            <select {...register('payment_status')} style={{ width: '100%' }}>
              <option value="completed">Completed / Settled</option>
              <option value="pending">Pending Verification</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Reference / Transaction ID
            </label>
            <input
              type="text"
              placeholder="e.g. GC-902148X"
              {...register('reference_number')}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            Notes / Receipt Remarks
          </label>
          <input
            type="text"
            placeholder="e.g. Walk-in renewal with student ID verification"
            {...register('notes')}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting || members.length === 0}>
            {isSubmitting ? 'Recording...' : 'Complete Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
