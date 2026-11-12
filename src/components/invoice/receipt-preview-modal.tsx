"use client";

/**
 * ใบเสร็จรับเงิน (Official Receipt) — ยืนยันการชำระของบิลที่ชำระแล้ว
 * ต่างจากใบแจ้งหนี้: ไม่มี QR / กำหนดชำระ มีวันที่รับชำระ วิธีชำระ จำนวนเงินตัวอักษร และผู้รับเงิน
 */
import React from "react";
import { Invoice } from "@/types/dormitory";
import { formatDateThai } from "@/lib/utils";
import { numberToThaiBahtText } from "@/components/contracts/contract-print-view";
import { CheckCircle2, Printer, X } from "lucide-react";

interface ReceiptPreviewModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  propertyName?: string;
  propertyAddress?: string;
  propertyPhone?: string;
  taxId?: string;
  receiverName?: string;
  receiverSignatureUrl?: string;
}

/** Receipt number shown in the receipts list: REC-<invoice number without INV->. */
export function receiptNumberOf(invoice: Invoice): string {
  return `REC-${invoice.invoiceNumber.replace("INV-", "")}`;
}

function amountInThaiWords(amount: number): string {
  const baht = Math.floor(amount);
  const satang = Math.round((amount - baht) * 100);
  if (satang === 0) return numberToThaiBahtText(baht);
  const bahtPart = baht > 0 ? numberToThaiBahtText(baht).replace("ถ้วน", "") : "";
  return `${bahtPart}${numberToThaiBahtText(satang).replace("บาทถ้วน", "")}สตางค์`;
}

const METHOD_LABEL: Record<string, string> = {
  transfer: "โอนเงิน",
  promptpay: "พร้อมเพย์ (PromptPay)",
  cash: "เงินสด",
  credit_card: "บัตรเครดิต",
};

/** Which payment box to tick: cash, transfer/PromptPay, or unknown (nothing ticked). */
function paymentKind(invoice: Invoice): "cash" | "transfer" | "other" | "" {
  // วิธีชำระที่บันทึกไว้ตอนยืนยันรับชำระ (ปุ่มยืนยัน / สลิป LINE / เช็คเอาท์รายวัน)
  if (invoice.paymentMethod) {
    if (invoice.paymentMethod === "cash") return "cash";
    if (invoice.paymentMethod === "transfer" || invoice.paymentMethod === "promptpay") return "transfer";
    return "other";
  }
  if (String(invoice.paidAt || "").includes("เงินประกัน")) return "other";
  const completed = (invoice.payments || []).filter((p) => p.status === "completed");
  const last = completed[completed.length - 1];
  if (last) {
    if (last.paymentMethod === "cash") return "cash";
    if (last.paymentMethod === "transfer" || last.paymentMethod === "promptpay") return "transfer";
    return "other";
  }
  // Manual confirmations also set slipVerifiedAt, so only a real slip counts as a transfer.
  if (invoice.slipUrl || invoice.slipTransRef || invoice.slipVerifiedBy === "ai") return "transfer";
  return "";
}

function otherMethodLabel(invoice: Invoice): string {
  if (invoice.paymentMethod) return METHOD_LABEL[invoice.paymentMethod] || invoice.paymentMethod;
  if (String(invoice.paidAt || "").includes("เงินประกัน")) return "หักจากเงินประกัน";
  const completed = (invoice.payments || []).filter((p) => p.status === "completed");
  const last = completed[completed.length - 1];
  return last ? METHOD_LABEL[last.paymentMethod] || last.paymentMethod : "";
}

const Box = ({ checked }: { checked: boolean }) => (
  <span className="inline-flex w-3.5 h-3.5 border border-slate-700 items-center justify-center text-[10px] leading-none font-bold align-middle mr-1.5">
    {checked ? "✓" : ""}
  </span>
);

function paidAtText(paidAt?: string): string {
  if (!paidAt) return "-";
  const d = new Date(paidAt);
  if (Number.isNaN(d.getTime())) return paidAt;
  const time = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
  return `${formatDateThai(d)} (${time} น.)`;
}

export function ReceiptPreviewModal({
  invoice,
  isOpen,
  onClose,
  propertyName,
  propertyAddress,
  propertyPhone,
  taxId,
}: ReceiptPreviewModalProps) {
  if (!isOpen || !invoice) return null;

  const paidAmount = invoice.paidAmount && invoice.paidAmount > 0 ? invoice.paidAmount : invoice.totalAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white text-slate-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Action Bar */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-3 items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">ใบเสร็จรับเงิน</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> ชำระแล้ว
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="p-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold px-2.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์ A4</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Sheet */}
        <div className="p-5 sm:p-8 md:p-10 overflow-y-auto leading-relaxed bg-slate-100/60">
          <div className="bg-white border border-slate-800 p-6 sm:p-8 space-y-5 text-slate-900 text-xs">
            {/* Issuer + document title */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-bold tracking-tight">{propertyName || "ยังไม่ได้ตั้งชื่อหอพัก"}</h2>
                <p className="text-slate-600 mt-0.5">{propertyAddress || "-"}</p>
                <p className="text-slate-600">โทรศัพท์ {propertyPhone || "-"}</p>
                {taxId ? <p className="text-slate-600">เลขประจำตัวผู้เสียภาษีอากร {taxId}</p> : null}
              </div>
              <div className="sm:text-right shrink-0">
                <div className="inline-block border border-slate-800 px-2 py-0.5 text-[10px] font-semibold tracking-wider">
                  ต้นฉบับ / ORIGINAL
                </div>
              </div>
            </div>

            <div className="text-center border-y-2 border-slate-800 py-2">
              <h3 className="text-xl font-bold tracking-wide">ใบเสร็จรับเงิน</h3>
              <p className="text-[10px] font-semibold tracking-[0.3em] text-slate-600">RECEIPT</p>
            </div>

            {/* Customer + document info */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] border border-slate-800">
              <div className="p-3 space-y-1 sm:border-r border-b sm:border-b-0 border-slate-800">
                <div>
                  <span className="text-slate-600">ได้รับเงินจาก</span>{" "}
                  <strong className="text-sm">{invoice.tenantName}</strong>
                </div>
                <div>
                  <span className="text-slate-600">ห้องพัก</span> <strong>{invoice.roomNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-600">โทรศัพท์</span> {invoice.tenantPhone || "-"}
                </div>
              </div>
              <table className="text-xs tabular-nums">
                <tbody>
                  <tr className="border-b border-slate-300">
                    <td className="px-3 py-1.5 text-slate-600 whitespace-nowrap">เลขที่</td>
                    <td className="px-3 py-1.5 font-semibold whitespace-nowrap">{receiptNumberOf(invoice)}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="px-3 py-1.5 text-slate-600 whitespace-nowrap">วันที่</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{paidAtText(invoice.paidAt)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5 text-slate-600 whitespace-nowrap">อ้างอิงใบแจ้งหนี้</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{invoice.invoiceNumber}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Items */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-xs tabular-nums border border-slate-800 border-collapse">
                <thead>
                  <tr className="bg-slate-100 font-semibold">
                    <th scope="col" className="border border-slate-800 py-2 px-2 text-center w-12">ลำดับ</th>
                    <th scope="col" className="border border-slate-800 py-2 px-2 text-center">รายการ</th>
                    <th scope="col" className="border border-slate-800 py-2 px-2 text-center w-16">จำนวน</th>
                    <th scope="col" className="border border-slate-800 py-2 px-2 text-center w-20">หน่วยละ</th>
                    <th scope="col" className="border border-slate-800 py-2 px-2 text-center w-28">จำนวนเงิน (บาท)</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} className="align-top">
                      <td className="border-x border-slate-800 py-2 px-2 text-center">{idx + 1}</td>
                      <td className="border-x border-slate-800 py-2 px-2">{item.name}</td>
                      <td className="border-x border-slate-800 py-2 px-2 text-center">{item.units !== undefined ? item.units : "-"}</td>
                      <td className="border-x border-slate-800 py-2 px-2 text-right">
                        {item.rate !== undefined && item.rate > 0 ? item.rate.toFixed(2) : "-"}
                      </td>
                      <td className="border-x border-slate-800 py-2 px-2 text-right">
                        {item.amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td colSpan={3} className="border border-slate-800 py-2 px-2 text-center bg-slate-50">
                      ({amountInThaiWords(paidAmount)})
                    </td>
                    <td className="border border-slate-800 py-2 px-2 text-right whitespace-nowrap">รวมเงินทั้งสิ้น</td>
                    <td className="border border-slate-800 py-2 px-2 text-right text-sm whitespace-nowrap">
                      {paidAmount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Payment method */}
            <div className="border border-slate-800 p-3 space-y-1.5">
              <div className="font-semibold">ชำระโดย</div>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <span><Box checked={paymentKind(invoice) === "cash"} />เงินสด</span>
                <span><Box checked={paymentKind(invoice) === "transfer"} />โอนเงิน / พร้อมเพย์</span>
                <span>
                  <Box checked={paymentKind(invoice) === "other"} />
                  อื่น ๆ {paymentKind(invoice) === "other" ? otherMethodLabel(invoice) : "................"}
                </span>
              </div>
              <div className="text-slate-600">
                ธนาคาร {invoice.slipBank || "........................"} &nbsp; เลขที่อ้างอิง{" "}
                {invoice.slipTransRef || "........................"} &nbsp; วันที่ {invoice.paidAt ? formatDateThai(invoice.paidAt) : "................"}
              </div>
            </div>

            <div className="text-[10px] text-slate-500 border-t border-slate-300 pt-2">
              หมายเหตุ: ใบเสร็จรับเงินนี้ออกโดยระบบหลังยืนยันการรับชำระเงินแล้ว
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
