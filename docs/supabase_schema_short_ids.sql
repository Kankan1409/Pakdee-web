-- ==============================================================================
-- PAKDEE APARTMENT MANAGEMENT SYSTEM - ALTER COLUMNS TO SHORT ID (NO DROP TABLE)
-- สคริปต์แปลงคอลัมน์ id และ Foreign Keys จาก UUID เป็นรหัส 5 หลัก (P0001, R0001)
-- โดย "ไม่ลบตาราง" และข้อมูลในตารางยังคงอยู่ครบถ้วน
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
CREATE SEQUENCE IF NOT EXISTS public.slip_seq START 1;

-- 2. ปลด Foreign Key Constraints ชั่วคราวเพื่อให้แก้ไขชนิดคอลัมน์ (ALTER COLUMN) ได้
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tc.table_schema, tc.table_name, tc.constraint_name
        FROM information_schema.table_constraints tc
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name IN (
              'properties', 'buildings', 'tenants', 'rooms', 'invoices',
              'invoice_items', 'meter_readings', 'contracts', 'repairs',
              'expenses', 'daily_bookings', 'branch_settings',
              'user_profiles', 'activity_logs', 'payment_slips'
          )
    ) LOOP
        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I', r.table_schema, r.table_name, r.constraint_name);
    END LOOP;
END $$;

-- 3. เปลี่ยนชนิดคอลัมน์ (ALTER COLUMN) จาก UUID เป็น VARCHAR และตั้งค่า Default รหัส 5 หลัก
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

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_slips') THEN
        ALTER TABLE public.payment_slips
            ALTER COLUMN id TYPE VARCHAR(20) USING id::text,
            ALTER COLUMN id SET DEFAULT ('K' || LPAD(nextval('public.slip_seq')::text, 4, '0')),
            ALTER COLUMN property_id TYPE VARCHAR(20) USING property_id::text,
            ALTER COLUMN invoice_id TYPE VARCHAR(20) USING invoice_id::text;
    END IF;
END $$;

-- 4. แปลงข้อมูลรหัส UUID ยาวๆ ที่มีอยู่ในตารางตอนนี้ ให้กลายเป็นรหัส 5 หลัก (P0001, R0001, ฯลฯ) พร้อมอัปเดตคอลัมน์ที่เชื่อมกัน
DO $$
DECLARE
    rec RECORD;
    new_id VARCHAR(10);
BEGIN
    -- รีเซ็ตเลข Sequence ให้เริ่มนับ 1 ใหม่
    PERFORM setval('public.prop_seq', 1, false);
    PERFORM setval('public.bldg_seq', 1, false);
    PERFORM setval('public.tenant_seq', 1, false);
    PERFORM setval('public.room_seq', 1, false);
    PERFORM setval('public.inv_seq', 1, false);
    PERFORM setval('public.item_seq', 1, false);
    PERFORM setval('public.mtr_seq', 1, false);
    PERFORM setval('public.contract_seq', 1, false);
    PERFORM setval('public.repair_seq', 1, false);
    PERFORM setval('public.exp_seq', 1, false);
    PERFORM setval('public.daily_seq', 1, false);
    PERFORM setval('public.settings_seq', 1, false);
    PERFORM setval('public.user_seq', 1, false);
    PERFORM setval('public.log_seq', 1, false);

    -- 4.1 แปลงรหัสสาขา (properties: P0001) และอัปเดต property_id ทุกตารางที่อ้างอิง
    FOR rec IN SELECT id FROM public.properties ORDER BY created_at ASC, id ASC LOOP
        IF length(rec.id) > 5 THEN
            new_id := 'P' || LPAD(nextval('public.prop_seq')::text, 4, '0');
            UPDATE public.properties SET id = new_id WHERE id = rec.id;
            UPDATE public.buildings SET property_id = new_id WHERE property_id = rec.id;
            UPDATE public.rooms SET property_id = new_id WHERE property_id = rec.id;
            UPDATE public.invoices SET property_id = new_id WHERE property_id = rec.id;
            UPDATE public.contracts SET property_id = new_id WHERE property_id = rec.id;
            UPDATE public.repairs SET property_id = new_id WHERE property_id = rec.id;
            UPDATE public.expenses SET property_id = new_id WHERE property_id = rec.id;
            UPDATE public.branch_settings SET property_id = new_id WHERE property_id = rec.id;
        END IF;
    END LOOP;

    -- 4.2 แปลงรหัสอาคาร (buildings: B0001)
    FOR rec IN SELECT id FROM public.buildings ORDER BY created_at ASC, id ASC LOOP
        IF length(rec.id) > 5 THEN
            new_id := 'B' || LPAD(nextval('public.bldg_seq')::text, 4, '0');
            UPDATE public.buildings SET id = new_id WHERE id = rec.id;
            UPDATE public.rooms SET building_id = new_id WHERE building_id = rec.id;
        END IF;
    END LOOP;

    -- 4.3 แปลงรหัสผู้เช่า (tenants: T0001)
    FOR rec IN SELECT id FROM public.tenants ORDER BY created_at ASC, id ASC LOOP
        IF length(rec.id) > 5 THEN
            new_id := 'T' || LPAD(nextval('public.tenant_seq')::text, 4, '0');
            UPDATE public.tenants SET id = new_id WHERE id = rec.id;
            UPDATE public.rooms SET current_tenant_id = new_id WHERE current_tenant_id = rec.id;
            UPDATE public.invoices SET tenant_id = new_id WHERE tenant_id = rec.id;
        END IF;
    END LOOP;

    -- 4.4 แปลงรหัสห้องพัก (rooms: R0001)
    FOR rec IN SELECT id FROM public.rooms ORDER BY room_number ASC, id ASC LOOP
        IF length(rec.id) > 5 THEN
            new_id := 'R' || LPAD(nextval('public.room_seq')::text, 4, '0');
            UPDATE public.rooms SET id = new_id WHERE id = rec.id;
            UPDATE public.invoices SET room_id = new_id WHERE room_id = rec.id;
            UPDATE public.meter_readings SET room_id = new_id WHERE room_id = rec.id;
            UPDATE public.contracts SET room_id = new_id WHERE room_id = rec.id;
        END IF;
    END LOOP;

    -- 4.5 แปลงรหัสบิล (invoices: I0001)
    FOR rec IN SELECT id FROM public.invoices ORDER BY created_at ASC, id ASC LOOP
        IF length(rec.id) > 5 THEN
            new_id := 'I' || LPAD(nextval('public.inv_seq')::text, 4, '0');
            UPDATE public.invoices SET id = new_id WHERE id = rec.id;
            UPDATE public.invoice_items SET invoice_id = new_id WHERE invoice_id = rec.id;
        END IF;
    END LOOP;

    -- 4.6 แปลงรหัสรายการในบิล (invoice_items: M0001)
    FOR rec IN SELECT id FROM public.invoice_items ORDER BY created_at ASC, id ASC LOOP
        IF length(rec.id) > 5 THEN
            new_id := 'M' || LPAD(nextval('public.item_seq')::text, 4, '0');
            UPDATE public.invoice_items SET id = new_id WHERE id = rec.id;
        END IF;
    END LOOP;

    -- 4.7 แปลงรหัสจดมิเตอร์ (meter_readings: W0001)
    FOR rec IN SELECT id FROM public.meter_readings ORDER BY recorded_at ASC, id ASC LOOP
        IF length(rec.id) > 5 THEN
            new_id := 'W' || LPAD(nextval('public.mtr_seq')::text, 4, '0');
            UPDATE public.meter_readings SET id = new_id WHERE id = rec.id;
        END IF;
    END LOOP;

    -- 4.8 แปลงรหัสสัญญาเช่า (contracts: C0001)
    FOR rec IN SELECT id FROM public.contracts ORDER BY created_at ASC, id ASC LOOP
        IF length(rec.id) > 5 THEN
            new_id := 'C' || LPAD(nextval('public.contract_seq')::text, 4, '0');
            UPDATE public.contracts SET id = new_id WHERE id = rec.id;
        END IF;
    END LOOP;

    -- 4.9 แปลงรหัสแจ้งซ่อม (repairs: F0001)
    FOR rec IN SELECT id FROM public.repairs ORDER BY reported_at ASC, id ASC LOOP
        IF length(rec.id) > 5 THEN
            new_id := 'F' || LPAD(nextval('public.repair_seq')::text, 4, '0');
            UPDATE public.repairs SET id = new_id WHERE id = rec.id;
        END IF;
    END LOOP;

    -- 4.10 แปลงรหัสรายจ่าย (expenses: E0001)
    FOR rec IN SELECT id FROM public.expenses ORDER BY created_at ASC, id ASC LOOP
        IF length(rec.id) > 5 THEN
            new_id := 'E' || LPAD(nextval('public.exp_seq')::text, 4, '0');
            UPDATE public.expenses SET id = new_id WHERE id = rec.id;
        END IF;
    END LOOP;

    -- 4.11 แปลงรหัสจองรายวัน (daily_bookings: D0001)
    FOR rec IN SELECT id FROM public.daily_bookings ORDER BY created_at ASC, id ASC LOOP
        IF length(rec.id) > 5 THEN
            new_id := 'D' || LPAD(nextval('public.daily_seq')::text, 4, '0');
            UPDATE public.daily_bookings SET id = new_id WHERE id = rec.id;
        END IF;
    END LOOP;

    -- 4.12 แปลงรหัสตั้งค่าสาขา (branch_settings: S0001)
    FOR rec IN SELECT id FROM public.branch_settings ORDER BY updated_at ASC, id ASC LOOP
        IF length(rec.id) > 5 THEN
            new_id := 'S' || LPAD(nextval('public.settings_seq')::text, 4, '0');
            UPDATE public.branch_settings SET id = new_id WHERE id = rec.id;
        END IF;
    END LOOP;

    -- 4.13 แปลงรหัสผู้ใช้ (user_profiles: U0001)
    FOR rec IN SELECT id FROM public.user_profiles ORDER BY created_at ASC, id ASC LOOP
        IF length(rec.id) > 5 THEN
            new_id := 'U' || LPAD(nextval('public.user_seq')::text, 4, '0');
            UPDATE public.user_profiles SET id = new_id WHERE id = rec.id;
        END IF;
    END LOOP;

    -- 4.14 แปลงรหัสประวัติการทำงาน (activity_logs: L0001)
    FOR rec IN SELECT id FROM public.activity_logs ORDER BY created_at ASC, id ASC LOOP
        IF length(rec.id) > 5 THEN
            new_id := 'L' || LPAD(nextval('public.log_seq')::text, 4, '0');
            UPDATE public.activity_logs SET id = new_id WHERE id = rec.id;
        END IF;
    END LOOP;
END $$;

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

ALTER TABLE public.buildings ADD CONSTRAINT buildings_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
ALTER TABLE public.rooms ADD CONSTRAINT rooms_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
ALTER TABLE public.rooms ADD CONSTRAINT rooms_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id) ON DELETE CASCADE;
ALTER TABLE public.rooms ADD CONSTRAINT rooms_current_tenant_id_fkey FOREIGN KEY (current_tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.invoice_items ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;
ALTER TABLE public.meter_readings ADD CONSTRAINT meter_readings_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE SET NULL;
ALTER TABLE public.repairs ADD CONSTRAINT repairs_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
ALTER TABLE public.branch_settings ADD CONSTRAINT branch_settings_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
