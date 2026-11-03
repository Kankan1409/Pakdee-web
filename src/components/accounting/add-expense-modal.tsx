"use client";

import React, { useState } from "react";
import { ExpenseItem } from "@/types/dormitory";
import {
  X,
  PlusCircle,
  Zap,
  Droplets,
  DollarSign,
  Calendar,
  User,
  FileText,
  Wrench,
  Wifi,
  Sparkles,
  Package,
  Layers,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExpense: (expense: Omit<ExpenseItem, "id">) => Promise<void>;
}

const CATEGORIES: {
  id: ExpenseItem["category"];
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
}[] = [
  {
    id: "electric",
    label: "ค่าไฟฟ้าการไฟฟ้า",
    icon: Zap,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
  },
  {
    id: "water",
    label: "ค่าน้ำประปา",
    icon: Droplets,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
  },
  {
    id: "salary",
    label: "ค่าจ้างแม่บ้าน/พนักงาน",
    icon: Sparkles,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
  },
  {
    id: "repairs",
    label: "ซ่อมบำรุง/ช่าง",
    icon: Wrench,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/30",
  },
  {
    id: "internet",
    label: "อินเทอร์เน็ตหอพัก",
    icon: Wifi,
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-500/10",
    borderColor: "border-teal-500/30",
  },
  {
    id: "supplies",
    label: "วัสดุสิ้นเปลือง/ส่วนกลาง",
    icon: Package,
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/30",
  },
  {
    id: "other",
    label: "อื่นๆ",
    icon: Layers,
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-500/10",
    borderColor: "border-slate-500/30",
  },
];

export function AddExpenseModal({
  isOpen,
  onClose,
  onAddExpense,
}: AddExpenseModalProps) {
  const [category, setCategory] = useState<ExpenseItem["category"]>("electric");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paidTo, setPaidTo] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCategorySelect = (cat: ExpenseItem["category"]) => {
    setCategory(cat);
    // Autofill common titles/paidTo for fast UX
    if (!title || title.startsWith("บิล") || title.startsWith("ค่า")) {
      if (cat === "electric") {
        setTitle("บิลค่าไฟฟ้าการไฟฟ้านครหลวง");
        setPaidTo("การไฟฟ้านครหลวง (MEA)");
      } else if (cat === "water") {
        setTitle("บิลค่าน้ำประปาการประปานครหลวง");
        setPaidTo("การประปานครหลวง (MWA)");
      } else if (cat === "salary") {
        setTitle("ค่าจ้างแม่บ้านทำความสะอาด");
        setPaidTo("แม่บ้านประจำหอพัก");
      } else if (cat === "repairs") {
        setTitle("ค่าช่างซ่อมบำรุงอุปกรณ์");
        setPaidTo("ช่างซ่อมประจำหอ");
      } else if (cat === "internet") {
        setTitle("ค่าบริการอินเทอร์เน็ตความเร็วสูง");
        setPaidTo("ผู้ให้บริการอินเทอร์เน็ต");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("กรุณาระบุชื่อรายการรายจ่าย");
      return;
    }
    const numAmount = amount === "" ? 0 : Number(amount);
    if (numAmount <= 0) {
      setErrorMsg("กรุณาระบุจำนวนเงินที่มากกว่า 0 บาท");
      return;
    }
    if (!paidTo.trim()) {
      setErrorMsg("กรุณาระบุผู้รับเงิน / หน่วยงานที่ชำระ");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await onAddExpense({
        category,
        title: title.trim(),
        amount: numAmount,
        date: date || new Date().toISOString().slice(0, 10),
        paidTo: paidTo.trim(),
        notes: notes.trim() || undefined,
      });
      // Reset form
      setTitle("");
      setAmount("");
      setPaidTo("");
      setNotes("");
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg("เกิดข้อผิดพลาดในการบันทึกรายจ่าย");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-rose-600 to-amber-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <PlusCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                บันทึกรายจ่ายหอพักใหม่
              </h3>
              <p className="text-xs text-rose-100 mt-0.5">
                บันทึกค่าน้ำ ค่าไฟ ค่าช่าง และต้นทุนการบริหารหอพัก
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
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* 1. Category Selection Bento */}
          <div>
            <label className="font-bold text-xs text-[var(--foreground)] block mb-2">
              หมวดหมู่รายจ่าย
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? `${cat.bgColor} ${cat.borderColor} ${cat.color} font-bold ring-2 ring-rose-500/30 shadow-xs`
                        : "bg-[var(--subtle)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-slate-300"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-[11px] truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Title & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>ชื่อรายการรายจ่าย *</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น บิลค่าไฟฟ้าการไฟฟ้านครหลวง รอบ ต.ค."
                className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:border-rose-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                <span>จำนวนเงิน (บาท) *</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-right font-bold text-xs text-rose-600 dark:text-rose-400 focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 3. Date & Paid To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>วันที่ชำระ *</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:border-rose-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>จ่ายให้แก่ / หน่วยงานที่รับเงิน *</span>
              </label>
              <input
                type="text"
                required
                value={paidTo}
                onChange={(e) => setPaidTo(e.target.value)}
                placeholder="เช่น การไฟฟ้านครหลวง, ช่างสมคิด"
                className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 4. Notes */}
          <div className="space-y-1">
            <label className="font-semibold text-[var(--foreground)]">
              หมายเหตุ / รายละเอียดเพิ่มเติม (ถ้ามี)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เช่น เลขที่บิล, เปลี่ยนหลอดไฟชั้น 2, ฯลฯ"
              className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:border-rose-500 focus:outline-none"
            />
          </div>

          {/* Summary Preview Banner */}
          {amount !== "" && Number(amount) > 0 && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
              <div className="text-xs text-rose-800 dark:text-rose-300 font-medium">
                ยอดรายจ่ายที่จะบันทึกลงระบบ:
              </div>
              <div className="text-base font-black text-rose-600 dark:text-rose-400">
                -{formatCurrency(Number(amount))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--subtle)] font-semibold transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold shadow-md shadow-rose-600/20 transition cursor-pointer flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isSubmitting ? "กำลังบันทึก..." : "บันทึกรายจ่าย"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
