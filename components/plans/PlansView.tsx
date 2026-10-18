'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Layers, CheckCircle2, XCircle, Pencil, Power } from 'lucide-react';
import { DBService } from '@/lib/data/db-service';
import { amountProblem, MAX_AMOUNT } from '@/lib/ui/validation';
import { useGymDataRefresh } from '@/lib/ui/use-gym-data-refresh';
import { MembershipPlan, UserProfile } from '@/types/database';
import { Modal } from '@/components/ui/Modal';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { showToast, showError, showConfirm } from '@/lib/ui/swal';

export const PlansView: React.FC = () => {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // The plan being edited, or null when adding a new one.
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);

  // Plan form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('1');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setPlans(DBService.getPlans());
    setProfile(DBService.getProfile());
  };

  useGymDataRefresh(load);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const handleUpdate = () => load();
    window.addEventListener('storage', handleUpdate);
    return () => window.removeEventListener('storage', handleUpdate);
  }, []);

  const currency = profile?.currency || '₱';

  const openModal = (plan?: MembershipPlan) => {
    setEditingPlan(plan || null);
    setName(plan?.name || '');
    setPrice(plan ? String(plan.price) : '');
    setDuration(plan ? String(plan.duration_months) : '1');
    setDescription(plan?.description || '');
    setIsModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedPrice = Number(price);
    const parsedDuration = Number(duration);

    if (!name.trim()) {
      showError('Plan name required', 'Please enter a name for the plan.');
      return;
    }
    const priceProblem = amountProblem(price);
    if (priceProblem) {
      showError('Invalid price', priceProblem);
      return;
    }
    if (!Number.isInteger(parsedDuration) || parsedDuration <= 0 || parsedDuration > 120) {
      showError('Invalid duration', 'Enter a whole number of months from 1 to 120.');
      return;
    }
    // Two plans with the same name can't be told apart in the plan dropdowns.
    const normalizedName = name.trim().replace(/\s+/g, ' ').toLowerCase();
    const duplicate = plans.find(
      (p) => p.id !== editingPlan?.id && p.name.trim().replace(/\s+/g, ' ').toLowerCase() === normalizedName
    );
    if (duplicate) {
      showError('Name already used', 'Another plan already has this name. Please choose a different name.');
      return;
    }

    setSaving(true);
    try {
      const fields = {
        name: name.trim(),
        price: parsedPrice,
        duration_months: parsedDuration,
        description: description.trim(),
      };
      if (editingPlan) {
        await DBService.updatePlan(editingPlan.id, fields);
      } else {
        await DBService.addPlan({ ...fields, is_active: true });
      }
      load();
      setIsModalOpen(false);
      showToast(editingPlan ? 'Membership plan updated' : 'Membership plan added');
    } catch (err) {
      showError('Save Failed', err instanceof Error ? err.message : 'Could not save the plan.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (plan: MembershipPlan) => {
    const deactivating = plan.is_active;
    let text: string;
    if (deactivating) {
      const memberCount = DBService.getMembers().filter((m) => m.membership_plan_id === plan.id).length;
      text =
        memberCount > 0
          ? `${memberCount} ${memberCount === 1 ? 'member is' : 'members are'} on "${plan.name}". They keep it, but it can't be picked for new members or payments.`
          : `"${plan.name}" will no longer be available for new members or payments.`;
    } else {
      text = `"${plan.name}" will be available again for new members and payments.`;
    }
    const confirmed = await showConfirm(
      deactivating ? 'Deactivate plan?' : 'Activate plan?',
      text,
      deactivating ? 'Yes, deactivate' : 'Yes, activate',
      deactivating ? '#ef4444' : '#059669'
    );
    if (!confirmed) return;
    try {
      await DBService.updatePlan(plan.id, { is_active: !plan.is_active });
      load();
      showToast(deactivating ? 'Plan deactivated' : 'Plan activated');
    } catch (err) {
      showError('Save Failed', err instanceof Error ? err.message : 'Could not update the plan.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* 1. Page Header */}
      <ScrollReveal delay={0}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
              Membership Plans
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#86868b' }}>
              Create the membership tiers members can be subscribed to.
            </p>
          </div>

          <button onClick={() => openModal()} className="btn btn-primary btn-sm">
            <Plus size={14} />
            <span>Add Plan</span>
          </button>
        </div>
      </ScrollReveal>

      {/* 2. Plans Grid */}
      <ScrollReveal delay={40}>
        {plans.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="card"
                style={{
                  padding: '1.35rem 1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '9px',
                      backgroundColor: '#ecfdf5',
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Layers size={17} />
                  </div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '999px',
                      backgroundColor: plan.is_active ? '#ecfdf5' : '#f1f5f9',
                      color: plan.is_active ? '#059669' : '#64748b',
                      border: `1px solid ${plan.is_active ? '#d1fae5' : '#e2e8f0'}`,
                    }}
                  >
                    {plan.is_active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    {plan.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1d1d1f', marginBottom: '0.35rem' }}>
                    {plan.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                      {currency}{Number(plan.price).toLocaleString()}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#86868b', fontWeight: 500 }}>
                      / {plan.duration_months} {plan.duration_months === 1 ? 'month' : 'months'}
                    </span>
                  </div>
                </div>

                {plan.description && (
                  <p style={{ fontSize: '0.825rem', color: '#424245', lineHeight: 1.5 }}>
                    {plan.description}
                  </p>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '0.5rem',
                    fontSize: '0.75rem',
                    color: '#86868b',
                    marginTop: 'auto',
                    paddingTop: '0.5rem',
                    borderTop: '1px solid #f1f5f9',
                  }}
                >
                  <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={() => openModal(plan)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <Pencil size={12} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(plan)}
                      className="btn btn-secondary btn-sm"
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.3rem 0.65rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        color: plan.is_active ? '#ef4444' : '#059669',
                      }}
                    >
                      <Power size={12} />
                      <span>{plan.is_active ? 'Deactivate' : 'Activate'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="card"
            style={{
              padding: '3rem 1.5rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#f1f5f9',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Layers size={22} />
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1d1d1f' }}>
              No membership plans yet
            </div>
            <p style={{ fontSize: '0.85rem', color: '#86868b', maxWidth: '360px' }}>
              Add your first plan so you can register members and record payments against it.
            </p>
            <button onClick={() => openModal()} className="btn btn-primary btn-sm" style={{ marginTop: '0.35rem' }}>
              <Plus size={14} />
              <span>Add Plan</span>
            </button>
          </div>
        )}
      </ScrollReveal>

      {/* 3. Add / Edit Plan Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlan ? 'Edit Membership Plan' : 'Add Membership Plan'}
        subtitle={editingPlan ? 'Update the details of this membership tier.' : 'Define a new membership tier for your gym.'}
      >
        <form onSubmit={handleSavePlan} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {editingPlan && (
            <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', color: '#1e40af', fontSize: '0.8rem', lineHeight: 1.4 }}>
              Changes apply to new payments and renewals only. Past payments and current expiration dates stay the same.
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Plan Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Student Monthly Pass"
              maxLength={60}
              style={{ width: '100%' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Price ({currency}) *
              </label>
              <input
                type="number"
                min="0.01"
                max={MAX_AMOUNT}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 1500"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Duration (months) *
              </label>
              <input
                type="number"
                min="1"
                max="120"
                step="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 1"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's included in this plan?"
              maxLength={500}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editingPlan ? 'Save Changes' : 'Add Plan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
