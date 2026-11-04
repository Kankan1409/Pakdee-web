"use client";

import React, { useState, useRef, useEffect } from "react";
import { ContractItem, Room } from "@/types/dormitory";
import {
  FileSignature,
  Plus,
  Search,
  Printer,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  DollarSign,
  ShieldCheck,
  Download,
  PenTool,
  RotateCcw,
  Check,
  FileCheck,
} from "lucide-react";
import { formatCurrency, formatDateThai } from "@/lib/utils";
import { isDateAfter, isValidThaiPhone, formatThaiPhone } from "@/lib/validators";
import { numberToThaiBahtText, STANDARD_14_CLAUSES } from "@/components/contracts/contract-print-view";

interface ContractManagementViewProps {
  contracts: ContractItem[];
  rooms: Room[];
  onAddContract: (contract: Omit<ContractItem, "id" | "createdAt" | "contractNumber">) => void;
  onUpdateSignature?: (contractId: string, signatureUrl: string) => void;
  onOpenNewTenantRegistration?: () => void;
}

export function ContractManagementView({
  contracts,
  rooms,
  onAddContract,
  onUpdateSignature,
  onOpenNewTenantRegistration,
}: ContractManagementViewProps) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [previewContract, setPreviewContract] = useState<ContractItem | null>(null);

  // E-Signature Pad State
  const [signingContract, setSigningContract] = useState<ContractItem | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasSignatureDrawn, setHasSignatureDrawn] = useState<boolean>(false);

  // New Contract Form
  const [roomNumber, setRoomNumber] = useState<string>(rooms[0]?.roomNumber || "101");
  const [tenantName, setTenantName] = useState<string>(rooms[0]?.currentTenant?.fullName || "");
  const [tenantPhone, setTenantPhone] = useState<string>(rooms[0]?.currentTenant?.phone || "");
  const [startDate, setStartDate] = useState<string>("2026-11-01");
  const [endDate, setEndDate] = useState<string>("2027-10-31");
  const [monthlyRent, setMonthlyRent] = useState<number>(rooms[0]?.monthlyRate || 4000);
  const [depositAmount, setDepositAmount] = useState<number>(8000);
  const [advanceRent, setAdvanceRent] = useState<number>(4000);
  const [status, setStatus] = useState<ContractItem["status"]>("active");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRoomChange = (rNum: string) => {
    setRoomNumber(rNum);
    const targetRoom = rooms.find((r) => r.roomNumber === rNum);
    if (targetRoom) {
      setMonthlyRent(targetRoom.monthlyRate);
      setDepositAmount(targetRoom.monthlyRate * 2);
      setAdvanceRent(targetRoom.monthlyRate);
      if (targetRoom.currentTenant) {
        setTenantName(targetRoom.currentTenant.fullName);
        setTenantPhone(targetRoom.currentTenant.phone);
      } else {
        setTenantName("");
        setTenantPhone("");
      }
    }
  };

  const activeCount = contracts.filter((c) => c.status === "active").length;
  const pendingCount = contracts.filter((c) => c.status === "pending_signature").length;
  const draftCount = contracts.filter((c) => c.status === "draft").length;
  const expiredCount = contracts.filter((c) => c.status === "expired").length;

  const filtered = contracts.filter((c) => {
    if (activeTab === "active" && c.status !== "active") return false;
    if (activeTab === "pending" && c.status !== "pending_signature") return false;
    if (activeTab === "draft" && c.status !== "draft") return false;
    if (activeTab === "expired" && c.status !== "expired") return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.roomNumber.toLowerCase().includes(q) ||
        c.tenantName.toLowerCase().includes(q) ||
        c.contractNumber.toLowerCase().includes(q) ||
        (c.tenantPhone && c.tenantPhone.includes(q))
      );
    }
    return true;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!tenantName.trim()) {
      setErrorMessage("กรุณาระบุชื่อ-นามสกุลของผู้เช่า");
      return;
    }
    if (tenantPhone.trim()) {
      const cleanPhone = tenantPhone.replace(/\D/g, "");
      if (!isValidThaiPhone(cleanPhone)) {
        setErrorMessage("เบอร์โทรศัพท์ไม่ถูกต้อง (ต้องเป็น 10 หลัก ขึ้นต้นด้วย 0)");
        return;
      }
    }
    if (!isDateAfter(endDate, startDate)) {
      setErrorMessage("วันสิ้นสุดสัญญาต้องอยู่หลังวันเริ่มต้นสัญญา");
      return;
    }
    if (monthlyRent < 0) {
      setErrorMessage("ค่าเช่ารายเดือนต้องไม่ติดลบ");
      return;
    }
    if (depositAmount < 0) {
      setErrorMessage("เงินประกันมัดจำต้องไม่ติดลบ");
      return;
    }

    onAddContract({
      roomNumber,
      tenantName: tenantName.trim(),
      tenantPhone: tenantPhone.trim(),
      startDate,
      endDate,
      monthlyRent,
      depositAmount,
      advanceRent,
      status,
    });
    setIsModalOpen(false);
  };

  // Canvas Signature Methods
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    setHasSignatureDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignatureDrawn(false);
  };

  const handleSaveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !signingContract) return;
    const signatureUrl = canvas.toDataURL("image/png");
    if (onUpdateSignature) {
      onUpdateSignature(signingContract.id, signatureUrl);
    }
    if (previewContract && previewContract.id === signingContract.id) {
      setPreviewContract({ ...previewContract, signatureUrl, status: "active" });
    }
    setSigningContract(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold">
            <FileSignature className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--foreground)] tracking-tight">
              เอกสารสัญญาเช่า (Lease Contracts)
            </h1>
            <p className="text-xs text-[var(--muted)]">
              จัดการสัญญาเช่าหอพัก บันทึกเงินมัดจำประกัน และติดตามวันสิ้นสุดสัญญา
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/contracts/print"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold transition cursor-pointer text-sm"
          >
            <Printer className="w-4 h-4 text-emerald-600" />
            <span>ตัวอย่างเอกสารสัญญา (A4)</span>
          </a>

          <button
            onClick={() => {
              if (onOpenNewTenantRegistration) {
                onOpenNewTenantRegistration();
              } else {
                setIsModalOpen(true);
              }
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium shadow-md shadow-purple-500/20 transition cursor-pointer text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>สร้างเอกสารสัญญาใหม่</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab("all")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === "all"
              ? "bg-slate-100 dark:bg-slate-800 border-slate-400 ring-2 ring-purple-500/30"
              : "bg-[var(--card)] border-[var(--border)]"
          }`}
        >
          <div className="text-xs text-[var(--muted)]">สัญญาทั้งหมด</div>
          <div className="text-2xl font-bold text-[var(--foreground)] mt-1">{contracts.length}</div>
          <div className="text-[11px] text-[var(--muted)] mt-1">สัญญาในระบบ</div>
        </div>

        <div
          onClick={() => setActiveTab("active")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === "active"
              ? "bg-emerald-500/10 border-emerald-400 ring-2 ring-emerald-500/30"
              : "bg-[var(--card)] border-[var(--border)]"
          }`}
        >
          <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> ใช้งานอยู่
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</div>
          <div className="text-[11px] text-[var(--muted)] mt-1">ผู้เช่ากำลังพักอาศัย</div>
        </div>

        <div
          onClick={() => setActiveTab("pending")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === "pending"
              ? "bg-amber-500/10 border-amber-400 ring-2 ring-amber-500/30"
              : "bg-[var(--card)] border-[var(--border)]"
          }`}
        >
          <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
            <Clock className="w-3.5 h-3.5" /> รอลงนาม
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{pendingCount}</div>
          <div className="text-[11px] text-[var(--muted)] mt-1">รอผู้เช่าเซ็นสัญญา</div>
        </div>

        <div
          onClick={() => setActiveTab("expired")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === "expired"
              ? "bg-rose-500/10 border-rose-400 ring-2 ring-rose-500/30"
              : "bg-[var(--card)] border-[var(--border)]"
          }`}
        >
          <div className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5" /> สัญญาหมดอายุ
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{expiredCount}</div>
          <div className="text-[11px] text-[var(--muted)] mt-1">ต้องต่อสัญญาใหม่</div>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[var(--subtle)] border-b border-[var(--border)] text-[var(--muted)] uppercase font-semibold">
                <th className="p-3.5">เลขที่สัญญา</th>
                <th className="p-3.5">ห้อง</th>
                <th className="p-3.5">ชื่อผู้เช่า & เบอร์โทร</th>
                <th className="p-3.5">ระยะเวลาสัญญา</th>
                <th className="p-3.5 text-right">ค่าเช่า/เดือน</th>
                <th className="p-3.5 text-right">เงินประกัน</th>
                <th className="p-3.5 text-center">สถานะ</th>
                <th className="p-3.5 text-right">เอกสาร</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--foreground)]">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                  <td className="p-3.5 font-mono font-semibold text-purple-600 dark:text-purple-400">
                    {c.contractNumber}
                  </td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-bold text-xs">
                      {c.roomNumber}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="font-semibold">{c.tenantName}</div>
                    <div className="text-[11px] text-[var(--muted)]">{c.tenantPhone}</div>
                  </td>
                  <td className="p-3.5 text-[var(--muted)]">
                    <div>เริ่ม: {formatDateThai(c.startDate)}</div>
                    <div>ถึง: {formatDateThai(c.endDate)}</div>
                  </td>
                  <td className="p-3.5 text-right font-semibold">
                    {formatCurrency(c.monthlyRent)}
                  </td>
                  <td className="p-3.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                    {formatCurrency(c.depositAmount)}
                  </td>
                  <td className="p-3.5 text-center">
                    {c.status === "active" && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                        ใช้งานอยู่
                      </span>
                    )}
                    {c.status === "pending_signature" && (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
                        รอลงนาม
                      </span>
                    )}
                    {c.status === "draft" && (
                      <span className="px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 font-semibold border border-slate-500/20">
                        ร่าง
                      </span>
                    )}
                    {c.status === "expired" && (
                      <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold border border-rose-500/20">
                        หมดอายุ
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {c.signatureUrl ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] border border-emerald-500/20"
                          title="ลงนามสัญญาเรียบร้อยแล้ว"
                        >
                          <Check className="w-3 h-3" /> เซ็นแล้ว
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setSigningContract(c);
                            setHasSignatureDrawn(false);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 font-semibold text-[11px] border border-purple-200 dark:border-purple-800 transition cursor-pointer"
                          title="ลงลายเซ็นอิเล็กทรอนิกส์ (E-Signature)"
                        >
                          <PenTool className="w-3 h-3 text-purple-600" />
                          <span>ลงลายเซ็น</span>
                        </button>
                      )}
                      <button
                        onClick={() => setPreviewContract(c)}
                        className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition cursor-pointer"
                        title="ดูตัวอย่างสัญญา"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setPreviewContract(c);
                          setTimeout(() => window.print(), 300);
                        }}
                        className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--subtle)] transition cursor-pointer"
                        title="พิมพ์สัญญา"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Contract Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--subtle)]">
              <div className="flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-sm text-[var(--foreground)]">สร้างเอกสารสัญญาเช่าใหม่</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--muted)] hover:text-[var(--foreground)] text-xs p-1"
              >
                ✕ ปิด
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                    ห้องพัก *
                  </label>
                  <select
                    value={roomNumber}
                    onChange={(e) => handleRoomChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                  >
                    {rooms.filter((r) => r.status === "vacant" && !r.currentTenant).length === 0 ? (
                      <option value="" disabled>-- ไม่มีห้องว่างสำหรับทำสัญญา (ทุกห้องมีผู้เช่าหรือรอทำความสะอาด) --</option>
                    ) : (
                      rooms
                        .filter((r) => r.status === "vacant" && !r.currentTenant)
                        .map((r) => (
                          <option key={r.id} value={r.roomNumber}>
                            ห้อง {r.roomNumber} ({r.type}) — [ห้องว่าง ✨]
                          </option>
                        ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                    สถานะสัญญา *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ContractItem["status"])}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                  >
                    <option value="active">ใช้งานอยู่ (Active)</option>
                    <option value="pending_signature">รอลงนาม (Pending)</option>
                    <option value="draft">ฉบับร่าง (Draft)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                    ชื่อผู้เช่า *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    placeholder="ชื่อ-นามสกุล ผู้เช่า"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                    เบอร์โทรศัพท์ *
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    required
                    maxLength={12}
                    value={tenantPhone}
                    onChange={(e) => setTenantPhone(formatThaiPhone(e.target.value))}
                    placeholder="08X-XXX-XXXX"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                    วันเริ่มสัญญา
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                    วันสิ้นสุดสัญญา
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                    ค่าเช่ารายเดือน
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                    เงินประกัน (Deposit)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                    ค่าเช่าล่วงหน้า
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={advanceRent}
                    onChange={(e) => setAdvanceRent(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                  />
                </div>
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/20"
                >
                  บันทึกสัญญาเช่า
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contract Preview Modal */}
      {previewContract && (() => {
        const matchedRoom = rooms.find((r) => r.roomNumber === previewContract.roomNumber);
        const roomFloor = matchedRoom?.floor || 1;
        const roomType = matchedRoom?.type || "ห้องแอร์";
        const tenantInfo = matchedRoom?.currentTenant;

        const startThai = formatDateThai(previewContract.startDate);
        const endThai = previewContract.isContinuous
          ? "ไม่มีกำหนด (สัญญาเช่าต่อเนื่อง)"
          : formatDateThai(previewContract.endDate);
        const rentVal = Number(previewContract.monthlyRent) || 0;
        const depositVal = Number(previewContract.depositAmount) || 0;
        const dueDay = previewContract.paymentDueDay || 5;
        const lateFee = previewContract.lateFeePerDay ?? 100;
        const refundDays = previewContract.depositRefundDays || 7;
        const noticeDays = previewContract.noticeDays || 30;
        const graceDays = previewContract.overdueGraceDays || 7;

        const petSmokeRules: string[] = [];
        petSmokeRules.push(
          previewContract.allowPets
            ? "อนุญาตให้เลี้ยงสัตว์ได้ตามข้อตกลง"
            : "ห้ามนำสัตว์เลี้ยงทุกชนิดเข้ามาเลี้ยงในอาคาร"
        );
        if (previewContract.noSmoking !== false) {
          petSmokeRules.push("ห้ามสูบบุหรี่ภายในห้องพักและตัวอาคารโดยเด็ดขาด");
        }

        // แทนค่าตัวแปร [หมายเลขห้อง], [ชั้น], [ค่าเช่า] ฯลฯ ในข้อสัญญาทั้ง 14 ข้ออัตโนมัติ
        const rawClauses =
          previewContract.clauses && previewContract.clauses.length > 0
            ? previewContract.clauses
            : STANDARD_14_CLAUSES;

        const resolvedClauses = rawClauses.map((cl) => ({
          ...cl,
          resolvedContent: cl.content
            .replace(/\[หมายเลขห้อง\]/g, previewContract.roomNumber)
            .replace(/\[ชั้น\]/g, String(roomFloor))
            .replace(/\[ประเภทห้อง\]/g, roomType)
            .replace(/\[ที่อยู่หอพัก\]/g, "หอพัก พักดี แมนชั่น")
            .replace(/\[วันเริ่มสัญญา\]/g, startThai)
            .replace(/\[วันสิ้นสุดสัญญา\]/g, endThai)
            .replace(/\[ค่าเช่า\]/g, rentVal.toLocaleString("th-TH"))
            .replace(/\[ค่าเช่าตัวอักษร\]/g, numberToThaiBahtText(rentVal))
            .replace(/\[วันกำหนดชำระ\]/g, String(dueDay))
            .replace(/\[ค่าปรับ\]/g, lateFee.toLocaleString("th-TH"))
            .replace(/\[จำนวนวันค้างชำระที่อนุญาต\]/g, String(graceDays))
            .replace(/\[เงินประกัน\]/g, depositVal.toLocaleString("th-TH"))
            .replace(/\[เงินประกันตัวอักษร\]/g, numberToThaiBahtText(depositVal))
            .replace(/\[จำนวนวันคืนเงินประกัน\]/g, String(refundDays))
            .replace(/\[จำนวนวันแจ้งล่วงหน้า\]/g, String(noticeDays))
            .replace(/\[ค่าน้ำ\]/g, "18")
            .replace(/\[ค่าไฟ\]/g, "8")
            .replace(/\[เงื่อนไขสัตว์เลี้ยงและบุหรี่\]/g, petSmokeRules.join(" และ")),
        }));

        // สร้างรายการในตารางค่าใช้จ่าย เฉพาะรายการที่เปิดใช้งานเท่านั้น (หากไม่เช่าทีวี/ตู้เย็น/บริการเสริม จะไม่แสดงในเอกสาร)
        const tableRows: {
          id: string;
          title: string;
          detail: string;
          paymentType: string;
          isMonthly: boolean;
          amount: number;
        }[] = [
          {
            id: "rent",
            title: `ค่าเช่าห้องพักรายเดือน (ห้อง ${previewContract.roomNumber} ชั้น ${roomFloor} - ${roomType})`,
            detail: `ชำระภายในวันที่ ${dueDay} ของทุกเดือน`,
            paymentType: "รายเดือน (ล่วงหน้า 1 เดือน)",
            isMonthly: true,
            amount: rentVal,
          },
        ];

        if (depositVal > 0) {
          tableRows.push({
            id: "deposit",
            title: "เงินประกันมัดจำความเสียหาย (Security Deposit)",
            detail: `คืนภายใน ${refundDays} วันหลังสิ้นสุดสัญญาและย้ายออก`,
            paymentType: "ชำระแรกเข้าวันทำสัญญา",
            isMonthly: false,
            amount: depositVal,
          });
        }

        if (previewContract.hasTv && Number(previewContract.tvRentalFee) > 0) {
          tableRows.push({
            id: "tv",
            title: "ค่าบริการเช่าทีวี (Smart TV Rental)",
            detail: "บริการเสริมรายเดือน",
            paymentType: "บริการเสริมรายเดือน",
            isMonthly: true,
            amount: Number(previewContract.tvRentalFee),
          });
        }

        if (previewContract.hasFridge && Number(previewContract.fridgeRentalFee) > 0) {
          tableRows.push({
            id: "fridge",
            title: "ค่าบริการเช่าตู้เย็น (Refrigerator Rental)",
            detail: "บริการเสริมรายเดือน",
            paymentType: "บริการเสริมรายเดือน",
            isMonthly: true,
            amount: Number(previewContract.fridgeRentalFee),
          });
        }

        if (Number(previewContract.electricalEquipmentFee) > 0) {
          tableRows.push({
            id: "elec-equip",
            title: "ค่าอุปกรณ์ไฟฟ้า",
            detail: "ชำระวันทำสัญญา",
            paymentType: "ชำระแรกเข้าวันทำสัญญา",
            isMonthly: false,
            amount: Number(previewContract.electricalEquipmentFee),
          });
        }

        if (Number(previewContract.furnitureFee) > 0) {
          tableRows.push({
            id: "furniture",
            title: "ค่าครุภัณฑ์และเฟอร์นิเจอร์",
            detail: "ชำระวันทำสัญญา",
            paymentType: "ชำระแรกเข้าวันทำสัญญา",
            isMonthly: false,
            amount: Number(previewContract.furnitureFee),
          });
        }

        if (previewContract.additionalFees && previewContract.additionalFees.length > 0) {
          previewContract.additionalFees
            .filter((f) => f.isEnabled && Number(f.amount) > 0)
            .forEach((f) => {
              tableRows.push({
                id: f.id,
                title: f.name || "ค่าบริการเพิ่มเติม",
                detail: "บริการเสริมรายเดือน",
                paymentType: "บริการเสริมรายเดือน",
                isMonthly: true,
                amount: Number(f.amount),
              });
            });
        } else {
          if (previewContract.hasCommonFee && Number(previewContract.commonFee) > 0) {
            tableRows.push({
              id: "common-fee",
              title: "ค่าบริการส่วนกลาง",
              detail: "บริการเสริมรายเดือน",
              paymentType: "บริการเสริมรายเดือน",
              isMonthly: true,
              amount: Number(previewContract.commonFee),
            });
          }
          if (previewContract.hasWifi && Number(previewContract.wifiFee) > 0) {
            tableRows.push({
              id: "wifi-fee",
              title: "ค่าอินเทอร์เน็ต WiFi",
              detail: "บริการเสริมรายเดือน",
              paymentType: "บริการเสริมรายเดือน",
              isMonthly: true,
              amount: Number(previewContract.wifiFee),
            });
          }
          if (previewContract.hasParking && Number(previewContract.parkingFee) > 0) {
            tableRows.push({
              id: "parking-fee",
              title: "ค่าที่จอดรถ",
              detail: "บริการเสริมรายเดือน",
              paymentType: "บริการเสริมรายเดือน",
              isMonthly: true,
              amount: Number(previewContract.parkingFee),
            });
          }
        }

        const totalUpfrontAmount = tableRows.reduce((sum, r) => sum + r.amount, 0);
        const totalMonthlyAmount = tableRows
          .filter((r) => r.isMonthly)
          .reduce((sum, r) => sum + r.amount, 0);

        const createdDateObj = new Date(previewContract.createdAt || previewContract.startDate || new Date());
        const thaiDay = String(createdDateObj.getDate());
        const thaiMonth = createdDateObj.toLocaleDateString("th-TH", { month: "long" });
        const thaiYear = String(createdDateObj.getFullYear() + 543);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:p-0 print:bg-white">
            <div className="bg-white text-black rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden p-6 sm:p-10 space-y-5 max-h-[92vh] flex flex-col print:max-h-none print:shadow-none print:rounded-none print:p-0">
              {/* Top Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0 print:hidden">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    สัญญาเช่าห้องพักอาศัย (Residential Lease Agreement)
                  </h2>
                  <div className="text-xs text-slate-500">
                    เลขที่สัญญา: <span className="font-mono font-semibold text-purple-700">{previewContract.contractNumber}</span>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewContract(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Printable Document Content (ตามรูปแบบ ตัวอย่างสัญญาเช่า.pdf + ตารางสรุปยอดชำระ) */}
              <div className="space-y-4 text-[13px] leading-[1.8] overflow-y-auto pr-1 flex-1 text-black">
                {/* ชื่อเรื่องสัญญา */}
                <div className="text-center space-y-0.5">
                  <h1 className="text-xl font-bold text-black">สัญญาเช่าห้องพักอาศัย</h1>
                  <div className="text-xs text-slate-600">
                    เลขที่สัญญา <span className="font-semibold text-black">{previewContract.contractNumber}</span> • ห้องพักเลขที่{" "}
                    <span className="font-semibold text-black">{previewContract.roomNumber}</span> (ชั้น {roomFloor} - {roomType})
                  </div>
                </div>

                {/* ทำที่ / วันที่ เดือน พ.ศ. */}
                <div className="flex justify-end">
                  <div className="w-full sm:w-[60%] space-y-1 text-xs sm:text-[13px]">
                    <div className="flex items-baseline gap-1.5">
                      <span className="shrink-0">ทำที่</span>
                      <span className="flex-1 border-b border-dotted border-slate-500 px-2 font-semibold text-black">
                        หอพัก พักดี แมนชั่น
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="shrink-0">วันที่</span>
                      <span className="w-12 text-center border-b border-dotted border-slate-500 font-semibold text-black">
                        {thaiDay}
                      </span>
                      <span className="shrink-0">เดือน</span>
                      <span className="flex-1 text-center border-b border-dotted border-slate-500 font-semibold text-black">
                        {thaiMonth}
                      </span>
                      <span className="shrink-0">พ.ศ.</span>
                      <span className="w-16 text-center border-b border-dotted border-slate-500 font-semibold text-black">
                        {thaiYear}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ข้อมูลคู่สัญญา */}
                <div className="space-y-1.5 text-justify">
                  <p className="indent-8">
                    สัญญาเช่าฉบับนี้ทำขึ้นระหว่าง{" "}
                    <span className="border-b border-dotted border-slate-500 px-2 font-bold">
                      หอพัก พักดี แมนชั่น
                    </span>{" "}
                    ซึ่งต่อไปในสัญญานี้จะเรียกว่า <strong>&ldquo;ผู้ให้เช่า&rdquo;</strong> ฝ่ายหนึ่ง กับ{" "}
                    <span className="border-b border-dotted border-slate-500 px-2 font-bold">
                      {previewContract.tenantName}
                    </span>{" "}
                    โทรศัพท์{" "}
                    <span className="border-b border-dotted border-slate-500 px-2 font-semibold">
                      {previewContract.tenantPhone || "-"}
                    </span>
                    {tenantInfo?.idCard ? (
                      <>
                        {" "}
                        เลขประจำตัวประชาชน{" "}
                        <span className="border-b border-dotted border-slate-500 px-2 font-semibold">
                          {tenantInfo.idCard}
                        </span>
                      </>
                    ) : null}
                    {tenantInfo?.address ? (
                      <>
                        {" "}
                        อยู่บ้านเลขที่{" "}
                        <span className="border-b border-dotted border-slate-500 px-2 font-semibold">
                          {tenantInfo.address}
                        </span>
                      </>
                    ) : null}{" "}
                    ซึ่งต่อไปในสัญญานี้จะเรียกว่า <strong>&ldquo;ผู้เช่า&rdquo;</strong> อีกฝ่ายหนึ่ง
                    ทั้งสองฝ่ายได้ตกลงทำสัญญาเช่ากันมีข้อความดังนี้:
                  </p>
                </div>

                {/* ข้อกำหนดและเงื่อนไขสัญญา (14 ข้อ ที่แทนค่าตัวแปรจริงครบถ้วน) */}
                <div className="space-y-1.5 text-justify">
                  {resolvedClauses.map((cl, idx) => (
                    <p key={cl.id || idx} className="indent-8 leading-[1.75]">
                      <strong>
                        ข้อ {idx + 1}. ({cl.title})
                      </strong>{" "}
                      {cl.resolvedContent}
                    </p>
                  ))}

                  {previewContract.additionalRules && previewContract.additionalRules.length > 0 && (
                    <p className="indent-8 leading-[1.75]">
                      <strong>กฎระเบียบเพิ่มเติมแนบท้ายสัญญา:</strong>{" "}
                      {previewContract.additionalRules.map((rule, rIdx) => `(${rIdx + 1}) ${rule}`).join(" ")}
                    </p>
                  )}
                </div>

                {/* ตารางสรุปรายการค่าใช้จ่ายที่ต้องชำระ (แสดงเฉพาะรายการที่เปิดใช้งาน) */}
                <div className="pt-2">
                  <div className="font-bold text-black text-xs sm:text-[13px] mb-1.5">
                    ตารางสรุปรายการค่าเช่า เงินประกัน และค่าบริการที่ต้องชำระตามสัญญา (ห้อง {previewContract.roomNumber})
                  </div>
                  <table className="w-full border-collapse border border-slate-800 text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-black font-bold">
                        <th className="border border-slate-800 py-1.5 px-2 text-center w-12">ลำดับ</th>
                        <th className="border border-slate-800 py-1.5 px-3 text-left">รายการค่าใช้จ่ายที่ต้องชำระ</th>
                        <th className="border border-slate-800 py-1.5 px-2.5 text-center w-40">ประเภทการชำระ</th>
                        <th className="border border-slate-800 py-1.5 px-3 text-right w-32">จำนวนเงิน (บาท)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((row, index) => (
                        <tr key={row.id}>
                          <td className="border border-slate-800 py-1.5 px-2 text-center font-medium">
                            {index + 1}
                          </td>
                          <td className="border border-slate-800 py-1.5 px-3">
                            <div className="font-semibold text-black">{row.title}</div>
                            <div className="text-[11px] text-slate-600">{row.detail}</div>
                          </td>
                          <td className="border border-slate-800 py-1.5 px-2.5 text-center text-slate-700">
                            {row.paymentType}
                          </td>
                          <td className="border border-slate-800 py-1.5 px-3 text-right font-bold text-black">
                            {row.amount.toLocaleString("th-TH", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold text-black">
                        <td className="border border-slate-800 py-2 px-3" colSpan={3}>
                          <div>รวมจำนวนเงินที่ต้องชำระทั้งสิ้น ณ วันทำสัญญา</div>
                          <div className="text-[11px] font-normal text-slate-700">
                            ตัวอักษร: <strong>({numberToThaiBahtText(totalUpfrontAmount)})</strong>
                          </div>
                        </td>
                        <td className="border border-slate-800 py-2 px-3 text-right text-sm font-black text-black">
                          {totalUpfrontAmount.toLocaleString("th-TH", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                      <tr className="bg-white text-[11px] text-slate-700">
                        <td className="border border-slate-800 py-1.5 px-3" colSpan={3}>
                          <strong>ยอดชำระรายเดือนรอบบิลถัดไป</strong> (ชำระภายในวันที่ {dueDay} ของทุกเดือน ไม่รวมค่าน้ำประปาและค่าไฟฟ้าตามมิเตอร์จริง)
                        </td>
                        <td className="border border-slate-800 py-1.5 px-3 text-right font-bold text-black">
                          {totalMonthlyAmount.toLocaleString("th-TH", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          / เดือน
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* ช่องลงลายมือชื่อ */}
                <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-center text-xs">
                  <div>
                    <div className="min-h-[64px] flex items-center justify-center border-b border-dashed border-slate-400 mb-2 pb-1">
                      <div className="text-[11px] text-slate-400 italic">ฝ่ายบริหารจัดการหอพัก</div>
                    </div>
                    <div>ลงชื่อ.................................................... ผู้ให้เช่า</div>
                    <div className="text-[11px] text-slate-600 mt-0.5">( หอพัก พักดี แมนชั่น )</div>
                  </div>
                  <div>
                    <div className="min-h-[64px] flex items-center justify-center border-b border-dashed border-slate-400 mb-2 pb-1">
                      {previewContract.signatureUrl ? (
                        <div className="flex flex-col items-center">
                          <img
                            src={previewContract.signatureUrl}
                            alt="ลายเซ็นผู้เช่า"
                            className="h-12 max-w-[180px] object-contain"
                          />
                          <span className="text-[9px] text-emerald-600 font-semibold mt-0.5">
                            ✓ ลายเซ็นอิเล็กทรอนิกส์ยืนยันแล้ว
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSigningContract(previewContract);
                            setHasSignatureDrawn(false);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 text-xs font-semibold transition cursor-pointer print:hidden"
                        >
                          <PenTool className="w-3.5 h-3.5" />
                          <span>คลิกเพื่อลงลายเซ็นออนไลน์</span>
                        </button>
                      )}
                    </div>
                    <div>ลงชื่อ.................................................... ผู้เช่า</div>
                    <div className="text-[11px] text-slate-800 font-semibold mt-0.5">
                      ( {previewContract.tenantName} )
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer Buttons (Hidden when printing) */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-200 shrink-0 print:hidden">
                <div>
                  {!previewContract.signatureUrl && (
                    <button
                      onClick={() => {
                        setSigningContract(previewContract);
                        setHasSignatureDrawn(false);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 font-semibold text-xs border border-purple-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <PenTool className="w-3.5 h-3.5" /> ลงลายเซ็นอิเล็กทรอนิกส์
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      try {
                        const draft = {
                          contractNumber: previewContract.contractNumber,
                          contractDate: previewContract.startDate,
                          roomNumber: previewContract.roomNumber,
                          floor: roomFloor,
                          roomType,
                          monthlyRate: rentVal,
                          fullName: previewContract.tenantName,
                          phone: previewContract.tenantPhone,
                          idCard: tenantInfo?.idCard || "1-1005-01234-56-7",
                          address: tenantInfo?.address || "",
                          startDate: previewContract.startDate,
                          endDate: previewContract.endDate,
                          isContinuous: Boolean(previewContract.isContinuous),
                          paymentDueDay: dueDay,
                          lateFeePerDay: lateFee,
                          electricalEquipmentFee: Number(previewContract.electricalEquipmentFee) || 0,
                          furnitureFee: Number(previewContract.furnitureFee) || 0,
                          hasDeposit: depositVal > 0,
                          depositAmount: depositVal,
                          hasTv: Boolean(previewContract.hasTv),
                          tvRentalFee: Number(previewContract.tvRentalFee) || 300,
                          hasFridge: Boolean(previewContract.hasFridge),
                          fridgeRentalFee: Number(previewContract.fridgeRentalFee) || 300,
                          additionalFees: previewContract.additionalFees || [],
                          noticeDays,
                          depositRefundDays: refundDays,
                          overdueGraceDays: graceDays,
                          allowPets: Boolean(previewContract.allowPets),
                          noSmoking: previewContract.noSmoking !== false,
                          additionalRules: previewContract.additionalRules || [],
                          clauses: rawClauses,
                        };
                        localStorage.setItem("pakdee_contract_print_draft", JSON.stringify(draft));
                      } catch {
                        // ignore
                      }
                      window.location.href = "/contracts/print";
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-600" /> เปิดหน้าพิมพ์ A4 เต็มจอ
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold text-xs shadow-md hover:bg-purple-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" /> พิมพ์สัญญา
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* E-Signature Drawing Modal */}
      {signingContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <PenTool className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">ลงลายเซ็นอิเล็กทรอนิกส์ (E-Signature)</h3>
                  <p className="text-[11px] text-slate-500">
                    สัญญาห้อง {signingContract.roomNumber} - {signingContract.tenantName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSigningContract(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1"
              >
                ✕ ปิด
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-xs text-slate-600 dark:text-slate-300">
                ใช้เมาส์ นิ้วมือ หรือปากกาสไตลัส เพื่อเซ็นชื่อลงในกรอบด้านล่างนี้:
              </div>

              {/* Canvas Pad */}
              <div className="relative border-2 border-dashed border-purple-300 dark:border-purple-800 rounded-2xl bg-slate-50 dark:bg-slate-950 overflow-hidden touch-none flex justify-center">
                <canvas
                  ref={canvasRef}
                  width={440}
                  height={180}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="cursor-crosshair bg-transparent"
                />
                {!hasSignatureDrawn && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 dark:text-slate-700 text-xs">
                    ✍️ เซ็นชื่อที่นี่ (Sign here)
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={clearSignature}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ล้างลายเซ็น</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSigningContract(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSignature}
                    disabled={!hasSignatureDrawn}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md shadow-purple-500/20 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>บันทึกลายเซ็นดิจิทัล</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
