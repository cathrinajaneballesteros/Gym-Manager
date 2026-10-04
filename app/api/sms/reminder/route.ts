import { NextResponse } from 'next/server';
import { SmsService } from '@/lib/sms/sms-service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, memberName, gymName, amount, planName, dueDate, customMessage } = body;

    if (!phone) {
      return NextResponse.json({ error: 'Recipient phone number is required' }, { status: 400 });
    }

    const result = await SmsService.sendReminderSMS({
      phone,
      memberName: memberName || 'Valued Member',
      gymName: gymName || 'IronPeak Fitness & Gym',
      amount: amount || '₱0.00',
      planName: planName || 'Gym Membership',
      dueDate: dueDate || new Date().toISOString().split('T')[0],
      customMessage,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error sending reminder SMS:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send payment reminder SMS' },
      { status: 500 }
    );
  }
}
