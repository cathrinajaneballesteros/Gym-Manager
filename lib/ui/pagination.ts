// Page numbers to show as buttons: up to `size` pages around the current one,
// e.g. page 7 of 10 -> [5, 6, 7, 8, 9].
export function getPageWindow(current: number, total: number, size = 5): number[] {
  const count = Math.min(size, total);
  const start = Math.min(Math.max(1, current - Math.floor(size / 2)), total - count + 1);
  return Array.from({ length: count }, (_, i) => start + i);
}
