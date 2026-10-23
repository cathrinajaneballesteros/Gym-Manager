'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  CreditCard,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  FileCheck,
} from 'lucide-react';
import { DBService } from '@/lib/data/db-service';
import { useGymDataRefresh } from '@/lib/ui/use-gym-data-refresh';
import { Payment, UserProfile, Member } from '@/types/database';
import { PaymentModal } from './PaymentModal';
import { WalkInModal } from './WalkInModal';
import { ReceiptCheckerModal } from './ReceiptCheckerModal';
import { PaymentReminderModal } from './PaymentReminderModal';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { showToast, showConfirm, showError } from '@/lib/ui/swal';
import { formatDisplayDate } from '@/lib/ui/date';
import { getPaymentMemberName } from '@/lib/ui/format';
import { Bell, CheckCircle2, Clock, AlertTriangle, Edit, UserPlus, Trash2, UserRound, MoreVertical } from 'lucide-react';
import { getPageWindow } from '@/lib/ui/pagination';

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
  // Walk-ins have no member, so they use their own form (new: null with the modal open; edit: the payment).
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [editingWalkIn, setEditingWalkIn] = useState<Payment | null>(null);
  const [checkingPayment, setCheckingPayment] = useState<Payment | null>(null);
  const [remindingPayment, setRemindingPayment] = useState<Payment | null>(null);
  const pageSize = 8;
  const isOwner = DBService.isOwner();

  // The ⋮ menu for the less common actions on a row (same pattern as the Members list).
  const [menuPayment, setMenuPayment] = useState<Payment | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- portals need document, which only exists after mount
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!menuPayment) return;

    const handleClose = () => {
      setMenuPayment(null);
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
  }, [menuPayment]);

  const handleToggleMenu = (p: Payment, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (menuPayment?.id === p.id) {
      setMenuPayment(null);
      setMenuPosition(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuHeight = 200;
    const openUpwards = window.innerHeight - rect.bottom < menuHeight && rect.top > menuHeight;
    setMenuPosition({
      top: openUpwards ? Math.max(10, rect.top - menuHeight - 6) : rect.bottom + 6,
      right: Math.max(16, window.innerWidth - rect.right),
    });
    setMenuPayment(p);
  };

  // A rejected GCash receipt must not be counted with one click; edit or delete it instead.
  const canMarkPaid = (p: Payment) => p.payment_status === 'pending' && p.receipt_status !== 'rejected';
  const needsReceiptCheck = (p: Payment) =>
    p.payment_status === 'pending' && (p.receipt_status || 'unverified') === 'unverified' && p.payment_method !== 'Cash';

  const openEdit = (p: Payment) => {
    if (p.is_walk_in) {
      setEditingWalkIn(p);
      setIsWalkInOpen(true);
      return;
    }
    setEditingPayment(p);
    setIsModalOpen(true);
  };

  const refreshData = () => {
    setPayments(DBService.getPayments());
    setMembers(DBService.getMembers());
    setProfile(DBService.getProfile());
  };

  useGymDataRefresh(refreshData);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the gym data AppShell already loaded
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
      const memberName = getPaymentMemberName(p);
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
  // After a delete the last page can disappear; go back to the last page that still exists.
  if (currentPage > totalPages) setCurrentPage(totalPages);
  const paginated = filteredPayments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleMarkAsPaid = async (p: Payment) => {
    const memberName = getPaymentMemberName(p);
    const confirmed = await showConfirm(
      'Mark as Paid?',
      `Confirm that payment of ${currency}${Number(p.amount).toLocaleString()} for ${memberName} has been received.`,
      'Yes, Mark as Paid',
      '#059669'
    );
    if (confirmed) {
      try {
        await DBService.updatePayment(p.id, {
          payment_status: 'completed',
          receipt_status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: profile?.full_name || 'Admin',
        });
      } catch (err) {
        showError('Update Failed', err instanceof Error ? err.message : 'Could not update the payment.');
        return;
      }
      refreshData();
      showToast(`Payment of ${currency}${Number(p.amount).toLocaleString()} marked as paid!`);
    }
  };

  // Owner only (the database refuses staff too). Meant for payments recorded by mistake.
  const handleDeletePayment = async (p: Payment) => {
    const confirmed = await showConfirm(
      'Delete this payment?',
      `${currency}${Number(p.amount).toLocaleString()} from ${getPaymentMemberName(p)} on ${formatDisplayDate(p.payment_date)} will be removed from revenue. Membership dates are not changed. This can't be undone.`,
      'Yes, Delete'
    );
    if (!confirmed) return;
    try {
      await DBService.deletePayment(p.id);
    } catch (err) {
      showError('Delete Failed', err instanceof Error ? err.message : 'Could not delete the payment.');
      return;
    }
    refreshData();
    showToast('Payment deleted');
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

          <div className="phone-row" style={{ position: 'relative', display: 'inline-flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            <button
              onClick={() => {
                setEditingWalkIn(null);
                setIsWalkInOpen(true);
              }}
              className="btn btn-outline"
            >
              <UserPlus size={16} />
              <span>Record Walk-in</span>
            </button>
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
        <div className="phone-fill phone-stack" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
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
            {[...members].sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)).map((m) => (
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
                  Check each GCash reference number, then verify or reject it.
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
            <table className="phone-tight-table steady-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '0.785rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.9rem 1.5rem' }}>Member</th>
                  <th className="hide-on-phone" style={{ width: '11%', padding: '0.9rem 1.25rem' }}>Plan</th>
                  <th style={{ width: '10%', padding: '0.9rem 1.25rem' }}>Amount</th>
                  <th className="hide-on-phone" style={{ width: '12%', padding: '0.9rem 1.25rem' }}>Method & Ref</th>
                  <th className="hide-on-phone" style={{ width: '9%', padding: '0.9rem 1.25rem' }}>Payment</th>
                  <th className="hide-on-phone" style={{ width: '10%', padding: '0.9rem 1.25rem' }}>Receipt Check</th>
                  <th className="hide-on-phone" style={{ width: '10%', padding: '0.9rem 1.25rem' }}>Date</th>
                  <th style={{ width: '190px', padding: '0.9rem 1.5rem 0.9rem 0.75rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((p) => {
                  // The Plan column already says "Walk-in", so the name doesn't repeat it here.
                  const memberName = p.is_walk_in && p.member_name ? p.member_name : getPaymentMemberName(p);
                  const initials = p.member
                    ? `${p.member.first_name[0]}${p.member.last_name[0]}`
                    : (p.member_name || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

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
                            {/* A walk-in who gave no name has no initials to show. */}
                            {p.is_walk_in && !p.member_name ? <UserRound size={16} /> : initials}
                          </div>
                          <div style={{ minWidth: 0, overflowWrap: 'break-word' }}>
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
                      <td className="hide-on-phone" style={{ padding: '1rem 1.25rem', color: '#334155', fontWeight: 500 }}>
                        {p.is_walk_in ? 'Walk-in' : p.plan?.name || p.member?.plan?.name || 'No plan'}
                      </td>

                      {/* Amount: only completed payments count as revenue, so only they get the green "+". */}
                      <td
                        style={{
                          padding: '1rem 1.25rem',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          color: p.payment_status === 'completed' ? '#059669' : '#94a3b8',
                          textDecoration: p.payment_status === 'refunded' ? 'line-through' : undefined,
                        }}
                      >
                        {p.payment_status === 'completed' ? '+' : ''}{currency}{Number(p.amount).toLocaleString()}
                      </td>

                      {/* Method & Ref */}
                      <td className="hide-on-phone" style={{ padding: '1rem 1.25rem' }}>
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
                      <td className="hide-on-phone" style={{ padding: '1rem 1.25rem' }}>
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
                      <td className="hide-on-phone" style={{ padding: '1rem 1.25rem' }}>
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
                      <td className="hide-on-phone" style={{ padding: '1rem 1.25rem', color: '#64748b', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {formatDisplayDate(p.payment_date)}
                      </td>

                      {/* Actions: the one thing to do next, the rest under ⋮ */}
                      <td style={{ padding: '1rem 1.5rem 1rem 0.75rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem', whiteSpace: 'nowrap' }}>
                          {needsReceiptCheck(p) ? (
                            <button
                              onClick={() => setCheckingPayment(p)}
                              title="Check the GCash receipt"
                              style={{ ...actionButtonStyle, border: '1px solid #d97706', backgroundColor: '#fffbeb', color: '#b45309' }}
                            >
                              <FileCheck size={13} />
                              <span className="phone-icon-label">Check Receipt</span>
                            </button>
                          ) : canMarkPaid(p) ? (
                            <button
                              onClick={() => handleMarkAsPaid(p)}
                              title="Confirm & Mark Payment as Paid"
                              style={{ ...actionButtonStyle, border: '1px solid #10b981', backgroundColor: '#ecfdf5', color: '#047857' }}
                            >
                              <CheckCircle2 size={13} />
                              <span className="phone-icon-label">Mark Paid</span>
                            </button>
                          ) : (
                            <button onClick={() => setCheckingPayment(p)} title="View receipt" style={actionButtonStyle}>
                              <FileCheck size={13} />
                              <span className="phone-icon-label">Receipt</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleToggleMenu(p, e)}
                            aria-label={`More actions for ${getPaymentMemberName(p)}`}
                            aria-expanded={menuPayment?.id === p.id}
                            style={{
                              padding: '0.4rem',
                              borderRadius: '7px',
                              border: 'none',
                              backgroundColor: menuPayment?.id === p.id ? '#f1f5f9' : 'transparent',
                              color: menuPayment?.id === p.id ? '#0f172a' : '#64748b',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            <MoreVertical size={16} />
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

      {/* Walk-in Modal */}
      <WalkInModal
        isOpen={isWalkInOpen}
        onClose={() => {
          setIsWalkInOpen(false);
          setEditingWalkIn(null);
        }}
        initialPayment={editingWalkIn}
        onSuccess={(payment) => {
          refreshData();
          showToast(`Walk-in ${editingWalkIn ? 'updated' : 'recorded'} · ${currency}${Number(payment.amount).toLocaleString()}`);
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

      {/* Row actions menu (portal, so the table's overflow never clips it) */}
      {mounted && menuPayment && menuPosition && createPortal(
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
            minWidth: '190px',
            padding: '0.35rem',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            animation: 'modalSlideUp 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const p = menuPayment;
            const close = () => setMenuPayment(null);
            const items: { key: string; icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }[] = [];
            // Whatever the row's main button doesn't already do.
            if (canMarkPaid(p) && needsReceiptCheck(p)) {
              items.push({ key: 'paid', icon: <CheckCircle2 size={15} color="#059669" />, label: 'Mark Paid', onClick: () => handleMarkAsPaid(p) });
            }
            if (canMarkPaid(p) && !needsReceiptCheck(p)) {
              items.push({ key: 'receipt', icon: <FileCheck size={15} color="#64748b" />, label: 'Receipt', onClick: () => setCheckingPayment(p) });
            }
            if (p.member) {
              items.push({ key: 'remind', icon: <Bell size={15} color="#64748b" />, label: 'Send Reminder', onClick: () => setRemindingPayment(p) });
            }
            items.push({ key: 'edit', icon: <Edit size={15} color="#64748b" />, label: 'Edit', onClick: () => openEdit(p) });
            if (isOwner) {
              items.push({ key: 'delete', icon: <Trash2 size={15} color="#dc2626" />, label: 'Delete', onClick: () => handleDeletePayment(p), danger: true });
            }
            return items.map((item) => (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                onClick={() => {
                  close();
                  item.onClick();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.55rem 0.75rem',
                  fontSize: '0.825rem',
                  color: item.danger ? '#dc2626' : '#1e293b',
                  borderRadius: '7px',
                  width: '100%',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = item.danger ? '#fef2f2' : '#f8fafc')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ));
          })()}
        </div>,
        document.body
      )}
    </div>
  );
};

const actionButtonStyle: React.CSSProperties = {
  padding: '0.35rem 0.65rem',
  borderRadius: '6px',
  border: '1px solid #e2e8f0',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  fontSize: '0.75rem',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.3rem',
};
