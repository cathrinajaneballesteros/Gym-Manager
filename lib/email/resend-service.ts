/**
 * Resend Email Service Integration
 * Sends payment receipts, membership expiry reminders, and system notifications.
 */

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export class ResendService {
  private static getApiKey(): string | null {
    return process.env.RESEND_API_KEY || null;
  }

  static isConfigured(): boolean {
    const key = this.getApiKey();
    return Boolean(key && key.startsWith('re_') && !key.includes('your-resend'));
  }

  /**
   * Send an email via Resend REST API
   */
  static async sendEmail(payload: EmailPayload) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured in .env.local');
    }

    // Default from email: In Resend free sandbox without custom domain,
    // 'onboarding@resend.dev' is provided by default.
    const fromAddress = payload.from || 'Gymetrics <onboarding@resend.dev>';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Resend API error (${res.status}): ${errorText}`);
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
          <h2 style="margin: 0; color: #0f172a; font-size: 22px; font-weight: 700;">${gymName}</h2>
          <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Official Payment Receipt</p>
        </div>

        <div style="background-color: #f8fafc; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">Amount Paid</p>
          <h1 style="margin: 0; font-size: 32px; font-weight: 800; color: #059669;">${amount}</h1>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b;">Member</td>
            <td style="padding: 10px 0; font-weight: 600; text-align: right; color: #0f172a;">${memberName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b;">Plan / Subscription</td>
            <td style="padding: 10px 0; font-weight: 600; text-align: right; color: #0f172a;">${planName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b;">Date</td>
            <td style="padding: 10px 0; font-weight: 600; text-align: right; color: #0f172a;">${date}</td>
          </tr>
          ${
            refNumber
              ? `<tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 0; color: #64748b;">Reference No.</td>
                  <td style="padding: 10px 0; font-weight: 600; text-align: right; color: #0f172a;">${refNumber}</td>
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
    });
  }
}
