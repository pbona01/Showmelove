import type { SupabaseClient } from '@supabase/supabase-js';

export type AppRole = 'user' | 'admin' | 'super_admin';

/**
 * Roles are read from Supabase after a normal account sign-in. There are no
 * browser passwords, hard-coded emails, or localStorage role overrides.
 */
export async function getAdminRoleForUser(
  client: SupabaseClient,
  userId: string,
): Promise<AppRole> {
  const { data, error } = await client
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return 'user';
  return data.role === 'super_admin' || data.role === 'admin' ? data.role : 'user';
}

export function isAdminRole(role: AppRole): boolean {
  return role === 'admin' || role === 'super_admin';
}
