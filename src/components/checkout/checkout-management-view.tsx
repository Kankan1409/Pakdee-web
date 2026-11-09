"use client";

import React, { useState, useEffect } from "react";
import { Room, ContractItem, Invoice, Property } from "@/types/dormitory";
import {
  DoorOpen,
  Users,
  FileSignature,
  ShieldCheck,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Zap,
  Sparkles,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

export interface CheckoutExecutionData {
  targetRoom: Room;
  elecPrev: number;
  elecCurr: number;
  waterPrev: number;
  waterCurr: number;
  cleaningFee: number;
  damageFee: number;
  depositAmount: number;
}

interface CheckoutManagementViewProps {
  rooms: Room[];
  contracts: ContractItem[];
  invoices: Invoice[];
  property: Property;
  selectedRoomId?: string;
  onSelectRoomId?: (roomId: string) => void;
  onExecuteCheckout: (data: CheckoutExecutionData) => Promise<void> | void;
}

export function CheckoutManagementView({
  rooms,
  contracts,
  invoices,
  property,
  selectedRoomId = "",
  onSelectRoomId,
  onExecuteCheckout,
}: CheckoutManagementViewProps) {
  const [roomId, setRoomId] = useState<string>(selectedRoomId);
  const [elecPrev, setElecPrev] = useState<number | "">(0);
  const [elecCurr, setElecCurr] = useState<number | "">(0);
  const [waterPrev, setWaterPrev] = useState<number | "">(0);
  const [waterCurr, setWaterCurr] = useState<number | "">(0);
  const [cleaningFee, setCleaningFee] = useState<number | "">(500);
  const [damageFee, setDamageFee] = useState<number | "">(0);
  const [depositAmount, setDepositAmount] = useState<number | "">(0);

  // Sync external selectedRoomId prop if changed
  useEffect(() => {
    if (selectedRoomId !== roomId) {
      handleSelectRoom(selectedRoomId);
    }
  }, [selectedRoomId]);

  const handleSelectRoom = (selId: string) => {
    setRoomId(selId);
    if (onSelectRoomId) {
      onSelectRoomId(selId);
    }
    if (!selId) {
      setElecPrev(0);
      setElecCurr(0);
      setWaterPrev(0);
      setWaterCurr(0);
      setDepositAmount(0);
      return;
    }
    const r = rooms.find((rm) => rm.id === selId);
    if (r) {
      setElecPrev(r.currentElectricMeter);
      setElecCurr(r.currentElectricMeter);
      setWaterPrev(r.currentWaterMeter);
      setWaterCurr(r.currentWaterMeter);
      const act = contracts.find((c) => c.roomNumber === r.roomNumber && c.status === "active");
      const dep =
        act?.depositAmount ??
        (r as any).depositAmount ??
        r.currentTenant?.depositAmount ??
        (r.monthlyRate ? r.monthlyRate * 2 : 0);
      setDepositAmount(dep);
    }
  };

  const selectedRoom = rooms.find((rm) => rm.id === roomId);
  const activeCt = contracts.find(
    (c) => c.roomNumber === selectedRoom?.roomNumber && c.status === "active"
  );
  const unpaidInvs = invoices.filter(
    (i) => i.roomNumber === selectedRoom?.roomNumber && i.status !== "paid"
  );
  const unpaidBillsTotal = unpaidInvs.reduce(
    (acc, i) => acc + (i.remainingAmount ?? i.totalAmount),
    0
  );

  const elecPrevVal = elecPrev === "" ? (selectedRoom?.currentElectricMeter ?? 0) : Number(elecPrev);
  const elecCurrVal = elecCurr === "" ? (selectedRoom?.currentElectricMeter ?? 0) : Number(elecCurr);
  const elecUnits = Math.max(0, elecCurrVal - elecPrevVal);
  const elecCost = elecUnits * property.electricRate;

  const waterPrevVal = waterPrev === "" ? (selectedRoom?.currentWaterMeter ?? 0) : Number(waterPrev);
  const waterCurrVal = waterCurr === "" ? (selectedRoom?.currentWaterMeter ?? 0) : Number(waterCurr);
  const waterUnits = Math.max(0, waterCurrVal - waterPrevVal);
  const waterCost = waterUnits * property.waterRate;

  const cleanFeeVal = cleaningFee === "" ? 0 : Number(cleaningFee);
  const dmgFeeVal = damageFee === "" ? 0 : Number(damageFee);
  const depositVal = depositAmount === "" ? 0 : Number(depositAmount);

  const totalDeductions = elecCost + waterCost + cleanFeeVal + dmgFeeVal + unpaidBillsTotal;
  const netRefund = depositVal - totalDeductions;

  const handleConfirm = () => {
    if (!selectedRoom) return;
    onExecuteCheckout({
      targetRoom: selectedRoom,
      elecPrev: elecPrevVal,
      elecCurr: elecCurrVal,
      waterPrev: waterPrevVal,
      waterCurr: waterCurrVal,
      cleaningFee: cleanFeeVal,
      damageFee: dmgFeeVal,
      depositAmount: depositVal,
    });
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <h3 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
            <DoorOpen className="w-5 h-5 text-rose-500" />
            <span>ระบบสรุปย้ายออก & คืนเงินประกัน (Move-out Settlement)</span>
          </h3>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            คำนวณค่าน้ำ-ไฟวันย้ายออก หักบิลค้างชำระ ค่าทำความสะอาด และคำนวณเงินประกันคืนผู้เช่าตามจริง
          </p>
        </div>
        {selectedRoom && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            ห้อง {selectedRoom.roomNumber} (ชั้น {selectedRoom.floor})
          </span>
        )}
      </div>

      {/* Step 1: Select Room */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-[var(--foreground)]">
          1. เลือกห้องที่ต้องการทำเรื่องย้ายออก
        </label>
        <select
          value={roomId}
          onChange={(e) => handleSelectRoom(e.target.value)}
          className="w-full p-3 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-sm font-semibold focus:outline-emerald-500 text-[var(--foreground)]"
        >
          <option value="">-- กรุณาเลือกห้องพักที่ต้องการย้ายออก --</option>
          {rooms
            .filter(
              (r) =>
                (r.status === "occupied" || r.status === "overdue") &&
                !r.currentTenant?.notes?.includes("[ผู้เข้าพักรายวัน]")
            )
            .map((r) => (
              <option key={r.id} value={r.id}>
                ห้อง {r.roomNumber} - {r.currentTenant?.fullName || "ไม่มีชื่อ"} (ค่าเช่า ฿
                {(r.monthlyRate || 0).toLocaleString()}/เดือน){" "}
                {r.status === "overdue" ? " [มียอดค้างชำระ]" : ""}
              </option>
            ))}
        </select>
      </div>

      {!selectedRoom && (
        <div className="p-8 text-center border border-dashed border-[var(--border)] rounded-2xl bg-[var(--subtle)]/40 space-y-2 animate-in fade-in duration-150">
          <DoorOpen className="w-10 h-10 mx-auto text-[var(--muted)] opacity-50" />
          <div className="text-sm font-semibold text-[var(--foreground)]">
            กรุณาเลือกห้องพักด้านบนเพื่อเริ่มทำเรื่องย้ายออก
          </div>
          <p className="text-xs text-[var(--muted)] max-w-md mx-auto">
            ระบบจะดึงข้อมูลสัญญาเช่า, ยอดเงินประกัน, เลขมิเตอร์น้ำ-ไฟล่าสุด และยอดบิลค้างชำระของห้องที่เลือกมาคำนวณเงินประกันคืนโดยอัตโนมัติ
          </p>
        </div>
      )}

      {selectedRoom && (
        <div className="space-y-5 text-xs">
          {/* Bento Row 1: Tenant Information & Lease Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] space-y-1">
              <div className="text-[var(--muted)] flex items-center gap-1.5 font-medium">
                <Users className="w-3.5 h-3.5 text-blue-500" />
                <span>ข้อมูลผู้เช่าห้องพัก</span>
              </div>
              <div className="font-bold text-sm text-[var(--foreground)]">
                {selectedRoom.currentTenant?.fullName || "-"}
              </div>
              <div className="text-[var(--muted)]">
                โทร: {selectedRoom.currentTenant?.phone || "-"}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] space-y-1">
              <div className="text-[var(--muted)] flex items-center gap-1.5 font-medium">
                <FileSignature className="w-3.5 h-3.5 text-indigo-500" />
                <span>สัญญาเช่าที่เปิดใช้งาน</span>
              </div>
              <div className="font-bold text-sm text-[var(--foreground)]">
                {activeCt
                  ? `สัญญาเลขที่ ${activeCt.contractNumber}`
                  : "ไม่มีบันทึกสัญญา (ยึดตามเรทห้อง)"}
              </div>
              <div className="text-[var(--muted)]">
                {activeCt ? `เริ่ม ${activeCt.startDate} ถึง ${activeCt.endDate}` : "-"}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] space-y-1">
              <div className="text-[var(--muted)] flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>เงินประกันมัดจำเดิม (ตามสัญญา)</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) =>
                    setDepositAmount(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="0"
                  className="w-full p-1.5 px-2 rounded-lg bg-[var(--card)] border border-[var(--border)] font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 focus:outline-emerald-500"
                />
              </div>
              <div className="text-[11px] text-[var(--muted)]">
                {activeCt
                  ? `สัญญาบันทึกไว้ ฿${(activeCt.depositAmount || 0).toLocaleString()}`
                  : "แก้ไขจำนวนเงินได้หากมีการเปลี่ยนแปลง"}
              </div>
            </div>
          </div>

          {/* Bento Row 2: Unpaid Invoices Deduction Alert */}
          <div className="p-4 rounded-xl border transition-all bg-[var(--card)]">
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold text-xs flex items-center gap-1.5 text-[var(--foreground)]">
                <Receipt className="w-4 h-4 text-amber-500" />
                <span>2. ตรวจสอบบิลค้างชำระของห้องพักนี้ (Unpaid Monthly Invoices)</span>
              </div>
              {unpaidInvs.length === 0 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ไม่มีบิลค้างชำระ
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                  <AlertCircle className="w-3.5 h-3.5" />
                  พบบิลค้าง {unpaidInvs.length} ใบ (รวม {formatCurrency(unpaidBillsTotal)})
                </span>
              )}
            </div>

            {unpaidInvs.length > 0 ? (
              <div className="space-y-2 mt-3">
                <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--subtle)] overflow-hidden">
                  {unpaidInvs.map((inv) => (
                    <div key={inv.id} className="p-2.5 px-3 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-xs text-[var(--foreground)] flex items-center gap-2">
                          <span>{inv.invoiceNumber}</span>
                          <span className="text-[11px] text-[var(--muted)]">
                            รอบ {(inv as any).billingMonth || (inv as any).month || "-"}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--muted)]">
                          ยอดเรียกเก็บ ฿{(inv.totalAmount || 0).toLocaleString()} • ชำระแล้ว ฿
                          {(inv.paidAmount || 0).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-rose-600">
                          ค้างชำระ ฿{((inv.remainingAmount ?? inv.totalAmount) || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-amber-600 dark:text-amber-400">
                          (จะถูกนำไปหักจากเงินประกัน)
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-[var(--muted)]">
                ผู้เช่าชำระค่าเช่าและค่าน้ำ-ไฟตามรอบบิลที่ผ่านมาครบถ้วนแล้ว ไม่มียอดค้างชำระยกมา
              </p>
            )}
          </div>

          {/* Bento Row 3: Move-out Meter Readings */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[var(--foreground)]">
              3. บันทึกเลขมิเตอร์วันย้ายออก (Move-out Meter Readings)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Electric Card */}
              <div className="p-4 rounded-xl bg-[var(--subtle)] border border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <Zap className="w-4 h-4" />
                    <span>มิเตอร์ไฟฟ้า (฿{property.electricRate}/หน่วย)</span>
                  </span>
                  <span className="font-mono text-xs font-bold text-[var(--foreground)]">
                    ใช้ไป {elecUnits} หน่วย
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-[var(--muted)] mb-1">
                      เลขมิเตอร์เดิม (จากระบบ)
                    </label>
                    <input
                      type="number"
                      value={elecPrev}
                      onChange={(e) =>
                        setElecPrev(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      placeholder="0"
                      className="w-full p-2 rounded-lg bg-[var(--card)] border border-[var(--border)] font-mono text-xs focus:outline-emerald-500 text-[var(--foreground)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--foreground)] font-semibold mb-1">
                      เลขวันย้ายออก *
                    </label>
                    <input
                      type="number"
                      value={elecCurr}
                      onChange={(e) =>
                        setElecCurr(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      placeholder="0"
                      className="w-full p-2 rounded-lg bg-[var(--card)] border border-amber-500/50 font-mono text-xs font-bold text-amber-600 dark:text-amber-400 focus:outline-amber-500"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs pt-1 text-[var(--muted)] border-t border-[var(--border)]">
                  <span>คิดเป็นค่าไฟฟ้า:</span>
                  <span className="font-bold text-[var(--foreground)] font-mono">
                    {formatCurrency(elecCost)}
                  </span>
                </div>
              </div>

              {/* Water Card */}
              <div className="p-4 rounded-xl bg-[var(--subtle)] border border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                    <Sparkles className="w-4 h-4" />
                    <span>มิเตอร์น้ำประปา (฿{property.waterRate}/หน่วย)</span>
                  </span>
                  <span className="font-mono text-xs font-bold text-[var(--foreground)]">
                    ใช้ไป {waterUnits} หน่วย
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-[var(--muted)] mb-1">
                      เลขมิเตอร์เดิม (จากระบบ)
                    </label>
                    <input
                      type="number"
                      value={waterPrev}
                      onChange={(e) =>
                        setWaterPrev(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      placeholder="0"
                      className="w-full p-2 rounded-lg bg-[var(--card)] border border-[var(--border)] font-mono text-xs focus:outline-emerald-500 text-[var(--foreground)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--foreground)] font-semibold mb-1">
                      เลขวันย้ายออก *
                    </label>
                    <input
                      type="number"
                      value={waterCurr}
                      onChange={(e) =>
                        setWaterCurr(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      placeholder="0"
                      className="w-full p-2 rounded-lg bg-[var(--card)] border border-blue-500/50 font-mono text-xs font-bold text-blue-600 dark:text-blue-400 focus:outline-blue-500"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs pt-1 text-[var(--muted)] border-t border-[var(--border)]">
                  <span>คิดเป็นค่าน้ำประปา:</span>
                  <span className="font-bold text-[var(--foreground)] font-mono">
                    {formatCurrency(waterCost)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bento Row 4: Additional Fees */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[var(--foreground)]">
              4. ค่าบริการทำความสะอาดและค่าความเสียหาย
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-xs text-[var(--foreground)]">
                    ค่าทำความสะอาดห้องพัก (บาท)
                  </label>
                  <div className="flex gap-1">
                    {[0, 300, 500, 800].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCleaningFee(amt)}
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-mono border transition cursor-pointer",
                          cleaningFee === amt
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-[var(--card)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
                        )}
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  value={cleaningFee}
                  onChange={(e) =>
                    setCleaningFee(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="0"
                  className="w-full p-2 rounded-lg bg-[var(--card)] border border-[var(--border)] font-mono text-xs focus:outline-emerald-500 text-[var(--foreground)]"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] space-y-2">
                <label className="block font-semibold text-xs text-[var(--foreground)]">
                  ค่าเสียหาย / ค่าซ่อมแซมอุปกรณ์ (บาท)
                </label>
                <input
                  type="number"
                  value={damageFee}
                  onChange={(e) =>
                    setDamageFee(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="0"
                  className="w-full p-2 rounded-lg bg-[var(--card)] border border-[var(--border)] font-mono text-xs focus:outline-emerald-500 text-[var(--foreground)]"
                />
              </div>
            </div>
          </div>

          {/* Bento Row 5: Settlement Summary Breakdown */}
          <div className="p-5 rounded-2xl bg-[var(--subtle)] border border-[var(--border)] space-y-3.5">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
              <span className="font-bold text-sm text-[var(--foreground)] flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-500" />
                <span>5. สรุปรายละเอียดการหักเงินประกันและยอดสุทธิ</span>
              </span>
              <span className="text-[11px] text-[var(--muted)]">คำนวณแบบเรียลไทม์</span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-[var(--muted)]">เงินประกันห้องพักเดิม (ตามสัญญา):</span>
                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  +{formatCurrency(depositVal)}
                </span>
              </div>

              {unpaidBillsTotal > 0 && (
                <div className="flex justify-between py-1 text-rose-600 dark:text-rose-400">
                  <span>หักบิลค้างชำระ ({unpaidInvs.length} ใบ):</span>
                  <span className="font-bold font-mono">-{formatCurrency(unpaidBillsTotal)}</span>
                </div>
              )}

              <div className="flex justify-between py-1 text-rose-600 dark:text-rose-400">
                <span>
                  หักค่าไฟฟ้าวันย้ายออก ({elecUnits} หน่วย @ ฿{property.electricRate}):
                </span>
                <span className="font-bold font-mono">-{formatCurrency(elecCost)}</span>
              </div>

              <div className="flex justify-between py-1 text-rose-600 dark:text-rose-400">
                <span>
                  หักค่าน้ำประปาวันย้ายออก ({waterUnits} หน่วย @ ฿{property.waterRate}):
                </span>
                <span className="font-bold font-mono">-{formatCurrency(waterCost)}</span>
              </div>

              {cleanFeeVal > 0 && (
                <div className="flex justify-between py-1 text-rose-600 dark:text-rose-400">
                  <span>หักค่าบริการทำความสะอาดห้องพัก:</span>
                  <span className="font-bold font-mono">-{formatCurrency(cleanFeeVal)}</span>
                </div>
              )}

              {dmgFeeVal > 0 && (
                <div className="flex justify-between py-1 text-rose-600 dark:text-rose-400">
                  <span>หักค่าเสียหาย / ค่าซ่อมแซม:</span>
                  <span className="font-bold font-mono">-{formatCurrency(dmgFeeVal)}</span>
                </div>
              )}

              <div className="flex justify-between py-1.5 border-t border-[var(--border)] text-[var(--muted)] font-semibold">
                <span>รวมรายการหักทั้งหมด:</span>
                <span className="font-bold font-mono text-rose-600 dark:text-rose-400">
                  -{formatCurrency(totalDeductions)}
                </span>
              </div>
            </div>

            {/* Net Result Bento Box */}
            <div
              className={cn(
                "p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                netRefund >= 0
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
              )}
            >
              <div className="space-y-0.5">
                <div className="font-bold text-sm flex items-center gap-1.5">
                  {netRefund >= 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600" />
                  )}
                  <span>
                    {netRefund >= 0
                      ? "เงินประกันสุทธิที่ต้องคืนผู้เช่า (Refund to Tenant)"
                      : "เงินประกันไม่พอหัก! ผู้เช่ามียอดค้างชำระเพิ่ม (Shortfall)"}
                  </span>
                </div>
                <p className="text-[11px] opacity-80">
                  {netRefund >= 0
                    ? "ระบบจะตัดรอบสัญญาและออกใบสรุปเงินประกันเพื่อโอนคืนผู้เช่า"
                    : "ผู้เช่าต้องชำระส่วนต่างเพิ่มเติมก่อนการย้ายออกเสร็จสมบูรณ์"}
                </p>
              </div>

              <div className="text-right">
                <span className="text-2xl font-black font-mono">
                  {formatCurrency(Math.abs(netRefund))}
                </span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              onClick={handleConfirm}
              disabled={!roomId}
              className="w-full sm:w-auto bg-rose-600 hover:bg-rose-500 active:scale-98 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 text-sm"
            >
              <DoorOpen className="w-4 h-4" />
              <span>ยืนยันการย้ายออกและส่งต่องานแม่บ้าน</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
