"use client";

import React, { useState, useEffect, useRef } from "react";
import { BranchSettingsDetail, Property,Room, RoomTypeConfig, defaultRoomTypes } from "@/types/dormitory";
import { isValidPromptPayTarget } from "@/lib/promptpay";
import { isValidHttpsUrl, isValidBankAccount } from "@/lib/validators";
import { globalPopup } from "@/lib/popup-context";
import {
  Settings,
  Building,
  Zap,
  Droplets,
  Receipt,
  Calendar,
  CreditCard,
  FileSignature,
  FileText,
  MessageSquare,
  Bell,
  ShieldCheck,
  Save,
  CheckCircle2,
  Copy,
  QrCode,
  Upload,
  BedDouble,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  Star,
  Check,
  AlertCircle,
  X,
  DoorOpen,
} from "lucide-react";

interface BranchSettingsViewProps {
  settings: BranchSettingsDetail;
  onSaveSettings: (updated: Partial<BranchSettingsDetail>) => void;
  rooms?: Room[];
}

// รายชื่อธนาคารพาณิชย์หลักในประเทศไทย
const THAI_BANKS = [
  { code: "KBANK", name: "ธนาคารกสิกรไทย (KBANK)" },
  { code: "SCB", name: "ธนาคารไทยพาณิชย์ (SCB)" },
  { code: "BBL", name: "ธนาคารกรุงเทพ (BBL)" },
  { code: "KTB", name: "ธนาคารกรุงไทย (KTB)" },
  { code: "BAY", name: "ธนาคารกรุงศรีอยุธยา (BAY)" },
  { code: "TTB", name: "ธนาคารทหารไทยธนชาต (TTB)" },
  { code: "GSB", name: "ธนาคารออมสิน (GSB)" },
  { code: "BAAC", name: "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)" },
  { code: "UOB", name: "ธนาคารยูโอบี (UOB)" },
  { code: "CIMBT", name: "ธนาคารซีไอเอ็มบี ไทย (CIMBT)" },
  { code: "LHBANK", name: "ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH Bank)" },
  { code: "KKP", name: "ธนาคารเกียรตินาคินภัทร (KKP)" },
  { code: "TISCO", name: "ธนาคารทิสโก้ (TISCO)" },
  { code: "PROMPTPAY", name: "พร้อมเพย์ (PromptPay)" },
  { code: "OTHER", name: "ธนาคารอื่น ๆ" },
];

export function BranchSettingsView({
  settings,
  onSaveSettings,
  rooms = [],
}: BranchSettingsViewProps) {
  const [activeTab, setActiveTab] = useState<string>("building");
  const [formData, setFormData] = useState<BranchSettingsDetail>(settings);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const prevBranchIdRef = useRef<string>(settings?.id || "");

  // Room Types State
  const [isRoomTypeModalOpen, setIsRoomTypeModalOpen] = useState<boolean>(false);
  const [editingRoomTypeId, setEditingRoomTypeId] = useState<string | null>(null);
  const [roomTypeForm, setRoomTypeForm] = useState<{
    name: string;
    monthlyRate: number;
    dailyRate: number;
    description: string;
    isDefault: boolean;
  }>({
    name: "",
    monthlyRate: 4000,
    dailyRate: 650,
    description: "",
    isDefault: false,
  });

  // Current room types list
  const roomTypesList: RoomTypeConfig[] =
    formData.roomTypes && formData.roomTypes.length > 0 ? formData.roomTypes : defaultRoomTypes;
  // Only reset form data if the user switches to a DIFFERENT branch
  // Navigating between tabs (1 to 9) retains all unsaved edits across all tabs
  useEffect(() => {
    if (settings?.id && settings.id !== prevBranchIdRef.current) {
      prevBranchIdRef.current = settings.id;
      setFormData(settings);
    }
  }, [settings?.id, settings]);

  const tabs = [
    { id: "building", label: "อาคาร & ทั่วไป", icon: Building },
    { id: "room-types", label: "ประเภทห้องพัก & ราคา", icon: BedDouble },
    { id: "rates", label: "อัตราค่าน้ำ-ไฟ", icon: Zap },
    { id: "billing", label: "รอบบิล & ค่าปรับ", icon: Receipt },
    { id: "banking", label: "บัญชีธนาคาร & QR", icon: CreditCard },
    { id: "line", label: "LINE Official Account", icon: MessageSquare },
    { id: "contract", label: "สัญญาเช่า & ข้อตกลง", icon: FileText },
    { id: "signature", label: "ลายเซ็น & ตราประทับ", icon: FileSignature },
    { id: "notifications", label: "ระบบแจ้งเตือน", icon: Bell },
    { id: "permissions", label: "สิทธิ์การใช้งาน", icon: ShieldCheck },
  ];

  const signatureInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      handleChange("signatureUrl", dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      handleChange("stampUrl", dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (field: keyof BranchSettingsDetail, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // --------------------------------------------------------------------------
  // ROOM TYPES HANDLERS
  // --------------------------------------------------------------------------
  const getRoomUsageCount = (typeName: string, isDefault?: boolean) => {
    if (!rooms || rooms.length === 0) return 0;
    return rooms.filter(
      (r) => r.type === typeName || (isDefault && (r.type === "Standard" || !r.type))
    ).length;
  };

  const handleOpenAddRoomType = () => {
    setEditingRoomTypeId(null);
    setRoomTypeForm({
      name: "",
      monthlyRate: 4000,
      dailyRate: 650,
      description: "",
      isDefault: roomTypesList.length === 0,
    });
    setIsRoomTypeModalOpen(true);
  };

  const handleOpenEditRoomType = (rt: RoomTypeConfig) => {
    setEditingRoomTypeId(rt.id);
    setRoomTypeForm({
      name: rt.name,
      monthlyRate: rt.monthlyRate,
      dailyRate: rt.dailyRate,
      description: rt.description || "",
      isDefault: Boolean(rt.isDefault),
    });
    setIsRoomTypeModalOpen(true);
  };

  const handleSaveRoomType = (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrimmed = roomTypeForm.name.trim();
    if (!nameTrimmed) {
      globalPopup.error("กรุณากรอกชื่อประเภทห้อง", "ชื่อประเภทห้องพักต้องไม่เป็นค่าว่าง");
      return;
    }

    const isDuplicate = roomTypesList.some(
      (rt) => rt.name.toLowerCase() === nameTrimmed.toLowerCase() && rt.id !== editingRoomTypeId
    );
    if (isDuplicate) {
      globalPopup.error("ชื่อประเภทห้องซ้ำ", `มีประเภทห้องชื่อ "${nameTrimmed}" อยู่ในระบบแล้ว`);
      return;
    }

    const mRate = Number(roomTypeForm.monthlyRate) || 0;
    const dRate = Number(roomTypeForm.dailyRate) || 0;
    if (mRate < 0 || dRate < 0) {
      globalPopup.error("ราคาไม่ถูกต้อง", "อัตราค่าเช่าต้องไม่ติดลบ (อย่างน้อย 0 บาท)");
      return;
    }

    let updatedList: RoomTypeConfig[] = [];
    if (editingRoomTypeId) {
      updatedList = roomTypesList.map((rt) => {
        if (rt.id === editingRoomTypeId) {
          return {
            ...rt,
            name: nameTrimmed,
            monthlyRate: mRate,
            dailyRate: dRate,
            description: roomTypeForm.description.trim(),
            isDefault: roomTypeForm.isDefault,
          };
        }
        return roomTypeForm.isDefault ? { ...rt, isDefault: false } : rt;
      });
    } else {
      const newRt: RoomTypeConfig = {
        id: `rt-${Date.now()}`,
        name: nameTrimmed,
        monthlyRate: mRate,
        dailyRate: dRate,
        description: roomTypeForm.description.trim(),
        isDefault: roomTypeForm.isDefault,
      };
      updatedList = roomTypeForm.isDefault
        ? [...roomTypesList.map((r) => ({ ...r, isDefault: false })), newRt]
        : [...roomTypesList, newRt];
    }

    if (!updatedList.some((r) => r.isDefault) && updatedList.length > 0) {
      updatedList[0].isDefault = true;
    }

    handleChange("roomTypes", updatedList);
    setIsRoomTypeModalOpen(false);
    globalPopup.info(
      editingRoomTypeId ? "แก้ไขประเภทห้องสำเร็จ" : "เพิ่มประเภทห้องสำเร็จ",
      `บันทึกข้อมูลประเภทห้อง "${nameTrimmed}" เรียบร้อยแล้ว (กด "บันทึกการตั้งค่า" เพื่อนำไปใช้ถาวร)`
    );
  };

  const handleDeleteRoomType = (rt: RoomTypeConfig) => {
    if (roomTypesList.length <= 1) {
      globalPopup.error("ไม่สามารถลบได้", "ระบบต้องมีประเภทห้องพักอย่างน้อย 1 ประเภทเสมอ");
      return;
    }

    const assignedCount = getRoomUsageCount(rt.name, rt.isDefault);
    if (assignedCount > 0) {
      globalPopup.error(
        "ไม่สามารถลบประเภทห้องนี้ได้!",
        `ขณะนี้มีห้องพักจำนวน ${assignedCount} ห้องที่กำลังใช้งานประเภท "${rt.name}" อยู่ กรุณาเปลี่ยนประเภทของห้องเหล่านั้นในหน้าผังห้องพักก่อนทำการลบครับ`
      );
      return;
    }

    const updatedList = roomTypesList.filter((r) => r.id !== rt.id);
    if (rt.isDefault && updatedList.length > 0) {
      updatedList[0].isDefault = true;
    }
    handleChange("roomTypes", updatedList);
    globalPopup.info("ลบประเภทห้องแล้ว", `ลบประเภทห้อง "${rt.name}" เรียบร้อยแล้ว`);
  };

  const handleSetDefaultRoomType = (id: string) => {
    const updatedList = roomTypesList.map((rt) => ({
      ...rt,
      isDefault: rt.id === id,
    }));
    handleChange("roomTypes", updatedList);
    globalPopup.info("เปลี่ยนประเภทห้องเริ่มต้น", "ตั้งค่าประเภทห้องเริ่มต้นสำหรับสร้างห้องพักใหม่เรียบร้อยแล้ว");
  };

  const handleResetRoomTypesToDefault = () => {
    handleChange("roomTypes", defaultRoomTypes);
    globalPopup.info("คืนค่าเริ่มต้นสำเร็จ", "รีเซ็ตประเภทห้องพักเป็นค่ามาตรฐาน 4 ประเภทเรียบร้อยแล้ว");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.electricRate !== undefined && formData.electricRate < 0) {
      globalPopup.error("อัตราค่าไฟฟ้าไม่ถูกต้อง", "อัตราค่าไฟฟ้าต้องไม่ติดลบ (อย่างน้อย 0 บาท/หน่วย)");
      setActiveTab("rates");
      return;
    }
    if (formData.waterRate !== undefined && formData.waterRate < 0) {
      globalPopup.error("อัตราค่าน้ำประปาไม่ถูกต้อง", "อัตราค่าน้ำประปาต้องไม่ติดลบ (อย่างน้อย 0 บาท/หน่วย)");
      setActiveTab("rates");
      return;
    }
    if (formData.promptpayNumber && formData.promptpayNumber.trim() !== "") {
      if (!isValidPromptPayTarget(formData.promptpayNumber)) {
        globalPopup.error(
          "หมายเลขพร้อมเพย์ไม่ถูกต้อง!",
          "กรุณากรอกเบอร์โทรศัพท์ 10 หลัก (ขึ้นต้นด้วย 0) หรือเลขบัตรประชาชน/เลขนิติบุคคล 13 หลัก ตามมาตรฐานสากล PromptPay EMVCo"
        );
        setActiveTab("banking");
        return;
      }
    }
    if (formData.bankAccountNumber && formData.bankAccountNumber.trim() !== "") {
      if (!isValidBankAccount(formData.bankAccountNumber)) {
        globalPopup.error("เลขที่บัญชีไม่ถูกต้อง", "เลขที่บัญชีธนาคารต้องเป็นตัวเลข 10 - 15 หลัก");
        setActiveTab("banking");
        return;
      }
    }
    if (formData.lineWebhookUrl && formData.lineWebhookUrl.trim() !== "") {
      if (!isValidHttpsUrl(formData.lineWebhookUrl)) {
        globalPopup.error("Webhook URL ไม่ถูกต้อง", "LINE Webhook URL ต้องขึ้นต้นด้วย https:// ตามมาตรฐานความปลอดภัย");
        setActiveTab("line");
        return;
      }
    }
    onSaveSettings(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--foreground)] tracking-tight">
              ตั้งค่าหอพักสาขานี้ (Branch Settings)
            </h1>
            <p className="text-xs text-[var(--muted)]">
              จัดการอัตราค่าน้ำไฟ บัญชีธนาคารรับเงิน รอบการออกบิล และการเชื่อมต่อ LINE OA
            </p>
          </div>
        </div>


      </div>

      {/* 10-Tab Navigation Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto bg-[var(--card)] p-2 rounded-2xl border border-[var(--border)] pb-2 text-xs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--subtle)]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="bg-[var(--card)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
        {/* Tab 1: Building & General */}
        {activeTab === "building" && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-sm font-bold text-[var(--foreground)] border-b border-[var(--border)] pb-2">
              ข้อมูลทั่วไปของสาขา
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">ชื่อหอพัก / สาขา *</label>
                <input
                  type="text"
                  maxLength={100}
                  value={formData.branchName}
                  onChange={(e) => handleChange("branchName", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">ที่อยู่ของหอพัก *</label>
                <textarea
                  rows={2}
                  maxLength={300}
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">เบอร์โทรศัพท์สาขา</label>
                  <input
                    type="tel"
                    inputMode="tel"
                    maxLength={12}
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">ชื่อเจ้าของ / ผู้จัดการ</label>
                  <input
                    type="text"
                    maxLength={100}
                    value={formData.ownerName}
                    onChange={(e) => handleChange("ownerName", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

       {/* Tab 2: Room Types & Pricing */}
        {activeTab === "room-types" && (
          <div className="space-y-6">
            {/* Header & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                  <BedDouble className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  จัดการประเภทห้องพัก & อัตราค่าเช่ามาตรฐาน (Room Types)
                </h3>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  กำหนดประเภทห้องพักและค่าเช่ามาตรฐาน เพื่อให้ระบบดึงไปกรอกให้อัตโนมัติเมื่อสร้างห้องพักใหม่
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetRoomTypesToDefault}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--subtle)] hover:bg-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] text-xs font-medium transition cursor-pointer"
                  title="คืนค่าประเภทห้องมาตรฐาน 4 ประเภท"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>คืนค่าเริ่มต้น</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddRoomType}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มประเภทห้องพักใหม่</span>
                </button>
              </div>
            </div>

            {/* Summary Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)]">
                <div className="text-[11px] text-[var(--muted)] font-medium">ประเภทห้องทั้งหมด</div>
                <div className="text-lg font-bold text-[var(--foreground)] mt-0.5">
                  {roomTypesList.length} <span className="text-xs font-normal text-[var(--muted)]">แบบ</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)]">
                <div className="text-[11px] text-[var(--muted)] font-medium">ประเภทเริ่มต้น (Default)</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 truncate">
                  {roomTypesList.find((r) => r.isDefault)?.name || "-"}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)]">
                <div className="text-[11px] text-[var(--muted)] font-medium">ช่วงราคาค่าเช่า</div>
                <div className="text-sm font-bold text-[var(--foreground)] mt-1">
                  ฿{Math.min(...roomTypesList.map((r) => r.monthlyRate || 0)).toLocaleString()} - ฿{Math.max(...roomTypesList.map((r) => r.monthlyRate || 0)).toLocaleString()}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)]">
                <div className="text-[11px] text-[var(--muted)] font-medium">ห้องพักที่ใช้งานอยู่ในสาขานี้</div>
                <div className="text-lg font-bold text-teal-600 dark:text-teal-400 mt-0.5">
                  {rooms.length} <span className="text-xs font-normal text-[var(--muted)]">ห้อง</span>
                </div>
              </div>
            </div>

            {/* Room Types Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roomTypesList.map((rt) => {
                const assignedCount = getRoomUsageCount(rt.name, rt.isDefault);
                return (
                  <div
                    key={rt.id}
                    className={`relative p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                      rt.isDefault
                        ? "bg-gradient-to-br from-emerald-500/5 via-[var(--card)] to-[var(--card)] border-emerald-500/40 shadow-sm shadow-emerald-500/10 ring-1 ring-emerald-500/20"
                        : "bg-[var(--card)] border-[var(--border)] hover:border-[var(--muted)]"
                    }`}
                  >
                    <div>
                      {/* Top Badges & Title */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                              rt.isDefault
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                : "bg-[var(--subtle)] text-[var(--muted)] border border-[var(--border)]"
                            }`}
                          >
                            <BedDouble className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-1.5">
                              {rt.name}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {rt.isDefault && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                  <Star className="w-2.5 h-2.5 fill-current" />
                                  ค่าเริ่มต้น
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--subtle)] text-[var(--muted)] border border-[var(--border)]">
                                <DoorOpen className="w-2.5 h-2.5" />
                                มี {assignedCount} ห้อง
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Pricing Box */}
                      <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[var(--subtle)]/70 border border-[var(--border)]/70 mb-3">
                        <div>
                          <div className="text-[10px] text-[var(--muted)] font-medium">ค่าเช่ารายเดือน</div>
                          <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                            ฿{Number(rt.monthlyRate || 0).toLocaleString()}
                            <span className="text-[10px] font-normal text-[var(--muted)]"> /เดือน</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[var(--muted)] font-medium">ค่าเช่ารายวัน</div>
                          <div className="text-sm font-extrabold text-teal-600 dark:text-teal-400">
                            ฿{Number(rt.dailyRate || 0).toLocaleString()}
                            <span className="text-[10px] font-normal text-[var(--muted)]"> /คืน</span>
                          </div>
                        </div>
                      </div>

                      {/* Description / Features */}
                      {rt.description && (
                        <p className="text-xs text-[var(--muted)] line-clamp-2 mb-4 leading-relaxed bg-[var(--subtle)]/30 p-2.5 rounded-lg border border-[var(--border)]/50">
                          {rt.description}
                        </p>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] mt-2">
                      <div>
                        {!rt.isDefault ? (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultRoomType(rt.id)}
                            className="inline-flex items-center gap-1 text-[11px] text-[var(--muted)] hover:text-emerald-600 transition font-medium cursor-pointer"
                          >
                            <Star className="w-3 h-3" />
                            <span>ตั้งเป็นค่าเริ่มต้น</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            เป็นประเภทหลัก
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditRoomType(rt)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--subtle)] hover:bg-[var(--border)] text-[var(--foreground)] text-xs font-semibold transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                          <span>แก้ไข</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRoomType(rt)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--subtle)] hover:bg-rose-500/10 text-[var(--muted)] hover:text-rose-600 text-xs font-semibold transition cursor-pointer"
                          title={assignedCount > 0 ? `ไม่สามารถลบได้เนื่องจากมีห้องใช้งานอยู่ ${assignedCount} ห้อง` : "ลบประเภทห้องนี้"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ลบ</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Note banner */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2.5 leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>หมายเหตุสำคัญ:</strong> หลังจากเพิ่มหรือแก้ไขประเภทห้องพักแล้ว กรุณากดปุ่ม <strong>"บันทึกการตั้งค่า"</strong> ด้านล่างขวา เพื่อบันทึกข้อมูลประเภทห้องพักลงฐานข้อมูลอย่างถาวรครับ
              </div>
            </div>
          </div>
        )}
        
        {activeTab === "rates" && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-sm font-bold text-[var(--foreground)] border-b border-[var(--border)] pb-2">
              อัตราค่าสาธารณูปโภคและบริการ
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[var(--subtle)] border border-[var(--border)] space-y-3">
                <div className="flex items-center gap-2 text-amber-500 font-bold text-xs">
                  <Zap className="w-4 h-4" /> ค่าไฟฟ้า
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--muted)] mb-1">อัตราค่าไฟ (บาท/หน่วย) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.electricRate}
                    onChange={(e) => handleChange("electricRate", Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] text-xs font-bold text-amber-600 dark:text-amber-400"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="useMinElec"
                    checked={formData.useMinElectric}
                    onChange={(e) => handleChange("useMinElectric", e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <label htmlFor="useMinElec" className="text-xs text-[var(--foreground)]">
                    คิดค่าไฟขั้นต่ำ ({formData.minElectricFee} บาท)
                  </label>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[var(--subtle)] border border-[var(--border)] space-y-3">
                <div className="flex items-center gap-2 text-blue-500 font-bold text-xs">
                  <Droplets className="w-4 h-4" /> ค่าน้ำประปา
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--muted)] mb-1">อัตราค่าน้ำ (บาท/หน่วย) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.waterRate}
                    onChange={(e) => handleChange("waterRate", Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] text-xs font-bold text-blue-600 dark:text-blue-400"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="useMinWater"
                    checked={formData.useMinWater}
                    onChange={(e) => handleChange("useMinWater", e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <label htmlFor="useMinWater" className="text-xs text-[var(--foreground)]">
                    คิดค่าน้ำขั้นต่ำ ({formData.minWaterFee} บาท)
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Rates */}
        {activeTab === "billing" && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-sm font-bold text-[var(--foreground)] border-b border-[var(--border)] pb-2">
              รอบวันตัดบิลและกำหนดชำระ
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">วันที่ตัดรอบบิล (เช่น 25)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.billCycleDay}
                  onChange={(e) => handleChange("billCycleDay", Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)] font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">วันครบกำหนดชำระ (เช่น 5)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.billDueDay}
                  onChange={(e) => handleChange("billDueDay", Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)] font-bold text-rose-600 dark:text-rose-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">ค่าปรับชำระล่าช้า (บาท/วัน)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.lateFeePerDay}
                  onChange={(e) => handleChange("lateFeePerDay", Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)] font-bold"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Banking & QR */}
        {activeTab === "banking" && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-sm font-bold text-[var(--foreground)] border-b border-[var(--border)] pb-2">
              บัญชีธนาคารรับเงิน & PromptPay QR
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">ธนาคาร *</label>
                <select
                  value={formData.bankName}
                  onChange={(e) => handleChange("bankName", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)] font-semibold cursor-pointer focus:outline-emerald-500"
                >
                  <option value="">-- เลือกธนาคาร --</option>
                  {THAI_BANKS.map((b) => (
                    <option key={b.code} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                  {formData.bankName && !THAI_BANKS.some((b) => b.name === formData.bankName) && (
                    <option value={formData.bankName}>{formData.bankName}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">เลขที่บัญชี *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={15}
                  placeholder="เช่น 123-4-56789-0"
                  value={formData.bankAccountNumber}
                  onChange={(e) => handleChange("bankAccountNumber", e.target.value.replace(/[^\d-]/g, "").slice(0, 15))}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs font-mono text-[var(--foreground)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">หมายเลขพร้อมเพย์ (เบอร์โทร 10 หลัก / เลขบัตร 13 หลัก)</label>
                <input
                  type="text"
                  value={formData.promptpayNumber || ""}
                  onChange={(e) => handleChange("promptpayNumber", e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="เช่น 0812345678 หรือ 1234567890123"
                  maxLength={13}
                  className={`w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border text-xs font-mono text-[var(--foreground)] transition ${
                    formData.promptpayNumber && !isValidPromptPayTarget(formData.promptpayNumber)
                      ? "border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                      : "border-[var(--border)] focus:border-emerald-500"
                  }`}
                />
                {formData.promptpayNumber && !isValidPromptPayTarget(formData.promptpayNumber) && (
                  <p className="text-[10px] text-rose-500 mt-1 font-medium">
                    ⚠️ ต้องเป็นเบอร์มือถือ 10 หลัก หรือเลขบัตร ปชช./นิติบุคคล 13 หลัก (ปัจจุบัน: {formData.promptpayNumber.length} หลัก)
                  </p>
                )}
                {formData.promptpayNumber && isValidPromptPayTarget(formData.promptpayNumber) && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                    ✓ รูปแบบถูกต้อง ({formData.promptpayNumber.length === 10 ? "เบอร์มือถือ 10 หลัก" : "เลขบัตร/นิติบุคคล 13 หลัก"})
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">ชื่อบัญชีพร้อมเพย์</label>
                <input
                  type="text"
                  value={formData.promptpayName || ""}
                  onChange={(e) => handleChange("promptpayName", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: LINE OA */}
        {activeTab === "line" && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-sm font-bold text-[var(--foreground)] border-b border-[var(--border)] pb-2">
              การเชื่อมต่อ LINE Official Account
            </h3>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              นำข้อมูลจาก LINE Developers Console (Messaging API) มากรอก เพื่อให้ระบบสามารถส่งบิลแจ้งหนี้ และรับแจ้งซ่อมจากผู้เช่าได้อัตโนมัติ
            </p>

            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">Webhook URL (นำไปใส่ที่ LINE Console)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={formData.lineWebhookUrl || "https://api.pakdee.app/webhook/line/branch-1"}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs font-mono text-emerald-600 dark:text-emerald-400 select-all"
                />
                <button
                  type="button"
                  onClick={() => globalPopup.info("คัดลอกสำเร็จ", "คัดลอก Webhook URL เรียบร้อยแล้ว")}
                  className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold shrink-0"
                >
                  คัดลอก
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">Channel Access Token (Long-lived)</label>
              <textarea
                rows={3}
                value={formData.lineChannelAccessToken || ""}
                onChange={(e) => handleChange("lineChannelAccessToken", e.target.value)}
                placeholder="ey..."
                className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs font-mono text-[var(--foreground)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">Channel Secret</label>
              <input
                type="password"
                value={formData.lineChannelSecret || ""}
                onChange={(e) => handleChange("lineChannelSecret", e.target.value)}
                placeholder="••••••••••••••••••••••••••••••••"
                className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs font-mono text-[var(--foreground)]"
              />
            </div>

            {/* Share LINE OA to Tenants Box */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <div className="font-bold text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>ส่งต่อ LINE OA ให้ผู้เช่า (Share to Tenants)</span>
                </div>
                <span className="text-[10px] bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-full">
                  พร้อมใช้งาน
                </span>
              </div>
              <p className="text-[11px] text-[var(--muted)]">
                แชร์ลิงก์นี้ให้ผู้เช่าเพิ่มเพื่อน LINE OA เพื่อรับบิลแจ้งหนี้ แจ้งโอนเงิน และแจ้งซ่อมด้วยตนเอง
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`https://line.me/R/ti/p/@pakdee_${formData.branchName ? encodeURIComponent(formData.branchName) : "mansion"}`}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] text-xs font-mono text-[var(--foreground)] select-all"
                />
                <button
                  type="button"
                  onClick={() => globalPopup.info("คัดลอกสำเร็จ", "คัดลอกลิงก์ส่งต่อ LINE OA ให้ผู้เช่าเรียบร้อยแล้ว!")}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0 transition cursor-pointer"
                >
                  คัดลอกลิงก์
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Contract Terms */}
        {activeTab === "contract" && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-sm font-bold text-[var(--foreground)] border-b border-[var(--border)] pb-2">
              ข้อกำหนดและเงื่อนไขในสัญญาเช่ามาตรฐาน
            </h3>
            <textarea
              rows={8}
              value={formData.contractTerms || ""}
              onChange={(e) => handleChange("contractTerms", e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)] leading-relaxed"
            />
          </div>
        )}

        {/* Tab 7: Signature */}
        {activeTab === "signature" && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-sm font-bold text-[var(--foreground)] border-b border-[var(--border)] pb-2 flex items-center justify-between">
              <span>ลายเซ็นและตราประทับอิเล็กทรอนิกส์</span>
              <span className="text-[11px] font-normal text-[var(--muted)]">ใช้ประทับบนสัญญาเช่าและใบเสร็จรับเงินอัตโนมัติ</span>
            </h3>

            {/* Hidden Native File Inputs */}
            <input
              ref={signatureInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
              onChange={handleSignatureUpload}
              className="hidden"
            />
            <input
              ref={stampInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
              onChange={handleStampUpload}
              className="hidden"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Signature Upload Card */}
              <div className="p-5 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] text-center space-y-3 transition hover:border-emerald-500/50">
                <div className="text-xs font-bold text-[var(--foreground)]">ลายเซ็นผู้มีอำนาจ / เจ้าของหอพัก</div>
                <div className="text-[10px] text-[var(--muted)]">แนะนำไฟล์ PNG พื้นหลังโปร่งใส (ขนาดไม่เกิน 2MB)</div>

                {formData.signatureUrl ? (
                  <div className="space-y-2">
                    <div className="h-28 flex items-center justify-center p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[var(--border)]">
                      <img
                        src={formData.signatureUrl}
                        alt="ลายเซ็นผู้มีอำนาจ"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => signatureInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-[var(--subtle)] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold text-[var(--foreground)] transition cursor-pointer"
                      >
                        เปลี่ยนรูป
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange("signatureUrl", "")}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 text-xs font-semibold transition cursor-pointer"
                      >
                        ลบออก
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => signatureInputRef.current?.click()}
                    className="p-4 rounded-xl border border-[var(--border)] bg-[var(--subtle)] hover:bg-emerald-500/5 hover:border-emerald-500/40 transition cursor-pointer space-y-2"
                  >
                    <Upload className="w-6 h-6 mx-auto text-emerald-600 dark:text-emerald-400" />
                    <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      คลิกเพื่อเลือกไฟล์ลายเซ็น
                    </div>
                    <div className="text-[10px] text-[var(--muted)]">รองรับ PNG, JPG, WebP</div>
                  </div>
                )}
              </div>

              {/* Stamp Upload Card */}
              <div className="p-5 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] text-center space-y-3 transition hover:border-emerald-500/50">
                <div className="text-xs font-bold text-[var(--foreground)]">ตราประทับหอพัก (Stamp / Seal)</div>
                <div className="text-[10px] text-[var(--muted)]">แนะนำไฟล์ PNG พื้นหลังโปร่งใส สำหรับประทับคู่กับสัญญา</div>

                {formData.stampUrl ? (
                  <div className="space-y-2">
                    <div className="h-28 flex items-center justify-center p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[var(--border)]">
                      <img
                        src={formData.stampUrl}
                        alt="ตราประทับหอพัก"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => stampInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-[var(--subtle)] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold text-[var(--foreground)] transition cursor-pointer"
                      >
                        เปลี่ยนรูป
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange("stampUrl", "")}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 text-xs font-semibold transition cursor-pointer"
                      >
                        ลบออก
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => stampInputRef.current?.click()}
                    className="p-4 rounded-xl border border-[var(--border)] bg-[var(--subtle)] hover:bg-emerald-500/5 hover:border-emerald-500/40 transition cursor-pointer space-y-2"
                  >
                    <Upload className="w-6 h-6 mx-auto text-emerald-600 dark:text-emerald-400" />
                    <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      คลิกเพื่อเลือกไฟล์ตราประทับ
                    </div>
                    <div className="text-[10px] text-[var(--muted)]">รองรับ PNG, JPG, WebP</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 8: Notifications */}
        {activeTab === "notifications" && (
          <div className="space-y-3 max-w-2xl">
            <h3 className="text-sm font-bold text-[var(--foreground)] border-b border-[var(--border)] pb-2">
              ระบบแจ้งเตือนอัตโนมัติ (Automated LINE Alerts)
            </h3>
            {[
              { label: "แจ้งเตือนบิลออกใหม่ทันที (วันที่ 25)", checked: true },
              { label: "แจ้งเตือนก่อนครบกำหนดชำระ 2 วัน (วันที่ 3)", checked: true },
              { label: "แจ้งเตือนเกินกำหนดชำระ พร้อมค่าปรับ (วันที่ 6)", checked: true },
              { label: "แจ้งเตือนพัสดุเข้าถึงผู้เช่าทันทีที่ลงทะเบียน", checked: true },
              { label: "แจ้งเตือนความคืบหน้างงานซ่อม (ช่างรับงาน/ซ่อมเสร็จ)", checked: true },
            ].map((notif, idx) => (
              <label key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--subtle)] border border-[var(--border)] cursor-pointer text-xs">
                <input type="checkbox" defaultChecked={notif.checked} className="rounded text-emerald-600" />
                <span className="text-[var(--foreground)] font-medium">{notif.label}</span>
              </label>
            ))}
          </div>
        )}

        {/* Tab 9: Permissions */}
        {activeTab === "permissions" && (
          <div className="space-y-3 max-w-2xl">
            <h3 className="text-sm font-bold text-[var(--foreground)] border-b border-[var(--border)] pb-2">
              สิทธิ์การเข้าถึงของผู้ดูแลระบบ (Roles & Permissions)
            </h3>
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-[var(--subtle)] border border-[var(--border)] flex items-center justify-between">
                <div>
                  <div className="font-bold text-[var(--foreground)]">เจ้าของหอพัก (Owner)</div>
                  <div className="text-[11px] text-[var(--muted)]">สิทธิ์สูงสุด จัดการการเงิน ดูสรุปบัญชี แก้ไขผังห้อง</div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">Active</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--subtle)] border border-[var(--border)] flex items-center justify-between">
                <div>
                  <div className="font-bold text-[var(--foreground)]">ผู้จัดการ / แอดมิน (Manager)</div>
                  <div className="text-[11px] text-[var(--muted)]">จดมิเตอร์ ออกบิล รับสลิป ตรวจพัสดุ แจ้งซ่อม</div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 font-bold text-[10px]">Active</span>
              </div>
            </div>
          </div>
        )}


        <div className="mt-8 border-t border-[var(--border)] pt-5 flex justify-end">
        <button type="button"
          onClick={handleSave}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-md shadow-emerald-500/20 transition cursor-pointer text-xs"
        >
          {isSaved ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>บันทึกสำเร็จแล้ว</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>บันทึกการตั้งค่า</span>
            </>
          )}
        </button>
        </div>
      </div>
      {/* Modal: เพิ่ม / แก้ไขประเภทห้องพัก */}
      {isRoomTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--card)] w-full max-w-md rounded-2xl border border-[var(--border)] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <BedDouble className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-[var(--foreground)]">
                  {editingRoomTypeId ? "แก้ไขประเภทห้องพัก" : "เพิ่มประเภทห้องพักใหม่"}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsRoomTypeModalOpen(false)}
                className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--subtle)] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRoomType} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  ชื่อประเภทห้องพัก *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ห้องแอร์ (มาตรฐาน), ห้องพัดลมริมสวน"
                  value={roomTypeForm.name}
                  onChange={(e) => setRoomTypeForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                    ค่าเช่ารายเดือน (บาท) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={roomTypeForm.monthlyRate}
                    onChange={(e) =>
                      setRoomTypeForm((prev) => ({ ...prev, monthlyRate: Number(e.target.value) }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs font-extrabold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                    ค่าเช่ารายวัน (บาท)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={roomTypeForm.dailyRate}
                    onChange={(e) =>
                      setRoomTypeForm((prev) => ({ ...prev, dailyRate: Number(e.target.value) }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs font-extrabold text-teal-600 dark:text-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  สิ่งอำนวยความสะดวก & รายละเอียดห้อง
                </label>
                <textarea
                  rows={2}
                  placeholder="เช่น แอร์, เตียง 5 ฟุต, ตู้เสื้อผ้า, เครื่องทำน้ำอุ่น, ระเบียง"
                  value={roomTypeForm.description}
                  onChange={(e) =>
                    setRoomTypeForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)] leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <label className="flex items-center gap-2 p-3 rounded-xl bg-[var(--subtle)] border border-[var(--border)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={roomTypeForm.isDefault}
                  onChange={(e) =>
                    setRoomTypeForm((prev) => ({ ...prev, isDefault: e.target.checked }))
                  }
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs font-medium text-[var(--foreground)]">
                  ตั้งเป็นประเภทห้องเริ่มต้น (Default เมื่อสร้างห้องใหม่)
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsRoomTypeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--subtle)] hover:bg-[var(--border)] text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition cursor-pointer"
                >
                  บันทึกประเภทห้อง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
