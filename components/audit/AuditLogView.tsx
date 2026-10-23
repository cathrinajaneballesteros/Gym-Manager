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
  Download,
} from 'lucide-react';
import { AuditAction, AuditEntityType, AuditLogEntry } from '@/types/database';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { Modal } from '@/components/ui/Modal';
import { showToast } from '@/lib/ui/swal';
import { getPageWindow } from '@/lib/ui/pagination';
import { getTodayKey, toDateKey } from '@/lib/ui/date';
import { downloadCSV } from '@/lib/ui/csv';
import { DBService } from '@/lib/data/db-service';

const subscribeAudit = (callback: () => void) => {
  window.addEventListener('sgfm_audit_updated', callback);
  window.addEventListener('sgfm_data_updated', callback);
  return () => {
    window.removeEventListener('sgfm_audit_updated', callback);
    window.removeEventListener('sgfm_data_updated', callback);
  };
};

// The log array is replaced (never changed in place) when an entry is added, so it is a stable snapshot.
const getAuditSnapshot = (): AuditLogEntry[] => DBService.getAuditLog();

// Payment entries written by the database say "₱1,500.00"; the app's own say "₱1,500". Show them the same way.
const displayLabel = (label?: string): string => (label || '').replace(/(\d)\.00\b/g, '$1');

const NO_ENTRIES: AuditLogEntry[] = [];
const getAuditServerSnapshot = (): AuditLogEntry[] => NO_ENTRIES;

type MetadataValue = string | number | boolean | null;

interface DetailRow {
  field: string;
  value: MetadataValue;
  from?: MetadataValue;
}

// Turn flat metadata into table rows, pairing `field.from` / `field.to` into one "old → new" row.
const getDetailRows = (metadata: AuditLogEntry['metadata']): DetailRow[] => {
  const rows: DetailRow[] = [];
  Object.entries(metadata || {}).forEach(([key, value]) => {
    if (key === 'changed') return;
    if (key.endsWith('.from')) {
      const field = key.slice(0, -'.from'.length);
      rows.push({ field, from: value, value: metadata?.[`${field}.to`] ?? null });
    } else if (!key.endsWith('.to')) {
      rows.push({ field: key, value });
    }
  });
  return rows;
};

const formatFieldName = (field: string): string =>
  field.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

const formatDetailValue = (value: MetadataValue): string =>
  value === null || value === '' ? '—' : String(value);

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
  'member.reminder_sent': { label: 'Reminder sent', color: '#d97706', background: '#fffbeb', border: '#fde68a' },
  'member.check_in_undo': { label: 'Check-in undone', color: '#ef4444', background: '#fef2f2', border: '#fecaca' },
  'payment.create': { label: 'Payment recorded', color: '#059669', background: '#f0fdf4', border: '#bbf7d0' },
  'payment.update': { label: 'Payment updated', color: '#2563eb', background: '#eff6ff', border: '#bfdbfe' },
  'payment.delete': { label: 'Payment deleted', color: '#ef4444', background: '#fef2f2', border: '#fecaca' },
  'payment.receipt_verify': { label: 'Receipt verified', color: '#059669', background: '#f0fdf4', border: '#bbf7d0' },
  'payment.receipt_reject': { label: 'Receipt rejected', color: '#dc2626', background: '#fef2f2', border: '#fecaca' },
  'payment.reminder_sent': { label: 'Payment reminder sent', color: '#d97706', background: '#fffbeb', border: '#fde68a' },
  'expense.create': { label: 'Expense added', color: '#059669', background: '#f0fdf4', border: '#bbf7d0' },
  'expense.update': { label: 'Expense updated', color: '#2563eb', background: '#eff6ff', border: '#bfdbfe' },
  'expense.delete': { label: 'Expense deleted', color: '#ef4444', background: '#fef2f2', border: '#fecaca' },
  'plan.create': { label: 'Plan created', color: '#059669', background: '#f0fdf4', border: '#bbf7d0' },
  'plan.update': { label: 'Plan updated', color: '#2563eb', background: '#eff6ff', border: '#bfdbfe' },
  'plan.activate': { label: 'Plan activated', color: '#059669', background: '#f0fdf4', border: '#bbf7d0' },
  'plan.deactivate': { label: 'Plan deactivated', color: '#ef4444', background: '#fef2f2', border: '#fecaca' },
  'settings.update': { label: 'Settings updated', color: '#4b5563', background: '#f3f4f6', border: '#e5e7eb' },
  'gym.onboard': { label: 'Gym set up', color: '#059669', background: '#f0fdf4', border: '#bbf7d0' },
  'staff.invite': { label: 'Staff invited', color: '#0891b2', background: '#ecfeff', border: '#a5f3fc' },
  'staff.remove': { label: 'Staff removed', color: '#ef4444', background: '#fef2f2', border: '#fecaca' },
};

const ENTITY_LABEL: Record<AuditEntityType, string> = {
  auth: 'Authentication',
  member: 'Member',
  payment: 'Payment',
  expense: 'Expense',
  plan: 'Plan',
  settings: 'Settings',
  staff: 'Staff',
};

export const AuditLogView: React.FC = () => {
  const entries = useSyncExternalStore(subscribeAudit, getAuditSnapshot, getAuditServerSnapshot);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  const filteredEntries = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return entries.filter((entry) => {
      const meta = ACTION_META[entry.action];
      const matchesSearch =
        (entry.actor_email || '').toLowerCase().includes(query) ||
        (entry.entity_label || '').toLowerCase().includes(query) ||
        (meta?.label || '').toLowerCase().includes(query) ||
        Object.values(entry.metadata || {}).some((v) => String(v ?? '').toLowerCase().includes(query));

      const matchesAction =
        actionFilter === 'all' ||
        (actionFilter === 'auth'
          ? entry.action.startsWith('auth.')
          : actionFilter === 'receipt'
            ? entry.action.startsWith('payment.receipt_')
            : entry.action.endsWith(`.${actionFilter}`) ||
              (actionFilter === 'update' && (entry.action === 'plan.activate' || entry.action === 'plan.deactivate')) ||
              (actionFilter === 'delete' && entry.action === 'member.check_in_undo'));

      const matchesEntity = entityFilter === 'all' || entry.entity_type === entityFilter;

      const dateKey = entry.created_at ? toDateKey(new Date(entry.created_at)) : '';
      const matchesDate = (!fromDate || dateKey >= fromDate) && (!toDate || dateKey <= toDate);

      return matchesSearch && matchesAction && matchesEntity && matchesDate;
    });
  }, [entries, searchQuery, actionFilter, entityFilter, fromDate, toDate]);

  const exportCSV = () => {
    const headers = ['Timestamp', 'Actor', 'Action', 'Entity', 'Label', 'Metadata'];
    const rows = filteredEntries.map((e) => [
      e.created_at,
      e.actor_email,
      e.action,
      e.entity_type,
      e.entity_label,
      JSON.stringify(e.metadata || {}),
    ]);
    downloadCSV(`User_Audit_Trail_${getTodayKey()}.csv`, [headers, ...rows]);
    showToast('Audit trail exported successfully!');
  };

  const totalPages = Math.ceil(filteredEntries.length / pageSize) || 1;
  // After a delete the last page can disappear; go back to the last page that still exists.
  if (currentPage > totalPages) setCurrentPage(totalPages);
  const paginated = filteredEntries.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const todayKey = getTodayKey();
  const eventsToday = entries.filter((e) => e.created_at && toDateKey(new Date(e.created_at)) === todayKey).length;
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
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
                Everything done in the app, newest first.
              </p>
            </div>
          </div>

          <button
            onClick={exportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: '0.825rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Download size={15} />
            <span>Export Audit CSV</span>
          </button>
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
              placeholder="Search actor, entity, action, or details..."
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
              <option value="receipt">Receipt verified/rejected</option>
              <option value="reminder_sent">Reminders sent</option>
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
              <option value="plan">Plans</option>
              <option value="settings">Settings</option>
              <option value="staff">Staff</option>
              <option value="auth">Authentication</option>
            </select>

            {[
              { label: 'From', value: fromDate, set: setFromDate, max: toDate || undefined, min: undefined },
              { label: 'To', value: toDate, set: setToDate, min: fromDate || undefined, max: undefined },
            ].map((field) => (
              <label
                key={field.label}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#64748b' }}
              >
                {field.label}
                <input
                  type="date"
                  value={field.value}
                  min={field.min}
                  max={field.max}
                  onChange={(e) => {
                    field.set(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.45rem 0.6rem',
                    fontSize: '0.85rem',
                    color: '#334155',
                  }}
                />
              </label>
            ))}
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
              <table className="phone-tight-table steady-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '0.785rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ width: '18%', padding: '0.9rem 1.5rem' }}>Time</th>
                    <th className="hide-on-phone" style={{ width: '20%', padding: '0.9rem 1.25rem' }}>Actor</th>
                    <th style={{ width: '16%', padding: '0.9rem 1.25rem', textAlign: 'center' }}>Action</th>
                    <th className="hide-on-phone" style={{ width: '13%', padding: '0.9rem 1.25rem', textAlign: 'center' }}>Entity</th>
                    <th style={{ padding: '0.9rem 1.5rem' }}>Details</th>
                  </tr>
                </thead>
                {/* Keyed by page so the rows fade in when the page changes. */}
                <tbody key={currentPage} className="page-rows">
                  {paginated.map((entry) => {
                    const meta = ACTION_META[entry.action];
                    const changed = entry.metadata?.changed;
                    return (
                      <tr
                        key={entry.id}
                        onClick={() => setSelectedEntry(entry)}
                        style={{ borderBottom: '1px solid #f8fafc', transition: 'background-color 0.15s ease', cursor: 'pointer' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        title="Click to view complete event details"
                      >
                        <td className="phone-wrap" style={{ padding: '1rem 1.5rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {formatDateTime(entry.created_at)}
                        </td>

                        <td className="hide-on-phone" style={{ padding: '1rem 1.25rem', color: '#334155', fontSize: '0.825rem' }}>
                          {entry.actor_email || 'Unknown'}
                        </td>

                        <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                          <span
                            className="phone-wrap"
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

                        <td className="hide-on-phone" style={{ padding: '1rem 1.25rem', color: '#64748b', fontSize: '0.825rem', textAlign: 'center' }}>
                          {ENTITY_LABEL[entry.entity_type] || entry.entity_type}
                        </td>

                        <td className="phone-wrap" style={{ padding: '1rem 1.5rem' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{displayLabel(entry.entity_label) || '—'}</div>
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

                {getPageWindow(currentPage, totalPages).map((page) => (
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

      {/* Audit Event Details Modal */}
      <Modal
        isOpen={Boolean(selectedEntry)}
        onClose={() => setSelectedEntry(null)}
        title="Audit Event Details"
        maxWidth="540px"
      >
        {selectedEntry && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Action Taken
                </span>
                <span
                  style={{
                    padding: '0.2rem 0.55rem',
                    borderRadius: '6px',
                    backgroundColor: ACTION_META[selectedEntry.action]?.background || '#f1f5f9',
                    color: ACTION_META[selectedEntry.action]?.color || '#334155',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  {ACTION_META[selectedEntry.action]?.label || selectedEntry.action}
                </span>
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                {displayLabel(selectedEntry.entity_label) || 'Unnamed Entity'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                Actor: {selectedEntry.actor_email} • {formatDateTime(selectedEntry.created_at)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                Details
              </div>
              {getDetailRows(selectedEntry.metadata).length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No extra details recorded.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <tbody>
                    {getDetailRows(selectedEntry.metadata).map((row) => (
                      <tr key={row.field} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.45rem 0.75rem 0.45rem 0', color: '#64748b', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                          {formatFieldName(row.field)}
                        </td>
                        <td style={{ padding: '0.45rem 0', color: '#0f172a', wordBreak: 'break-word' }}>
                          {row.from !== undefined ? (
                            <>
                              <span style={{ color: '#94a3b8', textDecoration: 'line-through' }}>{formatDetailValue(row.from)}</span>
                              {' → '}
                              <span style={{ fontWeight: 600 }}>{formatDetailValue(row.value)}</span>
                            </>
                          ) : (
                            formatDetailValue(row.value)
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button onClick={() => setSelectedEntry(null)} className="btn btn-primary btn-sm">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
