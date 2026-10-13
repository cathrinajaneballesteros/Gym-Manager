'use client';

import React, { useState } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import { DBService } from '@/lib/data/db-service';
import { StaffMember } from '@/types/database';
import { showConfirm, showError, showToast } from '@/lib/ui/swal';
import { escapeHtml } from '@/lib/ui/escape';

export const StaffSettings: React.FC = () => {
  const [staff, setStaff] = useState<StaffMember[]>(DBService.getStaff());
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const address = email.trim().toLowerCase();
    if (address === DBService.getProfile().email.toLowerCase()) {
      showError('That is you', 'You are already the owner of this gym.');
      return;
    }
    setInviting(true);
    try {
      await DBService.inviteStaff(address);
      setStaff(DBService.getStaff());
      setEmail('');
      showToast(`Invite added for ${escapeHtml(address)}`);
    } catch (err) {
      showError('Invite Failed', err instanceof Error ? err.message : 'Could not add the invite.');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (member: StaffMember) => {
    const who = member.full_name || member.email;
    const pending = member.status === 'invited';
    const confirmed = await showConfirm(
      pending ? 'Cancel invite?' : 'Remove staff member?',
      pending
        ? `${who} will no longer be able to join your gym with this email.`
        : `${who} will lose access to your gym straight away. Everything they recorded stays.`,
      pending ? 'Yes, cancel invite' : 'Yes, remove',
      '#ef4444'
    );
    if (!confirmed) return;
    try {
      await DBService.removeStaff(member.id);
      setStaff(DBService.getStaff());
      showToast(pending ? 'Invite cancelled' : `${escapeHtml(who)} removed`);
    } catch (err) {
      showError('Remove Failed', err instanceof Error ? err.message : 'Could not remove the staff member.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '620px' }}>
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>Staff</h2>
        <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
          Staff can register and edit members, check members in, record payments and approve GCash receipts.
          Expenses, reports, AI insights, the audit log, plans and gym settings stay with you.
        </p>
      </div>

      <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#334155' }}>Invite by email</label>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="staff@example.com"
            required
            style={{ flex: '1 1 220px' }}
          />
          <button type="submit" className="btn btn-primary" disabled={inviting} style={{ backgroundColor: '#0f172a', borderColor: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <UserPlus size={15} />
            {inviting ? 'Adding…' : 'Invite'}
          </button>
        </div>
        <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
          Ask them to sign up (or sign in) with this exact email. They'll be asked to join your gym when they set up their account (only if they don't run a gym of their own). No email is sent.
        </p>
      </form>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
        {staff.map((member, i) => (
          <div
            key={member.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.85rem 1rem',
              borderTop: i === 0 ? 'none' : '1px solid #f1f5f9',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {member.full_name || member.email}
              </div>
              {member.full_name && (
                <div style={{ fontSize: '0.75rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.email}</div>
              )}
            </div>
            <span className={member.role === 'owner' ? 'badge badge-active' : member.status === 'active' ? 'badge badge-active' : 'badge badge-pending'}>
              {member.role === 'owner' ? 'Owner' : member.status === 'active' ? 'Staff' : 'Invited'}
            </span>
            {member.role !== 'owner' && (
              <button
                type="button"
                onClick={() => handleRemove(member)}
                aria-label={`Remove ${member.email}`}
                style={{ color: '#ef4444', cursor: 'pointer', padding: '0.25rem', display: 'flex' }}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
