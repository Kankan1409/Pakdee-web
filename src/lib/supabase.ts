import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { DB_HEADER, MAIN_DB_KEY, currentDbKey, getDbConfig } from "@/lib/db-registry";

// Authoritative Supabase Cloud Project Configuration (qygelgekosmklwrgnaxq) — ฐานหลัก
export const DEFAULT_SUPABASE_URL = "https://qygelgekosmklwrgnaxq.supabase.co";
export const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_S6JucHfTQV7ZdzjArXxlYA_ZONRk8DI";

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

// หนึ่ง client ต่อหนึ่งฐาน (สร้างครั้งแรกที่ใช้ แล้วใช้ซ้ำ)
const clients = new Map<string, SupabaseClient>();

/** client ของฐานที่ระบุ */
export function getSupabaseClient(dbKey: string): SupabaseClient {
  const cfg = getDbConfig(dbKey);
  let client = clients.get(cfg.key);
  if (!client) {
    client = createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // แยกที่เก็บ session ของแต่ละฐาน (ไม่งั้น client หลายตัวในเบราว์เซอร์เดียวกันชนกัน)
        storageKey: `sb-pakdee-${cfg.key}-auth`,
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
    clients.set(cfg.key, client);
  }
  return client;
}

/** ฐานหลัก: บัญชีผู้ใช้ (user_profiles) ของทุกคนอยู่ที่นี่เสมอ */
export const supabaseMain: SupabaseClient = getSupabaseClient(MAIN_DB_KEY);

/**
 * ฐานข้อมูลหอของ "บัญชี/คำขอปัจจุบัน" — ใช้แบบเดิมได้เลย (supabase.from("rooms")...)
 * เบราว์เซอร์: ตามบัญชีที่ล็อกอิน · เซิร์ฟเวอร์: ตามคำขอที่กำลังทำงาน
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient(currentDbKey());
    const value = (client as any)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

// เบราว์เซอร์: แนบรหัสฐานไปกับทุกคำขอ /api/... ของเว็บเราเอง เซิร์ฟเวอร์จะได้ใช้ฐานเดียวกับบัญชีที่ล็อกอิน
if (typeof window !== "undefined" && !(window as any).__pakdeeDbFetchPatched) {
  (window as any).__pakdeeDbFetchPatched = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
      const target = new URL(url, window.location.href);
      if (target.origin === window.location.origin && target.pathname.startsWith("/api/")) {
        const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
        if (!headers.has(DB_HEADER)) headers.set(DB_HEADER, currentDbKey());
        return originalFetch(input, { ...init, headers });
      }
    } catch {}
    return originalFetch(input, init);
  };
}
