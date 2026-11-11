"use client";

import React, { useState } from "react";
import { BroadcastItem, Room } from "@/types/dormitory";
import {
  Send,
  Zap,
  Droplets,
  Wrench,
  Megaphone,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  History,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Share2,
  Printer,
  X,
} from "lucide-react";

interface BroadcastLineViewProps {
  broadcasts: BroadcastItem[];
  rooms: Room[];
  onSendBroadcast: (broadcast: Omit<BroadcastItem, "id" | "sentAt" | "status">) => Promise<boolean | void> | void;
  branchName?: string;
  lineChannelId?: string;
}

export function BroadcastLineView({
  broadcasts,
  rooms,
  onSendBroadcast,
  branchName = "หอพัก",
  lineChannelId = "@pakdee_mansion",
}: BroadcastLineViewProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<BroadcastItem["template"]>("power");
  const [targetType, setTargetType] = useState<BroadcastItem["targetType"]>("all");
  const [selectedFloor, setSelectedFloor] = useState<string>("1");
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [title, setTitle] = useState<string>("⚡ ประกาศดับกระแสไฟฟ้าชั่วคราวเพื่อบำรุงรักษา");
  const [message, setMessage] = useState<string>(
    "เรียนผู้พักอาศัยทุกท่าน ทางการไฟฟ้าฯ จะดำเนินการตัดกระแสไฟฟ้าเพื่อปรับปรุงระบบหม้อแปลงในวันพฤหัสบดีที่ 30 ต.ค. เวลา 09:00 - 12:00 น. ขออภัยในความไม่สะดวก"
  );
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const inviteLink = `https://line.me/R/ti/p/${lineChannelId.startsWith("@") ? lineChannelId : "@" + lineChannelId}`;

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(inviteLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const applyTemplate = (tmpl: BroadcastItem["template"]) => {
    setSelectedTemplate(tmpl);
    if (tmpl === "power") {
      setTitle("⚡ ประกาศดับกระแสไฟฟ้าชั่วคราวเพื่อบำรุงรักษา");
      setMessage(
        "เรียนผู้พักอาศัยทุกท่าน ทางการไฟฟ้าฯ จะดำเนินการตัดกระแสไฟฟ้าเพื่อปรับปรุงระบบหม้อแปลงในวันพฤหัสบดีที่ 30 ต.ค. เวลา 09:00 - 12:00 น. ขออภัยในความไม่สะดวก"
      );
    } else if (tmpl === "water") {
      setTitle("💧 ประกาศปิดวาล์วน้ำเพื่อล้างถังพักน้ำดาดฟ้า");
      setMessage(
        "เรียนผู้พักอาศัยทุกท่าน ทางหอพักจะดำเนินการล้างถังพักน้ำเพื่อสุขอนามัย ในวันศุกร์ที่ 31 ต.ค. เวลา 13:00 - 16:00 น. ขอให้ทุกท่านสำรองน้ำใช้ล่วงหน้าครับ"
      );
    } else if (tmpl === "maintenance") {
      setTitle("🔧 แจ้งกำหนดการฉีดพ่นยากำจัดปลวกและแมลง");
      setMessage(
        "เรียนผู้พักอาศัยทุกท่าน วันเสาร์นี้ เวลา 10:00 - 15:00 น. จะมีเจ้าหน้าที่เข้ามาฉีดพ่นยากำจัดแมลงบริเวณทางเดินส่วนกลาง ขอความกรุณาปิดประตูห้องให้สนิท"
      );
    } else {
      setTitle("📢 ประกาศทั่วไปจากฝ่ายจัดการหอพัก");
      setMessage(
        "เรียนผู้พักอาศัยทุกท่าน ขอความร่วมมือไม่ส่งเสียงดังรบกวนผู้อื่นหลังเวลา 22:00 น. และช่วยกันรักษาความสะอาดบริเวณพื้นที่ส่วนกลาง ขอบคุณครับ"
      );
    }
  };

  const getRecipientCount = () => {
    const currentRooms = rooms.filter((r) => r.currentTenant && ["occupied", "overdue", "daily"].includes(r.status));
    if (targetType === "all") return currentRooms.length;
    if (targetType === "floor") {
      return currentRooms.filter((r) => r.floor.toString() === selectedFloor).length;
    }
    return currentRooms.filter((r) => selectedRooms.includes(r.roomNumber) || selectedRooms.includes(r.id)).length;
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return;
    setIsSending(true);
    try {
      await onSendBroadcast({
        template: selectedTemplate,
        title,
        message,
        targetType,
        targetValue: targetType === "floor" ? selectedFloor : targetType === "room" ? selectedRooms.join(",") : undefined,
        recipientCount: getRecipientCount(),
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--foreground)] tracking-tight">
              ส่งประกาศผ่าน LINE Official Account (Broadcast)
            </h1>
            <p className="text-xs text-[var(--muted)]">
              กระจายข้อความแจ้งเตือนสำคัญถึงห้องแชท LINE ของผู้เช่าทุกคนได้พร้อมกันในคลิกเดียว
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsShareModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer shrink-0"
        >
          <QrCode className="w-4 h-4" />
          <span>📲 ส่งต่อ LINE OA ให้ผู้เช่า (QR & Link)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form & Template */}
        <div className="lg:col-span-2 space-y-5 bg-[var(--card)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
          {/* Templates */}
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>เลือก Template สำเร็จรูป</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => applyTemplate("power")}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                  selectedTemplate === "power"
                    ? "bg-amber-500/15 border-amber-400 text-amber-600 dark:text-amber-400 font-bold ring-2 ring-amber-500/20"
                    : "bg-[var(--subtle)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-xs">⚡ ประกาศไฟดับ</span>
              </button>

              <button
                type="button"
                onClick={() => applyTemplate("water")}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                  selectedTemplate === "water"
                    ? "bg-blue-500/15 border-blue-400 text-blue-600 dark:text-blue-400 font-bold ring-2 ring-blue-500/20"
                    : "bg-[var(--subtle)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <Droplets className="w-4 h-4 text-blue-500" />
                <span className="text-xs">💧 ประกาศตัดน้ำ</span>
              </button>

              <button
                type="button"
                onClick={() => applyTemplate("maintenance")}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                  selectedTemplate === "maintenance"
                    ? "bg-rose-500/15 border-rose-400 text-rose-600 dark:text-rose-400 font-bold ring-2 ring-rose-500/20"
                    : "bg-[var(--subtle)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <Wrench className="w-4 h-4 text-rose-500" />
                <span className="text-xs">🔧 ซ่อมบำรุง</span>
              </button>

              <button
                type="button"
                onClick={() => applyTemplate("general")}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                  selectedTemplate === "general"
                    ? "bg-emerald-500/15 border-emerald-400 text-emerald-600 dark:text-emerald-400 font-bold ring-2 ring-emerald-500/20"
                    : "bg-[var(--subtle)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <Megaphone className="w-4 h-4 text-emerald-500" />
                <span className="text-xs">📢 ประกาศทั่วไป</span>
              </button>
            </div>
          </div>

          {/* Target Group */}
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-500" />
              <span>กลุ่มผู้รับประกาศ</span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: "all", label: "ผู้เช่าปัจจุบันทุกห้อง" },
                { id: "floor", label: "แยกตามชั้น" },
                { id: "room", label: "เลือกเฉพาะบางห้อง" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTargetType(t.id as BroadcastItem["targetType"])}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                    targetType === t.id
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold"
                      : "bg-[var(--subtle)] text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {targetType === "floor" && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-[var(--muted)]">เลือกชั้นที่ต้องการส่ง:</span>
                {["1", "2", "3", "4"].map((fl) => (
                  <button
                    key={fl}
                    type="button"
                    onClick={() => setSelectedFloor(fl)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      selectedFloor === fl
                        ? "bg-emerald-600 text-white"
                        : "bg-[var(--subtle)] text-[var(--muted)]"
                    }`}
                  >
                    ชั้น {fl}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title & Message */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                หัวข้อประกาศ *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)] font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                เนื้อหาข้อความ (จะแสดงในแชท LINE) *
              </label>
              <textarea
                rows={5}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--foreground)] leading-relaxed focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
            <div className="text-xs text-[var(--muted)]">
              ผู้เช่าปัจจุบันในกลุ่ม: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{getRecipientCount()} ห้อง</strong> (ส่งเฉพาะผู้ที่ผูก LINE)
            </div>

            <button
              onClick={handleSend}
              disabled={isSending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs shadow-lg shadow-emerald-500/25 transition cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? "กำลังส่งประกาศ..." : "ส่งประกาศถึงผู้เช่าปัจจุบัน"}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Mobile LINE Preview & History */}
        <div className="space-y-4">
          <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold">
                  LINE
                </div>
                <div>
                  <div className="text-xs font-bold leading-none">Pakdee Official</div>
                  <div className="text-[10px] text-emerald-400">LINE Official Account</div>
                </div>
              </div>
              <span className="text-[10px] text-slate-500">ตัวอย่างในมือถือ</span>
            </div>

            {/* Bubble */}
            <div className="bg-[#5cd466]/20 border border-[#5cd466]/40 p-4 rounded-2xl rounded-tl-none space-y-2 text-slate-100">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                {title || "หัวข้อประกาศ"}
              </div>
              <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                {message || "เนื้อหาประกาศจะแสดงที่นี่..."}
              </div>
              <div className="text-[10px] text-slate-400 text-right pt-1">วันนี้ 10:00 น.</div>
            </div>
          </div>

          {/* Broadcast History */}
          <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--border)] space-y-3">
            <h3 className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-blue-500" />
              <span>ประวัติการส่งประกาศล่าสุด</span>
            </h3>

            <div className="space-y-2">
              {broadcasts.map((b) => (
                <div key={b.id} className="p-2.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs space-y-1">
                  <div className="font-semibold text-[var(--foreground)] truncate">{b.title}</div>
                  <div className="flex items-center justify-between text-[10px] text-[var(--muted)]">
                    <span>{b.sentAt}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ ส่งแล้ว {b.recipientCount} คน
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Share LINE OA Modal for Tenants */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-[#06C755]/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#06C755] text-white flex items-center justify-center font-bold">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    ส่งต่อ LINE Official Account ให้ผู้เช่า
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    เพื่อให้ผู้เช่าเพิ่มเพื่อนและรับบิลแจ้งหนี้อัตโนมัติ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-center">
              {/* Branch Name & Account Title */}
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  LINE OA: {branchName}
                </div>
                <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                  LINE ID: {lineChannelId}
                </div>
              </div>

              {/* QR Code Container Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border-2 border-dashed border-[#06C755]/40 inline-flex flex-col items-center shadow-xs">
                {/* SVG Visual QR Code */}
                <svg
                  className="w-44 h-44 rounded-xl p-2 bg-white"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="100" height="100" fill="white" />
                  {/* Outer corner finders */}
                  <rect x="10" y="10" width="24" height="24" fill="#06C755" rx="3" />
                  <rect x="14" y="14" width="16" height="16" fill="white" rx="2" />
                  <rect x="18" y="18" width="8" height="8" fill="#06C755" rx="1" />

                  <rect x="66" y="10" width="24" height="24" fill="#06C755" rx="3" />
                  <rect x="70" y="14" width="16" height="16" fill="white" rx="2" />
                  <rect x="74" y="18" width="8" height="8" fill="#06C755" rx="1" />

                  <rect x="10" y="66" width="24" height="24" fill="#06C755" rx="3" />
                  <rect x="14" y="70" width="16" height="16" fill="white" rx="2" />
                  <rect x="18" y="74" width="8" height="8" fill="#06C755" rx="1" />

                  {/* QR Data Matrix Dots */}
                  <rect x="42" y="12" width="6" height="6" fill="#1e293b" rx="1" />
                  <rect x="52" y="12" width="6" height="6" fill="#1e293b" rx="1" />
                  <rect x="42" y="24" width="6" height="6" fill="#1e293b" rx="1" />
                  <rect x="52" y="24" width="6" height="6" fill="#1e293b" rx="1" />

                  <rect x="12" y="42" width="6" height="6" fill="#1e293b" rx="1" />
                  <rect x="24" y="42" width="6" height="6" fill="#1e293b" rx="1" />
                  <rect x="36" y="42" width="6" height="6" fill="#1e293b" rx="1" />
                  <rect x="48" y="42" width="6" height="6" fill="#06C755" rx="1" />
                  <rect x="60" y="42" width="6" height="6" fill="#1e293b" rx="1" />
                  <rect x="72" y="42" width="6" height="6" fill="#1e293b" rx="1" />
                  <rect x="84" y="42" width="6" height="6" fill="#1e293b" rx="1" />

                  <rect x="12" y="52" width="6" height="6" fill="#1e293b" rx="1" />
                  <rect x="24" y="52" width="6" height="6" fill="#1e293b" rx="1" />
                  <rect x="42" y="52" width="6" height="6" fill="#1e293b" rx="1" />
                  <rect x="52" y="52" width="6" height="6" fill="#1e293b" rx="1" />
                  <rect x="66" y="52" width="6" height="6" fill="#1e293b" rx="1" />
                  <rect x="80" y="52" width="6" height="6" fill="#1e293b" rx="1" />

                  <rect x="42" y="66" width="6" height="6" fill="#1e293b" rx="1" />
                  <rect x="52" y="66" width="6" height="6" fill="#1e293b" rx="1" />
                  <rect x="66" y="66" width="6" height="6" fill="#1e293b" rx="1" />
                  <rect x="80" y="66" width="6" height="6" fill="#1e293b" rx="1" />

                  <rect x="42" y="78" width="6" height="6" fill="#1e293b" rx="1" />
                  <rect x="66" y="78" width="6" height="6" fill="#1e293b" rx="1" />
                  <rect x="78" y="78" width="6" height="6" fill="#1e293b" rx="1" />
                </svg>
                <div className="mt-2 text-[10px] text-slate-500 font-medium">
                  สแกนด้วยแอป LINE เพื่อเพิ่มเพื่อนทันที
                </div>
              </div>

              {/* Action Buttons: Copy Link & Print */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-bold transition shadow-md shadow-[#06C755]/25 cursor-pointer"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>คัดลอกลิงก์สำเร็จแล้ว!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>คัดลอกลิงก์เพิ่มเพื่อน LINE</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>พิมพ์ใบประกาศ QR Code ติดที่หอพัก</span>
                </button>
              </div>

              {/* Instructions */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-left text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                <div className="font-bold text-emerald-800 dark:text-emerald-300">
                  💡 คำแนะนำสำหรับเจ้าของหอพัก:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-500 dark:text-slate-400">
                  <li>ส่งลิงก์นี้ในกลุ่ม LINE ของผู้เช่า หรือแชทส่วนตัว</li>
                  <li>พิมพ์ QR Code ติดไว้ที่เคาน์เตอร์ ประตูทางเข้า หรือลิฟต์</li>
                  <li>เมื่อผู้เช่าเพิ่มเพื่อน จะได้รับบิลอัตโนมัติทุกสิ้นเดือน</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
