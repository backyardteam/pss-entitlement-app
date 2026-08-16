import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Client untuk user (dengan RLS) - HANYA ini yang dipakai di client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
