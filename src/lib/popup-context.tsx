"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { AppPopupModal, PopupLevel } from "@/components/ui/app-popup-modal";

export interface PopupOptions {
  level?: PopupLevel;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  hideCancel?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface PopupContextType {
  showPopup: (options: PopupOptions) => void;
  showInfo: (title: string, message: string | React.ReactNode, onConfirm?: () => void) => void;
  showWarning: (
    title: string,
    message: string | React.ReactNode,
    onConfirm: () => void,
    cancelText?: string
  ) => void;
  showError: (title: string, message: string | React.ReactNode, onConfirm?: () => void) => void;
  closePopup: () => void;
}

const PopupContext = createContext<PopupContextType | undefined>(undefined);

// Global singleton bridge for non-React or outside-of-render calls
let globalPopupTrigger: ((options: PopupOptions) => void) | null = null;

export const globalPopup = {
  show: (options: PopupOptions) => {
    if (globalPopupTrigger) {
      globalPopupTrigger(options);
    } else {
      console.warn("PopupProvider not mounted yet:", options);
    }
  },
  info: (title: string, message: string | React.ReactNode, onConfirm?: () => void) => {
    globalPopup.show({ level: "info", title, message, onConfirm, hideCancel: true });
  },
  warning: (
    title: string,
    message: string | React.ReactNode,
    onConfirm: () => void,
    cancelText?: string
  ) => {
    globalPopup.show({ level: "warning", title, message, onConfirm, cancelText, hideCancel: false });
  },
  error: (title: string, message: string | React.ReactNode, onConfirm?: () => void) => {
    globalPopup.show({ level: "error", title, message, onConfirm, hideCancel: true });
  },
};

export function PopupProvider({ children }: { children: ReactNode }) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    options: PopupOptions;
  }>({
    isOpen: false,
    options: {
      level: "info",
      title: "",
      message: "",
    },
  });

  const closePopup = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const showPopup = useCallback((options: PopupOptions) => {
    setModalState({
      isOpen: true,
      options,
    });
  }, []);

  const showInfo = useCallback(
    (title: string, message: string | React.ReactNode, onConfirm?: () => void) => {
      showPopup({
        level: "info",
        title,
        message,
        confirmText: "รับทราบ",
        hideCancel: true,
        onConfirm,
      });
    },
    [showPopup]
  );

  const showWarning = useCallback(
    (
      title: string,
      message: string | React.ReactNode,
      onConfirm: () => void,
      cancelText: string = "ยกเลิก"
    ) => {
      showPopup({
        level: "warning",
        title,
        message,
        confirmText: "ยืนยันการแก้ไข",
        cancelText,
        hideCancel: false,
        onConfirm,
      });
    },
    [showPopup]
  );

  const showError = useCallback(
    (title: string, message: string | React.ReactNode, onConfirm?: () => void) => {
      showPopup({
        level: "error",
        title,
        message,
        confirmText: "เข้าใจแล้ว",
        hideCancel: true,
        onConfirm,
      });
    },
    [showPopup]
  );

  // Bind singleton trigger
  useEffect(() => {
    globalPopupTrigger = showPopup;
    return () => {
      globalPopupTrigger = null;
    };
  }, [showPopup]);

  // Intercept window.alert in browser so NO native browser alert ever pops up!
  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalAlert = window.alert;
    window.alert = (msg?: any) => {
      const text = typeof msg === "string" ? msg : String(msg ?? "");
      // Detect if message is error, warning, or info
      let level: PopupLevel = "info";
      let title = "แจ้งเตือนระบบ PAKDEE";

      if (text.includes("⚠️") || text.includes("ไม่ถูกต้อง") || text.includes("ข้อผิดพลาด") || text.includes("เกิน") || text.includes("ไม่สามารถ")) {
        level = "error";
        title = "แจ้งเตือนข้อผิดพลาด";
      } else if (text.includes("ยืนยัน") || text.includes("แก้ไข") || text.includes("เปลี่ยน")) {
        level = "warning";
        title = "แจ้งเตือนการแก้ไข";
      } else {
        level = "info";
        title = "แจ้งเตือนทั่วไป";
      }

      showPopup({
        level,
        title,
        message: text.replace(/^[⚠️❗ℹ️✅]\s*/, ""),
        hideCancel: true,
      });
    };

    return () => {
      window.alert = originalAlert;
    };
  }, [showPopup]);

  return (
    <PopupContext.Provider
      value={{
        showPopup,
        showInfo,
        showWarning,
        showError,
        closePopup,
      }}
    >
      {children}

      <AppPopupModal
        isOpen={modalState.isOpen}
        onClose={closePopup}
        level={modalState.options.level}
        title={modalState.options.title}
        message={modalState.options.message}
        confirmText={modalState.options.confirmText}
        cancelText={modalState.options.cancelText}
        hideCancel={modalState.options.hideCancel}
        onConfirm={modalState.options.onConfirm}
        onCancel={modalState.options.onCancel}
      />
    </PopupContext.Provider>
  );
}

export function usePopup() {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error("usePopup must be used within a PopupProvider");
  }
  return context;
}
