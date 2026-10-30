"use client";

import React, { useState } from "react";
import { Room, RoomStatus, Property } from "@/types/dormitory";
import { formatCurrency, cn } from "@/lib/utils";
import {
  Check,
  Sparkles,
  AlertCircle,
  Calendar,
  Plus,
  Trash2,
  Building2,
  Zap,
  Droplets,
  CheckSquare,
  Clock,
} from "lucide-react";

interface RoomMatrixProps {
  rooms: Room[];
  onSelectRoom: (room: Room) => void;
  onOpenAddTenant?: (roomId: string) => void;
  onOpenAddRoom?: () => void;
  onQuickGenerateStandardRooms?: () => void;
  onDeleteRoom?: (roomId: string) => void;
  onDeleteRooms?: (roomIds: string[]) => void;
  property?: Property;
}

export function RoomMatrix({
  rooms,
  onSelectRoom,
  onOpenAddTenant,
  onOpenAddRoom,
  onQuickGenerateStandardRooms,
  onDeleteRoom,
  onDeleteRooms,
  property,
}: RoomMatrixProps) {
  const [selectedFloor, setSelectedFloor] = useState<number | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<RoomStatus | "all">("all");
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);

  const filteredRooms = rooms.filter((room) => {
    const matchFloor = selectedFloor === "all" || room.floor === selectedFloor;
    const matchStatus = selectedStatus === "all" || room.status === selectedStatus;
    return matchFloor && matchStatus;
  });

  const toggleSelectRoom = (roomId: string) => {
    setSelectedRoomIds((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]
    );
  };

  const handleSelectAllFiltered = () => {
    if (selectedRoomIds.length === filteredRooms.length) {
      setSelectedRoomIds([]);
    } else {
      setSelectedRoomIds(filteredRooms.map((r) => r.id));
    }
  };

  const handleBatchDelete = () => {
    if (selectedRoomIds.length === 0) return;

    if (onDeleteRooms) {
      onDeleteRooms(selectedRoomIds);
    } else if (onDeleteRoom) {
      selectedRoomIds.forEach((id) => onDeleteRoom(id));
    }
    setSelectedRoomIds([]);
    setIsMultiSelectMode(false);
  };

  const derivedFloors = Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b);
  const floors = derivedFloors.length > 0 ? derivedFloors : [1, 2, 3, 4];

  // Empty state if no rooms
  if (rooms.length === 0) {
    return (
      <div className="p-10 md:p-14 rounded-3xl bg-[var(--card)] border border-[var(--border)] text-center space-y-5 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-sm">
          <Building2 className="w-8 h-8" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-lg font-bold text-[var(--foreground)]">ยังไม่มีห้องพักในระบบ (Clean Slate)</h3>
          <p className="text-xs text-[var(--muted)] leading-relaxed">
            ข้อมูลจำลองทั้งหมดถูกเคลียร์ออกเรียบร้อยแล้ว คุณสามารถเพิ่มห้องพักทีละห้อง หรือกดสร้างผังห้อง 24 ห้องมาตรฐาน เพื่อเริ่มต้นทดสอบระบบได้ทันที
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {onOpenAddRoom && (
            <button
              type="button"
              onClick={onOpenAddRoom}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer shadow-md flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>+ เพิ่มห้องพักใหม่</span>
            </button>
          )}
          {onQuickGenerateStandardRooms && (
            <button
              type="button"
              onClick={onQuickGenerateStandardRooms}
              className="px-5 py-2.5 rounded-xl bg-[var(--subtle)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--border)] text-[var(--foreground)] font-semibold text-xs transition cursor-pointer flex items-center gap-2"
            >
              <Zap className="w-4 h-4 text-amber-500" />
              <span>⚡ สร้างผัง 24 ห้องมาตรฐาน (ชั้น 1-4)</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Status badge config
  const statusConfig: Record<
    RoomStatus,
    { label: string; badgeBg: string; textClass: string; dotClass: string }
  > = {
    vacant: {
      label: "ว่าง (พร้อมเข้าพัก)",
      badgeBg: "border-emerald-500/30 hover:border-emerald-400",
      textClass: "text-emerald-600 dark:text-emerald-400",
      dotClass: "bg-emerald-500",
    },
    occupied: {
      label: "มีผู้เช่า (รายเดือน)",
      badgeBg: "border-indigo-500/30 hover:border-indigo-400",
      textClass: "text-indigo-600 dark:text-indigo-400",
      dotClass: "bg-indigo-500",
    },
    daily: {
      label: "รายวัน",
      badgeBg: "border-amber-500/30 hover:border-amber-400",
      textClass: "text-amber-600 dark:text-amber-400",
      dotClass: "bg-amber-500",
    },
    cleaning: {
      label: "รอทำความสะอาด",
      badgeBg: "border-yellow-500/30 hover:border-yellow-400",
      textClass: "text-yellow-600 dark:text-yellow-400",
      dotClass: "bg-yellow-500",
    },
    overdue: {
      label: "ค้างชำระ",
      badgeBg: "border-rose-500/40 hover:border-rose-400",
      textClass: "text-rose-600 dark:text-rose-400",
      dotClass: "bg-rose-500",
    },
    maintenance: {
      label: "ซ่อมบำรุง",
      badgeBg: "border-slate-500/30 hover:border-slate-400",
      textClass: "text-slate-500",
      dotClass: "bg-slate-500",
    },
  };

  const getLeaseCountdown = (leaseEndDate?: string) => {
    if (!leaseEndDate) return null;
    const end = new Date(leaseEndDate).getTime();
    const now = new Date().setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

    const d = new Date(leaseEndDate);
    const thaiMonthsShort = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const dateStr = !isNaN(d.getTime()) ? `${d.getDate()} ${thaiMonthsShort[d.getMonth()]}` : leaseEndDate;

    return { diffDays, dateStr };
  };

  return (
    <div className="space-y-6">
      {/* Filters Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xs transition">
        {/* Floor Selection */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <button
            onClick={() => setSelectedFloor("all")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer",
              selectedFloor === "all"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--subtle)]"
            )}
          >
            ทุกชั้น (1-4)
          </button>
          {floors.map((fl) => (
            <button
              key={fl}
              onClick={() => setSelectedFloor(fl)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer",
                selectedFloor === fl
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--subtle)]"
              )}
            >
              ชั้น {fl}
            </button>
          ))}
        </div>

        {/* Status Filters & Legend */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => setSelectedStatus("all")}
            className={cn(
              "px-2.5 py-1 rounded-lg transition cursor-pointer",
              selectedStatus === "all"
                ? "bg-[var(--subtle)] font-bold text-[var(--foreground)] border border-[var(--border)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            )}
          >
            ทั้งหมด ({rooms.length})
          </button>
          {(Object.keys(statusConfig) as RoomStatus[]).map((st) => {
            const count = rooms.filter((r) => r.status === st).length;
            if (count === 0 && st === "maintenance") return null;
            return (
              <button
                key={st}
                onClick={() =>
                  setSelectedStatus(selectedStatus === st ? "all" : st)
                }
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition cursor-pointer",
                  selectedStatus === st
                    ? "bg-[var(--subtle)] font-bold text-[var(--foreground)] border border-[var(--border)] ring-1 ring-emerald-500/40"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                )}
              >
                <span
                  className={cn(
                    "w-2 h-2 rounded-full",
                    statusConfig[st].dotClass
                  )}
                />
                <span>
                  {statusConfig[st].label} ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Live Utility Rates Badge */}
        {property && (
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs font-semibold shrink-0">
            <span className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>ค่าไฟ <strong className="font-bold text-amber-950 dark:text-amber-100">{property.electricRate}</strong> บ./หน่วย</span>
            </span>
            <span className="text-amber-400/40">|</span>
            <span className="flex items-center gap-1.5 text-sky-800 dark:text-sky-300">
              <Droplets className="w-3.5 h-3.5 text-sky-500" />
              <span>ค่าน้ำ <strong className="font-bold text-sky-950 dark:text-sky-100">{property.waterRate}</strong> บ./หน่วย</span>
            </span>
          </div>
        )}

        {/* Action Buttons: Add Room & Quick 24 Rooms & Multi-select */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Multi-Select Toggle Button */}
          <button
            type="button"
            onClick={() => {
              setIsMultiSelectMode(!isMultiSelectMode);
              if (isMultiSelectMode) setSelectedRoomIds([]);
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs transition cursor-pointer border",
              isMultiSelectMode || selectedRoomIds.length > 0
                ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                : "bg-[var(--subtle)] text-[var(--foreground)] border-[var(--border)] hover:border-slate-400"
            )}
            title="เปิดโหมดเลือกหลายห้องเพื่อลบพร้อมกัน"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>{isMultiSelectMode || selectedRoomIds.length > 0 ? "โหมดเลือกหลายห้อง" : "เลือกหลายห้อง"}</span>
          </button>

          {onOpenAddRoom && (
            <button
              type="button"
              onClick={onOpenAddRoom}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ เพิ่มห้องพัก</span>
            </button>
          )}
          {onQuickGenerateStandardRooms && (
            <button
              type="button"
              onClick={onQuickGenerateStandardRooms}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--subtle)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--border)] text-[var(--foreground)] font-medium text-xs transition cursor-pointer"
              title="สร้างผังห้อง 101-406 (24 ห้อง) อัตโนมัติ"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">⚡ ผัง 24 ห้อง</span>
            </button>
          )}
        </div>
      </div>

      {/* Batch Action Bar when rooms are selected */}
      {selectedRoomIds.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/30 p-3.5 px-5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-1 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
              เลือกแล้ว {selectedRoomIds.length} ห้อง
            </span>
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="px-3 py-1.5 rounded-xl bg-[var(--subtle)] hover:bg-black/5 dark:hover:bg-white/5 font-semibold text-[var(--foreground)] border border-[var(--border)] transition cursor-pointer"
            >
              {selectedRoomIds.length === filteredRooms.length ? "ยกเลิกเลือกทั้งหมด" : `เลือกทั้งหมดในหน้านี้ (${filteredRooms.length})`}
            </button>
            <button
              type="button"
              onClick={() => setSelectedRoomIds([])}
              className="px-2 py-1 text-[var(--muted)] hover:text-[var(--foreground)] transition cursor-pointer font-medium"
            >
              ล้างการเลือก
            </button>
          </div>
          <button
            type="button"
            onClick={handleBatchDelete}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition cursor-pointer shadow-md shadow-rose-600/20"
          >
            <Trash2 className="w-4 h-4" />
            <span>ลบ {selectedRoomIds.length} ห้องที่เลือก</span>
          </button>
        </div>
      )}

      {/* Render Room Matrix Grouped by Floor */}
      {(selectedFloor === "all" ? floors : [selectedFloor]).map((floorNum) => {
        const floorRooms = filteredRooms.filter((r) => r.floor === floorNum);
        if (floorRooms.length === 0) return null;

        return (
          <div key={floorNum} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>ชั้นที่ {floorNum}</span>
              </div>
              <span className="text-xs text-[var(--muted)]">
                {floorRooms.length} ห้อง
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
              {floorRooms.map((room) => {
                const cfg = statusConfig[room.status];
                const isSelected = selectedRoomIds.includes(room.id);

                return (
                  <div
                    key={room.id}
                    onClick={() => {
                      if (isMultiSelectMode || selectedRoomIds.length > 0) {
                        toggleSelectRoom(room.id);
                      } else {
                        onSelectRoom(room);
                      }
                    }}
                    className={cn(
                      "p-3.5 rounded-2xl bg-[var(--card)] border transition-all cursor-pointer relative group shadow-xs hover:shadow-md",
                      isSelected
                        ? "border-rose-500 ring-2 ring-rose-500/30 bg-rose-50/15 dark:bg-rose-950/20"
                        : cfg.badgeBg
                    )}
                  >
                    {/* Top Row: Checkbox, Room Number & Status Dot */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {(isMultiSelectMode || selectedRoomIds.length > 0) && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleSelectRoom(room.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded text-rose-600 border-slate-300 focus:ring-rose-500 cursor-pointer accent-rose-600"
                          />
                        )}
                        <span className="text-base font-bold text-[var(--foreground)] tracking-tight">
                          {room.roomNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {onDeleteRoom && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteRoom(room.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-rose-500 hover:bg-rose-500/15 transition cursor-pointer"
                            title={`ลบห้อง ${room.roomNumber}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <span
                          className={cn(
                            "w-2.5 h-2.5 rounded-full ring-4 ring-black/5 dark:ring-white/5",
                            cfg.dotClass
                          )}
                          title={cfg.label}
                        />
                      </div>
                    </div>

                    {/* Middle: Tenant / Status Info */}
                    <div className="min-h-[38px]">
                      {room.status === "vacant" && (
                        <div className="flex items-center justify-between gap-1">
                          <div>
                            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              ห้องว่างพร้อมเช่า
                            </div>
                            <div className="text-[11px] text-[var(--muted)] mt-0.5">
                              {room.type}
                            </div>
                          </div>
                          {onOpenAddTenant && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenAddTenant(room.id);
                              }}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] shadow-sm transition cursor-pointer flex items-center gap-1 shrink-0"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              <span>ทำสัญญา</span>
                            </button>
                          )}
                        </div>
                      )}

                      {room.status === "occupied" && room.currentTenant && (() => {
                        const countdown = getLeaseCountdown(room.leaseEndDate);
                        return (
                          <div>
                            <div className="text-xs font-semibold text-[var(--foreground)] truncate">
                              {room.currentTenant.fullName}
                            </div>
                            {countdown ? (
                              <div className="mt-1">
                                {countdown.diffDays < 0 ? (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25">
                                    หมดสัญญาแล้ว ({Math.abs(countdown.diffDays)} วัน)
                                  </span>
                                ) : countdown.diffDays === 0 ? (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25">
                                    หมดสัญญาวันนี้!
                                  </span>
                                ) : countdown.diffDays <= 30 ? (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 inline-flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5" />
                                    <span>สัญญาถึง {countdown.dateStr} · อีก {countdown.diffDays} วัน</span>
                                  </span>
                                ) : (
                                  <div className="text-[11px] text-[var(--muted)]">
                                    สัญญาถึง {countdown.dateStr} · อีก {countdown.diffDays} วัน
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-[11px] text-[var(--muted)] mt-0.5">
                                สัญญาเช่ารายเดือน
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {room.status === "daily" && room.currentTenant && (
                        <div>
                          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 truncate flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{room.currentTenant.fullName}</span>
                          </div>
                          <div className="text-[11px] text-[var(--muted)] mt-0.5">
                            {room.notes || "รายวัน (เข้าพักแล้ว)"}
                          </div>
                        </div>
                      )}

                      {room.status === "cleaning" && (
                        <div>
                          <div className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            <span>รอทำความสะอาด</span>
                          </div>
                          <div className="text-[11px] text-[var(--muted)] mt-0.5">
                            Checked-out แล้ว
                          </div>
                        </div>
                      )}

                      {room.status === "overdue" && room.currentTenant && (() => {
                        const countdown = getLeaseCountdown(room.leaseEndDate);
                        return (
                          <div>
                            <div className="text-xs font-semibold text-[var(--foreground)] truncate">
                              {room.currentTenant.fullName}
                            </div>
                            <div className="text-[11px] text-rose-500 font-semibold mt-0.5 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              <span>ค้างชำระค่าเช่า</span>
                            </div>
                            {countdown && countdown.diffDays <= 30 && (
                              <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                                สัญญาหมดอีก {countdown.diffDays} วัน
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {room.status === "maintenance" && (
                        <div>
                          <div className="text-xs font-semibold text-slate-500">
                            ชำรุดซ่อมบำรุง
                          </div>
                          <div className="text-[11px] text-[var(--muted)] mt-0.5">
                            {room.notes || "รอช่างเข้าตรวจ"}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer: Price & Quick Action/Status */}
                    <div className="mt-3 pt-2.5 border-t border-[var(--border)] flex items-center justify-between text-[11px]">
                      <span className="text-[var(--muted)] font-medium">
                        {room.rentalType === "daily"
                          ? `${formatCurrency(room.dailyRate)}/คืน`
                          : `${formatCurrency(room.monthlyRate)}/ด.`}
                      </span>

                      {room.status === "vacant" && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          + จอง
                        </span>
                      )}
                      {room.status === "occupied" && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> จ่ายแล้ว
                        </span>
                      )}
                      {room.status === "daily" && (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          มัดจำแล้ว
                        </span>
                      )}
                      {room.status === "cleaning" && (
                        <span className="text-yellow-600 dark:text-yellow-400 font-semibold">
                          แจ้งเสร็จ ➔
                        </span>
                      )}
                      {room.status === "overdue" && (
                        <span className="text-[10px] bg-rose-500/15 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded font-semibold">
                          ทวง LINE
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
