"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  Search,
  Zap,
  Plus,
  Bell,
  Sun,
  Moon,
  Building,
  RotateCcw,
  DoorOpen,
  LogOut,
  ArrowLeft,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationDropdown } from "@/components/layout/notification-dropdown";

interface HeaderProps {
  currentBuilding: string;
  onBuildingChange: (bldg: string) => void;
  onOpenQuickMeter: () => void;
  onOpenNewContract: () => void;
  onOpenAddRoom?: () => void;
  onClearAllData?: () => void;
  activeViewTitle: string;
  totalRooms?: number;
  propertyPlan?: string;
  propertyName?: string;
  onBackToBranches?: () => void;
  onLogout?: () => void;
  onNavigateToTab?: (tab: string) => void;
  onShowToast?: (msg: string, type?: "info" | "warning" | "success" | "error") => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export function Header({
  currentBuilding,
  onBuildingChange,
  onOpenQuickMeter,
  onOpenNewContract,
  onOpenAddRoom,
  onClearAllData,
  activeViewTitle,
  totalRooms,
  propertyPlan = "starter",
  propertyName,
  onBackToBranches,
  onLogout,
  onNavigateToTab,
  onShowToast,
  isSidebarCollapsed = false,
  onToggleSidebar,
}: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="h-16 border-b border-[var(--border)] bg-[var(--header)] backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-20 transition-colors">
      {/* Left: Sidebar Toggle, Breadcrumbs & Building switcher */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-[var(--subtle)] border border-[var(--border)] transition cursor-pointer flex items-center justify-center shrink-0"
            title={isSidebarCollapsed ? "ขยายแถบเมนูด้านซ้าย (Expand Sidebar)" : "หุบแถบเมนูด้านซ้าย (Collapse Sidebar)"}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            )}
          </button>
        )}
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          {onBackToBranches && (
            <button
              type="button"
              onClick={onBackToBranches}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--subtle)] hover:bg-emerald-500/10 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold border border-[var(--border)] transition cursor-pointer shadow-2xs group"
              title="ย้อนกลับไปหน้าเลือกสาขาหอพัก"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-600 group-hover:-translate-x-0.5 transition-transform" />
              <span>เลือกสาขา</span>
            </button>
          )}
          <span>/</span>
          <span className="text-slate-600 dark:text-slate-400">{propertyName || "พักดี แมนชั่น"}</span>
          <span>/</span>
          <span className="font-bold text-[var(--foreground)]">
            {activeViewTitle}
          </span>
        </div>

        {/* Building Selector Tabs */}
        <div className="hidden sm:flex items-center bg-[var(--subtle)] border border-[var(--border)] p-1 rounded-xl text-xs">
          <button
            onClick={() => onBuildingChange("bldg-a")}
            className={cn(
              "px-3 py-1 rounded-lg font-semibold transition",
              currentBuilding === "bldg-a"
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            )}
          >
            อาคาร A ({totalRooms || 24}{propertyPlan === "starter" ? "/30 ห้อง (Starter)" : " ห้อง"})
          </button>
          <button
            onClick={() => {
              if (onShowToast) {
                onShowToast("ระบบรองรับการเพิ่มอาคารใหม่: ติดต่อผู้ดูแลเพื่อขยายเป็นโครงการหลายอาคาร", "info");
              }
            }}
            className="px-2 py-1 text-[var(--muted)] hover:text-emerald-600 dark:hover:text-emerald-400 transition font-medium"
            title="เพิ่มอาคารใหม่"
          >
            + เพิ่มตึก
          </button>
        </div>
      </div>

      {/* Right: Search, Actions, Theme Toggle, Notifications */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block w-60">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="ค้นหาห้อง, ชื่อผู้เช่า..."
            className="w-full bg-[var(--subtle)] border border-[var(--border)] rounded-xl pl-9 pr-8 py-1.5 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-emerald-500 transition"
          />
          <span className="absolute right-2.5 top-2 text-[10px] bg-black/5 dark:bg-white/10 text-[var(--muted)] px-1.5 py-0.5 rounded font-mono">
            ⌘K
          </span>
        </div>

        {/* Quick Action: จดมิเตอร์ด่วน */}
        <button
          onClick={onOpenQuickMeter}
          className="hidden lg:flex items-center gap-2 bg-[var(--subtle)] hover:border-emerald-500 text-[var(--foreground)] border border-[var(--border)] px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer shadow-xs"
        >
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>จดมิเตอร์ด่วน</span>
        </button>

        {/* Action: + เพิ่มห้อง */}
        {onOpenAddRoom && (
          <button
            onClick={onOpenAddRoom}
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-md shadow-sky-600/20 transition cursor-pointer"
            title="เพิ่มห้องพักใหม่ (เดี่ยว / หลายห้อง)"
          >
            <DoorOpen className="w-3.5 h-3.5" />
            <span>+ เพิ่มห้อง</span>
          </button>
        )}

        {/* Action: + ทำสัญญา / จองห้อง */}
        <button
          onClick={onOpenNewContract}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>ทำสัญญา / จองห้อง</span>
        </button>

        {/* Action: 🧹 เคลียร์ข้อมูล */}
        {onClearAllData && (
          <button
            onClick={onClearAllData}
            className="hidden xl:flex items-center gap-1.5 bg-[var(--subtle)] hover:bg-rose-500/10 hover:border-rose-500/30 text-rose-500 border border-[var(--border)] px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer"
            title="เคลียร์ข้อมูลจำลองทั้งหมด รีเซ็ตสู่ Clean Slate"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>รีเซ็ตระบบ</span>
          </button>
        )}

        {/* Dark/Light Mode Switcher */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-9 h-9 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-[var(--foreground)] hover:border-emerald-500 flex items-center justify-center transition cursor-pointer shadow-xs"
            title={theme === "dark" ? "สลับเป็นโหมดสว่าง" : "สลับเป็นโหมดมืด"}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>
        )}

        {/* Notification Bell Dropdown */}
        <NotificationDropdown onNavigateToTab={onNavigateToTab} />

        {/* Quick Logout Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-9 h-9 rounded-xl bg-[var(--subtle)] hover:bg-rose-500/10 border border-[var(--border)] hover:border-rose-500/30 text-[var(--muted)] hover:text-rose-500 flex items-center justify-center transition cursor-pointer shadow-xs"
            title="ออกจากระบบ (Sign Out)"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
}
