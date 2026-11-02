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
  status: "unpaid" | "partial" | "pending_review" | "paid" | "overdue" | "cancelled";
  slipUrl?: string;
  paidAt?: string;
  qrCodeUrl?: string;
  invoiceType?: "monthly" | "move_in" | "custom";
  slipStatus?: "passed" | "action_needed" | "retrying" | "none";
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
  status: "draft" | "pending_signature" | "active" | "expired" | "terminated";
  terms?: string;
  createdAt: string;
  signatureUrl?: string;
  signedAt?: string;
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
  // Digital
  signatureUrl?: string;
  stampUrl?: string;
  contractTerms?: string;
  imageUrl?: string;
}
