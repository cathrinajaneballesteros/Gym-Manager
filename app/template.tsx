'use client';

import React, { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DBService } from '@/lib/data/db-service';

export default function Template({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const supabase = createClient();

    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        sessionStorage.setItem('sgfm_authenticated', 'true');
        const meta = session.user.user_metadata || {};
        const profile = DBService.getProfile();
        DBService.updateProfile({
          id: session.user.id,
          email: session.user.email || profile.email,
          full_name: meta.full_name || meta.name || profile.full_name || 'Gym Administrator',
          gym_name: meta.gym_name || profile.gym_name || 'My Fitness Gym',
          currency: profile.currency || '₱',
        });
      }
    });

    // Listen to real-time auth events (OAuth sign in, token refresh, sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          sessionStorage.setItem('sgfm_authenticated', 'true');
          const meta = session.user.user_metadata || {};
          const profile = DBService.getProfile();
          DBService.updateProfile({
            id: session.user.id,
            email: session.user.email || profile.email,
            full_name: meta.full_name || meta.name || profile.full_name || 'Gym Administrator',
            gym_name: meta.gym_name || profile.gym_name || 'My Fitness Gym',
            currency: profile.currency || '₱',
          });
        }
      } else if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem('sgfm_authenticated');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}

