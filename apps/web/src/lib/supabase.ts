import { createClient } from '@supabase/supabase-js';
import type { Database } from '@wewala/shared';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_KEY ||
  '';

export const isConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl.startsWith('http') &&
  supabaseAnonKey &&
  supabaseAnonKey !== 'your-anon-key-here' &&
  supabaseAnonKey !== 'placeholder'
);

if (!isConfigured) {
  console.warn(
    '[Wewala] Missing or unconfigured VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.\n' +
    'Please verify your .env file in apps/web/.env. Supported key variables:\n' +
    '  - VITE_SUPABASE_ANON_KEY\n' +
    '  - VITE_SUPABASE_PUBLISHABLE_KEY\n'
  );
}

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey || 'dummy-anon-key-placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export type SupabaseClient = typeof supabase;
