import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { authorizeSlipRequest, slipDatabase, SlipError } from "@/lib/payment-slips-server";
import { resolvePublicOrigin } from "@/lib/public-origin";
import { DatabaseService } from "@/lib/database.service";
import { pushLineMessage } from "@/lib/line/line-client";
import { resolveLineUserId } from "@/lib/line/reminders";
import type { Invoice } from "@/types/dormitory";

export const runtime = "nodejs";
const privateHeaders = { "Cache-Control": "private, no-store" };
const LINK_DAYS = 7;

interface AddendumItem {
  title: string;
  amount: number;
  type: "monthly" | "one_time";
}

const esc = (v: unknown) =>
  String(v ?? "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c]!);
const money = (n: number) => Number(n || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const thaiDate = (ymd: string) => {
  const [y, m, d] = ymd.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
};

/** Addendum document (built on the server from structured data, so nothing executable can get in) */
function buildAddendumHtml(a: {
  addendumNo: number;
  contractNumber: string;
  roomNumber: string;
  tenantName: string;
  landlordName: string;
  effectiveDate: string;
  items: AddendumItem[];
  note: string;
}): string {
  const today = new Date().toISOString().slice(0, 10);
  const rows = a.items
    .map(
      (it, i) =>
        `<tr><td class="border border-slate-800 py-1.5 px-3 text-center">${i + 1}</td>` +
        `<td class="border border-slate-800 py-1.5 px-3">${esc(it.title)}</td>` +
        `<td class="border border-slate-800 py-1.5 px-3 text-center">${it.type === "monthly" ? "รายเดือน" : "ครั้งเดียว"}</td>` +
        `<td class="border border-slate-800 py-1.5 px-3 text-right">${money(it.amount)}</td></tr>`
    )
    .join("");
  const monthlyTotal = a.items.filter((i) => i.type === "monthly").reduce((s, i) => s + Number(i.amount || 0), 0);
  return [
    `<div class="text-center space-y-1">`,
    `<h1 class="text-xl font-bold text-black">บันทึกข้อตกลงแนบท้ายสัญญาเช่า ฉบับที่ ${a.addendumNo}</h1>`,
    `<p>แนบท้ายสัญญาเช่าเลขที่ ${esc(a.contractNumber)} · ห้อง ${esc(a.roomNumber)}</p>`,
    `<p>ทำที่ ${esc(a.landlordName)} วันที่ ${esc(thaiDate(today))}</p>`,
    `</div>`,
    `<p class="indent-8">บันทึกฉบับนี้ทำขึ้นระหว่าง <b>${esc(a.landlordName)}</b> ซึ่งต่อไปเรียกว่า "ผู้ให้เช่า" กับ <b>${esc(a.tenantName)}</b> ซึ่งต่อไปเรียกว่า "ผู้เช่า" ` +
      `คู่สัญญาตามสัญญาเช่าเลขที่ ${esc(a.contractNumber)} ทั้งสองฝ่ายตกลงเพิ่มเติม/เปลี่ยนแปลงข้อตกลงในสัญญาเช่า ดังต่อไปนี้</p>`,
    `<p><b>ข้อ 1.</b> ผู้เช่าตกลงใช้บริการ/ชำระค่าใช้จ่ายเพิ่มเติมตามรายการด้านล่าง โดยมีผลตั้งแต่วันที่ <b>${esc(thaiDate(a.effectiveDate))}</b> เป็นต้นไป ` +
      `รายการประเภท "รายเดือน" จะเรียกเก็บรวมกับใบแจ้งหนี้ค่าเช่าประจำเดือน</p>`,
    `<table class="w-full border-collapse border border-slate-800 text-[12px]"><thead><tr class="bg-slate-100">` +
      `<th class="border border-slate-800 py-1.5 px-3">ลำดับ</th><th class="border border-slate-800 py-1.5 px-3">รายการ</th>` +
      `<th class="border border-slate-800 py-1.5 px-3">ประเภท</th><th class="border border-slate-800 py-1.5 px-3">จำนวนเงิน (บาท)</th></tr></thead>` +
      `<tbody>${rows}</tbody>` +
      (monthlyTotal > 0
        ? `<tfoot><tr><td class="border border-slate-800 py-1.5 px-3 font-bold" colspan="3">ค่าใช้จ่ายรายเดือนที่เพิ่มขึ้น</td><td class="border border-slate-800 py-1.5 px-3 text-right font-bold">${money(monthlyTotal)} / เดือน</td></tr></tfoot>`
        : "") +
      `</table>`,
    a.note ? `<p><b>ข้อ 2.</b> ${esc(a.note)}</p>` : "",
    `<p><b>ข้อ ${a.note ? 3 : 2}.</b> ข้อความอื่นใดในสัญญาเช่าเลขที่ ${esc(a.contractNumber)} ที่ไม่ได้แก้ไขโดยบันทึกฉบับนี้ ให้คงมีผลบังคับตามเดิมทุกประการ ` +
      `บันทึกฉบับนี้ถือเป็นส่วนหนึ่งของสัญญาเช่าดังกล่าว</p>`,
  ].join("\n");
}

/**
 * /api/contracts/addenda?propertyId=…&action=…   (owner; same account check as /api/payment-slips)
 *  - list:   all addenda of the branch (newest first)
 *  - create: JSON {contractId, contractNumber, roomNumber, tenantName, tenantPhone, landlordName,
 *            landlordSignatureUrl, effectiveDate, items: AddendumItem[], note}
 *            → saves the addendum and sends a "read & sign" button to the tenant's LINE (same /sign page)
 *  - cancel: JSON {id} (only while waiting for the tenant)
 */
export async function POST(request: NextRequest) {
  try {
    const propertyId = request.nextUrl.searchParams.get("propertyId") || "";
    const action = request.nextUrl.searchParams.get("action") || "list";
    await authorizeSlipRequest(request, propertyId);
    const db = slipDatabase();

    if (action === "list") {
      const { data, error } = await db
        .from("contract_addenda")
        .select("id,contract_id,contract_number,addendum_no,room_number,tenant_name,effective_date,items,note,html,status,landlord_signature_url,tenant_signature_url,signed_at,created_at")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw new SlipError("โหลดบันทึกแนบท้ายไม่สำเร็จ (รัน docs/supabase_contract_addenda.sql แล้วหรือยัง)", 503);

      // ซ่อมสถานะ: ผู้เช่าเซ็นแล้ว (คำขอเซ็นเป็น signed) แต่บันทึกแนบท้ายยังค้าง pending → คัดลอกลายเซ็น/เวลามาใส่
      const pendingIds = (data || []).filter((a: any) => a.status === "pending").map((a: any) => a.id);
      if (pendingIds.length > 0) {
        const { data: signedReqs } = await db
          .from("contract_sign_requests")
          .select("addendum_id,tenant_signature_url,signed_at")
          .in("addendum_id", pendingIds)
          .eq("status", "signed");
        for (const r of signedReqs || []) {
          const { error: fixError } = await db
            .from("contract_addenda")
            .update({ status: "signed", tenant_signature_url: r.tenant_signature_url, signed_at: r.signed_at })
            .eq("id", r.addendum_id)
            .eq("status", "pending");
          if (fixError) {
            console.error("[CONTRACT-ADDENDA] fix status:", fixError.message);
            continue;
          }
          const a = (data || []).find((x: any) => x.id === r.addendum_id);
          if (a) Object.assign(a, { status: "signed", tenant_signature_url: r.tenant_signature_url, signed_at: r.signed_at });
        }
      }
      return NextResponse.json({ addenda: data || [] }, { headers: privateHeaders });
    }

    if (action === "cancel") {
      const body = await request.json().catch(() => ({}));
      const id = String(body.id || "");
      const { data: row } = await db.from("contract_addenda").select("status").eq("id", id).eq("property_id", propertyId).maybeSingle();
      if (!row) throw new SlipError("ไม่พบบันทึกแนบท้าย", 404);
      if (row.status !== "pending") throw new SlipError("ยกเลิกได้เฉพาะฉบับที่ยังรอผู้เช่าเซ็น");
      await db.from("contract_addenda").update({ status: "cancelled" }).eq("id", id);
      await db.from("contract_sign_requests").update({ status: "cancelled" }).eq("addendum_id", id).eq("status", "pending");
      return NextResponse.json({ success: true }, { headers: privateHeaders });
    }

    if (action === "create") {
      const body = await request.json().catch(() => ({}));
      const contractNumber = String(body.contractNumber || "");
      const roomNumber = String(body.roomNumber || "");
      const tenantName = String(body.tenantName || "").slice(0, 200);
      const landlordName = String(body.landlordName || "หอพัก").slice(0, 200);
      const effectiveDate = String(body.effectiveDate || "");
      const note = String(body.note || "").trim().slice(0, 2000);
      const items: AddendumItem[] = (Array.isArray(body.items) ? body.items : [])
        .map((i: any) => ({
          title: String(i?.title || "").trim().slice(0, 200),
          amount: Math.max(0, Number(i?.amount) || 0),
          type: i?.type === "one_time" ? "one_time" : "monthly",
        }))
        .filter((i: AddendumItem) => i.title);
      if (!contractNumber || !roomNumber) throw new SlipError("ข้อมูลสัญญาไม่ครบ");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) throw new SlipError("กรุณาเลือกวันที่เริ่มมีผล");
      if (items.length === 0 && !note) throw new SlipError("กรุณาใส่รายการที่เปลี่ยนแปลงอย่างน้อย 1 รายการ");
      const landlordSig = String(body.landlordSignatureUrl || "");
      if (!/^data:image\/(png|jpeg|webp);base64,/.test(landlordSig)) {
        throw new SlipError("ผู้ให้เช่ายังไม่ได้เซ็น: เซ็นในช่องผู้ให้เช่าของสัญญาหลัก หรือใส่ลายเซ็นในตั้งค่าสาขาก่อน");
      }

      await DatabaseService.init();
      const property = await DatabaseService.getProperty(propertyId);
      const settings = await DatabaseService.getBranchSettings(property, propertyId);
      const lineToken = settings?.lineChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
      if (!lineToken) throw new SlipError("ยังไม่ได้ตั้งค่า LINE Channel Access Token");
      const [rooms, tenants] = await Promise.all([DatabaseService.getRooms(propertyId), DatabaseService.getTenants()]);
      const room = rooms.find((r) => r.roomNumber === roomNumber);
      const lineUserId = resolveLineUserId(
        { roomNumber, tenantName, invoiceNumber: "", tenantId: room?.currentTenant?.id } as Invoice,
        rooms,
        tenants
      );
      if (!lineUserId) throw new SlipError(`ผู้เช่าห้อง ${roomNumber} ยังไม่ได้ผูก LINE`, 400);
      const origin = await resolvePublicOrigin(request);
      if (!origin) throw new SlipError("หาลิงก์ tunnel ไม่เจอ: ตรวจว่า cloudflared ยังเปิดอยู่ หรือใส่ PUBLIC_APP_URL ใน .env", 409);

      const { data: prev, error: prevError } = await db
        .from("contract_addenda")
        .select("addendum_no")
        .eq("property_id", propertyId)
        .eq("contract_number", contractNumber)
        .order("addendum_no", { ascending: false })
        .limit(1);
      if (prevError) throw new SlipError("สร้างบันทึกแนบท้ายไม่สำเร็จ (รัน docs/supabase_contract_addenda.sql แล้วหรือยัง)", 503);
      const addendumNo = (prev?.[0]?.addendum_no || 0) + 1;

      const html = buildAddendumHtml({ addendumNo, contractNumber, roomNumber, tenantName, landlordName, effectiveDate, items, note });
      const contentHash = createHash("sha256").update(html).digest("hex");
      const id = `ADD-${randomBytes(6).toString("hex")}`;
      const { error: insError } = await db.from("contract_addenda").insert({
        id,
        property_id: propertyId,
        contract_id: String(body.contractId || ""),
        contract_number: contractNumber,
        addendum_no: addendumNo,
        room_number: roomNumber,
        tenant_name: tenantName,
        effective_date: effectiveDate,
        items,
        note: note || null,
        html,
        content_hash: contentHash,
        status: "pending",
        landlord_signature_url: landlordSig,
      });
      if (insError) throw new SlipError("บันทึกแนบท้ายไม่สำเร็จ (รัน docs/supabase_contract_addenda.sql แล้วหรือยัง)", 503);

      const token = randomBytes(24).toString("base64url");
      const expiresAt = new Date(Date.now() + LINK_DAYS * 86400000).toISOString();
      const docNumber = `${contractNumber} / แนบท้ายฉบับที่ ${addendumNo}`;
      const { error: reqError } = await db.from("contract_sign_requests").insert({
        token,
        property_id: propertyId,
        contract_id: String(body.contractId || ""),
        contract_number: docNumber,
        addendum_id: id,
        room_number: roomNumber,
        tenant_name: tenantName,
        tenant_phone_last4: String(body.tenantPhone || "").replace(/\D/g, "").slice(-4) || null,
        line_user_id: lineUserId,
        contract_html: html,
        content_hash: contentHash,
        landlord_name: landlordName,
        landlord_signature_url: landlordSig,
        status: "pending",
        expires_at: expiresAt,
      });
      if (reqError) {
        await db.from("contract_addenda").update({ status: "cancelled" }).eq("id", id);
        throw new SlipError("สร้างลิงก์เซ็นไม่สำเร็จ (รัน docs/supabase_contract_addenda.sql แล้วหรือยัง)", 503);
      }

      const summary = items.length
        ? items.map((i) => `${i.title} ฿${money(i.amount)}${i.type === "monthly" ? "/เดือน" : ""}`).join(", ")
        : note;
      const res = await pushLineMessage(lineToken, lineUserId, [
        {
          type: "flex",
          altText: `บันทึกแนบท้ายสัญญาห้อง ${roomNumber} รอลงนาม`,
          contents: {
            type: "bubble",
            body: {
              type: "box",
              layout: "vertical",
              spacing: "sm",
              contents: [
                { type: "text", text: `📝 บันทึกแนบท้ายสัญญา ฉบับที่ ${addendumNo}`, weight: "bold", size: "md", wrap: true },
                { type: "text", text: `สัญญาเลขที่ ${contractNumber} · ห้อง ${roomNumber}`, size: "sm", color: "#555555", wrap: true },
                { type: "text", text: `สิ่งที่เปลี่ยน: ${summary}`.slice(0, 400), size: "sm", wrap: true, margin: "md" },
                { type: "text", text: `มีผลตั้งแต่ ${thaiDate(effectiveDate)}`, size: "sm", wrap: true },
                { type: "text", text: `กดปุ่มด้านล่างเพื่ออ่านและเซ็น (ภายใน ${LINK_DAYS} วัน)`, size: "xs", color: "#888888", wrap: true, margin: "md" },
              ],
            },
            footer: {
              type: "box",
              layout: "vertical",
              contents: [
                { type: "button", style: "primary", color: "#06C755", action: { type: "uri", label: "อ่านและเซ็น", uri: `${origin}/sign/${token}` } },
              ],
            },
          },
        },
      ]);
      if (!res.success) {
        await db.from("contract_addenda").update({ status: "cancelled" }).eq("id", id);
        await db.from("contract_sign_requests").update({ status: "cancelled" }).eq("token", token);
        throw new SlipError(`ส่ง LINE ไม่สำเร็จ: ${String(res.error || "").slice(0, 200)}`, 502);
      }
      return NextResponse.json(
        { success: true, id, addendumNo, message: `ส่งบันทึกแนบท้ายฉบับที่ ${addendumNo} ให้ผู้เช่าห้อง ${roomNumber} เซ็นทาง LINE แล้ว` },
        { headers: privateHeaders }
      );
    }

    throw new SlipError("คำขอไม่ถูกต้อง");
  } catch (error: any) {
    const status = error instanceof SlipError ? error.status : 500;
    if (!(error instanceof SlipError)) console.error("[CONTRACT-ADDENDA]", error);
    return NextResponse.json(
      { error: error instanceof SlipError ? error.message : "ดำเนินการไม่สำเร็จ" },
      { status, headers: privateHeaders }
    );
  }
}
