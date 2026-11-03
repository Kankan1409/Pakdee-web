"use client";

import React, { useState } from "react";
import { Invoice, ExpenseItem } from "@/types/dormitory";
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  CheckCircle2,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  Search,
  X,
  PlusCircle,
  Trash2,
  Zap,
  Droplets,
  Wrench,
  Wifi,
  Sparkles,
  Package,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
} from "lucide-react";
import { formatCurrency, formatDateThai } from "@/lib/utils";
import { AddExpenseModal } from "./add-expense-modal";

interface AccountingExportViewProps {
  invoices: Invoice[];
  expenses: ExpenseItem[];
  electricRate?: number;
  waterRate?: number;
  onAddExpense?: (expense: Omit<ExpenseItem, "id">) => Promise<void>;
  onDeleteExpense?: (id: string) => Promise<void>;
}

export function AccountingExportView({
  invoices,
  expenses,
  electricRate = 8,
  waterRate = 18,
  onAddExpense,
  onDeleteExpense,
}: AccountingExportViewProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "expenses" | "receipts" | "invoices" | "utilities">("overview");
  const [selectedMonth, setSelectedMonth] = useState<string>("11");
  const [selectedYear, setSelectedYear] = useState<string>("2569");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<string>("all");
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  // Financial calculations
  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const totalRevenue = paidInvoices.reduce((acc, i) => acc + i.totalAmount, 0);
  const totalExpense = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = totalRevenue - totalExpense;

  // Utility calculations (Monthly + Daily combined)
  let monthlyElecUnits = 0;
  let monthlyElecRevenue = 0;
  let monthlyWaterUnits = 0;
  let monthlyWaterRevenue = 0;

  let dailyElecUnits = 0;
  let dailyElecRevenue = 0;
  let dailyWaterUnits = 0;
  let dailyWaterRevenue = 0;

  paidInvoices.forEach((inv) => {
    const isDaily = inv.invoiceNumber.startsWith("INV-D-") || inv.tenantName.includes("รายวัน");
    inv.items.forEach((item) => {
      const lower = item.name.toLowerCase();
      if (lower.includes("ไฟ") || lower.includes("electric")) {
        if (isDaily) {
          dailyElecUnits += item.units || 0;
          dailyElecRevenue += item.amount || 0;
        } else {
          monthlyElecUnits += item.units || 0;
          monthlyElecRevenue += item.amount || 0;
        }
      } else if (lower.includes("น้ำ") || lower.includes("water")) {
        if (isDaily) {
          dailyWaterUnits += item.units || 0;
          dailyWaterRevenue += item.amount || 0;
        } else {
          monthlyWaterUnits += item.units || 0;
          monthlyWaterRevenue += item.amount || 0;
        }
      }
    });
  });

  const totalElecUnits = monthlyElecUnits + dailyElecUnits;
  const totalWaterUnits = monthlyWaterUnits + dailyWaterUnits;
  const totalUtilityRevenue = monthlyElecRevenue + monthlyWaterRevenue + dailyElecRevenue + dailyWaterRevenue;

  // Actual utility bills paid from dorm expenses
  const electricBillsPaid = expenses
    .filter((e) => e.category === "electric")
    .reduce((sum, e) => sum + e.amount, 0);
  const waterBillsPaid = expenses
    .filter((e) => e.category === "water")
    .reduce((sum, e) => sum + e.amount, 0);
  const totalUtilityBillsPaid = electricBillsPaid + waterBillsPaid;

  const electricMargin = (monthlyElecRevenue + dailyElecRevenue) - electricBillsPaid;
  const waterMargin = (monthlyWaterRevenue + dailyWaterRevenue) - waterBillsPaid;
  const totalUtilityMargin = totalUtilityRevenue - totalUtilityBillsPaid;

  const handleExportExcel = () => {
    // Generate CSV with UTF-8 BOM so Microsoft Excel opens Thai text properly without garbled characters
    const headers = ["ลำดับ", "ประเภทเอกสาร", "เลขที่เอกสาร", "ห้อง/รายการ", "คู่สัญญา/ผู้ชำระ", "วันที่", "จำนวนเงิน (บาท)", "สถานะ"];
    const csvRows = [headers.join(",")];

    let rowNum = 1;
    // Export Paid Receipts
    paidInvoices.forEach((inv) => {
      csvRows.push([
        rowNum++,
        `"ใบเสร็จรับเงิน (Receipt)"`,
        `"REC-${inv.invoiceNumber}"`,
        `"ห้อง ${inv.roomNumber} - ค่าเช่าและสาธารณูปโภค"`,
        `"${inv.tenantName}"`,
        `"${inv.paidAt ? formatDateThai(inv.paidAt) : formatDateThai(inv.billingDate)}"`,
        inv.totalAmount.toFixed(2),
        `"ชำระแล้ว"`
      ].join(","));
    });

    // Export Expenses
    expenses.forEach((exp) => {
      csvRows.push([
        rowNum++,
        `"รายจ่ายหอพัก (Expense)"`,
        `"EXP-${exp.id.slice(-6)}"`,
        `"${exp.title}"`,
        `"${exp.paidTo}"`,
        `"${formatDateThai(exp.date)}"`,
        (-exp.amount).toFixed(2),
        `"จ่ายแล้ว"`
      ].join(","));
    });

    // Summary Rows
    csvRows.push(["", "", "", "", "", "", "", ""].join(","));
    csvRows.push(["", `"สรุปภาพรวมการเงิน"`, `""`, `"รายรับรวมทั้งสิ้น"`, `""`, `""`, totalRevenue.toFixed(2), `""`].join(","));
    csvRows.push(["", `""`, `""`, `"รายจ่ายรวมทั้งสิ้น"`, `""`, `""`, (-totalExpense).toFixed(2), `""`].join(","));
    csvRows.push(["", `""`, `""`, `"กำไรสุทธิ (Net Profit)"`, `""`, `""`, netProfit.toFixed(2), `""`].join(","));

    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `PAKDEE_Accounting_PL_${selectedYear}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredExpenses = expenses.filter((exp) => {
    if (selectedExpenseCategory !== "all" && exp.category !== selectedExpenseCategory) {
      return false;
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      exp.title.toLowerCase().includes(q) ||
      exp.paidTo.toLowerCase().includes(q) ||
      (exp.notes && exp.notes.toLowerCase().includes(q))
    );
  });

  const filteredPaidInvoices = paidInvoices.filter((inv) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.roomNumber.toLowerCase().includes(q) ||
      inv.tenantName.toLowerCase().includes(q)
    );
  });

  const filteredInvoices = invoices.filter((inv) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.roomNumber.toLowerCase().includes(q) ||
      inv.tenantName.toLowerCase().includes(q)
    );
  });

  const getCategoryBadge = (cat: ExpenseItem["category"]) => {
    switch (cat) {
      case "electric":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 flex items-center gap-1 w-fit"><Zap className="w-3 h-3" /> ค่าไฟ</span>;
      case "water":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 flex items-center gap-1 w-fit"><Droplets className="w-3 h-3" /> ค่าน้ำ</span>;
      case "salary":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 flex items-center gap-1 w-fit"><Sparkles className="w-3 h-3" /> ค่าจ้าง</span>;
      case "repairs":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 flex items-center gap-1 w-fit"><Wrench className="w-3 h-3" /> ซ่อมแซม</span>;
      case "internet":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 flex items-center gap-1 w-fit"><Wifi className="w-3 h-3" /> เน็ต</span>;
      case "supplies":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 flex items-center gap-1 w-fit"><Package className="w-3 h-3" /> ของใช้</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20 flex items-center gap-1 w-fit"><Layers className="w-3 h-3" /> อื่นๆ</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[var(--foreground)]">
              ระบบบัญชี รายรับ-รายจ่าย & กำไรขาดทุน
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              P&L Accounting Hub
            </span>
          </div>
          <p className="text-xs text-[var(--muted)] mt-1">
            สรุปงบกำไร-ขาดทุน บันทึกต้นทุนค่าน้ำ-ค่าไฟหอพัก บัญชีรายจ่าย และส่งออกรายงาน Excel ครบในที่เดียว
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsAddExpenseOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ บันทึกรายจ่ายใหม่</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ส่งออก Excel (CSV)</span>
          </button>
        </div>
      </div>

      {/* KPI Bento Grid: Revenue, Expense, Net Profit, Utility Margin */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Revenue */}
        <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <span className="font-semibold">รายรับรวม (Revenue)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalRevenue)}
          </div>
          <div className="text-[11px] text-[var(--muted)]">
            จากบิลที่ชำระแล้ว {paidInvoices.length} ฉบับ
          </div>
        </div>

        {/* 2. Total Expenses */}
        <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <span className="font-semibold">รายจ่ายรวม (Expenses)</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {formatCurrency(totalExpense)}
          </div>
          <div className="text-[11px] text-[var(--muted)]">
            บันทึกรายจ่าย {expenses.length} รายการ
          </div>
        </div>

        {/* 3. Net Operating Income / Profit */}
        <div className={`p-4 rounded-2xl border shadow-xs space-y-2 ${
          netProfit >= 0
            ? "bg-emerald-500/5 border-emerald-500/30"
            : "bg-rose-500/5 border-rose-500/30"
        }`}>
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <span className="font-semibold">กำไรสุทธิ (Net Profit)</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              netProfit >= 0 ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-600"
            }`}>
              {netProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div className={`text-2xl font-black ${
            netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          }`}>
            {formatCurrency(netProfit)}
          </div>
          <div className="text-[11px] text-[var(--muted)]">
            อัตรากำไร {totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%
          </div>
        </div>

        {/* 4. Dorm Utility Net Margin */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/5 via-blue-500/5 to-transparent border border-blue-500/20 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <span className="font-semibold">ส่วนต่างค่าน้ำ-ไฟหอพัก</span>
            <div className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <Droplets className="w-3.5 h-3.5 text-blue-500" />
            </div>
          </div>
          <div className={`text-2xl font-black ${
            totalUtilityMargin >= 0 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"
          }`}>
            {totalUtilityMargin >= 0 ? "+" : ""}{formatCurrency(totalUtilityMargin)}
          </div>
          <div className="text-[11px] text-[var(--muted)] flex items-center justify-between">
            <span>เก็บได้ {formatCurrency(totalUtilityRevenue)}</span>
            <span>จ่ายหลวง {formatCurrency(totalUtilityBillsPaid)}</span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] overflow-x-auto pb-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 rounded-t-xl transition border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === "overview"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 font-bold"
              : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>ภาพรวมงบกำไรขาดทุน (P&L)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("expenses")}
          className={`px-4 py-2.5 rounded-t-xl transition border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === "expenses"
              ? "border-rose-600 text-rose-600 dark:text-rose-400 bg-rose-500/5 font-bold"
              : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>บันทึกรายจ่าย ({expenses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("utilities")}
          className={`px-4 py-2.5 rounded-t-xl transition border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === "utilities"
              ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-500/5 font-bold"
              : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <Zap className="w-4 h-4 text-amber-500" />
          <span>วิเคราะห์ค่าน้ำ-ไฟหอพัก (รายเดือน+รายวัน)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("receipts")}
          className={`px-4 py-2.5 rounded-t-xl transition border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === "receipts"
              ? "border-teal-600 text-teal-600 dark:text-teal-400 bg-teal-500/5 font-bold"
              : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>ใบเสร็จรับเงิน ({paidInvoices.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("invoices")}
          className={`px-4 py-2.5 rounded-t-xl transition border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === "invoices"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 font-bold"
              : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>ใบแจ้งหนี้ทั้งหมด ({invoices.length})</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW P&L */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Breakdown */}
          <div className="p-5 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-[var(--foreground)] flex items-center justify-between">
              <span>หมวดรายรับ (Inflow Breakdown)</span>
              <span className="text-emerald-600 font-extrabold">{formatCurrency(totalRevenue)}</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center p-3 rounded-xl bg-[var(--subtle)]">
                <div>
                  <div className="font-semibold text-[var(--foreground)]">ค่าเช่าห้องพัก (รายเดือน)</div>
                  <div className="text-[10px] text-[var(--muted)]">จากผู้เช่าประจำ</div>
                </div>
                <span className="font-bold text-[var(--foreground)]">
                  {formatCurrency(paidInvoices.filter(i => !i.invoiceNumber.startsWith("INV-D-")).reduce((s, i) => s + (i.items[0]?.amount || 0), 0))}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-[var(--subtle)]">
                <div>
                  <div className="font-semibold text-[var(--foreground)]">ห้องพักรายวัน & มินิบาร์</div>
                  <div className="text-[10px] text-[var(--muted)]">เช็คเอาท์รายวัน & บริการเสริม</div>
                </div>
                <span className="font-bold text-[var(--foreground)]">
                  {formatCurrency(paidInvoices.filter(i => i.invoiceNumber.startsWith("INV-D-")).reduce((s, i) => s + i.totalAmount, 0))}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-[var(--subtle)]">
                <div>
                  <div className="font-semibold text-[var(--foreground)]">ค่าน้ำ-ค่าไฟเรียกเก็บรวม</div>
                  <div className="text-[10px] text-[var(--muted)]">ไฟ {totalElecUnits} หน่วย, น้ำ {totalWaterUnits} หน่วย</div>
                </div>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(totalUtilityRevenue)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-[var(--subtle)]">
                <div>
                  <div className="font-semibold text-[var(--foreground)]">ค่าส่วนกลางและขยะ</div>
                  <div className="text-[10px] text-[var(--muted)]">ค่าบริการส่วนกลางรายเดือน</div>
                </div>
                <span className="font-bold text-[var(--foreground)]">
                  {formatCurrency(paidInvoices.reduce((s, i) => s + (i.items.find(x => x.name.includes("ส่วนกลาง"))?.amount || 0), 0))}
                </span>
              </div>
            </div>
          </div>

          {/* Expenses Breakdown */}
          <div className="p-5 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-[var(--foreground)] flex items-center justify-between">
              <span>หมวดรายจ่าย (Outflow Breakdown)</span>
              <span className="text-rose-600 font-extrabold">{formatCurrency(totalExpense)}</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center p-3 rounded-xl bg-[var(--subtle)]">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <div>
                    <div className="font-semibold text-[var(--foreground)]">บิลค่าไฟฟ้าการไฟฟ้า (MEA/PEA)</div>
                    <div className="text-[10px] text-[var(--muted)]">หม้อแปลงหลักหอพัก</div>
                  </div>
                </div>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {formatCurrency(electricBillsPaid)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-[var(--subtle)]">
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-blue-500" />
                  <div>
                    <div className="font-semibold text-[var(--foreground)]">บิลค่าน้ำประปาการประปา (MWA/PWA)</div>
                    <div className="text-[10px] text-[var(--muted)]">มิเตอร์หลักหอพัก</div>
                  </div>
                </div>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {formatCurrency(waterBillsPaid)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-[var(--subtle)]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <div>
                    <div className="font-semibold text-[var(--foreground)]">ค่าจ้างแม่บ้าน & พนักงาน</div>
                    <div className="text-[10px] text-[var(--muted)]">ทำความสะอาดและดูแลหอพัก</div>
                  </div>
                </div>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {formatCurrency(expenses.filter(e => e.category === "salary").reduce((s, e) => s + e.amount, 0))}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-[var(--subtle)]">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-rose-500" />
                  <div>
                    <div className="font-semibold text-[var(--foreground)]">ซ่อมบำรุง & อุปกรณ์</div>
                    <div className="text-[10px] text-[var(--muted)]">ช่างไฟฟ้า ประปา แอร์ ซ่อมแซมห้อง</div>
                  </div>
                </div>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {formatCurrency(expenses.filter(e => e.category === "repairs").reduce((s, e) => s + e.amount, 0))}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-[var(--subtle)]">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-500" />
                  <div>
                    <div className="font-semibold text-[var(--foreground)]">อินเทอร์เน็ต, ส่วนกลาง และอื่นๆ</div>
                    <div className="text-[10px] text-[var(--muted)]">ค่าบริการอื่นๆ ของหอพัก</div>
                  </div>
                </div>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {formatCurrency(expenses.filter(e => !["electric", "water", "salary", "repairs"].includes(e.category)).reduce((s, e) => s + e.amount, 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EXPENSES TABLE */}
      {activeTab === "expenses" && (
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-xs space-y-4 p-5">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-[var(--muted)] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="ค้นหารายการ, ผู้รับเงิน..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              {["all", "electric", "water", "salary", "repairs", "internet", "supplies", "other"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedExpenseCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    selectedExpenseCategory === cat
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-[var(--subtle)] text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {cat === "all" ? "ทั้งหมด" : cat === "electric" ? "⚡ ค่าไฟ" : cat === "water" ? "💧 ค่าน้ำ" : cat === "salary" ? "🧹 ค่าจ้าง" : cat === "repairs" ? "🔧 ซ่อม" : cat === "internet" ? "📶 เน็ต" : cat === "supplies" ? "🗑️ ส่วนกลาง" : "📄 อื่นๆ"}
                </button>
              ))}
            </div>
          </div>

          {/* Expenses Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--subtle)] text-[var(--muted)] font-semibold border-b border-[var(--border)]">
                <tr>
                  <th className="p-3">วันที่</th>
                  <th className="p-3">หมวดหมู่</th>
                  <th className="p-3">รายการรายจ่าย</th>
                  <th className="p-3">จ่ายให้แก่</th>
                  <th className="p-3 text-right">จำนวนเงิน</th>
                  <th className="p-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-[var(--muted)]">
                      ไม่พบข้อมูลรายการรายจ่าย
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-[var(--subtle)] transition">
                      <td className="p-3 font-mono text-[var(--muted)] whitespace-nowrap">
                        {formatDateThai(exp.date)}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {getCategoryBadge(exp.category)}
                      </td>
                      <td className="p-3 font-medium text-[var(--foreground)]">
                        <div>{exp.title}</div>
                        {exp.notes && (
                          <div className="text-[10px] text-[var(--muted)]">{exp.notes}</div>
                        )}
                      </td>
                      <td className="p-3 text-[var(--muted)] whitespace-nowrap">
                        {exp.paidTo}
                      </td>
                      <td className="p-3 text-right font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        -{formatCurrency(exp.amount)}
                      </td>
                      <td className="p-3 text-center">
                        {onDeleteExpense && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`คุณต้องการลบรายจ่าย "${exp.title}" ใช่หรือไม่?`)) {
                                onDeleteExpense(exp.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition cursor-pointer"
                            title="ลบรายการ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DORM UTILITY ANALYSIS (MONTHLY + DAILY COMBINED) */}
      {activeTab === "utilities" && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3">
            <Zap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm">การคำนวณและวิเคราะห์ค่าน้ำ-ไฟหอพัก (รวมรายเดือนและรายวัน)</div>
              <p className="mt-1 leading-relaxed text-blue-800/80 dark:text-blue-300/80">
                ระบบคำนวณหน่วยที่มิเตอร์เปลี่ยนทั้งจากห้องพักรายเดือนและห้องพักรายวัน (+หน่วยที่ใช้จริง) เปรียบเทียบกับบิลที่จ่ายให้การไฟฟ้า (MEA/PEA) และการประปา (MWA/PWA) เพื่อแสดงส่วนต่างกำไร/ขาดทุนจากสาธารณูปโภคอย่างแม่นยำ
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Electricity Card */}
            <div className="p-5 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[var(--foreground)]">วิเคราะห์ค่าไฟฟ้าหอพัก</h4>
                    <span className="text-[10px] text-[var(--muted)]">อัตราค่าไฟเรียกเก็บ: ฿{electricRate}/หน่วย</span>
                  </div>
                </div>
                <div className={`text-sm font-black ${electricMargin >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {electricMargin >= 0 ? "กำไร +" : "ขาดทุน "}{formatCurrency(electricMargin)}
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-[var(--subtle)]">
                  <span>หน่วยไฟที่ใช้: รายเดือน</span>
                  <span className="font-mono font-bold">{monthlyElecUnits} หน่วย</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-[var(--subtle)]">
                  <span>หน่วยไฟที่ใช้: รายวัน (มิเตอร์ขยับ)</span>
                  <span className="font-mono font-bold text-amber-600">+{dailyElecUnits} หน่วย</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-amber-500/10 font-bold">
                  <span>รวมหน่วยไฟที่มิเตอร์เปลี่ยนทั้งหอ</span>
                  <span className="font-mono text-amber-700 dark:text-amber-300">{totalElecUnits} หน่วย</span>
                </div>
                <div className="pt-2 border-t border-[var(--border)] flex justify-between items-center text-xs">
                  <span>ยอดเรียกเก็บค่าไฟจากผู้เช่า/ผู้พัก</span>
                  <span className="font-bold text-emerald-600">+{formatCurrency(monthlyElecRevenue + dailyElecRevenue)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span>บิลค่าไฟจ่ายให้การไฟฟ้าจริง</span>
                  <span className="font-bold text-rose-600">-{formatCurrency(electricBillsPaid)}</span>
                </div>
              </div>
            </div>

            {/* Water Card */}
            <div className="p-5 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <Droplets className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[var(--foreground)]">วิเคราะห์ค่าน้ำประปาหอพัก</h4>
                    <span className="text-[10px] text-[var(--muted)]">อัตราค่าน้ำเรียกเก็บ: ฿{waterRate}/หน่วย</span>
                  </div>
                </div>
                <div className={`text-sm font-black ${waterMargin >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {waterMargin >= 0 ? "กำไร +" : "ขาดทุน "}{formatCurrency(waterMargin)}
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-[var(--subtle)]">
                  <span>หน่วยน้ำที่ใช้: รายเดือน</span>
                  <span className="font-mono font-bold">{monthlyWaterUnits} หน่วย</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-[var(--subtle)]">
                  <span>หน่วยน้ำที่ใช้: รายวัน (มิเตอร์ขยับ)</span>
                  <span className="font-mono font-bold text-blue-600">+{dailyWaterUnits} หน่วย</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-blue-500/10 font-bold">
                  <span>รวมหน่วยน้ำที่มิเตอร์เปลี่ยนทั้งหอ</span>
                  <span className="font-mono text-blue-700 dark:text-blue-300">{totalWaterUnits} หน่วย</span>
                </div>
                <div className="pt-2 border-t border-[var(--border)] flex justify-between items-center text-xs">
                  <span>ยอดเรียกเก็บค่าน้ำจากผู้เช่า/ผู้พัก</span>
                  <span className="font-bold text-emerald-600">+{formatCurrency(monthlyWaterRevenue + dailyWaterRevenue)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span>บิลค่าน้ำจ่ายให้การประปาจริง</span>
                  <span className="font-bold text-rose-600">-{formatCurrency(waterBillsPaid)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PAID RECEIPTS */}
      {activeTab === "receipts" && (
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-xs space-y-4 p-5">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-[var(--muted)] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="ค้นหาเลขที่บิล, ห้อง, ชื่อผู้เช่า..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--subtle)] text-[var(--muted)] font-semibold border-b border-[var(--border)]">
                <tr>
                  <th className="p-3">เลขที่ใบเสร็จ</th>
                  <th className="p-3">ห้อง</th>
                  <th className="p-3">ผู้ชำระเงิน</th>
                  <th className="p-3">วันที่ชำระ</th>
                  <th className="p-3 text-right">ยอดเงินรวม</th>
                  <th className="p-3 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredPaidInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-[var(--muted)]">
                      ไม่พบใบเสร็จรับเงินที่ชำระแล้ว
                    </td>
                  </tr>
                ) : (
                  filteredPaidInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-[var(--subtle)] transition">
                      <td className="p-3 font-mono font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        REC-{inv.invoiceNumber}
                      </td>
                      <td className="p-3 font-bold whitespace-nowrap">
                        ห้อง {inv.roomNumber}
                      </td>
                      <td className="p-3 text-[var(--foreground)]">
                        {inv.tenantName}
                      </td>
                      <td className="p-3 text-[var(--muted)] whitespace-nowrap">
                        {inv.paidAt ? formatDateThai(inv.paidAt) : formatDateThai(inv.billingDate)}
                      </td>
                      <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {formatCurrency(inv.totalAmount)}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          ชำระแล้ว
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: ALL INVOICES */}
      {activeTab === "invoices" && (
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-xs space-y-4 p-5">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-[var(--muted)] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="ค้นหาใบแจ้งหนี้..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--subtle)] text-[var(--muted)] font-semibold border-b border-[var(--border)]">
                <tr>
                  <th className="p-3">เลขที่ใบแจ้งหนี้</th>
                  <th className="p-3">ห้อง</th>
                  <th className="p-3">ชื่อผู้เช่า</th>
                  <th className="p-3">วันที่ออกบิล</th>
                  <th className="p-3 text-right">จำนวนเงิน</th>
                  <th className="p-3 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-[var(--muted)]">
                      ไม่พบข้อมูลใบแจ้งหนี้
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-[var(--subtle)] transition">
                      <td className="p-3 font-mono font-medium whitespace-nowrap">
                        {inv.invoiceNumber}
                      </td>
                      <td className="p-3 font-bold whitespace-nowrap">
                        ห้อง {inv.roomNumber}
                      </td>
                      <td className="p-3 text-[var(--foreground)]">
                        {inv.tenantName}
                      </td>
                      <td className="p-3 text-[var(--muted)] whitespace-nowrap">
                        {formatDateThai(inv.billingDate)}
                      </td>
                      <td className="p-3 text-right font-black whitespace-nowrap">
                        {formatCurrency(inv.totalAmount)}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          inv.status === "paid"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                        }`}>
                          {inv.status === "paid" ? "ชำระแล้ว" : "รอชำระ"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {onAddExpense && (
        <AddExpenseModal
          isOpen={isAddExpenseOpen}
          onClose={() => setIsAddExpenseOpen(false)}
          onAddExpense={onAddExpense}
        />
      )}
    </div>
  );
}
