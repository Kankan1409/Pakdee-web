-- ============================================================================
-- Add tenant columns the app already sends/reads but the tenants table lacks.
-- Without them safeUpsert silently drops the values on every save, e.g. `notes`
-- holds the "[ผู้เข้าพักรายวัน]" marker, so after check-out (when the daily booking is
-- removed) a daily guest is shown as a monthly tenant.
-- Additive only, safe to run more than once. Column types/defaults follow
-- syncTenantsToSupabase() in src/lib/supabase-relational.ts.
-- ============================================================================
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT 'MALE';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS tax_id VARCHAR(20) DEFAULT '';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS id_card_image_url TEXT DEFAULT '';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS invoice_lang VARCHAR(10) DEFAULT 'TH';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

NOTIFY pgrst, 'reload schema';

-- ----------------------------------------------------------------------------
-- OPTIONAL: guests who already checked out lost their daily marker before this
-- fix. Only if T0002 (ข้าวหอม1) and T0003 (ข้าวหอม2) really were daily guests:
-- UPDATE public.tenants SET notes = '[ผู้เข้าพักรายวัน]'
-- WHERE id IN ('T0002', 'T0003') AND COALESCE(notes, '') = '';
-- ----------------------------------------------------------------------------
