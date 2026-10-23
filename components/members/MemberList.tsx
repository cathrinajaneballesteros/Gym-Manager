'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Plus,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  CreditCard,
  Eye,
  Dumbbell,
  Bell,
  Clock,
  LogIn,
} from 'lucide-react';
import { DBService } from '@/lib/data/db-service';
import { useGymDataRefresh } from '@/lib/ui/use-gym-data-refresh';
import { Member, MembershipPlan } from '@/types/database';
import { MemberModal } from './MemberModal';
import { PaymentModal } from '@/components/payments/PaymentModal';
import { PaymentReminderModal } from '@/components/payments/PaymentReminderModal';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { showConfirm, showError, showToast } from '@/lib/ui/swal';
import { getPageWindow } from '@/lib/ui/pagination';
import { formatDisplayDate } from '@/lib/ui/date';
import { checkInWithPrompt } from '@/lib/ui/check-in';

// Statuses the filter can start on from a link (e.g. the dashboard's /members?status=expiring).
const STATUS_FILTERS = ['pending', 'active', 'expiring', 'expired'];

export const MemberList: React.FC = () => {
  // Read in the browser, so the page itself can be prebuilt like the other tabs.
  const linkedStatus = useSearchParams().get('status');
  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(() =>
    linkedStatus && STATUS_FILTERS.includes(linkedStatus) ? linkedStatus : 'all'
  );
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'end_date' | 'created_at'>('end_date');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals & Menu
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [paymentMemberId, setPaymentMemberId] = useState<string | null>(null);
  const [selectedReminderMember, setSelectedReminderMember] = useState<Member | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- portals need document, which only exists after mount
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!activeMenuId) return;

    const handleClose = () => {
      setActiveMenuId(null);
      setMenuPosition(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };

    document.addEventListener('click', handleClose);
    window.addEventListener('resize', handleClose);
    window.addEventListener('scroll', handleClose, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', handleClose);
      window.removeEventListener('resize', handleClose);
      window.removeEventListener('scroll', handleClose, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMenuId]);

  const handleToggleMenu = (memberId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (activeMenuId === memberId) {
      setActiveMenuId(null);
      setMenuPosition(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const menuHeight = 220;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpwards = spaceBelow < menuHeight && rect.top > menuHeight;

      setMenuPosition({
        top: openUpwards ? Math.max(10, rect.top - menuHeight - 6) : rect.bottom + 6,
        right: Math.max(16, window.innerWidth - rect.right),
      });
      setActiveMenuId(memberId);
    }
  };

  const activeMember = useMemo(() => {
    return members.find((m) => m.id === activeMenuId) || null;
  }, [members, activeMenuId]);

  const refreshData = () => {
    setMembers(DBService.getMembers());
    setPlans(DBService.getPlans());
  };

  useGymDataRefresh(refreshData);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the gym data AppShell already loaded
    refreshData();
  }, []);

  // Filtering & Sorting
  const filteredMembers = useMemo(() => {
    return members
      .filter((m) => {
        const matchesSearch =
          `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.phone.includes(searchQuery);

        const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
        const matchesPlan = planFilter === 'all' || m.membership_plan_id === planFilter;

        return matchesSearch && matchesStatus && matchesPlan;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
        } else if (sortBy === 'end_date') {
          return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
        } else {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
      });
  }, [members, searchQuery, statusFilter, planFilter, sortBy]);

  const totalPages = Math.ceil(filteredMembers.length / pageSize) || 1;
  // After a delete the last page can disappear; go back to the last page that still exists.
  if (currentPage > totalPages) setCurrentPage(totalPages);
  const paginatedMembers = filteredMembers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleDeleteMember = async (id: string, name: string) => {
    const confirmed = await showConfirm(
      'Remove Member?',
      `Are you sure you want to remove member ${name}? Their payments stay in your records and reports. This action cannot be undone.`,
      'Yes, remove',
      '#ef4444'
    );
    if (confirmed) {
      try {
        await DBService.deleteMember(id);
      } catch (err) {
        showError('Delete Failed', err instanceof Error ? err.message : 'Could not remove the member.');
        return;
      }
      refreshData();
      setActiveMenuId(null);
      showToast(`${name} removed`);
    }
  };

  const getPlanName = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    return plan?.name || 'Unknown plan';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* 1. Page Header */}
      <ScrollReveal delay={0}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
              Members
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#86868b' }}>
              Manage your gym members and their memberships.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingMember(null);
              setIsAddModalOpen(true);
            }}
            className="btn btn-primary"
          >
            <Plus size={16} />
            <span>Add Member</span>
          </button>
        </div>
      </ScrollReveal>

      {/* 2. Search & Filters Bar */}
      <ScrollReveal delay={50}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Search Input */}
          <div
            className="phone-fill"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.5rem 0.85rem',
              width: '100%',
              maxWidth: '320px',
            }}
          >
            <Search size={15} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search members..."
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

          {/* Filter Dropdowns */}
          <div className="phone-fill phone-stack" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <select
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value);
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
              <option value="all">All Plans</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
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
              <option value="all">All Status</option>
              <option value="pending">Pending Payment</option>
              <option value="active">Active</option>
              <option value="expiring">Expiring Soon</option>
              <option value="expired">Expired</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
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
              <option value="end_date">Sort: Expiration</option>
              <option value="name">Sort: Name</option>
              <option value="created_at">Sort: Joined Date</option>
            </select>
          </div>
        </div>
      </ScrollReveal>

      {/* 3. Table or Empty State Card */}
      <ScrollReveal delay={90}>
        <div className="card" style={{ padding: 0, overflow: 'visible' }}>
        {/* Pagination, above the table so it stays put whatever the rows' height */}
        {filteredMembers.length > 0 && (
          <div
            style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #f1f5f9',
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
              Showing {Math.min((currentPage - 1) * pageSize + 1, filteredMembers.length)}-
              {Math.min(currentPage * pageSize, filteredMembers.length)} of {filteredMembers.length}
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

        {filteredMembers.length === 0 ? (
          /* Empty State matching reference bottom-right illustration */
          <div style={{ padding: '4.5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                marginBottom: '1.25rem',
              }}
            >
              <Dumbbell size={30} strokeWidth={1.75} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.4rem' }}>
              {members.length === 0 ? 'No members yet' : 'No members match your search'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '360px', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              {members.length === 0
                ? 'Start by adding your first member to manage memberships and payments.'
                : 'Try a different name or clear the filters to see everyone.'}
            </p>
            {members.length === 0 ? (
              <button
                onClick={() => {
                  setEditingMember(null);
                  setIsAddModalOpen(true);
                }}
                className="btn btn-primary"
              >
                <Plus size={16} />
                <span>Add Member</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setPlanFilter('all');
                  setCurrentPage(1);
                }}
                className="btn btn-secondary"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="phone-tight-table steady-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '0.785rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.9rem 1.5rem' }}>Member</th>
                  <th className="hide-on-phone" style={{ width: '24%', padding: '0.9rem 1.25rem' }}>Plan</th>
                  <th style={{ width: '15%', padding: '0.9rem 1.25rem' }}>Status</th>
                  <th className="hide-on-phone" style={{ width: '15%', padding: '0.9rem 1.25rem' }}>Expiration</th>
                  <th style={{ width: '110px', padding: '0.9rem 1.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              {/* Keyed by page so the rows fade in when the page changes. */}
              <tbody key={currentPage} className="page-rows">
                {paginatedMembers.map((member) => {
                  const fullName = `${member.first_name} ${member.last_name}`;
                  const planName = getPlanName(member.membership_plan_id);

                  return (
                    <tr
                      key={member.id}
                      style={{
                        borderBottom: '1px solid #f8fafc',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Member (Avatar + Name + Email) */}
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <Link
                          href={`/members/${member.id}`}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', textDecoration: 'none' }}
                        >
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              backgroundColor: '#e2e8f0',
                              color: '#334155',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.825rem',
                              flexShrink: 0,
                            }}
                          >
                            {member.first_name[0]}{member.last_name[0]}
                          </div>
                          <div style={{ minWidth: 0, overflowWrap: 'break-word' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>
                              {fullName}
                            </div>
                            <div style={{ fontSize: '0.785rem', color: '#64748b' }}>
                              {member.email}
                            </div>
                            {/* The Plan column is hidden on phones. */}
                            <div className="show-on-phone" style={{ fontSize: '0.785rem', color: '#334155', fontWeight: 500 }}>
                              {planName}
                            </div>
                          </div>
                        </Link>
                      </td>

                      {/* Plan */}
                      <td className="hide-on-phone" style={{ padding: '1rem 1.25rem', color: '#334155', fontWeight: 500 }}>
                        {planName}
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '1rem 1.25rem' }}>
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
                          title={member.status === 'pending' ? 'Awaiting payment record to be listed on payments page' : undefined}
                        >
                          {member.status === 'pending' ? (
                            <>
                              <Clock size={11} />
                              <span>Pending</span>
                            </>
                          ) : member.status === 'active' ? (
                            'Active'
                          ) : member.status === 'expiring' ? (
                            'Expiring Soon'
                          ) : member.status === 'inactive' ? (
                            'Inactive'
                          ) : (
                            'Expired'
                          )}
                        </span>
                      </td>

                      {/* Expiration Date */}
                      <td className="hide-on-phone" style={{ padding: '1rem 1.25rem', color: '#64748b', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {formatDisplayDate(member.end_date)}
                      </td>

                      {/* Actions Menu Trigger */}
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={(e) => handleToggleMenu(member.id, e)}
                          style={{
                            padding: '0.45rem',
                            color: activeMenuId === member.id ? '#0f172a' : '#64748b',
                            backgroundColor: activeMenuId === member.id ? '#f1f5f9' : 'transparent',
                            borderRadius: '7px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (activeMenuId !== member.id) {
                              e.currentTarget.style.backgroundColor = '#f1f5f9';
                              e.currentTarget.style.color = '#0f172a';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (activeMenuId !== member.id) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = '#64748b';
                            }
                          }}
                          aria-label={`Actions for ${fullName}`}
                          aria-expanded={activeMenuId === member.id}
                        >
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </ScrollReveal>

      {/* Floating Action Menu Portal (never clipped by table overflow) */}
      {mounted && activeMember && menuPosition && createPortal(
        <div
          role="menu"
          aria-orientation="vertical"
          style={{
            position: 'fixed',
            top: menuPosition.top,
            right: menuPosition.right,
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 16px 36px -6px rgba(0, 0, 0, 0.14), 0 6px 16px -2px rgba(0, 0, 0, 0.05)',
            zIndex: 9999,
            minWidth: '205px',
            padding: '0.35rem',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            animation: 'modalSlideUp 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* View Profile */}
          <Link
            href={`/members/${activeMember.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.55rem 0.75rem',
              fontSize: '0.825rem',
              color: '#1e293b',
              fontWeight: 500,
              borderRadius: '7px',
              textDecoration: 'none',
              transition: 'background-color 0.12s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            onClick={() => setActiveMenuId(null)}
          >
            <Eye size={15} color="#64748b" />
            <span>View Profile</span>
          </Link>

          {/* Check In */}
          <button
            type="button"
            onClick={async () => {
              const member = activeMember;
              setActiveMenuId(null);
              if (await checkInWithPrompt(member)) refreshData();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.55rem 0.75rem',
              fontSize: '0.825rem',
              color: '#1e293b',
              borderRadius: '7px',
              width: '100%',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              fontWeight: 500,
              transition: 'background-color 0.12s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <LogIn size={15} color="#64748b" />
            <span>Check In</span>
          </button>

          {/* Record Payment */}
          <button
            type="button"
            onClick={() => {
              setPaymentMemberId(activeMember.id);
              setActiveMenuId(null);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.55rem 0.75rem',
              fontSize: '0.825rem',
              color: activeMember.status === 'pending' ? '#b45309' : '#1e293b',
              backgroundColor: activeMember.status === 'pending' ? '#fffbeb' : 'transparent',
              borderRadius: '7px',
              width: '100%',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              fontWeight: activeMember.status === 'pending' ? 600 : 500,
              transition: 'background-color 0.12s ease',
            }}
            onMouseEnter={(e) => {
              if (activeMember.status !== 'pending') e.currentTarget.style.backgroundColor = '#f8fafc';
            }}
            onMouseLeave={(e) => {
              if (activeMember.status !== 'pending') e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <CreditCard size={15} color={activeMember.status === 'pending' ? '#d97706' : '#64748b'} />
            <span style={{ flex: 1 }}>Record Payment</span>
            {activeMember.status === 'pending' && (
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.4rem',
                  borderRadius: '9999px',
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                }}
              >
                Awaiting
              </span>
            )}
          </button>

          <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '0.25rem 0' }} />

          {/* Send Reminder */}
          <button
            type="button"
            onClick={() => {
              setSelectedReminderMember(activeMember);
              setActiveMenuId(null);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.55rem 0.75rem',
              fontSize: '0.825rem',
              color: '#1e293b',
              borderRadius: '7px',
              width: '100%',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              fontWeight: 500,
              transition: 'background-color 0.12s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Bell size={15} color="#64748b" />
            <span>Send Reminder</span>
          </button>

          {/* Edit Details */}
          <button
            type="button"
            onClick={() => {
              setEditingMember(activeMember);
              setIsAddModalOpen(true);
              setActiveMenuId(null);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.55rem 0.75rem',
              fontSize: '0.825rem',
              color: '#1e293b',
              borderRadius: '7px',
              width: '100%',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              fontWeight: 500,
              transition: 'background-color 0.12s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Edit size={15} color="#64748b" />
            <span>Edit Details</span>
          </button>

          {/* Only the owner can delete members. */}
          {DBService.isOwner() && (
            <>
              <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '0.25rem 0' }} />

              {/* Delete */}
              <button
                type="button"
                onClick={() => {
                  const name = `${activeMember.first_name} ${activeMember.last_name}`;
                  setActiveMenuId(null);
                  handleDeleteMember(activeMember.id, name);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.55rem 0.75rem',
                  fontSize: '0.825rem',
                  color: '#ef4444',
                  borderRadius: '7px',
                  width: '100%',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontWeight: 500,
                  transition: 'all 0.12s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#fef2f2';
                  e.currentTarget.style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#ef4444';
                }}
              >
                <Trash2 size={15} color="#ef4444" />
                <span>Delete Member</span>
              </button>
            </>
          )}
        </div>,
        document.body
      )}

      {/* Modals */}
      <MemberModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingMember(null);
        }}
        onSuccess={() => {
          setIsAddModalOpen(false);
          setEditingMember(null);
          refreshData();
        }}
        initialMember={editingMember}
      />

      <PaymentModal
        isOpen={!!paymentMemberId}
        onClose={() => setPaymentMemberId(null)}
        onSuccess={() => {
          setPaymentMemberId(null);
          refreshData();
        }}
        preselectedMemberId={paymentMemberId || undefined}
      />

      {/* Payment Reminder Modal */}
      <PaymentReminderModal
        isOpen={Boolean(selectedReminderMember)}
        onClose={() => setSelectedReminderMember(null)}
        member={selectedReminderMember}
        onSuccess={() => {
          refreshData();
        }}
      />
    </div>
  );
};
