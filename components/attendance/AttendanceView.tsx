'use client';

import React, { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  LogIn,
  CalendarDays,
  CalendarRange,
  UserX,
  Activity,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Bell,
  UserPlus,
} from 'lucide-react';
import { DBService } from '@/lib/data/db-service';
import { AttendanceLog, Member } from '@/types/database';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { MetricCard } from '@/components/ui/MetricCard';
import { MemberPicker } from '@/components/payments/MemberPicker';
import { PaymentReminderModal } from '@/components/payments/PaymentReminderModal';
import { WalkInModal } from '@/components/payments/WalkInModal';
import { getPaymentMemberName } from '@/lib/ui/format';
import { checkInWithPrompt } from '@/lib/ui/check-in';
import { showConfirm, showError, showToast } from '@/lib/ui/swal';
import { getPageWindow } from '@/lib/ui/pagination';
import { downloadCSV } from '@/lib/ui/csv';
import { daysAgoKey, formatDisplayDate, getTodayKey, toDateKey } from '@/lib/ui/date';

const INACTIVE_DAYS = 14;
const PAGE_SIZE = 12;

// Re-render whenever check-ins or members change.
const subscribe = (callback: () => void) => {
  window.addEventListener('sgfm_attendance_updated', callback);
  window.addEventListener('sgfm_audit_updated', callback);
  window.addEventListener('sgfm_data_updated', callback);
  return () => {
    window.removeEventListener('sgfm_attendance_updated', callback);
    window.removeEventListener('sgfm_audit_updated', callback);
    window.removeEventListener('sgfm_data_updated', callback);
  };
};

const getSnapshot = (): number => DBService.getRevision();

const getServerSnapshot = (): number => 0;

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

const STATUS_BADGE: Record<Member['status'], { className: string; label: string }> = {
  active: { className: 'badge-active', label: 'Active' },
  expiring: { className: 'badge-expiring', label: 'Expiring Soon' },
  expired: { className: 'badge-expired', label: 'Expired' },
  pending: { className: 'badge-pending', label: 'Pending Payment' },
  inactive: { className: 'badge-expired', label: 'Inactive' },
};

const memberName = (m?: Member) => (m ? `${m.first_name} ${m.last_name}`.trim() : 'Deleted member');

export const AttendanceView: React.FC = () => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // Part of the memo key, so a page left open past midnight doesn't keep showing yesterday's walk-ins.
  const todayKey = getTodayKey();
  const { members, attendance, walkInsToday } = useMemo(
    () => ({
      members: snapshot ? DBService.getMembers() : [],
      attendance: snapshot ? DBService.getAttendance() : [],
      walkInsToday: snapshot ? DBService.getWalkIns(todayKey) : [],
    }),
    [snapshot, todayKey]
  );
  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const [pickerMemberId, setPickerMemberId] = useState('');
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [reminderMember, setReminderMember] = useState<Member | null>(null);
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const inactiveRef = useRef<HTMLDivElement>(null);

  const weekStartKey = daysAgoKey((new Date().getDay() + 6) % 7); // Monday
  const visitDay = (a: AttendanceLog) => toDateKey(new Date(a.check_in_time));

  const todayLogs = attendance.filter((a) => visitDay(a) === todayKey);
  const weekCount = attendance.filter((a) => visitDay(a) >= weekStartKey).length;
  const monthCount = attendance.filter((a) => visitDay(a).slice(0, 7) === todayKey.slice(0, 7)).length;

  // Current members (active or expiring) who haven't come in for INACTIVE_DAYS or more.
  const inactiveMembers = useMemo(() => {
    const today = new Date(getTodayKey());
    const checkedInIds = new Set(attendance.map((a) => a.member_id));
    return members
      .filter((m) => m.status === 'active' || m.status === 'expiring')
      .map((m) => {
        const lastVisit = m.last_visit_date || m.start_date;
        const daysAway = Math.floor((today.getTime() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24));
        return { member: m, daysAway, neverCheckedIn: !checkedInIds.has(m.id) };
      })
      .filter((row) => row.daysAway >= INACTIVE_DAYS)
      .sort((a, b) => b.daysAway - a.daysAway);
  }, [members, attendance]);

  const filteredHistory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return attendance.filter((a) => {
      const day = visitDay(a);
      if (fromDate && day < fromDate) return false;
      if (toDate && day > toDate) return false;
      return !query || memberName(memberMap.get(a.member_id)).toLowerCase().includes(query);
    });
  }, [attendance, memberMap, searchQuery, fromDate, toDate]);

  const totalPages = Math.ceil(filteredHistory.length / PAGE_SIZE) || 1;
  // After an undo the last page can disappear; go back to the last page that still exists.
  if (currentPage > totalPages) setCurrentPage(totalPages);
  const paginated = filteredHistory.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleCheckIn = async (member: Member | undefined) => {
    if (!member) return;
    setIsCheckingIn(true);
    const checkedIn = await checkInWithPrompt(member);
    setIsCheckingIn(false);
    if (checkedIn) setPickerMemberId('');
  };

  const handleUndo = async (log: AttendanceLog) => {
    const when = new Date(log.check_in_time).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    const confirmed = await showConfirm(
      'Undo check-in?',
      `Remove ${memberName(memberMap.get(log.member_id))}'s visit on ${when}?`,
      'Yes, undo',
      '#ef4444'
    );
    if (!confirmed) return;
    try {
      await DBService.undoCheckIn(log.id);
    } catch (err) {
      showError('Undo Failed', err instanceof Error ? err.message : 'Could not remove the check-in.');
      return;
    }
    showToast('Check-in removed');
  };

  const exportCSV = () => {
    const rows = filteredHistory.map((a) => {
      const m = memberMap.get(a.member_id);
      return [visitDay(a), formatTime(a.check_in_time), memberName(m), m?.plan?.name ?? '', m ? STATUS_BADGE[m.status].label : ''];
    });
    downloadCSV(`Attendance_${todayKey}.csv`, [['Date', 'Time', 'Member', 'Plan', 'Status'], ...rows]);
    showToast('Attendance exported');
  };

  const thStyle: React.CSSProperties = { padding: '0.9rem 1.25rem' };
  const tdStyle: React.CSSProperties = { padding: '0.85rem 1.25rem' };
  const headRowStyle: React.CSSProperties = {
    borderBottom: '1px solid #f1f5f9',
    color: '#64748b',
    fontSize: '0.785rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };
  const linkStyle: React.CSSProperties = { fontWeight: 600, color: '#0f172a', textDecoration: 'none' };
  const undoButton = (log: AttendanceLog) => (
    <button onClick={() => handleUndo(log)} style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 600, cursor: 'pointer' }}>
      Undo
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* 1. Page Header */}
      <ScrollReveal delay={0}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.15rem' }}>
              Attendance
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Check members in at the front desk.{DBService.isOwner() ? ' Visits feed the churn risk on AI Analytics.' : ''}
            </p>
          </div>
          <button onClick={exportCSV} className="btn btn-outline btn-sm" disabled={filteredHistory.length === 0}>
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </ScrollReveal>

      {/* 2. Front-desk check-in */}
      <ScrollReveal delay={30}>
        <div className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.75rem' }}>Check in a member</h2>
            <MemberPicker members={members} value={pickerMemberId} onChange={setPickerMemberId} />
          </div>
          <button
            className="btn btn-primary"
            style={{ alignSelf: 'flex-end' }}
            disabled={!pickerMemberId || isCheckingIn}
            onClick={() => handleCheckIn(memberMap.get(pickerMemberId))}
          >
            <LogIn size={15} />
            <span>Check In</span>
          </button>
          <button className="btn btn-outline" style={{ alignSelf: 'flex-end' }} onClick={() => setIsWalkInOpen(true)}>
            <UserPlus size={15} />
            <span>Walk-in</span>
          </button>
        </div>
      </ScrollReveal>

      {/* 3. Summary cards */}
      <ScrollReveal delay={50}>
        <div className="grid grid-cols-4 gap-4">
          <MetricCard
            title="Check-ins Today"
            value={todayLogs.length}
            icon={Activity}
            variant="emerald"
            subtitle={`+ ${walkInsToday.length} walk-in${walkInsToday.length === 1 ? '' : 's'}`}
          />
          <MetricCard title="This Week" value={weekCount} icon={CalendarDays} variant="blue" subtitle="Since Monday" />
          <MetricCard
            title="This Month"
            value={monthCount}
            icon={CalendarRange}
            variant="purple"
            subtitle={`Since ${new Date().toLocaleString('en-US', { month: 'short' })} 1`}
          />
          <MetricCard
            title={`Away ${INACTIVE_DAYS}+ Days`}
            value={inactiveMembers.length}
            icon={UserX}
            variant="amber"
            subtitle="Current members"
            onClick={() => inactiveRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            clickableHint="View"
          />
        </div>
      </ScrollReveal>

      {/* 4. Today's check-ins */}
      <ScrollReveal delay={70}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Today ({todayLogs.length + walkInsToday.length})</h2>
          </div>
          {todayLogs.length + walkInsToday.length === 0 ? (
            <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
              No one has checked in today yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="phone-tight-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={headRowStyle}>
                    <th style={thStyle}>Time</th>
                    <th style={thStyle}>Member</th>
                    <th className="hide-on-phone" style={thStyle}>Status</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {todayLogs.map((a) => {
                    const m = memberMap.get(a.member_id);
                    return (
                      <tr key={a.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ ...tdStyle, color: '#64748b' }}>{formatTime(a.check_in_time)}</td>
                        <td style={tdStyle}>
                          {m ? <Link href={`/members/${m.id}`} style={linkStyle}>{memberName(m)}</Link> : memberName(m)}
                        </td>
                        <td className="hide-on-phone" style={tdStyle}>
                          {m && <span className={`badge ${STATUS_BADGE[m.status].className}`}>{STATUS_BADGE[m.status].label}</span>}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{undoButton(a)}</td>
                      </tr>
                    );
                  })}
                  {walkInsToday.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ ...tdStyle, color: '#64748b' }}>{formatTime(p.created_at)}</td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: '#0f172a' }}>{getPaymentMemberName(p)}</td>
                      <td className="hide-on-phone" style={tdStyle}>
                        <span className="badge badge-pending">
                          Walk-in · {DBService.getProfile().currency || '₱'}{Number(p.amount).toLocaleString()}
                        </span>
                      </td>
                      <td style={tdStyle}></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* 5. Members away 14+ days */}
      <ScrollReveal delay={90}>
        <div ref={inactiveRef} className="card" style={{ padding: 0, overflow: 'hidden', scrollMarginTop: '1rem' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
              Not seen in {INACTIVE_DAYS}+ days ({inactiveMembers.length})
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
              Active and expiring members only. These are the people most likely not to renew.
            </p>
          </div>
          {inactiveMembers.length === 0 ? (
            <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
              {members.some((m) => m.status === 'active' || m.status === 'expiring')
                ? `Every current member has visited in the last ${INACTIVE_DAYS} days.`
                : 'No active members yet.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="phone-tight-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={headRowStyle}>
                    <th style={thStyle}>Member</th>
                    <th className="hide-on-phone" style={thStyle}>Last Visit</th>
                    <th style={thStyle}>Days Away</th>
                    <th className="hide-on-phone" style={thStyle}>Membership Ends</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {inactiveMembers.map(({ member: m, daysAway, neverCheckedIn }) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={tdStyle}>
                        <Link href={`/members/${m.id}`} style={linkStyle}>{memberName(m)}</Link>
                      </td>
                      <td className="hide-on-phone" style={{ ...tdStyle, color: '#64748b' }}>
                        {neverCheckedIn ? 'Never checked in' : formatDisplayDate(m.last_visit_date)}
                      </td>
                      <td style={{ ...tdStyle, color: '#d97706', fontWeight: 600 }}>{daysAway} days</td>
                      <td className="hide-on-phone" style={{ ...tdStyle, color: '#64748b' }}>{formatDisplayDate(m.end_date)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button className="btn btn-outline btn-sm" title="Remind" onClick={() => setReminderMember(m)}>
                            <Bell size={13} />
                            <span className="phone-icon-label">Remind</span>
                          </button>
                          <button className="btn btn-secondary btn-sm" title="Check In" onClick={() => handleCheckIn(m)}>
                            <LogIn size={13} />
                            <span className="phone-icon-label">Check In</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* 6. History */}
      <ScrollReveal delay={110}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Check-in History</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '0.45rem 0.75rem',
                  backgroundColor: '#ffffff',
                }}
              >
                <Search size={14} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Search member..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', padding: 0, width: '150px' }}
                />
              </div>
              {[
                { label: 'From', value: fromDate, set: setFromDate, max: toDate || undefined },
                { label: 'To', value: toDate, set: setToDate, min: fromDate || undefined },
              ].map((field) => (
                <label key={field.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#64748b' }}>
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
                      padding: '0.4rem 0.55rem',
                      fontSize: '0.85rem',
                      color: '#334155',
                    }}
                  />
                </label>
              ))}
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
              {attendance.length === 0 ? 'No check-ins recorded yet.' : 'No check-ins match these filters.'}
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table className="phone-tight-table steady-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={headRowStyle}>
                      <th style={{ ...thStyle, width: '18%' }}>Date</th>
                      <th className="hide-on-phone" style={{ ...thStyle, width: '14%' }}>Time</th>
                      <th style={thStyle}>Member</th>
                      <th className="hide-on-phone" style={{ ...thStyle, width: '28%' }}>Plan</th>
                      <th style={{ ...thStyle, width: '110px', textAlign: 'right' }}></th>
                    </tr>
                  </thead>
                  {/* Keyed by page so the rows fade in when the page changes. */}
                  <tbody key={currentPage} className="page-rows">
                    {paginated.map((a) => {
                      const m = memberMap.get(a.member_id);
                      return (
                        <tr key={a.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={{ ...tdStyle, color: '#334155' }}>{formatDisplayDate(visitDay(a))}</td>
                          <td className="hide-on-phone" style={{ ...tdStyle, color: '#64748b' }}>{formatTime(a.check_in_time)}</td>
                          <td style={tdStyle}>
                            {m ? <Link href={`/members/${m.id}`} style={linkStyle}>{memberName(m)}</Link> : memberName(m)}
                            {/* The Plan column is hidden on phones. */}
                            <span className="show-on-phone" style={{ fontSize: '0.785rem', color: '#64748b' }}>{m?.plan?.name ?? '—'}</span>
                          </td>
                          <td className="hide-on-phone" style={{ ...tdStyle, color: '#64748b' }}>{m?.plan?.name ?? '—'}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>{undoButton(a)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  padding: '0.9rem 1.5rem',
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
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredHistory.length)} of{' '}
                  {filteredHistory.length}
                </div>
                {totalPages > 1 && (
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
                )}
              </div>
            </>
          )}
        </div>
      </ScrollReveal>

      <PaymentReminderModal
        isOpen={reminderMember !== null}
        onClose={() => setReminderMember(null)}
        member={reminderMember}
        onSuccess={() => setReminderMember(null)}
      />

      <WalkInModal
        isOpen={isWalkInOpen}
        onClose={() => setIsWalkInOpen(false)}
        onSuccess={(p) => showToast(`Walk-in recorded · ${DBService.getProfile().currency || '₱'}${Number(p.amount).toLocaleString()}`)}
      />
    </div>
  );
};
