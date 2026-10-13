/**
 * SMS Reminder Service
 * Sends automated and manual payment reminders via SMS to gym members.
 * Supports Semaphore API (popular Philippine SMS gateway) and simulated delivery mode.
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
  private static getSemaphoreKey(): string | null {
    return process.env.SEMAPHORE_API_KEY || null;
  }

  static isConfigured(): boolean {
    const key = this.getSemaphoreKey();
    return Boolean(key && !key.includes('your-semaphore-key'));
  }

  /**
   * Format phone numbers to standard E.164 or 11-digit local format
   */
  static formatPhoneNumber(rawPhone: string): string {
    const cleaned = rawPhone.replace(/\D/g, '');
    if (cleaned.startsWith('63') && cleaned.length === 12) {
      return `0${cleaned.slice(2)}`;
    }
    return cleaned;
  }

  /**
   * Generates standard gym payment reminder message text
   */
  static generateReminderText(options: SmsReminderOptions): string {
    const { memberName, gymName, amount, planName, dueDate, customMessage, gymPhone } = options;
    return buildReminderSms({ gymName, memberName, planName, amount, dueDate, note: customMessage, gymPhone });
  }

  /**
   * Send SMS via Semaphore API or fallback to simulated delivery
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
    const apiKey = this.getSemaphoreKey();

    if (apiKey && this.isConfigured()) {
      try {
        const response = await fetch('https://api.semaphore.co/api/v4/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apikey: apiKey,
            number: formattedPhone,
            message: text,
            sendername: 'SEMAPHORE',
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Semaphore API error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        return {
          success: true,
          simulated: false,
          messageId: data[0]?.message_id ? String(data[0].message_id) : `sms_${Date.now()}`,
          recipient: formattedPhone,
          text,
          sentAt: new Date().toISOString(),
        };
      } catch (err: any) {
        // A real key is set, so report the failure instead of pretending it was sent.
        throw new Error(`SMS was not sent: ${err.message}`);
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
