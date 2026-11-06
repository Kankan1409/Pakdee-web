import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/database.service";
import {
  broadcastLineMessage,
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

    await DatabaseService.init();
    const activePropId = propertyId || DatabaseService.getActivePropertyId() || "prop-1";
    const property = await DatabaseService.getProperty(activePropId);
    const settings = await DatabaseService.getBranchSettings(property, activePropId);

    const channelAccessToken = settings?.lineChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
    const branchName = settings?.branchName || property?.name || "พักดี แมนชั่น";
    const branchPhone = settings?.phone || property?.phone || "";

    // 1. ค้นหาผู้เช่าที่เกี่ยวข้องเพื่อคำนวณผู้รับ
    const allRooms = await DatabaseService.getRooms(activePropId);
    const allTenants = await DatabaseService.getTenants(activePropId);

    let targetTenants = allTenants;
    let targetInfo = "ผู้พักอาศัยทุกท่าน";

    if (targetType === "floor" && targetValue) {
      const floorStr = String(targetValue);
      const floorRooms = allRooms
        .filter((r) => String(r.floor) === floorStr)
        .map((r) => r.roomNumber);
      targetTenants = targetTenants.filter(
        (t) => t.roomNumber && floorRooms.includes(t.roomNumber)
      );
      targetInfo = `ผู้พักอาศัยชั้น ${floorStr} (${floorRooms.length} ห้อง)`;
    } else if (targetType === "room" && targetValue) {
      const roomArr = String(targetValue)
        .split(",")
        .map((s) => s.trim().toLowerCase());
      targetTenants = targetTenants.filter(
        (t) =>
          (t.roomNumber && roomArr.includes(t.roomNumber.toLowerCase())) ||
          (t.roomId && roomArr.includes(t.roomId.toLowerCase()))
      );
      targetInfo = `ห้อง ${targetValue}`;
    }

    // รวบรวม Line User ID ของผู้เช่าที่ผูกไว้แล้ว
    const linkedLineUserIds = targetTenants
      .map((t) => t.lineUserId)
      .filter((uid): uid is string => Boolean(uid && uid.startsWith("U")));

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

    let lineResult: any = { success: true, isSimulated: true };
    let liveSendType = "none";

    // 3. ส่งข้อความผ่าน LINE Messaging API
    if (channelAccessToken && channelAccessToken.trim() !== "") {
      if (targetType === "all") {
        // หากเป็นการประกาศถึงทุกคน: ใช้ Broadcast API ของ LINE เพื่อส่งถึงผู้ติดตามทั้งหมดของ LINE OA
        lineResult = await broadcastLineMessage(channelAccessToken, lineMessages);
        liveSendType = "broadcast_all";
      } else {
        // หากเป็นการส่งเฉพาะชั้น หรือเฉพาะห้อง: ใช้ Multicast API ไปยังกลุ่มผู้ใช้ที่ผูกบัญชี LINE ไว้
        if (linkedLineUserIds.length > 0) {
          lineResult = await multicastLineMessage(
            channelAccessToken,
            linkedLineUserIds,
            lineMessages
          );
          liveSendType = "multicast";
        } else {
          // ยังไม่มีผู้เช่าในกลุ่มเป้าหมายผูก LINE
          lineResult = {
            success: true,
            isSimulated: true,
            message: "บันทึกประกาศเรียบร้อย (ยังไม่มีผู้เช่าในกลุ่มนี้ผูกบัญชี LINE)",
          };
          liveSendType = "queued";
        }
      }
    } else {
      // โหมด Simulated (ยังไม่ได้ระบุ Channel Access Token ในการตั้งค่า)
      lineResult = {
        success: true,
        isSimulated: true,
        message: "บันทึกประกาศเรียบร้อย (โหมดจำลอง: ยังไม่ได้ใส่ LINE Channel Access Token ในหน้าตั้งค่า)",
      };
      liveSendType = "simulated";
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

    // 4. บันทึกลงฐานข้อมูล DatabaseService
    const recipientCount =
      targetType === "all" ? allRooms.length || 1 : targetTenants.length || 1;
    const broadcastRecord = await DatabaseService.sendBroadcast({
      propertyId: activePropId,
      template,
      title: title.trim(),
      message: message.trim(),
      targetType,
      targetValue,
      recipientCount,
    });

    await DatabaseService.logActivity(
      "SEND",
      "ROOM",
      `ส่งประกาศ LINE: "${title.trim()}" ถึง ${targetInfo} (${liveSendType})`,
      activePropId
    );

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
