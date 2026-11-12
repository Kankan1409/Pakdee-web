import { DatabaseService } from "@/lib/database.service";
import { buildReceiptFlexMessage, getDefaultQuickReply } from "@/lib/line/flex-templates";
import { LineDeliveryResult, replyOrPushLineMessages } from "@/lib/line/line-client";
import { toUuid } from "@/lib/supabase-relational";
import { BranchSettingsDetail, Invoice, Property, Room, Tenant } from "@/types/dormitory";

export function formatReceiptNumber(invoiceNumber?: string): string {
  const normalized = String(invoiceNumber || "").replace(/^INV-/i, "").trim();
  return `REC-${normalized || Date.now()}`;
}

export function findTenantLineUserId(
  tenants: Tenant[],
  rooms: Room[],
  roomNumber?: string
): string | undefined {
  const target = (roomNumber || "").trim();
  if (!target) return undefined;

  const exactRoom = rooms.find((r) => r.roomNumber.trim().toLowerCase() === target.toLowerCase()) ||
    rooms.find((r) => DatabaseService.isRoomNumberMatch(r.roomNumber, target));

  const matchedTenant =
    tenants.find((t) => exactRoom?.currentTenant?.id && t.id === exactRoom.currentTenant.id) ||
    tenants.find((t) => (t.roomNumber || "").trim().toLowerCase() === target.toLowerCase()) ||
    tenants.find((t) => DatabaseService.isRoomNumberMatch(t.roomNumber || "", target));

  const candidate =
    matchedTenant?.lineUserId ||
    exactRoom?.currentTenant?.lineUserId ||
    matchedTenant?.lineId ||
    exactRoom?.currentTenant?.lineId;
  const trimmed = candidate?.trim();
  return trimmed && trimmed.startsWith("U") ? trimmed : undefined;
}

export function buildReceiptMessages(
  invoice: Invoice,
  paidAmount: number,
  branchName: string,
  introText?: string
): any[] {
  const receiptNumber = formatReceiptNumber(invoice.invoiceNumber);
  const text =
    introText?.trim() ||
    `✅ ชำระเงินเรียบร้อยแล้ว บิล ${invoice.invoiceNumber} (ห้อง ${invoice.roomNumber})\nยอดรับชำระ ฿${Number(paidAmount || 0).toLocaleString("th-TH")} ขอบคุณครับ 🙏`;
  return [
    {
      type: "text",
      text,
      quickReply: getDefaultQuickReply(),
    },
    buildReceiptFlexMessage(
      { ...invoice, paidAmount, status: "paid" },
      receiptNumber,
      paidAmount,
      branchName
    ),
  ];
}

export async function pushReceiptToTenantLine(options: {
  propertyId: string;
  invoice?: Invoice | null;
  invoiceIdOrNumber?: string;
  paidAmount?: number;
  introText?: string;
  recipientUserId?: string;
  property?: Property | null;
  settings?: BranchSettingsDetail | null;
}): Promise<{
  notified: boolean;
  recipient?: string;
  method?: LineDeliveryResult["method"];
  statusCode?: number;
  error?: string;
  reason?: string;
}> {
  if (!options.invoice && !DatabaseService.isServerSynced()) {
    await DatabaseService.init();
  }
  const property = options.property ?? (await DatabaseService.getProperty(options.propertyId));
  const settings =
    options.settings ?? (await DatabaseService.getBranchSettings(property, options.propertyId));
  const channelAccessToken =
    settings?.lineChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
  const branchName = settings?.branchName || property?.name || "พักดี แมนชั่น";

  let invoice = options.invoice || null;
  if (!invoice && options.invoiceIdOrNumber) {
    const allInvoices = await DatabaseService.getInvoices(options.propertyId);
    const key = options.invoiceIdOrNumber;
    invoice =
      allInvoices.find(
        (i) => i.id === key || toUuid(i.id) === toUuid(key) || i.invoiceNumber === key
      ) || null;
  }
  if (!invoice) {
    return { notified: false, reason: "invoice_not_found", error: "Invoice not found" };
  }

  let recipientUserId = options.recipientUserId?.trim();
  if (!recipientUserId) {
    const [allTenants, allRooms] = await Promise.all([
      DatabaseService.getTenants(options.propertyId),
      DatabaseService.getRooms(options.propertyId),
    ]);
    recipientUserId = findTenantLineUserId(allTenants, allRooms, invoice.roomNumber);
  }
  if (!recipientUserId || !recipientUserId.startsWith("U")) {
    return {
      notified: false,
      reason: "line_not_linked",
      error: `ผู้เช่าห้อง ${invoice.roomNumber} ยังไม่ได้ผูกบัญชี LINE`,
    };
  }

  const amount = options.paidAmount ?? invoice.paidAmount ?? invoice.totalAmount;
  const messages = buildReceiptMessages(invoice, amount, branchName, options.introText);
  const delivery = await replyOrPushLineMessages(
    channelAccessToken,
    undefined,
    recipientUserId,
    messages
  );

  return {
    notified: delivery.success,
    recipient: recipientUserId,
    method: delivery.method,
    statusCode: delivery.statusCode,
    error: delivery.error,
  };
}
