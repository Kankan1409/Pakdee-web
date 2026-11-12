"use client";

import { useEffect, useState } from "react";
import { requestContractSign } from "@/lib/payment-slips-client";

export interface SignedContractEntry {
  contractNumber: string;
  roomNumber: string;
  tenantName: string;
  signedAt: string;
}

/**
 * Contracts the tenant signed through the LINE link in the last `days` days (for the bell).
 * Re-checks every 20 seconds and when the window gets focus, so the owner sees it without reloading.
 */
export function useSignedContracts(propertyId: string | undefined, days = 7): SignedContractEntry[] {
  const [entries, setEntries] = useState<SignedContractEntry[]>([]);

  useEffect(() => {
    if (!propertyId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const data = await requestContractSign(propertyId, "status");
        const since = Date.now() - days * 86400000;
        const list: SignedContractEntry[] = (data.requests || [])
          .filter((r: any) => r.status === "signed" && r.signed_at && new Date(r.signed_at).getTime() >= since)
          .map((r: any) => ({
            contractNumber: r.contract_number,
            roomNumber: r.room_number || "-",
            tenantName: r.tenant_name || "",
            signedAt: r.signed_at,
          }));
        if (!cancelled) setEntries(list);
      } catch {
        // not logged in / SQL not run — no bell items
      }
    };
    load();
    const timer = setInterval(load, 20000);
    window.addEventListener("focus", load);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [propertyId, days]);

  return entries;
}
