import { GymDetails, OpeningHours, WEEK_DAYS } from '@/types/database';

/** Mon–Sat 6:00–22:00, closed Sunday. */
export const DEFAULT_OPENING_HOURS: OpeningHours = Object.fromEntries(
  WEEK_DAYS.map(({ key }) => [key, { open: '06:00', close: '22:00', closed: key === 'sun' }])
) as OpeningHours;

export const emptyGymDetails = (): GymDetails => ({
  name: '',
  address: '',
  city: '',
  phone: '',
  email: '',
  // The app is for Philippine gyms only.
  currency: '₱',
  opening_hours: DEFAULT_OPENING_HOURS,
});

/** Days where the gym opens at or after it closes; overnight hours aren't supported. */
export const invalidHourDays = (hours: OpeningHours): string[] =>
  WEEK_DAYS.filter(({ key }) => !hours[key].closed && hours[key].open >= hours[key].close).map((d) => d.label);
