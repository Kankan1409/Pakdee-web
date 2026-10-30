"use client";

import React, { useState } from "react";
import { PakdeeLogo } from "@/components/ui/pakdee-logo";
import { useAuth } from "@/lib/auth-context";
import {
  Lock,
  Phone,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Building2,
  Sparkles,
  Sun,
  FileText,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";

export function LoginView() {
  const { login, sessionExpired } = useAuth();
  const [phone, setPhone] = useState("081-999-8888");
  const [password, setPassword] = useState("P12345");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!phone.trim()) {
      setErrorMessage("กรุณากรอกเบอร์โทรศัพท์สำหรับเข้าสู่ระบบ");
      return;
    }
    if (!password) {
      setErrorMessage("กรุณากรอกรหัสผ่าน");
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(phone, password);
      if (!result.success) {
        setErrorMessage(result.error || "เข้าสู่ระบบไม่สำเร็จ");
      } else {
        if (typeof window !== "undefined") {
          window.location.href = "/branches";
        }
      }
    } catch {
      setErrorMessage("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FFFDF9] text-slate-800 flex flex-col justify-between relative overflow-x-hidden select-none font-sans">
      {/* 
        1. Ambient Morning Sunlight Glows (ธีมขาวพระอาทิตย์ยามเช้า อบอุ่น สะอาด สบายตา)
      */}
      {/* Golden Sunrise Disc glow in top right */}
      <div className="absolute top-[-100px] right-[-80px] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-amber-300/30 via-orange-200/20 to-transparent blur-[90px] pointer-events-none" />
      {/* Fresh Morning Emerald glow in bottom left */}
      <div className="absolute bottom-[-100px] left-[-80px] w-[550px] h-[550px] rounded-full bg-gradient-to-tr from-emerald-200/30 via-teal-100/20 to-transparent blur-[110px] pointer-events-none" />
      {/* Subtle architectural sunlight grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:28px_28px] opacity-60 pointer-events-none" />

      {/* 2. Top Sunlight Header Bar */}
      <header className="w-full px-6 sm:px-10 py-4 flex items-center justify-between border-b border-amber-200/60 bg-white/80 backdrop-blur-md z-10 sticky top-0 shadow-xs">
        <PakdeeLogo size="sm" showText={true} variant="light" subtitle="ระบบบริหารจัดการหอพัก & อพาร์ตเมนต์" />
        
        <div className="flex items-center gap-3">
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-semibold shadow-2xs">
            <Sun className="w-3.5 h-3.5 text-amber-500 animate-spin" style={{ animationDuration: '24s' }} />
            <span>แสงแดดยามเช้า • ระบบพร้อมให้บริการ 100%</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[11px] font-bold border border-slate-200">
            v2.4 Pro
          </span>
        </div>
      </header>

      {/* 3. Main Center Bento Section */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 z-10 my-4">
        <div className="w-full max-w-xl">
          {/* Main Sunlight Bento Card */}
          <div className="bg-white/95 border border-amber-200/80 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-amber-950/5 backdrop-blur-xl relative ring-1 ring-slate-900/5">
            {/* Top Brand Header */}
            <div className="flex flex-col items-center text-center mb-7">
              {/* Emblem with Warm Sunrise Aura */}
              <div className="relative mb-3">
                <div className="absolute inset-0 rounded-2xl bg-amber-400/30 blur-lg" />
                <PakdeeLogo size="xl" variant="light" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>PAKDEE SMART DORMITORY PORTAL</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                เข้าสู่ระบบจัดการหอพัก
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md leading-relaxed">
                ศูนย์กลางควบคุมผังห้องพัก สัญญาเช่าดิจิทัล จดมิเตอร์น้ำไฟ และออกใบเสร็จรับเงินอัตโนมัติ
              </p>
            </div>

            {/* Session Expired Banner */}
            {sessionExpired && (
              <div className="mb-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 leading-snug font-medium">
                  เซสชันของคุณหมดอายุเนื่องจากไม่มีการใช้งานเกิน 5 นาที กรุณาเข้าสู่ระบบใหม่อีกครั้ง
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1 leading-snug font-medium">{errorMessage}</div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Phone Number Field */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  เบอร์โทรศัพท์ (Phone Number) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="เช่น 081-999-8888 หรือ 089-777-6666"
                    autoComplete="tel"
                    required
                    className="w-full bg-slate-50/70 border border-slate-200 hover:border-slate-300 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition font-medium tracking-wide"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800">
                    รหัสผ่าน (Password) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => alert("คำแนะนำ: บัญชีผู้ดูแลคือ เบอร์ 081-999-8888 (เจ้าของหอพัก) หรือ 089-777-6666 (ผู้จัดการ) รหัสผ่าน P12345")}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                  >
                    ลืมรหัสผ่าน?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full bg-slate-50/70 border border-slate-200 hover:border-slate-300 rounded-2xl pl-10 pr-11 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-700 transition p-1 cursor-pointer"
                    tabIndex={-1}
                    title={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 transition transform active:scale-[0.99] disabled:opacity-50 cursor-pointer text-sm"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</span>
                  </>
                ) : (
                  <>
                    <span>เข้าสู่ระบบบริหารจัดการ PAKDEE</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* 5. Sunlight Bento Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
            <div className="bg-white/80 border border-slate-200/80 rounded-2xl p-3 flex items-center gap-2.5 shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="text-left leading-tight">
                <div className="text-xs font-bold text-slate-800">จดมิเตอร์อัตโนมัติ</div>
                <div className="text-[10px] text-slate-500">คำนวณค่าน้ำ-ค่าไฟแม่นยำ</div>
              </div>
            </div>

            <div className="bg-white/80 border border-slate-200/80 rounded-2xl p-3 flex items-center gap-2.5 shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="text-left leading-tight">
                <div className="text-xs font-bold text-slate-800">บิลพร้อมเพย์ & สัญญา</div>
                <div className="text-[10px] text-slate-500">ส่งสลิปตรวจสลิปฉับไว</div>
              </div>
            </div>

            <div className="bg-white/80 border border-slate-200/80 rounded-2xl p-3 flex items-center gap-2.5 shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-left leading-tight">
                <div className="text-xs font-bold text-slate-800">แยกสิทธิ์ความปลอดภัย</div>
                <div className="text-[10px] text-slate-500">เจ้าของ vs ผู้จัดการ</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 6. Sunlight Footer */}
      <footer className="w-full py-4 px-6 text-center text-xs text-slate-500 border-t border-amber-200/50 bg-white/60 backdrop-blur-xs z-10 flex flex-col sm:flex-row items-center justify-between max-w-5xl mx-auto gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="font-medium text-slate-600">ระบบรักษาความปลอดภัยและการเข้ารหัสตามมาตรฐานระดับสากล</span>
        </div>
        <div className="text-slate-500">
          PAKDEE DORMITORY & APARTMENT MANAGEMENT PLATFORM © 2026. สงวนลิขสิทธิ์ทั้งหมด
        </div>
      </footer>
    </div>
  );
}
