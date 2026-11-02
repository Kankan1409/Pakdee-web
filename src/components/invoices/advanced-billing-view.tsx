"use client";

import React, { useState } from "react";
import { Invoice, Room, Tenant } from "@/types/dormitory";
import {
  Receipt,
  Plus,
  Send,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Eye,
  Printer,
  ChevronDown,
  Sparkles,
  QrCode,
  DollarSign,
  UserCheck,
} from "lucide-react";
import { formatCurrency, formatDateThai } from "@/lib/utils";
import { globalPopup } from "@/lib/popup-context";

interface AdvancedBillingViewProps {
  invoices: Invoice[];
  rooms: Room[];
  onOpenInvoiceModal: (invoice: Invoice) => void;
  onSendLineAll: () => void;
  onCreateInvoice: (inv: Omit<Invoice, "id" | "invoiceNumber">) => void;
  onVerifySlip: (invoiceId: string, status: "paid" | "unpaid") => void;
}

export function AdvancedBillingView({
  invoices,
  rooms,
  onOpenInvoiceModal,
  onSendLineAll,
  onCreateInvoice,
  onVerifySlip,
}: AdvancedBillingViewProps) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [slipModalOpen, setSlipModalOpen] = useState<boolean>(false);
  const [selectedSlip, setSelectedSlip] = useState<Invoice | null>(null);

  // New Invoice Modals
  const [modalMode, setModalMode] = useState<"monthly" | "move_in" | "custom" | null>(null);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>(rooms[0]?.roomNumber || "101");
  const [customTitle, setCustomTitle] = useState<string>("ค่าล้างเครื่องปรับอากาศ");
  const [customAmount, setCustomAmount] = useState<number>(500);
  const [depositAmount, setDepositAmount] = useState<number>(8000);
  const [advanceAmount, setAdvanceAmount] = useState<number>(4000);

  // Status Counts
  const unpaidCount = invoices.filter((i) => i.status === "unpaid").length;
  const paidCount = invoices.filter((i) => i.status === "paid").length;
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;
  const pendingReviewCount = invoices.filter((i) => i.status === "pending_review").length;

  const totalAmount = invoices.reduce((acc, i) => acc + i.totalAmount, 0);
  const unpaidAmount = invoices
    .filter((i) => i.status === "unpaid" || i.status === "overdue")
    .reduce((acc, i) => acc + i.totalAmount, 0);
  const paidAmount = invoices
    .filter((i) => i.status === "paid")
    .reduce((acc, i) => acc + i.totalAmount, 0);

  const filtered = invoices.filter((inv) => {
    if (activeTab === "unpaid" && inv.status !== "unpaid" && inv.status !== "partial") return false;
    if (activeTab === "paid" && inv.status !== "paid") return false;
    if (activeTab === "overdue" && inv.status !== "overdue") return false;
    if (activeTab === "pending_review" && inv.status !== "pending_review") return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        inv.roomNumber.toLowerCase().includes(q) ||
        inv.tenantName.toLowerCase().includes(q) ||
        inv.invoiceNumber.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const targetRoom = rooms.find((r) => r.roomNumber === selectedRoomNumber);
    onCreateInvoice({
      roomNumber: selectedRoomNumber,
      tenantName: targetRoom?.currentTenant?.fullName || `ผู้เช่าห้อง ${selectedRoomNumber}`,
      tenantPhone: targetRoom?.currentTenant?.phone || "0812345678",
      billingDate: new Date().toISOString().slice(0, 10),
      dueDate: "2026-11-05",
      items: [{ name: customTitle, amount: customAmount, units: 1, rate: customAmount }],
      totalAmount: customAmount,
      status: "unpaid",
      invoiceType: "custom",
    });
    setModalMode(null);
  };

  const handleCreateMoveIn = (e: React.FormEvent) => {
    e.preventDefault();
    const targetRoom = rooms.find((r) => r.roomNumber === selectedRoomNumber);
    onCreateInvoice({
      roomNumber: selectedRoomNumber,
      tenantName: targetRoom?.currentTenant?.fullName || `ผู้เช่าใหม่ห้อง ${selectedRoomNumber}`,
      tenantPhone: targetRoom?.currentTenant?.phone || "0812345678",
      billingDate: new Date().toISOString().slice(0, 10),
      dueDate: "2026-11-05",
      items: [
        { name: "เงินประกันความเสียหาย (Deposit)", amount: depositAmount, units: 1, rate: depositAmount },
        { name: "ค่าเช่าห้องพักล่วงหน้าเดือนแรก", amount: advanceAmount, units: 1, rate: advanceAmount },
        { name: "ค่าคีย์การ์ดและกุญแจห้อง", amount: 300, units: 1, rate: 300 },
      ],
      totalAmount: depositAmount + advanceAmount + 300,
      status: "unpaid",
      invoiceType: "move_in",
    });
    setModalMode(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--foreground)] tracking-tight">
              บิล & ใบแจ้งหนี้ (Billing & Invoices)
            </h1>
            <p className="text-xs text-[var(--muted)]">
              บิลรอบเดือน ตุลาคม 2569 (ครบกำหนดชำระ 5 พฤศจิกายน 2569)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Slip History Button */}
          <button
            onClick={() => setSlipModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 font-medium text-xs border border-blue-500/30 hover:bg-blue-500/25 transition cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>ประวัติสลิป (AI Verify)</span>
          </button>

          {/* Send Line to All */}
          <button
            onClick={onSendLineAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-green-500/15 text-green-700 dark:text-green-400 font-medium text-xs border border-green-500/30 hover:bg-green-500/25 transition cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>ส่ง LINE ทุกห้อง</span>
          </button>

          {/* 3-Mode Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ออกบิล</span>
              <ChevronDown className="w-3 h-3 ml-1" />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-2xl p-2 z-40 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    globalPopup.info("ออกบิลสำเร็จ", "ระบบได้คำนวณมิเตอร์และสร้างบิลรายเดือนให้ครบทุกห้องเรียบร้อยแล้ว!");
                  }}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-[var(--subtle)] transition cursor-pointer"
                >
                  <div className="text-xs font-bold text-[var(--foreground)]">บิลรายเดือน</div>
                  <div className="text-[10px] text-[var(--muted)]">ทุกห้อง · รอบเดือนนี้</div>
                </button>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setModalMode("move_in");
                  }}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-[var(--subtle)] transition cursor-pointer"
                >
                  <div className="text-xs font-bold text-[var(--foreground)]">บิลแรกเข้า</div>
                  <div className="text-[10px] text-[var(--muted)]">ผู้เช่าใหม่ · ทีละห้อง</div>
                </button>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setModalMode("custom");
                  }}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-[var(--subtle)] transition cursor-pointer"
                >
                  <div className="text-xs font-bold text-[var(--foreground)]">บิลกำหนดเอง</div>
                  <div className="text-[10px] text-[var(--muted)]">ค่าซ่อม · ค่าปรับ · อื่นๆ</div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab("all")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === "all"
              ? "bg-slate-100 dark:bg-slate-800 border-slate-400 ring-2 ring-emerald-500/30"
              : "bg-[var(--card)] border-[var(--border)]"
          }`}
        >
          <div className="text-xs text-[var(--muted)]">ยอดบิลทั้งหมด</div>
          <div className="text-2xl font-bold text-[var(--foreground)] mt-1">
            {formatCurrency(totalAmount)}
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1">{invoices.length} รายการ</div>
        </div>

        <div
          onClick={() => setActiveTab("unpaid")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === "unpaid"
              ? "bg-amber-500/10 border-amber-400 ring-2 ring-amber-500/30"
              : "bg-[var(--card)] border-[var(--border)]"
          }`}
        >
          <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> รอชำระ
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {formatCurrency(unpaidAmount)}
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1">{unpaidCount} ห้องค้างจ่าย</div>
        </div>

        <div
          onClick={() => setActiveTab("paid")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === "paid"
              ? "bg-emerald-500/10 border-emerald-400 ring-2 ring-emerald-500/30"
              : "bg-[var(--card)] border-[var(--border)]"
          }`}
        >
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> ชำระแล้ว
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(paidAmount)}
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1">{paidCount} ห้องจ่ายครบ</div>
        </div>

        <div
          onClick={() => setActiveTab("overdue")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === "overdue"
              ? "bg-rose-500/10 border-rose-400 ring-2 ring-rose-500/30"
              : "bg-[var(--card)] border-[var(--border)]"
          }`}
        >
          <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> เกินกำหนดชำระ
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {overdueCount} ห้อง
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1">คิดค่าปรับรายวัน</div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--card)] p-3 rounded-2xl border border-[var(--border)]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="ค้นหาห้อง, เลขที่บิล, ชื่อผู้เช่า..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs pb-1 sm:pb-0">
          {[
            { id: "all", label: "ทั้งหมด" },
            { id: "unpaid", label: "รอชำระ" },
            { id: "paid", label: "ชำระแล้ว" },
            { id: "overdue", label: "เกินกำหนด" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer ${
                activeTab === tab.id
                  ? "bg-emerald-600 text-white font-semibold shadow-sm"
                  : "bg-[var(--subtle)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[var(--subtle)] border-b border-[var(--border)] text-[var(--muted)] uppercase font-semibold">
                <th className="p-3.5">ห้อง</th>
                <th className="p-3.5">เลขที่บิล & ประเภท</th>
                <th className="p-3.5">ผู้เช่า</th>
                <th className="p-3.5">วันตัดบิล / ครบกำหนด</th>
                <th className="p-3.5 text-right">ยอดรวม (บาท)</th>
                <th className="p-3.5 text-center">สถานะ</th>
                <th className="p-3.5 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--foreground)]">
              {filtered.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                  <td className="p-3.5">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-bold text-xs">
                      {inv.roomNumber}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {inv.invoiceNumber}
                    </div>
                    <div className="text-[10px] text-[var(--muted)]">
                      {inv.invoiceType === "move_in"
                        ? "บิลแรกเข้า"
                        : inv.invoiceType === "custom"
                        ? "บิลกำหนดเอง"
                        : "บิลประจำเดือน"}
                    </div>
                  </td>
                  <td className="p-3.5">
                    <div className="font-semibold">{inv.tenantName}</div>
                    <div className="text-[11px] text-[var(--muted)]">{inv.tenantPhone}</div>
                  </td>
                  <td className="p-3.5 text-[var(--muted)]">
                    <div>ตัดบิล: {formatDateThai(inv.billingDate)}</div>
                    <div>ครบกำหนด: {formatDateThai(inv.dueDate)}</div>
                  </td>
                  <td className="p-3.5 text-right font-bold text-sm">
                    {formatCurrency(inv.totalAmount)}
                  </td>
                  <td className="p-3.5 text-center">
                    {inv.status === "paid" && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                        ✓ ชำระแล้ว
                      </span>
                    )}
                    {inv.status === "unpaid" && (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
                        รอชำระ
                      </span>
                    )}
                    {inv.status === "overdue" && (
                      <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold border border-rose-500/20">
                        ⚠️ เกินกำหนด
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onOpenInvoiceModal(inv)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition cursor-pointer flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>เปิดบิล / สลิป</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Invoice Modal */}
      {modalMode === "custom" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] w-full max-w-md shadow-2xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-[var(--foreground)]">สร้างบิลกำหนดเอง (ค่าซ่อม / ค่าปรับ)</h3>
            <form onSubmit={handleCreateCustom} className="space-y-3 text-xs">
              <div>
                <label className="block text-[var(--muted)] mb-1">ห้องที่เรียกเก็บ *</label>
                <select
                  value={selectedRoomNumber}
                  onChange={(e) => setSelectedRoomNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] font-bold"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.roomNumber}>
                      ห้อง {r.roomNumber} ({r.currentTenant ? r.currentTenant.fullName : "ห้องว่าง"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[var(--muted)] mb-1">รายการที่เรียกเก็บ *</label>
                <input
                  type="text"
                  required
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)]"
                />
              </div>

              <div>
                <label className="block text-[var(--muted)] mb-1">จำนวนเงิน (บาท) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={customAmount}
                  onChange={(e) => setCustomAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] font-bold text-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setModalMode(null)} className="px-4 py-2 text-[var(--muted)]">
                  ยกเลิก
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold">
                  สร้างบิล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move-in Invoice Modal */}
      {modalMode === "move_in" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] w-full max-w-md shadow-2xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-[var(--foreground)]">สร้างบิลแรกเข้า (ผู้เช่าใหม่)</h3>
            <form onSubmit={handleCreateMoveIn} className="space-y-3 text-xs">
              <div>
                <label className="block text-[var(--muted)] mb-1">ห้องพัก *</label>
                <select
                  value={selectedRoomNumber}
                  onChange={(e) => setSelectedRoomNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] font-bold"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.roomNumber}>
                      ห้อง {r.roomNumber} ({r.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[var(--muted)] mb-1">เงินมัดจำประกันความเสียหาย *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] font-bold"
                />
              </div>

              <div>
                <label className="block text-[var(--muted)] mb-1">ค่าเช่าล่วงหน้าเดือนแรก *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] font-bold"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-right">
                ยอดรวมแรกเข้า: ฿{(depositAmount + advanceAmount + 300).toLocaleString()}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setModalMode(null)} className="px-4 py-2 text-[var(--muted)]">
                  ยกเลิก
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold">
                  สร้างบิลแรกเข้า
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slip History / AI Verification Modal */}
      {slipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] w-full max-w-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-sm text-[var(--foreground)]">
                  ประวัติสลิปโอนเงินและการตรวจสอบด้วย AI
                </h3>
              </div>
              <button onClick={() => setSlipModalOpen(false)} className="text-[var(--muted)] text-xs font-bold">
                ✕ ปิด
              </button>
            </div>

            <div className="space-y-3">
              {invoices.filter((i) => i.status === "paid").length === 0 ? (
                <div className="text-center py-8 text-[var(--muted)] text-xs">ยังไม่มีสลิปที่แนบเข้ามา</div>
              ) : (
                invoices
                  .filter((i) => i.status === "paid")
                  .map((inv) => (
                    <div
                      key={inv.id}
                      className="p-4 rounded-xl bg-[var(--subtle)] border border-[var(--border)] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold">
                          ✓
                        </div>
                        <div>
                          <div className="font-bold text-[var(--foreground)]">
                            ห้อง {inv.roomNumber} - {inv.tenantName}
                          </div>
                          <div className="text-[11px] text-[var(--muted)]">
                            สแกน QR PromptPay ยอด ฿{inv.totalAmount.toLocaleString()} เมื่อ {inv.paidAt || "ล่าสุด"}
                          </div>
                        </div>
                      </div>

                      <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                        AI Verification: Passed 100%
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
