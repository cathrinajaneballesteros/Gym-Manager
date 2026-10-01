import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

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
          { onConflict: 'id' }
        );
      } catch (upsertErr) {
        console.warn('Profile sync in callback note:', upsertErr);
      }

      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Redirect to login if code exchange failed
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
