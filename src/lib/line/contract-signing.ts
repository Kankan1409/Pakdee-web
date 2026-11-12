/**
 * Contract signing inside the LINE chat (no web link needed).
 *  1) The owner sends the locked contract text into the tenant's LINE chat, followed by a card
 *     with a "ยอมรับและลงนาม" button (postback `contract_sign:<token>`).
 *  2) When the tenant taps it, LINE calls our webhook with that postback. We check that the tap came
 *     from the same LINE account the contract was sent to, then mark the contract signed.
 * The tenant "signature" is an electronic signature: LINE account + display name + time, drawn as an
 * image (SVG) so every screen that shows contract signatures keeps working unchanged.
 */
import { slipDatabase } from "@/lib/payment-slips-server";

export const CONTRACT_SIGN_POSTBACK = "contract_sign:";

/** Contract HTML (already sanitized) → readable plain text for LINE chat */
export function contractHtmlToText(html: string): string {
  const text = String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/t[dh]>/gi, " | ")
    .replace(/<\/(p|div|h[1-6]|li|tr|table|thead|tbody|tfoot|section)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
  return text
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").replace(/(\s*\|\s*)+$/, "").trim())
    .reduce<string[]>((acc, l) => {
      if (!l && (!acc.length || !acc[acc.length - 1])) return acc; // collapse blank lines
      acc.push(l);
      return acc;
    }, [])
    .join("\n")
    .trim();
}

/** Split text into LINE text messages (max 5000 chars each; keep a margin) at line breaks */
export function chunkText(text: string, max = 4500): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const line of text.split("\n")) {
    const piece = line.length > max ? line.match(new RegExp(`[\\s\\S]{1,${max}}`, "g")) || [] : [line];
    for (const p of piece) {
      if ((current + "\n" + p).length > max && current) {
        chunks.push(current);
        current = p;
      } else {
        current = current ? `${current}\n${p}` : p;
      }
    }
  }
  if (current.trim()) chunks.push(current);
  return chunks;
}

export function buildSignRequestCard(token: string, contractNumber: string, roomNumber: string, tenantName: string) {
  return {
    type: "flex",
    altText: `ยืนยันสัญญาเช่าห้อง ${roomNumber}`,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          { type: "text", text: "📝 ยืนยันสัญญาเช่า", weight: "bold", size: "lg" },
          { type: "text", text: `สัญญาเลขที่ ${contractNumber}`, size: "sm", color: "#555555", wrap: true },
          { type: "text", text: `ห้อง ${roomNumber} · ${tenantName || "ผู้เช่า"}`, size: "sm", color: "#555555", wrap: true },
          {
            type: "text",
            text: "กรุณาอ่านข้อความสัญญาด้านบนให้ครบ หากตกลงตามสัญญา กดปุ่มด้านล่างเพื่อลงนามด้วยบัญชี LINE ของคุณ",
            size: "xs",
            color: "#888888",
            wrap: true,
            margin: "md",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#06C755",
            action: {
              type: "postback",
              label: "ยอมรับและลงนาม",
              data: `${CONTRACT_SIGN_POSTBACK}${token}`,
              displayText: `ข้าพเจ้าได้อ่านและยอมรับสัญญาเลขที่ ${contractNumber}`,
            },
          },
        ],
      },
    },
  };
}

function escapeXml(v: string): string {
  return String(v || "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);
}

/** Electronic-signature stamp shown in the tenant signature box (image, so existing screens work) */
export function lineSignatureImage(lineName: string, signedAtIso: string): string {
  const when = new Date(signedAtIso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="84" viewBox="0 0 360 84">` +
    `<rect x="1" y="1" width="358" height="82" rx="10" fill="#ffffff" stroke="#06C755" stroke-width="2"/>` +
    `<text x="180" y="26" text-anchor="middle" font-family="Prompt, Tahoma, sans-serif" font-size="15" font-weight="700" fill="#059669">✓ ลงนามอิเล็กทรอนิกส์ผ่าน LINE</text>` +
    `<text x="180" y="50" text-anchor="middle" font-family="Prompt, Tahoma, sans-serif" font-size="14" fill="#0f172a">${escapeXml(lineName || "ผู้เช่า")}</text>` +
    `<text x="180" y="71" text-anchor="middle" font-family="Prompt, Tahoma, sans-serif" font-size="12" fill="#475569">${escapeXml(when)}</text>` +
    `</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

/**
 * Webhook: tenant tapped "ยอมรับและลงนาม". Returns the reply text for the chat.
 * Only the LINE account the contract was sent to can sign it.
 */
export async function signContractFromLinePostback(
  data: string,
  lineUserId: string,
  lineDisplayName: string
): Promise<string> {
  const token = data.slice(CONTRACT_SIGN_POSTBACK.length);
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return "ไม่พบสัญญานี้ กรุณาติดต่อหอพัก";
  const db = slipDatabase();
  const { data: row, error } = await db.from("contract_sign_requests").select("*").eq("token", token).maybeSingle();
  if (error || !row) return "ไม่พบสัญญานี้ หรือถูกยกเลิกแล้ว กรุณาติดต่อหอพัก";
  if (row.line_user_id && row.line_user_id !== lineUserId) return "สัญญานี้ส่งถึงบัญชี LINE อื่น ไม่สามารถลงนามแทนได้";
  if (row.status === "signed") return `สัญญาเลขที่ ${row.contract_number} ลงนามเรียบร้อยแล้ว ✓`;
  if (row.status !== "pending") return "สัญญาฉบับนี้ถูกยกเลิกแล้ว (อาจมีการส่งฉบับใหม่) กรุณากดยืนยันในข้อความล่าสุด";
  if (new Date(row.expires_at).getTime() < Date.now()) return "หมดเวลายืนยันสัญญาแล้ว กรุณาติดต่อหอพักเพื่อส่งสัญญาใหม่";

  const signedAt = new Date().toISOString();
  const signature = lineSignatureImage(lineDisplayName, signedAt);
  const base = { status: "signed", tenant_signature_url: signature, signed_at: signedAt };
  let { error: updError } = await db
    .from("contract_sign_requests")
    .update({ ...base, signed_via: "line", signer_line_name: (lineDisplayName || "").slice(0, 200) })
    .eq("token", token)
    .eq("status", "pending");
  if (updError && /signed_via|signer_line_name/.test(updError.message)) {
    // Older table without the extra columns
    ({ error: updError } = await db.from("contract_sign_requests").update(base).eq("token", token).eq("status", "pending"));
  }
  if (updError) {
    console.error("[CONTRACT-SIGN-LINE] update:", updError.message);
    return "บันทึกการลงนามไม่สำเร็จ กรุณากดอีกครั้งในอีกสักครู่";
  }

  const { error: contractError } = await db
    .from("contracts")
    .update({
      status: "active",
      signed_at: signedAt,
      tenant_signature_url: signature,
      ...(row.landlord_signature_url ? { landlord_signature_url: row.landlord_signature_url } : {}),
    })
    .eq("contract_number", row.contract_number);
  if (contractError) console.error("[CONTRACT-SIGN-LINE] contracts update:", contractError.message);

  return [
    "✅ ลงนามสัญญาเช่าเรียบร้อยแล้ว",
    `สัญญาเลขที่ ${row.contract_number} (ห้อง ${row.room_number})`,
    `ลงนามโดยบัญชี LINE: ${lineDisplayName || "-"}`,
    `เวลา ${new Date(signedAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}`,
    "ขอบคุณค่ะ",
  ].join("\n");
}
