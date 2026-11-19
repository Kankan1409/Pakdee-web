/**
 * หลายฐานข้อมูล (Supabase หลาย project) ในเว็บเดียว
 *
 * - ฐานหลัก "main" = ค่าใน NEXT_PUBLIC_SUPABASE_URL / ANON_KEY เดิม — เก็บบัญชีผู้ใช้ (user_profiles) ของทุกคน
 *   และข้อมูลหอของบัญชีที่ไม่ได้ระบุฐาน
 * - ฐานเพิ่มเติม ตั้งใน .env:
 *     NEXT_PUBLIC_EXTRA_DATABASES=[{"key":"db2","url":"https://xxxx.supabase.co","anonKey":"..."}]
 *     SUPABASE_EXTRA_SERVICE_KEYS={"db2":"<service_role key ของ db2>"}     (ฝั่งเซิร์ฟเวอร์เท่านั้น)
 * - บัญชีไหนใช้ฐานไหน = user_profiles.data_db ในฐานหลัก (ว่าง = main) — docs/supabase_multi_database.sql
 *
 * ฐานที่ใช้ตอนนี้:
 * - เบราว์เซอร์: ตามบัญชีที่ล็อกอิน (dataDb ใน session)
 * - เซิร์ฟเวอร์: ตามคำขอที่กำลังทำงาน (src/lib/db-context-server.ts — header x-pakdee-db / LINE webhook หาเอง)
 */

export interface DbConfig {
  key: string;
  url: string;
  anonKey: string;
}

export const MAIN_DB_KEY = "main";
export const DB_HEADER = "x-pakdee-db";

const DEFAULT_SUPABASE_URL = "https://qygelgekosmklwrgnaxq.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_S6JucHfTQV7ZdzjArXxlYA_ZONRk8DI";

function mainConfig(): DbConfig {
  return {
    key: MAIN_DB_KEY,
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL,
    anonKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      DEFAULT_SUPABASE_ANON_KEY,
  };
}

let extraCache: DbConfig[] | null = null;
function extraConfigs(): DbConfig[] {
  if (extraCache) return extraCache;
  const list: DbConfig[] = [];
  try {
    // ต้องอ้างชื่อตัวแปรตรง ๆ Next.js ถึงจะฝังค่าไปที่เบราว์เซอร์
    const raw = process.env.NEXT_PUBLIC_EXTRA_DATABASES || "";
    const parsed = raw.trim() ? JSON.parse(raw) : [];
    for (const item of Array.isArray(parsed) ? parsed : []) {
      const key = String(item?.key || "").trim();
      const url = String(item?.url || "").trim();
      const anonKey = String(item?.anonKey || "").trim();
      if (!key || key === MAIN_DB_KEY || !/^[a-z0-9_-]{1,32}$/i.test(key) || !url || !anonKey) continue;
      if (list.some((d) => d.key === key)) continue;
      list.push({ key, url, anonKey });
    }
  } catch (e: any) {
    console.warn("[db-registry] NEXT_PUBLIC_EXTRA_DATABASES อ่านไม่ได้ (ต้องเป็น JSON array):", e?.message);
  }
  extraCache = list;
  return list;
}

/** ฐานทั้งหมดที่ตั้งค่าไว้ (main ก่อนเสมอ) */
export function listDatabases(): DbConfig[] {
  return [mainConfig(), ...extraConfigs()];
}

/** รหัสฐานที่รู้จัก — ค่าว่าง/ไม่รู้จัก = main */
export function normalizeDbKey(key: unknown): string {
  const k = String(key || "").trim();
  if (!k) return MAIN_DB_KEY;
  return listDatabases().some((d) => d.key === k) ? k : MAIN_DB_KEY;
}

export function getDbConfig(key: unknown): DbConfig {
  const k = normalizeDbKey(key);
  return listDatabases().find((d) => d.key === k) || mainConfig();
}

/** service role key ของฐาน (ฝั่งเซิร์ฟเวอร์เท่านั้น) */
export function serviceKeyFor(key: unknown): string {
  const k = normalizeDbKey(key);
  if (k === MAIN_DB_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  try {
    const map = JSON.parse(process.env.SUPABASE_EXTRA_SERVICE_KEYS || "{}");
    return String(map?.[k] || "");
  } catch {
    return "";
  }
}

type DbStore = { getStore(): string | undefined };

/** ฐานที่ใช้อยู่ตอนนี้ */
export function currentDbKey(): string {
  if (typeof window === "undefined") {
    const store = (globalThis as any).__pakdeeDbContext as DbStore | undefined;
    return normalizeDbKey(store?.getStore());
  }
  try {
    const raw = localStorage.getItem("pakdee_auth_session_v1");
    const user = raw ? JSON.parse(raw) : null;
    return normalizeDbKey(user?.dataDb);
  } catch {
    return MAIN_DB_KEY;
  }
}
