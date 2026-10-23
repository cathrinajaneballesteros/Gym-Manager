import { DBService } from '@/lib/data/db-service';

/** Signs the current user out (logged in the audit trail) and clears the cached gym data. Shared by the sidebar and the header menu. */
export async function signOut(email: string | undefined): Promise<void> {
  DBService.recordAudit({
    action: 'auth.logout',
    entity_type: 'auth',
    entity_label: email || 'Unknown user',
  });
  try {
    await DBService.flushAudit();
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch {
    // Ignore
  }
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('sgfm_authenticated');
  }
  DBService.clear();
}
