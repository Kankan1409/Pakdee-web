import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual, createHash } from "node:crypto";
import { toUuid } from "@/lib/supabase-relational";
import { validateImageSignature } from "@/lib/slip-verification";

export class SlipError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function slipDatabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!key || !url) throw new SlipError("ยังไม่ได้ตั้งค่าการเชื่อมต่อฐานข้อมูลสลิปฝั่งเซิร์ฟเวอร์", 503);
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Validate the existing account credentials on the server. Never trust client roles.
export async function authorizeSlipRequest(request: Request, propertyId: string) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Basic ")) throw new SlipError("กรุณาเข้าสู่ระบบใหม่", 401);
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const split = decoded.indexOf(":");
  const userId = decoded.slice(0, split);
  const password = decoded.slice(split + 1);
  if (split < 1 || !password || !propertyId) throw new SlipError("ข้อมูลเข้าสู่ระบบไม่ถูกต้อง", 401);
  const db = slipDatabase();
  const { data: user, error } = await db.from("user_profiles")
    .select("id,phone,role,is_active,assigned_branch_ids").eq("id", userId).maybeSingle();
  if (error) throw new SlipError("ตรวจสอบบัญชีไม่สำเร็จ", 503);
  const tags: string[] = Array.isArray(user?.assigned_branch_ids) ? user.assigned_branch_ids : [];
  const expected = tags.find(tag => tag.startsWith("pwd:"))?.slice(4);
  const actualBytes = Buffer.from(password);
  const expectedBytes = Buffer.from(expected || "");
  if (!user?.is_active || !expected || actualBytes.length !== expectedBytes.length ||
      !timingSafeEqual(actualBytes, expectedBytes)) throw new SlipError("บัญชีหรือรหัสผ่านไม่ถูกต้อง", 401);

  const { data: rows, error: propertyError } = await db.from("pakdee_store")
    .select("key,value,updated_at").in("key", ["pakdee_dev_properties", "properties"])
    .order("updated_at", { ascending: false });
  if (propertyError) throw new SlipError("ตรวจสอบสิทธิ์สาขาไม่สำเร็จ", 503);
  const properties = Array.isArray(rows?.[0]?.value) ? rows![0].value : [];
  const property = properties.find((p: { id: string }) => p.id === propertyId);
  const normalizePhone = (v: string) => String(v || "").replace(/\D/g, "");
  const owned = property && user.role === "owner" && (
    property.ownerId === user.id ||
    (normalizePhone(user.phone).length >= 9 && normalizePhone(property.ownerPhone) === normalizePhone(user.phone))
  );
  const assigned = property && user.role === "manager" &&
    (tags.includes(propertyId) || tags.includes(toUuid(propertyId)));
  if (!owned && !assigned) throw new SlipError("ไม่มีสิทธิ์เข้าถึงสลิปของสาขานี้", 403);
  return { db, propertyUuid: toUuid(propertyId) };
}

export function decodeSlipImage(value: string): Buffer {
  if (typeof value !== "string" || !/^\\x(?:[0-9a-f]{2})+$/i.test(value)) {
    throw new SlipError("ข้อมูลรูปสลิปไม่สมบูรณ์", 422);
  }
  return Buffer.from(value.slice(2), "hex");
}

export async function savePaymentSlip(propertyId: string, invoiceNumber: string, image: Buffer, filename?: string) {
  if (image.length > 10 * 1024 * 1024) throw new SlipError("รูปสลิปต้องมีขนาดไม่เกิน 10 MB", 413);
  const signature = validateImageSignature(image);
  if (!signature.isValid || !signature.format) throw new SlipError(signature.error || "รูปสลิปไม่ถูกต้อง");
  const db = slipDatabase();
  const propertyUuid = toUuid(propertyId);
  // Branch ownership is stored on the building, not on invoices or rooms.
  const { data: linkedInvoice, error } = await db.from("invoices")
    .select("id,rooms!inner(buildings!inner(property_id))")
    .eq("invoice_number", invoiceNumber)
    .eq("rooms.buildings.property_id", propertyUuid).maybeSingle();
  if (error) throw new SlipError("โหลดข้อมูลบิลจากฐานข้อมูลไม่สำเร็จ", 503);
  let invoice: { id: string } | null = linkedInvoice;
  if (!invoice) {
    // Older relational rows may lack building links. Resolve only an exact
    // invoice ID and explicit branch from the persisted application records.
    const { data: stored, error: storedError } = await db.from("pakdee_store")
      .select("value").eq("key", "pakdee_dev_invoices").maybeSingle();
    if (storedError) throw new SlipError("โหลดข้อมูลสาขาของบิลไม่สำเร็จ", 503);
    const records = Array.isArray(stored?.value) ? stored.value : [];
    const matches = records.filter((row: { id?: string; propertyId?: string; invoiceNumber?: string }) =>
      row.id && row.propertyId && toUuid(row.propertyId) === propertyUuid && row.invoiceNumber === invoiceNumber);
    if (matches.length === 1) {
      const { data: legacy, error: legacyError } = await db.from("invoices")
        .select("id,rooms(buildings(property_id))")
        .eq("id", toUuid(matches[0].id)).eq("invoice_number", invoiceNumber).maybeSingle();
      if (legacyError) throw new SlipError("โหลดข้อมูลบิลจากฐานข้อมูลไม่สำเร็จ", 503);
      // A conflicting relational branch must never be overridden by old records.
      const room = Array.isArray(legacy?.rooms) ? legacy.rooms[0] : legacy?.rooms;
      const building = Array.isArray(room?.buildings) ? room.buildings[0] : room?.buildings;
      if (legacy && (!building?.property_id || building.property_id === propertyUuid)) {
        invoice = { id: legacy.id };
      }
    }
  }
  if (!invoice) throw new SlipError("ยังไม่พบบิลนี้ในฐานข้อมูลของสาขา กรุณาซิงก์บิลก่อนส่งสลิป", 404);
  const hex = `\\x${image.toString("hex")}`;
  // A retry of the same image for the same invoice reuses the stored submission.
  const { data: existing, error: duplicateError } = await db.from("payment_slips").select("id")
    .eq("invoice_id", invoice.id).eq("image_sha256", createHash("sha256").update(image).digest("hex")).limit(1);
  if (duplicateError) throw new SlipError("ตรวจข้อมูลสลิปเดิมไม่สำเร็จ", 503);
  if (existing?.[0]) return existing[0].id as string;
  const { data, error: insertError } = await db.from("payment_slips").insert({
    property_id: propertyUuid, invoice_id: invoice.id, image_data: hex,
    mime_type: `image/${signature.format}`, original_filename: filename || null,
    verification_status: "pending",
  }).select("id").single();
  if (insertError) throw new SlipError("บันทึกรูปสลิปลงฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่", 503);
  return data.id as string;
}
