"use client";

import React from "react";
import { Invoice } from "@/types/dormitory";
import { Printer, Receipt } from "lucide-react";
import { formatCurrency, formatDateThai } from "@/lib/utils";

interface ReceiptsListViewProps {
  invoices: Invoice[];
  onOpenReceipt: (invoice: Invoice) => void;
}

export function ReceiptsListView({ invoices, onOpenReceipt }: ReceiptsListViewProps) {
  const paidInvoices = invoices.filter((i) => i.status === "paid");

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
            <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>ระบบออกใบเสร็จรับเงิน (Official Receipts)</span>
          </h3>
          <p className="text-xs text-[var(--muted)]">
            รายการบิลที่ชำระแล้ว พร้อมพิมพ์ใบเสร็จหรือส่ง PDF ทาง LINE
          </p>
        </div>
      </div>

      <div className="divide-y divide-[var(--border)] text-xs">
        {paidInvoices.length === 0 ? (
          <div className="py-8 text-center text-[var(--muted)]">
            ยังไม่มีรายการใบเสร็จรับเงินที่ชำระแล้วในขณะนี้
          </div>
        ) : (
          paidInvoices.map((inv) => (
            <div key={inv.id} className="py-3 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 px-2 rounded-xl transition">
              <div>
                <span className="font-bold text-sm text-[var(--foreground)]">
                  REC-{inv.invoiceNumber.replace("INV-", "")}
                </span>{" "}
                - ห้อง {inv.roomNumber} ({inv.tenantName})
                <div className="text-[11px] text-[var(--muted)]">
                  ชำระเมื่อ {inv.paidAt ? formatDateThai(inv.paidAt) : "26 ต.ค. 2026"} • ยอดเงิน{" "}
                  {formatCurrency(inv.totalAmount)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenReceipt(inv)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>พิมพ์ใบเสร็จ</span>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
