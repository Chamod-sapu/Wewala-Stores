// Supabase Client for Wewala Stores Desktop Admin & POS
// STRICT SECURITY REQUIREMENT: Uses anon key only, NEVER service_role.

import { createStoreSupabaseClient, TypedSupabaseClient } from '@wewala/shared';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_KEY ||
  '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Desktop Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) in environment. Set these in your .env file.'
  );
}

export const isConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseAnonKey !== 'your-anon-key-here' &&
  supabaseAnonKey !== 'placeholder'
);

export const supabase: TypedSupabaseClient = createStoreSupabaseClient(
  supabaseUrl || 'http://127.0.0.1:54321',
  supabaseAnonKey || 'dummy-anon-key-placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);
