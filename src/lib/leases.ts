import type { Property, Room } from "@/types/dormitory";

export type SignerRole = "landlord" | "tenant" | "witness1" | "witness2";
export const roleLabels: Record<SignerRole, string> = {
  landlord: "ผู้ให้เช่า",
  tenant: "ผู้เช่า",
  witness1: "พยานคนที่ 1",
  witness2: "พยานคนที่ 2",
};

export interface LeaseAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  uploadedAt: string;
}

export interface LeaseDetails {
  propertyName: string; propertyAddress: string; roomNumber: string; floor: number;
  landlord: string; landlordPhone: string; tenant: string; tenantPhone: string; tenantIdCard: string; tenantAddress: string;
  witness1: string; witness2: string; madeAt: string; agreementDate: string; startDate: string; endDate: string;
  rent: number; deposit: number; advance: number; dueDay: number; electricRate: number; waterRate: number; terms: string;
}
export interface LeaseSignature { name: string; image: string; signedAt: string; consent: string; documentHash: string }
export interface LeaseRecord {
  id: string; propertyId: string; roomId: string; tenantId: string; revision: number;
  createdAt: string; updatedAt: string; details: LeaseDetails; signatures: Partial<Record<SignerRole, LeaseSignature>>;
  attachments?: LeaseAttachment[];
}
export const consentText = "ข้าพเจ้าได้อ่านและยอมรับข้อความในสัญญาฉบับนี้ และยินยอมใช้ลายเซ็นอิเล็กทรอนิกส์ของข้าพเจ้าเพื่อลงนามในสัญญานี้";
export const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
export function createLease(property: Property, room: Room): LeaseRecord {
  const start = today();
  const end = new Date(`${start}T12:00:00Z`); end.setUTCFullYear(end.getUTCFullYear() + 1); end.setUTCDate(end.getUTCDate() - 1);
  return { id: crypto.randomUUID(), propertyId: property.id, roomId: room.id, tenantId: room.currentTenant!.id,
    revision: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), signatures: {}, attachments: [],
    details: { propertyName: property.name, propertyAddress: property.address, roomNumber: room.roomNumber, floor: room.floor,
      landlord: "", landlordPhone: property.phone, tenant: room.currentTenant!.fullName, tenantPhone: room.currentTenant!.phone,
      tenantIdCard: room.currentTenant!.idCard || "", tenantAddress: room.currentTenant!.address || "", witness1: "", witness2: "", madeAt: property.name,
      agreementDate: start, startDate: start, endDate: end.toISOString().slice(0, 10), rent: room.monthlyRate,
      deposit: 0, advance: 0, dueDay: 5, electricRate: property.electricRate, waterRate: property.waterRate,
      terms: "1. วัตถุประสงค์การเช่า\nใช้ห้องพักเพื่ออยู่อาศัย ผู้เช่าจะไม่ให้เช่าช่วงหรือโอนสิทธิ เว้นแต่ได้รับความยินยอมเป็นหนังสือจากผู้ให้เช่า\n\n2. การดูแลห้องพักและทรัพย์สิน\nคู่สัญญาร่วมตรวจสภาพห้องและรายการทรัพย์สินเมื่อส่งมอบ ผู้เช่าต้องดูแลรักษาห้องพักและไม่ดัดแปลงโดยไม่ได้รับความยินยอม\n\n3. ค่าสาธารณูปโภค\nค่าน้ำและค่าไฟคิดตามการใช้จริงและอัตราที่ระบุในสัญญา โดยแสดงเลขมิเตอร์และรายละเอียดในใบแจ้งหนี้\n\n4. การซ่อมแซมและการเข้าตรวจห้อง\nคู่สัญญาตกลงแจ้งปัญหาชำรุดและนัดหมายเข้าตรวจห้องล่วงหน้า พร้อมตกลงความรับผิดชอบค่าใช้จ่ายตามสาเหตุ\n\n5. การสิ้นสุดสัญญาและเงินประกัน\nคู่สัญญาตกลงวันส่งมอบห้อง ตรวจสภาพและสรุปยอดค้างชำระร่วมกัน การหักเงินประกันต้องแสดงรายการและหลักฐาน พร้อมตกลงกำหนดคืนเงินคงเหลือ\n\n6. ข้อตกลงเพิ่มเติม\nระบุเงื่อนไขการต่อสัญญา การแจ้งย้ายออก การคืนเงินประกัน และระเบียบที่พักที่ทั้งสองฝ่ายตกลงกันก่อนลงนาม" }
  };
}
export function validateLease(d: LeaseDetails): string | null {
  if (![d.landlord, d.tenant, d.madeAt, d.propertyAddress, d.tenantAddress, d.terms].every(v => v.trim())) return "กรอกชื่อคู่สัญญา สถานที่ทำสัญญา ที่อยู่ที่พัก ที่อยู่ผู้เช่า และเงื่อนไขให้ครบก่อนลงนาม";
  if (![d.agreementDate, d.startDate, d.endDate].every(v => /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)))) return "กรุณาระบุวันที่ให้ครบถ้วน";
  if (d.endDate < d.startDate) return "วันสิ้นสุดสัญญาต้องไม่ก่อนวันเริ่มสัญญา";
  if (![d.rent, d.deposit, d.advance, d.electricRate, d.waterRate].every(v => Number.isFinite(v) && v >= 0)) return "จำนวนเงินและอัตราค่าสาธารณูปโภคต้องเป็นตัวเลขตั้งแต่ศูนย์ขึ้นไป";
  if (!Number.isInteger(d.dueDay) || d.dueDay < 1 || d.dueDay > 28) return "กำหนดชำระต้องเป็นวันที่ 1–28 ของเดือน";
  return null;
}
export async function documentHash(record: LeaseRecord): Promise<string> {
  const canonical = JSON.stringify({ id: record.id, propertyId: record.propertyId, roomId: record.roomId, tenantId: record.tenantId,
    details: Object.fromEntries(Object.entries(record.details).sort(([a], [b]) => a.localeCompare(b))) });
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
}
function openStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("pakdee-web-digital-leases-demo-v1", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("leases", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("เปิดพื้นที่บันทึกไม่ได้ กรุณาอนุญาตการจัดเก็บข้อมูลของเว็บไซต์"));
    request.onblocked = () => reject(new Error("กรุณาปิดแท็บอื่นของเว็บไซต์แล้วลองใหม่"));
  });
}
export async function readLeases(): Promise<LeaseRecord[]> {
  const db = await openStore();
  try { return await new Promise((resolve, reject) => {
    const req = db.transaction("leases").objectStore("leases").getAll();
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  }); } finally { db.close(); }
}
export async function saveLease(record: LeaseRecord): Promise<LeaseRecord> {
  const db = await openStore();
  const next: LeaseRecord = {
    ...record,
    attachments: record.attachments || [],
    revision: record.revision + 1,
    updatedAt: new Date().toISOString()
  };
  try { return await new Promise((resolve, reject) => {
    const tx = db.transaction("leases", "readwrite"); const store = tx.objectStore("leases");
    let conflict = false;
    const req = store.get(record.id);
    req.onsuccess = () => {
      if ((req.result?.revision ?? 0) !== record.revision) { conflict = true; tx.abort(); return; }
      store.put(next);
    };
    tx.oncomplete = () => resolve(next);
    tx.onabort = () => reject(new Error(conflict ? "สัญญาถูกแก้ไขในอีกแท็บ กรุณาปิดเอกสารแล้วเปิดใหม่" : "บันทึกไม่สำเร็จ พื้นที่จัดเก็บอาจเต็ม กรุณาลองใหม่"));
    tx.onerror = () => reject(new Error("บันทึกไม่สำเร็จ กรุณาตรวจสอบพื้นที่จัดเก็บของเบราว์เซอร์"));
  }); } finally { db.close(); }
}
