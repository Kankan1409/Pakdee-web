"use client";

import React, { useState } from "react";
import { Room, RoomStatus } from "@/types/dormitory";
import { Sparkles, Check, Wrench, Broom, CheckCircle2, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface CleaningBoardViewProps {
  rooms: Room[];
  onUpdateStatus: (roomId: string, status: RoomStatus) => void;
}

export function CleaningBoardView({ rooms, onUpdateStatus }: CleaningBoardViewProps) {
  const [filter, setFilter] = useState<"all" | "cleaning" | "maintenance">("all");

  const cleaningRooms = rooms.filter((r) => r.status === "cleaning");
  const maintenanceRooms = rooms.filter((r) => r.status === "maintenance");
  const targetRooms = rooms.filter((r) => {
    if (filter === "cleaning") return r.status === "cleaning";
    if (filter === "maintenance") return r.status === "maintenance";
    return r.status === "cleaning" || r.status === "maintenance";
  });

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
      {/* Header & KPI Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>งานแม่บ้าน & ซ่อมบำรุง (Housekeeping & Maintenance)</span>
          </h3>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            ติดตามสถานะห้องพักที่รอทำความสะอาดและงานแจ้งซ่อมแบบเรียลไทม์
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-[var(--subtle)] p-1 rounded-xl border border-[var(--border)] text-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer",
              filter === "all"
                ? "bg-[var(--card)] text-amber-600 dark:text-amber-400 shadow-xs border border-[var(--border)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            )}
          >
            ทั้งหมด ({cleaningRooms.length + maintenanceRooms.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("cleaning")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5",
              filter === "cleaning"
                ? "bg-[var(--card)] text-amber-600 dark:text-amber-400 shadow-xs border border-[var(--border)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>รอทำความสะอาด ({cleaningRooms.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("maintenance")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5",
              filter === "maintenance"
                ? "bg-[var(--card)] text-rose-600 dark:text-rose-400 shadow-xs border border-[var(--border)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>รอซ่อมบำรุง ({maintenanceRooms.length})</span>
          </button>
        </div>
      </div>

      {/* Room List */}
      <div className="divide-y divide-[var(--border)] text-xs">
        {targetRooms.length === 0 ? (
          <div className="py-12 text-center text-[var(--muted)] space-y-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="font-semibold text-sm text-[var(--foreground)]">
              ไม่มีห้องที่รอทำความสะอาดหรือรอซ่อมบำรุงในขณะนี้ ✨
            </div>
            <p className="text-xs">
              ห้องพักทุกห้องอยู่ในสถานะปกติ พร้อมใช้งานและต้อนรับผู้เช่า
            </p>
          </div>
        ) : (
          targetRooms.map((room) => (
            <div key={room.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-black/5 dark:hover:bg-white/5 px-2 rounded-xl transition">
              <div className="space-y-1">
                <div className="font-bold text-sm text-[var(--foreground)] flex items-center gap-2">
                  <span>ห้อง {room.roomNumber}</span>
                  <span className="text-xs font-normal text-[var(--muted)]">
                    ({room.type} • ชั้น {room.floor})
                  </span>
                </div>
                <div className="text-[11px] text-[var(--muted)] flex items-center gap-2">
                  <span>สถานะ:</span>
                  {room.status === "cleaning" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      🧹 รอแม่บ้านทำความสะอาด
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                      🔧 รองานซ่อมบำรุง
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => onUpdateStatus(room.id, "vacant")}
                  className="bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white px-3.5 py-1.5 rounded-xl font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs text-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>เสร็จสิ้น (ปรับเป็นห้องว่าง)</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
