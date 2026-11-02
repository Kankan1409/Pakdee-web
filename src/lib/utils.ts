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
