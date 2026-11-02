const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");

async function generate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Antigravity AI - QS Smart Development Team";
  wb.lastModifiedBy = "Pakdee System";
  wb.created = new Date();
  wb.modified = new Date();

  // Color Palette
  const primaryHeaderFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF059669" }, // Emerald 600
  };
  const sectionHeaderFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F172A" }, // Slate 900
  };
  const headerFont = {
    name: "Segoe UI",
    size: 11,
    bold: true,
    color: { argb: "FFFFFFFF" },
  };
  const regularFont = {
    name: "Segoe UI",
    size: 10,
  };
  const boldFont = {
    name: "Segoe UI",
    size: 10,
    bold: true,
  };
  const borderThin = {
    top: { style: "thin", color: { argb: "FFE2E8F0" } },
    left: { style: "thin", color: { argb: "FFE2E8F0" } },
    bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
    right: { style: "thin", color: { argb: "FFE2E8F0" } },
  };

  // -------------------------------------------------------------
  // SHEET 1: ภาพรวมระบบและสถานะการเชื่อมต่อ (System Overview)
  // -------------------------------------------------------------
  const ws1 = wb.addWorksheet("ภาพรวมระบบและการเชื่อมต่อ");
  ws1.columns = [
    { width: 5 },
    { width: 30 },
    { width: 35 },
    { width: 35 },
    { width: 25 },
  ];

  ws1.mergeCells("B2:E2");
  const titleCell = ws1.getCell("B2");
  titleCell.value = "รายงานสถาปัตยกรรมฐานข้อมูลและพจนานุกรมข้อมูล (Database Schema & Dictionary)";
  titleCell.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = sectionHeaderFill;
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  ws1.getRow(2).height = 36;

  const overviewRows = [
    ["ชื่อระบบ", "PAKDEE APARTMENT MANAGEMENT SYSTEM (ระบบบริหารหอพักภักดี)"],
    ["เวอร์ชันซอฟต์แวร์", "v0.1.0-Production Ready"],
    ["สภาพแวดล้อม", "พอร์ต 3000 (หลัก) & พอร์ต 3001 (User Test)"],
    ["รูปแบบสถาปัตยกรรม", "Local-First Architecture (In-Memory + Host File Persistence)"],
    ["สถานะการเชื่อมต่อ API", "HTTP 200 OK ผ่าน /api/db (REST Atomic Endpoint)"],
    ["พาธไฟล์ฐานข้อมูลจริง", "D:\\DESKTOP\\Pakdee\\data\\db_port3000.json"],
    ["รองรับ Multi-Branch", "รองรับการแยกข้อมูลเด็ดขาดรายสาขา (Branch Isolation)"],
    ["จำนวนตารางข้อมูลหลัก", "11 ตาราง (Tables / Collections)"],
    ["วันที่ตรวจสอบล่าสุด", new Date().toLocaleString("th-TH")],
  ];

  ws1.mergeCells("B4:C4");
  ws1.getCell("B4").value = "1. ข้อมูลสถาปัตยกรรมและสถานะการเชื่อมต่อ (System Architecture & Connection)";
  ws1.getCell("B4").font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FF059669" } };

  let rIdx = 5;
  overviewRows.forEach(([k, v]) => {
    ws1.getCell("B" + rIdx).value = k;
    ws1.getCell("B" + rIdx).font = boldFont;
    ws1.getCell("B" + rIdx).border = borderThin;
    ws1.getCell("B" + rIdx).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };

    ws1.mergeCells("C" + rIdx + ":E" + rIdx);
    ws1.getCell("C" + rIdx).value = v;
    ws1.getCell("C" + rIdx).font = regularFont;
    ws1.getCell("C" + rIdx).border = borderThin;
    rIdx++;
  });

  rIdx += 2;
  ws1.mergeCells("B" + rIdx + ":E" + rIdx);
  ws1.getCell("B" + rIdx).value = "2. สรุปตารางข้อมูลหลักทั้ง 11 ตารางในระบบ (Summary of All 11 Database Tables)";
  ws1.getCell("B" + rIdx).font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FF059669" } };
  rIdx++;

  const tableSummaryHeaders = ["ลำดับ", "ชื่อตารางในระบบ (Table Key)", "ชื่อภาษาไทย / วัตถุประสงค์", "จำนวนฟิลด์โดยประมาณ"];
  const tHeaderRow = ws1.getRow(rIdx);
  tHeaderRow.values = ["", ...tableSummaryHeaders];
  tHeaderRow.height = 24;
  ["B", "C", "D", "E"].forEach((col, idx) => {
    const c = ws1.getCell(col + rIdx);
    c.fill = primaryHeaderFill;
    c.font = headerFont;
    c.alignment = { vertical: "middle", horizontal: idx === 0 ? "center" : "left" };
    c.border = borderThin;
  });
  rIdx++;

  const tablesSummary = [
    [1, "pakdee_dev_properties", "ข้อมูลสาขาและอัตราค่าน้ำ-ค่าไฟหอพัก", "10 ฟิลด์"],
    [2, "pakdee_dev_rooms", "ผังห้องพัก สถานะห้อง และมิเตอร์ปัจจุบัน", "13 ฟิลด์"],
    [3, "pakdee_dev_tenants", "ทะเบียนประวัติผู้เช่ารายเดือนและผู้เข้าพักรายวัน", "18 ฟิลด์"],
    [4, "pakdee_dev_contracts", "สัญญาเช่าดิจิทัล รายละเอียดทางการเงิน และ 14 ข้อสัญญา", "26 ฟิลด์"],
    [5, "pakdee_dev_invoices", "ใบแจ้งหนี้รอบบิล ค่าน้ำ ค่าไฟ และยอดชำระ", "15 ฟิลด์"],
    [6, "pakdee_dev_daily_bookings", "ปฏิทินจองห้องพักรายวัน มัดจำคีย์การ์ด และเช็คอิน/เอาท์", "14 ฟิลด์"],
    [7, "pakdee_dev_meter_readings", "ประวัติการจดเลขมิเตอร์น้ำและมิเตอร์ไฟประจำเดือน", "8 ฟิลด์"],
    [8, "pakdee_dev_repairs", "รายการแจ้งซ่อมบำรุงห้องพักและสถานะงานช่าง", "10 ฟิลด์"],
    [9, "pakdee_dev_expenses", "รายจ่ายดำเนินงานของหอพัก (ค่าน้ำ, ไฟ, ซ่อม, เงินเดือน)", "9 ฟิลด์"],
    [10, "pakdee_dev_branch_settings", "การตั้งค่าสาขา บัญชีธนาคาร พร้อมเพย์ QR และ LINE OA", "20 ฟิลด์"],
    [11, "pakdee_dev_activity_logs", "บันทึกประวัติการใช้งานและ Audit Trail ของระบบ", "6 ฟิลด์"],
  ];

  tablesSummary.forEach((row) => {
    const r = ws1.getRow(rIdx);
    r.values = ["", ...row];
    r.height = 20;
    ["B", "C", "D", "E"].forEach((col, idx) => {
      const c = ws1.getCell(col + rIdx);
      c.font = regularFont;
      c.border = borderThin;
      c.alignment = { vertical: "middle", horizontal: idx === 0 ? "center" : "left" };
      if (rIdx % 2 === 0) {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      }
    });
    rIdx++;
  });

  // -------------------------------------------------------------
  // SHEET 2: พจนานุกรมข้อมูลและการจำกัดฟิลด์ (Data Dictionary & Constraints)
  // -------------------------------------------------------------
  const ws2 = wb.addWorksheet("พจนานุกรมข้อมูล (Dictionary)");
  ws2.columns = [
    { width: 5 },
    { width: 22 }, // Table Name
    { width: 22 }, // Field Name
    { width: 14 }, // Data Type
    { width: 12 }, // Required
    { width: 28 }, // Constraints & Text Limits
    { width: 45 }, // Description
  ];

  ws2.mergeCells("B2:G2");
  const dTitle = ws2.getCell("B2");
  dTitle.value = "พจนานุกรมข้อมูล (Data Dictionary) - โครงสร้างฟิลด์ ข้อบังคับ และการจำกัดข้อความ";
  dTitle.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  dTitle.fill = sectionHeaderFill;
  dTitle.alignment = { vertical: "middle", horizontal: "center" };
  ws2.getRow(2).height = 32;

  const dictHeaders = ["ชื่อตาราง (Table)", "ชื่อฟิลด์ (Field)", "ชนิดข้อมูล", "ข้อบังคับ", "การจำกัด Text / ตัวเลข (Constraints)", "คำอธิบาย (Description)"];
  const dictHeaderRow = ws2.getRow(4);
  dictHeaderRow.values = ["", ...dictHeaders];
  dictHeaderRow.height = 25;
  ["B", "C", "D", "E", "F", "G"].forEach((col, idx) => {
    const c = ws2.getCell(col + "4");
    c.fill = primaryHeaderFill;
    c.font = headerFont;
    c.alignment = { vertical: "middle", horizontal: idx === 2 || idx === 3 ? "center" : "left" };
    c.border = borderThin;
  });

  const fieldsData = [
    // PROPERTIES
    ["Properties (สาขา)", "id", "string", "บังคับ (PK)", "UUID / รหัสสุ่มขึ้นต้น prop-", "รหัสประจำสาขาหอพัก"],
    ["Properties (สาขา)", "name", "string", "บังคับ", "ความยาว 2-100 ตัวอักษร", "ชื่อหอพัก/สาขา"],
    ["Properties (สาขา)", "address", "string", "ไม่บังคับ", "ความยาวไม่เกิน 255 ตัวอักษร", "ที่อยู่สถานที่ตั้งของหอพัก"],
    ["Properties (สาขา)", "phone", "string", "ไม่บังคับ", "ตัวเลขเบอร์โทร 9-10 หลัก", "เบอร์ติดต่อสำนักงานหอพัก"],
    ["Properties (สาขา)", "promptpayNumber", "string", "บังคับ", "เฉพาะตัวเลข 10 หรือ 13 หลัก", "เบอร์พร้อมเพย์รับชำระเงิน"],
    ["Properties (สาขา)", "promptpayName", "string", "ไม่บังคับ", "ความยาวไม่เกิน 100 ตัวอักษร", "ชื่อบัญชีพร้อมเพย์รับเงิน"],
    ["Properties (สาขา)", "electricRate", "number", "บังคับ", "ตัวเลขทศนิยม >= 0 (บาท/หน่วย)", "อัตราค่าไฟฟ้าต่อหน่วย"],
    ["Properties (สาขา)", "waterRate", "number", "บังคับ", "ตัวเลขทศนิยม >= 0 (บาท/หน่วย)", "อัตราค่าน้ำประปาต่อหน่วย"],

    // ROOMS
    ["Rooms (ผังห้องพัก)", "id", "string", "บังคับ (PK)", "UUID / รหัสประจำห้อง", "รหัสประจำห้องพัก"],
    ["Rooms (ผังห้องพัก)", "roomNumber", "string", "บังคับ", "ความยาว 1-10 ตัวอักษร (เช่น 101, A1)", "หมายเลขห้องพัก (Unique รายสาขา)"],
    ["Rooms (ผังห้องพัก)", "floor", "number", "บังคับ", "จำนวนเต็ม 1-99", "ชั้นที่ตั้งของห้องพัก"],
    ["Rooms (ผังห้องพัก)", "type", "string", "บังคับ", "จำกัดชุดคำ: แอร์, พัดลม, สตูดิโอ", "ประเภทห้องพัก"],
    ["Rooms (ผังห้องพัก)", "monthlyRate", "number", "บังคับ", "จำนวนเต็ม/ทศนิยม >= 0 (บาท/ด.)", "ราคาค่าเช่าห้องพักรายเดือน"],
    ["Rooms (ผังห้องพัก)", "dailyRate", "number", "ไม่บังคับ", "จำนวนเต็ม/ทศนิยม >= 0 (บาท/คืน)", "ราคาค่าเช่าห้องพักรายวัน"],
    ["Rooms (ผังห้องพัก)", "status", "string", "บังคับ", "enum: vacant, occupied, daily, cleaning, maintenance, overdue", "สถานะปัจจุบันของห้องพัก"],
    ["Rooms (ผังห้องพัก)", "currentTenant", "object", "ไม่บังคับ", "Object โครงสร้าง Tenant", "ข้อมูลผู้เช่าปัจจุบันที่พักอยู่"],
    ["Rooms (ผังห้องพัก)", "leaseEndDate", "string", "ไม่บังคับ", "รูปแบบ YYYY-MM-DD หรือ \"สัญญาต่อเนื่อง\"", "วันสิ้นสุดสัญญาเช่า"],
    ["Rooms (ผังห้องพัก)", "currentElectricMeter", "number", "บังคับ", "ตัวเลขจำนวนเต็ม >= 0", "เลขมิเตอร์ไฟฟ้าล่าสุด"],
    ["Rooms (ผังห้องพัก)", "currentWaterMeter", "number", "บังคับ", "ตัวเลขจำนวนเต็ม >= 0", "เลขมิเตอร์ประปาล่าสุด"],

    // TENANTS
    ["Tenants (ทะเบียนผู้เช่า)", "id", "string", "บังคับ (PK)", "UUID", "รหัสประจำตัวผู้เช่า"],
    ["Tenants (ทะเบียนผู้เช่า)", "fullName", "string", "บังคับ", "ความยาว 2-100 ตัวอักษร", "ชื่อ-นามสกุลของผู้เช่า/ผู้เข้าพัก"],
    ["Tenants (ทะเบียนผู้เช่า)", "phone", "string", "บังคับ", "ตัวเลข 10 หลัก (Format 0xx-xxx-xxxx)", "เบอร์โทรศัพท์ติดต่อ"],
    ["Tenants (ทะเบียนผู้เช่า)", "idCard", "string", "บังคับ", "ตัวเลข 13 หลักตามมาตรฐานกรมการปกครอง", "เลขบัตรประจำตัวประชาชนไทย"],
    ["Tenants (ทะเบียนผู้เช่า)", "gender", "string", "ไม่บังคับ", "enum: MALE, FEMALE, OTHER", "เพศสภาพของผู้เช่า"],
    ["Tenants (ทะเบียนผู้เช่า)", "age", "number", "ไม่บังคับ", "ตัวเลขจำนวนเต็ม 1-120", "อายุผู้เช่า"],
    ["Tenants (ทะเบียนผู้เช่า)", "lineId", "string", "ไม่บังคับ", "ความยาว 1-50 ตัวอักษร", "LINE ID สำหรับติดต่อ"],
    ["Tenants (ทะเบียนผู้เช่า)", "vehiclePlate", "string", "ไม่บังคับ", "ข้อความทะเบียนรถ (เช่น กข-1234 กทม)", "ป้ายทะเบียนรถยนต์/มอเตอร์ไซค์"],
    ["Tenants (ทะเบียนผู้เช่า)", "emergencyContact", "string", "ไม่บังคับ", "ชื่อและเบอร์โทรติดต่อฉุกเฉิน", "ผู้ติดต่อฉุกเฉิน"],
    ["Tenants (ทะเบียนผู้เช่า)", "depositAmount", "number", "ไม่บังคับ", "จำนวนเงินตัวเลข >= 0 (บาท)", "เงินประกันความเสียหายที่วางไว้"],
    ["Tenants (ทะเบียนผู้เช่า)", "additionalFees", "array", "ไม่บังคับ", "Array ของ {id, name, amount, isEnabled}", "รายการค่าบริการเพิ่มเติมที่เปิดใช้"],
    ["Tenants (ทะเบียนผู้เช่า)", "notes", "string", "ไม่บังคับ", "ข้อความรายละเอียดเพิ่มเติม / ป้ายรายวัน", "บันทึกช่วยจำ"],

    // CONTRACTS
    ["Contracts (สัญญาเช่า)", "id", "string", "บังคับ (PK)", "UUID / รหัส ct-", "รหัสสัญญาเช่า"],
    ["Contracts (สัญญาเช่า)", "contractNumber", "string", "บังคับ", "รูปแบบ CT-YYYY-ห้อง-ลำดับ", "เลขที่เอกสารสัญญาเช่าดิจิทัล"],
    ["Contracts (สัญญาเช่า)", "roomNumber", "string", "บังคับ", "หมายเลขห้องพัก", "ห้องพักที่ทำสัญญา"],
    ["Contracts (สัญญาเช่า)", "tenantName", "string", "บังคับ", "ชื่อ-นามสกุลผู้เช่า", "คู่สัญญาฝ่ายผู้เช่า"],
    ["Contracts (สัญญาเช่า)", "startDate", "string", "บังคับ", "รูปแบบ YYYY-MM-DD", "วันเริ่มต้นสัญญา"],
    ["Contracts (สัญญาเช่า)", "endDate", "string", "บังคับ", "รูปแบบ YYYY-MM-DD หรือ สัญญาต่อเนื่อง", "วันสิ้นสุดสัญญา"],
    ["Contracts (สัญญาเช่า)", "monthlyRent", "number", "บังคับ", "ตัวเลขจำนวนเงิน >= 0", "ค่าเช่ารายเดือนที่ระบุในสัญญา"],
    ["Contracts (สัญญาเช่า)", "depositAmount", "number", "บังคับ", "ตัวเลขจำนวนเงิน >= 0", "เงินประกันสัญญา"],
    ["Contracts (สัญญาเช่า)", "paymentDueDay", "number", "บังคับ", "จำนวนเต็ม 1-31 (ค่าเริ่มต้น 5)", "วันครบกำหนดชำระของทุกเดือน"],
    ["Contracts (สัญญาเช่า)", "lateFeePerDay", "number", "ไม่บังคับ", "ตัวเลข >= 0 (ค่าเริ่มต้น 100 บ./วัน)", "ค่าปรับชำระล่าช้าต่อวัน"],
    ["Contracts (สัญญาเช่า)", "clauses", "array", "ไม่บังคับ", "Array 14 ข้อสัญญามาตรฐาน", "เนื้อหาข้อสัญญาทางกฎหมาย"],
    ["Contracts (สัญญาเช่า)", "signatureUrl", "string", "ไม่บังคับ", "Data URL / ภาพลายเซ็นดิจิทัล", "ลายเซ็นอิเล็กทรอนิกส์ E-Signature"],
    ["Contracts (สัญญาเช่า)", "status", "string", "บังคับ", "enum: draft, active, expired, terminated", "สถานะสัญญาเช่า"],

    // INVOICES
    ["Invoices (ใบแจ้งหนี้)", "id", "string", "บังคับ (PK)", "UUID / รหัส inv-", "รหัสใบแจ้งหนี้"],
    ["Invoices (ใบแจ้งหนี้)", "invoiceNumber", "string", "บังคับ", "รูปแบบ INV-YYYYMM-ห้อง", "เลขที่ใบแจ้งหนี้/บิล"],
    ["Invoices (ใบแจ้งหนี้)", "roomNumber", "string", "บังคับ", "หมายเลขห้องพัก", "ห้องพักที่ออกบิล"],
    ["Invoices (ใบแจ้งหนี้)", "tenantName", "string", "บังคับ", "ชื่อผู้เช่า", "ชื่อผู้รับใบแจ้งหนี้"],
    ["Invoices (ใบแจ้งหนี้)", "billingDate", "string", "บังคับ", "รูปแบบ YYYY-MM-DD", "รอบบิลประจำวันที่"],
    ["Invoices (ใบแจ้งหนี้)", "dueDate", "string", "บังคับ", "รูปแบบ YYYY-MM-DD", "วันครบกำหนดชำระ"],
    ["Invoices (ใบแจ้งหนี้)", "rentAmount", "number", "บังคับ", "ตัวเลข >= 0 (บาท)", "ยอดค่าเช่าห้องพัก"],
    ["Invoices (ใบแจ้งหนี้)", "electricUnits", "number", "บังคับ", "ตัวเลขหน่วยไฟที่ใช้ (ล่าสุด - ก่อนหน้า)", "จำนวนหน่วยไฟฟ้า"],
    ["Invoices (ใบแจ้งหนี้)", "waterUnits", "number", "บังคับ", "ตัวเลขหน่วยน้ำที่ใช้ (ล่าสุด - ก่อนหน้า)", "จำนวนหน่วยน้ำประปา"],
    ["Invoices (ใบแจ้งหนี้)", "totalAmount", "number", "บังคับ", "ยอดรวมสุทธิ (ค่าห้อง+น้ำ+ไฟ+บริการเสริม)", "ยอดเงินรวมที่ต้องชำระ"],
    ["Invoices (ใบแจ้งหนี้)", "status", "string", "บังคับ", "enum: pending, paid, overdue", "สถานะการชำระเงิน"],
    ["Invoices (ใบแจ้งหนี้)", "paidAt", "string", "ไม่บังคับ", "วันเวลาที่ชำระจริง (ISO/String)", "บันทึกเวลาที่ได้รับเงิน"],

    // DAILY BOOKINGS
    ["Daily Bookings (จองรายวัน)", "id", "string", "บังคับ (PK)", "UUID / รหัส b-", "รหัสการจองห้องพักรายวัน"],
    ["Daily Bookings (จองรายวัน)", "roomNumber", "string", "บังคับ", "หมายเลขห้องพัก (ต้องเป็นห้องว่าง)", "ห้องพักที่จอง"],
    ["Daily Bookings (จองรายวัน)", "guestName", "string", "บังคับ", "ความยาว 2-100 ตัวอักษร", "ชื่อลูกค้าผู้เข้าพัก"],
    ["Daily Bookings (จองรายวัน)", "guestPhone", "string", "บังคับ", "ตัวเลขเบอร์โทร 10 หลัก", "เบอร์ติดต่อลูกค้า"],
    ["Daily Bookings (จองรายวัน)", "checkInDate", "string", "บังคับ", "รูปแบบ YYYY-MM-DD", "วันที่เข้าพัก (Check-in)"],
    ["Daily Bookings (จองรายวัน)", "checkOutDate", "string", "บังคับ", "รูปแบบ YYYY-MM-DD (ต้องหลังวัน Check-in)", "วันที่คืนห้อง (Check-out)"],
    ["Daily Bookings (จองรายวัน)", "nights", "number", "บังคับ", "จำนวนเต็ม >= 1", "จำนวนคืนที่เข้าพัก"],
    ["Daily Bookings (จองรายวัน)", "dailyRate", "number", "บังคับ", "ตัวเลข >= 0 (บาท/คืน)", "ราคาห้องพักต่อคืน"],
    ["Daily Bookings (จองรายวัน)", "totalRoomPrice", "number", "บังคับ", "nights * dailyRate", "ยอดรวมค่าห้องพัก"],
    ["Daily Bookings (จองรายวัน)", "keyDeposit", "number", "บังคับ", "ตัวเลข >= 0 (ค่าเริ่มต้น 500)", "เงินมัดจำกุญแจ/คีย์การ์ด"],
    ["Daily Bookings (จองรายวัน)", "status", "string", "บังคับ", "enum: confirmed, checked_in, checked_out", "สถานะการเข้าพัก"],

    // BRANCH SETTINGS
    ["Branch Settings (ตั้งค่าสาขา)", "bankName", "string", "บังคับ", "เลือกจาก Dropdown ธนาคารไทยชั้นนำ", "ชื่อธนาคารบัญชีรับเงิน"],
    ["Branch Settings (ตั้งค่าสาขา)", "bankAccountNumber", "string", "บังคับ", "ตัวเลข 10-12 หลัก (มีขีดหรือไม่มีก็ได้)", "เลขที่บัญชีธนาคาร"],
    ["Branch Settings (ตั้งค่าสาขา)", "promptpayNumber", "string", "บังคับ", "ตัวเลข 10 หรือ 13 หลัก", "เบอร์พร้อมเพย์รับเงินสำหรับสร้าง QR"],
    ["Branch Settings (ตั้งค่าสาขา)", "lineChannelAccessToken", "string", "ไม่บังคับ", "LINE Messaging API Token", "Token ส่งข้อความ LINE Official"],
    ["Branch Settings (ตั้งค่าสาขา)", "lateFeePerDay", "number", "ไม่บังคับ", "ตัวเลข >= 0 (บาท/วัน)", "ค่าปรับค้างชำระค่าเช่ารายวัน"],
  ];

  let dRowIdx = 5;
  fieldsData.forEach((row) => {
    const r = ws2.getRow(dRowIdx);
    r.values = ["", ...row];
    r.height = 19;
    ["B", "C", "D", "E", "F", "G"].forEach((col, idx) => {
      const c = ws2.getCell(col + dRowIdx);
      c.font = regularFont;
      c.border = borderThin;
      if (idx === 0) c.font = boldFont;
      if (idx === 2 || idx === 3) c.alignment = { vertical: "middle", horizontal: "center" };
      if (row[3].includes("บังคับ") && idx === 3) {
        c.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFE11D48" } };
      }
      if (dRowIdx % 2 === 0) {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      }
    });
    dRowIdx++;
  });

  // -------------------------------------------------------------
  // SHEET 3: แมปการเรียกใช้งานในแต่ละหน้าจอ (Frontend Usage Matrix)
  // -------------------------------------------------------------
  const ws3 = wb.addWorksheet("การใช้งานบนหน้าจอ (UI Matrix)");
  ws3.columns = [
    { width: 5 },
    { width: 24 }, // Table Name
    { width: 28 }, // UI View / URL
    { width: 18 }, // Operations (CRUD)
    { width: 50 }, // Component Name
    { width: 40 }, // Business Purpose
  ];

  ws3.mergeCells("B2:F2");
  const mTitle = ws3.getCell("B2");
  mTitle.value = "ตารางจับคู่การใช้งานฐานข้อมูลกับหน้าจอเว็บ (Frontend UI to Database Matrix)";
  mTitle.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  mTitle.fill = sectionHeaderFill;
  mTitle.alignment = { vertical: "middle", horizontal: "center" };
  ws3.getRow(2).height = 32;

  const matrixHeaders = ["ชื่อตาราง (Table Name)", "หน้าจอ / URL เส้นทาง", "การดำเนินการ (CRUD)", "คอมโพเนนต์ที่เรียกใช้ (Component)", "วัตถุประสงค์ทางธุรกิจ"];
  const mHeaderRow = ws3.getRow(4);
  mHeaderRow.values = ["", ...matrixHeaders];
  mHeaderRow.height = 25;
  ["B", "C", "D", "E", "F"].forEach((col, idx) => {
    const c = ws3.getCell(col + "4");
    c.fill = primaryHeaderFill;
    c.font = headerFont;
    c.alignment = { vertical: "middle", horizontal: idx === 2 ? "center" : "left" };
    c.border = borderThin;
  });

  const matrixData = [
    ["pakdee_dev_properties", "ทุกหน้า (Header & Sidebar)", "READ, UPDATE", "Sidebar, Header, BranchSelectorView", "แสดงชื่อสาขา สลับสาขา และอัตราค่าน้ำ/ไฟ"],
    ["pakdee_dev_rooms", "/ (ผังสถานะห้องพัก)", "READ, CREATE, UPDATE, DELETE", "RoomMatrix, OverviewMetrics, TodoToday", "แสดงผังตาราง 24 ห้อง ฟิลเตอร์สถานะ ค้างชำระ ว่าง รายวัน"],
    ["pakdee_dev_tenants", "/tenants (ทะเบียนผู้เช่า)", "READ, CREATE, UPDATE", "page.tsx (currentTab===tenants)", "แสดงรายชื่อประวัติผู้เช่ารายเดือนและผู้เข้าพักรายวัน"],
    ["pakdee_dev_contracts", "/contracts (สัญญาเช่าดิจิทัล)", "READ, CREATE, UPDATE", "ContractManagementView, TenantRegistrationView", "แสดงรายการสัญญา 14 ข้อ ตรวจสอบ E-Signature"],
    ["pakdee_dev_invoices", "/invoices (ใบแจ้งหนี้ & บิล)", "READ, CREATE, UPDATE", "page.tsx (currentTab===invoices), InvoicePreviewModal", "คำนวณบิลรอบเดือน บันทึกชำระเงิน สร้าง PromptPay QR"],
    ["pakdee_dev_daily_bookings", "/daily (ปฏิทินจองรายวัน)", "READ, CREATE, UPDATE, DELETE", "page.tsx (currentTab===daily)", "จัดการจองรายวัน เช็คอิน/เช็คเอาท์ มัดจำคีย์การ์ด"],
    ["pakdee_dev_meter_readings", "/meter (จดมิเตอร์น้ำ-ไฟ)", "READ, CREATE, BATCH UPDATE", "MeterSpreadsheetView, QuickMeterModal", "กรอกเลขมิเตอร์แบบสเปรดชีต คำนวณหน่วยใช้จริงอัตโนมัติ"],
    ["pakdee_dev_repairs", "/repairs (แจ้งซ่อมบำรุง)", "READ, CREATE, UPDATE", "RepairsManagementView", "แจ้งซ่อม อัปเดตสถานะงานช่าง กำหนดช่างเข้าตรวจ"],
    ["pakdee_dev_expenses", "/expenses (รายจ่ายหอพัก)", "READ, CREATE, DELETE", "page.tsx (currentTab===expenses)", "บันทึกค่าใช้จ่ายดำเนินการ สรุปต้นทุนหอพัก"],
    ["pakdee_dev_branch_settings", "/settings (ตั้งค่าหอพัก)", "READ, UPDATE", "BranchSettingsView", "ตั้งค่าเลขบัญชีธนาคาร พร้อมเพย์ รอบบิล LINE OA"],
    ["pakdee_dev_activity_logs", "/dashboard (แดชบอร์ดบริหาร)", "READ, CREATE", "ExecutiveDashboard, DatabaseInspectorModal", "Audit Trail บันทึกทุกเหตุการณ์ในระบบเพื่อความโปร่งใส"],
  ];

  let mRowIdx = 5;
  matrixData.forEach((row) => {
    const r = ws3.getRow(mRowIdx);
    r.values = ["", ...row];
    r.height = 20;
    ["B", "C", "D", "E", "F"].forEach((col, idx) => {
      const c = ws3.getCell(col + mRowIdx);
      c.font = regularFont;
      c.border = borderThin;
      if (idx === 0) c.font = boldFont;
      if (idx === 2) c.alignment = { vertical: "middle", horizontal: "center" };
      if (mRowIdx % 2 === 0) {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      }
    });
    mRowIdx++;
  });

  // Ensure public directory exists
  const publicDir = "D:/DESKTOP/Pakdee/public";
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  const filePathPublic = path.join(publicDir, "Pakdee_Database_Schema_Dictionary.xlsx");
  const filePathRoot = "D:/DESKTOP/Pakdee/Pakdee_Database_Schema_Dictionary.xlsx";

  await wb.xlsx.writeFile(filePathPublic);
  await wb.xlsx.writeFile(filePathRoot);

  // Sync to UserTest as well
  const userTestPublic = "D:/DESKTOP/Pakdee-UserTest/public";
  if (fs.existsSync(userTestPublic)) {
    await wb.xlsx.writeFile(path.join(userTestPublic, "Pakdee_Database_Schema_Dictionary.xlsx"));
  }

  console.log("EXCEL_GENERATED_SUCCESSFULLY: " + filePathPublic);
}

generate().catch((err) => {
  console.error("Error generating Excel:", err);
  process.exit(1);
});
