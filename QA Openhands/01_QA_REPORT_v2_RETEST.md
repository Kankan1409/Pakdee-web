# รายงานทดสอบซ้ำ (Re-Test Report) — PAKDEE v2.0

**ระบบ:** ระบบบริหารจัดการหอพัก PAKDEE (พักดี) · **Port:** 3000
**Repo:** https://github.com/kainooy5511/pakdee-apartment
**วันที่ทดสอบซ้ำ:** 2 พฤศจิกายน 2026
**ผู้ทดสอบ:** AI Agent (OpenHands) — ทดสอบอัตโนมัติด้วย Puppeteer/Chromium

## 0. สรุปสั้น (TL;DR)

| ประเด็น | คำตอบ |
|---|---|
| มี commit ใหม่ไหม | ✅ ใช่ — `8e79750` "feat: complete v2.0 remediation" (จากเดิม `36ab2a5`) |
| บั๊กเดิม BUG-001 (แอป 500 ถ้าไม่มี env) หายไหม | ❌ **ยังอยู่** |
| บั๊กเดิม BUG-002 (เช็คเอาท์แล้วไม่เข้า cleaning) หายไหม | ❌ **ยังอยู่** |
| บั๊กใหม่ที่พบรอบนี้ | ⚠️ **BUG-004** (ผังห้องแสดง "อีก NaN วัน") |
| มีอะไรดีขึ้น | ✅ ข้อมูลเป็นข้อมูลจริง 3 ห้อง · เพิ่ม Delete Safeguards · Payment Ledger · `min` guard ที่ช่องมิเตอร์ |
| ผลทดสอบรอบนี้ | **42/44 steps (95.5%)** |

---

## 1. สิ่งที่เปลี่ยนไประหว่าง v1 → v2

| Commit | ข้อความ | วันที่ |
|---|---|---|
| `36ab2a5` | feat: complete pakdee apartment system v1.0.0 (Port 3000 production ready) | v1 |
| `8e79750` | **feat: complete v2.0 remediation (Single Source of Truth, Payment Ledger, Delete Safeguards)** | v2 |

**สถิติการแก้ไข v1 → v2:** 36 ไฟล์, +6,227 / −1,471 บรรทัด (แตะ `database.service.ts`, `types/dormitory.ts`, `room-matrix.tsx`, `room-detail-modal.tsx`, `advanced-billing-view.tsx`)

### 1.1 สิ่งที่ดีขึ้นจริง (ยืนยันจากการทดสอบ)

| # | สิ่งที่ปรับปรุง | หลักฐาน |
|---|---|---|
| 1 | **เพิ่ม Delete Safeguards** — ลบห้องไม่ได้ถ้ามีผู้เช่าอยู่ หรือมีบิลค้างชำระ | `database.service.ts:633 deleteRoom()` คืน `{success:false, error}` พร้อมข้อความไทย |
| 2 | **เพิ่ม Payment Ledger** — มีคีย์ `pakdee_dev_payments` / `pakdee_dev_receipts` | ตรวจพบใน DB schema ของ v2 |
| 3 | **เพิ่ม Activity Log** — 22 จุดเรียก `logActivity()` บันทึก CREATE/PAYMENT/DELETE | `database.service.ts` |
| 4 | **ช่องมิเตอร์มี `min` guard** — `min={row.electricPrev}` / `min={row.waterPrev}` | `meters/meter-spreadsheet-view.tsx:312,327` |
| 5 | **ข้อมูลเป็นข้อมูลจริง** — เปลี่ยนจาก seed 24 ห้องเป็นข้อมูลจริง 3 ห้อง (prop-1793250152420 "วิภาวรรณ 1") | `data/db_port3000.json` |
| 6 | **ผลทดสอบหลักยังผ่านครบ** — Scenario 1 (วงจรผู้เช่ารายเดือน) 16/16 | ดู §3 |

### 1.2 ⚠️ ข้อสังเกตสำคัญเรื่องรายงานของทีม v2

ทีมได้เพิ่มไฟล์ `PAKDEE_QA_AUDIT_REPORT_PORT3000.md` ซึ่งระบุว่า **"ผ่านการทดสอบ 100%"** และระบุว่า step 2.3 *"เช็คเอาท์และส่งห้องให้แม่บ้าน → ห้องเปลี่ยนเป็น รอทำความสะอาด → PASS"*

**แต่ผลการทดสอบอัตโนมัติของผมยืนยันตรงกันข้าม:** หลังเช็คเอาท์ห้องกลายเป็น `vacant` (ไม่ใช่ `cleaning`) และ**โค้ด `terminateRoomContracts()` ไม่ถูกแก้เลย** ระหว่าง v1 → v2 (ตรวจด้วย `git diff` แล้วไม่มีไฟล์ `database.service.ts` ส่วนนี้ถูกแตะ)

> ข้อสันนิษฐาน: การทดสอบของทีมอาจตรวจแค่ "ปุ่มกดได้/โมดัลเปิด" ไม่ได้ตรวจสถานะห้องใน DB จริงหลังเช็คเอาท์ จึงไม่พบความคลาดเคลื่อนนี้

---

## 2. สถานะบั๊กเดิม (ตรวจซ้ำแบบควบคุม)

### 🔴 BUG-001 — แอป crash (HTTP 500) เมื่อไม่มี env → **ยังไม่หาย**

ทดสอบซ้ำบน v2 โดยการลบ `.env.local` ออกชั่วคราว:

```
=== v2 ไม่มี .env.local ===
/          -> 500
/rooms     -> 500
/login     -> 200
/settings  -> 500
--- log ---
⨯ Error: supabaseUrl is required.
```

**โค้ดปัจจุบัน (v2) ยังไม่มี guard:**
```ts
// src/lib/supabase.ts — เหมือน v1 ทุกประการ
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```
นอกจากนี้ v2 **ยังไม่มีไฟล์ `.env.example`** (ตรวจด้วย `git ls-tree 8e79750 | grep env` → ไม่พบ)

**ผล:** ❌ ยังไม่หาย — ยังต้องแก้ตามข้อเสนอเดิม

### 🟠 BUG-002 — เช็คเอาท์รายวันแล้วห้องไม่เข้า "รอทำความสะอาด" → **ยังไม่หาย**

ทดสอบซ้ำบน v2 (จองห้อง 102 → เช็คอิน → เช็คเอาท์):

```
after booking 102 : daily
after checkin     : daily
AFTER CHECKOUT 102: vacant   <-- คาดหวัง "cleaning"
cleaning board    : {"has102": false}   <-- ห้องไม่ขึ้นกระดานแม่บ้าน
```

**โค้ดยังไม่ถูกแก้ (เหมือน v1):**
```ts
// database.service.ts
if ((status === "vacant" || status === "cleaning") && targetRoom?.roomNumber) {
  await this.terminateRoomContracts(targetRoom.roomNumber, targetRoom.propertyId);
}
// ...
// terminateRoomContracts() ยังตั้ง status: "vacant" ทับทุกกรณี
```

**ผล:** ❌ ยังไม่หาย — ยังต้องแก้ตามข้อเสนอเดิม

### 🔵 BUG-003 — URL ไม่ sync กับแท็บ → ยังไม่แก้ (severity ต่ำ)

---

## 3. บั๊กใหม่ที่พบในรอบนี้

### ⚠️ BUG-004 — ผังห้องพักแสดง "อีก NaN วัน" ในข้อมูลสัญญา (NEW)

| ฟิลด์ | รายละเอียด |
|---|---|
| **Severity** | 🟠 **Medium** (แสดงผลผิดให้ผู้ใช้เห็น) |
| **File** | `src/components/dashboard/room-matrix.tsx` — `getLeaseCountdown()` (บรรทัด 212–222) |
| **อาการ** | การ์ดห้อง 101 แสดงข้อความ **"สัญญาถึง สัญญาต่อเนื่อง · อีก NaN วัน"** บนผังห้องพักทันทีหลังโหลดข้อมูลตั้งต้น |
| **Steps** | 1) เปิด `/rooms` 2) ดูการ์ดห้อง 101 (สถานะมีผู้เช่า) 3) พบ "อีก NaN วัน" |
| **Expected** | แสดง "สัญญาต่อเนื่อง" เฉย ๆ หรือ "ไม่ระบุวันสิ้นสุด" |
| **Actual** | `สัญญาถึง สัญญาต่อเนื่อง · อีก NaN วัน` |
| **Root Cause** | ข้อมูลตั้งต้น `leaseEndDate = "สัญญาต่อเนื่อง"` (ข้อความ ไม่ใช่วันที่) → `new Date("สัญญาต่อเนื่อง").getTime()` = `NaN` → `diffDays = Math.ceil(NaN/86400000)` = `NaN` โค้ด guard เฉพาะ `dateStr` (`!isNaN(d.getTime()) ? ... : leaseEndDate`) แต่ **ไม่ได้ guard `diffDays`** |
| **Suggested Fix** | `const diffDays = Number.isNaN(end) ? null : Math.ceil((end - now)/86400000);` แล้ว render ส่วน "· อีก X วัน" เฉพาะเมื่อ `diffDays !== null` |

**โค้ดต้นเหตุ:**
```ts
const getLeaseCountdown = (leaseEndDate?: string) => {
  if (!leaseEndDate) return null;
  const end = new Date(leaseEndDate).getTime();        // "สัญญาต่อเนื่อง" -> NaN
  const now = new Date().setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));  // -> NaN  (ไม่มี guard)
  const d = new Date(leaseEndDate);
  const dateStr = !isNaN(d.getTime()) ? `${d.getDate()} ...` : leaseEndDate;  // มี guard เฉพาะตรงนี้
  return { diffDays, dateStr };
};
```

---

## 4. ตารางผลทดสอบ v2 (44 steps)

| Scenario | Steps | ผ่าน | ไม่ผ่าน | Console/Page Error |
|---|---|---|---|---|
| scenario1-monthly | 16 | **16** | 0 | 0 |
| scenario2-daily | 10 | 9 | 1 (BUG-002) | 0 |
| scenario3-edge | 10 | 9 | 1 (BUG-004) | 0 |
| scenario4-modules | 8 | **8** | 0 | 0 |
| **รวม** | **44** | **42** | **2** | **0** |

**Pass Rate: 95.5%** · ไม่พบ JavaScript/console/page/network error ใด ๆ

### ขั้นตอนที่ไม่ผ่าน

| Scenario | Step | ขั้นตอน | ผลที่ได้จริง | สาเหตุ |
|---|---|---|---|---|
| scenario2-daily | 7 | กดเช็คเอาท์ (Check-out) | `room=vacant` (คาด `cleaning`) | **BUG-002** (ยังไม่แก้) |
| scenario3-edge | 8 | ตรวจวันสิ้นสุดสัญญาในผังห้อง | พบ `NaN`: "อีก NaN วัน" | **BUG-004** (ใหม่) |

> หมายเหตุ: เทสต์ 2 จุดถูกแก้ให้ถูกต้องระหว่างรอบนี้ (การเลือกธนาคารด้วย `elementHandle.select()` และการอ่านค่า `active_property_id` ที่เก็บเป็น JSON string) — ก่อนแก้เข้าใจผิดว่าเป็นบั๊ก แต่ตรวจแล้ว**การบันทึกการตั้งค่าทำงานถูกต้อง** (บันทึกที่ key ของสาขาที่ใช้งาน และคงอยู่หลัง reload)

---

## 5. สรุปสถานะบั๊กทั้งหมด (อัปเดตล่าสุด)

| ID | Severity | รายละเอียด | v1 | v2 | สถานะ |
|---|---|---|---|---|---|
| BUG-001 | 🔴 Critical | แอป 500 เมื่อไม่มี env | พบ | **ยังอยู่** | ❌ ยังไม่แก้ |
| BUG-002 | 🟠 High | เช็คเอาท์ไม่เข้า cleaning | พบ | **ยังอยู่** | ❌ ยังไม่แก้ |
| BUG-003 | 🔵 Low | URL ไม่ sync กับแท็บ | พบ | ยังอยู่ | ⏸️ ยังไม่แก้ |
| BUG-004 | 🟠 Medium | ผังห้องแสดง "อีก NaN วัน" | ไม่พบ | **พบใหม่** | ⚠️ ใหม่ |

---

## 6. สิ่งที่ควรทำต่อ (เรียงตามความสำคัญ)

1. 🔴 **แก้ BUG-001** — เพิ่ม guard ใน `supabase.ts` + ไฟล์ `.env.example` (แก้ไฟล์เดียว ใช้เวลาไม่ถึง 10 นาที แต่ปลดล็อกการติดตั้งทั้งหมด)
2. 🟠 **แก้ BUG-002** — ให้ `terminateRoomContracts()` ไม่เขียนทับสถานะห้อง (หรือเรียกเฉพาะกรณี `vacant`)
3. 🟠 **แก้ BUG-004** — guard `diffDays` ด้วย `Number.isNaN(end)`
4. ✅ **เพิ่ม regression test เข้า CI** — ชุดทดสอบ `qa/` ตรวจสถานะ DB จริง จะจับบั๊ก 2 ข้อนี้ได้ทันทีถ้ารันทุก commit
5. 🔎 **ทบทวนกระบวนการ QA ของทีม** — รายงาน v2 ระบุ "100% PASS" แต่บั๊กยังอยู่ ควรตรวจ "สถานะในฐานข้อมูลจริง" ไม่ใช่แค่ "ปุ่มกดได้/หน้าจอเปิด"

---

## 7. ภาคผนวก — วิธีรันทดสอบซ้ำ

```bash
git fetch origin && git checkout main && git reset --hard origin/main   # v2
npm install
printf 'NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co\nNEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key\n' > .env.local
npm run dev            # อีกหน้าต่างหนึ่ง
node qa/run-all.js     # reset DB เป็น seed ก่อนทุก scenario อัตโนมัติ
cat qa/artifacts/summary.json
```

**หลักฐาน:** ภาพหน้าจอ 44 ภาพใน `qa/artifacts/scenario1..4/` (รวมภาพ `v2-cleaning-board.png` ที่ยืนยันว่ากระดานแม่บ้านว่าง)

---

*รายงานนี้จัดทำโดย AI Agent (OpenHands) จากการรันระบบจริงบน commit `8e79750` — ทุกข้อสรุปมีหลักฐานจากสถานะ DB จริง ไม่ใช่การคาดเดา*
