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

  // Revalidate saved credentials against the database before restoring access.
  useEffect(() => {
    let mounted = true;
    const safetyTimer = setTimeout(() => {
      if (mounted) setIsLoading(false);
    }, 2000);

    const restore = async () => {
      try {
        const saved = localStorage.getItem(AUTH_STORAGE_KEY);
        const password = localStorage.getItem("pakdee_user_password");
        const user = saved ? JSON.parse(saved) : null;
        if (user && password) {
          const result = await login(user.email || user.phone || "", password);
          if (result.success) return;
        }
        saveUserSession(null);
        localStorage.removeItem("pakdee_user_password");
      } catch {
        saveUserSession(null);
      } finally {
        if (mounted) setIsLoading(false);
        clearTimeout(safetyTimer);
      }
    };
    void restore();

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
    };
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

    if (!term) {
      return { success: false, error: "กรุณากรอกเบอร์โทรศัพท์หรืออีเมล" };
    }
    if (term.includes("@") ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(term) : !/^0\d{8,9}$/.test(cleanPhone)) {
      return { success: false, error: term.includes("@") ? "รูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง" : "กรุณากรอกเบอร์โทรศัพท์ 9–10 หลักที่ขึ้นต้นด้วย 0 หรืออีเมลให้ถูกต้อง" };
    }
    if (!pass) {
      return { success: false, error: "กรุณากรอกรหัสผ่าน" };
    }

    // 1. Check Registered Users in Supabase `user_profiles` table first
    try {
      const { data: sbUsers, error: sbErr } = await supabase
        .from("user_profiles")
        .select("*");

      if (sbErr || !Array.isArray(sbUsers)) {
        return { success: false, error: "เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
      }
      if (Array.isArray(sbUsers)) {
        const matchedSb = sbUsers.find((row: any) => {
          const rowPhoneClean = String(row.phone || "").replace(/[-\s]/g, "").trim();
          const rowEmail = String(row.email || "").trim().toLowerCase();
          return (
            (cleanPhone.length >= 9 && rowPhoneClean === cleanPhone) ||
            (term && rowEmail === term)
          );
        });

        if (!matchedSb) {
          return { success: false, error: "ไม่พบบัญชีเบอร์โทรศัพท์หรืออีเมลนี้ในฐานข้อมูล กรุณาตรวจสอบข้อมูล หรือสมัครสมาชิกก่อนเข้าสู่ระบบ" };
        }
        if (matchedSb.is_active !== true || !["owner", "manager"].includes(matchedSb.role)) {
          return { success: false, error: "บัญชีนี้ยังไม่เปิดใช้งานหรือไม่มีสิทธิ์เข้าใช้งาน กรุณาติดต่อผู้ดูแลระบบ" };
        }
        if (matchedSb) {
          const branchArr: string[] = Array.isArray(matchedSb.assigned_branch_ids)
            ? matchedSb.assigned_branch_ids
            : [];
          const pwdTag = branchArr.find((x) => typeof x === "string" && x.startsWith("pwd:"));
          const storedPwd = pwdTag ? pwdTag.slice(4) : null;

          if (!storedPwd) {
            return { success: false, error: "บัญชีนี้ยังไม่มีรหัสผ่านในฐานข้อมูล กรุณาติดต่อผู้ดูแลระบบ" };
          }
          if (pass !== storedPwd) {
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
      return { success: false, error: "เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
    }

    return { success: false, error: "ไม่สามารถตรวจสอบบัญชีได้ กรุณาลองใหม่อีกครั้ง" };
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
          const isPhoneDup = String(sbDuplicate.phone || "").replace(/[-\s]/g, "").trim() === cleanPhone;
          return {
            success: false,
            error: isPhoneDup
              ? "เบอร์โทรศัพท์นี้ถูกใช้งานในระบบแล้ว กรุณาเข้าสู่ระบบด้วยเบอร์นี้ หรือใช้เบอร์โทรศัพท์อื่น"
              : "อีเมลนี้ถูกใช้งานในระบบแล้ว กรุณาเข้าสู่ระบบหรือใช้อีเมลอื่น",
          };
        }
      }

      // Check local storage duplicate as fallback
      const duplicate = registeredList.find(
        (u) =>
          u.user.phone?.replace(/[-\s]/g, "") === cleanPhone ||
          (cleanEmail && u.user.email.toLowerCase() === cleanEmail)
      );

      if (duplicate) {
        return {
          success: false,
          error: "เบอร์โทรศัพท์หรืออีเมลนี้ถูกใช้งานแล้ว กรุณาเข้าสู่ระบบ",
        };
      }

      const assignedBranches: string[] = ["all", `pwd:${payload.password}`];
      const newUserId = `usr-${Date.now()}`;
      const newUser: AuthUser = {
        id: newUserId,
        name: payload.fullName.trim(),
        email: cleanEmail || `${cleanPhone}@pakdee.com`,
        phone: cleanPhone,
        role: "owner",
        roleTitle: "เจ้าของหอพัก (Owner / Super Admin)",
        avatarText: getAvatarInitials(payload.fullName),
        assignedBranches,
        permissions: {
          canDeleteBranch: true,
          canEditBankSettings: true,
          canViewExecutivePL: true,
          canResetSystem: true,
          canManageManagers: true,
        },
      };

      // 1. Direct Persist to Supabase `user_profiles` table (Pure Cloud Source of Truth)
      try {
        const { error: sbInsertErr } = await supabase.from("user_profiles").insert({
          id: toUuid(newUserId),
          full_name: payload.fullName.trim(),
          phone: cleanPhone,
          email: cleanEmail || `${cleanPhone}@pakdee.com`,
          role: "owner",
          is_active: true,
          assigned_branch_ids: assignedBranches,
        });

        if (sbInsertErr) {
          console.error("Supabase user_profiles insert error:", sbInsertErr);
          // Fallback to local storage if network or permissions fail
        }
      } catch (sbEx) {
        console.error("Supabase user_profiles exception:", sbEx);
      }

      // 2. Backup in local storage
      registeredList.push({
        user: newUser,
        password: payload.password,
        dormitoryName: payload.dormitoryName?.trim(),
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(registeredList));

      // Auto login
      setSessionExpired(false);
      lastActivityRef.current = Date.now();
      try {
        localStorage.setItem("pakdee_user_password", payload.password);
      } catch {}
      saveUserSession(newUser);

      return { success: true, user: newUser };
    } catch (e) {
      console.error("Registration error:", e);
      return { success: false, error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง" };
    }
  };

  const verifyPassword = (pass: string): boolean => {
    try {
      const stored = localStorage.getItem("pakdee_user_password");
      if (stored && stored === pass) return true;
      if (currentUser?.email === PRESET_USERS.owner.email && pass === "pakdee2026") return true;
      if (currentUser?.email === PRESET_USERS.manager.email && pass === "manager2026") return true;
    } catch {}
    return false;
  };

  const logout = () => {
    saveUserSession(null);
    setSessionExpired(false);
    lastActivityRef.current = 0;
    try {
      localStorage.removeItem("pakdee_user_password");
    } catch {}
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
        verifyPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
