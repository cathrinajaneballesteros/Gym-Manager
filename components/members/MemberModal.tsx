'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Modal } from '@/components/ui/Modal';
import { DBService } from '@/lib/data/db-service';
import { Member, MembershipPlan } from '@/types/database';
import { showError } from '@/lib/ui/swal';
import { addMonthsToDateKey, getTodayKey } from '@/lib/ui/date';

const memberSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required').max(60, 'First name is too long'),
  last_name: z.string().trim().min(1, 'Last name is required').max(60, 'Last name is too long'),
  email: z.union([z.literal(''), z.string().trim().email('Please enter a valid email address').max(120)]),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9()\-\s]{7,20}$/, 'Use digits only, e.g. 09171234567 or +63 917 123 4567')
    .refine((v) => v.replace(/\D/g, '').length >= 7, 'Enter at least 7 digits'),
  emergency_contact: z.string().trim().max(120, 'Emergency contact is too long'),
  membership_plan_id: z.string().min(1, 'Please select a membership plan'),
  start_date: z.string().min(10, 'Start date is required'),
  end_date: z.string().min(10, 'End date is required'),
  notes: z.string().max(500, 'Notes can be up to 500 characters').optional(),
});

// Digits only, with +63 written as 0, so "+63 917 123 4567" and "0917 123 4567" match as the same number.
const normalizePhone = (value: string) => value.replace(/\D/g, '').replace(/^63(?=9\d{9}$)/, '0');

type MemberFormData = z.infer<typeof memberSchema>;

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (member: Member) => void;
  initialMember?: Member | null;
}

export const MemberModal: React.FC<MemberModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMember,
}) => {
  const plans: MembershipPlan[] = DBService.getPlans();
  // Only active plans can be chosen, but always keep the member's current plan
  // in the list so editing someone on a deactivated plan does not drop it.
  const selectablePlans = plans.filter(
    (p) => p.is_active || p.id === initialMember?.membership_plan_id
  );
  const todayStr = getTodayKey();
  // Once a member has paid, payments set their end date (each renewal extends it), so editing
  // the plan or start date must not reset it to one plan length.
  const datesSetByPayments = Boolean(initialMember && initialMember.status !== 'pending');

  const buildDefaultValues = (): MemberFormData => {
    const defaultPlanId = initialMember?.membership_plan_id || selectablePlans[0]?.id || '';
    const defaultStartDate = initialMember?.start_date || todayStr;
    const selectedPlan = plans.find((p) => p.id === defaultPlanId);
    const duration = selectedPlan?.duration_months || 1;
    const computedEndDate = addMonthsToDateKey(defaultStartDate, duration);

    return initialMember
      ? {
          first_name: initialMember.first_name,
          last_name: initialMember.last_name,
          email: initialMember.email || '',
          phone: initialMember.phone || '',
          emergency_contact: initialMember.emergency_contact || '',
          membership_plan_id: initialMember.membership_plan_id,
          start_date: initialMember.start_date,
          end_date: initialMember.end_date || computedEndDate,
          notes: initialMember.notes || '',
        }
      : {
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          emergency_contact: '',
          membership_plan_id: defaultPlanId,
          start_date: defaultStartDate,
          end_date: computedEndDate,
          notes: '',
        };
  };

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: buildDefaultValues(),
  });

  // Recalculate the expiration date only when the user changes the start date or plan.
  // (Doing it in an effect also fired on open/re-render and wiped renewed end dates.)
  const recalculateEndDate = () => {
    if (datesSetByPayments) return;
    const selectedPlan = plans.find((p) => p.id === getValues('membership_plan_id'));
    if (!selectedPlan) return;
    const computed = addMonthsToDateKey(getValues('start_date'), selectedPlan.duration_months);
    if (computed) {
      setValue('end_date', computed, { shouldValidate: true });
    }
  };

  // Refill the form with the correct values every time the modal opens or the record changes.
  useEffect(() => {
    if (!isOpen) return;
    reset(buildDefaultValues());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialMember?.id]);

  const onSubmit = async (data: MemberFormData) => {
    // Stop the same person being registered twice by mistake.
    const email = data.email.toLowerCase();
    const phone = normalizePhone(data.phone);
    const duplicate = DBService.getMembers().find(
      (m) =>
        m.id !== initialMember?.id &&
        ((email && m.email?.toLowerCase() === email) || (phone && normalizePhone(m.phone || '') === phone))
    );
    if (duplicate) {
      const field = email && duplicate.email?.toLowerCase() === email ? 'email' : 'phone number';
      showError(
        'Member Already Exists',
        `${duplicate.first_name} ${duplicate.last_name} already uses this ${field}.`
      );
      return;
    }

    try {
      if (initialMember) {
        const updated = await DBService.updateMember(initialMember.id, data);
        onSuccess(updated);
      } else {
        const created = await DBService.addMember({
          ...data,
          last_visit_date: data.start_date,
        });
        onSuccess(created);
      }
      reset();
      onClose();
    } catch (err) {
      showError('Save Failed', err instanceof Error ? err.message : 'Failed to save member record');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialMember ? 'Edit Gym Member' : 'Register New Member'}
      subtitle={initialMember ? 'Update subscription details and emergency contacts' : 'Add a new member. They stay Pending until their first payment is recorded in Payments.'}
    >
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              First Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Aaron Ram"
              maxLength={60}
              {...register('first_name')}
              style={{ width: '100%' }}
            />
            {errors.first_name && (
              <span style={{ fontSize: '0.725rem', color: 'var(--danger)', marginTop: '0.2rem', display: 'block' }}>
                {errors.first_name.message}
              </span>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Last Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Cabato"
              maxLength={60}
              {...register('last_name')}
              style={{ width: '100%' }}
            />
            {errors.last_name && (
              <span style={{ fontSize: '0.725rem', color: 'var(--danger)', marginTop: '0.2rem', display: 'block' }}>
                {errors.last_name.message}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Email Address
            </label>
            <input
              type="email"
              placeholder="member@example.com"
              maxLength={120}
              {...register('email')}
              style={{ width: '100%' }}
            />
            {errors.email && (
              <span style={{ fontSize: '0.725rem', color: 'var(--danger)', marginTop: '0.2rem', display: 'block' }}>
                {errors.email.message}
              </span>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Phone Number *
            </label>
            <input
              type="text"
              placeholder="+63 9xx xxx xxxx"
              maxLength={20}
              {...register('phone')}
              style={{ width: '100%' }}
            />
            {errors.phone && (
              <span style={{ fontSize: '0.725rem', color: 'var(--danger)', marginTop: '0.2rem', display: 'block' }}>
                {errors.phone.message}
              </span>
            )}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            Emergency Contact Name & Phone
          </label>
          <input
            type="text"
            placeholder="e.g. Maria Cabato (Mother) - 09171112234"
            maxLength={120}
            {...register('emergency_contact')}
            style={{ width: '100%' }}
          />
          {errors.emergency_contact && (
            <span style={{ fontSize: '0.725rem', color: 'var(--danger)', marginTop: '0.2rem', display: 'block' }}>
              {errors.emergency_contact.message}
            </span>
          )}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            Membership Plan *
          </label>
          {selectablePlans.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.6rem 0.75rem', border: '1px dashed #e2e8f0', borderRadius: '8px' }}>
              No active membership plans yet.{' '}
              <Link href="/plans" onClick={onClose} style={{ color: '#0071e3', fontWeight: 600 }}>
                Create a membership plan first
              </Link>
            </div>
          ) : (
            <select
              {...register('membership_plan_id', { onChange: recalculateEndDate })}
              style={{ width: '100%' }}
            >
              {selectablePlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ₱{p.price.toLocaleString()} ({p.duration_months} mo)
                </option>
              ))}
            </select>
          )}
          {errors.membership_plan_id && (
            <span style={{ fontSize: '0.725rem', color: 'var(--danger)', marginTop: '0.2rem', display: 'block' }}>
              {errors.membership_plan_id.message}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Start Date *
            </label>
            <input type="date" {...register('start_date', { onChange: recalculateEndDate })} style={{ width: '100%' }} />
            {errors.start_date && (
              <span style={{ fontSize: '0.725rem', color: 'var(--danger)', marginTop: '0.2rem', display: 'block' }}>
                {errors.start_date.message}
              </span>
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Expiration Date *
              </label>
              <span
                style={{
                  fontSize: '0.7rem',
                  color: '#64748b',
                  fontWeight: 500,
                  backgroundColor: '#f1f5f9',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '4px',
                  border: '1px solid #e2e8f0',
                }}
              >
                {datesSetByPayments ? 'Set by payments' : 'Auto-calculated'}
              </span>
            </div>
            <input
              type="date"
              {...register('end_date')}
              readOnly
              tabIndex={-1}
              title={
                datesSetByPayments
                  ? 'Extended by each completed payment; a new plan applies from the next renewal'
                  : 'Automatically calculated from the start date and selected membership plan'
              }
              style={{
                width: '100%',
                backgroundColor: '#f8fafc',
                color: '#475569',
                cursor: 'not-allowed',
                borderColor: '#e2e8f0',
              }}
            />
            {errors.end_date && (
              <span style={{ fontSize: '0.725rem', color: 'var(--danger)', marginTop: '0.2rem', display: 'block' }}>
                {errors.end_date.message}
              </span>
            )}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            Special Notes (Fitness goals, medical considerations)
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Focus on strength training, morning session attendee"
            maxLength={500}
            {...register('notes')}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting || selectablePlans.length === 0}>
            {isSubmitting ? 'Saving...' : initialMember ? 'Update Member' : 'Register Member'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
