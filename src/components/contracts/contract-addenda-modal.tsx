"use client";

/**
 * บันทึกแนบท้ายสัญญา (Addendum): เพิ่ม/เปลี่ยนเงื่อนไขหลังเซ็นสัญญาแล้ว เช่น เพิ่มเช่าตู้เย็น
 * สัญญาเดิมไม่ถูกแก้ — สร้างเอกสารแนบท้ายแยก ผู้ให้เช่าเซ็น (ใช้ลายเซ็นของสัญญาหลัก/ตั้งค่าสาขา)
 * แล้วส่งให้ผู้เช่าเซ็นทาง LINE (หน้า /sign เดียวกับสัญญา) รายการรายเดือนจะถูกคิดในบิลตั้งแต่วันที่มีผล
 */
import React, { useCallback, useEffect, useState } from "react";
import { ContractItem } from "@/types/dormitory";
import { requestContractAddenda } from "@/lib/payment-slips-client";
import { FilePlus2, Trash2, Eye, X, Printer } from "lucide-react";

interface AddendumItem {
  title: string;
  amount: number;
  type: "monthly" | "one_time";
}

export interface ContractAddendumRow {
  id: string;
  contract_number: string;
  addendum_no: number;
  room_number: string;
  tenant_name: string;
  effective_date: string;
  items: AddendumItem[];
  note: string | null;
  html: string | null;
  status: "pending" | "signed" | "cancelled";
  landlord_signature_url: string | null;
  tenant_signature_url: string | null;
  signed_at: string | null;
  created_at: string;
}

const PRESETS: AddendumItem[] = [
  { title: "ค่าเช่าตู้เย็น", amount: 300, type: "monthly" },
  { title: "ค่าเช่าทีวี", amount: 300, type: "monthly" },
  { title: "ค่าที่จอดรถ", amount: 300, type: "monthly" },
  { title: "ค่าอินเทอร์เน็ต", amount: 200, type: "monthly" },
];

const statusChip: Record<string, { text: string; cls: string }> = {
  pending: { text: "รอผู้เช่าเซ็น", cls: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  signed: { text: "มีผลแล้ว", cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  cancelled: { text: "ยกเลิก", cls: "bg-slate-500/10 text-slate-500 border-slate-500/30" },
};

function firstOfNextMonth(): string {
  const d = new Date();
  const n = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-01`;
}

export function ContractAddendaModal({
  contract,
  propertyId,
  landlordName,
  landlordSignatureUrl,
  onClose,
  onShowToast,
}: {
  contract: ContractItem;
  propertyId: string;
  landlordName: string;
  landlordSignatureUrl: string;
  onClose: () => void;
  onShowToast?: (message: string, type: "success" | "error" | "info" | "warning") => void;
}) {
  const [addenda, setAddenda] = useState<ContractAddendumRow[]>([]);
  const [loadError, setLoadError] = useState("");
  const [items, setItems] = useState<AddendumItem[]>([]);
  const [effectiveDate, setEffectiveDate] = useState(firstOfNextMonth());
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [viewing, setViewing] = useState<ContractAddendumRow | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await requestContractAddenda(propertyId, "list");
      setAddenda(((data.addenda || []) as ContractAddendumRow[]).filter((a) => a.contract_number === contract.contractNumber));
      setLoadError("");
    } catch (e: any) {
      setLoadError(e?.message || String(e));
    }
  }, [propertyId, contract.contractNumber]);

  useEffect(() => {
    load();
  }, [load]);

  const updateItem = (idx: number, patch: Partial<AddendumItem>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const send = async () => {
    setSending(true);
    try {
      const data = await requestContractAddenda(propertyId, "create", {
        contractId: contract.id,
        contractNumber: contract.contractNumber,
        roomNumber: contract.roomNumber,
        tenantName: contract.tenantName,
        tenantPhone: contract.tenantPhone,
        landlordName,
        landlordSignatureUrl,
        effectiveDate,
        items: items.filter((i) => i.title.trim()),
        note,
      });
      onShowToast?.(data.message || "ส่งบันทึกแนบท้ายแล้ว", "success");
      setItems([]);
      setNote("");
      await load();
    } catch (e: any) {
      onShowToast?.(e?.message || String(e), "error");
    } finally {
      setSending(false);
    }
  };

  const cancel = async (id: string) => {
    try {
      await requestContractAddenda(propertyId, "cancel", { id });
      onShowToast?.("ยกเลิกบันทึกแนบท้ายแล้ว", "info");
      await load();
    } catch (e: any) {
      onShowToast?.(e?.message || String(e), "error");
    }
  };

  const validItems = items.filter((i) => i.title.trim());
  const canSend = Boolean(landlordSignatureUrl) && (validItems.length > 0 || note.trim()) && Boolean(effectiveDate) && !sending;
  const inputCls = "px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white text-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2">
              <FilePlus2 className="w-4 h-4 text-purple-600" /> บันทึกแนบท้ายสัญญา
            </h3>
            <p className="text-[11px] text-slate-500">
              สัญญา {contract.contractNumber} · ห้อง {contract.roomNumber} · {contract.tenantName}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          {/* ฉบับที่มีอยู่ */}
          <div className="space-y-2">
            <div className="text-xs font-bold">บันทึกแนบท้ายของสัญญานี้</div>
            {loadError && <div className="text-[11px] text-rose-600">{loadError}</div>}
            {addenda.length === 0 && !loadError && <div className="text-[11px] text-slate-500">ยังไม่มีบันทึกแนบท้าย</div>}
            {addenda.map((a) => (
              <div key={a.id} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2 text-xs">
                <div>
                  <div className="font-semibold">
                    ฉบับที่ {a.addendum_no} · มีผล {new Date(a.effective_date).toLocaleDateString("th-TH")}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {(a.items || []).map((i) => `${i.title} ฿${Number(i.amount).toLocaleString()}${i.type === "monthly" ? "/เดือน" : ""}`).join(", ") ||
                      a.note}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${statusChip[a.status]?.cls || ""}`}>
                    {statusChip[a.status]?.text || a.status}
                  </span>
                  <button type="button" onClick={() => setViewing(a)} className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 cursor-pointer" title="ดูเอกสาร">
                    <Eye className="w-4 h-4" />
                  </button>
                  {a.status === "pending" && (
                    <button type="button" onClick={() => cancel(a.id)} className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer" title="ยกเลิก">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* สร้างฉบับใหม่ */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-xs font-bold">ทำบันทึกแนบท้ายฉบับใหม่</div>
            <label className="flex items-center gap-2 text-xs">
              <span>มีผลตั้งแต่วันที่</span>
              <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className={inputCls} />
            </label>

            <div className="space-y-1.5">
              <div className="text-xs">รายการที่เพิ่ม/เปลี่ยน</div>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.title}
                    type="button"
                    onClick={() => setItems((prev) => [...prev, { ...p }])}
                    className="px-2.5 py-1 rounded-lg border border-purple-200 bg-white text-purple-700 text-[11px] font-semibold hover:bg-purple-50 cursor-pointer"
                  >
                    + {p.title}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setItems((prev) => [...prev, { title: "", amount: 0, type: "monthly" }])}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 text-[11px] font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  + รายการอื่น
                </button>
              </div>
              {items.map((it, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-2">
                  <input value={it.title} onChange={(e) => updateItem(idx, { title: e.target.value })} placeholder="ชื่อรายการ" className={`${inputCls} flex-1 min-w-[140px]`} />
                  <input
                    type="number"
                    min={0}
                    value={it.amount}
                    onChange={(e) => updateItem(idx, { amount: Math.max(0, Number(e.target.value) || 0) })}
                    className={`${inputCls} w-24 text-right`}
                  />
                  <select value={it.type} onChange={(e) => updateItem(idx, { type: e.target.value as AddendumItem["type"] })} className={inputCls}>
                    <option value="monthly">บาท/เดือน</option>
                    <option value="one_time">บาท ครั้งเดียว</option>
                  </select>
                  <button type="button" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))} className="p-1 text-rose-500 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <label className="block text-xs space-y-1">
              <span>ข้อความเพิ่มเติม (ถ้ามี)</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={`${inputCls} w-full`} placeholder="เช่น ผู้เช่ารับผิดชอบความเสียหายของตู้เย็นที่เกิดจากการใช้งานผิดวิธี" />
            </label>

            {!landlordSignatureUrl && (
              <div className="text-[11px] text-rose-600">ผู้ให้เช่ายังไม่ได้เซ็น: เปิดดูสัญญาแล้วกด &quot;คลิกเพื่อเซ็น (ผู้ให้เช่า)&quot; ก่อน</div>
            )}
            <button
              type="button"
              onClick={send}
              disabled={!canSend}
              className="w-full py-2.5 rounded-xl bg-[#06C755] hover:bg-[#05b14c] text-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
            >
              {sending ? "กำลังส่ง..." : "ส่งให้ผู้เช่าเซ็นทาง LINE"}
            </button>
            <div className="text-[10px] text-slate-500">
              รายการ &quot;บาท/เดือน&quot; จะถูกคิดในบิลรายเดือนตั้งแต่เดือนที่มีผล · &quot;ครั้งเดียว&quot; คิดในบิลเดือนที่มีผลเดือนเดียว · คิดเฉพาะฉบับที่ผู้เช่าเซ็นแล้ว
            </div>
          </div>
        </div>
      </div>

      {/* ดูเอกสารบันทึกแนบท้าย */}
      {viewing && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 print:p-0 print:bg-white">
          <div className="bg-white text-black rounded-3xl w-full max-w-3xl shadow-2xl max-h-[92vh] flex flex-col p-6 print:max-h-none print:shadow-none print:rounded-none">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 print:hidden">
              <div className="text-xs font-bold">บันทึกแนบท้ายฉบับที่ {viewing.addendum_no}</div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => window.print()} className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer">
                  <Printer className="w-3.5 h-3.5" /> พิมพ์
                </button>
                <button type="button" onClick={() => setViewing(null)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto pt-4 space-y-4 text-[13px] leading-[1.8]">
              {/* เอกสารสร้างฝั่งเซิร์ฟเวอร์จากข้อมูลที่ escape แล้ว */}
              <div className="space-y-3" dangerouslySetInnerHTML={{ __html: viewing.html || "" }} />
              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-center text-xs">
                {[
                  { label: "ผู้ให้เช่า", name: landlordName, sig: viewing.landlord_signature_url },
                  { label: "ผู้เช่า", name: viewing.tenant_name, sig: viewing.tenant_signature_url },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="min-h-[64px] flex items-center justify-center border-b border-dashed border-slate-400 mb-2 pb-1">
                      {s.sig ? <img src={s.sig} alt={`ลายเซ็น${s.label}`} className="h-12 max-w-[180px] object-contain" /> : <div className="h-8" />}
                    </div>
                    <div>{s.label}</div>
                    <div className="text-[11px] text-slate-600 mt-0.5">( {s.name} )</div>
                  </div>
                ))}
              </div>
              {viewing.signed_at && (
                <div className="text-[10px] text-slate-500">ลงนามโดยผู้เช่าเมื่อ {new Date(viewing.signed_at).toLocaleString("th-TH")}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
