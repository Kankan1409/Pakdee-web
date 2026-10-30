"use client";

import React, { useState } from "react";
import { ExpenseItem } from "@/types/dormitory";
import {
  DollarSign,
  Plus,
  Search,
  Calendar,
  Receipt,
  Zap,
  Droplets,
  Wrench,
  Wifi,
  Users,
  Layers,
  ArrowDownRight,
  TrendingDown,
} from "lucide-react";
import { formatCurrency, formatDateThai } from "@/lib/utils";

interface ExpenseManagementViewProps {
  expenses: ExpenseItem[];
  onAddExpense: (expense: Omit<ExpenseItem, "id">) => void;
}

export function ExpenseManagementView({
  expenses,
  onAddExpense,
}: ExpenseManagementViewProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("" );
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Form State
  const [category, setCategory] = useState<ExpenseItem["category"]>("electric");
  const [title, setTitle] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>("2026-10-28");
  const [paidTo, setPaidTo] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  const getCategoryIcon = (cat: ExpenseItem["category"]) => {
    switch (cat) {
      case "electric":
        return <Zap className="w-4 h-4 text-amber-500" />;
      case "water":
        return <Droplets className="w-4 h-4 text-blue-500" />;
      case "repairs":
        return <Wrench className="w-4 h-4 text-rose-500" />;
      case "internet":
        return <Wifi className="w-4 h-4 text-indigo-500" />;
      case "salary":
        return <Users className="w-4 h-4 text-emerald-500" />;
      default:
        return <Layers className="w-4 h-4 text-slate-500" />;
    }
  };

  const getCategoryLabel = (cat: ExpenseItem["category"]) => {
    switch (cat) {
      case "electric":
        return "ค่าไฟฟ้า";
      case "water":
        return "ค่าน้ำประปา";
      case "repairs":
        return "ซ่อมแซม & ปรับปรุง";
      case "internet":
        return "อินเทอร์เน็ต";
      case "salary":
        return "เงินเดือนพนักงาน";
      case "supplies":
        return "วัสดุสิ้นเปลือง";
      default:
        return "อื่นๆ";
    }
  };

  const filtered = expenses.filter((e) => {
    if (activeCategory !== "all" && e.category !== activeCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        e.title.toLowerCase().includes(q) ||
        e.paidTo.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || amount <= 0) return;
    onAddExpense({
      category,
      title,
      amount,
      date,
      paidTo: paidTo || "ไม่ระบุ",
      notes: notes || undefined,
    });
    setTitle("");
    setAmount(0);
    setPaidTo("");
    setNotes("");
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center font-bold">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--foreground)] tracking-tight">
              ค่าใช้จ่ายหอพัก (Expenses)
            </h1>
            <p className="text-xs text-[var(--muted)]">
              บันทึกและติดตามรายจ่าย ค่าไฟรวม ค่าน้ำรวม ค่าช่าง และเงินเดือนแม่บ้าน
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-medium shadow-md shadow-rose-500/20 transition cursor-pointer text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>บันทึกค่าใช้จ่าย</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-500/10 via-pink-500/5 to-transparent border border-rose-500/20 shadow-sm">
          <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5">
            <ArrowDownRight className="w-4 h-4" />
            <span>ยอดรายจ่ายรวมเดือนนี้ (ต.ค. 2569)</span>
          </div>
          <div className="text-3xl font-extrabold text-[var(--foreground)] mt-2">
            {formatCurrency(totalExpense)}
          </div>
          <div className="text-xs text-[var(--muted)] mt-1">
            ทั้งหมด {expenses.length} รายการ
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-sm">
          <div className="text-xs text-[var(--muted)] font-medium">ค่าสาธารณูปโภคหลัก (น้ำ + ไฟ)</div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
            {formatCurrency(
              expenses
                .filter((e) => e.category === "water" || e.category === "electric")
                .reduce((acc, curr) => acc + curr.amount, 0)
            )}
          </div>
          <div className="text-xs text-[var(--muted)] mt-1">บิลรวมจากการไฟฟ้าและประปา</div>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-sm">
          <div className="text-xs text-[var(--muted)] font-medium">ค่าบำรุงรักษา & เงินเดือน</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
            {formatCurrency(
              expenses
                .filter((e) => e.category === "repairs" || e.category === "salary")
                .reduce((acc, curr) => acc + curr.amount, 0)
            )}
          </div>
          <div className="text-xs text-[var(--muted)] mt-1">ต้นทุนดำเนินงานประจำเดือน</div>
        </div>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--card)] p-3 rounded-2xl border border-[var(--border)]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="ค้นหารายการ, จ่ายให้ใคร..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs">
          {[
            { id: "all", label: "ทั้งหมด" },
            { id: "electric", label: "ค่าไฟ" },
            { id: "water", label: "ค่าน้ำ" },
            { id: "repairs", label: "ซ่อมแซม" },
            { id: "salary", label: "เงินเดือน" },
            { id: "internet", label: "อินเทอร์เน็ต" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer whitespace-nowrap ${
                activeCategory === cat.id
                  ? "bg-rose-500 text-white font-semibold shadow-sm"
                  : "bg-[var(--subtle)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[var(--subtle)] border-b border-[var(--border)] text-[var(--muted)] uppercase font-semibold">
                <th className="p-3.5">วันที่</th>
                <th className="p-3.5">หมวดหมู่</th>
                <th className="p-3.5">รายการ</th>
                <th className="p-3.5">จ่ายให้</th>
                <th className="p-3.5 text-right">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--foreground)]">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                  <td className="p-3.5 text-[var(--muted)] font-mono">{formatDateThai(item.date)}</td>
                  <td className="p-3.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--subtle)] border border-[var(--border)] text-[11px] font-medium">
                      {getCategoryIcon(item.category)}
                      {getCategoryLabel(item.category)}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="font-semibold text-sm">{item.title}</div>
                    {item.notes && <div className="text-[11px] text-[var(--muted)] mt-0.5">{item.notes}</div>}
                  </td>
                  <td className="p-3.5 text-[var(--muted)]">{item.paidTo}</td>
                  <td className="p-3.5 text-right font-bold text-rose-600 dark:text-rose-400 text-sm">
                    -{formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--subtle)]">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-600" />
                <h3 className="font-bold text-sm text-[var(--foreground)]">บันทึกรายจ่ายหอพัก</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--muted)] hover:text-[var(--foreground)] text-xs p-1"
              >
                ✕ ปิด
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">หมวดหมู่รายจ่าย *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseItem["category"])}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                >
                  <option value="electric">⚡ ค่าไฟฟ้า (บิลรวมการไฟฟ้า)</option>
                  <option value="water">💧 ค่าน้ำประปา (บิลรวมการประปา)</option>
                  <option value="repairs">🔧 ซ่อมแซม / ล้างแอร์</option>
                  <option value="salary">👤 เงินเดือนพนักงาน / แม่บ้าน</option>
                  <option value="internet">🌐 ค่าอินเทอร์เน็ต</option>
                  <option value="supplies">📦 วัสดุสิ้นเปลือง / น้ำยาทำความสะอาด</option>
                  <option value="other">📑 อื่นๆ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">ชื่อรายการ *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ค่าไฟ กฟน. ประจำเดือน ต.ค., ค่าล้างแอร์ 4 เครื่อง"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">จำนวนเงิน (บาท) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="0"
                    value={amount || ""}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs font-bold text-rose-600 dark:text-rose-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">วันที่จ่าย *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">จ่ายให้ใคร / ผู้รับเงิน</label>
                <input
                  type="text"
                  placeholder="เช่น การไฟฟ้านครหลวง, ช่างสมหมาย"
                  value={paidTo}
                  onChange={(e) => setPaidTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">หมายเหตุเพิ่มเติม</label>
                <input
                  type="text"
                  placeholder="เช่น หัก ณ ที่จ่าย 3%, ใบเสร็จรับเงินเลขที่..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--muted)] hover:bg-[var(--subtle)]"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/20"
                >
                  บันทึกค่าใช้จ่าย
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
