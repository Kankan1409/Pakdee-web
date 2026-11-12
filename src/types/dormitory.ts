export type RoomStatus =
  | "vacant"      // ว่าง พร้อมเข้าพัก (เขียว)
  | "occupied"    // รายเดือน พักอาศัย (น้ำเงิน/ม่วง)
  | "daily"       // รายวัน เข้าพัก/จองแล้ว (ส้ม)
  | "cleaning"    // รอแม่บ้านทำความสะอาด (เหลือง)
  | "overdue"     // ค้างชำระ (แดง)
  | "maintenance"; // ซ่อมบำรุง (เทา/แดง)

export type RentalType = "monthly" | "daily" | "both";

export type PlanType = "starter" | "pro" | "elite";

export type UserRole = "super_admin" | "owner" | "reception" | "technician" | "housekeeper";

export interface Property {
  id: string;
  name: string;
  address: string;
  phone: string;
  ownerName?: string; // ชื่อเจ้าของ / ผู้จัดการ
  promptpayNumber: string;
  promptpayName: string;
  plan: PlanType;
  electricRate: number; // บาท/หน่วย
  waterRate: number;    // บาท/หน่วย
  imageUrl?: string;    // รูปภาพหอพัก / สาขา
}

export interface Building {
  id: string;
  propertyId: string;
  name: string;
  totalFloors: number;
  totalRooms: number;
}

export interface AdditionalFeeItem {
  id: string;
  name: string;
  amount: number;
  isEnabled: boolean;
}

export interface Tenant {
  id: string;
  propertyId?: string;
  roomId?: string;
  roomNumber?: string;
  fullName: string;
  phone: string;
  idCard: string;
  Line_Acc?: string;
  lineAcc?: string;
  emergencyContact?: string;
  lineId?: string;
  lineUserId?: string;
  lineDisplayName?: string;
  lineLinkedAt?: string;
  vehiclePlate?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  age?: number;
  taxId?: string;
  email?: string;
  address?: string;
  invoiceLang?: "TH" | "EN";
  notes?: string;
  idCardImageUrl?: string;
  depositAmount?: number;
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
}

export interface Room {
  id: string;
  propertyId?: string;
  buildingId: string;
  roomNumber: string;
  floor: number;
  type: string; // "แอร์", "พัดลม", "สตูดิโอ"
  rentalType?: RentalType;
  monthlyRate: number;
  dailyRate: number;
  status: RoomStatus;
  currentTenant?: Tenant;
  leaseEndDate?: string;
  currentElectricMeter: number;
  currentWaterMeter: number;
  lastBillPaid?: boolean;
  notes?: string;
  size?: string;
  depositAmount?: number;
  version?: number;
}

export interface AdditionalService {
  id: string;
  name: string;
  price: number;
  isRecurring: boolean; // คิดทุกเดือน หรือคิดครั้งเดียว
}

export interface InvoiceItem {
  id?: string;
  name: string;
  units?: number;
  rate?: number;
  amount: number;
  meterPrev?: number;
  meterCurr?: number;
}

export interface PaymentAllocation {
  invoiceItemId?: string;
  itemType: "rent" | "water" | "electric" | "service" | "parking" | "internet" | "penalty" | "other";
  allocatedAmount: number;
}

export interface Payment {
  id: string;
  paymentNumber: string; // e.g. PMT-202611-001
  propertyId?: string;
  invoiceId: string;
  tenantId?: string;
  tenantName?: string;
  roomNumber?: string;
  amount: number;
  paymentMethod: "transfer" | "cash" | "promptpay" | "credit_card";
  paidAt: string;
  receivedBy?: string;
  status: "completed" | "voided" | "reversed";
  slipUrl?: string;
  notes?: string;
  idempotencyKey?: string;
  allocations?: PaymentAllocation[];
  version?: number;
  createdAt: string;
}

export interface Receipt {
  id: string;
  receiptNumber: string; // e.g. REC-202611-001
  propertyId?: string;
  paymentId: string;
  invoiceId: string;
  roomNumber: string;
  tenantName: string;
  amount: number;
  issuedAt: string;
  issuedBy?: string;
  pdfUrl?: string;
}

export interface Invoice {
  id: string;
  propertyId?: string;
  invoiceNumber: string;
  roomNumber: string;
  tenantId?: string;
  tenantName: string;
  tenantPhone: string;
  billingDate: string;
  dueDate: string;
  items: InvoiceItem[];
  totalAmount: number;
  paidAmount?: number;
  remainingAmount?: number;
  // deferred = ผู้เช่าขอค้างชำระ (รอยกไปบิลถัดไป), carried_forward = ยกยอดไปรวมกับบิลถัดไปแล้ว
  status: "unpaid" | "partial" | "pending_review" | "paid" | "overdue" | "cancelled" | "deferred" | "carried_forward";
  slipUrl?: string;
  paidAt?: string;
  qrCodeUrl?: string;
  invoiceType?: "monthly" | "move_in" | "custom";
  /** วิธีชำระที่ยืนยันแล้ว (บันทึกตอนยืนยันรับชำระ ใช้ในใบเสร็จรับเงิน) */
  paymentMethod?: "transfer" | "cash" | "promptpay" | "credit_card";
  slipStatus?: "passed" | "action_needed" | "retrying" | "none";
  slipVerifiedAt?: string;
  slipVerifiedBy?: "ai" | "manual";
  slipTransRef?: string;
  slipBank?: string;
  slipHash?: string;
  slipRejectReason?: string;
  lineSentAt?: string;
  lineDeliveryStatus?: "sent" | "failed" | "not_sent";
  payments?: Payment[];
  version?: number;
}

export interface DailyBooking {
  id: string;
  propertyId?: string;
  roomNumber: string;
  guestName: string;
  guestPhone: string;
  idCard?: string;
  vehiclePlate?: string;
  checkInDate: string;
  checkInTime: string;
  checkOutDate: string;
  checkOutTime: string;
  nights: number;
  dailyRate: number;
  totalRoomPrice: number;
  keyDeposit: number;
  roomDeposit?: number;
  status: "confirmed" | "checked_in" | "checked_out" | "cancelled";
  electricCheckIn?: number;
  electricCheckOut?: number;
  waterCheckIn?: number;
  waterCheckOut?: number;
  electricUnitsUsed?: number;
  waterUnitsUsed?: number;
}

// 1. Repair / Maintenance Request
export interface RepairItem {
  id: string;
  propertyId?: string;
  roomNumber: string;
  category: "air" | "plumbing" | "electric" | "furniture" | "other";
  title: string;
  description: string;
  priority: "normal" | "urgent" | "emergency";
  status: "pending" | "in_progress" | "completed";
  cost: number;
  technicianName?: string;
  reportedAt: string;
  completedAt?: string;
  photos?: string[];
}

// Contract Clause (ข้อสัญญา)
export interface ContractClause {
  id: number;
  title: string;
  content: string;
}

// 2. Lease Contract
export interface ContractItem {
  id: string;
  propertyId?: string;
  contractNumber: string;
  roomNumber: string;
  tenantName: string;
  tenantPhone: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  depositAmount: number;
  advanceRent: number;
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
  // superseded = ถูกแทนที่โดยสัญญาฉบับแก้ไข (ดูย้อนหลังได้ แก้ไม่ได้)
  status: "draft" | "pending_signature" | "active" | "expired" | "terminated" | "superseded";
  terms?: string;
  createdAt: string;
  /** ลายเซ็นผู้เช่า (PNG data URL) */
  signatureUrl?: string;
  signedAt?: string;
  /** สำเนาลายเซ็นผู้ให้เช่า ณ วันที่ผู้เช่าเซ็น (ถ้าไม่มี ใช้ลายเซ็นปัจจุบันในตั้งค่าสาขา) */
  landlordSignatureUrl?: string;
  // สัญญาฉบับแก้ไข: ฉบับที่ (0 = ฉบับแรก), เลขสัญญาฉบับแรก, ฉบับก่อนหน้า, ฉบับที่มาแทน
  revision?: number;
  rootContractNumber?: string;
  previousContractNumber?: string;
  supersededBy?: string;
  /** วันที่ย้ายออกจริง (YYYY-MM-DD) บันทึกตอนสัญญาถูกยกเลิก/หมดอายุ */
  movedOutAt?: string;
}

// 3. Operating Expense
export interface ExpenseItem {
  id: string;
  propertyId?: string;
  category: "water" | "electric" | "repairs" | "internet" | "salary" | "supplies" | "other";
  title: string;
  amount: number;
  date: string;
  paidTo: string;
  receiptUrl?: string;
  notes?: string;
}

// 4. Broadcast Message
export interface BroadcastItem {
  id: string;
  propertyId?: string;
  template: "power" | "water" | "maintenance" | "general";
  title: string;
  message: string;
  targetType: "all" | "floor" | "room";
  targetValue?: string;
  sentAt: string;
  recipientCount: number;
  status: "sent" | "failed";
}

// 5. Activity / Audit Log
export interface ActivityLogItem {
  id: string;
  propertyId?: string;
  userName: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "SEND" | "PAYMENT" | "VERIFY";
  entity: "ROOM" | "TENANT" | "INVOICE" | "METER" | "REPAIR" | "CONTRACT" | "SETTINGS" | "PROPERTY";
  description: string;
  createdAt: string;
}

// 6. Branch Settings 10 Tabs
export interface BranchSettingsDetail {
  id?: string;
  branchName: string;
  address: string;
  phone: string;
  ownerName: string;
  ownerPhone: string;
  taxId?: string;
  // Rates
  waterRate: number;
  electricRate: number;
  useMinWater: boolean;
  minWaterUnits: number;
  minWaterFee: number;
  useMinElectric: boolean;
  minElectricUnits: number;
  minElectricFee: number;
  commonFee: number;
  internetFee: number;
  parkingFee: number;
  // Billing
  billCycleDay: number;
  billDueDay: number;
  lateFeePerDay: number;
  // Banking
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  promptpayNumber: string;
  promptpayName: string;
  // LINE OA
  lineChannelAccessToken?: string;
  lineChannelSecret?: string;
  lineWebhookUrl?: string;
  // Slip Verification Provider (Slip2Go / SlipOK / Manual)
  slipVerificationProvider?: "slip2go" | "slipok" | "manual";
  slip2goSecretKey?: string;
  slipokApiKey?: string;
  slipokBranchId?: string;
  // Digital
  signatureUrl?: string;
  stampUrl?: string;
  contractTerms?: string;
  imageUrl?: string;
// Room Types
  roomTypes?: RoomTypeConfig[];
  // LINE automatic notifications (stored as JSON in branch_settings.notification_settings)
  notificationSettings?: NotificationSettings;
}

/** ตั้งค่าการแจ้งเตือน LINE อัตโนมัติของสาขา — นับวันจากวันครบกำหนดชำระของแต่ละบิล */
export interface NotificationSettings {
  /** ส่งบิลเข้า LINE ทันทีที่ออกบิล */
  sendNewBill: boolean;
  /** เตือนก่อนครบกำหนด */
  remindBeforeEnabled: boolean;
  /** เตือนก่อนครบกำหนดกี่วัน (เลือกได้หลายค่า, 0 = วันครบกำหนด) */
  remindBeforeDays: number[];
  /** เตือนหลังเลยกำหนด */
  remindOverdueEnabled: boolean;
  /** เตือนซ้ำทุกกี่วันหลังเลยกำหนด */
  remindOverdueEveryDays: number;
  /** เตือนหลังเลยกำหนดไม่เกินกี่ครั้ง */
  remindOverdueMaxTimes: number;
  /** เวลาส่ง "HH:MM" */
  sendTime: string;
  /** แจ้งความคืบหน้างานซ่อม */
  notifyRepairUpdates: boolean;
}

// 7. Room Type Configuration
export interface RoomTypeConfig {
  id: string;
  name: string;
  monthlyRate: number;
  dailyRate: number;
  description?: string;
  isDefault?: boolean;
}

export const defaultRoomTypes: RoomTypeConfig[] = [
  {
    id: "rt-1",
    name: "ห้องแอร์ (มาตรฐาน)",
    monthlyRate: 4000,
    dailyRate: 650,
    description: "แอร์, เตียง 5 ฟุต, ตู้เสื้อผ้า, โต๊ะเครื่องแป้ง, เครื่องทำน้ำอุ่น",
    isDefault: true,
  },
  {
    id: "rt-2",
    name: "ห้องพัดลม",
    monthlyRate: 2800,
    dailyRate: 450,
    description: "พัดลมเพดาน, เตียง 5 ฟุต, ตู้เสื้อผ้า, ระเบียงส่วนตัว",
    isDefault: false,
  },
  {
    id: "rt-3",
    name: "ห้องแอร์ (สตูดิโอ)",
    monthlyRate: 4800,
    dailyRate: 750,
    description: "ห้องกว้างพิเศษ, แอร์, เคาน์เตอร์ครัว, ระเบียงกว้าง",
    isDefault: false,
  },
  {
    id: "rt-4",
    name: "ห้องสูทพิเศษ (VIP)",
    monthlyRate: 6000,
    dailyRate: 950,
    description: "ห้องชุด 1 ห้องนอน, สมาร์ททีวี, ตู้เย็น, โซฟา, ไมโครเวฟ ครบชุด",
    isDefault: false,
  },
];

