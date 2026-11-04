"use client";

import React, { useState, useRef, useEffect } from "react";
import { Room, Tenant, ContractClause, AdditionalFeeItem } from "@/types/dormitory";
import {
  ArrowLeft,
  UserPlus,
  Upload,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Image as ImageIcon,
  X,
  FileText,
  Car,
  Globe,
  Tv,
  Check,
  Calendar,
  Sparkles,
  Info,
  DollarSign,
  Building,
  Wifi,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  Layers,
  HelpCircle,
  FileSignature,
  Printer,
} from "lucide-react";
import {
  isValidThaiIdCard,
  formatThaiIdCard,
  isValidThaiPhone,
  formatThaiPhone,
  isValidEmail,
  isDateAfter,
} from "@/lib/validators";
import { globalPopup } from "@/lib/popup-context";

// Standard 14 Legal Clauses (ข้อสัญญามาตรฐาน 14 ข้อ)
const DEFAULT_CONTRACT_CLAUSES: ContractClause[] = [
  {
    id: 1,
    title: "ห้องพักที่เช่า",
    content: "ผู้เช่าตกลงเช่าและผู้ให้เช่าตกลงให้เช่าห้องพักเลขที่ [หมายเลขห้อง] ชั้น [ชั้น] ตั้งอยู่ที่ [ที่อยู่หอพัก] เพื่อใช้เป็นที่พักอาศัยเท่านั้น ห้ามใช้เพื่อประโยชน์อื่นใดโดยมิได้รับความยินยอมเป็นลายลักษณ์อักษรจากผู้ให้เช่า",
  },
  {
    id: 2,
    title: "ระยะเวลาการเช่า",
    content: "สัญญาเช่าฉบับนี้กำหนดระยะเวลา ตั้งแต่วันที่ [วันเริ่มสัญญา] ถึงวันที่ [วันสิ้นสุดสัญญา] หากผู้เช่าประสงค์จะต่อสัญญา จะต้องแจ้งให้ผู้ให้เช่าทราบล่วงหน้าไม่น้อยกว่า 30 วันก่อนวันสิ้นสุดสัญญา",
  },
  {
    id: 3,
    title: "ค่าเช่า",
    content: "ผู้เช่าตกลงชำระค่าเช่าให้แก่ผู้ให้เช่าเดือนละ [ค่าเช่า] บาท ([ค่าเช่าตัวอักษร]) ภายในวันที่ [วันกำหนดชำระ] ของทุกเดือน หากชำระล่าช้าจะต้องเสียค่าปรับวันละ [ค่าปรับ] บาท",
  },
  {
    id: 4,
    title: "เงินประกัน",
    content: "ผู้เช่าได้วางเงินประกันจำนวน [เงินประกัน] บาท ให้แก่ผู้ให้เช่า เงินประกันจะคืนให้ภายใน [จำนวนวันคืนเงินประกัน] วัน หลังจากวันสิ้นสุดสัญญาและย้ายออก หากไม่มีค่าเสียหายหรือค่าน้ำไฟค้างชำระ",
  },
  {
    id: 5,
    title: "ค่าสาธารณูปโภค",
    content: "ผู้เช่าตกลงชำระค่าสาธารณูปโภค ได้แก่ ค่าน้ำประปา ค่าไฟฟ้า ค่าบริการส่วนกลาง ค่าอินเทอร์เน็ต ตามอัตราที่หอพักกำหนด โดยชำระพร้อมกับค่าเช่าประจำเดือน",
  },
  {
    id: 6,
    title: "เฟอร์นิเจอร์และอุปกรณ์",
    content: "ผู้เช่าตกลงรับมอบห้องพักพร้อมเฟอร์นิเจอร์และอุปกรณ์ตามรายการที่ตรวจรับ ผู้เช่าจะบำรุงรักษาทรัพย์สินดังกล่าวให้อยู่ในสภาพดี หากเกิดความเสียหายต้องรับผิดชอบค่าซ่อมแซมหรือชดใช้",
  },
  {
    id: 7,
    title: "การดูแลรักษาห้องพัก",
    content: "ผู้เช่าจะต้องดูแลรักษาห้องพักให้มีสุขอนามัยเรียบร้อย สะอาด ไม่ทำลายทรัพย์สินของผู้ให้เช่า และไม่ดัดแปลงหรือต่อเติมห้องพักโดยไม่ได้รับอนุญาต",
  },
  {
    id: 8,
    title: "การใช้ห้องพัก",
    content: "ผู้เช่าจะไม่กระทำการอันเป็นการรบกวนความสงบสุขของผู้อื่น ไม่ประกอบกิจกรรมผิดกฎหมาย เก็บวัตถุอันตรายหรือสารเสพติด และต้องไม่กระทำการใดๆ ที่เป็นการรบกวนผู้อยู่อาศัยอื่น",
  },
  {
    id: 9,
    title: "ผู้พักอาศัย",
    content: "ผู้เช่าจะพักอาศัยตามจำนวนคนที่ตกลงไว้ หากมีบุคคลอื่นมาพักร่วมจะต้องได้รับอนุญาตและแจ้งให้ทราบและเสียค่าบริการเพิ่มเติม ห้ามนำบุคคลภายนอกเข้ามาพักอาศัยโดยพลการ",
  },
  {
    id: 10,
    title: "การซ่อมแซม",
    content: "หากมีความชำรุดเสียหายจากการใช้งานปกติ ผู้ให้เช่าจะเป็นผู้รับผิดชอบซ่อมแซม แต่หากเกิดจากความผิดของผู้เช่า ผู้เช่าต้องเป็นผู้รับผิดชอบค่าซ่อมแซมเอง",
  },
  {
    id: 11,
    title: "การตรวจสอบห้องพัก",
    content: "ผู้ให้เช่ามีสิทธิ์เข้าตรวจสอบห้องพักได้ โดยแจ้งให้ผู้เช่าทราบล่วงหน้าอย่างน้อย 24 ชั่วโมง ยกเว้นกรณีฉุกเฉิน",
  },
  {
    id: 12,
    title: "การบอกเลิกสัญญา",
    content: "หากผู้เช่าประสงค์จะบอกเลิกสัญญาก่อนครบกำหนด จะต้องแจ้งให้ผู้ให้เช่าทราบล่วงหน้าไม่น้อยกว่า [จำนวนวันแจ้งล่วงหน้า] วัน มิฉะนั้นจะถูกริบเงินประกัน",
  },
  {
    id: 13,
    title: "การผิดสัญญา",
    content: "หากผู้เช่าผิดข้อตกลงในสัญญาข้อใดข้อหนึ่ง ผู้ให้เช่ามีสิทธิ์บอกเลิกสัญญาได้ทันที โดยผู้เช่าไม่มีสิทธิ์เรียกร้องค่าเสียหายใดๆ",
  },
  {
    id: 14,
    title: "ข้อตกลงทั่วไป",
    content: "สัญญาฉบับนี้ทำขึ้นเป็นสองฉบับ มีข้อความถูกต้องตรงกัน ทั้งสองฝ่ายได้อ่านและเข้าใจข้อความในสัญญาโดยละเอียดแล้ว จึงลงลายมือชื่อไว้เป็นหลักฐานต่อหน้าพยาน",
  },
];

interface TenantRegistrationViewProps {
  rooms: Room[];
  initialRoomId?: string;
  onBack: () => void;
  onSubmit: (tenantData: {
    roomId: string;
    fullName: string;
    phone: string;
    idCard: string;
    gender?: "MALE" | "FEMALE" | "OTHER";
    age?: number;
    lineId?: string;
    taxId?: string;
    email?: string;
    address?: string;
    emergencyContact?: string;
    vehiclePlate?: string;
    idCardImageUrl?: string;
    invoiceLang?: "TH" | "EN";
    notes?: string;
    startDate?: string;
    endDate?: string;
    depositAmount?: number;
    hasDeposit?: boolean;
    hasTv?: boolean;
    tvRentalFee?: number;
    hasFridge?: boolean;
    fridgeRentalFee?: number;
    hasCommonFee?: boolean;
    commonFee?: number;
    hasWifi?: boolean;
    wifiFee?: number;
    hasParking?: boolean;
    parkingFee?: number;
    additionalFees?: AdditionalFeeItem[];
    paymentDueDay?: number;
    lateFeePerDay?: number;
    electricalEquipmentFee?: number;
    furnitureFee?: number;
    isContinuous?: boolean;
    noticeDays?: number;
    depositRefundDays?: number;
    overdueGraceDays?: number;
    allowPets?: boolean;
    noSmoking?: boolean;
    additionalRules?: string[];
    clauses?: ContractClause[];
  }) => Promise<void> | void;
  existingTenants?: Tenant[];
}

export function TenantRegistrationView({
  rooms,
  initialRoomId,
  onBack,
  onSubmit,
  existingTenants,
}: TenantRegistrationViewProps) {
  // Vacant rooms only
  const vacantRooms = rooms.filter((r) => r.status === "vacant" && !r.currentTenant);
  const matchedInitial = initialRoomId ? vacantRooms.find((r) => r.id === initialRoomId) : undefined;
  const defaultRoom = matchedInitial || vacantRooms[0];

  const [roomId, setRoomId] = useState<string>(defaultRoom?.id || "");
  const selectedRoom = rooms.find((r) => r.id === roomId);

  // 14 Tenant Fields
  const [fullName, setFullName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [idCard, setIdCard] = useState<string>("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER">("MALE");
  const [age, setAge] = useState<string>("");
  const [lineId, setLineId] = useState<string>("");
  const [taxId, setTaxId] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [emergencyContact, setEmergencyContact] = useState<string>("");
  const [vehiclePlate, setVehiclePlate] = useState<string>("");
  const [invoiceLang, setInvoiceLang] = useState<"TH" | "EN">("TH");
  const [notes, setNotes] = useState<string>("");

  // Lease Dates
  const todayStr = new Date().toISOString().split("T")[0];
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  const nextYearStr = nextYear.toISOString().split("T")[0];

  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(nextYearStr);

  // Feature Toggles: Deposit, TV, Fridge, Common Fee, WiFi, Parking
  const [hasDeposit, setHasDeposit] = useState<boolean>(true);
  const [depositAmount, setDepositAmount] = useState<number>(
    defaultRoom ? defaultRoom.monthlyRate * 2 : 8000
  );

  const [hasTv, setHasTv] = useState<boolean>(false);
  const [tvRentalFee, setTvRentalFee] = useState<number>(300);

  const [hasFridge, setHasFridge] = useState<boolean>(false);
  const [fridgeRentalFee, setFridgeRentalFee] = useState<number>(300);

  // Dynamic Additional Fees (ปุ่ม ADD เพื่อให้ผู้ใช้สามารถเพิ่มรายการได้ตามต้องการ)
  const [additionalFees, setAdditionalFees] = useState<AdditionalFeeItem[]>([]);

  const handleAddFee = (name = "", defaultAmount = 300) => {
    const newFee: AdditionalFeeItem = {
      id: `fee-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      amount: defaultAmount,
      isEnabled: true,
    };
    setAdditionalFees((prev) => [...prev, newFee]);
  };

  const handleUpdateFee = (id: string, updates: Partial<AdditionalFeeItem>) => {
    setAdditionalFees((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const handleRemoveFee = (id: string) => {
    setAdditionalFees((prev) => prev.filter((f) => f.id !== id));
  };

  // Financial & Contract Details (Image 2)
  const [paymentDueDay, setPaymentDueDay] = useState<number>(5);
  const [lateFeePerDay, setLateFeePerDay] = useState<number>(100);
  const [electricalEquipmentFee, setElectricalEquipmentFee] = useState<number>(0);
  const [furnitureFee, setFurnitureFee] = useState<number>(0);
  const [isContinuous, setIsContinuous] = useState<boolean>(false);

  // Lease Conditions (Image 5)
  const [noticeDays, setNoticeDays] = useState<number>(30);
  const [depositRefundDays, setDepositRefundDays] = useState<number>(7);
  const [overdueGraceDays, setOverdueGraceDays] = useState<number>(7);
  const [allowPets, setAllowPets] = useState<boolean>(false);
  const [noSmoking, setNoSmoking] = useState<boolean>(true);
  const [newRuleInput, setNewRuleInput] = useState<string>("");
  const [additionalRules, setAdditionalRules] = useState<string[]>([]);

  // 14 Standard Contract Clauses (Images 3 & 4)
  const [clauses, setClauses] = useState<ContractClause[]>(DEFAULT_CONTRACT_CLAUSES);
  const [expandedClauseIds, setExpandedClauseIds] = useState<number[]>([1]);

  const handleToggleClauseExpand = (id: number) => {
    setExpandedClauseIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleUpdateClauseTitle = (id: number, title: string) => {
    setClauses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c))
    );
  };

  const handleUpdateClauseContent = (id: number, content: string) => {
    setClauses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, content } : c))
    );
  };

  const handleDeleteClause = (id: number) => {
    setClauses((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddClause = () => {
    const nextId = clauses.length > 0 ? Math.max(...clauses.map((c) => c.id)) + 1 : 1;
    const newClause: ContractClause = {
      id: nextId,
      title: `ข้อ ${nextId} ข้อสัญญาเพิ่มเติม`,
      content: "",
    };
    setClauses((prev) => [...prev, newClause]);
    setExpandedClauseIds((prev) => [...prev, nextId]);
  };

  const handleAddRule = () => {
    if (!newRuleInput.trim()) return;
    setAdditionalRules((prev) => [...prev, newRuleInput.trim()]);
    setNewRuleInput("");
  };

  const handleRemoveRule = (index: number) => {
    setAdditionalRules((prev) => prev.filter((_, i) => i !== index));
  };

  // Smart OCR State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [idCardImage, setIdCardImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [ocrSuccess, setOcrSuccess] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Update default deposit when room changes
  useEffect(() => {
    if (selectedRoom) {
      setDepositAmount(selectedRoom.monthlyRate * 2);
    }
  }, [roomId]);

  // ID Card Upload & Smart OCR
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setIdCardImage(dataUrl);
      setIsScanning(true);
      setOcrSuccess(false);

      // Simulate Smart OCR AI
      setTimeout(() => {
        setIsScanning(false);
        setOcrSuccess(true);
        if (!fullName.trim()) setFullName("คุณนวรัตน์ มงคลสุข");
        if (!idCard.trim()) setIdCard("1-1004-98765-43-2");
        if (!address.trim()) setAddress("88/19 หมู่ 2 ต.สวนใหญ่ อ.เมืองนนทบุรี จ.นนทบุรี 11000");
        if (!age) setAge("28");
        if (!phone.trim()) setPhone("086-456-7890");
      }, 700);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIdCardImage(null);
    setFileName("");
    setOcrSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Financial Calculations
  const roomRent = selectedRoom?.monthlyRate || 0;
  const actualDeposit = hasDeposit ? Number(depositAmount) || 0 : 0;
  const actualTv = hasTv ? Number(tvRentalFee) || 0 : 0;
  const actualFridge = hasFridge ? Number(fridgeRentalFee) || 0 : 0;
  const actualEquipment = Number(electricalEquipmentFee) || 0;
  const actualFurniture = Number(furnitureFee) || 0;

  // Active additional fees (รายการที่เปิดใช้งานและมีราคามากกว่า 0)
  const activeAdditionalFees = additionalFees.filter((f) => f.isEnabled && (Number(f.amount) || 0) > 0);
  const additionalFeesTotal = additionalFees
    .filter((f) => f.isEnabled)
    .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);

  // Backward-compatibility detection
  const foundCommon = additionalFees.find(
    (f) => f.isEnabled && f.name.includes("ส่วนกลาง")
  );
  const foundWifi = additionalFees.find(
    (f) => f.isEnabled && (f.name.toLowerCase().includes("wifi") || f.name.includes("เน็ต"))
  );
  const foundParking = additionalFees.find(
    (f) => f.isEnabled && (f.name.includes("จอด") || f.name.toLowerCase().includes("parking"))
  );

  const actualCommon = foundCommon ? Number(foundCommon.amount) || 0 : 0;
  const actualWifi = foundWifi ? Number(foundWifi.amount) || 0 : 0;
  const actualParking = foundParking ? Number(foundParking.amount) || 0 : 0;

  // Monthly Recurring = Room + TV + Fridge + Additional Fees Total
  const monthlyRecurring = roomRent + actualTv + actualFridge + additionalFeesTotal;

  // Upfront Payment = Advance Rent (1st month) + Deposit + TV + Fridge + Additional Fees Total + Equipment + Furniture
  const totalUpfront =
    roomRent +
    actualDeposit +
    actualTv +
    actualFridge +
    additionalFeesTotal +
    actualEquipment +
    actualFurniture;

  const reportError = (msg: string) => {
    setErrorMessage(msg);
    globalPopup.show({
      level: "warning",
      title: "แจ้งเตือนการกรอกข้อมูล (กรุณาตรวจสอบ)",
      message: msg,
      confirmText: "เข้าใจแล้ว",
      hideCancel: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!roomId) {
      reportError("กรุณาเลือกห้องพักว่างที่ต้องการทำสัญญา");
      return;
    }
    if (!fullName.trim()) {
      reportError("กรุณาระบุชื่อ-นามสกุลของผู้เช่า");
      return;
    }
    if (!phone.trim()) {
      reportError("กรุณาระบุเบอร์โทรศัพท์ติดต่อของผู้เช่า");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    if (!isValidThaiPhone(cleanPhone)) {
      reportError("เบอร์โทรศัพท์ไม่ถูกต้อง (ต้องเป็น 10 หลัก ขึ้นต้นด้วย 0)");
      return;
    }
    if (!idCard.trim()) {
      reportError("กรุณาระบุเลขประจำตัวประชาชน 13 หลักของผู้เช่า");
      return;
    }
    const cleanId = idCard.replace(/\D/g, "");
    if (!isValidThaiIdCard(cleanId)) {
      reportError("เลขประจำตัวประชาชนไม่ถูกต้องตามมาตรฐาน 13 หลัก (กรุณาตรวจสอบความถูกต้องและ Checksum)");
      return;
    }
    // หมายเหตุ: ไม่ตรวจสอบเลขประจำตัวประชาชนซ้ำกับผู้เช่าปัจจุบันหรือผู้ที่เคยเข้าพักแล้ว เพื่อรองรับกรณีผู้เช่าเดิมกลับมาเช่าใหม่ หรือเช่าห้องเพิ่มมากกว่า 1 ห้อง
    if (email.trim() && !isValidEmail(email)) {
      reportError("รูปแบบอีเมลไม่ถูกต้อง (เช่น example@gmail.com)");
      return;
    }
    if (age && (Number(age) < 1 || Number(age) > 120)) {
      reportError("กรุณาระบุอายุที่ถูกต้อง (1 - 120 ปี)");
      return;
    }
    if (!isContinuous && !isDateAfter(endDate, startDate)) {
      reportError("วันสิ้นสุดสัญญาต้องอยู่หลังวันเริ่มต้นสัญญา");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        roomId,
        fullName: fullName.trim(),
        phone: phone.trim(),
        idCard: idCard.trim(),
        gender,
        age: age ? Number(age) : undefined,
        lineId: lineId.trim() || undefined,
        taxId: taxId.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        emergencyContact: emergencyContact.trim() || undefined,
        vehiclePlate: vehiclePlate.trim() || undefined,
        idCardImageUrl: idCardImage || undefined,
        invoiceLang,
        notes: notes.trim() || undefined,
        startDate,
        endDate: isContinuous ? "สัญญาต่อเนื่อง" : endDate,
        hasDeposit,
        depositAmount: actualDeposit,
        hasTv,
        tvRentalFee: actualTv,
        hasFridge,
        fridgeRentalFee: actualFridge,
        additionalFees: additionalFees.filter((f) => f.name.trim() !== ""),
        hasCommonFee: Boolean(foundCommon),
        commonFee: actualCommon,
        hasWifi: Boolean(foundWifi),
        wifiFee: actualWifi,
        hasParking: Boolean(foundParking),
        parkingFee: actualParking,
        paymentDueDay,
        lateFeePerDay,
        electricalEquipmentFee: actualEquipment,
        furnitureFee: actualFurniture,
        isContinuous,
        noticeDays,
        depositRefundDays,
        overdueGraceDays,
        allowPets,
        noSmoking,
        additionalRules,
        clauses,
      });
    } catch (err) {
      console.error(err);
      reportError("เกิดข้อผิดพลาดในการลงทะเบียนผู้เช่า กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Top Navigation & Action Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 rounded-xl bg-[var(--subtle)] hover:bg-emerald-500/10 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-[var(--border)] transition cursor-pointer flex items-center justify-center shrink-0 group"
            title="ย้อนกลับไปหน้ารายชื่อผู้เช่า"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] border border-emerald-500/30">
                <UserPlus className="w-3 h-3" />
                <span>หน้าลงทะเบียนแบบเต็มรูปแบบ (Full View)</span>
              </span>
              <span className="text-xs text-[var(--muted)]">/tenants/new</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[var(--foreground)] tracking-tight mt-1">
              ลงทะเบียนผู้เช่าใหม่และทำสัญญาเช่า
            </h1>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              จัดสรรห้องพัก สแกนบัตรประชาชนด้วย Smart OCR พร้อมเปิด/ปิดออปชันเงินประกันและเครื่องใช้ไฟฟ้า
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-[var(--subtle)] border border-[var(--border)] transition cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || vacantRooms.length === 0}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>กำลังบันทึกข้อมูล...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>บันทึกและเริ่มสัญญาเช่า</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main 2-Column Bento Grid */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Input Forms & Toggles */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Room Selection & Occupancy Check */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-[var(--foreground)]">
                    1. เลือกห้องพักที่ต้องการเข้าอยู่ (Room Allocation)
                  </h2>
                  <p className="text-[11px] text-[var(--muted)]">
                    แสดงเฉพาะห้องที่มีสถานะ "ว่าง (vacant)" พร้อมเข้าอยู่เท่านั้น
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                ว่าง {vacantRooms.length} ห้อง
              </span>
            </div>

            {vacantRooms.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  ไม่มีห้องพักว่างในขณะนี้
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  ห้องพักทุกห้องมีผู้เช่าหรืออยู่ระหว่างทำความสะอาด กรุณาเพิ่มห้องพักใหม่หรือทำเรื่องย้ายออกก่อน
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                    เลือกห้องพัก <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full text-xs font-semibold bg-[var(--subtle)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 focus:outline-emerald-500 transition cursor-pointer"
                    required
                  >
                    {vacantRooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        ห้อง {r.roomNumber} (ชั้น {r.floor} • {r.type} • ฿{r.monthlyRate.toLocaleString()}/ด.)
                      </option>
                    ))}
                  </select>
                </div>

                {selectedRoom && (
                  <div className="p-3 rounded-xl bg-[var(--subtle)] border border-[var(--border)] flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-[var(--muted)]">อัตราค่าเช่ามาตรฐาน</div>
                      <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                        ฿{selectedRoom.monthlyRate.toLocaleString()}{" "}
                        <span className="text-xs font-normal text-[var(--muted)]">/เดือน</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-[var(--muted)]">ชั้น / ประเภท</div>
                      <div className="text-xs font-bold text-[var(--foreground)]">
                        ชั้น {selectedRoom.floor} • {selectedRoom.type}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card 2: Smart OCR Thai ID Card & Document Upload */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-[var(--foreground)]">
                    2. อัปโหลดรูปบัตรประชาชน & Smart OCR ดึงข้อมูลอัตโนมัติ
                  </h2>
                  <p className="text-[11px] text-[var(--muted)]">
                    ระบบ AI จะอ่านชื่อ, เลข 13 หลัก, วันเกิด และที่อยู่จากรูปถ่ายบัตรประชาชนให้อัตโนมัติ
                  </p>
                </div>
              </div>
              {ocrSuccess && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>ดึงข้อมูลสำเร็จ</span>
                </span>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />

            {!idCardImage ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--border)] hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition bg-[var(--subtle)] hover:bg-emerald-500/5 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 group-hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2 transition">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-[var(--foreground)]">
                  คลิกเพื่ออัปโหลดรูปถ่ายบัตรประชาชนของผู้เช่า
                </div>
                <div className="text-[11px] text-[var(--muted)] mt-0.5">
                  รองรับไฟล์ PNG, JPG, JPEG (ขนาดไม่เกิน 10MB)
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-[var(--subtle)] border border-[var(--border)]">
                <div className="relative w-36 h-24 rounded-lg overflow-hidden bg-black/10 shrink-0 border border-[var(--border)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={idCardImage} alt="ID Card Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-rose-600 transition cursor-pointer"
                    title="ลบรูปภาพ"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex-1 min-w-0 text-xs">
                  <div className="font-bold text-[var(--foreground)] truncate">{fileName}</div>
                  <div className="text-[11px] text-[var(--muted)] mt-0.5">
                    {isScanning ? (
                      <span className="text-amber-500 font-semibold flex items-center gap-1.5">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        กำลังประมวลผล Smart OCR แยกข้อความ...
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        AI ถอดข้อความลงในแบบฟอร์มด้านล่างเรียบร้อยแล้ว
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 3: 14 Tenant Personal Details */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
            <div className="border-b border-[var(--border)] pb-3">
              <h2 className="font-bold text-sm text-[var(--foreground)]">
                3. ข้อมูลประวัติผู้เช่า (Tenant Profile - 14 ฟิลด์)
              </h2>
              <p className="text-[11px] text-[var(--muted)]">
                ข้อมูลส่วนบุคคล การติดต่อฉุกเฉิน และยานพาหนะสำหรับบันทึกในทะเบียนผู้เช่า
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  ชื่อ - นามสกุล <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="เช่น คุณนวรัตน์ มงคลสุข"
                  className="w-full text-xs bg-[var(--subtle)] border border-[var(--border)] rounded-xl px-3 py-2 focus:outline-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  เบอร์โทรศัพท์ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  maxLength={12}
                  value={phone}
                  onChange={(e) => setPhone(formatThaiPhone(e.target.value))}
                  placeholder="08X-XXX-XXXX"
                  className="w-full text-xs bg-[var(--subtle)] border border-[var(--border)] rounded-xl px-3 py-2 focus:outline-emerald-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  เลขบัตรประชาชน (13 หลัก) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={17}
                  value={idCard}
                  onChange={(e) => setIdCard(formatThaiIdCard(e.target.value))}
                  placeholder="1-XXXX-XXXXX-XX-X"
                  className="w-full text-xs bg-[var(--subtle)] border border-[var(--border)] rounded-xl px-3 py-2 focus:outline-emerald-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">เพศ</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full text-xs bg-[var(--subtle)] border border-[var(--border)] rounded-xl px-3 py-2 focus:outline-emerald-500"
                >
                  <option value="MALE">ชาย (Male)</option>
                  <option value="FEMALE">หญิง (Female)</option>
                  <option value="OTHER">อื่นๆ (Other)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">อายุ (ปี)</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="เช่น 28"
                  className="w-full text-xs bg-[var(--subtle)] border border-[var(--border)] rounded-xl px-3 py-2 focus:outline-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">LINE ID</label>
                <input
                  type="text"
                  maxLength={50}
                  value={lineId}
                  onChange={(e) => setLineId(e.target.value)}
                  placeholder="เช่น somchai_line"
                  className="w-full text-xs bg-[var(--subtle)] border border-[var(--border)] rounded-xl px-3 py-2 focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">อีเมล (Email)</label>
                <input
                  type="email"
                  maxLength={100}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tenant@email.com"
                  className="w-full text-xs bg-[var(--subtle)] border border-[var(--border)] rounded-xl px-3 py-2 focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  ป้ายทะเบียนรถ (ถ้ามี)
                </label>
                <input
                  type="text"
                  maxLength={20}
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  placeholder="เช่น 1กก 9999 กทม."
                  className="w-full text-xs bg-[var(--subtle)] border border-[var(--border)] rounded-xl px-3 py-2 focus:outline-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  ที่อยู่ตามบัตรประชาชน / ทะเบียนบ้าน
                </label>
                <input
                  type="text"
                  maxLength={300}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="บ้านเลขที่ หมู่ ซอย ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"
                  className="w-full text-xs bg-[var(--subtle)] border border-[var(--border)] rounded-xl px-3 py-2 focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  ผู้ติดต่อฉุกเฉิน (ชื่อ & เบอร์)
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="เช่น มารดา 081-234-5678"
                  className="w-full text-xs bg-[var(--subtle)] border border-[var(--border)] rounded-xl px-3 py-2 focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  เลขประจำตัวผู้เสียภาษี (Tax ID)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={13}
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value.replace(/\D/g, "").slice(0, 13))}
                  placeholder="ระบุเฉพาะกรณีนิติบุคคล/หัก ณ ที่จ่าย"
                  className="w-full text-xs bg-[var(--subtle)] border border-[var(--border)] rounded-xl px-3 py-2 focus:outline-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  ภาษาใบแจ้งหนี้ (Invoice Language)
                </label>
                <select
                  value={invoiceLang}
                  onChange={(e) => setInvoiceLang(e.target.value as any)}
                  className="w-full text-xs bg-[var(--subtle)] border border-[var(--border)] rounded-xl px-3 py-2 focus:outline-emerald-500"
                >
                  <option value="TH">ภาษาไทย (TH - ค่าเริ่มต้น)</option>
                  <option value="EN">English (EN)</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  หมายเหตุเพิ่มเติม / ข้อตกลงพิเศษ
                </label>
                <input
                  type="text"
                  maxLength={500}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="เช่น ขอโต๊ะทำงานเพิ่ม, เข้าพัก 2 คน, มีสัตว์เลี้ยงขนาดเล็ก ฯลฯ"
                  className="w-full text-xs bg-[var(--subtle)] border border-[var(--border)] rounded-xl px-3 py-2 focus:outline-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Card 4: Lease Agreement, Financial Details & Service Toggles */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
            <div className="border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-[var(--foreground)]">
                    4. ห้องพักและระยะเวลา & รายละเอียดทางการเงิน
                  </h2>
                  <p className="text-[11px] text-[var(--muted)]">
                    กำหนดระยะเวลาสัญญา วันตัดรอบบิล และสวิตช์เปิด/ปิดบริการเสริมรายห้องพัก
                  </p>
                </div>
              </div>
            </div>

            {/* Dates & Period */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  วันที่เริ่มต้นสัญญา (Start Date) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs bg-[var(--subtle)] border border-[var(--border)] rounded-xl px-3 py-2 focus:outline-emerald-500"
                  required
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[var(--foreground)]">
                    วันที่สิ้นสุดสัญญา (End Date) <span className="text-rose-500">*</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-[var(--muted)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isContinuous}
                      onChange={(e) => setIsContinuous(e.target.checked)}
                      className="rounded text-emerald-600 cursor-pointer"
                    />
                    <span>ไม่มีวันสิ้นสุดสัญญา (สัญญาต่อเนื่อง)</span>
                  </label>
                </div>
                <input
                  type="date"
                  disabled={isContinuous}
                  value={isContinuous ? "" : endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs bg-[var(--subtle)] border border-[var(--border)] rounded-xl px-3 py-2 focus:outline-emerald-500 disabled:opacity-40"
                  required={!isContinuous}
                />
              </div>
            </div>

            {/* Financial Details (Image 2) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  วันกำหนดชำระของทุกเดือน
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={paymentDueDay}
                    onChange={(e) => setPaymentDueDay(Number(e.target.value))}
                    className="w-full text-xs bg-[var(--subtle)] border border-[var(--border)] rounded-xl px-3 py-2 pr-10 focus:outline-emerald-500 font-bold"
                  />
                  <span className="absolute right-2.5 top-2 text-[11px] text-[var(--muted)]">ของเดือน</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  ค่าปรับชำระล่าช้า (บาท/วัน)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={lateFeePerDay}
                    onChange={(e) => setLateFeePerDay(Number(e.target.value))}
                    className="w-full text-xs bg-[var(--subtle)] border border-[var(--border)] rounded-xl px-3 py-2 pr-8 focus:outline-emerald-500 font-bold"
                  />
                  <span className="absolute right-2.5 top-2 text-[11px] text-[var(--muted)]">฿</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  ค่าอุปกรณ์ไฟฟ้า (บาท)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={electricalEquipmentFee}
                    onChange={(e) => setElectricalEquipmentFee(Number(e.target.value))}
                    className="w-full text-xs bg-[var(--subtle)] border border-[var(--border)] rounded-xl px-3 py-2 pr-8 focus:outline-emerald-500"
                  />
                  <span className="absolute right-2.5 top-2 text-[11px] text-[var(--muted)]">฿</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  ค่าครุภัณฑ์/เฟอร์นิเจอร์ (บาท)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={furnitureFee}
                    onChange={(e) => setFurnitureFee(Number(e.target.value))}
                    className="w-full text-xs bg-[var(--subtle)] border border-[var(--border)] rounded-xl px-3 py-2 pr-8 focus:outline-emerald-500"
                  />
                  <span className="absolute right-2.5 top-2 text-[11px] text-[var(--muted)]">฿</span>
                </div>
              </div>
            </div>

            {/* TOGGLE 1: Security Deposit */}
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--subtle)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-[var(--foreground)] flex items-center gap-2">
                      <span>เงินประกันมัดจำความเสียหาย (Security Deposit)</span>
                      {hasDeposit ? (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-300">
                          เปิดใช้งาน
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          ปิด (ไม่เรียกเก็บ)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--muted)]">
                      ค่าเริ่มต้นคือ 2 เดือนของค่าเช่าห้องพัก ได้รับคืนเมื่อสิ้นสุดสัญญาและหักค่าน้ำไฟวันย้ายออก
                    </div>
                  </div>
                </div>

                {/* Toggle Button */}
                <button
                  type="button"
                  onClick={() => setHasDeposit(!hasDeposit)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out shrink-0 ${
                    hasDeposit ? "bg-emerald-600 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
                  }`}
                  title={hasDeposit ? "คลิกเพื่อปิดไม่เรียกเก็บเงินประกัน" : "คลิกเพื่อเปิดเรียกเก็บเงินประกัน"}
                >
                  <span className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
                </button>
              </div>

              {hasDeposit && (
                <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between gap-4 animate-in fade-in">
                  <label className="text-xs font-semibold text-[var(--foreground)]">
                    จำนวนเงินประกันที่เรียกเก็บ (บาท):
                  </label>
                  <div className="relative w-48">
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(Number(e.target.value))}
                      className="w-full text-xs font-bold text-right bg-[var(--card)] border border-[var(--border)] rounded-xl pr-8 pl-3 py-2 focus:outline-emerald-500"
                      min={0}
                      step={100}
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-[var(--muted)] font-medium">฿</span>
                  </div>
                </div>
              )}
            </div>

            {/* TOGGLE 2: TV Rental Option */}
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--subtle)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Tv className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-[var(--foreground)] flex items-center gap-2">
                      <span>ค่าเช่าทีวี (Smart TV Rental)</span>
                      {hasTv ? (
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-300">
                          เปิดใช้งาน
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          ไม่ต้องการเช่า
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--muted)]">
                      ผู้เช่าต้องการเช่าทีวีรายเดือนหรือไม่ (ระบบจะนำยอดนี้ไปคิดในบิลรายเดือนอัตโนมัติ)
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setHasTv(!hasTv)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out shrink-0 ${
                    hasTv ? "bg-blue-600 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
                  }`}
                  title={hasTv ? "คลิกเพื่อยกเลิกการเช่าทีวี" : "คลิกเพื่อเปิดเช่าทีวี"}
                >
                  <span className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
                </button>
              </div>

              {hasTv && (
                <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between gap-4 animate-in fade-in">
                  <label className="text-xs font-semibold text-[var(--foreground)]">
                    อัตราค่าเช่าทีวีรายเดือน (บาท/เดือน):
                  </label>
                  <div className="relative w-48">
                    <input
                      type="number"
                      value={tvRentalFee}
                      onChange={(e) => setTvRentalFee(Number(e.target.value))}
                      className="w-full text-xs font-bold text-right bg-[var(--card)] border border-[var(--border)] rounded-xl pr-8 pl-3 py-2 focus:outline-emerald-500"
                      min={0}
                      step={50}
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-[var(--muted)] font-medium">฿</span>
                  </div>
                </div>
              )}
            </div>

            {/* TOGGLE 3: Refrigerator Rental Option */}
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--subtle)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-[var(--foreground)] flex items-center gap-2">
                      <span>ค่าเช่าตู้เย็น (Refrigerator Rental)</span>
                      {hasFridge ? (
                        <span className="text-[10px] font-bold text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 px-2 py-0.5 rounded-full border border-cyan-300">
                          เปิดใช้งาน
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          ไม่ต้องการเช่า
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--muted)]">
                      ผู้เช่าต้องการเช่าตู้เย็นรายเดือนหรือไม่ (ระบบจะนำยอดนี้ไปคิดในบิลรายเดือนอัตโนมัติ)
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setHasFridge(!hasFridge)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out shrink-0 ${
                    hasFridge ? "bg-cyan-600 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
                  }`}
                  title={hasFridge ? "คลิกเพื่อยกเลิกการเช่าตู้เย็น" : "คลิกเพื่อเปิดเช่าตู้เย็น"}
                >
                  <span className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
                </button>
              </div>

              {hasFridge && (
                <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between gap-4 animate-in fade-in">
                  <label className="text-xs font-semibold text-[var(--foreground)]">
                    อัตราค่าเช่าตู้เย็นรายเดือน (บาท/เดือน):
                  </label>
                  <div className="relative w-48">
                    <input
                      type="number"
                      value={fridgeRentalFee}
                      onChange={(e) => setFridgeRentalFee(Number(e.target.value))}
                      className="w-full text-xs font-bold text-right bg-[var(--card)] border border-[var(--border)] rounded-xl pr-8 pl-3 py-2 focus:outline-emerald-500"
                      min={0}
                      step={50}
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-[var(--muted)] font-medium">฿</span>
                  </div>
                </div>
              )}
            </div>

            {/* DYNAMIC ADDITIONAL FEES & SERVICES SECTION (พร้อมปุ่ม ADD และปุ่มเพิ่มด่วน) */}
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--subtle)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-[var(--foreground)] flex items-center gap-2">
                      <span>ค่าบริการและค่าธรรมเนียมเพิ่มเติม (Additional Services / Fees)</span>
                      {additionalFees.length > 0 && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-300">
                          {additionalFees.filter((f) => f.isEnabled).length} รายการ
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--muted)]">
                      เพิ่มค่าบริการเสริมตามความต้องการ เช่น ค่าส่วนกลาง ค่าเน็ต ค่าที่จอดรถ หรือค่าบริการอื่น ๆ
                    </div>
                  </div>
                </div>

                {/* ADD Button */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddFee("", 300)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ADD (เพิ่มรายการ)</span>
                  </button>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[var(--border)]/70">
                <span className="text-[11px] text-[var(--muted)] font-medium">เพิ่มด่วน:</span>
                <button
                  type="button"
                  onClick={() => handleAddFee("ค่าส่วนกลาง", 300)}
                  className="px-2.5 py-1 rounded-lg bg-[var(--card)] hover:bg-emerald-500/10 text-[11px] font-semibold text-[var(--foreground)] border border-[var(--border)] hover:border-emerald-500/40 transition cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3 text-emerald-600" />
                  ค่าส่วนกลาง
                </button>
                <button
                  type="button"
                  onClick={() => handleAddFee("ค่าเน็ต WiFi", 200)}
                  className="px-2.5 py-1 rounded-lg bg-[var(--card)] hover:bg-sky-500/10 text-[11px] font-semibold text-[var(--foreground)] border border-[var(--border)] hover:border-sky-500/40 transition cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3 text-sky-600" />
                  ค่าเน็ต WiFi
                </button>
                <button
                  type="button"
                  onClick={() => handleAddFee("ค่าที่จอดรถ", 300)}
                  className="px-2.5 py-1 rounded-lg bg-[var(--card)] hover:bg-indigo-500/10 text-[11px] font-semibold text-[var(--foreground)] border border-[var(--border)] hover:border-indigo-500/40 transition cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3 text-indigo-600" />
                  ค่าที่จอดรถ
                </button>
                <button
                  type="button"
                  onClick={() => handleAddFee("ค่าทำความสะอาดรายเดือน", 400)}
                  className="px-2.5 py-1 rounded-lg bg-[var(--card)] hover:bg-amber-500/10 text-[11px] font-semibold text-[var(--foreground)] border border-[var(--border)] hover:border-amber-500/40 transition cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3 text-amber-600" />
                  ค่าทำความสะอาด
                </button>
              </div>

              {/* Dynamic Items List */}
              {additionalFees.length === 0 ? (
                <div className="p-5 rounded-xl border border-dashed border-[var(--border)] text-center text-xs text-[var(--muted)] bg-[var(--card)]/50">
                  ยังไม่มีรายการค่าบริการเพิ่มเติม — กดปุ่ม{" "}
                  <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">+ ADD (เพิ่มรายการ)</strong> หรือคลิกปุ่มเพิ่มด่วนด้านบนเพื่อสร้างรายการ
                </div>
              ) : (
                <div className="space-y-3">
                  {additionalFees.map((fee, idx) => (
                    <div
                      key={fee.id}
                      className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-3 transition shadow-xs animate-in fade-in"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={fee.name}
                            onChange={(e) => handleUpdateFee(fee.id, { name: e.target.value })}
                            placeholder="ระบุชื่อค่าบริการ เช่น ค่าส่วนกลาง, ค่าเน็ต, ค่าที่จอดรถ"
                            className="w-full text-xs font-semibold bg-[var(--subtle)] border border-[var(--border)] rounded-lg px-3 py-2 focus:outline-emerald-500"
                          />
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {/* Toggle Button */}
                          <button
                            type="button"
                            onClick={() => handleUpdateFee(fee.id, { isEnabled: !fee.isEnabled })}
                            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out shrink-0 ${
                              fee.isEnabled ? "bg-emerald-600 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
                            }`}
                            title={fee.isEnabled ? "คลิกเพื่อปิดรายการนี้" : "คลิกเพื่อเปิดใช้งานรายการนี้"}
                          >
                            <span className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
                          </button>

                          {/* Delete Item */}
                          <button
                            type="button"
                            onClick={() => handleRemoveFee(fee.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="ลบรายการนี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {fee.isEnabled && (
                        <div className="pt-2 border-t border-[var(--border)]/70 flex items-center justify-between gap-3 animate-in fade-in">
                          <label className="text-xs font-semibold text-[var(--foreground)]">
                            อัตราค่าบริการรายเดือน (บาท/เดือน):
                          </label>
                          <div className="relative w-44">
                            <input
                              type="number"
                              value={fee.amount}
                              onChange={(e) => handleUpdateFee(fee.id, { amount: Number(e.target.value) })}
                              className="w-full text-xs font-bold text-right bg-[var(--subtle)] border border-[var(--border)] rounded-lg pr-8 pl-3 py-1.5 focus:outline-emerald-500"
                              min={0}
                              step={50}
                            />
                            <span className="absolute right-3 top-2 text-xs text-[var(--muted)] font-medium">฿</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Card 5: Lease Conditions (Image 5) */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
            <div className="border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-[var(--foreground)]">
                    5. เงื่อนไขสัญญาเช่า (Lease Conditions)
                  </h2>
                  <p className="text-[11px] text-[var(--muted)]">
                    กำหนดระเบียบการบอกเลิกสัญญา การคืนเงินประกัน และกฎระเบียบภายในอาคาร
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  จำนวนวันแจ้งล่วงหน้าก่อนบอกเลิก (วัน)
                </label>
                <input
                  type="number"
                  min={1}
                  value={noticeDays}
                  onChange={(e) => setNoticeDays(Number(e.target.value))}
                  className="w-full text-xs bg-[var(--subtle)] border border-[var(--border)] rounded-xl px-3 py-2 focus:outline-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  จำนวนวันคืนเงินประกัน (วัน)
                </label>
                <input
                  type="number"
                  min={1}
                  value={depositRefundDays}
                  onChange={(e) => setDepositRefundDays(Number(e.target.value))}
                  className="w-full text-xs bg-[var(--subtle)] border border-[var(--border)] rounded-xl px-3 py-2 focus:outline-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  จำนวนวันค้างชำระที่อนุญาต (วัน)
                </label>
                <input
                  type="number"
                  min={1}
                  value={overdueGraceDays}
                  onChange={(e) => setOverdueGraceDays(Number(e.target.value))}
                  className="w-full text-xs bg-[var(--subtle)] border border-[var(--border)] rounded-xl px-3 py-2 focus:outline-emerald-500 font-bold"
                />
              </div>
            </div>

            {/* Checkboxes: Pet & Smoking */}
            <div className="flex flex-wrap items-center gap-6 pt-1">
              <label className="flex items-center gap-2 text-xs text-[var(--foreground)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowPets}
                  onChange={(e) => setAllowPets(e.target.checked)}
                  className="rounded text-emerald-600 cursor-pointer"
                />
                <span>อนุญาตให้เลี้ยงสัตว์</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-[var(--foreground)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={noSmoking}
                  onChange={(e) => setNoSmoking(e.target.checked)}
                  className="rounded text-rose-600 cursor-pointer"
                />
                <span className="font-semibold text-rose-600 dark:text-rose-400">ห้ามสูบบุหรี่ในอาคาร</span>
              </label>
            </div>

            {/* Additional Custom Rules */}
            <div className="space-y-2 pt-2 border-t border-[var(--border)]">
              <label className="block text-xs font-semibold text-[var(--foreground)]">
                กฎเพิ่มเติม (Additional Rules)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newRuleInput}
                  onChange={(e) => setNewRuleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddRule();
                    }
                  }}
                  placeholder="เพิ่มกฎใหม่ เช่น ห้ามส่งเสียงดังหลัง 22:00 น., ห้ามใช้เตาแก๊ส..."
                  className="flex-1 text-xs bg-[var(--subtle)] border border-[var(--border)] rounded-xl px-3 py-2 focus:outline-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddRule}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มกฎใหม่</span>
                </button>
              </div>

              {additionalRules.length === 0 ? (
                <div className="text-[11px] text-[var(--muted)] italic pt-1">
                  ยังไม่มีกฎเพิ่มเติม คลิกปุ่ม &quot;เพิ่มกฎใหม่&quot; เพื่อเพิ่ม
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {additionalRules.map((rule, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-[var(--foreground)] border border-[var(--border)]"
                    >
                      <span>• {rule}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRule(idx)}
                        className="text-slate-400 hover:text-rose-500 transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Card 6: Contract Clauses (14 Clauses) - Images 3 & 4 */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
            <div className="border-b border-[var(--border)] pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                  <FileSignature className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-[var(--foreground)]">
                    6. แก้ไขข้อสัญญา ({clauses.length} ข้อ)
                  </h2>
                  <p className="text-[11px] text-[var(--muted)]">
                    ข้อกำหนดมาตรฐาน 14 ข้อ สามารถแก้ไขหัวข้อและเนื้อหาข้อสัญญาได้อย่างอิสระ
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddClause}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มข้อใหม่</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {clauses.map((clause, index) => {
                const isExpanded = expandedClauseIds.includes(clause.id);
                return (
                  <div
                    key={clause.id}
                    className="rounded-xl border border-[var(--border)] bg-[var(--subtle)] overflow-hidden transition"
                  >
                    {/* Clause Header Bar */}
                    <div
                      onClick={() => handleToggleClauseExpand(clause.id)}
                      className="p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-[var(--card)] transition select-none"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <span className="font-mono font-bold text-[11px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded shrink-0">
                          ข้อ {index + 1}
                        </span>
                        <span className="font-bold text-xs text-[var(--foreground)] truncate">
                          {clause.title || "ไม่มีหัวข้อ"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleDeleteClause(clause.id)}
                          className="w-7 h-7 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-slate-400 flex items-center justify-center transition cursor-pointer"
                          title="ลบข้อสัญญานี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleClauseExpand(clause.id)}
                          className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center justify-center transition cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Clause Body (Expanded) */}
                    {isExpanded && (
                      <div className="p-4 pt-1 border-t border-[var(--border)] bg-[var(--card)] space-y-3 animate-in fade-in">
                        <div>
                          <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">
                            หัวข้อ
                          </label>
                          <input
                            type="text"
                            value={clause.title}
                            onChange={(e) => handleUpdateClauseTitle(clause.id, e.target.value)}
                            placeholder="ระบุหัวข้อสัญญา..."
                            className="w-full text-xs font-semibold bg-[var(--subtle)] border border-[var(--border)] rounded-xl px-3 py-2 focus:outline-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">
                            เนื้อหา
                          </label>
                          <textarea
                            rows={3}
                            value={clause.content}
                            onChange={(e) => handleUpdateClauseContent(clause.id, e.target.value)}
                            placeholder="ระบุข้อความสัญญาฉบับเต็ม..."
                            className="w-full text-xs leading-relaxed bg-[var(--subtle)] border border-[var(--border)] rounded-xl px-3 py-2 focus:outline-emerald-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Sticky Financial Summary Card */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[var(--foreground)]">
                  สรุปยอดรวมวันทำสัญญา
                </h3>
                <p className="text-[11px] text-[var(--muted)]">คำนวณตามห้องพักและออปชันที่เลือก</p>
              </div>
            </div>

            {/* Selected Room Badge */}
            <div className="p-3 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs">
              <div className="text-[11px] text-[var(--muted)]">ห้องพักที่จัดสรร</div>
              <div className="font-extrabold text-sm text-[var(--foreground)] mt-0.5">
                {selectedRoom ? `ห้อง ${selectedRoom.roomNumber} (${selectedRoom.type})` : "ยังไม่ได้เลือกห้อง"}
              </div>
              <div className="text-[11px] text-[var(--muted)] mt-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {startDate} ถึง {endDate}
                </span>
              </div>
            </div>

            {/* Detailed Itemized Upfront Breakdown */}
            <div className="space-y-2.5 text-xs border-b border-[var(--border)] pb-4">
              <div className="flex justify-between items-center text-[var(--foreground)]">
                <span className="text-[var(--muted)]">ค่าเช่าห้องพักล่วงหน้า (เดือนแรก):</span>
                <span className="font-bold">฿{roomRent.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center text-[var(--foreground)]">
                <span className="text-[var(--muted)] flex items-center gap-1">
                  <span>เงินประกันมัดจำ:</span>
                  {!hasDeposit && <span className="text-[10px] text-amber-500">(ยกเว้น)</span>}
                </span>
                <span className={`font-bold ${hasDeposit ? "text-[var(--foreground)]" : "text-slate-400"}`}>
                  {hasDeposit ? `฿${actualDeposit.toLocaleString()}` : "฿0"}
                </span>
              </div>

              <div className="flex justify-between items-center text-[var(--foreground)]">
                <span className="text-[var(--muted)] flex items-center gap-1">
                  <span>ค่าบริการเช่าทีวีเดือนแรก:</span>
                  {!hasTv && <span className="text-[10px] text-slate-400">(ไม่เช่า)</span>}
                </span>
                <span className={`font-bold ${hasTv ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`}>
                  {hasTv ? `฿${actualTv.toLocaleString()}` : "฿0"}
                </span>
              </div>

              <div className="flex justify-between items-center text-[var(--foreground)]">
                <span className="text-[var(--muted)] flex items-center gap-1">
                  <span>ค่าบริการเช่าตู้เย็นเดือนแรก:</span>
                  {!hasFridge && <span className="text-[10px] text-slate-400">(ไม่เช่า)</span>}
                </span>
                <span className={`font-bold ${hasFridge ? "text-cyan-600 dark:text-cyan-400" : "text-slate-400"}`}>
                  {hasFridge ? `฿${actualFridge.toLocaleString()}` : "฿0"}
                </span>
              </div>

              {/* Dynamic Additional Fees in Summary */}
              {activeAdditionalFees.map((fee) => (
                <div key={fee.id} className="flex justify-between items-center text-[var(--foreground)] animate-in fade-in">
                  <span className="text-[var(--muted)] flex items-center gap-1">
                    <span>{fee.name || "ค่าบริการเพิ่มเติม"} เดือนแรก:</span>
                  </span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    ฿{(Number(fee.amount) || 0).toLocaleString()}
                  </span>
                </div>
              ))}

              {(actualEquipment > 0 || actualFurniture > 0) && (
                <div className="flex justify-between items-center text-[var(--foreground)]">
                  <span className="text-[var(--muted)]">ค่าอุปกรณ์ & ครุภัณฑ์แรกเข้า:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    ฿{(actualEquipment + actualFurniture).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Big Total Upfront Payment */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20">
              <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                ยอดรวมชำระ ณ วันทำสัญญา
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mt-1">
                ฿{totalUpfront.toLocaleString()}
              </div>
              <div className="text-[10px] text-[var(--muted)] mt-1">
                (รวมค่าเช่าล่วงหน้า {hasDeposit ? "+ เงินประกัน" : ""} {actualTv + actualFridge + actualCommon + actualWifi + actualParking > 0 ? "+ บริการเสริมเดือนแรก" : ""} {actualEquipment + actualFurniture > 0 ? "+ อุปกรณ์" : ""})
              </div>
            </div>

            {/* Next Month Recurring Rent */}
            <div className="p-3.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs flex items-center justify-between">
              <div>
                <div className="text-[11px] text-[var(--muted)]">ค่าเช่าและบริการคงที่รอบบิลถัดไป</div>
                <div className="font-bold text-[var(--foreground)]">
                  ฿{monthlyRecurring.toLocaleString()}{" "}
                  <span className="text-[10px] text-[var(--muted)] font-normal">/เดือน</span>
                </div>
              </div>
              <div className="text-right text-[10px] text-[var(--muted)]">
                + ค่าน้ำไฟตามหน่วยมิเตอร์
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="submit"
                disabled={isSubmitting || vacantRooms.length === 0}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition cursor-pointer shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังบันทึกสัญญา...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>ยืนยันทำสัญญาเช่าห้องพัก</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  try {
                    const draft = {
                      contractNumber: `CT-${new Date().getFullYear()}-${selectedRoom?.roomNumber || "103"}-01`,
                      contractDate: new Date().toISOString().split("T")[0],
                      roomNumber: selectedRoom?.roomNumber || "103",
                      floor: selectedRoom?.floor || 1,
                      roomType: selectedRoom?.type || "ห้องแอร์",
                      monthlyRate: selectedRoom?.monthlyRate || 4000,
                      fullName: fullName.trim() || "คุณนวรัตน์ มงคลสุข",
                      phone: phone.trim() || "089-456-7890",
                      idCard: idCard.trim() || "1-1005-01234-56-7",
                      gender,
                      age: age ? Number(age) : 26,
                      lineId: lineId.trim() || "-",
                      email: email.trim() || "-",
                      vehiclePlate: vehiclePlate.trim() || "-",
                      address: address.trim() || "-",
                      emergencyContact: emergencyContact.trim() || "-",
                      taxId: taxId.trim() || "-",
                      invoiceLang,
                      notes: notes.trim() || "-",
                      startDate,
                      endDate,
                      isContinuous,
                      paymentDueDay,
                      lateFeePerDay,
                      electricalEquipmentFee,
                      furnitureFee,
                      hasDeposit,
                      depositAmount,
                      hasTv,
                      tvRentalFee,
                      hasFridge,
                      fridgeRentalFee,
                      additionalFees,
                      noticeDays,
                      depositRefundDays,
                      overdueGraceDays,
                      allowPets,
                      noSmoking,
                      additionalRules,
                      clauses,
                    };
                    localStorage.setItem("pakdee_contract_print_draft", JSON.stringify(draft));
                  } catch {
                    // ignore
                  }
                  window.location.href = "/contracts/print";
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>ดูตัวอย่างเอกสารสัญญาที่จะพิมพ์ (A4)</span>
              </button>

              <button
                type="button"
                onClick={onBack}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--subtle)] transition cursor-pointer text-center"
              >
                ยกเลิก / ย้อนกลับ
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
