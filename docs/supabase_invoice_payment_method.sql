-- วิธีชำระเงินของบิล (ใช้แสดง "ชำระโดย" ในใบเสร็จรับเงิน) — 2026-11-12
-- รันใน Supabase SQL Editor ครั้งเดียว (รันซ้ำได้ ไม่เสียหาย)

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);   -- cash | transfer | promptpay | credit_card
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS slip_trans_ref VARCHAR(100);  -- เลขอ้างอิงธุรกรรมจากสลิป
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS slip_bank VARCHAR(100);       -- ธนาคารจากสลิป

-- เติมย้อนหลัง: บิลที่ชำระแล้วและมีสลิปที่ตรวจผ่าน (ส่งทาง LINE) = โอนเงิน + เลขอ้างอิง
UPDATE public.invoices AS i
SET payment_method = 'transfer',
    slip_trans_ref = COALESCE(i.slip_trans_ref, s.transaction_ref)
FROM public.payment_slips AS s
WHERE s.invoice_id = i.id
  AND s.verification_status = 'passed'
  AND i.status = 'paid'
  AND i.payment_method IS NULL;

-- บอก PostgREST ให้รู้จักคอลัมน์ใหม่ทันที
NOTIFY pgrst, 'reload schema';
