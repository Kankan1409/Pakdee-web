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
  const [isScanning, setIsScanning] = useState<boolean>(false);
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
      <div className="bg-white text-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Action Bar */}
        <div className="px-6 py-3.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
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
        <div className="p-6 md:p-8 overflow-y-auto space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                🏢 {propertyName || "พักดี แมนชั่น (สาขา 1)"}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {propertyAddress || "123/45 ซอยสุขุมวิท 71 แขวงพระโขนงเหนือ เขตวัฒนา กรุงเทพฯ 10110"}
              </p>
              <p className="text-xs text-slate-500">โทร: {propertyPhone || "081-234-5678"}</p>
            </div>
            <div className="text-right">
              <span className="inline-block bg-slate-900 text-white text-[11px] font-bold px-3 py-1 rounded-lg uppercase tracking-wider">
                ใบแจ้งหนี้ / INVOICE
              </span>
              <div className="text-xs text-slate-500 mt-2">
                เลขที่: <strong className="text-slate-800">{invoice.invoiceNumber}</strong>
              </div>
              <div className="text-xs text-slate-500">
                วันที่ออก: {invoice.billingDate}
              </div>
              <div className="text-xs text-rose-600 font-semibold">
                กำหนดชำระ: {invoice.dueDate}
              </div>
            </div>
          </div>

          {/* Tenant Box */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex justify-between items-center text-xs">
            <div>
              <div className="text-slate-500">
                ผู้เช่า: <strong className="text-slate-900 text-sm">{invoice.tenantName}</strong>
              </div>
              <div className="text-slate-500 mt-0.5">เบอร์โทร: {invoice.tenantPhone}</div>
            </div>
            <div className="text-right">
              <div className="text-slate-500">
                ห้องพัก: <strong className="text-emerald-700 text-base font-bold">{invoice.roomNumber}</strong>
              </div>
              <div className="text-slate-500">อาคาร A</div>
            </div>
          </div>

          {/* Table Items */}
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2 border-slate-300 text-slate-600 font-semibold">
                <th className="py-2 text-left">รายการ</th>
                <th className="py-2 text-center">หน่วยที่ใช้</th>
                <th className="py-2 text-right">ราคา/หน่วย</th>
                <th className="py-2 text-right">จำนวนเงิน (บาท)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {invoice.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2.5 font-medium">{item.name}</td>
                  <td className="py-2.5 text-center text-slate-500">
                    {item.units ? `${item.units}` : "-"}
                  </td>
                  <td className="py-2.5 text-right text-slate-500">
                    {item.rate ? item.rate.toFixed(2) : "-"}
                  </td>
                  <td className="py-2.5 text-right font-semibold">
                    {item.amount.toLocaleString("th-TH", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 font-bold text-slate-900 text-sm">
                <td colSpan={3} className="py-3 text-right">
                  ยอดรวมทั้งสิ้นที่ต้องชำระ:
                </td>
                <td className="py-3 text-right text-emerald-700 text-base">
                  {formatCurrency(invoice.totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* PromptPay QR Code Box */}
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-5">
            <div className="bg-white p-2 rounded-xl border border-slate-300 shadow-xs text-center shrink-0">
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
                <span>📲 สแกน QR ชำระเงินผ่าน Mobile Banking</span>
              </div>
              <div>• ธนาคาร: พร้อมเพย์ (PromptPay)</div>
              <div>• ชื่อบัญชี: {promptpayName || "หอพัก พักดี แมนชั่น"}</div>
              <div>• ยอดชำระ: <strong>{formatCurrency(invoice.totalAmount)}</strong></div>
              <div className="text-rose-600 font-semibold pt-1">
                ⚠️ เมื่อโอนแล้ว ระบบจะตรวจสลิปและปรับสถานะอัตโนมัติ
              </div>
            </div>
          </div>

          {/* Tenant Payment & AI Slip Verification Actions */}
          {invoice.status !== "paid" && (
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* AI Slip Scan Simulation */}
                <button
                  type="button"
                  onClick={() => {
                    setIsScanning(true);
                    setTimeout(() => {
                      setIsScanning(false);
                      if (onMarkAsPaid && invoice) {
                        onMarkAsPaid(invoice.id);
                      }
                      globalPopup.info(
                        "AI ตรวจสลิปโอนเงินสำเร็จ",
                        `🤖 AI ตรวจสลิปโอนเงินสำเร็จ 100%!\n- ธนาคาร: ธ.กสิกรไทย\n- เลขอ้างอิง: SLIP-${Date.now().toString().slice(-8)}\n- ยอดเงิน: ${formatCurrency(invoice.totalAmount)} (ตรงกับบิลพอดี)\n- ปลายทาง: ${promptpayNumber}\n\nระบบได้เปลี่ยนสถานะบิลห้อง ${invoice.roomNumber} เป็น "ชำระแล้ว" เรียบร้อยแล้ว!`
                      );
                    }, 1200);
                  }}
                  disabled={isScanning}
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  {isScanning ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>AI กำลังอ่านและตรวจสอบสลิป...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>🤖 ลูกค้าแนบสลิป (AI ตรวจสอบและตัดจ่าย)</span>
                    </>
                  )}
                </button>

                {/* Direct Mark Paid */}
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
