-- ============================================================================
-- PAKDEE — สร้างฐานข้อมูลใหม่ทั้งชุด (Supabase project ใหม่ที่ยังว่าง)
-- ============================================================================
-- วิธีใช้: Supabase Dashboard → project ใหม่ → SQL Editor → วางทั้งไฟล์ → Run
--
-- - สร้างทุกตารางตามโครงสร้างที่โค้ดปัจจุบันใช้ (2026-11-19) ในครั้งเดียว
--   = ผลเดียวกับการรัน docs/supabase_*.sql ทุกไฟล์ตามลำดับ แต่ไม่มีขั้นแปลงข้อมูลเก่า
-- - รหัสแบบสั้น (P0001, R0001, T0001, ...) เหมือนฐานเดิม
-- - ไม่มีข้อมูลตัวอย่าง ตารางว่างทั้งหมด
-- - รันซ้ำได้ (IF NOT EXISTS) ไม่ลบข้อมูล
--
-- ห้ามรันไฟล์นี้กับฐานเดิมที่ใช้อยู่แล้ว — ฐานเดิมใช้ไฟล์ docs/supabase_*.sql ทีละไฟล์
--
-- สิทธิ์การเข้าถึง: เหมือนฐานเดิม (เปิดให้ anon key อ่าน/เขียนตารางของแอป) เพื่อให้โค้ดตอนนี้ใช้ได้ทันที
-- ยังไม่ปลอดภัยพอ — ดู docs/PLAN_SUPABASE_AUTH_RLS.md
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. ตัวรันเลขสำหรับรหัสสั้น (ใช้เมื่อแอปไม่ได้ส่งรหัสมาเอง)
-- ----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.prop_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.settings_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.tenant_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.room_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.contract_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.inv_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.item_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.mtr_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.repair_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.exp_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.daily_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.user_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.log_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.slip_seq START 1;

-- ----------------------------------------------------------------------------
-- ชั้น 1: บัญชีผู้ใช้
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id VARCHAR(64) PRIMARY KEY DEFAULT ('U' || LPAD(nextval('public.user_seq')::text, 4, '0')),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'manager')),
    phone VARCHAR(50) DEFAULT '',
    assigned_branch_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_active BOOLEAN DEFAULT true,
    data_db TEXT,                  -- ฐานข้อมูลหอของบัญชีนี้ (ใช้ในฐานหลักเท่านั้น — docs/supabase_multi_database.sql)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- ชั้น 2: สาขา
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.properties (
    id VARCHAR(64) PRIMARY KEY DEFAULT ('P' || LPAD(nextval('public.prop_seq')::text, 4, '0')),
    name VARCHAR(255) NOT NULL,
    address TEXT DEFAULT '',
    phone VARCHAR(50) DEFAULT '',
    promptpay_number VARCHAR(50) DEFAULT '',
    promptpay_name VARCHAR(255) DEFAULT '',
    electric_rate NUMERIC(10, 2) DEFAULT 0,
    water_rate NUMERIC(10, 2) DEFAULT 0,
    plan VARCHAR(50) DEFAULT 'pro',
    owner_id TEXT,                 -- บัญชีเจ้าของสาขา (user_profiles.id)
    owner_phone TEXT,              -- เบอร์บัญชีที่สร้างสาขา (ใช้กับข้อมูลเก่าที่ไม่มี owner_id)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS properties_owner_id_idx ON public.properties (owner_id);

CREATE TABLE IF NOT EXISTS public.branch_settings (
    id VARCHAR(64) PRIMARY KEY DEFAULT ('S' || LPAD(nextval('public.settings_seq')::text, 4, '0')),
    property_id VARCHAR(64) UNIQUE REFERENCES public.properties(id) ON DELETE CASCADE,
    branch_name VARCHAR(255) NOT NULL DEFAULT '',
    address TEXT DEFAULT '',
    phone VARCHAR(50) DEFAULT '',
    owner_name VARCHAR(255) DEFAULT '',
    owner_phone VARCHAR(50) DEFAULT '',
    tax_id VARCHAR(50) DEFAULT '',
    water_rate NUMERIC(10, 2) DEFAULT 0,
    electric_rate NUMERIC(10, 2) DEFAULT 0,
    use_min_water BOOLEAN DEFAULT false,
    min_water_units INTEGER DEFAULT 0,
    min_water_fee NUMERIC(10, 2) DEFAULT 0,
    use_min_electric BOOLEAN DEFAULT false,
    min_electric_units INTEGER DEFAULT 0,
    min_electric_fee NUMERIC(10, 2) DEFAULT 0,
    common_fee NUMERIC(10, 2) DEFAULT 0,
    internet_fee NUMERIC(10, 2) DEFAULT 0,
    parking_fee NUMERIC(10, 2) DEFAULT 0,
    bill_cycle_day INTEGER DEFAULT 25,
    bill_due_day INTEGER DEFAULT 5,
    late_fee_per_day NUMERIC(10, 2) DEFAULT 0,
    bank_name VARCHAR(100) DEFAULT '',
    bank_account_number VARCHAR(100) DEFAULT '',
    bank_account_name VARCHAR(255) DEFAULT '',
    promptpay_number VARCHAR(50) DEFAULT '',
    promptpay_name VARCHAR(255) DEFAULT '',
    line_channel_access_token TEXT DEFAULT '',   -- LINE OA ของสาขานี้
    line_channel_secret TEXT DEFAULT '',
    signature_url TEXT DEFAULT '',
    stamp_url TEXT DEFAULT '',
    contract_terms TEXT DEFAULT '',
    notification_settings JSONB,                 -- ตั้งค่าแจ้งเตือนบิลทาง LINE
    room_types JSONB,                            -- ประเภทห้อง + ราคา
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- ชั้น 3: ข้อมูลในหอ (ทุกตารางมี property_id)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenants (
    id VARCHAR(64) PRIMARY KEY DEFAULT ('T' || LPAD(nextval('public.tenant_seq')::text, 4, '0')),
    property_id VARCHAR(64) REFERENCES public.properties(id) ON DELETE CASCADE,
    tenant_type VARCHAR(10) NOT NULL DEFAULT 'monthly' CHECK (tenant_type IN ('monthly', 'daily')),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL DEFAULT '',
    id_card VARCHAR(20) DEFAULT '',
    gender VARCHAR(10) DEFAULT '',
    age INTEGER,
    line_id VARCHAR(100) DEFAULT '',             -- LINE user id (ขึ้นต้นด้วย U) เมื่อผูกบัญชีแล้ว
    tax_id VARCHAR(50) DEFAULT '',
    email VARCHAR(255) DEFAULT '',
    address TEXT DEFAULT '',
    emergency_contact VARCHAR(255) DEFAULT '',
    vehicle_plate VARCHAR(50) DEFAULT '',
    id_card_image_url TEXT DEFAULT '',
    invoice_lang VARCHAR(10) DEFAULT 'TH',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tenants_property_id_idx ON public.tenants (property_id);
CREATE INDEX IF NOT EXISTS tenants_property_type_idx ON public.tenants (property_id, tenant_type);

CREATE TABLE IF NOT EXISTS public.rooms (
    id VARCHAR(64) PRIMARY KEY DEFAULT ('R' || LPAD(nextval('public.room_seq')::text, 4, '0')),
    property_id VARCHAR(64) REFERENCES public.properties(id) ON DELETE CASCADE,
    room_number VARCHAR(20) NOT NULL,
    floor INTEGER NOT NULL DEFAULT 1,
    type VARCHAR(50) DEFAULT '',
    monthly_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
    daily_rate NUMERIC(10, 2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'vacant',        -- vacant / occupied / daily / cleaning / overdue
    current_electric_meter NUMERIC(10, 2) DEFAULT 0,
    current_water_meter NUMERIC(10, 2) DEFAULT 0,
    current_tenant_id VARCHAR(64) REFERENCES public.tenants(id) ON DELETE SET NULL,
    lease_end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS rooms_property_room_number_key ON public.rooms (property_id, room_number);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms (status);

CREATE TABLE IF NOT EXISTS public.contracts (
    id VARCHAR(64) PRIMARY KEY DEFAULT ('C' || LPAD(nextval('public.contract_seq')::text, 4, '0')),
    property_id VARCHAR(64) REFERENCES public.properties(id) ON DELETE CASCADE,
    contract_number VARCHAR(50) NOT NULL,
    room_id VARCHAR(64) REFERENCES public.rooms(id) ON DELETE SET NULL,
    room_number VARCHAR(20) DEFAULT '',
    tenant_id VARCHAR(64) REFERENCES public.tenants(id) ON DELETE SET NULL,
    tenant_name VARCHAR(255) DEFAULT '',
    tenant_phone VARCHAR(50) DEFAULT '',
    start_date DATE,
    end_date DATE,
    monthly_rent NUMERIC(10, 2) DEFAULT 0,
    deposit_amount NUMERIC(10, 2) DEFAULT 0,
    advance_rent NUMERIC(10, 2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'active',        -- active / pending_signature / expired / terminated
    terms_text TEXT DEFAULT '',
    signed_at TIMESTAMPTZ,
    tenant_signature_url TEXT,
    landlord_signature_url TEXT,
    revision INTEGER,                           -- ฉบับแก้ไข (0/NULL = ฉบับแรก)
    root_contract_number TEXT,
    previous_contract_number TEXT,
    superseded_by TEXT,
    contract_details JSONB,                     -- ค่าบริการในสัญญา
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS contracts_property_contract_number_key ON public.contracts (property_id, contract_number);
CREATE INDEX IF NOT EXISTS contracts_tenant_id_idx ON public.contracts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_room_number ON public.contracts (room_number);

CREATE TABLE IF NOT EXISTS public.daily_bookings (
    id VARCHAR(64) PRIMARY KEY DEFAULT ('D' || LPAD(nextval('public.daily_seq')::text, 4, '0')),
    property_id VARCHAR(64) REFERENCES public.properties(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) REFERENCES public.tenants(id) ON DELETE SET NULL,
    room_number VARCHAR(20) NOT NULL,
    guest_name VARCHAR(255) NOT NULL,
    guest_phone VARCHAR(50) DEFAULT '',
    id_card VARCHAR(20) DEFAULT '',
    vehicle_plate VARCHAR(50) DEFAULT '',
    check_in_date DATE,
    check_in_time VARCHAR(10) DEFAULT '14:00',
    check_out_date DATE,
    check_out_time VARCHAR(10) DEFAULT '12:00',
    nights INTEGER NOT NULL DEFAULT 1,
    daily_rate NUMERIC(10, 2) DEFAULT 0,
    total_room_price NUMERIC(10, 2) DEFAULT 0,
    key_deposit NUMERIC(10, 2) DEFAULT 0,
    room_deposit NUMERIC(12, 2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'confirmed',     -- confirmed / checked_in / checked_out / cancelled
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS daily_bookings_property_id_idx ON public.daily_bookings (property_id);
CREATE INDEX IF NOT EXISTS daily_bookings_tenant_id_idx ON public.daily_bookings (tenant_id);

CREATE TABLE IF NOT EXISTS public.invoices (
    id VARCHAR(64) PRIMARY KEY DEFAULT ('I' || LPAD(nextval('public.inv_seq')::text, 4, '0')),
    property_id VARCHAR(64) REFERENCES public.properties(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL,
    room_id VARCHAR(64) REFERENCES public.rooms(id) ON DELETE SET NULL,
    tenant_id VARCHAR(64) REFERENCES public.tenants(id) ON DELETE SET NULL,
    tenant_name TEXT,
    tenant_phone VARCHAR(50),
    billing_month VARCHAR(10),                  -- เช่น 2026-11
    due_date DATE,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status VARCHAR(30) DEFAULT 'unpaid',        -- unpaid / paid / overdue / pending_review / partial / deferred
    slip_url TEXT DEFAULT '',
    paid_at TIMESTAMPTZ,
    payment_method VARCHAR(20),                 -- cash / transfer / promptpay / credit_card
    slip_trans_ref VARCHAR(100),
    slip_bank VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS invoices_property_invoice_number_key ON public.invoices (property_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_room_id ON public.invoices (room_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoices_billing_month ON public.invoices (billing_month);

CREATE TABLE IF NOT EXISTS public.invoice_items (
    id VARCHAR(64) PRIMARY KEY DEFAULT ('M' || LPAD(nextval('public.item_seq')::text, 4, '0')),
    invoice_id VARCHAR(64) REFERENCES public.invoices(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    units NUMERIC(10, 2),
    rate NUMERIC(10, 2),
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    meter_prev NUMERIC(10, 2),
    meter_curr NUMERIC(10, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items (invoice_id);

-- สลิปโอนเงิน (เก็บรูปในตาราง — อ่าน/เขียนผ่าน API ฝั่งเซิร์ฟเวอร์เท่านั้น)
CREATE TABLE IF NOT EXISTS public.payment_slips (
    id VARCHAR(64) PRIMARY KEY DEFAULT ('K' || LPAD(nextval('public.slip_seq')::text, 4, '0')),
    property_id VARCHAR(64) NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    invoice_id VARCHAR(64) NOT NULL REFERENCES public.invoices(id),   -- ห้ามลบบิลที่มีสลิป (ลบทั้งสาขาได้)
    image_data BYTEA NOT NULL CHECK (octet_length(image_data) BETWEEN 1 AND 10485760),
    image_sha256 TEXT GENERATED ALWAYS AS (encode(sha256(image_data), 'hex')) STORED,
    mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
    original_filename TEXT,
    verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'passed', 'rejected')),
    transaction_ref TEXT,
    rejection_reason TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    verified_at TIMESTAMPTZ,
    CHECK (verification_status = 'pending' OR verified_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS payment_slips_invoice_uploaded_idx ON public.payment_slips (invoice_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS payment_slips_property_status_idx ON public.payment_slips (property_id, verification_status);
CREATE INDEX IF NOT EXISTS payment_slips_image_hash_idx ON public.payment_slips (image_sha256);

CREATE TABLE IF NOT EXISTS public.meter_readings (
    id VARCHAR(64) PRIMARY KEY DEFAULT ('W' || LPAD(nextval('public.mtr_seq')::text, 4, '0')),
    property_id VARCHAR(64) REFERENCES public.properties(id) ON DELETE CASCADE,
    room_id VARCHAR(64) REFERENCES public.rooms(id) ON DELETE CASCADE,
    reading_month VARCHAR(10),
    billing_month VARCHAR(10),
    electric_prev NUMERIC(10, 2) NOT NULL DEFAULT 0,
    electric_curr NUMERIC(10, 2) NOT NULL DEFAULT 0,
    electric_units NUMERIC(10, 2) NOT NULL DEFAULT 0,
    water_prev NUMERIC(10, 2) NOT NULL DEFAULT 0,
    water_curr NUMERIC(10, 2) NOT NULL DEFAULT 0,
    water_units NUMERIC(10, 2) NOT NULL DEFAULT 0,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS meter_readings_property_id_idx ON public.meter_readings (property_id);
CREATE INDEX IF NOT EXISTS meter_readings_room_id_idx ON public.meter_readings (room_id);

CREATE TABLE IF NOT EXISTS public.repairs (
    id VARCHAR(64) PRIMARY KEY DEFAULT ('F' || LPAD(nextval('public.repair_seq')::text, 4, '0')),
    property_id VARCHAR(64) REFERENCES public.properties(id) ON DELETE CASCADE,
    room_number VARCHAR(20) NOT NULL,
    tenant_name VARCHAR(255) DEFAULT '',
    category VARCHAR(50) NOT NULL DEFAULT 'other',  -- plumbing / electrical / appliance / structure / other
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    status VARCHAR(30) DEFAULT 'pending',           -- pending / in_progress / completed / cancelled
    technician_name VARCHAR(100) DEFAULT '',
    cost NUMERIC(10, 2) DEFAULT 0,
    reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_repairs_property_id ON public.repairs (property_id);
CREATE INDEX IF NOT EXISTS idx_repairs_status ON public.repairs (status);

CREATE TABLE IF NOT EXISTS public.expenses (
    id VARCHAR(64) PRIMARY KEY DEFAULT ('E' || LPAD(nextval('public.exp_seq')::text, 4, '0')),
    property_id VARCHAR(64) REFERENCES public.properties(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'other',
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    expense_date DATE,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expenses_property_id ON public.expenses (property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses (expense_date);

CREATE TABLE IF NOT EXISTS public.activity_logs (
    id VARCHAR(64) PRIMARY KEY DEFAULT ('L' || LPAD(nextval('public.log_seq')::text, 4, '0')),
    property_id VARCHAR(64) REFERENCES public.properties(id) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL DEFAULT '',
    action VARCHAR(20) NOT NULL,
    entity VARCHAR(30) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_logs_property_id_idx ON public.activity_logs (property_id);

-- ลิงก์เซ็นสัญญาทาง LINE (อ่าน/เขียนผ่าน API ฝั่งเซิร์ฟเวอร์เท่านั้น)
CREATE TABLE IF NOT EXISTS public.contract_sign_requests (
    token TEXT PRIMARY KEY,                    -- รหัสลับในลิงก์
    property_id TEXT NOT NULL,
    contract_id TEXT,
    contract_number TEXT NOT NULL,
    room_number TEXT,
    tenant_name TEXT,
    tenant_phone_last4 TEXT,                   -- ผู้เช่ากรอกเบอร์ 4 ตัวท้ายก่อนเซ็น
    line_user_id TEXT,
    contract_html TEXT NOT NULL,               -- เนื้อหาสัญญา ณ ตอนส่ง (ล็อกไว้)
    content_hash TEXT NOT NULL,                -- SHA-256 ของเนื้อหา
    landlord_name TEXT,
    landlord_signature_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending',    -- pending / signed / cancelled
    expires_at TIMESTAMPTZ NOT NULL,
    tenant_signature_url TEXT,
    signed_at TIMESTAMPTZ,
    signer_ip TEXT,
    signer_user_agent TEXT,
    signed_via TEXT,                           -- line / web
    signer_line_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contract_sign_requests_contract ON public.contract_sign_requests (property_id, contract_number);

-- ประวัติแจ้งเตือนค่าเช่าทาง LINE (กันส่งซ้ำ — ใช้ฝั่งเซิร์ฟเวอร์เท่านั้น)
CREATE TABLE IF NOT EXISTS public.line_reminder_logs (
    id BIGSERIAL PRIMARY KEY,
    property_id TEXT NOT NULL,
    invoice_number TEXT NOT NULL,
    room_number TEXT,
    due_date DATE,
    kind TEXT NOT NULL,                        -- before:3 / before:0 / overdue:6
    status TEXT NOT NULL,                      -- sent / failed / no_line
    error TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT line_reminder_logs_once UNIQUE (property_id, invoice_number, due_date, kind)
);
CREATE INDEX IF NOT EXISTS idx_line_reminder_logs_property ON public.line_reminder_logs (property_id, sent_at DESC);

-- ----------------------------------------------------------------------------
-- สิทธิ์การเข้าถึง (เหมือนฐานเดิม)
-- ----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- ตารางที่หน้าเว็บอ่าน/เขียนตรงด้วย anon key: เปิด RLS + กฎ "ทุกคนทำได้" (เหมือนฐานเดิม)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['user_profiles', 'properties', 'branch_settings', 'tenants', 'rooms', 'contracts',
    'daily_bookings', 'invoices', 'invoice_items', 'meter_readings', 'repairs', 'expenses', 'activity_logs']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Public Access on %s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "Public Access on %s" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- ตารางที่ใช้ผ่านเซิร์ฟเวอร์ (service role key) เท่านั้น: เปิด RLS ไม่มีกฎ = anon key อ่านไม่ได้
ALTER TABLE public.payment_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_sign_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_reminder_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Realtime: เครื่องอื่นรีเฟรชเองเมื่อข้อมูลเปลี่ยน
-- ----------------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY ARRAY['properties', 'branch_settings', 'rooms', 'tenants', 'contracts', 'invoices',
      'invoice_items', 'meter_readings', 'repairs', 'expenses', 'daily_bookings', 'payment_slips']
    LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                     WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      END IF;
    END LOOP;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

-- ----------------------------------------------------------------------------
-- ตรวจผล: ควรได้ 16 ตาราง
-- ----------------------------------------------------------------------------
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
