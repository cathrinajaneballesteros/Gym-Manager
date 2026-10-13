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

export interface RouteGym {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  email: string | null;
  currency: string;
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export type GymMemberResult =
  | { error: NextResponse }
  | { error: null; supabase: SupabaseServer; userId: string; role: 'owner' | 'staff'; gym: RouteGym };

/**
 * For API routes that spend money: the caller must be signed in and on a gym's team, and still
 * within `max` uses of `kind` per `window` (a Postgres interval like '1 hour').
 * Gym details come from the database, never from the request, so a caller can't send as another gym.
 */
export async function requireGymMember(kind: string, max: number, window: string): Promise<GymMemberResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Please sign in again.' }, { status: 401 }) };
  }

  const { data: staff } = await supabase
    .from('gym_staff')
    .select('role, gym:gyms(id, name, phone, address, email, currency)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();
  const gym = (staff?.gym ?? null) as RouteGym | null;
  if (!staff || !gym) {
    return { error: NextResponse.json({ error: 'Finish setting up your gym first.' }, { status: 403 }) };
  }

  const { data: allowed, error } = await supabase.rpc('take_api_quota', {
    p_kind: kind,
    p_max: max,
    p_window: window,
  });
  if (error) {
    console.error('Rate limit check failed:', error);
    return { error: NextResponse.json({ error: 'Could not check your usage. Please try again.' }, { status: 500 }) };
  }
  if (!allowed) {
    return {
      error: NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 }),
    };
  }

  return { error: null, supabase, userId: user.id, role: staff.role as 'owner' | 'staff', gym };
}

/** Trims a value from a request body to a string of at most `max` characters. */
export function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
