"use client";

import React, { useState } from "react";
import { Room, Property, ContractItem } from "@/types/dormitory";
import { formatCurrency } from "@/lib/utils";
import { initialProperty } from "@/lib/mock-data";
import { DocumentViewerModal, DocumentType } from "@/components/documents/document-viewer-modal";
import {
  X,
  User,
  UserPlus,
  Phone,
  CreditCard,
  Zap,
  Droplets,
  Calendar,
  FileText,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileSignature,
  Receipt,
  CheckCircle2,
  Car,
  Mail,
  MapPin,
  Clock,
  Printer,
  Globe,
  Tag,
  Trash2,
} from "lucide-react";

interface RoomDetailModalProps {
  room: Room | null;
  onClose: () => void;
  onOpenInvoice: () => void;
  onOpenDocument?: (docType: DocumentType) => void;
  onOpenAddTenant?: (roomId: string) => void;
  onOpenDailyBooking?: (roomNumber: string) => void;
  onUpdateStatus: (roomId: string, newStatus: Room["status"]) => void;
  onDeleteRoom?: (roomId: string) => void;
  property?: Property;
  contracts?: ContractItem[];
}

export function RoomDetailModal({
  room,
  onClose,
  onOpenInvoice,
  onOpenDocument,
  onOpenAddTenant,
  onOpenDailyBooking,
  onUpdateStatus,
  onDeleteRoom,
  property = initialProperty,
  contracts = [],
}: RoomDetailModalProps) {
  const [activeDocType, setActiveDocType] = useState<DocumentType | null>(null);

  if (!room) return null;

  const tenant = room.currentTenant;
  const activeContract = contracts?.find(
    (c) => c.roomNumber === room.roomNumber && c.status === "active"
  );
  const deposit =
    activeContract?.depositAmount ||
    (room as any).depositAmount ||
    room.currentTenant?.depositAmount ||
    room.monthlyRate * 2;

  const handleOpenDoc = (type: DocumentType) => {
    if (onOpenDocument) {
      onOpenDocument(type);
    }
    setActiveDocType(type);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-[var(--foreground)] tracking-tight">
                ห้อง {room.roomNumber}
              </span>
              <span className="text-xs bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold px-2.5 py-1 rounded-lg border border-emerald-500/30">
                {room.type} (ชั้น {room.floor})
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                room.status === "occupied"
                  ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                  : room.status === "vacant"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                  : room.status === "cleaning"
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                  : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
              }`}>
                {room.status === "occupied" ? "มีผู้เช่า" : room.status === "vacant" ? "ห้องว่าง" : room.status === "cleaning" ? "รอทำความสะอาด" : room.status}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-[var(--subtle)] text-[var(--muted)] hover:text-[var(--foreground)] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-6 space-y-5 overflow-y-auto max-h-[78vh] text-xs">
            {/* Tenant 14-Field Full Information Card */}
            {tenant ? (
              <div className="bg-[var(--subtle)] border border-[var(--border)] rounded-2xl p-4.5 space-y-3.5">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                  <span className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5">
                    <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>ข้อมูลผู้เช่าครบวงจร (14 ฟิลด์มาตรฐาน)</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold px-2 py-0.5 rounded-md border border-blue-500/30">
                      {room.rentalType === "daily" ? "รายวัน" : "สัญญาเช่ารายเดือน"}
                    </span>
                    <span className="text-[10px] bg-purple-500/15 text-purple-600 dark:text-purple-400 font-semibold px-2 py-0.5 rounded-md border border-purple-500/30 flex items-center gap-1">
                      <Globe className="w-2.5 h-2.5" />
                      {tenant.invoiceLang === "EN" ? "English" : "ภาษาไทย"}
                    </span>
                  </div>
                </div>

                {/* Primary Contact & Identity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] text-[var(--muted)]">ชื่อ-นามสกุล ผู้เช่า</div>
                    <div className="text-sm font-bold text-[var(--foreground)] mt-0.5">
                      {tenant.fullName}
                      {tenant.age && <span className="text-xs font-normal text-[var(--muted)] ml-1.5">({tenant.age} ปี)</span>}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--muted)]">เลขประจำตัวประชาชน (13 หลัก)</div>
                    <div className="text-xs font-mono font-bold text-[var(--foreground)] mt-0.5">
                      {tenant.idCard || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--muted)]">เบอร์โทรศัพท์ติดต่อ</div>
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" />
                      <span>{tenant.phone || "-"}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--muted)]">LINE ID / แชท</div>
                    <div className="text-xs font-bold text-teal-600 dark:text-teal-400 mt-0.5">
                      {tenant.lineId ? `@${tenant.lineId}` : "-"}
                    </div>
                  </div>
                  {tenant.taxId && (
                    <div className="col-span-full">
                      <div className="text-[11px] text-[var(--muted)]">เลขประจำตัวผู้เสียภาษี (เบิกบริษัท/นิติบุคคล)</div>
                      <div className="text-xs font-mono text-[var(--foreground)] mt-0.5">
                        {tenant.taxId}
                      </div>
                    </div>
                  )}
                  {tenant.email && (
                    <div>
                      <div className="text-[11px] text-[var(--muted)]">อีเมล</div>
                      <div className="text-xs text-[var(--foreground)] flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-[var(--muted)]" />
                        <span>{tenant.email}</span>
                      </div>
                    </div>
                  )}
                  {tenant.vehiclePlate && (
                    <div>
                      <div className="text-[11px] text-[var(--muted)]">ทะเบียนยานพาหนะ</div>
                      <div className="text-xs font-semibold text-[var(--foreground)] flex items-center gap-1 mt-0.5">
                        <Car className="w-3 h-3 text-blue-500" />
                        <span>{tenant.vehiclePlate}</span>
                      </div>
                    </div>
                  )}
                  {tenant.emergencyContact && (
                    <div className="col-span-full">
                      <div className="text-[11px] text-[var(--muted)]">ผู้ติดต่อฉุกเฉิน (ความสัมพันธ์ & เบอร์)</div>
                      <div className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-0.5">
                        {tenant.emergencyContact}
                      </div>
                    </div>
                  )}
                  {tenant.address && (
                    <div className="col-span-full">
                      <div className="text-[11px] text-[var(--muted)]">ที่อยู่ตามทะเบียนบ้าน/เดิม</div>
                      <div className="text-xs text-[var(--foreground)] mt-0.5">
                        {tenant.address}
                      </div>
                    </div>
                  )}
                  {tenant.idCardImageUrl && (
                    <div className="col-span-full p-2.5 rounded-2xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={tenant.idCardImageUrl}
                          alt="บัตรประชาชน"
                          className="w-14 h-10 object-cover rounded-xl border border-[var(--border)] shadow-xs shrink-0"
                        />
                        <div className="truncate">
                          <div className="text-[11px] font-bold text-[var(--foreground)] flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                            <span>รูปถ่ายบัตรประชาชน (Smart OCR)</span>
                          </div>
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                            ✓ ผ่านการยืนยันตัวตนเรียบร้อย
                          </div>
                        </div>
                      </div>
                      <a
                        href={tenant.idCardImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 text-[10px] rounded-lg bg-[var(--subtle)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--border)] text-[var(--foreground)] font-semibold transition cursor-pointer shrink-0"
                      >
                        ดูรูปเต็ม
                      </a>
                    </div>
                  )}
                  {tenant.notes && (
                    <div className="col-span-full p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px]">
                      <strong>หมายเหตุ:</strong> {tenant.notes}
                    </div>
                  )}
                </div>

                {/* Lease Details */}
                {(() => {
                  const countdownDays = room.leaseEndDate
                    ? Math.ceil((new Date(room.leaseEndDate).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24))
                    : null;
                  return (
                    <div className="pt-2.5 border-t border-[var(--border)] grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 text-[var(--muted)] flex-wrap">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>สิ้นสุดสัญญา: <strong className="text-[var(--foreground)]">{room.leaseEndDate || "-"}</strong></span>
                        {countdownDays !== null && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              countdownDays <= 0
                                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                : countdownDays <= 30
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {countdownDays < 0
                              ? `หมดสัญญาแล้ว (${Math.abs(countdownDays)} วัน)`
                              : countdownDays === 0
                              ? "หมดสัญญาวันนี้"
                              : `เหลืออีก ${countdownDays} วัน`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[var(--muted)]">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>เงินประกันมัดจำ: <strong className="text-[var(--foreground)]">{formatCurrency(deposit)}</strong> (ก้อนเดียว)</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 space-y-3.5">
                <div className="text-center">
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold text-base flex items-center justify-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>ห้องว่างพร้อมเข้าอยู่ (Vacant Room)</span>
                  </div>
                  <div className="text-xs text-[var(--muted)] mt-1">
                    อัตราค่าเช่ารายเดือน {formatCurrency(room.monthlyRate)}/เดือน • รายวัน {formatCurrency(room.dailyRate)}/คืน
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
                  {onOpenAddTenant && (
                    <button
                      type="button"
                      onClick={() => onOpenAddTenant(room.id)}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>ทำสัญญาห้องพัก / ลงทะเบียนเข้าพัก</span>
                    </button>
                  )}
                  {onOpenDailyBooking && (
                    <button
                      type="button"
                      onClick={() => onOpenDailyBooking(room.roomNumber)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>จองห้องพักรายวัน</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Meter Readings Card */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--subtle)] border border-[var(--border)] rounded-2xl p-3.5">
                <div className="flex items-center justify-between text-xs text-amber-500 font-medium mb-1">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> ไฟฟ้า
                  </span>
                  <span className="text-[10px] text-[var(--muted)]">{property.electricRate} บ./หน่วย</span>
                </div>
                <div className="text-xl font-bold text-[var(--foreground)] font-mono">
                  {room.currentElectricMeter}
                </div>
                <div className="text-[10px] text-[var(--muted)] mt-0.5">
                  เลขมิเตอร์ล่าสุด
                </div>
              </div>

              <div className="bg-[var(--subtle)] border border-[var(--border)] rounded-2xl p-3.5">
                <div className="flex items-center justify-between text-xs text-cyan-500 font-medium mb-1">
                  <span className="flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5" /> น้ำประปา
                  </span>
                  <span className="text-[10px] text-[var(--muted)]">{property.waterRate} บ./หน่วย</span>
                </div>
                <div className="text-xl font-bold text-[var(--foreground)] font-mono">
                  {room.currentWaterMeter}
                </div>
                <div className="text-[10px] text-[var(--muted)] mt-0.5">
                  เลขมิเตอร์ล่าสุด
                </div>
              </div>
            </div>

            {/* Document Generation & Viewing Buttons (PAKDEE Documents Hub) */}
            <div className="space-y-2 pt-1">
              <div className="text-xs font-bold text-[var(--foreground)] flex items-center justify-between">
                <span>เอกสารสำคัญประจำห้องพัก (Documents Hub)</span>
                <span className="text-[10px] text-[var(--muted)] font-normal">รองรับพิมพ์ A4 / PDF</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenDoc("contract")}
                  className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/25 transition cursor-pointer text-center"
                >
                  <FileSignature className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="font-bold text-[11px]">1. สัญญาเช่า</span>
                  <span className="text-[9px] text-[var(--muted)]">ข้อตกลง 10 ข้อ</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenDoc("invoice")}
                  className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 transition cursor-pointer text-center"
                >
                  <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-bold text-[11px]">2. ใบแจ้งหนี้</span>
                  <span className="text-[9px] text-[var(--muted)]">QR พร้อมเพย์</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenDoc("receipt")}
                  className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/25 transition cursor-pointer text-center"
                >
                  <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span className="font-bold text-[11px]">3. ใบเสร็จ</span>
                  <span className="text-[9px] text-[var(--muted)]">ตราประทับชำระ</span>
                </button>
              </div>
            </div>

            {/* Room Status Management */}
            <div className="space-y-2 pt-1 border-t border-[var(--border)]">
              <div className="text-xs font-semibold text-[var(--muted)]">
                การจัดการสถานะห้องพัก
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    onOpenInvoice();
                    onClose();
                  }}
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold transition cursor-pointer hover:opacity-90"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>ดูใบแจ้งหนี้ / สลิป</span>
                </button>

                {room.status === "cleaning" ? (
                  <button
                    onClick={() => onUpdateStatus(room.id, "vacant")}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>ยืนยันห้องสะอาดแล้ว</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onUpdateStatus(room.id, "cleaning")}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] hover:border-yellow-500 text-[var(--foreground)] text-xs font-medium transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                    <span>แจ้งแม่บ้านทำความสะอาด</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 bg-[var(--subtle)] border-t border-[var(--border)] flex items-center justify-between">
            {onDeleteRoom ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`คุณต้องการลบห้อง ${room.roomNumber} ออกจากระบบใช่หรือไม่?`)) {
                    onDeleteRoom(room.id);
                    onClose();
                  }
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 border border-rose-500/30 transition cursor-pointer flex items-center gap-1.5"
                title="ลบห้องนี้ออกจากระบบ"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ลบห้องนี้</span>
              </button>
            ) : <div />}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>

      {/* Universal Document Viewer Modal (Printable A4) */}
      {activeDocType && (
        <DocumentViewerModal
          isOpen={true}
          onClose={() => setActiveDocType(null)}
          initialDocType={activeDocType}
          room={room}
          property={property}
        />
      )}
    </>
  );
}
