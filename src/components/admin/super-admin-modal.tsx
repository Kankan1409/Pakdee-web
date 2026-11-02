"use client";

import React, { useState } from "react";
import { PlanType } from "@/types/dormitory";
import { globalPopup } from "@/lib/popup-context";
import { X, ShieldCheck, Plus, Check, Eye } from "lucide-react";

interface SuperAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: PlanType;
  onChangePlan: (newPlan: PlanType) => void;
}

export function SuperAdminModal({
  isOpen,
  onClose,
  currentPlan,
  onChangePlan,
}: SuperAdminModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(currentPlan);

  if (!isOpen) return null;

  const handleSave = () => {
    onChangePlan(selectedPlan);
    globalPopup.info(
      "อัปเดตแพ็กเกจสำเร็จ",
      `เปลี่ยนแพ็กเกจเป็น ${selectedPlan.toUpperCase()} เรียบร้อยแล้ว! ฟีเจอร์จะปลดล็อกตามระดับทันที`
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[var(--foreground)]">
                Super Admin Support Portal (สำหรับทีมงานคุณ)
              </div>
              <div className="text-xs text-[var(--muted)]">
                จัดการลูกค้ารวม, เปลี่ยนแพ็กเกจ และตั้งค่าเริ่มต้น (Setup Wizard)
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[var(--subtle)] text-[var(--muted)] hover:text-[var(--foreground)] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Quick Plan Switcher for Current Dorm */}
          <div className="bg-[var(--subtle)] p-4 rounded-2xl border border-[var(--border)] space-y-3">
            <div className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
              ⚡ สลับแพ็กเกจให้หอพัก: พักดี แมนชั่น (สาขา 1)
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Starter */}
              <div
                onClick={() => setSelectedPlan("starter")}
                className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                  selectedPlan === "starter"
                    ? "border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/40"
                    : "border-[var(--border)] bg-[var(--card)] hover:border-slate-400"
                }`}
              >
                <div className="text-xs font-bold text-[var(--foreground)]">STARTER</div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                  ฟรีตลอดชีพ
                </div>
                <div className="text-[10px] text-[var(--muted)] mt-1">
                  1 ตึก / ไม่เกิน 30 ห้อง
                </div>
              </div>

              {/* Pro */}
              <div
                onClick={() => setSelectedPlan("pro")}
                className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                  selectedPlan === "pro"
                    ? "border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/40"
                    : "border-[var(--border)] bg-[var(--card)] hover:border-slate-400"
                }`}
              >
                <div className="text-xs font-bold text-[var(--foreground)]">PRO</div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                  แนะนำ (ยอดนิยม)
                </div>
                <div className="text-[10px] text-[var(--muted)] mt-1">
                  รายวัน + เซ็นสัญญา + สลิป
                </div>
              </div>

              {/* Elite */}
              <div
                onClick={() => setSelectedPlan("elite")}
                className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                  selectedPlan === "elite"
                    ? "border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/40"
                    : "border-[var(--border)] bg-[var(--card)] hover:border-slate-400"
                }`}
              >
                <div className="text-xs font-bold text-[var(--foreground)]">ELITE</div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                  ครบทุกมิติ
                </div>
                <div className="text-[10px] text-[var(--muted)] mt-1">
                  หลายสาขา / ไม่จำกัดห้อง
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>บันทึกการเปลี่ยนแพ็กเกจ</span>
            </button>
          </div>

          {/* Client Table Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--foreground)]">
              <span>📋 รายชื่อหอพักลูกค้าทั้งหมดในความดูแลของคุณ</span>
              <button
                onClick={() => globalPopup.info("ตัวช่วยสร้างหอพักใหม่", "เปิดตัวช่วยสร้างหอพักใหม่ (Setup Wizard) ภายใน 2 นาที!")}
                className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ เพิ่มหอพักลูกค้าใหม่</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-[var(--border)] rounded-2xl bg-[var(--card)]">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted)] bg-[var(--subtle)]">
                    <th className="py-2.5 px-3">ชื่อหอพัก</th>
                    <th className="py-2.5 px-3">เจ้าของ / เบอร์</th>
                    <th className="py-2.5 px-3 text-center">ห้อง</th>
                    <th className="py-2.5 px-3 text-center">แพ็กเกจ</th>
                    <th className="py-2.5 px-3 text-right">Support</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-[var(--foreground)]">
                  <tr>
                    <td className="py-2.5 px-3 font-semibold">พักดี แมนชั่น (สุขุมวิท)</td>
                    <td className="py-2.5 px-3 text-[var(--muted)]">คุณสมชาย (081-234-5678)</td>
                    <td className="py-2.5 px-3 text-center">24</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase text-[10px]">
                        {selectedPlan}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={onClose}
                        className="bg-blue-600 text-white px-2 py-1 rounded text-[11px] font-medium hover:bg-blue-500 transition cursor-pointer"
                      >
                        👁️ เข้าดูระบบ
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold">ศิริสุข เพลส (รังสิต)</td>
                    <td className="py-2.5 px-3 text-[var(--muted)]">คุณวิภา (089-876-5432)</td>
                    <td className="py-2.5 px-3 text-center">48</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="bg-slate-500/15 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase text-[10px]">
                        STARTER
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => globalPopup.info("สลับหอพัก", "สลับไปหน้าจอหอพัก ศิริสุข เพลส")}
                        className="bg-blue-600 text-white px-2 py-1 rounded text-[11px] font-medium hover:bg-blue-500 transition cursor-pointer"
                      >
                        👁️ เข้าดูระบบ
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[var(--subtle)] border-t border-[var(--border)] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
