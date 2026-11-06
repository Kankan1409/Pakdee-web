"use client";

import { useEffect, useState } from "react";
import { Invoice } from "@/types/dormitory";
import { requestPaymentSlips } from "@/lib/payment-slips-client";
import { X, RefreshCw, UploadCloud } from "lucide-react";

type Slip = {
  id: string; invoice_id: string; verification_status: "pending" | "passed" | "rejected";
  transaction_ref?: string; rejection_reason?: string; uploaded_at: string;
  invoices: { invoice_number: string } | null;
};

export function DatabaseSlipView({ propertyId, invoices }: { propertyId: string; invoices: Invoice[] }) {
  const [slips, setSlips] = useState<Slip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<Slip | null>(null);
  const [image, setImage] = useState("");
  const [imageError, setImageError] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSelected(null); setInvoiceNumber(""); setFile(null); setMessage("");
  }, [propertyId]);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(""); setSlips([]);
    requestPaymentSlips(propertyId, "list").then(r => r.json()).then(data => {
      if (!cancelled) setSlips(data.slips || []);
    }).catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [propertyId, revision]);
  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";
    setImage(""); setImageError("");
    if (selected) requestPaymentSlips(propertyId, "image", selected.id)
      .then(r => r.blob()).then(blob => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob); setImage(objectUrl);
      }).catch(e => { if (!cancelled) setImageError(e.message); });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [propertyId, selected]);

  const upload = async () => {
    if (!file || !invoiceNumber || busy) return;
    if (file.size > 10 * 1024 * 1024) { setError("รูปสลิปต้องไม่เกิน 10 MB"); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const form = new FormData(); form.set("image", file); form.set("invoiceNumber", invoiceNumber);
      const data = await (await requestPaymentSlips(propertyId, "upload", undefined, form)).json();
      setMessage(data.message); setRevision(n => n + 1);
    } catch (e) { setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ"); }
    finally { setBusy(false); }
  };
  const check = async (slip: Slip) => {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const data = await (await requestPaymentSlips(propertyId, "check", slip.id)).json();
      setMessage(data.message); setSelected({ ...slip, verification_status: data.status || slip.verification_status });
      setRevision(n => n + 1);
    } catch (e) { setError(e instanceof Error ? e.message : "ตรวจสอบไม่สำเร็จ"); }
    finally { setBusy(false); }
  };
  const labels = { pending: "รอตรวจสอบ", passed: "ผ่านการตรวจสอบ", rejected: "ไม่ผ่าน" };
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-xl font-bold">ตรวจสลิปโอนเงิน</h1>
        <p className="text-sm text-[var(--muted)]">ตรวจผ่าน Slip2Go และรับชำระอัตโนมัติเมื่อผ่าน · แสดง 200 รายการล่าสุด</p></div>
      <button type="button" disabled={loading} onClick={() => setRevision(n => n + 1)} className="flex items-center gap-2 rounded-lg border p-2 text-sm disabled:opacity-50"><RefreshCw size={16} /> โหลดใหม่</button>
    </div>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {message && <p role="status" className="rounded-lg bg-sky-50 p-3 text-sm text-sky-900">{message}</p>}
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
      <h2 className="font-semibold">เพิ่มหลักฐานการโอน</h2>
      <label className="block text-sm">บิลที่ต้องการแนบสลิป
        <select value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className="mt-1 block w-full rounded-lg border p-2 bg-[var(--card)]">
          <option value="">เลือกบิล</option>
          {invoices.map(inv => <option key={inv.id} value={inv.invoiceNumber}>{inv.invoiceNumber} · ห้อง {inv.roomNumber} · {inv.tenantName}</option>)}
        </select>
      </label>
      <label className="block text-sm">รูปสลิป (JPEG, PNG, WebP ไม่เกิน 10 MB)
        <input key={propertyId} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setFile(e.target.files?.[0] || null)} className="mt-1 block w-full text-sm" />
      </label>
      <button type="button" onClick={upload} disabled={busy || !file || !invoiceNumber} className="inline-flex items-center gap-2 bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50"><UploadCloud size={16}/>{busy ? "กำลังตรวจสอบ..." : "บันทึกและตรวจผ่าน Slip2Go"}</button>
    </div>
    <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
      <table className="w-full text-sm"><thead className="bg-[var(--subtle)]"><tr>
        <th className="p-3 text-left">บิล / ห้อง</th><th className="p-3 text-left">วันที่รับ</th><th className="p-3 text-left">สถานะ</th><th className="p-3">หลักฐาน</th>
      </tr></thead><tbody>
        {slips.map(slip => { const inv = invoices.find(i => i.invoiceNumber === slip.invoices?.invoice_number);
          return <tr key={slip.id} className="border-t border-[var(--border)]">
            <td className="p-3">{slip.invoices?.invoice_number || "—"}<div className="text-xs text-[var(--muted)]">{inv ? `ห้อง ${inv.roomNumber} · ${inv.tenantName}` : ""}</div></td>
            <td className="p-3">{new Date(slip.uploaded_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</td>
            <td className="p-3">{labels[slip.verification_status]}{slip.rejection_reason && <p className="text-xs text-rose-600">{slip.rejection_reason}</p>}</td>
            <td className="p-3 text-center whitespace-nowrap"><button type="button" onClick={() => setSelected(slip)} className="text-blue-600 underline mr-3">ดูรูป</button><button type="button" disabled={busy || slip.verification_status === "passed"} onClick={() => check(slip)} className="text-emerald-700 underline disabled:opacity-50">{busy ? "กำลังตรวจสอบ..." : "ตรวจผ่าน Slip2Go"}</button></td>
          </tr>; })}
        {!slips.length && <tr><td colSpan={4} className="p-8 text-center text-[var(--muted)]">{loading ? "กำลังโหลดสลิป..." : error ? "ยังโหลดรายการไม่ได้" : "ยังไม่มีสลิปที่บันทึกในตารางใหม่ของสาขานี้"}</td></tr>}
      </tbody></table>
    </div>
    {selected && <div className="fixed inset-0 z-[9999] bg-black/60 p-4 flex items-center justify-center" onClick={() => setSelected(null)}>
      <div role="dialog" aria-modal="true" aria-label="รูปหลักฐานการโอน" className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-xl bg-[var(--card)] p-5" onClick={e => e.stopPropagation()}>
        <button type="button" aria-label="ปิดรูปสลิป" onClick={() => setSelected(null)} className="absolute right-3 top-3 rounded bg-[var(--subtle)] p-2"><X size={20}/></button>
        <h2 className="font-semibold pr-10 mb-4">{selected.invoices?.invoice_number} · {labels[selected.verification_status]}</h2>
        {imageError ? <p role="alert" className="text-rose-600">{imageError}</p> : image ? <img src={image} alt="รูปสลิปจากฐานข้อมูล" className="w-full max-h-[70vh] object-contain" onError={() => setImageError("ไฟล์รูปสลิปไม่สามารถแสดงได้")}/> : <p>กำลังโหลดรูป...</p>}
        {message && <p className="mt-4 text-sm">{message}</p>}
      </div>
    </div>}
  </div>;
}
