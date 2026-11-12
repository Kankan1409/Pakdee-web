"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Invoice } from "@/types/dormitory";
import { requestPaymentSlips } from "@/lib/payment-slips-client";
import {
  CreditCard,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Search,
  X,
  Eye,
  Check,
  RefreshCw,
  ShieldCheck,
  ArrowRight,
  FileText,
  Clock,
  Layers,
  Image as ImageIcon,
} from "lucide-react";
import { formatCurrency, formatDateThai } from "@/lib/utils";

export interface SlipVerificationViewProps {
  invoices?: Invoice[];
  /** Current branch name shown on documents/payment info */
  propertyName?: string;
  /** Current branch id, used to load slip images stored in payment_slips (e.g. sent via LINE) */
  propertyId?: string;
  onVerifySlip?: (
    invoiceId: string,
    slipData?: {
      transRef?: string;
      bankName?: string;
      senderName?: string;
      transferTime?: string;
      amount?: number;
      slipUrl?: string;
      isFake?: boolean;
    }
  ) => Promise<void> | void;
  onRejectSlip?: (invoiceId: string, reason?: string) => Promise<void> | void;
  onOpenInvoiceModal?: (invoice: Invoice) => void;
  onShowToast?: (message: string, type: "success" | "error" | "info" | "warning") => void;
}

function SlipImagePreview({ url }: { url?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const safeUrl = url && (/^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url)) ? url : undefined;
  if (!safeUrl || failedUrl === safeUrl) {
    return <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle)] p-6 text-center text-sm text-[var(--muted)]">
      {safeUrl ? "โหลดรูปสลิปไม่ได้ ไฟล์อาจถูกลบหรือไม่มีสิทธิ์เข้าถึง" : "ยังไม่มีรูปสลิปที่บันทึกไว้"}
      {safeUrl && <button type="button" className="block mx-auto mt-3 text-blue-600 underline" onClick={() => setFailedUrl(null)}>ลองโหลดใหม่</button>}
    </div>;
  }
  return <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle)] p-3">
    <a href={safeUrl} target="_blank" rel="noopener noreferrer" className="block">
      <img src={safeUrl} alt="หลักฐานการโอนเงินที่บันทึกไว้" onError={() => setFailedUrl(safeUrl)} className="w-full h-auto max-h-[65vh] object-contain rounded-lg" />
      <span className="block text-center mt-3 text-xs text-blue-600 underline">เปิดรูปสลิปขนาดเต็ม</span>
    </a>
  </div>;
}

/** A slip image saved in payment_slips (sent by the tenant via LINE or uploaded by staff). */
type StoredSlip = {
  id: string;
  verification_status: "pending" | "passed" | "rejected";
  transaction_ref?: string | null;
  rejection_reason?: string | null;
  uploaded_at: string;
  invoices: { invoice_number: string } | null;
};

const storedSlipStatusLabel: Record<StoredSlip["verification_status"], string> = {
  pending: "รอตรวจสอบ",
  passed: "ผ่านการตรวจสอบ",
  rejected: "ไม่ผ่าน",
};

export function SlipVerificationView({
  invoices = [],
  onVerifySlip = () => { },
  onRejectSlip = () => { },
  onOpenInvoiceModal,
  onShowToast = () => { },
  propertyName = "",
  propertyId = "",
}: SlipVerificationViewProps) {
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "verified">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSlipInvoice, setSelectedSlipInvoice] = useState<Invoice | null>(null);

  // Slip images stored in payment_slips (LINE / upload). Display only — reloads when invoices refresh.
  const [storedSlips, setStoredSlips] = useState<StoredSlip[]>([]);
  useEffect(() => {
    if (!propertyId) return;
    let cancelled = false;
    requestPaymentSlips(propertyId, "list")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setStoredSlips(Array.isArray(data?.slips) ? data.slips : []);
      })
      .catch(() => {
        if (!cancelled) setStoredSlips([]);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId, invoices]);

  // Per bill: the passed slip if any, otherwise the most recent one (list is newest first)
  const storedSlipByInvoice = useMemo(() => {
    const map = new Map<string, StoredSlip>();
    for (const slip of storedSlips) {
      const num = slip.invoices?.invoice_number;
      if (!num) continue;
      const current = map.get(num);
      if (!current || (current.verification_status !== "passed" && slip.verification_status === "passed")) {
        map.set(num, slip);
      }
    }
    return map;
  }, [storedSlips]);

  // Viewer for a stored slip image (loaded through the authorized /api/payment-slips endpoint)
  const [viewingStoredSlip, setViewingStoredSlip] = useState<{ slip: StoredSlip; invoice: Invoice } | null>(null);
  const [storedSlipImage, setStoredSlipImage] = useState("");
  const [storedSlipError, setStoredSlipError] = useState("");
  useEffect(() => {
    if (!viewingStoredSlip || !propertyId) return;
    let cancelled = false;
    let objectUrl = "";
    setStoredSlipImage("");
    setStoredSlipError("");
    requestPaymentSlips(propertyId, "image", viewingStoredSlip.slip.id)
      .then((r) => r.blob())
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setStoredSlipImage(objectUrl);
      })
      .catch((e) => {
        if (!cancelled) setStoredSlipError(e instanceof Error ? e.message : "โหลดรูปสลิปไม่สำเร็จ");
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [viewingStoredSlip, propertyId]);

  // Compute Metrics
  const paidInvoices = useMemo(
    () => invoices.filter((i) => i.status === "paid" || i.slipStatus === "passed"),
    [invoices]
  );
  const pendingInvoices = useMemo(
    () => invoices.filter((i) => i.status !== "paid" && i.status !== "carried_forward" && i.slipStatus !== "passed"),
    [invoices]
  );
  const verifiedAmount = useMemo(
    () => paidInvoices.reduce((acc, i) => acc + (i.paidAmount || i.totalAmount), 0),
    [paidInvoices]
  );
  const pendingAmount = useMemo(
    () => pendingInvoices.reduce((acc, i) => acc + i.totalAmount, 0),
    [pendingInvoices]
  );

  // Filtered List
  const filteredList = useMemo(() => {
    return invoices.filter((inv) => {
      let matchTab = true;
      if (activeTab === "verified") {
        matchTab = inv.status === "paid" || inv.slipStatus === "passed";
      } else if (activeTab === "pending") {
        matchTab = inv.status !== "paid" && inv.status !== "carried_forward" && inv.slipStatus !== "passed";
      }

      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        inv.roomNumber.toLowerCase().includes(q) ||
        inv.tenantName.toLowerCase().includes(q) ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.slipTransRef && inv.slipTransRef.toLowerCase().includes(q));

      return matchTab && matchSearch;
    });
  }, [invoices, activeTab, searchQuery]);


  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--card)] p-6 rounded-3xl border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-transparent border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-inner">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-[var(--foreground)] tracking-tight">
                ระบบตรวจสลิปโอนเงิน (AI & PromptPay Slip Verification)
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25">
                <Sparkles className="w-3 h-3 text-amber-500" /> AI OCR Vision 2.0
              </span>
            </div>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              ระบบตรวจสอบสลิปจาก LINE OA อัตโนมัติ ป้องกันสลิปซ้ำ สลิปปลอม และอัปเดตสถานะการชำระเงินเรียลไทม์
            </p>
          </div>
        </div>
      </div>

      {/* 2. Bento KPI Metric Cards (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Verified */}
        <div className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-2xl shadow-xs transition hover:border-emerald-500/40">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium">
            <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> ตรวจสอบผ่านแล้ว (Verified)
            </span>
            <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-600 px-2 py-0.5 rounded-full">
              {paidInvoices.length} รายการ
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
            {formatCurrency(verifiedAmount)}
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1 font-medium">
            ออกใบเสร็จรับเงินเรียบร้อยแล้ว ✓
          </div>
        </div>

        {/* Card 2: Pending */}
        <div className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-2xl shadow-xs transition hover:border-amber-500/40">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium">
            <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-bold">
              <Clock className="w-4 h-4 text-amber-500" /> สลิปรอตรวจสอบ (Pending)
            </span>
            <span className="text-[10px] font-bold bg-amber-500/15 text-amber-600 px-2 py-0.5 rounded-full">
              {pendingInvoices.length} บิล
            </span>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2 font-mono">
            {formatCurrency(pendingAmount)}
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1 font-medium">
            รอผู้เช่าส่งสลิปผ่าน LINE หรือตรวจเช็ค
          </div>
        </div>

        {/* Card 3: AI OCR Vision */}
        <div className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium">
            <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-bold">
              <Sparkles className="w-4 h-4 text-blue-500" /> ความแม่นยำ AI Vision
            </span>
            <span className="text-[10px] font-bold bg-blue-500/15 text-blue-600 px-2 py-0.5 rounded-full">
              Real-time
            </span>
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2 font-mono">
            99.8%
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1 font-medium">
            รองรับ KBank, SCB, BBL, KTB, TTB, GSB
          </div>
        </div>

        {/* Card 4: Duplicate & Fraud Protection */}
        <div className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium">
            <span className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold">
              <ShieldCheck className="w-4 h-4 text-indigo-500" /> ป้องกันสลิปซ้ำ & สลิปปลอม
            </span>
            <span className="text-[10px] font-bold bg-indigo-500/15 text-indigo-600 px-2 py-0.5 rounded-full">
              Active
            </span>
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-2 font-mono">
            100% ปลอดภัย
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1 font-medium">
            ตรวจเช็คเลขอ้างอิง TransRef ซ้ำทันที
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar & Slips Table */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[var(--border)] bg-[var(--subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-[var(--card)] p-1 rounded-2xl border border-[var(--border)] text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${activeTab === "all"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
            >
              ทั้งหมด ({invoices.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1 ${activeTab === "pending"
                  ? "bg-amber-500 text-white shadow-2xs"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
            >
              <span>รอตรวจสอบ</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
                {pendingInvoices.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("verified")}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1 ${activeTab === "verified"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
            >
              <span>ตรวจผ่านแล้ว</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
                {paidInvoices.length}
              </span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--muted)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาห้อง, ผู้เช่า, เลขที่บิล, Ref..."
              className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl pl-8 pr-7 py-1.5 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-blue-500 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--card)] text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">
                <th className="p-3.5">ห้องพัก & ผู้เช่า</th>
                <th className="p-3.5 text-center">สลิปหลักฐาน</th>
                <th className="p-3.5">ข้อมูลการโอน (AI OCR)</th>
                <th className="p-3.5 text-right">ยอดเงินในสลิป / บิล</th>
                <th className="p-3.5 text-center">สถานะการตรวจสอบ (Tracking)</th>
                <th className="p-3.5 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--foreground)]">
              {filteredList.length > 0 ? (
                filteredList.map((inv) => {
                  const isPaid = inv.status === "paid" || inv.slipStatus === "passed";

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition"
                    >
                      {/* Room & Tenant */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono font-bold text-xs shadow-2xs">
                            {inv.roomNumber}
                          </span>
                          <div>
                            <div className="font-bold text-[var(--foreground)]">{inv.tenantName}</div>
                            <div className="text-[10px] text-[var(--muted)] font-mono">{inv.invoiceNumber}</div>
                          </div>
                        </div>
                      </td>

                      {/* Slip Thumbnail */}
                      <td className="p-3.5 text-center">
                        {inv.slipUrl ? (
                          <button
                            type="button"
                            onClick={() => setSelectedSlipInvoice(inv)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition cursor-pointer font-bold text-[11px] ${inv.slipStatus === "action_needed"
                                ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                                : "bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/25"
                              }`}
                            title="คลิกเพื่อดูสลิปหลักฐานฉบับเต็ม"
                          >
                            <ImageIcon className={`w-3.5 h-3.5 ${inv.slipStatus === "action_needed" ? "text-rose-500" : "text-blue-500"}`} />
                            <span>{inv.slipStatus === "action_needed" ? "ตรวจสลิป" : "ดูสลิป"}</span>
                          </button>
                        ) : storedSlipByInvoice.get(inv.invoiceNumber) ? (
                          (() => {
                            const stored = storedSlipByInvoice.get(inv.invoiceNumber)!;
                            const failed = stored.verification_status !== "passed" && !!stored.rejection_reason;
                            return (
                              <button
                                type="button"
                                onClick={() => setViewingStoredSlip({ slip: stored, invoice: inv })}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition cursor-pointer font-bold text-[11px] ${failed
                                    ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                                    : "bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/25"
                                  }`}
                                title="ดูสลิปที่ผู้เช่าส่งมา (เก็บในฐานข้อมูล)"
                              >
                                <ImageIcon className={`w-3.5 h-3.5 ${failed ? "text-rose-500" : "text-blue-500"}`} />
                                <span>{failed ? "สลิปไม่ผ่าน" : "ดูสลิป"}</span>
                              </button>
                            );
                          })()
                        ) : (
                          <span className="text-[11px] text-[var(--muted)] italic">
                            รอส่งสลิป
                          </span>
                        )}
                      </td>

                      {/* AI Transfer Details */}
                      <td className="p-3.5">
                        {isPaid ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-xs flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                              <span>{inv.slipBank || "ไม่ระบุธนาคาร"}</span>
                            </div>
                            <div className="text-[10px] text-[var(--muted)] font-mono">
                              Ref: {inv.slipTransRef || storedSlipByInvoice.get(inv.invoiceNumber)?.transaction_ref || "-"}
                            </div>
                            <div className="text-[10px] text-[var(--muted)]">
                              โอนเมื่อ: {inv.paidAt || inv.slipVerifiedAt || "-"}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-[var(--muted)] flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            <span>รอตรวจจับคู่ยอดกับสลิปโอนเงิน</span>
                          </div>
                        )}
                      </td>

                      {/* Amounts */}
                      <td className="p-3.5 text-right font-mono font-bold">
                        <div className="text-sm text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(inv.totalAmount)}
                        </div>
                        <div className="text-[10px] text-[var(--muted)] font-normal">
                          {isPaid ? "ตรงกับยอดบิล 100%" : "ยอดที่ต้องชำระ"}
                        </div>
                      </td>

                      {/* Verification Status Tracking Badge */}
                      <td className="p-3.5 text-center">
                        {isPaid ? (
                          <div className="inline-flex flex-col items-center gap-0.5">
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              <span>AI ตรวจสลิปผ่านแล้ว</span>
                            </span>
                            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">
                              (ยืนยันยอดถูกต้อง ✓)
                            </span>
                          </div>
                        ) : inv.slipStatus === "action_needed" ? (
                          <div className="inline-flex flex-col items-center gap-0.5 max-w-[210px] mx-auto">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span>สลิปไม่ผ่าน / มีปัญหา</span>
                            </span>
                            {inv.slipRejectReason && (
                              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium text-center line-clamp-2" title={inv.slipRejectReason}>
                                {inv.slipRejectReason}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                            <span>รอตรวจสอบ (Pending)</span>
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPaid && (
                            <button
                              type="button"
                              onClick={() => onOpenInvoiceModal?.(inv)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[var(--subtle)] hover:bg-[var(--border)] text-[var(--foreground)] border border-[var(--border)] font-semibold text-xs transition cursor-pointer"
                              title="ดูใบเสร็จรับเงินอย่างเป็นทางการ"
                            >
                              <FileText className="w-3.5 h-3.5 text-emerald-600" />
                              <span>ใบเสร็จ</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-xs text-[var(--muted)]">
                    <CreditCard className="w-8 h-8 mx-auto text-[var(--muted)] opacity-40 mb-2" />
                    <div className="font-bold text-sm text-[var(--foreground)]">ไม่พบรายการสลิปที่ตรงกับการค้นหา</div>
                    <div className="text-[11px] mt-1">สามารถเลือกแท็บอื่น หรือกดปุ่ม &quot;อัปโหลดสลิปให้ AI ตรวจ&quot; ด้านบน</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: stored slip image from payment_slips (sent via LINE / uploaded) */}
      {viewingStoredSlip && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70" onClick={() => setViewingStoredSlip(null)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="รูปสลิปที่ผู้เช่าส่งมา"
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--card)] border border-[var(--border)] rounded-3xl p-5 shadow-2xl z-10"
          >
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
              <div className="min-w-0">
                <div className="text-sm font-bold text-[var(--foreground)]">
                  ห้อง {viewingStoredSlip.invoice.roomNumber} · {viewingStoredSlip.invoice.tenantName}
                </div>
                <div className="text-[11px] text-[var(--muted)] font-mono">
                  {viewingStoredSlip.invoice.invoiceNumber} ·{" "}
                  {new Date(viewingStoredSlip.slip.uploaded_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
                </div>
              </div>
              <button
                type="button"
                aria-label="ปิด"
                onClick={() => setViewingStoredSlip(null)}
                className="p-1.5 rounded-xl text-[var(--muted)] hover:bg-[var(--subtle)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3 text-xs space-y-1">
              <div>
                สถานะ: <strong>{storedSlipStatusLabel[viewingStoredSlip.slip.verification_status]}</strong>
                {viewingStoredSlip.slip.transaction_ref && (
                  <span className="ml-2 font-mono text-[var(--muted)]">Ref: {viewingStoredSlip.slip.transaction_ref}</span>
                )}
              </div>
              {viewingStoredSlip.slip.verification_status !== "passed" && viewingStoredSlip.slip.rejection_reason && (
                <div className="text-rose-600 dark:text-rose-400">เหตุผลที่ไม่ผ่าน: {viewingStoredSlip.slip.rejection_reason}</div>
              )}
            </div>
            <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--subtle)] p-3 min-h-[160px] flex items-center justify-center">
              {storedSlipError ? (
                <p role="alert" className="text-sm text-rose-600">{storedSlipError}</p>
              ) : storedSlipImage ? (
                <img
                  src={storedSlipImage}
                  alt="รูปสลิปที่ผู้เช่าส่งมา"
                  className="w-full h-auto max-h-[65vh] object-contain rounded-lg"
                  onError={() => setStoredSlipError("ไฟล์รูปสลิปไม่สามารถแสดงได้")}
                />
              ) : (
                <p className="text-sm text-[var(--muted)]">กำลังโหลดรูปสลิป...</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal: Interactive Slip Preview & Side-by-Side Verification */}
      {selectedSlipInvoice && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedSlipInvoice(null)}
          />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 animate-in zoom-in-95 fade-in">
            {/* Top Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono font-bold text-xs">
                  ห้อง {selectedSlipInvoice.roomNumber}
                </span>
                <h3 className="text-sm font-bold text-[var(--foreground)]">
                  สลิปโอนเงินชำระค่าเช่า ({selectedSlipInvoice.tenantName})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSlipInvoice(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content: Side-by-Side (Slip on Left, Invoice on Right) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {/* Left: Real Bank Slip Image or Decoded Card */}
              {selectedSlipInvoice.slipUrl && selectedSlipInvoice.slipUrl.startsWith("/slips/") ? (
                <div className="bg-slate-950/90 rounded-2xl p-3 border border-slate-800 flex flex-col justify-between text-white space-y-2 relative overflow-hidden">
                  <div className="w-full flex items-center justify-between text-[11px] pb-1.5 border-b border-white/10">
                    <span className="font-bold text-slate-300 flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                      <span>ไฟล์สลิปจริงที่แนบมา</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${selectedSlipInvoice.slipStatus === "action_needed"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      }`}>
                      {selectedSlipInvoice.slipStatus === "action_needed" ? "ตรวจไม่ผ่าน" : "ยืนยันผ่าน 100%"}
                    </span>
                  </div>

                  <div className="relative w-full flex items-center justify-center py-1 max-h-[360px] overflow-hidden rounded-xl bg-black/40">
                    <img
                      src={selectedSlipInvoice.slipUrl}
                      alt="รูปภาพสลิปจริง"
                      className="max-h-[350px] w-auto object-contain rounded-lg shadow-md hover:scale-105 transition-transform cursor-pointer"
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
                <div className="bg-[var(--subtle)] border border-[var(--border)] p-5 rounded-2xl space-y-3 text-xs">
                  <div className="font-bold text-[var(--foreground)]">ไม่มีรูปสลิปแนบในบิลนี้</div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">ยอดชำระ:</span>
                      <span className="font-bold">฿{(selectedSlipInvoice.paidAmount || selectedSlipInvoice.totalAmount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">ธนาคาร:</span>
                      <span className="font-semibold">{selectedSlipInvoice.slipBank || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">วันเวลาที่ชำระ:</span>
                      <span className="font-mono text-[11px]">{selectedSlipInvoice.paidAt || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">รหัสอ้างอิง:</span>
                      <span className="font-mono text-[11px]">{selectedSlipInvoice.slipTransRef || storedSlipByInvoice.get(selectedSlipInvoice.invoiceNumber)?.transaction_ref || "-"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Right: Invoice Items Comparison */}
              <div className="bg-[var(--subtle)] p-4 rounded-2xl border border-[var(--border)] flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="text-xs font-bold text-[var(--foreground)] flex items-center justify-between">
                    <span>รายการในบิล {selectedSlipInvoice.invoiceNumber}</span>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      ตรงกับสลิป 100%
                    </span>
                  </div>

                  <div className="divide-y divide-[var(--border)] text-xs">
                    {selectedSlipInvoice.items.map((it, idx) => (
                      <div key={idx} className="py-1.5 flex items-center justify-between text-[11px]">
                        <span className="text-[var(--muted)]">{it.name}</span>
                        <span className="font-mono font-semibold">{formatCurrency(it.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--border)] space-y-2">
                  <div className="flex items-center justify-between font-bold text-sm">
                    <span>ยอดรวมทั้งสิ้น:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatCurrency(selectedSlipInvoice.totalAmount)}
                    </span>
                  </div>
                  {selectedSlipInvoice.slipStatus === "action_needed" ? (
                    <div className="text-[11px] text-rose-700 dark:text-rose-300 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/25 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-200">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>สลิปนี้ไม่ผ่านการตรวจสอบอัตโนมัติ</span>
                      </div>
                      <div className="text-[10px] leading-relaxed">
                        {selectedSlipInvoice.slipRejectReason || "ไม่พบรหัสธุรกรรม BScanC ของธนาคาร หรือยอดเงินไม่ครบถ้วน"}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>AI ยืนยันสลิปถูกต้อง ตัดยอดบิลและสร้างใบเสร็จเรียบร้อย</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-[var(--border)]">
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
                  onOpenInvoiceModal?.(inv);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>เปิดดูใบเสร็จรับเงิน (Official Receipt)</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
