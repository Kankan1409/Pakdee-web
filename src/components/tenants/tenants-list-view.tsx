"use client";

import React, { useState, useMemo } from "react";
import { Room, Tenant, ContractItem, Invoice, DailyBooking } from "@/types/dormitory";
import { Users, Plus, Search } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface TenantsListViewProps {
  rooms: Room[];
  tenants: Tenant[];
  contracts: ContractItem[];
  invoices: Invoice[];
  dailyBookings: DailyBooking[];
  onOpenNewTenant: () => void;
}

export function TenantsListView({
  rooms,
  tenants,
  contracts,
  invoices,
  dailyBookings,
  onOpenNewTenant,
}: TenantsListViewProps) {
  const [filterTab, setFilterTab] = useState<"all" | "monthly" | "daily">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const { combinedList, filteredList, monthlyCount, dailyCount } = useMemo(() => {
    // Map room numbers to tenants (Multi-source: rooms, contracts, invoices)
    const tenantRoomMap = new Map<string, string>();
    rooms.forEach((r) => {
      if (r.currentTenant) {
        tenantRoomMap.set(r.currentTenant.id, r.roomNumber);
        tenantRoomMap.set(r.currentTenant.fullName, r.roomNumber);
      }
    });
    contracts.forEach((c) => {
      if (c.tenantName && c.roomNumber) {
        if (!tenantRoomMap.has(c.tenantName)) tenantRoomMap.set(c.tenantName, c.roomNumber);
      }
    });
    invoices.forEach((inv) => {
      if (inv.tenantName && inv.roomNumber) {
        if (!tenantRoomMap.has(inv.tenantName)) tenantRoomMap.set(inv.tenantName, inv.roomNumber);
      }
    });

    // Fast lookup for daily bookings
    const dailyBookingMap = new Map<string, DailyBooking>();
    dailyBookings.forEach((b) => {
      dailyBookingMap.set(b.guestName, b);
      if (b.guestPhone) dailyBookingMap.set(b.guestPhone, b);
      dailyBookingMap.set(`${b.guestName}_${b.guestPhone}`, b);
    });

    // Combined list of monthly and daily tenants
    const combined: Array<{
      id: string;
      type: "monthly" | "daily";
      roomNumber: string;
      fullName: string;
      phone: string;
      idCard?: string;
      lineId?: string;
      vehiclePlate?: string;
      emergencyContact?: string;
      depositAmount?: number;
      stayInfo?: string;
      statusText?: string;
    }> = [];

    tenants.forEach((t) => {
      const isDaily = t.notes?.includes("รายวัน");
      const matchingBooking =
        dailyBookingMap.get(`${t.fullName}_${t.phone}`) ||
        dailyBookingMap.get(t.fullName) ||
        (t.phone ? dailyBookingMap.get(t.phone) : undefined);

      const noteRoomMatch = t.notes?.match(/ห้อง\s*([A-Za-z0-9_-]+)/);
      const room =
        t.roomNumber ||
        tenantRoomMap.get(t.id) ||
        tenantRoomMap.get(t.fullName) ||
        matchingBooking?.roomNumber ||
        (noteRoomMatch ? noteRoomMatch[1] : "");

      const matchingContract = contracts.find(
        (c) =>
          (c.tenantName && c.tenantName.trim().toLowerCase() === t.fullName.trim().toLowerCase()) ||
          (t.phone && c.tenantPhone && c.tenantPhone.replace(/\D/g, "") === t.phone.replace(/\D/g, "")) ||
          (t.roomNumber && c.roomNumber === t.roomNumber)
      );

      const finalIdCard = t.idCard || matchingBooking?.idCard || "";
      const finalPlate = t.vehiclePlate || matchingBooking?.vehiclePlate || (matchingContract as any)?.vehiclePlate || "";

      combined.push({
        id: t.id,
        type: isDaily ? "daily" : "monthly",
        roomNumber: room,
        fullName: t.fullName,
        phone: t.phone,
        idCard: finalIdCard,
        lineId: t.lineId,
        vehiclePlate: finalPlate,
        emergencyContact: t.emergencyContact,
        depositAmount:
          t.depositAmount ||
          (matchingBooking
            ? (matchingBooking.keyDeposit || 0) + (matchingBooking.roomDeposit || 0)
            : undefined),
        stayInfo: isDaily
          ? t.notes ||
            (matchingBooking
              ? `เข้าพัก ${matchingBooking.checkInDate} ถึง ${matchingBooking.checkOutDate}`
              : "ผู้เข้าพักรายวัน")
          : room
          ? `สัญญาเช่าห้อง ${room}`
          : "ผู้เช่าในระบบ",
        statusText: isDaily ? "ผู้เข้าพักรายวัน" : "ผู้เช่ารายเดือน",
      });
    });

    dailyBookings.forEach((b) => {
      const existingItem = combined.find(
        (item) => item.fullName === b.guestName || (b.guestPhone && item.phone === b.guestPhone)
      );
      if (existingItem) {
        if (!existingItem.roomNumber && b.roomNumber) {
          existingItem.roomNumber = b.roomNumber;
        }
        if (!existingItem.idCard && b.idCard) {
          existingItem.idCard = b.idCard;
        }
        if (!existingItem.vehiclePlate && b.vehiclePlate) {
          existingItem.vehiclePlate = b.vehiclePlate;
        }
      } else {
        combined.push({
          id: b.id,
          type: "daily",
          roomNumber: b.roomNumber,
          fullName: b.guestName,
          phone: b.guestPhone,
          idCard: b.idCard || "",
          vehiclePlate: b.vehiclePlate || "",
          depositAmount: (b.keyDeposit || 0) + (b.roomDeposit || 0),
          stayInfo: `เข้าพัก ${b.checkInDate} ถึง ${b.checkOutDate} (${b.nights} คืน)`,
          statusText: b.status === "checked_in" ? "กำลังเข้าพัก" : "ยืนยันการจองแล้ว",
        });
      }
    });

    const filtered = combined.filter((item) => {
      const matchType = filterTab === "all" || item.type === filterTab;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        item.fullName.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q) ||
        (item.idCard && item.idCard.toLowerCase().includes(q)) ||
        (item.roomNumber && item.roomNumber.toLowerCase().includes(q));
      return matchType && matchSearch;
    });

    const mCount = combined.filter((i) => i.type === "monthly").length;
    const dCount = combined.filter((i) => i.type === "daily").length;

    return {
      combinedList: combined,
      filteredList: filtered,
      monthlyCount: mCount,
      dailyCount: dCount,
    };
  }, [rooms, tenants, contracts, invoices, dailyBookings, filterTab, searchQuery]);

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

      {/* Directory Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--muted)] bg-[var(--subtle)]">
              <th className="py-3 px-3">ประเภท</th>
              <th className="py-3 px-3">ห้อง</th>
              <th className="py-3 px-3">ชื่อ-นามสกุล</th>
              <th className="py-3 px-3">เบอร์โทรศัพท์</th>
              <th className="py-3 px-3">ข้อมูลสัญญา / การเข้าพัก</th>
              <th className="py-3 px-3">เลขบัตรประชาชน</th>
              <th className="py-3 px-3">มัดจำ</th>
              <th className="py-3 px-3">ทะเบียนรถ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)] text-[var(--foreground)]">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[var(--muted)]">
                  ไม่พบข้อมูลผู้เช่าตามตัวกรองที่เลือก
                </td>
              </tr>
            ) : (
              filteredList.map((t) => (
                <tr key={t.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition">
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
                  <td className="py-3 px-3 text-[var(--muted)] text-[11px] max-w-xs truncate">
                    {t.stayInfo || "-"}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px]">{t.idCard || "-"}</td>
                  <td className="py-3 px-3 font-medium">
                    {t.depositAmount ? formatCurrency(t.depositAmount) : "-"}
                  </td>
                  <td className="py-3 px-3 text-[var(--muted)] text-[11px]">
                    {t.vehiclePlate || "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
