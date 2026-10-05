'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Modal } from '@/components/ui/Modal';
import { DBService } from '@/lib/data/db-service';
import { Member, MembershipPlan } from '@/types/database';
import { showError } from '@/lib/ui/swal';

const memberSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(7, 'Please enter a valid phone number'),
  emergency_contact: z.string().min(3, 'Emergency contact is required'),
  membership_plan_id: z.string().min(1, 'Please select a membership plan'),
  start_date: z.string().min(10, 'Start date is required'),
  end_date: z.string().min(10, 'End date is required'),
  notes: z.string().optional(),
});

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
  const todayStr = new Date().toISOString().split('T')[0];

  // Default expiration 1 month from today
  const defaultEndDate = new Date();
  defaultEndDate.setMonth(defaultEndDate.getMonth() + 1);
  const defaultEndStr = defaultEndDate.toISOString().split('T')[0];

  const buildDefaultValues = (): MemberFormData =>
    initialMember
      ? {
          first_name: initialMember.first_name,
          last_name: initialMember.last_name,
          email: initialMember.email,
          phone: initialMember.phone,
          emergency_contact: initialMember.emergency_contact,
          membership_plan_id: initialMember.membership_plan_id,
          start_date: initialMember.start_date,
          end_date: initialMember.end_date,
          notes: initialMember.notes || '',
        }
      : {
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          emergency_contact: '',
          membership_plan_id: plans[0]?.id || '',
          start_date: todayStr,
          end_date: defaultEndStr,
          notes: '',
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

  // Refill the form with the correct values every time the modal opens or the record changes.
  useEffect(() => {
    if (!isOpen) return;
    reset(buildDefaultValues());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialMember?.id]);

  const onSubmit = (data: MemberFormData) => {
    try {
      if (initialMember) {
        const updated = DBService.updateMember(initialMember.id, data);
        onSuccess(updated);
      } else {
        const created = DBService.addMember({
          ...data,
          last_visit_date: data.start_date,
        });
        onSuccess(created);
      }
      reset();
      onClose();
    } catch (err: any) {
      showError('Save Failed', err.message || 'Failed to save member record');
    }
  };

  const handlePlanChange = (planId: string) => {
    const selectedPlan = plans.find((p) => p.id === planId);
    if (selectedPlan) {
      const startDate = getValues('start_date') || new Date().toISOString().split('T')[0];
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + selectedPlan.duration_months);
      setValue('end_date', d.toISOString().split('T')[0]);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialMember ? 'Edit Gym Member' : 'Register New Member'}
      subtitle={initialMember ? 'Update subscription details and emergency contacts' : 'Add member to active roster and auto-generate initial payment'}
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
              Email Address *
            </label>
            <input
              type="email"
              placeholder="member@example.com"
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
            Emergency Contact Name & Phone *
          </label>
          <input
            type="text"
            placeholder="e.g. Maria Cabato (Mother) - 09171112234"
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
                {p.name} — ₱{p.price.toLocaleString()} ({p.duration_months} mo)
              </option>
            ))}
          </select>
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
            <input type="date" {...register('start_date')} style={{ width: '100%' }} />
            {errors.start_date && (
              <span style={{ fontSize: '0.725rem', color: 'var(--danger)', marginTop: '0.2rem', display: 'block' }}>
                {errors.start_date.message}
              </span>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Expiration Date *
            </label>
            <input type="date" {...register('end_date')} style={{ width: '100%' }} />
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
            {...register('notes')}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : initialMember ? 'Update Member' : 'Register & Activate'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
