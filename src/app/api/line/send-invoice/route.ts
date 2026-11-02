import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/database.service";
import { pushLineMessage } from "@/lib/line/line-client";
import { buildInvoiceFlexMessage } from "@/lib/line/flex-templates";
import { generatePromptPayQRCode } from "@/lib/promptpay";
import { Invoice } from "@/types/dormitory";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { invoiceId, propertyId, mode } = body;

    const activePropId = propertyId || DatabaseService.getActivePropertyId() || "prop-1";
    const property = await DatabaseService.getProperty(activePropId);
    const settings = await DatabaseService.getBranchSettings(property, activePropId);

    const channelAccessToken = settings?.lineChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
    const promptpayNumber = settings?.promptpayNumber || "0812345678";

    const allInvoices = await DatabaseService.getInvoices(activePropId);
    const allTenants = await DatabaseService.getTenants(activePropId);

    // 1. ส่งบิลรายห้อง (Single Mode)
    if (mode !== "batch" && invoiceId) {
      const invoice = allInvoices.find((i) => i.id === invoiceId);
      if (!invoice) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }

      // หาผู้เช่าของห้องนี้
      const tenant = allTenants.find((t) => t.roomNumber === invoice.roomNumber);
      const recipientUserId = tenant?.lineUserId;

      // สร้าง Dynamic PromptPay QR Code
      let qrCodeUrl = "";
      try {
        qrCodeUrl = await generatePromptPayQRCode(promptpayNumber, invoice.totalAmount);
      } catch (e) {
        console.warn("[SEND-INVOICE] Failed to generate QR data URL:", e);
      }

      const flexMessage = buildInvoiceFlexMessage(invoice, property, settings, qrCodeUrl);

      // ส่งข้อความผ่าน LINE Messaging API
      const result = await pushLineMessage(channelAccessToken, recipientUserId || "simulated-user", [
        flexMessage,
      ]);

      // อัปเดตสถานะบิลในระบบ
      await DatabaseService.updateInvoiceLineStatus(invoice.id, "sent");

      return NextResponse.json({
        success: true,
        invoiceId: invoice.id,
        roomNumber: invoice.roomNumber,
        tenantName: invoice.tenantName,
        isSimulated: result.isSimulated || !recipientUserId,
        hasLinkedLine: Boolean(recipientUserId),
        lineUserId: recipientUserId || null,
        message: recipientUserId
          ? `ส่งบิลเข้า LINE ของผู้เช่าห้อง ${invoice.roomNumber} เรียบร้อยแล้ว`
          : `บันทึกการส่งบิลห้อง ${invoice.roomNumber} สำเร็จ (ผู้เช่ายังไม่ได้ผูก LINE บิลจะส่งทันทีเมื่อผู้เช่าผูกห้อง)`,
      });
    }

    // 2. ส่งบิลทุกห้องพร้อมกัน (Batch Mode)
    const unpaidInvoices = allInvoices.filter((i) => i.status !== "paid");
    let sentCount = 0;
    let simulatedCount = 0;
    const deliveredRooms: string[] = [];

    for (const inv of unpaidInvoices) {
      const tenant = allTenants.find((t) => t.roomNumber === inv.roomNumber);
      const recipientUserId = tenant?.lineUserId;

      let qrCodeUrl = "";
      try {
        qrCodeUrl = await generatePromptPayQRCode(promptpayNumber, inv.totalAmount);
      } catch (e) {}

      const flexMessage = buildInvoiceFlexMessage(inv, property, settings, qrCodeUrl);
      const res = await pushLineMessage(channelAccessToken, recipientUserId || "simulated-user", [
        flexMessage,
      ]);

      await DatabaseService.updateInvoiceLineStatus(inv.id, "sent");
      deliveredRooms.push(inv.roomNumber);

      if (res.isSimulated || !recipientUserId) {
        simulatedCount++;
      } else {
        sentCount++;
      }
    }

    await DatabaseService.logActivity(
      "SEND",
      "INVOICE",
      `ส่งบิลเข้า LINE ทั้งหมด ${unpaidInvoices.length} ห้อง (${sentCount} บัญชีจริง, ${simulatedCount} รอผู้เช่าผูก)`,
      activePropId
    );

    return NextResponse.json({
      success: true,
      totalUnpaid: unpaidInvoices.length,
      realSent: sentCount,
      simulatedSent: simulatedCount,
      deliveredRooms,
      message: `ส่งบิลแจ้งหนี้เข้า LINE เรียบร้อยแล้ว ทั้งหมด ${unpaidInvoices.length} ห้อง`,
    });
  } catch (error: any) {
    console.error("[API-SEND-INVOICE-ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
