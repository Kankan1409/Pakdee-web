-- ============================================================================
-- ผูกข้อมูลทุกตารางกับบัญชี (2026-11-19)
--
-- โครงสร้าง: บัญชี (user_profiles.id) → สาขา (properties.owner_id) → ทุกตาราง (property_id)
-- ไม่ใส่ owner_id ซ้ำในทุกตาราง: เจ้าของอยู่ที่สาขาจุดเดียว ข้อมูลจึงไม่มีทางขัดกันเอง
--
-- รันตามลำดับ (ทุกไฟล์รันซ้ำได้ ไม่ลบข้อมูล):
--   1) ส่วนท้ายของ docs/supabase_schema_short_ids.sql  → properties.owner_id / owner_phone
--   2) docs/supabase_branch_isolation.sql               → property_id ให้ tenants / daily_bookings / meter_readings
--   3) ไฟล์นี้                                           → property_id ให้ activity_logs
--   4) docs/supabase_tenant_links.sql                   → tenant_id ในสัญญา/การจอง
-- ============================================================================

-- activity_logs: เดิมไม่รู้ว่าเป็น log ของสาขาไหน → ทุกบัญชีเห็น log ของกันและกัน
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS property_id VARCHAR(64);
ALTER TABLE public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_property_id_fkey;
ALTER TABLE public.activity_logs ADD CONSTRAINT activity_logs_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS activity_logs_property_id_idx ON public.activity_logs(property_id);
-- log เก่าไม่มีข้อมูลสาขา เติมย้อนหลังไม่ได้ — จะไม่แสดงในบัญชีไหน (ไม่ถูกลบ)

-- ตรวจผล: แถวที่ยังไม่รู้สาขา (จะไม่แสดงในบัญชีไหนเลย)
SELECT 'rooms' AS table_name, COUNT(*) AS rows_without_branch FROM public.rooms WHERE property_id IS NULL
UNION ALL SELECT 'tenants', COUNT(*) FROM public.tenants WHERE property_id IS NULL
UNION ALL SELECT 'contracts', COUNT(*) FROM public.contracts WHERE property_id IS NULL
UNION ALL SELECT 'invoices', COUNT(*) FROM public.invoices WHERE property_id IS NULL
UNION ALL SELECT 'daily_bookings', COUNT(*) FROM public.daily_bookings WHERE property_id IS NULL
UNION ALL SELECT 'meter_readings', COUNT(*) FROM public.meter_readings WHERE property_id IS NULL
UNION ALL SELECT 'properties (ไม่มีเจ้าของ)', COUNT(*) FROM public.properties WHERE owner_id IS NULL;

NOTIFY pgrst, 'reload schema';
