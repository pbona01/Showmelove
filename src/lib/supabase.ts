import { createClient } from '@supabase/supabase-js';

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
export const supabaseUrl = env?.VITE_SUPABASE_URL?.trim() || '';
// Supabase renamed the browser-safe "anon" key to a publishable key. Support both
// names during the migration so existing Vercel projects do not break.
export const supabasePublishableKey =
  env?.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  env?.VITE_SUPABASE_ANON_KEY?.trim() ||
  '';

export const isSupabaseAuthConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = isSupabaseAuthConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

