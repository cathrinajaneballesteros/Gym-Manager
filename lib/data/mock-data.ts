import { UserProfile } from '@/types/database';

// Shown until the signed-in owner's profile has loaded. Demo plans and expenses live in supabase/seed.sql.
export const INITIAL_PROFILE: UserProfile = {
  id: '',
  email: '',
  full_name: 'Gym Administrator',
  role: 'admin',
  gym_name: 'My Fitness Gym',
  currency: '₱',
  phone: '',
  created_at: new Date().toISOString(),
};
