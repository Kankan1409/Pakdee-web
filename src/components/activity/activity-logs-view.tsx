"use client";

import React, { useState } from "react";
import { ActivityLogItem } from "@/types/dormitory";
import {
  Clock,
  ShieldCheck,
  Search,
  CheckCircle2,
  Send,
  Plus,
  RefreshCw,
  FileText,
  User,
  Zap,
} from "lucide-react";

interface ActivityLogsViewProps {
  logs: ActivityLogItem[];
}

export function ActivityLogsView({ logs }: ActivityLogsViewProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedAction, setSelectedAction] = useState<string>("all");

  const filtered = logs.filter((log) => {
    if (selectedAction !== "all" && log.action !== selectedAction) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.description.toLowerCase().includes(q) ||
        log.userName.toLowerCase().includes(q) ||
        log.entity.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getActionBadge = (action: ActivityLogItem["action"]) => {
    switch (action) {
      case "SEND":
        return <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-[10px]">ส่งข้อมูล LINE</span>;
      case "PAYMENT":
        return <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">รับชำระเงิน</span>;
      case "VERIFY":
        return <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[10px]">ตรวจสอบสลิป</span>;
      case "CREATE":
        return <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold text-[10px]">สร้างรายการ</span>;
      case "UPDATE":
        return <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px]">อัปเดตข้อมูล</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 font-bold text-[10px]">{action}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--foreground)] tracking-tight">
              ประวัติการใช้งานระบบ (Activity Logs & Audit Trail)
            </h1>
            <p className="text-xs text-[var(--muted)]">
              เก็บบันทึกประวัติการกระทำ การแก้ไขข้อมูล และการเงินทั้งหมด ป้องกันการทุจริตและตรวจสอบย้อนหลังได้ 100%
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--card)] p-3 rounded-2xl border border-[var(--border)]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="ค้นหาประวัติการทำงาน..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs pb-1 sm:pb-0">
          {[
            { id: "all", label: "ทั้งหมด" },
            { id: "SEND", label: "ส่ง LINE" },
            { id: "VERIFY", label: "ตรวจสลิป" },
            { id: "CREATE", label: "สร้างใหม่" },
            { id: "UPDATE", label: "แก้ไขข้อมูล" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedAction(item.id)}
              className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer ${
                selectedAction === item.id
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-sm"
                  : "bg-[var(--subtle)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline List */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5 shadow-sm space-y-4">
        {filtered.map((log) => (
          <div
            key={log.id}
            className="flex items-start gap-3.5 p-3.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] hover:border-slate-300 dark:hover:border-slate-700 transition"
          >
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              {log.userName.slice(0, 2)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--foreground)]">{log.userName}</span>
                  {getActionBadge(log.action)}
                </div>
                <span className="text-[11px] text-[var(--muted)] font-mono">{log.createdAt}</span>
              </div>
              <p className="text-xs text-[var(--foreground)] mt-1 leading-relaxed">
                {log.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
