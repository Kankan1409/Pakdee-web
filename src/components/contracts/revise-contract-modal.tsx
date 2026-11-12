"use client";

/**
 * สัญญาฉบับแก้ไข: แก้ค่าเช่า/ค่าบริการในสัญญาที่เซ็นแล้ว (เช่น เพิ่มเช่าตู้เย็น)
 * แล้วระบบสร้างสัญญาฉบับใหม่ (เลขเดิม + -R1, -R2 …) ให้ผู้เช่าเซ็นใหม่ทั้งฉบับ ฉบับเดิมเก็บไว้ดูย้อนหลัง
 */
import React, { useState } from "react";
import { AdditionalFeeItem, ContractItem } from "@/types/dormitory";
import { FileSignature, Plus, Trash2, X } from "lucide-react";

const money = (n: unknown) => Number(n || 0).toLocaleString("th-TH");

/** Human-readable list of what changed between two versions (shown to the tenant and in LINE). */
export function describeContractChanges(prev: ContractItem | undefined, next: ContractItem): string[] {
  if (!prev) return [];
  const out: string[] = [];
  if (Number(prev.monthlyRent) !== Number(next.monthlyRent)) {
    out.push(`ค่าเช่าห้อง ฿${money(prev.monthlyRent)} → ฿${money(next.monthlyRent)} / เดือน`);
  }
  if (Number(prev.depositAmount) !== Number(next.depositAmount)) {
    out.push(`เงินประกัน ฿${money(prev.depositAmount)} → ฿${money(next.depositAmount)}`);
  }
  const services: { label: string; has: keyof ContractItem; fee: keyof ContractItem }[] = [
    { label: "เช่าทีวี", has: "hasTv", fee: "tvRentalFee" },
    { label: "เช่าตู้เย็น", has: "hasFridge", fee: "fridgeRentalFee" },
    { label: "ค่าส่วนกลาง", has: "hasCommonFee", fee: "commonFee" },
    { label: "อินเทอร์เน็ต", has: "hasWifi", fee: "wifiFee" },
    { label: "ที่จอดรถ", has: "hasParking", fee: "parkingFee" },
  ];
  for (const s of services) {
    const before = Boolean(prev[s.has]);
    const after = Boolean(next[s.has]);
    const feeBefore = Number(prev[s.fee] || 0);
    const feeAfter = Number(next[s.fee] || 0);
    if (!before && after) out.push(`เพิ่ม${s.label} ฿${money(feeAfter)} / เดือน`);
    else if (before && !after) out.push(`ยกเลิก${s.label}`);
    else if (before && after && feeBefore !== feeAfter) out.push(`${s.label} ฿${money(feeBefore)} → ฿${money(feeAfter)} / เดือน`);
  }
  const feesBefore = new Map((prev.additionalFees || []).filter((f) => f.isEnabled !== false).map((f) => [f.name, Number(f.amount)]));
  const feesAfter = new Map((next.additionalFees || []).filter((f) => f.isEnabled !== false).map((f) => [f.name, Number(f.amount)]));
  for (const [name, amt] of feesAfter) {
    if (!feesBefore.has(name)) out.push(`เพิ่ม${name} ฿${money(amt)}`);
    else if (feesBefore.get(name) !== amt) out.push(`${name} ฿${money(feesBefore.get(name))} → ฿${money(amt)}`);
  }
  for (const name of feesBefore.keys()) if (!feesAfter.has(name)) out.push(`ยกเลิก${name}`);
  if ((prev.endDate || "") !== (next.endDate || "")) out.push(`วันสิ้นสุดสัญญา ${prev.endDate || "-"} → ${next.endDate || "-"}`);
  if ((prev.startDate || "") !== (next.startDate || "")) out.push(`มีผลตั้งแต่ ${next.startDate}`);
  return out;
}

export function ReviseContractModal({
  contract,
  onClose,
  onSubmit,
}: {
  contract: ContractItem;
  onClose: () => void;
  onSubmit: (changes: Partial<ContractItem>) => Promise<void>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<Partial<ContractItem>>({
    monthlyRent: contract.monthlyRent,
    depositAmount: contract.depositAmount,
    startDate: today,
    endDate: contract.endDate,
    hasTv: Boolean(contract.hasTv),
    tvRentalFee: contract.tvRentalFee ?? 300,
    hasFridge: Boolean(contract.hasFridge),
    fridgeRentalFee: contract.fridgeRentalFee ?? 300,
    hasCommonFee: Boolean(contract.hasCommonFee),
    commonFee: contract.commonFee ?? 0,
    hasWifi: Boolean(contract.hasWifi),
    wifiFee: contract.wifiFee ?? 0,
    hasParking: Boolean(contract.hasParking),
    parkingFee: contract.parkingFee ?? 0,
    additionalFees: (contract.additionalFees || []).map((f) => ({ ...f })),
  });
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<ContractItem>) => setForm((f) => ({ ...f, ...patch }));

  const preview = { ...contract, ...form } as ContractItem;
  const changes = describeContractChanges(contract, preview).filter((c) => !c.startsWith("มีผลตั้งแต่"));
  const inputCls = "px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs";

  const serviceRow = (label: string, has: keyof ContractItem, fee: keyof ContractItem) => (
    <div className="flex items-center gap-2 text-xs" key={String(has)}>
      <label className="flex items-center gap-2 w-36 cursor-pointer">
        <input type="checkbox" checked={Boolean(form[has])} onChange={(e) => set({ [has]: e.target.checked } as Partial<ContractItem>)} />
        <span>{label}</span>
      </label>
      <input
        type="number"
        min={0}
        disabled={!form[has]}
        value={Number(form[fee] || 0)}
        onChange={(e) => set({ [fee]: Math.max(0, Number(e.target.value) || 0) } as Partial<ContractItem>)}
        className={`${inputCls} w-24 text-right disabled:opacity-40`}
      />
      <span className="text-slate-500">บาท/เดือน</span>
    </div>
  );

  const fees: AdditionalFeeItem[] = form.additionalFees || [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white text-slate-900 rounded-3xl w-full max-w-xl shadow-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-indigo-600" /> ทำสัญญาฉบับแก้ไข
            </h3>
            <p className="text-[11px] text-slate-500">
              จาก {contract.contractNumber} · ห้อง {contract.roomNumber} · {contract.tenantName}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto text-xs">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <div>ค่าเช่าห้อง (บาท/เดือน)</div>
              <input type="number" min={0} value={Number(form.monthlyRent || 0)} onChange={(e) => set({ monthlyRent: Math.max(0, Number(e.target.value) || 0) })} className={`${inputCls} w-full`} />
            </label>
            <label className="space-y-1">
              <div>เงินประกัน (บาท)</div>
              <input type="number" min={0} value={Number(form.depositAmount || 0)} onChange={(e) => set({ depositAmount: Math.max(0, Number(e.target.value) || 0) })} className={`${inputCls} w-full`} />
            </label>
            <label className="space-y-1">
              <div>ฉบับแก้ไขมีผลตั้งแต่</div>
              <input type="date" value={form.startDate || ""} onChange={(e) => set({ startDate: e.target.value })} className={`${inputCls} w-full`} />
            </label>
            <label className="space-y-1">
              <div>วันสิ้นสุดสัญญา</div>
              <input type="date" value={form.endDate || ""} onChange={(e) => set({ endDate: e.target.value })} className={`${inputCls} w-full`} />
            </label>
          </div>

          <div className="space-y-2">
            <div className="font-bold">บริการเสริม</div>
            {serviceRow("เช่าทีวี", "hasTv", "tvRentalFee")}
            {serviceRow("เช่าตู้เย็น", "hasFridge", "fridgeRentalFee")}
            {serviceRow("ค่าส่วนกลาง", "hasCommonFee", "commonFee")}
            {serviceRow("อินเทอร์เน็ต", "hasWifi", "wifiFee")}
            {serviceRow("ที่จอดรถ", "hasParking", "parkingFee")}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-bold">ค่าใช้จ่ายอื่น ๆ</div>
              <button
                type="button"
                onClick={() => set({ additionalFees: [...fees, { id: `fee-${Date.now()}`, name: "", amount: 0, isEnabled: true }] })}
                className="px-2 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> เพิ่มรายการ
              </button>
            </div>
            {fees.map((f, idx) => (
              <div key={f.id} className="flex items-center gap-2">
                <input
                  value={f.name}
                  placeholder="ชื่อรายการ"
                  onChange={(e) => set({ additionalFees: fees.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)) })}
                  className={`${inputCls} flex-1`}
                />
                <input
                  type="number"
                  min={0}
                  value={f.amount}
                  onChange={(e) => set({ additionalFees: fees.map((x, i) => (i === idx ? { ...x, amount: Math.max(0, Number(e.target.value) || 0) } : x)) })}
                  className={`${inputCls} w-24 text-right`}
                />
                <button type="button" onClick={() => set({ additionalFees: fees.filter((_, i) => i !== idx) })} className="p-1 text-rose-500 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 space-y-1">
            <div className="font-bold text-indigo-800">สิ่งที่เปลี่ยนจากฉบับเดิม</div>
            {changes.length === 0 ? (
              <div className="text-slate-500">ยังไม่มีการเปลี่ยนแปลง</div>
            ) : (
              <ul className="list-disc pl-5 text-indigo-900">
                {changes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="text-[11px] text-slate-500">
            ระบบจะสร้างสัญญาฉบับใหม่ (เลขเดิม + -R) ให้ผู้เช่าเซ็นใหม่ทั้งฉบับ — ฉบับเดิมยังใช้งานอยู่จนกว่าผู้เช่าจะเซ็นฉบับใหม่
            แล้วจึงเปลี่ยนเป็น &quot;ถูกแทนที่&quot; (ดูย้อนหลังได้ที่ปุ่ม &quot;ประวัติ&quot;)
          </div>
        </div>

        <div className="p-5 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer">
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={changes.length === 0 || saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSubmit({
                  ...form,
                  additionalFees: fees.filter((f) => f.name.trim()),
                });
              } finally {
                setSaving(false);
              }
            }}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 cursor-pointer"
          >
            {saving ? "กำลังสร้าง..." : "สร้างสัญญาฉบับแก้ไข"}
          </button>
        </div>
      </div>
    </div>
  );
}
