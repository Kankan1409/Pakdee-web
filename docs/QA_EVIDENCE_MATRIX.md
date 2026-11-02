# 📊 ตารางตรวจสอบหลักฐานการทดสอบคุณภาพ (QA EVIDENCE MATRIX)
# ระบบจัดการหอพักภักดี (Pakdee Apartment Management System)

**อ้างอิงเอกสารหลัก:** [V2_INDEPENDENT_VERIFICATION_REPORT.md](file:///D:/DESKTOP/Pakdee/docs/V2_INDEPENDENT_VERIFICATION_REPORT.md)  
**ขอบเขต:** ตรวจสอบหลักฐานการทดสอบจริง, ความครอบคลุม (Coverage), สคริปต์ทดสอบ และประวัติการรันย้อนหลัง

---

## 1. การจำแนกประเภทการทดสอบและหลักฐานเชิงประจักษ์

| รายการทดสอบที่รายงาน | ประเภทการทดสอบ | มีไฟล์สคริปต์อยู่จริง | ผลการรันจริง (Actual Evidence) | ระดับความครอบคลุม | สถานะ |
| :--- | :---: | :---: | :--- | :---: | :---: |
| **TypeScript Compilation** | Static Analysis | มี (`tsconfig.json`) | รัน `tsc --noEmit` ได้ `0 Type Errors` | 100% Type Coverage | ✅ VERIFIED |
| **ผังสถานะห้องพัก (`/rooms`)** | E2E Headless Browser | มี (`run_full_qa_suite.js`) | เปิดหน้าได้จริง, นับห้องได้ 27 elements, 0 Console Errors | UI Loading & Render | ✅ VERIFIED |
| **ทะเบียนผู้เช่า (`/tenants`)** | E2E Headless Browser | มี (`run_full_qa_suite.js`) | เปิดหน้าได้จริง, มีแถวผู้เช่าแสดงผล, 0 Console Errors | UI Loading & Render | ✅ VERIFIED |
| **งานแม่บ้าน (`/cleaning`)** | E2E Headless Browser | มี (`run_full_qa_suite.js`) | โหลดหน้ากระดานทำความสะอาดสำเร็จ, 0 Console Errors | UI Loading | ✅ VERIFIED |
| **รายงานบัญชี (`/reports`)** | E2E Headless Browser | มี (`run_full_qa_suite.js`) | โหลดแดชบอร์ดรายงานสำเร็จ, 0 Console Errors | UI Loading | ✅ VERIFIED |
| **Delete Room Safeguard** | Unit / Integration | ไม่มีไฟล์เทสต์แยก | ยืนยันจาก Static Code Analysis ใน `database.service.ts` L637-L650 | Logic Verification Only | ⚠️ PARTIAL |
| **Partial Payment Flow** | E2E Transaction | ไม่มีไฟล์เทสต์แยก | ยังไม่มีสคริปต์จำลองการกดรับเงิน 2 ครั้งสำหรับ 1 บิล | Not Executed | ❌ NOT VERIFIED |
| **Concurrency 2 Machines Test** | Concurrency Simulation | ไม่มีไฟล์เทสต์ | ไม่พบสคริปต์จำลองการกด Save ชนกัน 2 เครื่องพร้อมกัน | Not Executed | ❌ NOT VERIFIED |
| **API Tampering & Auth Test** | Security Penetration | ไม่มีไฟล์เทสต์ | ไม่มีการทดสอบยิงบล็อกคำขอที่ไม่ได้รับอนุญาต | Not Executed | ❌ NOT VERIFIED |

---

## 2. การประเมินข้ออ้างการทดสอบ (Claims vs Measurable Evidence)

> ⚠️ **ข้อบังคับ QA:** ห้ามกล่าวอ้างว่า "ผ่านการทดสอบ 100%" หากไม่มีหลักฐานครอบคลุมทุกมิติ

- **ข้ออ้าง:** "ผ่านการทดสอบ 100% (100% Passed)" ในรายงาน Patch Notes
- **ข้อเท็จจริงจากการตรวจสอบ:**
  - การผ่านการทดสอบ 100% นั้น **เป็นจริงเฉพาะในขอบเขต UI Smoke Test / Happy Path Navigation** (การเปิดหน้าจอได้ครบโดยไม่มี Console Error สีแดง)
  - **ยังไม่ครอบคลุม:** Edge Cases ทางการเงิน, การยิงทำรายการพร้อมกัน (Concurrency Stress Test), และการทดสอบเจาะระบบความปลอดภัย (Security Pentest)
