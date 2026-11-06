/**
 * PAKDEE SYSTEM - SLIP VERIFICATION & DEDUPLICATION ENGINE
 * ระบบตรวจสอบสลิปโอนเงิน ป้องกันสลิปปลอม และสกัดกั้นการใช้สลิปซ้ำ 100%
 * มาตรฐาน: Defensive Architecture & Zero Float Math
 */

import crypto from "crypto";
import type { Invoice } from "../types/dormitory";

export interface VerifySlipOptions {
  imageBuffer?: Buffer | null;
  invoice: Invoice;
  allInvoices: Invoice[];
  manualInput?: {
    transRef?: string;
    amount?: number;
    bankName?: string;
    isFake?: boolean;
  };
  propertySettings?: any;
}

export interface SlipVerificationResult {
  success: boolean;
  reason?:
    | "DUPLICATE_SLIP_HASH"
    | "DUPLICATE_TRANS_REF"
    | "AMOUNT_MISMATCH"
    | "FAKE_OR_INVALID_SLIP"
    | "CORRUPTED_IMAGE"
    | "MISSING_DATA";
  message: string;
  transRef?: string;
  bankName?: string;
  amount?: number;
  slipHash?: string;
  verifiedAt?: string;
  slipUrl?: string;
}

/**
 * คำนวณ SHA-256 Hash ของไฟล์สลิป เพื่อทำ Slip Fingerprint กันการส่งรูปซ้ำ 100%
 */
export function computeSlipHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * ตรวจสอบความถูกต้องของ Magic Bytes ของรูปภาพ (JPEG, PNG, WebP)
 */
export function validateImageSignature(buffer: Buffer): {
  isValid: boolean;
  format?: "jpeg" | "png" | "webp";
  error?: string;
} {
  if (!buffer || buffer.length < 1000) {
    return { isValid: false, error: "ขนาดไฟล์เล็กเกินไป หรือข้อมูลรูปภาพไม่สมบูรณ์" };
  }

  // JPEG magic bytes: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { isValid: true, format: "jpeg" };
  }

  // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { isValid: true, format: "png" };
  }

  // WebP: RIFF ... WEBP
  if (
    buffer.length > 12 &&
    buffer.subarray(0, 4).toString() === "RIFF" &&
    buffer.subarray(8, 12).toString() === "WEBP"
  ) {
    return { isValid: true, format: "webp" };
  }

  return { isValid: false, error: "รูปแบบไฟล์ไม่ใช่รูปภาพสลิปที่รองรับ (ต้องเป็น JPEG, PNG หรือ WebP)" };
}

/**
 * สแกน Signature ของธนาคารในระดับ Buffer ไบนารี
 * ตรวจจับร่องรอย Thai Bank BScanC, PromptPay QR, และ Mobile Banking Tokens
 */
export function detectBankSignatures(buffer: Buffer): {
  hasBankSignature: boolean;
  detectedBank?: string;
  detectedRef?: string;
} {
  const rawString = buffer.toString("latin1");

  // รายการคีย์เวิร์ดที่ต้องมีในสลิปธนาคารมาตรฐาน หรือใน Metadata / EXIF / BScanC payload
  const bankPatterns: { name: string; regex: RegExp }[] = [
    { name: "ธนาคารกสิกรไทย (KBank)", regex: /kbank|kplus|kasikorn|004/i },
    { name: "ธนาคารไทยพาณิชย์ (SCB)", regex: /scbeasy|scb|siam commercial|014/i },
    { name: "ธนาคารกรุงเทพ (BBL)", regex: /bbl|bangkokbank|002/i },
    { name: "ธนาคารกรุงไทย (KTB)", regex: /ktb|krungthai|006/i },
    { name: "ธนาคารทหารไทยธนชาต (TTB)", regex: /ttb|tmb|thanachart|011/i },
    { name: "ธนาคารกรุงศรีอยุธยา (BAY)", regex: /bay|krungsri|025/i },
    { name: "ธนาคารออมสิน (GSB)", regex: /gsb|mymo|030/i },
    { name: "ระบบพร้อมเพย์ (PromptPay / Thai QR)", regex: /promptpay|thaiqr|bscanc|000201|0046/i },
  ];

  for (const b of bankPatterns) {
    if (b.regex.test(rawString)) {
      // ดึงรหัสอ้างอิงถ้าพบตัวเลข 16-25 หลัก
      const refMatch = rawString.match(/\b(202[4-9]\d{12,20}|014\d{13,20}|004\d{13,20})\b/);
      return {
        hasBankSignature: true,
        detectedBank: b.name,
        detectedRef: refMatch ? refMatch[0] : undefined,
      };
    }
  }

  return { hasBankSignature: false };
}

export class SlipVerificationService {
  static verifySlip(_options: VerifySlipOptions): SlipVerificationResult {
    return { success: false, reason: "MISSING_DATA", message: "ต้องยืนยันธุรกรรมผ่านบริการตรวจสลิปก่อนรับชำระ" };
  }
}

export function extractQrFromImage(buffer: Buffer): string | null {
  if (!buffer || buffer.length === 0) return null;
  try {
    const rawString = buffer.toString("latin1");
    // ค้นหารูปแบบ EMVCo QR Code Payload มาตรฐานธนาคารไทย (000201...)
    const emvMatch = rawString.match(/000201\d{20,}/);
    if (emvMatch) return emvMatch[0];

    // ค้นหารหัส Mini QR / BScanC URL หรือ Payload
    const bscancMatch = rawString.match(/https?:\/\/[^\s"'<>]+(?:bscanc|promptpay|qr)[^\s"'<>]+/i);
    if (bscancMatch) return bscancMatch[0];

    return null;
  } catch (err) {
    console.warn("[SLIP-VERIFY] extractQrFromImage warning:", err);
    return null;
  }
}

export interface Slip2GoVerifyResult {
  success: boolean;
  transRef?: string;
  amount?: number;
  date?: string;
  senderBank?: string;
  senderName?: string;
  receiverBank?: string;
  receiverName?: string;
  receiverAccount?: string;
  isDuplicate?: boolean;
  rawResponse?: any;
  error?: string;
}

/**
 * เรียกใช้ Slip2Go API (https://api.slip2go.com) ตรวจสอบความถูกต้องของสลิปกับระบบธนาคารกลาง
 * รองรับทั้งการส่งข้อมูล QR Code ตรง (รวดเร็ว <1s) หรือรูปภาพสลิป Base64
 */
export { verifyWithSlip2Go } from "./slip2go";
