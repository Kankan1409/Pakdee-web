-- ============================================================================
-- Keep the tenant name/phone written on each bill.
-- The invoices table had no tenant_name column, so after a reload a bill showed
-- only the name of its linked tenant (tenant_id) or "ผู้เช่า". Daily bills
-- (INV-D-...) are often not linked once the guest checks out, so they lost the
-- guest's name. The app already sends these fields (syncInvoicesToSupabase).
-- Additive only, safe to run more than once.
-- ============================================================================
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tenant_name TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tenant_phone VARCHAR(50);

NOTIFY pgrst, 'reload schema';
