import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { authorizeSlipRequest, slipDatabase, SlipError } from "@/lib/payment-slips-server";
import { getPublicOrigin } from "@/lib/public-origin";
import { DatabaseService } from "@/lib/database.service";
import { pushLineMessage } from "@/lib/line/line-client";
import { resolveLineUserId } from "@/lib/line/reminders";
import { buildSignRequestCard, chunkText, contractHtmlToText } from "@/lib/line/contract-signing";
import type { Invoice } from "@/types/dormitory";

export const runtime = "nodejs";
const privateHeaders = { "Cache-Control": "private, no-store" };
const LINK_DAYS = 7;
const MAX_HTML = 500 * 1024;
const MAX_SIGNATURE = 400 * 1024;

// Wrong phone-digit attempts per link (server memory) — blocks guessing
const g = globalThis as unknown as { __pakdeeSignAttempts?: Map<string, number> };
const attempts = (g.__pakdeeSignAttempts ||= new Map<string, number>());

/** Contract HTML comes from the owner's app; strip anything executable before storing/serving it. */
function sanitizeHtml(html: string): string {
  const tags = "script|iframe|object|embed|style|link|meta|form|input|button|textarea|svg|math|template";
  return String(html || "")
    .replace(new RegExp(`<\\s*(${tags})\\b[\\s\\S]*?<\\s*\\/\\s*\\1\\s*>`, "gi"), "") // paired: remove with content
    .replace(new RegExp(`<\\s*\\/?\\s*(${tags})\\b[^>]*>`, "gi"), "") // leftover open/close tags
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, "");
}

const digits = (v: string) => String(v || "").replace(/\D/g, "");
const isPngDataUrl = (v: string) => /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(v || "");

async function getRequest(token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) throw new SlipError("ลิงก์ไม่ถูกต้อง", 404);
  const db = slipDatabase();
  const { data, error } = await db.from("contract_sign_requests").select("*").eq("token", token).maybeSingle();
  if (error) throw new SlipError("โหลดสัญญาไม่สำเร็จ (รัน docs/supabase_contract_signing.sql แล้วหรือยัง)", 503);
  if (!data) throw new SlipError("ไม่พบลิงก์นี้ หรือถูกยกเลิกแล้ว", 404);
  return { db, row: data as Record<string, any> };
}

/** What the tenant page may see (no phone digits, no LINE id) */
function publicView(row: Record<string, any>) {
  const expired = row.status === "pending" && new Date(row.expires_at).getTime() < Date.now();
  return {
    status: expired ? "expired" : row.status,
    contractNumber: row.contract_number,
    roomNumber: row.room_number,
    tenantName: row.tenant_name,
    landlordName: row.landlord_name,
    contractHtml: row.contract_html,
    contentHash: row.content_hash,
    landlordSignatureUrl: row.landlord_signature_url,
    tenantSignatureUrl: row.status === "signed" ? row.tenant_signature_url : null,
    signedAt: row.signed_at,
    expiresAt: row.expires_at,
  };
}

/**
 * /api/contracts/sign?action=...
 *  owner (Basic auth, same check as /api/payment-slips; needs &propertyId=):
 *   - create: JSON {contractId, contractNumber, roomNumber, tenantName, tenantPhone, landlordName,
 *             landlordSignatureUrl, contractHtml} → saves a locked copy and sends the link to the tenant's LINE
 *   - status: latest sign request per contract of the branch (to show signed contracts in the app)
 *  tenant (no login, by &token= from the link):
 *   - get:  contract to read and sign
 *   - sign: JSON {phoneLast4, signatureDataUrl, accepted: true}
 */
export async function POST(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get("action") || "";

    if (action === "get" || action === "sign") {
      const token = request.nextUrl.searchParams.get("token") || "";
      const { db, row } = await getRequest(token);
      if (action === "get") return NextResponse.json(publicView(row), { headers: privateHeaders });

      if (row.status === "signed") throw new SlipError("สัญญานี้ลงนามเรียบร้อยแล้ว", 409);
      if (row.status !== "pending") throw new SlipError("ลิงก์นี้ถูกยกเลิกแล้ว กรุณาติดต่อหอพัก", 410);
      if (new Date(row.expires_at).getTime() < Date.now()) throw new SlipError("ลิงก์หมดอายุแล้ว กรุณาติดต่อหอพักเพื่อขอลิงก์ใหม่", 410);
      if ((attempts.get(token) || 0) >= 5) throw new SlipError("กรอกเบอร์ผิดเกินกำหนด กรุณาติดต่อหอพักเพื่อขอลิงก์ใหม่", 429);

      const body = await request.json().catch(() => ({}));
      if (body.accepted !== true) throw new SlipError("กรุณาติ๊กยอมรับข้อตกลงในสัญญาก่อน");
      if (row.tenant_phone_last4 && digits(body.phoneLast4) !== row.tenant_phone_last4) {
        attempts.set(token, (attempts.get(token) || 0) + 1);
        throw new SlipError("เบอร์โทร 4 ตัวท้ายไม่ตรงกับที่ลงทะเบียนไว้", 403);
      }
      const signature = String(body.signatureDataUrl || "");
      if (!isPngDataUrl(signature) || signature.length > MAX_SIGNATURE) throw new SlipError("ลายเซ็นไม่ถูกต้อง กรุณาเซ็นใหม่");

      const signedAt = new Date().toISOString();
      const ip = (request.headers.get("x-forwarded-for") || request.headers.get("cf-connecting-ip") || "").split(",")[0].trim();
      const { error: updError } = await db
        .from("contract_sign_requests")
        .update({
          status: "signed",
          tenant_signature_url: signature,
          signed_at: signedAt,
          signer_ip: ip.slice(0, 100),
          signer_user_agent: (request.headers.get("user-agent") || "").slice(0, 300),
        })
        .eq("token", token)
        .eq("status", "pending");
      if (updError) throw new SlipError("บันทึกลายเซ็นไม่สำเร็จ กรุณาลองใหม่", 503);
      attempts.delete(token);

      // Mark the contract signed (works once docs/supabase_contract_signing.sql has been run)
      const { error: contractError } = await db
        .from("contracts")
        .update({
          status: "active",
          signed_at: signedAt,
          tenant_signature_url: signature,
          ...(row.landlord_signature_url ? { landlord_signature_url: row.landlord_signature_url } : {}),
        })
        .eq("contract_number", row.contract_number);
      if (contractError) console.error("[CONTRACT-SIGN] contracts update:", contractError.message);

      // Confirmation to the tenant's LINE (best effort)
      try {
        if (row.line_user_id) {
          await DatabaseService.init();
          const property = await DatabaseService.getProperty(row.property_id);
          const settings = await DatabaseService.getBranchSettings(property, row.property_id);
          const token2 = settings?.lineChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
          const origin = getPublicOrigin(request);
          await pushLineMessage(token2, row.line_user_id, [
            {
              type: "text",
              text: [
                `✅ ลงนามสัญญาเช่าเรียบร้อยแล้ว`,
                `สัญญาเลขที่ ${row.contract_number} (ห้อง ${row.room_number})`,
                `เวลา ${new Date(signedAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}`,
                ...(origin ? [`ดู/บันทึกสำเนาสัญญา: ${origin}/sign/${token}`] : []),
              ].join("\n"),
            },
          ]);
        }
      } catch (e: any) {
        console.error("[CONTRACT-SIGN] confirm push failed:", e?.message || e);
      }

      const { row: fresh } = await getRequest(token);
      return NextResponse.json(publicView(fresh), { headers: privateHeaders });
    }

    // ---- owner actions ----
    const propertyId = request.nextUrl.searchParams.get("propertyId") || "";
    await authorizeSlipRequest(request, propertyId);
    const db = slipDatabase();

    if (action === "status") {
      const { data, error } = await db
        .from("contract_sign_requests")
        .select("contract_number,contract_id,status,signed_at,tenant_signature_url,landlord_signature_url,expires_at,created_at")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw new SlipError("โหลดสถานะการเซ็นสัญญาไม่สำเร็จ (รัน docs/supabase_contract_signing.sql แล้วหรือยัง)", 503);
      // latest request per contract
      const latest = new Map<string, any>();
      for (const r of data || []) if (!latest.has(r.contract_number)) latest.set(r.contract_number, r);
      return NextResponse.json({ requests: Array.from(latest.values()) }, { headers: privateHeaders });
    }

    if (action === "create") {
      const body = await request.json().catch(() => ({}));
      const contractNumber = String(body.contractNumber || "");
      const roomNumber = String(body.roomNumber || "");
      if (!contractNumber || !roomNumber) throw new SlipError("ข้อมูลสัญญาไม่ครบ");
      const html = sanitizeHtml(String(body.contractHtml || ""));
      if (!html || html.length > MAX_HTML) throw new SlipError("เนื้อหาสัญญาไม่ถูกต้องหรือยาวเกินไป");
      const landlordSig = String(body.landlordSignatureUrl || "");
      if (landlordSig && (!/^data:image\/(png|jpeg|webp);base64,/.test(landlordSig) || landlordSig.length > MAX_SIGNATURE * 2)) {
        throw new SlipError("ลายเซ็นผู้ให้เช่าไม่ถูกต้อง");
      }

      await DatabaseService.init();
      const property = await DatabaseService.getProperty(propertyId);
      const settings = await DatabaseService.getBranchSettings(property, propertyId);
      const lineToken = settings?.lineChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
      if (!lineToken) throw new SlipError("ยังไม่ได้ตั้งค่า LINE Channel Access Token");
      const [rooms, tenants] = await Promise.all([DatabaseService.getRooms(propertyId), DatabaseService.getTenants()]);
      const room = rooms.find((r) => r.roomNumber === roomNumber);
      const lineUserId = resolveLineUserId(
        { roomNumber, tenantName: String(body.tenantName || ""), invoiceNumber: "", tenantId: room?.currentTenant?.id } as Invoice,
        rooms,
        tenants
      );
      if (!lineUserId) throw new SlipError(`ผู้เช่าห้อง ${roomNumber} ยังไม่ได้ผูก LINE — ให้เซ็นที่หอแทน (ปุ่ม "ลงลายเซ็น")`, 400);

      // Cancel older links of the same contract
      await db
        .from("contract_sign_requests")
        .update({ status: "cancelled" })
        .eq("property_id", propertyId)
        .eq("contract_number", contractNumber)
        .eq("status", "pending");

      const token = randomBytes(24).toString("base64url");
      const expiresAt = new Date(Date.now() + LINK_DAYS * 86400000).toISOString();
      const { error: insError } = await db.from("contract_sign_requests").insert({
        token,
        property_id: propertyId,
        contract_id: String(body.contractId || ""),
        contract_number: contractNumber,
        room_number: roomNumber,
        tenant_name: String(body.tenantName || "").slice(0, 200),
        tenant_phone_last4: digits(body.tenantPhone).slice(-4) || null,
        line_user_id: lineUserId,
        contract_html: html,
        content_hash: createHash("sha256").update(html).digest("hex"),
        landlord_name: String(body.landlordName || "").slice(0, 200),
        landlord_signature_url: landlordSig || null,
        status: "pending",
        expires_at: expiresAt,
      });
      if (insError) throw new SlipError("สร้างลิงก์เซ็นสัญญาไม่สำเร็จ (รัน docs/supabase_contract_signing.sql แล้วหรือยัง)", 503);

      // ส่งเนื้อหาสัญญาเข้าแชท LINE (ไม่ต้องใช้ลิงก์) ตามด้วยการ์ดปุ่ม "ยอมรับและลงนาม" (postback → webhook)
      const textChunks = chunkText(
        [`📄 สัญญาเช่าห้อง ${roomNumber} (เลขที่ ${contractNumber})`, "", contractHtmlToText(html)].join("\n")
      );
      const messages: any[] = [
        ...textChunks.map((t) => ({ type: "text", text: t })),
        buildSignRequestCard(token, contractNumber, roomNumber, String(body.tenantName || "")),
      ];
      // LINE: at most 5 messages per push
      for (let i = 0; i < messages.length; i += 5) {
        const res = await pushLineMessage(lineToken, lineUserId, messages.slice(i, i + 5));
        if (!res.success) {
          await db.from("contract_sign_requests").update({ status: "cancelled" }).eq("token", token);
          throw new SlipError(`ส่ง LINE ไม่สำเร็จ: ${String(res.error || "").slice(0, 200)}`, 502);
        }
      }
      return NextResponse.json(
        {
          success: true,
          expiresAt,
          message: `ส่งสัญญาเข้า LINE ผู้เช่าห้อง ${roomNumber} แล้ว รอผู้เช่ากด "ยอมรับและลงนาม" ในแชท (ภายใน ${LINK_DAYS} วัน)`,
        },
        { headers: privateHeaders }
      );
    }

    throw new SlipError("คำขอไม่ถูกต้อง");
  } catch (error: any) {
    const status = error instanceof SlipError ? error.status : 500;
    if (!(error instanceof SlipError)) console.error("[CONTRACT-SIGN]", error);
    return NextResponse.json(
      { error: error instanceof SlipError ? error.message : "ดำเนินการไม่สำเร็จ" },
      { status, headers: privateHeaders }
    );
  }
}
