"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, CheckCircle2, FileSignature, FileText, LockKeyhole, PenLine, Plus, Printer, Save, Search } from "lucide-react";
import type { Property, Room } from "@/types/dormitory";
import { consentText, createLease, documentHash, readLeases, roleLabels, saveLease, validateLease } from "@/lib/leases";
import type { LeaseDetails, LeaseRecord, SignerRole } from "@/lib/leases";
import { LineSigningDemo } from "./line-signing-demo";
import { SignaturePad } from "./signature-pad";

const roles: SignerRole[] = ["landlord", "tenant", "witness1", "witness2"];
const money = (value: number) => value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = (value: string) => value ? new Date(`${value}T12:00:00+07:00`).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" }) : "ยังไม่ระบุ";
const time = (value: string) => new Date(value).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
const leaseLabel = (r: LeaseRecord) => `สัญญาเช่า ห้อง ${r.details.roomNumber} / ${Number((r.details.agreementDate || r.createdAt).slice(0, 4)) + 543}`;
const locked = (r: LeaseRecord) => Object.keys(r.signatures).length > 0;
const complete = (r: LeaseRecord) => roles.filter(role => r.details[role].trim()).every(role => Boolean(r.signatures[role])) && Boolean(r.signatures.landlord && r.signatures.tenant);
const status = (r: LeaseRecord) => complete(r) ? "ลงนามครบแล้ว" : locked(r) ? "รอลงนามเพิ่มเติม" : "ฉบับร่าง";
const inputClass = "w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 disabled:opacity-70";
const primary = "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40";
const secondary = "inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm hover:bg-[var(--subtle)] disabled:opacity-40";

export function DigitalLeases({ rooms, property }: { rooms: Room[]; property: Property }) {
  const [records, setRecords] = useState<LeaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<LeaseRecord | null>(null);
  const [demo, setDemo] = useState<LeaseRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [roomId, setRoomId] = useState("");
  async function refresh() {
    try { setRecords(await readLeases()); setError(""); } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }
  useEffect(() => {
    let alive = true;
    readLeases().then(rows => { if (alive) setRecords(rows); })
      .catch(e => { if (alive) setError((e as Error).message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const current = records.filter(r => r.propertyId === property.id);
  const occupied = rooms.filter(r => r.currentTenant && (!r.propertyId || r.propertyId === property.id));
  const filtered = current.filter(r => `${r.details.roomNumber} ${r.details.tenant}`.toLowerCase().includes(query.toLowerCase()) && (filter === "all" || (filter === "signed" ? complete(r) : filter === "pending" ? locked(r) && !complete(r) : !locked(r))));
  if (selected) return <LeaseEditor key={selected.id} initial={selected} onBack={() => { setSelected(null); void refresh(); }} onSaved={r => setRecords(prev => [r, ...prev.filter(x => x.id !== r.id)])} />;
  return <section className="space-y-6">
    {demo && <LineSigningDemo record={demo} onClose={() => setDemo(null)} renderDocument={r => <LeaseDocument record={r} />} />}
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-widest text-emerald-600 dark:text-emerald-400"><FileSignature size={16} /> DIGITAL LEASES</div><h2 className="text-2xl font-bold">สัญญาเช่าดิจิทัล</h2><p className="mt-2 text-sm text-[var(--muted)]">เตรียมสัญญา ตรวจทาน และลงนามในที่เดียว</p></div>
      <div className="flex flex-wrap gap-2"><button className={secondary} disabled={!occupied.length} onClick={() => setDemo(createLease(property, occupied[0]))}>ทดลองส่งสัญญาทาง LINE</button>
      <button className={primary} disabled={loading || Boolean(error) || !occupied.length} onClick={() => { setRoomId(occupied[0]?.id || ""); setCreating(true); }}><Plus size={17} />สร้างสัญญาใหม่</button></div>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">{[["สัญญาทั้งหมด", current.length, FileText], ["รอลงนาม", current.filter(r => !complete(r)).length, PenLine], ["ลงนามครบแล้ว", current.filter(complete).length, CheckCircle2]].map(([label, value, Icon]) => { const Symbol = Icon as typeof FileText; return <div key={String(label)} className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"><div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-600"><Symbol size={22} /></div><div><div className="text-2xl font-semibold">{String(value)}</div><div className="text-xs text-[var(--muted)]">{String(label)}</div></div></div>; })}</div>
    <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-[var(--muted)]">โหมดทดลอง • สัญญาใหม่เก็บแยกจากสัญญาเดิมและฐานข้อมูลหอพัก บันทึกเฉพาะเบราว์เซอร์นี้บนเครื่องนี้ • ยังไม่ซิงก์กับฐานข้อมูลหรือส่งลิงก์ให้เซ็นจากเครื่องอื่น ควรพิมพ์เก็บเป็น PDF หลังลงนาม การล้างข้อมูลเว็บไซต์จะลบสัญญาที่บันทึกไว้</p>
    {error && <div role="alert" className="text-sm text-red-500">{error} <button className="underline" onClick={() => void refresh()}>ลองอีกครั้ง</button></div>}
    {creating && <div className="rounded-2xl border border-emerald-500/40 bg-[var(--card)] p-5"><label className="mb-3 block text-sm font-medium" htmlFor="lease-room">เลือกห้องและผู้เช่า</label><div className="flex flex-wrap gap-3"><select id="lease-room" className={`${inputClass} max-w-lg`} value={roomId} onChange={e => setRoomId(e.target.value)}>{occupied.map(r => <option key={r.id} value={r.id}>ห้อง {r.roomNumber} — {r.currentTenant?.fullName}</option>)}</select><button className={primary} onClick={() => { const room = occupied.find(r => r.id === roomId); if (room) { setSelected(createLease(property, room)); setCreating(false); } }}>เริ่มร่างสัญญา</button><button className={secondary} onClick={() => setCreating(false)}>ยกเลิก</button></div></div>}
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <div className="flex flex-wrap gap-3 border-b border-[var(--border)] p-4"><label className="flex min-w-0 flex-1 items-center gap-2"><Search size={18} className="text-[var(--muted)]" /><input aria-label="ค้นหาสัญญา" className={inputClass} placeholder="ค้นหาชื่อผู้เช่าหรือเลขห้อง" value={query} onChange={e => setQuery(e.target.value)} /></label><select aria-label="กรองสถานะสัญญา" className={`${inputClass} !w-auto`} value={filter} onChange={e => setFilter(e.target.value)}><option value="all">ทุกสถานะ</option><option value="draft">ฉบับร่าง</option><option value="pending">รอลงนามเพิ่มเติม</option><option value="signed">ลงนามครบแล้ว</option></select></div>
      {loading ? <p className="p-12 text-center text-sm">กำลังโหลดสัญญา…</p> : !filtered.length ? <div className="px-5 py-14 text-center"><FileSignature className="mx-auto mb-4 text-emerald-500" size={36} /><h3 className="font-semibold">{current.length ? "ไม่พบสัญญาที่ค้นหา" : "เริ่มต้นสัญญาฉบับแรก"}</h3><p className="mt-2 text-sm text-[var(--muted)]">{!occupied.length ? "เพิ่มผู้เช่าให้ห้องพักก่อนสร้างสัญญา" : "เลือกห้องพัก แล้วตรวจรายละเอียดก่อนส่งเครื่องให้คู่สัญญาลงนาม"}</p></div> : <div className="divide-y divide-[var(--border)]">{filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(r => <div key={r.id} className="flex flex-wrap items-center gap-4 p-5"><div className="rounded-xl bg-[var(--subtle)] px-4 py-3 text-center"><div className="text-[10px] text-[var(--muted)]">ห้อง</div><div className="text-lg font-semibold">{r.details.roomNumber}</div></div><div className="min-w-0 flex-1"><p className="font-semibold">{r.details.tenant}</p><p className="mt-1 text-xs text-[var(--muted)]">{date(r.details.startDate)} – {date(r.details.endDate)}</p><p className="mt-1 text-xs text-[var(--muted)]">ค่าเช่า {money(r.details.rent)} บาท/เดือน · {leaseLabel(r)}</p></div><span className={`rounded-full px-3 py-1 text-xs ${complete(r) ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>{status(r)}</span><button className={secondary} onClick={() => setSelected(r)}><FileText size={15} />เปิดสัญญา</button></div>)}</div>}
    </div>
  </section>;
}

function LeaseEditor({ initial, onBack, onSaved }: { initial: LeaseRecord; onBack: () => void; onSaved: (r: LeaseRecord) => void }) {
  const [record, setRecord] = useState(initial);
  const [tab, setTab] = useState<"details" | "preview" | "sign">(locked(initial) ? "preview" : "details");
  const [showLineDemo, setShowLineDemo] = useState(false);
  const [dirty, setDirty] = useState(initial.revision === 0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [role, setRole] = useState<SignerRole>("landlord");
  const [signature, setSignature] = useState("");
  const [consent, setConsent] = useState(false);
  const [checked, setChecked] = useState(false);
  const [padKey, setPadKey] = useState(0);
  const [verified, setVerified] = useState(!locked(initial));
  const documentRef = useRef<HTMLDivElement>(null);
  const saving = useRef(false);
  const isLocked = locked(record);
  const d = record.details;
  useEffect(() => {
    let alive = true;
    documentHash(initial).then(hash => {
      const valid = Object.values(initial.signatures).every(s => s.documentHash === hash);
      if (alive) { setVerified(valid); if (!valid) setError("เนื้อหาไม่ตรงกับฉบับที่ลงนาม ไม่สามารถลงนามเพิ่มหรือพิมพ์เป็นสัญญาได้"); }
    }).catch(() => { if (alive) { setVerified(false); setError("ไม่สามารถตรวจสอบเอกสารได้ กรุณาใช้ localhost หรือ HTTPS"); } });
    return () => { alive = false; };
  }, [initial]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty || signature) e.preventDefault(); };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, signature]);
  function update<K extends keyof LeaseDetails>(key: K, value: LeaseDetails[K]) { setRecord(prev => ({ ...prev, details: { ...prev.details, [key]: value } })); setDirty(true); setChecked(false); setMessage(""); }
  async function persist(next = record) {
    const saved = await saveLease(next); setRecord(saved); onSaved(saved); setDirty(false); return saved;
  }
  async function saveDraft() {
    if (saving.current) return; saving.current = true; setBusy(true); setError("");
    try { await persist(); setMessage("บันทึกฉบับร่างในเบราว์เซอร์นี้แล้ว"); } catch (e) { setError((e as Error).message); } finally { saving.current = false; setBusy(false); }
  }
  async function sign() {
    if (saving.current) return;
    const invalid = validateLease(d);
    if (invalid) { setError(invalid); return; }
    if (!signature || !consent || !checked || !verified || record.signatures[role] || !d[role].trim()) return;
    saving.current = true; setBusy(true); setError("");
    try {
      const hash = await documentHash(record);
      if (Object.values(record.signatures).some(s => s.documentHash !== hash)) throw new Error("เนื้อหาสัญญาไม่ตรงกับลายเซ็นเดิม");
      await persist({ ...record, signatures: { ...record.signatures, [role]: { name: d[role].trim(), image: signature, signedAt: new Date().toISOString(), consent: consentText, documentHash: hash } } });
      setSignature(""); setConsent(false); setPadKey(k => k + 1); setMessage(`บันทึกลายเซ็น${roleLabels[role]}แล้ว`);
    } catch (e) { setError((e as Error).message); } finally { saving.current = false; setBusy(false); }
  }
  async function print() {
    if (!verified || busy) return;
    setBusy(true); setError("");
    try {
      if (dirty) await persist();
      const frame = document.createElement("iframe"); frame.style.cssText = "position:fixed;left:-10000px;top:0;width:900px;height:1000px;border:0"; frame.title = "พิมพ์สัญญาเช่า"; document.body.appendChild(frame);
      const doc = frame.contentDocument!; doc.open(); doc.write('<!doctype html><html lang="th"><head><meta charset="utf-8"><title>สัญญาเช่า</title></head><body></body></html>'); doc.close();
      const style = doc.createElement("style"); style.textContent = `@font-face { font-family: 'TH Sarabun New'; src: url('${window.location.origin}/fonts/THSarabunNew.ttf') format('truetype'); font-weight: 400; font-style: normal; }
@font-face { font-family: 'TH Sarabun New'; src: url('${window.location.origin}/fonts/THSarabunNewBold.ttf') format('truetype'); font-weight: 700; font-style: normal; }
@page { size: A4; margin: 17mm 18mm 18mm; }
body { font-family: 'TH Sarabun New', sans-serif; color: #172033; margin: 0; }
* { box-sizing: border-box; }
.lease-paper { padding: 0 !important; box-shadow: none !important; border: 0 !important; font-size: 16pt !important; line-height: 1.4 !important; }
.lease-paper h1 { font-size: 26pt; line-height: 1.4; margin: 10px 0 8px; text-align: center; letter-spacing: .2px; }
.lease-paper h2 { font-size: 18pt; margin: 20px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #cbd5e1; break-after: avoid; }
.lease-paper p { margin: 7px 0; orphans: 3; widows: 3; }
.paper-top { text-align: center; border-bottom: 2px solid #334155; padding-bottom: 16px; margin-bottom: 18px; }
.paper-meta { font-size: 13pt; color: #475569; }
.paper-top > p { font-size: 14pt; color: #475569; }
.paper-date { text-align: right; font-size: 14pt; margin: 14px 0 20px !important; }
.paper-parties { border-left: 3px solid #cbd5e1; padding-left: 14px; }
.paper-parties p + p { margin-top: 12px; }
.paper-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid #cbd5e1; margin: 16px 0 10px; break-inside: avoid; }
.paper-grid p { margin: 0; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
.paper-grid p:nth-child(odd) { border-right: 1px solid #e2e8f0; }
.paper-grid p:nth-last-child(-n+2) { border-bottom: 0; }
.paper-note { font-size: 12pt; color: #64748b; }
.paper-terms { white-space: pre-wrap; overflow-wrap: anywhere; }
.paper-terms p { margin: 0 0 13px; break-inside: avoid; }
.paper-clause-title { display: block; font-weight: 700; margin-bottom: 4px; }
.paper-acceptance { margin-top: 20px !important; }
.paper-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24px 36px; margin-top: 26px; }
.paper-signature { break-inside: avoid; text-align: center; padding: 8px 10px; }
.paper-signature img { height: 75px; width: 100%; object-fit: contain; display: block; }
.paper-signature .blank { height: 75px; }
.paper-signature > p:nth-last-child(2) { border-top: 1px solid #94a3b8; padding-top: 6px; }
.paper-signature p { margin: 4px 0; font-size: 14pt; }
.paper-signature p:last-child { font-size: 12pt; }
.paper-evidence { font-size: 12pt; line-height: 1.65; color: #64748b; overflow-wrap: anywhere; break-inside: avoid; margin-top: 24px; border-top: 1px solid #cbd5e1; padding-top: 10px; }
.paper-banner { border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-size: 14pt; margin-bottom: 16px !important; }
img { max-width: 100%; }
`;
      doc.head.appendChild(style); if (documentRef.current) doc.body.appendChild(documentRef.current.cloneNode(true));
      await Promise.all([
        doc.fonts.load('400 16px "TH Sarabun New"', 'สัญญา Lease'),
        doc.fonts.load('700 16px "TH Sarabun New"', 'สัญญา Lease'),
      ]);
      await doc.fonts.ready;
      await Promise.all(Array.from(doc.images).map(img => img.decode().catch(() => undefined)));
      frame.contentWindow!.addEventListener("afterprint", () => frame.remove(), { once: true });
      frame.contentWindow!.focus(); frame.contentWindow!.print(); setTimeout(() => frame.remove(), 60000);
    } catch (e) { setError(`เตรียมเอกสารไม่สำเร็จ: ${(e as Error).message}`); } finally { setBusy(false); }
  }
  function field(key: keyof LeaseDetails, label: string, type = "text") {
    return <label key={key} className="block text-xs font-medium text-[var(--muted)]">{label}<input className={`${inputClass} mt-1.5`} type={type} value={d[key]} disabled={isLocked || busy} min={type === "number" ? (key === "dueDay" ? 1 : 0) : undefined} max={key === "dueDay" ? 28 : undefined} step={key === "dueDay" ? 1 : type === "number" ? "0.01" : undefined} onChange={e => update(key, type === "number" ? Number(e.target.value) : e.target.value)} /></label>;
  }
  return <section className="space-y-5">
    {showLineDemo && <LineSigningDemo record={record} onClose={() => setShowLineDemo(false)} renderDocument={r => <LeaseDocument record={r} />} />}
    <button className="flex items-center gap-2 text-sm text-[var(--muted)]" disabled={busy} onClick={() => { if ((!dirty && !signature) || window.confirm("มีข้อมูลหรือลายเซ็นที่ยังไม่บันทึก ต้องการออกจากเอกสารหรือไม่?")) onBack(); }}><ArrowLeft size={16} />กลับไปหน้าสัญญา</button>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">สัญญาห้อง {d.roomNumber}</h2><p className="mt-1 text-xs text-[var(--muted)]">{d.tenant} · {leaseLabel(record)} · {status(record)}</p></div><div className="flex flex-wrap gap-2"><button className={secondary} disabled={busy} onClick={() => setShowLineDemo(true)}>ส่งทาง LINE (ตัวอย่าง)</button>{!isLocked && <button className={secondary} disabled={busy} onClick={() => void saveDraft()}><Save size={15} />บันทึกฉบับร่าง</button>}<button className={primary} disabled={busy || !verified} onClick={() => void print()}><Printer size={15} />พิมพ์ / บันทึก PDF</button></div></div>
    {error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}{message && <p role="status" className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-600">{message}</p>}
    <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-3">{([["details", "1. รายละเอียดสัญญา"], ["preview", "2. ตรวจทานเอกสาร"], ["sign", "3. ลงลายเซ็น"]] as const).map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`rounded-xl px-4 py-2.5 text-sm ${tab === id ? "bg-emerald-600 text-white" : "text-[var(--muted)] hover:bg-[var(--subtle)]"}`}>{label}</button>)}</div>
    {isLocked && <p className="flex items-center gap-2 text-xs text-[var(--muted)]"><LockKeyhole size={15} />เนื้อหาถูกล็อกหลังลงนาม หากต้องแก้ไข ให้สร้างสัญญาใหม่โดยเก็บฉบับนี้ไว้</p>}
    {tab === "details" && <div className="space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-7">
      <div><h3 className="mb-4 font-semibold">คู่สัญญาและสถานที่</h3><div className="grid gap-4 md:grid-cols-2">{field("landlord", "ชื่อผู้ให้เช่า / ผู้มีอำนาจลงนาม *")}{field("landlordPhone", "โทรศัพท์ผู้ให้เช่า")}{field("tenant", "ชื่อผู้เช่า *")}{field("tenantPhone", "โทรศัพท์ผู้เช่า")}{field("tenantIdCard", "เลขประจำตัวผู้เช่า (ถ้ามี)")}{field("tenantAddress", "ที่อยู่ผู้เช่า *")}{field("propertyAddress", "ที่อยู่ที่พัก *")}{field("madeAt", "สถานที่ทำสัญญา *")}{field("witness1", "ชื่อพยาน 1 (ไม่บังคับ)")}{field("witness2", "ชื่อพยาน 2 (ไม่บังคับ)")}</div></div>
      <div><h3 className="mb-4 font-semibold">ระยะเวลาและค่าใช้จ่าย</h3><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{field("agreementDate", "วันที่ทำสัญญา *", "date")}{field("startDate", "วันเริ่มสัญญา *", "date")}{field("endDate", "วันสิ้นสุดสัญญา *", "date")}{field("rent", "ค่าเช่าต่อเดือน (บาท)", "number")}{field("deposit", "เงินประกันที่ตกลง (บาท)", "number")}{field("advance", "ค่าเช่าล่วงหน้า (บาท)", "number")}{field("dueDay", "ชำระภายในวันที่ (1–28)", "number")}{field("electricRate", "ค่าไฟต่อหน่วย (บาท)", "number")}{field("waterRate", "ค่าน้ำต่อหน่วย (บาท)", "number")}</div></div>
      <label className="block"><span className="font-semibold">ข้อตกลงและเงื่อนไข</span><p className="mb-3 mt-1 text-xs text-[var(--muted)]">ปรับข้อความตัวอย่างให้ตรงกับข้อตกลงของคู่สัญญาก่อนลงนาม</p><textarea aria-label="ข้อตกลงและเงื่อนไข" rows={16} className={`${inputClass} leading-7`} disabled={isLocked || busy} value={d.terms} onChange={e => update("terms", e.target.value)} /></label>
      <div className="flex justify-end"><button className={primary} onClick={() => { const invalid = validateLease(d); if (invalid) { setError(invalid); return; } setError(""); setTab("preview"); }}>ตรวจทานเอกสาร <FileText size={16} /></button></div>
    </div>}
    <div className={tab === "details" ? "hidden" : "grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"}>
      <LeaseDocument record={record} documentRef={documentRef} />
      <aside className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 xl:sticky xl:top-4">
        <h3 className="flex items-center gap-2 font-semibold"><PenLine size={18} className="text-emerald-500" />ลายเซ็นอิเล็กทรอนิกส์</h3>
        <p className="text-xs leading-relaxed text-[var(--muted)]">ให้เจ้าของลายเซ็นอ่านและลงนามด้วยตนเองบนเครื่องนี้ ชื่อและเวลาจะถูกบันทึกพร้อมเนื้อหาสัญญา โดยยังไม่มีการยืนยันตัวตนผ่าน OTP</p>
        <div className="space-y-2">{roles.filter(r => d[r].trim()).map(r => <div key={r} className="flex items-center justify-between rounded-xl bg-[var(--subtle)] p-3 text-xs"><div><p className="text-[var(--muted)]">{roleLabels[r]}</p><p className="mt-1 font-medium">{d[r]}</p></div>{record.signatures[r] ? <CheckCircle2 size={18} className="text-emerald-500" /> : <span className="text-amber-600">รอลงนาม</span>}</div>)}</div>
        {complete(record) ? <div className="rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-600"><CheckCircle2 className="mb-2" />ลงนามครบแล้ว พร้อมพิมพ์เก็บเป็น PDF</div> : <>
          <label className="flex gap-2 text-xs leading-6"><input type="checkbox" checked={checked} disabled={busy} onChange={e => setChecked(e.target.checked)} className="mt-1 accent-emerald-600" />ตรวจทานเนื้อหาและรายละเอียดสัญญาฉบับนี้ครบแล้ว</label>
          {tab === "preview" ? <button className={`${primary} w-full`} disabled={!checked || !verified} onClick={() => { const invalid = validateLease(d); if (invalid) { setError(invalid); return; } setError(""); setTab("sign"); }}>ไปลงลายเซ็น <PenLine size={16} /></button> : <>
            <label className="block text-xs">ผู้ลงนาม<select className={`${inputClass} mt-2`} value={role} disabled={busy} onChange={e => { setRole(e.target.value as SignerRole); setSignature(""); setConsent(false); setPadKey(k => k + 1); }}>{roles.filter(r => r === "landlord" || r === "tenant" || d[r].trim()).map(r => <option key={r} value={r}>{roleLabels[r]} — {d[r] || "ยังไม่ระบุชื่อ"}</option>)}</select></label>
            {record.signatures[role] ? <p className="text-sm text-emerald-600">ผู้ลงนามคนนี้ลงนามแล้ว กรุณาเลือกคนถัดไป</p> : <><SignaturePad key={`${role}-${padKey}`} onChange={setSignature} disabled={busy} /><label className="flex gap-2 text-xs leading-6"><input type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)} className="mt-1 accent-emerald-600" /><span>{consentText}</span></label><p className="text-[11px] text-[var(--muted)]">เมื่อยืนยัน จะล็อกข้อความในสัญญาและบันทึกลายเซ็นของ {d[role] || "ผู้ลงนาม"}</p><button className={`${primary} w-full`} disabled={busy || !signature || !consent || !checked || !verified || !d[role].trim()} onClick={() => void sign()}><Check size={16} />{busy ? "กำลังบันทึก…" : "ยืนยันลงนามและบันทึก"}</button></>}
          </>}
        </>}
      </aside>
    </div>
  </section>;
}

function LeaseDocument({ record, documentRef }: { record: LeaseRecord; documentRef?: React.RefObject<HTMLDivElement | null> }) {
  const d = record.details;
  return <div ref={documentRef} className="lease-paper min-w-0 rounded-xl border border-slate-200 bg-white p-5 text-slate-800 shadow-sm sm:p-10" style={{ fontFamily: "\"TH Sarabun New\", sans-serif", fontSize: 20, lineHeight: 1.5 }}>
    <div className="paper-top mb-6 border-b border-slate-200 pb-5 text-center"><div className="paper-meta text-xs text-slate-500">{d.propertyName} · {leaseLabel(record)}</div><h1 className="mt-3 text-2xl font-bold">สัญญาเช่าที่พักอาศัย</h1><p className="mt-2 text-xs text-slate-500">ห้อง {d.roomNumber} · {status(record)}</p></div>
    {!complete(record) && <p className="paper-banner mb-5 rounded-lg bg-slate-100 p-2 text-center text-xs">{locked(record) ? "เอกสารอยู่ระหว่างการลงนาม — ยังลงนามไม่ครบ" : "ฉบับร่าง — ยังไม่ได้ลงนาม"}</p>}
    <p className="paper-date text-right">ทำที่ {d.madeAt || "……………………"}<br />วันที่ {date(d.agreementDate)}</p>
    <h2 className="mb-2 mt-6 font-bold">คู่สัญญา</h2>
    <div className="paper-parties border-l-2 border-slate-200 pl-4"><p>สัญญาฉบับนี้ทำขึ้นระหว่าง <strong>{d.landlord || "……………………"}</strong> ผู้ให้เช่า / ผู้มีอำนาจลงนามของ {d.propertyName} ที่อยู่ {d.propertyAddress || "……………………"} โทรศัพท์ {d.landlordPhone || "—"}</p>
    <p className="mt-2">กับ <strong>{d.tenant}</strong> ผู้เช่า เลขประจำตัว {d.tenantIdCard || "ยังไม่ระบุ"} ที่อยู่ {d.tenantAddress || "……………………"} โทรศัพท์ {d.tenantPhone || "—"} ทั้งสองฝ่ายตกลงทำสัญญาเช่าโดยมีรายละเอียดดังนี้</p></div>
    <h2 className="mb-2 mt-6 font-bold">รายละเอียดการเช่า</h2>
    <p>ห้องพักเลขที่ <strong>{d.roomNumber}</strong> ชั้น {d.floor} ของ {d.propertyName} ตั้งอยู่ที่ {d.propertyAddress || "……………………"} เพื่อใช้เป็นที่พักอาศัย</p>
    <p>เริ่มเช่าวันที่ <strong>{date(d.startDate)}</strong> ถึงวันที่ <strong>{date(d.endDate)}</strong></p>
    <div className="paper-grid my-4 grid gap-2 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"><p>ค่าเช่าเดือนละ <strong>{money(d.rent)} บาท</strong></p><p>ชำระภายในวันที่ <strong>{d.dueDay}</strong> ของเดือน</p><p>เงินประกัน <strong>{money(d.deposit)} บาท</strong></p><p>ค่าเช่าล่วงหน้า <strong>{money(d.advance)} บาท</strong></p><p>ค่าไฟ {money(d.electricRate)} บาท/หน่วย</p><p>ค่าน้ำ {money(d.waterRate)} บาท/หน่วย</p></div>
    <p className="paper-note text-xs text-slate-500">ยอดข้างต้นเป็นจำนวนที่ตกลงตามสัญญา การรับชำระให้ยึดตามหลักฐานการชำระเงินแยกต่างหาก</p>
    <h2 className="mb-2 mt-6 font-bold">ข้อตกลงและเงื่อนไข</h2><div className="paper-terms whitespace-pre-wrap break-words">{d.terms.split(/\n\s*\n/).map((part, i) => <p className="mb-4" key={i}>{/^\s*\d+[.)]/.test(part) && part.includes("\n") ? <><strong className="paper-clause-title block mb-1">{part.slice(0, part.indexOf("\n"))}</strong>{part.slice(part.indexOf("\n") + 1)}</> : part}</p>)}</div>
    <p className="paper-acceptance mt-6">คู่สัญญาได้อ่านและเข้าใจข้อความข้างต้นแล้ว เห็นว่าตรงตามเจตนาของตน จึงลงลายมือชื่ออิเล็กทรอนิกส์ไว้เป็นหลักฐาน และสามารถพิมพ์เก็บไว้ฝ่ายละหนึ่งฉบับ</p>
    <div className="paper-signatures mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">{roles.filter(role => role === "landlord" || role === "tenant" || d[role].trim()).map(role => <div key={role} className="paper-signature text-center"><p className="text-xs text-slate-500">{roleLabels[role]}</p>{record.signatures[role] ? <img src={record.signatures[role]!.image} alt={`ลายเซ็น${roleLabels[role]}`} className="h-24 w-full object-contain" /> : <div className="blank h-24 border-b border-dashed border-slate-300" />}<p>({d[role] || "……………………"})</p>{record.signatures[role] && <p className="text-[10px] text-slate-500">ลงนาม {time(record.signatures[role]!.signedAt)} (เวลาไทย)</p>}</div>)}</div>
    {locked(record) && <div className="paper-evidence mt-8 break-words border-t border-slate-200 pt-4 text-[10px] text-slate-500"><p>บันทึกการลงนาม · {leaseLabel(record)}</p><p>{consentText}</p><p>เวลาอ้างอิงจากเครื่องที่ลงนาม · บันทึกในเบราว์เซอร์นี้ · ไม่มีการยืนยันตัวตนด้วย OTP หรือใบรับรองดิจิทัล</p></div>}
  </div>;
}
