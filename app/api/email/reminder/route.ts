import { NextResponse } from 'next/server';
import { cleanText, requireGymMember } from '@/lib/supabase/require-user';
import { EmailService } from '@/lib/email/email-service';

export async function POST(req: Request) {
  const access = await requireGymMember('email', 20, '1 hour');
  if (access.error) return access.error;
  const { supabase, gym } = access;

  try {
    const body = await req.json();
    const memberId = cleanText(body.memberId, 64);
    if (!memberId) {
      return NextResponse.json({ error: 'Choose a member to remind.' }, { status: 400 });
    }

    // Read through the signed-in client, so only this gym's members are found.
    const { data: member } = await supabase
      .from('members')
      .select('first_name, last_name, email')
      .eq('id', memberId)
      .maybeSingle();
    if (!member) {
      return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
    }
    if (!member.email) {
      return NextResponse.json({ error: 'This member has no email address on file.' }, { status: 400 });
    }

    const memberName = `${member.first_name} ${member.last_name}`.trim() || 'Valued Member';
    const amount = cleanText(body.amount, 40) || `${gym.currency}0.00`;
    const planName = cleanText(body.planName, 100) || 'Gym Membership';
    const dueDate = cleanText(body.dueDate, 10) || new Date().toISOString().split('T')[0];

    if (!EmailService.isConfigured()) {
      // Return simulated success with note if key is not configured,
      // so testing remains frictionless while flagging simulated status
      return NextResponse.json({
        success: true,
        simulated: true,
        message: 'Brevo API key or sender email not configured in .env.local — Reminder email logged and simulated successfully.',
        details: { to: member.email, memberName, amount, dueDate, planName },
      });
    }

    const result = await EmailService.sendPaymentReminder({
      to: member.email,
      memberName,
      gymName: gym.name,
      amount,
      planName,
      dueDate,
      customNote: cleanText(body.customNote, 300) || undefined,
      gymPhone: gym.phone || undefined,
      gymAddress: gym.address || undefined,
      gymEmail: gym.email || undefined,
    });

    return NextResponse.json({ success: true, simulated: false, result });
  } catch (error) {
    console.error('Error sending reminder email via Brevo:', error);
    return NextResponse.json({ error: 'Failed to send the reminder email. Please try again.' }, { status: 500 });
  }
}
