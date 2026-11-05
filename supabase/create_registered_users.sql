-- ============================================================================
-- ตารางเก็บข้อมูลผู้สมัครสมาชิกใหม่ (/register) บน Supabase
-- วิธีใช้: คัดลอกโค้ดนี้ไปวางใน Supabase Dashboard -> SQL Editor -> กด Run
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.registered_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text UNIQUE NOT NULL,
  email text,
  password text NOT NULL,
  role text DEFAULT 'owner',
  role_title text DEFAULT 'เจ้าของหอพัก (Owner / Super Admin)',
  avatar_text text,
  dormitory_name text,
  created_at timestamptz DEFAULT now()
);

-- เปิดใช้งาน RLS และอนุญาตให้เว็บแอปอ่าน/เขียนตาราง registered_users ได้
ALTER TABLE public.registered_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access to registered_users" ON public.registered_users;
CREATE POLICY "Allow public access to registered_users"
  ON public.registered_users
  FOR ALL
  USING (true)
  WITH CHECK (true);

