/**
 * LINE automatic payment reminders (server only).
 *
 * Runs per branch using the branch's NotificationSettings (branch_settings.notification_settings):
 *  - before:N  → N days before the bill's due date (0 = on the due date)
 *  - overdue:N → N days after the due date, every `remindOverdueEveryDays`, at most `remindOverdueMaxTimes`
 * Only monthly bills (INV-YYYYMM-…) with status unpaid / overdue / partial are reminded.
 * Paid, deferred (ขอค้างชำระ), carried_forward, pending_review and cancelled bills are skipped.
 *
 * Each reminder is recorded in public.line_reminder_logs (docs/supabase_line_reminder_logs.sql)
 * so the same reminder is never sent twice, even if the scheduler runs many times a day.
 * A branch without saved notification settings in the database is never reminded.
 */
import { DatabaseService } from "@/lib/database.service";
import { pushLineMessage } from "@/lib/line/line-client";
import { buildInvoiceFlexMessage } from "@/lib/line/flex-templates";
import { generatePromptPayQRCodeUrl } from "@/lib/promptpay";
import { slipDatabase } from "@/lib/payment-slips-server";
import { toUuid } from "@/lib/supabase-relational";
import type { Invoice, NotificationSettings, Room, Tenant } from "@/types/dormitory";

const TZ = "Asia/Bangkok";

export function bangkokDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d); // YYYY-MM-DD
}

export function bangkokTime(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}

function daysBetween(fromYmd: string, toYmd: string): number {
  const [y1, m1, d1] = fromYmd.slice(0, 10).split("-").map(Number);
  const [y2, m2, d2] = toYmd.slice(0, 10).split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

function thaiShortDate(ymd: string): string {
  const [y, m, d] = ymd.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** Which reminder (if any) is due today for this bill. */
export function reminderKindForToday(invoice: Invoice, ns: NotificationSettings, today: string): string | null {
  if (!/^INV-\d{6}-/.test(invoice.invoiceNumber || "")) return null;
  if (!["unpaid", "overdue", "partial"].includes(invoice.status)) return null;
  if (!invoice.dueDate || !/^\d{4}-\d{2}-\d{2}/.test(invoice.dueDate)) return null;
  const daysToDue = daysBetween(today, invoice.dueDate);
  if (daysToDue >= 0) {
    if (ns.remindBeforeEnabled && (ns.remindBeforeDays || []).includes(daysToDue)) return `before:${daysToDue}`;
    return null;
  }
  const late = -daysToDue;
  const every = Math.max(1, Number(ns.remindOverdueEveryDays) || 1);
  const max = Math.max(1, Number(ns.remindOverdueMaxTimes) || 1);
  if (ns.remindOverdueEnabled && late % every === 0 && late / every <= max) return `overdue:${late}`;
  return null;
}

export function resolveLineUserId(inv: Invoice, rooms: Room[], tenants: Tenant[]): string {
  const isLineId = (v?: string) => Boolean(v && /^U[0-9a-f]{32}$/i.test(v));
  const pick = (t?: Partial<Tenant> | null) =>
    t ? (isLineId(t.lineUserId) ? t.lineUserId! : isLineId(t.lineId) ? t.lineId! : "") : "";
  const byId = inv.tenantId ? tenants.find((t) => t.id === inv.tenantId) : undefined;
  const room = rooms.find((r) => r.roomNumber === inv.roomNumber);
  const byName = tenants.find((t) => t.fullName === inv.tenantName && (t.roomNumber === inv.roomNumber || !t.roomNumber));
  const byRoom = tenants.find((t) => t.roomNumber === inv.roomNumber);
  return pick(byId) || pick(room?.currentTenant) || pick(byName) || pick(byRoom);
}

export interface ReminderItem {
  propertyId: string;
  branchName: string;
  invoiceNumber: string;
  roomNumber: string;
  tenantName: string;
  dueDate: string;
  kind: string;
  amount: number;
  hasLine: boolean;
  status?: "sent" | "failed" | "no_line" | "already_sent" | "simulated";
  error?: string;
}

export interface ReminderRunResult {
  today: string;
  time: string;
  items: ReminderItem[];
  skippedBranches: { propertyId: string; reason: string }[];
}

/**
 * @param opts.propertyId  limit to one branch
 * @param opts.dryRun      only list what would be sent (no LINE push, no log)
 * @param opts.ignoreTime  send even if the branch's send time has not been reached yet (manual "send now")
 */
export async function runLineReminders(opts: { propertyId?: string; dryRun?: boolean; ignoreTime?: boolean } = {}): Promise<ReminderRunResult> {
  const now = new Date();
  const today = bangkokDate(now);
  const time = bangkokTime(now);
  const result: ReminderRunResult = { today, time, items: [], skippedBranches: [] };

  const db = slipDatabase();
  const { data: settingRows, error: settingsError } = await db
    .from("branch_settings")
    .select("property_id,notification_settings");
  if (settingsError) {
    throw new Error(`โหลดการตั้งค่าแจ้งเตือนไม่สำเร็จ (รัน docs/supabase_branch_notification_settings.sql แล้วหรือยัง): ${settingsError.message}`);
  }

  await DatabaseService.init();
  const branches = await DatabaseService.getAllProperties();

  for (const branch of branches) {
    if (opts.propertyId && branch.id !== opts.propertyId) continue;
    const row = (settingRows || []).find((r: any) => String(r.property_id) === toUuid(branch.id) || String(r.property_id) === branch.id);
    const ns = row?.notification_settings as NotificationSettings | null | undefined;
    if (!ns || typeof ns !== "object") {
      result.skippedBranches.push({ propertyId: branch.id, reason: "ยังไม่ได้บันทึกการตั้งค่าแจ้งเตือน" });
      continue;
    }
    if (!opts.ignoreTime && time < (ns.sendTime || "09:00")) {
      result.skippedBranches.push({ propertyId: branch.id, reason: `ยังไม่ถึงเวลาส่ง ${ns.sendTime}` });
      continue;
    }

    const property = await DatabaseService.getProperty(branch.id);
    const settings = await DatabaseService.getBranchSettings(property, branch.id);
    const token = settings?.lineChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
    const promptpay = settings?.promptpayNumber || property?.promptpayNumber || "";
    const lateFeePerDay = Number(settings?.lateFeePerDay) || 0;
    const branchName = settings?.branchName || property?.name || "";

    const [invoices, rooms, tenants] = await Promise.all([
      DatabaseService.getInvoices(branch.id),
      DatabaseService.getRooms(branch.id),
      DatabaseService.getTenants(),
    ]);

    const due = invoices
      .map((inv) => ({ inv, kind: reminderKindForToday(inv, ns, today) }))
      .filter((x): x is { inv: Invoice; kind: string } => Boolean(x.kind));
    if (due.length === 0) continue;

    // Already sent (or tenant had no LINE) → never send again. Failed ones are retried.
    const { data: logged, error: logReadError } = await db
      .from("line_reminder_logs")
      .select("invoice_number,due_date,kind,status")
      .eq("property_id", branch.id)
      .in("invoice_number", due.map((d) => d.inv.invoiceNumber));
    if (logReadError && !opts.dryRun) {
      // Without the log table we cannot tell what was already sent → do not send (would repeat every run)
      result.skippedBranches.push({
        propertyId: branch.id,
        reason: `อ่านประวัติการส่งไม่ได้ (รัน docs/supabase_line_reminder_logs.sql แล้วหรือยัง): ${logReadError.message}`,
      });
      continue;
    }
    const done = new Set(
      (logged || [])
        .filter((l: any) => l.status === "sent" || l.status === "no_line")
        .map((l: any) => `${l.invoice_number}|${String(l.due_date).slice(0, 10)}|${l.kind}`)
    );

    for (const { inv, kind } of due) {
      const lineUserId = resolveLineUserId(inv, rooms, tenants);
      const owed = inv.status === "partial" ? Number(inv.remainingAmount ?? inv.totalAmount) : Number(inv.totalAmount) || 0;
      const item: ReminderItem = {
        propertyId: branch.id,
        branchName,
        invoiceNumber: inv.invoiceNumber,
        roomNumber: inv.roomNumber,
        tenantName: inv.tenantName,
        dueDate: inv.dueDate.slice(0, 10),
        kind,
        amount: owed,
        hasLine: Boolean(lineUserId),
      };
      if (done.has(`${inv.invoiceNumber}|${item.dueDate}|${kind}`)) {
        item.status = "already_sent";
        result.items.push(item);
        continue;
      }
      if (opts.dryRun) {
        result.items.push(item);
        continue;
      }

      let status: "sent" | "failed" | "no_line" = "no_line";
      let error: string | undefined;
      if (lineUserId) {
        const [k, nStr] = kind.split(":");
        const n = Number(nStr);
        const lines =
          k === "before"
            ? [
                `🔔 แจ้งเตือนค่าเช่า ${branchName}`.trim(),
                `ห้อง ${inv.roomNumber} ยอดชำระ ฿${owed.toLocaleString()}`,
                n === 0
                  ? `วันนี้ (${thaiShortDate(inv.dueDate)}) ครบกำหนดชำระ`
                  : `ครบกำหนดชำระ ${thaiShortDate(inv.dueDate)} (อีก ${n} วัน)`,
                "ชำระแล้วส่งสลิปในแชทนี้ได้เลย ขอบคุณค่ะ",
              ]
            : [
                `⚠️ แจ้งเตือนค้างชำระ ${branchName}`.trim(),
                `ห้อง ${inv.roomNumber} ยอดชำระ ฿${owed.toLocaleString()}`,
                `เลยกำหนดชำระ (${thaiShortDate(inv.dueDate)}) มาแล้ว ${n} วัน`,
                ...(lateFeePerDay > 0 ? [`ค่าปรับสะสม ฿${(n * lateFeePerDay).toLocaleString()} (วันละ ฿${lateFeePerDay})`] : []),
                "กรุณาชำระโดยเร็ว หากชำระแล้วส่งสลิปในแชทนี้ได้เลย",
              ];
        let qr = "";
        try {
          qr = promptpay ? generatePromptPayQRCodeUrl(promptpay, owed) : "";
        } catch {}
        const res = await pushLineMessage(token, lineUserId, [
          { type: "text", text: lines.join("\n") },
          buildInvoiceFlexMessage(inv, property, settings, qr),
        ]);
        if (res.isSimulated) {
          item.status = "simulated";
          item.error = "ยังไม่ได้ตั้งค่า LINE Channel Access Token";
          result.items.push(item);
          continue;
        }
        status = res.success ? "sent" : "failed";
        error = res.success ? undefined : String(res.error || "LINE push failed").slice(0, 500);
      }

      item.status = status;
      item.error = error;
      result.items.push(item);
      const { error: logError } = await db.from("line_reminder_logs").upsert(
        {
          property_id: branch.id,
          invoice_number: inv.invoiceNumber,
          room_number: inv.roomNumber,
          due_date: item.dueDate,
          kind,
          status,
          error: error || null,
          sent_at: new Date().toISOString(),
        },
        { onConflict: "property_id,invoice_number,due_date,kind" }
      );
      if (logError) {
        console.error("[LINE-REMINDERS] Could not write log (run docs/supabase_line_reminder_logs.sql):", logError.message);
      }
    }
  }

  return result;
}

export async function listReminderLogs(propertyId: string, limit = 50) {
  const db = slipDatabase();
  const { data, error } = await db
    .from("line_reminder_logs")
    .select("invoice_number,room_number,due_date,kind,status,error,sent_at")
    .eq("property_id", propertyId)
    .order("sent_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`โหลดประวัติการแจ้งเตือนไม่สำเร็จ (รัน docs/supabase_line_reminder_logs.sql แล้วหรือยัง): ${error.message}`);
  return data || [];
}

/**
 * Send one TEST reminder to a room's tenant right now (manual button in settings).
 * Uses the room's latest unpaid monthly bill if there is one; not written to line_reminder_logs,
 * so it never blocks the real reminder later.
 */
export async function sendTestReminder(propertyId: string, roomNumber: string): Promise<{ success: boolean; message: string }> {
  await DatabaseService.init();
  const property = await DatabaseService.getProperty(propertyId);
  const settings = await DatabaseService.getBranchSettings(property, propertyId);
  const token = settings?.lineChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
  if (!token) return { success: false, message: "ยังไม่ได้ตั้งค่า LINE Channel Access Token" };
  const branchName = settings?.branchName || property?.name || "";
  const promptpay = settings?.promptpayNumber || property?.promptpayNumber || "";

  const [invoices, rooms, tenants] = await Promise.all([
    DatabaseService.getInvoices(propertyId),
    DatabaseService.getRooms(propertyId),
    DatabaseService.getTenants(),
  ]);
  const bill = invoices
    .filter((inv) => inv.roomNumber === roomNumber && /^INV-\d{6}-/.test(inv.invoiceNumber) && ["unpaid", "overdue", "partial"].includes(inv.status))
    .sort((a, b) => String(b.id).localeCompare(String(a.id), undefined, { numeric: true }))[0];
  const room = rooms.find((r) => r.roomNumber === roomNumber);
  const lineUserId = bill
    ? resolveLineUserId(bill, rooms, tenants)
    : resolveLineUserId({ roomNumber, tenantName: room?.currentTenant?.fullName || "", invoiceNumber: "", tenantId: room?.currentTenant?.id } as Invoice, rooms, tenants);
  if (!lineUserId) return { success: false, message: `ผู้เช่าห้อง ${roomNumber} ยังไม่ได้ผูก LINE` };

  const messages: any[] = [];
  if (bill) {
    const owed = bill.status === "partial" ? Number(bill.remainingAmount ?? bill.totalAmount) : Number(bill.totalAmount) || 0;
    const daysToDue = daysBetween(bangkokDate(), bill.dueDate);
    messages.push({
      type: "text",
      text: [
        `🧪 [ทดสอบระบบแจ้งเตือน] ${branchName}`.trim(),
        `ห้อง ${roomNumber} ยอดชำระ ฿${owed.toLocaleString()}`,
        daysToDue >= 0
          ? `ครบกำหนดชำระ ${thaiShortDate(bill.dueDate)} (อีก ${daysToDue} วัน)`
          : `เลยกำหนดชำระ (${thaiShortDate(bill.dueDate)}) มาแล้ว ${-daysToDue} วัน`,
      ].join("\n"),
    });
    let qr = "";
    try {
      qr = promptpay ? generatePromptPayQRCodeUrl(promptpay, owed) : "";
    } catch {}
    messages.push(buildInvoiceFlexMessage(bill, property, settings, qr));
  } else {
    messages.push({
      type: "text",
      text: `🧪 [ทดสอบระบบแจ้งเตือน] ${branchName}\nห้อง ${roomNumber} ตอนนี้ไม่มีบิลค้างชำระ ระบบแจ้งเตือนทำงานปกติ`.trim(),
    });
  }

  const res = await pushLineMessage(token, lineUserId, messages);
  if (!res.success) return { success: false, message: `ส่งไม่สำเร็จ: ${String(res.error || "").slice(0, 300)}` };
  return {
    success: true,
    message: bill
      ? `ส่งข้อความทดสอบพร้อมบิล ${bill.invoiceNumber} ไปที่ LINE ห้อง ${roomNumber} แล้ว`
      : `ส่งข้อความทดสอบไปที่ LINE ห้อง ${roomNumber} แล้ว (ห้องนี้ไม่มีบิลค้าง)`,
  };
}
