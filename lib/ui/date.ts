// Formats a Date as YYYY-MM-DD in the user's local time.
// (toISOString() uses UTC, which is still "yesterday" before 8 AM in the Philippines.)
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Adds whole months to a YYYY-MM-DD date, e.g. a membership's start date plus its plan length.
// Month ends are clamped: Jan 31 + 1 month is Feb 28, not Mar 3.
export function addMonthsToDateKey(startDateStr: string, durationMonths: number): string {
  if (!startDateStr || !durationMonths) return '';
  const parts = startDateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return '';
  const [year, month, day] = parts;
  const target = new Date(year, month - 1 + durationMonths, day);
  if (target.getDate() !== day) {
    target.setDate(0);
  }
  return toDateKey(target);
}

// The last `count` months as YYYY-MM keys, oldest first, ending with the current month (local time).
export function getRecentMonthKeys(count: number): string[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}

// Today's date as YYYY-MM-DD in the user's local time.
export function getTodayKey(): string {
  return toDateKey(new Date());
}

// Returns a human-readable label for the current calendar month,
// e.g. "Oct 1, 2026 - Oct 31, 2026".
export function getCurrentMonthRangeLabel(): string {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${first.toLocaleDateString('en-US', opts)} - ${last.toLocaleDateString('en-US', opts)}`;
}

// Short "how long ago" label for a timestamp, e.g. "Just now", "5m ago",
// "3h ago", "2d ago", or the date for anything older than a week.
export function formatTimeAgo(iso: string): string {
  const then = new Date(iso);
  if (isNaN(then.getTime())) return '';
  const minutes = Math.floor((Date.now() - then.getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Formats a stored date for display, e.g. "Oct 12, 2026".
// Plain YYYY-MM-DD dates are read as local dates; new Date('2026-10-12') would
// read them as UTC midnight and show the day before in timezones behind UTC.
export function formatDisplayDate(value: string): string {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
