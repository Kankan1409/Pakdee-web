import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/database.service";
import { savePaymentSlip, SlipError } from "@/lib/payment-slips-server";
import path from "path";
import fs from "fs";
import {
  verifyLineSignature,
  replyLineMessage,
  getLineMessageContent,
} from "@/lib/line/line-client";
import {
  SlipVerificationService,
  verifyWithSlip2Go,
  extractQrFromImage,
} from "@/lib/slip-verification";
import {
  buildInvoiceFlexMessage,
  buildReceiptFlexMessage,
  buildRepairTicketFlexMessage,
  buildWelcomeFlexMessage,
  getDefaultQuickReply,
} from "@/lib/line/flex-templates";
import { generatePromptPayQRCodeUrl } from "@/lib/promptpay";

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

    // 1. ดึงการตั้งค่าของสาขาปัจจุบัน (รวม Token และ Secret)
    const activePropId = DatabaseService.getActivePropertyId() || "prop-1";
    const property = await DatabaseService.getProperty(activePropId);
    const settings = await DatabaseService.getBranchSettings(property, activePropId);

    const channelSecret = settings?.lineChannelSecret || process.env.LINE_CHANNEL_SECRET || "";
    const channelAccessToken = settings?.lineChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
    const branchName = settings?.branchName || property?.name || "พักดี แมนชั่น";
    const promptpayNumber = settings?.promptpayNumber || property?.promptpayNumber || "0812345678";

    // 2. ตรวจสอบ Signature เมื่อมีการตั้งค่า Channel Secret (ป้องกัน Spoofing)
    if (channelSecret && channelSecret.trim() !== "") {
      const isValid = verifyLineSignature(rawBody, signature, channelSecret);
      if (!isValid) {
        console.warn("[LINE-WEBHOOK] Unauthorized: Invalid HMAC-SHA256 signature");
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody || "{}");
    const events: any[] = payload.events || [];

    console.log(`[LINE-WEBHOOK] Received ${events.length} event(s) for branch: ${branchName} (${activePropId})`);

    // 3. วนลูปประมวลผลแต่ละ Event
    for (const event of events) {
      const replyToken = event.replyToken;
      const userId = event.source?.userId;

      // Ignore verify probes without replyToken
      if (!replyToken || /^[0f]+$/i.test(replyToken)) {
        console.log(`[LINE-WEBHOOK] Verify probe acknowledged from LINE Platform (Token: ${replyToken})`);
        continue;
      }
      console.log(`[LINE-WEBHOOK] >>> TRANSACTION: Type=${event.type} User=${userId} Msg=${event.message?.text || event.message?.type}`);

      // Event: Follow (ผู้เช่าแอดไลน์เข้ามาใหม่)
      if (event.type === "follow") {
        const welcomeFlex = buildWelcomeFlexMessage(branchName);
        await replyLineMessage(channelAccessToken, replyToken, [welcomeFlex]);
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

              await replyLineMessage(channelAccessToken, replyToken, replyTexts);
              continue;
            } else {
              await replyLineMessage(channelAccessToken, replyToken, [
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
              await replyLineMessage(channelAccessToken, replyToken, [
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
              await replyLineMessage(channelAccessToken, replyToken, [invFlex]);
            } else {
              await replyLineMessage(channelAccessToken, replyToken, [
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
            await replyLineMessage(channelAccessToken, replyToken, [repairFlex]);
            continue;
          }

          // 4. คำสั่ง: ข้อมูลติดต่อ / สำนักงาน
          if (/ติดต่อ|นิติ|เบอร์โทร|โทร|สอบถาม|สำนักงาน|ออฟฟิศ/i.test(userText)) {
            await replyLineMessage(channelAccessToken, replyToken, [
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
            await replyLineMessage(channelAccessToken, replyToken, [
              {
                type: "text",
                text: `📜 กฎระเบียบและข้อปฏิบัติ ${branchName}:\n\n${settings?.contractTerms || "1. ห้ามส่งเสียงดังหลัง 22:00 น.\n2. ชำระค่าเช่าภายในวันที่ 5 ของทุกเดือน\n3. ห้ามเลี้ยงสัตว์ทุกชนิด\n4. ช่วยกันรักษาความสะอาดพื้นที่ส่วนกลาง"}`,
                quickReply: getDefaultQuickReply(),
              },
            ]);
            continue;
          }

          // 6. Default Fallback Help Menu
          await replyLineMessage(channelAccessToken, replyToken, [
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
            await replyLineMessage(channelAccessToken, replyToken, [
              {
                type: "text",
                text: "⚠️ ได้รับรูปภาพสลิปแล้ว แต่บัญชี LINE ของคุณยังไม่ได้ผูกกับห้องพัก\nกรุณาพิมพ์หมายเลขห้อง เช่น 'ห้อง 101' เพื่อให้ระบบตัดยอดบิลได้ถูกต้องครับ",
              },
            ]);
            continue;
          }

          // ค้นหาบิลค้างชำระของห้องนี้ (ยึด ROOMS เป็นหลัก และเทียบเบอร์ห้องอย่างยืดหยุ่น)
          const invoices = await DatabaseService.getInvoices(activePropId);
          const unpaid = invoices.find(
            (i) =>
              (i.roomNumber === tenant.roomNumber ||
                DatabaseService.isRoomNumberMatch(i.roomNumber, tenant.roomNumber)) &&
              i.status !== "paid"
          );

          if (!unpaid) {
            await replyLineMessage(channelAccessToken, replyToken, [
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
            await replyLineMessage(channelAccessToken, replyToken, [
              {
                type: "text",
                text: "⚠️ ไม่สามารถดาวน์โหลดรูปภาพจากเซิร์ฟเวอร์ LINE ได้ กรุณาลองส่งใหม่อีกครั้งครับ",
              },
            ]);
            continue;
          }

          // 2. บันทึกรูปภาพลงโฟลเดอร์ public/slips เพื่อให้เจ้าหน้าที่ดูได้ในระบบ
          const slipsDir = path.join(process.cwd(), "public", "slips");
          if (!fs.existsSync(slipsDir)) {
            fs.mkdirSync(slipsDir, { recursive: true });
          }
          const slipFilename = `slip_${unpaid.roomNumber}_${Date.now()}.jpg`;
          const slipFilePath = path.join(slipsDir, slipFilename);
          fs.writeFileSync(slipFilePath, imageBuffer);
          const slipUrl = `/slips/${slipFilename}`;

          // สำรองข้อมูลรูปภาพสลิปเข้าตาราง payment_slips (ถ้ามีตารางและคอนฟิก)
          try {
            await savePaymentSlip(activePropId, unpaid.invoiceNumber, imageBuffer, "line-" + message.id);
          } catch (e) {
            console.warn("[LINE-PAYMENT-SLIPS-TABLE-WARN]", e);
          }

          // 3. รัน Slip Verification Engine (AI ตรวจสลิปปลอม, สลิปซ้ำ, และยอดเงิน)
          const verificationResult = SlipVerificationService.verifySlip({
            imageBuffer,
            invoice: unpaid,
            allInvoices: invoices,
            propertySettings: settings,
          });

          // ตรวจสอบว่าสาขานี้เปิดใช้งาน Slip2Go API หรือไม่
          const slip2goKey = settings?.slip2goSecretKey || process.env.SLIP2GO_SECRET_KEY;

          if (!slip2goKey) {
            console.log(`[SLIP-CHECK] Slip2Go Key is not configured for branch ${branchName}. Using admin approval mode.`);
          }

          if (slip2goKey && verificationResult.success) {
            console.log(`[SLIP2GO] Initiating Slip2Go verification for room ${unpaid.roomNumber}...`);
            const qrCodeString = extractQrFromImage(imageBuffer);

            const slip2goResult = await verifyWithSlip2Go(slip2goKey, {
              qrCode: qrCodeString || undefined,
              imageBuffer,
              expectedAmount: unpaid.totalAmount,
              receiverAccount: settings?.bankAccountNumber || settings?.promptpayNumber,
            });

            if (slip2goResult.success) {
              const verifiedAmount = slip2goResult.amount || unpaid.totalAmount;
              if (verifiedAmount >= unpaid.totalAmount) {
                // ✅ Slip2Go ตรวจสอบผ่านธนาคาร 100%: ตัดบิลเป็น Paid และออกใบเสร็จอัตโนมัติทันที!
                const receiptNo = `REC-${new Date().toISOString().slice(0, 7).replace("-", "")}-${unpaid.roomNumber}`;
                await DatabaseService.updateInvoiceStatus(unpaid.id, "paid", verifiedAmount, {
                  slipStatus: "passed",
                  slipUrl,
                  slipVerifiedAt: slip2goResult.date || new Date().toISOString(),
                  slipVerifiedBy: "ai",
                  slipTransRef: slip2goResult.transRef || verificationResult.transRef,
                  slipBank: verificationResult.bankName,
                  slipHash: verificationResult.slipHash,
                });

                const receiptFlex = buildReceiptFlexMessage(
                  { ...unpaid, paidAmount: verifiedAmount, status: "paid" },
                  receiptNo,
                  verifiedAmount,
                  branchName
                );

                await replyLineMessage(channelAccessToken, replyToken, [
                  {
                    type: "text",
                    text: `✅ ตรวจสอบสลิปกับระบบธนาคารผ่าน Slip2Go สำเร็จเรียบร้อยแล้วครับ!\n🏦 ธนาคาร: ${verificationResult.bankName}\n🔢 รหัสอ้างอิง: ${slip2goResult.transRef || verificationResult.transRef}\n💰 ยอดชำระ: ฿${verifiedAmount.toLocaleString()} บาท\n\nระบบได้ออกใบเสร็จรับเงินให้อัตโนมัติเรียบร้อยครับ ขอบคุณที่ชำระตรงเวลาครับ 🙏✨`,
                    quickReply: getDefaultQuickReply(),
                  },
                  receiptFlex,
                ]);
                continue;
              } else {
                // ⚠️ ยอดเงินไม่ครบตามบิล (เช่น โอนเงินขาด)
                const diff = unpaid.totalAmount - verifiedAmount;
                await DatabaseService.updateInvoiceStatus(unpaid.id, "unpaid", verifiedAmount, {
                  slipStatus: "action_needed",
                  slipUrl,
                  slipVerifiedAt: new Date().toISOString(),
                  slipVerifiedBy: "ai",
                  slipRejectReason: `ยอดเงินโอนจริงจากธนาคารคือ ฿${verifiedAmount} ไม่ครบตามบิล (ขาด ฿${diff})`,
                  slipHash: verificationResult.slipHash,
                });

                await replyLineMessage(channelAccessToken, replyToken, [
                  {
                    type: "text",
                    text: `⚠️ ตรวจสอบพบยอดเงินไม่ครบตามบิล!\n💰 ยอดโอนจริงจากธนาคาร: ฿${verifiedAmount.toLocaleString()} บาท\n📌 ยอดบิลห้อง ${unpaid.roomNumber}: ฿${unpaid.totalAmount.toLocaleString()} บาท\n(ยังขาดอีก ฿${diff.toLocaleString()} บาท)\n\nกรุณาโอนส่วนที่เหลือ หรือติดต่อสำนักงาน โทร ${settings?.phone || "เบอร์สำนักงาน"} ครับ`,
                    quickReply: getDefaultQuickReply(),
                  },
                ]);
                continue;
              }
            } else {
              // ❌ Slip2Go ปฏิเสธ (สลิปปลอม / ไม่พบในระบบธนาคาร / สลิปซ้ำ)
              await DatabaseService.updateInvoiceStatus(unpaid.id, "unpaid", undefined, {
                slipStatus: "action_needed",
                slipUrl,
                slipVerifiedAt: new Date().toISOString(),
                slipVerifiedBy: "ai",
                slipRejectReason: `Slip2Go: ${slip2goResult.error || "สลิปไม่ผ่านการตรวจสอบจากระบบธนาคาร"}`,
                slipHash: verificationResult.slipHash,
              });

              await replyLineMessage(channelAccessToken, replyToken, [
                {
                  type: "text",
                  text: `❌ สลิปไม่ผ่านการตรวจสอบจากระบบธนาคาร\n📌 สาเหตุ: ${slip2goResult.error || "ไม่พบข้อมูลธุรกรรม หรือข้อมูลไม่ถูกต้อง"}\n\nกรุณาตรวจสอบสลิป หรือติดต่อสำนักงานหอพัก โทร ${settings?.phone || "เบอร์สำนักงาน"} ครับ`,
                  quickReply: getDefaultQuickReply(),
                },
              ]);
              continue;
            }
          }

          if (verificationResult.success) {
            // ผ่านการตรวจสอบ 100%: มาร์กเป็น paid พร้อมบันทึกหลักฐาน
            const verifiedAmount = verificationResult.amount || unpaid.totalAmount;
            const receiptNo = `REC-${new Date().toISOString().slice(0, 7).replace("-", "")}-${unpaid.roomNumber}`;
            const verifiedAt = verificationResult.verifiedAt || new Date().toLocaleString("th-TH");

            await DatabaseService.updateInvoiceStatus(unpaid.id, "paid", verifiedAmount, {
              slipStatus: "passed",
              slipUrl,
              slipVerifiedAt: verifiedAt,
              slipVerifiedBy: "ai",
              slipTransRef: verificationResult.transRef,
              slipBank: verificationResult.bankName,
              slipHash: verificationResult.slipHash,
            });

            const receiptFlex = buildReceiptFlexMessage(
              { ...unpaid, paidAmount: verifiedAmount },
              receiptNo,
              verifiedAmount,
              branchName
            );

            await replyLineMessage(channelAccessToken, replyToken, [
              {
                type: "text",
                text: `✅ AI ตรวจสอบสลิปถูกต้อง 100%!\n🏦 ธนาคาร: ${verificationResult.bankName || "พร้อมเพย์"}\n🔢 รหัสอ้างอิง: ${verificationResult.transRef || "-"}\n💵 ยอดเงิน: ฿${verifiedAmount.toLocaleString()}\n\nระบบตัดยอดบิลห้อง ${unpaid.roomNumber} เรียบร้อยแล้ว พร้อมส่งใบเสร็จรับเงินให้อัตโนมัติครับ 🎉`,
              },
            ]);
          } else {
            // ไม่ผ่านการตรวจสอบ (สลิปปลอม, สลิปซ้ำ, หรือยอดไม่ครบ): ห้ามตัดบิล
            const safeStatus = (unpaid.status === "paid" ? "unpaid" : unpaid.status) as any;
            await DatabaseService.updateInvoiceStatus(unpaid.id, safeStatus, undefined, {
              slipStatus: "action_needed",
              slipUrl,
              slipVerifiedAt: new Date().toLocaleString("th-TH"),
              slipVerifiedBy: "ai",
              slipRejectReason: verificationResult.message,
              slipHash: verificationResult.slipHash,
            });

            await replyLineMessage(channelAccessToken, replyToken, [
              {
                type: "text",
                text: `⚠️ ระบบ AI ตรวจพบข้อผิดพลาดของสลิป:\n\n${verificationResult.message}\n\n📌 สถานะบิลห้อง ${unpaid.roomNumber}: ยังคงเป็น "ค้างชำระ"\nหากท่านได้โอนเงินจริง กรุณาติดต่อสำนักงานหอพัก ${settings?.phone ? "โทร " + settings.phone : ""} เพื่อให้เจ้าหน้าที่ตรวจสอบครับ`,
              },
            ]);
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
