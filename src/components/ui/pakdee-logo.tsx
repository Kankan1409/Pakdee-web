"use client";

import React from "react";

interface PakdeeLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  subtitle?: string;
  className?: string;
  variant?: "light" | "dark" | "default";
}

export function PakdeeLogo({
  size = "md",
  showText = false,
  subtitle = "ระบบบริหารจัดการหอพัก & อพาร์ตเมนต์",
  className = "",
  variant = "default",
}: PakdeeLogoProps) {
  // Dimension scales
  const dimMap = {
    xs: { box: "w-7 h-7", fontTitle: "text-xs", fontSub: "text-[8px]" },
    sm: { box: "w-9 h-9", fontTitle: "text-sm", fontSub: "text-[9px]" },
    md: { box: "w-11 h-11", fontTitle: "text-base", fontSub: "text-[10px]" },
    lg: { box: "w-14 h-14", fontTitle: "text-lg", fontSub: "text-[11px]" },
    xl: { box: "w-20 h-20", fontTitle: "text-2xl", fontSub: "text-xs" },
  };

  const dim = dimMap[size] || dimMap.md;

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* 
        Dormitory Management Emblem:
        - Multi-story Modern Apartment Building with Room Windows
        - Rising Morning Sunlight (พระอาทิตย์ยามเช้า ส่องประกายความรุ่งเรือง)
        - Master Key & Door Archway (กุญแจบริหารและทางเข้าหอพัก)
      */}
      <div
        className={`${dim.box} relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white shadow-lg shadow-emerald-900/20 ring-1 ring-emerald-400/30 shrink-0 transition-transform hover:scale-105`}
        title="PAKDEE Apartment & Dormitory Management"
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[84%] h-[84%]"
        >
          <defs>
            {/* Morning Sun Gradient */}
            <linearGradient id="morningSunGrad" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#FDE047" />
              <stop offset="0.6" stopColor="#F59E0B" />
              <stop offset="1" stopColor="#D97706" />
            </linearGradient>
            {/* Emerald Building Gradient */}
            <linearGradient id="emeraldBuildGrad" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#34D399" />
              <stop offset="0.5" stopColor="#10B981" />
              <stop offset="1" stopColor="#047857" />
            </linearGradient>
            {/* Glass Windows Light */}
            <linearGradient id="windowLight" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="1" stopColor="#A7F3D0" stopOpacity="0.75" />
            </linearGradient>
          </defs>

          {/* 1. Morning Sun Rising behind the Dormitory */}
          <circle cx="72" cy="28" r="16" fill="url(#morningSunGrad)" opacity="0.9" />
          <path
            d="M 72 6 L 72 10 M 88 14 L 85 17 M 94 28 L 90 28 M 56 14 L 59 17"
            stroke="#FDE047"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.8"
          />

          {/* 2. Secondary Apartment Wing (Left Building) */}
          <rect
            x="12"
            y="38"
            width="22"
            height="50"
            rx="3"
            fill="#064E3B"
            stroke="#34D399"
            strokeWidth="1.5"
          />
          {/* Left Wing Windows */}
          <rect x="16" y="44" width="6" height="6" rx="1.5" fill="url(#windowLight)" />
          <rect x="24" y="44" width="6" height="6" rx="1.5" fill="url(#windowLight)" />
          <rect x="16" y="54" width="6" height="6" rx="1.5" fill="url(#windowLight)" />
          <rect x="24" y="54" width="6" height="6" rx="1.5" fill="url(#windowLight)" />
          <rect x="16" y="64" width="6" height="6" rx="1.5" fill="url(#windowLight)" />
          <rect x="24" y="64" width="6" height="6" rx="1.5" fill="url(#windowLight)" />

          {/* 3. Main Center Dormitory Tower (High-Rise Building) */}
          <rect
            x="30"
            y="18"
            width="40"
            height="70"
            rx="4"
            fill="url(#emeraldBuildGrad)"
            stroke="#6EE7B7"
            strokeWidth="1.8"
          />

          {/* Modern Rooftop Terrace / Sloped Architectural Peak */}
          <path
            d="M 28 18 L 50 8 L 72 18 Z"
            fill="#047857"
            stroke="#34D399"
            strokeWidth="1.5"
          />

          {/* Dormitory Room Windows (2x4 Grid of Units) */}
          <rect x="36" y="24" width="10" height="7" rx="1.5" fill="url(#windowLight)" />
          <rect x="54" y="24" width="10" height="7" rx="1.5" fill="url(#windowLight)" />

          <rect x="36" y="35" width="10" height="7" rx="1.5" fill="url(#windowLight)" />
          <rect x="54" y="35" width="10" height="7" rx="1.5" fill="url(#windowLight)" />

          <rect x="36" y="46" width="10" height="7" rx="1.5" fill="url(#windowLight)" />
          <rect x="54" y="46" width="10" height="7" rx="1.5" fill="url(#windowLight)" />

          <rect x="36" y="57" width="10" height="7" rx="1.5" fill="url(#windowLight)" />
          <rect x="54" y="57" width="10" height="7" rx="1.5" fill="url(#windowLight)" />

          {/* 4. Dormitory Entrance Archway & Master Key Symbol */}
          <path
            d="M 44 88 L 44 73 C 44 69.5 56 69.5 56 73 L 56 88 Z"
            fill="#0F172A"
          />
          {/* Smart Golden Master Keyhole inside entrance */}
          <circle cx="50" cy="76" r="2.5" fill="url(#morningSunGrad)" />
          <rect x="49" y="78" width="2" height="5" rx="1" fill="url(#morningSunGrad)" />

          {/* 5. Right Low-rise Service & Management Office */}
          <rect
            x="68"
            y="50"
            width="20"
            height="38"
            rx="3"
            fill="#065F46"
            stroke="#34D399"
            strokeWidth="1.5"
          />
          <rect x="73" y="56" width="10" height="6" rx="1.5" fill="url(#windowLight)" />
          <rect x="73" y="66" width="10" height="6" rx="1.5" fill="url(#windowLight)" />

          {/* Ground Baseline */}
          <line
            x1="8"
            y1="88"
            x2="92"
            y2="88"
            stroke="#6EE7B7"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Brand Label */}
      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-2">
            <span
              className={`font-black tracking-tight ${
                variant === "light"
                  ? "text-slate-900"
                  : "text-slate-900 dark:text-white"
              } ${dim.fontTitle}`}
            >
              PAKDEE
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
              DORMITORY
            </span>
          </div>
          {subtitle && (
            <span
              className={`font-medium tracking-normal text-slate-500 dark:text-slate-400 mt-1 ${dim.fontSub}`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
