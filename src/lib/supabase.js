import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://asmnqlqvlpcwcaaughuu.supabase.co';
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_9_iPPYEKpklE07sQ1dmBow_wecQPqqZ';
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
