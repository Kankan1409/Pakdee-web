"use client";

import React, { useState, useMemo } from "react";
import { Room, Tenant, ContractItem, Invoice, DailyBooking, tenantTypeOf } from "@/types/dormitory";
import { bookingsOfTenant, contractsOfTenant, roomOfTenant } from "@/lib/tenant-links";
import { Users, Plus, Search, X, Eye } from "lucide-react";
import { TenantDetailModal, TenantDetailTarget } from "@/components/tenants/tenant-detail-modal";

/** Normalize a date string to YYYY-MM-DD (converts พ.ศ. years) for filtering/sorting. */
const toDateKey = (v?: string): string => {
  if (!v) return "";
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const y = Number(m[1]);
    return `${y > 2400 ? y - 543 : y}-${m[2]}-${m[3]}`;
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
};

const formatThaiDate = (v?: string): string => {
  const key = toDateKey(v);
  if (!key) return v || "-";
  return new Date(`${key}T00:00:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
};

interface TenantsListViewProps {
  rooms: Room[];
  tenants: Tenant[];
  contracts: ContractItem[];
  invoices: Invoice[];
  dailyBookings: DailyBooking[];
  onOpenNewTenant: () => void;
  /** ปุ่ม "ดูสัญญา" ในรายละเอียดผู้เช่า: ไปหน้าสัญญาเช่าแล้วเปิดสัญญานี้ */
  onViewContract?: (contract: ContractItem) => void;
}

export function TenantsListView({
  rooms,
  tenants,
  contracts,
  // invoices: not used for linking (tenant ↔ bill is invoices.tenant_id)
  dailyBookings,
  onOpenNewTenant,
  onViewContract,
}: TenantsListViewProps) {
  const [filterTab, setFilterTab] = useState<"all" | "monthly" | "daily">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [detailTarget, setDetailTarget] = useState<TenantDetailTarget | null>(null);

  const { combinedList, filteredList, monthlyCount, dailyCount } = useMemo(() => {
    // ประเภท (รายเดือน/รายวัน) มาจาก tenants.tenant_type ที่ตั้งตอนสร้างเท่านั้น
    // ผู้เช่า ↔ ห้อง / สัญญา / การจอง ผูกกันด้วยรหัส (ดู src/lib/tenant-links.ts) ไม่ใช้เบอร์โทร
    const combined: Array<{
      id: string;
      type: "monthly" | "daily";
      roomNumber: string;
      fullName: string;
      phone: string;
      idCard?: string;
      lineAcc?: string;
      lineId?: string;
      vehiclePlate?: string;
      emergencyContact?: string;
      depositAmount?: number;
      moveInDate?: string;
      moveOutDate?: string;
      isActive: boolean;
      /** Source records for the detail dialog */
      tenant?: Tenant;
      booking?: DailyBooking;
    }> = [];

    // Daily booking: active while confirmed / checked in; inactive once checked out or cancelled.
    const bookingIsActive = (b: DailyBooking) => b.status === "confirmed" || b.status === "checked_in";
    const claimedBookings = new Set<string>();

    tenants.forEach((t) => {
      const type = tenantTypeOf(t);
      const liveRoom = roomOfTenant(t, rooms);
      const noteRoom = t.notes?.match(/ห้อง\s*([A-Za-z0-9_-]+)/)?.[1] || "";
      const knownRoom = liveRoom?.roomNumber || t.roomNumber || "";
      const lineAcc = t.Line_Acc || t.lineAcc || t.lineDisplayName || t.lineId || "";

      if (type === "daily") {
        const ownBookings = bookingsOfTenant(t, dailyBookings, knownRoom || noteRoom || undefined);
        ownBookings.forEach((b) => claimedBookings.add(b.id));
        const booking = ownBookings[0];
        // Booking is deleted at checkout: read the stay "(YYYY-MM-DD ถึง YYYY-MM-DD)" and the
        // checkout mark "[เช็คเอาท์ YYYY-MM-DD]" from notes.
        const noteStay = t.notes?.match(/\((\d{4}-\d{2}-\d{2})\s*ถึง\s*(\d{4}-\d{2}-\d{2})\)/);
        const noteCheckout = t.notes?.match(/\[เช็คเอาท์\s*(\d{4}-\d{2}-\d{2})\]/);
        const stillStaying = !noteCheckout && liveRoom?.status === "daily";
        const bookingDeposit = booking ? (booking.keyDeposit || 0) + (booking.roomDeposit || 0) : 0;

        combined.push({
          id: t.id,
          type: "daily",
          roomNumber: knownRoom || booking?.roomNumber || noteRoom,
          fullName: t.fullName,
          phone: t.phone,
          idCard: t.idCard || booking?.idCard || "",
          lineAcc,
          lineId: t.lineId,
          vehiclePlate: t.vehiclePlate || booking?.vehiclePlate || "",
          emergencyContact: t.emergencyContact,
          depositAmount: bookingDeposit > 0 ? bookingDeposit : t.depositAmount,
          moveInDate: booking?.checkInDate || noteStay?.[1],
          moveOutDate: booking
            ? booking.checkOutDate
            : noteCheckout?.[1] || (stillStaying ? undefined : noteStay?.[2]),
          isActive: booking ? bookingIsActive(booking) : stillStaying,
          tenant: t,
          booking,
        });
        return;
      }

      // Monthly: dates and Active status from this tenant's own contracts.
      const ownContracts = contractsOfTenant(t, contracts, knownRoom || undefined).filter((c) => c.status !== "draft");
      const latestContract = [...ownContracts].sort((a, b) => (toDateKey(a.startDate) < toDateKey(b.startDate) ? 1 : -1))[0];
      const hasOpenContract = ownContracts.some((c) => c.status === "active" || c.status === "pending_signature");
      const monthlyActive = Boolean(liveRoom) || hasOpenContract;
      const earliestStart = ownContracts
        .map((c) => toDateKey(c.startDate))
        .filter(Boolean)
        .sort()[0];
      const lastEnded = ownContracts
        .filter((c) => c.status === "terminated" || c.status === "expired" || c.status === "superseded")
        .map((c) => toDateKey(c.movedOutAt || c.endDate))
        .filter(Boolean)
        .sort()
        .pop();

      combined.push({
        id: t.id,
        type: "monthly",
        roomNumber: knownRoom || latestContract?.roomNumber || noteRoom,
        fullName: t.fullName,
        phone: t.phone,
        idCard: t.idCard || "",
        lineAcc,
        lineId: t.lineId,
        vehiclePlate: t.vehiclePlate || "",
        emergencyContact: t.emergencyContact,
        depositAmount: t.depositAmount,
        moveInDate: earliestStart,
        moveOutDate: monthlyActive ? undefined : lastEnded,
        isActive: monthlyActive,
        tenant: t,
      });
    });

    // Bookings whose guest is not in the tenant registry: their own daily row.
    dailyBookings.forEach((b) => {
      if (claimedBookings.has(b.id)) return;
      combined.push({
        id: b.id,
        type: "daily",
        roomNumber: b.roomNumber,
        fullName: b.guestName,
        phone: b.guestPhone,
        idCard: b.idCard || "",
        vehiclePlate: b.vehiclePlate || "",
        depositAmount: (b.keyDeposit || 0) + (b.roomDeposit || 0),
        moveInDate: b.checkInDate,
        moveOutDate: b.checkOutDate,
        isActive: bookingIsActive(b),
        booking: b,
      });
    });

    const filtered = combined.filter((item) => {
      const matchType = filterTab === "all" || item.type === filterTab;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        item.fullName.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q) ||
        (item.lineAcc && item.lineAcc.toLowerCase().includes(q)) ||
        (item.idCard && item.idCard.toLowerCase().includes(q)) ||
        (item.roomNumber && item.roomNumber.toLowerCase().includes(q));
      const matchStatus =
        statusFilter === "all" || (statusFilter === "active" ? item.isActive : !item.isActive);
      // วันที่เริ่ม: วันที่เข้า ตั้งแต่วันนี้เป็นต้นไป · วันที่ออก: วันที่ออก ไม่เกินวันนี้
      let matchDate = true;
      if (dateFrom) {
        const inKey = toDateKey(item.moveInDate);
        matchDate = Boolean(inKey) && inKey >= dateFrom;
      }
      if (matchDate && dateTo) {
        const outKey = toDateKey(item.moveOutDate);
        matchDate = Boolean(outKey) && outKey <= dateTo;
      }
      return matchType && matchSearch && matchStatus && matchDate;
    });

    const mCount = combined.filter((i) => i.type === "monthly").length;
    const dCount = combined.filter((i) => i.type === "daily").length;

    return {
      combinedList: combined,
      filteredList: filtered,
      monthlyCount: mCount,
      dailyCount: dCount,
    };
  }, [rooms, tenants, contracts, dailyBookings, filterTab, searchQuery, statusFilter, dateFrom, dateTo]);

  const hasExtraFilter = statusFilter !== "all" || Boolean(dateFrom) || Boolean(dateTo);
  const filterInputCls =
    "px-2 py-1.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:outline-emerald-500";

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>ทะเบียนประวัติผู้เช่าและผู้เข้าพัก (Tenant & Guest Directory)</span>
          </h3>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            รวมประวัติผู้เช่ารายเดือนและลูกค้าเข้าพักรายวันทั้งหมด เพื่อความครบถ้วนของข้อมูล
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenNewTenant}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer shadow-sm flex items-center gap-1.5 self-start sm:self-auto shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ ทำสัญญาเช่า / เพิ่มผู้เช่าใหม่</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-1">
        <div className="flex items-center gap-1.5 bg-[var(--subtle)] p-1 rounded-xl border border-[var(--border)] text-xs">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              filterTab === "all"
                ? "bg-[var(--card)] text-emerald-600 dark:text-emerald-400 shadow-xs border border-[var(--border)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            ทั้งหมด ({combinedList.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("monthly")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              filterTab === "monthly"
                ? "bg-[var(--card)] text-indigo-600 dark:text-indigo-400 shadow-xs border border-[var(--border)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>รายเดือน ({monthlyCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("daily")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              filterTab === "daily"
                ? "bg-[var(--card)] text-blue-600 dark:text-blue-400 shadow-xs border border-[var(--border)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>รายวัน ({dailyCount})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อ, เบอร์โทร, ห้อง..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:outline-emerald-500"
          />
        </div>
      </div>

      {/* Status & move-in/out date filters */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-[var(--muted)] font-semibold">สถานะ</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
          className={filterInputCls}
        >
          <option value="all">ทั้งหมด</option>
          <option value="active">Active (ใช้งาน)</option>
          <option value="inactive">Inactive (ออกแล้ว)</option>
        </select>
        <span className="text-[var(--muted)] font-semibold ml-2">วันที่เริ่ม</span>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={filterInputCls} />
        <span className="text-[var(--muted)] font-semibold ml-2">วันที่ออก</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={filterInputCls} />
        {hasExtraFilter && (
          <button
            type="button"
            onClick={() => {
              setStatusFilter("all");
              setDateFrom("");
              setDateTo("");
            }}
            className="px-2 py-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--subtle)] flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3 h-3" /> ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Directory Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--muted)] bg-[var(--subtle)]">
              <th className="py-3 px-3">ประเภท</th>
              <th className="py-3 px-3">ห้อง</th>
              <th className="py-3 px-3">ชื่อ-นามสกุล</th>
              <th className="py-3 px-3">เบอร์โทรศัพท์</th>
              <th className="py-3 px-3">Line_acc</th>
              <th className="py-3 px-3">เลขบัตรประชาชน</th>
              <th className="py-3 px-3">ทะเบียนรถ</th>
              <th className="py-3 px-3">วันที่เข้า</th>
              <th className="py-3 px-3">วันที่ออก</th>
              <th className="py-3 px-3">สถานะ</th>
              <th className="py-3 px-3 text-right">รายละเอียด</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)] text-[var(--foreground)]">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-[var(--muted)]">
                  ไม่พบข้อมูลผู้เช่าตามตัวกรองที่เลือก
                </td>
              </tr>
            ) : (
              filteredList.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setDetailTarget(t)}
                  className="hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
                  title="กดเพื่อดูรายละเอียดผู้เช่า"
                >
                  <td className="py-3 px-3">
                    {t.type === "monthly" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                        รายเดือน
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25">
                        รายวัน
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-bold text-sm">
                    {t.roomNumber ? `ห้อง ${t.roomNumber}` : "-"}
                  </td>
                  <td className="py-3 px-3 font-bold">{t.fullName}</td>
                  <td className="py-3 px-3 font-mono">{t.phone}</td>
                  <td className="py-3 px-3">
                    {t.lineAcc ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#06C755]/10 text-[#06C755] font-semibold text-[11px] border border-[#06C755]/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#06C755]" />
                        {t.lineAcc}
                      </span>
                    ) : (
                      <span className="text-[var(--muted)] text-[11px]">-</span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px]">{t.idCard || "-"}</td>
                  <td className="py-3 px-3 text-[var(--muted)] text-[11px]">
                    {t.vehiclePlate || "-"}
                  </td>
                  <td className="py-3 px-3 text-[11px] whitespace-nowrap">
                    {t.moveInDate ? formatThaiDate(t.moveInDate) : "-"}
                  </td>
                  <td className="py-3 px-3 text-[11px] whitespace-nowrap">
                    {t.moveOutDate ? formatThaiDate(t.moveOutDate) : "-"}
                  </td>
                  <td className="py-3 px-3">
                    {t.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-600 dark:text-slate-300 border border-slate-500/25">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailTarget(t);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--border)] hover:bg-[var(--subtle)] text-[11px] font-semibold cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      ดูข้อมูล
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TenantDetailModal
        target={detailTarget}
        onClose={() => setDetailTarget(null)}
        rooms={rooms}
        contracts={contracts}
        onViewContract={
          onViewContract
            ? (c) => {
                setDetailTarget(null);
                onViewContract(c);
              }
            : undefined
        }
      />
    </div>
  );
}
