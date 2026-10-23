/**
 * Brevo Email Service Integration
 * Sends payment receipts, membership expiry reminders, and system notifications.
 */

import { escapeHtml } from '@/lib/ui/escape';
import { formatDisplayDate } from '@/lib/ui/date';
import { hasMembershipEnded } from '@/lib/ui/reminder-text';

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  /** Display name on the From line; the address is always BREVO_SENDER_EMAIL. */
  fromName?: string;
  /** Where the member's reply goes (the gym's own email). */
  replyTo?: string;
}

export class EmailService {
  private static getApiKey(): string | null {
    return process.env.BREVO_API_KEY || null;
  }

  private static getSenderEmail(): string | null {
    return process.env.BREVO_SENDER_EMAIL || null;
  }

  static isConfigured(): boolean {
    const key = this.getApiKey();
    const sender = this.getSenderEmail();
    return Boolean(key && !key.includes('your-brevo') && sender && !sender.includes('your-'));
  }

  /**
   * Send an email via Brevo's transactional email API
   */
  static async sendEmail(payload: EmailPayload) {
    const apiKey = this.getApiKey();
    const senderEmail = this.getSenderEmail();
    if (!apiKey || !senderEmail) {
      throw new Error('BREVO_API_KEY and BREVO_SENDER_EMAIL must be set in .env.local');
    }

    // The sender address must be verified under Senders in the Brevo dashboard.
    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: payload.fromName || 'Gymetrics', email: senderEmail },
        to: recipients.map((email) => ({ email })),
        subject: payload.subject,
        htmlContent: payload.html,
        ...(payload.replyTo ? { replyTo: { email: payload.replyTo } } : {}),
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Brevo API error (${res.status}): ${errorText}`);
    }

    return await res.json();
  }

  /**
   * Send a branded gym receipt email to a member
   */
  static async sendPaymentReceipt(options: {
    to: string;
    memberName: string;
    gymName: string;
    amount: string;
    planName: string;
    date: string;
    refNumber?: string;
  }) {
    const { to, memberName, gymName, amount, planName, date, refNumber } = options;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="margin: 0; color: #0f172a; font-size: 22px; font-weight: 700;">${escapeHtml(gymName)}</h2>
          <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Official Payment Receipt</p>
        </div>

        <div style="background-color: #f8fafc; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">Amount Paid</p>
          <h1 style="margin: 0; font-size: 32px; font-weight: 800; color: #059669;">${escapeHtml(amount)}</h1>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b;">Member</td>
            <td style="padding: 10px 0; font-weight: 600; text-align: right; color: #0f172a;">${escapeHtml(memberName)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b;">Plan / Subscription</td>
            <td style="padding: 10px 0; font-weight: 600; text-align: right; color: #0f172a;">${escapeHtml(planName)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b;">Date</td>
            <td style="padding: 10px 0; font-weight: 600; text-align: right; color: #0f172a;">${escapeHtml(date)}</td>
          </tr>
          ${
            refNumber
              ? `<tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 0; color: #64748b;">Reference No.</td>
                  <td style="padding: 10px 0; font-weight: 600; text-align: right; color: #0f172a;">${escapeHtml(refNumber)}</td>
                </tr>`
              : ''
          }
        </table>

        <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 18px; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">Thank you for training with us! Keep pushing your limits.</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `Payment Receipt from ${gymName} (${amount})`,
      html,
      fromName: gymName,
    });
  }

  /**
   * Send a payment / renewal reminder email to a member
   */
  static async sendPaymentReminder(options: {
    to: string;
    memberName: string;
    gymName: string;
    amount: string;
    planName: string;
    dueDate: string;
    customNote?: string;
    gymPhone?: string;
    gymAddress?: string;
    gymEmail?: string;
  }) {
    const { to, memberName, gymName, amount, planName, customNote, gymPhone, gymAddress, gymEmail } = options;
    const dueDate = formatDisplayDate(options.dueDate);
    // A lapsed member gets a come-back note instead of a payment reminder.
    const ended = hasMembershipEnded(options.dueDate);
    // How to reach the gym, shown in the footer; empty details are left out.
    const contactLines = [gymAddress?.trim(), gymPhone?.trim() ? `Call ${gymPhone.trim()}` : '']
      .filter(Boolean)
      .map((line) => `<p style="margin: 4px 0 0 0;">${escapeHtml(line)}</p>`)
      .join('');

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="margin: 0; color: #0f172a; font-size: 22px; font-weight: 700;">${escapeHtml(gymName)}</h2>
          <p style="margin: 4px 0 0 0; color: #f59e0b; font-size: 13px; font-weight: 600;">${ended ? 'We Miss You!' : 'Membership Renewal & Payment Reminder'}</p>
        </div>

        <div style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
          <p style="margin: 0 0 4px 0; font-size: 13px; color: #854d0e; text-transform: uppercase; font-weight: 600;">${ended ? 'Renewal Price' : 'Amount Due'}</p>
          <h1 style="margin: 0; font-size: 32px; font-weight: 800; color: #ca8a04;">${escapeHtml(amount)}</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #a16207;">${ended ? 'Membership ended' : 'Due Date'}: <strong>${escapeHtml(dueDate)}</strong></p>
        </div>

        <div style="margin-bottom: 20px; font-size: 14px; line-height: 1.6; color: #334155;">
          <p>Hi <strong>${escapeHtml(memberName)}</strong>,</p>
          <p>${
            ended
              ? `Your <strong>${escapeHtml(planName)}</strong> membership ended on ${escapeHtml(dueDate)}, and we'd love to have you back.`
              : `This is a friendly reminder that your gym subscription for <strong>${escapeHtml(planName)}</strong> is due for payment.`
          }</p>
          ${
            customNote
              ? `<div style="background-color: #f8fafc; border-left: 3px solid #0071e3; padding: 10px 14px; margin: 14px 0; font-style: italic; color: #334155;">
                  ${escapeHtml(customNote)}
                </div>`
              : ''
          }
          <p>${
            ended
              ? 'Renew anytime at the front desk (Cash) or via GCash and pick up where you left off.'
              : 'To avoid any disruption to your gym access and training routine, please settle your renewal at the front desk (Cash) or via GCash.'
          }</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b;">Plan</td>
            <td style="padding: 10px 0; font-weight: 600; text-align: right; color: #0f172a;">${escapeHtml(planName)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b;">Member Name</td>
            <td style="padding: 10px 0; font-weight: 600; text-align: right; color: #0f172a;">${escapeHtml(memberName)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b;">${ended ? 'Ended On' : 'Renewal Due'}</td>
            <td style="padding: 10px 0; font-weight: 600; text-align: right; color: #d97706;">${escapeHtml(dueDate)}</td>
          </tr>
        </table>

        <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 18px; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">Stay dedicated, stay strong! See you at ${escapeHtml(gymName)}.</p>
          ${contactLines}
        </div>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: ended
        ? `We miss you at ${gymName}! Renew your ${planName}`
        : `Payment Reminder: ${planName} due on ${dueDate} - ${gymName}`,
      html,
      fromName: gymName,
      replyTo: gymEmail?.trim() || undefined,
    });
  }
}
