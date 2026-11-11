"use client";

import React, { useState } from "react";
import { Property } from "@/types/dormitory";
import { PakdeeLogo } from "@/components/ui/pakdee-logo";
import { useAuth } from "@/lib/auth-context";
import { globalPopup } from "@/lib/popup-context";
import {
  Building2,
  Plus,
  ArrowRight,
  Bell,
  LogOut,
  MapPin,
  Pencil,
  Building,
  Check,
  X,
  Sparkles,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  Settings,
  AlertTriangle,
  ShieldAlert,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  Info,
  Upload,
  Image as ImageIcon,
} from "lucide-react";

export interface BranchItem extends Property {
  totalRooms: number;
  vacantRooms?: number;
  occupiedRooms?: number;
  dailyRooms?: number;
  buildingName?: string;
}

interface BranchSelectorViewProps {
  branches: BranchItem[];
  currentPropertyId: string;
  onSelectBranch: (branch: BranchItem) => void;
  onOpenSettings?: (branch: BranchItem) => void;
  onCreateBranch: (branchData: {
    name: string;
    address: string;
    phone: string;
    ownerName?: string;
    promptpayNumber: string;
    promptpayName: string;
    electricRate: number;
    waterRate: number;
    initialRoomCount: number;
    imageUrl?: string;
  }) => Promise<boolean>;
  onUpdateBranch?: (branchId: string, updates: Partial<Property>) => Promise<boolean>;
  onDeleteBranch?: (branchId: string) => Promise<boolean>;
  onClose?: () => void;
  onLogout?: () => void;
}

export function BranchSelectorView({
  branches,
  currentPropertyId,
  onSelectBranch,
  onOpenSettings,
  onCreateBranch,
  onUpdateBranch,
  onDeleteBranch,
  onClose,
  onLogout,
}: BranchSelectorViewProps) {
  const { currentUser, logout: authLogout, verifyPassword } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchItem | null>(null);

  // High-Security Branch Deletion with Login Password State
  const [branchToDelete, setBranchToDelete] = useState<BranchItem | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [isDeletingBranch, setIsDeletingBranch] = useState(false);

  const [form, setForm] = useState({
    name: "",
    ownerName: "",
    address: "",
    phone: "",
    promptpayNumber: "",
    promptpayName: "",
    electricRate: 8,
    waterRate: 18,
    initialRoomCount: 0,
    imageUrl: "",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    ownerName: "",
    address: "",
    phone: "",
    promptpayNumber: "",
    promptpayName: "",
    electricRate: 8,
    waterRate: 18,
    imageUrl: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "create" | "edit"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      globalPopup.error(
        "ขนาดไฟล์เกินกำหนด",
        "ขนาดไฟล์รูปภาพเกิน 5MB กรุณาเลือกไฟล์รูปภาพที่มีขนาดไม่เกิน 5MB"
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (target === "edit") {
        setEditForm((prev) => ({ ...prev, imageUrl: result }));
      } else {
        setForm((prev) => ({ ...prev, imageUrl: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOpenEdit = (branch: BranchItem) => {
    setEditingBranch(branch);
    setEditForm({
      name: branch.name,
      ownerName: branch.ownerName || "",
      address: branch.address || "",
      phone: branch.phone || "",
      promptpayNumber: branch.promptpayNumber || "",
      promptpayName: branch.promptpayName || "",
      electricRate: branch.electricRate || 8,
      waterRate: branch.waterRate || 18,
      imageUrl: branch.imageUrl || "",
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch || !editForm.name.trim()) {
      setFormError("กรุณากรอกชื่อสาขาหอพัก");
      return;
    }
    setIsSubmitting(true);
    try {
      if (onUpdateBranch) {
        const ok = await onUpdateBranch(editingBranch.id, {
          name: editForm.name.trim(),
          ownerName: editForm.ownerName.trim(),
          address: editForm.address,
          phone: editForm.phone,
          promptpayNumber: editForm.promptpayNumber,
          promptpayName: editForm.promptpayName,
          electricRate: Number(editForm.electricRate),
          waterRate: Number(editForm.waterRate),
          imageUrl: editForm.imageUrl || "",
        });
        if (ok) {
          setIsEditModalOpen(false);
          setEditingBranch(null);
        } else {
          setFormError("ไม่สามารถบันทึกการแก้ไขได้ กรุณาลองใหม่อีกครั้ง");
        }
      }
    } catch {
      setFormError("เกิดข้อผิดพลาดในการแก้ไขข้อมูลสาขา");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      authLogout();
    }
  };

  const handleConfirmDeleteBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchToDelete) return;
    if (!deletePassword.trim()) {
      setDeleteError("กรุณากรอกรหัสผ่านเข้าสู่ระบบของคุณเพื่อยืนยัน");
      return;
    }

    // Verify Password with login password
    if (!verifyPassword(deletePassword)) {
      setDeleteError("รหัสผ่านไม่ถูกต้อง กรุณาระบุรหัสผ่านเข้าสู่ระบบของคุณ (เช่น P12345)");
      return;
    }

    setIsDeletingBranch(true);
    setDeleteError(null);
    try {
      if (onDeleteBranch) {
        const ok = await onDeleteBranch(branchToDelete.id);
        if (ok) {
          setBranchToDelete(null);
          setDeletePassword("");
          setDeleteError(null);
        } else {
          setDeleteError("เกิดข้อผิดพลาดในการลบสาขา กรุณาลองใหม่อีกครั้ง");
        }
      }
    } catch {
      setDeleteError("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล");
    } finally {
      setIsDeletingBranch(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "สวัสดีตอนเช้า ☀️";
    if (hour < 17) return "สวัสดีตอนบ่าย 🌤️";
    return "สวัสดีตอนเย็น 🌙";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) {
      setFormError("กรุณากรอกชื่อสาขาหอพัก");
      return;
    }
    setIsSubmitting(true);
    try {
      const ok = await onCreateBranch(form);
      if (ok) {
        setIsModalOpen(false);
        setForm({
          name: "",
          ownerName: "",
          address: "",
          phone: "",
          promptpayNumber: "",
          promptpayName: "",
          electricRate: 8,
          waterRate: 18,
          initialRoomCount: 0,
          imageUrl: "",
        });
      } else {
        setFormError("ไม่สามารถสร้างสาขาได้ กรุณาลองใหม่อีกครั้ง");
      }
    } catch {
      setFormError("เกิดข้อผิดพลาดในการสร้างสาขาหอพัก");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* 1. Top Navbar with Official PAKDEE Branding */}
      <header className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        {/* Brand Logo AP */}
        <PakdeeLogo size="sm" showText={true} subtitle="APARTMENT MANAGEMENT" />

        {/* User Profile & Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 px-3.5 py-1.5 rounded-full shadow-xs text-xs font-semibold">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
              {currentUser?.avatarText || "พด"}
            </div>
            <div className="flex flex-col text-left">
              <span className="leading-tight">{currentUser?.name || "คุณพักดี มีสุข"}</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal leading-none">
                {currentUser?.roleTitle || "เจ้าของหอพัก (Owner)"}
              </span>
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="ไม่มีการแจ้งเตือนด่วน"
            >
              <Bell className="w-4 h-4" />
            </button>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900/60 transition cursor-pointer"
            title="ออกจากระบบ"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ออกจากระบบ</span>
          </button>

          {onClose && branches.length > 0 && (
            <button
              onClick={onClose}
              type="button"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer border border-slate-200 dark:border-slate-800"
              title="กลับไปหน้าแดชบอร์ด"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* 2. Hero Header */}
      <div className="text-center pt-10 pb-6 px-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{getGreeting()}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          เลือกสาขาหอพัก PAKDEE
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          เลือกสาขาที่ท่านต้องการเข้าจัดการผังห้อง จดมิเตอร์ ออกใบแจ้งหนี้ หรือสร้างสาขาใหม่ได้ทันที
        </p>
      </div>

      {/* 3. Main Center Container Card (PAKDEE Bento UI) */}
      <div className="max-w-5xl w-full mx-auto px-4 pb-16 flex-1">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          {/* Top Card Action Bar */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-bold text-sm">
              <Building2 className="w-4 h-4 text-emerald-500" />
              <span>สาขาหอพักทั้งหมดในระบบ ({branches.length} สาขา)</span>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>+ เพิ่มสาขาใหม่</span>
            </button>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Existing Branch Cards */}
            {branches.map((b) => {
              const isSelected = b.id === currentPropertyId;
              return (
                <div
                  key={b.id}
                  onClick={() => onSelectBranch(b)}
                  className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 sm:p-6 flex flex-col items-center text-center transition hover:shadow-xl group cursor-pointer ${
                    isSelected
                      ? "border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/15 bg-emerald-50/10 dark:bg-emerald-950/10"
                      : "border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500/50"
                  }`}
                >
                  {/* Top Bar Row: Status Badge on Left, Action Buttons on Right (No Overlap) */}
                  <div className="w-full flex items-center justify-between min-h-[32px] mb-3">
                    <div>
                      {isSelected ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-bold shadow-xs">
                          <Check className="w-3.5 h-3.5" />
                          <span>สาขาที่ใช้งานอยู่</span>
                        </div>
                      ) : (
                        <div className="w-2" />
                      )}
                    </div>

                    {/* Action Buttons: Settings, Edit & Delete */}
                    <div className="flex items-center gap-1 z-10" onClick={(e) => e.stopPropagation()}>
                      {onOpenSettings && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenSettings(b);
                          }}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                          title={`ตั้งค่าทั้งหมดของสาขา ${b.name} (9 แท็บ: ค่าน้ำไฟ, ธนาคาร, LINE OA ฯลฯ)`}
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(b);
                        }}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                        title={`แก้ไขข้อมูลสาขา ${b.name}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {onDeleteBranch && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBranchToDelete(b);
                            setDeletePassword("");
                            setDeleteError(null);
                          }}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title={`ลบสาขา ${b.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Branch Photo or Architectural Icon Badge */}
                  <div className="w-20 h-20 mb-3 flex items-center justify-center">
                    {b.imageUrl ? (
                      <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 group-hover:scale-105 transition-transform flex items-center justify-center">
                        <img
                          src={b.imageUrl}
                          alt={b.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-slate-800 text-white flex items-center justify-center shadow-lg shadow-emerald-600/25 group-hover:scale-105 transition-transform">
                        <Building2 className="w-9 h-9 text-emerald-100" />
                      </div>
                    )}
                  </div>

                  {/* Branch Name */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-white truncate max-w-full px-2">
                    {b.name}
                  </h3>

                  {/* Room Count & Status Badge */}
                  <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
                    <div className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                      <Building className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{b.totalRooms} ห้อง</span>
                    </div>
                    {b.vacantRooms !== undefined && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-900/40 px-2.5 py-0.5 rounded-full border border-emerald-300/60">
                        ว่าง {b.vacantRooms}
                      </span>
                    )}
                    {b.occupiedRooms !== undefined && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                        มีผู้พัก {b.occupiedRooms}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      เปิดบริการ
                    </span>
                  </div>

                  {/* Location Address */}
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate max-w-full px-2">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{b.address || "กรุงเทพฯ"}</span>
                  </div>

                  {/* Select Branch Action Button */}
                  <button
                    onClick={() => onSelectBranch(b)}
                    className={`mt-6 w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                      isSelected
                        ? "bg-emerald-600 text-white shadow-emerald-600/20"
                        : "bg-slate-100 hover:bg-emerald-600 text-slate-700 hover:text-white dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-emerald-600"
                    }`}
                  >
                    <span>{isSelected ? "กำลังใช้งานสาขานี้" : "เข้าจัดการสาขานี้"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            {/* Empty State Banner if all branches deleted */}
            {branches.length === 0 && (
              <div className="col-span-full py-12 px-6 rounded-3xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                  <Building2 className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  ยังไม่มีสาขาหอพักในระบบ (No Active Branches)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                  คุณได้ลบสาขาทั้งหมดออกเรียบร้อยแล้ว ท่านสามารถกดปุ่ม <strong>"+ เพิ่มสาขาใหม่"</strong> ด้านล่างเพื่อเริ่มต้นสร้างสาขาใหม่ตั้งแต่ต้นได้ทันที
                </p>
              </div>
            )}

            {/* Add New Branch Card (Dashed Bento Card) */}
            <div
              onClick={() => setIsModalOpen(true)}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-50/50 hover:bg-emerald-50/20 dark:bg-slate-900/50 min-h-[260px] group"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform mb-3">
                <Plus className="w-7 h-7" />
              </div>
              <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                เพิ่มสาขาใหม่
              </div>
              <div className="text-xs text-slate-400 mt-1 max-w-[160px]">
                ขยายหอพัก / อพาร์ตเมนต์สาขาใหม่ในระบบ PAKDEE
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Modal: Add New Branch */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                  +
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    สร้างสาขาหอพักใหม่
                  </h3>
                  <div className="text-[11px] text-slate-400">
                    กำหนดข้อมูลและอัตราค่าน้ำค่าไฟของสาขา
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              {/* Branch Photo Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                    รูปภาพหอพัก / ป้ายสาขา
                  </span>
                  {form.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, imageUrl: "" })}
                      className="text-[11px] text-rose-500 hover:text-rose-600 font-semibold cursor-pointer"
                    >
                      ลบรูปภาพ
                    </button>
                  )}
                </label>

                {form.imageUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 h-36 bg-slate-100 dark:bg-slate-800 flex items-center justify-center group shadow-xs">
                    <img
                      src={form.imageUrl}
                      alt="Dormitory preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <label className="px-3 py-1.5 rounded-xl bg-white/95 hover:bg-white text-slate-800 text-xs font-bold cursor-pointer shadow-md transition flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <span>เปลี่ยนรูป</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e, "create")}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, imageUrl: "" })}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer shadow-md transition flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ลบรูป</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition group">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      คลิกเพื่ออัปโหลดรูปหอพัก
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      JPG, PNG, WebP (ขนาดไม่เกิน 5MB)
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, "create")}
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อสาขาหอพัก <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น พักดี แมนชั่น (สาขา 2)"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อเจ้าของ / ผู้จัดการ
                </label>
                <input
                  type="text"
                  placeholder="เช่น คุณสมชาย พักดี"
                  value={form.ownerName}
                  onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ที่อยู่ / ทำเลที่ตั้ง
                </label>
                <input
                  type="text"
                  placeholder="เช่น 456 ซอยสุขุมวิท 71 กรุงเทพฯ"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                />
              </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    เบอร์โทรติดต่อ
                  </label>
                  <input
                    type="text"
                    placeholder="081-234-5678"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                     className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  />
                </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ค่าไฟ (บาท/หน่วย)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={form.electricRate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        electricRate: parseFloat(e.target.value) || 8,
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ค่าน้ำ (บาท/หน่วย)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={form.waterRate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        waterRate: parseFloat(e.target.value) || 18,
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  หมายเลขพร้อมเพย์รับชำระ
                </label>
                <input
                  type="text"
                  placeholder="0812345678 หรือ เลขประจำตัวผู้เสียภาษี"
                  value={form.promptpayNumber}
                  onChange={(e) =>
                    setForm({ ...form, promptpayNumber: e.target.value })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isSubmitting ? "กำลังบันทึก..." : "ยืนยันสร้างสาขา"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal: Edit Branch */}
      {isEditModalOpen && editingBranch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    แก้ไขข้อมูลสาขาหอพัก
                  </h3>
                  <div className="text-[11px] text-slate-400">
                    ปรับเปลี่ยนชื่อสาขา รูปภาพ ทำเลที่ตั้ง และอัตราค่าน้ำค่าไฟ
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3.5">
              {/* Dormitory / Branch Photo Section */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                    รูปภาพหอพัก / ป้ายสาขา
                  </span>
                  {editForm.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, imageUrl: "" })}
                      className="text-[11px] text-rose-500 hover:text-rose-600 font-semibold cursor-pointer"
                    >
                      ลบรูปภาพ
                    </button>
                  )}
                </label>

                {editForm.imageUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 h-40 bg-slate-100 dark:bg-slate-800 flex items-center justify-center group shadow-xs">
                    <img
                      src={editForm.imageUrl}
                      alt="Dormitory preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <label className="px-3 py-1.5 rounded-xl bg-white/95 hover:bg-white text-slate-800 text-xs font-bold cursor-pointer shadow-md transition flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <span>เปลี่ยนรูป</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e, "edit")}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, imageUrl: "" })}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer shadow-md transition flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ลบรูป</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition group">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      คลิกเพื่ออัปโหลดรูปหอพัก
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      JPG, PNG, WebP (ขนาดไม่เกิน 5MB)
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, "edit")}
                    />
                  </label>
                )}

                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">หรือใส่ URL:</span>
                  <input
                    type="url"
                    placeholder="https://example.com/dorm.jpg"
                    value={editForm.imageUrl}
                    onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อสาขาหอพัก <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น พักดี แมนชั่น (สาขา 1)"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อเจ้าของ / ผู้จัดการ
                </label>
                <input
                  type="text"
                  placeholder="เช่น คุณสมชาย พักดี"
                  value={editForm.ownerName}
                  onChange={(e) => setEditForm({ ...editForm, ownerName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ที่อยู่ / ทำเลที่ตั้ง
                </label>
                <input
                  type="text"
                  placeholder="เช่น 123/45 ซอยสุขุมวิท 71 แขวงพระโขนงเหนือ"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  เบอร์โทรติดต่อ
                </label>
                <input
                  type="text"
                  placeholder="081-234-5678"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ค่าไฟ (บาท/หน่วย)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={editForm.electricRate}
                    onChange={(e) => setEditForm({ ...editForm, electricRate: parseFloat(e.target.value) || 8 })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ค่าน้ำ (บาท/หน่วย)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={editForm.waterRate}
                    onChange={(e) => setEditForm({ ...editForm, waterRate: parseFloat(e.target.value) || 18 })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    หมายเลขพร้อมเพย์
                  </label>
                  <input
                    type="text"
                    placeholder="0812345678"
                    value={editForm.promptpayNumber}
                    onChange={(e) => setEditForm({ ...editForm, promptpayNumber: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ชื่อบัญชีพร้อมเพย์
                  </label>
                  <input
                    type="text"
                    placeholder="หอพัก พักดี แมนชั่น"
                    value={editForm.promptpayName}
                    onChange={(e) => setEditForm({ ...editForm, promptpayName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* 5. Security Modal: Delete Branch Confirmation with Login Password */}
      {branchToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 sm:p-7 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-300">
                  <ShieldAlert className="w-3 h-3" />
                  <span>DANGER ZONE • การลบข้อมูลถาวร</span>
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white mt-0.5">
                  ยืนยันการลบสาขา "{branchToDelete.name}"
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBranchToDelete(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Branch Current Data Statistics */}
            <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-2">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>ข้อมูลปัจจุบันของสาขา {branchToDelete.name}:</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-400">ห้องพักทั้งหมด</div>
                  <div className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
                    {branchToDelete.totalRooms} ห้อง
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-400">มีผู้เช่าอยู่จริง</div>
                  <div
                    className={`font-extrabold text-sm ${
                      (branchToDelete.occupiedRooms || 0) > 0
                        ? "text-rose-600"
                        : "text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    {branchToDelete.occupiedRooms || 0} ห้อง
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-400">ห้องว่าง</div>
                  <div className="font-extrabold text-sm text-emerald-600">
                    {branchToDelete.vacantRooms || 0} ห้อง
                  </div>
                </div>
              </div>
            </div>

            {/* Active Tenants Critical Warning Alert */}
            {(branchToDelete.occupiedRooms || 0) > 0 ? (
              <div className="mt-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-200 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>🚨 ตรวจพบผู้เช่าพักอาศัยอยู่จริง {branchToDelete.occupiedRooms} ห้อง!</span>
                </div>
                <p className="leading-relaxed text-[11px]">
                  หากยืนยันการลบสาขานี้ สัญญาเช่าของผู้เช่าทุกคน ประวัติมิเตอร์น้ำ-ไฟ ประวัติการออกใบแจ้งหนี้ และรายการบัญชีทั้งหมดของสาขานี้จะถูกลบออกจากฐานข้อมูลอย่างถาวรและไม่สามารถกู้คืนได้
                </p>
              </div>
            ) : (
              <div className="mt-4 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Info className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>ข้อมูลทั้งหมดของสาขานี้จะถูกลบถาวร</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  ระบบจะลบข้อมูลผังห้อง การตั้งค่า และประวัติทั้งหมดของสาขานี้
                </p>
              </div>
            )}

            {/* Last Branch Note */}
            {branches.length === 1 && (
              <div className="mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0 text-blue-500" />
                <span>
                  นี่คือสาขาสุดท้ายในระบบของคุณ เมื่อลบแล้วระบบจะว่างเปล่าเพื่อให้ท่านสร้างสาขาใหม่ได้ตามต้องการ
                </span>
              </div>
            )}

            {/* Password Confirmation Form */}
            <form onSubmit={handleConfirmDeleteBranch} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  กรุณากรอกรหัสผ่านเข้าสู่ระบบของคุณ เพื่อยืนยันการลบสาขา:{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showDeletePassword ? "text" : "password"}
                    value={deletePassword}
                    onChange={(e) => {
                      setDeletePassword(e.target.value);
                      setDeleteError(null);
                    }}
                    placeholder="รหัสผ่านเข้าเว็บ (เช่น P12345)"
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-3.5 pr-10 py-2.5 focus:outline-rose-500 font-mono"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeletePassword(!showDeletePassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  * ใช้รหัสผ่านเดียวกับที่ท่านใช้ล็อกอินเข้าสู่ระบบ (เช่น P12345)
                </p>
              </div>

              {deleteError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setBranchToDelete(null)}
                  disabled={isDeletingBranch}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isDeletingBranch || !deletePassword.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 transition cursor-pointer shadow-md shadow-rose-600/20 flex items-center gap-2"
                >
                  {isDeletingBranch ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังลบสาขา...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>ยืนยันลบสาขานี้ถาวร</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
