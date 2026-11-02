"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type UserRole = "owner" | "manager";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleTitle: string;
  avatarText: string;
  phone?: string;
  assignedBranches?: string[]; // สาขาที่ได้รับอนุญาตให้ดูแล
  permissions?: {
    canDeleteBranch: boolean;
    canEditBankSettings: boolean;
    canViewExecutivePL: boolean;
    canResetSystem: boolean;
    canManageManagers: boolean;
  };
}

export const PRESET_USERS: Record<UserRole, AuthUser> = {
  owner: {
    id: "usr-owner-01",
    name: "คุณพักดี มีสุข",
    email: "owner@pakdee.com",
    role: "owner",
    roleTitle: "เจ้าของหอพัก (Owner / Super Admin)",
    avatarText: "พด",
    phone: "081-999-8888",
    assignedBranches: ["all"],
    permissions: {
      canDeleteBranch: true,
      canEditBankSettings: true,
      canViewExecutivePL: true,
      canResetSystem: true,
      canManageManagers: true,
    },
  },
  manager: {
    id: "usr-mgr-01",
    name: "สมศักดิ์ บริหาร",
    email: "manager@pakdee.com",
    role: "manager",
    roleTitle: "ผู้จัดการหอพัก (Manager / Branch Admin)",
    avatarText: "สบ",
    phone: "089-777-6666",
    assignedBranches: ["branch-1"],
    permissions: {
      canDeleteBranch: false,
      canEditBankSettings: false,
      canViewExecutivePL: false,
      canResetSystem: false,
      canManageManagers: false,
    },
  },
};

interface AuthContextType {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionExpired: boolean;
  clearSessionExpired: () => void;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  quickLoginAs: (role: UserRole) => void;
  verifyPassword: (pass: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "pakdee_auth_session_v1";
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 นาที (900,000 ms)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const lastActivityRef = React.useRef<number>(Date.now());

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && (parsed.role === "owner" || parsed.role === "manager")) {
          setCurrentUser(parsed);
          lastActivityRef.current = Date.now();
        }
      }
    } catch (e) {
      console.warn("Failed to restore Pakdee auth session:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 15-Minute Inactivity Session Monitor
  useEffect(() => {
    if (!currentUser) return;

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    let throttleTimeout: NodeJS.Timeout | null = null;
    const handleEvent = () => {
      if (!throttleTimeout) {
        updateActivity();
        throttleTimeout = setTimeout(() => {
          throttleTimeout = null;
        }, 1000);
      }
    };

    events.forEach((evt) => window.addEventListener(evt, handleEvent, { passive: true }));

    // เช็คทุก 5 วินาที หากไม่มีการขยับเมาส์/กดคีย์บอร์ดเกิน 15 นาที ให้ตัดเซสชันทันที
    const interval = setInterval(() => {
      if (Date.now() - lastActivityRef.current >= INACTIVITY_TIMEOUT_MS) {
        setSessionExpired(true);
        saveUserSession(null);
      }
    }, 5000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleEvent));
      clearInterval(interval);
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, [currentUser]);

  const saveUserSession = (user: AuthUser | null) => {
    setCurrentUser(user);
    try {
      if (user) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (e) {
      console.warn("Failed to write Pakdee auth session:", e);
    }
  };

  const login = async (identifier: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    await new Promise((res) => setTimeout(res, 300));
    const term = identifier.trim().toLowerCase();
    const cleanPhone = identifier.replace(/[-\s]/g, "").trim();

    // Verify Password (ค่าเริ่มต้นคือ P12345)
    const isPasswordValid = pass === "P12345" || pass === "123456" || pass.length >= 6;
    if (!isPasswordValid) {
      return {
        success: false,
        error: "รหัสผ่านไม่ถูกต้อง (รหัสผ่านเริ่มต้นของระบบคือ P12345)",
      };
    }

    // Match Owner by Phone or Email/Username
    const ownerPhoneClean = (PRESET_USERS.owner.phone || "").replace(/[-\s]/g, "");
    if (
      cleanPhone === ownerPhoneClean ||
      term === "081-999-8888" ||
      term === "owner@pakdee.com" ||
      term === "owner" ||
      term === "admin" ||
      term === "pakdee"
    ) {
      setSessionExpired(false);
      lastActivityRef.current = Date.now();
      try {
        localStorage.setItem("pakdee_user_password", pass);
      } catch {}
      saveUserSession(PRESET_USERS.owner);
      return { success: true };
    }

    // Match Manager by Phone or Email/Username
    const managerPhoneClean = (PRESET_USERS.manager.phone || "").replace(/[-\s]/g, "");
    if (
      cleanPhone === managerPhoneClean ||
      term === "089-777-6666" ||
      term === "manager@pakdee.com" ||
      term === "manager"
    ) {
      setSessionExpired(false);
      lastActivityRef.current = Date.now();
      try {
        localStorage.setItem("pakdee_user_password", pass);
      } catch {}
      saveUserSession(PRESET_USERS.manager);
      return { success: true };
    }

    // Match custom phone number (9-10 digits) or email
    if (cleanPhone.length >= 9 || term.includes("@")) {
      const customUser: AuthUser = {
        id: "usr-" + Date.now(),
        name: cleanPhone.length >= 9 ? `ผู้ใช้งาน (${identifier})` : term.split("@")[0],
        email: term.includes("@") ? term : `${cleanPhone}@pakdee.com`,
        phone: identifier,
        role: "manager",
        roleTitle: "ผู้จัดการหอพัก (Manager / Branch Admin)",
        avatarText: "ผจ",
        permissions: {
          canDeleteBranch: false,
          canEditBankSettings: false,
          canViewExecutivePL: false,
          canResetSystem: false,
          canManageManagers: false,
        },
      };
      setSessionExpired(false);
      lastActivityRef.current = Date.now();
      try {
        localStorage.setItem("pakdee_user_password", pass);
      } catch {}
      saveUserSession(customUser);
      return { success: true };
    }

    return {
      success: false,
      error: "เบอร์โทรศัพท์หรือรหัสผ่านไม่ถูกต้อง (ตัวอย่าง: 081-999-8888 รหัสผ่าน P12345)",
    };
  };

  const quickLoginAs = (role: UserRole) => {
    const user = PRESET_USERS[role];
    if (user) {
      setSessionExpired(false);
      lastActivityRef.current = Date.now();
      try {
        localStorage.setItem("pakdee_user_password", "P12345");
      } catch {}
      saveUserSession(user);
    }
  };

  const verifyPassword = (pass: string): boolean => {
    const trimmed = pass.trim();
    if (!trimmed) return false;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("pakdee_user_password");
    } catch {}
    if (saved && trimmed === saved.trim()) return true;
    if (trimmed === "P12345" || trimmed === "123456") return true;
    return false;
  };

  const logout = () => {
    setSessionExpired(false);
    try {
      localStorage.removeItem("pakdee_user_password");
    } catch {}
    saveUserSession(null);
  };

  const clearSessionExpired = () => {
    setSessionExpired(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        sessionExpired,
        clearSessionExpired,
        login,
        quickLoginAs,
        verifyPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      currentUser: null,
      isAuthenticated: false,
      isLoading: false,
      sessionExpired: false,
      clearSessionExpired: () => {},
      login: async () => ({ success: false, error: "AuthProvider not initialized" }),
      quickLoginAs: () => {},
      verifyPassword: () => false,
      logout: () => {},
    };
  }
  return ctx;
}
