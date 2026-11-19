// ใช้ฝั่งเซิร์ฟเวอร์เท่านั้น (import จาก route / instrumentation / lib ฝั่งเซิร์ฟเวอร์ — ห้าม import จาก component)
import { AsyncLocalStorage } from "node:async_hooks";
import { DB_HEADER, listDatabases, normalizeDbKey } from "@/lib/db-registry";

/**
 * ฝั่งเซิร์ฟเวอร์: "คำขอนี้ใช้ฐานไหน"
 * AsyncLocalStorage ส่งค่าไปตามทุก await / setTimeout ที่เกิดในคำขอเดียวกัน
 * LINE จากหอ A กับหอ B เข้ามาพร้อมกันก็ไม่ปนกัน (src/lib/db-registry.ts อ่านค่านี้ผ่าน globalThis)
 */
const g = globalThis as any;
const store: AsyncLocalStorage<string> = g.__pakdeeDbContext || (g.__pakdeeDbContext = new AsyncLocalStorage<string>());

/** รันงานโดยใช้ฐานที่ระบุ */
export function runWithDb<T>(dbKey: string, fn: () => T): T {
  return store.run(normalizeDbKey(dbKey), fn);
}

/** ฐานที่เบราว์เซอร์ขอมา (header x-pakdee-db) — ไม่มี/ไม่รู้จัก = main */
export function dbKeyFromRequest(req: Request): string {
  return normalizeDbKey(req?.headers?.get?.(DB_HEADER));
}

/** ห่อ route handler ให้ทำงานในฐานที่คำขอระบุ */
export function withRequestDb<A extends unknown[], R>(
  handler: (req: any, ...rest: A) => Promise<R>
): (req: any, ...rest: A) => Promise<R> {
  return (req: any, ...rest: A) => runWithDb(dbKeyFromRequest(req), () => handler(req, ...rest));
}

/** ทำงานเดิมซ้ำกับทุกฐาน (เช่น แจ้งเตือนอัตโนมัติ) */
export async function forEachDatabase(fn: (dbKey: string) => Promise<void>): Promise<void> {
  for (const db of listDatabases()) {
    await runWithDb(db.key, () => fn(db.key)).catch((e: any) =>
      console.warn(`[multi-db] งานของฐาน ${db.key} ล้มเหลว:`, e?.message)
    );
  }
}
