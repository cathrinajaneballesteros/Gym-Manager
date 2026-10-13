import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * For API routes: returns a 401 response when nobody is signed in, or null to carry on.
 * The proxy only guards pages, so routes that spend money (SMS, email, AI) must check for themselves.
 */
export async function requireSignedIn(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return null;
  return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
}
