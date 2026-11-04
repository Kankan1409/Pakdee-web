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

// Resilient fetch wrapper: enforces a 3.5s timeout and strips Cloudflare 522 HTML pages
const resilientFetch: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch(input, {
      ...init,
      signal: init?.signal || controller.signal,
    });
    const contentType = res.headers.get("content-type") || "";
    if (!res.ok && contentType.includes("text/html")) {
      return new Response(
        JSON.stringify({
          message: `Supabase Cloud temporarily unavailable (HTTP ${res.status})`,
          code: String(res.status),
        }),
        {
          status: res.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    return res;
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        message: err?.name === "AbortError" ? "Supabase Cloud request timeout (3.5s)" : "Supabase Cloud network error",
        code: "TIMEOUT",
      }),
      {
        status: 504,
        headers: { "Content-Type": "application/json" },
      }
    );
  } finally {
    clearTimeout(timeoutId);
  }
};

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: resilientFetch,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
