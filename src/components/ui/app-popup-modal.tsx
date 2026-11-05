"use client";

import React, { useEffect } from "react";
import { FloatingAlert } from "@/components/ui/floating-alert";
import {
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  X,
  Sparkles,
} from "lucide-react";

export type PopupLevel = "info" | "warning" | "error";

export interface PopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  level?: PopupLevel;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  hideCancel?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const LEVEL_CONFIG = {
  info: {
    badgeText: "แจ้งเตือนทั่วไป",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    iconBoxClass: "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
    confirmBtnClass: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 border-emerald-500",
    defaultConfirmText: "รับทราบ",
    defaultHideCancel: true,
    Icon: CheckCircle2,
  },
  warning: {
    badgeText: "แจ้งเตือนแก้ไข / ยืนยัน",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    iconBoxClass: "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400",
    confirmBtnClass: "bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold shadow-lg shadow-amber-500/25 border-amber-400",
    defaultConfirmText: "ยืนยันการดำเนินการ",
    defaultHideCancel: false,
    Icon: AlertTriangle,
  },
  error: {
    badgeText: "แจ้งเตือนผิดพลาด",
    badgeClass: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
    iconBoxClass: "bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400",
    confirmBtnClass: "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/25 border-rose-500",
    defaultConfirmText: "เข้าใจแล้ว",
    defaultHideCancel: true,
    Icon: AlertCircle,
  },
};

export function AppPopupModal({
  isOpen,
  onClose,
  level = "info",
  title,
  message,
  confirmText,
  cancelText = "ยกเลิก",
  hideCancel,
  onConfirm,
  onCancel,
}: PopupModalProps) {
  const config = LEVEL_CONFIG[level] || LEVEL_CONFIG.info;
  const isCancelHidden = hideCancel !== undefined ? hideCancel : config.defaultHideCancel;
  const finalConfirmText = confirmText || config.defaultConfirmText;
  const IconComponent = config.Icon;

  // Handle Keyboard shortcuts (Esc = close, Enter = confirm)
  useEffect(() => {
    if (!isOpen || (isCancelHidden && !onConfirm && !onCancel)) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (onCancel) onCancel();
        onClose();
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (onConfirm) onConfirm();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onConfirm, onCancel, isCancelHidden]);

  if (!isOpen) return null;

  if (isCancelHidden && !onConfirm && !onCancel) {
    return <FloatingAlert type={level} title={title} message={message} onClose={onClose} />;
  }

  const handleConfirmAction = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  const handleCancelAction = () => {
    if (onCancel) onCancel();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop blur */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={handleCancelAction}
      />

      {/* Bento Popup Box */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 animate-in zoom-in-95 fade-in duration-150">
        {/* Top Header Row: Badge & Close Button */}
        <div className="flex items-center justify-between mb-4">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${config.badgeClass}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            <span>{config.badgeText}</span>
          </span>

          <button
            type="button"
            onClick={handleCancelAction}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="ปิดหน้าต่าง (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-inner ${config.iconBoxClass}`}
          >
            <IconComponent className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
              {title}
            </h3>
            <div className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {message}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          {!isCancelHidden && (
            <button
              type="button"
              onClick={handleCancelAction}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            onClick={handleConfirmAction}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border ${config.confirmBtnClass}`}
            autoFocus
          >
            {finalConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
