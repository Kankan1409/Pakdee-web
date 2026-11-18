-- ผูกผู้เช่า ↔ สัญญา ↔ การจองรายวัน ด้วยรหัส + เก็บประเภทผู้เช่า (รายเดือน/รายวัน) — 2026-11-17
-- รันใน Supabase SQL Editor ครั้งเดียว (รันซ้ำได้) · ควรรัน docs/supabase_branch_isolation.sql ก่อน
--
-- ก่อนแก้: tenants ไม่มีช่องบอกว่าเป็นรายเดือนหรือรายวัน หน้าทะเบียนผู้เช่าต้องเดาจาก
--          ข้อความใน notes / เบอร์โทร / ชื่อ / สถานะห้อง → ผู้เข้าพักรายวันกลายเป็นรายเดือนได้
--          contracts และ daily_bookings ไม่มี tenant_id → ผูกกับผู้เช่าได้แค่ด้วยชื่อ/เบอร์
-- หลังแก้: tenants.tenant_type บอกประเภทตรง ๆ · contracts.tenant_id / daily_bookings.tenant_id ชี้ไปที่ tenants.id
--          ลบผู้เช่า → สัญญา/การจองยังอยู่ (tenant_id เป็น NULL) ไม่ลบตามไปด้วย

-- 1) tenants.tenant_type
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS tenant_type VARCHAR(10);

-- เติมย้อนหลัง (เฉพาะแถวที่ยังไม่มีค่า)
-- 1.1 ผู้เข้าพักรายวันที่ระบบสร้างไว้ มีเครื่องหมาย [ผู้เข้าพักรายวัน] ใน notes
UPDATE public.tenants SET tenant_type = 'daily'
WHERE tenant_type IS NULL AND notes LIKE '%[ผู้เข้าพักรายวัน]%';
-- 1.2 ผู้เช่าที่อยู่ในห้องรายเดือนตอนนี้ หรือมีสัญญาชื่อตรงกันในสาขาเดียวกัน → รายเดือน
UPDATE public.tenants t SET tenant_type = 'monthly'
WHERE t.tenant_type IS NULL
  AND (
    EXISTS (SELECT 1 FROM public.rooms r WHERE r.current_tenant_id = t.id AND r.status <> 'daily')
    OR EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE btrim(c.tenant_name) = btrim(t.full_name)
        AND (t.property_id IS NULL OR c.property_id = t.property_id)
    )
  );
-- 1.3 อยู่ในห้องที่สถานะ "รายวัน" หรือมีการจองรายวันชื่อตรงกันในสาขาเดียวกัน → รายวัน
UPDATE public.tenants t SET tenant_type = 'daily'
WHERE t.tenant_type IS NULL
  AND (
    EXISTS (SELECT 1 FROM public.rooms r WHERE r.current_tenant_id = t.id AND r.status = 'daily')
    OR EXISTS (
      SELECT 1 FROM public.daily_bookings b
      WHERE btrim(b.guest_name) = btrim(t.full_name)
        AND (t.property_id IS NULL OR b.property_id IS NULL OR b.property_id = t.property_id)
    )
  );
-- 1.4 ที่เหลือ = รายเดือน
UPDATE public.tenants SET tenant_type = 'monthly' WHERE tenant_type IS NULL;

ALTER TABLE public.tenants ALTER COLUMN tenant_type SET DEFAULT 'monthly';
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_tenant_type_check;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_tenant_type_check CHECK (tenant_type IN ('monthly', 'daily'));
CREATE INDEX IF NOT EXISTS tenants_property_type_idx ON public.tenants(property_id, tenant_type);

-- 2) contracts.tenant_id → tenants.id
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64);
-- เติมย้อนหลัง: ผู้เช่ารายเดือนชื่อตรงกันในสาขาเดียวกัน (เฉพาะเมื่อมีคนเดียวที่ตรง — ชื่อซ้ำไม่เดา)
UPDATE public.contracts c SET tenant_id = m.id
FROM (
  SELECT c2.id AS contract_id, min(t.id) AS id
  FROM public.contracts c2
  JOIN public.tenants t
    ON btrim(t.full_name) = btrim(c2.tenant_name)
   AND t.tenant_type = 'monthly'
   AND (t.property_id IS NULL OR t.property_id = c2.property_id)
  WHERE c2.tenant_id IS NULL
  GROUP BY c2.id
  HAVING count(*) = 1
) m
WHERE c.id = m.contract_id;
ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_tenant_id_fkey;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS contracts_tenant_id_idx ON public.contracts(tenant_id);

-- 3) daily_bookings.tenant_id → tenants.id + ข้อมูลที่เดิมเก็บแค่ในเครื่อง
ALTER TABLE public.daily_bookings ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64);
ALTER TABLE public.daily_bookings ADD COLUMN IF NOT EXISTS id_card VARCHAR(20) DEFAULT '';
ALTER TABLE public.daily_bookings ADD COLUMN IF NOT EXISTS vehicle_plate VARCHAR(50) DEFAULT '';
ALTER TABLE public.daily_bookings ADD COLUMN IF NOT EXISTS room_deposit NUMERIC(12, 2) DEFAULT 0;
-- เติมย้อนหลัง: ผู้เข้าพักรายวันชื่อตรงกันในสาขาเดียวกัน (เฉพาะเมื่อมีคนเดียวที่ตรง)
UPDATE public.daily_bookings b SET tenant_id = m.id
FROM (
  SELECT b2.id AS booking_id, min(t.id) AS id
  FROM public.daily_bookings b2
  JOIN public.tenants t
    ON btrim(t.full_name) = btrim(b2.guest_name)
   AND t.tenant_type = 'daily'
   AND (t.property_id IS NULL OR b2.property_id IS NULL OR t.property_id = b2.property_id)
  WHERE b2.tenant_id IS NULL
  GROUP BY b2.id
  HAVING count(*) = 1
) m
WHERE b.id = m.booking_id;
ALTER TABLE public.daily_bookings DROP CONSTRAINT IF EXISTS daily_bookings_tenant_id_fkey;
ALTER TABLE public.daily_bookings ADD CONSTRAINT daily_bookings_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS daily_bookings_tenant_id_idx ON public.daily_bookings(tenant_id);

-- ตรวจผล: จำนวนผู้เช่าแต่ละประเภท และสัญญา/การจองที่ยังไม่ได้ผูก (ชื่อซ้ำ หรือไม่พบผู้เช่า)
-- SELECT tenant_type, count(*) FROM public.tenants GROUP BY 1;
-- SELECT id, contract_number, tenant_name FROM public.contracts WHERE tenant_id IS NULL;
-- SELECT id, room_number, guest_name FROM public.daily_bookings WHERE tenant_id IS NULL;

NOTIFY pgrst, 'reload schema';
