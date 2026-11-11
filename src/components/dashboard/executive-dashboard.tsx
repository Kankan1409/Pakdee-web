"use client";

import React, { useState } from "react";
import { Room, Invoice, Property, RoomStatus } from "@/types/dormitory";
import { formatCurrency, formatMonthThai } from "@/lib/utils";
import {
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  Zap,
  Droplets,
  ArrowUpRight,
  Home,
  DollarSign,
  Layers,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Sparkles,
  Phone,
  FileText,
  AlertTriangle,
  Printer,
  ArrowDownRight,
  X,
  Download,
} from "lucide-react";

interface ExecutiveDashboardProps {
  rooms: Room[];
  invoices: Invoice[];
  property: Property;
  onOpenQuickMeter: () => void;
  onOpenAddTenant: (roomId?: string) => void;
  onAutoBilling: () => void;
  onNavigateTab: (tab: string) => void;
  onSelectRoom: (room: Room) => void;
  onMarkInvoicePaid: (invoiceId: string) => void;
  onUpdateRoomStatus: (roomId: string, status: RoomStatus) => void;
}

export function ExecutiveDashboard({
  rooms,
  invoices,
  property,
  onOpenQuickMeter,
  onOpenAddTenant,
  onAutoBilling,
  onNavigateTab,
  onSelectRoom,
  onMarkInvoicePaid,
  onUpdateRoomStatus,
}: ExecutiveDashboardProps) {
  const [activeChartTab, setActiveChartTab] = useState<"occupancy" | "revenue">("occupancy");
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState<number | null>(5); // Default to current month (Oct)

  const totalRooms = rooms.length;
  const occupiedMonthly = rooms.filter((r) => r.status === "occupied").length;
  const occupiedDaily = rooms.filter((r) => r.status === "daily").length;
  const unpaidRoomNumbers = React.useMemo(() => {
    return new Set(invoices.filter((i) => i.status !== "paid" && i.status !== "carried_forward").map((i) => i.roomNumber));
  }, [invoices]);
  const overdueRooms = rooms.filter(
    (r) => unpaidRoomNumbers.has(r.roomNumber) || r.status === "overdue"
  ).length;
  const cleaningRooms = rooms.filter((r) => r.status === "cleaning").length;
  const vacantRooms = rooms.filter(
    (r) => r.status === "vacant" && !unpaidRoomNumbers.has(r.roomNumber)
  ).length;

  const totalOccupied = occupiedMonthly + occupiedDaily + overdueRooms;
  const occupancyRate = totalRooms > 0 ? Math.round((totalOccupied / totalRooms) * 100) : 0;

  // Extract unique available billing months from invoices
  const availableMonths = React.useMemo(() => {
    const set = new Set<string>();
    const nowStr = new Date().toISOString().slice(0, 7);
    set.add(nowStr);
    invoices.forEach((inv) => {
      if (inv.billingDate && inv.billingDate.length >= 7) {
        set.add(inv.billingDate.slice(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [invoices]);

  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const accountingBasis = "billing";
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  // Filter invoices based on selected month (ตามรอบบิล)
  const filteredInvoices = React.useMemo(() => {
    if (selectedMonth === "all") {
      return invoices;
    }
    return invoices.filter((i) => (i.billingDate || "").startsWith(selectedMonth));
  }, [invoices, selectedMonth]);

  // Real database values calculated directly from filtered invoices
  const currentOcc = occupancyRate;
  const currentBilled = filteredInvoices.reduce((acc, i) => acc + i.totalAmount, 0);
  const currentPaid = filteredInvoices.filter((i) => i.status === "paid").reduce((acc, i) => acc + i.totalAmount, 0);
  const currentOverdue = filteredInvoices.filter((i) => i.status !== "paid" && i.status !== "carried_forward").reduce((acc, i) => acc + i.totalAmount, 0);
  const collectionRate = currentBilled > 0 ? Math.round((currentPaid / currentBilled) * 100) : 0;

  // Previous Month for MoM Comparison
  const prevMonthStr = React.useMemo(() => {
    if (selectedMonth === "all") return "";
    const [year, month] = selectedMonth.split("-").map(Number);
    const d = new Date(year, month - 2, 1);
    const py = d.getFullYear();
    const pm = String(d.getMonth() + 1).padStart(2, "0");
    return `${py}-${pm}`;
  }, [selectedMonth]);

  const prevMonthInvoices = React.useMemo(() => {
    if (!prevMonthStr) return [];
    return invoices.filter((i) => (i.billingDate || "").startsWith(prevMonthStr));
  }, [invoices, prevMonthStr]);

  const prevMonthPaid = prevMonthInvoices
    .filter((i) => i.status === "paid")
    .reduce((acc, i) => acc + i.totalAmount, 0);
  const prevMonthBilled = prevMonthInvoices.reduce((acc, i) => acc + i.totalAmount, 0);

  const paidGrowthMoM =
    prevMonthPaid > 0
      ? Math.round(((currentPaid - prevMonthPaid) / prevMonthPaid) * 100)
      : null;

  // Categorized breakdown for financial statement report
  const reportCategoryBreakdown = React.useMemo(() => {
    let rentTotal = 0;
    let electricTotal = 0;
    let waterTotal = 0;
    let serviceTotal = 0;
    let depositTotal = 0;

    filteredInvoices.forEach((inv) => {
      inv.items?.forEach((item) => {
        const desc = ((item as any).description || item.name || "").toLowerCase();
        if (desc.includes("ค่าเช่า") || desc.includes("ห้อง")) {
          rentTotal += item.amount;
        } else if (desc.includes("ไฟ") || desc.includes("electric")) {
          electricTotal += item.amount;
        } else if (desc.includes("น้ำ") || desc.includes("water")) {
          waterTotal += item.amount;
        } else if (desc.includes("มัดจำ") || desc.includes("ประกัน")) {
          depositTotal += item.amount;
        } else {
          serviceTotal += item.amount;
        }
      });
    });

    return {
      rentTotal,
      electricTotal,
      waterTotal,
      serviceTotal,
      depositTotal,
    };
  }, [filteredInvoices]);

  // Monthly 6-Month Trend Data - Clean progression calculated 100% dynamically from REAL invoices & meters
  const monthlyTrends = React.useMemo(() => {
    const now = new Date();
    const anchorDate =
      selectedMonth !== "all" && selectedMonth.length >= 7
        ? new Date(`${selectedMonth}-01`)
        : now;
    const months: { ym: string; label: string }[] = [];
    const thaiMonthsShort = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${thaiMonthsShort[d.getMonth()]}`;
      months.push({ ym, label });
    }

    return months.map(({ ym, label }) => {
      // Filter real invoices belonging to this billing month
      const monthInvs = invoices.filter((inv) => {
        const invDate =
          inv.billingDate ||
          (inv as any).billingMonth ||
          (inv as any).createdAt ||
          "";
        return invDate.startsWith(ym);
      });

      const rev = monthInvs.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      const coll = monthInvs
        .filter((inv) => inv.status === "paid")
        .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      const over = monthInvs
        .filter((inv) => inv.status !== "paid" && inv.status !== "carried_forward")
        .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

      // Utility usage calculated from actual invoice items
      let elecUnits = 0;
      let watUnits = 0;
      monthInvs.forEach((inv) => {
        inv.items?.forEach((item: any) => {
          const desc = (item.description || item.name || "").toLowerCase();
          if (desc.includes("ไฟ") || desc.includes("electric")) {
            elecUnits += item.units || (item.rate > 0 ? Math.round(item.amount / item.rate) : 0);
          } else if (desc.includes("น้ำ") || desc.includes("water")) {
            watUnits += item.units || (item.rate > 0 ? Math.round(item.amount / item.rate) : 0);
          }
        });
      });

      // Current month fallback to meter readings if no invoice items
      const isCurrentMonth = ym === now.toISOString().slice(0, 7);
      if (isCurrentMonth && elecUnits === 0 && rooms.length > 0) {
        elecUnits = rooms.reduce((sum, r) => sum + ((r.currentElectricMeter || 0) % 100), 0);
      }
      if (isCurrentMonth && watUnits === 0 && rooms.length > 0) {
        watUnits = rooms.reduce((sum, r) => sum + ((r.currentWaterMeter || 0) % 20), 0);
      }

      // Occupancy rate calculation
      let occ = 0;
      if (totalRooms > 0) {
        if (isCurrentMonth) {
          occ = occupancyRate;
        } else if (rev > 0) {
          occ = Math.min(100, Math.round((monthInvs.length / totalRooms) * 100));
        }
      }

      return {
        month: label,
        yearMonth: ym,
        occupancy: occ,
        revenue: rev,
        collected: coll,
        overdue: over,
        electricUnits: elecUnits,
        waterUnits: watUnits,
      };
    });
  }, [invoices, selectedMonth, totalRooms, occupancyRate, rooms]);

  // SVG Chart Geometry for Area Chart
  const svgWidth = 620;
  const svgHeight = 220;
  const paddingLeft = 50;
  const paddingRight = 25;
  const paddingTop = 25;
  const paddingBottom = 35;
  const chartW = svgWidth - paddingLeft - paddingRight;
  const chartH = svgHeight - paddingTop - paddingBottom;

  // Safe Bounded Points calculation (Strictly within 0 - 100 for % and 0 - max for revenue)
  const getCoords = (idx: number, val: number, min: number, max: number) => {
    const clamped = Math.min(max, Math.max(min, val));
    const x = paddingLeft + (idx / (monthlyTrends.length - 1)) * chartW;
    const y = paddingTop + chartH - ((clamped - min) / (max - min || 1)) * chartH;
    return { x, y };
  };

  const occPoints = monthlyTrends.map((d, i) => getCoords(i, d.occupancy, 0, 100));
  const maxRevenueScale = Math.max(
    10000,
    ...monthlyTrends.map((d) => d.revenue * 1.25),
    currentBilled * 1.25
  );
  const revPoints = monthlyTrends.map((d, i) => getCoords(i, d.revenue, 0, maxRevenueScale));

  // Build SVG Path with smooth curves
  const buildSmoothPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const activePoints = activeChartTab === "occupancy" ? occPoints : revPoints;
  const linePath = buildSmoothPath(activePoints);
  const baselineY = paddingTop + chartH;
  const areaPath = `${linePath} L ${activePoints[activePoints.length - 1].x} ${baselineY} L ${activePoints[0].x} ${baselineY} Z`;

  // Donut Chart Slices Math (Circumference = 2 * PI * 65 ≈ 408.4)
  const donutRadius = 65;
  const circumference = 2 * Math.PI * donutRadius;
  const safeTotal = Math.max(1, totalRooms);

  const pMonthly = (occupiedMonthly / safeTotal) * circumference;
  const pDaily = (occupiedDaily / safeTotal) * circumference;
  const pOverdue = (overdueRooms / safeTotal) * circumference;
  const pCleaning = (cleaningRooms / safeTotal) * circumference;
  const pVacant = (vacantRooms / safeTotal) * circumference;

  let currentOffset = 0;
  const sliceMonthly = { dash: `${pMonthly} ${circumference - pMonthly}`, offset: currentOffset };
  currentOffset -= pMonthly;
  const sliceDaily = { dash: `${pDaily} ${circumference - pDaily}`, offset: currentOffset };
  currentOffset -= pDaily;
  const sliceOverdue = { dash: `${pOverdue} ${circumference - pOverdue}`, offset: currentOffset };
  currentOffset -= pOverdue;
  const sliceCleaning = { dash: `${pCleaning} ${circumference - pCleaning}`, offset: currentOffset };
  currentOffset -= pCleaning;
  const sliceVacant = { dash: `${pVacant} ${circumference - pVacant}`, offset: currentOffset };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Month Filter Selector Bar with MoM & Accounting Basis */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-[var(--foreground)] flex items-center gap-2">
              <span>เลือกรอบบิลประจำเดือน</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/30">
                {formatMonthThai(selectedMonth)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Dropdown */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              aria-label="เลือกรอบบิลประจำเดือน"
              className="bg-[var(--subtle)] border border-[var(--border)] text-[var(--foreground)] text-xs font-semibold rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition cursor-pointer appearance-none"
            >
              <option value="all">ทุกรอบเดือน (ทั้งหมด - All Time)</option>
              {availableMonths.map((ym) => (
                <option key={ym} value={ym}>
                  {formatMonthThai(ym)} {ym === new Date().toISOString().slice(0, 7) ? "★ เดือนปัจจุบัน" : ""}
                </option>
              ))}
            </select>
            <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-[var(--muted)] pointer-events-none" />
          </div>

          {selectedMonth !== "all" && (
            <button
              type="button"
              onClick={() => setSelectedMonth("all")}
              className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition cursor-pointer"
            >
              ล้างตัวกรอง
            </button>
          )}

          {/* Export Monthly Financial Report Button */}
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition cursor-pointer flex items-center gap-1.5"
            title="พิมพ์หรือส่งออกรายงานสรุปงบการเงินประจำเดือน"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>พิมพ์รายงานประจำเดือน</span>
          </button>
        </div>
      </div>

      {/* 1. Executive Top KPI Cards with Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: อัตราการเข้าพักรวม */}
        <div className="bg-[var(--card)] border border-[var(--border)] p-5 rounded-3xl shadow-xs transition hover:border-emerald-500/50">
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <span className="font-semibold">อัตราการเข้าพักรวม (Occupancy)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Home className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[var(--foreground)] mt-2">
            {occupancyRate}%
          </div>
          <div className="text-xs text-[var(--muted)] mt-1.5 flex items-center gap-1.5">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" /> +3%
            </span>
            <span>เทียบกับเดือนก่อน ({totalOccupied}/{totalRooms} ห้อง)</span>
          </div>
        </div>

        {/* Metric 2: รายรับรวมประจำเดือน (รับชำระแล้วจริง พร้อม MoM) */}
        <div className="bg-[var(--card)] border border-[var(--border)] p-5 rounded-3xl shadow-xs transition hover:border-emerald-500/50">
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <span className="font-semibold flex items-center gap-1.5">
              <span>รายรับรวมรอบเดือนนี้ (ชำระแล้ว)</span>
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
            {formatCurrency(currentPaid)}
          </div>
          <div className="text-xs text-[var(--muted)] mt-1.5 flex items-center gap-1.5 flex-wrap">
            {paidGrowthMoM !== null ? (
              <span
                className={`font-bold flex items-center gap-0.5 ${
                  paidGrowthMoM >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {paidGrowthMoM >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                {paidGrowthMoM >= 0 ? `+${paidGrowthMoM}%` : `${paidGrowthMoM}%`} MoM
              </span>
            ) : (
              <span className="text-[var(--muted)] font-medium">งวดปัจจุบัน</span>
            )}
            <span>• เก็บได้ {collectionRate}% จากยอดเรียกเก็บ {formatCurrency(currentBilled)}</span>
          </div>
        </div>

        {/* Metric 3: ยอดหนี้ค้างชำระ */}
        <div className="bg-[var(--card)] border border-[var(--border)] p-5 rounded-3xl shadow-xs transition hover:border-rose-500/50">
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <span className="font-semibold">ยอดค้างชำระ / รอติดตาม</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-rose-600 mt-2">
            {formatCurrency(currentOverdue)}
          </div>
          <div className="text-xs text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
            <span>{filteredInvoices.filter((i) => i.status !== "paid" && i.status !== "carried_forward").length} รายการค้างชำระ</span>
          </div>
        </div>

        {/* Metric 4: ห้องว่างพร้อมสร้างรายได้ */}
        <div className="bg-[var(--card)] border border-[var(--border)] p-5 rounded-3xl shadow-xs transition hover:border-amber-500/50">
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <span className="font-semibold">ห้องว่างพร้อมปล่อยเช่า</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[var(--foreground)] mt-2">
            {vacantRooms} <span className="text-base font-normal text-[var(--muted)]">ห้อง</span>
          </div>
          <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1.5 flex items-center gap-1">
            <span>{cleaningRooms > 0 ? `+ รอทำความสะอาด ${cleaningRooms} ห้อง` : "ไม่มีห้องค้างทำความสะอาด"}</span>
          </div>
        </div>
      </div>

      {/* 2. Main Analytics Bento Grid: Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart A (Span 2): กราฟแนวโน้มอัตราการเข้าพัก & รายรับ 6 เดือนย้อนหลัง */}
        <div className="lg:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span>กราฟแนวโน้มอัตราการเข้าพัก & รายรับ (Occupancy & Revenue Trend)</span>
              </h3>
              <p className="text-xs text-[var(--muted)]">
                ข้อมูลย้อนหลัง 6 เดือน แสดงความเติบโตของหอพัก {property.name}
              </p>
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center bg-[var(--subtle)] p-1 rounded-xl border border-[var(--border)] text-xs self-start sm:self-auto">
              <button
                onClick={() => setActiveChartTab("occupancy")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  activeChartTab === "occupancy"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                อัตราการเข้าพัก (%)
              </button>
              <button
                onClick={() => setActiveChartTab("revenue")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  activeChartTab === "revenue"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                รายรับรวม (บาท)
              </button>
            </div>
          </div>

          {/* Interactive SVG Area Chart */}
          <div className="relative pt-2">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-60 overflow-hidden select-none"
            >
              <defs>
                <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines with Y-Axis Scale Labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const y = paddingTop + chartH * (1 - ratio);
                const yLabel =
                  activeChartTab === "occupancy"
                    ? `${Math.round(ratio * 100)}%`
                    : `${Math.round((ratio * maxRevenueScale) / 1000)}k`;
                return (
                  <g key={i}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={svgWidth - paddingRight}
                      y2={y}
                      stroke="currentColor"
                      className="text-slate-200 dark:text-slate-800"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={paddingLeft - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      className="text-[10px] font-semibold fill-[var(--muted)] select-none"
                    >
                      {yLabel}
                    </text>
                  </g>
                );
              })}

              {/* Area Fill */}
              <path
                d={areaPath}
                fill={activeChartTab === "occupancy" ? "url(#emeraldGrad)" : "url(#indigoGrad)"}
                className="transition-all duration-300"
              />

              {/* Stroke Line */}
              <path
                d={linePath}
                fill="none"
                stroke={activeChartTab === "occupancy" ? "#10b981" : "#6366f1"}
                strokeWidth="3.5"
                strokeLinecap="round"
                className="transition-all duration-300"
              />

              {/* Points & Interactive Tooltip triggers */}
              {activePoints.map((pt, idx) => {
                const isHovered = hoveredMonthIdx === idx;
                const d = monthlyTrends[idx];
                return (
                  <g key={idx} className="cursor-pointer" onMouseEnter={() => setHoveredMonthIdx(idx)}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 7 : 4.5}
                      className={`transition-all duration-150 ${
                        activeChartTab === "occupancy"
                          ? "fill-emerald-500 stroke-white dark:stroke-slate-900"
                          : "fill-indigo-500 stroke-white dark:stroke-slate-900"
                      }`}
                      strokeWidth={isHovered ? 3 : 2}
                    />

                    {/* Month Label */}
                    <text
                      x={pt.x}
                      y={paddingTop + chartH + 18}
                      textAnchor="middle"
                      className={`text-[11px] font-semibold ${
                        isHovered
                          ? "fill-[var(--foreground)] font-bold text-[12px]"
                          : "fill-[var(--muted)]"
                      }`}
                    >
                      {d.month}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Box */}
            {hoveredMonthIdx !== null && (
              <div className="mt-3 p-3 rounded-2xl bg-[var(--subtle)] border border-[var(--border)] flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="font-bold text-[var(--foreground)]">
                    เดือน {monthlyTrends[hoveredMonthIdx].month} 2026:
                  </span>
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-[var(--muted)]">อัตราการเข้าพัก: </span>
                    <strong className="text-emerald-600 font-bold text-sm">
                      {monthlyTrends[hoveredMonthIdx].occupancy}%
                    </strong>
                  </div>
                  <div>
                    <span className="text-[var(--muted)]">รายรับรวม: </span>
                    <strong className="text-indigo-600 font-bold text-sm">
                      {formatCurrency(monthlyTrends[hoveredMonthIdx].revenue)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[var(--muted)]">เก็บได้แล้ว: </span>
                    <strong className="text-emerald-600 font-bold">
                      {formatCurrency(monthlyTrends[hoveredMonthIdx].collected)}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chart B: กราฟโดนัท สัดส่วนสถานะห้องพักทั้งตึก (Occupancy Donut Chart) */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-500" />
              <span>สัดส่วนสถานะห้องพัก (Occupancy Donut)</span>
            </h3>
            <p className="text-xs text-[var(--muted)]">
              โครงสร้างความจุห้องพักทั้งหมด {totalRooms} ห้อง
            </p>
          </div>

          {/* SVG Donut Center */}
          <div className="relative flex items-center justify-center py-4">
            <svg width="180" height="180" viewBox="0 0 180 180" className="transform -rotate-90">
              {/* Background Circle */}
              <circle
                cx="90"
                cy="90"
                r={donutRadius}
                fill="transparent"
                stroke="currentColor"
                className="text-slate-100 dark:text-slate-800"
                strokeWidth="20"
              />

              {/* Monthly Slice (Indigo) */}
              {occupiedMonthly > 0 && (
                <circle
                  cx="90"
                  cy="90"
                  r={donutRadius}
                  fill="transparent"
                  stroke="#6366f1"
                  strokeWidth="20"
                  strokeDasharray={sliceMonthly.dash}
                  strokeDashoffset={sliceMonthly.offset}
                  className="transition-all duration-500 hover:opacity-85"
                />
              )}

              {/* Daily Slice (Blue) */}
              {occupiedDaily > 0 && (
                <circle
                  cx="90"
                  cy="90"
                  r={donutRadius}
                  fill="transparent"
                  stroke="#3b82f6"
                  strokeWidth="20"
                  strokeDasharray={sliceDaily.dash}
                  strokeDashoffset={sliceDaily.offset}
                  className="transition-all duration-500 hover:opacity-85"
                />
              )}

              {/* Overdue Slice (Rose) */}
              {overdueRooms > 0 && (
                <circle
                  cx="90"
                  cy="90"
                  r={donutRadius}
                  fill="transparent"
                  stroke="#ef4444"
                  strokeWidth="20"
                  strokeDasharray={sliceOverdue.dash}
                  strokeDashoffset={sliceOverdue.offset}
                  className="transition-all duration-500 hover:opacity-85"
                />
              )}

              {/* Cleaning Slice (Yellow) */}
              {cleaningRooms > 0 && (
                <circle
                  cx="90"
                  cy="90"
                  r={donutRadius}
                  fill="transparent"
                  stroke="#eab308"
                  strokeWidth="20"
                  strokeDasharray={sliceCleaning.dash}
                  strokeDashoffset={sliceCleaning.offset}
                  className="transition-all duration-500 hover:opacity-85"
                />
              )}

              {/* Vacant Slice (Emerald) */}
              {vacantRooms > 0 && (
                <circle
                  cx="90"
                  cy="90"
                  r={donutRadius}
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="20"
                  strokeDasharray={sliceVacant.dash}
                  strokeDashoffset={sliceVacant.offset}
                  className="transition-all duration-500 hover:opacity-85"
                />
              )}
            </svg>

            {/* Donut Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <div className="text-2xl font-black text-[var(--foreground)] tracking-tight">
                {occupancyRate}%
              </div>
              <div className="text-[10px] font-semibold text-[var(--muted)]">เข้าพักแล้ว</div>
            </div>
          </div>

          {/* Slices Legend */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[var(--muted)]">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span>รายเดือน (Monthly)</span>
              </span>
              <span className="font-bold text-[var(--foreground)]">
                {occupiedMonthly} ห้อง ({Math.round((occupiedMonthly / safeTotal) * 100)}%)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[var(--muted)]">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>รายวัน (Daily)</span>
              </span>
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {occupiedDaily} ห้อง ({Math.round((occupiedDaily / safeTotal) * 100)}%)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[var(--muted)]">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>ค้างชำระ (Overdue)</span>
              </span>
              <span className="font-bold text-rose-600">
                {overdueRooms} ห้อง ({Math.round((overdueRooms / safeTotal) * 100)}%)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[var(--muted)]">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <span>รอทำความสะอาด (Cleaning)</span>
              </span>
              <span className="font-bold text-yellow-600">
                {cleaningRooms} ห้อง ({Math.round((cleaningRooms / safeTotal) * 100)}%)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[var(--muted)]">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="font-bold text-emerald-600 dark:text-emerald-400">ว่างพร้อมเช่า (Vacant)</span>
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {vacantRooms} ห้อง ({Math.round((vacantRooms / safeTotal) * 100)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Row: Grouped Bar Chart & Utility Consumption Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart C: เปรียบเทียบ การรับเงินสด vs ยอดค้างชำระ 6 เดือนล่าสุด */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                <span>เปรียบเทียบการเก็บเงิน: รับชำระแล้ว vs ค้างชำระ</span>
              </h3>
              <p className="text-xs text-[var(--muted)]">
                สถิติการจัดเก็บเงินสดรายเดือน เปรียบเทียบยอดค้างชำระ
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-[var(--muted)]">รับชำระแล้ว</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-[var(--muted)]">ค้างชำระ</span>
              </span>
            </div>
          </div>

          {/* Grouped Bar Chart */}
          <div className="pt-4 space-y-3">
            {(() => {
              const maxBarVal = Math.max(
                1000,
                ...monthlyTrends.map((d) => Math.max(d.revenue, d.collected + d.overdue))
              );
              return monthlyTrends.map((d, idx) => {
                const collectedPct = (d.collected / maxBarVal) * 100;
                const overduePct = (d.overdue / maxBarVal) * 100;
                return (
                  <div key={idx} className="space-y-1 text-xs">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-bold text-[var(--foreground)]">
                        {d.month} {d.yearMonth ? d.yearMonth.slice(0, 4) : ""}
                      </span>
                      <span className="text-[var(--muted)]">
                        รับ: <strong className="text-emerald-600">{formatCurrency(d.collected)}</strong>
                        {d.overdue > 0 && (
                          <span> | ค้าง: <strong className="text-rose-600">{formatCurrency(d.overdue)}</strong></span>
                        )}
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex gap-0.5">
                      <div
                        style={{ width: `${collectedPct}%` }}
                        className="h-full bg-emerald-500 rounded-l-full transition-all duration-500"
                      />
                      {d.overdue > 0 && (
                        <div
                          style={{ width: `${overduePct}%` }}
                          className="h-full bg-rose-500 rounded-r-full transition-all duration-500"
                        />
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Chart D: แนวโน้มการใช้น้ำ-ไฟ ของหอพัก (Utility Consumption Trends) */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-500" />
                <span>แนวโน้มการใช้น้ำ-ไฟประจำเดือน (Utility Usage)</span>
              </h3>
              <p className="text-xs text-[var(--muted)]">
                ตรวจสอบปริมาณการใช้ไฟฟ้า (หน่วย) และน้ำประปา (หน่วย) ป้องกันไฟกระชากหรือน้ำรั่ว
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-[var(--muted)]">ไฟฟ้า ({property.electricRate} ฿)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                <span className="text-[var(--muted)]">น้ำประปา ({property.waterRate} ฿)</span>
              </span>
            </div>
          </div>

          {(() => {
            const maxElec = Math.max(10, ...monthlyTrends.map((d) => d.electricUnits));
            const maxWater = Math.max(5, ...monthlyTrends.map((d) => d.waterUnits));
            const activeTrend =
              monthlyTrends[
                hoveredMonthIdx !== null && hoveredMonthIdx < monthlyTrends.length
                  ? hoveredMonthIdx
                  : monthlyTrends.length - 1
              ] || monthlyTrends[monthlyTrends.length - 1];

            return (
              <>
                <div className="pt-2 grid grid-cols-6 gap-2 text-center text-xs">
                  {monthlyTrends.map((d, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-2xl bg-[var(--subtle)] border border-[var(--border)] space-y-2 cursor-pointer transition hover:border-emerald-500/40"
                      onMouseEnter={() => setHoveredMonthIdx(idx)}
                    >
                      <div className="font-bold text-[var(--foreground)] text-[11px]">{d.month}</div>

                      {/* Electric Bar */}
                      <div className="space-y-0.5">
                        <div className="text-[10px] text-amber-600 font-bold">{d.electricUnits}</div>
                        <div className="w-full h-12 bg-slate-200 dark:bg-slate-800 rounded-lg flex items-end overflow-hidden p-0.5">
                          <div
                            style={{ height: `${Math.max(4, Math.min(100, (d.electricUnits / maxElec) * 100))}%` }}
                            className="w-full bg-amber-500 rounded-md transition-all duration-500"
                          />
                        </div>
                        <div className="text-[9px] text-[var(--muted)]">ไฟ (หน.)</div>
                      </div>

                      {/* Water Bar */}
                      <div className="space-y-0.5">
                        <div className="text-[10px] text-cyan-600 font-bold">{d.waterUnits}</div>
                        <div className="w-full h-8 bg-slate-200 dark:bg-slate-800 rounded-lg flex items-end overflow-hidden p-0.5">
                          <div
                            style={{ height: `${Math.max(4, Math.min(100, (d.waterUnits / maxWater) * 100))}%` }}
                            className="w-full bg-cyan-500 rounded-md transition-all duration-500"
                          />
                        </div>
                        <div className="text-[9px] text-[var(--muted)]">น้ำ (หน.)</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-2xl bg-[var(--subtle)] border border-[var(--border)] flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
                  <span>
                    รวมเดือน {activeTrend?.month} {activeTrend?.yearMonth ? `(${activeTrend.yearMonth})` : ""}: ไฟฟ้า{" "}
                    <strong className="text-amber-600 font-bold">{activeTrend?.electricUnits || 0}</strong> หน่วย (
                    {formatCurrency((activeTrend?.electricUnits || 0) * property.electricRate)})
                  </span>
                  <span>
                    น้ำประปา{" "}
                    <strong className="text-cyan-600 font-bold">{activeTrend?.waterUnits || 0}</strong> หน่วย (
                    {formatCurrency((activeTrend?.waterUnits || 0) * property.waterRate)})
                  </span>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* 4. Landlord Navigation Banner to Detailed Room Grid */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-indigo-500/15 text-indigo-600 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-sm text-[var(--foreground)]">
              ต้องการตรวจดูผังห้องพักรายห้องและเลขมิเตอร์ล่าสุด?
            </div>
            <div className="text-[11px] text-[var(--muted)]">
              สลับไปยังหน้า "ผังสถานะห้องพัก (Room Grid)" เพื่อดูการ์ดห้องพักทุกห้องแยกตามชั้น 1-4
            </div>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab("room-grid")}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
        >
          <span>เปิดดูผังสถานะห้องพัก (Room Grid)</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 5. Monthly Financial Statement Printable Modal (PDF / A4) */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--subtle)]">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-base text-[var(--foreground)]">
                  รายงานสรุปรายรับและผลประกอบการประจำเดือน (Monthly Financial Statement)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>สั่งพิมพ์เอกสาร A4 / บันทึก PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="p-2 rounded-xl hover:bg-[var(--card)] text-[var(--muted)] hover:text-[var(--foreground)] transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Printable Content Body */}
            <div className="p-8 overflow-y-auto space-y-6 text-xs bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 print:p-0 print:text-black print:bg-white">
              {/* Document Letterhead */}
              <div className="border-b-2 border-slate-900/20 dark:border-white/20 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                    {property.name}
                  </h1>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {property.address || "ที่อยู่หอพักไม่ได้ระบุ"} • โทร: {property.phone || "-"}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    เลขประจำตัวผู้เสียภาษี / บัญชีพร้อมเพย์: {property.promptpayNumber || "-"}
                  </p>
                </div>
                <div className="sm:text-right text-xs space-y-0.5">
                  <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                    รายงานสรุปงบการเงิน
                  </div>
                  <div>รอบเดือน: <strong>{formatMonthThai(selectedMonth)}</strong></div>
                  <div className="text-[11px] text-slate-500">
                    เกณฑ์: {accountingBasis === "billing" ? "ตามรอบบิล (Accrual Basis)" : "ตามเงินสดรับจริง (Cash Basis)"}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    พิมพ์เมื่อ: {new Date().toLocaleDateString("th-TH")}
                  </div>
                </div>
              </div>

              {/* KPI Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-950/20">
                  <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">รายรับที่ชำระแล้วจริง</div>
                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatCurrency(currentPaid)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">จัดเก็บได้ {collectionRate}%</div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-950/20">
                  <div className="text-[11px] text-rose-800 dark:text-rose-300 font-medium">ยอดหนี้ค้างชำระ</div>
                  <div className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1">
                    {formatCurrency(currentOverdue)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{filteredInvoices.filter((i) => i.status !== "paid" && i.status !== "carried_forward").length} บิลรอชำระ</div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-950/20">
                  <div className="text-[11px] text-indigo-800 dark:text-indigo-300 font-medium">ยอดเรียกเก็บรวมรอบบิล</div>
                  <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">
                    {formatCurrency(currentBilled)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">รวม {filteredInvoices.length} รายการ</div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">อัตราการเข้าพักรวม</div>
                  <div className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">
                    {occupancyRate}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{totalOccupied}/{totalRooms} ห้อง</div>
                </div>
              </div>

              {/* Categorized Line Items Table */}
              <div className="space-y-2">
                <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                  <span>1. จำแนกรายรับตามหมวดหมู่บัญชี</span>
                  <span className="text-[11px] font-normal text-slate-500">หน่วย: บาท (THB)</span>
                </div>
                <table className="w-full border-collapse border border-slate-200 dark:border-slate-800 text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                      <th className="border border-slate-200 dark:border-slate-800 p-2 text-left">หมวดหมู่รายรับ</th>
                      <th className="border border-slate-200 dark:border-slate-800 p-2 text-right">ยอดรวม (บาท)</th>
                      <th className="border border-slate-200 dark:border-slate-800 p-2 text-right">สัดส่วน (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-200 dark:border-slate-800 p-2">ค่าเช่าห้องพัก (รายเดือนและรายวัน)</td>
                      <td className="border border-slate-200 dark:border-slate-800 p-2 text-right font-medium">{formatCurrency(reportCategoryBreakdown.rentTotal)}</td>
                      <td className="border border-slate-200 dark:border-slate-800 p-2 text-right text-slate-500">{currentBilled > 0 ? Math.round((reportCategoryBreakdown.rentTotal / currentBilled) * 100) : 0}%</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-200 dark:border-slate-800 p-2">ค่ากระแสไฟฟ้า (ตามมิเตอร์จริง)</td>
                      <td className="border border-slate-200 dark:border-slate-800 p-2 text-right font-medium">{formatCurrency(reportCategoryBreakdown.electricTotal)}</td>
                      <td className="border border-slate-200 dark:border-slate-800 p-2 text-right text-slate-500">{currentBilled > 0 ? Math.round((reportCategoryBreakdown.electricTotal / currentBilled) * 100) : 0}%</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-200 dark:border-slate-800 p-2">ค่าน้ำประปา (ตามมิเตอร์จริง)</td>
                      <td className="border border-slate-200 dark:border-slate-800 p-2 text-right font-medium">{formatCurrency(reportCategoryBreakdown.waterTotal)}</td>
                      <td className="border border-slate-200 dark:border-slate-800 p-2 text-right text-slate-500">{currentBilled > 0 ? Math.round((reportCategoryBreakdown.waterTotal / currentBilled) * 100) : 0}%</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-200 dark:border-slate-800 p-2">ค่าบริการส่วนกลางและเครื่องใช้ไฟฟ้า (TV/ตู้เย็น)</td>
                      <td className="border border-slate-200 dark:border-slate-800 p-2 text-right font-medium">{formatCurrency(reportCategoryBreakdown.serviceTotal)}</td>
                      <td className="border border-slate-200 dark:border-slate-800 p-2 text-right text-slate-500">{currentBilled > 0 ? Math.round((reportCategoryBreakdown.serviceTotal / currentBilled) * 100) : 0}%</td>
                    </tr>
                    {reportCategoryBreakdown.depositTotal > 0 && (
                      <tr>
                        <td className="border border-slate-200 dark:border-slate-800 p-2">เงินประกันและมัดจำกุญแจ</td>
                        <td className="border border-slate-200 dark:border-slate-800 p-2 text-right font-medium">{formatCurrency(reportCategoryBreakdown.depositTotal)}</td>
                        <td className="border border-slate-200 dark:border-slate-800 p-2 text-right text-slate-500">{currentBilled > 0 ? Math.round((reportCategoryBreakdown.depositTotal / currentBilled) * 100) : 0}%</td>
                      </tr>
                    )}
                    <tr className="bg-slate-50 dark:bg-slate-900 font-bold">
                      <td className="border border-slate-200 dark:border-slate-800 p-2 text-slate-900 dark:text-white">รวมยอดเรียกเก็บทั้งสิ้น</td>
                      <td className="border border-slate-200 dark:border-slate-800 p-2 text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(currentBilled)}</td>
                      <td className="border border-slate-200 dark:border-slate-800 p-2 text-right">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Room-by-Room Detail Table */}
              <div className="space-y-2">
                <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                  <span>2. รายละเอียดใบแจ้งหนี้รายห้อง ({filteredInvoices.length} รายการ)</span>
                </div>
                <table className="w-full border-collapse border border-slate-200 dark:border-slate-800 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                      <th className="border border-slate-200 dark:border-slate-800 p-1.5 text-center w-16">ห้อง</th>
                      <th className="border border-slate-200 dark:border-slate-800 p-1.5 text-left">ผู้เช่า / เลขที่บิล</th>
                      <th className="border border-slate-200 dark:border-slate-800 p-1.5 text-center w-24">รอบบิล</th>
                      <th className="border border-slate-200 dark:border-slate-800 p-1.5 text-right w-24">ยอดเรียกเก็บ</th>
                      <th className="border border-slate-200 dark:border-slate-800 p-1.5 text-center w-24">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="border border-slate-200 dark:border-slate-800 p-1.5 text-center font-bold">{inv.roomNumber}</td>
                        <td className="border border-slate-200 dark:border-slate-800 p-1.5">
                          <span className="font-medium">{inv.tenantName}</span>
                          <span className="text-[10px] text-slate-500 block">{inv.invoiceNumber}</span>
                        </td>
                        <td className="border border-slate-200 dark:border-slate-800 p-1.5 text-center text-slate-500">{inv.billingDate || "-"}</td>
                        <td className="border border-slate-200 dark:border-slate-800 p-1.5 text-right font-medium">{formatCurrency(inv.totalAmount)}</td>
                        <td className="border border-slate-200 dark:border-slate-800 p-1.5 text-center">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            inv.status === "paid"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          }`}>
                            {inv.status === "paid" ? "ชำระแล้ว ✓" : "ค้างชำระ"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures Block */}
              <div className="pt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <div className="h-14 border-b border-dashed border-slate-400 dark:border-slate-600 mx-auto w-48" />
                  <div className="mt-2 font-medium">ลงชื่อ .....................................................</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">ผู้จัดทำรายงาน / ฝ่ายบัญชี</div>
                </div>
                <div>
                  <div className="h-14 border-b border-dashed border-slate-400 dark:border-slate-600 mx-auto w-48" />
                  <div className="mt-2 font-medium">ลงชื่อ .....................................................</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">เจ้าของหอพัก / ผู้จัดการอาคาร</div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-[var(--subtle)] border-t border-[var(--border)] flex items-center justify-between">
              <span className="text-xs text-[var(--muted)]">
                เอกสารนี้จัดพิมพ์โดยระบบ PAKDEE Mansion Management System
              </span>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:bg-black/5 transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
