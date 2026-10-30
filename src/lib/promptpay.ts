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

export function generatePromptPayPayload(target: string, amount?: number): string {
  // Normalize target: Phone number or Tax ID / National ID
  const cleanTarget = target.replace(/[^0-9]/g, "");
  let formattedTarget = "";

  if (cleanTarget.length === 10 && cleanTarget.startsWith("0")) {
    // Mobile number: prefix with 0066 and drop leading 0
    formattedTarget = `0066${cleanTarget.substring(1)}`;
  } else {
    // 13-digit National ID or Tax ID
    formattedTarget = cleanTarget;
  }

  // Tag 29: Merchant Account Info
  const aid = formatTag("00", "A000000677010111");
  const targetType = cleanTarget.length === 10 ? "01" : "02";
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
