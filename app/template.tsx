'use client';

import React, { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DBService } from '@/lib/data/db-service';

export default function Template({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const supabase = createClient();

    const recordLoginOnce = async (email?: string) => {
      if (typeof window === 'undefined') return;
      if (sessionStorage.getItem('sgfm_login_logged') === 'true') return;
      sessionStorage.setItem('sgfm_login_logged', 'true');
      // Load first so the entry carries this owner's email and lands in their log.
      await DBService.load().catch(() => undefined);
      DBService.recordAudit({
        action: 'auth.login',
        entity_type: 'auth',
        entity_label: email || DBService.getProfile().email || 'Unknown user',
      });
    };

    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        sessionStorage.setItem('sgfm_authenticated', 'true');
        recordLoginOnce(session.user.email);
      }
    });

    // Listen to real-time auth events (OAuth sign in, token refresh, sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        sessionStorage.setItem('sgfm_authenticated', 'true');
        recordLoginOnce(session.user.email);
      } else if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem('sgfm_authenticated');
        sessionStorage.removeItem('sgfm_login_logged');
        DBService.clear();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
