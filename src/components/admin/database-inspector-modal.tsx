"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  X,
  Database,
  RefreshCw,
  Search,
  ExternalLink,
  Home,
  Users,
  Building,
  Zap,
  Receipt,
  CheckCircle2,
  Table as TableIcon,
  Code,
  FileSignature,
  Wrench,
  DollarSign,
  Settings,
} from "lucide-react";

interface DatabaseInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TableName =
  | "rooms"
  | "tenants"
  | "properties"
  | "invoices"
  | "meter_readings"
  | "contracts"
  | "repairs"
  | "expenses"
  | "branch_settings";

interface TableMeta {
  key: TableName;
  label: string;
  icon: any;
  description: string;
}

const TABLES: TableMeta[] = [
  { key: "rooms", label: "ห้องพัก (rooms)", icon: Home, description: "ข้อมูลห้องพักทั้งหมด ชั้น ค่าเช่า และสถานะห้อง (แยกตามสาขา)" },
  { key: "tenants", label: "ผู้เช่า (tenants)", icon: Users, description: "ข้อมูลผู้เช่า 14 ฟิลด์ เบอร์โทร บัตร ปชช." },
  { key: "properties", label: "สาขาหอพัก (properties)", icon: Building, description: "รายชื่อสาขา อัตราค่าน้ำ-ไฟ เลขพร้อมเพย์" },
  { key: "invoices", label: "ใบแจ้งหนี้ (invoices)", icon: Receipt, description: "หัวบิล ยอดเงินรวม วันครบกำหนด และสถานะชำระ" },
  { key: "meter_readings", label: "ประวัติมิเตอร์ (meter_readings)", icon: Zap, description: "ประวัติการจดเลขมิเตอร์น้ำ-ไฟทุกงวด" },
  { key: "contracts", label: "สัญญาเช่า (contracts)", icon: FileSignature, description: "สัญญาเช่าดิจิทัล เงินประกัน และวันหมดสัญญา" },
  { key: "repairs", label: "แจ้งซ่อม (repairs)", icon: Wrench, description: "ประวัติการแจ้งซ่อม สถานะ และค่าใช้จ่ายซ่อม" },
  { key: "expenses", label: "รายจ่าย (expenses)", icon: DollarSign, description: "บันทึกค่าใช้จ่ายดำเนินการและสาธารณูปโภค" },
  { key: "branch_settings", label: "ตั้งค่าสาขา (branch_settings)", icon: Settings, description: "ตั้งค่า 10 แท็บ กฎค่าน้ำไฟ บัญชีธนาคาร (แยกรายสาขา)" },
];

export function DatabaseInspectorModal({ isOpen, onClose }: DatabaseInspectorModalProps) {
  const [activeTable, setActiveTable] = useState<TableName>("rooms");
  const [data, setData] = useState<any[]>([]);
  const [dataSource, setDataSource] = useState<"supabase" | "local">("supabase");
  const [counts, setCounts] = useState<Record<TableName, number>>({
    rooms: 0,
    tenants: 0,
    properties: 0,
    invoices: 0,
    meter_readings: 0,
    contracts: 0,
    repairs: 0,
    expenses: 0,
    branch_settings: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "json">("table");

  // Fetch counts for all tables (Supabase or Local fallback)
  const fetchCounts = async () => {
    const newCounts: Record<TableName, number> = { ...counts };
    for (const t of TABLES) {
      try {
        const { count, error } = await supabase.from(t.key).select("*", { count: "exact", head: true });
        if (!error && count !== null) {
          newCounts[t.key] = count;
          continue;
        }
      } catch {}

      // Local storage fallback count (dedicated dev keys first)
      if (typeof window !== "undefined") {
        const localStored = localStorage.getItem("pakdee_dev_" + t.key) || localStorage.getItem("pakdee_" + t.key);
        if (localStored) {
          try {
            const parsed = JSON.parse(localStored);
            newCounts[t.key] = Array.isArray(parsed) ? parsed.length : 1;
            continue;
          } catch {}
        }
      }
      newCounts[t.key] = 0;
    }
    setCounts(newCounts);
  };

  // Fetch rows for active table
  const fetchTableData = async (tbl: TableName) => {
    setIsLoading(true);
    try {
      const { data: rows, error } = await supabase.from(tbl).select("*").limit(100);
      if (!error && rows && rows.length > 0) {
        setData(rows);
        setDataSource("supabase");
        return;
      }

      // Check local storage fallback (dedicated dev keys first)
      if (typeof window !== "undefined") {
        const localStored = localStorage.getItem("pakdee_dev_" + tbl) || localStorage.getItem("pakdee_" + tbl);
        if (localStored) {
          try {
            const parsed = JSON.parse(localStored);
            const arrayData = Array.isArray(parsed) ? parsed : [parsed];
            setData(arrayData);
            setDataSource("local");
            return;
          } catch {}
        }
      }

      setData([]);
      setDataSource("supabase");
    } catch (err) {
      console.error("Error fetching inspector data:", err);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCounts();
      fetchTableData(activeTable);
    }
  }, [isOpen, activeTable]);

  if (!isOpen) return null;

  // Filtered rows
  const filteredData = data.filter((row) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return Object.values(row).some((val) =>
      val !== null && val !== undefined && String(val).toLowerCase().includes(term)
    );
  });

  // Extract columns
  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--header)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[var(--foreground)]">
                  Supabase Live Database Inspector (ดูข้อมูลจริงในฐานข้อมูล)
                </h3>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  dataSource === "supabase"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                }`}>
                  {dataSource === "supabase" ? "☁️ SUPABASE CLOUD" : "💾 LOCAL DEV DB (พอร์ต 3000 แยกอิสระ)"}
                </span>
              </div>
              <p className="text-xs text-[var(--muted)]">
                {dataSource === "supabase"
                  ? "Project URL: https://qygelgekosmklwrgnaxq.supabase.co"
                  : "ฐานข้อมูลเฉพาะพอร์ต 3000 แยกขาดจาก UserTest (3001) เด็ดขาด 100% พร้อมสคริปต์ขึ้น Supabase"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://supabase.com/dashboard/project/qygelgekosmklwrgnaxq/editor"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--subtle)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] transition cursor-pointer"
              title="เปิดหน้าเว็บ Supabase Dashboard เพื่อดูแบบเต็ม"
            >
              <span>เปิดเว็บ Supabase.com</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--subtle)] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Table Selector Tabs */}
        <div className="px-6 py-2.5 border-b border-[var(--border)] bg-[var(--subtle)] flex items-center gap-2 overflow-x-auto shrink-0">
          {TABLES.map((t) => {
            const Icon = t.icon;
            const count = counts[t.key] ?? 0;
            const isActive = activeTable === t.key;

            return (
              <button
                key={t.key}
                onClick={() => {
                  setActiveTable(t.key);
                  setSearchTerm("");
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 border ${
                  isActive
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-[var(--card)] text-[var(--muted)] hover:text-[var(--foreground)] border-[var(--border)] hover:border-slate-400"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-black/5 dark:bg-white/10 text-[var(--muted)]"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Action & Filter Toolbar */}
        <div className="px-6 py-3 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          {/* Search in active table */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--muted)]" />
            <input
              type="text"
              placeholder={`ค้นหาในตาราง ${activeTable}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--subtle)] border border-[var(--border)] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-[var(--subtle)] border border-[var(--border)] p-1 rounded-xl text-xs">
              <button
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  viewMode === "table" ? "bg-white dark:bg-slate-800 text-[var(--foreground)] shadow-xs" : "text-[var(--muted)]"
                }`}
              >
                <TableIcon className="w-3 h-3" />
                <span>ตาราง</span>
              </button>
              <button
                onClick={() => setViewMode("json")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  viewMode === "json" ? "bg-white dark:bg-slate-800 text-[var(--foreground)] shadow-xs" : "text-[var(--muted)]"
                }`}
              >
                <Code className="w-3 h-3" />
                <span>JSON</span>
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={() => {
                fetchCounts();
                fetchTableData(activeTable);
              }}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--subtle)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] transition cursor-pointer"
              title="ดึงข้อมูลสดจาก Supabase อีกครั้ง"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-emerald-500" : ""}`} />
              <span className="hidden sm:inline">รีเฟรชสด</span>
            </button>
          </div>
        </div>

        {/* Content Table / JSON View */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-[var(--background)]">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
              <div className="text-xs font-semibold text-[var(--muted)]">กำลังดึงข้อมูลสดจาก Supabase Cloud...</div>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
              <Database className="w-10 h-10 text-[var(--muted)] opacity-50" />
              <div className="text-sm font-bold text-[var(--foreground)]">ไม่มีข้อมูลในตาราง &quot;{activeTable}&quot;</div>
              <p className="text-xs text-[var(--muted)] max-w-sm">
                ตารางนี้ยังว่างเปล่า หรือไม่พบข้อมูลตามคำค้นหา &quot;{searchTerm}&quot; เมื่อมีการทำรายการบนหน้าเว็บ ข้อมูลจะมาบันทึกที่นี่โดยอัตโนมัติ
              </p>
            </div>
          ) : viewMode === "json" ? (
            <pre className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] text-xs font-mono text-[var(--foreground)] overflow-auto max-h-full">
              {JSON.stringify(filteredData, null, 2)}
            </pre>
          ) : (
            <div className="border border-[var(--border)] rounded-2xl overflow-hidden bg-[var(--card)] shadow-xs">
              <div className="overflow-x-auto max-h-[60vh]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[var(--subtle)] text-[var(--foreground)] sticky top-0 z-10 border-b border-[var(--border)]">
                    <tr>
                      <th className="py-2.5 px-3 font-bold text-[var(--muted)] uppercase text-[10px] w-12 text-center">#</th>
                      {columns.map((col) => (
                        <th key={col} className="py-2.5 px-3 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filteredData.map((row, idx) => (
                      <tr key={row.id || idx} className="hover:bg-black/5 dark:hover:bg-white/5 transition">
                        <td className="py-2.5 px-3 text-center text-[var(--muted)] font-mono text-[11px]">{idx + 1}</td>
                        {columns.map((col) => {
                          const val = row[col];
                          const isNull = val === null || val === undefined;

                          return (
                            <td key={col} className="py-2.5 px-3 whitespace-nowrap text-[12px] max-w-xs truncate font-mono">
                              {isNull ? (
                                <span className="text-[10px] text-[var(--muted)] italic">NULL</span>
                              ) : typeof val === "boolean" ? (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  val ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/15 text-rose-600"
                                }`}>
                                  {String(val)}
                                </span>
                              ) : col === "status" ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                  {String(val)}
                                </span>
                              ) : (
                                String(val)
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-[var(--border)] bg-[var(--subtle)] flex items-center justify-between text-xs text-[var(--muted)] shrink-0">
          <div>
            แสดงผล <strong className="text-[var(--foreground)]">{filteredData.length}</strong> จากทั้งหมด{" "}
            <strong className="text-[var(--foreground)]">{counts[activeTable] ?? 0}</strong> รายการในตาราง{" "}
            <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{activeTable}</strong>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>เชื่อมต่อกับ Supabase PostgreSQL Cloud แบบเรียลไทม์</span>
          </div>
        </div>
      </div>
    </div>
  );
}
