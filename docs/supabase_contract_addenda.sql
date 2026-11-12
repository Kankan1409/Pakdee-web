-- บันทึกแนบท้ายสัญญา (Addendum): เปลี่ยน/เพิ่มเงื่อนไขหลังเซ็นสัญญาแล้ว เช่น เพิ่มเช่าตู้เย็น
-- สัญญาเดิมไม่ถูกแก้ บันทึกแนบท้ายเป็นเอกสารแยก เซ็นทั้งสองฝ่าย (ส่งให้ผู้เช่าเซ็นทาง LINE แบบเดียวกับสัญญา)
-- ต้องรัน docs/supabase_contract_signing.sql ก่อน
-- รันใน Supabase SQL Editor (กด Run) หรือ DBeaver ด้วย Alt+X

CREATE TABLE IF NOT EXISTS public.contract_addenda (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  contract_id TEXT,
  contract_number TEXT NOT NULL,          -- สัญญาหลักที่แนบท้าย
  addendum_no INTEGER NOT NULL,           -- ฉบับที่ 1, 2, 3 ... ของสัญญานั้น
  room_number TEXT,
  tenant_name TEXT,
  effective_date DATE NOT NULL,           -- วันที่เริ่มมีผล
  items JSONB NOT NULL DEFAULT '[]',      -- [{"title":"เช่าตู้เย็น","amount":300,"type":"monthly"|"one_time"}]
  note TEXT,                              -- ข้อความเพิ่มเติม
  html TEXT,                              -- เอกสาร ณ ตอนส่ง (ล็อกไว้)
  content_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending / signed / cancelled
  landlord_signature_url TEXT,
  tenant_signature_url TEXT,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_addenda_contract ON public.contract_addenda (property_id, contract_number);
ALTER TABLE public.contract_addenda ENABLE ROW LEVEL SECURITY;

-- คำขอเซ็นที่เป็นของบันทึกแนบท้าย
ALTER TABLE public.contract_sign_requests ADD COLUMN IF NOT EXISTS addendum_id TEXT;

-- ตรวจผล: ต้องเห็น 2 แถว
SELECT table_name AS name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'contract_addenda'
UNION ALL
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'contract_sign_requests' AND column_name = 'addendum_id';
