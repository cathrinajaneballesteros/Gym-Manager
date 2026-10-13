'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Phone,
  Mail,
  CreditCard,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  Sparkles,
  AlertCircle,
  LogIn,
} from 'lucide-react';
import { DBService } from '@/lib/data/db-service';
import { useGymDataRefresh } from '@/lib/ui/use-gym-data-refresh';
import { Member, Payment, MembershipPlan, AttendanceLog } from '@/types/database';
import { PaymentModal } from '@/components/payments/PaymentModal';
import { MemberModal } from './MemberModal';
import { showConfirm, showError, showToast } from '@/lib/ui/swal';
import { formatDisplayDate, toDateKey, getTodayKey, daysAgoKey } from '@/lib/ui/date';
import { checkInWithPrompt } from '@/lib/ui/check-in';

const ATTENDANCE_PAGE_SIZE = 10;

interface MemberDetailViewProps {
  memberId: string;
}

export const MemberDetailView: React.FC<MemberDetailViewProps> = ({ memberId }) => {
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceLog[]>([]);
  const [attendancePage, setAttendancePage] = useState(1);
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'attendance' | 'history' | 'notes'>('overview');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const loadData = () => {
    const found = DBService.getMemberById(memberId);
    if (!found) {
      router.push('/members');
      return;
    }
    setMember(found);
    setPlans(DBService.getPlans());
    const allPayments = DBService.getPayments();
    setPayments(allPayments.filter((p) => p.member_id === memberId));
    setAttendance(DBService.getAttendance(memberId));
  };

  useGymDataRefresh(loadData);

  useEffect(() => {
    loadData();
    window.addEventListener('sgfm_attendance_updated', loadData);
    return () => window.removeEventListener('sgfm_attendance_updated', loadData);
  }, [memberId]);

  if (!member) return null;

  const currentPlan = plans.find((p) => p.id === member.membership_plan_id);
  const currency = DBService.getProfile()?.currency || '₱';

  const visitDays = attendance.map((a) => toDateKey(new Date(a.check_in_time)));
  const todayKey = getTodayKey();
  const checkedInToday = visitDays.includes(todayKey);
  const visitsLast30 = visitDays.filter((d) => d >= daysAgoKey(29)).length;
  const visitsThisMonth = visitDays.filter((d) => d.slice(0, 7) === todayKey.slice(0, 7)).length;
  const attendancePages = Math.max(1, Math.ceil(attendance.length / ATTENDANCE_PAGE_SIZE));
  const attendancePageRows = attendance.slice(
    (attendancePage - 1) * ATTENDANCE_PAGE_SIZE,
    attendancePage * ATTENDANCE_PAGE_SIZE
  );

  const handleUndoCheckIn = async (log: AttendanceLog) => {
    const when = new Date(log.check_in_time).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    const confirmed = await showConfirm('Undo check-in?', `Remove the visit on ${when}?`, 'Yes, undo', '#ef4444');
    if (!confirmed) return;
    try {
      await DBService.undoCheckIn(log.id);
    } catch (err) {
      showError('Undo Failed', err instanceof Error ? err.message : 'Could not remove the check-in.');
      return;
    }
    showToast('Check-in removed');
    setAttendancePage((p) => Math.min(p, Math.max(1, Math.ceil((attendance.length - 1) / ATTENDANCE_PAGE_SIZE))));
  };

  const handleDelete = async () => {
    const confirmed = await showConfirm(
      'Remove Member?',
      `Are you sure you want to remove ${member.first_name} ${member.last_name}? Their payments stay in your records and reports. This action cannot be undone.`,
      'Yes, remove',
      '#ef4444'
    );
    if (confirmed) {
      try {
        await DBService.deleteMember(member.id);
      } catch (err) {
        showError('Delete Failed', err instanceof Error ? err.message : 'Could not remove the member.');
        return;
      }
      router.push('/members');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* 1. Back Navigation Link */}
      <div>
        <Link
          href="/members"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontSize: '0.875rem',
            color: '#64748b',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Members</span>
        </Link>
      </div>

      {/* 2. Top Profile Header Card */}
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem',
          padding: '1.75rem',
        }}
      >
        {/* Left: Avatar + Details */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#e2e8f0',
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.35rem',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {member.first_name[0]}{member.last_name[0]}
          </div>

          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
              {member.first_name} {member.last_name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem', color: '#64748b' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Mail size={14} color="#94a3b8" />
                {member.email}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Phone size={14} color="#94a3b8" />
                {member.phone}
              </span>
              <span>•</span>
              <span>Member since {formatDisplayDate(member.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Right: Membership Plan Info Box */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Membership Plan
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
              {currentPlan?.name || 'Unknown plan'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {currentPlan
                ? `${currency}${Number(currentPlan.price).toLocaleString()} / ${
                    currentPlan.duration_months === 1 ? 'month' : `${currentPlan.duration_months} months`
                  }`
                : '—'}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
              onClick={() => checkInWithPrompt(member)}
              className="btn btn-primary btn-sm"
              disabled={checkedInToday}
              title={checkedInToday ? 'Already checked in today' : 'Record a visit for today'}
            >
              <LogIn size={14} />
              <span>{checkedInToday ? 'Checked In Today' : 'Check In'}</span>
            </button>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="btn btn-outline btn-sm"
            >
              Edit Plan
            </button>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem' }}>
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'payments', label: 'Payment History' },
          { key: 'attendance', label: 'Attendance' },
          { key: 'history', label: 'Membership History' },
          { key: 'notes', label: 'Notes' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: activeTab === tab.key ? 600 : 500,
              color: activeTab === tab.key ? '#059669' : '#64748b',
              borderBottom: activeTab === tab.key ? '2px solid #059669' : '2px solid transparent',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. Tab Content: 2 Columns (Membership Info + Recent Payments) */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr', gap: '1.5rem' }} className="member-detail-grid">
          {/* Left Card: Membership Information */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '1.25rem' }}>
                Membership Information
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', borderBottom: '1px solid #f8fafc', paddingBottom: '0.75rem' }}>
                  <span style={{ color: '#64748b' }}>Plan</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{currentPlan?.name || 'Unknown plan'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', borderBottom: '1px solid #f8fafc', paddingBottom: '0.75rem' }}>
                  <span style={{ color: '#64748b' }}>Start Date</span>
                  <span style={{ fontWeight: 500, color: '#334155' }}>{formatDisplayDate(member.start_date)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', borderBottom: '1px solid #f8fafc', paddingBottom: '0.75rem' }}>
                  <span style={{ color: '#64748b' }}>Expiration Date</span>
                  <span style={{ fontWeight: 500, color: '#334155' }}>{formatDisplayDate(member.end_date)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', borderBottom: '1px solid #f8fafc', paddingBottom: '0.75rem' }}>
                  <span style={{ color: '#64748b' }}>Status</span>
                  <span
                    className={`badge ${
                      member.status === 'pending'
                        ? 'badge-pending'
                        : member.status === 'active'
                        ? 'badge-active'
                        : member.status === 'expiring'
                        ? 'badge-expiring'
                        : 'badge-expired'
                    }`}
                    style={
                      member.status === 'pending'
                        ? {
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            backgroundColor: '#fffbeb',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            fontWeight: 600,
                          }
                        : undefined
                    }
                  >
                    {member.status === 'pending' ? (
                      <>
                        <Clock size={11} />
                        <span>Pending Payment</span>
                      </>
                    ) : member.status === 'active' ? (
                      'Active'
                    ) : member.status === 'expiring' ? (
                      'Expiring Soon'
                    ) : (
                      'Expired'
                    )}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', borderBottom: '1px solid #f8fafc', paddingBottom: '0.75rem' }}>
                  <span style={{ color: '#64748b' }}>Last Visit</span>
                  <span style={{ fontWeight: 500, color: '#334155' }}>
                    {visitDays.length > 0 ? formatDisplayDate(visitDays[0]) : 'No visits recorded'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', borderBottom: '1px solid #f8fafc', paddingBottom: '0.75rem' }}>
                  <span style={{ color: '#64748b' }}>Visits (30 days)</span>
                  <span style={{ fontWeight: 500, color: '#334155' }}>{visitsLast30}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: '#64748b' }}>Emergency Contact</span>
                  <span style={{ fontWeight: 500, color: '#334155' }}>{member.emergency_contact || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.75rem', display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                <CreditCard size={15} />
                <span>Renew Membership</span>
              </button>
              {/* Only the owner can delete members. */}
              {DBService.isOwner() && (
                <button
                  onClick={handleDelete}
                  className="btn btn-danger btn-sm"
                  title="Deactivate Member"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Right Card: Recent Payments */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
                Recent Payments
              </h2>
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600, cursor: 'pointer' }}
              >
                + Record Payment
              </button>
            </div>

            {payments.length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                No payment transactions recorded for this member yet.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                      <th style={{ padding: '0.65rem 0.75rem' }}>Date</th>
                      <th style={{ padding: '0.65rem 0.75rem' }}>Amount</th>
                      <th style={{ padding: '0.65rem 0.75rem' }}>Method</th>
                      <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.slice(0, 5).map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '0.75rem', color: '#334155' }}>
                          {formatDisplayDate(p.payment_date)}
                        </td>
                        <td style={{ padding: '0.75rem', fontWeight: 600, color: '#0f172a' }}>
                          {currency}{Number(p.amount).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.75rem', color: '#64748b' }}>
                          <span style={{ padding: '0.2rem 0.5rem', backgroundColor: '#f1f5f9', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500 }}>
                            {p.payment_method}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <span
                            className={`badge ${
                              p.payment_status === 'completed'
                                ? 'badge-completed'
                                : p.payment_status === 'pending'
                                ? 'badge-pending'
                                : 'badge-danger'
                            }`}
                          >
                            {p.payment_status === 'completed' ? 'Paid' : p.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop: '1rem', textAlign: 'right' }}>
              <Link
                href="/payments"
                style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600, textDecoration: 'none' }}
              >
                View All Payments →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '1rem' }}>
            Full Payment Ledger ({payments.length} records)
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.75rem' }}>Date</th>
                  <th style={{ padding: '0.75rem' }}>Amount</th>
                  <th style={{ padding: '0.75rem' }}>Method</th>
                  <th style={{ padding: '0.75rem' }}>Ref #</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '0.75rem', color: '#334155' }}>{formatDisplayDate(p.payment_date)}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 600, color: '#0f172a' }}>{currency}{Number(p.amount).toLocaleString()}</td>
                    <td style={{ padding: '0.75rem', color: '#64748b' }}>{p.payment_method}</td>
                    <td style={{ padding: '0.75rem', color: '#94a3b8', fontSize: '0.75rem' }}>{p.reference_number || '—'}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <span className={`badge ${p.payment_status === 'completed' ? 'badge-completed' : 'badge-pending'}`}>
                        {p.payment_status === 'completed' ? 'Paid' : p.payment_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Visits this month', value: String(visitsThisMonth) },
              { label: 'Visits (30 days)', value: String(visitsLast30) },
              { label: 'Last visit', value: visitDays.length > 0 ? formatDisplayDate(visitDays[0]) : '—' },
            ].map((stat) => (
              <div key={stat.label} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem 1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{stat.value}</div>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '1rem' }}>
            Check-ins ({attendance.length} records)
          </h2>

          {attendance.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
              No check-ins recorded for this member yet.
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                      <th style={{ padding: '0.75rem' }}>Date</th>
                      <th style={{ padding: '0.75rem' }}>Time</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendancePageRows.map((a) => (
                      <tr key={a.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '0.75rem', color: '#334155' }}>{formatDisplayDate(a.check_in_time)}</td>
                        <td style={{ padding: '0.75rem', color: '#64748b' }}>
                          {new Date(a.check_in_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <button
                            onClick={() => handleUndoCheckIn(a)}
                            style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Undo
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {attendancePages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', fontSize: '0.8rem', color: '#64748b' }}>
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={attendancePage === 1}
                    onClick={() => setAttendancePage((p) => p - 1)}
                  >
                    Previous
                  </button>
                  <span>
                    Page {attendancePage} of {attendancePages}
                  </span>
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={attendancePage === attendancePages}
                    onClick={() => setAttendancePage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* History & Notes Tab */}
      {(activeTab === 'history' || activeTab === 'notes') && (
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
            {activeTab === 'history' ? 'Subscription History' : 'Staff Notes'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            {activeTab === 'history'
              ? `Member initially subscribed on ${formatDisplayDate(member.created_at)} under ${currentPlan?.name || 'an unknown plan'}. Renewal status is verified.`
              : member.notes || 'No confidential staff notes recorded for this member.'}
          </p>
        </div>
      )}

      {/* Modals */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={() => {
          setIsPaymentModalOpen(false);
          loadData();
        }}
        preselectedMemberId={member.id}
      />

      <MemberModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          setIsEditModalOpen(false);
          loadData();
        }}
        initialMember={member}
      />

      <style jsx>{`
        @media (max-width: 860px) {
          .member-detail-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
