import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(amount)
    .replace("THB", "฿");
}

export function formatDateThai(dateStr?: string | Date | null): string {
  if (!dateStr) return "-";
  try {
    const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return String(dateStr);
    return new Intl.DateTimeFormat("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(d);
  } catch {
    return String(dateStr);
  }
}

export function formatMonthThai(yearMonth?: string | null): string {
  if (!yearMonth || yearMonth === "all") return "ทุกรอบเดือน";
  try {
    const [year, month] = yearMonth.split("-");
    const monthNames = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    const mIdx = parseInt(month, 10) - 1;
    const thaiYear = parseInt(year, 10) + 543;
    return `${monthNames[mIdx] || month} ${thaiYear}`;
  } catch {
    return String(yearMonth);
  }
}

/** Normalize YYYY-MM strings (converting Buddhist Era year > 2400 to Gregorian AD). */
export function normalizeYearMonth(raw?: string | null): string {
  const m = String(raw || "").trim().match(/^(\d{4})-(\d{2})/);
  if (!m) return "";
  let y = parseInt(m[1], 10);
  if (y > 2400) y -= 543;
  return `${y}-${m[2]}`;
}

/** Build a complete 12-month list (01..12) for the current year, preserving any extra historical months. */
export function buildYearMonthsList(existingMonths: (string | undefined | null)[] = [], baseYear = new Date().getFullYear()): string[] {
  const set = new Set<string>();
  for (let m = 1; m <= 12; m++) {
    set.add(`${baseYear}-${String(m).padStart(2, "0")}`);
  }
  for (const raw of existingMonths) {
    const norm = normalizeYearMonth(raw);
    if (norm) set.add(norm);
  }
  return Array.from(set).sort();
}

/** Format ISO or legacy Thai meter timestamps reliably into readable Thai date/time without 2569+543 double-offset. */
export function formatMeterTimestampThai(val?: string | null): string {
  if (!val) return "-";
  const raw = String(val).trim();
  // Match ISO timestamps like 2569-11-11T09:28:09+00:00 or 2026-11-11T09:28:09Z
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/);
  if (isoMatch) {
    let year = parseInt(isoMatch[1], 10);
    const wasBuddhist = year > 2400;
    if (wasBuddhist) year -= 543;
    const fixedIso = isoMatch[4]
      ? `${year}-${isoMatch[2]}-${isoMatch[3]}T${isoMatch[4]}:${isoMatch[5]}:${isoMatch[6] || "00"}${isoMatch[7] || "Z"}`
      : `${year}-${isoMatch[2]}-${isoMatch[3]}T00:00:00Z`;
    const d = new Date(fixedIso);
    if (!isNaN(d.getTime())) {
      return (
        new Intl.DateTimeFormat("th-TH", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(d) + " น."
      );
    }
  }
  return raw;
}
