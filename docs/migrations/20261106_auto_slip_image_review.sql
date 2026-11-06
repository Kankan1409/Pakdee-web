BEGIN;
ALTER TABLE public.payment_slips ADD COLUMN IF NOT EXISTS review_method text;
ALTER TABLE public.payment_slips ADD COLUMN IF NOT EXISTS review_note text;
ALTER TABLE public.payment_slips ADD COLUMN IF NOT EXISTS review_evidence jsonb;

-- One transaction covers the slip, bill, application cache and payment ledger.
-- Only trusted server code can call this after OCR matching. This is NOT bank verification.
CREATE OR REPLACE FUNCTION public.accept_slip_image_match(
  p_slip uuid, p_property uuid, p_app_property text, p_app_invoice text,
  p_amount numeric, p_reference text, p_evidence jsonb
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.payment_slips%ROWTYPE;
  i public.invoices%ROWTYPE;
  records jsonb;
  app_invoice jsonb;
  payment jsonb;
  receipt jsonb;
  stamp text := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
BEGIN
  PERFORM pg_advisory_xact_lock(76110601);
  SELECT * INTO s FROM payment_slips WHERE id=p_slip AND property_id=p_property FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'slip_missing'; END IF;
  IF s.verification_status='passed' THEN RETURN 'already_passed'; END IF;
  IF s.verification_status<>'pending' THEN RETURN 'not_pending'; END IF;
  SELECT * INTO i FROM invoices WHERE id=s.invoice_id FOR UPDATE;
  IF NOT FOUND OR i.status NOT IN ('unpaid','overdue','pending_review') OR
     p_amount IS NULL OR p_amount<=0 OR i.total_amount<>p_amount THEN RETURN 'invoice_changed'; END IF;
  IF p_reference IS NULL OR p_reference !~ '^[A-Z0-9]{10,40}$' THEN RETURN 'invalid_reference'; END IF;
  IF EXISTS (SELECT 1 FROM payment_slips WHERE invoice_id<>s.invoice_id AND
      (image_sha256=s.image_sha256 OR upper(transaction_ref)=p_reference)) THEN RETURN 'duplicate'; END IF;
  SELECT value INTO records FROM pakdee_store WHERE key='pakdee_dev_invoices' FOR UPDATE;
  IF jsonb_typeof(records) IS DISTINCT FROM 'array' THEN RETURN 'invoice_changed'; END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(records) v WHERE v->>'id'=p_app_invoice
      AND v->>'propertyId'=p_app_property AND v->>'invoiceNumber'=i.invoice_number)<>1 THEN RETURN 'invoice_changed'; END IF;
  SELECT v INTO app_invoice FROM jsonb_array_elements(records) v WHERE v->>'id'=p_app_invoice
    AND v->>'propertyId'=p_app_property AND v->>'invoiceNumber'=i.invoice_number;
  IF app_invoice->>'status' NOT IN ('unpaid','overdue','pending_review') OR
     (app_invoice->>'totalAmount')::numeric IS DISTINCT FROM p_amount THEN RETURN 'invoice_changed'; END IF;
  UPDATE invoices SET status='paid',paid_at=now() WHERE id=i.id;
  UPDATE payment_slips SET verification_status='passed',verified_at=now(),transaction_ref=p_reference,
    review_method='image_match',review_note='Image matched only; bank transfer not verified',review_evidence=p_evidence
    WHERE id=s.id;
  UPDATE pakdee_store SET value=(SELECT jsonb_agg(CASE WHEN v->>'id'=p_app_invoice AND v->>'propertyId'=p_app_property
    THEN v || jsonb_build_object('status','paid','paidAmount',p_amount,'remainingAmount',0,'paidAt',stamp,
      'slipTransRef',p_reference,'slipHash',s.image_sha256,'slipVerifiedAt',stamp,'slipReviewMethod','image_match') ELSE v END)
    FROM jsonb_array_elements(records) v),updated_at=now() WHERE key='pakdee_dev_invoices';
  payment := jsonb_build_object('id','slip-payment-'||s.id,'paymentNumber','PMT-SLIP-'||s.id,
    'propertyId',p_app_property,'invoiceId',p_app_invoice,'roomNumber',app_invoice->>'roomNumber',
    'tenantName',app_invoice->>'tenantName','amount',p_amount,'paymentMethod','transfer','paidAt',stamp,
    'receivedBy','image_match','status','completed','notes','Image matched; bank transfer not verified',
    'version',1,'createdAt',stamp);
  receipt := jsonb_build_object('id','slip-receipt-'||s.id,'receiptNumber','REC-SLIP-'||s.id,
    'propertyId',p_app_property,'paymentId','slip-payment-'||s.id,'invoiceId',p_app_invoice,
    'roomNumber',app_invoice->>'roomNumber','tenantName',app_invoice->>'tenantName',
    'amount',p_amount,'issuedAt',stamp,'issuedBy','image_match');
  INSERT INTO pakdee_store(key,value,updated_at) VALUES('pakdee_dev_payments',jsonb_build_array(payment),now())
    ON CONFLICT(key) DO UPDATE SET value=jsonb_build_array(payment)||pakdee_store.value,updated_at=now();
  INSERT INTO pakdee_store(key,value,updated_at) VALUES('pakdee_dev_receipts',jsonb_build_array(receipt),now())
    ON CONFLICT(key) DO UPDATE SET value=jsonb_build_array(receipt)||pakdee_store.value,updated_at=now();
  RETURN 'passed';
END;
$$;
REVOKE ALL ON FUNCTION public.accept_slip_image_match(uuid,uuid,text,text,numeric,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.accept_slip_image_match(uuid,uuid,text,text,numeric,text,jsonb) TO service_role;
COMMIT;
