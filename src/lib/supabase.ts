import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Authoritative Supabase Cloud Project Configuration (qygelgekosmklwrgnaxq)
export const DEFAULT_SUPABASE_URL = "https://qygelgekosmklwrgnaxq.supabase.co";
export const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_S6JucHfTQV7ZdzjArXxlYA_ZONRk8DI";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  DEFAULT_SUPABASE_URL;

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  DEFAULT_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
