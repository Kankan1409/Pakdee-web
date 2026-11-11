import { NextRequest, NextResponse } from "next/server";
import { authorizeSlipRequest, decodeSlipImage, savePaymentSlip, SlipError } from "@/lib/payment-slips-server";
import { validateImageSignature } from "@/lib/slip-verification";
import { verifyStoredPayment } from "@/lib/line/verify-payment";

export const runtime = "nodejs";
const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function POST(request: NextRequest) {
  try {
    const propertyId = request.nextUrl.searchParams.get("propertyId") || "";
    const action = request.nextUrl.searchParams.get("action") || "list";
    const { db, propertyUuid } = await authorizeSlipRequest(request, propertyId);
    if (action === "upload") {
      const form = await request.formData();
      const file = form.get("image");
      const invoiceNumber = String(form.get("invoiceNumber") || "");
      if (!(file instanceof File) || !invoiceNumber) throw new SlipError("กรุณาเลือกบิลและรูปสลิป");
      if (file.size > 10 * 1024 * 1024) throw new SlipError("รูปสลิปต้องมีขนาดไม่เกิน 10 MB", 413);
      const id = await savePaymentSlip(propertyId, invoiceNumber, Buffer.from(await file.arrayBuffer()), file.name);
      const result = await verifyStoredPayment(propertyId, id);
      return NextResponse.json({ id, ...result }, { headers: privateHeaders });
    }
    if (action === "list") {
      const { data, error } = await db.from("payment_slips")
        .select("id,invoice_id,verification_status,transaction_ref,rejection_reason,uploaded_at,verified_at,invoices(invoice_number)")
        .eq("property_id", propertyUuid).order("uploaded_at", { ascending: false }).limit(200);
      if (error) throw new SlipError("โหลดรายการสลิปไม่สำเร็จ", 503);
      return NextResponse.json({ slips: data }, { headers: privateHeaders });
    }
    if (action === "clear") {
      // ใช้ตอน "รีเซ็ตระบบ": ลบสลิปทั้งหมดของสาขานี้ (ต้องลบก่อนลบ invoices เพราะมี FK ผูกอยู่)
      const { error, count } = await db.from("payment_slips")
        .delete({ count: "exact" }).eq("property_id", propertyUuid);
      if (error) throw new SlipError("ลบสลิปของสาขาไม่สำเร็จ", 503);
      return NextResponse.json({ deleted: count ?? 0 }, { headers: privateHeaders });
    }
    if (!["image", "check"].includes(action)) throw new SlipError("คำขอไม่ถูกต้อง");
    const id = request.nextUrl.searchParams.get("id");
    if (!id) throw new SlipError("ไม่พบรหัสสลิป");
    const { data: slip, error } = await db.from("payment_slips")
      .select("id,invoice_id,image_data,image_sha256,mime_type,verification_status,rejection_reason")
      .eq("id", id).eq("property_id", propertyUuid).maybeSingle();
    if (error) throw new SlipError("โหลดสลิปไม่สำเร็จ", 503);
    if (!slip) throw new SlipError("ไม่พบสลิปในสาขานี้", 404);
    const bytes = decodeSlipImage(slip.image_data);
    if (action === "image") {
      return new NextResponse(new Uint8Array(bytes), { headers: { ...privateHeaders, "Content-Type": slip.mime_type } });
    }
    const signature = validateImageSignature(bytes);
    if (!signature.isValid) throw new SlipError("ไฟล์รูปในฐานข้อมูลไม่สมบูรณ์ กรุณาส่งรูปใหม่", 422);
    const { data: duplicates, error: duplicateError } = await db.from("payment_slips").select("id")
      .eq("property_id", propertyUuid).eq("image_sha256", slip.image_sha256)
      .neq("invoice_id", slip.invoice_id).limit(1);
    if (duplicateError) throw new SlipError("ตรวจรูปซ้ำไม่สำเร็จ", 503);
    if (duplicates?.length) return NextResponse.json({ status: slip.verification_status, duplicate: true,
      message: "พบรูปเดียวกันในบิลอื่นของสาขา จึงยังไม่รับชำระอัตโนมัติ" }, { headers: privateHeaders });
    return NextResponse.json(await verifyStoredPayment(propertyId, id), { headers: privateHeaders });
  } catch (error) {
    return NextResponse.json({ error: error instanceof SlipError ? error.message : "ดำเนินการกับสลิปไม่สำเร็จ" },
      { status: error instanceof SlipError ? error.status : 500, headers: privateHeaders });
  }
}
