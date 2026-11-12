-- ตั้งค่าการแจ้งเตือน LINE อัตโนมัติของแต่ละสาขา (หน้า ตั้งค่าหอพัก > ระบบแจ้งเตือน)
-- เก็บเป็น JSON ก้อนเดียว เพื่อเพิ่ม/ปรับตัวเลือกในอนาคตได้โดยไม่ต้องเพิ่มคอลัมน์
-- ตัวอย่างค่า:
-- {"sendNewBill":true,"remindBeforeEnabled":true,"remindBeforeDays":[3,1],
--  "remindOverdueEnabled":true,"remindOverdueEveryDays":3,"remindOverdueMaxTimes":3,
--  "sendTime":"09:00","notifyRepairUpdates":true}
-- รันใน DBeaver ด้วย Alt+X (รันทั้งสคริปต์)

ALTER TABLE public.branch_settings
  ADD COLUMN IF NOT EXISTS notification_settings JSONB;

-- ตรวจผล: ต้องเห็นคอลัมน์ notification_settings ชนิด jsonb
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'branch_settings' AND column_name = 'notification_settings';
