"use client";

import React, { useState } from "react";
import { Room, Invoice, Property, Tenant, ContractItem } from "@/types/dormitory";
import { formatCurrency, formatDateThai } from "@/lib/utils";
import {
  FileText,
  Printer,
  X,
  FileSignature,
  Receipt,
  Download,
  ShieldCheck,
  Building,
  User,
  Phone,
  Calendar,
  CreditCard,
  QrCode,
  CheckCircle2,
} from "lucide-react";

export type DocumentType = "contract" | "invoice" | "receipt";

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDocType?: DocumentType;
  room?: Room | null;
  invoice?: Invoice | null;
  property: Property;
  contract?: ContractItem | null;
}

export function DocumentViewerModal({
  isOpen,
  onClose,
  initialDocType = "contract",
  room,
  invoice,
  property,
  contract,
}: DocumentViewerModalProps) {
  const [docType, setDocType] = useState<DocumentType>(initialDocType);

  if (!isOpen) return null;

  const tenant = room?.currentTenant;
  const roomNumber = room?.roomNumber || invoice?.roomNumber || "-";
  const tenantName = tenant?.fullName || invoice?.tenantName || "ผู้เช่าห้องพัก";
  const tenantPhone = tenant?.phone || invoice?.tenantPhone || "-";
  const idCard = tenant?.idCard || "-";
  const monthlyRate = room?.monthlyRate || 4000;
  const deposit = monthlyRate * 2;
  const advance = monthlyRate;

  // Active Invoice Data
  const invNumber = invoice?.invoiceNumber || `INV-202610-${roomNumber}`;
  const recNumber = `REC-202610-${roomNumber}`;
  const totalAmount = invoice?.totalAmount || 5064;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 print:p-0 print:bg-white">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl w-full max-w-4xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden print:border-none print:shadow-none print:max-w-none print:max-h-none print:rounded-none">
        
        {/* Top Action Bar (Hidden during printing) */}
        <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--subtle)] flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          {/* Document Type Switcher */}
          <div className="flex items-center gap-1.5 bg-[var(--card)] p-1 rounded-2xl border border-[var(--border)] text-xs">
            <button
              onClick={() => setDocType("contract")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-medium transition cursor-pointer ${
                docType === "contract"
                  ? "bg-purple-600 text-white font-bold shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <FileSignature className="w-3.5 h-3.5" />
              <span>1. สัญญาเช่าห้องพัก</span>
            </button>

            <button
              onClick={() => setDocType("invoice")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-medium transition cursor-pointer ${
                docType === "invoice"
                  ? "bg-emerald-600 text-white font-bold shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>2. ใบแจ้งหนี้ & QR</span>
            </button>

            <button
              onClick={() => setDocType("receipt")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-medium transition cursor-pointer ${
                docType === "receipt"
                  ? "bg-teal-600 text-white font-bold shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>3. ใบเสร็จรับเงิน</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold shadow-md hover:opacity-90 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์เอกสาร A4 (PDF)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-[var(--card)] text-[var(--muted)] hover:text-[var(--foreground)] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Scroll Viewport */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-100 dark:bg-slate-950/50 flex justify-center print:p-0 print:bg-white">
          
          {/* Printable White A4 Sheet */}
          <div className="w-full max-w-[210mm] bg-white text-slate-900 p-8 sm:p-12 shadow-lg border border-slate-200 rounded-2xl print:border-none print:shadow-none print:p-0 print:rounded-none min-h-[297mm] flex flex-col justify-between text-xs leading-relaxed font-sans">
            
            {/* ==================== 1. LEASE CONTRACT ==================== */}
            {docType === "contract" && (
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center border-b pb-4 space-y-1">
                  <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                    สัญญาเช่าห้องพักอาศัย (Residential Lease Agreement)
                  </h1>
                  <p className="text-slate-600 font-semibold">{property.name}</p>
                  <p className="text-[11px] text-slate-500">{property.address} • โทร. {property.phone}</p>
                  <div className="text-[11px] text-purple-700 font-mono font-bold pt-1">
                    เลขที่สัญญา: CT-2026-{roomNumber}-01
                  </div>
                </div>

                {/* Parties */}
                <div className="space-y-3">
                  <p className="indent-8">
                    สัญญาฉบับนี้ทำขึ้นเมื่อวันที่ <strong>1 พฤศจิกายน 2569</strong> ณ {property.name} ระหว่าง <strong>{property.name}</strong> โดยผู้มีอำนาจลงนาม ซึ่งต่อไปในสัญญานี้เรียกว่า <strong>&quot;ผู้ให้เช่า&quot;</strong> ฝ่ายหนึ่ง กับ
                  </p>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-slate-800">
                    <div><strong>ชื่อ-นามสกุล ผู้เช่า:</strong> {tenantName}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><strong>เลขประจำตัวประชาชน:</strong> {idCard}</div>
                      <div><strong>เบอร์โทรศัพท์:</strong> {tenantPhone}</div>
                    </div>
                    {tenant?.taxId && <div><strong>เลขประจำตัวผู้เสียภาษี (เบิกบริษัท):</strong> {tenant.taxId}</div>}
                    <div><strong>ที่อยู่เดิม:</strong> {tenant?.address || property.address || "-"}</div>
                    {tenant?.emergencyContact && <div><strong>ผู้ติดต่อฉุกเฉิน:</strong> {tenant.emergencyContact}</div>}
                  </div>
                  <p className="indent-8">
                    ซึ่งต่อไปในสัญญานี้เรียกว่า <strong>&quot;ผู้เช่า&quot;</strong> อีกฝ่ายหนึ่ง ทั้งสองฝ่ายได้ตกลงทำสัญญาเช่าห้องพักอาศัย โดยมีข้อความดังต่อไปนี้:
                  </p>
                </div>

                {/* Terms */}
                <div className="space-y-3">
                  <div className="p-3.5 bg-purple-50/50 border border-purple-200 rounded-xl space-y-2">
                    <div className="grid grid-cols-2 gap-2 font-medium">
                      <div><strong>ห้องพักเลขที่:</strong> ห้อง {roomNumber} ({room?.type || "ห้องแอร์"})</div>
                      <div><strong>อัตราค่าเช่า:</strong> {formatCurrency(monthlyRate)} / เดือน</div>
                      <div><strong>เงินมัดจำประกันความเสียหาย:</strong> {formatCurrency(deposit)}</div>
                      <div><strong>ค่าเช่าล่วงหน้า 1 เดือน:</strong> {formatCurrency(advance)}</div>
                      <div><strong>ระยะเวลาการเช่า:</strong> 1 ปี (1 พ.ย. 2569 – 31 ต.ค. 2570)</div>
                      <div><strong>ค่าน้ำ / ค่าไฟ:</strong> ตามมิเตอร์ที่ใช้จริง ({property.waterRate} บ./น. / {property.electricRate} บ./น.)</div>
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 pt-2">ข้อตกลงและเงื่อนไขแห่งสัญญา (10 ข้อสำคัญ):</h3>
                  <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-700 leading-relaxed">
                    <li>ผู้เช่าตกลงชำระค่าเช่าห้องพักและค่าสาธารณูปโภคภายใน<strong>วันที่ 5 ของทุกเดือน</strong></li>
                    <li>หากชำระล่าช้าเกินกำหนด ผู้เช่ายินยอมเสียค่าปรับวันละ <strong>50 บาท</strong> จนกว่าจะชำระครบถ้วน</li>
                    <li>เงินมัดจำประกันความเสียหาย ({formatCurrency(deposit)}) จะได้รับคืนเมื่อครบกำหนดสัญญาและหักค่าเสียหาย/ค่าน้ำไฟคงค้างแล้ว</li>
                    <li>ผู้เช่าต้องแจ้งการย้ายออกล่วงหน้าเป็นลายลักษณ์อักษรไม่น้อยกว่า <strong>30 วัน</strong> ก่อนสิ้นสุดสัญญา</li>
                    <li>ห้ามนำสัตว์เลี้ยงทุกชนิดเข้ามาเลี้ยงภายในห้องพักหรือบริเวณหอพักโดยเด็ดขาด</li>
                    <li>ห้ามส่งเสียงดัง ก่อความเดือดร้อนรำคาญ หรือมั่วสุมเสพสิ่งเสพติดผิดกฎหมายหลังเวลา 22:00 น.</li>
                    <li>ห้ามทำการต่อเติม เจาะผนัง หรือดัดแปลงทรัพย์สินในห้องพักโดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร</li>
                    <li>ผู้เช่าต้องช่วยดูแลรักษาทรัพย์สินในห้องพัก หากชำรุดยินยอมชดใช้ตามราคาประเมินจริงของทางหอพัก</li>
                    <li>ห้ามโอนสิทธิ์การเช่า หรือให้ผู้อื่นเช่าช่วงต่อโดยเด็ดขาด</li>
                    <li>สัญญานี้ทำขึ้นเป็นสองฉบับมีข้อความถูกต้องตรงกัน คู่สัญญาทั้งสองฝ่ายได้อ่านเข้าใจดีแล้วจึงลงลายมือชื่อไว้เป็นหลักฐาน</li>
                  </ol>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-8 pt-8 border-t text-center text-[11px]">
                  <div className="space-y-1">
                    <div className="border-b border-dashed border-slate-400 pb-10 mb-2"></div>
                    <div>(ลงชื่อ).................................................... ผู้ให้เช่า</div>
                    <div className="text-slate-500 font-semibold">{property.name}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="border-b border-dashed border-slate-400 pb-10 mb-2"></div>
                    <div>(ลงชื่อ).................................................... ผู้เช่า</div>
                    <div className="text-slate-900 font-semibold">{tenantName}</div>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== 2. MONTHLY INVOICE ==================== */}
            {docType === "invoice" && (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start border-b pb-4">
                  <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">ใบแจ้งหนี้ (INVOICE)</h1>
                    <p className="font-bold text-sm text-slate-800">{property.name}</p>
                    <p className="text-[11px] text-slate-500 max-w-sm">{property.address}</p>
                    <p className="text-[11px] text-slate-500">โทร. {property.phone}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-sm font-bold font-mono text-emerald-600">{invNumber}</div>
                    <div className="text-[11px] text-slate-500">วันที่ออกบิล: 25 ต.ค. 2569</div>
                    <div className="text-[11px] font-bold text-rose-600">ครบกำหนดชำระ: 5 พ.ย. 2569</div>
                  </div>
                </div>

                {/* Tenant Box */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <div className="text-slate-500 text-[10px]">ผู้เช่า / ผู้พักอาศัย:</div>
                    <div className="font-bold text-sm text-slate-900">{tenantName}</div>
                    <div className="text-slate-600 text-[11px]">โทร. {tenantPhone}</div>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 rounded-lg bg-slate-900 text-white font-extrabold text-sm tracking-wider">
                      ห้อง {roomNumber}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1">{room?.type || "ห้องแอร์"} (ชั้น {room?.floor || 1})</div>
                  </div>
                </div>

                {/* Line Items Table */}
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b-2 border-slate-900 text-slate-900 font-bold uppercase text-[11px]">
                      <th className="py-2.5">ลำดับ</th>
                      <th className="py-2.5">รายการ</th>
                      <th className="py-2.5 text-center">จดเลขครั้งก่อน</th>
                      <th className="py-2.5 text-center">จดเลขล่าสุด</th>
                      <th className="py-2.5 text-right">จำนวนหน่วย</th>
                      <th className="py-2.5 text-right">ราคา/หน่วย</th>
                      <th className="py-2.5 text-right">จำนวนเงิน (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    <tr>
                      <td className="py-2 text-slate-500">1</td>
                      <td className="py-2 font-medium">ค่าเช่าห้องพักประจำเดือน (ห้องแอร์)</td>
                      <td className="py-2 text-center text-slate-400">-</td>
                      <td className="py-2 text-center text-slate-400">-</td>
                      <td className="py-2 text-right">1</td>
                      <td className="py-2 text-right">{formatCurrency(monthlyRate)}</td>
                      <td className="py-2 text-right font-semibold">{formatCurrency(monthlyRate)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-slate-500">2</td>
                      <td className="py-2 font-medium">ค่ากระแสไฟฟ้า (Electric)</td>
                      <td className="py-2 text-center font-mono text-slate-600">1,185</td>
                      <td className="py-2 text-center font-mono text-slate-900 font-bold">1,250</td>
                      <td className="py-2 text-right font-bold text-amber-600">65</td>
                      <td className="py-2 text-right">{property.electricRate}.00</td>
                      <td className="py-2 text-right font-semibold">{formatCurrency(65 * property.electricRate)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-slate-500">3</td>
                      <td className="py-2 font-medium">ค่าน้ำประปา (Water)</td>
                      <td className="py-2 text-center font-mono text-slate-600">302</td>
                      <td className="py-2 text-center font-mono text-slate-900 font-bold">310</td>
                      <td className="py-2 text-right font-bold text-blue-600">8</td>
                      <td className="py-2 text-right">{property.waterRate}.00</td>
                      <td className="py-2 text-right font-semibold">{formatCurrency(8 * property.waterRate)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-slate-500">4</td>
                      <td className="py-2 font-medium">ค่าบริการส่วนกลางและเก็บขยะ</td>
                      <td className="py-2 text-center text-slate-400">-</td>
                      <td className="py-2 text-center text-slate-400">-</td>
                      <td className="py-2 text-right">1</td>
                      <td className="py-2 text-right">100.00</td>
                      <td className="py-2 text-right font-semibold">100.00</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-slate-500">5</td>
                      <td className="py-2 font-medium">ค่าที่จอดรถยนต์</td>
                      <td className="py-2 text-center text-slate-400">-</td>
                      <td className="py-2 text-center text-slate-400">-</td>
                      <td className="py-2 text-right">1</td>
                      <td className="py-2 text-right">300.00</td>
                      <td className="py-2 text-right font-semibold">300.00</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-900 font-bold text-sm">
                      <td colSpan={6} className="py-3 text-right">ยอดรวมสุทธิที่ต้องชำระ (Total Amount):</td>
                      <td className="py-3 text-right text-base font-extrabold text-emerald-700">
                        {formatCurrency(totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Payment QR PromptPay Box */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      <span>ช่องทางการชำระเงิน (PromptPay QR)</span>
                    </div>
                    <div className="text-[11px] text-slate-600">ชื่อบัญชี: <strong>{property.promptpayName}</strong></div>
                    <div className="text-[11px] text-slate-600">หมายเลขพร้อมเพย์: <strong className="font-mono">{property.promptpayNumber}</strong></div>
                    <div className="text-[10px] text-rose-600 pt-1">* โอนเงินแล้วกรุณาแนบภาพสลิปส่งเข้ามาใน LINE Official Account เพื่อรับใบเสร็จทันที</div>
                  </div>
                  <div className="w-24 h-24 bg-white border border-slate-300 rounded-xl p-1 flex items-center justify-center shrink-0">
                    <QrCode className="w-20 h-20 text-slate-900" />
                  </div>
                </div>
              </div>
            )}

            {/* ==================== 3. OFFICIAL RECEIPT ==================== */}
            {docType === "receipt" && (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start border-b pb-4">
                  <div>
                    <h1 className="text-xl font-black text-teal-800 tracking-tight">ใบเสร็จรับเงิน (OFFICIAL RECEIPT)</h1>
                    <p className="font-bold text-sm text-slate-800">{property.name}</p>
                    <p className="text-[11px] text-slate-500 max-w-sm">{property.address}</p>
                    <p className="text-[11px] text-slate-500">โทร. {property.phone} • เลขประจำตัวผู้เสียภาษี: 0105566012345</p>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-sm font-bold font-mono text-teal-700">{recNumber}</div>
                    <div className="text-[11px] text-slate-500">อ้างอิงบิล: {invNumber}</div>
                    <div className="text-[11px] text-emerald-600 font-bold">วันที่รับชำระ: 26 ต.ค. 2569 (10:15 น.)</div>
                  </div>
                </div>

                {/* Paid By Box */}
                <div className="p-3.5 bg-teal-50/40 border border-teal-200 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <div className="text-slate-500 text-[10px]">ได้รับเงินจาก (Received From):</div>
                    <div className="font-bold text-sm text-slate-900">{tenantName}</div>
                    <div className="text-slate-600 text-[11px]">เลขบัตรประชาชน: {idCard}</div>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 rounded-lg bg-teal-700 text-white font-extrabold text-sm tracking-wider">
                      ห้อง {roomNumber}
                    </span>
                    <div className="text-[10px] text-emerald-700 font-semibold mt-1">✓ ชำระผ่าน PromptPay เรียบร้อย</div>
                  </div>
                </div>

                {/* Receipt Line Items */}
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b-2 border-slate-900 text-slate-900 font-bold uppercase text-[11px]">
                      <th className="py-2.5">ลำดับ</th>
                      <th className="py-2.5">รายการชำระ</th>
                      <th className="py-2.5 text-right">จำนวนเงิน (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    <tr>
                      <td className="py-2.5 text-slate-500">1</td>
                      <td className="py-2.5 font-medium">ค่าเช่าห้องพักประจำเดือน ตุลาคม 2569 (ห้อง {roomNumber})</td>
                      <td className="py-2.5 text-right font-semibold">{formatCurrency(monthlyRate)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 text-slate-500">2</td>
                      <td className="py-2.5 font-medium">ค่ากระแสไฟฟ้า (65 หน่วย @ 8.00 บาท)</td>
                      <td className="py-2.5 text-right font-semibold">520.00</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 text-slate-500">3</td>
                      <td className="py-2.5 font-medium">ค่าน้ำประปา (8 หน่วย @ 18.00 บาท)</td>
                      <td className="py-2.5 text-right font-semibold">144.00</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 text-slate-500">4</td>
                      <td className="py-2.5 font-medium">ค่าบริการส่วนกลางและเก็บขยะ</td>
                      <td className="py-2.5 text-right font-semibold">100.00</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 text-slate-500">5</td>
                      <td className="py-2.5 font-medium">ค่าที่จอดรถยนต์</td>
                      <td className="py-2.5 text-right font-semibold">300.00</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-900 font-bold text-sm bg-slate-50">
                      <td colSpan={2} className="p-3 text-right">รวมเงินที่รับชำระทั้งสิ้น (Total Paid):</td>
                      <td className="p-3 text-right text-base font-black text-teal-800">
                        {formatCurrency(totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Amount in Thai Words */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center font-bold text-slate-800 text-xs">
                  (ห้าพันหกสิบสี่บาทถ้วน / Five Thousand Sixty-Four Baht Only)
                </div>

                {/* Stamp & Receiver Signature */}
                <div className="grid grid-cols-2 gap-8 pt-8 border-t text-center text-[11px]">
                  <div className="space-y-1 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full border-2 border-red-500/40 text-red-600 flex items-center justify-center font-bold text-[10px] transform -rotate-12 mb-2">
                      พักดี แมนชั่น<br/>PAID
                    </div>
                    <div className="text-slate-500 font-semibold">ตราประทับรับเงิน</div>
                  </div>
                  <div className="space-y-1">
                    <div className="border-b border-dashed border-slate-400 pb-10 mb-2"></div>
                    <div>(ลงชื่อ).................................................... ผู้รับเงิน</div>
                    <div className="text-slate-900 font-semibold">คุณพักดี มีสุข (ผู้จัดการ)</div>
                  </div>
                </div>
              </div>
            )}

            {/* Document Footer (Common) */}
            <div className="text-[10px] text-slate-400 text-center pt-8 border-t border-slate-100">
              เอกสารนี้สร้างขึ้นโดยระบบบริหารจัดการหอพัก Pakdee Management System • วันที่พิมพ์: {new Date().toLocaleDateString("th-TH")}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
