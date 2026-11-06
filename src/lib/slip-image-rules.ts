// Image matching only: this does not establish that money reached a bank.
export type ImageEvidence = { amount: number; reference: string; date: string; confidence: number };
export function inspectSlipText(text: string, confidence: number, expected: {
  total: number; recipientName: string; recipientNumber: string; billingDate: string;
}, today = new Date().toISOString().slice(0, 10)): { evidence?: ImageEvidence; message: string } {
  const pending = (message: string) => ({ message });
  if (confidence < 85) return pending("ภาพอ่านได้ไม่ชัดพอ กรุณาส่งสลิปที่ชัดเจนขึ้น");
  const clean = text.normalize("NFKC");
  // Only explicitly labelled transfer amounts; never use the invoice as OCR output.
  const amounts = [...clean.matchAll(/(?:จำนวนเงิน|จำนวน|ยอดโอน|amount)\s*[:：]?\s*(?:฿\s*)?([\d,]+\.\d{2})(?!\d)/gi)]
    .map(m => Math.round(Number(m[1].replace(/,/g, "")) * 100));
  if (amounts.length !== 1 || amounts[0] <= 0 || amounts[0] !== Math.round(expected.total * 100)) {
    return pending("ยอดที่อ่านจากสลิปไม่ชัดเจนหรือไม่ตรงกับยอดเต็มของบิล");
  }
  // Restrict matching to an explicitly labelled recipient section, never the sender.
  const recipient = clean.match(/(?:ผู้รับ|โอนไปยัง|โอนไป|recipient|receiver|to)\s*[:：]?\s*([\s\S]{1,250}?)(?=จำนวน|ยอดโอน|amount|เลขที่รายการ|รหัสอ้างอิง|reference|วันที่|date|$)/i)?.[1];
  const normalizeName = (v: string) => v.toLowerCase().replace(/[^a-z\u0e01-\u0e4e]/g, "");
  const name = normalizeName(expected.recipientName);
  const number = expected.recipientNumber.replace(/\D/g, "");
  if (!recipient || name.length < 5 || number.length < 10 || !normalizeName(recipient).includes(name) ||
      !recipient.replace(/[\s-]/g, "").includes(number)) {
    return pending("ยังอ่านชื่อและเลขบัญชีผู้รับแบบเต็มให้ตรงกับสาขาไม่ได้ จึงยังไม่รับชำระอัตโนมัติ");
  }
  const references = [...clean.matchAll(/(?:เลขที่รายการ|รหัสอ้างอิง|หมายเลขอ้างอิง|transaction\s*(?:id|ref)|reference)\s*[:：]?\s*([A-Z0-9]{10,40})\b/gi)];
  if (references.length !== 1) return pending("อ่านเลขอ้างอิงธุรกรรมไม่ได้ชัดเจน");
  const dates = [...clean.matchAll(/\b(\d{2})[/-](\d{2})[/-](\d{4})\b/g)];
  if (dates.length !== 1) return pending("ต้องอ่านวันที่โอนรูปแบบ วัน/เดือน/ปี ได้ชัดเจนก่อน");
  let year = Number(dates[0][3]); if (year > 2400) year -= 543;
  const date = `${year}-${dates[0][2]}-${dates[0][1]}`;
  const parsed = new Date(date + "T00:00:00Z");
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date ||
      !/^\d{4}-\d{2}-\d{2}$/.test(expected.billingDate) || date < expected.billingDate || date > today) {
    return pending("วันที่โอนไม่อยู่ในช่วงของบิลนี้");
  }
  return { evidence: { amount: amounts[0] / 100, reference: references[0][1].toUpperCase(), date, confidence },
    message: "ข้อมูลในภาพตรงกับบิล (ยังไม่ได้ยืนยันยอดกับธนาคาร)" };
}
