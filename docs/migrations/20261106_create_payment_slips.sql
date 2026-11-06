BEGIN;

CREATE TABLE public.payment_slips (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
    invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
    image_data bytea NOT NULL CHECK (octet_length(image_data) BETWEEN 1 AND 10485760),
    mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
    original_filename text,
    verification_status text NOT NULL DEFAULT 'pending'
        CHECK (verification_status IN ('pending', 'passed', 'rejected')),
    transaction_ref text,
    rejection_reason text,
    uploaded_at timestamptz NOT NULL DEFAULT now(),
    verified_at timestamptz,
    CHECK (verification_status = 'pending' OR verified_at IS NOT NULL)
);

CREATE INDEX payment_slips_invoice_uploaded_idx ON public.payment_slips (invoice_id, uploaded_at DESC);
CREATE INDEX payment_slips_property_status_idx ON public.payment_slips (property_id, verification_status);

-- Slip images are private; access must go through an authorized server endpoint.
ALTER TABLE public.payment_slips ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.payment_slips IS 'Payment slip images stored directly in PostgreSQL; multiple submissions per invoice.';
COMMENT ON COLUMN public.payment_slips.image_data IS 'Original image bytes, maximum 10 MiB. Do not include in invoice list queries.';

COMMIT;
