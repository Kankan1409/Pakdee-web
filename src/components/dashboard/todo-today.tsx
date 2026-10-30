"use client";

import React from "react";
import { Room, Invoice } from "@/types/dormitory";
import { formatCurrency, formatDateThai } from "@/lib/utils";
import {
  AlertCircle,
  Calendar,
  Clock,
  CheckCircle2,
  ChevronRight,
  Zap,
  ArrowRight,
  Phone,
  Receipt,
  Sparkles,
  BellRing,
} from "lucide-react";

interface TodoTodayProps {
  rooms: Room[];
  invoices: Invoice[];
  onSelectRoom?: (room: Room) => void;
  onNavigateTab?: (tab: string) => void;
  onOpenQuickMeter?: () => void;
}

export function TodoToday({
  rooms,
  invoices,
  onSelectRoom,
  onNavigateTab,
  onOpenQuickMeter,
}: TodoTodayProps) {
  const today = new Date();
  const todayFormatted = today.toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // 1. Identify Overdue Rooms & Invoices
  const unpaidInvoices = invoices.filter((inv) => inv.status === "unpaid" || inv.status === "overdue");
  const overdueRooms = rooms.filter((r) => r.status === "overdue" || unpaidInvoices.some((inv) => inv.roomNumber === r.roomNumber));
  const totalOverdueAmount = unpaidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

  // 2. Identify Expiring Contracts (within 30 days or already expired)
  const expiringRooms = rooms
    .filter((r) => r.status === "occupied" && r.leaseEndDate)
    .map((r) => {
      const end = new Date(r.leaseEndDate!).getTime();
      const now = new Date().setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
      return { room: r, diffDays };
    })
    .filter((item) => item.diffDays <= 30)
    .sort((a, b) => a.diffDays - b.diffDays);

  const hasUrgentActions = overdueRooms.length > 0 || expiringRooms.length > 0;

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-5 shadow-xs space-y-4">
      {/* Top Banner: Title & Date */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <BellRing className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[var(--foreground)] tracking-tight">
                กล่องแจ้งเตือนงานสำคัญ (To-Do Today)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                Starter Essential
              </span>
            </div>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              สรุปสิ่งที่เจ้าของหอพักต้องติดตามและดำเนินการประจำวัน
            </p>
          </div>
        </div>
        <div className="text-xs font-semibold text-[var(--muted)] bg-[var(--subtle)] px-3 py-1.5 rounded-xl border border-[var(--border)] self-start sm:self-auto flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{todayFormatted}</span>
        </div>
      </div>

      {/* Grid: 2 Urgent Focus Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Overdue Invoices (ค้างชำระ) */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            overdueRooms.length > 0
              ? "bg-rose-500/5 dark:bg-rose-950/20 border-rose-500/30"
              : "bg-[var(--subtle)] border-[var(--border)]"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  overdueRooms.length > 0 ? "bg-rose-500 animate-ping" : "bg-emerald-500"
                }`}
              />
              <span className="text-xs font-bold text-[var(--foreground)]">
                1. ห้องค้างชำระค่าเช่า
              </span>
            </div>
            {overdueRooms.length > 0 ? (
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/15 px-2.5 py-0.5 rounded-lg border border-rose-500/30">
                {overdueRooms.length} ห้อง ({formatCurrency(totalOverdueAmount)})
              </span>
            ) : (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> ชำระครบแล้ว
              </span>
            )}
          </div>

          {overdueRooms.length > 0 ? (
            <div className="space-y-2 mt-3">
              <p className="text-[11px] text-[var(--muted)]">
                ห้องที่เกินกำหนดชำระ คลิกดูรายละเอียดเพื่อทวงบิลหรือส่ง QR Code ทาง LINE:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {overdueRooms.map((room) => {
                  const inv = unpaidInvoices.find((i) => i.roomNumber === room.roomNumber);
                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => onSelectRoom && onSelectRoom(room)}
                      className="px-3 py-1.5 rounded-xl bg-[var(--card)] hover:bg-rose-500/10 border border-rose-500/30 text-xs font-semibold text-[var(--foreground)] transition cursor-pointer flex items-center gap-2 shadow-2xs group"
                    >
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        ห้อง {room.roomNumber}
                      </span>
                      <span className="text-[11px] text-[var(--muted)]">
                        {room.currentTenant?.fullName || "ผู้เช่า"}
                      </span>
                      {inv && (
                        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                          {formatCurrency(inv.totalAmount)}
                        </span>
                      )}
                      <ArrowRight className="w-3 h-3 text-rose-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-xs text-[var(--muted)] mt-2 flex items-center gap-1.5 py-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>ยอดเยี่ยม! ไม่มีห้องค้างชำระ ผู้เช่าชำระตรงเวลาครบถ้วน</span>
            </div>
          )}
        </div>

        {/* Card 2: Contracts Expiring within 30 days (สัญญาใกล้หมด) */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            expiringRooms.length > 0
              ? "bg-amber-500/5 dark:bg-amber-950/20 border-amber-500/30"
              : "bg-[var(--subtle)] border-[var(--border)]"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  expiringRooms.length > 0 ? "bg-amber-500" : "bg-emerald-500"
                }`}
              />
              <span className="text-xs font-bold text-[var(--foreground)]">
                2. สัญญาเช่าใกล้หมดอายุ (ภายใน 30 วัน)
              </span>
            </div>
            {expiringRooms.length > 0 ? (
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
                {expiringRooms.length} สัญญา
              </span>
            ) : (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> ปกติ
              </span>
            )}
          </div>

          {expiringRooms.length > 0 ? (
            <div className="space-y-2 mt-3">
              <p className="text-[11px] text-[var(--muted)]">
                รู้ตัวล่วงหน้าเพื่อเตรียมต่อสัญญาเช่า หรือเปิดรับผู้เช่าใหม่ล่วงหน้า:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {expiringRooms.map(({ room, diffDays }) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => onSelectRoom && onSelectRoom(room)}
                    className="px-3 py-1.5 rounded-xl bg-[var(--card)] hover:bg-amber-500/10 border border-amber-500/30 text-xs font-semibold text-[var(--foreground)] transition cursor-pointer flex items-center gap-2 shadow-2xs group"
                  >
                    <span className="font-bold text-amber-700 dark:text-amber-300">
                      ห้อง {room.roomNumber}
                    </span>
                    <span className="text-[11px] text-[var(--muted)]">
                      {room.currentTenant?.fullName || "ผู้เช่า"}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        diffDays <= 0
                          ? "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                          : diffDays <= 15
                          ? "bg-amber-500/25 text-amber-900 dark:text-amber-100"
                          : "bg-amber-500/15 text-amber-800 dark:text-amber-300"
                      }`}
                    >
                      {diffDays < 0
                        ? `เกิน ${Math.abs(diffDays)} วัน`
                        : diffDays === 0
                        ? "หมดวันนี้"
                        : `อีก ${diffDays} วัน`}
                    </span>
                    <ArrowRight className="w-3 h-3 text-amber-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-[var(--muted)] mt-2 flex items-center gap-1.5 py-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>ไม่มีสัญญาเช่าห้องไหนหมดอายุในอีก 30 วันข้างหน้า</span>
            </div>
          )}
        </div>
      </div>

      {/* Reassuring Banner if All Clear */}
      {!hasUrgentActions && (
        <div className="p-3.5 px-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold">
              สถานะหอพักวันนี้เรียบร้อย 100%! ไม่มีห้องค้างชำระ และไม่มีสัญญาใกล้หมดอายุ
            </span>
          </div>
          {onOpenQuickMeter && (
            <button
              type="button"
              onClick={onOpenQuickMeter}
              className="font-bold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>จดมิเตอร์น้ำ-ไฟประจำเดือน ➔</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
