/**
 * SMS Reminder Service
 * Sends automated and manual payment reminders via SMS to gym members.
 * Supports textbee.dev (sends through a linked Android phone) and simulated delivery mode.
 */

import { buildReminderSms } from '@/lib/ui/reminder-text';

export interface SmsPayload {
  to: string;
  message: string;
}

export interface SmsReminderOptions {
  phone: string;
  memberName: string;
  gymName: string;
  amount: string;
  planName: string;
  dueDate: string;
  /** The member's own note from the reminder form, added to the standard message. */
  customMessage?: string;
  /** The gym's phone, so members can call back. */
  gymPhone?: string;
}

export class SmsService {
  private static getTextbeeKey(): string | null {
    return process.env.TEXTBEE_API_KEY || null;
  }

  static isConfigured(): boolean {
    const key = this.getTextbeeKey();
    return Boolean(key && !key.includes('your-textbee-api-key'));
  }

  /**
   * Format phone numbers to international format (+639XXXXXXXXX), which textbee needs
   */
  static formatPhoneNumber(rawPhone: string): string {
    const cleaned = rawPhone.replace(/\D/g, '');
    if (cleaned.startsWith('09') && cleaned.length === 11) {
      return `+63${cleaned.slice(1)}`;
    }
    if (cleaned.startsWith('9') && cleaned.length === 10) {
      return `+63${cleaned}`;
    }
    return `+${cleaned}`;
  }

  /**
   * Generates standard gym payment reminder message text
   */
  static generateReminderText(options: SmsReminderOptions): string {
    const { memberName, gymName, amount, planName, dueDate, customMessage, gymPhone } = options;
    return buildReminderSms({ gymName, memberName, planName, amount, dueDate, note: customMessage, gymPhone });
  }

  /**
   * Send SMS via textbee.dev or fallback to simulated delivery
   */
  static async sendReminderSMS(options: SmsReminderOptions): Promise<{
    success: boolean;
    simulated: boolean;
    messageId: string;
    recipient: string;
    text: string;
    sentAt: string;
  }> {
    const formattedPhone = this.formatPhoneNumber(options.phone);
    const text = this.generateReminderText(options);
    const apiKey = this.getTextbeeKey();

    if (apiKey && this.isConfigured()) {
      try {
        const deviceId = process.env.TEXTBEE_DEVICE_ID || undefined;
        const response = await fetch('https://api.textbee.dev/api/v1/gateway/send-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
          body: JSON.stringify({
            recipients: [formattedPhone],
            message: text,
            deviceId,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`textbee API error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        if (data?.data?.success === false) {
          throw new Error(`textbee API error: ${data.data.message || 'message was not accepted'}`);
        }
        return {
          success: true,
          simulated: false,
          messageId: data?.data?.smsBatchId ? String(data.data.smsBatchId) : `sms_${Date.now()}`,
          recipient: formattedPhone,
          text,
          sentAt: new Date().toISOString(),
        };
      } catch (err) {
        // A real key is set, so report the failure instead of pretending it was sent.
        throw new Error(`SMS was not sent: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // No SMS key configured: simulate delivery for development and testing
    return {
      success: true,
      simulated: true,
      messageId: `sim_sms_${Date.now()}`,
      recipient: formattedPhone,
      text,
      sentAt: new Date().toISOString(),
    };
  }
}
