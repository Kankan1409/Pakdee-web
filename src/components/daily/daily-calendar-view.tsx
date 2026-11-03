"use client";

import React, { useState } from "react";
import { DailyBooking, Room } from "@/types/dormitory";
import { Calendar, Plus, Search, Filter } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface DailyCalendarViewProps {
  dailyBookings: DailyBooking[];
  rooms: Room[];
  onOpenNewBooking: () => void;
  onDailyCheckIn: (bookingId: string, roomNumber: string) => void;
  onDailyCheckOut: (bookingId: string, roomNumber: string, keyDeposit: number) => void;
}

export function DailyCalendarView({
  dailyBookings,
  rooms,
  onOpenNewBooking,
  onDailyCheckIn,
  onDailyCheckOut,
}: DailyCalendarViewProps) {
  const [filterStatus, setFilterStatus] = useState<"all" | "checked_in" | "confirmed">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const checkedInCount = dailyBookings.filter((b) => b.status === "checked_in").length;
  const confirmedCount = dailyBookings.filter((b) => b.status === "confirmed").length;

  const filteredBookings = dailyBookings.filter((b) => {
    const matchStatus = filterStatus === "all" || b.status === filterStatus;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      b.roomNumber.toLowerCase().includes(q) ||
      b.guestName.toLowerCase().includes(q) ||
      (b.guestPhone && b.guestPhone.includes(q));
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-5">
      {/* Top Banner Card: Header & Action */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 shadow-xs">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-[var(--foreground)] tracking-tight">
                ปฏิทินจองห้องพักรายวัน (Daily Bookings)
              </h3>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                {dailyBookings.length} รายการทั้งหมด
              </span>
            </div>
            <p className="text-xs text-[var(--muted)] mt-1">
              เช็คอิน 14:00 น. / เช็คเอาท์ 12:00 น. • มัดจำคีย์การ์ด • ส่งต่องานทำความสะอาดแม่บ้านอัตโนมัติ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenNewBooking}
            className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ จองห้องรายวันใหม่</span>
          </button>
        </div>
      </div>

      {/* Data Section: Distinctly Separated Card */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <h4 className="text-sm font-bold text-[var(--foreground)]">
              รายการผู้เข้าพักรายวันและสถานะห้อง
            </h4>
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--muted)] flex-wrap">
            <button
              type="button"
              onClick={() => setFilterStatus("all")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition cursor-pointer",
                filterStatus === "all" ? "bg-[var(--subtle)] font-bold text-[var(--foreground)]" : ""
              )}
            >
              ทั้งหมด ({dailyBookings.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("checked_in")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer",
                filterStatus === "checked_in" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold" : ""
              )}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>กำลังเข้าพัก ({checkedInCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("confirmed")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer",
                filterStatus === "confirmed" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold" : ""
              )}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>รอเข้าพัก ({confirmedCount})</span>
            </button>
          </div>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="py-12 text-center text-[var(--muted)] space-y-3 bg-[var(--subtle)] rounded-2xl border border-[var(--border)]">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="font-semibold text-sm text-[var(--foreground)]">
              ยังไม่มีรายการจองห้องพักรายวันตามเงื่อนไขที่เลือก
            </div>
            <p className="text-xs max-w-sm mx-auto">
              คลิกปุ่ม &quot;+ จองห้องรายวันใหม่&quot; ด้านบน เพื่อเปิดห้องว่างให้ลูกค้าเข้าพักแบบรายวัน
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBookings.map((b) => (
              <div
                key={b.id}
                className="p-4 rounded-xl border border-[var(--border)] bg-[var(--subtle)] hover:border-amber-500/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs"
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="px-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] font-black text-sm text-[var(--foreground)] shrink-0 shadow-2xs text-center min-w-[70px]">
                    <div className="text-[10px] text-[var(--muted)] font-normal uppercase">ห้องพัก</div>
                    <div>{b.roomNumber}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-sm text-[var(--foreground)] flex items-center gap-2">
                      <span>{b.guestName}</span>
                      <span className="text-xs font-mono font-normal text-[var(--muted)]">
                        ({b.guestPhone})
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-[11px] font-medium text-[var(--foreground)]">
                        📅 เข้าพัก {b.nights} คืน ({b.checkInDate} ถึง {b.checkOutDate})
                      </span>
                      <span>•</span>
                      <span>
                        ค่าห้อง: <strong className="text-[var(--foreground)]">{formatCurrency(b.totalRoomPrice)}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        มัดจำ: <strong className="text-amber-600 dark:text-amber-400">{formatCurrency(b.keyDeposit)}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
                  <span
                    className={cn(
                      "font-bold text-xs px-3 py-1.5 rounded-xl border flex items-center gap-1.5",
                      b.status === "checked_in"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                    )}
                  >
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        b.status === "checked_in" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                      )}
                    />
                    {b.status === "checked_in" ? "กำลังเข้าพัก (In แล้ว)" : "ยืนยันการจองแล้ว"}
                  </span>

                  {b.status === "confirmed" && (
                    <button
                      type="button"
                      onClick={() => onDailyCheckIn(b.id, b.roomNumber)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer shadow-xs"
                    >
                      เช็คอิน (In)
                    </button>
                  )}
                  {b.status === "checked_in" && (
                    <button
                      type="button"
                      onClick={() => onDailyCheckOut(b.id, b.roomNumber, b.keyDeposit)}
                      className="bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer shadow-xs"
                    >
                      เช็คเอาท์ (Out)
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
