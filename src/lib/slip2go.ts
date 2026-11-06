import type { Slip2GoVerifyResult } from "./slip-verification";

// These are provider verdicts, not conclusions inferred from the image.
const slipFailureMessages: Record<string, string> = {
  "200401": "❌ บัญชีผู้รับไม่ตรงกับบัญชีรับเงินของหอพัก กรุณาตรวจสอบบัญชีปลายทาง",
  "200402": "❌ ยอดโอนไม่ตรงกับยอดบิล กรุณาตรวจสอบจำนวนเงินที่โอนจริง",
  "200403": "❌ วันที่โอนไม่ตรงตามเงื่อนไข กรุณาตรวจสอบวันที่ในสลิป",
  "200404": "⚠️ ไม่พบข้อมูลธุรกรรม หรือสลิปหมดอายุ กรุณาส่งสลิปต้นฉบับจากแอปธนาคาร",
  "200500": "❌ Slip2Go ตรวจพบสลิปปลอม ไม่สามารถใช้ยืนยันการชำระเงินได้",
  "200501": "⚠️ ตรวจพบสลิปซ้ำ ธุรกรรมนี้เคยถูกส่งตรวจแล้ว จึงไม่รับชำระซ้ำ หากยังไม่ได้รับการยืนยัน กรุณาติดต่อเจ้าหน้าที่",
  "200202": "⏳ Slip2Go ยังประมวลผลไม่เสร็จ กรุณาตรวจสอบอีกครั้งภายหลัง",
  "200000": "⚠️ พบข้อมูลสลิป แต่ยังไม่มีผลยืนยันว่าผ่านเงื่อนไขการรับชำระ",
};

function buildCheckReceiver(primary?: string, extras?: string[]): Array<{ accountType?: string; accountNumber: string }> {
  const rawList = [primary, ...(extras || [])].filter(Boolean) as string[];
  const list: Array<{ accountType?: string; accountNumber: string }> = [];
  const seen = new Set<string>();
  for (const raw of rawList) {
    const acc = raw.replace(/[^0-9]/g, "");
    if (acc.length < 10 || seen.has(acc)) continue;
    seen.add(acc);
    list.push({ accountNumber: acc });
    if (acc.length === 13) {
      list.push({ accountType: "02003", accountNumber: acc });
      list.push({ accountType: "02002", accountNumber: acc });
    } else if (acc.length === 10) {
      list.push({ accountType: "02001", accountNumber: acc });
    } else if (acc.length === 15) {
      list.push({ accountType: "02004", accountNumber: acc });
    }
  }
  return list;
}

// A successful HTTP request is not a successful slip verification.
// https://slip2go.com/guide/response : 200200 = all requested checks passed.
export async function verifyWithSlip2Go(secretKey: string, options: {
  qrCode?: string; imageBuffer?: Buffer; expectedAmount?: number;
  receiverAccount?: string; receiverAccounts?: string[]; receiverBankCode?: string;
}): Promise<Slip2GoVerifyResult> {
  const key = secretKey?.trim();
  const baseUrl = (process.env.SLIP2GO_API_URL?.trim() || "https://connect.slip2go.com").replace(/\/+$/, "");
  const checkReceiver = buildCheckReceiver(options.receiverAccount, options.receiverAccounts);
  if (!key) return { success: false, error: "ยังไม่ได้ตั้งค่า Slip2Go จึงยังยืนยันการชำระเงินไม่ได้" };
  if (!baseUrl) return { success: false, error: "ยังไม่ได้ตั้งค่า API URL ของ Slip2Go กรุณาติดต่อเจ้าหน้าที่" };
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "https:" || !(url.hostname === "slip2go.com" || url.hostname.endsWith(".slip2go.com")) ||
        url.username || url.password || url.search || url.hash) throw new Error("Invalid provider URL");
  } catch { return { success: false, error: "API URL ของ Slip2Go ไม่ถูกต้อง" }; }
  if (!checkReceiver.length || !Number.isFinite(options.expectedAmount) || Number(options.expectedAmount) <= 0) {
    return { success: false, error: "ข้อมูลบัญชีผู้รับหรือยอดบิลไม่ครบ กรุณาติดต่อเจ้าหน้าที่" };
  }
  const checkCondition = { checkDuplicate: true, checkAmount: { type: "eq", amount: options.expectedAmount },
    checkReceiver };
  let endpoint: string;
  let payload: Record<string, unknown>;
  // Prefer the actual image, not a guessed QR string from compressed file bytes.
  if (options.imageBuffer) {
    const b = options.imageBuffer;
    const mime = b[0] === 0xff && b[1] === 0xd8 ? "image/jpeg" :
      b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? "image/png" :
      b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" ? "image/webp" : null;
    if (!mime) return { success: false, error: "รูปสลิปไม่ใช่รูปแบบที่รองรับ" };
    endpoint = "qr-base64";
    payload = { imageBase64: `data:${mime};base64,${b.toString("base64")}`, checkCondition };
  } else if (options.qrCode) {
    endpoint = "qr-code"; payload = { qrCode: options.qrCode, checkCondition };
  } else return { success: false, error: "ไม่มีรูปสลิปสำหรับตรวจสอบ" };
  try {
    const response = await fetch(`${baseUrl}/api/verify-slip/${endpoint}/info`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ payload }), signal: AbortSignal.timeout(20000), redirect: "error",
    });
    const json = await response.json().catch(() => null);
    console.info("[SLIP2GO] verification", { httpStatus: response.status, code: String(json?.code || "missing") });
    if (!response.ok || String(json?.code) !== "200200" || json?.success === false) {
      const code = String(json?.code || response.status);
      return { success: false, error: response.ok && slipFailureMessages[code]
        ? slipFailureMessages[code]
        : `⚠️ ระบบตรวจสลิปยังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลังหรือติดต่อเจ้าหน้าที่ (รหัส ${code})` };
    }
    const data = json.data;
    if (data?.isDuplicate === true) return { success: false, error: slipFailureMessages["200501"] };
    if (typeof data?.amount === "number" && Number.isFinite(data.amount) &&
        Math.round(data.amount * 100) !== Math.round(Number(options.expectedAmount) * 100)) {
      return { success: false, error: slipFailureMessages["200402"] };
    }
    if (!data || typeof data.amount !== "number" || !Number.isFinite(data.amount) || data.amount <= 0 ||
        Math.round(data.amount * 100) !== Math.round(Number(options.expectedAmount) * 100) ||
        typeof data.transRef !== "string" || !data.transRef.trim() || data.isDuplicate === true ||
        !data.receiver?.account || !data.dateTime || !Number.isFinite(Date.parse(data.dateTime))) {
      return { success: false, error: "ข้อมูลยืนยันจาก Slip2Go ไม่ครบหรือยอดไม่ตรง บิลยังไม่ถูกตัดชำระ" };
    }
    return { success: true, amount: data.amount, transRef: data.transRef.trim(), date: data.dateTime,
      senderBank: data.sender?.bank?.name, receiverBank: data.receiver?.bank?.name,
      receiverName: data.receiver.account.name,
      receiverAccount: data.receiver.account.bank?.account || data.receiver.account.proxy?.account };
  } catch {
    return { success: false, error: "ติดต่อ Slip2Go ไม่สำเร็จ บิลยังไม่ถูกตัดชำระ กรุณาลองใหม่ภายหลัง" };
  }
}
