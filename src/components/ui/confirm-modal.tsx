"use client";

import React, { useEffect } from "react";
import { AlertTriangle, Trash2, LogOut, RefreshCcw, HelpCircle, X } from "lucide-react";

export type ConfirmVariant = "danger" | "warning" | "primary";
export type ConfirmIconType = "logout" | "delete" | "reset" | "warning" | "question";

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  hideCancel?: boolean;
  variant?: ConfirmVariant;
  iconType?: ConfirmIconType;
  details?: React.ReactNode;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "ยืนยัน",
  cancelText = "ยกเลิก",
  hideCancel = false,
  variant = "danger",
  iconType = "warning",
  details,
}: ConfirmModalProps) {
  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onConfirm]);

  if (!isOpen) return null;

  const renderIcon = () => {
    switch (iconType) {
      case "logout":
        return (
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
            <LogOut className="w-6 h-6" />
          </div>
        );
      case "delete":
        return (
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-inner">
            <Trash2 className="w-6 h-6" />
          </div>
        );
      case "reset":
        return (
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-inner">
            <RefreshCcw className="w-6 h-6" />
          </div>
        );
      case "question":
        return (
          <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 shadow-inner">
            <HelpCircle className="w-6 h-6" />
          </div>
        );
      default:
        return (
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
            <AlertTriangle className="w-6 h-6" />
          </div>
        );
    }
  };

  const getConfirmButtonClasses = () => {
    switch (variant) {
      case "danger":
        return "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/25 border-rose-500";
      case "warning":
        return "bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold shadow-lg shadow-amber-500/25 border-amber-400";
      case "primary":
      default:
        return "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 border-emerald-500";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with smooth blur */}
      <div
        className="fixed inset-0 bg-black/55 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Bento Modal Container */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 animate-in zoom-in-95 duration-150">
        {/* Close X button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          {renderIcon()}

          <div className="flex-1 min-w-0 pr-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
              {title}
            </h3>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {description}
            </p>

            {details && <div className="mt-3">{details}</div>}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          {!hideCancel && cancelText && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${getConfirmButtonClasses()}`}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
