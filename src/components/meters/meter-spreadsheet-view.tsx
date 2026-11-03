"use client";

import React, { useState, useEffect } from "react";
import { Room } from "@/types/dormitory";
import { Zap, Droplets, Save, RefreshCw, History, Camera, CheckCircle2, AlertCircle, Search, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface MeterSpreadsheetViewProps {
  rooms: Room[];
  electricRate: number;
  waterRate: number;
  onSaveMeters: (
    readings: {
      roomId: string;
      roomNumber: string;
      electricCurr: number;
      waterCurr: number;
      electricPrev: number;
      waterPrev: number;
    }[]
  ) => void;
}

export function MeterSpreadsheetView({
  rooms,
  electricRate,
  waterRate,
  onSaveMeters,
}: MeterSpreadsheetViewProps) {
  const [activeTab, setActiveTab] = useState<"entry" | "history" | "photos">("entry");
  const [rows, setRows] = useState<
    {
      roomId: string;
      roomNumber: string;
      tenantName: string;
      electricPrev: number;
      electricCurr: number | "";
      waterPrev: number;
      waterCurr: number | "";
    }[]
  >([]);

  useEffect(() => {
    setRows(
      rooms.map((r) => {
        const hasTenant = Boolean(r.currentTenant);
        return {
          roomId: r.id,
          roomNumber: r.roomNumber,
          tenantName: hasTenant ? r.currentTenant!.fullName : "(ห้องว่าง)",
          electricPrev: r.currentElectricMeter,
          // ถ้าเป็นห้องว่าง ไม่ใส่หน่วยไฟ/น้ำอัตโนมัติ ให้เป็น 0 (มิเตอร์ปัจจุบัน = มิเตอร์ก่อนหน้า)
          electricCurr: r.currentElectricMeter + (hasTenant ? 25 : 0),
          waterPrev: r.currentWaterMeter,
          waterCurr: r.currentWaterMeter + (hasTenant ? 4 : 0),
        };
      })
    );
  }, [rooms]);

  const [searchQuery, setSearchQuery] = useState("");

  const handleElectricChange = (roomId: string, rawVal: string) => {
    const val = rawVal === "" ? "" : Number(rawVal);
    setRows((prev) =>
      prev.map((r) => (r.roomId === roomId ? { ...r, electricCurr: val } : r))
    );
  };

  const handleWaterChange = (roomId: string, rawVal: string) => {
    const val = rawVal === "" ? "" : Number(rawVal);
    setRows((prev) =>
      prev.map((r) => (r.roomId === roomId ? { ...r, waterCurr: val } : r))
    );
  };

  const filteredRows = rows.filter((r) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      r.roomNumber.toLowerCase().includes(q) ||
      r.tenantName.toLowerCase().includes(q)
    );
  });

  const totalElecUnits = rows.reduce(
    (acc, r) => acc + Math.max(0, (r.electricCurr === "" ? r.electricPrev : Number(r.electricCurr)) - r.electricPrev),
    0
  );
  const totalWaterUnits = rows.reduce(
    (acc, r) => acc + Math.max(0, (r.waterCurr === "" ? r.waterPrev : Number(r.waterCurr)) - r.waterPrev),
    0
  );
  const totalEstimatedCost =
    totalElecUnits * electricRate + totalWaterUnits * waterRate;

  const recordedCount = rows.filter(
    (r) =>
      (r.electricCurr !== "" && Number(r.electricCurr) > r.electricPrev) ||
      (r.waterCurr !== "" && Number(r.waterCurr) > r.waterPrev)
  ).length;

  const handleSaveAll = () => {
    onSaveMeters(
      rows.map((r) => ({
        roomId: r.roomId,
        roomNumber: r.roomNumber,
        electricCurr: r.electricCurr === "" ? r.electricPrev : Number(r.electricCurr),
        waterCurr: r.waterCurr === "" ? r.waterPrev : Number(r.waterCurr),
        electricPrev: r.electricPrev,
        waterPrev: r.waterPrev,
      }))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center font-bold">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--foreground)] tracking-tight">
              บันทึกมิเตอร์น้ำ-ไฟ (Spreadsheet Fast Entry)
            </h1>
            <p className="text-xs text-[var(--muted)]">
              จดเลขล่าสุดของแต่ละห้อง — ระบบจะดึงค่าครั้งก่อนมาคำนวณจำนวนหน่วยและยอดเงินให้อัตโนมัติ
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveAll}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-md shadow-emerald-500/20 transition cursor-pointer text-xs"
        >
          <Save className="w-4 h-4" />
          <span>บันทึกเลขมิเตอร์ทั้งหมด ({rows.length} ห้อง)</span>
        </button>
      </div>

      {/* Mode Tabs */}
      <div className="flex items-center gap-2 bg-[var(--card)] p-2 rounded-2xl border border-[var(--border)] text-xs">
        <button
          onClick={() => setActiveTab("entry")}
          className={`px-4 py-2 rounded-xl font-medium transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === "entry"
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>บันทึกเลขมิเตอร์ประจำรอบ</span>
        </button>
        <button
          onClick={() => setActiveTab("photos")}
          className={`px-4 py-2 rounded-xl font-medium transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === "photos"
              ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/30"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>รูปมิเตอร์ที่ผู้เช่าส่งมาผ่าน LINE (0)</span>
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-xl font-medium transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === "history"
              ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold border border-purple-500/30"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>ประวัติย้อนหลัง</span>
        </button>
      </div>

      {activeTab === "entry" && (
        <>
          {/* Summary KPIs - Top Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xs">
              <div className="text-xs text-[var(--muted)] font-medium flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> รวมไฟทั้งตึกเดือนนี้
                </span>
                <span className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-mono">
                  {electricRate} ฿/หน่วย
                </span>
              </div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1.5 font-mono">
                {totalElecUnits.toLocaleString()} <span className="text-xs font-normal text-[var(--muted)]">หน่วย</span>
              </div>
              <div className="text-[11px] text-[var(--muted)] mt-1">
                รวมเป็นเงิน ฿{(totalElecUnits * electricRate).toLocaleString()}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xs">
              <div className="text-xs text-[var(--muted)] font-medium flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-blue-500" /> รวมน้ำทั้งตึกเดือนนี้
                </span>
                <span className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded font-mono">
                  {waterRate} ฿/หน่วย
                </span>
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1.5 font-mono">
                {totalWaterUnits.toLocaleString()} <span className="text-xs font-normal text-[var(--muted)]">หน่วย</span>
              </div>
              <div className="text-[11px] text-[var(--muted)] mt-1">
                รวมเป็นเงิน ฿{(totalWaterUnits * waterRate).toLocaleString()}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xs">
              <div className="text-xs text-[var(--muted)] font-medium flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> สถานะการจดมิเตอร์
                </span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  {rows.length > 0 ? Math.round((recordedCount / rows.length) * 100) : 0}%
                </span>
              </div>
              <div className="text-2xl font-bold text-[var(--foreground)] mt-1.5 font-mono">
                {recordedCount} <span className="text-xs font-normal text-[var(--muted)]">/ {rows.length} ห้อง</span>
              </div>
              <div className="w-full bg-[var(--subtle)] h-1.5 rounded-full mt-2 overflow-hidden border border-[var(--border)]">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${rows.length > 0 ? Math.round((recordedCount / rows.length) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/25 shadow-xs">
              <div className="text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                ประมาณการยอดเรียกเก็บค่าน้ำ-ไฟ
              </div>
              <div className="text-2xl font-extrabold text-[var(--foreground)] mt-1.5 font-mono">
                {formatCurrency(totalEstimatedCost)}
              </div>
              <div className="text-[11px] text-[var(--muted)] mt-1">
                พร้อมนำไปออกบิลรายเดือนทันที
              </div>
            </div>
          </div>

          {/* Spreadsheet Table with Search */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
            {/* Table Search Bar */}
            <div className="p-3.5 border-b border-[var(--border)] bg-[var(--subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--muted)] pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาเลขห้อง หรือชื่อผู้เช่า..."
                  className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl pl-8 pr-7 py-1.5 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition shadow-2xs font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2 text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="text-xs text-[var(--muted)] flex items-center gap-2">
                <span>
                  แสดง {filteredRows.length} จาก {rows.length} ห้อง
                </span>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-xs text-rose-500 hover:underline font-medium"
                  >
                    ล้างการค้นหา
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[var(--subtle)] border-b border-[var(--border)] text-[var(--muted)] uppercase font-semibold">
                    <th className="p-3.5 w-16">ห้อง</th>
                    <th className="p-3.5">ผู้พักอาศัย</th>
                    <th className="p-3.5 text-right bg-amber-500/5">ไฟก่อนหน้า</th>
                    <th className="p-3.5 text-center bg-amber-500/5 w-32">เลขไฟปัจจุบัน *</th>
                    <th className="p-3.5 text-right bg-amber-500/5 font-bold text-amber-600">หน่วยไฟ</th>
                    <th className="p-3.5 text-right bg-blue-500/5">น้ำก่อนหน้า</th>
                    <th className="p-3.5 text-center bg-blue-500/5 w-32">เลขน้ำปัจจุบัน *</th>
                    <th className="p-3.5 text-right bg-blue-500/5 font-bold text-blue-600">หน่วยน้ำ</th>
                    <th className="p-3.5 text-right">รวมเงิน (บาท)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-[var(--foreground)]">
                  {filteredRows.length > 0 ? (
                    filteredRows.map((row) => {
                      const elecVal = row.electricCurr === "" ? row.electricPrev : Number(row.electricCurr);
                      const waterVal = row.waterCurr === "" ? row.waterPrev : Number(row.waterCurr);
                      const elecDiff = Math.max(0, elecVal - row.electricPrev);
                      const waterDiff = Math.max(0, waterVal - row.waterPrev);
                      const cost = elecDiff * electricRate + waterDiff * waterRate;

                      return (
                        <tr key={row.roomId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                          <td className="p-3.5">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-bold text-xs">
                              {row.roomNumber}
                            </span>
                          </td>
                          <td className="p-3.5 text-[var(--muted)] font-medium">{row.tenantName}</td>
                          <td className="p-3.5 text-right font-mono text-[var(--muted)] bg-amber-500/5">
                            {row.electricPrev}
                          </td>
                          <td className="p-2 text-center bg-amber-500/5">
                            <input
                              type="number"
                              min={row.electricPrev}
                              value={row.electricCurr}
                              placeholder={String(row.electricPrev)}
                              onChange={(e) => handleElectricChange(row.roomId, e.target.value)}
                              className="w-24 px-2.5 py-1.5 rounded-lg bg-[var(--card)] border border-amber-300 dark:border-amber-700 text-center font-mono font-bold text-amber-600 dark:text-amber-400 focus:ring-2 focus:ring-amber-500/40 text-xs"
                            />
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/5">
                            +{elecDiff}
                          </td>
                          <td className="p-3.5 text-right font-mono text-[var(--muted)] bg-blue-500/5">
                            {row.waterPrev}
                          </td>
                          <td className="p-2 text-center bg-blue-500/5">
                            <input
                              type="number"
                              min={row.waterPrev}
                              value={row.waterCurr}
                              placeholder={String(row.waterPrev)}
                              onChange={(e) => handleWaterChange(row.roomId, e.target.value)}
                              className="w-24 px-2.5 py-1.5 rounded-lg bg-[var(--card)] border border-blue-300 dark:border-blue-700 text-center font-mono font-bold text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500/40 text-xs"
                            />
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-500/5">
                          +{waterDiff}
                        </td>
                        <td className="p-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                          {formatCurrency(cost)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-xs text-[var(--muted)]">
                      <Search className="w-5 h-5 mx-auto opacity-50 mb-1" />
                      <div>ไม่พบห้องพักหรือผู้เช่าที่ตรงกับ &ldquo;{searchQuery}&rdquo;</div>
                    </td>
                  </tr>
                )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === "photos" && (
        <div className="p-12 text-center bg-[var(--card)] rounded-2xl border border-[var(--border)]">
          <Camera className="w-12 h-12 text-blue-500 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-[var(--foreground)]">ยังไม่มีภาพถ่ายมิเตอร์ใหม่จากผู้เช่า</h3>
          <p className="text-xs text-[var(--muted)] mt-1 max-w-md mx-auto">
            เมื่อผู้เช่าส่งภาพถ่ายมิเตอร์เข้ามาใน LINE OA ระบบจะใช้ Vision OCR อ่านตัวเลขและนำมาแสดงที่นี่เพื่อให้ตรวจสอบและอนุมัติในคลิกเดียว
          </p>
        </div>
      )}

      {activeTab === "history" && (
        <div className="p-8 text-center bg-[var(--card)] rounded-2xl border border-[var(--border)] text-xs text-[var(--muted)]">
          แสดงประวัติการจดมิเตอร์ย้อนหลัง 12 เดือนของทุกห้อง สามารถดาวน์โหลดรายงานเพื่อวิเคราะห์การรั่วไหลของน้ำและไฟได้
        </div>
      )}
    </div>
  );
}
