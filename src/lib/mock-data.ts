import { Property, Building, Room, Invoice, DailyBooking, AdditionalService } from "@/types/dormitory";

export const initialProperty: Property = {
  id: "prop-1",
  name: "พักดี แมนชั่น (สาขา 1)",
  address: "123/45 ซอยสุขุมวิท 71 แขวงพระโขนงเหนือ เขตวัฒนา กรุงเทพฯ 10110",
  phone: "081-234-5678",
  promptpayNumber: "0812345678",
  promptpayName: "หอพัก พักดี แมนชั่น",
  plan: "starter",
  electricRate: 8, // 8 บาท/หน่วย
  waterRate: 18,   // 18 บาท/หน่วย
};

export const initialBuildings: Building[] = [
  {
    id: "bldg-a",
    propertyId: "prop-1",
    name: "อาคาร A",
    totalFloors: 4,
    totalRooms: 24,
  },
];

export const initialServices: AdditionalService[] = [
  { id: "srv-1", name: "ค่าบริการส่วนกลางและเก็บขยะ", price: 100, isRecurring: true },
  { id: "srv-2", name: "ค่าที่จอดรถยนต์", price: 300, isRecurring: true },
  { id: "srv-3", name: "ค่าที่จอดรถมอเตอร์ไซค์", price: 100, isRecurring: true },
  { id: "srv-4", name: "ค่าอินเทอร์เน็ต WiFi ความเร็วสูง", price: 200, isRecurring: true },
  { id: "srv-5", name: "ค่าเช่าตู้เย็น", price: 300, isRecurring: true },
];

export const initialRooms: Room[] = [];

export const sampleInvoice: Invoice = {
  id: "inv-202610-101",
  propertyId: "prop-1",
  invoiceNumber: "INV-202610-101",
  roomNumber: "101",
  tenantName: "นายสมชาย สุขสบาย",
  tenantPhone: "089-999-8888",
  billingDate: "2026-10-25",
  dueDate: "2026-11-05",
  items: [
    { name: "ค่าเช่าห้องพักประจำเดือน (ห้องแอร์)", units: 1, rate: 4000, amount: 4000 },
    { name: "ค่าไฟฟ้า (เลข 1420 ถึง 1485)", units: 65, rate: 8, amount: 520, meterPrev: 1420, meterCurr: 1485 },
    { name: "ค่าน้ำประปา (เลข 320 ถึง 328)", units: 8, rate: 18, amount: 144, meterPrev: 320, meterCurr: 328 },
    { name: "ค่าบริการส่วนกลางและเก็บขยะ", units: 1, rate: 100, amount: 100 },
    { name: "ค่าที่จอดรถยนต์", units: 1, rate: 300, amount: 300 },
  ],
  totalAmount: 5064,
  status: "paid",
  paidAt: "2026-10-26 10:15 น.",
};

export const sampleOverdueInvoice: Invoice = {
  id: "inv-202610-105",
  propertyId: "prop-1",
  invoiceNumber: "INV-202610-105",
  roomNumber: "105",
  tenantName: "นายเอกชัย รุ่งโรจน์วิริยะ",
  tenantPhone: "087-777-6655",
  billingDate: "2026-10-25",
  dueDate: "2026-10-20",
  items: [
    { name: "ค่าเช่าห้องพักประจำเดือน", units: 1, rate: 4200, amount: 4200 },
    { name: "ค่าไฟฟ้า (60 หน่วย)", units: 60, rate: 8, amount: 480 },
    { name: "ค่าน้ำประปา (8 หน่วย)", units: 8, rate: 18, amount: 144 },
    { name: "ค่าปรับชำระล่าช้า (5 วัน)", units: 1, rate: 100, amount: 100 },
  ],
  totalAmount: 4924,
  status: "unpaid",
};

// ==================== CLONED ENTITIES MOCK DATA ====================
import {
  RepairItem,
  ContractItem,
  ExpenseItem,
  BroadcastItem,
  ActivityLogItem,
  BranchSettingsDetail,
} from "@/types/dormitory";

export const initialRepairs: RepairItem[] = [];

export const initialContracts: ContractItem[] = [];

export const initialExpenses: ExpenseItem[] = [
  {
    id: "exp-01",
    propertyId: "prop-1",
    category: "electric",
    title: "บิลค่าไฟฟ้าการไฟฟ้านครหลวง (หม้อแปลงหลัก)",
    amount: 3200,
    date: "2026-10-25",
    paidTo: "การไฟฟ้านครหลวง (MEA)",
    notes: "บิลค่าไฟรอบเดือน ต.ค. 2569",
  },
  {
    id: "exp-02",
    propertyId: "prop-1",
    category: "water",
    title: "บิลค่าน้ำประปาการประปานครหลวง",
    amount: 850,
    date: "2026-10-25",
    paidTo: "การประปานครหลวง (MWA)",
    notes: "บิลค่าน้ำรอบเดือน ต.ค. 2569",
  },
  {
    id: "exp-03",
    propertyId: "prop-1",
    category: "salary",
    title: "ค่าจ้างแม่บ้านทำความสะอาดส่วนกลางและบันได",
    amount: 2500,
    date: "2026-10-28",
    paidTo: "ป้าสมใจ (แม่บ้าน)",
    notes: "รอบสิ้นเดือน ต.ค. 2569",
  },
  {
    id: "exp-04",
    propertyId: "prop-1",
    category: "repairs",
    title: "ค่าช่างเปลี่ยนก๊อกน้ำและท่อน้ำทิ้งห้อง 104",
    amount: 450,
    date: "2026-10-20",
    paidTo: "ช่างสมคิด บริการ",
    notes: "รวมค่าอุปกรณ์และค่าแรง",
  },
];

export const initialBroadcasts: BroadcastItem[] = [];

export const initialActivityLogs: ActivityLogItem[] = [];

export const initialBranchSettings: BranchSettingsDetail = {
  branchName: "พักดี แมนชั่น (สาขา 1)",
  address: "123/45 ซอยสุขุมวิท 71 แขวงพระโขนงเหนือ เขตวัฒนา กรุงเทพฯ 10110",
  phone: "081-234-5678",
  ownerName: "นายพักดี มีสุข",
  ownerPhone: "081-234-5678",
  taxId: "0105566012345",
  waterRate: 18,
  electricRate: 8,
  useMinWater: false,
  minWaterUnits: 3,
  minWaterFee: 100,
  useMinElectric: false,
  minElectricUnits: 3,
  minElectricFee: 100,
  commonFee: 100,
  internetFee: 200,
  parkingFee: 300,
  billCycleDay: 25,
  billDueDay: 5,
  lateFeePerDay: 50,
  bankName: "ธนาคารกสิกรไทย",
  bankAccountNumber: "012-3-45678-9",
  bankAccountName: "หอพัก พักดี แมนชั่น",
  promptpayNumber: "0812345678",
  promptpayName: "หอพัก พักดี แมนชั่น",
  lineChannelAccessToken: "qKsCOa6uRWKLAHJcrs/QljDmKls4sZgZHYrkIcXZ5LQ0CYSOpNKBxxF+aL/pIyXXrljrFz5wqZfCPhMFWTaRtIE0PXT/53dqod9MzjfS48Dx3ZH7nABvX6d/nrtcw6c1aGSWCIZoHtsRv9kcKFwCYAdB04t89/1O/w1cDnyilFU=",
  lineChannelSecret: "5a3c837da6ba0045ed0073e06cc45de6",
  lineWebhookUrl: "https://api.pakdee.app/webhook/line/branch-1",
  contractTerms: "ผู้เช่าต้องชำระค่าเช่าภายในวันที่ 5 ของทุกเดือน หากล่าช้ามีค่าปรับวันละ 50 บาท ห้ามเลี้ยงสัตว์ และห้ามส่งเสียงดังหลังเวลา 22:00 น.",
};
