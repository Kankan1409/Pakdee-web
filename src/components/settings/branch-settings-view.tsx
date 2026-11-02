"use client";

import React, { useState, useEffect, useRef } from "react";
import { BranchSettingsDetail, Property } from "@/types/dormitory";
import { isValidPromptPayTarget } from "@/lib/promptpay";
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
} from "lucide-react";

interface BranchSettingsViewProps {
  settings: BranchSettingsDetail;
  onSaveSettings: (updated: Partial<BranchSettingsDetail>) => void;
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
}: BranchSettingsViewProps) {
  const [activeTab, setActiveTab] = useState<string>("building");
  const [formData, setFormData] = useState<BranchSettingsDetail>(settings);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const prevBranchIdRef = useRef<string>(settings?.id || "");

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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.promptpayNumber && formData.promptpayNumber.trim() !== "") {
      if (!isValidPromptPayTarget(formData.promptpayNumber)) {
        alert("⚠️ หมายเลขพร้อมเพย์ไม่ถูกต้อง!\nกรุณากรอกเบอร์โทรศัพท์ 10 หลัก (ขึ้นต้นด้วย 0) หรือเลขบัตรประชาชน/เลขนิติบุคคล 13 หลัก ตามมาตรฐานสากล PromptPay EMVCo");
        setActiveTab("banking");
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

        <button
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
                  value={formData.branchName}
                  onChange={(e) => handleChange("branchName", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">ที่อยู่ของหอพัก *</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">เบอร์โทรศัพท์สาขา</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">ชื่อเจ้าของ / ผู้จัดการ</label>
                  <input
                    type="text"
                    value={formData.ownerName}
                    onChange={(e) => handleChange("ownerName", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Rates */}
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

        {/* Tab 3: Billing & Late Fee */}
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
                  value={formData.bankAccountNumber}
                  onChange={(e) => handleChange("bankAccountNumber", e.target.value)}
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
                  onClick={() => alert("คัดลอก Webhook URL เรียบร้อยแล้ว")}
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
                  onClick={() => alert("คัดลอกลิงก์ส่งต่อ LINE OA ให้ผู้เช่าเรียบร้อยแล้ว!")}
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

        {/* Bottom Save Bar for All Tabs */}
        <div className="mt-8 pt-5 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--subtle)] -mx-6 -mb-6 p-4 rounded-b-2xl">
          <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>บันทึกการตั้งค่าระบบและอัปเดตฐานข้อมูลโฮสต์ทันที (Persistent Host-Sync)</span>
          </div>
          <button
            onClick={handleSave}
            type="button"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold shadow-md shadow-emerald-500/20 transition cursor-pointer text-xs"
          >
            {isSaved ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>บันทึกสำเร็จเรียบร้อย ✓</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>บันทึกการตั้งค่า (Save Settings)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
