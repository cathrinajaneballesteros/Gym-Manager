'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Layers, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { DBService } from '@/lib/data/db-service';
import { MembershipPlan, UserProfile } from '@/types/database';
import { Modal } from '@/components/ui/Modal';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { showToast, showError } from '@/lib/ui/swal';

export const PlansView: React.FC = () => {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Add-plan form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('1');
  const [description, setDescription] = useState('');

  const load = () => {
    setPlans(DBService.getPlans());
    setProfile(DBService.getProfile());
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const handleUpdate = () => load();
    window.addEventListener('storage', handleUpdate);
    return () => window.removeEventListener('storage', handleUpdate);
  }, []);

  const currency = profile?.currency || '₱';

  const openModal = () => {
    setName('');
    setPrice('');
    setDuration('1');
    setDescription('');
    setIsModalOpen(true);
  };

  const handleAddPlan = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedPrice = Number(price);
    const parsedDuration = Number(duration);

    if (!name.trim()) {
      showError('Plan name required', 'Please enter a name for the plan.');
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      showError('Invalid price', 'Enter a price greater than 0.');
      return;
    }
    if (!Number.isInteger(parsedDuration) || parsedDuration <= 0) {
      showError('Invalid duration', 'Enter a whole number of months (at least 1).');
      return;
    }

    try {
      DBService.addPlan({
        name: name.trim(),
        price: parsedPrice,
        duration_months: parsedDuration,
        description: description.trim(),
        is_active: true,
      });
      load();
      setIsModalOpen(false);
      showToast('Membership plan added');
    } catch (err) {
      showError('Save Failed', err instanceof Error ? err.message : 'Could not add the plan.');
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

          <button onClick={openModal} className="btn btn-primary btn-sm">
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
                    gap: '0.35rem',
                    fontSize: '0.75rem',
                    color: '#86868b',
                    marginTop: 'auto',
                    paddingTop: '0.5rem',
                    borderTop: '1px solid #f1f5f9',
                  }}
                >
                  <Clock size={13} />
                  <span>{plan.duration_months} {plan.duration_months === 1 ? 'month term' : 'month term'}</span>
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
            <button onClick={openModal} className="btn btn-primary btn-sm" style={{ marginTop: '0.35rem' }}>
              <Plus size={14} />
              <span>Add Plan</span>
            </button>
          </div>
        )}
      </ScrollReveal>

      {/* 3. Add Plan Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Membership Plan"
        subtitle="Define a new membership tier for your gym."
      >
        <form onSubmit={handleAddPlan} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Plan Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Student Monthly Pass"
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
                min="0"
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
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add Plan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
