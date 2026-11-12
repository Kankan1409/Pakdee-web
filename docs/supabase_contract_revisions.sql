-- สัญญาฉบับแก้ไข (เซ็นใหม่ทั้งฉบับ): เช่น ผู้เช่าขอเพิ่มตู้เย็น → ทำสัญญาฉบับแก้ไข CT-…-R1 ให้เซ็นใหม่
-- ฉบับเดิมเปลี่ยนเป็น superseded (ดูย้อนหลังได้) เมื่อฉบับใหม่ถูกเซ็น
-- รันใน Supabase SQL Editor (กด Run) หรือ DBeaver ด้วย Alt+X

ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS revision INTEGER;                 -- ฉบับที่ (0/NULL = ฉบับแรก)
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS root_contract_number TEXT;       -- เลขสัญญาฉบับแรก
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS previous_contract_number TEXT;   -- ฉบับก่อนหน้า
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS superseded_by TEXT;              -- ฉบับที่มาแทน
-- รายละเอียดค่าบริการในสัญญา (ทีวี ตู้เย็น ไวไฟ ที่จอดรถ ค่าส่วนกลาง ค่าใช้จ่ายอื่น ฯลฯ)
-- เดิมเก็บแค่ในเครื่อง เครื่องอื่นจึงไม่เห็น
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS contract_details JSONB;

-- ตรวจผล: ต้องเห็น 5 แถว
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'contracts'
  AND column_name IN ('revision', 'root_contract_number', 'previous_contract_number', 'superseded_by', 'contract_details');
