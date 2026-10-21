'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Modal } from '@/components/ui/Modal';
import { DBService, PaymentSavedError } from '@/lib/data/db-service';
import { Payment, Member, MembershipPlan } from '@/types/database';
import { showError, showWarning } from '@/lib/ui/swal';
import { MemberPicker } from './MemberPicker';
import { getTodayKey } from '@/lib/ui/date';
import { getPaymentMemberName } from '@/lib/ui/format';
import { amountField, MAX_AMOUNT, pastDateField } from '@/lib/ui/validation';

const paymentSchema = z.object({
  // Required in onSubmit, except for a payment whose member was deleted (it has no member any more).
  member_id: z.string(),
  membership_plan_id: z.string().optional(),
  amount: amountField('Payment amount'),
  payment_date: pastDateField('Payment date'),
  payment_method: z.enum(['Cash', 'GCash']),
  payment_status: z.enum(['completed', 'pending', 'refunded']),
  reference_number: z.string().max(50, 'Reference number is too long').optional(),
  notes: z.string().max(500, 'Notes can be up to 500 characters').optional(),
}).refine((d) => d.payment_method !== 'GCash' || Boolean(d.reference_number?.trim()), {
  // The reference number is what the receipt check is done against.
  message: 'Enter the GCash reference number',
  path: ['reference_number'],
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (payment: Payment) => void;
  preselectedMemberId?: string;
  initialPayment?: Payment | null;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedMemberId,
  initialPayment,
}) => {
  const members: Member[] = DBService.getMembers();
  const plans: MembershipPlan[] = DBService.getPlans();
  const currency = DBService.getProfile().currency || '₱';
  const todayStr = getTodayKey();
  // Editing a payment whose member was deleted: keep it attached to them instead of offering the picker.
  const deletedMemberPayment =
    initialPayment && !members.some((m) => m.id === initialPayment.member_id) ? initialPayment : null;

  const defaultMember = preselectedMemberId
    ? members.find((m) => m.id === preselectedMemberId)
    : members.find((m) => m.status === 'pending') || members[0];

  const firstActivePlan = plans.find((p) => p.is_active);
  const defaultPlan = defaultMember
    ? plans.find((p) => p.id === defaultMember.membership_plan_id) || firstActivePlan
    : firstActivePlan;

  const buildDefaultValues = (): PaymentFormData => {
    if (initialPayment) {
      return {
        member_id: initialPayment.member_id,
        membership_plan_id: initialPayment.membership_plan_id || '',
        amount: Number(initialPayment.amount),
        payment_date: initialPayment.payment_date,
        payment_method: initialPayment.payment_method,
        payment_status: initialPayment.payment_status,
        reference_number: initialPayment.reference_number || '',
        notes: initialPayment.notes || '',
      };
    }
    return {
      member_id: defaultMember?.id || '',
      membership_plan_id: defaultPlan?.id || '',
      amount: defaultPlan?.price || 0,
      payment_date: todayStr,
      payment_method: 'Cash',
      payment_status: 'completed',
      reference_number: '',
      notes: '',
    };
  };

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: buildDefaultValues(),
  });

  // Only active plans can be chosen, but keep the plan already on this payment
  // or on the selected member so it does not drop out of the list.
  const selectedMemberPlanId = members.find((m) => m.id === watch('member_id'))?.membership_plan_id;
  const selectablePlans = plans.filter(
    (p) => p.is_active || p.id === initialPayment?.membership_plan_id || p.id === selectedMemberPlanId
  );

  // Refill the form with the correct values every time the modal opens or the target payment/member changes.
  useEffect(() => {
    if (!isOpen) return;
    reset(buildDefaultValues());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, preselectedMemberId, initialPayment?.id]);

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

  const isNewGCash = !initialPayment && watch('payment_method') === 'GCash';

  const onSubmit = async (data: PaymentFormData) => {
    if (!deletedMemberPayment && !data.member_id) {
      setError('member_id', { message: 'Please select a member' });
      return;
    }
    try {
      // A new GCash payment waits for its receipt to be verified before it counts or extends the membership.
      // Activating or extending the membership happens in DBService once the payment is completed.
      const payment = initialPayment
        ? await DBService.updatePayment(initialPayment.id, data)
        : await DBService.addPayment(data.payment_method === 'GCash' ? { ...data, payment_status: 'pending' } : data);

      onSuccess(payment);
      reset();
      onClose();
    } catch (err) {
      if (err instanceof PaymentSavedError) {
        onSuccess(err.payment);
        reset();
        onClose();
        showWarning('Payment Saved', err.message);
        return;
      }
      showError('Payment Failed', err instanceof Error ? err.message : 'Failed to save payment record');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialPayment ? 'Edit Payment Record' : 'Record Membership Payment'}
      subtitle={initialPayment ? 'Update payment transaction details, method, or status' : 'Select member and enter payment details to record revenue'}
    >
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            Member *
          </label>
          {deletedMemberPayment ? (
            <>
              <input type="hidden" {...register('member_id')} />
              <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#64748b', fontSize: '0.825rem' }}>
                {getPaymentMemberName(deletedMemberPayment)}
              </div>
            </>
          ) : members.length === 0 ? (
            <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', color: '#92400e', fontSize: '0.825rem', lineHeight: 1.4 }}>
              ⚠️ No members registered yet. Please add a member in the <strong>Members</strong> tab before recording a payment.
            </div>
          ) : (
            <>
              <input type="hidden" {...register('member_id')} />
              <MemberPicker
                members={members}
                value={watch('member_id')}
                hasError={!!errors.member_id}
                onChange={(id) => {
                  setValue('member_id', id, { shouldValidate: true });
                  handleMemberChange(id);
                }}
              />
            </>
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
              {selectablePlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {currency}{p.price.toLocaleString()} ({p.duration_months} mo)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Payment Amount ({currency}) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={MAX_AMOUNT}
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
            <input type="date" max={todayStr} {...register('payment_date')} style={{ width: '100%' }} />
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
              <option value="Cash">Cash (On-site)</option>
              <option value="GCash">GCash</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Status *
            </label>
            {isNewGCash ? (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45, paddingTop: '0.35rem' }}>
                Pending until the receipt is verified on the Payments page. It counts as revenue, and extends the
                membership, once verified.
              </p>
            ) : (
              <select {...register('payment_status')} style={{ width: '100%' }}>
                <option value="completed">Completed / Settled</option>
                {/* A settled payment already extended the membership; moving it back to pending and then
                    completing it again would extend it a second time. */}
                {initialPayment?.payment_status !== 'completed' && initialPayment?.payment_status !== 'refunded' && (
                  <option value="pending">Pending Verification</option>
                )}
                <option value="refunded">Refunded</option>
              </select>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              GCash Reference No.{watch('payment_method') === 'GCash' ? ' *' : ''}
            </label>
            <input
              type="text"
              placeholder="e.g. 1012 345 678901"
              maxLength={50}
              {...register('reference_number')}
              style={{ width: '100%' }}
            />
            {errors.reference_number && (
              <span style={{ fontSize: '0.725rem', color: 'var(--danger)', marginTop: '0.2rem', display: 'block' }}>
                {errors.reference_number.message}
              </span>
            )}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            Notes / Receipt Remarks
          </label>
          <input
            type="text"
            placeholder="e.g. Walk-in renewal with student ID verification"
            maxLength={500}
            {...register('notes')}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting || members.length === 0}>
            {isSubmitting ? 'Saving...' : initialPayment ? 'Update Payment' : 'Complete Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
