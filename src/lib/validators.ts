/**
 * PAKDEE SYSTEM - DATA VALIDATION SUITE
 * มาตรฐานการตรวจสอบความถูกต้องของข้อมูล (Thai Identity, Phone, Email, Dates, URLs)
 */

/**
 * ตรวจสอบเลขประจำตัวประชาชนไทย 13 หลัก
 * รองรับทั้งตัวเลขติดกัน 13 หลัก หรือมีขีดคั่น (X-XXXX-XXXXX-XX-X)
 * พร้อมคำนวณ Checksum Algorithm (Mod 11) ตามมาตรฐานกรมการปกครอง
 */
export function isValidThaiIdCard(id: string): boolean {
  if (!id) return false;
  const clean = id.replace(/\D/g, "");
  if (clean.length !== 13) return false;
  
  // ป้องกันเลขตองซ้ำ เช่น 0000000000000 หรือ 1111111111111
  if (/^(\d)\1{12}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(clean[i]) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === Number(clean[12]);
}

/**
 * จัดรูปแบบเลขบัตรประชาชนเป็น X-XXXX-XXXXX-XX-X อัตโนมัติ
 */
export function formatThaiIdCard(id: string): string {
  const clean = (id || "").replace(/\D/g, "").slice(0, 13);
  if (clean.length <= 1) return clean;
  if (clean.length <= 5) return `${clean.slice(0, 1)}-${clean.slice(1)}`;
  if (clean.length <= 10) return `${clean.slice(0, 1)}-${clean.slice(1, 5)}-${clean.slice(5)}`;
  if (clean.length <= 12) return `${clean.slice(0, 1)}-${clean.slice(1, 5)}-${clean.slice(5, 10)}-${clean.slice(10)}`;
  return `${clean.slice(0, 1)}-${clean.slice(1, 5)}-${clean.slice(5, 10)}-${clean.slice(10, 12)}-${clean.slice(12, 13)}`;
}

/**
 * ตรวจสอบเบอร์โทรศัพท์มือถือในไทย (10 หลัก ขึ้นต้นด้วย 0)
 */
export function isValidThaiPhone(phone: string): boolean {
  if (!phone) return false;
  const clean = phone.replace(/\D/g, "");
  // มือถือ 10 หลัก (06, 08, 09) หรือเบอร์บ้าน 9 หลัก (02, 03, 04, 05, 07)
  return (clean.length === 10 || clean.length === 9) && clean.startsWith("0");
}

/**
 * จัดรูปแบบเบอร์โทรศัพท์ เช่น 08X-XXX-XXXX
 */
export function formatThaiPhone(phone: string): string {
  const clean = (phone || "").replace(/\D/g, "").slice(0, 10);
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6, 10)}`;
}

/**
 * ตรวจสอบรูปแบบอีเมลมาตรฐาน RFC
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * ตรวจสอบว่าวันที่สิ้นสุดอยู่หลังวันที่เริ่มต้นหรือไม่
 */
export function isDateAfter(end: string, start: string): boolean {
  if (!end || !start) return false;
  return new Date(end).getTime() > new Date(start).getTime();
}

/**
 * ตรวจสอบ URL สำหรับ Webhook (เช่น https://...)
 */
export function isValidHttpsUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * ตรวจสอบรูปแบบเลขประจำตัวผู้เสียภาษี (Tax ID 13 หลัก)
 */
export function isValidTaxId(taxId: string): boolean {
  if (!taxId) return false;
  const clean = taxId.replace(/\D/g, "");
  return clean.length === 13;
}

/**
 * ตรวจสอบเลขที่บัญชีธนาคาร (10-15 หลัก เฉพาะตัวเลข)
 */
export function isValidBankAccount(account: string): boolean {
  if (!account) return false;
  const clean = account.replace(/\D/g, "");
  return clean.length >= 10 && clean.length <= 15;
}
