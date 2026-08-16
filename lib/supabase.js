import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

// Client untuk user (dengan RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client untuk admin (bypass RLS) - HANYA UNTUK SERVER SIDE!
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
