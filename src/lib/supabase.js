import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

function isElevatedKey(key) {
  if (!key) return false;
  if (key.startsWith('sb_secret_')) return true;
  try {
    const payload = JSON.parse(globalThis.atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.role === 'service_role';
  } catch {
    return false;
  }
}

const hasSafeClientKey = Boolean(supabasePublishableKey && !isElevatedKey(supabasePublishableKey));
export const isSupabaseConfigured = Boolean(supabaseUrl && hasSafeClientKey);

if (supabasePublishableKey && !hasSafeClientKey) {
  console.error('Se rechazo una clave privilegiada de Supabase en el cliente. Usa una publishable key.');
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
