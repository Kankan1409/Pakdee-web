-- ==============================================================================
-- PAKDEE APARTMENT MANAGEMENT SYSTEM - COMPLETE ENTERPRISE SUPABASE SCHEMA
-- โครงสร้างฐานข้อมูลระบบบริหารจัดการหอพักและอพาร์ตเมนต์ครบวงจร
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PROPERTIES (สาขาหอพัก)
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT DEFAULT '',
    phone VARCHAR(50) DEFAULT '',
    promptpay_number VARCHAR(50) DEFAULT '',
    promptpay_name VARCHAR(255) DEFAULT '',
    electric_rate NUMERIC(10, 2) DEFAULT 8.00,
    water_rate NUMERIC(10, 2) DEFAULT 18.00,
    plan VARCHAR(50) DEFAULT 'pro',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. BUILDINGS (อาคาร / ตึกภายในแต่ละสาขา)
CREATE TABLE IF NOT EXISTS public.buildings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    total_floors INTEGER DEFAULT 4,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TENANTS (ทะเบียนผู้เช่าและเอกสารส่วนบุคคล)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    id_card VARCHAR(20) DEFAULT '',
    gender VARCHAR(10) DEFAULT 'MALE',
    age INTEGER DEFAULT 25,
    line_id VARCHAR(100) DEFAULT '',
    tax_id VARCHAR(50) DEFAULT '',
    email VARCHAR(255) DEFAULT '',
    address TEXT DEFAULT '',
    emergency_contact VARCHAR(255) DEFAULT '',
    vehicle_plate VARCHAR(50) DEFAULT '',
    id_card_image_url TEXT DEFAULT '',
    invoice_lang VARCHAR(10) DEFAULT 'TH',
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. ROOMS (ผังห้องพักและสถานะมิเตอร์ปัจจุบัน แยกตามสาขา)
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE,
    room_number VARCHAR(20) NOT NULL,
    floor INTEGER NOT NULL,
    type VARCHAR(50) DEFAULT 'Standard',
    monthly_rate NUMERIC(10, 2) NOT NULL DEFAULT 4000.00,
    daily_rate NUMERIC(10, 2) DEFAULT 650.00,
    status VARCHAR(30) DEFAULT 'vacant', -- 'vacant', 'occupied', 'daily', 'cleaning', 'overdue'
    current_electric_meter NUMERIC(10, 2) DEFAULT 0.00,
    current_water_meter NUMERIC(10, 2) DEFAULT 0.00,
    current_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    lease_end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(building_id, room_number)
);

-- 6. INVOICES (ใบแจ้งหนี้ & บิลชำระเงิน แยกตามสาขา)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    billing_month VARCHAR(10) NOT NULL, -- เช่น '2026-10'
    due_date DATE NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) DEFAULT 'unpaid', -- 'unpaid', 'paid', 'overdue'
    slip_url TEXT DEFAULT '',
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. INVOICE_ITEMS (รายการแจกแจงในใบแจ้งหนี้)
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    units NUMERIC(10, 2),
    rate NUMERIC(10, 2),
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    meter_prev NUMERIC(10, 2),
    meter_curr NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. METER_READINGS (ประวัติการจดมิเตอร์น้ำไฟรายงวด)
CREATE TABLE IF NOT EXISTS public.meter_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    reading_month VARCHAR(10) NOT NULL,
    electric_prev NUMERIC(10, 2) NOT NULL,
    electric_curr NUMERIC(10, 2) NOT NULL,
    electric_units NUMERIC(10, 2) NOT NULL,
    water_prev NUMERIC(10, 2) NOT NULL,
    water_curr NUMERIC(10, 2) NOT NULL,
    water_units NUMERIC(10, 2) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. CONTRACTS (สัญญาเช่าห้องพักดิจิทัล แยกตามสาขา)
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    contract_number VARCHAR(50) UNIQUE NOT NULL,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    room_number VARCHAR(20) NOT NULL,
    tenant_name VARCHAR(255) NOT NULL,
    tenant_phone VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    monthly_rent NUMERIC(10, 2) NOT NULL,
    deposit_amount NUMERIC(10, 2) NOT NULL,
    advance_rent NUMERIC(10, 2) NOT NULL,
    status VARCHAR(30) DEFAULT 'active', -- 'active', 'pending_signature', 'expired', 'terminated'
    terms_text TEXT DEFAULT '',
    signed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. REPAIRS (ระบบแจ้งซ่อมบำรุงห้องพัก แยกตามสาขา)
CREATE TABLE IF NOT EXISTS public.repairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    room_number VARCHAR(20) NOT NULL,
    tenant_name VARCHAR(255) DEFAULT '',
    category VARCHAR(50) NOT NULL, -- 'plumbing', 'electrical', 'appliance', 'structure', 'other'
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
    technician_name VARCHAR(100) DEFAULT '',
    cost NUMERIC(10, 2) DEFAULT 0.00,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 11. EXPENSES (บันทึกรายจ่ายหอพัก)
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'maintenance', 'utilities', 'supplies', 'salary', 'other'
    amount NUMERIC(10, 2) NOT NULL,
    expense_date DATE NOT NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. DAILY_BOOKINGS (การจองห้องพักรายวัน)
CREATE TABLE IF NOT EXISTS public.daily_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_number VARCHAR(20) NOT NULL,
    guest_name VARCHAR(255) NOT NULL,
    guest_phone VARCHAR(50) NOT NULL,
    check_in_date DATE NOT NULL,
    check_in_time VARCHAR(10) DEFAULT '14:00',
    check_out_date DATE NOT NULL,
    check_out_time VARCHAR(10) DEFAULT '12:00',
    nights INTEGER NOT NULL DEFAULT 1,
    daily_rate NUMERIC(10, 2) NOT NULL,
    total_room_price NUMERIC(10, 2) NOT NULL,
    key_deposit NUMERIC(10, 2) DEFAULT 500.00,
    status VARCHAR(30) DEFAULT 'confirmed', -- 'confirmed', 'checked_in', 'checked_out', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. BRANCH_SETTINGS (ตั้งค่าสาขา 10 แท็บ)
CREATE TABLE IF NOT EXISTS public.branch_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID UNIQUE REFERENCES public.properties(id) ON DELETE CASCADE,
    branch_name VARCHAR(255) NOT NULL,
    address TEXT DEFAULT '',
    phone VARCHAR(50) DEFAULT '',
    owner_name VARCHAR(255) DEFAULT '',
    owner_phone VARCHAR(50) DEFAULT '',
    tax_id VARCHAR(50) DEFAULT '',
    water_rate NUMERIC(10, 2) DEFAULT 18.00,
    electric_rate NUMERIC(10, 2) DEFAULT 8.00,
    use_min_water BOOLEAN DEFAULT false,
    min_water_units INTEGER DEFAULT 5,
    min_water_fee NUMERIC(10, 2) DEFAULT 100.00,
    use_min_electric BOOLEAN DEFAULT false,
    min_electric_units INTEGER DEFAULT 10,
    min_electric_fee NUMERIC(10, 2) DEFAULT 150.00,
    common_fee NUMERIC(10, 2) DEFAULT 300.00,
    internet_fee NUMERIC(10, 2) DEFAULT 0.00,
    parking_fee NUMERIC(10, 2) DEFAULT 0.00,
    bill_cycle_day INTEGER DEFAULT 25,
    bill_due_day INTEGER DEFAULT 5,
    late_fee_per_day NUMERIC(10, 2) DEFAULT 50.00,
    bank_name VARCHAR(100) DEFAULT '',
    bank_account_number VARCHAR(100) DEFAULT '',
    bank_account_name VARCHAR(255) DEFAULT '',
    promptpay_number VARCHAR(50) DEFAULT '',
    promptpay_name VARCHAR(255) DEFAULT '',
    line_channel_access_token TEXT DEFAULT '',
    line_channel_secret TEXT DEFAULT '',
    signature_url TEXT DEFAULT '',
    stamp_url TEXT DEFAULT '',
    contract_terms TEXT DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. USER_PROFILES (บัญชีและสิทธิ์: เจ้าของหอพัก vs ผู้จัดการ)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'manager')),
    phone VARCHAR(50) DEFAULT '',
    assigned_branch_ids TEXT[] DEFAULT ARRAY['all']::TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 16. ACTIVITY_LOGS (Audit Trail ประวัติการทำงาน)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_name VARCHAR(255) NOT NULL,
    action VARCHAR(20) NOT NULL,
    entity VARCHAR(30) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_rooms_property_id ON public.rooms(property_id);
CREATE INDEX IF NOT EXISTS idx_rooms_building_id ON public.rooms(building_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);
CREATE INDEX IF NOT EXISTS idx_invoices_property_id ON public.invoices(property_id);
CREATE INDEX IF NOT EXISTS idx_invoices_room_id ON public.invoices(room_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_billing_month ON public.invoices(billing_month);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_contracts_property_id ON public.contracts(property_id);
CREATE INDEX IF NOT EXISTS idx_contracts_room_number ON public.contracts(room_number);
CREATE INDEX IF NOT EXISTS idx_repairs_property_id ON public.repairs(property_id);
CREATE INDEX IF NOT EXISTS idx_repairs_status ON public.repairs(status);
CREATE INDEX IF NOT EXISTS idx_expenses_property_id ON public.expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR INSTANT ACCESS
-- ==============================================================================
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access on contracts" ON public.contracts;
CREATE POLICY "Public Access on contracts" ON public.contracts FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.repairs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access on repairs" ON public.repairs;
CREATE POLICY "Public Access on repairs" ON public.repairs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access on expenses" ON public.expenses;
CREATE POLICY "Public Access on expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.branch_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access on branch_settings" ON public.branch_settings;
CREATE POLICY "Public Access on branch_settings" ON public.branch_settings FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.daily_bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access on daily_bookings" ON public.daily_bookings;
CREATE POLICY "Public Access on daily_bookings" ON public.daily_bookings FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access on user_profiles" ON public.user_profiles;
CREATE POLICY "Public Access on user_profiles" ON public.user_profiles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access on activity_logs" ON public.activity_logs;
CREATE POLICY "Public Access on activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);
