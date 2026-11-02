const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const DB_FILE = path.resolve('data/db_port3000.json');
const OUTPUT_ROOT = path.resolve('PAKDEE_DATABASE_SPECIFICATION_V4.xlsx');
const OUTPUT_DOCS = path.resolve('docs/PAKDEE_DATABASE_SPECIFICATION_V4.xlsx');
const OUTPUT_ARTIFACT = 'C:\\Users\\qishe\\.gemini\\antigravity\\brain\\e87487e9-cb13-47b9-827d-594e1ccdee79\\PAKDEE_DATABASE_SPECIFICATION_V4.xlsx';

const dbRaw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

// Helper to pull array from db with fallback keys
function getCollection(keys, fallback = []) {
  for (const k of keys) {
    if (dbRaw[k] && Array.isArray(dbRaw[k]) && dbRaw[k].length > 0) {
      return dbRaw[k];
    }
  }
  for (const k of keys) {
    if (dbRaw[k] && Array.isArray(dbRaw[k])) {
      return dbRaw[k];
    }
  }
  return fallback;
}

function getObject(keys, fallback = {}) {
  for (const k of keys) {
    if (dbRaw[k] && typeof dbRaw[k] === 'object' && !Array.isArray(dbRaw[k])) {
      return dbRaw[k];
    }
  }
  return fallback;
}

// Extract collections
const properties = getCollection(['properties', 'pakdee_dev_properties']);
const rooms = getCollection(['rooms', 'pakdee_dev_rooms']);
const tenants = getCollection(['tenants', 'pakdee_dev_tenants']);
const contracts = getCollection(['contracts', 'pakdee_dev_contracts']);
const meterReadings = getCollection(['meter_readings', 'pakdee_dev_meter_readings']);
const invoices = getCollection(['invoices', 'pakdee_dev_invoices']);
const payments = getCollection(['payments', 'pakdee_dev_payments']);
const receipts = getCollection(['receipts', 'pakdee_dev_receipts']);
const dailyBookings = getCollection(['daily_bookings', 'pakdee_dev_daily_bookings']);
const repairs = getCollection(['repairs', 'pakdee_dev_repairs']);
const expenses = getCollection(['expenses', 'pakdee_dev_expenses']);
const broadcasts = getCollection(['broadcasts', 'pakdee_dev_broadcasts']);
const activityLogs = getCollection(['activity_logs', 'pakdee_dev_activity_logs']);

// Branch settings can be under multiple keys
const branchSettingsObj = getObject([
  'branch_settings_prop-1793250152420',
  'branch_settings',
  'pakdee_dev_branch_settings',
  'pakdee_dev_branch_settings_prop-1793250152420'
]);

const branchSettingsList = Object.keys(branchSettingsObj).length > 0
  ? [{ propertyId: dbRaw.active_property_id || 'prop-1793250152420', ...branchSettingsObj }]
  : [];

// Table metadata for the Overview Sheet
const TABLE_METADATA = [
  {
    id: 1,
    sheetName: '1_สาขาหอพัก (Properties)',
    tableTh: 'สาขาหอพักและอสังหาริมทรัพย์',
    tableEn: 'properties',
    count: properties.length,
    feature: 'ระบบเลือกสาขา, หัวบิลใบเสร็จ, เรตค่าน้ำไฟมาตรฐาน, ระบบจัดการสาขา',
    description: 'เก็บข้อมูลหอพักแต่ละสาขา เช่น ชื่อ, ที่อยู่, เบอร์โทร, พร้อมเพย์ และแพ็กเกจการใช้งาน'
  },
  {
    id: 2,
    sheetName: '2_ผังห้องพัก (Rooms)',
    tableTh: 'ห้องพักและสถานะผังห้อง',
    tableEn: 'rooms',
    count: rooms.length,
    feature: 'แดชบอร์ดผังห้อง Matrix, สลับชั้น, การ์ดสถานะ (ว่าง/มีผู้เช่า/รายวัน/รอทำความสะอาด/ค้างชำระ)',
    description: 'เก็บข้อมูลห้องพักทุกห้อง เลขห้อง, ชั้น, ประเภทห้อง, ราคาค่าเช่ารายเดือน/รายวัน, สถานะปัจจุบัน และเลขมิเตอร์ล่าสุด'
  },
  {
    id: 3,
    sheetName: '3_ทะเบียนผู้เช่า (Tenants)',
    tableTh: 'ทะเบียนประวัติผู้เช่าและเอกสาร',
    tableEn: 'tenants',
    count: tenants.length,
    feature: 'ทะเบียนผู้เช่า, ค้นหาประวัติ, ตรวจสอบบัตรประชาชน, ออปชันเสริม (ทีวี, ตู้เย็น, ที่จอดรถ)',
    description: 'เก็บข้อมูลผู้เช่า ชื่อ-นามสกุล, เบอร์โทร, เลขบัตรประชาชน, ที่อยู่, เบอร์ติดต่อฉุกเฉิน, ทะเบียนรถ และค่าบริการรายเดือน'
  },
  {
    id: 4,
    sheetName: '4_สัญญาเช่า (Contracts)',
    tableTh: 'สัญญาเช่าห้องพักดิจิทัล',
    tableEn: 'contracts',
    count: contracts.length,
    feature: 'ระบบสัญญาเช่าออนไลน์, พิมพ์สัญญา A4, บันทึกเงินประกันมัดจำ, ตรวจสอบวันหมดสัญญา',
    description: 'เก็บสัญญาเช่า เลขที่สัญญา, วันเริ่ม-สิ้นสุดสัญญา, ค่าเช่า, เงินประกัน, ค่าเช่าล่วงหน้า, เงื่อนไข และสถานะสัญญา'
  },
  {
    id: 5,
    sheetName: '5_จดมิเตอร์น้ำไฟ (Meters)',
    tableTh: 'ประวัติการจดมิเตอร์น้ำและไฟฟ้า',
    tableEn: 'meter_readings',
    count: meterReadings.length,
    feature: 'ระบบจดมิเตอร์ Fast Entry Spreadsheet, คำนวณหน่วยใช้และยอดเงินเรียลไทม์, ส่งข้อมูลออกบิล',
    description: 'เก็บบันทึกเลขมิเตอร์ไฟฟ้าและน้ำประปาประจำรอบเดือน เลขก่อนหน้า, เลขปัจจุบัน, หน่วยที่ใช้, วันที่จด และผู้บันทึก'
  },
  {
    id: 6,
    sheetName: '6_ใบแจ้งหนี้ (Invoices)',
    tableTh: 'ใบแจ้งหนี้และบิลเรียกเก็บเงิน',
    tableEn: 'invoices',
    count: invoices.length,
    feature: 'ระบบออกบิลประจำเดือน, ออกบิลแรกเข้า, บิลปรับแต่ง, สร้าง QR พร้อมเพย์, ติดตามหนี้ค้างชำระ',
    description: 'เก็บข้อมูลบิลเรียกเก็บเงิน เลขที่บิล, ห้อง, ผู้เช่า, รายการย่อย (ค่าเช่า+ค่าน้ำ+ค่าไฟ), ยอดรวม, กำหนดชำระ และสถานะบิล'
  },
  {
    id: 7,
    sheetName: '7_สลิปและการชำระ (Payments)',
    tableTh: 'ประวัติการชำระเงินและสลิปโอน',
    tableEn: 'payments',
    count: payments.length,
    feature: 'ระบบตรวจสลิปโอนเงิน (Slip Verification), บันทึกการรับชำระเงินสด/พร้อมเพย์',
    description: 'เก็บบันทึกการรับชำระเงิน เลขที่การชำระ, รหัสบิล, ช่องทางชำระ (โอน/เงินสด/พร้อมเพย์), ยอดเงิน, รูปสลิป และเวลาชำระ'
  },
  {
    id: 8,
    sheetName: '8_ใบเสร็จรับเงิน (Receipts)',
    tableTh: 'ใบเสร็จรับเงินอย่างเป็นทางการ',
    tableEn: 'receipts',
    count: receipts.length,
    feature: 'ระบบพิมพ์ใบเสร็จรับเงิน A4/80mm, ส่งใบเสร็จดิจิทัลให้ผู้เช่า, รายงานภาษีและรายรับ',
    description: 'เก็บบันทึกใบเสร็จรับเงินที่ออกให้ผู้เช่าหลังจากชำระเงินเสร็จสิ้น เลขที่ใบเสร็จ, รหัสบิล, ยอดเงิน, วันที่ออก และผู้ออกบิล'
  },
  {
    id: 9,
    sheetName: '9_จองห้องพักรายวัน (Daily)',
    tableTh: 'การจองและเข้าพักห้องพักรายวัน',
    tableEn: 'daily_bookings',
    count: dailyBookings.length,
    feature: 'ปฏิทินห้องพักรายวัน, เช็คอิน (In), เช็คเอาต์ (Out), คำนวณมัดจำกุญแจ, สลับสถานะแม่บ้าน',
    description: 'เก็บข้อมูลลูกค้าพักรายวัน ชื่อแขก, เบอร์โทร, วันที่เช็คอิน-เช็คเอาต์, จำนวนคืน, ค่าห้อง, เงินมัดจำกุญแจ และสถานะ'
  },
  {
    id: 10,
    sheetName: '10_แจ้งซ่อมบำรุง (Repairs)',
    tableTh: 'ระบบแจ้งซ่อมและบำรุงรักษา',
    tableEn: 'repairs',
    count: repairs.length,
    feature: 'รับเรื่องแจ้งซ่อมจากผู้เช่า, มอบหมายงานช่าง, ติดตามสถานะงานซ่อม, บันทึกค่าใช้จ่ายงานซ่อม',
    description: 'เก็บรายการแจ้งซ่อม ห้อง, หมวดหมู่ (แอร์/ประปา/ไฟ/เฟอร์นิเจอร์), รายละเอียด, ระดับความเร่งด่วน, ช่างผู้รับผิดชอบ และค่าซ่อม'
  },
  {
    id: 11,
    sheetName: '11_รายจ่ายหอพัก (Expenses)',
    tableTh: 'บันทึกรายจ่ายและต้นทุนดำเนินงาน',
    tableEn: 'expenses',
    count: expenses.length,
    feature: 'ระบบบันทึกรายจ่ายหอพัก, จัดการต้นทุน, คำนวณกำไรสุทธิ (P&L) ในแดชบอร์ดผู้บริหาร',
    description: 'เก็บบันทึกค่าใช้จ่ายหอพัก เช่น ค่าน้ำ-ไฟหลวง, เงินเดือนแม่บ้าน/รปภ., ค่าเน็ต, วัสดุสิ้นเปลือง และผู้รับเงิน'
  },
  {
    id: 12,
    sheetName: '12_ตั้งค่าสาขา (Settings)',
    tableTh: 'การตั้งค่าสาขาและอัตราบริการ',
    tableEn: 'branch_settings',
    count: branchSettingsList.length,
    feature: 'หน้าตั้งค่าหอพัก, กำหนดเรตค่าน้ำไฟ, ขั้นต่ำมิเตอร์, ค่าส่วนกลาง, บัญชีธนาคาร, LINE OA Token',
    description: 'เก็บการตั้งค่าแบบละเอียดของสาขา เรตค่าน้ำ-ไฟต่อหน่วย, ค่าปรับล่าช้า, พร้อมเพย์, Webhook URL และ Channel Secret'
  },
  {
    id: 13,
    sheetName: '13_บรอดแคสต์ LINE (Broadcasts)',
    tableTh: 'ข้อความบรอดแคสต์และประกาศหอพัก',
    tableEn: 'broadcasts',
    count: broadcasts.length,
    feature: 'ส่งข้อความประกาศผู้เช่าผ่าน LINE Official Account (ประกาศดับไฟ, ล้างถังน้ำ, พัสดุมาถึง)',
    description: 'เก็บประวัติการส่งบรอดแคสต์ หัวข้อ, ข้อความ, กลุ่มเป้าหมาย (ทุกห้อง/รายชั้น/เฉพาะห้อง), วันที่ส่ง และจำนวนผู้รับ'
  },
  {
    id: 14,
    sheetName: '14_ประวัติกิจกรรม (Audit_Logs)',
    tableTh: 'ประวัติการใช้งานและกิจกรรมในระบบ',
    tableEn: 'activity_logs',
    count: activityLogs.length,
    feature: 'ระบบตรวจสอบย้อนหลัง (Audit Trail), บันทึกการเพิ่ม/แก้ไข/ลบข้อมูล ป้องกันการทุจริต',
    description: 'เก็บบันทึก Activity Log ผู้ใช้งาน, การกระทำ (CREATE/UPDATE/DELETE/PAYMENT), โมดูลที่ดำเนินการ, รายละเอียด และ Timestamp'
  }
];

async function generateDatabaseExcel() {
  console.log('Generating Database Specification & Data Export Workbook...');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PAKDEE Dormitory System';
  workbook.lastModifiedBy = 'PAKDEE Admin & Database Service';
  workbook.created = new Date();
  workbook.modified = new Date();

  const brandFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF064E3B' } // Deep Emerald Green
  };

  const headerFont = {
    name: 'Tahoma',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' }
  };

  const subHeaderFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF047857' } // Emerald medium
  };

  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
  };

  // ==========================================
  // SHEET 0: Overview / Data Catalog
  // ==========================================
  const ws0 = workbook.addWorksheet('0_สารบัญภาพรวม (Overview)', {
    views: [{ showGridLines: true }]
  });

  ws0.columns = [
    { header: 'ลำดับ', key: 'id', width: 8 },
    { header: 'ชื่อชีทในไฟล์นี้ (Sheet Name)', key: 'sheetName', width: 32 },
    { header: 'ชื่อตาราง (ภาษาไทย)', key: 'tableTh', width: 34 },
    { header: 'ชื่อตารางในฐานข้อมูล (DB Table)', key: 'tableEn', width: 22 },
    { header: 'จำนวนข้อมูลปัจจุบัน (Records)', key: 'count', width: 22 },
    { header: 'โมดูล / ฟีเจอร์ที่ใช้งานในเว็บ (Feature Usage)', key: 'feature', width: 45 },
    { header: 'คำอธิบายข้อมูลที่จัดเก็บ (Description)', key: 'description', width: 60 }
  ];

  // Style Header Row
  const headerRow0 = ws0.getRow(1);
  headerRow0.height = 28;
  headerRow0.eachCell((cell) => {
    cell.fill = brandFill;
    cell.font = headerFont;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  TABLE_METADATA.forEach((item, idx) => {
    const row = ws0.addRow(item);
    row.height = 24;
    row.eachCell((cell, colNum) => {
      cell.border = thinBorder;
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNum === 1 || colNum === 5 ? 'center' : 'left'
      };
      if (idx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    });
  });

  // Helper function to build a styled data sheet
  function createDataSheet(sheetName, columns, dataList, fallbackItem = null) {
    const ws = workbook.addWorksheet(sheetName, { views: [{ showGridLines: true }] });
    ws.columns = columns;

    const hRow = ws.getRow(1);
    hRow.height = 28;
    hRow.eachCell((cell) => {
      cell.fill = brandFill;
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const itemsToRender = dataList && dataList.length > 0 ? dataList : (fallbackItem ? [fallbackItem] : []);

    itemsToRender.forEach((item, idx) => {
      const rowData = {};
      columns.forEach((col) => {
        let val = item[col.key];
        // Formatting nested objects or arrays if needed
        if (typeof val === 'object' && val !== null) {
          if (Array.isArray(val)) {
            val = val.map((v) => (typeof v === 'object' ? JSON.stringify(v) : v)).join(', ');
          } else {
            val = JSON.stringify(val);
          }
        }
        rowData[col.key] = val !== undefined && val !== null ? val : '-';
      });

      const row = ws.addRow(rowData);
      row.height = 22;
      row.eachCell((cell, colNum) => {
        cell.border = thinBorder;
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        if (idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
      });
    });

    return ws;
  }

  // -------------------------------------------------------------
  // Sheet 1: Properties
  // -------------------------------------------------------------
  createDataSheet(
    '1_สาขาหอพัก (Properties)',
    [
      { header: 'ID สาขา', key: 'id', width: 26 },
      { header: 'ชื่อหอพัก/สาขา', key: 'name', width: 30 },
      { header: 'ที่อยู่', key: 'address', width: 45 },
      { header: 'เบอร์โทรศัพท์ติดต่อ', key: 'phone', width: 18 },
      { header: 'หมายเลขพร้อมเพย์ (PromptPay)', key: 'promptpayNumber', width: 25 },
      { header: 'ชื่อบัญชีพร้อมเพย์', key: 'promptpayName', width: 25 },
      { header: 'แพ็กเกจ (Plan)', key: 'plan', width: 15 },
      { header: 'ค่าไฟ (บ./หน่วย)', key: 'electricRate', width: 16 },
      { header: 'ค่าน้ำ (บ./หน่วย)', key: 'waterRate', width: 16 },
      { header: 'URL รูปภาพหอพัก', key: 'imageUrl', width: 30 }
    ],
    properties,
    {
      id: 'prop-01',
      name: 'พักดี แมนชั่น (สุขุมวิท 71)',
      address: '123/45 ซอยสุขุมวิท 71 แขวงพระโขนงเหนือ เขตวัฒนา กรุงเทพฯ 10110',
      phone: '081-999-8888',
      promptpayNumber: '0819998888',
      promptpayName: 'คุณพักดี มีสุข',
      plan: 'pro',
      electricRate: 8,
      waterRate: 18,
      imageUrl: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5'
    }
  );

  // -------------------------------------------------------------
  // Sheet 2: Rooms
  // -------------------------------------------------------------
  createDataSheet(
    '2_ผังห้องพัก (Rooms)',
    [
      { header: 'ID ห้องพัก', key: 'id', width: 35 },
      { header: 'ID สาขา (Property)', key: 'propertyId', width: 26 },
      { header: 'ID อาคาร (Building)', key: 'buildingId', width: 22 },
      { header: 'เลขห้อง (Room)', key: 'roomNumber', width: 14 },
      { header: 'ชั้น (Floor)', key: 'floor', width: 12 },
      { header: 'ประเภทห้อง (Type)', key: 'type', width: 18 },
      { header: 'รูปแบบการเช่า (Rental)', key: 'rentalType', width: 18 },
      { header: 'ค่าเช่ารายเดือน (บ./ด.)', key: 'monthlyRate', width: 20 },
      { header: 'ค่าเช่ารายวัน (บ./คืน)', key: 'dailyRate', width: 20 },
      { header: 'สถานะห้อง (Status)', key: 'status', width: 18 },
      { header: 'ชื่อผู้เช่าปัจจุบัน', key: 'tenantName', width: 24 },
      { header: 'เบอร์โทรผู้เช่า', key: 'tenantPhone', width: 18 },
      { header: 'วันสิ้นสุดสัญญาเช่า', key: 'leaseEndDate', width: 20 },
      { header: 'เลขมิเตอร์ไฟฟ้าล่าสุด', key: 'currentElectricMeter', width: 20 },
      { header: 'เลขมิเตอร์น้ำประปาล่าสุด', key: 'currentWaterMeter', width: 20 },
      { header: 'เงินประกันมัดจำห้อง', key: 'depositAmount', width: 20 },
      { header: 'เวอร์ชันข้อมูล (OCC)', key: 'version', width: 16 }
    ],
    rooms.map((r) => ({
      ...r,
      tenantName: r.currentTenant ? r.currentTenant.fullName : '-',
      tenantPhone: r.currentTenant ? r.currentTenant.phone : '-'
    })),
    {
      id: 'room-101',
      propertyId: 'prop-01',
      buildingId: 'bldg-a',
      roomNumber: '101',
      floor: 1,
      type: 'ห้องแอร์',
      rentalType: 'both',
      monthlyRate: 4000,
      dailyRate: 650,
      status: 'occupied',
      tenantName: 'คุณสมชาย รักสงบ',
      tenantPhone: '089-988-7766',
      leaseEndDate: '2027-10-28',
      currentElectricMeter: 1390,
      currentWaterMeter: 275,
      depositAmount: 8000,
      version: 1
    }
  );

  // -------------------------------------------------------------
  // Sheet 3: Tenants
  // -------------------------------------------------------------
  createDataSheet(
    '3_ทะเบียนผู้เช่า (Tenants)',
    [
      { header: 'ID ผู้เช่า', key: 'id', width: 26 },
      { header: 'ID สาขา', key: 'propertyId', width: 24 },
      { header: 'ID ห้องพัก', key: 'roomId', width: 30 },
      { header: 'เลขห้องที่พัก', key: 'roomNumber', width: 14 },
      { header: 'ชื่อ-นามสกุล', key: 'fullName', width: 26 },
      { header: 'เบอร์โทรศัพท์', key: 'phone', width: 18 },
      { header: 'เลขประจำตัวประชาชน', key: 'idCard', width: 22 },
      { header: 'เพศ (Gender)', key: 'gender', width: 14 },
      { header: 'อายุ (ปี)', key: 'age', width: 12 },
      { header: 'LINE ID', key: 'lineId', width: 18 },
      { header: 'อีเมล (Email)', key: 'email', width: 24 },
      { header: 'ที่อยู่ตามบัตรประชาชน', key: 'address', width: 45 },
      { header: 'ผู้ติดต่อฉุกเฉิน / เบอร์', key: 'emergencyContact', width: 25 },
      { header: 'ทะเบียนรถ', key: 'vehiclePlate', width: 16 },
      { header: 'เงินประกันมัดจำ (Deposit)', key: 'depositAmount', width: 22 },
      { header: 'เช่าทีวี (+บ./ด.)', key: 'tvRentalFee', width: 16 },
      { header: 'เช่าตู้เย็น (+บ./ด.)', key: 'fridgeRentalFee', width: 16 },
      { header: 'ค่าส่วนกลาง (+บ./ด.)', key: 'commonFee', width: 18 },
      { header: 'ค่า WiFi (+บ./ด.)', key: 'wifiFee', width: 16 },
      { header: 'ค่าที่จอดรถ (+บ./ด.)', key: 'parkingFee', width: 18 },
      { header: 'หมายเหตุเพิ่มเติม', key: 'notes', width: 30 }
    ],
    tenants,
    {
      id: 't-01',
      propertyId: 'prop-01',
      roomId: 'room-101',
      roomNumber: '101',
      fullName: 'คุณสมชาย รักสงบ',
      phone: '089-988-7766',
      idCard: '1-1002-34567-89-0',
      gender: 'MALE',
      age: 29,
      lineId: 'somchai_99',
      email: 'somchai@gmail.com',
      address: '99/1 ซอยอารีย์ พญาไท กทม. 10400',
      emergencyContact: '081-222-3333 (บิดา)',
      vehiclePlate: '1กข-9999 กทม.',
      depositAmount: 8000,
      tvRentalFee: 0,
      fridgeRentalFee: 0,
      commonFee: 300,
      wifiFee: 200,
      parkingFee: 0,
      notes: 'ผู้เช่าสุภาพ รักความสงบ'
    }
  );

  // -------------------------------------------------------------
  // Sheet 4: Contracts
  // -------------------------------------------------------------
  createDataSheet(
    '4_สัญญาเช่า (Contracts)',
    [
      { header: 'ID สัญญา', key: 'id', width: 24 },
      { header: 'เลขที่สัญญา (Contract No.)', key: 'contractNumber', width: 22 },
      { header: 'ID สาขา', key: 'propertyId', width: 24 },
      { header: 'เลขห้อง (Room)', key: 'roomNumber', width: 14 },
      { header: 'ชื่อผู้เช่าตามสัญญา', key: 'tenantName', width: 25 },
      { header: 'เบอร์โทรศัพท์ผู้เช่า', key: 'tenantPhone', width: 18 },
      { header: 'วันที่เริ่มสัญญา (Start)', key: 'startDate', width: 16 },
      { header: 'วันที่สิ้นสุดสัญญา (End)', key: 'endDate', width: 16 },
      { header: 'ค่าเช่าห้อง (บ./เดือน)', key: 'monthlyRent', width: 20 },
      { header: 'เงินประกันมัดจำ (Deposit)', key: 'depositAmount', width: 22 },
      { header: 'ค่าเช่าล่วงหน้า (Advance)', key: 'advanceRent', width: 20 },
      { header: 'บริการเช่าทีวี', key: 'tvRentalFee', width: 15 },
      { header: 'บริการเช่าตู้เย็น', key: 'fridgeRentalFee', width: 16 },
      { header: 'ค่าส่วนกลาง', key: 'commonFee', width: 15 },
      { header: 'ค่าที่จอดรถ', key: 'parkingFee', width: 15 },
      { header: 'สถานะสัญญา (Status)', key: 'status', width: 18 },
      { header: 'วันที่สร้างสัญญา', key: 'createdAt', width: 22 }
    ],
    contracts,
    {
      id: 'ct-01',
      contractNumber: 'CT-2026-101-01',
      propertyId: 'prop-01',
      roomNumber: '101',
      tenantName: 'คุณสมชาย รักสงบ',
      tenantPhone: '089-988-7766',
      startDate: '2026-10-28',
      endDate: '2027-10-28',
      monthlyRent: 4000,
      depositAmount: 8000,
      advanceRent: 4000,
      tvRentalFee: 0,
      fridgeRentalFee: 0,
      commonFee: 300,
      parkingFee: 0,
      status: 'active',
      createdAt: '2026-10-28T09:00:00Z'
    }
  );

  // -------------------------------------------------------------
  // Sheet 5: Meter Readings
  // -------------------------------------------------------------
  createDataSheet(
    '5_จดมิเตอร์น้ำไฟ (Meters)',
    [
      { header: 'ID การจดมิเตอร์', key: 'id', width: 26 },
      { header: 'ID ห้องพัก', key: 'roomId', width: 30 },
      { header: 'รอบเดือนที่จด (Month)', key: 'billing_month', width: 18 },
      { header: 'เลขไฟก่อนหน้า (Prev)', key: 'electric_prev', width: 18 },
      { header: 'เลขไฟปัจจุบัน (Curr)', key: 'electric_curr', width: 18 },
      { header: 'หน่วยไฟที่ใช้ (Units)', key: 'electric_units', width: 18 },
      { header: 'เลขน้ำก่อนหน้า (Prev)', key: 'water_prev', width: 18 },
      { header: 'เลขน้ำปัจจุบัน (Curr)', key: 'water_curr', width: 18 },
      { header: 'หน่วยน้ำที่ใช้ (Units)', key: 'water_units', width: 18 },
      { header: 'วันที่และเวลาที่บันทึก', key: 'recorded_at', width: 22 },
      { header: 'ผู้บันทึกมิเตอร์', key: 'recorded_by', width: 20 }
    ],
    meterReadings,
    {
      id: 'mtr-01',
      roomId: 'room-101',
      billing_month: '2026-11',
      electric_prev: 1340,
      electric_curr: 1390,
      electric_units: 50,
      water_prev: 269,
      water_curr: 275,
      water_units: 6,
      recorded_at: '2026-11-01T10:00:00Z',
      recorded_by: 'ผู้ดูแลหอพัก (Manager)'
    }
  );

  // -------------------------------------------------------------
  // Sheet 6: Invoices
  // -------------------------------------------------------------
  createDataSheet(
    '6_ใบแจ้งหนี้ (Invoices)',
    [
      { header: 'ID ใบแจ้งหนี้', key: 'id', width: 30 },
      { header: 'เลขที่บิล (Invoice No.)', key: 'invoiceNumber', width: 24 },
      { header: 'ID สาขา', key: 'propertyId', width: 24 },
      { header: 'เลขห้อง (Room)', key: 'roomNumber', width: 14 },
      { header: 'ชื่อผู้รับบิล / ผู้เช่า', key: 'tenantName', width: 25 },
      { header: 'เบอร์โทรศัพท์', key: 'tenantPhone', width: 18 },
      { header: 'วันที่ออกบิล (Billing Date)', key: 'billingDate', width: 18 },
      { header: 'กำหนดชำระ (Due Date)', key: 'dueDate', width: 18 },
      { header: 'ยอดเงินรวมทั้งสิ้น (บาท)', key: 'totalAmount', width: 22 },
      { header: 'สถานะการชำระ (Status)', key: 'status', width: 18 },
      { header: 'วันที่ชำระเงินจริง', key: 'paidAt', width: 22 },
      { header: 'ประเภทบิล (Type)', key: 'invoiceType', width: 16 },
      { header: 'รายการในบิล (Items Summary)', key: 'itemsSummary', width: 45 }
    ],
    invoices.map((inv) => ({
      ...inv,
      itemsSummary: Array.isArray(inv.items)
        ? inv.items.map((i) => `${i.name}: ฿${i.amount}`).join(' | ')
        : '-'
    })),
    {
      id: 'inv-01',
      invoiceNumber: 'INV-202611-101',
      propertyId: 'prop-01',
      roomNumber: '101',
      tenantName: 'คุณสมชาย รักสงบ',
      tenantPhone: '089-988-7766',
      billingDate: '2026-11-01',
      dueDate: '2026-11-05',
      totalAmount: 4808,
      status: 'paid',
      paidAt: '2026-11-02T10:30:00Z',
      invoiceType: 'monthly',
      itemsSummary: 'ค่าเช่าห้อง: ฿4000 | ค่าไฟ 50 หน่วย: ฿400 | ค่าน้ำ 6 หน่วย: ฿108 | ค่าส่วนกลาง: ฿300'
    }
  );

  // -------------------------------------------------------------
  // Sheet 7: Payments
  // -------------------------------------------------------------
  createDataSheet(
    '7_สลิปและการชำระ (Payments)',
    [
      { header: 'ID การชำระ', key: 'id', width: 26 },
      { header: 'เลขที่รับชำระ (Payment No.)', key: 'paymentNumber', width: 22 },
      { header: 'ID ใบแจ้งหนี้ (Invoice ID)', key: 'invoiceId', width: 28 },
      { header: 'เลขห้อง', key: 'roomNumber', width: 14 },
      { header: 'ชื่อผู้ชำระ', key: 'tenantName', width: 24 },
      { header: 'ยอดเงินที่ชำระ (บาท)', key: 'amount', width: 20 },
      { header: 'ช่องทางชำระ (Method)', key: 'paymentMethod', width: 18 },
      { header: 'วันและเวลาที่ชำระ', key: 'paidAt', width: 22 },
      { header: 'สถานะการตรวจสลิป', key: 'status', width: 18 },
      { header: 'URL รูปภาพสลิปโอนเงิน', key: 'slipUrl', width: 30 },
      { header: 'หมายเหตุ', key: 'notes', width: 25 }
    ],
    payments,
    {
      id: 'pmt-01',
      paymentNumber: 'PMT-202611-001',
      invoiceId: 'inv-01',
      roomNumber: '101',
      tenantName: 'คุณสมชาย รักสงบ',
      amount: 4808,
      paymentMethod: 'promptpay',
      paidAt: '2026-11-02T10:30:00Z',
      status: 'completed',
      slipUrl: 'https://storage.pakdee.com/slips/slip-202611-101.jpg',
      notes: 'AI ตรวจสลิปถูกต้อง ธ.กสิกรไทย'
    }
  );

  // -------------------------------------------------------------
  // Sheet 8: Receipts
  // -------------------------------------------------------------
  createDataSheet(
    '8_ใบเสร็จรับเงิน (Receipts)',
    [
      { header: 'ID ใบเสร็จ', key: 'id', width: 26 },
      { header: 'เลขที่ใบเสร็จ (Receipt No.)', key: 'receiptNumber', width: 22 },
      { header: 'ID การชำระเงิน', key: 'paymentId', width: 26 },
      { header: 'ID ใบแจ้งหนี้', key: 'invoiceId', width: 28 },
      { header: 'เลขห้อง', key: 'roomNumber', width: 14 },
      { header: 'ชื่อผู้รับใบเสร็จ', key: 'tenantName', width: 24 },
      { header: 'ยอดเงินสุทธิ (บาท)', key: 'amount', width: 20 },
      { header: 'วันที่ออกใบเสร็จ', key: 'issuedAt', width: 22 },
      { header: 'ผู้ออกใบเสร็จ', key: 'issuedBy', width: 20 },
      { header: 'URL ไฟล์ PDF ใบเสร็จ', key: 'pdfUrl', width: 30 }
    ],
    receipts,
    {
      id: 'rec-01',
      receiptNumber: 'REC-202611-001',
      paymentId: 'pmt-01',
      invoiceId: 'inv-01',
      roomNumber: '101',
      tenantName: 'คุณสมชาย รักสงบ',
      amount: 4808,
      issuedAt: '2026-11-02T10:31:00Z',
      issuedBy: 'ระบบอัตโนมัติ (AI Slip Verification)',
      pdfUrl: 'https://storage.pakdee.com/receipts/rec-202611-001.pdf'
    }
  );

  // -------------------------------------------------------------
  // Sheet 9: Daily Bookings
  // -------------------------------------------------------------
  createDataSheet(
    '9_จองห้องพักรายวัน (Daily)',
    [
      { header: 'ID การจอง', key: 'id', width: 26 },
      { header: 'ID สาขา', key: 'propertyId', width: 24 },
      { header: 'เลขห้องที่จอง', key: 'roomNumber', width: 14 },
      { header: 'ชื่อแขกผู้เข้าพัก', key: 'guestName', width: 24 },
      { header: 'เบอร์โทรศัพท์แขก', key: 'guestPhone', width: 18 },
      { header: 'เลขบัตรประชาชน', key: 'idCard', width: 20 },
      { header: 'ทะเบียนรถแขก', key: 'vehiclePlate', width: 16 },
      { header: 'วันที่เช็คอิน (In)', key: 'checkInDate', width: 16 },
      { header: 'เวลาเช็คอิน', key: 'checkInTime', width: 14 },
      { header: 'วันที่เช็คเอาต์ (Out)', key: 'checkOutDate', width: 16 },
      { header: 'เวลาเช็คเอาต์', key: 'checkOutTime', width: 14 },
      { header: 'จำนวนคืน (Nights)', key: 'nights', width: 15 },
      { header: 'ค่าห้องต่อคืน (บาท)', key: 'dailyRate', width: 18 },
      { header: 'ค่าห้องรวมทั้งสิ้น', key: 'totalRoomPrice', width: 18 },
      { header: 'เงินมัดจำกุญแจ (Key Deposit)', key: 'keyDeposit', width: 24 },
      { header: 'สถานะการเข้าพัก', key: 'status', width: 18 }
    ],
    dailyBookings,
    {
      id: 'bk-01',
      propertyId: 'prop-01',
      roomNumber: '103',
      guestName: 'คุณธนกร เดินทางไกล',
      guestPhone: '086-555-4321',
      idCard: '3-1005-99887-11-2',
      vehiclePlate: '9กฬ-1234 กทม.',
      checkInDate: '2026-11-02',
      checkInTime: '14:00',
      checkOutDate: '2026-11-03',
      checkOutTime: '12:00',
      nights: 1,
      dailyRate: 650,
      totalRoomPrice: 650,
      keyDeposit: 500,
      status: 'confirmed'
    }
  );

  // -------------------------------------------------------------
  // Sheet 10: Repairs
  // -------------------------------------------------------------
  createDataSheet(
    '10_แจ้งซ่อมบำรุง (Repairs)',
    [
      { header: 'ID การแจ้งซ่อม', key: 'id', width: 24 },
      { header: 'ID สาขา', key: 'propertyId', width: 24 },
      { header: 'เลขห้อง', key: 'roomNumber', width: 14 },
      { header: 'หมวดหมู่การซ่อม (Category)', key: 'category', width: 22 },
      { header: 'หัวข้องานซ่อม', key: 'title', width: 28 },
      { header: 'รายละเอียดปัญหา', key: 'description', width: 45 },
      { header: 'ระดับความเร่งด่วน', key: 'priority', width: 18 },
      { header: 'สถานะงานซ่อม', key: 'status', width: 18 },
      { header: 'ค่าใช้จ่ายในการซ่อม (บาท)', key: 'cost', width: 22 },
      { header: 'ช่างผู้รับผิดชอบ', key: 'technicianName', width: 22 },
      { header: 'วันที่แจ้งซ่อม', key: 'reportedAt', width: 20 },
      { header: 'วันที่ซ่อมเสร็จ', key: 'completedAt', width: 20 }
    ],
    repairs,
    {
      id: 'rep-01',
      propertyId: 'prop-01',
      roomNumber: '204',
      category: 'air',
      title: 'แอร์มีน้ำหยดและไม่ค่อยเย็น',
      description: 'แอร์ห้องนอนหลักมีน้ำหยดลงพื้น และลมไม่ค่อยเย็น มีเสียงดังเบาๆ',
      priority: 'urgent',
      status: 'in_progress',
      cost: 500,
      technicianName: 'ช่างสมปอง (แอร์เซอร์วิส)',
      reportedAt: '2026-11-01T14:20:00Z',
      completedAt: '-'
    }
  );

  // -------------------------------------------------------------
  // Sheet 11: Expenses
  // -------------------------------------------------------------
  createDataSheet(
    '11_รายจ่ายหอพัก (Expenses)',
    [
      { header: 'ID รายจ่าย', key: 'id', width: 24 },
      { header: 'ID สาขา', key: 'propertyId', width: 24 },
      { header: 'หมวดหมู่รายจ่าย', key: 'category', width: 20 },
      { header: 'ชื่อรายการค่าใช้จ่าย', key: 'title', width: 32 },
      { header: 'ยอดเงินจ่าย (บาท)', key: 'amount', width: 20 },
      { header: 'วันที่จ่ายเงิน', key: 'date', width: 16 },
      { header: 'จ่ายให้ใคร / ร้านค้า (Paid To)', key: 'paidTo', width: 26 },
      { header: 'URL ใบเสร็จ/หลักฐาน', key: 'receiptUrl', width: 25 },
      { header: 'หมายเหตุเพิ่มเติม', key: 'notes', width: 30 }
    ],
    expenses,
    {
      id: 'exp-01',
      propertyId: 'prop-01',
      category: 'electric',
      title: 'ชำระค่าไฟหลวงประจำเดือน (การไฟฟ้านครหลวง)',
      amount: 14500,
      date: '2026-10-25',
      paidTo: 'การไฟฟ้านครหลวง (MEA)',
      receiptUrl: 'https://storage.pakdee.com/expenses/mea-oct2026.pdf',
      notes: 'ตัดจ่ายผ่านบัญชี SCB ของหอพัก'
    }
  );

  // -------------------------------------------------------------
  // Sheet 12: Branch Settings
  // -------------------------------------------------------------
  createDataSheet(
    '12_ตั้งค่าสาขา (Settings)',
    [
      { header: 'ID สาขา', key: 'propertyId', width: 26 },
      { header: 'ชื่อสาขา', key: 'branchName', width: 28 },
      { header: 'ที่อยู่สาขา', key: 'address', width: 45 },
      { header: 'เบอร์โทรศัพท์สาขา', key: 'phone', width: 18 },
      { header: 'ค่าไฟมาตรฐาน (บ./หน่วย)', key: 'electricRate', width: 22 },
      { header: 'ค่าน้ำมาตรฐาน (บ./หน่วย)', key: 'waterRate', width: 22 },
      { header: 'เปิดใช้ขั้นต่ำค่าไฟ', key: 'useMinElectric', width: 18 },
      { header: 'ค่าไฟขั้นต่ำ (บาท)', key: 'minElectricFee', width: 18 },
      { header: 'เปิดใช้ขั้นต่ำค่าน้ำ', key: 'useMinWater', width: 18 },
      { header: 'ค่าน้ำขั้นต่ำ (บาท)', key: 'minWaterFee', width: 18 },
      { header: 'ค่าส่วนกลางรายเดือน', key: 'commonFee', width: 20 },
      { header: 'หมายเลขพร้อมเพย์หอพัก', key: 'promptpayNumber', width: 24 },
      { header: 'ชื่อบัญชีพร้อมเพย์', key: 'promptpayName', width: 24 },
      { header: 'เลขที่บัญชีธนาคาร', key: 'bankAccount', width: 22 },
      { header: 'ธนาคารที่รับเงิน', key: 'bankName', width: 25 }
    ],
    branchSettingsList,
    {
      propertyId: 'prop-01',
      branchName: 'พักดี แมนชั่น (สุขุมวิท 71)',
      address: '123/45 ซอยสุขุมวิท 71 พระโขนงเหนือ วัฒนา กทม. 10110',
      phone: '081-999-8888',
      electricRate: 8,
      waterRate: 18,
      useMinElectric: false,
      minElectricFee: 100,
      useMinWater: false,
      minWaterFee: 100,
      commonFee: 300,
      promptpayNumber: '0819998888',
      promptpayName: 'คุณพักดี มีสุข',
      bankAccount: '123-4-56789-0',
      bankName: 'ธนาคารกสิกรไทย (KBANK)'
    }
  );

  // -------------------------------------------------------------
  // Sheet 13: Broadcasts
  // -------------------------------------------------------------
  createDataSheet(
    '13_บรอดแคสต์ LINE (Broadcasts)',
    [
      { header: 'ID บรอดแคสต์', key: 'id', width: 24 },
      { header: 'ID สาขา', key: 'propertyId', width: 24 },
      { header: 'เทมเพลต (Template)', key: 'template', width: 18 },
      { header: 'หัวข้อประกาศ', key: 'title', width: 30 },
      { header: 'ข้อความประกาศ', key: 'message', width: 50 },
      { header: 'กลุ่มเป้าหมาย (Target)', key: 'targetType', width: 20 },
      { header: 'เงื่อนไขเป้าหมาย (Value)', key: 'targetValue', width: 20 },
      { header: 'วันและเวลาที่ส่ง', key: 'sentAt', width: 22 },
      { header: 'จำนวนผู้รับ (คน)', key: 'recipientCount', width: 18 },
      { header: 'สถานะการส่ง', key: 'status', width: 16 }
    ],
    broadcasts,
    {
      id: 'bc-01',
      propertyId: 'prop-01',
      template: 'water',
      title: 'แจ้งล้างถังพักน้ำประปาประจำปี',
      message: 'เรียนผู้เช่าทุกท่าน วันพุธที่ 5 พ.ย. เวลา 10:00-14:00 น. จะมีการหยุดจ่ายน้ำเพื่อล้างถังพักน้ำ ขออภัยในความไม่สะดวก',
      targetType: 'all',
      targetValue: 'ทุกห้อง',
      sentAt: '2026-11-01T09:00:00Z',
      recipientCount: 24,
      status: 'sent'
    }
  );

  // -------------------------------------------------------------
  // Sheet 14: Activity Logs
  // -------------------------------------------------------------
  createDataSheet(
    '14_ประวัติกิจกรรม (Audit_Logs)',
    [
      { header: 'ID กิจกรรม', key: 'id', width: 26 },
      { header: 'ID สาขา', key: 'propertyId', width: 24 },
      { header: 'ผู้ใช้ที่ทำรายการ (User)', key: 'userName', width: 22 },
      { header: 'คำสั่ง (Action)', key: 'action', width: 16 },
      { header: 'โมดูล (Entity)', key: 'entity', width: 18 },
      { header: 'รหัสข้อมูลที่ถูกกระทำ', key: 'entityId', width: 26 },
      { header: 'รายละเอียดกิจกรรม (Details)', key: 'details', width: 45 },
      { header: 'วันและเวลา (Timestamp)', key: 'timestamp', width: 22 }
    ],
    activityLogs,
    {
      id: 'act-01',
      propertyId: 'prop-01',
      userName: 'คุณพักดี มีสุข (Owner)',
      action: 'UPDATE',
      entity: 'ROOM',
      entityId: 'room-101',
      details: 'บันทึกสัญญาเช่าใหม่ และอัปเดตสถานะห้อง 101 เป็น "มีผู้เช่า"',
      timestamp: '2026-11-02T10:45:00Z'
    }
  );

  // Write files
  await workbook.xlsx.writeFile(OUTPUT_ROOT);
  console.log(`Saved: ${OUTPUT_ROOT}`);

  await workbook.xlsx.writeFile(OUTPUT_DOCS);
  console.log(`Saved: ${OUTPUT_DOCS}`);

  await workbook.xlsx.writeFile(OUTPUT_ARTIFACT);
  console.log(`Saved: ${OUTPUT_ARTIFACT}`);

  console.log('=== DATABASE EXCEL EXPORT COMPLETED SUCCESSFULLY ===');
}

generateDatabaseExcel().catch((err) => {
  console.error('Error generating Excel:', err);
  process.exit(1);
});
