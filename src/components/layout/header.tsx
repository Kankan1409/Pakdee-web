"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Menu,
  X,
  User,
  Phone,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationDropdown } from "@/components/layout/notification-dropdown";
import { Room, Invoice, RepairItem } from "@/types/dormitory";

const ROOM_STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; dotClass: string }
> = {
  vacant: {
    label: "ว่าง (พร้อมเข้าพัก)",
    badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    dotClass: "bg-emerald-500",
  },
  occupied: {
    label: "มีผู้เช่า (รายเดือน)",
    badgeClass: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    dotClass: "bg-indigo-500",
  },
  daily: {
    label: "ห้องพักรายวัน",
    badgeClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    dotClass: "bg-blue-500",
  },
  cleaning: {
    label: "รอทำความสะอาด",
    badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    dotClass: "bg-amber-500",
  },
  overdue: {
    label: "ค้างชำระ",
    badgeClass: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
    dotClass: "bg-rose-500",
  },
  maintenance: {
    label: "ซ่อมบำรุง",
    badgeClass: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
    dotClass: "bg-slate-500",
  },
};

interface HeaderProps {
  currentBuilding: string;
  buildingName?: string;
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
  rooms?: Room[];
  invoices?: Invoice[];
  repairs?: RepairItem[];
  onSelectRoom?: (room: Room) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function Header({
  currentBuilding,
  buildingName,
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
  rooms = [],
  invoices,
  repairs,
  onSelectRoom,
  searchQuery,
  onSearchChange,
}: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [internalQuery, setInternalQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const currentQuery = searchQuery !== undefined ? searchQuery : internalQuery;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter rooms by roomNumber, tenant fullName, phone, or idCard
  const searchResults = useMemo(() => {
    const q = (currentQuery || "").trim().toLowerCase();
    if (!q || !rooms) return [];
    return rooms.filter((r) => {
      const matchRoom = r.roomNumber.toLowerCase().includes(q);
      const matchTenant = r.currentTenant?.fullName?.toLowerCase().includes(q);
      const matchPhone = r.currentTenant?.phone?.includes(q);
      const matchIdCard = r.currentTenant?.idCard?.includes(q);
      return matchRoom || matchTenant || matchPhone || matchIdCard;
    });
  }, [rooms, currentQuery]);

  const handleQueryChange = (val: string) => {
    setInternalQuery(val);
    onSearchChange?.(val);
    setIsDropdownOpen(true);
    setHighlightedIndex(0);
  };

  const handleClearSearch = () => {
    setInternalQuery("");
    onSearchChange?.("");
    setIsDropdownOpen(false);
    searchInputRef.current?.focus();
  };

  const handleSelectRoom = (room: Room) => {
    setIsDropdownOpen(false);
    setIsMobileSearchOpen(false);
    if (onSelectRoom) {
      onSelectRoom(room);
    }
    if (onNavigateToTab) {
      onNavigateToTab("room-grid");
    }
    onShowToast?.(
      `เปิดดูข้อมูลห้อง ${room.roomNumber} (${room.currentTenant ? room.currentTenant.fullName : "ห้องว่าง"})`,
      "info"
    );
  };

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        setIsDropdownOpen(true);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, Math.max(0, searchResults.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (searchResults.length > 0 && searchResults[highlightedIndex]) {
        handleSelectRoom(searchResults[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsDropdownOpen(false);
    }
  };

  return (
    <header className="h-16 border-b border-[var(--border)] bg-[var(--header)] backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-20 transition-colors">
      {/* Left: Breadcrumbs & Building switcher */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-1.5 -ml-1 rounded-xl text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--subtle)] transition cursor-pointer md:hidden flex items-center justify-center border border-[var(--border)] shadow-2xs"
            title="เปิด/ปิด เมนูนำทาง (Toggle Sidebar)"
          >
            <Menu className="w-4 h-4 text-[var(--foreground)]" />
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
            {buildingName || "อาคาร 1"} ({totalRooms ?? rooms.length}{propertyPlan === "starter" ? "/30 ห้อง (Starter)" : " ห้อง"})
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
      <div className="flex items-center gap-2.5">
        {/* Interactive Global Search (เลขห้อง, ชื่อผู้เข้าพัก, เบอร์โทร) */}
        <div ref={searchContainerRef} className="relative hidden md:block w-64 lg:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--muted)] pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={currentQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => setIsDropdownOpen(true)}
            onKeyDown={handleInputKeyDown}
            placeholder="ค้นหาเลขห้อง, ชื่อผู้เข้าพัก..."
            className="w-full bg-[var(--subtle)] border border-[var(--border)] rounded-xl pl-9 pr-14 py-1.5 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition shadow-2xs font-medium"
          />

          <div className="absolute right-2.5 top-1.5 flex items-center gap-1">
            {currentQuery ? (
              <button
                type="button"
                onClick={handleClearSearch}
                className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
                title="ล้างคำค้นหา"
              >
                <X className="w-3 h-3" />
              </button>
            ) : (
              <span className="text-[10px] bg-black/5 dark:bg-white/10 text-[var(--muted)] px-1.5 py-0.5 rounded font-mono select-none">
                ⌘K
              </span>
            )}
          </div>

          {/* Autocomplete Dropdown Popover */}
          {isDropdownOpen && currentQuery.trim().length > 0 && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md">
              <div className="p-2.5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--subtle)] text-[11px] text-[var(--muted)]">
                <span className="font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>ผลการค้นหาห้องพัก ({searchResults.length})</span>
                </span>
                <span className="text-[10px]">↑↓ นำทาง · ↵ เปิด · Esc ปิด</span>
              </div>

              <div className="max-h-80 overflow-y-auto p-1.5 space-y-1">
                {searchResults.length > 0 ? (
                  searchResults.map((room, idx) => {
                    const isHighlighted = idx === highlightedIndex;
                    const statusInfo = ROOM_STATUS_CONFIG[room.status] || {
                      label: room.status,
                      badgeClass: "bg-slate-500/15 text-slate-600 border-slate-500/30",
                      dotClass: "bg-slate-500",
                    };

                    return (
                      <div
                        key={room.id}
                        onClick={() => handleSelectRoom(room)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={cn(
                          "p-2.5 rounded-xl cursor-pointer transition flex items-center justify-between gap-3 border text-left group",
                          isHighlighted
                            ? "bg-emerald-500/10 border-emerald-500/30 text-[var(--foreground)]"
                            : "bg-transparent border-transparent hover:bg-[var(--subtle)]"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={cn(
                              "px-2.5 py-1 rounded-lg font-bold text-xs shrink-0 border flex items-center gap-1.5 shadow-2xs",
                              statusInfo.badgeClass
                            )}
                          >
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusInfo.dotClass)} />
                            <span>{room.roomNumber}</span>
                          </div>

                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-[var(--foreground)] truncate flex items-center gap-1.5">
                              {room.currentTenant ? (
                                <>
                                  <User className="w-3 h-3 text-indigo-500 shrink-0" />
                                  <span className="truncate">{room.currentTenant.fullName}</span>
                                </>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                  ห้องว่าง พร้อมเข้าพัก
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] text-[var(--muted)] truncate flex items-center gap-2 mt-0.5">
                              <span>ชั้น {room.floor}</span>
                              <span>·</span>
                              <span>฿{(room.monthlyRate || 0).toLocaleString()} /ด.</span>
                              {room.currentTenant?.phone && (
                                <>
                                  <span>·</span>
                                  <span className="truncate">📞 {room.currentTenant.phone}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold shrink-0 flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition">
                          ดูห้อง <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center space-y-1.5 text-[var(--muted)]">
                    <Search className="w-6 h-6 mx-auto text-[var(--muted)] opacity-50 mb-1" />
                    <div className="text-xs font-semibold text-[var(--foreground)]">
                      ไม่พบห้องพักหรือผู้เช่าที่ตรงกับ &ldquo;{currentQuery}&rdquo;
                    </div>
                    <div className="text-[11px]">
                      ลองค้นหาด้วยเลขห้อง (เช่น 101, A1) หรือชื่อผู้เข้าพัก
                    </div>
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline pt-1 inline-block cursor-pointer font-medium"
                    >
                      ล้างคำค้นหา
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Search Button & Popover */}
        <div className="relative md:hidden">
          <button
            type="button"
            onClick={() => {
              setIsMobileSearchOpen(!isMobileSearchOpen);
              setTimeout(() => mobileInputRef.current?.focus(), 50);
            }}
            className="w-9 h-9 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-[var(--foreground)] hover:border-emerald-500 flex items-center justify-center transition cursor-pointer shadow-2xs"
            title="ค้นหาห้องพัก / ผู้เช่า"
          >
            <Search className="w-4 h-4" />
          </button>

          {isMobileSearchOpen && (
            <div className="fixed inset-x-3 top-20 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl z-50 p-3 space-y-2 animate-in fade-in duration-150">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--muted)]" />
                <input
                  ref={mobileInputRef}
                  type="text"
                  value={currentQuery}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="ค้นหาเลขห้อง, ชื่อผู้เข้าพัก..."
                  className="w-full bg-[var(--subtle)] border border-[var(--border)] rounded-xl pl-9 pr-9 py-2 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-emerald-500"
                />
                {currentQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-3 top-2.5 text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {currentQuery.trim().length > 0 && (
                <div className="max-h-60 overflow-y-auto space-y-1 pt-1">
                  {searchResults.length > 0 ? (
                    searchResults.map((room) => (
                      <div
                        key={room.id}
                        onClick={() => handleSelectRoom(room)}
                        className="p-2.5 rounded-xl bg-[var(--subtle)] hover:bg-emerald-500/10 cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          ห้อง {room.roomNumber}
                        </div>
                        <div className="truncate text-[var(--foreground)]">
                          {room.currentTenant?.fullName || "ห้องว่าง"}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-[var(--muted)]">
                      ไม่พบห้องที่ตรงกับ &ldquo;{currentQuery}&rdquo;
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Action: จดมิเตอร์ด่วน */}
        <button
          onClick={onOpenQuickMeter}
          className="hidden lg:flex items-center gap-2 bg-[var(--subtle)] hover:border-emerald-500 text-[var(--foreground)] border border-[var(--border)] px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer shadow-xs"
        >
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>จดมิเตอร์ด่วน</span>
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
        <NotificationDropdown
          onNavigateToTab={onNavigateToTab}
          rooms={rooms}
          invoices={invoices}
          repairs={repairs}
        />

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
