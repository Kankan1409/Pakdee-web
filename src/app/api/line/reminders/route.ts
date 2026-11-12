import { NextRequest, NextResponse } from "next/server";
import { authorizeSlipRequest, SlipError } from "@/lib/payment-slips-server";
import { listReminderLogs, runLineReminders, sendTestReminder } from "@/lib/line/reminders";

export const runtime = "nodejs";
const privateHeaders = { "Cache-Control": "private, no-store" };

/**
 * POST /api/line/reminders?propertyId=P0001&action=preview|run|logs
 *  - preview: list today's reminders for this branch (nothing is sent)
 *  - run:     send today's reminders for this branch now (ignores the send time; never repeats a sent one)
 *  - logs:    latest reminder history of this branch
 *  - test:    send one test reminder to &roomNumber= now (not logged)
 * Uses the same owner/manager account check as /api/payment-slips.
 */
export async function POST(request: NextRequest) {
  try {
    const propertyId = request.nextUrl.searchParams.get("propertyId") || "";
    const action = request.nextUrl.searchParams.get("action") || "preview";
    await authorizeSlipRequest(request, propertyId);

    if (action === "test") {
      const roomNumber = request.nextUrl.searchParams.get("roomNumber") || "";
      if (!roomNumber) throw new SlipError("กรุณาเลือกห้อง");
      const result = await sendTestReminder(propertyId, roomNumber);
      return NextResponse.json(result, { status: result.success ? 200 : 400, headers: privateHeaders });
    }
    if (action === "logs") {
      return NextResponse.json({ logs: await listReminderLogs(propertyId) }, { headers: privateHeaders });
    }
    if (action === "preview" || action === "run") {
      const result = await runLineReminders({ propertyId, dryRun: action === "preview", ignoreTime: true });
      return NextResponse.json(result, { headers: privateHeaders });
    }
    throw new SlipError("คำขอไม่ถูกต้อง");
  } catch (error: any) {
    const status = error instanceof SlipError ? error.status : 500;
    return NextResponse.json({ error: error?.message || "ดำเนินการไม่สำเร็จ" }, { status, headers: privateHeaders });
  }
}
