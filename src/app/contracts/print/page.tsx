"use client";

import React, { useEffect, useState } from "react";
import {
  ContractPrintView,
  PrintableContractData,
} from "@/components/contracts/contract-print-view";
import { DatabaseService } from "@/lib/database.service";
import { Property } from "@/types/dormitory";

const PRINT_DRAFT_STORAGE_KEY = "pakdee_contract_print_draft";

export default function ContractPrintPage() {
  const [draftData, setDraftData] = useState<Partial<PrintableContractData> | undefined>(undefined);
  const [property, setProperty] = useState<Property | undefined>(undefined);
  const [isReady, setIsReady] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    async function initPage() {
      try {
        if (typeof window !== "undefined") {
          const savedDraft = localStorage.getItem(PRINT_DRAFT_STORAGE_KEY);
          if (savedDraft) {
            const parsed = JSON.parse(savedDraft);
            if (parsed && typeof parsed === "object" && mounted) {
              setDraftData(parsed);
            }
          }
        }

        const activePropId = DatabaseService.getActivePropertyId();
        const prop = await DatabaseService.getProperty(activePropId);
        if (prop && mounted) {
          setProperty(prop);
        }
      } catch {
        // Fallback to default printable template
      } finally {
        if (mounted) {
          setIsReady(true);
        }
      }
    }

    initPage();
    return () => {
      mounted = false;
    };
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F8F7F4]">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return <ContractPrintView initialData={draftData} property={property} />;
}
