"use client";

/**
 * รายละเอียดผู้เช่า / ผู้เข้าพัก (เปิดจากหน้าทะเบียนผู้เช่า)
 * แสดงข้อมูลทั้งหมดที่กรอกตอนลงทะเบียน + สัญญา/การจอง ในรูปแบบตารางทางการ
 */
import React from "react";
import { ContractItem, DailyBooking, Room, Tenant } from "@/types/dormitory";
import { formatCurrency, formatDateThai } from "@/lib/utils";
import { X, FileSignature } from "lucide-react";

export interface TenantDetailTarget {
  type: "monthly" | "daily";
  isActive: boolean;
  roomNumber: string;
  moveInDate?: string;
  moveOutDate?: string;
  tenant?: Tenant;
  booking?: DailyBooking;
  /** Fallback name/phone when the row comes from a booking only */
  fullName: string;
  phone: string;
}

interface Props {
  target: TenantDetailTarget | null;
  onClose: () => void;
  rooms: Room[];
  contracts: ContractItem[];
  /** เปิดดูสัญญาฉบับปัจจุบัน (ไปหน้าสัญญาเช่าแล้วเปิดสัญญานี้) */
  onViewContract?: (contract: ContractItem) => void;
}

const GENDER: Record<string, string> = { MALE: "ชาย", FEMALE: "หญิง", OTHER: "อื่น ๆ" };
const BOOKING_STATUS: Record<DailyBooking["status"], string> = {
  confirmed: "ยืนยันการจอง",
  checked_in: "กำลังเข้าพัก",
  checked_out: "เช็คเอาท์แล้ว",
  cancelled: "ยกเลิก",
};

/** Revision number: field first, else count "-R" suffixes in the contract number (older data). */
const revOf = (c: ContractItem) => Number(c.revision || 0) || ((c.contractNumber || "").match(/-R\d+/g) || []).length;

const dateText = (v?: string) => (v ? formatDateThai(v) : "");
const dash = (v?: React.ReactNode) => (v === undefined || v === null || v === "" ? <span className="text-[var(--muted)]">-</span> : v);

/** Formal two-pair key/value table: | label | value | label | value | (stacks on phones). */
function InfoTable({ rows }: { rows: [string, React.ReactNode][] }) {
  const pairs: [string, React.ReactNode][][] = [];
  for (let i = 0; i < rows.length; i += 2) pairs.push(rows.slice(i, i + 2));
  return (
    <table className="w-full text-xs border border-[var(--border)] border-collapse">
      <tbody>
        {pairs.map((pair, idx) => (
          <tr key={idx} className="border-b border-[var(--border)] last:border-b-0 align-top">
            {pair.map(([label, value]) => (
              <React.Fragment key={label}>
                <th scope="row" className="w-[18%] bg-[var(--subtle)] text-left font-medium text-[var(--muted)] px-3 py-2 border-r border-[var(--border)]">
                  {label}
                </th>
                <td className="w-[32%] px-3 py-2 font-semibold border-r border-[var(--border)] last:border-r-0 break-words">{dash(value)}</td>
              </React.Fragment>
            ))}
            {pair.length === 1 ? <td colSpan={2} /> : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SectionTitle({ no, children }: { no: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="w-5 h-5 rounded-md bg-[var(--foreground)] text-[var(--card)] text-[10px] font-bold flex items-center justify-center">{no}</span>
      <h4 className="text-xs font-bold tracking-wide">{children}</h4>
    </div>
  );
}

export function TenantDetailModal({ target, onClose, rooms, contracts, onViewContract }: Props) {
  if (!target) return null;
  const t = target.tenant;
  const b = target.booking;
  const name = t?.fullName || b?.guestName || target.fullName;
  const phone = t?.phone || b?.guestPhone || target.phone;
  const normName = (name || "").trim().toLowerCase();
  const digits = (phone || "").replace(/\D/g, "");

  // Services/fees: tenant record first, then the room's current tenant (same person) as fallback
  const room = rooms.find((r) => r.roomNumber === target.roomNumber);
  const roomTenant =
    room?.currentTenant && room.currentTenant.fullName?.trim().toLowerCase() === normName ? room.currentTenant : undefined;
  const svc = { ...(roomTenant || {}), ...(t || {}) } as Partial<Tenant>;

  // Contracts of this person (name first; phone only when no name match — phones can be shared)
  const byName = contracts.filter((c) => c.tenantName?.trim().toLowerCase() === normName);
  const ownContracts = (
    target.type === "daily"
      ? []
      : byName.length > 0
        ? byName
        : contracts.filter((c) => digits && c.tenantPhone?.replace(/\D/g, "") === digits)
  ).sort((a, c) => revOf(a) - revOf(c) || (a.startDate < c.startDate ? -1 : 1));
  const currentContract =
    ownContracts.find((c) => c.status === "active") ||
    ownContracts.find((c) => c.status === "pending_signature") ||
    ownContracts[ownContracts.length - 1];

  // Services: prefer the current contract (it follows revisions), else the tenant record
  const src: Partial<Tenant & ContractItem> = currentContract || svc;
  const services: { label: string; on?: boolean; fee?: number }[] = [
    { label: "เช่าทีวี", on: src.hasTv, fee: src.tvRentalFee },
    { label: "เช่าตู้เย็น", on: src.hasFridge, fee: src.fridgeRentalFee },
    { label: "ค่าส่วนกลาง", on: src.hasCommonFee, fee: src.commonFee },
    { label: "อินเทอร์เน็ต", on: src.hasWifi, fee: src.wifiFee },
    { label: "ที่จอดรถ", on: src.hasParking, fee: src.parkingFee },
  ];
  const extraFees = (src.additionalFees || []).filter((f) => f.isEnabled !== false && f.name);

  const initials = (name || "?").trim().slice(0, 2);
  let sectionNo = 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={onClose}>
      <div
        className="bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl w-full max-w-3xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Document header */}
        <div className="px-6 pt-5 pb-4 border-b-2 border-[var(--foreground)]/80 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold tracking-[0.2em] text-[var(--muted)] uppercase">ทะเบียนประวัติผู้เช่า · Tenant Profile</div>
              <h3 className="text-lg font-bold truncate">{name}</h3>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                    target.type === "monthly"
                      ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30"
                      : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"
                  }`}
                >
                  {target.type === "monthly" ? "ผู้เช่ารายเดือน" : "ผู้เข้าพักรายวัน"}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                    target.isActive
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                      : "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/30"
                  }`}
                >
                  {target.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {target.type === "monthly" && currentContract && onViewContract ? (
              <button
                type="button"
                onClick={() => onViewContract(currentContract)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer transition"
                title={`เปิดสัญญาฉบับปัจจุบัน ${currentContract.contractNumber}`}
              >
                <FileSignature className="w-3.5 h-3.5" />
                ดูสัญญา
              </button>
            ) : null}
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--subtle)] cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[var(--border)] text-xs">
          {[
            ["ห้องพัก", target.roomNumber || "-"],
            ["วันที่เข้า", dateText(target.moveInDate) || "-"],
            ["วันที่ออก", dateText(target.moveOutDate) || "-"],
            [
              target.type === "monthly" ? "ค่าเช่า/เดือน" : "ราคา/คืน",
              target.type === "monthly"
                ? currentContract
                  ? formatCurrency(currentContract.monthlyRent)
                  : "-"
                : b
                  ? formatCurrency(b.dailyRate)
                  : "-",
            ],
          ].map(([label, value], i) => (
            <div key={label} className={`px-5 py-3 ${i > 0 ? "sm:border-l" : ""} ${i % 2 === 1 ? "border-l" : ""} border-[var(--border)]`}>
              <div className="text-[10px] text-[var(--muted)]">{label}</div>
              <div className="text-sm font-bold mt-0.5">{value}</div>
            </div>
          ))}
        </div>

        <div className="px-6 py-5 overflow-y-auto space-y-6">
          {/* 1. Personal */}
          <section>
            <SectionTitle no={++sectionNo}>ข้อมูลส่วนบุคคล</SectionTitle>
            <InfoTable
              rows={[
                ["ชื่อ-นามสกุล", name],
                ["เลขบัตรประชาชน", <span key="id" className="font-mono">{t?.idCard || b?.idCard}</span>],
                ["เพศ", t?.gender ? GENDER[t.gender] : undefined],
                ["อายุ", t?.age ? `${t.age} ปี` : undefined],
                ["เลขผู้เสียภาษี", t?.taxId ? <span className="font-mono">{t.taxId}</span> : undefined],
                ["ภาษาใบแจ้งหนี้", t?.invoiceLang ? (t.invoiceLang === "EN" ? "English" : "ไทย") : undefined],
              ]}
            />
          </section>

          {/* 2. Contact */}
          <section>
            <SectionTitle no={++sectionNo}>ข้อมูลการติดต่อ</SectionTitle>
            <InfoTable
              rows={[
                ["เบอร์โทรศัพท์", <span key="ph" className="font-mono">{phone}</span>],
                ["อีเมล", t?.email],
                ["ผู้ติดต่อฉุกเฉิน", t?.emergencyContact],
                ["ทะเบียนรถ", t?.vehiclePlate || b?.vehiclePlate],
                ["ชื่อ LINE", t?.Line_Acc || t?.lineAcc || t?.lineDisplayName],
                [
                  "บัญชี LINE",
                  t?.lineUserId || t?.lineId ? (
                    <span className="text-emerald-600">ผูกแล้ว{t?.lineLinkedAt ? ` (${dateText(t.lineLinkedAt)})` : ""}</span>
                  ) : (
                    <span className="text-[var(--muted)]">ยังไม่ผูก</span>
                  ),
                ],
                ["ที่อยู่", t?.address],
              ]}
            />
          </section>

          {/* 3. Stay */}
          {target.type === "monthly" ? null : (
            <section>
              <SectionTitle no={++sectionNo}>การเข้าพักรายวัน</SectionTitle>
              {b ? (
                <InfoTable
                  rows={[
                    ["เช็คอิน", `${dateText(b.checkInDate)} ${b.checkInTime || ""}`],
                    ["เช็คเอาท์", `${dateText(b.checkOutDate)} ${b.checkOutTime || ""}`],
                    ["จำนวนคืน", `${b.nights || 1} คืน`],
                    ["ค่าห้องรวม", formatCurrency(b.totalRoomPrice)],
                    ["มัดจำกุญแจ", formatCurrency(b.keyDeposit || 0)],
                    ["มัดจำห้อง", formatCurrency(b.roomDeposit || 0)],
                    ["สถานะการจอง", BOOKING_STATUS[b.status] || b.status],
                  ]}
                />
              ) : (
                <div className="text-xs text-[var(--muted)] border border-dashed border-[var(--border)] rounded-lg p-3">
                  การจองปิดแล้ว (เช็คเอาท์) — วันที่เข้า/ออกแสดงด้านบน
                </div>
              )}
            </section>
          )}

          {/* 4. Services & fees (monthly) */}
          {target.type === "monthly" ? (
            <section>
              <SectionTitle no={++sectionNo}>ค่าบริการรายเดือน{currentContract ? " (ตามสัญญาปัจจุบัน)" : ""}</SectionTitle>
              <table className="w-full text-xs border border-[var(--border)] border-collapse">
                <thead>
                  <tr className="bg-[var(--subtle)] text-[var(--muted)]">
                    <th className="px-3 py-2 text-left font-medium border-r border-[var(--border)]">รายการ</th>
                    <th className="px-3 py-2 text-center font-medium border-r border-[var(--border)] w-28">ใช้บริการ</th>
                    <th className="px-3 py-2 text-right font-medium w-32">บาท/เดือน</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((s) => (
                    <tr key={s.label} className={`border-t border-[var(--border)] ${s.on ? "" : "text-[var(--muted)]"}`}>
                      <td className="px-3 py-2 border-r border-[var(--border)]">{s.label}</td>
                      <td className="px-3 py-2 border-r border-[var(--border)] text-center">{s.on ? "✓" : "-"}</td>
                      <td className="px-3 py-2 text-right">{s.on ? formatCurrency(Number(s.fee || 0)) : "-"}</td>
                    </tr>
                  ))}
                  {extraFees.map((f) => (
                    <tr key={f.id || f.name} className="border-t border-[var(--border)]">
                      <td className="px-3 py-2 border-r border-[var(--border)]">{f.name}</td>
                      <td className="px-3 py-2 border-r border-[var(--border)] text-center">✓</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(Number(f.amount || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          {/* ID card image */}
          {t?.idCardImageUrl ? (
            <section>
              <SectionTitle no={++sectionNo}>สำเนาบัตรประชาชน</SectionTitle>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={t.idCardImageUrl}
                alt="รูปบัตรประชาชน"
                className="max-h-56 rounded-lg border border-[var(--border)] object-contain cursor-pointer"
                onClick={() => window.open(t.idCardImageUrl, "_blank")}
              />
            </section>
          ) : null}

          {/* Notes */}
          {t?.notes ? (
            <section>
              <SectionTitle no={++sectionNo}>หมายเหตุ</SectionTitle>
              <div className="text-xs whitespace-pre-wrap border border-[var(--border)] rounded-lg p-3 bg-[var(--subtle)]">{t.notes}</div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
