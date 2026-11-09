"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Info, AlertTriangle, AlertCircle, X } from "lucide-react";

const variants = {
  success: { title: "สำเร็จ", Icon: CheckCircle2, style: "bg-[#edf7ed] text-[#1e4620] border-[#c8e6c9]", icon: "text-[#2e7d32]" },
  info: { title: "แจ้งข้อมูล", Icon: Info, style: "bg-[#e5f6fd] text-[#014361] border-[#b3e5fc]", icon: "text-[#0288d1]" },
  warning: { title: "คำเตือน", Icon: AlertTriangle, style: "bg-[#fff4e5] text-[#663c00] border-[#ffe0b2]", icon: "text-[#ed6c02]" },
  error: { title: "เกิดข้อผิดพลาด", Icon: AlertCircle, style: "bg-[#fdeded] text-[#5f2120] border-[#ffcdd2]", icon: "text-[#d32f2f]" },
};

export function FloatingAlert({
  type = "info",
  title,
  message,
  onClose,
  duration = 4000,
}: {
  type?: keyof typeof variants;
  title?: string;
  message: React.ReactNode;
  onClose: () => void;
  duration?: number;
}) {
  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  if (typeof document === "undefined") return null;
  const { Icon, style, icon, title: defaultTitle } = variants[type];
  return createPortal(
    <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-[420px] z-[10000] print:hidden animate-in fade-in slide-in-from-top-2 duration-200">
      <div
        role={type === "error" || type === "warning" ? "alert" : "status"}
        aria-atomic="true"
        className={`flex items-start gap-3 rounded-lg border p-4 shadow-lg ${style}`}
      >
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${icon}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title || defaultTitle}</p>
          <div className="mt-1 max-h-[50vh] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed">
            {message}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิดแจ้งเตือน"
          className="rounded p-1 opacity-70 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>,
    document.body
  );
}
