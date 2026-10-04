'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
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
} from 'lucide-react';
import { DBService } from '@/lib/data/db-service';
import { Member, MembershipPlan } from '@/types/database';
import { MemberModal } from './MemberModal';
import { PaymentModal } from '@/components/payments/PaymentModal';
import { PaymentReminderModal } from '@/components/payments/PaymentReminderModal';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { showConfirm, showToast } from '@/lib/ui/swal';
import { escapeHtml } from '@/lib/ui/escape';

export const MemberList: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
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

  const refreshData = () => {
    setMembers(DBService.getMembers());
    setPlans(DBService.getPlans());
  };

  useEffect(() => {
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
  const paginatedMembers = filteredMembers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleDeleteMember = async (id: string, name: string) => {
    const confirmed = await showConfirm(
      'Remove Member?',
      `Are you sure you want to remove member ${name}? This action cannot be undone.`,
      'Yes, remove',
      '#ef4444'
    );
    if (confirmed) {
      DBService.deleteMember(id);
      refreshData();
      setActiveMenuId(null);
      showToast(`${escapeHtml(name)} removed`);
    }
  };

  const getPlanName = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    return plan?.name || 'Standard';
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
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
              <option value="active">Active</option>
              <option value="expiring">Expiring Soon</option>
              <option value="expired">Expired</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
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
              No members yet
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '360px', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Start by adding your first member to manage memberships and payments.
            </p>
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
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '0.785rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.9rem 1.5rem' }}>Member</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Plan</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Status</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Expiration</th>
                  <th style={{ padding: '0.9rem 1.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
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
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>
                              {fullName}
                            </div>
                            <div style={{ fontSize: '0.785rem', color: '#64748b' }}>
                              {member.email}
                            </div>
                          </div>
                        </Link>
                      </td>

                      {/* Plan */}
                      <td style={{ padding: '1rem 1.25rem', color: '#334155', fontWeight: 500 }}>
                        {planName}
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span
                          className={`badge ${
                            member.status === 'active'
                              ? 'badge-active'
                              : member.status === 'expiring'
                              ? 'badge-expiring'
                              : 'badge-expired'
                          }`}
                        >
                          {member.status === 'active'
                            ? 'Active'
                            : member.status === 'expiring'
                            ? 'Expiring Soon'
                            : 'Expired'}
                        </span>
                      </td>

                      {/* Expiration Date */}
                      <td style={{ padding: '1rem 1.25rem', color: '#64748b', fontSize: '0.85rem' }}>
                        {formatDate(member.end_date)}
                      </td>

                      {/* Actions Menu */}
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right', position: 'relative' }}>
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === member.id ? null : member.id)}
                          style={{
                            padding: '0.4rem',
                            color: '#64748b',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          aria-label="Actions"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {/* Dropdown Menu */}
                        {activeMenuId === member.id && (
                          <div
                            style={{
                              position: 'absolute',
                              right: '1.5rem',
                              top: '3rem',
                              backgroundColor: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
                              zIndex: 20,
                              minWidth: '150px',
                              padding: '0.35rem',
                              textAlign: 'left',
                            }}
                          >
                            <Link
                              href={`/members/${member.id}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 0.75rem',
                                fontSize: '0.8rem',
                                color: '#334155',
                                borderRadius: '4px',
                                textDecoration: 'none',
                              }}
                              onClick={() => setActiveMenuId(null)}
                            >
                              <Eye size={14} />
                              <span>View Profile</span>
                            </Link>

                            <button
                              onClick={() => {
                                setPaymentMemberId(member.id);
                                setActiveMenuId(null);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 0.75rem',
                                fontSize: '0.8rem',
                                color: '#334155',
                                borderRadius: '4px',
                                width: '100%',
                              }}
                            >
                              <CreditCard size={14} />
                              <span>Record Payment</span>
                            </button>

                            <button
                              onClick={() => {
                                setSelectedReminderMember(member);
                                setActiveMenuId(null);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 0.75rem',
                                fontSize: '0.8rem',
                                color: '#0071e3',
                                borderRadius: '4px',
                                width: '100%',
                                fontWeight: 500,
                              }}
                            >
                              <Bell size={14} />
                              <span>Send Reminder (SMS/Email)</span>
                            </button>

                            <button
                              onClick={() => {
                                setEditingMember(member);
                                setIsAddModalOpen(true);
                                setActiveMenuId(null);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 0.75rem',
                                fontSize: '0.8rem',
                                color: '#334155',
                                borderRadius: '4px',
                                width: '100%',
                              }}
                            >
                              <Edit size={14} />
                              <span>Edit Details</span>
                            </button>

                            <button
                              onClick={() => handleDeleteMember(member.id, fullName)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 0.75rem',
                                fontSize: '0.8rem',
                                color: '#ef4444',
                                borderRadius: '4px',
                                width: '100%',
                              }}
                            >
                              <Trash2 size={14} />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. Pagination Footer */}
        {filteredMembers.length > 0 && (
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
