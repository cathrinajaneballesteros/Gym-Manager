import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // Only allow paths on this site. Values like "@evil.com" or "//evil.com"
  // would otherwise send the user to another website after login.
  const nextParam = searchParams.get('next');
  const next = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') && !nextParam.startsWith('/\\')
    ? nextParam
    : '/dashboard';

  const forwardedHost = request.headers.get('x-forwarded-host');
  const isLocalEnv = process.env.NODE_ENV === 'development';
  const siteOrigin = !isLocalEnv && forwardedHost ? `https://${forwardedHost}` : origin;

  let failure = 'No sign-in code was received.';
  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      // Upsert profile in Supabase table
      try {
        const metadata = data.user.user_metadata || {};
        const fullName = metadata.full_name || metadata.name || 'Gym Administrator';
        const gymName = metadata.gym_name || 'My Fitness Gym';

        await supabase.from('profiles').upsert(
          {
            id: data.user.id,
            email: data.user.email || '',
            full_name: fullName,
            gym_name: gymName,
            currency: '₱',
            role: 'admin',
          },
          // Only fills in a missing profile; never overwrites the gym name or details saved in Settings.
          { onConflict: 'id', ignoreDuplicates: true }
        );
      } catch (upsertErr) {
        console.warn('Profile sync in callback note:', upsertErr);
      }

      return NextResponse.redirect(`${siteOrigin}${next}`);
    }

    // The code may already have been used (e.g. the link was opened twice); if that signed them in, carry on.
    const { data: existing } = await supabase.auth.getUser();
    if (existing.user) {
      return NextResponse.redirect(`${siteOrigin}${next}`);
    }
    // Opened on another device or browser than the one that asked for the link. A signup link has already
    // confirmed the email by now, so that just needs a normal sign-in; a reset link has to be opened where it was requested.
    if (error?.code === 'pkce_code_verifier_not_found') {
      const notice = next === '/reset-password' ? 'reset_other_device' : 'email_confirmed';
      return NextResponse.redirect(`${siteOrigin}/login?mode=signin&notice=${notice}`);
    }
    failure = error?.message || 'Sign-in could not be completed.';
    console.error('Auth callback failed:', failure);
  }

  return NextResponse.redirect(
    `${siteOrigin}/login?mode=signin&error=auth_callback_failed&reason=${encodeURIComponent(failure)}`
  );
}
