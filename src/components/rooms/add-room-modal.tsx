"use client";

import React, { useState, useEffect } from "react";
import { Room, RoomStatus, RoomTypeConfig, defaultRoomTypes } from "@/types/dormitory";
import { Plus, Building, Layers, DollarSign, Zap, Droplets } from "lucide-react";

interface AddRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRoom: (roomData: {
    roomNumber: string;
    floor: number;
    type: string;
    monthlyRate: number;
    dailyRate?: number;
    status: RoomStatus;
  }) => Promise<void> | void;
  onAddBatchRooms?: (roomsList: {
    roomNumber: string;
    floor: number;
    type: string;
    monthlyRate: number;
    dailyRate?: number;
    status: RoomStatus;
  }[]) => Promise<void> | void;
  roomTypes?: RoomTypeConfig[];
}

export function AddRoomModal({ isOpen, onClose, onAddRoom, onAddBatchRooms, roomTypes= defaultRoomTypes, }: AddRoomModalProps) {
  const activeRoomTypes = roomTypes && roomTypes.length > 0 ? roomTypes : defaultRoomTypes;
  const defaultTypeObj = activeRoomTypes.find((r) => r.isDefault) || activeRoomTypes[0];
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [roomNumber, setRoomNumber] = useState<string>("");
  const [floor, setFloor] = useState<number | "">(1);
  const [type, setType] = useState<string>("ห้องแอร์");
  const [monthlyRate, setMonthlyRate] = useState<number | "">(4000);
  const [dailyRate, setDailyRate] = useState<number | "">(650);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync with default type when modal opens or roomTypes changes
  useEffect(() => {
    if (isOpen) {
      const def = activeRoomTypes.find((r) => r.isDefault) || activeRoomTypes[0];
      setType(def.name);
      setMonthlyRate(def.monthlyRate);
      setDailyRate(def.dailyRate);
      setBatchPrefix("");
      setRoomNumber("");
    }
  }, [isOpen, roomTypes]);

  const handleTypeChange = (newTypeName: string) => {
    setType(newTypeName);
    const matched = activeRoomTypes.find((r) => r.name === newTypeName);
    if (matched) {
      setMonthlyRate(matched.monthlyRate);
      setDailyRate(matched.dailyRate);
    }
  };

  // Batch Mode
  const [batchPrefix, setBatchPrefix] = useState<string>("");
  const [batchStart, setBatchStart] = useState<number | "">(1);
  const [batchEnd, setBatchEnd] = useState<number | "">(6);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (mode === "single") {
      if (!roomNumber.trim()) return;
      setIsSubmitting(true);
      try {
        await onAddRoom({
          roomNumber: roomNumber.trim(),
          floor: Number(floor) || 1,
          type,
          monthlyRate: Number(monthlyRate) || 0,
          dailyRate: Number(dailyRate) || 0,
          status: "vacant",
        });
        onClose();
      } finally {
        setIsSubmitting(false);
      }
    } else {
      const batchList: {
        roomNumber: string;
        floor: number;
        type: string;
        monthlyRate: number;
        dailyRate?: number;
        status: RoomStatus;
      }[] = [];

      const start = Number(batchStart) || 1;
      const end = Number(batchEnd) || start;
      const safeFloor = Number(floor) || 1;
      const safeMonthly = Number(monthlyRate) || 0;
      const safeDaily = Number(dailyRate) || 0;
      for (let i = start; i <= end; i++) {
        const num = `${batchPrefix}${i < 10 ? i : i}`;
        batchList.push({
          roomNumber: num,
          floor: safeFloor,
          type,
          monthlyRate: safeMonthly,
          dailyRate: safeDaily,
          status: "vacant" as RoomStatus,
        });
      }

      if (batchList.length === 0) return;

      setIsSubmitting(true);
      try {
        if (onAddBatchRooms) {
          await onAddBatchRooms(batchList);
        } else {
          for (const item of batchList) {
            await onAddRoom(item);
          }
        }
        onClose();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--subtle)]">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-[var(--foreground)]">เพิ่มห้องพักใหม่</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--foreground)] text-xs p-1"
          >
            ✕ ปิด
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="p-4 border-b border-[var(--border)] flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode("single")}
            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              mode === "single"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-[var(--subtle)] text-[var(--muted)]"
            }`}
          >
            เพิ่มทีละห้อง
          </button>
          <button
            type="button"
            onClick={() => setMode("batch")}
            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              mode === "batch"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-[var(--subtle)] text-[var(--muted)]"
            }`}
          >
            เพิ่มหลายห้องพร้อมกัน (Batch)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {mode === "single" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">หมายเลขห้อง *</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  placeholder="เช่น 101, 201"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs font-bold text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">ชั้นที่ตั้ง *</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  required
                  value={floor}
                  placeholder="เช่น 1"
                  onChange={(e) => setFloor(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">ชั้นที่ตั้ง *</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={floor}
                  placeholder="เช่น 1"
                  onChange={(e) => {
                    setFloor(e.target.value === "" ? "" : Number(e.target.value));
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">คำนำหน้าห้อง</label>
                  <input
                    type="text"
                    maxLength={5}
                    placeholder="เว้นว่างได้"
                    value={batchPrefix}
                    onChange={(e) => setBatchPrefix(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">เริ่มจากห้อง</label>
                  <input
                    type="number"
                    value={batchStart}
                    placeholder="เช่น 1"
                    onChange={(e) => setBatchStart(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">ถึงห้อง</label>
                  <input
                    type="number"
                    value={batchEnd}
                    placeholder="เช่น 6"
                    onChange={(e) => setBatchEnd(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1">ประเภทห้อง *</label>
            <select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)] font-semibold cursor-pointer"
            >
              {activeRoomTypes.map((rt) => (
                <option key={rt.id} value={rt.name}>
                  {rt.name} (฿{Number(rt.monthlyRate || 0).toLocaleString()} / ด.)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">ค่าเช่ารายเดือน (บาท) *</label>
              <input
                type="number"
                min="0"
                required
                value={monthlyRate}
                placeholder="0"
                onChange={(e) => setMonthlyRate(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs font-bold text-emerald-600 dark:text-emerald-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">ค่าเช่ารายวัน (บาท)</label>
              <input
                type="number"
                min="0"
                value={dailyRate}
                placeholder="0"
                onChange={(e) => setDailyRate(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--muted)] hover:bg-[var(--subtle)]"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting
                ? "กำลังบันทึก..."
                : mode === "batch"
                ? `บันทึกห้องพัก ${Math.max(0, (Number(batchEnd) || 0) - (Number(batchStart) || 0) + 1)} ห้อง`
                : "บันทึกห้องพัก"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
