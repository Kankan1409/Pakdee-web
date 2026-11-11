/**
 * Blank starting values used before real data is loaded from Supabase, and as the
 * template for a new branch. No sample/mock data: names, phones, bank accounts,
 * tax IDs and LINE credentials must come from the user's own settings.
 * (LINE credentials fall back to LINE_CHANNEL_ACCESS_TOKEN / LINE_CHANNEL_SECRET in .env.)
 */
import {
  Property,
  Room,
  RepairItem,
  ContractItem,
  ExpenseItem,
  BroadcastItem,
  ActivityLogItem,
  BranchSettingsDetail,
  defaultRoomTypes,
} from "@/types/dormitory";

export const initialProperty: Property = {
  id: "prop-1",
  name: "",
  address: "",
  phone: "",
  promptpayNumber: "",
  promptpayName: "",
  plan: "starter",
  electricRate: 8, // บาท/หน่วย
  waterRate: 18, // บาท/หน่วย
};

export const initialRooms: Room[] = [];

export const initialRepairs: RepairItem[] = [];

export const initialContracts: ContractItem[] = [];

export const initialExpenses: ExpenseItem[] = [];

export const initialBroadcasts: BroadcastItem[] = [];

export const initialActivityLogs: ActivityLogItem[] = [];

export const initialBranchSettings: BranchSettingsDetail = {
  branchName: "",
  address: "",
  phone: "",
  ownerName: "",
  ownerPhone: "",
  taxId: "",
  waterRate: 18,
  electricRate: 8,
  useMinWater: false,
  minWaterUnits: 3,
  minWaterFee: 100,
  useMinElectric: false,
  minElectricUnits: 3,
  minElectricFee: 100,
  commonFee: 0,
  internetFee: 0,
  parkingFee: 0,
  billCycleDay: 25,
  billDueDay: 5,
  lateFeePerDay: 50,
  bankName: "",
  bankAccountNumber: "",
  bankAccountName: "",
  promptpayNumber: "",
  promptpayName: "",
  lineChannelAccessToken: "",
  lineChannelSecret: "",
  lineWebhookUrl: "",
  contractTerms:
    "ผู้เช่าต้องชำระค่าเช่าภายในวันที่ 5 ของทุกเดือน หากล่าช้ามีค่าปรับวันละ 50 บาท ห้ามเลี้ยงสัตว์ และห้ามส่งเสียงดังหลังเวลา 22:00 น.",
  roomTypes: defaultRoomTypes,
};
