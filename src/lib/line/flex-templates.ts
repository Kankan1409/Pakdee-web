/**
 * PAKDEE SYSTEM - LINE FLEX MESSAGE TEMPLATES
 * เทมเพลตข้อความแบบตอบกลับอัตโนมัติและการ์ดใบแจ้งหนี้แบบ Bento สวยงามตามมาตรฐาน LINE Flex Message
 */

import { Invoice, Property, RepairItem, BranchSettingsDetail } from "@/types/dormitory";
import { formatCurrency, formatDateThai } from "@/lib/utils";

/**
 * 1. สร้าง Flex Message การ์ดใบแจ้งหนี้ พร้อม Dynamic PromptPay QR Code
 */
export function buildInvoiceFlexMessage(
  invoice: Invoice,
  property?: Property | null,
  branchSettings?: BranchSettingsDetail | null,
  qrCodeUrl?: string
) {
  const branchName = branchSettings?.branchName || property?.name || "พักดี แมนชั่น";
  const dueDateStr = invoice.dueDate ? formatDateThai(invoice.dueDate) : "วันที่ 5 ของเดือน";
  const billingMonth = invoice.billingDate || "รอบเดือนปัจจุบัน";

  // Build items rows
  const itemBoxes = invoice.items.map((item) => {
    let detailText = "";
    const rateVal = item.rate ?? (item as any).ratePerUnit;
    if (item.units !== undefined && rateVal !== undefined) {
      detailText = ` (${item.units} หน่วย @฿${rateVal})`;
    }
    const itemName = item.name || (item as any).description || "รายการ";

    return {
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "text",
          text: `• ${itemName}${detailText}`,
          size: "xs",
          color: "#475569",
          flex: 7,
          wrap: true,
        },
        {
          type: "text",
          text: `฿${item.amount.toLocaleString()}`,
          size: "xs",
          color: "#0f172a",
          weight: "bold",
          align: "end",
          flex: 3,
        },
      ],
      margin: "sm",
    };
  });

  return {
    type: "flex",
    altText: `🏢 ใบแจ้งหนี้ห้อง ${invoice.roomNumber} (${formatCurrency(invoice.totalAmount)}) - ${branchName}`,
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#059669",
        paddingAll: "20px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "text",
                text: "🏢 " + branchName,
                color: "#A7F3D0",
                size: "xs",
                weight: "bold",
                flex: 1,
              },
              {
                type: "text",
                text: "ใบแจ้งหนี้",
                color: "#FFFFFF",
                size: "xs",
                align: "end",
                weight: "bold",
              },
            ],
          },
          {
            type: "text",
            text: `ห้องพักเลขที่ ${invoice.roomNumber}`,
            color: "#FFFFFF",
            size: "xl",
            weight: "bold",
            margin: "sm",
          },
          {
            type: "text",
            text: `ผู้เช่า: ${invoice.tenantName || "ผู้พักอาศัย"}`,
            color: "#D1FAE5",
            size: "xs",
            margin: "xs",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        backgroundColor: "#FFFFFF",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "text",
                text: `เลขที่: ${invoice.invoiceNumber}`,
                size: "xxs",
                color: "#64748B",
              },
              {
                type: "text",
                text: `รอบบิล: ${billingMonth}`,
                size: "xxs",
                color: "#64748B",
                align: "end",
              },
            ],
          },
          {
            type: "separator",
            margin: "md",
            color: "#E2E8F0",
          },
          // Items List
          {
            type: "box",
            layout: "vertical",
            margin: "md",
            contents: itemBoxes,
          },
          {
            type: "separator",
            margin: "lg",
            color: "#CBD5E1",
          },
          // Total Amount Section
          {
            type: "box",
            layout: "horizontal",
            margin: "md",
            contents: [
              {
                type: "text",
                text: "ยอดรวมที่ต้องชำระ",
                size: "sm",
                weight: "bold",
                color: "#0F172A",
                align: "start",
                gravity: "center",
              },
              {
                type: "text",
                text: `฿${invoice.totalAmount.toLocaleString()}`,
                size: "xxl",
                weight: "bold",
                color: "#059669",
                align: "end",
              },
            ],
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "xs",
            contents: [
              {
                type: "text",
                text: `⏰ กำหนดชำระภายใน: ${dueDateStr}`,
                size: "xs",
                color: "#E11D48",
                weight: "bold",
              },
            ],
          },
          // QR Code Image if available
          ...(qrCodeUrl
            ? [
                {
                  type: "separator",
                  margin: "lg",
                  color: "#E2E8F0",
                },
                {
                  type: "box",
                  layout: "vertical",
                  margin: "md",
                  alignItems: "center",
                  contents: [
                    {
                      type: "text",
                      text: "สแกน QR Code พร้อมเพย์ชำระได้ทันที",
                      size: "xs",
                      weight: "bold",
                      color: "#334155",
                      margin: "none",
                    },
                    {
                      type: "text",
                      text: "(ยอดเงินถูกล็อกตามบิล ไม่ต้องระบุยอดเอง)",
                      size: "xxs",
                      color: "#64748B",
                      margin: "xs",
                    },
                    {
                      type: "image",
                      url: qrCodeUrl,
                      size: "lg",
                      aspectRatio: "1:1",
                      margin: "md",
                    },
                  ],
                },
              ]
            : []),
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#F8FAFC",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: "💡 เมื่อโอนเงินแล้ว กรุณาส่งรูปสลิปเข้ามาในช่องแชทนี้ ระบบ AI จะตรวจสอบและออกใบเสร็จให้อัตโนมัติครับ",
            size: "xxs",
            color: "#64748B",
            wrap: true,
            align: "center",
          },
        ],
      },
    },
  };
}

/**
 * 2. สร้าง Flex Message ใบเสร็จรับเงินอิเล็กทรอนิกส์ (e-Receipt) ตอบกลับเมื่อตรวจสลิปผ่าน
 */
export function buildReceiptFlexMessage(
  invoice: Invoice,
  receiptNumber: string,
  paidAmount: number,
  branchName = "พักดี แมนชั่น"
) {
  return {
    type: "flex",
    altText: `✅ ใบเสร็จรับเงิน ${receiptNumber} (ห้อง ${invoice.roomNumber}) - ชำระเงินเรียบร้อยแล้ว`,
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#10B981",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: "✅ บันทึกการรับชำระเงินเรียบร้อยแล้ว",
            color: "#FFFFFF",
            size: "xs",
            weight: "bold",
          },
          {
            type: "text",
            text: `ใบเสร็จรับเงิน ${receiptNumber}`,
            color: "#ECFDF5",
            size: "sm",
            weight: "bold",
            margin: "xs",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "ห้องพัก:", size: "xs", color: "#64748B", flex: 3 },
              { type: "text", text: `ห้อง ${invoice.roomNumber}`, size: "xs", weight: "bold", color: "#0F172A", flex: 7 },
            ],
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "xs",
            contents: [
              { type: "text", text: "ผู้เช่า:", size: "xs", color: "#64748B", flex: 3 },
              { type: "text", text: invoice.tenantName, size: "xs", color: "#0F172A", flex: 7 },
            ],
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "xs",
            contents: [
              { type: "text", text: "ยอดที่ชำระ:", size: "xs", color: "#64748B", flex: 3 },
              { type: "text", text: `฿${paidAmount.toLocaleString()}`, size: "sm", weight: "bold", color: "#10B981", flex: 7 },
            ],
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "xs",
            contents: [
              { type: "text", text: "วันที่ชำระ:", size: "xs", color: "#64748B", flex: 3 },
              { type: "text", text: new Date().toLocaleString("th-TH"), size: "xs", color: "#0F172A", flex: 7 },
            ],
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "xs",
            contents: [
              { type: "text", text: "สถานะ:", size: "xs", color: "#64748B", flex: 3 },
              { type: "text", text: "✓ ชำระครบถ้วน (Paid)", size: "xs", weight: "bold", color: "#059669", flex: 7 },
            ],
          },
          {
            type: "separator",
            margin: "md",
          },
          {
            type: "text",
            text: `ขอบคุณที่ชำระเงินตรงเวลาครับ — ${branchName}`,
            size: "xxs",
            color: "#64748B",
            margin: "md",
            align: "center",
          },
        ],
      },
    },
  };
}

/**
 * 3. สร้าง Flex Message ยืนยันการรับแจ้งซ่อม (Repair Ticket)
 */
export function buildRepairTicketFlexMessage(
  repair: RepairItem,
  branchName = "พักดี แมนชั่น"
) {
  return {
    type: "flex",
    altText: `🔧 รับเรื่องแจ้งซ่อมห้อง ${repair.roomNumber} เรียบร้อยแล้ว (รหัส: ${repair.id})`,
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#2563EB",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: "🔧 บันทึกการแจ้งซ่อมเรียบร้อยแล้ว",
            color: "#FFFFFF",
            size: "xs",
            weight: "bold",
          },
          {
            type: "text",
            text: `รหัสคำขอ: ${repair.id}`,
            color: "#DBEAFE",
            size: "xs",
            margin: "xs",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "ห้องพัก:", size: "xs", color: "#64748B", flex: 3 },
              { type: "text", text: `ห้อง ${repair.roomNumber}`, size: "xs", weight: "bold", color: "#0F172A", flex: 7 },
            ],
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "xs",
            contents: [
              { type: "text", text: "รายการซ่อม:", size: "xs", color: "#64748B", flex: 3 },
              { type: "text", text: repair.title, size: "xs", weight: "bold", color: "#1E293B", flex: 7, wrap: true },
            ],
          },
          ...(repair.description
            ? [
                {
                  type: "box",
                  layout: "horizontal",
                  margin: "xs",
                  contents: [
                    { type: "text", text: "รายละเอียด:", size: "xs", color: "#64748B", flex: 3 },
                    { type: "text", text: repair.description, size: "xs", color: "#475569", flex: 7, wrap: true },
                  ],
                },
              ]
            : []),
          {
            type: "box",
            layout: "horizontal",
            margin: "xs",
            contents: [
              { type: "text", text: "สถานะงาน:", size: "xs", color: "#64748B", flex: 3 },
              { type: "text", text: "⏳ รอช่างเข้าดำเนินการ", size: "xs", weight: "bold", color: "#D97706", flex: 7 },
            ],
          },
          {
            type: "separator",
            margin: "md",
          },
          {
            type: "text",
            text: `ฝ่ายอาคารได้รับเรื่องแล้ว และจะประสานงานช่างติดต่อกลับโดยเร็วครับ — ${branchName}`,
            size: "xxs",
            color: "#64748B",
            margin: "md",
            align: "center",
            wrap: true,
          },
        ],
      },
    },
  };
}

/**
 * 4. สร้าง Flex Message การ์ดต้อนรับและคำแนะนำการใช้งาน
 */
export function buildWelcomeFlexMessage(branchName = "พักดี แมนชั่น") {
  return {
    type: "flex",
    altText: `ยินดีต้อนรับสู่ LINE Official Account ของ ${branchName}`,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#059669",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: "🏢 ยินดีต้อนรับสู่ระบบผู้เช่า",
            color: "#FFFFFF",
            size: "sm",
            weight: "bold",
          },
          {
            type: "text",
            text: branchName,
            color: "#D1FAE5",
            size: "xs",
            margin: "xs",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: "กรุณาผูกบัญชีห้องพักของคุณ เพื่อรับบิลแจ้งหนี้อัตโนมัติทุกเดือน",
            size: "xs",
            color: "#1E293B",
            weight: "bold",
            wrap: true,
          },
          {
            type: "text",
            text: "👉 พิมพ์หมายเลขห้องของคุณ เช่น 'ห้อง 101' หรือ '101' แล้วกดส่งได้เลยครับ",
            size: "xs",
            color: "#059669",
            margin: "md",
            wrap: true,
          },
          {
            type: "separator",
            margin: "md",
          },
          {
            type: "text",
            text: "คำสั่งลัดที่สามารถพิมพ์ถามบอทได้ 24 ชม.:",
            size: "xxs",
            color: "#64748B",
            weight: "bold",
            margin: "md",
          },
          {
            type: "text",
            text: "• 'ขอบิล' หรือ 'เช็คยอด' — ขอดูบิลค่าเช่าและ QR Code\n• 'แจ้งซ่อม [รายละเอียด]' — ส่งเรื่องแจ้งซ่อมเข้าฝ่ายอาคาร\n• 'ส่งรูปสลิป' — แนบสลิปชำระเงินเพื่อออกใบเสร็จ",
            size: "xxs",
            color: "#475569",
            margin: "xs",
            wrap: true,
          },
        ],
      },
    },
  };
}
