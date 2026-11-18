/**
 * ความสัมพันธ์ ผู้เช่า ↔ สัญญา ↔ การจองรายวัน ↔ ห้อง
 *
 * ผูกกันด้วยรหัส (contracts.tenant_id, daily_bookings.tenant_id, rooms.current_tenant_id)
 * ไม่ใช้เบอร์โทรเด็ดขาด (หลายคนใช้เบอร์เดียวกันได้)
 * ข้อมูลเก่าที่ยังไม่มี tenant_id เท่านั้นที่ใช้ "ชื่อตรงกัน + สาขาเดียวกัน (+ ห้องเดียวกัน)" แทน
 */
import { ContractItem, DailyBooking, Room, Tenant, tenantTypeOf } from "@/types/dormitory";

const norm = (v?: string) => (v || "").trim().toLowerCase();
const sameBranch = (a?: string, b?: string) => !a || !b || a === b;

/** ห้องที่ผู้เช่าอยู่ตอนนี้ (rooms.current_tenant_id) */
export function roomOfTenant(tenant: Tenant, rooms: Room[]): Room | undefined {
  return (
    rooms.find((r) => r.currentTenant?.id === tenant.id) ||
    rooms.find((r) => tenant.roomId && r.id === tenant.roomId && r.currentTenant && norm(r.currentTenant.fullName) === norm(tenant.fullName))
  );
}

/** สัญญาของผู้เช่ารายเดือน (ผู้เข้าพักรายวันไม่มีสัญญา) */
export function contractsOfTenant(tenant: Tenant | undefined, contracts: ContractItem[], roomNumber?: string): ContractItem[] {
  if (!tenant || tenantTypeOf(tenant) === "daily") return [];
  const name = norm(tenant.fullName);
  return contracts.filter((c) =>
    c.tenantId
      ? c.tenantId === tenant.id
      : Boolean(name) &&
        norm(c.tenantName) === name &&
        sameBranch(c.propertyId, tenant.propertyId) &&
        (!roomNumber || c.roomNumber === roomNumber)
  );
}

/** การจองรายวันของผู้เข้าพัก (ใหม่สุดก่อน) */
export function bookingsOfTenant(tenant: Tenant | undefined, bookings: DailyBooking[], roomNumber?: string): DailyBooking[] {
  if (!tenant) return [];
  const isDaily = tenantTypeOf(tenant) === "daily";
  const name = norm(tenant.fullName);
  return bookings
    .filter((b) =>
      b.tenantId
        ? b.tenantId === tenant.id
        : isDaily &&
          Boolean(name) &&
          norm(b.guestName) === name &&
          sameBranch(b.propertyId, tenant.propertyId) &&
          (!roomNumber || b.roomNumber === roomNumber)
    )
    .sort((a, b) => (a.checkInDate < b.checkInDate ? 1 : -1));
}
