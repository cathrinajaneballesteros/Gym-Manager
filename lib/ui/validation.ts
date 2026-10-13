import * as z from 'zod';
import { getTodayKey } from '@/lib/ui/date';

// Amounts are stored as NUMERIC(10, 2), so anything bigger is rejected by the database.
export const MAX_AMOUNT = 99_999_999.99;

/** Why `value` can't be saved as a money amount, or null when it's fine. Empty, 0 and negatives are rejected. */
export function amountProblem(value: string | number): string | null {
  const text = String(value).trim();
  const amount = Number(text);
  if (text === '' || !Number.isFinite(amount)) return 'Enter an amount.';
  if (amount <= 0) return 'Enter an amount greater than 0.';
  if (amount > MAX_AMOUNT) return `The amount can be at most ${MAX_AMOUNT.toLocaleString()}.`;
  return null;
}

/** A form amount: an empty input reads as NaN, which gets a plain message instead of zod's default. */
export const amountField = (label: string) =>
  z
    .number({ error: `Enter the ${label.toLowerCase()}` })
    .positive(`${label} must be greater than 0`)
    .max(MAX_AMOUNT, `${label} can be at most ${MAX_AMOUNT.toLocaleString()}`);

/** A YYYY-MM-DD date that is today or earlier. */
export const pastDateField = (label: string) =>
  z
    .string()
    .min(10, `${label} is required`)
    .refine((d) => d <= getTodayKey(), `${label} can't be in the future`);

/** Why a walk-in price can't be saved, or null. Blank (no walk-ins) and 0 are allowed. */
export function walkInPriceProblem(price: number | null | undefined): string | null {
  if (price == null) return null;
  if (!Number.isFinite(price) || price < 0) return 'The walk-in price must be 0 or more.';
  if (price > MAX_AMOUNT) return `The walk-in price can be at most ${MAX_AMOUNT.toLocaleString()}.`;
  return null;
}
