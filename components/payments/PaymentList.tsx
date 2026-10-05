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
import { ReceiptCheckerModal } from './ReceiptCheckerModal';
import { PaymentReminderModal } from './PaymentReminderModal';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { showSuccess, showToast, showConfirm } from '@/lib/ui/swal';
import { getCurrentMonthRangeLabel } from '@/lib/ui/date';
import { Bell, CheckCircle2, Clock, AlertTriangle, FileText, Edit } from 'lucide-react';

export const PaymentList: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [memberFilter, setMemberFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [receiptFilter, setReceiptFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [checkingPayment, setCheckingPayment] = useState<Payment | null>(null);
  const [remindingPayment, setRemindingPayment] = useState<Payment | null>(null);
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

  const unverifiedCount = useMemo(() => {
    return payments.filter((p) => (p.receipt_status || 'unverified') === 'unverified' && p.payment_method !== 'Cash').length;
  }, [payments]);

  const pendingMembers = useMemo(() => {
    return members.filter((m) => m.status === 'pending');
  }, [members]);
  const pendingCount = pendingMembers.length;

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const memberName = p.member ? `${p.member.first_name} ${p.member.last_name}` : '';
      const matchesSearch =
        memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.reference_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.notes || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesMember = memberFilter === 'all' || p.member_id === memberFilter;
      const matchesStatus = statusFilter === 'all' || p.payment_status === statusFilter;
      const receiptStatus = p.receipt_status || 'unverified';
      const matchesReceipt = receiptFilter === 'all' || receiptStatus === receiptFilter;

      return matchesSearch && matchesMember && matchesStatus && matchesReceipt;
    });
  }, [payments, searchQuery, memberFilter, statusFilter, receiptFilter]);

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

  const handleMarkAsPaid = async (p: Payment) => {
    const memberName = p.member ? `${p.member.first_name} ${p.member.last_name}` : 'Member';
    const confirmed = await showConfirm(
      'Mark as Paid?',
      `Confirm that payment of ${currency}${Number(p.amount).toLocaleString()} for ${memberName} has been received.`,
      'Yes, Mark as Paid',
      '#059669'
    );
    if (confirmed) {
      DBService.updatePayment(p.id, {
        payment_status: 'completed',
        receipt_status: 'verified',
        verified_at: new Date().toISOString(),
        verified_by: profile?.full_name || 'Admin',
      });
      refreshData();
      showToast(`Payment of ${currency}${Number(p.amount).toLocaleString()} marked as paid!`);
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

          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <button
              onClick={() => {
                setEditingPayment(null);
                setIsModalOpen(true);
              }}
              className="btn btn-primary"
              style={{ position: 'relative' }}
              id="add-payment-btn"
            >
              <Plus size={16} />
              <span>Add Payment</span>
              {pendingCount > 0 && (
                <span
                  title={`${pendingCount} new member${pendingCount > 1 ? 's' : ''} waiting to get listed on payments`}
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    minWidth: '22px',
                    height: '22px',
                    padding: '0 6px',
                    borderRadius: '9999px',
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.45), 0 0 0 2px #ffffff',
                    lineHeight: 1,
                    zIndex: 10,
                    pointerEvents: 'none',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {pendingCount}
                </span>
              )}
            </button>
          </div>
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
            <option value="all">All Payment Status</option>
            <option value="completed">Paid</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
          </select>

          {/* Receipt Status Filter */}
          <select
            value={receiptFilter}
            onChange={(e) => {
              setReceiptFilter(e.target.value);
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
            <option value="all">All Receipts</option>
            <option value="unverified">Needs Verification ({unverifiedCount})</option>
            <option value="verified">Verified Receipts</option>
            <option value="rejected">Rejected Receipts</option>
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

      {/* Unverified Receipts Attention Banner */}
      {unverifiedCount > 0 && (
        <ScrollReveal delay={60}>
          <div
            style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '12px',
              padding: '0.85rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <AlertTriangle size={18} color="#d97706" />
              <div>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#92400e' }}>
                  {unverifiedCount} {unverifiedCount === 1 ? 'payment receipt requires' : 'payment receipts require'} manual review.
                </span>
                <span style={{ fontSize: '0.825rem', color: '#b45309', marginLeft: '0.5rem' }}>
                  Inspect GCash and online bank transfer vouchers to verify or reject.
                </span>
              </div>
            </div>
            <button
              onClick={() => setReceiptFilter('unverified')}
              style={{
                backgroundColor: '#d97706',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '0.4rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Filter Needs Review ({unverifiedCount})
            </button>
          </div>
        </ScrollReveal>
      )}

      {/* 3. Payments Table Card */}
      <ScrollReveal delay={80}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredPayments.length === 0 ? (
          <div style={{ padding: '4.5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                marginBottom: '1.25rem',
              }}
            >
              <CreditCard size={28} strokeWidth={1.75} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.4rem' }}>
              {payments.length === 0 ? 'No payments recorded yet' : 'No payments match your search criteria'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '360px', lineHeight: 1.5, marginBottom: payments.length === 0 ? '1.5rem' : '0' }}>
              {payments.length === 0
                ? 'Record a payment when a member joins, renews, or makes an on-site or digital transaction.'
                : 'Try adjusting your filters or search keywords to find what you are looking for.'}
            </p>
            {payments.length === 0 && (
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                <button
                  onClick={() => {
                    setEditingPayment(null);
                    setIsModalOpen(true);
                  }}
                  className="btn btn-primary"
                  style={{ position: 'relative' }}
                >
                  <Plus size={16} />
                  <span>Record Payment</span>
                  {pendingCount > 0 && (
                    <span
                      title={`${pendingCount} new member${pendingCount > 1 ? 's' : ''} waiting to get listed on payments`}
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        minWidth: '22px',
                        height: '22px',
                        padding: '0 6px',
                        borderRadius: '9999px',
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(239, 68, 68, 0.45), 0 0 0 2px #ffffff',
                        lineHeight: 1,
                        zIndex: 10,
                        pointerEvents: 'none',
                      }}
                    >
                      {pendingCount}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '0.785rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.9rem 1.5rem' }}>Member</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Plan</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Amount</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Method & Ref</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Payment</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Receipt Check</th>
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
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#059669' }}>
                        +{currency}{Number(p.amount).toLocaleString()}
                      </td>

                      {/* Method & Ref */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '6px',
                              backgroundColor: '#f1f5f9',
                              color: '#334155',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              border: '1px solid #e2e8f0',
                              width: 'fit-content',
                            }}
                          >
                            {p.payment_method}
                          </span>
                          {p.reference_number && (
                            <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>
                              #{p.reference_number}
                            </span>
                          )}
                        </div>
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

                      {/* Receipt Status Badge */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.25rem 0.55rem',
                            borderRadius: '6px',
                            backgroundColor:
                              (p.receipt_status || 'unverified') === 'verified'
                                ? '#f0fdf4'
                                : p.receipt_status === 'rejected'
                                ? '#fef2f2'
                                : '#fffbeb',
                            color:
                              (p.receipt_status || 'unverified') === 'verified'
                                ? '#166534'
                                : p.receipt_status === 'rejected'
                                ? '#991b1b'
                                : '#92400e',
                            border: '1px solid',
                            borderColor:
                              (p.receipt_status || 'unverified') === 'verified'
                                ? '#bbf7d0'
                                : p.receipt_status === 'rejected'
                                ? '#fecaca'
                                : '#fde68a',
                          }}
                        >
                          {(p.receipt_status || 'unverified') === 'verified' ? (
                            <CheckCircle2 size={12} />
                          ) : p.receipt_status === 'rejected' ? (
                            <AlertTriangle size={12} />
                          ) : (
                            <Clock size={12} />
                          )}
                          <span>
                            {(p.receipt_status || 'unverified') === 'verified'
                              ? 'Verified'
                              : p.receipt_status === 'rejected'
                              ? 'Rejected'
                              : 'Needs Check'}
                          </span>
                        </span>
                      </td>

                      {/* Date */}
                      <td style={{ padding: '1rem 1.25rem', color: '#64748b', fontSize: '0.85rem' }}>
                        {formatDate(p.payment_date)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.45rem' }}>
                          {p.payment_status === 'pending' && (
                            <button
                              onClick={() => handleMarkAsPaid(p)}
                              title="Confirm & Mark Payment as Paid"
                              style={{
                                padding: '0.35rem 0.65rem',
                                borderRadius: '6px',
                                border: '1px solid #10b981',
                                backgroundColor: '#ecfdf5',
                                color: '#047857',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}
                            >
                              <CheckCircle2 size={13} />
                              <span>Mark Paid</span>
                            </button>
                          )}

                          <button
                            onClick={() => setRemindingPayment(p)}
                            title="Send Payment Reminder (SMS/Email)"
                            style={{
                              padding: '0.35rem 0.6rem',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0',
                              backgroundColor: '#ffffff',
                              color: '#475569',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                            }}
                          >
                            <Bell size={13} />
                            <span>Remind</span>
                          </button>

                          <button
                            onClick={() => setCheckingPayment(p)}
                            title="Manual Receipt Checker & Inspector"
                            style={{
                              padding: '0.35rem 0.65rem',
                              borderRadius: '6px',
                              border: '1px solid',
                              borderColor:
                                (p.receipt_status || 'unverified') === 'unverified' && p.payment_method !== 'Cash'
                                  ? '#d97706'
                                  : '#e2e8f0',
                              backgroundColor:
                                (p.receipt_status || 'unverified') === 'unverified' && p.payment_method !== 'Cash'
                                  ? '#fffbeb'
                                  : '#ffffff',
                              color:
                                (p.receipt_status || 'unverified') === 'unverified' && p.payment_method !== 'Cash'
                                  ? '#b45309'
                                  : '#0f172a',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                            }}
                          >
                            <FileCheck size={13} />
                            <span>Receipt</span>
                          </button>
                          <button
                            onClick={() => {
                              setEditingPayment(p);
                              setIsModalOpen(true);
                            }}
                            title="Edit Payment Details"
                            style={{
                              padding: '0.35rem 0.65rem',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0',
                              backgroundColor: '#ffffff',
                              color: '#334155',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                            }}
                          >
                            <Edit size={13} />
                            <span>Edit</span>
                          </button>
                        </div>
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
        onClose={() => {
          setIsModalOpen(false);
          setEditingPayment(null);
        }}
        initialPayment={editingPayment}
        onSuccess={() => {
          setIsModalOpen(false);
          setEditingPayment(null);
          refreshData();
        }}
      />

      {/* Manual Receipt Checker Modal */}
      <ReceiptCheckerModal
        isOpen={Boolean(checkingPayment)}
        onClose={() => setCheckingPayment(null)}
        payment={checkingPayment}
        onSuccess={() => {
          refreshData();
        }}
      />

      {/* Payment Reminder Modal (SMS & Email) */}
      <PaymentReminderModal
        isOpen={Boolean(remindingPayment)}
        onClose={() => setRemindingPayment(null)}
        payment={remindingPayment}
        onSuccess={() => {
          refreshData();
        }}
      />
    </div>
  );
};
