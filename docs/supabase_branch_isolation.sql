-- แยกข้อมูลแต่ละสาขาให้ชัด + ลบตาราง buildings — 2026-11-12
-- รันใน Supabase SQL Editor ครั้งเดียว (รันซ้ำได้)
--
-- ก่อนแก้: ตาราง tenants, daily_bookings, meter_readings ไม่มี property_id (ไม่รู้ว่าเป็นของสาขาไหน)
-- ตอนโหลดข้อมูลเลยถูกยกไปไว้สาขาแรก และ rooms ผูกกับสาขาผ่านตาราง buildings
-- หลังแก้: ทุกตารางมี property_id ของตัวเอง ลบสาขาแล้วข้อมูลของสาขานั้นหายไปด้วย (ON DELETE CASCADE)

-- 1) tenants.property_id
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS property_id VARCHAR(64);
-- เติมย้อนหลัง: จากห้องที่ผู้เช่าอยู่ แล้วจากบิลของผู้เช่า
UPDATE public.tenants t SET property_id = r.property_id
FROM public.rooms r
WHERE r.current_tenant_id = t.id AND t.property_id IS NULL AND r.property_id IS NOT NULL;
UPDATE public.tenants t SET property_id = i.property_id
FROM public.invoices i
WHERE i.tenant_id = t.id AND t.property_id IS NULL AND i.property_id IS NOT NULL;
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_property_id_fkey;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS tenants_property_id_idx ON public.tenants(property_id);

-- 2) daily_bookings.property_id (การจองเดิมไม่มีข้อมูลสาขา จึงเติมย้อนหลังไม่ได้ — ตอนนี้ยังไม่มีแถว)
ALTER TABLE public.daily_bookings ADD COLUMN IF NOT EXISTS property_id VARCHAR(64);
ALTER TABLE public.daily_bookings DROP CONSTRAINT IF EXISTS daily_bookings_property_id_fkey;
ALTER TABLE public.daily_bookings ADD CONSTRAINT daily_bookings_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS daily_bookings_property_id_idx ON public.daily_bookings(property_id);

-- 3) meter_readings.property_id (เติมย้อนหลังจากห้อง)
ALTER TABLE public.meter_readings ADD COLUMN IF NOT EXISTS property_id VARCHAR(64);
UPDATE public.meter_readings m SET property_id = r.property_id
FROM public.rooms r
WHERE m.room_id = r.id AND m.property_id IS NULL;
ALTER TABLE public.meter_readings DROP CONSTRAINT IF EXISTS meter_readings_property_id_fkey;
ALTER TABLE public.meter_readings ADD CONSTRAINT meter_readings_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS meter_readings_property_id_idx ON public.meter_readings(property_id);

-- 4) rooms: เลขห้องไม่ซ้ำภายในสาขาเดียวกัน (แทน building_id + room_number เดิม)
CREATE UNIQUE INDEX IF NOT EXISTS rooms_property_room_number_key ON public.rooms(property_id, room_number);

-- 4.1) เลขบิล / เลขสัญญา ไม่ซ้ำ "ภายในสาขา" (เดิมห้ามซ้ำทั้งระบบ)
--      ปัญหาที่เจอ: สองสาขามีห้อง A1 → ได้เลข INV-202611-A1 เหมือนกัน → บันทึกบิลสาขาที่สองไม่ได้
--      และระบบเลยไปเขียนทับบิลของอีกสาขา (บิลไปโผล่ผิดสาขา + บิลของสาขานั้นหาย)
DO $$
DECLARE c record;
BEGIN
  -- ถอด unique เดิมที่ครอบเฉพาะคอลัมน์ invoice_number / contract_number อย่างเดียว
  FOR c IN
    SELECT con.conname, rel.relname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public'
      AND con.contype = 'u'
      AND ((rel.relname = 'invoices' AND con.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = rel.oid AND attname = 'invoice_number')]::smallint[])
        OR (rel.relname = 'contracts' AND con.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = rel.oid AND attname = 'contract_number')]::smallint[]))
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', c.relname, c.conname);
  END LOOP;
END $$;
DROP INDEX IF EXISTS public.invoices_invoice_number_key;
DROP INDEX IF EXISTS public.contracts_contract_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS invoices_property_invoice_number_key ON public.invoices(property_id, invoice_number);
CREATE UNIQUE INDEX IF NOT EXISTS contracts_property_contract_number_key ON public.contracts(property_id, contract_number);

-- 5) ลบตาราง buildings (ผู้ใช้ขอ 2026-11-12) — ห้องผูกกับสาขาผ่าน rooms.property_id อยู่แล้ว
--    หมายเหตุ: FK เดิม rooms.building_id เป็น ON DELETE CASCADE จึงต้องถอด FK และคอลัมน์ก่อน
--    ไม่อย่างนั้นการลบ buildings จะลบห้องทั้งหมดไปด้วย
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_building_id_fkey;
-- CASCADE ตรงนี้ลบแค่ constraint/index ที่อ้างคอลัมน์ (เช่น unique(building_id, room_number)) ไม่ได้ลบแถวห้อง
ALTER TABLE public.rooms DROP COLUMN IF EXISTS building_id CASCADE;
DROP TABLE IF EXISTS public.buildings CASCADE;

-- บอก PostgREST ให้รู้จักโครงสร้างใหม่ทันที
NOTIFY pgrst, 'reload schema';
