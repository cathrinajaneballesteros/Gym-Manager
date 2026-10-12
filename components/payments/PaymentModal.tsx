'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Modal } from '@/components/ui/Modal';
import { DBService } from '@/lib/data/db-service';
import { Payment, Member, MembershipPlan } from '@/types/database';
import { showError } from '@/lib/ui/swal';
import { MemberPicker } from './MemberPicker';
import { addMonthsToDateKey, getTodayKey } from '@/lib/ui/date';
import { getPaymentMemberName } from '@/lib/ui/format';

const paymentSchema = z.object({
  member_id: z.string().min(1, 'Please select a member'),
  membership_plan_id: z.string().optional(),
  amount: z.number().positive('Payment amount must be greater than 0'),
  payment_date: z.string().min(10, 'Payment date is required'),
  payment_method: z.enum(['Cash', 'GCash']),
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

  const onSubmit = (data: PaymentFormData) => {
    try {
      let payment: Payment;
      if (initialPayment) {
        payment = DBService.updatePayment(initialPayment.id, data);
      } else {
        payment = DBService.addPayment(data);
      }

      // If it's a completed payment and not an edit, advance subscription date for renewals or expired memberships
      if (!initialPayment && data.payment_status === 'completed' && data.membership_plan_id) {
        const plan = plans.find((p) => p.id === data.membership_plan_id);
        const member = members.find((m) => m.id === data.member_id);
        if (member && plan) {
          const priorPayments = DBService.getPayments().filter(
            (p) => p.member_id === member.id && p.payment_status === 'completed' && p.id !== payment.id
          );
          const isExpired = new Date(member.end_date).getTime() < new Date(todayStr).getTime();

          // Only extend if renewing (prior payment exists) or reactivating an expired membership
          if (priorPayments.length > 0 || isExpired) {
            const baseDate = member.end_date > todayStr ? member.end_date : todayStr;
            DBService.updateMember(member.id, {
              end_date: addMonthsToDateKey(baseDate, plan.duration_months),
              status: 'active',
              membership_plan_id: plan.id,
            });
          } else {
            // First payment recorded for pending member: activate membership status
            DBService.updateMember(member.id, {
              status: 'active',
            });
          }
        }
      }

      onSuccess(payment);
      reset();
      onClose();
    } catch (err: any) {
      showError('Payment Failed', err.message || 'Failed to save payment record');
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
            {isSubmitting ? 'Saving...' : initialPayment ? 'Update Payment' : 'Complete Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
