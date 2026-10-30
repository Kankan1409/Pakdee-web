"use client";

import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  type: "urgent" | "success" | "warning" | "info";
  category: "billing" | "cleaning" | "repair" | "general";
  time: string;
  isRead: boolean;
  actionText?: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    title: "ห้อง 105 ค้างชำระเกินกำหนด 5 วัน",
    description: "บิลประจำงวด ต.ค. 2569 ยอดค้างชำระ 4,500.00 บาท กรุณาติดตาม",
    type: "urgent",
    category: "billing",
    time: "10 นาทีที่แล้ว",
    isRead: false,
    actionText: "ดูบิลห้อง 105",
  },
  {
    id: "notif-2",
    title: "ห้อง 104 แม่บ้านทำความสะอาดเสร็จแล้ว",
    description: "ตรวจเช็กสภาพห้องพักและเปลี่ยนผ้าปูที่นอนเรียบร้อย พร้อมปล่อยเช่า",
    type: "success",
    category: "cleaning",
    time: "45 นาทีที่แล้ว",
    isRead: false,
    actionText: "ตรวจห้อง",
  },
  {
    id: "notif-3",
    title: "ห้อง 103 ชำระเงินค่ามัดจำคีย์การ์ดแล้ว",
    description: "ผู้เช่าแนบสลิปผ่านพร้อมเพย์ 300.00 บาท บันทึกเข้าระบบเรียบร้อย",
    type: "info",
    category: "billing",
    time: "2 ชั่วโมงที่แล้ว",
    isRead: false,
  },
  {
    id: "notif-4",
    title: "ห้อง 202 แจ้งซ่อม: แอร์ไม่เย็น มีน้ำหยด",
    description: "สถานะ: มอบหมายช่างสุรชัยแล้ว นัดหมายเข้าซ่อมพรุ่งนี้ 10:00 น.",
    type: "warning",
    category: "repair",
    time: "วันนี้ 09:30",
    isRead: true,
    actionText: "ดูใบแจ้งซ่อม",
  },
  {
    id: "notif-5",
    title: "บันทึกมิเตอร์น้ำ-ไฟ ประจำงวดครบถ้วน",
    description: "ระบบคำนวณหน่วยใช้น้ำและไฟครบทั้ง 24 ห้อง พร้อมออกบิลแจ้งหนี้",
    type: "success",
    category: "general",
    time: "เมื่อวานนี้",
    isRead: true,
  },
];

interface NotificationDropdownProps {
  onNavigateToTab?: (tab: string) => void;
}

export function NotificationDropdown({ onNavigateToTab }: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "billing" | "repair">("all");
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === "unread") return !n.isRead;
    if (activeFilter === "billing") return n.category === "billing";
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
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>การแจ้งเตือน</span>
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                  {unreadCount} ใหม่
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  title="ทำเครื่องหมายว่าอ่านแล้วทั้งหมด"
                >
                  <Check className="w-3 h-3" />
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
          <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-[11px] overflow-x-auto bg-white dark:bg-slate-900">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                activeFilter === "all"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              ทั้งหมด ({notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter("unread")}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                activeFilter === "unread"
                  ? "bg-rose-600 text-white"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              ยังไม่อ่าน ({unreadCount})
            </button>
            <button
              onClick={() => setActiveFilter("billing")}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                activeFilter === "billing"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              บิล/การเงิน
            </button>
            <button
              onClick={() => setActiveFilter("repair")}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                activeFilter === "repair"
                  ? "bg-amber-600 text-white"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              แจ้งซ่อม/แม่บ้าน
            </button>
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
                  onClick={() => markAsRead(notif.id)}
                  className={`p-3.5 flex items-start gap-3 transition cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                    !notif.isRead ? "bg-amber-500/5 dark:bg-amber-500/5" : ""
                  }`}
                >
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                    {getIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className={`text-xs font-bold leading-tight ${
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

                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {notif.time}
                      </span>

                      {notif.actionText && (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                          {notif.actionText} ➔
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
