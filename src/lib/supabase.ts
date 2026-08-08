import { createClient } from '@supabase/supabase-js';

const fallbackUrl = 'https://asmnqlqvlpcwcaaughuu.supabase.co';
const fallbackKey = 'sb_publishable_9_iPPYEKpklE07sQ1dmBow_wecQPqqZ';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fallbackUrl;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || fallbackKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
