"use client";

import React, { useState, useEffect } from "react";
import { Invoice } from "@/types/dormitory";
import { formatCurrency } from "@/lib/utils";
import { generatePromptPayQRCode } from "@/lib/promptpay";
import { globalPopup } from "@/lib/popup-context";
import { X, Printer, Share2, CheckCircle2, Sparkles } from "lucide-react";

interface InvoicePreviewModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  promptpayNumber: string;
  propertyName?: string;
  propertyAddress?: string;
  propertyPhone?: string;
  promptpayName?: string;
  onMarkAsPaid?: (invoiceId: string) => void;
  onInvoiceSent?: (invoiceId: string) => void;
}

export function InvoicePreviewModal({
  invoice,
  isOpen,
  onClose,
  promptpayNumber,
  propertyName,
  propertyAddress,
  propertyPhone,
  promptpayName,
  onMarkAsPaid,
  onInvoiceSent,
}: InvoicePreviewModalProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [isSendingLine, setIsSendingLine] = useState<boolean>(false);

  useEffect(() => {
    if (invoice && isOpen) {
      generatePromptPayQRCode(promptpayNumber, invoice.totalAmount).then(
        (url) => {
          setQrCodeDataUrl(url);
        }
      );
    }
  }, [invoice, isOpen, promptpayNumber]);

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShareLine = async () => {
    setIsSendingLine(true);
    try {
      const res = await fetch("/api/line/send-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });
      const data = await res.json();
      if (data.success) {
        globalPopup.info(
          "ส่งบิลเข้า LINE สำเร็จ",
          data.hasLinkedLine
            ? `ส่งบิลแจ้งหนี้ห้อง ${invoice.roomNumber} พร้อม PromptPay QR ไปยัง LINE ของคุณ${invoice.tenantName} เรียบร้อยแล้ว!`
            : `ระบบบันทึกคำสั่งส่งบิลห้อง ${invoice.roomNumber} เรียบร้อยแล้ว (บิลจะส่งทันทีเมื่อผู้เช่าผูกบัญชี LINE)`
        );
        onInvoiceSent?.(invoice.id);
      } else {
        globalPopup.error("ส่งบิลไม่สำเร็จ", data.error || "เกิดข้อผิดพลาดในการส่งข้อความ LINE");
      }
    } catch (e: any) {
      globalPopup.error("เกิดข้อผิดพลาด", e.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setIsSendingLine(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white text-slate-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Action Bar */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              ตัวอย่างเอกสารใบแจ้งหนี้
            </span>
            {invoice.status === "paid" ? (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> ชำระแล้ว
              </span>
            ) : (
              <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
                รอชำระเงิน
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold px-2.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์ A4</span>
            </button>
            <button
              onClick={handleShareLine}
              disabled={isSendingLine}
              className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold px-2.5 disabled:opacity-50"
            >
              <Share2 className={`w-3.5 h-3.5 ${isSendingLine ? "animate-spin" : ""}`} />
              <span>{isSendingLine ? "กำลังส่ง..." : "ส่งเข้า LINE"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="p-5 sm:p-8 md:p-10 overflow-y-auto space-y-6 leading-relaxed">
          {/* Header */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 border-t-4 border-t-slate-800 border-b border-b-slate-200 pt-5 pb-6">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {propertyName || "ยังไม่ได้ตั้งชื่อหอพัก"}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {propertyAddress || "-"}
              </p>
              <p className="text-xs text-slate-500">โทร: {propertyPhone || "-"}</p>
            </div>
            <div className="sm:text-right tabular-nums">
              <h3 className="text-xl font-semibold text-slate-900">ใบแจ้งหนี้</h3>
              <p className="text-[10px] font-medium tracking-[0.22em] text-slate-500">INVOICE</p>
              <div className="text-xs text-slate-500 mt-2">
                เลขที่: <strong className="text-slate-800">{invoice.invoiceNumber}</strong>
              </div>
              <div className="text-xs text-slate-500">
                วันที่ออก: {invoice.billingDate}
              </div>
              <div className="text-xs text-slate-800 font-semibold mt-1">
                กำหนดชำระ: {invoice.dueDate}
              </div>
            </div>
          </div>

          {/* Tenant Box */}
          <div className="bg-slate-50/70 rounded-md p-4 border border-slate-200 flex flex-wrap gap-4 justify-between items-center text-xs">
            <div>
              <div className="text-slate-500">
                เรียน / ผู้เช่า: <strong className="text-slate-900 text-sm">{invoice.tenantName}</strong>
              </div>
              <div className="text-slate-500 mt-0.5">เบอร์โทร: {invoice.tenantPhone}</div>
            </div>
            <div className="text-right">
              <div className="text-slate-500">
                ห้องพัก: <strong className="text-slate-900 text-base font-bold">{invoice.roomNumber}</strong>
              </div>
              <div className="text-slate-500">อาคาร A</div>
            </div>
          </div>

          {/* Table Items */}
          <div className="overflow-x-auto">
          <table className="w-full min-w-[390px] text-xs tabular-nums">
            <thead>
              <tr className="border-y border-slate-300 bg-slate-50 text-slate-700 font-semibold">
                <th scope="col" className="py-3 pl-3 text-left">รายการ</th>
                <th scope="col" className="py-3 px-2 text-center whitespace-nowrap">หน่วยที่ใช้</th>
                <th scope="col" className="py-3 px-2 text-right whitespace-nowrap">ราคา/หน่วย</th>
                <th scope="col" className="py-3 pr-3 text-right whitespace-nowrap">จำนวนเงิน (บาท)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {invoice.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-3 pl-3 pr-2 font-medium">{item.name}</td>
                  <td className="py-2.5 text-center text-slate-500">
                    {item.units !== undefined ? `${item.units}` : "-"}
                  </td>
                  <td className="py-2.5 text-right text-slate-500">
                    {item.rate !== undefined && item.rate > 0 ? item.rate.toFixed(2) : "-"}
                  </td>
                  <td className="py-3 pr-3 text-right font-semibold whitespace-nowrap">
                    {item.amount.toLocaleString("th-TH", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-y-2 border-slate-700 bg-slate-50 font-bold text-slate-900 text-sm">
                <td colSpan={3} className="py-4 px-3 text-right">
                  ยอดรวมทั้งสิ้น
                </td>
                <td className="py-4 pr-3 text-right text-slate-900 text-lg whitespace-nowrap">
                  {formatCurrency(invoice.totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
          </div>

          {/* PromptPay QR Code Box */}
          <div className="bg-white border border-slate-200 rounded-md p-5 flex flex-col sm:flex-row items-center gap-5">
            <div className="bg-white p-2 rounded-md border border-slate-200 text-center shrink-0">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="PromptPay QR Code"
                  className="w-32 h-32 rounded-lg"
                />
              ) : (
                <div className="w-32 h-32 bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                  กำลังสร้าง QR...
                </div>
              )}
              <div className="text-[10px] text-slate-700 font-bold mt-1">
                พร้อมเพย์: {promptpayNumber}
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <span>ช่องทางการชำระเงิน</span>
              </div>
              <div>สแกน QR ผ่านแอปพลิเคชันธนาคาร</div>
              <div>ระบบพร้อมเพย์ (PromptPay)</div>
              <div>ชื่อบัญชี: {promptpayName || "-"}</div>
              <div>ยอดชำระ: <strong className="tabular-nums">{formatCurrency(invoice.totalAmount)}</strong></div>
              <div className="text-slate-500 text-[11px] border-t border-slate-100 mt-2 pt-2">
                เมื่อโอนแล้ว ระบบจะตรวจสลิปและปรับสถานะอัตโนมัติ
              </div>
            </div>
          </div>

          {/* Tenant Payment & AI Slip Verification Actions */}
          {invoice.status !== "paid" && invoice.status !== "carried_forward" && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>การรับชำระเงินและตรวจสลิป (Payment & Slip Verification)</span>
                </span>
                <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                  รอชำระ {formatCurrency(invoice.totalAmount)}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5 pt-1">
                {/* Direct Mark Paid (ระบบจะถามวิธีชำระก่อนบันทึก) */}
                {onMarkAsPaid && (
                  <button
                    type="button"
                    onClick={() => {
                      onMarkAsPaid(invoice.id);
                    }}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>✓ ยืนยันว่าผู้เช่าชำระเงินแล้ว</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
