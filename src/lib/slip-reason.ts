/**
 * ย่อเหตุผลที่สลิปไม่ผ่าน (ข้อความยาวที่ส่งให้ผู้เช่าทาง LINE / เก็บใน payment_slips.rejection_reason)
 * ให้สั้นพอสำหรับ chip ในหน้ารายการใบแจ้งหนี้ เช่น "ยอดโอนไม่ตรง", "สลิปซ้ำ"
 * ใช้ได้ทั้งข้อความใหม่และข้อความเก่าที่เก็บไว้แล้ว (จับจากคำสำคัญ)
 */
export function shortSlipReason(reason?: string | null): string {
  const text = (reason || "").replace(/^[❌⚠️⏳✅\s]+/u, "").trim();
  if (!text) return "ไม่ทราบสาเหตุ";
  if (text.includes("ซ้ำ")) return "สลิปซ้ำ";
  if (text.includes("ปลอม") || text.includes("ไม่ใช่สลิปจริง")) return "สลิปปลอม";
  if (text.includes("บัญชีผู้รับ") || text.includes("บัญชีปลายทาง")) return "บัญชีผู้รับไม่ตรง";
  if (text.includes("ยอด") && text.includes("ไม่ตรง")) return "ยอดโอนไม่ตรง";
  if (text.includes("วันที่โอน")) return "วันที่โอนไม่ตรง";
  if (text.includes("ไม่พบข้อมูลธุรกรรม") || text.includes("หมดอายุ")) return "ไม่พบธุรกรรม";
  if (text.includes("ตรวจสลิปไม่เสร็จ") || text.includes("ประมวลผลไม่เสร็จ")) return "รอผลตรวจ";
  if (text.includes("รูปแบบ") || text.includes("รูปสลิป")) return "รูปไม่รองรับ";
  if (text.includes("ตั้งค่า") || text.includes("ยังไม่พร้อม")) return "ระบบตรวจยังไม่พร้อม";
  if (text.includes("ไม่สำเร็จ")) return "ตรวจไม่สำเร็จ";
  if (text.includes("สถานะหรือยอดบิลเปลี่ยน")) return "บิลเปลี่ยนแปลง";
  return text.length > 18 ? `${text.slice(0, 18)}…` : text;
}
