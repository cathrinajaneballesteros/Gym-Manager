'use client';

import { useEffect, useRef } from 'react';

/** Runs `reload` whenever the gym's data is refreshed in the background (e.g. staff saved something on another device). */
export function useGymDataRefresh(reload: () => void): void {
  const latest = useRef(reload);
  useEffect(() => {
    latest.current = reload;
  });
  useEffect(() => {
    const handle = () => latest.current();
    window.addEventListener('sgfm_data_updated', handle);
    return () => window.removeEventListener('sgfm_data_updated', handle);
  }, []);
}
