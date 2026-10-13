'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Modal } from '@/components/ui/Modal';
import { DBService } from '@/lib/data/db-service';
import { Expense } from '@/types/database';
import { showError } from '@/lib/ui/swal';
import { getTodayKey } from '@/lib/ui/date';

const expenseSchema = z.object({
  category: z.enum([
    'Equipment',
    'Utilities',
    'Salaries',
    'Rent',
    'Maintenance',
    'Supplies',
    'Marketing',
    'Other',
  ]),
  title: z.string().min(3, 'Expense title must be at least 3 characters'),
  amount: z.number().positive('Expense amount must be greater than 0'),
  expense_date: z.string().min(10, 'Expense date is required'),
  payment_method: z.enum(['Cash', 'GCash'], { message: 'Payment method is required' }),
  description: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (expense: Expense) => void;
  initialExpense?: Expense | null;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialExpense,
}) => {
  const todayStr = getTodayKey();

  const buildDefaultValues = (): ExpenseFormData =>
    initialExpense
      ? {
          category: initialExpense.category,
          title: initialExpense.title,
          amount: Number(initialExpense.amount),
          expense_date: initialExpense.expense_date,
          payment_method: initialExpense.payment_method,
          description: initialExpense.description || '',
        }
      : {
          category: 'Utilities',
          title: '',
          amount: 0,
          expense_date: todayStr,
          payment_method: 'GCash',
          description: '',
        };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: buildDefaultValues(),
  });

  // Refill the form with the correct values every time the modal opens or the record changes.
  useEffect(() => {
    if (!isOpen) return;
    reset(buildDefaultValues());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialExpense?.id]);

  const onSubmit = async (data: ExpenseFormData) => {
    try {
      if (initialExpense) {
        const updated = await DBService.updateExpense(initialExpense.id, data);
        onSuccess(updated);
      } else {
        const created = await DBService.addExpense(data);
        onSuccess(created);
      }
      reset();
      onClose();
    } catch (err: any) {
      showError('Save Failed', err.message || 'Failed to save expense');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialExpense ? 'Edit Operational Expense' : 'Record New Gym Expense'}
      subtitle="Track facility overhead, staff payroll, bills, and upkeep"
    >
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Expense Category *
            </label>
            <select {...register('category')} style={{ width: '100%' }}>
              <option value="Utilities">Utilities (Electricity, Water, Internet)</option>
              <option value="Rent">Rent (Gym Commercial Lease)</option>
              <option value="Salaries">Salaries (Trainers, Staff, Cleaning)</option>
              <option value="Equipment">Equipment (Weights, Benches, Bars)</option>
              <option value="Maintenance">Maintenance (Machine Repairs, AC Servicing)</option>
              <option value="Supplies">Supplies (Sanitation, Towels, Chalk)</option>
              <option value="Marketing">Marketing (Social Media, Local Ads)</option>
              <option value="Other">Other Operating Expense</option>
            </select>
            {errors.category && (
              <span style={{ fontSize: '0.725rem', color: 'var(--danger)', marginTop: '0.2rem', display: 'block' }}>
                {errors.category.message}
              </span>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Amount (₱) *
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="e.g. 15000"
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

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            Expense Description / Payee *
          </label>
          <input
            type="text"
            placeholder="e.g. Commercial Meralco Electricity Bill"
            {...register('title')}
            style={{ width: '100%' }}
          />
          {errors.title && (
            <span style={{ fontSize: '0.725rem', color: 'var(--danger)', marginTop: '0.2rem', display: 'block' }}>
              {errors.title.message}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Disbursement Date *
            </label>
            <input type="date" {...register('expense_date')} style={{ width: '100%' }} />
            {errors.expense_date && (
              <span style={{ fontSize: '0.725rem', color: 'var(--danger)', marginTop: '0.2rem', display: 'block' }}>
                {errors.expense_date.message}
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
            {errors.payment_method && (
              <span style={{ fontSize: '0.725rem', color: 'var(--danger)', marginTop: '0.2rem', display: 'block' }}>
                {errors.payment_method.message}
              </span>
            )}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            Detailed Notes / Invoice Reference
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Invoice #2026-9901 from supplier. Includes delivery and labor."
            {...register('description')}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Recording...' : initialExpense ? 'Update Expense' : 'Record Expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
