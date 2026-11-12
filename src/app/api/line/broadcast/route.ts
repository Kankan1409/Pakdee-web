import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/database.service";
import {
  multicastLineMessage,
} from "@/lib/line/line-client";
import { buildBroadcastFlexMessage } from "@/lib/line/flex-templates";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      title,
      message,
      template = "general",
      targetType = "all",
      targetValue,
      propertyId,
    } = body;

    if (!title || !title.trim() || !message || !message.trim()) {
      return NextResponse.json(
        { error: "กรุณาระบุหัวข้อและเนื้อหาข้อความประกาศ" },
        { status: 400 }
      );
    }

    await DatabaseService.initCoreOnly();
    const activePropId = propertyId || DatabaseService.getActivePropertyId() || "prop-1";
    const property = await DatabaseService.getProperty(activePropId);
    const settings = await DatabaseService.getBranchSettings(property, activePropId);

    const channelAccessToken = settings?.lineChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
    const branchName = settings?.branchName || property?.name || "หอพัก";
    const branchPhone = settings?.phone || property?.phone || "";

    // 1. ค้นหาผู้เช่าที่เกี่ยวข้องเพื่อคำนวณผู้รับ
    const allRooms = await DatabaseService.getRooms(activePropId);
    const allTenants = await DatabaseService.getTenants(activePropId);

    let targetRooms = allRooms.filter((r) =>
      r.currentTenant && ["occupied", "overdue", "daily"].includes(r.status)
    );
    let targetInfo = "ผู้พักอาศัยทุกท่าน";

    if (targetType === "floor" && targetValue) {
      const floorStr = String(targetValue);
      targetRooms = targetRooms.filter((r) => String(r.floor) === floorStr);
      targetInfo = `ผู้พักอาศัยปัจจุบันชั้น ${floorStr} (${targetRooms.length} ห้อง)`;
    } else if (targetType === "room" && targetValue) {
      const roomArr = String(targetValue)
        .split(",")
        .map((s) => s.trim().toLowerCase());
      targetRooms = targetRooms.filter(
        (r) => roomArr.includes(r.roomNumber.toLowerCase()) || roomArr.includes(r.id.toLowerCase())
      );
      targetInfo = `ห้อง ${targetValue}`;
    }

    // รวบรวม Line User ID ของผู้เช่าที่ผูกไว้แล้ว
    const linkedLineUserIds = [...new Set(targetRooms
      .map((r) => {
        const tenant = allTenants.find((t) => t.id === r.currentTenant!.id);
        return (
          tenant?.lineUserId ||
          r.currentTenant?.lineUserId ||
          tenant?.lineId ||
          r.currentTenant?.lineId
        )?.trim();
      })
      .filter((uid): uid is string => Boolean(uid && uid.startsWith("U"))))];

    if (linkedLineUserIds.length === 0) {
      return NextResponse.json({ error: "ไม่มีผู้เช่าปัจจุบันที่ผูก LINE ในกลุ่มที่เลือก จึงยังไม่ได้ส่งประกาศ" }, { status: 400 });
    }
    if (!channelAccessToken.trim()) {
      return NextResponse.json({ error: "กรุณาตั้งค่า LINE Channel Access Token ก่อนส่งประกาศ" }, { status: 400 });
    }

    // 2. สร้าง Flex Message ตามมาตรฐาน LINE
    const flexMsg = buildBroadcastFlexMessage(
      title.trim(),
      message.trim(),
      template,
      branchName,
      targetInfo,
      branchPhone
    );
    const lineMessages = [flexMsg];

    let lineResult: any = { success: true };
    const liveSendType = "multicast";
    // Send only explicit current-tenant IDs, in LINE's supported batch size.
    for (let offset = 0; offset < linkedLineUserIds.length; offset += 500) {
      lineResult = await multicastLineMessage(
        channelAccessToken,
        linkedLineUserIds.slice(offset, offset + 500),
        lineMessages
      );
      if (!lineResult.success) break;
    }

    if (!lineResult.success) {
      console.error("[API-LINE-BROADCAST-FAILED]", lineResult.error);
      return NextResponse.json(
        {
          success: false,
          error: lineResult.error || "เกิดข้อผิดพลาดในการเชื่อมต่อ LINE Messaging API",
          details: lineResult,
        },
        { status: 400 }
      );
    }

    // 4. บันทึกลงฐานข้อมูล DatabaseService (sendBroadcast บันทึก activity log ให้แล้ว)
    const recipientCount =
      linkedLineUserIds.length;
    const broadcastRecord = await DatabaseService.sendBroadcast({
      propertyId: activePropId,
      template,
      title: title.trim(),
      message: message.trim(),
      targetType,
      targetValue,
      recipientCount,
    });

    return NextResponse.json({
      success: true,
      broadcastItem: broadcastRecord,
      recipientCount,
      linkedLineCount: linkedLineUserIds.length,
      isSimulated: Boolean(lineResult.isSimulated),
      liveSendType,
      message: `ส่งประกาศ LINE "${title.trim()}" ถึง ${targetInfo} สำเร็จเรียบร้อยแล้ว`,
    });
  } catch (error: any) {
    console.error("[API-LINE-BROADCAST-FATAL]", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
