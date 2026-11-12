-- บันทึกการส่งแจ้งเตือน LINE อัตโนมัติ (ใช้กันส่งซ้ำ + ดูประวัติในหน้า ตั้งค่าหอพัก > ระบบแจ้งเตือน)
-- 1 แถว = 1 การเตือน ของ 1 บิล (เช่น เตือนก่อน 3 วัน, เลยกำหนด 6 วัน)
-- รันใน DBeaver ด้วย Alt+X (รันทั้งสคริปต์)

CREATE TABLE IF NOT EXISTS public.line_reminder_logs (
  id BIGSERIAL PRIMARY KEY,
  property_id TEXT NOT NULL,          -- รหัสสาขา เช่น P0002
  invoice_number TEXT NOT NULL,       -- เช่น INV-202611-A1
  room_number TEXT,
  due_date DATE,
  kind TEXT NOT NULL,                 -- before:3 / before:0 / overdue:6
  status TEXT NOT NULL,               -- sent / failed / no_line (ผู้เช่ายังไม่ผูก LINE)
  error TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT line_reminder_logs_once UNIQUE (property_id, invoice_number, due_date, kind)
);

CREATE INDEX IF NOT EXISTS idx_line_reminder_logs_property ON public.line_reminder_logs (property_id, sent_at DESC);

-- อ่าน/เขียนผ่านเซิร์ฟเวอร์ (service role) เท่านั้น
ALTER TABLE public.line_reminder_logs ENABLE ROW LEVEL SECURITY;

-- ตรวจผล: ต้องเห็นตาราง line_reminder_logs
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'line_reminder_logs';
