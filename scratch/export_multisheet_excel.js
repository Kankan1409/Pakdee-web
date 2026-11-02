const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");

async function generateMultiSheetExcel() {
  const dbPath = "D:/DESKTOP/Pakdee/data/db_port3000.json";
  let db = {};
  if (fs.existsSync(dbPath)) {
    try {
      db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
    } catch (e) {
      console.error("Error reading JSON db:", e);
    }
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "Antigravity AI - QS Smart Development Team";
  wb.lastModifiedBy = "Pakdee System";
  wb.created = new Date();
  wb.modified = new Date();

  // Color Styles
  const primaryHeaderFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF059669" } }; // Emerald 600
  const subHeaderFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D9488" } };     // Teal 600
  const sectionTitleFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };  // Slate 900
  const dataHeaderFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };    // Slate 800
  const zebraFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };

  const whiteBoldFont = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  const titleFont = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  const subTitleFont = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FF059669" } };
  const regularFont = { name: "Segoe UI", size: 10 };
  const boldFont = { name: "Segoe UI", size: 10, bold: true };
  const requiredFont = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFE11D48" } }; // Rose 600
  const optionalFont = { name: "Segoe UI", size: 10, color: { argb: "FF64748B" } };

  const borderThin = {
    top: { style: "thin", color: { argb: "FFE2E8F0" } },
    left: { style: "thin", color: { argb: "FFE2E8F0" } },
    bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
    right: { style: "thin", color: { argb: "FFE2E8F0" } },
  };

  // Helper to style range as title
  function addTitle(ws, cellRange, text) {
    ws.mergeCells(cellRange);
    const cell = ws.getCell(cellRange.split(":")[0]);
    cell.value = text;
    cell.font = titleFont;
    cell.fill = sectionTitleFill;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    ws.getRow(cell.row).height = 32;
  }

  // Helper to add schema dictionary section
  function addSchemaSection(ws, startRow, headers, rows) {
    const hRow = ws.getRow(startRow);
    hRow.values = ["", ...headers];
    hRow.height = 24;

    const colLetters = ["B", "C", "D", "E", "F", "G", "H", "I"];
    headers.forEach((h, idx) => {
      const c = ws.getCell(colLetters[idx] + startRow);
      c.fill = primaryHeaderFill;
      c.font = whiteBoldFont;
      c.alignment = { vertical: "middle", horizontal: idx === 0 || idx === 3 ? "center" : "left" };
      c.border = borderThin;
    });

    let currRow = startRow + 1;
    rows.forEach((rData) => {
      const r = ws.getRow(currRow);
      r.values = ["", ...rData];
      r.height = 20;

      headers.forEach((_, idx) => {
        const c = ws.getCell(colLetters[idx] + currRow);
        c.font = regularFont;
        c.border = borderThin;
        if (idx === 0) {
          c.font = boldFont;
          c.alignment = { vertical: "middle", horizontal: "center" };
        }
        if (idx === 1) c.font = boldFont;
        if (idx === 3) {
          c.alignment = { vertical: "middle", horizontal: "center" };
          c.font = rData[3].includes("บังคับ") ? requiredFont : optionalFont;
        }
        if (currRow % 2 === 0) c.fill = zebraFill;
      });
      currRow++;
    });

    return currRow;
  }

  // Helper to add live records section
  function addLiveRecordsSection(ws, startRow, headers, records, fieldExtractors) {
    ws.mergeCells("B" + startRow + ":H" + startRow);
    const subCell = ws.getCell("B" + startRow);
    subCell.value = `ตัวอย่างข้อมูลจริงในฐานข้อมูลปัจจุบัน (${records.length} เรคอร์ดล่าสุด)`;
    subCell.font = subTitleFont;
    ws.getRow(startRow).height = 22;

    const hRow = ws.getRow(startRow + 1);
    hRow.values = ["", ...headers];
    hRow.height = 22;

    const colLetters = ["B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
    headers.forEach((h, idx) => {
      const c = ws.getCell(colLetters[idx] + (startRow + 1));
      c.fill = dataHeaderFill;
      c.font = whiteBoldFont;
      c.alignment = { vertical: "middle", horizontal: idx === 0 ? "center" : "left" };
      c.border = borderThin;
    });

    let currRow = startRow + 2;
    if (records.length === 0) {
      ws.mergeCells("B" + currRow + ":" + colLetters[headers.length - 1] + currRow);
      const emptyCell = ws.getCell("B" + currRow);
      emptyCell.value = "(ยังไม่มีข้อมูลบันทึกในตารางนี้ในปัจจุบัน)";
      emptyCell.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF94A3B8" } };
      emptyCell.alignment = { vertical: "middle", horizontal: "center" };
      ws.getRow(currRow).height = 22;
      return currRow + 1;
    }

    records.forEach((item, rIdx) => {
      const r = ws.getRow(currRow);
      const rowValues = [rIdx + 1, ...fieldExtractors.map((fn) => fn(item))];
      r.values = ["", ...rowValues];
      r.height = 19;

      headers.forEach((_, idx) => {
        const c = ws.getCell(colLetters[idx] + currRow);
        c.font = regularFont;
        c.border = borderThin;
        if (idx === 0) {
          c.alignment = { vertical: "middle", horizontal: "center" };
          c.font = boldFont;
        }
        if (currRow % 2 === 0) c.fill = zebraFill;
      });
      currRow++;
    });

    return currRow;
  }

  // =========================================================================
  // 1. SHEET: ภาพรวมระบบ (Summary Overview)
  // =========================================================================
  const wsSummary = wb.addWorksheet("0. สรุปภาพรวมและสารบัญชีท");
  wsSummary.columns = [{ width: 5 }, { width: 32 }, { width: 35 }, { width: 45 }, { width: 25 }];
  addTitle(wsSummary, "B2:E2", "PAKDEE DATABASE SPECIFICATION - สารบัญตารางและพจนานุกรมข้อมูลรายชีท");

  wsSummary.mergeCells("B4:E4");
  wsSummary.getCell("B4").value = "ระบบแยกการจัดเก็บข้อมูลออกเป็น 10 ตารางหลัก พร้อมชีทอธิบายโครงสร้างและการจำกัดข้อมูลเฉพาะตาราง:";
  wsSummary.getCell("B4").font = subTitleFont;

  const summarySheets = [
    ["1. Data Rooms", "pakdee_dev_rooms", "ผังห้องพัก สถานะห้อง ค่าเช่า และมิเตอร์น้ำ-ไฟ", "34 ห้อง"],
    ["2. Data Tenants", "pakdee_dev_tenants", "ทะเบียนประวัติผู้เช่ารายเดือนและลูกค้าเข้าพักรายวัน", "15 รายการ"],
    ["3. Data Contracts", "pakdee_dev_contracts", "สัญญาเช่าดิจิทัล รายละเอียดการเงิน และ 14 ข้อสัญญา", "12 สัญญา"],
    ["4. Data Invoices", "pakdee_dev_invoices", "ใบแจ้งหนี้รอบบิล ค่าน้ำ ค่าไฟ และยอดค้างชำระ", "4 บิล"],
    ["5. Data Daily Bookings", "pakdee_dev_daily_bookings", "ปฏิทินจองห้องพักรายวัน มัดจำคีย์การ์ด เช็คอิน/เอาท์", "จองรายวัน"],
    ["6. Data Meter Readings", "pakdee_dev_meter_readings", "ประวัติการจดเลขมิเตอร์น้ำและไฟประจำเดือน", "48 เรคอร์ด"],
    ["7. Data Branch Settings", "pakdee_dev_branch_settings", "การตั้งค่าสาขา บัญชีธนาคาร พร้อมเพย์ QR และ LINE OA", "ตั้งค่าสาขา"],
    ["8. Data Properties", "pakdee_dev_properties", "ข้อมูลสาขาหอพักและอาคารในระบบ", "2 สาขา"],
    ["9. Data Repairs", "pakdee_dev_repairs", "ประวัติการแจ้งซ่อมแซมและบำรุงรักษาห้องพัก", "งานช่าง"],
    ["10. Data Expenses", "pakdee_dev_expenses", "บันทึกค่าใช้จ่ายดำเนินการและต้นทุนหอพัก", "รายจ่าย"],
  ];

  const sumHeaders = ["ชื่อชีท (Sheet Name)", "ชื่อตารางในระบบ (Table Key)", "คำอธิบาย / วัตถุประสงค์", "ข้อมูลในระบบปัจจุบัน"];
  const sumHRow = wsSummary.getRow(6);
  sumHRow.values = ["", ...sumHeaders];
  sumHRow.height = 24;
  ["B", "C", "D", "E"].forEach((col, idx) => {
    const c = wsSummary.getCell(col + "6");
    c.fill = primaryHeaderFill;
    c.font = whiteBoldFont;
    c.alignment = { vertical: "middle", horizontal: idx === 0 ? "center" : "left" };
    c.border = borderThin;
  });

  let sRowIdx = 7;
  summarySheets.forEach(([sh, tk, desc, stat]) => {
    const r = wsSummary.getRow(sRowIdx);
    r.values = ["", sh, tk, desc, stat];
    r.height = 22;
    ["B", "C", "D", "E"].forEach((col, idx) => {
      const c = wsSummary.getCell(col + sRowIdx);
      c.font = regularFont;
      c.border = borderThin;
      if (idx === 0) c.font = boldFont;
      if (sRowIdx % 2 === 0) c.fill = zebraFill;
    });
    sRowIdx++;
  });

  // =========================================================================
  // 2. SHEET: Data Rooms (ผังห้องพัก)
  // =========================================================================
  const wsRooms = wb.addWorksheet("1. Data Rooms");
  wsRooms.columns = [
    { width: 5 },
    { width: 8 },  // No
    { width: 22 }, // Field
    { width: 20 }, // Thai Name
    { width: 14 }, // Required
    { width: 15 }, // Type
    { width: 35 }, // Constraints & Limits
    { width: 45 }, // Description & UI
  ];
  addTitle(wsRooms, "B2:H2", "ตารางข้อมูล: Rooms (ผังห้องพักและสถานะห้อง)");

  wsRooms.mergeCells("B4:H4");
  wsRooms.getCell("B4").value = "โครงสร้างฟิลด์ ข้อบังคับ และการจำกัดข้อความ (Rooms Data Schema & Constraints)";
  wsRooms.getCell("B4").font = subTitleFont;

  const roomSchemaRows = [
    [1, "id", "รหัสห้องพัก (PK)", "บังคับ", "string", "UUID หรือรหัสประจำห้อง (ห้ามซ้ำ)", "สร้างอัตโนมัติ ไม่ให้แก้ไข"],
    [2, "roomNumber", "หมายเลขห้อง", "บังคับ", "string", "1-10 ตัวอักษร (เช่น 101, A1) ห้ามซ้ำในสาขา", "แสดงบนการ์ดผังห้องพัก ค้นหา และทำสัญญา"],
    [3, "floor", "ชั้นที่ตั้ง", "บังคับ", "number", "ตัวเลขจำนวนเต็ม 1-99", "จัดกลุ่มแท็บผังห้องพักชั้น 1-4"],
    [4, "type", "ประเภทห้อง", "บังคับ", "string", "จำกัดชุดคำ: 'แอร์', 'พัดลม', 'สตูดิโอ'", "แสดงรายละเอียดประเภทห้องพัก"],
    [5, "monthlyRate", "ราคาเช่ารายเดือน", "บังคับ", "number", "ตัวเลขจำนวนเต็ม >= 0 (เช่น 4000)", "ราคาตั้งต้นในการทำสัญญาและออกบิล"],
    [6, "dailyRate", "ราคาเช่ารายวัน", "ไม่บังคับ", "number", "ตัวเลขจำนวนเต็ม >= 0 (เช่น 650)", "ราคาตั้งต้นสำหรับเปิดจองรายวัน"],
    [7, "status", "สถานะห้องพัก", "บังคับ", "enum", "vacant, occupied, daily, cleaning, overdue", "ควบคุมสีจุดสถานะและสิทธิ์การจองในผังห้อง"],
    [8, "leaseEndDate", "วันหมดสัญญา", "ไม่บังคับ", "string", "รูปแบบ YYYY-MM-DD หรือ 'สัญญาต่อเนื่อง'", "นับถอยหลังเตือนสัญญาใกล้หมดอายุ"],
    [9, "currentElectricMeter", "เลขมิเตอร์ไฟล่าสุด", "บังคับ", "number", "ตัวเลขจำนวนเต็ม >= 0", "แสดงในหน้าจดมิเตอร์และบิลรอบถัดไป"],
    [10, "currentWaterMeter", "เลขมิเตอร์น้ำล่าสุด", "บังคับ", "number", "ตัวเลขจำนวนเต็ม >= 0", "แสดงในหน้าจดมิเตอร์และบิลรอบถัดไป"],
  ];

  const dictHeadersCommon = ["ลำดับ", "ชื่อฟิลด์ (Field)", "ชื่อภาษาไทย", "ข้อบังคับ", "ชนิดข้อมูล", "การจำกัด Text / ตัวเลข (Constraints)", "การใช้งานบนหน้าจอ & รายละเอียด"];
  let rNext = addSchemaSection(wsRooms, 5, dictHeadersCommon, roomSchemaRows);
  rNext += 2;

  // Live records
  const liveRooms = db["pakdee_dev_rooms"] || [];
  const roomTableHeaders = ["ลำดับ", "รหัสห้อง (ID)", "หมายเลขห้อง", "ชั้น", "ประเภทห้อง", "ค่าเช่า/เดือน", "สถานะห้องพัก", "มิเตอร์ไฟ", "มิเตอร์น้ำ"];
  const roomExtractors = [
    (r) => r.id,
    (r) => r.roomNumber,
    (r) => r.floor,
    (r) => r.type,
    (r) => r.monthlyRate,
    (r) => r.status,
    (r) => r.currentElectricMeter,
    (r) => r.currentWaterMeter,
  ];
  addLiveRecordsSection(wsRooms, rNext, roomTableHeaders, liveRooms, roomExtractors);

  // =========================================================================
  // 3. SHEET: Data Tenants (ทะเบียนผู้เช่า)
  // =========================================================================
  const wsTenants = wb.addWorksheet("2. Data Tenants");
  wsTenants.columns = [
    { width: 5 },
    { width: 8 },
    { width: 22 },
    { width: 20 },
    { width: 14 },
    { width: 15 },
    { width: 35 },
    { width: 45 },
  ];
  addTitle(wsTenants, "B2:H2", "ตารางข้อมูล: Tenants (ทะเบียนประวัติผู้เช่าและผู้เข้าพัก)");

  wsTenants.mergeCells("B4:H4");
  wsTenants.getCell("B4").value = "โครงสร้างฟิลด์ ข้อบังคับ และการจำกัดข้อความ (Tenants Data Schema & Constraints)";
  wsTenants.getCell("B4").font = subTitleFont;

  const tenantSchemaRows = [
    [1, "id", "รหัสผู้เช่า (PK)", "บังคับ", "string", "UUID", "สร้างอัตโนมัติ เชื่อมโยงกับสัญญาเช่า"],
    [2, "fullName", "ชื่อ-นามสกุล", "บังคับ", "string", "ความยาว 2-100 ตัวอักษร (ห้ามเว้นว่าง)", "ใช้ระบุตัวตนในสัญญา ใบแจ้งหนี้ และใบเสร็จ"],
    [3, "phone", "เบอร์โทรศัพท์", "บังคับ", "string", "ตัวเลข 10 หลัก (รูปแบบ 0xx-xxx-xxxx)", "ใช้ติดต่อ ส่ง SMS/LINE และค้นหาประวัติ"],
    [4, "idCard", "เลขบัตรประชาชน", "บังคับ", "string", "ตัวเลข 13 หลักตามมาตรฐานกรมการปกครอง", "ใช้ทำสัญญาเช่า และยืนยันตัวตนทางกฎหมาย"],
    [5, "gender", "เพศ", "ไม่บังคับ", "enum", "จำกัดค่า: MALE, FEMALE, OTHER", "บันทึกข้อมูลทางสถิติ"],
    [6, "age", "อายุ", "ไม่บังคับ", "number", "ตัวเลข 1-120", "อายุของผู้เช่า"],
    [7, "lineId", "LINE ID", "ไม่บังคับ", "string", "ความยาว 1-50 ตัวอักษร", "ใช้สำหรับส่งบิลและแจ้งเตือนผ่าน LINE"],
    [8, "vehiclePlate", "ทะเบียนรถ", "ไม่บังคับ", "string", "ข้อความ เช่น 'กข-1234 กทม'", "ออกสติ๊กเกอร์ที่จอดรถและตรวจสอบสิทธิ์"],
    [9, "emergencyContact", "เบอร์ติดต่อฉุกเฉิน", "ไม่บังคับ", "string", "ชื่อและเบอร์โทรติดต่อฉุกเฉิน", "กรณีเกิดเหตุฉุกเฉินหรือติดต่อผู้เช่าไม่ได้"],
    [10, "depositAmount", "เงินประกันความเสียหาย", "ไม่บังคับ", "number", "ตัวเลขจำนวนเงิน >= 0 (บาท)", "เงินมัดจำที่ถือครองไว้สำหรับหักลบตอนย้ายออก"],
    [11, "additionalFees", "บริการเสริมเพิ่มเติม", "ไม่บังคับ", "array", "Array ของ {id, name, amount, isEnabled}", "รายการที่เพิ่มผ่านปุ่ม ADD (เช่น ค่าส่วนกลาง, ค่าเน็ต)"],
    [12, "notes", "หมายเหตุ / ป้าย", "ไม่บังคับ", "string", "ข้อความไม่จำกัดความยาว", "บันทึกพฤติกรรม หรือ [ผู้เข้าพักรายวัน]"],
  ];

  rNext = addSchemaSection(wsTenants, 5, dictHeadersCommon, tenantSchemaRows);
  rNext += 2;

  const liveTenants = db["pakdee_dev_tenants"] || [];
  const tenantTableHeaders = ["ลำดับ", "รหัสผู้เช่า", "ชื่อ-นามสกุล", "เบอร์โทรศัพท์", "เลขบัตรประชาชน", "เพศ", "ที่อยู่", "ภาษาบิล"];
  const tenantExtractors = [
    (t) => t.id,
    (t) => t.fullName,
    (t) => t.phone,
    (t) => t.idCard || "-",
    (t) => t.gender || "-",
    (t) => t.address || "-",
    (t) => t.invoiceLang || "TH",
  ];
  addLiveRecordsSection(wsTenants, rNext, tenantTableHeaders, liveTenants, tenantExtractors);

  // =========================================================================
  // 4. SHEET: Data Contracts (สัญญาเช่า)
  // =========================================================================
  const wsContracts = wb.addWorksheet("3. Data Contracts");
  wsContracts.columns = [
    { width: 5 },
    { width: 8 },
    { width: 22 },
    { width: 20 },
    { width: 14 },
    { width: 15 },
    { width: 35 },
    { width: 45 },
  ];
  addTitle(wsContracts, "B2:H2", "ตารางข้อมูล: Contracts (สัญญาเช่าดิจิทัล)");

  wsContracts.mergeCells("B4:H4");
  wsContracts.getCell("B4").value = "โครงสร้างฟิลด์ ข้อบังคับ และการจำกัดข้อความ (Contracts Data Schema & Constraints)";
  wsContracts.getCell("B4").font = subTitleFont;

  const contractSchemaRows = [
    [1, "id", "รหัสสัญญา (PK)", "บังคับ", "string", "UUID / รหัส ct-timestamp", "รหัสประจำเอกสารสัญญา"],
    [2, "contractNumber", "เลขที่สัญญา", "บังคับ", "string", "รูปแบบ CT-YYYY-ห้อง-ลำดับ (เช่น CT-2026-101-01)", "เลขอ้างอิงสัญญาเช่าดิจิทัล"],
    [3, "roomNumber", "หมายเลขห้องพัก", "บังคับ", "string", "ต้องตรงกับหมายเลขห้องในระบบ", "ห้องพักที่ผูกกับสัญญา"],
    [4, "tenantName", "ชื่อผู้เช่า", "บังคับ", "string", "ความยาว 2-100 ตัวอักษร", "คู่สัญญาฝ่ายผู้เช่า"],
    [5, "tenantPhone", "เบอร์โทรผู้เช่า", "บังคับ", "string", "ตัวเลข 10 หลัก", "เบอร์โทรคู่สัญญา"],
    [6, "startDate", "วันเริ่มสัญญา", "บังคับ", "string", "รูปแบบ YYYY-MM-DD", "วันเริ่มต้นการเข้าพัก"],
    [7, "endDate", "วันสิ้นสุดสัญญา", "บังคับ", "string", "รูปแบบ YYYY-MM-DD หรือ 'สัญญาต่อเนื่อง'", "วันครบกำหนดสัญญาเพื่อต่อหรือคืนเงินประกัน"],
    [8, "monthlyRent", "ค่าเช่าต่อเดือน", "บังคับ", "number", "ตัวเลข >= 0", "ค่าเช่าห้องพักที่ตกลงกันตามสัญญา"],
    [9, "depositAmount", "เงินประกันสัญญา", "บังคับ", "number", "ตัวเลข >= 0 (ค่าเริ่มต้น 2 เท่าของค่าเช่า)", "เงินประกันความเสียหายที่ต้องคืนตอนย้ายออก"],
    [10, "paymentDueDay", "วันครบกำหนดชำระ", "บังคับ", "number", "ตัวเลข 1-31 (ค่าเริ่มต้น 5 ของเดือน)", "วันที่ต้องชำระค่าเช่าของทุกเดือน"],
    [11, "lateFeePerDay", "ค่าปรับชำระล่าช้า", "ไม่บังคับ", "number", "ตัวเลข >= 0 (ค่าเริ่มต้น 100 บาท/วัน)", "คิดค่าปรับกรณีชำระเกินวันครบกำหนด"],
    [12, "clauses", "ข้อสัญญา 14 ข้อ", "บังคับ", "array", "14 ข้อสัญญามาตรฐานทางกฎหมาย", "เนื้อหาข้อสัญญาที่แก้ไขและแสดงผลในตัวพิมพ์สัญญา"],
    [13, "signatureUrl", "ภาพลายเซ็น", "ไม่บังคับ", "string", "Data URL / Base64 E-Signature", "ลายเซ็นอิเล็กทรอนิกส์ของผู้เช่า"],
    [14, "status", "สถานะสัญญา", "บังคับ", "enum", "active, pending_signature, expired, terminated", "ควบคุมการใช้งานสัญญา"],
  ];

  rNext = addSchemaSection(wsContracts, 5, dictHeadersCommon, contractSchemaRows);
  rNext += 2;

  const liveContracts = db["pakdee_dev_contracts"] || [];
  const contractTableHeaders = ["ลำดับ", "เลขที่สัญญา", "ห้อง", "ชื่อผู้เช่า", "เบอร์โทร", "วันเริ่มสัญญา", "วันสิ้นสุด", "ค่าเช่า/ด.", "เงินประกัน", "สถานะ"];
  const contractExtractors = [
    (c) => c.contractNumber,
    (c) => c.roomNumber,
    (c) => c.tenantName,
    (c) => c.tenantPhone,
    (c) => c.startDate,
    (c) => c.endDate,
    (c) => c.monthlyRent,
    (c) => c.depositAmount,
    (c) => c.status,
  ];
  addLiveRecordsSection(wsContracts, rNext, contractTableHeaders, liveContracts, contractExtractors);

  // =========================================================================
  // 5. SHEET: Data Invoices (ใบแจ้งหนี้)
  // =========================================================================
  const wsInvoices = wb.addWorksheet("4. Data Invoices");
  wsInvoices.columns = [
    { width: 5 },
    { width: 8 },
    { width: 22 },
    { width: 20 },
    { width: 14 },
    { width: 15 },
    { width: 35 },
    { width: 45 },
  ];
  addTitle(wsInvoices, "B2:H2", "ตารางข้อมูล: Invoices (ใบแจ้งหนี้รอบบิลและสถานะชำระเงิน)");

  wsInvoices.mergeCells("B4:H4");
  wsInvoices.getCell("B4").value = "โครงสร้างฟิลด์ ข้อบังคับ และการจำกัดข้อความ (Invoices Data Schema & Constraints)";
  wsInvoices.getCell("B4").font = subTitleFont;

  const invoiceSchemaRows = [
    [1, "id", "รหัสบิล (PK)", "บังคับ", "string", "UUID / รหัส inv-timestamp", "รหัสประจำใบแจ้งหนี้"],
    [2, "invoiceNumber", "เลขที่ใบแจ้งหนี้", "บังคับ", "string", "รูปแบบ INV-YYYYMM-ห้อง (เช่น INV-202610-101)", "เลขอ้างอิงใบแจ้งหนี้"],
    [3, "roomNumber", "หมายเลขห้องพัก", "บังคับ", "string", "หมายเลขห้องในระบบ", "ห้องพักที่ออกบิล"],
    [4, "tenantName", "ชื่อผู้เช่า", "บังคับ", "string", "ความยาว 2-100 ตัวอักษร", "ผู้มีหน้าที่ชำระเงิน"],
    [5, "billingDate", "รอบบิลประจำเดือน", "บังคับ", "string", "รูปแบบ YYYY-MM-DD", "รอบเดือนที่เรียกเก็บ"],
    [6, "dueDate", "วันกำหนดชำระ", "บังคับ", "string", "รูปแบบ YYYY-MM-DD", "วันสุดท้ายก่อนถูกคิดค่าปรับ"],
    [7, "rentAmount", "ค่าเช่าห้องพัก", "บังคับ", "number", "ตัวเลข >= 0", "ยอดค่าเช่าตามสัญญา"],
    [8, "electricUnits", "หน่วยไฟฟ้าที่ใช้", "บังคับ", "number", "ตัวเลข >= 0 (มิเตอร์ใหม่ - มิเตอร์เดิม)", "จำนวนหน่วยไฟที่ใช้จริง"],
    [9, "waterUnits", "หน่วยประปาที่ใช้", "บังคับ", "number", "ตัวเลข >= 0 (มิเตอร์ใหม่ - มิเตอร์เดิม)", "จำนวนหน่วยน้ำที่ใช้จริง"],
    [10, "totalAmount", "ยอดรวมสุทธิ", "บังคับ", "number", "ตัวเลข >= 0 (ค่าห้อง + น้ำ + ไฟ + ค่าบริการเสริม)", "ยอดเงินที่ต้องชำระทั้งหมด"],
    [11, "status", "สถานะชำระเงิน", "บังคับ", "enum", "pending (รอชำระ), paid (ชำระแล้ว), overdue (ค้างชำระ)", "ส่งผลต่อสีเตือนในผังห้องพักและแดชบอร์ด"],
    [12, "paidAt", "วันเวลาที่ชำระ", "ไม่บังคับ", "string", "วันเวลาที่มีการกดรับเงิน", "บันทึกเวลาชำระจริง"],
  ];

  rNext = addSchemaSection(wsInvoices, 5, dictHeadersCommon, invoiceSchemaRows);
  rNext += 2;

  const liveInvoices = db["pakdee_dev_invoices"] || [];
  const invoiceTableHeaders = ["ลำดับ", "เลขที่บิล", "ห้อง", "ชื่อผู้เช่า", "รอบบิล", "วันครบกำหนด", "ยอดรวม (บาท)", "สถานะ"];
  const invoiceExtractors = [
    (i) => i.invoiceNumber,
    (i) => i.roomNumber,
    (i) => i.tenantName,
    (i) => i.billingDate,
    (i) => i.dueDate,
    (i) => i.totalAmount,
    (i) => i.status === "paid" ? "ชำระแล้ว (Paid)" : "ค้างชำระ (Pending/Overdue)",
  ];
  addLiveRecordsSection(wsInvoices, rNext, invoiceTableHeaders, liveInvoices, invoiceExtractors);

  // =========================================================================
  // 6. SHEET: Data Daily Bookings (จองห้องพักรายวัน)
  // =========================================================================
  const wsDaily = wb.addWorksheet("5. Data Daily Bookings");
  wsDaily.columns = [
    { width: 5 },
    { width: 8 },
    { width: 22 },
    { width: 20 },
    { width: 14 },
    { width: 15 },
    { width: 35 },
    { width: 45 },
  ];
  addTitle(wsDaily, "B2:H2", "ตารางข้อมูล: Daily Bookings (ปฏิทินจองห้องพักรายวัน)");

  wsDaily.mergeCells("B4:H4");
  wsDaily.getCell("B4").value = "โครงสร้างฟิลด์ ข้อบังคับ และการจำกัดข้อความ (Daily Bookings Schema & Constraints)";
  wsDaily.getCell("B4").font = subTitleFont;

  const dailySchemaRows = [
    [1, "id", "รหัสการจอง (PK)", "บังคับ", "string", "UUID / รหัส b-timestamp", "รหัสการจองรายวัน"],
    [2, "roomNumber", "หมายเลขห้องพัก", "บังคับ", "string", "ต้องเป็นห้องว่าง (status: vacant) เท่านั้น", "ห้องที่เปิดให้เช่ารายวัน"],
    [3, "guestName", "ชื่อลูกค้าผู้เข้าพัก", "บังคับ", "string", "ความยาว 2-100 ตัวอักษร", "ชื่อลูกค้าผู้จอง"],
    [4, "guestPhone", "เบอร์โทรติดต่อ", "บังคับ", "string", "ตัวเลข 10 หลัก", "เบอร์โทรศัพท์สำหรับติดต่อลูกค้า"],
    [5, "checkInDate", "วันที่เช็คอิน", "บังคับ", "string", "รูปแบบ YYYY-MM-DD", "วันที่ลูกค้าเข้าพัก (14:00 น.)"],
    [6, "checkOutDate", "วันที่เช็คเอาท์", "บังคับ", "string", "รูปแบบ YYYY-MM-DD (ต้องหลังวัน Check-in)", "วันที่ลูกค้าคืนห้อง (12:00 น.)"],
    [7, "nights", "จำนวนคืน", "บังคับ", "number", "ตัวเลขจำนวนเต็ม >= 1", "คำนวณจากวัน Check-out ลบวัน Check-in"],
    [8, "dailyRate", "ราคาต่อคืน", "บังคับ", "number", "ตัวเลข >= 0 (ค่าเริ่มต้น 650 บาท)", "ราคาห้องพักรายวันต่อคืน"],
    [9, "totalRoomPrice", "ยอดรวมค่าห้อง", "บังคับ", "number", "คำนวณจาก nights * dailyRate", "ยอดรวมค่าห้องพักทั้งหมด"],
    [10, "keyDeposit", "มัดจำคีย์การ์ด", "บังคับ", "number", "ตัวเลข >= 0 (ค่าเริ่มต้น 500 บาท)", "เงินมัดจำกุญแจและคีย์การ์ด (คืนตอน Out)"],
    [11, "status", "สถานะการจอง", "บังคับ", "enum", "confirmed (จองแล้ว), checked_in (เข้าพักแล้ว), checked_out", "ควบคุมสถานะในปฏิทินและผังห้องพัก"],
  ];

  rNext = addSchemaSection(wsDaily, 5, dictHeadersCommon, dailySchemaRows);
  rNext += 2;

  const liveDaily = db["pakdee_dev_daily_bookings"] || [];
  const dailyTableHeaders = ["ลำดับ", "ห้อง", "ชื่อลูกค้า", "เบอร์โทร", "วันเข้าพัก", "วันออก", "คืน", "ค่าห้องรวม", "มัดจำ", "สถานะ"];
  const dailyExtractors = [
    (b) => b.roomNumber,
    (b) => b.guestName,
    (b) => b.guestPhone,
    (b) => b.checkInDate,
    (b) => b.checkOutDate,
    (b) => b.nights,
    (b) => b.totalRoomPrice,
    (b) => b.keyDeposit,
    (b) => b.status,
  ];
  addLiveRecordsSection(wsDaily, rNext, dailyTableHeaders, liveDaily, dailyExtractors);

  // =========================================================================
  // 7. SHEET: Data Meter Readings (จดมิเตอร์น้ำ-ไฟ)
  // =========================================================================
  const wsMeter = wb.addWorksheet("6. Data Meter Readings");
  wsMeter.columns = [
    { width: 5 },
    { width: 8 },
    { width: 22 },
    { width: 20 },
    { width: 14 },
    { width: 15 },
    { width: 35 },
    { width: 45 },
  ];
  addTitle(wsMeter, "B2:H2", "ตารางข้อมูล: Meter Readings (ประวัติการจดเลขมิเตอร์น้ำ-ไฟ)");

  wsMeter.mergeCells("B4:H4");
  wsMeter.getCell("B4").value = "โครงสร้างฟิลด์ ข้อบังคับ และการจำกัดข้อความ (Meter Readings Schema & Constraints)";
  wsMeter.getCell("B4").font = subTitleFont;

  const meterSchemaRows = [
    [1, "id", "รหัสประวัติมิเตอร์ (PK)", "บังคับ", "string", "UUID / รหัส meter-timestamp", "รหัสประจำรอบการจด"],
    [2, "room_number", "หมายเลขห้องพัก", "บังคับ", "string", "หมายเลขห้องในระบบ", "ห้องที่จดเลขมิเตอร์"],
    [3, "billing_month", "รอบเดือนที่จด", "บังคับ", "string", "รูปแบบ YYYY-MM (เช่น 2026-10)", "รอบเดือนของมิเตอร์"],
    [4, "electric_prev", "เลขไฟเดิม", "บังคับ", "number", "ตัวเลขจำนวนเต็ม >= 0", "เลขมิเตอร์ไฟยกมาจากเดือนก่อน"],
    [5, "electric_curr", "เลขไฟล่าสุด", "บังคับ", "number", "ตัวเลขจำนวนเต็ม >= electric_prev", "เลขมิเตอร์ไฟที่จดจริงล่าสุด"],
    [6, "electric_units", "หน่วยไฟที่ใช้", "บังคับ", "number", "electric_curr - electric_prev", "จำนวนหน่วยไฟฟ้าที่ใช้ในเดือนนี้"],
    [7, "water_prev", "เลขน้ำเดิม", "บังคับ", "number", "ตัวเลขจำนวนเต็ม >= 0", "เลขมิเตอร์น้ำยกมาจากเดือนก่อน"],
    [8, "water_curr", "เลขน้ำล่าสุด", "บังคับ", "number", "ตัวเลขจำนวนเต็ม >= water_prev", "เลขมิเตอร์น้ำที่จดจริงล่าสุด"],
    [9, "water_units", "หน่วยน้ำที่ใช้", "บังคับ", "number", "water_curr - water_prev", "จำนวนหน่วยน้ำที่ใช้ในเดือนนี้"],
  ];

  rNext = addSchemaSection(wsMeter, 5, dictHeadersCommon, meterSchemaRows);
  rNext += 2;

  const liveMeters = db["pakdee_dev_meter_readings"] || [];
  const meterTableHeaders = ["ลำดับ", "ห้อง", "รอบเดือน", "ไฟเดิม", "ไฟล่าสุด", "หน่วยไฟ", "น้ำเดิม", "น้ำล่าสุด", "หน่วยน้ำ"];
  const meterExtractors = [
    (m) => m.room_number,
    (m) => m.billing_month,
    (m) => m.electric_prev,
    (m) => m.electric_curr,
    (m) => m.electric_units,
    (m) => m.water_prev,
    (m) => m.water_curr,
    (m) => m.water_units,
  ];
  addLiveRecordsSection(wsMeter, rNext, meterTableHeaders, liveMeters, meterExtractors);

  // =========================================================================
  // 8. SHEET: Data Branch Settings (การตั้งค่าสาขา)
  // =========================================================================
  const wsSettings = wb.addWorksheet("7. Data Branch Settings");
  wsSettings.columns = [
    { width: 5 },
    { width: 8 },
    { width: 22 },
    { width: 20 },
    { width: 14 },
    { width: 15 },
    { width: 35 },
    { width: 45 },
  ];
  addTitle(wsSettings, "B2:H2", "ตารางข้อมูล: Branch Settings (การตั้งค่าสาขา บัญชีธนาคาร และ PromptPay)");

  wsSettings.mergeCells("B4:H4");
  wsSettings.getCell("B4").value = "โครงสร้างฟิลด์ ข้อบังคับ และการจำกัดข้อความ (Settings Schema & Constraints)";
  wsSettings.getCell("B4").font = subTitleFont;

  const settingsSchemaRows = [
    [1, "branchName", "ชื่อสาขาหอพัก", "บังคับ", "string", "ความยาว 2-100 ตัวอักษร", "ชื่อสาขาที่แสดงบนหัวเอกสาร"],
    [2, "bankName", "ธนาคารรับเงิน", "บังคับ", "select", "เลือกจาก Dropdown ธนาคารไทยชั้นนำ 14 แห่ง", "ธนาคารที่ใช้แสดงบนบิลและรับชำระเงิน"],
    [3, "bankAccountNumber", "เลขที่บัญชีธนาคาร", "บังคับ", "string", "ตัวเลข 10-12 หลัก (มีขีดหรือไม่มีก็ได้)", "เลขบัญชีสำหรับโอนเงิน"],
    [4, "bankAccountName", "ชื่อบัญชีรับเงิน", "บังคับ", "string", "ความยาว 2-100 ตัวอักษร", "ชื่อเจ้าของบัญชี"],
    [5, "promptpayNumber", "หมายเลขพร้อมเพย์", "บังคับ", "string", "ตัวเลข 10 หลัก (มือถือ) หรือ 13 หลัก (เลข ปชช./นิติบุคคล)", "เป้าหมายสร้าง PromptPay QR Code อัตโนมัติ"],
    [6, "electricRate", "อัตราค่าไฟต่อหน่วย", "บังคับ", "number", "ตัวเลข >= 0 (บาท/หน่วย)", "ราคาค่าไฟต่อหน่วยในการคำนวณบิล"],
    [7, "waterRate", "อัตราค่าน้ำต่อหน่วย", "บังคับ", "number", "ตัวเลข >= 0 (บาท/หน่วย)", "ราคาค่าน้ำต่อหน่วยในการคำนวณบิล"],
    [8, "billCycleDay", "วันตัดรอบบิล", "บังคับ", "number", "ตัวเลข 1-31 (ค่าเริ่มต้น 25)", "วันที่ตัดรอบมิเตอร์ประจำเดือน"],
    [9, "billDueDay", "วันครบกำหนดจ่าย", "บังคับ", "number", "ตัวเลข 1-31 (ค่าเริ่มต้น 5)", "วันสุดท้ายที่ต้องจ่ายค่าเช่า"],
    [10, "lateFeePerDay", "ค่าปรับรายวัน", "ไม่บังคับ", "number", "ตัวเลข >= 0 (บาท/วัน)", "คิดค่าปรับกรณีเลยกำหนด"],
    [11, "lineChannelAccessToken", "LINE Messaging Token", "ไม่บังคับ", "string", "LINE Channel Access Token", "ส่งแจ้งเตือนและบิลเข้า LINE ผู้เช่า"],
  ];

  rNext = addSchemaSection(wsSettings, 5, dictHeadersCommon, settingsSchemaRows);
  rNext += 2;

  const liveSettings = db["pakdee_dev_branch_settings"] || {};
  const settingsRows = Object.keys(liveSettings).map((k) => ({ key: k, val: liveSettings[k] }));
  const settingsTableHeaders = ["ลำดับ", "คีย์การตั้งค่า (Setting Key)", "ค่าปัจจุบันที่บันทึกไว้ (Current Value)"];
  const settingsExtractors = [
    (s) => s.key,
    (s) => (typeof s.val === "object" ? JSON.stringify(s.val) : String(s.val)),
  ];
  addLiveRecordsSection(wsSettings, rNext, settingsTableHeaders, settingsRows, settingsExtractors);

  // =========================================================================
  // 9. SHEET: Data Properties (สาขาหอพัก)
  // =========================================================================
  const wsProps = wb.addWorksheet("8. Data Properties");
  wsProps.columns = [
    { width: 5 },
    { width: 8 },
    { width: 22 },
    { width: 20 },
    { width: 14 },
    { width: 15 },
    { width: 35 },
    { width: 45 },
  ];
  addTitle(wsProps, "B2:H2", "ตารางข้อมูล: Properties (สาขาหอพักและอาคาร)");

  wsProps.mergeCells("B4:H4");
  wsProps.getCell("B4").value = "โครงสร้างฟิลด์ ข้อบังคับ และการจำกัดข้อความ (Properties Schema & Constraints)";
  wsProps.getCell("B4").font = subTitleFont;

  const propSchemaRows = [
    [1, "id", "รหัสสาขา (PK)", "บังคับ", "string", "UUID / รหัส prop-timestamp", "รหัสสาขาหอพัก"],
    [2, "name", "ชื่อหอพัก/สาขา", "บังคับ", "string", "ความยาว 2-100 ตัวอักษร", "ชื่อหอพัก"],
    [3, "address", "ที่อยู่สถานที่ตั้ง", "ไม่บังคับ", "string", "ความยาวไม่เกิน 255 ตัวอักษร", "ที่อยู่หอพัก"],
    [4, "phone", "เบอร์โทรศัพท์", "ไม่บังคับ", "string", "ตัวเลข 9-10 หลัก", "เบอร์ติดต่อสำนักงาน"],
    [5, "electricRate", "ค่าไฟต่อหน่วย", "บังคับ", "number", "ตัวเลข >= 0", "อัตราค่าไฟ"],
    [6, "waterRate", "ค่าน้ำต่อหน่วย", "บังคับ", "number", "ตัวเลข >= 0", "อัตราค่าน้ำ"],
    [7, "totalRooms", "จำนวนห้องพักรวม", "บังคับ", "number", "จำนวนเต็ม >= 1", "จำนวนห้องพักทั้งหมด"],
  ];

  rNext = addSchemaSection(wsProps, 5, dictHeadersCommon, propSchemaRows);
  rNext += 2;

  const liveProps = db["pakdee_dev_properties"] || [];
  const propTableHeaders = ["ลำดับ", "รหัสสาขา", "ชื่อสาขา", "ที่อยู่", "เบอร์โทร", "ค่าไฟ/หน่วย", "ค่าน้ำ/หน่วย", "ห้องรวม"];
  const propExtractors = [
    (p) => p.id,
    (p) => p.name,
    (p) => p.address || "-",
    (p) => p.phone || "-",
    (p) => p.electricRate,
    (p) => p.waterRate,
    (p) => p.totalRooms || 0,
  ];
  addLiveRecordsSection(wsProps, rNext, propTableHeaders, liveProps, propExtractors);

  // Write Excel Files
  const publicDir = "D:/DESKTOP/Pakdee/public";
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  const filePathPublic = path.join(publicDir, "Pakdee_Database_Schema_Dictionary.xlsx");
  const filePathRoot = "D:/DESKTOP/Pakdee/Pakdee_Database_Schema_Dictionary.xlsx";

  await wb.xlsx.writeFile(filePathPublic);
  await wb.xlsx.writeFile(filePathRoot);

  const userTestPublic = "D:/DESKTOP/Pakdee-UserTest/public";
  if (fs.existsSync(userTestPublic)) {
    await wb.xlsx.writeFile(path.join(userTestPublic, "Pakdee_Database_Schema_Dictionary.xlsx"));
  }

  console.log("EXCEL_MULTI_SHEET_EXPORTED_SUCCESSFULLY: " + filePathPublic);
}

generateMultiSheetExcel().catch((err) => {
  console.error("Error generating Multi-Sheet Excel:", err);
  process.exit(1);
});
