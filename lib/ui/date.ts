// Returns a human-readable label for the current calendar month,
// e.g. "Oct 1, 2026 - Oct 31, 2026".
export function getCurrentMonthRangeLabel(): string {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${first.toLocaleDateString('en-US', opts)} - ${last.toLocaleDateString('en-US', opts)}`;
}
