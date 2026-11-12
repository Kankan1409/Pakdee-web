/**
 * PAKDEE SYSTEM - LINE MESSAGING API CLIENT
 * ไคลเอนต์สื่อสารกับ LINE Messaging API (Reply, Push, Broadcast, Multicast, Content, Webhook Signature)
 * 100% Native Fetch + Crypto (Zero External Dependencies)
 */

import crypto from "crypto";

const LINE_API_BASE = "https://api.line.me/v2/bot";
const LINE_DATA_BASE = "https://api-data.line.me/v2/bot";

export interface LineSendResult {
  success: boolean;
  statusCode?: number;
  data?: any;
  error?: string;
  isSimulated?: boolean;
}

/**
 * 1. ตรวจสอบลายเซ็น Webhook Signature (HMAC-SHA256)
 */
export function verifyLineSignature(body: string, signature: string, channelSecret: string): boolean {
  if (!signature || !channelSecret) return false;
  try {
    const hash = crypto
      .createHmac("sha256", channelSecret)
      .update(body, "utf8")
      .digest("base64");
    return hash === signature;
  } catch (err) {
    console.error("[LINE-SEC] Signature verification error:", err);
    return false;
  }
}

/**
 * 2. ส่งข้อความตอบกลับ (Reply Message)
 */
export async function replyLineMessage(
  channelAccessToken: string,
  replyToken: string,
  messages: any[]
): Promise<LineSendResult> {
  if (!channelAccessToken || channelAccessToken.trim() === "") {
    console.warn("[LINE-CLIENT] Simulated reply (No Channel Access Token configured)");
    return { success: true, isSimulated: true };
  }

  try {
    const res = await fetch(`${LINE_API_BASE}/message/reply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelAccessToken.trim()}`,
      },
      body: JSON.stringify({
        replyToken,
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[LINE-CLIENT] Reply failed:", res.status, errText);
      return { success: false, statusCode: res.status, error: errText };
    }

    const data = await res.json().catch(() => ({}));
    console.log(`[LINE-CLIENT] Reply success (200 OK): Delivered messages to LINE (ReplyToken: ${replyToken})`);
    return { success: true, statusCode: res.status, data };
  } catch (error: any) {
    console.error("[LINE-CLIENT] Network error replying message:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 3. ส่งข้อความแบบ Push Message ไปยังผู้เช่ารายคน
 */
export async function pushLineMessage(
  channelAccessToken: string,
  toUserId: string,
  messages: any[]
): Promise<LineSendResult> {
  if (!channelAccessToken || channelAccessToken.trim() === "") {
    console.warn("[LINE-CLIENT] Simulated push (No Channel Access Token configured)");
    return { success: true, isSimulated: true };
  }

  if (!toUserId || !toUserId.trim()) {
    return { success: false, error: "Missing recipient LINE User ID (to)" };
  }

  try {
    const res = await fetch(`${LINE_API_BASE}/message/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelAccessToken.trim()}`,
      },
      body: JSON.stringify({
        to: toUserId.trim(),
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[LINE-CLIENT] Push failed:", res.status, errText);
      return { success: false, statusCode: res.status, error: errText };
    }

    const data = await res.json().catch(() => ({}));
    return { success: true, statusCode: res.status, data };
  } catch (error: any) {
    console.error("[LINE-CLIENT] Network error pushing message:", error);
    return { success: false, error: error.message };
  }
}

export interface LineDeliveryResult extends LineSendResult {
  method: "reply" | "push" | "partial-push" | "none";
}

/**
 * Reply first while replyToken is fresh, then automatically fall back to pushMessage
 * (and single-message push retries) so expired tokens or multi-message errors never drop receipts.
 */
export async function replyOrPushLineMessages(
  channelAccessToken: string,
  replyToken: string | undefined,
  toUserId: string | undefined,
  messages: any[]
): Promise<LineDeliveryResult> {
  const safeMessages = (Array.isArray(messages) ? messages : [messages]).filter(Boolean).slice(0, 5);
  if (safeMessages.length === 0) {
    return { success: false, error: "No messages to deliver", method: "none" };
  }

  let replyError: LineSendResult | null = null;
  if (replyToken && replyToken.trim() && !/^[0f]+$/i.test(replyToken.trim())) {
    replyError = await replyLineMessage(channelAccessToken, replyToken.trim(), safeMessages);
    if (replyError.success) {
      return { ...replyError, method: "reply" };
    }
    console.warn("[LINE-CLIENT] Reply failed, falling back to pushMessage:", {
      statusCode: replyError.statusCode,
      error: replyError.error,
      hasUserId: Boolean(toUserId),
    });
  }

  const trimmedUserId = toUserId?.trim();
  if (!trimmedUserId) {
    return {
      ...(replyError || { success: false, error: "Missing replyToken and recipient LINE userId" }),
      method: "none",
    };
  }

  const batchPush = await pushLineMessage(channelAccessToken, trimmedUserId, safeMessages);
  if (batchPush.success) {
    return { ...batchPush, method: "push" };
  }

  // If a combined array (e.g., [text, flex]) failed validation on one item, deliver the valid messages individually.
  if (safeMessages.length > 1) {
    const delivered: LineSendResult[] = [];
    let firstItemError = batchPush.error;
    for (const msg of safeMessages) {
      const singleRes = await pushLineMessage(channelAccessToken, trimmedUserId, [msg]);
      if (singleRes.success) {
        delivered.push(singleRes);
      } else if (!firstItemError) {
        firstItemError = singleRes.error;
      }
    }
    if (delivered.length > 0) {
      return {
        success: true,
        statusCode: delivered[0].statusCode || 200,
        data: delivered,
        error: firstItemError,
        method: "partial-push",
      };
    }
  }

  return {
    ...batchPush,
    error: batchPush.error || replyError?.error,
    method: "push",
  };
}

/**
 * 4. ส่งข้อความแบบ Multicast Message ไปยังผู้ใช้กลุ่มที่ระบุ (สูงสุด 500 คนต่อครั้ง)
 */
export async function multicastLineMessage(
  channelAccessToken: string,
  toUserIds: string[],
  messages: any[]
): Promise<LineSendResult> {
  if (!channelAccessToken || channelAccessToken.trim() === "") {
    console.warn("[LINE-CLIENT] Simulated multicast (No Channel Access Token configured)");
    return { success: true, isSimulated: true };
  }

  const validIds = toUserIds.filter((id) => id && id.trim().startsWith("U"));
  if (validIds.length === 0) {
    return { success: false, error: "No valid recipient LINE User IDs provided" };
  }

  try {
    const res = await fetch(`${LINE_API_BASE}/message/multicast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelAccessToken.trim()}`,
      },
      body: JSON.stringify({
        to: validIds,
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[LINE-CLIENT] Multicast failed:", res.status, errText);
      return { success: false, statusCode: res.status, error: errText };
    }

    const data = await res.json().catch(() => ({}));
    return { success: true, statusCode: res.status, data };
  } catch (error: any) {
    console.error("[LINE-CLIENT] Network error in multicast:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 5. ส่งข้อความแบบ Broadcast Message ไปยังผู้ติดตาม LINE Official Account ทุกคน
 */
export async function broadcastLineMessage(
  channelAccessToken: string,
  messages: any[]
): Promise<LineSendResult> {
  if (!channelAccessToken || channelAccessToken.trim() === "") {
    console.warn("[LINE-CLIENT] Simulated broadcast (No Channel Access Token configured)");
    return { success: true, isSimulated: true };
  }

  try {
    const res = await fetch(`${LINE_API_BASE}/message/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelAccessToken.trim()}`,
      },
      body: JSON.stringify({
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[LINE-CLIENT] Broadcast failed:", res.status, errText);
      return { success: false, statusCode: res.status, error: errText };
    }

    const data = await res.json().catch(() => ({}));
    return { success: true, statusCode: res.status, data };
  } catch (error: any) {
    console.error("[LINE-CLIENT] Network error broadcasting message:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 6. ดาวน์โหลดรูปภาพสลิปที่ผู้เช่าส่งมาทาง LINE
 */
export async function getLineMessageContent(
  channelAccessToken: string,
  messageId: string
): Promise<Buffer | null> {
  if (!channelAccessToken || !messageId) return null;

  try {
    const res = await fetch(`${LINE_DATA_BASE}/message/${messageId}/content`, {
      headers: {
        Authorization: `Bearer ${channelAccessToken.trim()}`,
      },
    });

    if (!res.ok) {
      console.error("[LINE-CLIENT] Failed to download message content:", res.status);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error("[LINE-CLIENT] Error downloading message content:", err);
    return null;
  }
}

/**
 * 7. ดึงข้อมูลโปรไฟล์ผู้ใช้ LINE (Display Name, Picture URL, Status Message)
 */
export async function getLineUserProfile(
  channelAccessToken: string,
  userId: string
): Promise<{ displayName?: string; pictureUrl?: string; statusMessage?: string } | null> {
  if (!channelAccessToken || !userId) return null;
  try {
    const res = await fetch(`${LINE_API_BASE}/profile/${userId}`, {
      headers: {
        Authorization: `Bearer ${channelAccessToken.trim()}`,
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn("[LINE-CLIENT] Failed to get user profile:", err);
    return null;
  }
}
