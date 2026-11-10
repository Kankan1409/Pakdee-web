-- ==============================================================================
-- PAKDEE APARTMENT MANAGEMENT SYSTEM - ALTER COLUMNS TO SHORT ID (NO DROP TABLE)
-- สคริปต์แปลงคอลัมน์ id และ Foreign Keys จาก UUID เป็นรหัส 5 หลัก (P0001, R0001)
-- โดย "ไม่ลบตาราง" และสามารถรันซ้ำได้ปลอดภัย 100% (ไม่มี DO $$ บล็อกที่ DBeaver ตัดคำผิด)
-- วิธีรันใน DBeaver: กด Ctrl+A (เลือกทั้งหมด) แล้วกด Alt+X (Execute SQL Script)
-- ==============================================================================

-- 1. สร้างตัวรันเลขอัตโนมัติ (Sequences) สำหรับแต่ละตาราง (ถ้ายังไม่มี)
CREATE SEQUENCE IF NOT EXISTS public.prop_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.bldg_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.tenant_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.room_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.inv_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.item_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.mtr_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.contract_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.repair_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.exp_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.daily_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.settings_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.user_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.log_seq START 1;

-- 2. ปลด Foreign Key Constraints ชั่วคราวเพื่อให้แก้ไขชนิดคอลัมน์ (ALTER COLUMN) ได้
ALTER TABLE IF EXISTS public.buildings DROP CONSTRAINT IF EXISTS buildings_property_id_fkey;
ALTER TABLE IF EXISTS public.rooms DROP CONSTRAINT IF EXISTS rooms_property_id_fkey;
ALTER TABLE IF EXISTS public.rooms DROP CONSTRAINT IF EXISTS rooms_building_id_fkey;
ALTER TABLE IF EXISTS public.rooms DROP CONSTRAINT IF EXISTS rooms_current_tenant_id_fkey;
ALTER TABLE IF EXISTS public.invoices DROP CONSTRAINT IF EXISTS invoices_property_id_fkey;
ALTER TABLE IF EXISTS public.invoices DROP CONSTRAINT IF EXISTS invoices_room_id_fkey;
ALTER TABLE IF EXISTS public.invoices DROP CONSTRAINT IF EXISTS invoices_tenant_id_fkey;
ALTER TABLE IF EXISTS public.invoice_items DROP CONSTRAINT IF EXISTS invoice_items_invoice_id_fkey;
ALTER TABLE IF EXISTS public.meter_readings DROP CONSTRAINT IF EXISTS meter_readings_room_id_fkey;
ALTER TABLE IF EXISTS public.contracts DROP CONSTRAINT IF EXISTS contracts_property_id_fkey;
ALTER TABLE IF EXISTS public.contracts DROP CONSTRAINT IF EXISTS contracts_room_id_fkey;
ALTER TABLE IF EXISTS public.repairs DROP CONSTRAINT IF EXISTS repairs_property_id_fkey;
ALTER TABLE IF EXISTS public.expenses DROP CONSTRAINT IF EXISTS expenses_property_id_fkey;
ALTER TABLE IF EXISTS public.branch_settings DROP CONSTRAINT IF EXISTS branch_settings_property_id_fkey;

-- 3. เปลี่ยนชนิดคอลัมน์ (ALTER COLUMN) จาก UUID เป็น VARCHAR(20) และตั้งค่า Default รหัส 5 หลัก
ALTER TABLE IF EXISTS public.properties
    ALTER COLUMN id TYPE VARCHAR(20) USING id::text,
    ALTER COLUMN id SET DEFAULT ('P' || LPAD(nextval('public.prop_seq')::text, 4, '0'));

ALTER TABLE IF EXISTS public.buildings
    ALTER COLUMN id TYPE VARCHAR(20) USING id::text,
    ALTER COLUMN id SET DEFAULT ('B' || LPAD(nextval('public.bldg_seq')::text, 4, '0')),
    ALTER COLUMN property_id TYPE VARCHAR(20) USING property_id::text;

ALTER TABLE IF EXISTS public.tenants
    ALTER COLUMN id TYPE VARCHAR(20) USING id::text,
    ALTER COLUMN id SET DEFAULT ('T' || LPAD(nextval('public.tenant_seq')::text, 4, '0'));

ALTER TABLE IF EXISTS public.rooms
    ALTER COLUMN id TYPE VARCHAR(20) USING id::text,
    ALTER COLUMN id SET DEFAULT ('R' || LPAD(nextval('public.room_seq')::text, 4, '0')),
    ALTER COLUMN property_id TYPE VARCHAR(20) USING property_id::text,
    ALTER COLUMN building_id TYPE VARCHAR(20) USING building_id::text,
    ALTER COLUMN current_tenant_id TYPE VARCHAR(20) USING current_tenant_id::text;

ALTER TABLE IF EXISTS public.invoices
    ALTER COLUMN id TYPE VARCHAR(20) USING id::text,
    ALTER COLUMN id SET DEFAULT ('I' || LPAD(nextval('public.inv_seq')::text, 4, '0')),
    ALTER COLUMN property_id TYPE VARCHAR(20) USING property_id::text,
    ALTER COLUMN room_id TYPE VARCHAR(20) USING room_id::text,
    ALTER COLUMN tenant_id TYPE VARCHAR(20) USING tenant_id::text;

ALTER TABLE IF EXISTS public.invoice_items
    ALTER COLUMN id TYPE VARCHAR(20) USING id::text,
    ALTER COLUMN id SET DEFAULT ('M' || LPAD(nextval('public.item_seq')::text, 4, '0')),
    ALTER COLUMN invoice_id TYPE VARCHAR(20) USING invoice_id::text;

ALTER TABLE IF EXISTS public.meter_readings
    ALTER COLUMN id TYPE VARCHAR(20) USING id::text,
    ALTER COLUMN id SET DEFAULT ('W' || LPAD(nextval('public.mtr_seq')::text, 4, '0')),
    ALTER COLUMN room_id TYPE VARCHAR(20) USING room_id::text;

ALTER TABLE IF EXISTS public.contracts
    ALTER COLUMN id TYPE VARCHAR(20) USING id::text,
    ALTER COLUMN id SET DEFAULT ('C' || LPAD(nextval('public.contract_seq')::text, 4, '0')),
    ALTER COLUMN property_id TYPE VARCHAR(20) USING property_id::text,
    ALTER COLUMN room_id TYPE VARCHAR(20) USING room_id::text;

ALTER TABLE IF EXISTS public.repairs
    ALTER COLUMN id TYPE VARCHAR(20) USING id::text,
    ALTER COLUMN id SET DEFAULT ('F' || LPAD(nextval('public.repair_seq')::text, 4, '0')),
    ALTER COLUMN property_id TYPE VARCHAR(20) USING property_id::text;

ALTER TABLE IF EXISTS public.expenses
    ALTER COLUMN id TYPE VARCHAR(20) USING id::text,
    ALTER COLUMN id SET DEFAULT ('E' || LPAD(nextval('public.exp_seq')::text, 4, '0')),
    ALTER COLUMN property_id TYPE VARCHAR(20) USING property_id::text;

ALTER TABLE IF EXISTS public.daily_bookings
    ALTER COLUMN id TYPE VARCHAR(20) USING id::text,
    ALTER COLUMN id SET DEFAULT ('D' || LPAD(nextval('public.daily_seq')::text, 4, '0'));

ALTER TABLE IF EXISTS public.branch_settings
    ALTER COLUMN id TYPE VARCHAR(20) USING id::text,
    ALTER COLUMN id SET DEFAULT ('S' || LPAD(nextval('public.settings_seq')::text, 4, '0')),
    ALTER COLUMN property_id TYPE VARCHAR(20) USING property_id::text;

ALTER TABLE IF EXISTS public.user_profiles
    ALTER COLUMN id TYPE VARCHAR(20) USING id::text,
    ALTER COLUMN id SET DEFAULT ('U' || LPAD(nextval('public.user_seq')::text, 4, '0'));

ALTER TABLE IF EXISTS public.activity_logs
    ALTER COLUMN id TYPE VARCHAR(20) USING id::text,
    ALTER COLUMN id SET DEFAULT ('L' || LPAD(nextval('public.log_seq')::text, 4, '0'));

-- 4. สร้างตารางชั่วคราวสำหรับจับคู่รหัส UUID เดิม -> รหัส 5 หลักใหม่ (P0001, R0001, T0001, ฯลฯ)
CREATE TEMP TABLE IF NOT EXISTS _short_id_map (
    table_name TEXT,
    old_id TEXT,
    new_id TEXT,
    PRIMARY KEY (table_name, old_id)
);
TRUNCATE TABLE _short_id_map;

-- 4.1 แปลงรหัสสาขา (properties: P0001)
INSERT INTO _short_id_map (table_name, old_id, new_id)
SELECT 'properties', id,
       'P' || LPAD(((SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '[^0-9]', '', 'g'), '')::int), 0) FROM public.properties WHERE length(id) <= 5) + ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC))::text, 4, '0')
FROM public.properties
WHERE length(id) > 5;

UPDATE public.properties t SET id = m.new_id FROM _short_id_map m WHERE m.table_name = 'properties' AND t.id = m.old_id;
UPDATE public.buildings t SET property_id = m.new_id FROM _short_id_map m WHERE m.table_name = 'properties' AND t.property_id = m.old_id;
UPDATE public.rooms t SET property_id = m.new_id FROM _short_id_map m WHERE m.table_name = 'properties' AND t.property_id = m.old_id;
UPDATE public.invoices t SET property_id = m.new_id FROM _short_id_map m WHERE m.table_name = 'properties' AND t.property_id = m.old_id;
UPDATE public.contracts t SET property_id = m.new_id FROM _short_id_map m WHERE m.table_name = 'properties' AND t.property_id = m.old_id;
UPDATE public.repairs t SET property_id = m.new_id FROM _short_id_map m WHERE m.table_name = 'properties' AND t.property_id = m.old_id;
UPDATE public.expenses t SET property_id = m.new_id FROM _short_id_map m WHERE m.table_name = 'properties' AND t.property_id = m.old_id;
UPDATE public.branch_settings t SET property_id = m.new_id FROM _short_id_map m WHERE m.table_name = 'properties' AND t.property_id = m.old_id;

-- 4.2 แปลงรหัสอาคาร (buildings: B0001)
INSERT INTO _short_id_map (table_name, old_id, new_id)
SELECT 'buildings', id,
       'B' || LPAD(((SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '[^0-9]', '', 'g'), '')::int), 0) FROM public.buildings WHERE length(id) <= 5) + ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC))::text, 4, '0')
FROM public.buildings
WHERE length(id) > 5;

UPDATE public.buildings t SET id = m.new_id FROM _short_id_map m WHERE m.table_name = 'buildings' AND t.id = m.old_id;
UPDATE public.rooms t SET building_id = m.new_id FROM _short_id_map m WHERE m.table_name = 'buildings' AND t.building_id = m.old_id;

-- 4.3 แปลงรหัสผู้เช่า (tenants: T0001)
INSERT INTO _short_id_map (table_name, old_id, new_id)
SELECT 'tenants', id,
       'T' || LPAD(((SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '[^0-9]', '', 'g'), '')::int), 0) FROM public.tenants WHERE length(id) <= 5) + ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC))::text, 4, '0')
FROM public.tenants
WHERE length(id) > 5;

UPDATE public.tenants t SET id = m.new_id FROM _short_id_map m WHERE m.table_name = 'tenants' AND t.id = m.old_id;
UPDATE public.rooms t SET current_tenant_id = m.new_id FROM _short_id_map m WHERE m.table_name = 'tenants' AND t.current_tenant_id = m.old_id;
UPDATE public.invoices t SET tenant_id = m.new_id FROM _short_id_map m WHERE m.table_name = 'tenants' AND t.tenant_id = m.old_id;

-- 4.4 แปลงรหัสห้องพัก (rooms: R0001)
INSERT INTO _short_id_map (table_name, old_id, new_id)
SELECT 'rooms', id,
       'R' || LPAD(((SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '[^0-9]', '', 'g'), '')::int), 0) FROM public.rooms WHERE length(id) <= 5) + ROW_NUMBER() OVER (ORDER BY room_number ASC, id ASC))::text, 4, '0')
FROM public.rooms
WHERE length(id) > 5;

UPDATE public.rooms t SET id = m.new_id FROM _short_id_map m WHERE m.table_name = 'rooms' AND t.id = m.old_id;
UPDATE public.invoices t SET room_id = m.new_id FROM _short_id_map m WHERE m.table_name = 'rooms' AND t.room_id = m.old_id;
UPDATE public.meter_readings t SET room_id = m.new_id FROM _short_id_map m WHERE m.table_name = 'rooms' AND t.room_id = m.old_id;
UPDATE public.contracts t SET room_id = m.new_id FROM _short_id_map m WHERE m.table_name = 'rooms' AND t.room_id = m.old_id;

-- 4.5 แปลงรหัสบิล (invoices: I0001)
INSERT INTO _short_id_map (table_name, old_id, new_id)
SELECT 'invoices', id,
       'I' || LPAD(((SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '[^0-9]', '', 'g'), '')::int), 0) FROM public.invoices WHERE length(id) <= 5) + ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC))::text, 4, '0')
FROM public.invoices
WHERE length(id) > 5;

UPDATE public.invoices t SET id = m.new_id FROM _short_id_map m WHERE m.table_name = 'invoices' AND t.id = m.old_id;
UPDATE public.invoice_items t SET invoice_id = m.new_id FROM _short_id_map m WHERE m.table_name = 'invoices' AND t.invoice_id = m.old_id;

-- 4.6 แปลงรหัสรายการในบิล (invoice_items: M0001)
INSERT INTO _short_id_map (table_name, old_id, new_id)
SELECT 'invoice_items', id,
       'M' || LPAD(((SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '[^0-9]', '', 'g'), '')::int), 0) FROM public.invoice_items WHERE length(id) <= 5) + ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC))::text, 4, '0')
FROM public.invoice_items
WHERE length(id) > 5;

UPDATE public.invoice_items t SET id = m.new_id FROM _short_id_map m WHERE m.table_name = 'invoice_items' AND t.id = m.old_id;

-- 4.7 แปลงรหัสจดมิเตอร์ (meter_readings: W0001)
INSERT INTO _short_id_map (table_name, old_id, new_id)
SELECT 'meter_readings', id,
       'W' || LPAD(((SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '[^0-9]', '', 'g'), '')::int), 0) FROM public.meter_readings WHERE length(id) <= 5) + ROW_NUMBER() OVER (ORDER BY recorded_at ASC, id ASC))::text, 4, '0')
FROM public.meter_readings
WHERE length(id) > 5;

UPDATE public.meter_readings t SET id = m.new_id FROM _short_id_map m WHERE m.table_name = 'meter_readings' AND t.id = m.old_id;

-- 4.8 แปลงรหัสสัญญาเช่า (contracts: C0001)
INSERT INTO _short_id_map (table_name, old_id, new_id)
SELECT 'contracts', id,
       'C' || LPAD(((SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '[^0-9]', '', 'g'), '')::int), 0) FROM public.contracts WHERE length(id) <= 5) + ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC))::text, 4, '0')
FROM public.contracts
WHERE length(id) > 5;

UPDATE public.contracts t SET id = m.new_id FROM _short_id_map m WHERE m.table_name = 'contracts' AND t.id = m.old_id;

-- 4.9 แปลงรหัสแจ้งซ่อม (repairs: F0001)
INSERT INTO _short_id_map (table_name, old_id, new_id)
SELECT 'repairs', id,
       'F' || LPAD(((SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '[^0-9]', '', 'g'), '')::int), 0) FROM public.repairs WHERE length(id) <= 5) + ROW_NUMBER() OVER (ORDER BY reported_at ASC, id ASC))::text, 4, '0')
FROM public.repairs
WHERE length(id) > 5;

UPDATE public.repairs t SET id = m.new_id FROM _short_id_map m WHERE m.table_name = 'repairs' AND t.id = m.old_id;

-- 4.10 แปลงรหัสรายจ่าย (expenses: E0001)
INSERT INTO _short_id_map (table_name, old_id, new_id)
SELECT 'expenses', id,
       'E' || LPAD(((SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '[^0-9]', '', 'g'), '')::int), 0) FROM public.expenses WHERE length(id) <= 5) + ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC))::text, 4, '0')
FROM public.expenses
WHERE length(id) > 5;

UPDATE public.expenses t SET id = m.new_id FROM _short_id_map m WHERE m.table_name = 'expenses' AND t.id = m.old_id;

-- 4.11 แปลงรหัสจองรายวัน (daily_bookings: D0001)
INSERT INTO _short_id_map (table_name, old_id, new_id)
SELECT 'daily_bookings', id,
       'D' || LPAD(((SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '[^0-9]', '', 'g'), '')::int), 0) FROM public.daily_bookings WHERE length(id) <= 5) + ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC))::text, 4, '0')
FROM public.daily_bookings
WHERE length(id) > 5;

UPDATE public.daily_bookings t SET id = m.new_id FROM _short_id_map m WHERE m.table_name = 'daily_bookings' AND t.id = m.old_id;

-- 4.12 แปลงรหัสตั้งค่าสาขา (branch_settings: S0001)
INSERT INTO _short_id_map (table_name, old_id, new_id)
SELECT 'branch_settings', id,
       'S' || LPAD(((SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '[^0-9]', '', 'g'), '')::int), 0) FROM public.branch_settings WHERE length(id) <= 5) + ROW_NUMBER() OVER (ORDER BY updated_at ASC, id ASC))::text, 4, '0')
FROM public.branch_settings
WHERE length(id) > 5;

UPDATE public.branch_settings t SET id = m.new_id FROM _short_id_map m WHERE m.table_name = 'branch_settings' AND t.id = m.old_id;

-- 4.13 แปลงรหัสผู้ใช้ (user_profiles: U0001)
INSERT INTO _short_id_map (table_name, old_id, new_id)
SELECT 'user_profiles', id,
       'U' || LPAD(((SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '[^0-9]', '', 'g'), '')::int), 0) FROM public.user_profiles WHERE length(id) <= 5) + ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC))::text, 4, '0')
FROM public.user_profiles
WHERE length(id) > 5;

UPDATE public.user_profiles t SET id = m.new_id FROM _short_id_map m WHERE m.table_name = 'user_profiles' AND t.id = m.old_id;

-- 4.14 แปลงรหัสประวัติการทำงาน (activity_logs: L0001)
INSERT INTO _short_id_map (table_name, old_id, new_id)
SELECT 'activity_logs', id,
       'L' || LPAD(((SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '[^0-9]', '', 'g'), '')::int), 0) FROM public.activity_logs WHERE length(id) <= 5) + ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC))::text, 4, '0')
FROM public.activity_logs
WHERE length(id) > 5;

UPDATE public.activity_logs t SET id = m.new_id FROM _short_id_map m WHERE m.table_name = 'activity_logs' AND t.id = m.old_id;

-- 5. ผูก Foreign Key Constraints กลับคืนเหมือนเดิม (พร้อมล้างค่าอ้างอิงที่ไม่มีอยู่จริงเป็น NULL เพื่อไม่ให้ติด Error)
UPDATE public.buildings SET property_id = NULL WHERE property_id IS NOT NULL AND property_id NOT IN (SELECT id FROM public.properties);
UPDATE public.rooms SET property_id = NULL WHERE property_id IS NOT NULL AND property_id NOT IN (SELECT id FROM public.properties);
UPDATE public.rooms SET building_id = NULL WHERE building_id IS NOT NULL AND building_id NOT IN (SELECT id FROM public.buildings);
UPDATE public.rooms SET current_tenant_id = NULL WHERE current_tenant_id IS NOT NULL AND current_tenant_id NOT IN (SELECT id FROM public.tenants);
UPDATE public.invoices SET property_id = NULL WHERE property_id IS NOT NULL AND property_id NOT IN (SELECT id FROM public.properties);
UPDATE public.invoices SET room_id = NULL WHERE room_id IS NOT NULL AND room_id NOT IN (SELECT id FROM public.rooms);
UPDATE public.invoices SET tenant_id = NULL WHERE tenant_id IS NOT NULL AND tenant_id NOT IN (SELECT id FROM public.tenants);
DELETE FROM public.invoice_items WHERE invoice_id IS NOT NULL AND invoice_id NOT IN (SELECT id FROM public.invoices);
DELETE FROM public.meter_readings WHERE room_id IS NOT NULL AND room_id NOT IN (SELECT id FROM public.rooms);
UPDATE public.contracts SET property_id = NULL WHERE property_id IS NOT NULL AND property_id NOT IN (SELECT id FROM public.properties);
UPDATE public.contracts SET room_id = NULL WHERE room_id IS NOT NULL AND room_id NOT IN (SELECT id FROM public.rooms);
UPDATE public.repairs SET property_id = NULL WHERE property_id IS NOT NULL AND property_id NOT IN (SELECT id FROM public.properties);
UPDATE public.expenses SET property_id = NULL WHERE property_id IS NOT NULL AND property_id NOT IN (SELECT id FROM public.properties);
DELETE FROM public.branch_settings WHERE property_id IS NOT NULL AND property_id NOT IN (SELECT id FROM public.properties);

ALTER TABLE public.buildings DROP CONSTRAINT IF EXISTS buildings_property_id_fkey;
ALTER TABLE public.buildings ADD CONSTRAINT buildings_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_property_id_fkey;
ALTER TABLE public.rooms ADD CONSTRAINT rooms_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_building_id_fkey;
ALTER TABLE public.rooms ADD CONSTRAINT rooms_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id) ON DELETE CASCADE;

ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_current_tenant_id_fkey;
ALTER TABLE public.rooms ADD CONSTRAINT rooms_current_tenant_id_fkey FOREIGN KEY (current_tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_property_id_fkey;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_room_id_fkey;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_tenant_id_fkey;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;

ALTER TABLE public.invoice_items DROP CONSTRAINT IF EXISTS invoice_items_invoice_id_fkey;
ALTER TABLE public.invoice_items ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;

ALTER TABLE public.meter_readings DROP CONSTRAINT IF EXISTS meter_readings_room_id_fkey;
ALTER TABLE public.meter_readings ADD CONSTRAINT meter_readings_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;

ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_property_id_fkey;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_room_id_fkey;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE SET NULL;

ALTER TABLE public.repairs DROP CONSTRAINT IF EXISTS repairs_property_id_fkey;
ALTER TABLE public.repairs ADD CONSTRAINT repairs_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_property_id_fkey;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE public.branch_settings DROP CONSTRAINT IF EXISTS branch_settings_property_id_fkey;
ALTER TABLE public.branch_settings ADD CONSTRAINT branch_settings_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
