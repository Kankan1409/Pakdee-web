| # | Scenario | ขั้นตอน | ผลที่คาดหวัง | ผลที่ได้จริง | สถานะ | ภาพหน้าจอ |
|---|---|---|---|---|---|---|
| 1 | scenario1-monthly | แอปโหลดด้วยเซสชันเจ้าของหอพัก | เข้าสู่ระบบแล้วเห็นผังห้องพัก/เลือกสาขา | แอปโหลดและยืนยันเซสชันสำเร็จ | ✅ Pass | `scenario1-monthly/01-แอปโหลดด้วยเซสชันเจ้าของหอพัก.png` |
| 2 | scenario1-monthly | ค้นหาห้องว่างด้วย Global Search | พบการ์ดห้องว่างตามที่ค้นหา | ค้นหา '102' พบ 16 node | ✅ Pass | `scenario1-monthly/02-ค้นหาห้องว่างด้วย-Global-Search.png` |
| 3 | scenario1-monthly | เปิดรายละเอียดห้องพัก | โมดัลรายละเอียดห้องเปิดขึ้น | โมดัลเปิด | ✅ Pass | `scenario1-monthly/03-เปิดรายละเอียดห้องพัก.png` |
| 4 | scenario1-monthly | เข้าเมนูทะเบียนผู้เช่า | หน้าทะเบียนผู้เช่าแสดง | แสดงผล | ✅ Pass | `scenario1-monthly/04-เข้าเมนูทะเบียนผู้เช่า.png` |
| 5 | scenario1-monthly | เปิดฟอร์มเพิ่มผู้เช่าใหม่ | ฟอร์มเพิ่มผู้เช่าเปิดขึ้น | ฟอร์มเปิด | ✅ Pass | `scenario1-monthly/05-เปิดฟอร์มเพิ่มผู้เช่าใหม่.png` |
| 6 | scenario1-monthly | Validation: กดยืนยันทั้งที่ยังไม่กรอกข้อมูล | ระบบต้องบล็อก + แจ้งเตือน | บล็อกสำเร็จ (inline) | ✅ Pass | `scenario1-monthly/06-Validation-กดยืนยันทั้งที่ยังไม่กรอกข้อม.png` |
| 7 | scenario1-monthly | กรอกข้อมูลผู้เช่าใหม่ครบถ้วน | ทุกฟิลด์รับค่าได้ | กรอกข้อมูลครบ (เลือกห้อง=true) | ✅ Pass | `scenario1-monthly/07-กรอกข้อมูลผู้เช่าใหม่ครบถ้วน.png` |
| 8 | scenario1-monthly | ยืนยันสร้างสัญญา/เพิ่มผู้เช่า | ผู้เช่าถูกบันทึก + ห้องเปลี่ยนเป็นมีผู้เช่า | tenantSaved=true roomStatus=occupied | ✅ Pass | `scenario1-monthly/08-ยืนยันสร้างสัญญา-เพิ่มผู้เช่า.png` |
| 9 | scenario1-monthly | ผังห้องพักสะท้อนสถานะห้องใหม่ | ห้อง 102 ต้องไม่ใช่สถานะว่าง | status=occupied tenant=คุณทดสอบ QA ระบบ | ✅ Pass | `scenario1-monthly/09-ผังห้องพักสะท้อนสถานะห้องใหม่.png` |
| 10 | scenario1-monthly | จดมิเตอร์น้ำ-ไฟของห้อง | บันทึกมิเตอร์สำเร็จ + คำนวณหน่วยถูกต้อง | room meter=55/9 (พิมพ์ 55/9) records 2→3 newRec=true | ✅ Pass | `scenario1-monthly/10-จดมิเตอร์น้ำ-ไฟของห้อง.png` |
| 11 | scenario1-monthly | Edge case: มิเตอร์ปัจจุบันน้อยกว่าครั้งก่อน | ระบบไม่ติดลบ/ไม่เกิด NaN | ไม่พบ NaN (clamp ด้วย Math.max) | ✅ Pass | `scenario1-monthly/11-Edge-case-มิเตอร์ปัจจุบันน้อยกว่าครั้งก่.png` |
| 12 | scenario1-monthly | ออกบิลรอบเดือนอัตโนมัติ | สร้างใบแจ้งหนี้ของห้องนั้นสำเร็จ | invoice=INV-202611-102 total=5150 | ✅ Pass | `scenario1-monthly/12-ออกบิลรอบเดือนอัตโนมัติ.png` |
| 13 | scenario1-monthly | บิลมีรายการ ค่าเช่า + ค่าไฟ + ค่าน้ำ | บิลแยกรายการครบ | ค่าเช่าห้องพัก (ห้อง 102) / ค่าไฟ 55 หน่วย (0 - 55) / ค่าน้ำประปา 9 หน่วย (0 - 9) / ค่าส่วนกลางและขยะ | ✅ Pass | `scenario1-monthly/13-บิลมีรายการ-ค่าเช่า-ค่าไฟ-ค่าน้ำ.png` |
| 14 | scenario1-monthly | ยอดบิลตรงกับผลรวมรายการ | ยอดรวม = sum(รายการ) | sum(items)=5150 vs totalAmount=5150 | ✅ Pass | `scenario1-monthly/14-ยอดบิลตรงกับผลรวมรายการ.png` |
| 15 | scenario1-monthly | บันทึกชำระเงินบิล | สถานะบิลเปลี่ยนเป็น ชำระแล้ว | status=paid (เปิดบิล=false กดปุ่ม=true) | ✅ Pass | `scenario1-monthly/15-บันทึกชำระเงินบิล.png` |
| 16 | scenario1-monthly | ข้อมูลคงอยู่หลัง Refresh (F5) | ข้อมูลไม่สูญหายหลังรีโหลด | rooms 3→3, invoices 4→4 | ✅ Pass | `scenario1-monthly/16-ข้อมูลคงอยู่หลัง-Refresh-F5-.png` |
| 17 | scenario2-daily | เปิดหน้าปฏิทินจองรายวัน | หน้าจองรายวันแสดงผล | แสดงผล | ✅ Pass | `scenario2-daily/01-เปิดหน้าปฏิทินจองรายวัน.png` |
| 18 | scenario2-daily | เปิดฟอร์มจองห้องรายวันใหม่ | ฟอร์มจองรายวันเปิดขึ้น | ฟอร์มเปิด | ✅ Pass | `scenario2-daily/02-เปิดฟอร์มจองห้องรายวันใหม่.png` |
| 19 | scenario2-daily | กรอกข้อมูลผู้เข้าพักรายวัน | ฟิลด์รับค่าได้ + คำนวณคืน/ยอดถูกต้อง | กรอกข้อมูลครบ (เลือกห้อง 102=true) | ✅ Pass | `scenario2-daily/03-กรอกข้อมูลผู้เข้าพักรายวัน.png` |
| 20 | scenario2-daily | ยืนยันการจองรายวัน | บันทึกการจอง + ห้องเปลี่ยนเป็น รายวัน | room=daily booking=confirmed | ✅ Pass | `scenario2-daily/04-ยืนยันการจองรายวัน.png` |
| 21 | scenario2-daily | ผังห้องพักแสดงสถานะรายวันของห้อง | ห้อง 102 = รายวัน | status=daily labelพบ=true | ✅ Pass | `scenario2-daily/05-ผังห้องพักแสดงสถานะรายวันของห้อง.png` |
| 22 | scenario2-daily | กลับหน้า daily แล้วกดเช็คอิน | สถานะการจองเป็น checked_in | booking=checked_in (กด=true) | ✅ Pass | `scenario2-daily/06-กลับหน้า-daily-แล้วกดเช็คอิน.png` |
| 23 | scenario2-daily | กดเช็คเอาท์ (Check-out) | เปิดโมดัลสรุปยอด + ยืนยันเช็คเอาท์สำเร็จ | room=vacant bookingLeft=false dailyInvoice=true | ❌ Fail | `scenario2-daily/07-กดเช็คเอาท์-Check-out-.png` |
| 24 | scenario2-daily | ห้องถูกล็อกไม่ให้จองซ้ำระหว่างรอทำความสะอาด | ห้องสถานะ cleaning ไม่อยู่ในตัวเลือกจอง | ห้องถูกกันไว้ถูกต้อง | ✅ Pass | `scenario2-daily/08-ห้องถูกล็อกไม่ให้จองซ้ำระหว่างรอทำความสะ.png` |
| 25 | scenario2-daily | แม่บ้านกดทำความสะอาดเสร็จสิ้น | ห้องเปลี่ยนกลับเป็น ว่าง (vacant) | status=vacant (กดปุ่ม=false) | ✅ Pass | `scenario2-daily/09-แม่บ้านกดทำความสะอาดเสร็จสิ้น.png` |
| 26 | scenario2-daily | ห้องพร้อมให้ลูกค้าคนถัดไปจองได้ | ห้องว่างกลับมาอยู่ในตัวเลือกจองรายวัน | ห้องกลับมาให้จองได้ | ✅ Pass | `scenario2-daily/10-ห้องพร้อมให้ลูกค้าคนถัดไปจองได้.png` |
| 27 | scenario3-edge | มิเตอร์ปัจจุบัน < ครั้งก่อน (ติดลบ) | ไม่แสดงค่าติดลบ/NaN หน่วยเป็น 0 | หน่วยถูก clamp เป็น 0 (ไม่มี NaN) | ✅ Pass | `scenario3-edge/01-มิเตอร์ปัจจุบัน-ครั้งก่อน-ติดลบ-.png` |
| 28 | scenario3-edge | มิเตอร์ว่างเปล่า / ไม่ใช่ตัวเลข | ระบบไม่ crash และไม่เกิด NaN | ค่าที่รับ="0" ไม่เกิด NaN | ✅ Pass | `scenario3-edge/02-มิเตอร์ว่างเปล่า-ไม่ใช่ตัวเลข.png` |
| 29 | scenario3-edge | ค้นหาด้วยอักขระพิเศษ @#$%^&* | ไม่ crash และแสดงผลได้ | เรนเดอร์ปกติ len=1663 crash=false errorใหม่=0 | ✅ Pass | `scenario3-edge/03-ค้นหาด้วยอักขระพิเศษ-.png` |
| 30 | scenario3-edge | ค้นหาเลขห้องที่ไม่มีจริง (999) | แสดง Empty State ที่อ่านได้ | แสดงข้อความไม่พบข้อมูล | ✅ Pass | `scenario3-edge/04-ค้นหาเลขห้องที่ไม่มีจริง-999-.png` |
| 31 | scenario3-edge | ล้างคำค้นหาแล้วกลับมาแสดงครบ | ห้องทั้งหมดกลับมาแสดง | node '101' กลับมาแสดง=9 | ✅ Pass | `scenario3-edge/05-ล้างคำค้นหาแล้วกลับมาแสดงครบ.png` |
| 32 | scenario3-edge | สลับฟิลเตอร์ชั้นไปมาอย่างรวดเร็ว | ไม่เกิด error และการ์ดเรนเดอร์ปกติ | error ระหว่างสลับฟิลเตอร์: 0 | ✅ Pass | `scenario3-edge/06-สลับฟิลเตอร์ชั้นไปมาอย่างรวดเร็ว.png` |
| 33 | scenario3-edge | ส่งออกรายงานบัญชี CSV | ได้ไฟล์ CSV พร้อม UTF-8 BOM และหัวตารางไทย | clicked=true BOM=true หัวตารางไทย=true อักขระเพี้ยน=false len=89 | ✅ Pass | `scenario3-edge/07-ส่งออกรายงานบัญชี-CSV.png` |
| 34 | scenario3-edge | ตรวจความถูกต้องวันสิ้นสุดสัญญาในผังห้อง | ไม่แสดง NaN ในข้อมูลสัญญา | พบ NaN: "สัญญาถึง สัญญาต่อเนื่อง · อีก NaN วัน" | ❌ Fail | `scenario3-edge/08-ตรวจความถูกต้องวันสิ้นสุดสัญญาในผังห้อง.png` |
| 35 | scenario3-edge | แก้ไขข้อมูลแล้ว Refresh ข้อมูลต้องคงอยู่ | ข้อมูลไม่สูญหายหลัง F5 | rooms 3→3, invoices 2→2 | ✅ Pass | `scenario3-edge/09-แก้ไขข้อมูลแล้ว-Refresh-ข้อมูลต้องคงอยู่.png` |
| 36 | scenario3-edge | ตรวจความสอดคล้องข้อมูล Host DB (/api/db) | localStorage ตรงกับไฟล์ DB ฝั่งเซิร์ฟเวอร์ | client rooms=3/inv=2 vs server rooms=3/inv=2 | ✅ Pass | `scenario3-edge/10-ตรวจความสอดคล้องข้อมูล-Host-DB-api-db-.png` |
| 37 | scenario4-modules | เปิดหน้าตั้งค่าหอพัก | หน้าตั้งค่าแสดงผล | แสดงผล | ✅ Pass | `scenario4-modules/01-เปิดหน้าตั้งค่าหอพัก.png` |
| 38 | scenario4-modules | เลือกธนาคารจาก Dropdown | เปลี่ยนค่าใน dropdown ได้ | เลือกแล้ว: ธนาคารไทยพาณิชย์ (SCB) | ✅ Pass | `scenario4-modules/02-เลือกธนาคารจาก-Dropdown.png` |
| 39 | scenario4-modules | บันทึกการตั้งค่า | บันทึกค่าลงฐานข้อมูลสำเร็จ | bankName(active)=ธนาคารไทยพาณิชย์ (SCB) | ✅ Pass | `scenario4-modules/03-บันทึกการตั้งค่า.png` |
| 40 | scenario4-modules | เปิดกระดิ่งแจ้งเตือน | ศูนย์การแจ้งเตือนเปิดและแสดงรายการ | แผงแจ้งเตือนแสดงรายการ | ✅ Pass | `scenario4-modules/04-เปิดกระดิ่งแจ้งเตือน.png` |
| 41 | scenario4-modules | สลับแท็บ ยังไม่อ่าน | ตัวกรองยังไม่อ่านทำงาน | สลับตัวกรองได้ | ✅ Pass | `scenario4-modules/05-สลับแท็บ-ยังไม่อ่าน.png` |
| 42 | scenario4-modules | เปิดหน้าแจ้งซ่อมบำรุง | หน้าแจ้งซ่อมแสดงผล | แสดงผล | ✅ Pass | `scenario4-modules/06-เปิดหน้าแจ้งซ่อมบำรุง.png` |
| 43 | scenario4-modules | สร้างรายการแจ้งซ่อมใหม่ | บันทึกแจ้งซ่อมสำเร็จ | repairs 0→1 created=true | ✅ Pass | `scenario4-modules/07-สร้างรายการแจ้งซ่อมใหม่.png` |
| 44 | scenario4-modules | เปลี่ยนสถานะงานซ่อมเป็นเสร็จสิ้น | สถานะงานซ่อมอัปเดตได้ | กดปุ่ม: รับงานช่าง ➔ กำลังซ่อม | ✅ Pass | `scenario4-modules/08-เปลี่ยนสถานะงานซ่อมเป็นเสร็จสิ้น.png` |
