import { NextResponse } from 'next/server';
import { ResendService } from '@/lib/email/resend-service';

export async function POST(req: Request) {
  try {
    if (!ResendService.isConfigured()) {
      return NextResponse.json(
        { error: 'Resend API key is not configured in .env.local', isConfigured: false },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { to, memberName, gymName, amount, planName, date, refNumber } = body;

    if (!to) {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
    }

    const result = await ResendService.sendPaymentReceipt({
      to,
      memberName: memberName || 'Valued Member',
      gymName: gymName || 'IronPeak Fitness & Gym',
      amount: amount || '₱0.00',
      planName: planName || 'Gym Membership',
      date: date || new Date().toISOString().split('T')[0],
      refNumber,
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Error sending receipt email via Resend:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send receipt email' },
      { status: 500 }
    );
  }
}
