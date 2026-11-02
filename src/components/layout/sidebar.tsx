"use client";

import React from "react";
import { PakdeeLogo } from "@/components/ui/pakdee-logo";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  Zap,
  Receipt,
  CreditCard,
  Printer,
  Users,
  FileSignature,
  DoorOpen,
  Sparkles,
  BarChart3,
  Settings,
  ShieldCheck,
  ChevronDown,
  LogOut,
  Building,
  Wrench,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onOpenSuperAdmin: () => void;
  propertyPlan: string;
  propertyName?: string;
  propertyAddress?: string;
  onOpenBranches?: () => void;
  roomsCount?: number;
  dailyCount?: number;
  overdueCount?: number;
  cleaningCount?: number;
  repairsCount?: number;
  onLogout?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItemConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  badgeText?: string | number | null;
  badgeType?: "default" | "warning" | "danger" | "info" | "brand";
}

export function Sidebar({
  currentTab,
  onTabChange,
  onOpenSuperAdmin,
  propertyPlan,
  propertyName,
  propertyAddress,
  onOpenBranches,
  roomsCount,
  dailyCount,
  overdueCount,
  cleaningCount,
  repairsCount,
  onLogout,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const { currentUser, logout } = useAuth();

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    } else {
      logout();
    }
  };

  const navGroups: { title: string; items: NavItemConfig[] }[] = [
    {
      title: "หลัก & ผังห้อง",
      items: [
        {
          id: "dashboard",
          label: "แดชบอร์ดภาพรวม",
          icon: LayoutDashboard,
        },
        {
          id: "room-grid",
          label: "ผังสถานะห้องพัก",
          icon: Building2,
          badgeText: roomsCount !== undefined ? `${roomsCount} ห้อง` : "24 ห้อง",
          badgeType: "default",
        },
        {
          id: "daily",
          label: "ปฏิทินจองรายวัน",
          icon: CalendarDays,
          badgeText: dailyCount && dailyCount > 0 ? `เข้าพัก ${dailyCount}` : null,
          badgeType: "warning",
        },
      ],
    },
    {
      title: "มิเตอร์ & การเงิน",
      items: [
        {
          id: "meter",
          label: "จดมิเตอร์น้ำ-ไฟ",
          icon: Zap,
          iconColor: "text-amber-500",
          badgeText: `รอบ ${["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."][new Date().getMonth()]}`,
          badgeType: "default",
        },
        {
          id: "invoices",
          label: "ใบแจ้งหนี้ & บิล",
          icon: Receipt,
          badgeText: overdueCount && overdueCount > 0 ? `ค้างจ่าย ${overdueCount}` : null,
          badgeType: "danger",
        },
        {
          id: "slips",
          label: "ตรวจสลิปโอนเงิน",
          icon: CreditCard,
          iconColor: "text-blue-500",
          badgeText: "ไฮบริด AI",
          badgeType: "info",
        },
        {
          id: "receipts",
          label: "ออกใบเสร็จรับเงิน",
          icon: Printer,
        },
      ],
    },
    {
      title: "ผู้เช่า & การปฏิบัติงาน",
      items: [
        {
          id: "tenants",
          label: "ทะเบียนผู้เช่า",
          icon: Users,
        },
        {
          id: "leases",
          label: "สัญญาเช่าดิจิทัล",
          icon: FileSignature,
        },
        {
          id: "checkout",
          label: "สรุปย้ายออก & คืนประกัน",
          icon: DoorOpen,
        },
        {
          id: "cleaning",
          label: "งานแม่บ้านทำความสะอาด",
          icon: Sparkles,
          iconColor: "text-yellow-500",
          badgeText: cleaningCount && cleaningCount > 0 ? `รอทำความสะอาด ${cleaningCount}` : null,
          badgeType: "warning",
        },
        {
          id: "repairs",
          label: "แจ้งซ่อมบำรุงห้องพัก",
          icon: Wrench,
          iconColor: "text-rose-500",
          badgeText: repairsCount && repairsCount > 0 ? `รอดำเนินการ ${repairsCount}` : null,
          badgeType: "danger",
        },
      ],
    },
    {
      title: "รายงาน & ตั้งค่า",
      items: [
        {
          id: "reports",
          label: "สรุปรายรับ & Export Excel",
          icon: BarChart3,
        },
        {
          id: "broadcast",
          label: "บรอดแคสต์ LINE OA",
          icon: Megaphone,
          iconColor: "text-[#06C755]",
          badgeText: "LINE",
          badgeType: "brand",
        },
        {
          id: "settings",
          label: "ตั้งค่าหอพัก & LINE OA",
          icon: Settings,
        },
      ],
    },
  ];

  const handleNavClick = (tabId: string) => {
    onTabChange(tabId);
    if (typeof window !== "undefined" && window.innerWidth < 768 && !isCollapsed && onToggleCollapse) {
      onToggleCollapse();
    }
  };

  const handleOpenBranchesClick = () => {
    onOpenBranches?.();
    if (typeof window !== "undefined" && window.innerWidth < 768 && !isCollapsed && onToggleCollapse) {
      onToggleCollapse();
    }
  };

  const handleOpenSuperAdminClick = () => {
    onOpenSuperAdmin?.();
    if (typeof window !== "undefined" && window.innerWidth < 768 && !isCollapsed && onToggleCollapse) {
      onToggleCollapse();
    }
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => onToggleCollapse?.()}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "bg-[var(--sidebar)] border-r border-[var(--sidebar-border)] flex flex-col justify-between shrink-0 select-none transition-all duration-300 ease-in-out",
          isCollapsed
            ? "hidden md:flex md:w-20 md:relative md:z-30"
            : "fixed inset-y-0 left-0 z-50 w-72 shadow-2xl md:relative md:shadow-none md:z-30 md:w-72 flex"
        )}
      >
      {/* 1. Top Section: Logo & Property Switcher */}
      {isCollapsed ? (
        <div className="p-3 border-b border-[var(--sidebar-border)] flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="group relative cursor-pointer p-1 rounded-xl hover:bg-[var(--subtle)] transition"
            title="ขยายแถบเมนูด้านซ้าย (Expand Sidebar)"
          >
            <PakdeeLogo size="sm" />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <PanelLeftOpen className="w-2.5 h-2.5" />
            </span>
          </button>
          <button
            type="button"
            onClick={onOpenBranches}
            className="w-10 h-10 rounded-xl bg-[var(--subtle)] border border-[var(--border)] hover:border-emerald-500 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition cursor-pointer"
            title={`สาขาปัจจุบัน: ${propertyName || "พักดี แมนชั่น"} (คลิกเพื่อสลับสาขา)`}
          >
            <Building className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="p-4 border-b border-[var(--sidebar-border)]">
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-3">
              <PakdeeLogo size="sm" />
              <div>
                <div className="text-base font-bold text-[var(--foreground)] tracking-tight flex items-center gap-1.5 leading-none">
                  PAKDEE
                  <span
                    className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase",
                      propertyPlan === "starter"
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    )}
                  >
                    {propertyPlan === "starter" ? "🥉 Starter" : propertyPlan}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--muted)] font-normal mt-1 flex items-center gap-1">
                  {propertyPlan === "starter" ? (
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                      1 สาขา · สูงสุด 30 ห้อง ({roomsCount || 0}/30)
                    </span>
                  ) : (
                    <span>ระบบจัดการหอพักครบวงจร</span>
                  )}
                </div>
              </div>
            </div>
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--subtle)] transition cursor-pointer"
                title="หุบแถบเมนูด้านซ้าย (Collapse Sidebar)"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Property Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={handleOpenBranchesClick}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] hover:border-slate-400 dark:hover:border-slate-700 transition cursor-pointer group text-left"
              title="คลิกเพื่อเลือกสาขา หรือ เพิ่มสาขาใหม่"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs shrink-0">
                  <Building className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <div className="text-[12px] font-semibold text-[var(--foreground)] truncate">
                    {propertyName || "พักดี แมนชั่น (สาขา 1)"}
                  </div>
                  <div className="text-[10px] text-[var(--muted)] truncate">
                    {propertyAddress ? propertyAddress.slice(0, 24) + "..." : "คลิกเพื่อสลับสาขา / เพิ่มสาขา"}
                  </div>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--muted)] shrink-0 ml-1.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Scrollable Navigation Menu */}
      <div className={cn("flex-1 overflow-y-auto space-y-4", isCollapsed ? "px-2 py-3" : "px-3 py-4")}>
        {navGroups.map((group, gIdx) => (
          <div key={group.title}>
            {isCollapsed ? (
              gIdx > 0 && <div className="my-2 border-t border-[var(--sidebar-border)] w-8 mx-auto" />
            ) : (
              <div className="px-3 mb-1.5 text-[10px] font-semibold tracking-wider text-[var(--muted)] uppercase">
                {group.title}
              </div>
            )}
            <nav className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;

                if (isCollapsed) {
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      className={cn(
                        "w-12 h-10 mx-auto flex items-center justify-center rounded-xl transition relative group cursor-pointer",
                        isActive
                          ? item.id === "branches"
                            ? "bg-blue-600/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 shadow-xs"
                            : item.id === "broadcast"
                            ? "bg-[#06C755]/15 text-[#06C755] border border-[#06C755]/30 shadow-xs"
                            : item.id === "repairs"
                            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-xs"
                            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs"
                          : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--subtle)]"
                      )}
                      title={item.label}
                    >
                      <Icon className={cn("w-5 h-5", item.iconColor || (isActive ? "text-emerald-600 dark:text-emerald-400" : ""))} />
                      {item.badgeText && (
                        <span
                          className={cn(
                            "absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 text-[8px] font-bold rounded-full flex items-center justify-center shadow-xs ring-2 ring-[var(--sidebar)]",
                            item.badgeType === "danger"
                              ? "bg-rose-500 text-white"
                              : item.badgeType === "warning"
                              ? "bg-amber-500 text-white"
                              : item.badgeType === "info"
                              ? "bg-blue-500 text-white"
                              : item.badgeType === "brand"
                              ? "bg-[#06C755] text-white"
                              : "bg-emerald-500 text-white"
                          )}
                        >
                          {typeof item.badgeText === "string" && item.badgeText.includes(" ")
                            ? item.badgeText.split(" ")[1] || item.badgeText[0]
                            : item.badgeText}
                        </span>
                      )}
                    </button>
                  );
                }

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-medium transition cursor-pointer",
                      isActive
                        ? item.id === "branches"
                          ? "bg-blue-600/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 shadow-sm"
                          : item.id === "broadcast"
                          ? "bg-[#06C755]/15 text-[#06C755] border border-[#06C755]/30 shadow-sm font-bold"
                          : item.id === "repairs"
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-sm"
                          : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm"
                        : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--subtle)]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn("w-4 h-4", item.iconColor)} />
                      <span>{item.label}</span>
                    </div>
                    {item.badgeText && (
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                          item.badgeType === "danger"
                            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                            : item.badgeType === "warning"
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            : item.badgeType === "info"
                            ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                            : item.badgeType === "brand"
                            ? "bg-[#06C755]/15 text-[#06C755] border-[#06C755]/30"
                            : "bg-[var(--subtle)] text-[var(--muted)] border-[var(--border)]"
                        )}
                      >
                        {item.badgeText}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}

        {/* Super Admin Support Banner */}
        <div className="pt-2">
          {isCollapsed ? (
            <button
              type="button"
              onClick={handleOpenSuperAdminClick}
              className="w-12 h-10 mx-auto flex items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 hover:border-amber-400 transition cursor-pointer text-amber-500"
              title="Super Admin (Support) - สลับแพ็กเกจ & Setup"
            >
              <ShieldCheck className="w-5 h-5" />
            </button>
          ) : (
            <div
              onClick={handleOpenSuperAdminClick}
              className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 hover:border-amber-400 transition cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    Super Admin (Support)
                  </span>
                </div>
                <span className="text-[10px] text-amber-600 dark:text-amber-400">
                  สลับแพ็กเกจ ➔
                </span>
              </div>
              <div className="text-[11px] text-[var(--muted)] mt-1">
                เครื่องมือผู้ดูแลระบบ สลับแพ็กเกจ และ Setup ลูกค้า
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. User Profile Footer */}
      {isCollapsed ? (
        <div className="p-3 border-t border-[var(--sidebar-border)] bg-[var(--subtle)] flex flex-col items-center gap-2">
          <div
            className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-xs relative cursor-default"
            title={`${currentUser?.name || "คุณพักดี มีสุข"} (${currentUser?.roleTitle || "เจ้าของหอพัก"})`}
          >
            {currentUser?.avatarText || "พด"}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--sidebar)]" />
          </div>
          <button
            type="button"
            onClick={handleLogoutClick}
            className="text-[var(--muted)] hover:text-rose-500 hover:bg-rose-500/10 transition p-2 rounded-xl cursor-pointer"
            title="ออกจากระบบ (Logout)"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="p-3 border-t border-[var(--sidebar-border)] bg-[var(--subtle)]">
          <div className="flex items-center justify-between p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  {currentUser?.avatarText || "พด"}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--sidebar)]" />
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-[var(--foreground)] truncate">
                  {currentUser?.name || "คุณพักดี มีสุข"}
                </div>
                <div className="text-[10px] text-[var(--muted)] truncate">
                  {currentUser?.roleTitle || "เจ้าของหอพัก (Owner)"}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogoutClick}
              className="text-[var(--muted)] hover:text-rose-500 hover:bg-rose-500/10 transition p-1.5 rounded-lg cursor-pointer"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
    </>
  );
}
