"use client";

import React from "react";
import { CreditCard, Sparkles, CheckCircle2 } from "lucide-react";

export function SlipVerificationView() {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-500" />
            <span>ระบบตรวจสลิปโอนเงิน (AI & PromptPay Slip Verification)</span>
          </h3>
          <p className="text-xs text-[var(--muted)]">
            ตรวจเช็คความถูกต้องของสลิปโอนเงินอัตโนมัติ ป้องกันสลิปปลอม และสลิปซ้ำ
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--subtle)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs">สลิปห้อง 101 (รอบ ต.ค. 2026)</span>
            <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full">
              ตรวจสอบผ่าน 100%
            </span>
          </div>
          <div className="text-xs space-y-1 text-[var(--muted)]">
            <div>ผู้โอน: นายสมชาย สุขสบาย (ธ.กสิกรไทย)</div>
            <div>
              ยอดเงิน: <span className="font-semibold text-emerald-600">5,064.00 บาท</span> (ตรงกับยอดบิล)
            </div>
            <div>เลขอ้างอิง: 2026102609384501</div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-dashed border-[var(--border)] flex flex-col items-center justify-center text-center p-6 space-y-2">
          <CreditCard className="w-8 h-8 text-[var(--muted)]" />
          <div className="text-xs font-semibold">รายการสลิปรอตรวจสอบ</div>
          <div className="text-[10px] text-[var(--muted)]">
            เมื่อผู้เช่าส่งสลิปผ่าน LINE OA ระบบ AI จะอ่านยอดเงินและเวลาเพื่อจับคู่บิลอัตโนมัติ
          </div>
        </div>
      </div>
    </div>
  );
}
