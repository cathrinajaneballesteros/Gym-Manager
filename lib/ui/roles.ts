import { GymRole } from '@/types/database';

/** Pages only the gym owner can open; staff are sent to STAFF_HOME instead. */
export const OWNER_ONLY_ROUTES = ['/dashboard', '/expenses', '/plans', '/reports', '/analytics', '/audit'];

export const STAFF_HOME = '/attendance';

export const canOpen = (role: GymRole | null, href: string): boolean =>
  role === 'owner' || !OWNER_ONLY_ROUTES.some((route) => href === route || href.startsWith(`${route}/`));
