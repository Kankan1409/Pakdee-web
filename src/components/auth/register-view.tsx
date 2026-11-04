"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { PakdeeLogo } from "@/components/ui/pakdee-logo";
import { useAuth, UserRole } from "@/lib/auth-context";
import { formatThaiPhone, isValidThaiPhone, isValidEmail } from "@/lib/validators";
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
  User,
  Mail,
  UserPlus,
  Crown,
  UserCheck,
  X,
  Check,
  ArrowLeft,
} from "lucide-react";

export function RegisterView() {
  const { register } = useAuth();

  // Form States
  const [role, setRole] = useState<UserRole>("owner");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dormitoryName, setDormitoryName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(true);

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  // Password Strength Calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: "ยังไม่ได้ระบุ", color: "bg-slate-200", textColor: "text-slate-400" };
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/i.test(password) && /\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password) || password.length >= 10) score += 1;

    if (score <= 1) {
      return { score: 1, label: "คาดเดาง่าย (ควรมีอย่างน้อย 6 ตัวอักษร)", color: "bg-rose-500", textColor: "text-rose-600" };
    }
    if (score === 2) {
      return { score: 2, label: "ปานกลาง (ปลอดภัยระดับพื้นฐาน)", color: "bg-amber-500", textColor: "text-amber-600" };
    }
    if (score === 3) {
      return { score: 3, label: "แข็งแรงดี (แนะนำ)", color: "bg-emerald-500", textColor: "text-emerald-600" };
    }
    return { score: 4, label: "ปลอดภัยสูงมาก", color: "bg-teal-600", textColor: "text-teal-700" };
  }, [password]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatThaiPhone(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMessage("กรุณากรอกชื่อ-นามสกุลผู้ใช้งานให้ครบถ้วน");
      return;
    }

    if (!phone.trim() || !isValidThaiPhone(phone)) {
      setErrorMessage("กรุณากรอกเบอร์โทรศัพท์มือถือให้ถูกต้อง (เช่น 081-999-8888)");
      return;
    }

    if (email.trim() && !isValidEmail(email.trim())) {
      setErrorMessage("รูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง (เช่น name@pakdee.com)");
      return;
    }

    if (role === "owner" && !dormitoryName.trim()) {
      setErrorMessage("กรุณาระบุชื่อหอพักหรืออพาร์ตเมนต์ของคุณ");
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage("กรุณากำหนดรหัสผ่านอย่างน้อย 6 ตัวอักษร");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    if (!acceptTerms) {
      setErrorMessage("กรุณากดยอมรับข้อกำหนดการใช้งานและนโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA)");
      return;
    }

    setIsLoading(true);
    try {
      const result = await register({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        dormitoryName: dormitoryName.trim() || undefined,
        role,
        password,
      });

      if (!result.success) {
        setErrorMessage(result.error || "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      } else {
        setIsSuccess(true);
        setTimeout(() => {
          if (typeof window !== "undefined") {
            window.location.href = "/branches";
          }
        }, 1200);
      }
    } catch {
      setErrorMessage("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ กรุณาลองใหม่อีกครั้ง");
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
        <Link href="/login" className="cursor-pointer">
          <PakdeeLogo size="sm" showText={true} variant="light" subtitle="ระบบบริหารจัดการหอพัก & อพาร์ตเมนต์" />
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-semibold shadow-2xs">
            <Sun className="w-3.5 h-3.5 text-amber-500 animate-spin" style={{ animationDuration: "24s" }} />
            <span>แสงแดดยามเช้า • ระบบพร้อมให้บริการ 100%</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[11px] font-bold border border-slate-200">
            v2.4 Pro
          </span>
        </div>
      </header>

      {/* 3. Main Center Bento Section */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 z-10 my-4">
        <div className="w-full max-w-2xl">
          {/* Main Sunlight Bento Card */}
          <div className="bg-white/95 border border-amber-200/80 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-amber-950/5 backdrop-blur-xl relative ring-1 ring-slate-900/5">
            {/* Top Brand Header */}
            <div className="flex flex-col items-center text-center mb-6">
              {/* Emblem with Warm Sunrise Aura */}
              <div className="relative mb-3">
                <div className="absolute inset-0 rounded-2xl bg-amber-400/30 blur-lg" />
                <PakdeeLogo size="xl" variant="light" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>PAKDEE SMART DORMITORY REGISTRATION</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                สมัครสมาชิกผู้ใช้งานระบบหอพัก
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md leading-relaxed">
                เริ่มต้นใช้งานระบบบริหารหอพักยุคใหม่ จัดการผังห้องพัก สัญญาเช่าดิจิทัล และบิลพร้อมเพย์ในที่เดียว
              </p>
            </div>

            {isSuccess ? (
              /* Success Feedback Screen */
              <div className="py-8 px-4 text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md shadow-emerald-600/10">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-xl font-black text-slate-900">
                    สร้างบัญชีผู้ใช้งานสำเร็จเรียบร้อย!
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                    ยินดีต้อนรับ <strong>{fullName}</strong> เข้าสู่ระบบบริหารจัดการหอพัก <strong>PAKDEE</strong> ระบบกำลังพาท่านไปยังหน้าเลือกสาขาหอพัก...
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-2 text-xs font-bold text-emerald-700">
                  <div className="w-4 h-4 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                  <span>กำลังเข้าสู่ระบบอัตโนมัติ...</span>
                </div>
              </div>
            ) : (
              <>
                {/* Error Message */}
                {errorMessage && (
                  <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div className="flex-1 leading-snug font-medium">{errorMessage}</div>
                  </div>
                )}

                {/* Registration Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Role Selection Bento Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-2">
                      เลือกประเภทบัญชีผู้ใช้งาน (Account Role) <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRole("owner")}
                        className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
                          role === "owner"
                            ? "bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
                            : "bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-white"
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            role === "owner"
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-slate-200/80 text-slate-600"
                          }`}
                        >
                          <Crown className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-black text-slate-900">
                              เจ้าของหอพัก (Owner)
                            </span>
                            {role === "owner" && (
                              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                                <Check className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                            สิทธิ์สูงสุด บริหารทุกสาขา ตั้งค่าบัญชีและดูงบกำไร-ขาดทุน
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRole("manager")}
                        className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
                          role === "manager"
                            ? "bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/20 shadow-xs"
                            : "bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-white"
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            role === "manager"
                              ? "bg-amber-500 text-white shadow-xs"
                              : "bg-slate-200/80 text-slate-600"
                          }`}
                        >
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-black text-slate-900">
                              ผู้จัดการหอพัก (Manager)
                            </span>
                            {role === "manager" && (
                              <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center">
                                <Check className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                            ดูแลผังห้องพัก จดมิเตอร์ ออกใบแจ้งหนี้ และรับแจ้งซ่อม
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Two-Column Personal Info: Full Name & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        ชื่อ-นามสกุล (Full Name) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="เช่น คุณพักดี มีสุข"
                          autoComplete="name"
                          required
                          className="w-full bg-slate-50/70 border border-slate-200 hover:border-slate-300 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition font-medium"
                        />
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        เบอร์โทรศัพท์ (ใช้เข้าสู่ระบบ) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={handlePhoneChange}
                          placeholder="เช่น 081-234-5678"
                          autoComplete="tel"
                          required
                          className="w-full bg-slate-50/70 border border-slate-200 hover:border-slate-300 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition font-medium tracking-wide"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Two-Column Dormitory Name & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Dormitory Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        ชื่อหอพัก / อพาร์ตเมนต์{" "}
                        {role === "owner" ? (
                          <span className="text-rose-500">*</span>
                        ) : (
                          <span className="text-slate-400 font-normal">(ถ้ามี)</span>
                        )}
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          value={dormitoryName}
                          onChange={(e) => setDormitoryName(e.target.value)}
                          placeholder="เช่น พักดี เรสซิเดนซ์"
                          required={role === "owner"}
                          className="w-full bg-slate-50/70 border border-slate-200 hover:border-slate-300 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition font-medium"
                        />
                      </div>
                    </div>

                    {/* Email Address */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        อีเมล (Email){" "}
                        <span className="text-slate-400 font-normal">(ไม่บังคับ)</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="เช่น owner@pakdee.com"
                          autoComplete="email"
                          className="w-full bg-slate-50/70 border border-slate-200 hover:border-slate-300 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Two-Column Password & Confirm Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Password */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        กำหนดรหัสผ่าน (Password) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="อย่างน้อย 6 ตัวอักษร"
                          autoComplete="new-password"
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

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        ยืนยันรหัสผ่าน (Confirm Password) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                          autoComplete="new-password"
                          required
                          className="w-full bg-slate-50/70 border border-slate-200 hover:border-slate-300 rounded-2xl pl-10 pr-11 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-700 transition p-1 cursor-pointer"
                          tabIndex={-1}
                          title={showConfirmPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Password Strength & Match Indicator */}
                  {password.length > 0 && (
                    <div className="p-3 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-600">ระดับความปลอดภัยของรหัสผ่าน:</span>
                        <span className={`font-bold ${passwordStrength.textColor}`}>
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              passwordStrength.score >= level ? passwordStrength.color : "bg-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                      {confirmPassword.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[11px] pt-0.5">
                          {password === confirmPassword ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700 font-semibold">รหัสผ่านทั้งสองช่องตรงกัน</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                              <span className="text-rose-600 font-semibold">รหัสผ่านยังไม่ตรงกัน</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Terms & PDPA Consent Checkbox */}
                  <div className="flex items-start gap-2.5 pt-1">
                    <input
                      id="pakdee-register-terms"
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                    />
                    <label htmlFor="pakdee-register-terms" className="text-xs text-slate-600 leading-relaxed cursor-pointer">
                      ฉันได้อ่านและยอมรับ{" "}
                      <button
                        type="button"
                        onClick={() => setIsTermsModalOpen(true)}
                        className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                      >
                        ข้อกำหนดการให้บริการและนโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA)
                      </button>{" "}
                      ของแพลตฟอร์ม PAKDEE Smart Dormitory
                    </label>
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
                        <span>กำลังสร้างบัญชีและเตรียมระบบหอพัก...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>สมัครสมาชิกและเริ่มใช้งาน PAKDEE</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Divider & Back to Login Link */}
                <div className="mt-6 pt-5 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <span className="text-slate-500 font-medium">
                    มีบัญชีผู้ใช้งานในระบบ PAKDEE อยู่แล้ว?
                  </span>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 text-amber-900 font-bold transition cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-amber-700" />
                    <span>กลับไปหน้าเข้าสู่ระบบ (Sign In)</span>
                  </Link>
                </div>
              </>
            )}
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

      {/* 7. Terms & PDPA Policy Modal */}
      {isTermsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-amber-200/80 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-base leading-tight">
                    ข้อกำหนดการใช้งาน & นโยบาย PDPA
                  </h3>
                  <p className="text-[11px] text-emerald-100 font-medium">
                    Pakdee Data Privacy & Security Standard
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs text-slate-600 max-h-[60vh] overflow-y-auto leading-relaxed">
              <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 font-medium">
                แพลตฟอร์ม <strong>PAKDEE (พักดี)</strong> ให้ความสำคัญสูงสุดต่อความปลอดภัยของข้อมูลผู้ประกอบการหอพักและข้อมูลส่วนบุคคลของผู้เช่าตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)
              </div>
              <p>
                <strong>1. การเก็บรวบรวมและใช้ข้อมูล:</strong> ระบบจะจัดเก็บเฉพาะข้อมูลที่จำเป็นต่อการบริหารจัดการหอพัก เช่น ชื่อ-นามสกุล เบอร์โทรศัพท์ สัญญาเช่าดิจิทัล และประวัติการชำระเงิน เพื่ออำนวยความสะดวกในการออกใบแจ้งหนี้และใบเสร็จรับเงินเท่านั้น
              </p>
              <p>
                <strong>2. การแบ่งแยกสิทธิ์การเข้าถึง (Role-Based Access Control):</strong> บัญชีเจ้าของหอพัก (Owner) และผู้จัดการสาขา (Manager) มีการแยกสิทธิ์การเข้าถึงข้อมูลทางการเงินและการตั้งค่าระบบอย่างชัดเจน
              </p>
              <p>
                <strong>3. มาตรฐานความปลอดภัย:</strong> ระบบมีกลไกตัดเซสชันอัตโนมัติเมื่อไม่มีการใช้งานเกิน 15 นาที และเข้ารหัสข้อมูลสำคัญเพื่อป้องกันการเข้าถึงโดยไม่ได้รับอนุญาต
              </p>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setAcceptTerms(true);
                  setIsTermsModalOpen(false);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>ยอมรับข้อกำหนดและปิดหน้าต่าง</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
