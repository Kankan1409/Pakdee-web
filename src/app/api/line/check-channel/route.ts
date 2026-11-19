import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/database.service";
import { branchOwnerKey } from "@/lib/branch-ownership";
import { branchLineSecret, branchLineToken } from "@/lib/line/branch-line-config";
import { dbKeyFromRequest, runWithDb } from "@/lib/db-context-server";
import { listDatabases } from "@/lib/db-registry";

export const runtime = "nodejs";

/**
 * ตรวจว่า LINE OA (Channel Secret / Access Token) นี้ถูกใช้กับสาขาของบัญชีอื่นอยู่แล้วหรือไม่
 *
 * OA หนึ่งตัวควรเป็นของบัญชีเดียว: ถ้าสองบัญชีใส่ OA เดียวกัน webhook จะจับข้อความเข้าสาขาของทั้งสองบัญชี
 * (ผู้เช่าลงทะเบียน/ส่งสลิปแล้วไปเจอบิลผิดหอ) — สาขาหลายสาขาของบัญชีเดียวกันใช้ OA เดียวกันได้
 *
 * ต้องตรวจฝั่งเซิร์ฟเวอร์ เพราะเบราว์เซอร์ของแต่ละบัญชีโหลดเฉพาะข้อมูลของตัวเอง
 * ตรวจทุกฐานข้อมูลที่ตั้งค่าไว้ — สาขาในฐานอื่นเป็นของบัญชีอื่นเสมอ (สาขาทั้งหมดของบัญชีหนึ่งอยู่ฐานเดียวกัน)
 * ตอบกลับแค่ว่าชนหรือไม่ — ไม่บอกว่าชนกับสาขา/บัญชีไหน
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const propertyId = String(body.propertyId || "").trim();
    const secret = String(body.channelSecret || "").trim();
    const token = String(body.channelAccessToken || "").trim();
    if (!propertyId || (!secret && !token)) {
      return NextResponse.json({ conflict: false });
    }

    const requestDb = dbKeyFromRequest(req);
    const sameChannel = (settings: any) =>
      Boolean((secret && branchLineSecret(settings) === secret) || (token && branchLineToken(settings) === token));

    for (const db of listDatabases()) {
      const conflict = await runWithDb(db.key, async () => {
        await DatabaseService.initCoreOnly();
        const branches = await DatabaseService.getAllProperties();
        const target = db.key === requestDb ? branches.find((b) => b.id === propertyId) : undefined;
        const targetOwner = branchOwnerKey(target);
        for (const other of branches) {
          if (db.key === requestDb && other.id === propertyId) continue;
          const settings = await DatabaseService.getBranchSettings(other, other.id);
          if (!sameChannel(settings)) continue;
          // ฐานเดียวกัน + เจ้าของเดียวกัน = สาขาอื่นของบัญชีเดียวกัน ใช้ OA ร่วมกันได้
          const sameAccount = db.key === requestDb && Boolean(targetOwner) && branchOwnerKey(other) === targetOwner;
          if (!sameAccount) return true;
        }
        return false;
      });
      if (conflict) return NextResponse.json({ conflict: true });
    }
    return NextResponse.json({ conflict: false });
  } catch (e: any) {
    console.warn("[LINE check-channel] error:", e?.message);
    // ตรวจไม่ได้ → ไม่บล็อกการบันทึก (หน้าเว็บแจ้งเตือนแทน)
    return NextResponse.json({ conflict: false, unchecked: true });
  }
}
