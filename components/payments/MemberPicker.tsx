'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { Member } from '@/types/database';

interface MemberPickerProps {
  members: Member[];
  value: string;
  onChange: (memberId: string) => void;
  hasError?: boolean;
}

const getInitials = (m: Member) =>
  `${m.first_name?.[0] || ''}${m.last_name?.[0] || ''}`.toUpperCase() || '?';

const Avatar: React.FC<{ member: Member; size?: number }> = ({ member, size = 32 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
      color: '#047857',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700,
      fontSize: size <= 28 ? '0.7rem' : '0.75rem',
      flexShrink: 0,
    }}
  >
    {getInitials(member)}
  </div>
);

const PendingPill: React.FC = () => (
  <span
    style={{
      fontSize: '0.65rem',
      fontWeight: 700,
      padding: '0.15rem 0.45rem',
      borderRadius: '9999px',
      backgroundColor: '#fef2f2',
      color: '#dc2626',
      border: '1px solid #fecaca',
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}
  >
    Awaiting payment
  </span>
);

/**
 * Styled member selector that replaces the native <select>.
 * Renders inline (not absolutely positioned) so it is never clipped by the modal's scroll container.
 */
export const MemberPicker: React.FC<MemberPickerProps> = ({ members, value, onChange, hasError }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = members.find((m) => m.id === value);

  // Pending members first, then alphabetical
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .filter((m) => {
        if (!q) return true;
        return (
          `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
          (m.email || '').toLowerCase().includes(q) ||
          (m.phone || '').includes(q)
        );
      })
      .sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (b.status === 'pending' && a.status !== 'pending') return 1;
        return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
      });
  }, [members, query]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={wrapperRef}>
      {/* Trigger */}
      <button
        type="button"
        id="payment-member-picker"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '0.7rem',
          padding: '0.55rem 0.75rem',
          backgroundColor: '#ffffff',
          border: `1px solid ${hasError ? '#fca5a5' : open ? '#10b981' : '#e2e8f0'}`,
          borderRadius: open ? '10px 10px 0 0' : '10px',
          boxShadow: open ? '0 0 0 3px rgba(16, 185, 129, 0.12)' : 'none',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        }}
      >
        {selected ? (
          <>
            <Avatar member={selected} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {selected.first_name} {selected.last_name}
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: '#64748b',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {selected.email || selected.phone || 'No contact info'}
              </div>
            </div>
            {selected.status === 'pending' && <PendingPill />}
          </>
        ) : (
          <span style={{ flex: 1, fontSize: '0.875rem', color: '#94a3b8', padding: '0.4rem 0' }}>
            Select a member…
          </span>
        )}
        <ChevronDown
          size={16}
          color="#64748b"
          style={{ flexShrink: 0, transition: 'transform 0.2s ease', transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      {/* Panel */}
      {open && (
        <div
          role="listbox"
          style={{
            border: '1px solid #10b981',
            borderTop: 'none',
            borderRadius: '0 0 10px 10px',
            backgroundColor: '#ffffff',
            overflow: 'hidden',
            animation: 'modalSlideUp 0.15s ease-out',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.55rem 0.75rem',
              borderBottom: '1px solid #f1f5f9',
              backgroundColor: '#f8fafc',
            }}
          >
            <Search size={14} color="#94a3b8" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, or phone"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filtered[0]) pick(filtered[0].id);
                }
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  setOpen(false);
                }
              }}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '0.825rem',
                color: '#0f172a',
                padding: 0,
                boxShadow: 'none',
              }}
            />
          </div>

          <div style={{ maxHeight: '220px', overflowY: 'auto', padding: '0.3rem' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '0.9rem', textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
                No members match “{query}”
              </div>
            ) : (
              filtered.map((m) => {
                const isSelected = m.id === value;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => pick(m.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      padding: '0.5rem 0.55rem',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: isSelected ? '#ecfdf5' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.12s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Avatar member={m} size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '0.825rem',
                          fontWeight: 600,
                          color: '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {m.first_name} {m.last_name}
                      </div>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: '#64748b',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {m.email || m.phone || 'No contact info'}
                      </div>
                    </div>
                    {m.status === 'pending' && <PendingPill />}
                    {isSelected && <Check size={15} color="#059669" style={{ flexShrink: 0 }} />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
