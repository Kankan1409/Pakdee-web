-- ==============================================================================
-- PAKDEE SYSTEM - SUPABASE REALTIME CLOUD INTEGRATION SCRIPT
-- วิธีใช้: นำโค้ดนี้ไปวางที่ Supabase SQL Editor แล้วกดปุ่ม RUN
-- ลิงก์: https://supabase.com/dashboard/project/qygelgekosmklwrgnaxq/sql/new
-- ==============================================================================

-- 1. สร้างตาราง State Store สำหรับบันทึกข้อมูลทุกหมวดหมู่แบบ Realtime Cloud Sync
CREATE TABLE IF NOT EXISTS public.pakdee_store (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. เปิดสิทธิ์การเข้าถึงแบบ Row Level Security (RLS) ให้เว็บและแอปอ่าน-เขียนได้
ALTER TABLE public.pakdee_store ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read and write to pakdee_store" ON public.pakdee_store;
CREATE POLICY "Allow public read and write to pakdee_store" 
ON public.pakdee_store 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 3. เปิดระบบ Supabase Realtime เพื่อให้ข้อมูลอัปเดตข้ามจอทันทีในระดับมิลลิวินาที
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'pakdee_store'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.pakdee_store;
    END IF;
END $$;
