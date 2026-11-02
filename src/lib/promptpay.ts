import QRCode from "qrcode";

// CRC-16/CCITT-FALSE calculation for EMVCo QR code
function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    let x = ((crc >> 8) ^ data.charCodeAt(i)) & 0xff;
    x ^= x >> 4;
    crc = ((crc << 8) ^ (x << 12) ^ (x << 5) ^ x) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function formatTag(id: string, value: string): string {
  const length = value.length.toString().padStart(2, "0");
  return `${id}${length}${value}`;
}

export function isValidPromptPayTarget(target?: string): boolean {
  if (!target) return false;
  const clean = target.replace(/[^0-9]/g, "");
  return (clean.length === 10 && clean.startsWith("0")) || clean.length === 13;
}

export function generatePromptPayPayload(target: string, amount?: number): string {
  // Normalize target: Phone number (10 digits) or National ID / Tax ID (13 digits)
  const cleanTarget = (target || "").replace(/[^0-9]/g, "");
  if (!cleanTarget) return "";

  let formattedTarget = "";
  let targetType = "01";

  if (cleanTarget.length === 10 && cleanTarget.startsWith("0")) {
    // Mobile number: prefix with 0066 and drop leading 0
    formattedTarget = `0066${cleanTarget.substring(1)}`;
    targetType = "01";
  } else if (cleanTarget.length === 13) {
    // 13-digit National ID or Tax ID
    formattedTarget = cleanTarget;
    targetType = "02";
  } else {
    // Fallback if user entered an irregular number (e.g. 9-digit or 8-digit test string)
    formattedTarget = cleanTarget.length <= 10 ? `0066${cleanTarget.replace(/^0/, "")}` : cleanTarget.padStart(13, "0");
    targetType = cleanTarget.length <= 10 ? "01" : "02";
  }

  // Tag 29: Merchant Account Info
  const aid = formatTag("00", "A000000677010111");
  const targetTag = formatTag(targetType, formattedTarget);
  const tag29 = formatTag("29", `${aid}${targetTag}`);

  // Base EMV payload
  let payload =
    formatTag("00", "01") + // Payload Format Indicator
    formatTag("01", amount ? "12" : "11") + // Point of Initiation: 12 (Dynamic/Amount), 11 (Static)
    tag29 +
    formatTag("53", "764") + // Currency: THB (764)
    formatTag("58", "TH"); // Country Code: TH

  if (amount && amount > 0) {
    payload += formatTag("54", amount.toFixed(2)); // Transaction Amount
  }

  // Tag 63: CRC placeholder
  const payloadWithCrcTag = payload + "6304";
  const checksum = crc16(payloadWithCrcTag);

  return `${payloadWithCrcTag}${checksum}`;
}

export async function generatePromptPayQRCode(target: string, amount?: number): Promise<string> {
  const payload = generatePromptPayPayload(target, amount);
  try {
    return await QRCode.toDataURL(payload, {
      margin: 1,
      width: 250,
      color: {
        dark: "#0F172A",
        light: "#FFFFFF",
      },
    });
  } catch (err) {
    console.error("Failed to generate QR code", err);
    return "";
  }
}
