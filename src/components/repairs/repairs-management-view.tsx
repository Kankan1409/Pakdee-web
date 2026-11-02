"use client";

import React, { useState } from "react";
import { RepairItem, Room } from "@/types/dormitory";
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Flame,
  Search,
  Filter,
  DollarSign,
  User,
  Image as ImageIcon,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface RepairsManagementViewProps {
  repairs: RepairItem[];
  rooms: Room[];
  onAddRepair: (repair: Omit<RepairItem, "id" | "reportedAt">) => void;
  onUpdateStatus: (id: string, status: RepairItem["status"]) => void;
}

export function RepairsManagementView({
  repairs,
  rooms,
  onAddRepair,
  onUpdateStatus,
}: RepairsManagementViewProps) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // New repair form state
  const [roomNumber, setRoomNumber] = useState<string>(rooms[0]?.roomNumber || "101");
  const [category, setCategory] = useState<RepairItem["category"]>("air");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [priority, setPriority] = useState<RepairItem["priority"]>("normal");
  const [cost, setCost] = useState<number>(0);
  const [technicianName, setTechnicianName] = useState<string>("");

  // Counts
  const pendingCount = repairs.filter((r) => r.status === "pending").length;
  const inProgressCount = repairs.filter((r) => r.status === "in_progress").length;
  const completedCount = repairs.filter((r) => r.status === "completed").length;
  const totalCost = repairs.reduce((acc, r) => acc + (r.cost || 0), 0);

  // Filtered
  const filtered = repairs.filter((r) => {
    if (activeTab === "pending" && r.status !== "pending") return false;
    if (activeTab === "in_progress" && r.status !== "in_progress") return false;
    if (activeTab === "completed" && r.status !== "completed") return false;
    if (selectedCategory !== "all" && r.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.roomNumber.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddRepair({
      roomNumber,
      category,
      title,
      description,
      priority,
      status: "pending",
      cost,
      technicianName: technicianName || undefined,
    });
    setTitle("");
    setDescription("");
    setCost(0);
    setTechnicianName("");
    setIsModalOpen(false);
  };

  const getCategoryLabel = (cat: RepairItem["category"]) => {
    switch (cat) {
      case "air":
        return "❄️ เครื่องปรับอากาศ";
      case "plumbing":
        return "💧 ระบบประปา/สุขภัณฑ์";
      case "electric":
        return "⚡ ไฟฟ้า/แสงสว่าง";
      case "furniture":
        return "🪑 เฟอร์นิเจอร์/ประตู";
      default:
        return "🔧 งานซ่อมทั่วไป";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center font-bold">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--foreground)] tracking-tight">
                แจ้งซ่อม & งานซ่อมบำรุง (Maintenance)
              </h1>
              <p className="text-xs text-[var(--muted)]">
                ติดตามคำร้องแจ้งซ่อมจากผู้เช่า มอบหมายงานช่าง และควบคุมค่าใช้จ่าย
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium shadow-md shadow-emerald-500/20 transition cursor-pointer text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>แจ้งซ่อมใหม่</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab("all")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === "all"
              ? "bg-slate-100 dark:bg-slate-800 border-slate-400 dark:border-slate-600 ring-2 ring-emerald-500/30"
              : "bg-[var(--card)] border-[var(--border)] hover:border-slate-300"
          }`}
        >
          <div className="text-xs text-[var(--muted)] font-medium">คำร้องทั้งหมด</div>
          <div className="text-2xl font-bold text-[var(--foreground)] mt-1">{repairs.length}</div>
          <div className="text-[11px] text-[var(--muted)] mt-1">รวมทุกสถานะ</div>
        </div>

        <div
          onClick={() => setActiveTab("pending")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === "pending"
              ? "bg-rose-500/10 border-rose-400 ring-2 ring-rose-500/30"
              : "bg-[var(--card)] border-[var(--border)] hover:border-rose-300"
          }`}
        >
          <div className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>รอดำเนินการ</span>
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{pendingCount}</div>
          <div className="text-[11px] text-[var(--muted)] mt-1">ยังไม่มอบหมายช่าง</div>
        </div>

        <div
          onClick={() => setActiveTab("in_progress")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === "in_progress"
              ? "bg-amber-500/10 border-amber-400 ring-2 ring-amber-500/30"
              : "bg-[var(--card)] border-[var(--border)] hover:border-amber-300"
          }`}
        >
          <div className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5" />
            <span>กำลังดำเนินการ</span>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{inProgressCount}</div>
          <div className="text-[11px] text-[var(--muted)] mt-1">ช่างกำลังเข้าตรวจเช็ค</div>
        </div>

        <div
          onClick={() => setActiveTab("completed")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === "completed"
              ? "bg-emerald-500/10 border-emerald-400 ring-2 ring-emerald-500/30"
              : "bg-[var(--card)] border-[var(--border)] hover:border-emerald-300"
          }`}
        >
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>เสร็จสิ้นแล้ว</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{completedCount}</div>
          <div className="text-[11px] text-[var(--muted)] mt-1">ค่าซ่อมรวม ฿{totalCost.toLocaleString()}</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--card)] p-3 rounded-2xl border border-[var(--border)]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="ค้นหาห้อง, อาการแจ้งซ่อม..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:outline-none"
          >
            <option value="all">ทุกหมวดหมู่งานซ่อม</option>
            <option value="air">แอร์ / ระบบปรับอากาศ</option>
            <option value="plumbing">ระบบประปา / ห้องน้ำ</option>
            <option value="electric">ระบบไฟฟ้า / แสงสว่าง</option>
            <option value="furniture">เฟอร์นิเจอร์ / ประตู</option>
            <option value="other">งานซ่อมทั่วไป</option>
          </select>
        </div>
      </div>

      {/* Repairs List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 text-center bg-[var(--card)] rounded-2xl border border-[var(--border)]">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-[var(--muted)] flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--foreground)]">ไม่มีรายการแจ้งซ่อมที่ค้างอยู่</h3>
            <p className="text-xs text-[var(--muted)] mt-1">ทุกอย่างเรียบร้อยดี ระบบพร้อมรับแจ้งซ่อมใหม่ได้ตลอดเวลา</p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:border-slate-300 dark:hover:border-slate-700 transition shadow-sm space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-sm tracking-wide">
                    ห้อง {item.roomNumber}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                      {item.title}
                      {item.priority === "urgent" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                          <Flame className="w-3 h-3" /> ด่วน
                        </span>
                      )}
                    </h3>
                    <div className="text-xs text-[var(--muted)] flex items-center gap-2 mt-0.5">
                      <span>{getCategoryLabel(item.category)}</span>
                      <span>•</span>
                      <span>แจ้งเมื่อ {item.reportedAt}</span>
                    </div>
                  </div>
                </div>

                {/* Status Badges & Action Buttons */}
                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                  {item.status === "pending" && (
                    <button
                      onClick={() => onUpdateStatus(item.id, "in_progress")}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 font-medium text-xs border border-amber-500/30 transition cursor-pointer"
                    >
                      รับงานช่าง ➔ กำลังซ่อม
                    </button>
                  )}
                  {item.status === "in_progress" && (
                    <button
                      onClick={() => onUpdateStatus(item.id, "completed")}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-medium text-xs border border-emerald-500/30 transition cursor-pointer"
                    >
                      ✓ ปิดงานซ่อมแล้ว
                    </button>
                  )}
                  {item.status === "completed" && (
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-xs border border-emerald-500/20">
                      ✓ เสร็จสมบูรณ์
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-[var(--foreground)] bg-[var(--subtle)] p-3 rounded-xl border border-[var(--border)] leading-relaxed">
                {item.description}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border)] text-xs text-[var(--muted)]">
                <div className="flex items-center gap-4">
                  {item.technicianName && (
                    <span className="flex items-center gap-1 text-[var(--foreground)]">
                      <User className="w-3.5 h-3.5 text-blue-500" /> ช่าง: {item.technicianName}
                    </span>
                  )}
                  {item.cost > 0 && (
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      ค่าใช้จ่าย: {formatCurrency(item.cost)}
                    </span>
                  )}
                </div>
                {item.completedAt && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    เสร็จสิ้นเมื่อ: {item.completedAt}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Repair Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--subtle)]">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-[var(--foreground)]">บันทึกแจ้งซ่อมใหม่</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--muted)] hover:text-[var(--foreground)] text-xs p-1"
              >
                ✕ ปิด
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                    ห้องที่แจ้งซ่อม *
                  </label>
                  <select
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.roomNumber}>
                        ห้อง {r.roomNumber} ({r.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                    หมวดหมู่ *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as RepairItem["category"])}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                  >
                    <option value="air">❄️ แอร์</option>
                    <option value="plumbing">💧 ประปา/ห้องน้ำ</option>
                    <option value="electric">⚡ ไฟฟ้า</option>
                    <option value="furniture">🪑 เฟอร์นิเจอร์</option>
                    <option value="other">🔧 งานซ่อมทั่วไป</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                  หัวข้อแจ้งซ่อม *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น แอร์ไม่เย็น, ก๊อกน้ำหยด, ลูกบิดประตูหลวม"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                  รายละเอียดอาการ
                </label>
                <textarea
                  rows={3}
                  placeholder="ระบุอาการอย่างละเอียดเพื่อให้ช่างเตรียมเครื่องมือได้ตรงจุด..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                    ความเร่งด่วน
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as RepairItem["priority"])}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                  >
                    <option value="normal">ปกติ (1-2 วัน)</option>
                    <option value="urgent">⚡ ด่วน (ภายในวันนี้)</option>
                    <option value="emergency">🚨 ฉุกเฉินทันที</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                    ประมาณการค่าใช้จ่าย (บาท)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={cost}
                    onChange={(e) => setCost(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                  ชื่อช่างผู้รับผิดชอบ (ถ้ามี)
                </label>
                <input
                  type="text"
                  placeholder="เช่น ช่างสมหมาย, ช่างประจำหอ"
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--muted)] hover:bg-[var(--subtle)]"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20"
                >
                  บันทึกแจ้งซ่อม
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
