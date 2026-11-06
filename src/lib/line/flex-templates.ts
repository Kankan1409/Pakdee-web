/**
 * PAKDEE SYSTEM - LINE FLEX MESSAGE TEMPLATES
 * เทมเพลตข้อความแบบตอบกลับอัตโนมัติและการ์ดใบแจ้งหนี้แบบ Bento สวยงามตามมาตรฐาน LINE Flex Message
 */

import { Invoice, Property, RepairItem, BranchSettingsDetail } from "@/types/dormitory";
import { formatCurrency, formatDateThai } from "@/lib/utils";

/**
 * 1. สร้าง Flex Message การ์ดใบแจ้งหนี้แบบ 1:1 ถอดแบบจาก Template ใบแจ้งหนี้หน้าเว็บ (Invoice Modal)
 */
export function buildInvoiceFlexMessage(
  invoice: Invoice,
  property?: Property | null,
  branchSettings?: BranchSettingsDetail | null,
  qrCodeUrl?: string
) {
  const branchName = branchSettings?.branchName || property?.name || "วิภาวรรณ 1";
  const branchAddress = branchSettings?.address || property?.address || "";
  const branchPhone = branchSettings?.phone || property?.phone || "";
  const promptpayNumber = branchSettings?.promptpayNumber || property?.promptpayNumber || "0854625145";
  const promptpayName = branchSettings?.promptpayName || property?.promptpayName || branchName;
  const dueDateStr = invoice.dueDate || "2026-11-05";
  const billingDateStr = invoice.billingDate || "2026-11-25";
  const tenantPhone = invoice.tenantPhone || "-";
  const buildingName = (property as any)?.buildingName || "อาคาร A";

  // Build items rows (4 คอลัมน์เหมือนหน้าเว็บ: รายการ | หน่วยที่ใช้ | ราคา/หน่วย | จำนวนเงิน)
  const itemRows = invoice.items.map((item) => {
    const itemName = item.name || (item as any).description || "รายการ";
    const unitsStr = item.units !== undefined && item.units !== null ? `${item.units}` : "-";
    const rateVal = item.rate ?? (item as any).ratePerUnit;
    const rateStr = rateVal !== undefined && rateVal > 0 ? Number(rateVal).toFixed(2) : "-";
    const amountStr = item.amount.toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return {
      type: "box",
      layout: "horizontal",
      margin: "sm",
      contents: [
        {
          type: "text",
          text: itemName,
          size: "xxs",
          color: "#334155",
          flex: 5,
          wrap: true,
        },
        {
          type: "text",
          text: unitsStr,
          size: "xxs",
          color: "#64748B",
          flex: 2,
          align: "center",
        },
        {
          type: "text",
          text: rateStr,
          size: "xxs",
          color: "#64748B",
          flex: 2,
          align: "end",
        },
        {
          type: "text",
          text: amountStr,
          size: "xxs",
          color: "#0F172A",
          weight: "bold",
          flex: 3,
          align: "end",
        },
      ],
    };
  });

  return {
    type: "flex",
    altText: `🏢 ใบแจ้งหนี้ห้อง ${invoice.roomNumber} (${formatCurrency(invoice.totalAmount)}) - ${branchName}`,
    contents: {
      type: "bubble",
      size: "giga",
      body: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#FFFFFF",
        paddingAll: "16px",
        contents: [
          // 1. Header (เหมือนหน้าเว็บ: ชื่อหอพัก ที่อยู่ เบอร์โทร ซ้าย / ป้าย INVOICE เลขที่ วันที่ ขวา)
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "box",
                layout: "vertical",
                flex: 6,
                contents: [
                  {
                    type: "text",
                    text: `🏢 ${branchName}`,
                    weight: "bold",
                    size: "md",
                    color: "#0F172A",
                    wrap: true,
                  },
                  ...(branchAddress
                    ? [
                        {
                          type: "text",
                          text: branchAddress,
                          size: "xxs",
                          color: "#64748B",
                          wrap: true,
                          margin: "xs",
                        },
                      ]
                    : []),
                  ...(branchPhone
                    ? [
                        {
                          type: "text",
                          text: `โทร: ${branchPhone}`,
                          size: "xxs",
                          color: "#64748B",
                          margin: "xs",
                        },
                      ]
                    : []),
                ],
              },
              {
                type: "box",
                layout: "vertical",
                flex: 5,
                alignItems: "flex-end",
                contents: [
                  {
                    type: "box",
                    layout: "horizontal",
                    backgroundColor: "#0F172A",
                    cornerRadius: "sm",
                    paddingStart: "8px",
                    paddingEnd: "8px",
                    paddingTop: "3px",
                    paddingBottom: "3px",
                    contents: [
                      {
                        type: "text",
                        text: "ใบแจ้งหนี้ / INVOICE",
                        color: "#FFFFFF",
                        size: "xxs",
                        weight: "bold",
                      },
                    ],
                  },
                  {
                    type: "text",
                    text: `เลขที่: ${invoice.invoiceNumber}`,
                    size: "xxs",
                    color: "#64748B",
                    margin: "xs",
                    align: "end",
                  },
                  {
                    type: "text",
                    text: `วันที่ออก: ${billingDateStr}`,
                    size: "xxs",
                    color: "#64748B",
                    align: "end",
                  },
                  {
                    type: "text",
                    text: `กำหนดชำระ: ${dueDateStr}`,
                    size: "xxs",
                    weight: "bold",
                    color: "#DC2626",
                    align: "end",
                  },
                ],
              },
            ],
          },
          {
            type: "separator",
            margin: "md",
            color: "#E2E8F0",
          },

          // 2. Tenant Box (กรอบข้อมูลผู้เช่า - เหมือนในเว็บ)
          {
            type: "box",
            layout: "horizontal",
            backgroundColor: "#F8FAFC",
            cornerRadius: "md",
            borderColor: "#E2E8F0",
            borderWidth: "light",
            paddingAll: "10px",
            margin: "md",
            contents: [
              {
                type: "box",
                layout: "vertical",
                flex: 6,
                contents: [
                  {
                    type: "box",
                    layout: "horizontal",
                    contents: [
                      {
                        type: "text",
                        text: "ผู้เช่า: ",
                        size: "xs",
                        color: "#64748B",
                        flex: 0,
                      },
                      {
                        type: "text",
                        text: invoice.tenantName || "ผู้พักอาศัย",
                        size: "xs",
                        weight: "bold",
                        color: "#0F172A",
                        wrap: true,
                      },
                    ],
                  },
                  {
                    type: "text",
                    text: `เบอร์โทร: ${tenantPhone}`,
                    size: "xxs",
                    color: "#64748B",
                    margin: "xs",
                  },
                ],
              },
              {
                type: "box",
                layout: "vertical",
                flex: 4,
                alignItems: "flex-end",
                contents: [
                  {
                    type: "box",
                    layout: "horizontal",
                    contents: [
                      {
                        type: "text",
                        text: "ห้องพัก: ",
                        size: "xs",
                        color: "#64748B",
                        flex: 0,
                      },
                      {
                        type: "text",
                        text: invoice.roomNumber,
                        size: "sm",
                        weight: "bold",
                        color: "#047857",
                      },
                    ],
                  },
                  {
                    type: "text",
                    text: buildingName,
                    size: "xxs",
                    color: "#64748B",
                    margin: "xs",
                    align: "end",
                  },
                ],
              },
            ],
          },

          // 3. Table Header (4 คอลัมน์)
          {
            type: "box",
            layout: "horizontal",
            margin: "md",
            contents: [
              {
                type: "text",
                text: "รายการ",
                size: "xxs",
                weight: "bold",
                color: "#475569",
                flex: 5,
              },
              {
                type: "text",
                text: "หน่วยที่ใช้",
                size: "xxs",
                weight: "bold",
                color: "#475569",
                flex: 2,
                align: "center",
              },
              {
                type: "text",
                text: "ราคา/หน่วย",
                size: "xxs",
                weight: "bold",
                color: "#475569",
                flex: 2,
                align: "end",
              },
              {
                type: "text",
                text: "จำนวนเงิน (บาท)",
                size: "xxs",
                weight: "bold",
                color: "#475569",
                flex: 3,
                align: "end",
              },
            ],
          },
          {
            type: "separator",
            margin: "xs",
            color: "#CBD5E1",
          },

          // 4. Table Rows
          ...itemRows,

          {
            type: "separator",
            margin: "md",
            color: "#CBD5E1",
          },

          // 5. Total Row (ยอดรวมทั้งสิ้น)
          {
            type: "box",
            layout: "horizontal",
            margin: "md",
            contents: [
              {
                type: "text",
                text: "ยอดรวมทั้งสิ้นที่ต้องชำระ:",
                size: "xs",
                weight: "bold",
                color: "#0F172A",
                flex: 6,
                gravity: "center",
              },
              {
                type: "text",
                text: `฿${invoice.totalAmount.toLocaleString("th-TH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`,
                size: "md",
                weight: "bold",
                color: "#047857",
                flex: 6,
                align: "end",
              },
            ],
          },

          // 6. PromptPay QR Code Box (กล่องรับชำระเงินสีเขียวอ่อนเหมือนหน้าเว็บ)
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#ECFDF5",
            cornerRadius: "lg",
            borderColor: "#A7F3D0",
            borderWidth: "light",
            paddingAll: "12px",
            margin: "md",
            contents: [
              ...(qrCodeUrl && qrCodeUrl.startsWith("https://")
                ? [
                    {
                      type: "box",
                      layout: "vertical",
                      alignItems: "center",
                      contents: [
                        {
                          type: "image",
                          url: qrCodeUrl,
                          size: "lg",
                          aspectRatio: "1:1",
                        },
                        {
                          type: "text",
                          text: `พร้อมเพย์: ${promptpayNumber}`,
                          size: "xxs",
                          weight: "bold",
                          color: "#334155",
                          align: "center",
                          margin: "xs",
                        },
                      ],
                    },
                    {
                      type: "separator",
                      margin: "sm",
                      color: "#A7F3D0",
                    },
                  ]
                : []),
              {
                type: "text",
                text: "📲 สแกน QR ชำระเงินผ่าน Mobile Banking",
                size: "xs",
                weight: "bold",
                color: "#065F46",
                margin: "xs",
              },
              {
                type: "text",
                text: "• ธนาคาร: พร้อมเพย์ (PromptPay)",
                size: "xxs",
                color: "#047857",
                margin: "xs",
              },
              {
                type: "text",
                text: `• ชื่อบัญชี: ${promptpayName}`,
                size: "xxs",
                color: "#047857",
                margin: "xs",
              },
              {
                type: "text",
                text: `• ยอดชำระ: ฿${invoice.totalAmount.toLocaleString("th-TH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`,
                size: "xs",
                weight: "bold",
                color: "#065F46",
                margin: "xs",
              },
              {
                type: "text",
                text: "⚠️ เมื่อโอนแล้ว ระบบจะตรวจสลิปและปรับสถานะอัตโนมัติ",
                size: "xxs",
                weight: "bold",
                color: "#DC2626",
                margin: "xs",
                wrap: true,
              },
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#F8FAFC",
        paddingAll: "10px",
        contents: [
          {
            type: "text",
            text: "💡 เมื่อโอนเงินแล้ว กรุณาส่งรูปสลิปเข้ามาในช่องแชทนี้ ระบบ AI จะตรวจสอบและบันทึกใบเสร็จให้อัตโนมัติครับ",
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

/**
 * 5. สร้าง Flex Message สำหรับประกาศข่าวสาร Broadcast ประจำหอพัก
 */
export function buildBroadcastFlexMessage(
  title: string,
  message: string,
  template: "power" | "water" | "maintenance" | "general" = "general",
  branchName: string = "พักดี แมนชั่น",
  targetInfo: string = "ผู้พักอาศัยทุกท่าน",
  branchPhone?: string
) {
  const config = {
    power: {
      badgeText: "⚡ ประกาศตัดกระแสไฟฟ้าชั่วคราว",
      badgeColor: "#D97706",
      badgeBg: "#FEF3C7",
      headerBg: "#FFFBEB",
      themeColor: "#B45309",
    },
    water: {
      badgeText: "💧 ประกาศปิดวาล์วน้ำประปาชั่วคราว",
      badgeColor: "#0284C7",
      badgeBg: "#E0F2FE",
      headerBg: "#F0F9FF",
      themeColor: "#0369A1",
    },
    maintenance: {
      badgeText: "🔧 ประกาศงานซ่อมบำรุง / ฉีดพ่นยา",
      badgeColor: "#E11D48",
      badgeBg: "#FFE4E6",
      headerBg: "#FFF1F2",
      themeColor: "#BE123C",
    },
    general: {
      badgeText: "📢 ประกาศทั่วไปจากฝ่ายจัดการหอพัก",
      badgeColor: "#059669",
      badgeBg: "#D1FAE5",
      headerBg: "#ECFDF5",
      themeColor: "#047857",
    },
  }[template] || {
    badgeText: "📢 ประกาศจากฝ่ายจัดการหอพัก",
    badgeColor: "#059669",
    badgeBg: "#D1FAE5",
    headerBg: "#ECFDF5",
    themeColor: "#047857",
  };

  const nowFormatted = new Date().toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return {
    type: "flex",
    altText: `📢 ${title} - ${branchName}`,
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: config.headerBg,
        paddingAll: "16px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "box",
                layout: "vertical",
                backgroundColor: config.badgeBg,
                cornerRadius: "8px",
                paddingStart: "8px",
                paddingEnd: "8px",
                paddingTop: "3px",
                paddingBottom: "3px",
                contents: [
                  {
                    type: "text",
                    text: config.badgeText,
                    size: "xxs",
                    color: config.badgeColor,
                    weight: "bold",
                  },
                ],
              },
              {
                type: "text",
                text: branchName,
                size: "xxs",
                color: "#64748B",
                align: "end",
                gravity: "center",
              },
            ],
          },
          {
            type: "text",
            text: title,
            size: "md",
            weight: "bold",
            color: "#0F172A",
            margin: "md",
            wrap: true,
          },
          {
            type: "text",
            text: `วันที่ประกาศ: ${nowFormatted} • ถึง: ${targetInfo}`,
            size: "xxs",
            color: "#64748B",
            margin: "xs",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#FFFFFF",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: message,
            size: "xs",
            color: "#334155",
            wrap: true,
            lineSpacing: "5px",
          },
          {
            type: "separator",
            margin: "lg",
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "md",
            contents: [
              {
                type: "text",
                text: "🏢 ฝ่ายนิติบุคคลและบริหารอาคาร",
                size: "xxs",
                color: "#64748B",
                flex: 1,
              },
              {
                type: "text",
                text: branchPhone ? `โทร: ${branchPhone}` : "ติดต่อสอบถามผ่าน LINE ได้ 24 ชม.",
                size: "xxs",
                color: config.themeColor,
                weight: "bold",
                align: "end",
                flex: 1,
              },
            ],
          },
        ],
      },
    },
  };
}

/**
 * 6. Quick Reply Buttons ลอยด้านล่างห้องแชท ให้ผู้เช่ากดเลือกได้สะดวก
 */
export function getDefaultQuickReply() {
  return {
    items: [
      {
        type: "action",
        action: {
          type: "message",
          label: "📄 ขอบิล / QR จ่าย",
          text: "ขอบิล",
        },
      },
      {
        type: "action",
        action: {
          type: "message",
          label: "🔧 แจ้งซ่อมด่วน",
          text: "แจ้งซ่อม",
        },
      },
      {
        type: "action",
        action: {
          type: "message",
          label: "🏢 ติดต่อสำนักงาน",
          text: "ติดต่อ",
        },
      },
      {
        type: "action",
        action: {
          type: "message",
          label: "📜 กฎระเบียบหอ",
          text: "กฎระเบียบ",
        },
      },
    ],
  };
}
