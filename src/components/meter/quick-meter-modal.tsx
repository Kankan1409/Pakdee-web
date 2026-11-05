"use client";

import React, { useState, useEffect } from "react";
import { Room } from "@/types/dormitory";
import { formatCurrency } from "@/lib/utils";
import { globalPopup } from "@/lib/popup-context";
import { X, Zap, Droplets, ArrowRight, ArrowLeft, Check, AlertCircle, AlertTriangle } from "lucide-react";

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

  const elecPrev = currentRoom.currentElectricMeter || 0;
  const waterPrev = currentRoom.currentWaterMeter || 0;

  const elecVal = electricNew === "" ? elecPrev : Number(electricNew);
  const waterVal = waterNew === "" ? waterPrev : Number(waterNew);

  // Check if readings decreased compared to previous
  const isElectricDecreased = electricNew !== "" && Number(electricNew) < elecPrev;
  const isWaterDecreased = waterNew !== "" && Number(waterNew) < waterPrev;
  const hasDecreasedMeter = isElectricDecreased || isWaterDecreased;

  const electricUnits = Math.max(0, elecVal - elecPrev);
  const electricCost = electricUnits * electricRate;

  const waterUnits = Math.max(0, waterVal - waterPrev);
  const waterCost = waterUnits * waterRate;

  const executeSave = () => {
    onSaveReading(currentRoom.id, elecVal, waterVal);
    if (currentIndex < activeRooms.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      globalPopup.info("บันทึกสำเร็จ", "บันทึกมิเตอร์ครบทุกห้องเรียบร้อยแล้ว!");
      onClose();
    }
  };

  const handleSaveAndNext = () => {
    // If any meter reading decreased, prompt Recheck Confirmation Popup
    if (hasDecreasedMeter) {
      const warnings: string[] = [];
      if (isElectricDecreased) {
        warnings.push(`• ค่าไฟฟ้า: เลขเดิม ${elecPrev} ➔ จดใหม่ ${elecVal} (ลดลง ${elecPrev - elecVal} หน่วย)`);
      }
      if (isWaterDecreased) {
        warnings.push(`• ค่าน้ำประปา: เลขเดิม ${waterPrev} ➔ จดใหม่ ${waterVal} (ลดลง ${waterPrev - waterVal} หน่วย)`);
      }

      globalPopup.warning(
        `แจ้งเตือน: เลขมิเตอร์ห้อง ${currentRoom.roomNumber} ลดลงกว่าเดิม`,
        `ระบบตรวจพบว่าเลขมิเตอร์ที่กรอกมีค่าน้อยกว่าเลขเดิม กรุณา Recheck อีกครั้ง:\n\n${warnings.join("\n")}\n\nหากมีการเปลี่ยนมิเตอร์ใหม่หรือยืนยันว่าถูกต้อง ให้กด "ยืนยันการดำเนินการ" เพื่อบันทึกต่อไป`,
        () => executeSave(),
        "กลับไปแก้ไข"
      );
      return;
    }

    executeSave();
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
            <div className="text-xs text-[var(--muted)]">เดินจดมิเตอร์น้ำ-ไฟประจำเดือน (Fast Entry)</div>
            <div className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-white text-sm font-mono font-bold">
                ห้อง {currentRoom.roomNumber}
              </span>
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
            <span>ผู้เช่า: <strong className="text-[var(--foreground)]">{currentRoom.currentTenant?.fullName || "(ห้องว่าง)"}</strong></span>
            <span>ชั้น {currentRoom.floor} ({currentRoom.type})</span>
          </div>

          {/* Electric Meter Card */}
          <div className={`border rounded-2xl p-4 transition-all ${
            isElectricDecreased 
              ? "bg-amber-500/10 border-amber-500/50" 
              : "bg-amber-500/5 border-amber-500/20"
          }`}>
            <div className="flex items-center justify-between text-xs mb-2.5">
              <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5">
                <Zap className="w-4 h-4 fill-amber-500 text-amber-500" /> ไฟฟ้า ({electricRate} ฿/หน่วย)
              </span>
              {/* High Contrast Benchmark Badge */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium">
                <span className="text-[10px] font-bold text-slate-500 uppercase">เดิม:</span>
                <span className="font-mono font-black text-sm">{elecPrev}</span>
              </div>
            </div>

            <div className="relative">
              <input
                type="number"
                value={electricNew}
                placeholder={String(elecPrev)}
                onChange={(e) => setElectricNew(e.target.value === "" ? "" : Number(e.target.value))}
                className={`w-full bg-[var(--card)] rounded-xl px-4 py-2.5 text-center text-xl font-bold font-mono transition-all ${
                  isElectricDecreased
                    ? "border-2 border-amber-500 text-amber-800 dark:text-amber-200 focus:outline-none focus:ring-4 focus:ring-amber-500/20"
                    : "border-2 border-amber-400 dark:border-amber-600 text-[var(--foreground)] focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20"
                }`}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-amber-600/70 dark:text-amber-400/70 select-none">
                จดใหม่
              </span>
              {isElectricDecreased && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-md">
                  ลดลง
                </span>
              )}
            </div>

            {/* Warning or Units calculation */}
            {isElectricDecreased ? (
              <div className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300 font-medium mt-2 bg-amber-100/80 dark:bg-amber-950/60 p-2 rounded-lg border border-amber-300 dark:border-amber-800">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                <span>เลขลดลงจากเดิม ({elecPrev}) — เมื่อกดบันทึกจะมี Popup ให้ Recheck</span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 font-medium mt-2">
                <span>ใช้ไป: <strong>{electricUnits}</strong> หน่วย</span>
                <span className="font-bold">= {formatCurrency(electricCost)}</span>
              </div>
            )}
          </div>

          {/* Water Meter Card */}
          <div className={`border rounded-2xl p-4 transition-all ${
            isWaterDecreased 
              ? "bg-amber-500/10 border-amber-500/50" 
              : "bg-sky-500/5 border-sky-500/20"
          }`}>
            <div className="flex items-center justify-between text-xs mb-2.5">
              <span className="text-sky-600 dark:text-sky-400 font-bold flex items-center gap-1.5">
                <Droplets className="w-4 h-4 fill-sky-500 text-sky-500" /> น้ำประปา ({waterRate} ฿/หน่วย)
              </span>
              {/* High Contrast Benchmark Badge */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium">
                <span className="text-[10px] font-bold text-slate-500 uppercase">เดิม:</span>
                <span className="font-mono font-black text-sm">{waterPrev}</span>
              </div>
            </div>

            <div className="relative">
              <input
                type="number"
                value={waterNew}
                placeholder={String(waterPrev)}
                onChange={(e) => setWaterNew(e.target.value === "" ? "" : Number(e.target.value))}
                className={`w-full bg-[var(--card)] rounded-xl px-4 py-2.5 text-center text-xl font-bold font-mono transition-all ${
                  isWaterDecreased
                    ? "border-2 border-amber-500 text-amber-800 dark:text-amber-200 focus:outline-none focus:ring-4 focus:ring-amber-500/20"
                    : "border-2 border-sky-400 dark:border-sky-600 text-[var(--foreground)] focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/20"
                }`}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-sky-600/70 dark:text-sky-400/70 select-none">
                จดใหม่
              </span>
              {isWaterDecreased && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-md">
                  ลดลง
                </span>
              )}
            </div>

            {/* Warning or Units calculation */}
            {isWaterDecreased ? (
              <div className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300 font-medium mt-2 bg-amber-100/80 dark:bg-amber-950/60 p-2 rounded-lg border border-amber-300 dark:border-amber-800">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                <span>เลขลดลงจากเดิม ({waterPrev}) — เมื่อกดบันทึกจะมี Popup ให้ Recheck</span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-sky-700 dark:text-sky-300 font-medium mt-2">
                <span>ใช้ไป: <strong>{waterUnits}</strong> หน่วย</span>
                <span className="font-bold">= {formatCurrency(waterCost)}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
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
              className={`flex-1 font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer ${
                hasDecreasedMeter
                  ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/25"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25"
              }`}
            >
              <span>{currentIndex === activeRooms.length - 1 ? "บันทึกเสร็จสิ้น" : "บันทึก & ห้องถัดไป"}</span>
              {hasDecreasedMeter ? (
                <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">Recheck</span>
              ) : currentIndex === activeRooms.length - 1 ? (
                <Check className="w-4 h-4" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
