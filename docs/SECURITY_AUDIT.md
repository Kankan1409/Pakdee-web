# 🔒 รายงานการตรวจสอบความปลอดภัยของระบบ (SECURITY AUDIT)
# ระบบจัดการหอพักภักดี (Pakdee Apartment Management System)

**อ้างอิงเอกสารหลัก:** [V2_INDEPENDENT_VERIFICATION_REPORT.md](file:///D:/DESKTOP/Pakdee/docs/V2_INDEPENDENT_VERIFICATION_REPORT.md)  
**ขอบเขต:** ตรวจสอบความปลอดภัย API, การยืนยันตัวตน, การป้องกันการเข้าถึงข้อมูลข้ามผู้ใช้ (IDOR), และการปกป้องข้อมูลส่วนบุคคล

---

## 1. การตรวจสอบความปลอดภัยของ API Endpoint (`/api/db`)

### 🔹 ผลการตรวจสอบไฟล์ `src/app/api/db/route.ts`:
- **GET Request (ดึงข้อมูล):** ไม่มี Middleware, ไม่มี Session Check, ไม่มี Header Verification บุคคลในเครือข่ายสามารถเรียก `curl http://192.168.7.126:3000/api/db` เพื่อดึงข้อมูลห้องพัก ผู้เช่า และสัญญาเช่าทั้งหมดได้ทันที
- **POST Request (บันทึก/แก้ไขข้อมูล):** สามารถส่ง JSON Payload ไปเขียนทับค่าใดๆ ในฐานข้อมูลได้โดยตรงโดยไม่ต้องล็อกอิน
- **สถานะ:** ❌ **FAILED (CRITICAL VULNERABILITY)**

> ⚠️ **คำเตือนจากผู้ตรวจสอบ:**  
> แม้ว่าในอนาคตจะมีแผนย้ายไปใช้ Supabase Cloud แต่ตราบใดที่ระบบยังคงรัน Endpoint `/api/db` อยู่บน Production/Staging ความเสี่ยงด้านการรั่วไหลและการถูกเขียนทับข้อมูลในระดับ Local/LAN ยังคงมีอยู่เต็ม 100%

---

## 2. การตรวจสอบการยืนยันตัวตนและสิทธิ์ (Authentication & RBAC)

| มิติการตรวจสอบ | สิ่งที่ตรวจพบจริงในระบบ | ระดับความเสี่ยง | สถานะ |
| :--- | :--- | :---: | :---: |
| **Server-side Session** | ใช้ `localStorage.getItem("pakdee_auth_session_v1")` เป็น Session จำลองฝั่ง Client | HIGH | ❌ FAILED |
| **Server-side RBAC** | ไม่มีการตรวจสอบ Role ฝั่ง Server Controller (ตรวจเฉพาะใน React Component UI) | HIGH | ❌ FAILED |
| **CSRF Protection** | ไม่มี CSRF Token หรือ SameSite Cookie ป้องกันการโจมตีข้ามไซต์ | MEDIUM | ❌ FAILED |
| **Rate Limiting** | ไม่มี Rate Limiting ควบคุมคำขอต่อวินาที | MEDIUM | ❌ FAILED |
| **Insecure Direct Object References (IDOR)** | หากรู้ `propertyId` สามารถส่งไปดึงข้อมูลของสาขาอื่นได้โดยไม่มี Server Validation | HIGH | ⚠️ HIGH RISK |

---

## 3. การปกป้องข้อมูลส่วนบุคคล (Data Privacy & Encryption at Rest)

- **เลขบัตรประชาชน (ID Card):** บันทึกเป็นตัวเลข Plaintext เช่น `"1100200300400"` ในไฟล์ JSON ยัง **ไม่มีการเข้ารหัสด้วย AES-256-GCM**
- **เบอร์โทรศัพท์ (Phone Number):** บันทึกเป็น Plaintext ในไฟล์ JSON
- **การแสดงผลหน้าบ้าน:** ในตารางผู้เช่ายังไม่มีการ Mask ข้อมูล (แสดงเลขเต็ม)
- **สถานะ:** ❌ **FAILED (Non-compliant with PDPA Standards)**
