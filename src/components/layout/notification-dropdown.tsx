"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Wrench,
  Clock,
  Sparkles,
  X,
  Check,
  ArrowRight,
  ExternalLink,
  Brush,
  FileSignature,
} from "lucide-react";
import { Room, Invoice, RepairItem } from "@/types/dormitory";

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  type: "urgent" | "success" | "warning" | "info";
  category: "billing" | "cleaning" | "repair" | "general" | "meter" | "contracts";
  targetTab?: string;
  time: string;
  isRead: boolean;
  actionText?: string;
}

const STATIC_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-static-1",
    title: "ห้อง 105 ค้างชำระเกินกำหนด",
    description: "บิลประจำงวด มียอดค้างชำระ 4,924.00 บาท กรุณาตรวจสอบและติดตาม",
    type: "urgent",
    category: "billing",
    targetTab: "invoices",
    time: "10 นาทีที่แล้ว",
    isRead: false,
    actionText: "เปิดดูใบแจ้งหนี้",
  },
  {
    id: "notif-static-2",
    title: "ห้อง 202 แจ้งซ่อม: แอร์ไม่เย็น มีน้ำหยด",
    description: "สถานะ: รองานซ่อมบำรุง นัดหมายเข้าตรวจสอบและล้างแอร์",
    type: "warning",
    category: "repair",
    targetTab: "repairs",
    time: "วันนี้ 09:30",
    isRead: false,
    actionText: "เปิดหน้าระบบแจ้งซ่อม",
  },
  {
    id: "notif-static-3",
    title: "ระบบจดมิเตอร์น้ำ-ไฟ ประจำงวด",
    description: "ระบบพร้อมสำหรับการบันทึกหน่วยและคำนวณบิลรอบเดือน",
    type: "info",
    category: "meter",
    targetTab: "meter",
    time: "2 ชั่วโมงที่แล้ว",
    isRead: true,
    actionText: "เปิดหน้าจดมิเตอร์",
  },
];

interface NotificationDropdownProps {
  onNavigateToTab?: (tab: string) => void;
  rooms?: Room[];
  invoices?: Invoice[];
  repairs?: RepairItem[];
}

export function NotificationDropdown({
  onNavigateToTab,
  rooms = [],
  invoices = [],
  repairs = [],
}: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("pakdee_read_notif_ids");
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "billing" | "contracts" | "repair">("all");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Combine dynamic live system alerts with default alerts (User Requirement 1: เข้าในส่วนของกระดิ่งแจ้งเตือนทั้งหมด)
  const notifications = useMemo(() => {
    const list: NotificationItem[] = [];

    // 1. Live Cleaning alerts
    const cleaningRooms = rooms.filter((r) => r.status === "cleaning");
    cleaningRooms.forEach((r) => {
      list.push({
        id: `cleaning-${r.id}`,
        title: `ห้อง ${r.roomNumber} รอแม่บ้านทำความสะอาด`,
        description: `สถานะห้องอยู่ในช่วง "รอทำความสะอาด" กรุณาเข้าตรวจสอบและกดยืนยันห้องสะอาดเพื่อเปิดให้จองใหม่`,
        type: "warning",
        category: "cleaning",
        targetTab: "cleaning",
        time: "รอดำเนินการ",
        isRead: readIds.includes(`cleaning-${r.id}`),
        actionText: `ไปที่หน้าทำความสะอาดห้อง ${r.roomNumber}`,
      });
    });

    // 2. Live Unpaid Invoices alerts (ยอดค้างชำระทั้งหมด)
    const unpaidInvoices = invoices.filter((inv) => inv.status === "unpaid" || inv.status === "overdue");
    unpaidInvoices.forEach((inv) => {
      list.push({
        id: `inv-${inv.id}`,
        title: `ห้อง ${inv.roomNumber} ค้างชำระค่าเช่า`,
        description: `ใบแจ้งหนี้ ${inv.invoiceNumber} ยอดค้างชำระ ฿${inv.totalAmount.toLocaleString()} (กำหนดชำระ ${inv.dueDate})`,
        type: "urgent",
        category: "billing",
        targetTab: "invoices",
        time: "ค้างชำระ",
        isRead: readIds.includes(`inv-${inv.id}`),
        actionText: `ไปที่ระบบใบแจ้งหนี้ห้อง ${inv.roomNumber}`,
      });
    });

    // 3. Live Expiring Contracts / Leases alerts (สัญญาเช่าใกล้หมดอายุภายใน 30 วัน จาก To-Do Today)
    const expiringRooms = rooms
      .filter((r) => r.status === "occupied" && r.leaseEndDate)
      .map((r) => {
        const end = new Date(r.leaseEndDate!).getTime();
        const now = new Date().setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
        return { room: r, diffDays };
      })
      .filter((item) => item.diffDays <= 30)
      .sort((a, b) => a.diffDays - b.diffDays);

    expiringRooms.forEach(({ room, diffDays }) => {
      list.push({
        id: `lease-${room.id}`,
        title: `ห้อง ${room.roomNumber} สัญญาเช่าใกล้หมดอายุ`,
        description:
          diffDays <= 0
            ? `สัญญาเช่าหมดอายุแล้ว (${room.currentTenant?.fullName || "ผู้เช่า"}) กรุณาต่อสัญญาหรือตรวจรับห้อง`
            : `สัญญาเช่าจะหมดอายุในอีก ${diffDays} วัน (${room.currentTenant?.fullName || "ผู้เช่า"}) กำหนดสิ้นสุด ${room.leaseEndDate}`,
        type: diffDays <= 7 ? "urgent" : "warning",
        category: "contracts",
        targetTab: "leases",
        time: diffDays <= 0 ? "หมดอายุแล้ว" : `เหลือ ${diffDays} วัน`,
        isRead: readIds.includes(`lease-${room.id}`),
        actionText: `ไปที่ระบบสัญญาเช่าห้อง ${room.roomNumber}`,
      });
    });

    // 4. Live Pending Repairs alerts
    const activeRepairs = repairs.filter((rep) => rep.status !== "completed");
    activeRepairs.forEach((rep) => {
      list.push({
        id: `repair-${rep.id}`,
        title: `ห้อง ${rep.roomNumber} แจ้งซ่อม: ${rep.title}`,
        description: rep.description || "มีงานแจ้งซ่อมใหม่รอดำเนินการ",
        type: rep.priority === "urgent" ? "urgent" : "warning",
        category: "repair",
        targetTab: "repairs",
        time: rep.reportedAt || "รอช่าง",
        isRead: readIds.includes(`repair-${rep.id}`),
        actionText: `ไปที่ระบบแจ้งซ่อมห้อง ${rep.roomNumber}`,
      });
    });

    // 5. Append general static notifications only if list is empty
    if (list.length === 0) {
      STATIC_NOTIFICATIONS.forEach((sn) => {
        list.push({
          ...sn,
          isRead: readIds.includes(sn.id) || sn.isRead,
        });
      });
    }

    return list;
  }, [rooms, invoices, repairs, readIds]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds(allIds);
    try {
      localStorage.setItem("pakdee_read_notif_ids", JSON.stringify(allIds));
    } catch {}
  };

  const markAsRead = (id: string) => {
    setReadIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem("pakdee_read_notif_ids", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    markAsRead(notif.id);
    setIsOpen(false);

    // Determine target page/tab from notification
    const destination =
      notif.targetTab ||
      (notif.category === "billing"
        ? "invoices"
        : notif.category === "cleaning"
        ? "cleaning"
        : notif.category === "repair"
        ? "repairs"
        : notif.category === "meter"
        ? "meter"
        : notif.category === "contracts"
        ? "leases"
        : "room-grid");

    if (onNavigateToTab) {
      onNavigateToTab(destination);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === "unread") return !n.isRead;
    if (activeFilter === "billing") return n.category === "billing";
    if (activeFilter === "contracts") return n.category === "contracts";
    if (activeFilter === "repair") return n.category === "repair" || n.category === "cleaning";
    return true;
  });

  const getIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "urgent":
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      case "warning":
        return <Wrench className="w-4 h-4 text-amber-500" />;
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "info":
      default:
        return <Receipt className="w-4 h-4 text-sky-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-9 h-9 rounded-xl border flex items-center justify-center transition cursor-pointer relative shadow-xs ${
          isOpen
            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
            : "bg-[var(--subtle)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-slate-400"
        }`}
        title="ศูนย์การแจ้งเตือน"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[var(--sidebar)] animate-pulse" />
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] sm:w-[468px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5 whitespace-nowrap">
                <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>การแจ้งเตือน</span>
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 whitespace-nowrap shrink-0">
                  {unreadCount} ใหม่
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  title="ทำเครื่องหมายว่าอ่านแล้วทั้งหมด"
                >
                  <Check className="w-3 h-3 shrink-0" />
                  <span>อ่านหมดแล้ว</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5 text-[11px] bg-white dark:bg-slate-900">
            {[
              {
                key: "all" as const,
                label: "ทั้งหมด",
                count: notifications.length,
                activeClass: "bg-slate-900 dark:bg-white text-white dark:text-slate-900",
              },
              {
                key: "unread" as const,
                label: "ยังไม่อ่าน",
                count: unreadCount,
                activeClass: "bg-rose-600 text-white",
              },
              {
                key: "billing" as const,
                label: "บิลค้างชำระ",
                count: notifications.filter((n) => n.category === "billing").length,
                activeClass: "bg-rose-600 text-white",
              },
              {
                key: "contracts" as const,
                label: "สัญญาเช่า",
                count: notifications.filter((n) => n.category === "contracts").length,
                activeClass: "bg-amber-600 text-white",
              },
              {
                key: "repair" as const,
                label: "ซ่อม/แม่บ้าน",
                count: notifications.filter((n) => n.category === "repair" || n.category === "cleaning").length,
                activeClass: "bg-indigo-600 text-white",
              },
            ].map((pill) => (
              <button
                key={pill.key}
                type="button"
                onClick={() => setActiveFilter(pill.key)}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer shrink-0 whitespace-nowrap leading-none ${
                  activeFilter === pill.key
                    ? pill.activeClass
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {pill.label} ({pill.count})
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
                <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-50" />
                ไม่มีรายการแจ้งเตือนในหมวดนี้
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex items-start gap-3 transition cursor-pointer hover:bg-emerald-50/70 dark:hover:bg-slate-800/80 active:scale-[0.99] group ${
                    !notif.isRead ? "bg-amber-500/5 dark:bg-amber-500/5" : ""
                  }`}
                >
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-950/40 transition">
                    {getIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className={`text-xs font-bold leading-tight group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition ${
                        !notif.isRead ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"
                      }`}>
                        {notif.title}
                      </h4>
                      {!notif.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      )}
                    </div>

                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {notif.description}
                    </p>

                    <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 whitespace-nowrap shrink-0">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{notif.time}</span>
                      </span>

                      {notif.actionText && (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition flex items-center gap-1 whitespace-nowrap shrink-0">
                          <span>{notif.actionText}</span>
                          <ArrowRight className="w-3 h-3 shrink-0" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 px-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center">
            <span className="text-[10px] text-slate-400">
              ระบบแจ้งเตือนอัตโนมัติ Real-time • PAKDEE PMS
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
