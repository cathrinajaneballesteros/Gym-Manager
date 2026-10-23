import { useLayoutEffect, useRef } from 'react';

/**
 * Keeps a paginated table's box at the height of its tallest page, so a short last page doesn't make the card
 * (and everything below it) jump when switching pages. Put the returned ref on the div that wraps the table.
 * Pass the search and filter values as resetKey (a new result set starts over) and the current page number.
 */
export function useSteadyHeight(resetKey: string, page: number) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Height of each page seen so far. The current page's entry is overwritten on every measurement, so a reading
  // taken before the font loaded (or before a resize) never sticks.
  const heights = useRef(new Map<number, number>());
  const current = useRef({ key: resetKey, page, width: 0 });

  // Runs after every render, before the browser paints, so nothing is seen at the wrong height.
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const table = wrapper?.querySelector('table');
    if (!wrapper || !table) return;
    if (current.current.key !== resetKey) heights.current.clear();
    current.current = { ...current.current, key: resetKey, page };

    const measure = () => {
      // Other pages' heights only hold at the width they were measured at.
      if (wrapper.clientWidth !== current.current.width) {
        heights.current.clear();
        current.current.width = wrapper.clientWidth;
      }
      heights.current.set(current.current.page, table.offsetHeight);
      wrapper.style.minHeight = `${Math.max(...heights.current.values())}px`;
    };
    measure();

    // Rows can change height without a re-render, e.g. when the web font finishes loading.
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(table);
    return () => observer.disconnect();
  });

  return wrapperRef;
}
