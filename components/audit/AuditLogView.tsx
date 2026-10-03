'use client';

import React, { useState, useMemo, useSyncExternalStore } from 'react';
import {
  ShieldCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  Activity,
  Clock,
  CalendarDays,
} from 'lucide-react';
import { AuditAction, AuditEntityType, AuditLogEntry } from '@/types/database';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

const AUDIT_STORAGE_KEY = 'sgfm_audit_log_clean';

const subscribeAudit = (callback: () => void) => {
  window.addEventListener('sgfm_audit_updated', callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener('sgfm_audit_updated', callback);
    window.removeEventListener('storage', callback);
  };
};

const getAuditSnapshot = (): string => {
  if (typeof window === 'undefined') return '[]';
  return localStorage.getItem(AUDIT_STORAGE_KEY) ?? '[]';
};

const getAuditServerSnapshot = (): string => '[]';

interface ActionMeta {
  label: string;
  color: string;
  background: string;
  border: string;
}

const ACTION_META: Record<AuditAction, ActionMeta> = {
  'auth.login': { label: 'Signed in', color: '#7c3aed', background: '#f5f3ff', border: '#ddd6fe' },
  'auth.logout': { label: 'Signed out', color: '#7c3aed', background: '#f5f3ff', border: '#ddd6fe' },
  'auth.signup': { label: 'Signed up', color: '#7c3aed', background: '#f5f3ff', border: '#ddd6fe' },
  'member.create': { label: 'Member created', color: '#059669', background: '#f0fdf4', border: '#bbf7d0' },
  'member.update': { label: 'Member updated', color: '#2563eb', background: '#eff6ff', border: '#bfdbfe' },
  'member.delete': { label: 'Member deleted', color: '#ef4444', background: '#fef2f2', border: '#fecaca' },
  'payment.create': { label: 'Payment recorded', color: '#059669', background: '#f0fdf4', border: '#bbf7d0' },
  'expense.create': { label: 'Expense added', color: '#059669', background: '#f0fdf4', border: '#bbf7d0' },
  'expense.update': { label: 'Expense updated', color: '#2563eb', background: '#eff6ff', border: '#bfdbfe' },
  'expense.delete': { label: 'Expense deleted', color: '#ef4444', background: '#fef2f2', border: '#fecaca' },
};

const ENTITY_LABEL: Record<AuditEntityType, string> = {
  auth: 'Authentication',
  member: 'Member',
  payment: 'Payment',
  expense: 'Expense',
};

export const AuditLogView: React.FC = () => {
  const rawEntries = useSyncExternalStore(subscribeAudit, getAuditSnapshot, getAuditServerSnapshot);
  const entries = useMemo<AuditLogEntry[]>(() => {
    try {
      const parsed = JSON.parse(rawEntries);
      return Array.isArray(parsed) ? (parsed as AuditLogEntry[]) : [];
    } catch {
      return [];
    }
  }, [rawEntries]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const filteredEntries = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return entries.filter((entry) => {
      const meta = ACTION_META[entry.action];
      const matchesSearch =
        (entry.actor_email || '').toLowerCase().includes(query) ||
        (entry.entity_label || '').toLowerCase().includes(query) ||
        (meta?.label || '').toLowerCase().includes(query);

      const matchesAction =
        actionFilter === 'all' ||
        (actionFilter === 'auth'
          ? entry.action.startsWith('auth.')
          : entry.action.endsWith(`.${actionFilter}`));

      const matchesEntity = entityFilter === 'all' || entry.entity_type === entityFilter;

      return matchesSearch && matchesAction && matchesEntity;
    });
  }, [entries, searchQuery, actionFilter, entityFilter]);

  const totalPages = Math.ceil(filteredEntries.length / pageSize) || 1;
  const paginated = filteredEntries.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const todayKey = new Date().toISOString().split('T')[0];
  const eventsToday = entries.filter((e) => (e.created_at || '').startsWith(todayKey)).length;
  const lastActivity = entries[0]?.created_at;

  const formatDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const summaryCards = [
    { label: 'Total Events', value: entries.length.toLocaleString(), icon: Activity, color: '#0071e3' },
    { label: 'Events Today', value: eventsToday.toLocaleString(), icon: CalendarDays, color: '#059669' },
    {
      label: 'Last Activity',
      value: lastActivity ? formatDateTime(lastActivity) : '—',
      icon: Clock,
      color: '#7c3aed',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* 1. Page Header */}
      <ScrollReveal delay={0}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.15rem' }}>
              Audit Log
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
              A chronological record of administrator activity across members, payments, expenses, and sign-ins.
            </p>
          </div>
        </div>
      </ScrollReveal>

      {/* 2. Summary Cards */}
      <ScrollReveal delay={40}>
        <div className="grid grid-cols-3 gap-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card" style={{ padding: '1.25rem 1.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>{card.label}</div>
                  <Icon size={16} color={card.color} />
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
                  {card.value}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollReveal>

      {/* 3. Filters & Search Bar */}
      <ScrollReveal delay={70}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.5rem 0.85rem',
              width: '100%',
              maxWidth: '340px',
            }}
          >
            <Search size={15} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search by actor, entity, or action..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.85rem',
                color: '#0f172a',
                width: '100%',
                padding: 0,
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.5rem 0.85rem',
                fontSize: '0.85rem',
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Actions</option>
              <option value="create">Created</option>
              <option value="update">Updated</option>
              <option value="delete">Deleted</option>
              <option value="auth">Authentication</option>
            </select>

            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.5rem 0.85rem',
                fontSize: '0.85rem',
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Entities</option>
              <option value="member">Members</option>
              <option value="payment">Payments</option>
              <option value="expense">Expenses</option>
              <option value="auth">Authentication</option>
            </select>
          </div>
        </div>
      </ScrollReveal>

      {/* 4. Audit Table Card */}
      <ScrollReveal delay={100}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Activity History</h2>
          </div>

          {filteredEntries.length === 0 ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
              No audit events recorded yet matching the criteria.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '0.785rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '0.9rem 1.5rem' }}>Time</th>
                    <th style={{ padding: '0.9rem 1.25rem' }}>Actor</th>
                    <th style={{ padding: '0.9rem 1.25rem' }}>Action</th>
                    <th style={{ padding: '0.9rem 1.25rem' }}>Entity</th>
                    <th style={{ padding: '0.9rem 1.5rem' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((entry) => {
                    const meta = ACTION_META[entry.action];
                    const changed = entry.metadata?.changed;
                    return (
                      <tr
                        key={entry.id}
                        style={{ borderBottom: '1px solid #f8fafc', transition: 'background-color 0.15s ease' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={{ padding: '1rem 1.5rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {formatDateTime(entry.created_at)}
                        </td>

                        <td style={{ padding: '1rem 1.25rem', color: '#334155', fontSize: '0.825rem' }}>
                          {entry.actor_email || 'Unknown'}
                        </td>

                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span
                            style={{
                              padding: '0.25rem 0.65rem',
                              borderRadius: '6px',
                              backgroundColor: meta?.background || '#f1f5f9',
                              color: meta?.color || '#334155',
                              fontSize: '0.785rem',
                              fontWeight: 600,
                              border: `1px solid ${meta?.border || '#e2e8f0'}`,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {meta?.label || entry.action}
                          </span>
                        </td>

                        <td style={{ padding: '1rem 1.25rem', color: '#64748b', fontSize: '0.825rem' }}>
                          {ENTITY_LABEL[entry.entity_type] || entry.entity_type}
                        </td>

                        <td style={{ padding: '1rem 1.5rem' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{entry.entity_label || '—'}</div>
                          {typeof changed === 'string' && changed !== 'none' && (
                            <div style={{ fontSize: '0.785rem', color: '#64748b' }}>Changed: {changed}</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {filteredEntries.length > 0 && (
            <div
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.825rem',
                color: '#64748b',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                Showing {Math.min((currentPage - 1) * pageSize + 1, filteredEntries.length)}-
                {Math.min(currentPage * pageSize, filteredEntries.length)} of {filteredEntries.length}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '0.35rem 0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    color: currentPage === 1 ? '#cbd5e1' : '#334155',
                    backgroundColor: '#ffffff',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ChevronLeft size={14} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: currentPage === page ? 700 : 500,
                      color: currentPage === page ? '#ffffff' : '#334155',
                      backgroundColor: currentPage === page ? '#0f172a' : '#ffffff',
                      border: '1px solid',
                      borderColor: currentPage === page ? '#0f172a' : '#e2e8f0',
                      cursor: 'pointer',
                    }}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '0.35rem 0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    color: currentPage === totalPages ? '#cbd5e1' : '#334155',
                    backgroundColor: '#ffffff',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </ScrollReveal>
    </div>
  );
};
