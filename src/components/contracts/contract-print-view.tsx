"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ContractClause, AdditionalFeeItem, Property, Room, ContractItem } from "@/types/dormitory";
import { PakdeeLogo } from "@/components/ui/pakdee-logo";
import {
  Printer,
  ArrowLeft,
  FileSignature,
  CheckCircle2,
  Building2,
  User,
  Calendar,
  ShieldCheck,
  Sparkles,
  SlidersHorizontal,
  RotateCcw,
  FileText,
  Ban,
  PawPrint,
  CigaretteOff,
  Check,
} from "lucide-react";

// แปลงตัวเลขเป็นคำอ่านเงินบาทไทย (เช่น 4000 -> สี่พันบาทถ้วน)
export function numberToThaiBahtText(amount: number): string {
  if (!amount || isNaN(amount) || amount <= 0) return "ศูนย์บาทถ้วน";
  const numStr = Math.floor(amount).toString();
  const digits = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  const positions = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

  let result = "";
  const len = numStr.length;

  for (let i = 0; i < len; i++) {
    const digit = parseInt(numStr[i], 10);
    const pos = len - i - 1;
    const posMod = pos % 6;

    if (digit !== 0) {
      if (posMod === 1 && digit === 1) {
        result += "สิบ";
      } else if (posMod === 1 && digit === 2) {
        result += "ยี่สิบ";
      } else if (posMod === 0 && digit === 1 && len > 1 && numStr[i - 1] !== "0") {
        result += "เอ็ด";
      } else {
        result += digits[digit] + positions[posMod];
      }
    }
    if (pos > 0 && posMod === 0) {
      result += "ล้าน";
    }
  }

  return `${result}บาทถ้วน`;
}

// ข้อสัญญามาตรฐาน 14 ข้อ (อิงตามหน้าลงทะเบียนผู้เช่าใหม่และทำสัญญาเช่า)
export const STANDARD_14_CLAUSES: ContractClause[] = [
  {
    id: 1,
    title: "ห้องพักที่เช่า",
    content:
      "ผู้เช่าตกลงเช่าและผู้ให้เช่าตกลงให้เช่าห้องพักเลขที่ [หมายเลขห้อง] ชั้น [ชั้น] ตั้งอยู่ที่ [ที่อยู่หอพัก] เพื่อใช้เป็นที่พักอาศัยเท่านั้น ห้ามใช้เพื่อประโยชน์อื่นใดโดยมิได้รับความยินยอมเป็นลายลักษณ์อักษรจากผู้ให้เช่า",
  },
  {
    id: 2,
    title: "ระยะเวลาการเช่า",
    content:
      "สัญญาเช่าฉบับนี้กำหนดระยะเวลา ตั้งแต่วันที่ [วันเริ่มสัญญา] ถึงวันที่ [วันสิ้นสุดสัญญา] หากผู้เช่าประสงค์จะต่อสัญญา จะต้องแจ้งให้ผู้ให้เช่าทราบล่วงหน้าไม่น้อยกว่า [จำนวนวันแจ้งล่วงหน้า] วันก่อนวันสิ้นสุดสัญญา",
  },
  {
    id: 3,
    title: "ค่าเช่า",
    content:
      "ผู้เช่าตกลงชำระค่าเช่าให้แก่ผู้ให้เช่าเดือนละ [ค่าเช่า] บาท ([ค่าเช่าตัวอักษร]) ภายในวันที่ [วันกำหนดชำระ] ของทุกเดือน หากชำระล่าช้าจะต้องเสียค่าปรับวันละ [ค่าปรับ] บาท",
  },
  {
    id: 4,
    title: "เงินประกัน",
    content:
      "ผู้เช่าได้วางเงินประกันจำนวน [เงินประกัน] บาท ให้แก่ผู้ให้เช่า เงินประกันจะคืนให้ภายใน [จำนวนวันคืนเงินประกัน] วัน หลังจากวันสิ้นสุดสัญญาและย้ายออก หากไม่มีค่าเสียหายหรือค่าน้ำไฟค้างชำระ",
  },
  {
    id: 5,
    title: "ค่าสาธารณูปโภค",
    content:
      "ผู้เช่าตกลงชำระค่าสาธารณูปโภค ได้แก่ ค่าน้ำประปา ค่าไฟฟ้า ค่าบริการส่วนกลาง ค่าอินเทอร์เน็ต ตามอัตราที่หอพักกำหนด โดยชำระพร้อมกับค่าเช่าประจำเดือน",
  },
  {
    id: 6,
    title: "เฟอร์นิเจอร์และอุปกรณ์",
    content:
      "ผู้เช่าตกลงรับมอบห้องพักพร้อมเฟอร์นิเจอร์และอุปกรณ์ตามรายการที่ตรวจรับ ผู้เช่าจะบำรุงรักษาทรัพย์สินดังกล่าวให้อยู่ในสภาพดี หากเกิดความเสียหายต้องรับผิดชอบค่าซ่อมแซมหรือชดใช้",
  },
  {
    id: 7,
    title: "การดูแลรักษาห้องพัก",
    content:
      "ผู้เช่าจะต้องดูแลรักษาห้องพักให้มีสุขอนามัยเรียบร้อย สะอาด ไม่ทำลายทรัพย์สินของผู้ให้เช่า และไม่ดัดแปลงหรือต่อเติมห้องพักโดยไม่ได้รับอนุญาต",
  },
  {
    id: 8,
    title: "การใช้ห้องพัก",
    content:
      "ผู้เช่าจะไม่กระทำการอันเป็นการรบกวนความสงบสุขของผู้อื่น ไม่ประกอบกิจกรรมผิดกฎหมาย เก็บวัตถุอันตรายหรือสารเสพติด และต้องไม่กระทำการใดๆ ที่เป็นการรบกวนผู้อยู่อาศัยอื่น",
  },
  {
    id: 9,
    title: "ผู้พักอาศัย",
    content:
      "ผู้เช่าจะพักอาศัยตามจำนวนคนที่ตกลงไว้ หากมีบุคคลอื่นมาพักร่วมจะต้องได้รับอนุญาตและแจ้งให้ทราบและเสียค่าบริการเพิ่มเติม ห้ามนำบุคคลภายนอกเข้ามาพักอาศัยโดยพลการ",
  },
  {
    id: 10,
    title: "การซ่อมแซม",
    content:
      "หากมีความชำรุดเสียหายจากการใช้งานปกติ ผู้ให้เช่าจะเป็นผู้รับผิดชอบซ่อมแซม แต่หากเกิดจากความผิดของผู้เช่า ผู้เช่าต้องเป็นผู้รับผิดชอบค่าซ่อมแซมเอง",
  },
  {
    id: 11,
    title: "การตรวจสอบห้องพัก",
    content:
      "ผู้ให้เช่ามีสิทธิ์เข้าตรวจสอบห้องพักได้ โดยแจ้งให้ผู้เช่าทราบล่วงหน้าอย่างน้อย 24 ชั่วโมง ยกเว้นกรณีฉุกเฉิน",
  },
  {
    id: 12,
    title: "การบอกเลิกสัญญา",
    content:
      "หากผู้เช่าประสงค์จะบอกเลิกสัญญาก่อนครบกำหนด จะต้องแจ้งให้ผู้ให้เช่าทราบล่วงหน้าไม่น้อยกว่า [จำนวนวันแจ้งล่วงหน้า] วัน มิฉะนั้นจะถูกริบเงินประกัน",
  },
  {
    id: 13,
    title: "การผิดสัญญา",
    content:
      "หากผู้เช่าผิดข้อตกลงในสัญญาข้อใดข้อหนึ่ง ผู้ให้เช่ามีสิทธิ์บอกเลิกสัญญาได้ทันที โดยผู้เช่าไม่มีสิทธิ์เรียกร้องค่าเสียหายใดๆ",
  },
  {
    id: 14,
    title: "ข้อตกลงทั่วไป",
    content:
      "สัญญาฉบับนี้ทำขึ้นเป็นสองฉบับ มีข้อความถูกต้องตรงกัน ทั้งสองฝ่ายได้อ่านและเข้าใจข้อความในสัญญาโดยละเอียดแล้ว จึงลงลายมือชื่อไว้เป็นหลักฐานต่อหน้าพยาน",
  },
];

export interface PrintableContractData {
  contractNumber: string;
  contractDate: string;
  // 1. Room Allocation
  roomNumber: string;
  floor: number;
  roomType: string;
  monthlyRate: number;
  // 2. Tenant Profile (14 Fields)
  fullName: string;
  phone: string;
  idCard: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  age: number;
  lineId: string;
  email: string;
  vehiclePlate: string;
  address: string;
  emergencyContact: string;
  taxId: string;
  invoiceLang: "TH" | "EN";
  notes: string;
  // 3. Financial & Dates
  startDate: string;
  endDate: string;
  isContinuous: boolean;
  paymentDueDay: number;
  lateFeePerDay: number;
  electricalEquipmentFee: number;
  furnitureFee: number;
  hasDeposit: boolean;
  depositAmount: number;
  hasTv: boolean;
  tvRentalFee: number;
  hasFridge: boolean;
  fridgeRentalFee: number;
  additionalFees: AdditionalFeeItem[];
  // 4. Lease Conditions
  noticeDays: number;
  depositRefundDays: number;
  overdueGraceDays: number;
  allowPets: boolean;
  noSmoking: boolean;
  additionalRules: string[];
  // 5. Clauses (14 items)
  clauses: ContractClause[];
  // Property Info
  propertyName: string;
  propertyAddress: string;
  propertyPhone: string;
  electricRate: number;
  waterRate: number;
}

export const DEFAULT_PRINTABLE_CONTRACT: PrintableContractData = {
  contractNumber: "CT-2026-103-01",
  contractDate: "2026-03-11",
  // 1. Room Allocation (ตรงตามภาพตัวอย่าง: ห้อง 103 ชั้น 1 ห้องแอร์ ฿4,000/ด.)
  roomNumber: "103",
  floor: 1,
  roomType: "ห้องแอร์",
  monthlyRate: 4000,
  // 2. Tenant Profile (14 ฟิลด์)
  fullName: "คุณนวรัตน์ มงคลสุข",
  phone: "089-456-7890",
  idCard: "1-1005-01234-56-7",
  gender: "MALE",
  age: 26,
  lineId: "nawarat_line",
  email: "tenant@email.com",
  vehiclePlate: "1กข 9999 กทม.",
  address: "99/12 หมู่ 4 ซอยสุขุมวิท 101 ถนนสุขุมวิท แขวงบางจาก เขตพระโขนง กรุงเทพมหานคร 10260",
  emergencyContact: "มารดา (คุณสมศรี) 081-234-5678",
  taxId: "-",
  invoiceLang: "TH",
  notes: "เข้าพักอาศัย 1-2 ท่าน ดูแลความสะอาดเรียบร้อย",
  // 3. Financial & Dates (ตรงตามภาพตัวอย่าง: 11/03/2026 - 11/03/2027, ชำระวันที่ 5, ค่าปรับ 100, เงินประกัน 8000)
  startDate: "2026-03-11",
  endDate: "2027-03-11",
  isContinuous: false,
  paymentDueDay: 5,
  lateFeePerDay: 100,
  electricalEquipmentFee: 0,
  furnitureFee: 0,
  hasDeposit: true,
  depositAmount: 8000,
  hasTv: false,
  tvRentalFee: 300,
  hasFridge: false,
  fridgeRentalFee: 300,
  additionalFees: [],
  // 4. Lease Conditions (ตรงตามภาพตัวอย่าง: แจ้งล่วงหน้า 30 วัน, คืนเงินประกัน 7 วัน, ค้างชำระได้ 7 วัน, ห้ามสูบบุหรี่)
  noticeDays: 30,
  depositRefundDays: 7,
  overdueGraceDays: 7,
  allowPets: false,
  noSmoking: true,
  additionalRules: [
    "ห้ามส่งเสียงดังรบกวนผู้พักอาศัยห้องอื่นหลังเวลา 22:00 น.",
    "ห้ามใช้เตาแก๊สหุงต้มหรือประกอบอาหารที่มีควันภายในห้องพัก",
  ],
  // 5. Clauses
  clauses: STANDARD_14_CLAUSES,
  // Property Info
  propertyName: "พักดี เรสซิเดนซ์ (PAKDEE RESIDENCE)",
  propertyAddress: "128/9 ถนนพหลโยธิน แขวงจอมพล เขตจตุจักร กรุงเทพมหานคร 10900",
  propertyPhone: "02-888-9999, 081-999-8888",
  electricRate: 8,
  waterRate: 18,
};

function formatThaiDateLong(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface ContractPrintViewProps {
  initialData?: Partial<PrintableContractData>;
  property?: Property;
  rooms?: Room[];
  contracts?: ContractItem[];
}

export function ContractPrintView({
  initialData,
  property,
}: ContractPrintViewProps) {
  const mergedInitial: PrintableContractData = useMemo(
    () => ({
      ...DEFAULT_PRINTABLE_CONTRACT,
      ...(property
        ? {
            propertyName: property.name || DEFAULT_PRINTABLE_CONTRACT.propertyName,
            propertyAddress: property.address || DEFAULT_PRINTABLE_CONTRACT.propertyAddress,
            propertyPhone: property.phone || DEFAULT_PRINTABLE_CONTRACT.propertyPhone,
            electricRate: property.electricRate || DEFAULT_PRINTABLE_CONTRACT.electricRate,
            waterRate: property.waterRate || DEFAULT_PRINTABLE_CONTRACT.waterRate,
          }
        : {}),
      ...initialData,
    }),
    [initialData, property]
  );

  const [data, setData] = useState<PrintableContractData>(mergedInitial);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);

  // แทนค่าตัวแปรในข้อสัญญาทั้ง 14 ข้ออัตโนมัติ
  const resolvedClauses = useMemo(() => {
    const startThai = formatThaiDateLong(data.startDate);
    const endThai = data.isContinuous ? "ไม่มีกำหนด (สัญญาเช่าต่อเนื่อง)" : formatThaiDateLong(data.endDate);
    const rentStr = data.monthlyRate.toLocaleString("th-TH");
    const rentText = numberToThaiBahtText(data.monthlyRate);
    const depositStr = (data.hasDeposit ? data.depositAmount : 0).toLocaleString("th-TH");

    return data.clauses.map((clause) => {
      const resolvedContent = clause.content
        .replace(/\[หมายเลขห้อง\]/g, data.roomNumber)
        .replace(/\[ชั้น\]/g, String(data.floor))
        .replace(/\[ที่อยู่หอพัก\]/g, `${data.propertyName} (${data.propertyAddress})`)
        .replace(/\[วันเริ่มสัญญา\]/g, startThai)
        .replace(/\[วันสิ้นสุดสัญญา\]/g, endThai)
        .replace(/\[ค่าเช่า\]/g, rentStr)
        .replace(/\[ค่าเช่าตัวอักษร\]/g, rentText)
        .replace(/\[วันกำหนดชำระ\]/g, String(data.paymentDueDay))
        .replace(/\[ค่าปรับ\]/g, data.lateFeePerDay.toLocaleString("th-TH"))
        .replace(/\[เงินประกัน\]/g, depositStr)
        .replace(/\[จำนวนวันคืนเงินประกัน\]/g, String(data.depositRefundDays))
        .replace(/\[จำนวนวันแจ้งล่วงหน้า\]/g, String(data.noticeDays));

      return {
        ...clause,
        resolvedContent,
      };
    });
  }, [data]);

  const activeAdditionalFees = data.additionalFees.filter((f) => f.isEnabled);
  const monthlyAddons =
    (data.hasTv ? data.tvRentalFee : 0) +
    (data.hasFridge ? data.fridgeRentalFee : 0) +
    activeAdditionalFees.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);

  const totalMonthlyRecurring = data.monthlyRate + monthlyAddons;
  const totalUpfront =
    data.monthlyRate +
    (data.hasDeposit ? data.depositAmount : 0) +
    monthlyAddons +
    (Number(data.electricalEquipmentFee) || 0) +
    (Number(data.furnitureFee) || 0);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleResetDefault = () => {
    setData(mergedInitial);
  };

  return (
    <div className="min-h-screen w-full bg-[#F8F7F4] text-slate-900 flex flex-col justify-between relative font-sans print:bg-white print:min-h-0">
      {/* Global Print Page Style */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 14mm;
          }
          body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* ==================== TOP CONTROL BAR (HIDDEN ON PRINT) ==================== */}
      <header className="w-full px-4 sm:px-8 py-3.5 bg-white/95 border-b border-amber-200/70 backdrop-blur-md sticky top-0 z-30 shadow-xs print:hidden">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/contracts"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>ย้อนกลับ</span>
            </Link>
            <div className="h-5 w-[1px] bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2.5">
              <PakdeeLogo size="sm" showText={false} variant="light" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                    ตัวอย่างเอกสารสัญญาเช่าสำหรับพิมพ์ (Printable Lease Contract)
                  </h1>
                  <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    A4 Standard
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  อ้างอิงข้อมูลจากฟอร์มลงทะเบียนผู้เช่าใหม่ครบทั้ง 6 หมวด และข้อสัญญามาตรฐาน 14 ข้อ
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditorOpen(!isEditorOpen)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                isEditorOpen
                  ? "bg-amber-50 border-amber-300 text-amber-900"
                  : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
              <span>{isEditorOpen ? "ซ่อนแผงแก้ไขข้อมูลตัวอย่าง" : "แก้ไขข้อมูลตัวอย่าง"}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์เอกสารสัญญา (A4 / PDF)</span>
            </button>
          </div>
        </div>

        {/* Quick Sample Data Customizer Drawer (Hidden on print) */}
        {isEditorOpen && (
          <div className="max-w-5xl mx-auto mt-3 pt-3 border-t border-slate-200/80 animate-in fade-in duration-150">
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                  <span>ปรับแต่งข้อมูลตัวอย่างในใบสัญญาแบบเรียลไทม์ (ไม่กระทบฐานข้อมูลหลัก)</span>
                </div>
                <button
                  type="button"
                  onClick={handleResetDefault}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>คืนค่าเริ่มต้น (ห้อง 103)</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">ห้องพักเลขที่</label>
                  <input
                    type="text"
                    value={data.roomNumber}
                    onChange={(e) => setData({ ...data, roomNumber: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">ประเภทห้องพัก</label>
                  <input
                    type="text"
                    value={data.roomType}
                    onChange={(e) => setData({ ...data, roomType: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">อัตราค่าเช่า (บาท/เดือน)</label>
                  <input
                    type="number"
                    value={data.monthlyRate}
                    onChange={(e) => setData({ ...data, monthlyRate: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">เงินประกัน (บาท)</label>
                  <input
                    type="number"
                    value={data.depositAmount}
                    onChange={(e) => setData({ ...data, depositAmount: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">ชื่อ-นามสกุล ผู้เช่า</label>
                  <input
                    type="text"
                    value={data.fullName}
                    onChange={(e) => setData({ ...data, fullName: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">เบอร์โทรศัพท์ผู้เช่า</label>
                  <input
                    type="text"
                    value={data.phone}
                    onChange={(e) => setData({ ...data, phone: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">เลขบัตรประชาชน</label>
                  <input
                    type="text"
                    value={data.idCard}
                    onChange={(e) => setData({ ...data, idCard: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold"
                  />
                </div>
                <div className="flex items-end gap-3 pb-1">
                  <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.hasTv}
                      onChange={(e) => setData({ ...data, hasTv: e.target.checked })}
                      className="rounded accent-emerald-600"
                    />
                    <span>เช่าทีวี (+฿{data.tvRentalFee})</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.hasFridge}
                      onChange={(e) => setData({ ...data, hasFridge: e.target.checked })}
                      className="rounded accent-emerald-600"
                    />
                    <span>เช่าตู้เย็น (+฿{data.fridgeRentalFee})</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ==================== MAIN A4 PAPER VIEWPORT ==================== */}
      <main className="flex-1 py-6 sm:py-10 px-3 sm:px-6 flex flex-col items-center gap-8 print:p-0 print:gap-0">
        {/* A4 DOCUMENT SHEET */}
        <article className="w-full max-w-[210mm] bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-200/90 p-6 sm:p-12 print:shadow-none print:border-none print:rounded-none print:p-0 print:max-w-none space-y-5 text-[12.5px] leading-relaxed">
          {/* 0. DOCUMENT HEADER */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <div className="shrink-0 pt-0.5">
                <PakdeeLogo size="md" showText={false} variant="light" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                  RESIDENTIAL LEASE AGREEMENT • เอกสารสัญญาเช่ามาตรฐาน
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  หนังสือสัญญาเช่าห้องพักอาศัย
                </h1>
                <div className="text-xs font-bold text-slate-800 mt-0.5">{data.propertyName}</div>
                <div className="text-[11px] text-slate-600">
                  {data.propertyAddress} • โทร. {data.propertyPhone}
                </div>
              </div>
            </div>

            <div className="sm:text-right bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 shrink-0 space-y-0.5">
              <div className="text-[11px] text-slate-500 font-semibold">
                เลขที่สัญญา: <span className="font-mono font-black text-slate-900">{data.contractNumber}</span>
              </div>
              <div className="text-[11px] text-slate-600">
                วันที่ทำสัญญา: <strong className="text-slate-900">{formatThaiDateLong(data.contractDate)}</strong>
              </div>
              <div className="text-[10px] text-slate-500">
                ภาษาใบแจ้งหนี้: <strong>{data.invoiceLang === "TH" ? "ภาษาไทย (TH)" : "English (EN)"}</strong>
              </div>
            </div>
          </div>

          {/* INTRODUCTORY LEGAL PARAGRAPH */}
          <div className="text-xs text-slate-800 leading-relaxed">
            หนังสือสัญญาเช่าฉบับนี้ทำขึ้น ณ <strong>{data.propertyName}</strong> เมื่อวันที่{" "}
            <strong>{formatThaiDateLong(data.contractDate)}</strong> ระหว่าง{" "}
            <strong>{data.propertyName}</strong> ตั้งอยู่ที่ {data.propertyAddress} ซึ่งต่อไปในสัญญานี้เรียกว่า{" "}
            <strong>&ldquo;ผู้ให้เช่า&rdquo;</strong> ฝ่ายหนึ่ง กับ <strong>{data.fullName}</strong> ซึ่งต่อไปในสัญญานี้เรียกว่า{" "}
            <strong>&ldquo;ผู้เช่า&rdquo;</strong> อีกฝ่ายหนึ่ง โดยทั้งสองฝ่ายตกลงทำสัญญาเช่าห้องพักอาศัยตามรายละเอียดดังต่อไปนี้
          </div>

          {/* ==================== SECTION 1: ROOM ALLOCATION ==================== */}
          <section className="border border-slate-300 rounded-xl overflow-hidden">
            <div className="bg-slate-900 text-white px-3.5 py-1.5 flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-amber-300" />
                <span>ส่วนที่ 1 : ข้อมูลห้องพักที่ตกลงเช่า (Room Allocation)</span>
              </div>
              <span className="text-[11px] font-mono text-amber-300">
                ห้อง {data.roomNumber} • ชั้น {data.floor}
              </span>
            </div>
            <div className="p-3.5 bg-slate-50/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-500 font-semibold">หมายเลขห้องพัก</div>
                <div className="text-base font-black text-slate-900">ห้อง {data.roomNumber}</div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-500 font-semibold">ชั้น / ประเภทห้องพัก</div>
                <div className="text-sm font-bold text-slate-900">
                  ชั้น {data.floor} • {data.roomType}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-500 font-semibold">อัตราค่าเช่ามาตรฐาน</div>
                <div className="text-base font-black text-emerald-700">
                  ฿{data.monthlyRate.toLocaleString("th-TH")}{" "}
                  <span className="text-[11px] font-normal text-slate-500">/เดือน</span>
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-500 font-semibold">อัตราค่าน้ำ / ค่าไฟ</div>
                <div className="text-xs font-bold text-slate-800 mt-0.5">
                  น้ำ ฿{data.waterRate}/หน่วย • ไฟ ฿{data.electricRate}/หน่วย
                </div>
              </div>
            </div>
          </section>

          {/* ==================== SECTION 2: TENANT PROFILE (14 FIELDS) ==================== */}
          <section className="border border-slate-300 rounded-xl overflow-hidden">
            <div className="bg-slate-800 text-white px-3.5 py-1.5 flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-emerald-300" />
                <span>ส่วนที่ 2 : ข้อมูลประวัติผู้เช่าและทะเบียนผู้พักอาศัย (Tenant Profile)</span>
              </div>
              <span className="text-[10px] text-slate-300 font-normal">
                ตรวจสอบด้วยบัตรประชาชน (Smart OCR Verified)
              </span>
            </div>

            <div className="p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs bg-white">
              <div>
                <span className="text-slate-500 font-medium">1. ชื่อ-นามสกุลผู้เช่า:</span>{" "}
                <strong className="text-slate-900">{data.fullName}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">2. เบอร์โทรศัพท์:</span>{" "}
                <strong className="text-slate-900 font-mono">{data.phone}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">3. เลขบัตรประชาชน 13 หลัก:</span>{" "}
                <strong className="text-slate-900 font-mono">{data.idCard}</strong>
              </div>

              <div>
                <span className="text-slate-500 font-medium">4. เพศ (Gender):</span>{" "}
                <strong className="text-slate-900">
                  {data.gender === "MALE"
                    ? "ชาย (Male)"
                    : data.gender === "FEMALE"
                    ? "หญิง (Female)"
                    : "อื่นๆ (Other)"}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">5. อายุ (Age):</span>{" "}
                <strong className="text-slate-900">{data.age ? `${data.age} ปี` : "-"}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">6. LINE ID:</span>{" "}
                <strong className="text-slate-900">{data.lineId || "-"}</strong>
              </div>

              <div>
                <span className="text-slate-500 font-medium">7. อีเมล (Email):</span>{" "}
                <strong className="text-slate-900">{data.email || "-"}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">8. ทะเบียนรถ (Vehicle):</span>{" "}
                <strong className="text-slate-900">{data.vehiclePlate || "-"}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">9. ผู้ติดต่อฉุกเฉิน:</span>{" "}
                <strong className="text-slate-900">{data.emergencyContact || "-"}</strong>
              </div>

              <div className="sm:col-span-2">
                <span className="text-slate-500 font-medium">10. ที่อยู่ตามบัตรประชาชน/ทะเบียนบ้าน:</span>{" "}
                <strong className="text-slate-900">{data.address || "-"}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">11. เลขผู้เสียภาษี (Tax ID):</span>{" "}
                <strong className="text-slate-900 font-mono">{data.taxId || "-"}</strong>
              </div>

              <div className="sm:col-span-3 pt-1 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-slate-500 font-medium">12. หมายเหตุเพิ่มเติม / ข้อตกลงพิเศษ:</span>{" "}
                  <strong className="text-slate-800">{data.notes || "-"}</strong>
                </div>
                <div className="text-[11px] text-slate-500">
                  ค่าเช่าตัวอักษร: <strong className="text-slate-800">({numberToThaiBahtText(data.monthlyRate)})</strong>
                </div>
              </div>
            </div>
          </section>

          {/* ==================== SECTION 3: FINANCIALS & LEASE DATES ==================== */}
          <section className="border border-slate-300 rounded-xl overflow-hidden">
            <div className="bg-slate-800 text-white px-3.5 py-1.5 flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-amber-300" />
                <span>ส่วนที่ 3 : ระยะเวลาสัญญา รายละเอียดทางการเงิน และบริการเสริม</span>
              </div>
              <span className="text-[11px] text-amber-200">
                ชำระภายในวันที่ {data.paymentDueDay} ของทุกเดือน
              </span>
            </div>

            <div className="p-3.5 bg-white space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500">วันที่เริ่มต้นสัญญา (Start Date)</div>
                  <div className="font-bold text-slate-900">{formatThaiDateLong(data.startDate)}</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500">วันที่สิ้นสุดสัญญา (End Date)</div>
                  <div className="font-bold text-slate-900">
                    {data.isContinuous ? "สัญญาต่อเนื่อง (ไม่มีวันสิ้นสุด)" : formatThaiDateLong(data.endDate)}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500">วันกำหนดชำระ / ค่าปรับล่าช้า</div>
                  <div className="font-bold text-slate-900">
                    วันที่ {data.paymentDueDay} • ปรับ ฿{data.lateFeePerDay}/วัน
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-200">
                  <div className="text-[10px] text-emerald-800 font-semibold">
                    เงินประกันมัดจำความเสียหาย (Security Deposit)
                  </div>
                  <div className="font-black text-emerald-700 text-sm">
                    {data.hasDeposit ? `฿${data.depositAmount.toLocaleString("th-TH")}` : "ไม่เรียกเก็บ (฿0)"}
                  </div>
                </div>
              </div>

              {/* Breakdown Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                      <th className="py-1.5 px-3">รายการค่าใช้จ่ายและบริการเสริม (Financial & Service Items)</th>
                      <th className="py-1.5 px-3 text-center">สถานะการเลือก</th>
                      <th className="py-1.5 px-3 text-right">อัตรา/จำนวนเงิน (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-[11.5px]">
                    <tr>
                      <td className="py-1.5 px-3 font-semibold text-slate-900">
                        1. ค่าเช่าห้องพักรายเดือนมาตรฐาน (ห้อง {data.roomNumber} - {data.roomType})
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          ค่าเช่าหลักรายเดือน
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-right font-bold">
                        {data.monthlyRate.toLocaleString("th-TH")}.00
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-semibold text-slate-900">
                        2. เงินประกันมัดจำความเสียหาย (คืนเมื่อสิ้นสุดสัญญาและหักค่าน้ำไฟวันย้ายออก)
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">
                          {data.hasDeposit ? "ชำระวันทำสัญญา" : "ยกเว้น"}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-right font-bold">
                        {(data.hasDeposit ? data.depositAmount : 0).toLocaleString("th-TH")}.00
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 text-slate-700">
                        3. ค่าบริการเช่าทีวี (Smart TV Rental) และค่าบริการเช่าตู้เย็น (Refrigerator Rental)
                      </td>
                      <td className="py-1.5 px-3 text-center text-slate-600">
                        ทีวี: <strong>{data.hasTv ? "เช่า" : "ไม่เช่า"}</strong> • ตู้เย็น:{" "}
                        <strong>{data.hasFridge ? "เช่า" : "ไม่เช่า"}</strong>
                      </td>
                      <td className="py-1.5 px-3 text-right font-semibold">
                        {((data.hasTv ? data.tvRentalFee : 0) + (data.hasFridge ? data.fridgeRentalFee : 0)).toLocaleString("th-TH")}.00
                      </td>
                    </tr>
                    {(data.electricalEquipmentFee > 0 || data.furnitureFee > 0) && (
                      <tr>
                        <td className="py-1.5 px-3 text-slate-700">
                          4. ค่าอุปกรณ์ไฟฟ้า (฿{data.electricalEquipmentFee.toLocaleString("th-TH")}) และค่าครุภัณฑ์/เฟอร์นิเจอร์ (฿{data.furnitureFee.toLocaleString("th-TH")})
                        </td>
                        <td className="py-1.5 px-3 text-center text-slate-600">แรกเข้า</td>
                        <td className="py-1.5 px-3 text-right font-semibold">
                          {(data.electricalEquipmentFee + data.furnitureFee).toLocaleString("th-TH")}.00
                        </td>
                      </tr>
                    )}
                    {activeAdditionalFees.map((fee, idx) => (
                      <tr key={fee.id}>
                        <td className="py-1.5 px-3 text-slate-700">
                          ค่าบริการเพิ่มเติม ({idx + 1}): {fee.name || "บริการเสริมรายเดือน"}
                        </td>
                        <td className="py-1.5 px-3 text-center text-emerald-700 font-semibold">เปิดใช้งาน</td>
                        <td className="py-1.5 px-3 text-right font-semibold">
                          {(Number(fee.amount) || 0).toLocaleString("th-TH")}.00
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-bold text-xs">
                      <td className="py-2 px-3" colSpan={2}>
                        รวมยอดชำระทั้งสิ้น ณ วันทำสัญญา (ค่าเช่าล่วงหน้า 1 เดือน + เงินประกัน + บริการเสริม)
                      </td>
                      <td className="py-2 px-3 text-right text-amber-300 text-sm font-black">
                        ฿{totalUpfront.toLocaleString("th-TH")}.00 ({numberToThaiBahtText(totalUpfront)})
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </section>

          {/* ==================== SECTION 4: LEASE CONDITIONS & BUILDING RULES ==================== */}
          <section className="border border-slate-300 rounded-xl overflow-hidden">
            <div className="bg-slate-800 text-white px-3.5 py-1.5 flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span>ส่วนที่ 4 : เงื่อนไขสัญญาเช่าและกฎระเบียบภายในอาคาร (Lease Conditions)</span>
              </div>
              <span className="text-[11px] text-slate-300">
                ค่าเช่ารอบบิลถัดไป ฿{totalMonthlyRecurring.toLocaleString("th-TH")}/ด. + ค่าน้ำไฟตามมิเตอร์
              </span>
            </div>

            <div className="p-3.5 bg-white space-y-2.5 text-xs">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500">แจ้งล่วงหน้าก่อนย้ายออก</div>
                  <div className="font-black text-slate-900">{data.noticeDays} วัน</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500">ระยะเวลาคืนเงินประกัน</div>
                  <div className="font-black text-slate-900">ภายใน {data.depositRefundDays} วัน</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500">ผ่อนผันค้างชำระสูงสุด</div>
                  <div className="font-black text-slate-900">{data.overdueGraceDays} วัน</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex flex-col items-center justify-center">
                  <div className="text-[10px] text-slate-500">การเลี้ยงสัตว์</div>
                  <div className={`font-bold flex items-center gap-1 ${data.allowPets ? "text-emerald-700" : "text-rose-700"}`}>
                    <PawPrint className="w-3 h-3" />
                    <span>{data.allowPets ? "อนุญาต" : "ห้ามเลี้ยงสัตว์"}</span>
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-rose-50/70 border border-rose-200 flex flex-col items-center justify-center">
                  <div className="text-[10px] text-rose-700">การสูบบุหรี่ในอาคาร</div>
                  <div className="font-bold text-rose-700 flex items-center gap-1">
                    <CigaretteOff className="w-3 h-3" />
                    <span>{data.noSmoking ? "ห้ามสูบบุหรี่เด็ดขาด" : "ตามระเบียบ"}</span>
                  </div>
                </div>
              </div>

              {data.additionalRules && data.additionalRules.length > 0 && (
                <div className="px-3 py-2 rounded-lg bg-amber-50/60 border border-amber-200/90 text-[11.5px] text-slate-800">
                  <span className="font-bold text-amber-950">กฎระเบียบเพิ่มเติมของหอพัก: </span>
                  <span>{data.additionalRules.map((r, i) => `(${i + 1}) ${r}`).join(" • ")}</span>
                </div>
              )}
            </div>
          </section>

          {/* ==================== SECTION 5: 14 STANDARD CONTRACT CLAUSES ==================== */}
          <section className="border border-slate-300 rounded-xl overflow-hidden">
            <div className="bg-slate-900 text-white px-3.5 py-1.5 flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-amber-300" />
                <span>ส่วนที่ 5 : ข้อกำหนดและเงื่อนไขแห่งสัญญาเช่ามาตรฐาน ({resolvedClauses.length} ข้อ)</span>
              </div>
              <span className="text-[10px] text-slate-300 font-normal">
                คู่สัญญาทั้งสองฝ่ายได้อ่านและรับทราบทุกข้อแล้ว
              </span>
            </div>

            <div className="p-4 bg-white space-y-2 text-[11.5px] leading-relaxed text-slate-800">
              {resolvedClauses.map((clause, index) => (
                <div key={clause.id} className="flex items-start gap-2">
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-900 font-bold text-[10.5px] shrink-0 mt-0.5">
                    ข้อ {index + 1}
                  </span>
                  <div className="flex-1">
                    <strong className="text-slate-900">{clause.title} : </strong>
                    <span>{clause.resolvedContent}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ==================== SECTION 6: SIGNATURES ==================== */}
          <section className="pt-4 border-t-2 border-slate-900 break-inside-avoid">
            <p className="text-[11.5px] text-slate-700 text-center mb-6">
              สัญญาฉบับนี้ทำขึ้นเป็นสองฉบับ มีข้อความถูกต้องตรงกัน คู่สัญญาทั้งสองฝ่ายได้อ่านและเข้าใจข้อความโดยละเอียดตลอดแล้ว
              จึงได้ลงลายมือชื่อไว้เป็นสำคัญต่อหน้าพยาน
            </p>

            <div className="grid grid-cols-2 gap-8 text-center text-xs">
              {/* Lessor Signature */}
              <div className="p-4 rounded-xl border border-slate-300 bg-slate-50/40 space-y-2">
                <div className="text-[11px] font-bold text-slate-700">ฝ่ายผู้ให้เช่า (Lessor)</div>
                <div className="h-14 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                  <span className="text-[10px] text-slate-400">ลายมือชื่อผู้ให้เช่า / ผู้รับมอบอำนาจ</span>
                </div>
                <div>
                  ( <strong>{data.propertyName}</strong> )
                </div>
                <div className="text-[11px] text-slate-500">
                  วันที่ ............ / ........................ / ................
                </div>
              </div>

              {/* Lessee Signature */}
              <div className="p-4 rounded-xl border border-slate-300 bg-slate-50/40 space-y-2">
                <div className="text-[11px] font-bold text-slate-700">ฝ่ายผู้เช่า (Lessee)</div>
                <div className="h-14 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                  <span className="text-[10px] text-slate-400">ลายมือชื่อผู้เช่าห้องพัก {data.roomNumber}</span>
                </div>
                <div>
                  ( <strong>{data.fullName}</strong> )
                </div>
                <div className="text-[11px] text-slate-500">
                  วันที่ ............ / ........................ / ................
                </div>
              </div>

              {/* Witness 1 */}
              <div className="p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                  <span className="text-[10px] text-slate-400">ลายมือชื่อพยานฝ่ายผู้ให้เช่า</span>
                </div>
                <div>( ............................................................ )</div>
                <div className="text-[10.5px] font-semibold text-slate-500">พยาน (Witness 1)</div>
              </div>

              {/* Witness 2 */}
              <div className="p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                  <span className="text-[10px] text-slate-400">ลายมือชื่อพยานฝ่ายผู้เช่า</span>
                </div>
                <div>( ............................................................ )</div>
                <div className="text-[10.5px] font-semibold text-slate-500">พยาน (Witness 2)</div>
              </div>
            </div>

            <div className="mt-4 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>PAKDEE SMART DORMITORY SYSTEM • DOCUMENT REF: {data.contractNumber}</span>
              <span>ROOM {data.roomNumber} • GENERATED FOR A4 PRINT</span>
            </div>
          </section>
        </article>
      </main>
    </div>
  );
}

