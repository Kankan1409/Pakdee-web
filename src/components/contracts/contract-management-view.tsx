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
      {previewContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white text-slate-900 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-4 shrink-0">
              <div>
                <h2 className="text-lg font-bold">สัญญาเช่าห้องพักอาศัย (Residential Lease Agreement)</h2>
                <div className="text-xs text-slate-500">เลขที่สัญญา: {previewContract.contractNumber}</div>
              </div>
              <button
                onClick={() => setPreviewContract(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs leading-relaxed overflow-y-auto pr-1 flex-1">
              <p>
                สัญญาฉบับนี้ทำขึ้น ณ หอพัก พักดี แมนชั่น ระหว่าง ผู้ให้เช่า และ <strong>{previewContract.tenantName}</strong> (ผู้เช่า)
                เบอร์โทรศัพท์ <strong>{previewContract.tenantPhone}</strong>
              </p>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-800 text-xs border-b border-slate-200 pb-1.5">
                  รายละเอียดห้องพักและการเงิน
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div><strong>ห้องพักเลขที่:</strong> {previewContract.roomNumber}</div>
                  <div><strong>ค่าเช่ารายเดือน:</strong> {formatCurrency(previewContract.monthlyRent)} / เดือน</div>
                  <div><strong>เงินมัดจำประกัน:</strong> {formatCurrency(previewContract.depositAmount)}</div>
                  <div>
                    <strong>ระยะเวลาสัญญา:</strong> {formatDateThai(previewContract.startDate)} ถึง{" "}
                    {previewContract.isContinuous ? "สัญญาต่อเนื่อง" : formatDateThai(previewContract.endDate)}
                  </div>
                  <div><strong>วันกำหนดชำระ:</strong> วันที่ {previewContract.paymentDueDay || 5} ของเดือน</div>
                  <div><strong>ค่าปรับล่าช้า:</strong> {previewContract.lateFeePerDay || 100} บาท/วัน</div>
                </div>

                {/* Additional Services */}
                <div className="pt-2 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
                  {previewContract.additionalFees && previewContract.additionalFees.length > 0 ? (
                    previewContract.additionalFees.map((fee) => (
                      <div key={fee.id}>
                        <strong>{fee.name || "ค่าบริการเพิ่มเติม"}:</strong> {fee.isEnabled ? formatCurrency(fee.amount) : "ไม่เปิดใช้"}
                      </div>
                    ))
                  ) : (
                    <>
                      <div><strong>ค่าส่วนกลาง:</strong> {previewContract.hasCommonFee ? formatCurrency(previewContract.commonFee || 0) : "ไม่เรียกเก็บ"}</div>
                      <div><strong>ค่าเน็ต WiFi:</strong> {previewContract.hasWifi ? formatCurrency(previewContract.wifiFee || 0) : "ไม่ใช้"}</div>
                      <div><strong>ค่าที่จอดรถ:</strong> {previewContract.hasParking ? formatCurrency(previewContract.parkingFee || 0) : "ไม่ใช้"}</div>
                    </>
                  )}
                  <div><strong>ค่าเช่าทีวี:</strong> {previewContract.hasTv ? formatCurrency(previewContract.tvRentalFee || 0) : "ไม่เช่า"}</div>
                  <div><strong>ค่าเช่าตู้เย็น:</strong> {previewContract.hasFridge ? formatCurrency(previewContract.fridgeRentalFee || 0) : "ไม่เช่า"}</div>
                  <div><strong>สัตว์เลี้ยง / บุหรี่:</strong> {previewContract.allowPets ? "เลี้ยงได้" : "ห้ามเลี้ยง"} • {previewContract.noSmoking !== false ? "ห้ามสูบบุหรี่" : "-"}</div>
                </div>
              </div>

              {/* Lease Clauses (14 ข้อ) */}
              <div className="space-y-2 pt-1">
                <div className="font-bold text-slate-800 text-xs">
                  ข้อกำหนดและเงื่อนไขสัญญา ({previewContract.clauses?.length || 14} ข้อ):
                </div>
                <div className="space-y-2 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
                  {(previewContract.clauses && previewContract.clauses.length > 0
                    ? previewContract.clauses
                    : [
                        { id: 1, title: "ห้องพักที่เช่า", content: `ผู้เช่าตกลงเช่าห้องพักเลขที่ ${previewContract.roomNumber} เพื่อใช้เป็นที่พักอาศัยเท่านั้น` },
                        { id: 2, title: "ระยะเวลาการเช่า", content: `สัญญาเริ่มตั้งแต่วันที่ ${formatDateThai(previewContract.startDate)} ถึง ${previewContract.isContinuous ? "สัญญาต่อเนื่อง" : formatDateThai(previewContract.endDate)}` },
                        { id: 3, title: "ค่าเช่า", content: `ชำระค่าเช่าเดือนละ ${formatCurrency(previewContract.monthlyRent)} ภายในวันที่ ${previewContract.paymentDueDay || 5} ของทุกเดือน` },
                        { id: 4, title: "เงินประกัน", content: `ผู้เช่าวางเงินประกัน ${formatCurrency(previewContract.depositAmount)} บาท คืนให้ภายใน ${previewContract.depositRefundDays || 7} วันหลังย้ายออก` },
                        { id: 5, title: "ค่าสาธารณูปโภค", content: "ผู้เช่าตกลงชำระค่าน้ำประปา ค่าไฟฟ้า ค่าบริการส่วนกลาง ค่าอินเทอร์เน็ต ตามอัตราที่หอพักกำหนด" },
                        { id: 6, title: "การดูแลรักษาห้องพัก", content: "ผู้เช่าจะต้องดูแลรักษาห้องพักให้เรียบร้อย สะอาด และไม่ดัดแปลงต่อเติมห้องพัก" },
                      ]
                  ).map((cl, idx) => (
                    <div key={cl.id || idx} className="text-[11px] leading-relaxed text-slate-700">
                      <strong>ข้อ {idx + 1} {cl.title}:</strong> {cl.content}
                    </div>
                  ))}

                  {previewContract.additionalRules && previewContract.additionalRules.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-700">
                      <strong>กฎระเบียบเพิ่มเติม:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-0.5">
                        {previewContract.additionalRules.map((rule, rIdx) => (
                          <li key={rIdx}>{rule}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-8 border-t text-center text-xs">
              <div>
                <div className="min-h-[64px] flex items-center justify-center border-b border-dashed border-slate-400 mb-2 pb-1">
                  <div className="text-[11px] text-slate-400 italic">ฝ่ายบริหารจัดการหอพัก</div>
                </div>
                <div>(ลงชื่อ).................................................... ผู้ให้เช่า</div>
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 text-xs font-semibold transition cursor-pointer"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>คลิกเพื่อลงลายเซ็นออนไลน์</span>
                    </button>
                  )}
                </div>
                <div>(ลงชื่อ) <strong>{previewContract.tenantName}</strong> ผู้เช่า</div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-4 border-t">
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
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold text-xs shadow-md hover:bg-purple-700 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> พิมพ์สัญญา
              </button>
            </div>
          </div>
        </div>
      )}

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
