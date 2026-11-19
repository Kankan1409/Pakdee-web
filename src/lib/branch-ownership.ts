/**
 * ความเป็นเจ้าของข้อมูลตามบัญชี
 *
 * โครงสร้าง: บัญชี (user_profiles.id) → สาขา (properties.owner_id) → ข้อมูลทุกตาราง (property_id)
 * ทุกตาราง (ห้อง ผู้เช่า สัญญา บิล มิเตอร์ แจ้งซ่อม ค่าใช้จ่าย การจองรายวัน log) ผูกกับสาขาด้วย property_id
 * และสาขาผูกกับบัญชีด้วย owner_id จุดเดียว — จึงไม่ต้องมี owner_id ซ้ำในทุกตาราง (ไม่มีทางขัดกันเอง)
 */

export interface SessionUserLike {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
}

/** รหัสบัญชีตัวอย่างเดิม (ลบไปแล้ว) — สาขาที่ผูกกับรหัสเหล่านี้ถือว่า "ยังไม่มีเจ้าของ" */
const LEGACY_DEMO_OWNER_IDS = new Set(["usr-owner-01", "usr-mgr-01"]);
const digitsOf = (v?: string) => String(v || "").replace(/\D/g, "");

/** บัญชีที่ล็อกอินอยู่ในเบราว์เซอร์นี้ (ฝั่งเซิร์ฟเวอร์ = null) */
export function getSessionUser(): SessionUserLike | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("pakdee_auth_session_v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.id) return parsed;
  } catch {}
  return null;
}

function realOwnerIdOf(p: { ownerId?: string } | null | undefined): string {
  const id = String(p?.ownerId || "").trim();
  return id && !LEGACY_DEMO_OWNER_IDS.has(id) ? id : "";
}

/**
 * บัญชีนี้เป็นเจ้าของสาขานี้หรือไม่
 * - มี owner_id → ต้องตรงกับรหัสบัญชีเท่านั้น
 * - ไม่มี owner_id (ข้อมูลเก่า) → owner_phone (เบอร์บัญชีที่สร้างสาขา) ต้องตรงกับเบอร์บัญชี
 * ไม่ใช้เบอร์ติดต่อของสาขา (properties.phone) เพราะเป็นเบอร์หอพัก ไม่ใช่เบอร์บัญชี
 */
export function userOwnsBranch(p: any, user: SessionUserLike | null): boolean {
  if (!user?.id) return false;
  const ownerId = realOwnerIdOf(p);
  if (ownerId) return ownerId === user.id;
  const userPhone = digitsOf(user.phone);
  return userPhone.length >= 9 && digitsOf(p?.ownerPhone) === userPhone;
}

/** รหัสระบุเจ้าของสาขา ใช้เทียบว่าสองสาขาเป็นของบัญชีเดียวกันไหม ("" = ไม่รู้เจ้าของ) */
export function branchOwnerKey(p: any): string {
  const ownerId = realOwnerIdOf(p);
  if (ownerId) return `id:${ownerId}`;
  const phone = digitsOf(p?.ownerPhone);
  return phone.length >= 9 ? `phone:${phone}` : "";
}

/** สาขาเก่าที่ไม่มีทั้ง owner_id และ owner_phone — ยังไม่รู้ว่าเป็นของบัญชีไหน (รอกด "เป็นสาขาของฉัน") */
export function isUnclaimedBranch(p: any): boolean {
  return !realOwnerIdOf(p) && digitsOf(p?.ownerPhone).length < 9;
}

/**
 * รหัสสาขาที่บัญชีนี้โหลดข้อมูลได้ = สาขาของตัวเอง + สาขาเก่าที่ยังไม่มีเจ้าของ (ให้กดรับเป็นของตัวเองได้)
 * ใช้ทั้งตอนโหลดข้อมูลและเป็นขอบเขตตอนลบแถวใน Supabase (ไม่แตะข้อมูลของบัญชีอื่นเด็ดขาด)
 */
export function accountBranchIds(properties: any[], user: SessionUserLike | null): Set<string> {
  const ids = new Set<string>();
  for (const p of properties || []) {
    if (p?.id && (userOwnsBranch(p, user) || isUnclaimedBranch(p))) ids.add(String(p.id));
  }
  return ids;
}
