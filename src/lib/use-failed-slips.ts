"use client";

import { useEffect, useMemo, useState } from "react";
import { Invoice } from "@/types/dormitory";
import { requestPaymentSlips } from "@/lib/payment-slips-client";

/** A slip submission (payment_slips) that Slip2Go did not pass. */
export type FailedSlip = {
  id: string;
  verification_status: "pending" | "passed" | "rejected";
  rejection_reason?: string | null;
  uploaded_at: string;
  invoices: { invoice_number: string } | null;
};

export type FailedSlipEntry = { slip: FailedSlip; invoice?: Invoice };

/**
 * Loads slips that failed Slip2Go verification (fake, duplicate, wrong amount, ...) for a branch.
 * Read-only: it never changes an invoice or a slip. Reloads whenever `invoices` changes
 * (i.e. after the app refreshes its data). A failure is hidden once its bill is paid.
 *
 * Returns the failures newest first, and a map invoiceNumber -> latest failure for that bill.
 */
export function useFailedSlips(propertyId: string | undefined, invoices: Invoice[]) {
  const [failedSlips, setFailedSlips] = useState<FailedSlip[]>([]);

  useEffect(() => {
    if (!propertyId) return;
    let cancelled = false;
    requestPaymentSlips(propertyId, "list")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const slips: FailedSlip[] = Array.isArray(data?.slips) ? data.slips : [];
        setFailedSlips(slips.filter((s) => s.verification_status !== "passed" && !!s.rejection_reason));
      })
      .catch(() => {
        if (!cancelled) setFailedSlips([]);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId, invoices]);

  return useMemo(() => {
    const entries: FailedSlipEntry[] = failedSlips
      .map((slip) => ({ slip, invoice: invoices.find((i) => i.invoiceNumber === slip.invoices?.invoice_number) }))
      .filter(({ invoice }) => !invoice || invoice.status !== "paid");
    const byInvoiceNumber = new Map<string, FailedSlipEntry>();
    for (const entry of entries) {
      const num = entry.slip.invoices?.invoice_number;
      // list from the API is newest first: keep the first (latest) failure per bill
      if (num && !byInvoiceNumber.has(num)) byInvoiceNumber.set(num, entry);
    }
    return { entries, byInvoiceNumber };
  }, [failedSlips, invoices]);
}
