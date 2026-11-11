"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ContractClause, AdditionalFeeItem, Property, Room, ContractItem } from "@/types/dormitory";
import { PakdeeLogo } from "@/components/ui/pakdee-logo";
import {
  Printer,
  ArrowLeft,
  Sparkles,
  SlidersHorizontal,
  RotateCcw,
  Plus,
  Trash2,
} from "lucide-react";

// แปลงตัวเลขเป็นคำอ่านเงินบาทไทย (เช่น 4000 -> สี่พันบาทถ้วน)
export function numberToThaiBahtText(amount: number): string {
  if (!amount || isNaN(amount) || amount <= 0) return "ศูนย์บาทถ้วน";
  const numStr = Math.floor(amount).toString();
  const digits = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "ฮก", "เจ็ด", "แปด", "เก้า"];
  digits[6] = "หก";
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

// แปลงเลขอารบิกเป็นเลขไทย (สามารถเลือกใช้หรือแสดงควบคู่ได้)
function toThaiDigits(num: number | string): string {
  const thaiDigits = ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"];
  return String(num).replace(/\d/g, (d) => thaiDigits[Number(d)]);
}

// ข้อสัญญามาตรฐาน 14 ข้อ (อิงตามหน้าลงทะเบียนผู้เช่าใหม่ + สำนวนสัญญาเช่ามาตรฐานจาก PDF)
export const STANDARD_14_CLAUSES: ContractClause[] = [
  {
    id: 1,
    title: "ห้องพักที่เช่า",
    content:
      "ผู้ให้เช่าตกลงให้เช่าและผู้เช่าตกลงเช่าห้องพักเลขที่ [หมายเลขห้อง] ชั้น [ชั้น] ประเภท [ประเภทห้อง] ตั้งอยู่ที่ [ที่อยู่หอพัก] เพื่อใช้เป็นที่พักอาศัยเท่านั้น ห้ามใช้เพื่อประโยชน์อื่นใดหรือประกอบการอันไม่ชอบด้วยกฎหมายโดยเด็ดขาด เว้นแต่จะได้รับความยินยอมเป็นหนังสือจากผู้ให้เช่า",
  },
  {
    id: 2,
    title: "ระยะเวลาการเช่า",
    content:
      "สัญญาเช่าฉบับนี้มีกำหนดระยะเวลาตั้งแต่วันที่ [วันเริ่มสัญญา] ถึงวันที่ [วันสิ้นสุดสัญญา] หากผู้เช่าประสงค์จะต่อสัญญา จะต้องแจ้งให้ผู้ให้เช่าทราบล่วงหน้าไม่น้อยกว่า [จำนวนวันแจ้งล่วงหน้า] วันก่อนวันสิ้นสุดสัญญา",
  },
  {
    id: 3,
    title: "ค่าเช่าและการชำระเงิน",
    content:
      "ในการทำสัญญาตามข้อ 1 ผู้เช่าตกลงชำระค่าเช่าห้องพักให้แก่ผู้ให้เช่าเป็นรายเดือน ในอัตราเดือนละ [ค่าเช่า] บาท ([ค่าเช่าตัวอักษร]) โดยตกลงชำระภายในวันที่ [วันกำหนดชำระ] ของทุกเดือน หากชำระล่าช้าเกินกำหนด ผู้เช่ายินยอมเสียค่าปรับวันละ [ค่าปรับ] บาท และหากค้างชำระเกิน [จำนวนวันค้างชำระที่อนุญาต] วัน ผู้ให้เช่ามีสิทธิบอกเลิกสัญญาได้ทันที",
  },
  {
    id: 4,
    title: "เงินประกันการเช่า",
    content:
      "เพื่อเป็นการประกันในการปฏิบัติตามสัญญาเช่า ผู้เช่าได้วางเงินประกันการเช่าจำนวน [เงินประกัน] บาท ([เงินประกันตัวอักษร]) ให้แก่ผู้ให้เช่าในวันทำสัญญานี้ เมื่อผู้เช่าเช่าครบกำหนดตามสัญญาและย้ายออก ผู้ให้เช่ายินดีคืนเงินประกันให้ภายใน [จำนวนวันคืนเงินประกัน] วัน โดยหักค่าเสียหายหรือค่าน้ำประปา-ค่าไฟฟ้าที่ค้างชำระ (ถ้ามี)",
  },
  {
    id: 5,
    title: "ค่าสาธารณูปโภค",
    content:
      "ผู้เช่าตกลงชำระค่าสาธารณูปโภค ได้แก่ ค่าน้ำประปา (อัตราหน่วยละ [ค่าน้ำ] บาท) ค่าไฟฟ้า (อัตราหน่วยละ [ค่าไฟ] บาท) และค่าบริการเสริมตามที่ได้ตกลงเลือกใช้บริการ โดยชำระพร้อมกับค่าเช่าประจำเดือน",
  },
  {
    id: 6,
    title: "เฟอร์นิเจอร์และอุปกรณ์",
    content:
      "ในวันทำสัญญานี้ ผู้เช่าได้ตรวจตราทรัพย์สิน เฟอร์นิเจอร์ และอุปกรณ์ภายในห้องพักที่เช่าแล้ว เห็นว่ามีสภาพปกติดีทุกประการ ผู้เช่าต้องสงวนและบำรุงรักษาทรัพย์สินดังกล่าวเสมอกับที่วิญญูชนจะพึงสงวนทรัพย์สินของตนเอง หากเกิดความชำรุดเสียหายเพราะความผิดของผู้เช่าหรือบริวาร ผู้เช่าต้องรับผิดชอบชดใช้ค่าซ่อมแซมตามจริง",
  },
  {
    id: 7,
    title: "การดูแลรักษาและห้ามดัดแปลงห้องพัก",
    content:
      "ผู้เช่าจะต้องดูแลรักษาห้องพักให้มีสุขอนามัยเรียบร้อย สะอาด และห้ามทำการดัดแปลง ต่อเติม หรือเจาะผนังห้องพักอย่างหนึ่งอย่างใด เว้นแต่จะได้รับอนุญาตจากผู้ให้เช่าเป็นลายลักษณ์อักษร หากฝ่าฝืนผู้ให้เช่ามีสิทธิบอกเลิกสัญญาได้ทันที และบรรดาสิ่งดัดแปลงต่อเติมนั้นให้ตกเป็นของผู้ให้เช่าโดยผู้เช่าจะรื้อถอนไปไม่ได้",
  },
  {
    id: 8,
    title: "การใช้ห้องพักและระเบียบการอยู่อาศัย",
    content:
      "ผู้เช่าจะไม่กระทำการอันเป็นการรบกวนความสงบสุขของผู้อื่น ไม่ส่งเสียงดัง ไม่เก็บวัตถุอันตรายหรือสารเสพติดผิดกฎหมาย รวมถึงปฏิบัติตามเงื่อนไขของอาคารอย่างเคร่งครัด ([เงื่อนไขสัตว์เลี้ยงและบุหรี่])",
  },
  {
    id: 9,
    title: "ผู้พักอาศัยและการห้ามเช่าช่วง",
    content:
      "ผู้เช่ารับว่าจะพักอาศัยตามจำนวนคนที่ตกลงไว้ และจะไม่ให้ผู้อื่นเช่าช่วง หรือโอนสิทธิตามสัญญาเช่าไม่ว่าทั้งหมดหรือแต่บางส่วนให้แก่บุคคลภายนอก เว้นแต่จะได้รับอนุญาตจากผู้ให้เช่าเป็นลายลักษณ์อักษรเสียก่อน",
  },
  {
    id: 10,
    title: "การซ่อมแซม",
    content:
      "หากมีความชำรุดเสียหายจากการใช้งานตามปกติวิสัย ผู้ให้เช่าจะเป็นผู้รับผิดชอบซ่อมแซม แต่ค่าใช้จ่ายเพื่อการบำรุงรักษาตามปกติและเพื่อซ่อมแซมเล็กน้อย หรือความเสียหายที่เกิดจากความผิดของผู้เช่า ผู้เช่าเป็นผู้ชำระ",
  },
  {
    id: 11,
    title: "การตรวจสอบห้องพัก",
    content:
      "ผู้เช่าต้องยินยอมให้ผู้ให้เช่าหรือตัวแทนของผู้ให้เช่าเข้าตรวจตราทรัพย์สินที่เช่าเป็นครั้งคราวในเวลาและระยะเวลาอันสมควร โดยแจ้งล่วงหน้าอย่างน้อย 24 ชั่วโมง ยกเว้นกรณีฉุกเฉินเร่งด่วน",
  },
  {
    id: 12,
    title: "การบอกเลิกสัญญาและการส่งมอบห้องคืน",
    content:
      "หากผู้เช่าประสงค์จะบอกเลิกสัญญาก่อนครบกำหนด จะต้องแจ้งให้ผู้ให้เช่าทราบล่วงหน้าไม่น้อยกว่า [จำนวนวันแจ้งล่วงหน้า] วัน มิฉะนั้นผู้ให้เช่ามีสิทธิริบเงินประกัน และเมื่อสัญญาสิ้นสุดลง ผู้เช่าต้องส่งมอบห้องพักคืนในสภาพเรียบร้อย",
  },
  {
    id: 13,
    title: "การผิดสัญญา",
    content:
      "ถ้าผู้เช่าประพฤติผิดสัญญาเช่าแม้ข้อหนึ่งข้อใดดังกล่าวข้างต้น ผู้ให้เช่ามีสิทธิบอกเลิกสัญญาเช่าได้ทันที และผู้เช่ายินยอมให้ผู้ให้เช่าทรงไว้ซึ่งสิทธิที่จะเข้าครอบครองทรัพย์สินที่เช่าได้ทันทีโดยผู้เช่าไม่มีสิทธิเรียกร้องค่าเสียหายใดๆ",
  },
  {
    id: 14,
    title: "ข้อตกลงทั่วไป",
    content:
      "สัญญานี้ทำขึ้นเป็นสองฉบับ มีข้อความถูกต้องตรงกัน คู่สัญญาทั้งสองฝ่ายได้อ่านและเข้าใจข้อความในสัญญานี้โดยตลอดแล้ว เห็นว่าถูกต้องตรงตามเจตนาของตน จึงได้ลงลายมือชื่อต่อหน้าพยานไว้เป็นสำคัญ และต่างยึดถือไว้ฝ่ายละหนึ่งฉบับ",
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
  contractNumber: "",
  contractDate: "",
  // 1. Room Allocation (blank — filled from the real contract/room)
  roomNumber: "",
  floor: 1,
  roomType: "ห้องแอร์",
  monthlyRate: 0,
  // 2. Tenant Profile (14 ฟิลด์)
  fullName: "",
  phone: "",
  idCard: "",
  gender: "MALE",
  age: 0,
  lineId: "",
  email: "",
  vehiclePlate: "",
  address: "",
  emergencyContact: "",
  taxId: "",
  invoiceLang: "TH",
  notes: "",
  // 3. Financial & Dates
  startDate: "",
  endDate: "",
  isContinuous: false,
  paymentDueDay: 5,
  lateFeePerDay: 100,
  electricalEquipmentFee: 0,
  furnitureFee: 0,
  hasDeposit: false,
  depositAmount: 0,
  hasTv: false,
  tvRentalFee: 300,
  hasFridge: false,
  fridgeRentalFee: 300,
  additionalFees: [],
  // 4. Lease Conditions
  noticeDays: 30,
  depositRefundDays: 7,
  overdueGraceDays: 7,
  allowPets: false,
  noSmoking: true,
  additionalRules: [],
  // 5. Clauses
  clauses: STANDARD_14_CLAUSES,
  // Property Info
  propertyName: "",
  propertyAddress: "",
  propertyPhone: "",
  electricRate: 8,
  waterRate: 18,
};

function formatThaiDateLong(dateStr: string): string {
  if (!dateStr) return "....................................";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getThaiDateParts(dateStr: string): { day: string; month: string; year: string } {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return { day: "......", month: "........................", year: ".........." };
  }
  const day = String(d.getDate());
  const month = d.toLocaleDateString("th-TH", { month: "long" });
  const year = String(d.getFullYear() + 543);
  return { day, month, year };
}

interface PaymentRowItem {
  id: string;
  title: string;
  detail: string;
  paymentType: string;
  isRecurringMonthly: boolean;
  amount: number;
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

  const contractDateParts = useMemo(() => getThaiDateParts(data.contractDate), [data.contractDate]);

  // สร้างรายการตารางค่าใช้จ่าย โดยแสดงเฉพาะรายการที่เปิดใช้งานเท่านั้น (หากไม่เปิดค่าเช่าทีวี/ตู้เย็น/บริการเสริม จะไม่แสดงในเอกสารเลย)
  const paymentRows = useMemo<PaymentRowItem[]>(() => {
    const rows: PaymentRowItem[] = [];

    // 1. ค่าเช่าห้องพักรายเดือน (แสดงเสมอ)
    rows.push({
      id: "room-rent",
      title: `ค่าเช่าห้องพักรายเดือน (ห้อง ${data.roomNumber} ชั้น ${data.floor} - ${data.roomType})`,
      detail: `ชำระภายในวันที่ ${data.paymentDueDay} ของทุกเดือน`,
      paymentType: "รายเดือน (ล่วงหน้า 1 เดือน)",
      isRecurringMonthly: true,
      amount: Number(data.monthlyRate) || 0,
    });

    // 2. เงินประกันมัดจำความเสียหาย (แสดงเฉพาะเมื่อเปิดใช้งาน hasDeposit และมียอด > 0)
    if (data.hasDeposit && Number(data.depositAmount) > 0) {
      rows.push({
        id: "security-deposit",
        title: "เงินประกันมัดจำความเสียหาย (Security Deposit)",
        detail: `คืนภายใน ${data.depositRefundDays} วันหลังสิ้นสุดสัญญาและย้ายออก`,
        paymentType: "ชำระแรกเข้าวันทำสัญญา",
        isRecurringMonthly: false,
        amount: Number(data.depositAmount) || 0,
      });
    }

    // 3. ค่าเช่าทีวี (แสดงเฉพาะเมื่อเปิดสวิตช์ hasTv เท่านั้น)
    if (data.hasTv && Number(data.tvRentalFee) > 0) {
      rows.push({
        id: "tv-rental",
        title: "ค่าบริการเช่าทีวี (Smart TV Rental)",
        detail: "คิดรวมในใบแจ้งหนี้รายเดือน",
        paymentType: "บริการเสริมรายเดือน",
        isRecurringMonthly: true,
        amount: Number(data.tvRentalFee) || 0,
      });
    }

    // 4. ค่าเช่าตู้เย็น (แสดงเฉพาะเมื่อเปิดสวิตช์ hasFridge เท่านั้น)
    if (data.hasFridge && Number(data.fridgeRentalFee) > 0) {
      rows.push({
        id: "fridge-rental",
        title: "ค่าบริการเช่าตู้เย็น (Refrigerator Rental)",
        detail: "คิดรวมในใบแจ้งหนี้รายเดือน",
        paymentType: "บริการเสริมรายเดือน",
        isRecurringMonthly: true,
        amount: Number(data.fridgeRentalFee) || 0,
      });
    }

    // 5. ค่าอุปกรณ์ไฟฟ้า (แสดงเฉพาะเมื่อมียอด > 0)
    if (Number(data.electricalEquipmentFee) > 0) {
      rows.push({
        id: "electrical-equip",
        title: "ค่าอุปกรณ์ไฟฟ้า",
        detail: "ชำระวันทำสัญญา",
        paymentType: "ชำระแรกเข้าวันทำสัญญา",
        isRecurringMonthly: false,
        amount: Number(data.electricalEquipmentFee) || 0,
      });
    }

    // 6. ค่าครุภัณฑ์/เฟอร์นิเจอร์ (แสดงเฉพาะเมื่อมียอด > 0)
    if (Number(data.furnitureFee) > 0) {
      rows.push({
        id: "furniture-fee",
        title: "ค่าครุภัณฑ์และเฟอร์นิเจอร์",
        detail: "ชำระวันทำสัญญา",
        paymentType: "ชำระแรกเข้าวันทำสัญญา",
        isRecurringMonthly: false,
        amount: Number(data.furnitureFee) || 0,
      });
    }

    // 7. ค่าบริการและค่าธรรมเนียมเพิ่มเติม (แสดงเฉพาะรายการที่เปิดใช้งานและมียอด > 0)
    (data.additionalFees || [])
      .filter((f) => f.isEnabled && Number(f.amount) > 0)
      .forEach((fee) => {
        rows.push({
          id: fee.id,
          title: fee.name?.trim() || "ค่าบริการเพิ่มเติม",
          detail: "คิดรวมในใบแจ้งหนี้รายเดือน",
          paymentType: "บริการเสริมรายเดือน",
          isRecurringMonthly: true,
          amount: Number(fee.amount) || 0,
        });
      });

    return rows;
  }, [data]);

  const totalUpfront = useMemo(
    () => paymentRows.reduce((sum, item) => sum + item.amount, 0),
    [paymentRows]
  );

  const totalMonthlyRecurring = useMemo(
    () =>
      paymentRows
        .filter((item) => item.isRecurringMonthly)
        .reduce((sum, item) => sum + item.amount, 0),
    [paymentRows]
  );

  // แทนค่าตัวแปรในข้อสัญญาทั้ง 14 ข้ออัตโนมัติ
  const resolvedClauses = useMemo(() => {
    const startThai = formatThaiDateLong(data.startDate);
    const endThai = data.isContinuous ? "ไม่มีกำหนด (สัญญาเช่าต่อเนื่อง)" : formatThaiDateLong(data.endDate);
    const rentStr = data.monthlyRate.toLocaleString("th-TH");
    const rentText = numberToThaiBahtText(data.monthlyRate);
    const depositVal = data.hasDeposit ? data.depositAmount : 0;
    const depositStr = depositVal.toLocaleString("th-TH");
    const depositText = numberToThaiBahtText(depositVal);

    const petSmokeRules: string[] = [];
    petSmokeRules.push(data.allowPets ? "อนุญาตให้เลี้ยงสัตว์ได้ตามข้อตกลง" : "ห้ามนำสัตว์เลี้ยงทุกชนิดเข้ามาเลี้ยงในอาคาร");
    if (data.noSmoking) {
      petSmokeRules.push("ห้ามสูบบุหรี่ภายในห้องพักและตัวอาคารโดยเด็ดขาด");
    }

    return data.clauses.map((clause) => {
      const resolvedContent = clause.content
        .replace(/\[หมายเลขห้อง\]/g, data.roomNumber)
        .replace(/\[ชั้น\]/g, String(data.floor))
        .replace(/\[ประเภทห้อง\]/g, data.roomType)
        .replace(/\[ที่อยู่หอพัก\]/g, `${data.propertyName} เลขที่ ${data.propertyAddress}`)
        .replace(/\[วันเริ่มสัญญา\]/g, startThai)
        .replace(/\[วันสิ้นสุดสัญญา\]/g, endThai)
        .replace(/\[ค่าเช่า\]/g, rentStr)
        .replace(/\[ค่าเช่าตัวอักษร\]/g, rentText)
        .replace(/\[วันกำหนดชำระ\]/g, String(data.paymentDueDay))
        .replace(/\[ค่าปรับ\]/g, data.lateFeePerDay.toLocaleString("th-TH"))
        .replace(/\[จำนวนวันค้างชำระที่อนุญาต\]/g, String(data.overdueGraceDays))
        .replace(/\[เงินประกัน\]/g, depositStr)
        .replace(/\[เงินประกันตัวอักษร\]/g, depositText)
        .replace(/\[จำนวนวันคืนเงินประกัน\]/g, String(data.depositRefundDays))
        .replace(/\[จำนวนวันแจ้งล่วงหน้า\]/g, String(data.noticeDays))
        .replace(/\[ค่าน้ำ\]/g, String(data.waterRate))
        .replace(/\[ค่าไฟ\]/g, String(data.electricRate))
        .replace(/\[เงื่อนไขสัตว์เลี้ยงและบุหรี่\]/g, petSmokeRules.join(" และ"));

      return {
        ...clause,
        resolvedContent,
      };
    });
  }, [data]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleResetDefault = () => {
    setData(mergedInitial);
  };

  const handleQuickAddFee = (name: string, amount: number) => {
    setData((prev) => ({
      ...prev,
      additionalFees: [
        ...prev.additionalFees,
        {
          id: `fee-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name,
          amount,
          isEnabled: true,
        },
      ],
    }));
  };

  const handleRemoveFee = (id: string) => {
    setData((prev) => ({
      ...prev,
      additionalFees: prev.additionalFees.filter((f) => f.id !== id),
    }));
  };

  const cleanText = (val?: string) => {
    if (!val || val.trim() === "" || val.trim() === "-") return "";
    return val.trim();
  };

  return (
    <div className="min-h-screen w-full bg-[#F4F3EF] text-slate-900 flex flex-col justify-between relative font-sans print:bg-white print:min-h-0">
      {/* Global Print Page Style */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 14mm 16mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
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
                    ตัวอย่างเอกสารสัญญาเช่าสำหรับพิมพ์ (A4)
                  </h1>
                  <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    รูปแบบสัญญาเช่ามาตรฐาน
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  แสดงตารางสรุปยอดชำระเฉพาะรายการที่เปิดใช้งาน พร้อมข้อสัญญามาตรฐาน
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

        </header>

      {/* ==================== MAIN A4 PAPER VIEWPORT ==================== */}
      <main className="flex-1 py-6 sm:py-10 px-3 sm:px-6 flex flex-col items-center print:p-0">
        {/* A4 DOCUMENT SHEET (รูปแบบตามไฟล์ ตัวอย่างสัญญาเช่า.pdf) */}
        <article className="w-full max-w-[210mm] min-h-[297mm] bg-white text-black rounded-sm shadow-xl border border-slate-300 px-8 sm:px-14 py-10 sm:py-12 print:shadow-none print:border-none print:rounded-none print:p-0 print:max-w-none space-y-5 text-[13.5px] leading-[1.85]">
          {/* 1. ชื่อเรื่องสัญญา (กึ่งกลางหน้ากระดาษ ตามตัวอย่างสัญญาเช่า.pdf) */}
          <div className="text-center space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-black">
              สัญญาเช่าห้องพักอาศัย
            </h1>
            <div className="text-xs text-slate-600 font-medium">
              เลขที่สัญญา <span className="font-semibold text-black">{data.contractNumber}</span> • ห้องพักเลขที่{" "}
              <span className="font-semibold text-black">{data.roomNumber}</span> (ชั้น {data.floor} - {data.roomType})
            </div>
          </div>

          {/* 2. ทำที่ / วันที่ เดือน พ.ศ. (ชิดขวา ตามตัวอย่างสัญญาเช่า.pdf) */}
          <div className="flex justify-end pt-1">
            <div className="w-full sm:w-[62%] space-y-1 text-[13.5px]">
              <div className="flex items-baseline gap-1.5">
                <span className="shrink-0">ทำที่</span>
                <span className="flex-1 border-b border-dotted border-slate-600 px-2 font-semibold text-black">
                  {data.propertyName}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="shrink-0">วันที่</span>
                <span className="w-14 text-center border-b border-dotted border-slate-600 font-semibold text-black">
                  {contractDateParts.day}
                </span>
                <span className="shrink-0">เดือน</span>
                <span className="flex-1 text-center border-b border-dotted border-slate-600 font-semibold text-black">
                  {contractDateParts.month}
                </span>
                <span className="shrink-0">พ.ศ.</span>
                <span className="w-20 text-center border-b border-dotted border-slate-600 font-semibold text-black">
                  {contractDateParts.year}
                </span>
              </div>
            </div>
          </div>

          {/* 3. ข้อมูลคู่สัญญา (ผู้ให้เช่า & ผู้เช่า ตามตัวอย่างสัญญาเช่า.pdf) */}
          <div className="space-y-1.5 pt-1 text-justify">
            <p className="indent-10">
              สัญญาเช่าฉบับนี้ทำขึ้นระหว่าง{" "}
              <span className="border-b border-dotted border-slate-600 px-2 font-bold text-black">
                {data.propertyName}
              </span>{" "}
              ตั้งอยู่เลขที่{" "}
              <span className="border-b border-dotted border-slate-600 px-2 font-semibold text-black">
                {data.propertyAddress}
              </span>{" "}
              โทรศัพท์{" "}
              <span className="border-b border-dotted border-slate-600 px-2 font-semibold text-black">
                {data.propertyPhone}
              </span>{" "}
              ซึ่งต่อไปในสัญญานี้จะเรียกว่า <strong>&ldquo;ผู้ให้เช่า&rdquo;</strong> ฝ่ายหนึ่ง กับ
            </p>

            <p className="indent-10">
              <span className="border-b border-dotted border-slate-600 px-2 font-bold text-black">
                {data.fullName}
              </span>{" "}
              เลขประจำตัวประชาชน{" "}
              <span className="border-b border-dotted border-slate-600 px-2 font-semibold text-black">
                {data.idCard}
              </span>
              {data.age ? (
                <>
                  {" "}
                  อายุ{" "}
                  <span className="border-b border-dotted border-slate-600 px-2 font-semibold text-black">
                    {data.age}
                  </span>{" "}
                  ปี
                </>
              ) : null}{" "}
              อยู่บ้านเลขที่{" "}
              <span className="border-b border-dotted border-slate-600 px-2 font-semibold text-black">
                {cleanText(data.address) || "...................................................................................."}
              </span>{" "}
              โทรศัพท์{" "}
              <span className="border-b border-dotted border-slate-600 px-2 font-semibold text-black">
                {data.phone}
              </span>
              {cleanText(data.lineId) ? (
                <>
                  {" "}
                  LINE ID{" "}
                  <span className="border-b border-dotted border-slate-600 px-1.5 font-semibold text-black">
                    {data.lineId}
                  </span>
                </>
              ) : null}
              {cleanText(data.email) ? (
                <>
                  {" "}
                  อีเมล{" "}
                  <span className="border-b border-dotted border-slate-600 px-1.5 font-semibold text-black">
                    {data.email}
                  </span>
                </>
              ) : null}
              {cleanText(data.vehiclePlate) ? (
                <>
                  {" "}
                  ทะเบียนรถ{" "}
                  <span className="border-b border-dotted border-slate-600 px-1.5 font-semibold text-black">
                    {data.vehiclePlate}
                  </span>
                </>
              ) : null}
              {cleanText(data.emergencyContact) ? (
                <>
                  {" "}
                  บุคคลติดต่อฉุกเฉิน{" "}
                  <span className="border-b border-dotted border-slate-600 px-1.5 font-semibold text-black">
                    {data.emergencyContact}
                  </span>
                </>
              ) : null}
              {cleanText(data.taxId) ? (
                <>
                  {" "}
                  เลขประจำตัวผู้เสียภาษี{" "}
                  <span className="border-b border-dotted border-slate-600 px-1.5 font-semibold text-black">
                    {data.taxId}
                  </span>
                </>
              ) : null}{" "}
              ซึ่งต่อไปนี้ในสัญญานี้จะเรียกว่า <strong>&ldquo;ผู้เช่า&rdquo;</strong> อีกฝ่ายหนึ่ง
              ทั้งสองฝ่ายได้ตกลงทำสัญญาเช่ากันมีข้อความดังนี้
            </p>
          </div>

          {/* 4. ข้อสัญญาเช่า (เรียงย่อหน้า ข้อ ๑ - ข้อ ๑๔ แบบทางการเหมือนใน PDF) */}
          <div className="space-y-2 text-justify">
            {resolvedClauses.map((clause, index) => (
              <p key={clause.id} className="indent-10 leading-[1.8]">
                <strong>
                  ข้อ {toThaiDigits(index + 1)}. ({clause.title})
                </strong>{" "}
                {clause.resolvedContent}
              </p>
            ))}

            {data.additionalRules && data.additionalRules.filter(Boolean).length > 0 && (
              <p className="indent-10 leading-[1.8]">
                <strong>ข้อกำหนดและระเบียบเพิ่มเติมแนบท้ายสัญญา:</strong>{" "}
                {data.additionalRules.map((r, i) => `(${i + 1}) ${r}`).join(" ")}
              </p>
            )}

            {cleanText(data.notes) && (
              <p className="indent-10 leading-[1.8]">
                <strong>หมายเหตุ / ข้อตกลงพิเศษ:</strong> {data.notes}
              </p>
            )}
          </div>

          {/* 5. ตารางสรุปรายการค่าใช้จ่ายที่ต้องชำระ (แสดงเฉพาะรายการที่เปิดใช้งานเท่านั้น) */}
          <div className="pt-2 break-inside-avoid">
            <div className="font-bold text-black text-[13.5px] mb-1.5">
              ตารางสรุปรายการค่าเช่า เงินประกัน และค่าบริการที่ต้องชำระตามสัญญา (ห้อง {data.roomNumber})
            </div>
            <table className="w-full border-collapse border border-black text-[12.5px]">
              <thead>
                <tr className="bg-slate-100 text-black font-bold">
                  <th className="border border-black py-1.5 px-2.5 text-center w-12">ลำดับ</th>
                  <th className="border border-black py-1.5 px-3 text-left">รายการค่าใช้จ่ายที่ต้องชำระ</th>
                  <th className="border border-black py-1.5 px-3 text-center w-44">ประเภทการชำระ</th>
                  <th className="border border-black py-1.5 px-3 text-right w-36">จำนวนเงิน (บาท)</th>
                </tr>
              </thead>
              <tbody>
                {paymentRows.map((row, idx) => (
                  <tr key={row.id}>
                    <td className="border border-black py-1.5 px-2.5 text-center font-medium">
                      {idx + 1}
                    </td>
                    <td className="border border-black py-1.5 px-3">
                      <div className="font-semibold text-black">{row.title}</div>
                      <div className="text-[11px] text-slate-600">{row.detail}</div>
                    </td>
                    <td className="border border-black py-1.5 px-3 text-center text-slate-800">
                      {row.paymentType}
                    </td>
                    <td className="border border-black py-1.5 px-3 text-right font-bold text-black">
                      {row.amount.toLocaleString("th-TH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold text-black">
                  <td className="border border-black py-2 px-3" colSpan={3}>
                    <div>รวมจำนวนเงินที่ต้องชำระทั้งสิ้น ณ วันทำสัญญา</div>
                    <div className="text-[11.5px] font-normal text-slate-700">
                      ตัวอักษร: <strong>({numberToThaiBahtText(totalUpfront)})</strong>
                    </div>
                  </td>
                  <td className="border border-black py-2 px-3 text-right text-sm font-black text-black">
                    {totalUpfront.toLocaleString("th-TH", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                </tr>
                <tr className="text-[11.5px] text-slate-800 bg-white">
                  <td className="border border-black py-1.5 px-3" colSpan={3}>
                    <strong>ยอดชำระรายเดือนรอบบิลถัดไป</strong> (ชำระภายในวันที่ {data.paymentDueDay} ของทุกเดือน ไม่รวมค่าน้ำประปา ฿{data.waterRate}/หน่วย และค่าไฟฟ้า ฿{data.electricRate}/หน่วย ตามมิเตอร์ที่ใช้จริง)
                  </td>
                  <td className="border border-black py-1.5 px-3 text-right font-bold text-black">
                    {totalMonthlyRecurring.toLocaleString("th-TH", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    / เดือน
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 6. ช่องลงลายมือชื่อคู่สัญญาและพยาน (ตามหน้า 3 ของ ตัวอย่างสัญญาเช่า.pdf) */}
          <div className="pt-6 break-inside-avoid">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-7 text-center text-[13px] pt-2">
              {/* ผู้ให้เช่า */}
              <div className="space-y-1">
                <div>
                  ลงชื่อ............................................................ผู้ให้เช่า
                </div>
                <div>
                  ( <span className="font-semibold">{data.propertyName}</span> )
                </div>
              </div>

              {/* ผู้เช่า */}
              <div className="space-y-1">
                <div>
                  ลงชื่อ............................................................ผู้เช่า
                </div>
                <div>
                  ( <span className="font-semibold">{data.fullName}</span> )
                </div>
              </div>

              {/* พยาน 1 */}
              <div className="space-y-1">
                <div>
                  ลงชื่อ............................................................พยาน
                </div>
                <div>(............................................................)</div>
              </div>

              {/* พยาน 2 */}
              <div className="space-y-1">
                <div>
                  ลงชื่อ............................................................พยาน
                </div>
                <div>(............................................................)</div>
              </div>
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}
