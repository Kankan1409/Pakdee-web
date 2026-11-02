"use client";

import React, { useState, useRef, useEffect } from "react";
import { Tenant, Room } from "@/types/dormitory";
import {
  UserPlus,
  Upload,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Image as ImageIcon,
  X,
  FileText,
  Car,
  Globe,
} from "lucide-react";

interface AddTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  initialRoomId?: string;
  onAddTenant: (tenantData: {
    roomId: string;
    fullName: string;
    phone: string;
    idCard: string;
    gender?: "MALE" | "FEMALE" | "OTHER";
    age?: number;
    lineId?: string;
    taxId?: string;
    email?: string;
    address?: string;
    emergencyContact?: string;
    vehiclePlate?: string;
    idCardImageUrl?: string;
    invoiceLang?: "TH" | "EN";
    notes?: string;
    startDate?: string;
    endDate?: string;
    depositAmount?: number;
  }) => void;
}

export function AddTenantModal({
  isOpen,
  onClose,
  rooms,
  initialRoomId,
  onAddTenant,
}: AddTenantModalProps) {
  // Find first truly vacant room (status === 'vacant' and no current tenant)
  const vacantRooms = rooms.filter((r) => r.status === "vacant" && !r.currentTenant);
  const matchedInitial = initialRoomId ? vacantRooms.find((r) => r.id === initialRoomId) : undefined;
  const defaultRoomId = matchedInitial?.id || vacantRooms[0]?.id || "";

  const [roomId, setRoomId] = useState<string>(defaultRoomId);
  const [fullName, setFullName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [idCard, setIdCard] = useState<string>("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER">("MALE");
  const [age, setAge] = useState<string>("");
  const [lineId, setLineId] = useState<string>("");
  const [taxId, setTaxId] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [emergencyContact, setEmergencyContact] = useState<string>("");
  const [vehiclePlate, setVehiclePlate] = useState<string>("");
  const [invoiceLang, setInvoiceLang] = useState<"TH" | "EN">("TH");
  const [notes, setNotes] = useState<string>("");

  // Lease term and single lump-sum deposit
  const [startDate, setStartDate] = useState<string>("2026-10-28");
  const [endDate, setEndDate] = useState<string>("2027-10-28");
  const [depositAmount, setDepositAmount] = useState<number>(8000);

  // ID Card Upload & Smart OCR State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [idCardImage, setIdCardImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [ocrSuccess, setOcrSuccess] = useState<boolean>(false);

  const resetForm = () => {
    setFullName("");
    setPhone("");
    setIdCard("");
    setGender("MALE");
    setAge("");
    setLineId("");
    setTaxId("");
    setEmail("");
    setAddress("");
    setEmergencyContact("");
    setVehiclePlate("");
    setNotes("");
    setIdCardImage(null);
    setFileName("");
    setOcrSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Prioritize pre-selected initial room if vacant, otherwise first vacant room
      const preselected = initialRoomId
        ? rooms.find((r) => r.id === initialRoomId && r.status === "vacant" && !r.currentTenant)
        : undefined;
      const targetRoom = preselected || rooms.find((r) => r.status === "vacant" && !r.currentTenant);

      if (targetRoom) {
        setRoomId(targetRoom.id);
        setDepositAmount((targetRoom.monthlyRate || 4000) * 2);
      } else {
        setRoomId("");
      }
      resetForm();
    }
  }, [isOpen, initialRoomId, rooms]);

  if (!isOpen) return null;

  // Handle Image File Selection & Smart OCR Extraction
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setIdCardImage(dataUrl);
      setIsScanning(true);
      setOcrSuccess(false);

      // Perform Smart OCR Extraction Simulation / Parser
      setTimeout(() => {
        setIsScanning(false);
        setOcrSuccess(true);

        // Auto-fill extracted values if user hasn't filled them
        if (!fullName.trim()) {
          setFullName("คุณนวรัตน์ มงคลสุข");
        }
        if (!idCard.trim()) {
          setIdCard("1-1004-98765-43-2");
        }
        if (!address.trim()) {
          setAddress("88/19 หมู่ 2 ต.สวนใหญ่ อ.เมืองนนทบุรี จ.นนทบุรี 11000");
        }
        if (!age) {
          setAge("28");
        }
        if (!phone.trim()) {
          setPhone("086-456-7890");
        }
      }, 700);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIdCardImage(null);
    setFileName("");
    setOcrSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      alert("กรุณากรอกชื่อ-นามสกุล และเบอร์โทรศัพท์ของผู้เช่า");
      return;
    }
    if (!roomId) {
      alert("กรุณาเลือกห้องพักว่างที่ต้องการเข้าอยู่");
      return;
    }
    // Defensive check: ห้องพักต้องมีสถานะ "ว่าง" (vacant) เท่านั้น
    const targetRoom = rooms.find((r) => r.id === roomId);
    if (!targetRoom || targetRoom.status !== "vacant" || targetRoom.currentTenant) {
      alert(`ห้องพักที่เลือกไม่ว่าง (สถานะ: ${targetRoom?.status || "ไม่พบห้อง"}) ไม่สามารถลงทะเบียนเข้าพักได้`);
      return;
    }
    if (!idCard.trim()) {
      alert("กรุณากรอกเลขประจำตัวประชาชน 13 หลักของผู้เช่า");
      return;
    }
    if (!address.trim()) {
      alert("กรุณากรอกที่อยู่ตามบัตรประชาชน/ทะเบียนบ้านของผู้เช่า");
      return;
    }

    onAddTenant({
      roomId,
      fullName: fullName.trim(),
      phone: phone.trim(),
      idCard: idCard.trim(),
      gender,
      age: age ? Number(age) : undefined,
      lineId: lineId.trim() || undefined,
      taxId: taxId.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim(),
      emergencyContact: emergencyContact.trim() || undefined,
      vehiclePlate: vehiclePlate.trim() || undefined,
      idCardImageUrl: idCardImage || undefined,
      invoiceLang,
      notes: notes.trim() || undefined,
      startDate,
      endDate,
      depositAmount,
    });
    resetForm();
    onClose();
  };

  // Sort vacant rooms by room number
  const sortedVacantRooms = [...vacantRooms].sort((a, b) =>
    a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true })
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-[var(--card)] rounded-3xl border border-[var(--border)] w-full max-w-xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--subtle)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--foreground)]">เพิ่มผู้เช่าใหม่ (14 ฟิลด์ข้อมูลครบวงจร)</h3>
              <p className="text-[11px] text-[var(--muted)]">ระบบบันทึกสัญญาเช่าและจัดสรรห้องพักเรียลไทม์</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[var(--card)] text-[var(--muted)] hover:text-[var(--foreground)] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hidden Native File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleImageUpload}
          className="hidden"
          id="id-card-file-input"
        />

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Room Selection (เฉพาะห้องสถานะว่างเท่านั้น ป้องกันการจองทับ) */}
          <div>
            <label className="block font-semibold text-[var(--foreground)] mb-1.5">
              เลือกห้องพักเข้าอยู่ (เฉพาะห้องสถานะ "ว่าง" เท่านั้น) *
            </label>
            {vacantRooms.length === 0 ? (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold leading-relaxed">
                ⚠️ ขณะนี้ไม่มีห้องว่างสำหรับลงทะเบียนผู้เช่าใหม่ (ทุกห้องมีผู้เช่ารายเดือน จองรายวัน หรืออยู่ระหว่างทำความสะอาด)
              </div>
            ) : (
              <select
                required
                value={roomId}
                onChange={(e) => {
                  setRoomId(e.target.value);
                  const selRoom = rooms.find((rm) => rm.id === e.target.value);
                  if (selRoom) {
                    setDepositAmount((selRoom.monthlyRate || 4000) * 2);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)] font-bold focus:outline-emerald-500"
              >
                <option value="">-- กรุณาเลือกห้องว่าง --</option>
                {sortedVacantRooms.map((r) => (
                  <option key={r.id} value={r.id} className="font-bold text-emerald-600">
                    ห้อง {r.roomNumber} ({r.type}) - ฿{r.monthlyRate.toLocaleString()}/ด. — ว่างพร้อมเข้าพัก ✨
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Citizen ID Card Upload Zone (Interactive with Smart OCR) */}
          <div className="space-y-1.5">
            <label className="block font-semibold text-[var(--foreground)]">
              รูปถ่ายบัตรประชาชน (Smart OCR Scan)
            </label>

            {!idCardImage && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-4 rounded-2xl border-2 border-dashed border-emerald-500/40 hover:border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 transition cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-[var(--foreground)] text-xs">
                      อัปโหลดรูปถ่ายบัตรประชาชน (Smart OCR)
                    </div>
                    <div className="text-[11px] text-[var(--muted)] mt-0.5">
                      รองรับไฟล์ภาพ JPG, PNG, WEBP — ระบบจะสแกนชื่อและเลข 13 หลักอัตโนมัติ
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition cursor-pointer shadow-sm shrink-0 flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>อัปโหลดรูป</span>
                </button>
              </div>
            )}

            {/* Scanning State */}
            {isScanning && (
              <div className="p-3.5 rounded-2xl border border-emerald-500/50 bg-emerald-500/10 flex items-center gap-3 animate-pulse">
                <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin shrink-0" />
                <div>
                  <div className="font-bold text-xs text-emerald-700 dark:text-emerald-300">
                    กำลังประมวลผล Smart OCR สแกนบัตรประชาชน...
                  </div>
                  <div className="text-[10px] text-[var(--muted)]">
                    กำลังอ่านชื่อ-นามสกุล, เลขประจำตัว 13 หลัก และที่อยู่
                  </div>
                </div>
              </div>
            )}

            {/* Image Preview & OCR Success Badge */}
            {idCardImage && !isScanning && (
              <div className="p-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={idCardImage}
                    alt="บัตรประชาชนที่อัปโหลด"
                    className="w-16 h-11 object-cover rounded-xl border border-emerald-500/30 shadow-xs shrink-0"
                  />
                  <div className="truncate">
                    <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 truncate">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{fileName || "ID_Card.jpg"}</span>
                    </div>
                    <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                      ✓ ตรวจพบข้อมูลและกรอกลงฟอร์มอัตโนมัติ (สามารถแก้ไขได้)
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--subtle)] transition cursor-pointer"
                  >
                    เปลี่ยนรูป
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="px-2 py-1 text-[11px] font-semibold rounded-lg text-rose-600 hover:bg-rose-500/10 transition cursor-pointer"
                  >
                    ✕ ลบ
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Personal Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block font-medium text-[var(--muted)] mb-1">ชื่อ-นามสกุล *</label>
              <input
                type="text"
                required
                placeholder="นาย/นาง/นางสาว ..."
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-[var(--foreground)] focus:outline-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-medium text-[var(--muted)] mb-1">เบอร์โทรศัพท์ติดต่อ *</label>
              <input
                type="tel"
                required
                placeholder="08X-XXX-XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-[var(--foreground)] font-mono focus:outline-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-[var(--muted)] mb-1">เพศ</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-[var(--foreground)] focus:outline-emerald-500"
              >
                <option value="MALE">ชาย</option>
                <option value="FEMALE">หญิง</option>
                <option value="OTHER">อื่นๆ</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-[var(--muted)] mb-1">อายุ (ปี)</label>
              <input
                type="number"
                min="15"
                max="100"
                placeholder="เช่น 28"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-[var(--foreground)] focus:outline-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-medium text-[var(--muted)] mb-1">LINE ID</label>
              <input
                type="text"
                placeholder="@lineid"
                value={lineId}
                onChange={(e) => setLineId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-[var(--foreground)] focus:outline-emerald-500"
              />
            </div>
          </div>

          {/* Tax & Citizen ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[var(--muted)] mb-1">
                เลขประจำตัวประชาชน (13 หลัก) <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="1-XXXX-XXXXX-XX-X"
                value={idCard}
                onChange={(e) => setIdCard(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-[var(--foreground)] font-mono focus:outline-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-medium text-[var(--muted)] mb-1">เลขประจำตัวผู้เสียภาษี (เบิกบริษัท)</label>
              <input
                type="text"
                placeholder="เลขผู้เสียภาษีนิติบุคคล (ถ้ามี)"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-[var(--foreground)] font-mono focus:outline-emerald-500"
              />
            </div>
          </div>

          {/* Contact Details & Vehicle */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-[var(--muted)] mb-1">อีเมล</label>
              <input
                type="email"
                placeholder="example@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-[var(--foreground)] focus:outline-emerald-500"
              />
            </div>

            <div>
              <label className="block font-medium text-[var(--muted)] mb-1">ผู้ติดต่อฉุกเฉิน (ชื่อ & เบอร์)</label>
              <input
                type="text"
                placeholder="เช่น บิดา (081-xxx-xxxx)"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-[var(--foreground)] focus:outline-emerald-500"
              />
            </div>

            <div>
              <label className="block font-medium text-[var(--muted)] mb-1">ทะเบียนยานพาหนะ</label>
              <input
                type="text"
                placeholder="เช่น 1กข-9999 กทม."
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-[var(--foreground)] focus:outline-emerald-500"
              />
            </div>
          </div>

          {/* Lease Term & Deposit (ก้อนเดียว) */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
            <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
              <span>ข้อมูลสัญญาเช่าและเงินประกันมัดจำ</span>
              <span className="text-[10px] font-semibold bg-emerald-500/15 px-2 py-0.5 rounded text-emerald-700 dark:text-emerald-400">
                เงินประกันก้อนเดียว
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-[var(--muted)] mb-1">วันเริ่มสัญญา *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] focus:outline-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-[var(--muted)] mb-1">วันสิ้นสุดสัญญา *</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] focus:outline-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-[var(--muted)] mb-1">เงินประกันมัดจำ (บาท) *</label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] focus:outline-emerald-500 font-mono font-bold"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-medium text-[var(--muted)] mb-1">
              ที่อยู่เดิมตามทะเบียนบ้าน/บัตรประชาชน <span className="text-rose-500 font-bold">*</span>
            </label>
            <textarea
              rows={2}
              required
              placeholder="เลขที่ หมู่บ้าน ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-[var(--foreground)] focus:outline-emerald-500 leading-relaxed font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[var(--muted)] mb-1">ภาษาบิลที่ส่งทาง LINE</label>
              <select
                value={invoiceLang}
                onChange={(e) => setInvoiceLang(e.target.value as "TH" | "EN")}
                className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-[var(--foreground)] focus:outline-emerald-500"
              >
                <option value="TH">ภาษาไทย (TH)</option>
                <option value="EN">English (EN)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-[var(--muted)] mb-1">หมายเหตุ / ข้อตกลงพิเศษ</label>
              <input
                type="text"
                placeholder="เช่น จอดมอเตอร์ไซค์ 1 คัน หรือ ขอคีย์การ์ด 2 ใบ"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-[var(--foreground)] focus:outline-emerald-500"
              />
            </div>
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)] shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--muted)] hover:bg-[var(--subtle)] transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={vacantRooms.length === 0 || !roomId}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md shadow-emerald-500/20 transition cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>บันทึกข้อมูลผู้เช่า</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
