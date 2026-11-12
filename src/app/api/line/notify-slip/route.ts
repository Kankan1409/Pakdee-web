import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/database.service";
import { pushLineMessage } from "@/lib/line/line-client";
import { getDefaultQuickReply } from "@/lib/line/flex-templates";
import { pushReceiptToTenantLine, findTenantLineUserId } from "@/lib/line/receipt-delivery";
import { toUuid } from "@/lib/supabase-relational";

export const runtime = "nodejs";

/**
 * API: /api/line/notify-slip
 * Two-way Admin Notification -> LINE Push
 * ส่งข้อความแจ้งเตือนเข้ามือถือผู้เช่าเมื่อแอดมินกด "อนุมัติ" หรือ "ปฏิเสธ" สลิปที่หน้าเว็บ
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { invoiceId, action, reason, propertyId } = body;

    if (!invoiceId || !action) {
      return NextResponse.json(
        { success: false, error: "Missing invoiceId or action ('approve' | 'reject')" },
        { status: 400 }
      );
    }

    await DatabaseService.init();
    const activePropId = propertyId || DatabaseService.getActivePropertyId() || "prop-1";
    const property = await DatabaseService.getProperty(activePropId);
    const settings = await DatabaseService.getBranchSettings(property, activePropId);

    const channelAccessToken = settings?.lineChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
    const branchName = settings?.branchName || property?.name || "พักดี แมนชั่น";

    const allInvoices = await DatabaseService.getInvoices(activePropId);
    const invoice = allInvoices.find(
      (i) => i.id === invoiceId || toUuid(i.id) === toUuid(invoiceId)
    );

    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    const allTenants = await DatabaseService.getTenants(activePropId);
    const allRooms = await DatabaseService.getRooms(activePropId);
    const recipientUserId = findTenantLineUserId(allTenants, allRooms, invoice.roomNumber);

    if (!recipientUserId) {
      console.log(`[NOTIFY-SLIP] Tenant in room ${invoice.roomNumber} has not linked LINE (lineUserId missing)`);
      return NextResponse.json({
        success: true,
        notified: false,
        message: `ผู้เช่าห้อง ${invoice.roomNumber} ยังไม่ได้ผูกบัญชี LINE (บันทึกข้อมูลในระบบเรียบร้อย)`,
      });
    }

    if (action === "approve") {
      // 1. กรณีแอดมินอนุมัติสลิป: ส่งใบเสร็จรับเงิน Digital Receipt ให้ผู้เช่า
      const introText = `✅ เจ้าหน้าที่ ${branchName} ได้ตรวจสอบยอดเงินและอนุมัติการชำระเงินบิลห้อง ${invoice.roomNumber} เรียบร้อยแล้วครับ!\n\nขอบคุณที่ชำระค่าบริการตรงเวลาครับ 🙏✨`;
      const pushResult = await pushReceiptToTenantLine({
        propertyId: activePropId,
        invoice,
        paidAmount: invoice.paidAmount || invoice.totalAmount,
        introText,
        recipientUserId,
        property,
        settings,
      });
      console.log(`[NOTIFY-SLIP] Approved slip push sent to user=${recipientUserId} result=`, pushResult.notified, pushResult.error || "");

      return NextResponse.json({
        success: true,
        notified: pushResult.notified,
        action: "approve",
        recipient: recipientUserId,
        method: pushResult.method,
        statusCode: pushResult.statusCode,
        error: pushResult.error,
      });
    } else if (action === "reject") {
      // 2. กรณีแอดมินปฏิเสธสลิป: แจ้งเหตุผลให้ผู้เช่าทราบ
      const rejectReason = reason || "ยอดเงินไม่ตรง หรือภาพสลิปไม่สมบูรณ์";
      const messages: any[] = [
        {
          type: "text",
          text: `⚠️ แจ้งเตือน: สลิปโอนเงินห้อง ${invoice.roomNumber} ไม่ผ่านการอนุมัติ\n\n📌 สาเหตุ: ${rejectReason}\n\nกรุณาตรวจสอบยอดเงิน หรือส่งภาพสลิปที่ถูกต้องเข้ามาอีกครั้ง หรือติดต่อสำนักงานหอพัก โทร: ${settings?.phone || "เบอร์สำนักงาน"} ครับ`,
          quickReply: getDefaultQuickReply(),
        },
      ];

      const pushResult = await pushLineMessage(channelAccessToken, recipientUserId, messages);
      console.log(`[NOTIFY-SLIP] Rejected slip push sent to user=${recipientUserId} result=`, pushResult.success);

      return NextResponse.json({
        success: true,
        notified: pushResult.success,
        action: "reject",
        recipient: recipientUserId,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("[NOTIFY-SLIP-FATAL]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
