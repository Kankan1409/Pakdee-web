DO $$
DECLARE
    r RECORD;
    rec RECORD;
    new_id VARCHAR(64);
BEGIN
    -- 1. สร้างตัวรันเลขอัตโนมัติ (Sequences) สำหรับแต่ละตาราง (ถ้ายังไม่มี)
    EXECUTE 'CREATE SEQUENCE IF NOT EXISTS public.prop_seq START 1';
    EXECUTE 'CREATE SEQUENCE IF NOT EXISTS public.bldg_seq START 1';
    EXECUTE 'CREATE SEQUENCE IF NOT EXISTS public.tenant_seq START 1';
    EXECUTE 'CREATE SEQUENCE IF NOT EXISTS public.room_seq START 1';
    EXECUTE 'CREATE SEQUENCE IF NOT EXISTS public.inv_seq START 1';
    EXECUTE 'CREATE SEQUENCE IF NOT EXISTS public.item_seq START 1';
    EXECUTE 'CREATE SEQUENCE IF NOT EXISTS public.mtr_seq START 1';
    EXECUTE 'CREATE SEQUENCE IF NOT EXISTS public.contract_seq START 1';
    EXECUTE 'CREATE SEQUENCE IF NOT EXISTS public.repair_seq START 1';
    EXECUTE 'CREATE SEQUENCE IF NOT EXISTS public.exp_seq START 1';
    EXECUTE 'CREATE SEQUENCE IF NOT EXISTS public.daily_seq START 1';
    EXECUTE 'CREATE SEQUENCE IF NOT EXISTS public.settings_seq START 1';
    EXECUTE 'CREATE SEQUENCE IF NOT EXISTS public.user_seq START 1';
    EXECUTE 'CREATE SEQUENCE IF NOT EXISTS public.log_seq START 1';
    EXECUTE 'CREATE SEQUENCE IF NOT EXISTS public.slip_seq START 1';

    -- 2. ปลด Foreign Key Constraints ทั้งหมดชั่วคราวเพื่อให้แก้ไขชนิดคอลัมน์ได้
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

    -- 3. เปลี่ยนชนิดคอลัมน์ (ALTER COLUMN) จาก UUID เป็น VARCHAR(64) และตั้งค่า Default รหัส 5 หลัก
    EXECUTE $sql$
        ALTER TABLE IF EXISTS public.properties
            ALTER COLUMN id TYPE VARCHAR(64) USING id::text,
            ALTER COLUMN id SET DEFAULT ('P' || LPAD(nextval('public.prop_seq')::text, 4, '0'));

        ALTER TABLE IF EXISTS public.buildings
            ALTER COLUMN id TYPE VARCHAR(64) USING id::text,
            ALTER COLUMN id SET DEFAULT ('B' || LPAD(nextval('public.bldg_seq')::text, 4, '0')),
            ALTER COLUMN property_id TYPE VARCHAR(64) USING property_id::text;

        ALTER TABLE IF EXISTS public.tenants
            ALTER COLUMN id TYPE VARCHAR(64) USING id::text,
            ALTER COLUMN id SET DEFAULT ('T' || LPAD(nextval('public.tenant_seq')::text, 4, '0'));

        ALTER TABLE IF EXISTS public.rooms ADD COLUMN IF NOT EXISTS property_id VARCHAR(64);
        ALTER TABLE IF EXISTS public.rooms
            ALTER COLUMN id TYPE VARCHAR(64) USING id::text,
            ALTER COLUMN id SET DEFAULT ('R' || LPAD(nextval('public.room_seq')::text, 4, '0')),
            ALTER COLUMN property_id TYPE VARCHAR(64) USING property_id::text,
            ALTER COLUMN building_id TYPE VARCHAR(64) USING building_id::text,
            ALTER COLUMN current_tenant_id TYPE VARCHAR(64) USING current_tenant_id::text;

        ALTER TABLE IF EXISTS public.invoices ADD COLUMN IF NOT EXISTS property_id VARCHAR(64);
        ALTER TABLE IF EXISTS public.invoices
            ALTER COLUMN id TYPE VARCHAR(64) USING id::text,
            ALTER COLUMN id SET DEFAULT ('I' || LPAD(nextval('public.inv_seq')::text, 4, '0')),
            ALTER COLUMN property_id TYPE VARCHAR(64) USING property_id::text,
            ALTER COLUMN room_id TYPE VARCHAR(64) USING room_id::text,
            ALTER COLUMN tenant_id TYPE VARCHAR(64) USING tenant_id::text;

        ALTER TABLE IF EXISTS public.invoice_items
            ALTER COLUMN id TYPE VARCHAR(64) USING id::text,
            ALTER COLUMN id SET DEFAULT ('M' || LPAD(nextval('public.item_seq')::text, 4, '0')),
            ALTER COLUMN invoice_id TYPE VARCHAR(64) USING invoice_id::text;

        ALTER TABLE IF EXISTS public.meter_readings
            ALTER COLUMN id TYPE VARCHAR(64) USING id::text,
            ALTER COLUMN id SET DEFAULT ('W' || LPAD(nextval('public.mtr_seq')::text, 4, '0')),
            ALTER COLUMN room_id TYPE VARCHAR(64) USING room_id::text;

        ALTER TABLE IF EXISTS public.contracts
            ALTER COLUMN id TYPE VARCHAR(64) USING id::text,
            ALTER COLUMN id SET DEFAULT ('C' || LPAD(nextval('public.contract_seq')::text, 4, '0')),
            ALTER COLUMN property_id TYPE VARCHAR(64) USING property_id::text,
            ALTER COLUMN room_id TYPE VARCHAR(64) USING room_id::text;

        ALTER TABLE IF EXISTS public.repairs
            ALTER COLUMN id TYPE VARCHAR(64) USING id::text,
            ALTER COLUMN id SET DEFAULT ('F' || LPAD(nextval('public.repair_seq')::text, 4, '0')),
            ALTER COLUMN property_id TYPE VARCHAR(64) USING property_id::text;

        ALTER TABLE IF EXISTS public.expenses
            ALTER COLUMN id TYPE VARCHAR(64) USING id::text,
            ALTER COLUMN id SET DEFAULT ('E' || LPAD(nextval('public.exp_seq')::text, 4, '0')),
            ALTER COLUMN property_id TYPE VARCHAR(64) USING property_id::text;

        ALTER TABLE IF EXISTS public.daily_bookings
            ALTER COLUMN id TYPE VARCHAR(64) USING id::text,
            ALTER COLUMN id SET DEFAULT ('D' || LPAD(nextval('public.daily_seq')::text, 4, '0'));

        ALTER TABLE IF EXISTS public.branch_settings
            ALTER COLUMN id TYPE VARCHAR(64) USING id::text,
            ALTER COLUMN id SET DEFAULT ('S' || LPAD(nextval('public.settings_seq')::text, 4, '0')),
            ALTER COLUMN property_id TYPE VARCHAR(64) USING property_id::text;

        ALTER TABLE IF EXISTS public.user_profiles
            ALTER COLUMN id TYPE VARCHAR(64) USING id::text,
            ALTER COLUMN id SET DEFAULT ('U' || LPAD(nextval('public.user_seq')::text, 4, '0'));

        ALTER TABLE IF EXISTS public.activity_logs
            ALTER COLUMN id TYPE VARCHAR(64) USING id::text,
            ALTER COLUMN id SET DEFAULT ('L' || LPAD(nextval('public.log_seq')::text, 4, '0'));
    $sql$;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_slips') THEN
        EXECUTE $sql$
            ALTER TABLE public.payment_slips
                ALTER COLUMN id TYPE VARCHAR(64) USING id::text,
                ALTER COLUMN id SET DEFAULT ('K' || LPAD(nextval('public.slip_seq')::text, 4, '0')),
                ALTER COLUMN property_id TYPE VARCHAR(64) USING property_id::text,
                ALTER COLUMN invoice_id TYPE VARCHAR(64) USING invoice_id::text;
        $sql$;
    END IF;

    -- 4. แปลงรหัส UUID เดิมให้เป็นรหัส 5 หลัก (P0001, R0001, T0001, ฯลฯ) พร้อมอัปเดตคอลัมน์ที่อ้างอิงกัน
    PERFORM setval('public.prop_seq', 1, false);
    FOR rec IN EXECUTE 'SELECT id::text AS id FROM public.properties WHERE length(id::text) > 5 ORDER BY id ASC' LOOP
        new_id := 'P' || LPAD(nextval('public.prop_seq')::text, 4, '0');
        EXECUTE 'UPDATE public.properties SET id = $1 WHERE id = $2' USING new_id, rec.id;
        EXECUTE 'UPDATE public.buildings SET property_id = $1 WHERE property_id = $2' USING new_id, rec.id;
        EXECUTE 'UPDATE public.rooms SET property_id = $1 WHERE property_id = $2' USING new_id, rec.id;
        EXECUTE 'UPDATE public.invoices SET property_id = $1 WHERE property_id = $2' USING new_id, rec.id;
        EXECUTE 'UPDATE public.contracts SET property_id = $1 WHERE property_id = $2' USING new_id, rec.id;
        EXECUTE 'UPDATE public.repairs SET property_id = $1 WHERE property_id = $2' USING new_id, rec.id;
        EXECUTE 'UPDATE public.expenses SET property_id = $1 WHERE property_id = $2' USING new_id, rec.id;
        EXECUTE 'UPDATE public.branch_settings SET property_id = $1 WHERE property_id = $2' USING new_id, rec.id;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_slips') THEN
            EXECUTE 'UPDATE public.payment_slips SET property_id = $1 WHERE property_id = $2' USING new_id, rec.id;
        END IF;
    END LOOP;

    PERFORM setval('public.bldg_seq', 1, false);
    FOR rec IN EXECUTE 'SELECT id::text AS id FROM public.buildings WHERE length(id::text) > 5 ORDER BY id ASC' LOOP
        new_id := 'B' || LPAD(nextval('public.bldg_seq')::text, 4, '0');
        EXECUTE 'UPDATE public.buildings SET id = $1 WHERE id = $2' USING new_id, rec.id;
        EXECUTE 'UPDATE public.rooms SET building_id = $1 WHERE building_id = $2' USING new_id, rec.id;
    END LOOP;

    PERFORM setval('public.tenant_seq', 1, false);
    FOR rec IN EXECUTE 'SELECT id::text AS id FROM public.tenants WHERE length(id::text) > 5 ORDER BY id ASC' LOOP
        new_id := 'T' || LPAD(nextval('public.tenant_seq')::text, 4, '0');
        EXECUTE 'UPDATE public.tenants SET id = $1 WHERE id = $2' USING new_id, rec.id;
        EXECUTE 'UPDATE public.rooms SET current_tenant_id = $1 WHERE current_tenant_id = $2' USING new_id, rec.id;
        EXECUTE 'UPDATE public.invoices SET tenant_id = $1 WHERE tenant_id = $2' USING new_id, rec.id;
    END LOOP;

    PERFORM setval('public.room_seq', 1, false);
    FOR rec IN EXECUTE 'SELECT id::text AS id FROM public.rooms WHERE length(id::text) > 5 ORDER BY room_number ASC, id ASC' LOOP
        new_id := 'R' || LPAD(nextval('public.room_seq')::text, 4, '0');
        EXECUTE 'UPDATE public.rooms SET id = $1 WHERE id = $2' USING new_id, rec.id;
        EXECUTE 'UPDATE public.invoices SET room_id = $1 WHERE room_id = $2' USING new_id, rec.id;
        EXECUTE 'UPDATE public.meter_readings SET room_id = $1 WHERE room_id = $2' USING new_id, rec.id;
        EXECUTE 'UPDATE public.contracts SET room_id = $1 WHERE room_id = $2' USING new_id, rec.id;
    END LOOP;

    PERFORM setval('public.inv_seq', 1, false);
    FOR rec IN EXECUTE 'SELECT id::text AS id FROM public.invoices WHERE length(id::text) > 5 ORDER BY id ASC' LOOP
        new_id := 'I' || LPAD(nextval('public.inv_seq')::text, 4, '0');
        EXECUTE 'UPDATE public.invoices SET id = $1 WHERE id = $2' USING new_id, rec.id;
        EXECUTE 'UPDATE public.invoice_items SET invoice_id = $1 WHERE invoice_id = $2' USING new_id, rec.id;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_slips') THEN
            EXECUTE 'UPDATE public.payment_slips SET invoice_id = $1 WHERE invoice_id = $2' USING new_id, rec.id;
        END IF;
    END LOOP;

    PERFORM setval('public.item_seq', 1, false);
    FOR rec IN EXECUTE 'SELECT id::text AS id FROM public.invoice_items WHERE length(id::text) > 5 ORDER BY id ASC' LOOP
        new_id := 'M' || LPAD(nextval('public.item_seq')::text, 4, '0');
        EXECUTE 'UPDATE public.invoice_items SET id = $1 WHERE id = $2' USING new_id, rec.id;
    END LOOP;

    PERFORM setval('public.mtr_seq', 1, false);
    FOR rec IN EXECUTE 'SELECT id::text AS id FROM public.meter_readings WHERE length(id::text) > 5 ORDER BY id ASC' LOOP
        new_id := 'W' || LPAD(nextval('public.mtr_seq')::text, 4, '0');
        EXECUTE 'UPDATE public.meter_readings SET id = $1 WHERE id = $2' USING new_id, rec.id;
    END LOOP;

    PERFORM setval('public.contract_seq', 1, false);
    FOR rec IN EXECUTE 'SELECT id::text AS id FROM public.contracts WHERE length(id::text) > 5 ORDER BY id ASC' LOOP
        new_id := 'C' || LPAD(nextval('public.contract_seq')::text, 4, '0');
        EXECUTE 'UPDATE public.contracts SET id = $1 WHERE id = $2' USING new_id, rec.id;
    END LOOP;

    PERFORM setval('public.repair_seq', 1, false);
    FOR rec IN EXECUTE 'SELECT id::text AS id FROM public.repairs WHERE length(id::text) > 5 ORDER BY id ASC' LOOP
        new_id := 'F' || LPAD(nextval('public.repair_seq')::text, 4, '0');
        EXECUTE 'UPDATE public.repairs SET id = $1 WHERE id = $2' USING new_id, rec.id;
    END LOOP;

    PERFORM setval('public.exp_seq', 1, false);
    FOR rec IN EXECUTE 'SELECT id::text AS id FROM public.expenses WHERE length(id::text) > 5 ORDER BY id ASC' LOOP
        new_id := 'E' || LPAD(nextval('public.exp_seq')::text, 4, '0');
        EXECUTE 'UPDATE public.expenses SET id = $1 WHERE id = $2' USING new_id, rec.id;
    END LOOP;

    PERFORM setval('public.daily_seq', 1, false);
    FOR rec IN EXECUTE 'SELECT id::text AS id FROM public.daily_bookings WHERE length(id::text) > 5 ORDER BY id ASC' LOOP
        new_id := 'D' || LPAD(nextval('public.daily_seq')::text, 4, '0');
        EXECUTE 'UPDATE public.daily_bookings SET id = $1 WHERE id = $2' USING new_id, rec.id;
    END LOOP;

    PERFORM setval('public.settings_seq', 1, false);
    FOR rec IN EXECUTE 'SELECT id::text AS id FROM public.branch_settings WHERE length(id::text) > 5 ORDER BY id ASC' LOOP
        new_id := 'S' || LPAD(nextval('public.settings_seq')::text, 4, '0');
        EXECUTE 'UPDATE public.branch_settings SET id = $1 WHERE id = $2' USING new_id, rec.id;
    END LOOP;

    PERFORM setval('public.user_seq', 1, false);
    FOR rec IN EXECUTE 'SELECT id::text AS id FROM public.user_profiles WHERE length(id::text) > 5 ORDER BY id ASC' LOOP
        new_id := 'U' || LPAD(nextval('public.user_seq')::text, 4, '0');
        EXECUTE 'UPDATE public.user_profiles SET id = $1 WHERE id = $2' USING new_id, rec.id;
    END LOOP;

    PERFORM setval('public.log_seq', 1, false);
    FOR rec IN EXECUTE 'SELECT id::text AS id FROM public.activity_logs WHERE length(id::text) > 5 ORDER BY id ASC' LOOP
        new_id := 'L' || LPAD(nextval('public.log_seq')::text, 4, '0');
        EXECUTE 'UPDATE public.activity_logs SET id = $1 WHERE id = $2' USING new_id, rec.id;
    END LOOP;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_slips') THEN
        PERFORM setval('public.slip_seq', 1, false);
        FOR rec IN EXECUTE 'SELECT id::text AS id FROM public.payment_slips WHERE length(id::text) > 5 ORDER BY id ASC' LOOP
            new_id := 'K' || LPAD(nextval('public.slip_seq')::text, 4, '0');
            EXECUTE 'UPDATE public.payment_slips SET id = $1 WHERE id = $2' USING new_id, rec.id;
        END LOOP;
    END IF;

    -- เติม property_id ให้ rooms และ invoices จากความสัมพันธ์อาคาร/ห้องพัก
    EXECUTE $sql$
        UPDATE public.rooms r SET property_id = b.property_id FROM public.buildings b WHERE r.building_id = b.id AND r.property_id IS NULL;
        UPDATE public.invoices i SET property_id = r.property_id FROM public.rooms r WHERE i.room_id = r.id AND i.property_id IS NULL;
    $sql$;

    -- 5. ล้างค่าอ้างอิงที่ไม่มีอยู่จริงเป็น NULL และผูก Foreign Key กลับคืน
    EXECUTE $sql$
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
    $sql$;
END $$;

-- ============================================================================
-- Branch ownership: each branch (property) belongs to one account so branches
-- created on different accounts/devices stay separate.
-- ============================================================================
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS owner_id TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS owner_phone TEXT;
CREATE INDEX IF NOT EXISTS properties_owner_id_idx ON public.properties (owner_id);
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- Restore payment_slips -> invoices relationship.
-- The short-ID migration above drops every foreign key and re-adds a list that
-- missed this one. Without it PostgREST cannot embed invoices(invoice_number),
-- so /api/payment-slips (list) and re-checking a stored slip fail with 503.
-- Same rule as the original table (docs/migrations/20261106_create_payment_slips.sql):
-- ON DELETE RESTRICT, so a bill with payment evidence cannot be deleted silently.
-- NOT VALID: existing slips whose invoice was already deleted are kept as-is
-- (no data is deleted); the rule applies to new/updated rows.
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_slips')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_slips_invoice_id_fkey') THEN
        ALTER TABLE public.payment_slips
            ADD CONSTRAINT payment_slips_invoice_id_fkey
            FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE RESTRICT NOT VALID;
    END IF;
END $$;
NOTIFY pgrst, 'reload schema';
