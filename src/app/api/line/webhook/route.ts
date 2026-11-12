import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/database.service";
import { SlipError } from "@/lib/payment-slips-server";
import {
  verifyLineSignature,
  replyOrPushLineMessages,
  getLineMessageContent,
  getLineUserProfile,
} from "@/lib/line/line-client";
import { verifyLinePayment } from "@/lib/line/verify-payment";
import { formatReceiptNumber } from "@/lib/line/receipt-delivery";
import {
  buildInvoiceFlexMessage,
  buildReceiptFlexMessage,
  buildRepairTicketFlexMessage,
  buildWelcomeFlexMessage,
  getDefaultQuickReply,
} from "@/lib/line/flex-templates";
import { generatePromptPayQRCodeUrl } from "@/lib/promptpay";
import type { BranchSettingsDetail, Property } from "@/types/dormitory";

interface WebhookBranchContext {
  propId: string;
  property: Property | null;
  settings: BranchSettingsDetail;
  channelSecret: string;
  channelAccessToken: string;
  branchName: string;
  promptpayNumber: string;
}

async function resolveWebhookBranchContext(
  rawBody: string,
  signature: string
): Promise<
  | { ok: true; contexts: WebhookBranchContext[] }
  | { ok: false; status: number; error: string }
> {
  const defaultPropId = DatabaseService.getActivePropertyId() || "prop-1";
  const allProps = await DatabaseService.getAllProperties();
  const candidateIds = Array.from(
    new Set([defaultPropId, ...allProps.map((p) => p.id).filter(Boolean)])
  );

  let hasConfiguredSecret = false;
  const matched: WebhookBranchContext[] = [];

  for (const propId of candidateIds) {
    const property = await DatabaseService.getProperty(propId);
    const settings = await DatabaseService.getBranchSettings(property, propId);
    const channelSecret = settings?.lineChannelSecret || process.env.LINE_CHANNEL_SECRET || "";
    const channelAccessToken =
      settings?.lineChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || "";

    if (channelSecret.trim()) {
      hasConfiguredSecret = true;
      if (verifyLineSignature(rawBody, signature, channelSecret)) {
        matched.push({
          propId,
          property,
          settings,
          channelSecret,
          channelAccessToken,
          branchName: settings?.branchName || property?.name || "พักดี แมนชั่น",
          promptpayNumber: settings?.promptpayNumber || property?.promptpayNumber || "0812345678",
        });
      }
    }
  }

  if (!hasConfiguredSecret) {
    return { ok: false, status: 503, error: "Webhook secret not configured" };
  }
  if (matched.length === 0) {
    console.warn("[LINE-WEBHOOK] Unauthorized: Invalid HMAC-SHA256 signature");
    return { ok: false, status: 401, error: "Invalid webhook signature" };
  }
  return { ok: true, contexts: matched };
}

// Force Node.js runtime for crypto & buffer compatibility
export const runtime = "nodejs";

/**
 * GET: Webhook Health Check (สำหรับทดสอบในเบราว์เซอร์หรือตรวจสอบสถานะ)
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "PAKDEE LINE Messaging Gateway",
    endpoint: "/api/line/webhook",
    timestamp: new Date().toISOString(),
  });
}

/**
 * POST: LINE Webhook Receiver (รับ Event จาก LINE Platform)
 */
export async function POST(req: NextRequest) {
  let rawBody = "";
  try {
    // อ่าน Request Body ทันทีเพื่อป้องกัน Connection Timeout / ECONNRESET จาก Reverse Proxy หรือ LINE Webhook
    rawBody = await req.text();
  } catch (readErr: any) {
    if (readErr?.code === "ECONNRESET" || readErr?.name === "AbortError" || readErr?.message?.includes("aborted")) {
      console.warn("[LINE-WEBHOOK] Client connection was reset/aborted before body was fully read:", readErr.message);
      return NextResponse.json({ error: "Client aborted connection" }, { status: 400 });
    }
    console.error("[LINE-WEBHOOK-FATAL] Error reading request body:", readErr);
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 });
  }

  try {
    // ซิงค์ข้อมูลล่าสุดจาก Supabase Cloud หลังจากอ่าน Body ครบถ้วนแล้ว
    await DatabaseService.init();
    const signature = req.headers.get("x-line-signature") || "";

    // 1-2. ตรวจสอบ Signature และเลือกสาขาที่ตรงกับ LINE OA Secret
    const resolved = await resolveWebhookBranchContext(rawBody, signature);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const payload = JSON.parse(rawBody || "{}");
    const events: any[] = payload.events || [];

    let selectedCtx = resolved.contexts[0];
    if (resolved.contexts.length > 1) {
      const firstUserId = events.find((e) => e?.source?.userId)?.source?.userId;
      if (firstUserId) {
        for (const ctx of resolved.contexts) {
          const tenantMatch = await DatabaseService.getTenantByLineUser(firstUserId, ctx.propId);
          if (tenantMatch) {
            selectedCtx = ctx;
            break;
          }
        }
      }
    }

    const { propId: activePropId, property, settings, channelAccessToken, branchName, promptpayNumber } =
      selectedCtx;

    console.log(`[LINE-WEBHOOK] Received ${events.length} event(s) for branch: ${branchName} (${activePropId})`);

    // 3. วนลูปประมวลผลแต่ละ Event
    for (const event of events) {
      const replyToken = event.replyToken;
      const userId = event.source?.userId;
      const sendReply = (messages: any[]) =>
        replyOrPushLineMessages(channelAccessToken, replyToken, userId, messages);

      // Ignore verify probes without replyToken
      if (!replyToken || /^[0f]+$/i.test(replyToken)) {
        console.log(`[LINE-WEBHOOK] Verify probe acknowledged from LINE Platform (Token: ${replyToken})`);
        continue;
      }
      console.log(`[LINE-WEBHOOK] >>> TRANSACTION: Type=${event.type} User=${userId} Msg=${event.message?.text || event.message?.type}`);

      // Event: Follow (ผู้เช่าแอดไลน์เข้ามาใหม่)
      if (event.type === "follow") {
        const welcomeFlex = buildWelcomeFlexMessage(branchName);
        await sendReply([welcomeFlex]);
        continue;
      }

      // Event: Message
      if (event.type === "message") {
        const message = event.message;

        // -------------------------------------------------------------
        // A. ข้อความประเภทข้อความ (Text)
        // -------------------------------------------------------------
        if (message.type === "text") {
          const userText = (message.text || "").trim();

          // 1. ตรวจสอบการผูกห้องพัก (เช่น "A101", "101", "A1", "ห้อง A101", "ผูก A101", "room A101")
          const cleanBindingText = userText.replace(/^ผูก(?:ห้อง|บัญชี)?\s*/i, "").trim();
          const roomMatch = cleanBindingText.match(/^(?:ห้องพัก|ห้อง|room)?\s*([a-zA-Z0-9_-]{1,6})$/i);
          const isExplicitBind = userText.startsWith("ผูก") || userText.startsWith("ห้อง") || /^[rR]oom/i.test(userText);
          const isAlphanumericRoom =
            /^[a-zA-Z0-9_-]{1,6}$/i.test(cleanBindingText) &&
            !/^(ขอบิล|เช็คยอด|แจ้งซ่อม|ติดต่อ|กฎ|ช่วย|เมนู|แอร์|น้ำ|ไฟ)$/i.test(cleanBindingText);

          // รับทั้งชื่อห้องตรงๆ เช่น "A101", "101", "A1" หรือมีคำว่าห้อง/ผูก
          if (roomMatch && (isExplicitBind || isAlphanumericRoom)) {
            const requestedRoom = roomMatch[1];
            console.log(`[LINE-WEBHOOK] Attempting room binding: room=${requestedRoom} user=${userId}`);

            const boundTenant = await DatabaseService.bindTenantLineUser(
              activePropId,
              requestedRoom,
              userId,
              "ผู้เช่าห้อง " + requestedRoom
            );

            if (boundTenant) {
              const invoices = await DatabaseService.getInvoices(activePropId);
              const unpaidForRoom = invoices.filter(
                (i) =>
                  (i.roomNumber === boundTenant.roomNumber ||
                    DatabaseService.isRoomNumberMatch(i.roomNumber, boundTenant.roomNumber) ||
                    DatabaseService.isRoomNumberMatch(i.roomNumber, requestedRoom)) &&
                  i.status !== "paid"
              );

              const replyTexts: any[] = [
                {
                  type: "text",
                  text: `🎉 ผูกบัญชี LINE กับห้อง ${requestedRoom} (${boundTenant.fullName}) สำเร็จเรียบร้อยแล้วครับ!\n\nจากนี้ระบบจะส่งบิลแจ้งหนี้ค่าเช่าและค่าน้ำค่าไฟเข้าไลน์นี้ทุกเดือนครับ ✨`,
                  quickReply: getDefaultQuickReply(),
                },
              ];

              // หากมีบิลค้างอยู่ ส่งการ์ดบิลแจ้งหนี้พร้อม PromptPay QR ให้ทันที
              if (unpaidForRoom.length > 0) {
                const latestInv = unpaidForRoom[0];
                let qrDataUrl = "";
                try {
                  qrDataUrl = generatePromptPayQRCodeUrl(promptpayNumber, latestInv.totalAmount);
                } catch (e) {
                  console.warn("[LINE-WEBHOOK] PromptPay QR generation error:", e);
                }

                const flexInvoice = buildInvoiceFlexMessage(latestInv, property, settings, qrDataUrl);
                replyTexts.push(flexInvoice as any);
              }

              await sendReply(replyTexts);
              continue;
            } else {
              await sendReply([
                {
                  type: "text",
                  text: `⚠️ ไม่พบข้อมูลห้องพัก "${requestedRoom}" หรือห้องนี้ยังไม่มีผู้เข้าพักลงทะเบียนในหน้าแผนผังครับ\n\nหากคุณเป็นผู้เช่ารายเดือนที่เพิ่งย้ายเข้าใหม่ กรุณาติดต่อผู้จัดการหอพักเพื่อลงทะเบียนเข้าพักในระบบก่อนครับ 🏢`,
                  quickReply: getDefaultQuickReply(),
                },
              ]);
              continue;
            }
          }

          // 2. คำสั่ง: ขอบิล / เช็คยอดค้างชำระ
          if (/ขอบิล|เช็คยอด|ยอดค้าง|บิล|ค่าน้ำค่าไฟ|ชำระเงิน/i.test(userText)) {
            const tenant = await DatabaseService.getTenantByLineUser(userId, activePropId);
            if (!tenant || !tenant.roomNumber) {
              await sendReply([
                {
                  type: "text",
                  text: "🏢 คุณยังไม่ได้ผูกห้องพักกับระบบครับ\nกรุณาพิมพ์หมายเลขห้องพัก เช่น 'ห้อง 101' หรือ '101' เพื่อผูกข้อมูลก่อนครับ",
                  quickReply: getDefaultQuickReply(),
                },
              ]);
              continue;
            }

            const invoices = await DatabaseService.getInvoices(activePropId);
            const unpaid = invoices.find(
              (i) =>
                (i.roomNumber === tenant.roomNumber ||
                  DatabaseService.isRoomNumberMatch(i.roomNumber, tenant.roomNumber)) &&
                i.status !== "paid"
            );

            if (unpaid) {
              let qrUrl = "";
              try {
                qrUrl = generatePromptPayQRCodeUrl(promptpayNumber, unpaid.totalAmount);
              } catch (e) { }

              const invFlex = buildInvoiceFlexMessage(unpaid, property, settings, qrUrl);
              await sendReply([invFlex]);
            } else {
              await sendReply([
                {
                  type: "text",
                  text: `✨ ยอดเยี่ยมครับ! ห้อง ${tenant.roomNumber} (${tenant.fullName}) ไม่มีบิลค้างชำระในระบบแล้วครับ ขอบคุณครับ`,
                  quickReply: getDefaultQuickReply(),
                },
              ]);
            }
            continue;
          }

          // 3. คำสั่ง: แจ้งซ่อม (เช่น "แจ้งซ่อม แอร์ไม่เย็น", "แจ้งซ่อม ท่อน้ำรั่ว")
          if (/^(?:แจ้งซ่อม|ซ่อม|แจ้งปัญหา)\s*(.*)/i.test(userText) || /แอร์ไม่เย็น|น้ำรั่ว|ไฟดับ|ท่อตัน/i.test(userText)) {
            const repairDetail = userText.replace(/^(?:แจ้งซ่อม|ซ่อม|แจ้งปัญหา)\s*/i, "").trim() || "แจ้งซ่อมบำรุงทั่วไป";
            const tenant = await DatabaseService.getTenantByLineUser(userId, activePropId);
            const targetRoom = tenant?.roomNumber || "ไม่ระบุห้อง";

            let category: "air" | "plumbing" | "electric" | "furniture" | "other" = "other";
            if (/แอร์|ความเย็น|น้ำหยด/i.test(repairDetail)) category = "air";
            else if (/น้ำ|ท่อ|ก๊อก|ชักโครก/i.test(repairDetail)) category = "plumbing";
            else if (/ไฟ|หลอดไฟ|ปลั๊ก|สวิตช์/i.test(repairDetail)) category = "electric";
            else if (/เตียง|ตู้|โต๊ะ|เก้าอี้|ประตู|หน้าต่าง/i.test(repairDetail)) category = "furniture";

            const newRepair = await DatabaseService.addRepair({
              propertyId: activePropId,
              roomNumber: targetRoom,
              title: repairDetail,
              description: `แจ้งผ่าน LINE OA โดย ${tenant?.fullName || "ผู้พักอาศัย"}`,
              category,
              priority: "normal",
              status: "pending",
              cost: 0,
            });

            const repairFlex = buildRepairTicketFlexMessage(newRepair, branchName);
            await sendReply([repairFlex]);
            continue;
          }

          // 4. คำสั่ง: ข้อมูลติดต่อ / สำนักงาน
          if (/ติดต่อ|นิติ|เบอร์โทร|โทร|สอบถาม|สำนักงาน|ออฟฟิศ/i.test(userText)) {
            await sendReply([
              {
                type: "text",
                text: `🏢 ${branchName}\n📍 ที่อยู่: ${settings?.address || property?.address || "ที่อยู่หอพัก"}\n📞 เบอร์ติดต่อ: ${settings?.phone || property?.phone || "081-234-5678"}\n⏰ เวลาทำการ: 08:30 - 20:00 น. ทุกวันครับ`,
                quickReply: getDefaultQuickReply(),
              },
            ]);
            continue;
          }

          // 5. คำสั่ง: กฎระเบียบหอพัก
          if (/กฎ|ระเบียบ|ข้อห้าม|สัญญา/i.test(userText)) {
            await sendReply([
              {
                type: "text",
                text: `📜 กฎระเบียบและข้อปฏิบัติ ${branchName}:\n\n${settings?.contractTerms || "1. ห้ามส่งเสียงดังหลัง 22:00 น.\n2. ชำระค่าเช่าภายในวันที่ 5 ของทุกเดือน\n3. ห้ามเลี้ยงสัตว์ทุกชนิด\n4. ช่วยกันรักษาความสะอาดพื้นที่ส่วนกลาง"}`,
                quickReply: getDefaultQuickReply(),
              },
            ]);
            continue;
          }

          // 6. Default Fallback Help Menu
          await sendReply([
            {
              type: "text",
              text: `สวัสดีครับ 🙏 ${branchName} ยินดีให้บริการครับ\n\nคำสั่งที่สามารถเลือกหรือพิมพ์ได้ 24 ชม.:\n• พิมพ์เลขห้อง (เช่น '101' หรือ 'ห้อง 101') เพื่อผูกข้อมูลห้อง\n• แตะปุ่ม 'ขอบิล' เพื่อดูยอดค่าใช้จ่ายและ QR สแกนจ่าย\n• แตะปุ่ม 'แจ้งซ่อม' เพื่อแจ้งปัญหาห้องพัก\n• ส่งรูปภาพสลิปโอนเงิน เพื่อส่งให้เจ้าหน้าที่ตรวจสอบ`,
              quickReply: getDefaultQuickReply(),
            },
          ]);
          continue;
        }

        // -------------------------------------------------------------
        // B. ข้อความประเภทรูปภาพ (Image) — ตรวจสลิปโอนเงินอัตโนมัติ (Anti-Fraud & Anti-Duplicate)
        // -------------------------------------------------------------
        if (message.type === "image") {
          const tenant = await DatabaseService.getTenantByLineUser(userId, activePropId);
          if (!tenant || !tenant.roomNumber) {
            await sendReply([
              {
                type: "text",
                text: "⚠️ ได้รับรูปภาพสลิปแล้ว แต่บัญชี LINE ของคุณยังไม่ได้ผูกกับห้องพัก\nกรุณาพิมพ์หมายเลขห้อง เช่น 'ห้อง 101' เพื่อให้ระบบตัดยอดบิลได้ถูกต้องครับ",
              },
            ]);
            continue;
          }

          // ค้นหาบิลค้างชำระของห้องนี้ (ยึด ROOMS เป็นหลัก และเทียบเบอร์ห้องตรงตัวก่อน)
          const invoices = await DatabaseService.getInvoices(activePropId);
          const cleanTenantRoom = tenant.roomNumber.trim().toLowerCase();
          const unpaid =
            invoices.find(
              (i) => i.status !== "paid" && i.roomNumber.trim().toLowerCase() === cleanTenantRoom
            ) ||
            invoices.find(
              (i) =>
                i.status !== "paid" &&
                DatabaseService.isRoomNumberMatch(i.roomNumber, tenant.roomNumber)
            );

          if (!unpaid) {
            await sendReply([
              {
                type: "text",
                text: `ขอบคุณครับ ห้อง ${tenant.roomNumber} ไม่มีบิลค้างชำระในระบบขณะนี้ หากต้องการติดต่อเจ้าหน้าที่กรุณาโทร ${settings?.phone || "เบอร์สำนักงานหอพัก"} ครับ`,
              },
            ]);
            continue;
          }

          // 1. ดาวน์โหลดรูปภาพสลิปจริงจาก LINE Content API
          const imageBuffer = await getLineMessageContent(channelAccessToken, message.id);
          if (!imageBuffer) {
            await sendReply([
              {
                type: "text",
                text: "⚠️ ไม่สามารถดาวน์โหลดรูปภาพจากเซิร์ฟเวอร์ LINE ได้ กรุณาลองส่งใหม่อีกครั้งครับ",
              },
            ]);
            continue;
          }

          try {
            const result = await verifyLinePayment(activePropId, unpaid, settings, imageBuffer, "line-" + message.id);
            const replies: any[] = [{ type: "text", text: result.message, quickReply: getDefaultQuickReply() }];
            if (result.amount !== undefined) {
              replies.push(
                buildReceiptFlexMessage(
                  { ...unpaid, paidAmount: result.amount, status: "paid" },
                  formatReceiptNumber(unpaid.invoiceNumber),
                  result.amount,
                  branchName
                )
              );
            }
            const sendRes = await sendReply(replies);
            console.log("[LINE-WEBHOOK] Slip verification delivery:", {
              invoiceNumber: unpaid.invoiceNumber,
              roomNumber: unpaid.roomNumber,
              userId,
              hasReceipt: result.amount !== undefined,
              success: sendRes.success,
              method: sendRes.method,
              statusCode: sendRes.statusCode,
              error: sendRes.error,
            });
          } catch (error) {
            await sendReply([{ type: "text",
              text: error instanceof SlipError ? error.message : "ยังยืนยันการชำระเงินไม่ได้ กรุณาติดต่อเจ้าหน้าที่" }]);
          }
          continue;
        }


      }
    }

    return NextResponse.json({ success: true, processedEvents: events.length });
  } catch (error: any) {
    if (error?.code === "ECONNRESET" || error?.name === "AbortError" || error?.message?.includes("aborted")) {
      console.warn("[LINE-WEBHOOK] Request aborted or client disconnected:", error.message);
      return NextResponse.json(
        { error: "Connection aborted by client", details: error.message },
        { status: 499 }
      );
    }
    console.error("[LINE-WEBHOOK-FATAL]", error);
    return NextResponse.json(
      { error: "Webhook processing error", details: error.message },
      { status: 500 }
    );
  }
}
