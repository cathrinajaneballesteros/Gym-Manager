import { NextResponse } from 'next/server';
import { cleanText, requireGymMember } from '@/lib/supabase/require-user';
import { getManilaDateKey } from '@/lib/ui/date';
import { SmsService } from '@/lib/sms/sms-service';

export async function POST(req: Request) {
  const access = await requireGymMember('sms', 20, '1 hour');
  if (access.error) return access.error;
  const { supabase, gym } = access;

  try {
    const body = await req.json();
    const memberId = cleanText(body.memberId, 64);
    if (!memberId) {
      return NextResponse.json({ error: 'Choose a member to remind.' }, { status: 400 });
    }

    // Read through the signed-in client, so only this gym's members are found.
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('first_name, last_name, phone')
      .eq('id', memberId)
      .maybeSingle();
    if (memberError) {
      console.error('Member lookup failed:', memberError);
      return NextResponse.json({ error: 'Could not load the member. Please try again.' }, { status: 500 });
    }
    if (!member) {
      return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
    }
    if (!member.phone) {
      return NextResponse.json({ error: 'This member has no phone number on file.' }, { status: 400 });
    }

    const result = await SmsService.sendReminderSMS({
      phone: member.phone,
      memberName: `${member.first_name} ${member.last_name}`.trim() || 'Valued Member',
      gymName: gym.name,
      amount: cleanText(body.amount, 40) || `${gym.currency}0.00`,
      planName: cleanText(body.planName, 100) || 'Gym Membership',
      dueDate: cleanText(body.dueDate, 10) || getManilaDateKey(),
      customMessage: cleanText(body.customMessage, 300) || undefined,
      gymPhone: gym.phone || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error sending reminder SMS:', error);
    return NextResponse.json({ error: 'Failed to send the reminder SMS. Please try again.' }, { status: 500 });
  }
}
