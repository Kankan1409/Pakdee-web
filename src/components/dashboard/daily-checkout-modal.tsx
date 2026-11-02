"use client";

import React, { useState, useEffect } from "react";
import { DailyBooking } from "@/types/dormitory";
import {
  Receipt,
  DoorOpen,
  Calendar,
  User,
  Phone,
  CreditCard,
  Banknote,
  QrCode,
  ShieldAlert,
  CheckCircle2,
  X,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface DailyCheckoutModalProps {
  isOpen: boolean;
  booking: DailyBooking | null;
  onClose: () => void;
  onConfirmCheckout: (data: {
    booking: DailyBooking;
    extraCharges: number;
    extraNote: string;
    paymentMethod: "promptpay" | "cash";
  }) => Promise<void>;
}

export function DailyCheckoutModal({
  isOpen,
  booking,
  onClose,
  onConfirmCheckout,
}: DailyCheckoutModalProps) {
  const [extraCharges, setExtraCharges] = useState<number>(0);
  const [extraNote, setExtraNote] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"promptpay" | "cash">("promptpay");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (booking) {
      setExtraCharges(0);
      setExtraNote("");
      setPaymentMethod("promptpay");
      setIsSubmitting(false);
    }
  }, [booking]);

  if (!isOpen || !booking) return null;

  const totalRoomPrice = Number(booking.totalRoomPrice || (booking.dailyRate * (booking.nights || 1)) || 650);
  const keyDeposit = Number(booking.keyDeposit || 500);
  const roomDeposit = Number(booking.roomDeposit || 0);
  const totalDeposit = keyDeposit + roomDeposit;
  const grandTotal = totalRoomPrice + (Number(extraCharges) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirmCheckout({
        booking,
        extraCharges: Number(extraCharges) || 0,
        extraNote,
        paymentMethod,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                เช็คเอาท์ & บันทึกรับเงินห้องพักรายวัน
              </h3>
              <p className="text-xs text-emerald-100 mt-0.5">
                ห้อง {booking.roomNumber} • ผู้เข้าพัก: {booking.guestName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* 1. Guest & Booking Summary */}
          <div className="p-3.5 rounded-2xl bg-[var(--subtle)] border border-[var(--border)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-[var(--foreground)] flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                ห้อง {booking.roomNumber} (พัก {booking.nights || 1} คืน)
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 font-semibold text-[11px] border border-blue-500/20">
                รายวัน
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-[var(--muted)]">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[var(--foreground)] font-medium truncate">{booking.guestName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{booking.guestPhone || "-"}</span>
              </div>
              <div className="flex items-center gap-1.5 col-span-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {booking.checkInDate} ถึง {booking.checkOutDate} ({formatCurrency(booking.dailyRate || 650)}/คืน)
                </span>
              </div>
            </div>
          </div>

          {/* 2. Breakdown of Charges */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs text-[var(--foreground)] uppercase tracking-wider">
              รายการเรียกเก็บเงิน (จะลงในหน้าใบแจ้งหนี้อัตโนมัติ)
            </h4>

            {/* Base Room Charge */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--card)] border border-[var(--border)]">
              <div>
                <div className="font-semibold text-[var(--foreground)]">ค่าห้องพักรายวัน</div>
                <div className="text-[11px] text-[var(--muted)]">
                  {booking.nights || 1} คืน x {formatCurrency(booking.dailyRate || 650)}
                </div>
              </div>
              <span className="font-bold text-sm text-[var(--foreground)]">
                {formatCurrency(totalRoomPrice)}
              </span>
            </div>

            {/* Additional Services / Damages / Minibar */}
            <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-[var(--foreground)]">
                  ค่าบริการเสริม / มินิบาร์ / ค่าปรับ (ถ้ามี)
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-[var(--muted)]">฿</span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={extraCharges === 0 ? "" : extraCharges}
                    onChange={(e) => setExtraCharges(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="0"
                    className="w-24 px-2 py-1 rounded-lg bg-[var(--subtle)] border border-[var(--border)] text-right font-bold text-xs text-[var(--foreground)] focus:border-emerald-500"
                  />
                </div>
              </div>
              {extraCharges > 0 && (
                <input
                  type="text"
                  value={extraNote}
                  onChange={(e) => setExtraNote(e.target.value)}
                  placeholder="ระบุรายละเอียด เช่น ค่าน้ำดื่ม 2 ขวด, ผ้าเช็ดตัวเปื้อน"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--subtle)] border border-[var(--border)] text-[11px] text-[var(--foreground)] focus:border-emerald-500"
                />
              )}
            </div>

            {/* Deposit Refund Reminder */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">
                <div className="font-bold text-amber-900 dark:text-amber-200">
                  เงินมัดจำรวมที่ต้องคืนลูกค้า: {formatCurrency(totalDeposit)}
                </div>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                  (มัดจำห้อง {formatCurrency(roomDeposit)} + มัดจำคีย์การ์ด {formatCurrency(keyDeposit)}) กรุณาคืนเงินมัดจำให้ลูกค้าเมื่อตรวจรับห้องเรียบร้อย
                </p>
              </div>
            </div>

            {/* Total Revenue Banner */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  ยอดรวมที่เก็บจากลูกค้า (บันทึกรายรับ)
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                  ลงในหน้าใบแจ้งหนี้เป็นสถานะ "ชำระแล้ว" อัตโนมัติ
                </div>
              </div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                {formatCurrency(grandTotal)}
              </div>
            </div>
          </div>

          {/* 3. Payment Method */}
          <div>
            <label className="block font-semibold mb-2 text-[var(--foreground)]">
              ช่องทางการรับเงิน <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPaymentMethod("promptpay")}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border transition font-medium cursor-pointer ${
                  paymentMethod === "promptpay"
                    ? "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs"
                    : "bg-[var(--subtle)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span>สแกน QR พร้อมเพย์</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border transition font-medium cursor-pointer ${
                  paymentMethod === "cash"
                    ? "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs"
                    : "bg-[var(--subtle)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>เงินสด (Cash)</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-[var(--border)] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-[var(--subtle)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--border)] font-semibold text-[var(--foreground)] transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold transition cursor-pointer shadow-md shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ยืนยันรับเงิน & เช็คเอาท์ ({formatCurrency(grandTotal)})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
