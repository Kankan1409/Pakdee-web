"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Room, DailyBooking } from "@/types/dormitory";
import {
  Zap,
  Droplets,
  Save,
  RefreshCw,
  History,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Search,
  X,
  Download,
  Calendar,
  TrendingUp,
  FileSpreadsheet,
  ArrowRight,
  Filter,
} from "lucide-react";
import {
  buildYearMonthsList,
  formatCurrency,
  formatMeterTimestampThai,
  formatMonthThai,
  normalizeYearMonth,
} from "@/lib/utils";
import { DatabaseService } from "@/lib/database.service";
import { globalPopup } from "@/lib/popup-context";

export interface MeterReadingRecord {
  id: string;
  property_id?: string;
  room_id: string;
  room_number: string;
  tenant_name?: string;
  billing_month: string;
  electric_prev: number;
  electric_curr: number;
  electric_units: number;
  water_prev: number;
  water_curr: number;
  water_units: number;
  recorded_at: string;
  total_cost?: number;
  is_invoiced?: boolean;
}

interface MeterSpreadsheetViewProps {
  propertyId?: string;
  rooms: Room[];
  dailyBookings?: DailyBooking[];
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
  ) => Promise<void> | void;
}

export function MeterSpreadsheetView({
  propertyId,
  rooms,
  dailyBookings = [],
  electricRate,
  waterRate,
  onSaveMeters,
}: MeterSpreadsheetViewProps) {
  const [activeTab, setActiveTab] = useState<"entry" | "history">("entry");
  const [rows, setRows] = useState<
    {
      roomId: string;
      roomNumber: string;
      tenantName: string;
      isDaily?: boolean;
      electricPrev: number;
      electricCurr: number | "";
      waterPrev: number;
      waterCurr: number | "";
    }[]
  >([]);

  // History State
  const [historyRecords, setHistoryRecords] = useState<MeterReadingRecord[]>([]);
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Initialize Entry Rows from rooms
  useEffect(() => {
    setRows(
      rooms.map((r) => {
        const daily = dailyBookings?.find(
          (b) => b.roomNumber === r.roomNumber && (b.status === "confirmed" || b.status === "checked_in")
        );
        const isDaily = r.status === "daily" || Boolean(daily);
        const hasTenant = Boolean(r.currentTenant) || Boolean(daily);
        const tenantDisplayName = daily
          ? `${daily.guestName} (ผู้เช่ารายวัน)`
          : r.currentTenant
          ? r.currentTenant.fullName
          : "(ห้องว่าง)";
        return {
          roomId: r.id,
          roomNumber: r.roomNumber,
          tenantName: tenantDisplayName,
          isDaily,
          electricPrev: r.currentElectricMeter,
          electricCurr: isDaily ? r.currentElectricMeter : r.currentElectricMeter + (hasTenant ? 25 : 0),
          waterPrev: r.currentWaterMeter,
          waterCurr: isDaily ? r.currentWaterMeter : r.currentWaterMeter + (hasTenant ? 4 : 0),
        };
      })
    );
  }, [rooms, dailyBookings]);

  // Load real meter history from DatabaseService (wait for Supabase sync on fresh page load)
  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      await DatabaseService.init();
      const targetPropId = propertyId || DatabaseService.getActivePropertyId();
      const records = await DatabaseService.getMeterReadings(targetPropId);
      const enriched: MeterReadingRecord[] = (records || []).map((rec: any) => {
        const matchedRoom = rooms.find(
          (rm) => rm.id === rec.room_id || rm.roomNumber === rec.room_number
        );
        const elecPrev = Number(rec.electric_prev || 0);
        const elecCurr = Number(rec.electric_curr || 0);
        const waterPrev = Number(rec.water_prev || 0);
        const waterCurr = Number(rec.water_curr || 0);
        const elecUnits = Number(rec.electric_units ?? 0) || Math.max(0, elecCurr - elecPrev);
        const waterUnits = Number(rec.water_units ?? 0) || Math.max(0, waterCurr - waterPrev);
        const tenantName =
          rec.tenant_name && rec.tenant_name !== "(ห้องว่าง)"
            ? rec.tenant_name
            : matchedRoom?.currentTenant?.fullName || "(ห้องว่าง)";
        return {
          ...rec,
          room_number: rec.room_number || matchedRoom?.roomNumber || "",
          tenant_name: tenantName,
          billing_month: normalizeYearMonth(rec.billing_month || rec.reading_month) || new Date().toISOString().slice(0, 7),
          electric_prev: elecPrev,
          electric_curr: elecCurr,
          electric_units: elecUnits,
          water_prev: waterPrev,
          water_curr: waterCurr,
          water_units: waterUnits,
          total_cost: elecUnits * electricRate + waterUnits * waterRate,
        };
      });
      setHistoryRecords(enriched);
    } catch (e) {
      console.warn("Failed to load meter history:", e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [propertyId, rooms, electricRate, waterRate, activeTab]);

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
  const totalEstimatedCost = totalElecUnits * electricRate + totalWaterUnits * waterRate;

  const recordedCount = rows.filter(
    (r) =>
      (r.electricCurr !== "" && Number(r.electricCurr) > r.electricPrev) ||
      (r.waterCurr !== "" && Number(r.waterCurr) > r.waterPrev)
  ).length;

  // Validation: Check for any readings less than previous reading
  const decreasedRows = useMemo(() => {
    return rows.filter((r) => {
      const elecVal = r.electricCurr === "" ? r.electricPrev : Number(r.electricCurr);
      const waterVal = r.waterCurr === "" ? r.waterPrev : Number(r.waterCurr);
      return elecVal < r.electricPrev || waterVal < r.waterPrev;
    });
  }, [rows]);
  const hasDecreasedMeters = decreasedRows.length > 0;

  const executeSave = async () => {
    const readingsPayload = rows.map((r) => ({
      roomId: r.roomId,
      roomNumber: r.roomNumber,
      electricCurr: r.electricCurr === "" ? r.electricPrev : Number(r.electricCurr),
      waterCurr: r.waterCurr === "" ? r.waterPrev : Number(r.waterCurr),
      electricPrev: r.electricPrev,
      waterPrev: r.waterPrev,
    }));

    // Trigger parent save (persists batch to DatabaseService & Supabase immediately) and reload authoritative history
    await Promise.resolve(onSaveMeters(readingsPayload));
    await loadHistory();
  };

  // Available unique months from history
  const [recheckModalOpen, setRecheckModalOpen] = useState(false);

  const handleSaveAll = () => {
    // If any meter reading is lower than previous, prompt Recheck Confirmation Popup
    if (hasDecreasedMeters) {
      setRecheckModalOpen(true);
      return;
    }

    // Normal save without popup if all values are valid
    executeSave();
  };

  // Pre-populate all 12 months (January - December) + any historical months
  const availableMonths = useMemo(() => {
    return buildYearMonthsList(historyRecords.map((h) => h.billing_month));
  }, [historyRecords]);

  // Filtered History
  const filteredHistory = useMemo(() => {
    return historyRecords.filter((item) => {
      const itemMonth = normalizeYearMonth(item.billing_month) || item.billing_month;
      const matchMonth = selectedMonth === "all" || itemMonth === selectedMonth;
      const q = historySearchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        item.room_number.toLowerCase().includes(q) ||
        (item.tenant_name && item.tenant_name.toLowerCase().includes(q));
      return matchMonth && matchQuery;
    });
  }, [historyRecords, selectedMonth, historySearchQuery]);

  // History Totals
  const historyTotalElec = filteredHistory.reduce((acc, h) => acc + (h.electric_units || 0), 0);
  const historyTotalWater = filteredHistory.reduce((acc, h) => acc + (h.water_units || 0), 0);
  const historyTotalCost = filteredHistory.reduce(
    (acc, h) => acc + (h.electric_units * electricRate + h.water_units * waterRate),
    0
  );

  // Export History to CSV
  const handleExportHistoryCSV = () => {
    if (filteredHistory.length === 0) return;
    const headers = [
      "รอบบิล",
      "วันที่จด",
      "เลขห้อง",
      "ผู้พักอาศัย",
      "ไฟก่อนหน้า",
      "ไฟปัจจุบัน",
      "หน่วยไฟ",
      "ค่าไฟ (บาท)",
      "น้ำก่อนหน้า",
      "น้ำปัจจุบัน",
      "หน่วยน้ำ",
      "ค่าน้ำ (บาท)",
      "รวมเงิน (บาท)",
    ];

    const csvRows = filteredHistory.map((h) => {
      const elecCost = h.electric_units * electricRate;
      const waterCost = h.water_units * waterRate;
      const total = elecCost + waterCost;
      return [
        `"${h.billing_month || '-'}"`,
        `"${h.recorded_at || '-'}"`,
        `"${h.room_number}"`,
        `"${h.tenant_name || '-'}"`,
        h.electric_prev,
        h.electric_curr,
        h.electric_units,
        elecCost,
        h.water_prev,
        h.water_curr,
        h.water_units,
        waterCost,
        total,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `รายงานประวัติมิเตอร์_${selectedMonth === "all" ? "ทั้งหมด" : selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold shadow-xs">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--foreground)] tracking-tight flex items-center gap-2">
              <span>บันทึกมิเตอร์น้ำ-ไฟ (Spreadsheet Fast Entry)</span>
            </h1>
            <p className="text-xs text-[var(--muted)]">
              จดเลขล่าสุดของแต่ละห้อง — ระบบจะดึงเลขก่อนหน้ามาคำนวณจำนวนหน่วยและยอดเงินให้อัตโนมัติ
            </p>
          </div>
        </div>

        {activeTab === "entry" && (
          <button
            onClick={handleSaveAll}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-md shadow-emerald-500/20 transition cursor-pointer text-xs"
          >
            {hasDecreasedMeters ? (
              <AlertTriangle className="w-4 h-4 text-amber-300" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>
              {hasDecreasedMeters
                ? `บันทึกมิเตอร์ (มี ${decreasedRows.length} ห้องเลขลดลง - คลิกเพื่อ Recheck)`
                : `บันทึกเลขมิเตอร์ทั้งหมด (${rows.length} ห้อง)`}
            </span>
          </button>
        )}
      </div>

      {/* Mode Tabs */}
      <div className="flex items-center gap-2 bg-[var(--card)] p-2 rounded-2xl border border-[var(--border)] text-xs">
        <button
          onClick={() => setActiveTab("entry")}
          className={`px-4 py-2 rounded-xl font-medium transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === "entry"
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30 shadow-2xs"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>บันทึกเลขมิเตอร์ประจำรอบ</span>
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-xl font-medium transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === "history"
              ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold border border-purple-500/30 shadow-2xs"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>ประวัติย้อนหลัง ({historyRecords.length})</span>
        </button>
      </div>

      {/* TAB 1: ENTRY SPREADSHEET */}
      {activeTab === "entry" && (
        <>
          {/* Summary Bento Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xs">
              <div className="text-xs text-[var(--muted)] font-medium flex items-center justify-between">
                <span className="flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-300">
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> รวมไฟทั้งตึกเดือนนี้
                </span>
                <span className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-mono font-bold">
                  {electricRate} ฿/หน่วย
                </span>
              </div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1.5 font-mono">
                {totalElecUnits.toLocaleString()} <span className="text-xs font-normal text-[var(--muted)]">หน่วย</span>
              </div>
              <div className="text-[11px] text-[var(--muted)] mt-1 font-medium">
                รวมเป็นเงิน ฿{(totalElecUnits * electricRate).toLocaleString()}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xs">
              <div className="text-xs text-[var(--muted)] font-medium flex items-center justify-between">
                <span className="flex items-center gap-1 font-semibold text-blue-800 dark:text-blue-300">
                  <Droplets className="w-3.5 h-3.5 text-blue-500" /> รวมน้ำทั้งตึกเดือนนี้
                </span>
                <span className="text-[10px] bg-blue-500/15 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-mono font-bold">
                  {waterRate} ฿/หน่วย
                </span>
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1.5 font-mono">
                {totalWaterUnits.toLocaleString()} <span className="text-xs font-normal text-[var(--muted)]">หน่วย</span>
              </div>
              <div className="text-[11px] text-[var(--muted)] mt-1 font-medium">
                รวมเป็นเงิน ฿{(totalWaterUnits * waterRate).toLocaleString()}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xs">
              <div className="text-xs text-[var(--muted)] font-medium flex items-center justify-between">
                <span className="flex items-center gap-1 font-semibold text-emerald-800 dark:text-emerald-300">
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
              <div className="text-[11px] text-[var(--muted)] mt-1 font-medium">
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

            {/* Recheck Notice if any meter decreased */}
            {hasDecreasedMeters && (
              <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-900 dark:text-amber-100 text-xs font-medium animate-in fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="flex-1">
                  <span className="font-bold">แจ้งเตือน Recheck:</span> มี {decreasedRows.length} ห้อง ({decreasedRows.map((r) => `ห้อง ${r.roomNumber}`).join(", ")}) ที่ตัวเลขจดได้น้อยกว่าครั้งก่อน เมื่อกดบันทึกจะมีหน้าต่าง Popup ให้ตรวจสอบยืนยันอีกครั้ง
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-2xl border border-[var(--border)] shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  {/* Category Super-header */}
                  <tr className="border-b border-[var(--border)] text-[11px] font-bold uppercase tracking-wider">
                    <th colSpan={2} className="p-2.5 bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border-r border-[var(--border)]">
                      ข้อมูลห้องพัก
                    </th>
                    <th colSpan={3} className="p-2.5 bg-amber-500/15 text-amber-950 dark:text-amber-100 border-r border-amber-300/40 text-center">
                      <div className="inline-flex items-center gap-1.5 font-bold">
                        <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span>ระบบไฟฟ้า (฿{electricRate}/หน่วย)</span>
                      </div>
                    </th>
                    <th colSpan={3} className="p-2.5 bg-sky-500/15 text-sky-950 dark:text-sky-100 border-r border-sky-300/40 text-center">
                      <div className="inline-flex items-center gap-1.5 font-bold">
                        <Droplets className="w-3.5 h-3.5 fill-sky-500 text-sky-500" />
                        <span>ระบบน้ำประปา (฿{waterRate}/หน่วย)</span>
                      </div>
                    </th>
                    <th className="p-2.5 bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 text-right">
                      คำนวณเงิน
                    </th>
                  </tr>

                  {/* Columns Sub-header */}
                  <tr className="bg-[var(--subtle)] border-b border-[var(--border)] text-[var(--muted)] uppercase font-semibold text-[11px]">
                    <th className="p-3 w-16">ห้อง</th>
                    <th className="p-3 border-r border-[var(--border)]">ผู้พักอาศัย</th>

                    {/* ELECTRIC SUB-COLUMNS */}
                    <th className="p-2.5 text-center bg-amber-500/10 font-bold text-amber-950 dark:text-amber-100 whitespace-nowrap w-32 border-r border-amber-200/50">
                      <div className="flex items-center justify-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        <span>ไฟก่อนหน้า</span>
                      </div>
                    </th>
                    <th className="p-2.5 text-center bg-amber-500/5 font-bold text-amber-900 dark:text-amber-200 w-36 whitespace-nowrap border-r border-amber-200/50">
                      <span>เลขไฟจดใหม่ *</span>
                    </th>
                    <th className="p-2.5 text-right bg-amber-500/5 font-bold text-amber-800 dark:text-amber-300 w-24 border-r border-[var(--border)]">
                      หน่วยไฟ
                    </th>

                    {/* WATER SUB-COLUMNS */}
                    <th className="p-2.5 text-center bg-sky-500/10 font-bold text-sky-950 dark:text-sky-100 whitespace-nowrap w-32 border-r border-sky-200/50">
                      <div className="flex items-center justify-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
                        <span>น้ำก่อนหน้า</span>
                      </div>
                    </th>
                    <th className="p-2.5 text-center bg-sky-500/5 font-bold text-sky-900 dark:text-sky-200 w-36 whitespace-nowrap border-r border-sky-200/50">
                      <span>เลขน้ำจดใหม่ *</span>
                    </th>
                    <th className="p-2.5 text-right bg-sky-500/5 font-bold text-sky-800 dark:text-sky-300 w-24 border-r border-[var(--border)]">
                      หน่วยน้ำ
                    </th>

                    <th className="p-3 text-right">รวมเงิน (บาท)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-[var(--foreground)]">
                  {filteredRows.length > 0 ? (
                    filteredRows.map((row) => {
                      const elecVal = row.isDaily ? row.electricPrev : (row.electricCurr === "" ? row.electricPrev : Number(row.electricCurr));
                      const waterVal = row.isDaily ? row.waterPrev : (row.waterCurr === "" ? row.waterPrev : Number(row.waterCurr));
                      const isElecDecreased = !row.isDaily && row.electricCurr !== "" && Number(row.electricCurr) < row.electricPrev;
                      const isWaterDecreased = !row.isDaily && row.waterCurr !== "" && Number(row.waterCurr) < row.waterPrev;
                      const elecDiff = row.isDaily ? 0 : Math.max(0, elecVal - row.electricPrev);
                      const waterDiff = row.isDaily ? 0 : Math.max(0, waterVal - row.waterPrev);
                      const cost = row.isDaily ? 0 : elecDiff * electricRate + waterDiff * waterRate;

                      return (
                        <tr key={row.roomId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition">
                          <td className="p-3">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs shadow-2xs font-mono">
                              {row.roomNumber}
                            </span>
                          </td>
                          <td className="p-3 font-medium border-r border-[var(--border)]">
                            {row.tenantName === "(ห้องว่าง)" ? (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[11px]">
                                {row.tenantName}
                              </span>
                            ) : (
                              <span className="text-[var(--foreground)] font-semibold">{row.tenantName}</span>
                            )}
                          </td>

                          {/* REFINED PROMINENT PREVIOUS ELECTRIC CELL */}
                          <td className="p-2 text-center bg-amber-500/10 border-r border-amber-200/50">
                            <div className="inline-flex items-center justify-between w-28 px-3 py-1.5 rounded-xl bg-amber-100/90 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 shadow-2xs">
                              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 select-none">
                                ก่อน:
                              </span>
                              <span className="font-mono font-black text-sm text-amber-950 dark:text-amber-50 tracking-tight">
                                {row.electricPrev.toLocaleString()}
                              </span>
                            </div>
                          </td>

                          {/* ELECTRIC CURRENT INPUT WITH RECHECK WARNING */}
                          <td className="p-2 text-center bg-amber-500/5 border-r border-amber-200/50">
                            <div className="flex flex-col items-center justify-center">
                              {row.isDaily ? (
                                <div className="relative">
                                  <input
                                    type="number"
                                    disabled
                                    value={row.electricPrev}
                                    readOnly
                                    className="w-28 px-3 py-1.5 rounded-xl text-center font-mono font-bold text-sm bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-75"
                                    title="ห้องพักรายวัน: ล็อกมิเตอร์ ไม่คิดค่าไฟรายหน่วย"
                                  />
                                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded bg-slate-600 text-white text-[9px] font-bold whitespace-nowrap shadow-xs">
                                    🔒 ล็อก (รายวัน)
                                  </span>
                                </div>
                              ) : (
                                <div className="relative">
                                  <input
                                    type="number"
                                    value={row.electricCurr}
                                    placeholder={String(row.electricPrev)}
                                    onChange={(e) => handleElectricChange(row.roomId, e.target.value)}
                                    className={`w-28 px-3 py-1.5 rounded-xl text-center font-mono font-bold text-sm transition-all ${
                                      isElecDecreased
                                        ? "bg-amber-50/80 dark:bg-amber-950/40 border-2 border-amber-500 text-amber-950 dark:text-amber-100 focus:outline-none focus:ring-4 focus:ring-amber-500/20 shadow-xs"
                                        : "bg-white dark:bg-slate-900 border-2 border-amber-400 dark:border-amber-600 text-amber-950 dark:text-amber-100 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 shadow-2xs"
                                    }`}
                                  />
                                  {isElecDecreased && (
                                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded bg-amber-600 text-white text-[9px] font-bold whitespace-nowrap shadow-xs">
                                      ลดลง
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="p-2.5 text-right font-mono font-bold bg-amber-500/5 border-r border-[var(--border)]">
                            {elecDiff > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100 font-bold text-xs">
                                +{elecDiff}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">+0</span>
                            )}
                          </td>

                          {/* REFINED PROMINENT PREVIOUS WATER CELL */}
                          <td className="p-2 text-center bg-sky-500/10 border-r border-sky-200/50">
                            <div className="inline-flex items-center justify-between w-28 px-3 py-1.5 rounded-xl bg-sky-100/90 dark:bg-sky-950/70 border border-sky-300 dark:border-sky-700 shadow-2xs">
                              <span className="text-[10px] font-bold text-sky-800 dark:text-sky-300 select-none">
                                ก่อน:
                              </span>
                              <span className="font-mono font-black text-sm text-sky-950 dark:text-sky-50 tracking-tight">
                                {row.waterPrev.toLocaleString()}
                              </span>
                            </div>
                          </td>

                          {/* WATER CURRENT INPUT WITH RECHECK WARNING */}
                          <td className="p-2 text-center bg-sky-500/5 border-r border-sky-200/50">
                            <div className="flex flex-col items-center justify-center">
                              {row.isDaily ? (
                                <div className="relative">
                                  <input
                                    type="number"
                                    disabled
                                    value={row.waterPrev}
                                    readOnly
                                    className="w-28 px-3 py-1.5 rounded-xl text-center font-mono font-bold text-sm bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-75"
                                    title="ห้องพักรายวัน: ล็อกมิเตอร์ ไม่คิดค่าน้ำรายหน่วย"
                                  />
                                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded bg-slate-600 text-white text-[9px] font-bold whitespace-nowrap shadow-xs">
                                    🔒 ล็อก (รายวัน)
                                  </span>
                                </div>
                              ) : (
                                <div className="relative">
                                  <input
                                    type="number"
                                    value={row.waterCurr}
                                    placeholder={String(row.waterPrev)}
                                    onChange={(e) => handleWaterChange(row.roomId, e.target.value)}
                                    className={`w-28 px-3 py-1.5 rounded-xl text-center font-mono font-bold text-sm transition-all ${
                                      isWaterDecreased
                                        ? "bg-amber-50/80 dark:bg-amber-950/40 border-2 border-amber-500 text-sky-950 dark:text-sky-100 focus:outline-none focus:ring-4 focus:ring-amber-500/20 shadow-xs"
                                        : "bg-white dark:bg-slate-900 border-2 border-sky-400 dark:border-sky-600 text-sky-950 dark:text-sky-100 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/20 shadow-2xs"
                                    }`}
                                  />
                                  {isWaterDecreased && (
                                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded bg-amber-600 text-white text-[9px] font-bold whitespace-nowrap shadow-xs">
                                      ลดลง
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="p-2.5 text-right font-mono font-bold bg-sky-500/5 border-r border-[var(--border)]">
                            {waterDiff > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-sky-200 dark:bg-sky-900/60 text-sky-900 dark:text-sky-100 font-bold text-xs">
                                +{waterDiff}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">+0</span>
                            )}
                          </td>

                          <td className="p-3 text-right font-bold font-mono">
                            {row.isDaily ? (
                              <span className="text-slate-400 text-xs font-normal">(รวมในค่าห้อง)</span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 text-sm">{formatCurrency(cost)}</span>
                            )}
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

      {/* TAB 2: METER READING HISTORY (เต็มรูปแบบ) */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {/* History Bento Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xs">
              <div className="text-xs text-[var(--muted)] font-medium flex items-center justify-between">
                <span className="flex items-center gap-1 font-semibold text-purple-800 dark:text-purple-300">
                  <Calendar className="w-3.5 h-3.5 text-purple-500" /> รอบบิลที่เลือก
                </span>
                <span className="text-[10px] bg-purple-500/15 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-bold">
                  {selectedMonth === "all" ? "ทั้งหมด" : formatMonthThai(selectedMonth)}
                </span>
              </div>
              <div className="text-2xl font-bold text-[var(--foreground)] mt-1.5 font-mono">
                {filteredHistory.length} <span className="text-xs font-normal text-[var(--muted)]">รายการ</span>
              </div>
              <div className="text-[11px] text-[var(--muted)] mt-1 font-medium">
                ประวัติการจดมิเตอร์ที่บันทึกแล้ว
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xs">
              <div className="text-xs text-[var(--muted)] font-medium flex items-center justify-between">
                <span className="flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-300">
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> ยอดใช้ไฟฟ้ารวม
                </span>
                <span className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-mono font-bold">
                  {electricRate} ฿/หน่วย
                </span>
              </div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1.5 font-mono">
                {historyTotalElec.toLocaleString()} <span className="text-xs font-normal text-[var(--muted)]">หน่วย</span>
              </div>
              <div className="text-[11px] text-[var(--muted)] mt-1 font-medium">
                รวมเป็นเงิน ฿{(historyTotalElec * electricRate).toLocaleString()}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xs">
              <div className="text-xs text-[var(--muted)] font-medium flex items-center justify-between">
                <span className="flex items-center gap-1 font-semibold text-blue-800 dark:text-blue-300">
                  <Droplets className="w-3.5 h-3.5 text-blue-500" /> ยอดใช้น้ำประปารวม
                </span>
                <span className="text-[10px] bg-blue-500/15 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-mono font-bold">
                  {waterRate} ฿/หน่วย
                </span>
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1.5 font-mono">
                {historyTotalWater.toLocaleString()} <span className="text-xs font-normal text-[var(--muted)]">หน่วย</span>
              </div>
              <div className="text-[11px] text-[var(--muted)] mt-1 font-medium">
                รวมเป็นเงิน ฿{(historyTotalWater * waterRate).toLocaleString()}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 via-emerald-500/5 to-transparent border border-purple-500/25 shadow-xs">
              <div className="text-xs text-purple-700 dark:text-purple-300 font-bold">
                ยอดรวมค่าสาธารณูปโภคทั้งหมด
              </div>
              <div className="text-2xl font-extrabold text-[var(--foreground)] mt-1.5 font-mono">
                {formatCurrency(historyTotalCost)}
              </div>
              <div className="text-[11px] text-[var(--muted)] mt-1 font-medium">
                ค่าไฟ ฿{(historyTotalElec * electricRate).toLocaleString()} + ค่าน้ำ ฿{(historyTotalWater * waterRate).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Controls & Filter Bar */}
          <div className="p-4 bg-[var(--card)] rounded-2xl border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 flex-wrap flex-1">
              {/* Month Dropdown */}
              <div className="flex items-center gap-1.5 text-xs text-[var(--foreground)]">
                <Filter className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span className="font-semibold text-[var(--muted)]">รอบบิล:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-[var(--subtle)] border border-[var(--border)] rounded-xl px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="all">ทุกรอบบิล ({historyRecords.length} รายการ)</option>
                  {availableMonths.map((m) => {
                    const count = historyRecords.filter(
                      (h) => (normalizeYearMonth(h.billing_month) || h.billing_month) === m
                    ).length;
                    const isCurrent = m === new Date().toISOString().slice(0, 7);
                    return (
                      <option key={m} value={m}>
                        {formatMonthThai(m)} {count > 0 ? `(${count} รายการ)` : ""} {isCurrent ? "★ เดือนปัจจุบัน" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--muted)] pointer-events-none" />
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="ค้นหาเลขห้อง หรือชื่อผู้เช่า..."
                  className="w-full bg-[var(--subtle)] border border-[var(--border)] rounded-xl pl-8 pr-7 py-1.5 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-purple-500 transition font-medium"
                />
                {historySearchQuery && (
                  <button
                    type="button"
                    onClick={() => setHistorySearchQuery("")}
                    className="absolute right-2.5 top-2 text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Export CSV Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportHistoryCSV}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-sm transition cursor-pointer"
                title="ส่งออกรายงานประวัติมิเตอร์เป็นไฟล์ CSV / Excel"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลดรายงาน (CSV)</span>
              </button>
            </div>
          </div>

          {/* History Data Table */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[var(--subtle)] border-b border-[var(--border)] text-[var(--muted)] uppercase font-semibold text-[11px]">
                    <th className="p-3.5 whitespace-nowrap">รอบบิล / วันที่จด</th>
                    <th className="p-3.5 w-16">ห้อง</th>
                    <th className="p-3.5">ผู้พักอาศัย</th>
                    <th className="p-3.5 bg-amber-500/5 text-center font-bold text-amber-900 dark:text-amber-300">
                      ⚡ ประวัติมิเตอร์ไฟฟ้า (ก่อน ➔ จดได้)
                    </th>
                    <th className="p-3.5 bg-amber-500/5 text-right font-bold text-amber-700 dark:text-amber-400">
                      ค่าไฟ (฿)
                    </th>
                    <th className="p-3.5 bg-sky-500/5 text-center font-bold text-sky-900 dark:text-sky-300">
                      💧 ประวัติมิเตอร์น้ำ (ก่อน ➔ จดได้)
                    </th>
                    <th className="p-3.5 bg-sky-500/5 text-right font-bold text-sky-700 dark:text-sky-400">
                      ค่าน้ำ (฿)
                    </th>
                    <th className="p-3.5 text-right font-bold">รวมเงินสุทธิ</th>
                    <th className="p-3.5 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-[var(--foreground)]">
                  {filteredHistory.length > 0 ? (
                    filteredHistory.map((item) => {
                      const elecCost = item.electric_units * electricRate;
                      const waterCost = item.water_units * waterRate;
                      const total = elecCost + waterCost;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="font-semibold text-purple-700 dark:text-purple-300 text-xs">
                              {formatMonthThai(item.billing_month)}
                            </div>
                            <div className="text-[11px] text-[var(--muted)]">
                              {formatMeterTimestampThai(item.recorded_at)}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs shadow-2xs">
                              {item.room_number}
                            </span>
                          </td>
                          <td className="p-3.5 font-medium text-[var(--muted)]">
                            {item.tenant_name || "(ห้องว่าง)"}
                          </td>
                          {/* Electric History Badge */}
                          <td className="p-3 bg-amber-500/5 text-center">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-100/70 dark:bg-amber-950/40 border border-amber-300/80 font-mono text-xs">
                              <span className="text-amber-800 dark:text-amber-300 font-semibold">{item.electric_prev}</span>
                              <ArrowRight className="w-3 h-3 text-amber-500" />
                              <span className="text-amber-900 dark:text-amber-100 font-bold">{item.electric_curr}</span>
                              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-200/80 dark:bg-amber-900/60 px-1.5 py-0.5 rounded ml-1">
                                +{item.electric_units} หน่วย
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/5">
                            ฿{elecCost.toLocaleString()}
                          </td>
                          {/* Water History Badge */}
                          <td className="p-3 bg-sky-500/5 text-center">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-100/70 dark:bg-sky-950/40 border border-sky-300/80 font-mono text-xs">
                              <span className="text-sky-800 dark:text-sky-300 font-semibold">{item.water_prev}</span>
                              <ArrowRight className="w-3 h-3 text-sky-500" />
                              <span className="text-sky-900 dark:text-sky-100 font-bold">{item.water_curr}</span>
                              <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-200/80 dark:bg-sky-900/60 px-1.5 py-0.5 rounded ml-1">
                                +{item.water_units} หน่วย
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400 bg-sky-500/5">
                            ฿{waterCost.toLocaleString()}
                          </td>
                          <td className="p-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                            {formatCurrency(total)}
                          </td>
                          <td className="p-3.5 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" /> ออกบิลแล้ว
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-10 text-center text-xs text-[var(--muted)]">
                        <History className="w-8 h-8 mx-auto text-purple-400 opacity-50 mb-2" />
                        <div className="font-semibold text-sm text-[var(--foreground)]">ยังไม่มีประวัติการจดมิเตอร์ในรอบบิลนี้</div>
                        <div className="text-[11px] mt-1">
                          คุณสามารถบันทึกมิเตอร์ที่แท็บ &ldquo;บันทึกเลขมิเตอร์ประจำรอบ&rdquo; เพื่อให้ระบบเก็บประวัติอัตโนมัติ
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Recheck Confirmation Modal */}
      {recheckModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop blur */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setRecheckModalOpen(false)}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl z-10 animate-in zoom-in-95 fade-in duration-150">
            {/* Top Badge & Close */}
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>แจ้งเตือนการตรวจสอบ (Recheck Required)</span>
              </span>
              <button
                type="button"
                onClick={() => setRecheckModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="ปิดหน้าต่าง (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title & Desc */}
            <div className="space-y-1 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                เลขมิเตอร์ลดลงกว่าครั้งก่อน ({decreasedRows.length} ห้อง)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                ระบบตรวจพบว่ามีห้องพักที่กรอกตัวเลขน้อยกว่าครั้งก่อน กรุณา Recheck ว่าเป็นการเปลี่ยนมิเตอร์ใหม่ หรือมีการคีย์ตัวเลขผิดพลาดหรือไม่:
              </p>
            </div>

            {/* List of decreased rooms */}
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1 mb-5">
              {decreasedRows.map((r) => {
                const elecVal = r.electricCurr === "" ? r.electricPrev : Number(r.electricCurr);
                const waterVal = r.waterCurr === "" ? r.waterPrev : Number(r.waterCurr);
                const isElecDec = elecVal < r.electricPrev;
                const isWaterDec = waterVal < r.waterPrev;

                return (
                  <div
                    key={r.roomId}
                    className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-900 dark:bg-slate-800 text-white font-mono text-xs">
                        ห้อง {r.roomNumber}
                      </span>
                      <span className="text-slate-600 dark:text-slate-300 text-[11px] font-normal">
                        ผู้เช่า: {r.tenantName}
                      </span>
                    </div>

                    <div className="space-y-1 pl-1">
                      {isElecDec && (
                        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-mono">
                          <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="font-sans font-medium text-[11px]">ไฟ:</span>
                          <span className="text-slate-500 line-through">เดิม {r.electricPrev}</span>
                          <ArrowRight className="w-3 h-3 text-amber-600" />
                          <span className="font-bold text-amber-700 dark:text-amber-300">จดใหม่ {elecVal}</span>
                          <span className="text-[10px] bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100 px-1.5 py-0.2 rounded font-bold">
                            ลดลง {r.electricPrev - elecVal} หน่วย
                          </span>
                        </div>
                      )}

                      {isWaterDec && (
                        <div className="flex items-center gap-2 text-sky-900 dark:text-sky-200 font-mono">
                          <Droplets className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          <span className="font-sans font-medium text-[11px]">น้ำ:</span>
                          <span className="text-slate-500 line-through">เดิม {r.waterPrev}</span>
                          <ArrowRight className="w-3 h-3 text-sky-600" />
                          <span className="font-bold text-sky-700 dark:text-sky-300">จดใหม่ {waterVal}</span>
                          <span className="text-[10px] bg-sky-200 dark:bg-sky-900/60 text-sky-900 dark:text-sky-100 px-1.5 py-0.2 rounded font-bold">
                            ลดลง {r.waterPrev - waterVal} หน่วย
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRecheckModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition cursor-pointer"
              >
                กลับไปแก้ไข / ตรวจสอบ
              </button>
              <button
                type="button"
                onClick={() => {
                  setRecheckModalOpen(false);
                  executeSave();
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs shadow-lg shadow-amber-500/25 transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>ยืนยันตัวเลขลดลง และบันทึกต่อ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
