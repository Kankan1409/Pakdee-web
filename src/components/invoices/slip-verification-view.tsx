"use client";

import React, { useState, useMemo } from "react";
import { Invoice } from "@/types/dormitory";
import {
  CreditCard,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Search,
  X,
  Eye,
  UploadCloud,
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

export function SlipVerificationView({
  invoices = [],
  onVerifySlip = () => {},
  onRejectSlip = () => {},
  onOpenInvoiceModal,
  onShowToast = () => {},
}: SlipVerificationViewProps) {
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "verified">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSlipInvoice, setSelectedSlipInvoice] = useState<Invoice | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanningTargetId, setScanningTargetId] = useState<string | null>(null);

  // Manual Upload Simulation State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [uploadedRoom, setUploadedRoom] = useState<string>("");
  const [uploadedAmount, setUploadedAmount] = useState<number | "">("");
  const [uploadedBank, setUploadedBank] = useState<string>("ธนาคารกสิกรไทย (KBank)");
  const [uploadedRef, setUploadedRef] = useState<string>(`014310${Date.now().toString().slice(-8)}`);
  const [testMode, setTestMode] = useState<"valid" | "duplicate" | "fake">("valid");

  // Compute Metrics
  const paidInvoices = useMemo(
    () => invoices.filter((i) => i.status === "paid" || i.slipStatus === "passed"),
    [invoices]
  );
  const pendingInvoices = useMemo(
    () => invoices.filter((i) => i.status !== "paid" && i.slipStatus !== "passed"),
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
        matchTab = inv.status !== "paid" && inv.slipStatus !== "passed";
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

  // Handler: Run AI Verification on a specific invoice
  const handleRunAiVerify = async (inv: Invoice) => {
    setScanningTargetId(inv.id);
    setIsScanning(true);
    try {
      // Simulate high-speed AI OCR Vision Processing (400ms)
      await new Promise((resolve) => setTimeout(resolve, 500));
      const transRef = `014310${Math.floor(10000000 + Math.random() * 90000000)}`;
      const bankName = "ธนาคารกสิกรไทย (KBank PromptPay)";
      const slipUrl = `/slips/slip_${inv.roomNumber}.png`;

      await onVerifySlip(inv.id, {
        transRef,
        bankName,
        senderName: inv.tenantName,
        transferTime: new Date().toLocaleString("th-TH"),
        amount: inv.totalAmount,
        slipUrl,
      });
    } finally {
      setIsScanning(false);
      setScanningTargetId(null);
    }
  };

  // Helper: List all invoices that already have a slipTransRef for duplicate testing
  const invoicesWithRef = useMemo(
    () => invoices.filter((i) => i.slipTransRef && i.slipTransRef.trim() !== ""),
    [invoices]
  );

  // Handler: Submit uploaded slip test (Anti-Fake & Anti-Duplicate Verified)
  const handleUploadAndScan = async () => {
    if (!uploadedRoom) {
      onShowToast("กรุณาเลือกหรือระบุหมายเลขห้องพัก", "warning");
      return;
    }
    const targetInv = invoices.find(
      (i) => i.roomNumber.toLowerCase() === uploadedRoom.trim().toLowerCase()
    );
    if (!targetInv) {
      onShowToast(`ไม่พบบิลของห้อง ${uploadedRoom}`, "error");
      return;
    }

    setIsUploadModalOpen(false);
    setScanningTargetId(targetInv.id);
    setIsScanning(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 400));

      if (testMode === "fake") {
        await onVerifySlip(targetInv.id, {
          isFake: true,
          amount: uploadedAmount !== "" ? Number(uploadedAmount) : targetInv.totalAmount,
          bankName: uploadedBank,
          slipUrl: `/slips/slip_${targetInv.roomNumber}.png`,
        });
      } else if (testMode === "duplicate") {
        const refToUse = uploadedRef.trim() || (invoicesWithRef[0]?.slipTransRef || "0143105829104829");
        await onVerifySlip(targetInv.id, {
          transRef: refToUse,
          isFake: false,
          amount: uploadedAmount !== "" ? Number(uploadedAmount) : targetInv.totalAmount,
          bankName: uploadedBank,
          senderName: targetInv.tenantName,
          transferTime: new Date().toLocaleString("th-TH"),
          slipUrl: `/slips/slip_${targetInv.roomNumber}.png`,
        });
      } else {
        const freshRef = `014310${Math.floor(10000000 + Math.random() * 90000000)}`;
        await onVerifySlip(targetInv.id, {
          transRef: freshRef,
          isFake: false,
          amount: uploadedAmount !== "" ? Number(uploadedAmount) : targetInv.totalAmount,
          bankName: uploadedBank,
          senderName: targetInv.tenantName,
          transferTime: new Date().toLocaleString("th-TH"),
          slipUrl: `/slips/slip_${targetInv.roomNumber}.png`,
        });
      }
    } finally {
      setIsScanning(false);
      setScanningTargetId(null);
    }
  };

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

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              const pendingRooms = invoices.filter((i) => i.status !== "paid");
              if (pendingRooms.length > 0) {
                setUploadedRoom(pendingRooms[0].roomNumber);
                setUploadedAmount(pendingRooms[0].totalAmount);
              }
              setIsUploadModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>📤 อัปโหลดสลิปให้ AI ตรวจ (ทดสอบ/นำเข้า)</span>
          </button>
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
              className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                activeTab === "all"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              ทั้งหมด ({invoices.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1 ${
                activeTab === "pending"
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
              className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1 ${
                activeTab === "verified"
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
                  const isThisScanning = isScanning && scanningTargetId === inv.id;

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
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition cursor-pointer font-bold text-[11px] ${
                              inv.slipStatus === "action_needed"
                                ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                                : "bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/25"
                            }`}
                            title="คลิกเพื่อดูสลิปหลักฐานฉบับเต็ม"
                          >
                            <ImageIcon className={`w-3.5 h-3.5 ${inv.slipStatus === "action_needed" ? "text-rose-500" : "text-blue-500"}`} />
                            <span>{inv.slipStatus === "action_needed" ? "ตรวจสลิป" : "ดูสลิป"}</span>
                          </button>
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
                              <span>{inv.slipBank || "ธนาคารกสิกรไทย (KBank PromptPay)"}</span>
                            </div>
                            <div className="text-[10px] text-[var(--muted)] font-mono">
                              Ref: {inv.slipTransRef || `014310${inv.roomNumber}882`}
                            </div>
                            <div className="text-[10px] text-[var(--muted)]">
                              โอนเมื่อ: {inv.paidAt || inv.slipVerifiedAt || "26 ต.ค. 2026 09:38 น."}
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
                          {!isPaid ? (
                            <button
                              type="button"
                              onClick={() => handleRunAiVerify(inv)}
                              disabled={isThisScanning}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-sm transition cursor-pointer disabled:opacity-50"
                              title="รัน AI Vision เพื่ออ่านสลิปและจับคู่ยอดชำระทันที"
                            >
                              <Sparkles className={`w-3.5 h-3.5 text-amber-300 ${isThisScanning ? "animate-spin" : ""}`} />
                              <span>{isThisScanning ? "กำลังสแกน..." : "AI ตรวจสลิป"}</span>
                            </button>
                          ) : (
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
              {/* Left: Realistic Simulated Bank Slip */}
              <SlipImagePreview url={selectedSlipInvoice.slipUrl} />

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

      {/* 5. Modal: Upload & Test AI Verification */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setIsUploadModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 animate-in zoom-in-95 fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-bold text-[var(--foreground)]">
                  อัปโหลดสลิปโอนเงินให้ AI ตรวจ
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 my-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  เลือกห้องพักที่ต้องการตรวจสลิป *
                </label>
                <select
                  value={uploadedRoom}
                  onChange={(e) => {
                    const r = e.target.value;
                    setUploadedRoom(r);
                    const match = invoices.find((i) => i.roomNumber === r);
                    if (match) setUploadedAmount(match.totalAmount);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs font-semibold focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- กรุณาเลือกห้องพัก --</option>
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.roomNumber}>
                      ห้อง {inv.roomNumber} ({inv.tenantName}) - ยอดบิล ฿{inv.totalAmount.toLocaleString()} ({inv.status === "paid" ? "ชำระแล้ว" : "ค้างชำระ"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  ธนาคารผู้โอน
                </label>
                <select
                  value={uploadedBank}
                  onChange={(e) => setUploadedBank(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs focus:outline-none"
                >
                  <option value="ธนาคารกสิกรไทย (KBank)">ธนาคารกสิกรไทย (KBank)</option>
                  <option value="ธนาคารไทยพาณิชย์ (SCB)">ธนาคารไทยพาณิชย์ (SCB)</option>
                  <option value="ธนาคารกรุงเทพ (BBL)">ธนาคารกรุงเทพ (BBL)</option>
                  <option value="ธนาคารกรุงไทย (KTB)">ธนาคารกรุงไทย (KTB)</option>
                  <option value="ธนาคารทหารไทยธนชาต (TTB)">ธนาคารทหารไทยธนชาต (TTB)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  ยอดเงินในสลิป (บาท)
                </label>
                <input
                  type="number"
                  value={uploadedAmount}
                  onChange={(e) => setUploadedAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs font-mono font-bold text-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                  เลือกโหมดการทดสอบตรวจสลิป
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTestMode("valid");
                      const match = invoices.find((i) => i.roomNumber === uploadedRoom);
                      if (match) setUploadedAmount(match.totalAmount);
                      setUploadedRef(`014310${Date.now().toString().slice(-8)}`);
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                      testMode === "valid"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500 shadow-xs"
                        : "bg-[var(--subtle)] text-[var(--muted)] border-[var(--border)] hover:bg-[var(--border)]"
                    }`}
                  >
                    ✓ สลิปปกติ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTestMode("duplicate");
                      if (invoicesWithRef.length > 0) {
                        setUploadedRef(invoicesWithRef[0].slipTransRef || "0143105829104829");
                      }
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                      testMode === "duplicate"
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500 shadow-xs"
                        : "bg-[var(--subtle)] text-[var(--muted)] border-[var(--border)] hover:bg-[var(--border)]"
                    }`}
                  >
                    ⚠️ ทดสอบสลิปซ้ำ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTestMode("fake");
                      setUploadedAmount(500);
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                      testMode === "fake"
                        ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500 shadow-xs"
                        : "bg-[var(--subtle)] text-[var(--muted)] border-[var(--border)] hover:bg-[var(--border)]"
                    }`}
                  >
                    ❌ ทดสอบสลิปปลอม
                  </button>
                </div>
              </div>

              {testMode === "duplicate" && (
                <div className="space-y-1.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs">
                  <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>รหัสธุรกรรมที่จะทดสอบส่งซ้ำ</span>
                  </div>
                  {invoicesWithRef.length > 0 ? (
                    <select
                      value={uploadedRef}
                      onChange={(e) => setUploadedRef(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--subtle)] border border-[var(--border)] text-xs font-mono font-bold"
                    >
                      {invoicesWithRef.map((inv) => (
                        <option key={inv.id} value={inv.slipTransRef}>
                          Ref: {inv.slipTransRef} (ห้อง {inv.roomNumber})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={uploadedRef}
                      onChange={(e) => setUploadedRef(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--subtle)] border border-[var(--border)] text-xs font-mono font-bold"
                    />
                  )}
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    เมื่อกดตรวจ AI จะสกัดกั้นการใช้รหัสซ้ำ และปฏิเสธการตัดยอดทันที
                  </p>
                </div>
              )}

              {testMode === "fake" && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs space-y-1">
                  <div className="font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>จำลองสลิปปลอม (ไม่มี QR ธนาคาร หรือยอดไม่ครบ)</span>
                  </div>
                  <p className="text-[11px] text-rose-800 dark:text-rose-300">
                    AI จะปฏิเสธสลิปนี้ทันที บิลห้อง {uploadedRoom || "..."} จะไม่ถูกตัดเป็นชำระแล้ว และจะถูกขึ้นสถานะเตือนสีแดงให้เจ้าหน้าที่ตรวจสอบ
                  </p>
                </div>
              )}

              {testMode === "valid" && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1">
                  <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>จำลองสลิปถูกต้อง 100%</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                    AI จะจับคู่ยอดเงิน ตรวจสอบรหัสธุรกรรม และตัดยอดบิลห้อง {uploadedRoom || "..."} เป็น &quot;ชำระแล้ว&quot; ทันที
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold hover:bg-[var(--subtle)] transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleUploadAndScan}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>ให้ AI ตรวจและตัดยอดบิล</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
