-- ระบบเซ็นสัญญาอิเล็กทรอนิกส์ (ผู้ให้เช่า + ผู้เช่า) และส่งลิงก์ให้ผู้เช่าเซ็นทาง LINE
-- รันใน Supabase SQL Editor (กด Run) หรือ DBeaver ด้วย Alt+X (รันทั้งสคริปต์)

-- 1) เก็บลายเซ็นในตัวสัญญา (เดิมเก็บแค่ในเครื่อง เครื่องอื่นไม่เห็น)
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS tenant_signature_url TEXT;    -- ลายเซ็นผู้เช่า (PNG data URL)
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS landlord_signature_url TEXT;  -- สำเนาลายเซ็นผู้ให้เช่า ณ วันที่เซ็น

-- 2) คำขอให้ผู้เช่าเซ็น (1 แถว = 1 ลิงก์ที่ส่งไป)
CREATE TABLE IF NOT EXISTS public.contract_sign_requests (
  token TEXT PRIMARY KEY,                  -- รหัสลับในลิงก์ (สุ่ม 32 ตัวอักษร)
  property_id TEXT NOT NULL,
  contract_id TEXT,
  contract_number TEXT NOT NULL,
  room_number TEXT,
  tenant_name TEXT,
  tenant_phone_last4 TEXT,                 -- ผู้เช่าต้องกรอกเบอร์ 4 ตัวท้ายให้ตรงก่อนเซ็น
  line_user_id TEXT,                       -- บัญชี LINE ที่ส่งลิงก์ไป
  contract_html TEXT NOT NULL,             -- เนื้อหาสัญญา ณ ตอนส่ง (ล็อกไว้ แก้ไม่ได้)
  content_hash TEXT NOT NULL,              -- SHA-256 ของเนื้อหา ใช้พิสูจน์ว่าไม่ถูกแก้
  landlord_name TEXT,
  landlord_signature_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending / signed / cancelled
  expires_at TIMESTAMPTZ NOT NULL,
  tenant_signature_url TEXT,
  signed_at TIMESTAMPTZ,
  signer_ip TEXT,
  signer_user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ลงนามด้วยการกด "ยอมรับและลงนาม" ในแชท LINE: เก็บวิธีลงนามและชื่อ LINE ที่กด
ALTER TABLE public.contract_sign_requests ADD COLUMN IF NOT EXISTS signed_via TEXT;        -- line / web
ALTER TABLE public.contract_sign_requests ADD COLUMN IF NOT EXISTS signer_line_name TEXT;

CREATE INDEX IF NOT EXISTS idx_contract_sign_requests_contract ON public.contract_sign_requests (property_id, contract_number);

-- อ่าน/เขียนผ่านเซิร์ฟเวอร์ (service role) เท่านั้น — ผู้เช่าเข้าผ่าน API ด้วยรหัสในลิงก์
ALTER TABLE public.contract_sign_requests ENABLE ROW LEVEL SECURITY;

-- ตรวจผล: ต้องเห็น 3 แถว (tenant_signature_url, landlord_signature_url, contract_sign_requests)
SELECT column_name AS name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name IN ('tenant_signature_url', 'landlord_signature_url')
UNION ALL
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'contract_sign_requests';
