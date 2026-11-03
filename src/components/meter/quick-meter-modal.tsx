"use client";

import React, { useState, useEffect } from "react";
import { Room } from "@/types/dormitory";
import { formatCurrency } from "@/lib/utils";
import { globalPopup } from "@/lib/popup-context";
import { X, Zap, Droplets, ArrowRight, ArrowLeft, Check } from "lucide-react";

interface QuickMeterModalProps {
  rooms: Room[];
  initialRoomId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSaveReading: (roomId: string, electricCurr: number, waterCurr: number) => void;
  electricRate?: number;
  waterRate?: number;
}

export function QuickMeterModal({
  rooms,
  initialRoomId,
  isOpen,
  onClose,
  onSaveReading,
  electricRate = 8,
  waterRate = 18,
}: QuickMeterModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const activeRooms = rooms.filter(
    (r) => r.status === "occupied" || r.status === "overdue" || r.status === "daily"
  );
  const currentRoom = activeRooms[currentIndex] || activeRooms[0];

  const [electricNew, setElectricNew] = useState<number | "">(0);
  const [waterNew, setWaterNew] = useState<number | "">(0);

  // Sync index when modal opens or initialRoomId changes
  useEffect(() => {
    if (isOpen && initialRoomId && activeRooms.length > 0) {
      const idx = activeRooms.findIndex((r) => r.id === initialRoomId);
      if (idx !== -1) {
        setCurrentIndex(idx);
        return;
      }
    }
  }, [isOpen, initialRoomId, activeRooms.length]);

  // Sync inputs when currentRoom changes
  useEffect(() => {
    if (currentRoom) {
      setElectricNew(currentRoom.currentElectricMeter);
      setWaterNew(currentRoom.currentWaterMeter);
    }
  }, [currentIndex, currentRoom?.id]);

  if (!isOpen || !currentRoom) return null;

  const elecVal = electricNew === "" ? currentRoom.currentElectricMeter : Number(electricNew);
  const waterVal = waterNew === "" ? currentRoom.currentWaterMeter : Number(waterNew);

  const electricUnits = Math.max(0, elecVal - currentRoom.currentElectricMeter);
  const electricCost = electricUnits * electricRate;

  const waterUnits = Math.max(0, waterVal - currentRoom.currentWaterMeter);
  const waterCost = waterUnits * waterRate;

  const handleSaveAndNext = () => {
    onSaveReading(currentRoom.id, elecVal, waterVal);
    if (currentIndex < activeRooms.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      globalPopup.info("บันทึกสำเร็จ", "บันทึกมิเตอร์ครบทุกห้องเรียบร้อยแล้ว!");
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <div className="text-xs text-[var(--muted)]">เดินจดมิเตอร์น้ำ-ไฟประจำเดือน</div>
            <div className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
              <span>ห้อง {currentRoom.roomNumber}</span>
              <span className="text-xs text-[var(--muted)] font-normal">
                ({currentIndex + 1} จาก {activeRooms.length} ห้อง)
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[var(--subtle)] text-[var(--muted)] hover:text-[var(--foreground)] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="bg-[var(--subtle)] p-3 rounded-xl border border-[var(--border)] text-xs text-[var(--muted)] flex justify-between">
            <span>ผู้เช่า: <strong className="text-[var(--foreground)]">{currentRoom.currentTenant?.fullName || "ไม่มีชื่อ"}</strong></span>
            <span>ชั้น {currentRoom.floor} ({currentRoom.type})</span>
          </div>

          {/* Electric Meter Card */}
          <div className="bg-[var(--subtle)] border border-[var(--border)] rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-amber-500 font-semibold flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" /> ไฟฟ้า ({electricRate} ฿/หน่วย)
              </span>
              <span className="text-[var(--muted)]">
                เลขเดิม: <strong>{currentRoom.currentElectricMeter}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="number"
                value={electricNew}
                placeholder={String(currentRoom.currentElectricMeter)}
                onChange={(e) => setElectricNew(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-center text-xl font-bold text-[var(--foreground)] focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-2">
              <span>ใช้ไป: {electricUnits} หน่วย</span>
              <span className="font-bold">= {formatCurrency(electricCost)}</span>
            </div>
          </div>

          {/* Water Meter Card */}
          <div className="bg-[var(--subtle)] border border-[var(--border)] rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-cyan-500 font-semibold flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5" /> น้ำประปา ({waterRate} ฿/หน่วย)
              </span>
              <span className="text-[var(--muted)]">
                เลขเดิม: <strong>{currentRoom.currentWaterMeter}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="number"
                value={waterNew}
                placeholder={String(currentRoom.currentWaterMeter)}
                onChange={(e) => setWaterNew(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-center text-xl font-bold text-[var(--foreground)] focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-cyan-600 dark:text-cyan-400 font-medium mt-2">
              <span>ใช้ไป: {waterUnits} หน่วย</span>
              <span className="font-bold">= {formatCurrency(waterCost)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {currentIndex > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-4 py-3 rounded-xl border border-[var(--border)] text-[var(--foreground)] font-semibold text-xs flex items-center gap-1 hover:bg-[var(--subtle)] transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>ก่อนหน้า</span>
              </button>
            )}
            <button
              onClick={handleSaveAndNext}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition cursor-pointer"
            >
              <span>{currentIndex === activeRooms.length - 1 ? "บันทึกเสร็จสิ้น" : "บันทึก & ห้องถัดไป"}</span>
              {currentIndex === activeRooms.length - 1 ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
