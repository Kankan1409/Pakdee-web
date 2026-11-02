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
  Receipt,
  Search,
  X,
} from "lucide-react";
import { formatCurrency, formatDateThai } from "@/lib/utils";

interface AccountingExportViewProps {
  invoices: Invoice[];
  expenses: ExpenseItem[];
}

export function AccountingExportView({
  invoices,
  expenses,
}: AccountingExportViewProps) {
  const [activeTab, setActiveTab] = useState<string>("receipts");
  const [selectedMonth, setSelectedMonth] = useState<string>("10");
  const [selectedYear, setSelectedYear] = useState<string>("2569");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const totalRevenue = paidInvoices.reduce((acc, i) => acc + i.totalAmount, 0);
  const totalExpense = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = totalRevenue - totalExpense;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      if (activeTab === "receipts") setSelectedItems(paidInvoices.map((i) => i.id));
      else if (activeTab === "expenses") setSelectedItems(expenses.map((e) => e.id));
      else setSelectedItems(invoices.map((i) => i.id));
    } else {
      setSelectedItems([]);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleExportExcel = () => {
    // Generate CSV with UTF-8 BOM so Microsoft Excel opens Thai text properly without garbled characters
    const headers = ["ลำดับ", "ประเภทเอกสาร", "เลขที่เอกสาร", "ห้อง/รายการ", "คู่สัญญา/ผู้ชำระ", "วันที่", "จำนวนเงิน (บาท)", "สถานะ"];
    const csvRows = [headers.join(",")];

    let rowNum = 1;
    if (activeTab === "receipts" || activeTab === "all") {
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
    }

    if (activeTab === "invoices" || activeTab === "all") {
      invoices.forEach((inv) => {
        csvRows.push([
          rowNum++,
          `"ใบแจ้งหนี้ (Invoice)"`,
          `"${inv.invoiceNumber}"`,
          `"ห้อง ${inv.roomNumber}"`,
          `"${inv.tenantName}"`,
          `"${formatDateThai(inv.billingDate)}"`,
          inv.totalAmount.toFixed(2),
          `"${inv.status === 'paid' ? 'ชำระแล้ว' : 'รอชำระ'}"`
        ].join(","));
      });
    }

    if (activeTab === "expenses" || activeTab === "all") {
      expenses.forEach((exp) => {
        csvRows.push([
          rowNum++,
          `"รายจ่าย (Expense)"`,
          `"EXP-${exp.id.slice(-6)}"`,
          `"${exp.title}"`,
          `"${exp.paidTo}"`,
          `"${formatDateThai(exp.date)}"`,
          exp.amount.toFixed(2),
          `"จ่ายแล้ว"`
        ].join(","));
      });
    }

    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `PAKDEE_Accounting_${selectedYear}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintBatch = () => {
    window.print();
  };

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

  const filteredExpenses = expenses.filter((exp) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      exp.title.toLowerCase().includes(q) ||
      exp.paidTo.toLowerCase().includes(q) ||
      (exp.notes && exp.notes.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--foreground)] tracking-tight">
              เอกสารบัญชีและการเงิน (Accounting & Tax)
            </h1>
            <p className="text-xs text-[var(--muted)]">
              รวบรวมใบเสร็จ ใบกำกับภาษี สรุปรายรับ-รายจ่าย ส่งสำนักงานบัญชีหรือยื่นภาษี
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md shadow-emerald-500/20 transition cursor-pointer text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ดาวน์โหลด Excel</span>
          </button>
          <button
            onClick={handlePrintBatch}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] hover:bg-[var(--card)] text-[var(--foreground)] font-medium transition cursor-pointer text-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>พิมพ์ PDF รวม ({selectedItems.length})</span>
          </button>
        </div>
      </div>

      {/* Financial Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-sm">
          <div className="text-xs text-[var(--muted)] font-medium flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> รายรับรวม (ค่าเช่า + ค่าน้ำไฟที่เก็บได้)
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            {formatCurrency(totalRevenue)}
          </div>
          <div className="text-xs text-[var(--muted)] mt-1">{paidInvoices.length} บิลที่ชำระแล้ว</div>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-sm">
          <div className="text-xs text-[var(--muted)] font-medium flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-rose-500" /> รายจ่ายรวม (บิล กฟน./กปน. + ค่าช่าง)
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">
            {formatCurrency(totalExpense)}
          </div>
          <div className="text-xs text-[var(--muted)] mt-1">{expenses.length} รายการค่าใช้จ่าย</div>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 shadow-sm">
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            กำไรสุทธิจากการดำเนินงาน (Net Profit)
          </div>
          <div className="text-3xl font-extrabold text-[var(--foreground)] mt-2">
            {formatCurrency(netProfit)}
          </div>
          <div className="text-xs text-[var(--muted)] mt-1">รายรับหักค่าใช้จ่ายทั้งหมด</div>
        </div>
      </div>

      {/* Category Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[var(--card)] p-3 rounded-2xl border border-[var(--border)]">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { id: "receipts", label: `ใบเสร็จรับเงิน (${filteredPaidInvoices.length})` },
            { id: "invoices", label: `ใบแจ้งหนี้ทั้งหมด (${filteredInvoices.length})` },
            { id: "expenses", label: `รายการรายจ่าย (${filteredExpenses.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedItems([]);
              }}
              className={`px-3.5 py-1.5 rounded-xl font-medium transition cursor-pointer shrink-0 ${
                activeTab === tab.id
                  ? "bg-teal-600 text-white font-semibold shadow-sm"
                  : "bg-[var(--subtle)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input & Month Selector */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--muted)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาเลขที่บิล, ห้อง, ชื่อ..."
              className="w-full bg-[var(--subtle)] border border-[var(--border)] rounded-xl pl-8 pr-7 py-1.5 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-teal-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-[var(--foreground)]"
          >
            <option value="10">ตุลาคม</option>
            <option value="11">พฤศจิกายน</option>
            <option value="12">ธันวาคม</option>
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-[var(--foreground)]"
          >
            <option value="2569">2569</option>
            <option value="2570">2570</option>
          </select>
        </div>
      </div>

      {/* Table Data */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[var(--subtle)] border-b border-[var(--border)] text-[var(--muted)] uppercase font-semibold">
                <th className="p-3.5 w-10">
                  <input
                    type="checkbox"
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded text-teal-600"
                  />
                </th>
                <th className="p-3.5">เลขที่เอกสาร</th>
                <th className="p-3.5">ห้อง / รายการ</th>
                <th className="p-3.5">คู่สัญญา / ผู้ชำระ</th>
                <th className="p-3.5">วันที่</th>
                <th className="p-3.5 text-right">จำนวนเงิน</th>
                <th className="p-3.5 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--foreground)]">
              {activeTab === "receipts" &&
                (filteredPaidInvoices.length > 0 ? (
                  filteredPaidInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                      <td className="p-3.5">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(inv.id)}
                          onChange={() => toggleSelect(inv.id)}
                          className="rounded text-teal-600"
                        />
                      </td>
                      <td className="p-3.5 font-mono font-semibold text-teal-600 dark:text-teal-400">
                        REC-{inv.invoiceNumber}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-bold mr-2 text-[11px]">
                          {inv.roomNumber}
                        </span>
                        ค่าเช่าและสาธารณูปโภค
                      </td>
                      <td className="p-3.5">{inv.tenantName}</td>
                      <td className="p-3.5 text-[var(--muted)]">{inv.paidAt || formatDateThai(inv.billingDate)}</td>
                      <td className="p-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(inv.totalAmount)}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-semibold border border-emerald-500/20">
                          ชำระแล้ว
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-xs text-[var(--muted)]">
                      ไม่พบใบเสร็จรับเงินที่ตรงกับคำค้นหา &ldquo;{searchQuery}&rdquo;
                    </td>
                  </tr>
                ))}

              {activeTab === "invoices" &&
                (filteredInvoices.length > 0 ? (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                      <td className="p-3.5">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(inv.id)}
                          onChange={() => toggleSelect(inv.id)}
                          className="rounded text-teal-600"
                        />
                      </td>
                      <td className="p-3.5 font-mono font-semibold text-blue-600 dark:text-blue-400">
                        {inv.invoiceNumber}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-bold mr-2 text-[11px]">
                          {inv.roomNumber}
                        </span>
                        ใบแจ้งหนี้รอบประจำเดือน
                      </td>
                      <td className="p-3.5">{inv.tenantName}</td>
                      <td className="p-3.5 text-[var(--muted)]">{formatDateThai(inv.billingDate)}</td>
                      <td className="p-3.5 text-right font-bold">{formatCurrency(inv.totalAmount)}</td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            inv.status === "paid"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                          }`}
                        >
                          {inv.status === "paid" ? "ชำระแล้ว" : "รอชำระ"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-xs text-[var(--muted)]">
                      ไม่พบใบแจ้งหนี้ที่ตรงกับคำค้นหา &ldquo;{searchQuery}&rdquo;
                    </td>
                  </tr>
                ))}

              {activeTab === "expenses" &&
                (filteredExpenses.length > 0 ? (
                  filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                      <td className="p-3.5">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(exp.id)}
                          onChange={() => toggleSelect(exp.id)}
                          className="rounded text-teal-600"
                        />
                      </td>
                      <td className="p-3.5 font-mono font-semibold text-rose-600 dark:text-rose-400">
                        EXP-{exp.id.slice(-6)}
                      </td>
                      <td className="p-3.5 font-semibold">{exp.title}</td>
                      <td className="p-3.5">{exp.paidTo}</td>
                      <td className="p-3.5 text-[var(--muted)]">{formatDateThai(exp.date)}</td>
                      <td className="p-3.5 text-right font-bold text-rose-600 dark:text-rose-400">
                        -{formatCurrency(exp.amount)}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-600 text-[10px] font-semibold">
                          จ่ายแล้ว
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-xs text-[var(--muted)]">
                      ไม่พบรายการรายจ่ายที่ตรงกับคำค้นหา &ldquo;{searchQuery}&rdquo;
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
