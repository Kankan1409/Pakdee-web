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
    alert("กำลังเตรียมไฟล์สรุปบัญชี Excel (.xlsx) ประจำงวด " + selectedMonth + "/" + selectedYear + " พร้อมดาวน์โหลด...");
  };

  const handlePrintBatch = () => {
    window.print();
  };

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

      {/* Category Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--card)] p-3 rounded-2xl border border-[var(--border)]">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { id: "receipts", label: "ใบเสร็จรับเงิน" },
            { id: "invoices", label: "ใบแจ้งหนี้ทั้งหมด" },
            { id: "expenses", label: "รายการรายจ่าย" },
            { id: "deposits", label: "เงินมัดจำประกัน" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedItems([]);
              }}
              className={`px-3.5 py-1.5 rounded-xl font-medium transition cursor-pointer ${
                activeTab === tab.id
                  ? "bg-teal-600 text-white font-semibold shadow-sm"
                  : "bg-[var(--subtle)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 text-xs">
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
                paidInvoices.map((inv) => (
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
                ))}

              {activeTab === "invoices" &&
                invoices.map((inv) => (
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
                ))}

              {activeTab === "expenses" &&
                expenses.map((exp) => (
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
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
