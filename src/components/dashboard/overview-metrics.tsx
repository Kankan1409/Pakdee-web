"use client";

import React from "react";
import { Room, Invoice } from "@/types/dormitory";
import { CheckCircle2, Users, Calendar, AlertCircle } from "lucide-react";

interface OverviewMetricsProps {
  rooms: Room[];
  invoices?: Invoice[];
  overdueAmount?: number;
}

export function OverviewMetrics({ rooms, invoices = [], overdueAmount }: OverviewMetricsProps) {
  const total = rooms.length;
  const vacant = rooms.filter((r) => r.status === "vacant").length;
  const occupied = rooms.filter((r) => r.status === "occupied").length;
  const daily = rooms.filter((r) => r.status === "daily").length;
  const cleaning = rooms.filter((r) => r.status === "cleaning").length;

  // ห้องที่มียอดค้างชำระจริงจากระบบใบแจ้งหนี้ (สถานะไม่ใช่ 'paid')
  const unpaidRoomNumbers = new Set(
    invoices.filter((i) => i.status !== "paid" && i.status !== "carried_forward").map((i) => i.roomNumber)
  );
  const overdue = rooms.filter(
    (r) => unpaidRoomNumbers.has(r.roomNumber) || r.status === "overdue"
  ).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* 1. ห้องว่าง */}
      <div className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-2xl shadow-xs transition hover:border-slate-300 dark:hover:border-slate-700">
        <div className="flex items-center justify-between text-xs text-[var(--muted)]">
          <span>ห้องว่างพร้อมเช่า</span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
        </div>
        <div className="text-2xl font-bold text-[var(--foreground)] mt-1.5 flex items-baseline gap-2">
          {vacant} <span className="text-xs font-normal text-[var(--muted)]">/ {total} ห้อง</span>
        </div>
        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>พร้อมเปิดรับผู้เช่าใหม่</span>
        </div>
      </div>

      {/* 2. ผู้เช่ารายเดือน */}
      <div className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-2xl shadow-xs transition hover:border-slate-300 dark:hover:border-slate-700">
        <div className="flex items-center justify-between text-xs text-[var(--muted)]">
          <span>ผู้เช่ารายเดือน</span>
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm" />
        </div>
        <div className="text-2xl font-bold text-[var(--foreground)] mt-1.5 flex items-baseline gap-2">
          {occupied}{" "}
          <span className="text-xs font-normal text-[var(--muted)]">
            ห้อง ({total > 0 ? Math.round((occupied / total) * 100) : 0}%)
          </span>
        </div>
        <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-1 flex items-center gap-1">
          <Users className="w-3 h-3" />
          <span>อัตราเข้าพักเสถียร</span>
        </div>
      </div>

      {/* 3. รายวันเข้าพักวันนี้ */}
      <div className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-2xl shadow-xs transition hover:border-slate-300 dark:hover:border-slate-700">
        <div className="flex items-center justify-between text-xs text-[var(--muted)]">
          <span>รายวันเข้าพักวันนี้</span>
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm" />
        </div>
        <div className="text-2xl font-bold text-[var(--foreground)] mt-1.5 flex items-baseline gap-2">
          {daily} <span className="text-xs font-normal text-[var(--muted)]">ห้อง</span>
        </div>
        <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-1 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>In 14:00 น. (รอทำความสะอาด {cleaning})</span>
        </div>
      </div>

      {/* 4. ค้างชำระ */}
      <div className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-2xl shadow-xs transition hover:border-slate-300 dark:hover:border-slate-700">
        <div className="flex items-center justify-between text-xs text-[var(--muted)]">
          <span>ค้างชำระ / รอติดตาม</span>
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm" />
        </div>
        <div className="text-2xl font-bold text-[var(--foreground)] mt-1.5 flex items-baseline gap-2">
          {overdue}{" "}
          <span className="text-xs font-semibold text-rose-500">
            ห้อง {overdueAmount !== undefined ? `(${overdueAmount.toLocaleString()} ฿)` : ""}
          </span>
        </div>
        <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          <span>กดทวงบิลผ่าน LINE ได้ทันที</span>
        </div>
      </div>
    </div>
  );
}
