'use client';

import React, { useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { DBService } from '@/lib/data/db-service';

export default function Template({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const supabase = createClient();

    // Log each real sign-in once. last_sign_in_at only changes on an actual sign-in,
    // so opening a new tab or reopening the browser with a saved session isn't logged again.
    const recordLoginOnce = async (user: User) => {
      if (typeof window === 'undefined') return;
      const key = `${user.id}:${user.last_sign_in_at ?? ''}`;
      try {
        if (localStorage.getItem('sgfm_login_logged') === key) return;
        localStorage.setItem('sgfm_login_logged', key);
      } catch {
        return;
      }
      // Load first so the entry carries this owner's email and lands in their log.
      await DBService.load().catch(() => undefined);
      DBService.recordAudit({
        action: 'auth.login',
        entity_type: 'auth',
        entity_label: user.email || DBService.getProfile().email || 'Unknown user',
      });
    };

    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        sessionStorage.setItem('sgfm_authenticated', 'true');
        recordLoginOnce(session.user);
      }
    });

    // Listen to real-time auth events (OAuth sign in, token refresh, sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        sessionStorage.setItem('sgfm_authenticated', 'true');
        recordLoginOnce(session.user);
      } else if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem('sgfm_authenticated');
        DBService.clear();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
