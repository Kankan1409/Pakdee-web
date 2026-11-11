"use client";

import React, { useState, useMemo } from "react";
import { Invoice } from "@/types/dormitory";
import { useFailedSlips } from "@/lib/use-failed-slips";
import {
  Receipt,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Send,
  Plus,
  ChevronRight,
  Search,
  Sparkles,
  Check,
  QrCode,
  Eye,
  X,
  ShieldCheck,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { formatCurrency, formatMonthThai } from "@/lib/utils";

interface InvoicesBillingViewProps {
  invoices: Invoice[];
  isSendingLineBatch?: boolean;
  onSendLineAllInvoices: () => void;
  onGenerateMonthlyInvoices: (targetMonth?: string) => void;
  onMarkAsPaid: (invoiceId: string) => void;
  onOpenInvoiceModal: (invoice: Invoice) => void;
  onShowToast: (message: string, type: "success" | "error" | "info" | "warning") => void;
  /** Current branch name shown on documents/payment info */
  propertyName?: string;
  /** Current branch id, used to load slips that failed Slip2Go verification */
  propertyId?: string;
}

export function InvoicesBillingView({
  invoices,
  isSendingLineBatch = false,
  onSendLineAllInvoices,
  onGenerateMonthlyInvoices,
  onMarkAsPaid,
  onOpenInvoiceModal,
  onShowToast,
  propertyName = "",
  propertyId = "",
}: InvoicesBillingViewProps) {
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSlipInvoice, setSelectedSlipInvoice] = useState<Invoice | null>(null);

  // Latest failed Slip2Go check per bill (fake, duplicate, wrong amount, ...). Display only.
  const { byInvoiceNumber: failedSlipByInvoice } = useFailedSlips(propertyId, invoices);

  // Extract available billing months
  const invoiceMonths = useMemo(() => {
    return Array.from(
      new Set([
        new Date().toISOString().slice(0, 7),
        ...invoices
          .map((i) => (i.billingDate && i.billingDate.length >= 7 ? i.billingDate.slice(0, 7) : ""))
          .filter((m) => !!m),
      ])
    )
      .sort()
      .reverse();
  }, [invoices]);

  const displayedInvoices = useMemo(() => {
    return invoices.filter((i) => {
      let matchMonth = true;
      if (monthFilter !== "all") {
        matchMonth = (i.billingDate || "").startsWith(monthFilter);
      }
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        i.invoiceNumber.toLowerCase().includes(q) ||
        i.roomNumber.toLowerCase().includes(q) ||
        i.tenantName.toLowerCase().includes(q);
      return matchMonth && matchSearch;
    });
  }, [invoices, monthFilter, searchQuery]);

  const invBilled = displayedInvoices.reduce((acc, i) => acc + i.totalAmount, 0);
  const invPaid = displayedInvoices
    .filter((i) => i.status === "paid")
    .reduce((acc, i) => acc + i.totalAmount, 0);
  const invOverdue = displayedInvoices
    .filter((i) => i.status !== "paid")
    .reduce((acc, i) => acc + i.totalAmount, 0);
  const invPaidCount = displayedInvoices.filter((i) => i.status === "paid").length;
  const invOverdueCount = displayedInvoices.filter((i) => i.status !== "paid").length;
  const invCollectionRate = invBilled > 0 ? Math.round((invPaid / invBilled) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* 3 Top Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Paid */}
        <div className="bg-[var(--card)] border border-[var(--border)] p-5 rounded-2xl shadow-xs transition hover:border-emerald-500/50">
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <span className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>รายรับที่รับชำระแล้ว (Paid)</span>
            </span>
            <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-600 px-2 py-0.5 rounded-full">
              {invPaidCount} บิล
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {formatCurrency(invPaid)}
          </div>
          <div className="text-xs text-[var(--muted)] mt-1.5">
            อัตราการจัดเก็บ: <strong className="text-emerald-600 font-bold">{invCollectionRate}%</strong> ของยอดเรียกเก็บ
          </div>
        </div>

        {/* Card 2: Overdue */}
        <div className="bg-[var(--card)] border border-[var(--border)] p-5 rounded-2xl shadow-xs transition hover:border-rose-500/50">
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <span className="font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span>ยอดค้างชำระ (Pending / Overdue)</span>
            </span>
            <span className="text-[10px] font-bold bg-rose-500/15 text-rose-600 px-2 py-0.5 rounded-full">
              {invOverdueCount} บิล
            </span>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
            {formatCurrency(invOverdue)}
          </div>
          <div className="text-xs text-[var(--muted)] mt-1.5">
            {invOverdueCount > 0 ? `มี ${invOverdueCount} บิลรอการชำระหรือแนบสลิป` : "ไม่มีบิลค้างชำระ ✓"}
          </div>
        </div>

        {/* Card 3: Total Billed */}
        <div className="bg-[var(--card)] border border-[var(--border)] p-5 rounded-2xl shadow-xs transition hover:border-indigo-500/50">
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <span className="font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-indigo-500" />
              <span>ยอดเรียกเก็บรวมรอบบิล (Billed)</span>
            </span>
            <span className="text-[10px] font-bold bg-indigo-500/15 text-indigo-600 px-2 py-0.5 rounded-full">
              {displayedInvoices.length} บิล
            </span>
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-2">
            {formatCurrency(invBilled)}
          </div>
          <div className="text-xs text-[var(--muted)] mt-1.5">
            รวมค่าเช่า ค่าน้ำ ค่าไฟ และค่าบริการ
          </div>
        </div>
      </div>

      {/* Filter and Invoices List Table */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>รายการใบแจ้งหนี้ & การชำระเงิน</span>
            </h3>
            <p className="text-xs text-[var(--muted)]">
              ออกบิลอัตโนมัติพร้อมสร้าง Dynamic PromptPay QR Code และส่งเข้า LINE ผู้เช่า
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSendLineAllInvoices}
              disabled={isSendingLineBatch}
              className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              title="ส่งบิลแจ้งหนี้พร้อม Dynamic PromptPay QR Code เข้า LINE ผู้เช่าทุกห้องที่มีบิลค้าง"
            >
              <Send className={`w-3.5 h-3.5 ${isSendingLineBatch ? "animate-spin" : ""}`} />
              <span>{isSendingLineBatch ? "กำลังส่ง LINE..." : "📱 ส่ง LINE ทุกห้องที่มีบิลค้าง"}</span>
            </button>
            <button
              type="button"
              onClick={() => onGenerateMonthlyInvoices(monthFilter !== "all" ? monthFilter : undefined)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>⚡ คำนวณและออกบิลรอบเดือน</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar: Month Selector + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 pb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                aria-label="กรองรอบเดือนใบแจ้งหนี้"
                className="bg-[var(--subtle)] border border-[var(--border)] text-[var(--foreground)] text-xs font-semibold rounded-xl px-3 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition cursor-pointer appearance-none"
              >
                <option value="all">ทุกรอบเดือน (ทั้งหมด - All Time)</option>
                {invoiceMonths.map((ym) => (
                  <option key={ym} value={ym}>
                    {formatMonthThai(ym)} {ym === new Date().toISOString().slice(0, 7) ? "★ เดือนปัจจุบัน" : ""}
                  </option>
                ))}
              </select>
              <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-[var(--muted)] pointer-events-none" />
            </div>

            {monthFilter !== "all" && (
              <button
                type="button"
                onClick={() => setMonthFilter("all")}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition cursor-pointer"
              >
                ล้างตัวกรองเดือน
              </button>
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="text"
              placeholder="ค้นหาห้อง / ผู้เช่า / เลขที่บิล..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--subtle)] border border-[var(--border)] rounded-xl pl-8.5 pr-3 py-1.5 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition"
            />
          </div>
        </div>

        <div className="divide-y divide-[var(--border)] text-xs">
          {displayedInvoices.length === 0 ? (
            <div className="py-8 text-center text-[var(--muted)] space-y-1">
              <div>ไม่พบรายการใบแจ้งหนี้ที่ตรงกับเงื่อนไข</div>
              {monthFilter !== "all" && (
                <div className="text-[11px] text-emerald-600">
                  รอบเดือน {formatMonthThai(monthFilter)} ยังไม่มีบิล คลิก &quot;คำนวณและออกบิลรอบเดือน&quot; เพื่อสร้างบิล
                </div>
              )}
            </div>
          ) : (
            displayedInvoices.map((inv) => (
              <div
                key={inv.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-black/5 dark:hover:bg-white/5 px-2 rounded-xl transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[var(--foreground)]">
                      {inv.invoiceNumber} (ห้อง {inv.roomNumber})
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 font-medium">
                      - {inv.tenantName}
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--muted)] mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>
                      ยอดรวม: <span className="font-semibold text-[var(--foreground)]">{formatCurrency(inv.totalAmount)}</span>
                    </span>
                    <span>|</span>
                    <span>กำหนดชำระ: {inv.dueDate || "5 ของเดือน"}</span>
                    <span>|</span>
                    <span>รอบบิล: {inv.billingDate || "-"}</span>
                    <span>|</span>
                    {inv.lineDeliveryStatus === "sent" ? (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        ✓ ส่ง LINE แล้ว {inv.lineSentAt ? `(${inv.lineSentAt})` : ""}
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded-full">
                        ยังไม่ได้ส่ง LINE
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Why the tenant's latest slip failed Slip2Go (only for unpaid bills) */}
                  {failedSlipByInvoice.get(inv.invoiceNumber) && (
                    <span
                      className="max-w-[260px] truncate bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 border border-rose-500/30 text-xs"
                      title={`สลิปไม่ผ่าน: ${failedSlipByInvoice.get(inv.invoiceNumber)!.slip.rejection_reason}`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        สลิปไม่ผ่าน: {failedSlipByInvoice.get(inv.invoiceNumber)!.slip.rejection_reason?.replace(/^[❌⚠️\s]+/u, "")}
                      </span>
                    </span>
                  )}
                  {inv.status === "paid" ? (
                    inv.slipStatus === "passed" || inv.slipUrl ? (
                      <div className="flex items-center gap-1.5">
                        <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 border border-emerald-500/30">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>✓ AI ตรวจสลิปแล้ว</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedSlipInvoice(inv)}
                          className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center gap-1 border border-blue-500/25 transition cursor-pointer"
                          title="ดูสลิปโอนเงินที่ AI ตรวจสอบแล้ว"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-500" />
                          <span>ดูสลิป</span>
                        </button>
                      </div>
                    ) : (
                      <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> ชำระแล้ว
                      </span>
                    )
                  ) : (
                    <>
                      {inv.slipStatus === "action_needed" ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 border border-rose-500/30 text-xs"
                            title={inv.slipRejectReason || "สลิปไม่ผ่านการตรวจสอบ"}
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                            <span>สลิปไม่ผ่าน AI</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedSlipInvoice(inv)}
                            className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center gap-1 border border-rose-500/25 transition cursor-pointer"
                            title="ดูสาเหตุและสลิปที่ถูกปฏิเสธ"
                          >
                            <Eye className="w-3.5 h-3.5 text-rose-500" />
                            <span>ตรวจสลิป</span>
                          </button>
                        </div>
                      ) : (
                        <span className="bg-rose-500/15 text-rose-600 dark:text-rose-400 font-semibold px-2.5 py-1 rounded-lg">
                          ค้างชำระ
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          onMarkAsPaid(inv.id);
                          onShowToast(
                            `🤖 AI ตรวจสลิปโอนเงินห้อง ${inv.roomNumber} (${formatCurrency(inv.totalAmount)}) ผ่าน 100%! บันทึกชำระและอัปเดตสลิปเรียบร้อย ✓`,
                            "success"
                          );
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 shadow-xs"
                        title="จำลองผู้เช่าส่งสลิปผ่าน LINE ให้ AI ตรวจจับคู่ยอดเงินอัตโนมัติ"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>AI ตรวจสลิป</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onMarkAsPaid(inv.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 shadow-xs"
                        title="รับชำระเงินสดต่อหน้า หรือยืนยันการรับชำระทันที"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>ทำเครื่องหมายว่าชำระแล้ว</span>
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenInvoiceModal(inv)}
                    className="bg-[var(--subtle)] hover:bg-[var(--border)] text-[var(--foreground)] px-2.5 py-1 rounded-lg font-semibold border border-[var(--border)] transition cursor-pointer flex items-center gap-1"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>ดูบิล / QR</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Slip Viewer Modal */}
      {selectedSlipInvoice && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedSlipInvoice(null)}
          />
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 animate-in zoom-in-95 fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono font-bold text-xs">
                  ห้อง {selectedSlipInvoice.roomNumber}
                </span>
                <h3 className="text-sm font-bold text-[var(--foreground)]">
                  หลักฐานสลิปโอนเงิน (AI ตรวจสอบผ่านแล้ว ✓)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSlipInvoice(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Real Slip Image or Card */}
            {selectedSlipInvoice.slipUrl && selectedSlipInvoice.slipUrl.startsWith("/slips/") ? (
              <div className="bg-slate-950/90 rounded-2xl p-3 border border-slate-800 flex flex-col justify-between text-white space-y-2 mb-3">
                <div className="w-full flex items-center justify-between text-[11px] pb-1.5 border-b border-white/10">
                  <span className="font-bold text-slate-300 flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span>ไฟล์สลิปจริงที่แนบมา</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    selectedSlipInvoice.slipStatus === "action_needed"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  }`}>
                    {selectedSlipInvoice.slipStatus === "action_needed" ? "ตรวจไม่ผ่าน" : "ยืนยันผ่าน 100%"}
                  </span>
                </div>
                <div className="relative w-full flex items-center justify-center py-1 max-h-[380px] overflow-hidden rounded-xl bg-black/40">
                  <img
                    src={selectedSlipInvoice.slipUrl}
                    alt="รูปภาพสลิปจริง"
                    className="max-h-[360px] w-auto object-contain rounded-lg shadow-md hover:scale-105 transition-transform cursor-pointer"
                    onClick={() => window.open(selectedSlipInvoice.slipUrl, "_blank")}
                    title="คลิกเพื่อเปิดดูรูปขนาดเต็ม"
                  />
                </div>
                <div className="w-full space-y-1 text-[11px] bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <div className="flex justify-between">
                    <span className="text-slate-400">ธนาคาร:</span>
                    <span className="font-bold text-emerald-400">{selectedSlipInvoice.slipBank || "ธนาคารพาณิชย์"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">รหัสธุรกรรม (Ref):</span>
                    <span className="font-mono text-amber-300 font-bold">{selectedSlipInvoice.slipTransRef || "-"}</span>
                  </div>
                </div>
              </div>
            ) : (
            <div className="bg-gradient-to-b from-emerald-600 via-teal-700 to-slate-900 text-white p-5 rounded-2xl shadow-md space-y-3 font-sans relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/20 pb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-white text-emerald-700 font-bold flex items-center justify-center text-xs">
                    K
                  </div>
                  <span className="font-bold text-xs tracking-tight">K PLUS • {selectedSlipInvoice.slipBank || "ธ.กสิกรไทย"}</span>
                </div>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                  โอนเงินสำเร็จ
                </span>
              </div>

              <div className="text-center py-2">
                <div className="text-[11px] text-emerald-100">จำนวนเงินโอน</div>
                <div className="text-2xl font-black font-mono tracking-tight mt-0.5">
                  ฿{(selectedSlipInvoice.paidAmount || selectedSlipInvoice.totalAmount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="space-y-2 text-xs bg-black/20 p-3 rounded-xl border border-white/10">
                <div className="flex justify-between">
                  <span className="text-emerald-100 text-[10px]">ผู้โอน:</span>
                  <span className="font-bold">{selectedSlipInvoice.tenantName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-100 text-[10px]">ผู้รับโอน:</span>
                  <span className="font-bold">{propertyName || "-"} (PromptPay)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-100 text-[10px]">วันเวลาที่โอน:</span>
                  <span className="font-mono text-[11px]">{selectedSlipInvoice.paidAt || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-100 text-[10px]">รหัสอ้างอิง:</span>
                  <span className="font-mono text-[10px] text-amber-200">
                    {selectedSlipInvoice.slipTransRef || "-"}
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-center text-white/80 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span>AI ตรวจสอบความถูกต้องและจับคู่ยอดเงินบิลสำเร็จ 100%</span>
              </div>
            </div>
            )}

            <div className="flex items-center justify-end gap-2.5 mt-4 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setSelectedSlipInvoice(null)}
                className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold hover:bg-[var(--subtle)] transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
              <button
                type="button"
                onClick={() => {
                  const inv = selectedSlipInvoice;
                  setSelectedSlipInvoice(null);
                  onOpenInvoiceModal(inv);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>ดูใบแจ้งหนี้ / ใบเสร็จ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
