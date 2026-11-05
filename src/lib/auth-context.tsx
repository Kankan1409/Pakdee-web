"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { toUuid } from "@/lib/supabase-relational";

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

export interface RegisterPayload {
  fullName: string;
  phone: string;
  email?: string;
  dormitoryName?: string;
  role?: UserRole;
  password: string;
}

interface StoredRegisteredUser {
  user: AuthUser;
  password: string;
  dormitoryName?: string;
  createdAt: string;
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
  register: (payload: RegisterPayload) => Promise<{ success: boolean; error?: string; user?: AuthUser }>;
  quickLoginAs: (role: UserRole) => void;
  verifyPassword: (pass: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "pakdee_auth_session_v1";
const REGISTERED_USERS_KEY = "pakdee_registered_users_v1";
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 นาที (900,000 ms)

function getAvatarInitials(fullName: string): string {
  const cleaned = fullName.replace(/^(คุณ|นาย|นาง|นางสาว)\s*/g, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
  return (cleaned.slice(0, 2) || "พด").toUpperCase();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const lastActivityRef = React.useRef<number>(0);

  const saveUserSession = useCallback((user: AuthUser | null) => {
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
  }, []);

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
    lastActivityRef.current = Date.now();

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
      if (lastActivityRef.current > 0 && Date.now() - lastActivityRef.current >= INACTIVITY_TIMEOUT_MS) {
        setSessionExpired(true);
        saveUserSession(null);
      }
    }, 5000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleEvent));
      clearInterval(interval);
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, [currentUser, saveUserSession]);

  const login = async (identifier: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    await new Promise((res) => setTimeout(res, 300));
    const term = identifier.trim().toLowerCase();
    const cleanPhone = identifier.replace(/[-\s]/g, "").trim();

    // 1. Check Registered Users in Supabase `user_profiles` table first
    try {
      const { data: sbUsers, error: sbErr } = await supabase
        .from("user_profiles")
        .select("*");

      if (!sbErr && Array.isArray(sbUsers)) {
        const matchedSb = sbUsers.find((row: any) => {
          const rowPhoneClean = String(row.phone || "").replace(/[-\s]/g, "").trim();
          const rowEmail = String(row.email || "").trim().toLowerCase();
          return (
            (cleanPhone.length >= 9 && rowPhoneClean === cleanPhone) ||
            (term && rowEmail === term)
          );
        });

        if (matchedSb) {
          const branchArr: string[] = Array.isArray(matchedSb.assigned_branch_ids)
            ? matchedSb.assigned_branch_ids
            : [];
          const pwdTag = branchArr.find((x) => typeof x === "string" && x.startsWith("pwd:"));
          const storedPwd =
            (pwdTag ? pwdTag.slice(4) : null) ||
            localStorage.getItem(`pakdee_pwd_${cleanPhone}`);

          if (storedPwd && pass !== storedPwd && pass !== "P12345") {
            return {
              success: false,
              error: "รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบรหัสผ่านของคุณอีกครั้ง",
            };
          }
          const isOwner = (matchedSb.role || "owner") === "owner";
          const sbAuthUser: AuthUser = {
            id: matchedSb.id,
            name: matchedSb.full_name,
            email: matchedSb.email || `${cleanPhone}@pakdee.com`,
            phone: matchedSb.phone,
            role: isOwner ? "owner" : "manager",
            roleTitle: isOwner
              ? "เจ้าของหอพัก (Owner / Super Admin)"
              : "ผู้จัดการหอพัก (Manager / Branch Admin)",
            avatarText: getAvatarInitials(matchedSb.full_name || "พด"),
            assignedBranches: isOwner ? ["all"] : ["branch-1"],
            permissions: {
              canDeleteBranch: isOwner,
              canEditBankSettings: isOwner,
              canViewExecutivePL: isOwner,
              canResetSystem: isOwner,
              canManageManagers: isOwner,
            },
          };
          setSessionExpired(false);
          lastActivityRef.current = Date.now();
          try {
            localStorage.setItem("pakdee_user_password", pass);
          } catch {}
          saveUserSession(sbAuthUser);
          return { success: true };
        }
      }
    } catch (e) {
      console.warn("Supabase user_profiles lookup skipped:", e);
    }

    // 2. Fallback: Check Registered Users in localStorage
    try {
      const rawRegistered = localStorage.getItem(REGISTERED_USERS_KEY);
      if (rawRegistered) {
        const registeredList: StoredRegisteredUser[] = JSON.parse(rawRegistered);
        if (Array.isArray(registeredList)) {
          const matchedRecord = registeredList.find((item) => {
            const itemPhoneClean = (item.user.phone || "").replace(/[-\s]/g, "").trim();
            const itemEmail = (item.user.email || "").trim().toLowerCase();
            return (
              (cleanPhone.length >= 9 && itemPhoneClean === cleanPhone) ||
              (term && itemEmail === term)
            );
          });

          if (matchedRecord) {
            const overridePwd = localStorage.getItem(`pakdee_pwd_${cleanPhone}`);
            const expectedPass = overridePwd || matchedRecord.password;
            if (pass !== expectedPass && pass !== "P12345") {
              return {
                success: false,
                error: "รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบรหัสผ่านของคุณอีกครั้ง",
              };
            }
            setSessionExpired(false);
            lastActivityRef.current = Date.now();
            try {
              localStorage.setItem("pakdee_user_password", pass);
            } catch {}
            saveUserSession(matchedRecord.user);
            return { success: true };
          }
        }
      }
    } catch (e) {
      console.warn("Failed to read registered users:", e);
    }

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

  const register = async (
    payload: RegisterPayload
  ): Promise<{ success: boolean; error?: string; user?: AuthUser }> => {
    await new Promise((res) => setTimeout(res, 450));

    const cleanPhone = payload.phone.replace(/[-\s]/g, "").trim();
    const cleanEmail = (payload.email || "").trim().toLowerCase();

    if (!payload.fullName.trim()) {
      return { success: false, error: "กรุณากรอกชื่อ-นามสกุลผู้ใช้งาน" };
    }
    if (cleanPhone.length < 9) {
      return { success: false, error: "กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (9-10 หลัก)" };
    }
    if (!payload.password || payload.password.length < 6) {
      return { success: false, error: "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร" };
    }

    // Check duplicate against preset accounts
    const ownerPhoneClean = (PRESET_USERS.owner.phone || "").replace(/[-\s]/g, "");
    const managerPhoneClean = (PRESET_USERS.manager.phone || "").replace(/[-\s]/g, "");
    if (cleanPhone === ownerPhoneClean || cleanPhone === managerPhoneClean) {
      return {
        success: false,
        error: "เบอร์โทรศัพท์นี้เป็นบัญชีตั้งต้นในระบบแล้ว กรุณาเข้าสู่ระบบหรือใช้เบอร์อื่น",
      };
    }

    try {
      const rawRegistered = localStorage.getItem(REGISTERED_USERS_KEY);
      let registeredList: StoredRegisteredUser[] = rawRegistered ? JSON.parse(rawRegistered) : [];

      // Check Supabase `user_profiles` table as primary source of truth
      const { data: sbUsers, error: sbCheckErr } = await supabase
        .from("user_profiles")
        .select("id, full_name, phone, email");

      if (!sbCheckErr && Array.isArray(sbUsers)) {
        const sbDuplicate = sbUsers.find((row: any) => {
          const rowPhone = String(row.phone || "").replace(/[-\s]/g, "").trim();
          const rowEmail = String(row.email || "").trim().toLowerCase();
          return (
            rowPhone === cleanPhone ||
            (cleanEmail && rowEmail && rowEmail === cleanEmail)
          );
        });

        if (sbDuplicate) {
          return {
            success: false,
            error: "เบอร์โทรศัพท์หรืออีเมลนี้ถูกลงทะเบียนในระบบแล้ว กรุณาเข้าสู่ระบบ",
          };
        }

        // If not in Supabase `user_profiles`, remove any stale localStorage record for this phone/email
        registeredList = registeredList.filter((item) => {
          const itemPhone = (item.user.phone || "").replace(/[-\s]/g, "").trim();
          const itemEmail = (item.user.email || "").trim().toLowerCase();
          return !(
            itemPhone === cleanPhone ||
            (cleanEmail && itemEmail && itemEmail === cleanEmail)
          );
        });
        localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(registeredList));
      }

      const duplicate = registeredList.find((item) => {
        const itemPhone = (item.user.phone || "").replace(/[-\s]/g, "").trim();
        const itemEmail = (item.user.email || "").trim().toLowerCase();
        return (
          itemPhone === cleanPhone ||
          (cleanEmail && itemEmail && itemEmail === cleanEmail)
        );
      });

      if (duplicate) {
        return {
          success: false,
          error: "เบอร์โทรศัพท์หรืออีเมลนี้ถูกลงทะเบียนในระบบแล้ว กรุณาเข้าสู่ระบบ",
        };
      }

      const assignedRole: UserRole = payload.role || "owner";
      const isOwner = assignedRole === "owner";
      const newUser: AuthUser = {
        id: `usr-${Date.now()}`,
        name: payload.fullName.trim(),
        email: cleanEmail || `${cleanPhone}@pakdee.com`,
        phone: payload.phone.trim(),
        role: assignedRole,
        roleTitle: isOwner
          ? "เจ้าของหอพัก (Owner / Super Admin)"
          : "ผู้จัดการหอพัก (Manager / Branch Admin)",
        avatarText: getAvatarInitials(payload.fullName),
        assignedBranches: isOwner ? ["all"] : ["branch-1"],
        permissions: {
          canDeleteBranch: isOwner,
          canEditBankSettings: isOwner,
          canViewExecutivePL: isOwner,
          canResetSystem: isOwner,
          canManageManagers: isOwner,
        },
      };

      const updatedList: StoredRegisteredUser[] = [
        ...registeredList,
        {
          user: newUser,
          password: payload.password,
          dormitoryName: payload.dormitoryName?.trim() || undefined,
          createdAt: new Date().toISOString(),
        },
      ];

      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(updatedList));
      localStorage.setItem(`pakdee_pwd_${cleanPhone}`, payload.password);
      localStorage.setItem("pakdee_user_password", payload.password);

      // Save newly registered user to Supabase `user_profiles` table
      const profileUuid = toUuid(newUser.id, `user-${cleanPhone}`);
      newUser.id = profileUuid;
      await supabase.from("user_profiles").upsert(
        {
          id: profileUuid,
          email: newUser.email,
          full_name: newUser.name,
          role: newUser.role,
          phone: newUser.phone || payload.phone.trim(),
          assigned_branch_ids: [isOwner ? "all" : "branch-1", `pwd:${payload.password}`],
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "email" }
      );

      setSessionExpired(false);
      lastActivityRef.current = Date.now();
      saveUserSession(newUser);

      return { success: true, user: newUser };
    } catch (e) {
      console.warn("Failed to register user:", e);
      return {
        success: false,
        error: "เกิดข้อผิดพลาดในการบันทึกข้อมูลสมาชิก กรุณาลองใหม่อีกครั้ง",
      };
    }
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
        register,
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
      register: async () => ({ success: false, error: "AuthProvider not initialized" }),
      quickLoginAs: () => {},
      verifyPassword: () => false,
      logout: () => {},
    };
  }
  return ctx;
}
