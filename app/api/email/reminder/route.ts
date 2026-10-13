import { NextResponse } from 'next/server';
import { requireSignedIn } from '@/lib/supabase/require-user';
import { ResendService } from '@/lib/email/resend-service';

export async function POST(req: Request) {
  const unauthorized = await requireSignedIn();
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    const { to, memberName, gymName, amount, planName, dueDate, customNote } = body;

    if (!to) {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
    }

    if (!ResendService.isConfigured()) {
      // Return simulated success with note if key is not configured,
      // so testing remains frictionless while flagging simulated status
      return NextResponse.json({
        success: true,
        simulated: true,
        message: 'Resend API key not configured in .env.local — Reminder email logged and simulated successfully.',
        details: { to, memberName, amount, dueDate, planName },
      });
    }

    const result = await ResendService.sendPaymentReminder({
      to,
      memberName: memberName || 'Valued Member',
      gymName: gymName || 'IronPeak Fitness & Gym',
      amount: amount || '₱0.00',
      planName: planName || 'Gym Membership',
      dueDate: dueDate || new Date().toISOString().split('T')[0],
      customNote,
    });

    return NextResponse.json({ success: true, simulated: false, result });
  } catch (error: any) {
    console.error('Error sending reminder email via Resend:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send payment reminder email' },
      { status: 500 }
    );
  }
}
