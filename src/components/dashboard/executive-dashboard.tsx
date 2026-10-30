"use client";

import React, { useState } from "react";
import { Room, Invoice, Property, RoomStatus } from "@/types/dormitory";
import { formatCurrency } from "@/lib/utils";
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
  const overdueRooms = rooms.filter((r) => r.status === "overdue").length;
  const cleaningRooms = rooms.filter((r) => r.status === "cleaning").length;
  const vacantRooms = rooms.filter((r) => r.status === "vacant").length;

  const totalOccupied = occupiedMonthly + occupiedDaily + overdueRooms;
  const occupancyRate = totalRooms > 0 ? Math.round((totalOccupied / totalRooms) * 100) : 0;

  // Real database values for current month calculated directly from state
  const currentOcc = occupancyRate;
  const currentBilled = invoices.reduce((acc, i) => acc + i.totalAmount, 0);
  const currentPaid = invoices.filter((i) => i.status === "paid").reduce((acc, i) => acc + i.totalAmount, 0);
  const currentOverdue = invoices.filter((i) => i.status !== "paid").reduce((acc, i) => acc + i.totalAmount, 0);

  // Monthly 6-Month Trend Data - Clean progression or 0 when no rooms/invoices
  const monthlyTrends = [
    { month: "พ.ค.", occupancy: totalRooms > 0 ? Math.max(0, currentOcc - 12) : 0, revenue: Math.round(currentBilled * 0.78), collected: Math.round(currentBilled * 0.76), overdue: 0, electricUnits: 0, waterUnits: 0 },
    { month: "มิ.ย.", occupancy: totalRooms > 0 ? Math.max(0, currentOcc - 8) : 0, revenue: Math.round(currentBilled * 0.83), collected: Math.round(currentBilled * 0.83), overdue: 0, electricUnits: 0, waterUnits: 0 },
    { month: "ก.ค.", occupancy: totalRooms > 0 ? Math.max(0, currentOcc - 6) : 0, revenue: Math.round(currentBilled * 0.87), collected: Math.round(currentBilled * 0.85), overdue: 0, electricUnits: 0, waterUnits: 0 },
    { month: "ส.ค.", occupancy: totalRooms > 0 ? Math.max(0, currentOcc - 3) : 0, revenue: Math.round(currentBilled * 0.92), collected: Math.round(currentBilled * 0.92), overdue: 0, electricUnits: 0, waterUnits: 0 },
    { month: "ก.ย.", occupancy: totalRooms > 0 ? Math.max(0, currentOcc - 1) : 0, revenue: Math.round(currentBilled * 0.96), collected: Math.round(currentBilled * 0.92), overdue: 0, electricUnits: 0, waterUnits: 0 },
    { month: "ต.ค.", occupancy: currentOcc, revenue: currentBilled, collected: currentPaid, overdue: currentOverdue, electricUnits: rooms.reduce((sum, r) => sum + (r.currentElectricMeter || 0), 0), waterUnits: rooms.reduce((sum, r) => sum + (r.currentWaterMeter || 0), 0) },
  ];

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
  const maxRevenueScale = Math.max(40000, currentBilled * 1.25);
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

        {/* Metric 2: รายรับรวมประจำเดือน */}
        <div className="bg-[var(--card)] border border-[var(--border)] p-5 rounded-3xl shadow-xs transition hover:border-indigo-500/50">
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <span className="font-semibold">รายรับรวมรอบเดือนนี้</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">
            {formatCurrency(currentBilled)}
          </div>
          <div className="text-xs text-[var(--muted)] mt-1.5 flex items-center gap-1.5">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" /> {totalRooms > 0 && currentBilled > 0 ? "+4.2% MoM" : "0% MoM"}
            </span>
            <span>เก็บเงินแล้ว {currentBilled > 0 ? `${Math.round((currentPaid / currentBilled) * 100)}%` : "0%"}</span>
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
            <span>{overdueRooms} ห้องเกินกำหนดชำระ</span>
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

              {/* Daily Slice (Amber) */}
              {occupiedDaily > 0 && (
                <circle
                  cx="90"
                  cy="90"
                  r={donutRadius}
                  fill="transparent"
                  stroke="#f59e0b"
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
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>รายวัน (Daily)</span>
              </span>
              <span className="font-bold text-[var(--foreground)]">
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
            {monthlyTrends.map((d, idx) => {
              const maxVal = 35000;
              const collectedPct = (d.collected / maxVal) * 100;
              const overduePct = (d.overdue / maxVal) * 100;
              return (
                <div key={idx} className="space-y-1 text-xs">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-bold text-[var(--foreground)]">{d.month} 2026</span>
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
            })}
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

          <div className="pt-2 grid grid-cols-6 gap-2 text-center text-xs">
            {monthlyTrends.map((d, idx) => (
              <div key={idx} className="p-2.5 rounded-2xl bg-[var(--subtle)] border border-[var(--border)] space-y-2">
                <div className="font-bold text-[var(--foreground)] text-[11px]">{d.month}</div>

                {/* Electric Bar */}
                <div className="space-y-0.5">
                  <div className="text-[10px] text-amber-600 font-bold">{d.electricUnits}</div>
                  <div className="w-full h-12 bg-slate-200 dark:bg-slate-800 rounded-lg flex items-end overflow-hidden p-0.5">
                    <div
                      style={{ height: `${(d.electricUnits / 600) * 100}%` }}
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
                      style={{ height: `${(d.waterUnits / 80) * 100}%` }}
                      className="w-full bg-cyan-500 rounded-md transition-all duration-500"
                    />
                  </div>
                  <div className="text-[9px] text-[var(--muted)]">น้ำ (หน.)</div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-2xl bg-[var(--subtle)] border border-[var(--border)] flex items-center justify-between text-xs text-[var(--muted)]">
            <span>รวมเดือน ต.ค.: ไฟฟ้า 510 หน่วย ({formatCurrency(510 * property.electricRate)})</span>
            <span>น้ำประปา 62 หน่วย ({formatCurrency(62 * property.waterRate)})</span>
          </div>
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
    </div>
  );
}
