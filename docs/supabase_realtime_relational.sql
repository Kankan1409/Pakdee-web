-- ============================================================================
-- Enable Supabase Realtime for the relational tables used by the web app.
-- Without this, other devices never get notified of changes (e.g. a new branch)
-- and only see them after a manual page refresh.
-- Safe to run more than once.
-- ============================================================================
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY[
        'properties', 'branch_settings', 'buildings', 'rooms', 'tenants',
        'contracts', 'invoices', 'invoice_items', 'meter_readings',
        'repairs', 'expenses', 'daily_bookings', 'payment_slips'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t)
           AND NOT EXISTS (
               SELECT 1 FROM pg_publication_tables
               WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
           ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END $$;
