'use client';

import React from 'react';
import { OpeningHours, WEEK_DAYS, WeekDay } from '@/types/database';

interface OpeningHoursEditorProps {
  value: OpeningHours;
  onChange: (hours: OpeningHours) => void;
}

export const OpeningHoursEditor: React.FC<OpeningHoursEditorProps> = ({ value, onChange }) => {
  const setDay = (day: WeekDay, changes: Partial<OpeningHours[WeekDay]>) =>
    onChange({ ...value, [day]: { ...value[day], ...changes } });

  // Copy Monday's hours to every day that's open.
  const copyMondayToAll = () => {
    const { open, close } = value.mon;
    onChange(
      Object.fromEntries(WEEK_DAYS.map(({ key }) => [key, { ...value[key], open, close }])) as OpeningHours
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {WEEK_DAYS.map(({ key, label }) => {
        const day = value[key];
        return (
          <div key={key} className="opening-hours-row" style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr auto', gap: '0.6rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: day.closed ? '#94a3b8' : '#334155' }}>{label}</span>
            <input
              type="time"
              value={day.open}
              disabled={day.closed}
              onChange={(e) => setDay(key, { open: e.target.value })}
              aria-label={`${label} opening time`}
              style={{ width: '100%', opacity: day.closed ? 0.4 : 1 }}
            />
            <input
              type="time"
              value={day.close}
              disabled={day.closed}
              onChange={(e) => setDay(key, { close: e.target.value })}
              aria-label={`${label} closing time`}
              style={{ width: '100%', opacity: day.closed ? 0.4 : 1 }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#64748b', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={day.closed} onChange={(e) => setDay(key, { closed: e.target.checked })} />
              Closed
            </label>
          </div>
        );
      })}
      <button
        type="button"
        onClick={copyMondayToAll}
        style={{ alignSelf: 'flex-start', fontSize: '0.8rem', color: '#059669', fontWeight: 600, cursor: 'pointer', marginTop: '0.25rem' }}
      >
        Use Monday&apos;s hours for every day
      </button>
      <style jsx>{`
        @media (max-width: 520px) {
          .opening-hours-row {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
