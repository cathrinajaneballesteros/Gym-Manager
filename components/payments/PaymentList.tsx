'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Search,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Printer,
  FileCheck,
} from 'lucide-react';
import { DBService } from '@/lib/data/db-service';
import { Payment, UserProfile, Member } from '@/types/database';
import { PaymentModal } from './PaymentModal';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { showSuccess } from '@/lib/ui/swal';
import { getCurrentMonthRangeLabel } from '@/lib/ui/date';

export const PaymentList: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [memberFilter, setMemberFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const pageSize = 8;

  const refreshData = () => {
    setPayments(DBService.getPayments());
    setMembers(DBService.getMembers());
    setProfile(DBService.getProfile());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const currency = profile?.currency || '₱';

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const memberName = p.member ? `${p.member.first_name} ${p.member.last_name}` : '';
      const matchesSearch =
        memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.reference_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.notes || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesMember = memberFilter === 'all' || p.member_id === memberFilter;
      const matchesStatus = statusFilter === 'all' || p.payment_status === statusFilter;

      return matchesSearch && matchesMember && matchesStatus;
    });
  }, [payments, searchQuery, memberFilter, statusFilter]);

  const totalPages = Math.ceil(filteredPayments.length / pageSize) || 1;
  const paginated = filteredPayments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
            <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
              Payments
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Track and manage all membership payments.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary"
          >
            <Plus size={16} />
            <span>Add Payment</span>
          </button>
        </div>
      </ScrollReveal>

      {/* 2. Filters & Search Bar */}
      <ScrollReveal delay={40}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
        {/* Search */}
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
            placeholder="Search payments..."
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

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            value={memberFilter}
            onChange={(e) => {
              setMemberFilter(e.target.value);
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
            <option value="all">All Members</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.first_name} {m.last_name}
              </option>
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
            <option value="completed">Paid</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
          </select>

          {/* Date range filter pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.5rem 0.85rem',
              fontSize: '0.825rem',
              color: '#475569',
              fontWeight: 500,
            }}
          >
            <Calendar size={14} color="#64748b" />
            <span>{getCurrentMonthRangeLabel()}</span>
          </div>
        </div>
      </div>
      </ScrollReveal>

      {/* 3. Payments Table Card */}
      <ScrollReveal delay={80}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredPayments.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
            No payments match your search criteria.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '0.785rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.9rem 1.5rem' }}>Member</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Plan</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Amount</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Method</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Status</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Date</th>
                  <th style={{ padding: '0.9rem 1.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((p) => {
                  const memberName = p.member ? `${p.member.first_name} ${p.member.last_name}` : 'Direct Guest';
                  const initials = p.member ? `${p.member.first_name[0]}${p.member.last_name[0]}` : 'DG';

                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid #f8fafc',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Member Info */}
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: '#e2e8f0',
                              color: '#334155',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>
                              {memberName}
                            </div>
                            {p.member?.email && (
                              <div style={{ fontSize: '0.785rem', color: '#64748b' }}>
                                {p.member.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Plan */}
                      <td style={{ padding: '1rem 1.25rem', color: '#334155', fontWeight: 500 }}>
                        {p.plan?.name || p.member?.plan?.name || 'Premium'}
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#0f172a' }}>
                        {currency}{Number(p.amount).toLocaleString()}
                      </td>

                      {/* Method Pill */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.65rem',
                            borderRadius: '6px',
                            backgroundColor: '#f1f5f9',
                            color: '#334155',
                            fontSize: '0.785rem',
                            fontWeight: 500,
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          {p.payment_method}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span
                          className={`badge ${
                            p.payment_status === 'completed'
                              ? 'badge-completed'
                              : p.payment_status === 'pending'
                              ? 'badge-pending'
                              : 'badge-danger'
                          }`}
                        >
                          {p.payment_status === 'completed' ? 'Paid' : p.payment_status === 'pending' ? 'Pending' : 'Refunded'}
                        </span>
                      </td>

                      {/* Date */}
                      <td style={{ padding: '1rem 1.25rem', color: '#64748b', fontSize: '0.85rem' }}>
                        {formatDate(p.payment_date)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                        <button
                          onClick={() =>
                            showSuccess(
                              'Receipt Verified',
                              `Receipt #${p.reference_number || p.id} for ${currency}${Number(p.amount).toLocaleString()} is verified.`
                            )
                          }
                          style={{
                            padding: '0.35rem 0.65rem',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#ffffff',
                            color: '#475569',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          Receipt
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredPayments.length > 0 && (
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
              Showing {Math.min((currentPage - 1) * pageSize + 1, filteredPayments.length)}-
              {Math.min(currentPage * pageSize, filteredPayments.length)} of {filteredPayments.length}
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

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          refreshData();
        }}
      />
    </div>
  );
};
