'use client';

import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { DBService } from '@/lib/data/db-service';
import { GymDetails } from '@/types/database';
import { OpeningHoursEditor } from '@/components/gym/OpeningHoursEditor';
import { DEFAULT_OPENING_HOURS, emptyGymDetails, invalidHourDays } from '@/lib/ui/gym';
import { showError } from '@/lib/ui/swal';

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' };

const currentDetails = (): GymDetails => {
  const gym = DBService.getGym();
  if (!gym) return emptyGymDetails();
  return {
    name: gym.name,
    address: gym.address,
    city: gym.city,
    phone: gym.phone,
    email: gym.email,
    currency: gym.currency,
    opening_hours: gym.opening_hours || DEFAULT_OPENING_HOURS,
    walk_in_price: gym.walk_in_price,
  };
};

export const GymSettings: React.FC = () => {
  const [details, setDetails] = useState<GymDetails>(currentDetails);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof GymDetails>(key: K, value: GymDetails[K]) => setDetails((d) => ({ ...d, [key]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const badDays = invalidHourDays(details.opening_hours || DEFAULT_OPENING_HOURS);
    if (badDays.length > 0) {
      showError('Check opening hours', `Closing time must be after opening time on ${badDays.join(', ')}.`);
      return;
    }
    setSaving(true);
    try {
      await DBService.updateGym({ ...details, name: details.name.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      showError('Save Failed', err instanceof Error ? err.message : 'Could not save gym details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '620px' }}>
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>Gym Details</h2>
        <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Shown to your staff and used on receipts and reminders.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
        <div>
          <label style={labelStyle}>Gym Name</label>
          <input type="text" value={details.name} onChange={(e) => set('name', e.target.value)} style={{ width: '100%' }} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={labelStyle}>Street Address</label>
            <input type="text" value={details.address} onChange={(e) => set('address', e.target.value)} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={labelStyle}>City</label>
            <input type="text" value={details.city} onChange={(e) => set('city', e.target.value)} style={{ width: '100%' }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={labelStyle}>Gym Phone</label>
            <input type="tel" value={details.phone} onChange={(e) => set('phone', e.target.value)} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={labelStyle}>Gym Email</label>
            <input type="email" value={details.email} onChange={(e) => set('email', e.target.value)} style={{ width: '100%' }} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Walk-in Price ({details.currency})</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={details.walk_in_price ?? ''}
            onChange={(e) => set('walk_in_price', e.target.value === '' ? null : Number(e.target.value))}
            placeholder="e.g. 100"
            style={{ width: '100%' }}
          />
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
            What a one-time visitor pays. Filled in automatically when you record a walk-in.
          </p>
        </div>
        <div>
          <label style={labelStyle}>Opening Hours</label>
          <OpeningHoursEditor
            value={details.opening_hours || DEFAULT_OPENING_HOURS}
            onChange={(hours) => set('opening_hours', hours)}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button type="submit" className="btn btn-primary" disabled={saving} style={{ backgroundColor: '#0f172a', borderColor: '#0f172a' }}>
          {saving ? 'Saving…' : 'Save Gym Details'}
        </button>
        {saved && (
          <span style={{ fontSize: '0.825rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
            <CheckCircle size={15} />
            <span>Gym details saved!</span>
          </span>
        )}
      </div>
    </form>
  );
};
