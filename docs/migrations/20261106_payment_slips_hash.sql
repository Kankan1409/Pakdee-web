BEGIN;
ALTER TABLE public.payment_slips ADD COLUMN image_sha256 text
  GENERATED ALWAYS AS (encode(sha256(image_data), 'hex')) STORED;
CREATE INDEX payment_slips_image_hash_idx ON public.payment_slips (image_sha256);
COMMIT;
