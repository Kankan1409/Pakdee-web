"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  FileSignature,
  FileText,
  LockKeyhole,
  PenLine,
  Plus,
  Printer,
  Save,
  Search,
  Paperclip,
  Upload,
  Trash2,
  Eye,
  X,
  Users,
  Image as ImageIcon,
  AlertCircle,
  RotateCcw,
  ListCheck
} from "lucide-react";
import type { Property, Room } from "@/types/dormitory";
import {
  consentText,
  createLease,
  documentHash,
  readLeases,
  roleLabels,
  saveLease,
  validateLease
} from "@/lib/leases";
import type { LeaseAttachment, LeaseDetails, LeaseRecord, SignerRole } from "@/lib/leases";
import { LineSigningDemo } from "./line-signing-demo";
import { SignaturePad } from "./signature-pad";

const roles: SignerRole[] = ["landlord", "tenant", "witness1", "witness2"];
const money = (value: number) => value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = (value: string) => value ? new Date(`${value}T12:00:00+07:00`).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" }) : "ยังไม่ระบุ";
const time = (value: string) => new Date(value).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
const leaseLabel = (r: LeaseRecord) => `สัญญาเช่า ห้อง ${r.details.roomNumber} / ${Number((r.details.agreementDate || r.createdAt).slice(0, 4)) + 543}`;
const locked = (r: LeaseRecord) => Object.keys(r.signatures).length > 0;
const complete = (r: LeaseRecord) => roles.filter(role => r.details[role]?.trim()).every(role => Boolean(r.signatures[role])) && Boolean(r.signatures.landlord && r.signatures.tenant);
const status = (r: LeaseRecord) => complete(r) ? "ลงนามครบแล้ว" : locked(r) ? "รอลงนามเพิ่มเติม" : "ฉบับร่าง";

const formatSize = (bytes: number) => {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface ClauseItem {
  id: string;
  title: string;
  content: string;
  enabled: boolean;
}

const STANDARD_CLAUSES: Array<{ title: string; content: string }> = [
  {
    title: "วัตถุประสงค์การเช่า",
    content: "ใช้ห้องพักเพื่ออยู่อาศัย ผู้เช่าจะไม่ให้เช่าช่วงหรือโอนสิทธิ เว้นแต่ได้รับความยินยอมเป็นหนังสือจากผู้ให้เช่า"
  },
  {
    title: "การดูแลห้องพักและทรัพย์สิน",
    content: "คู่สัญญาร่วมตรวจสภาพห้องและรายการทรัพย์สินเมื่อส่งมอบ ผู้เช่าต้องดูแลรักษาห้องพักและไม่ดัดแปลงโดยไม่ได้รับความยินยอม"
  },
  {
    title: "ค่าสาธารณูปโภค",
    content: "ค่าน้ำและค่าไฟคิดตามการใช้จริงและอัตราที่ระบุในสัญญา โดยแสดงเลขมิเตอร์และรายละเอียดในใบแจ้งหนี้"
  },
  {
    title: "การซ่อมแซมและการเข้าตรวจห้อง",
    content: "คู่สัญญาตกลงแจ้งปัญหาชำรุดและนัดหมายเข้าตรวจห้องล่วงหน้า พร้อมตกลงความรับผิดชอบค่าใช้จ่ายตามสาเหตุ"
  },
  {
    title: "การสิ้นสุดสัญญาและเงินประกัน",
    content: "คู่สัญญาตกลงวันส่งมอบห้อง ตรวจสภาพและสรุปยอดค้างชำระร่วมกัน การหักเงินประกันต้องแสดงรายการและหลักฐาน พร้อมตกลงกำหนดคืนเงินคงเหลือ"
  },
  {
    title: "ความสงบเรียบร้อยและการใช้พื้นที่",
    content: "ห้ามส่งเสียงดังรบกวนผู้อื่นหลังเวลา 22:00 น. รักษาความสะอาดพื้นที่ส่วนกลาง และปฏิบัติตามระเบียบของอาคารอย่างเคร่งครัด"
  },
  {
    title: "การห้ามสูบบุหรี่และสิ่งเสพติด",
    content: "ห้ามสูบบุหรี่ บุหรี่ไฟฟ้า หรือสารเสพติดทุกชนิดภายในห้องพักและระเบียง ฝ่าฝืนมีโทษปรับตามระเบียบของอาคาร"
  },
  {
    title: "การเลี้ยงสัตว์เลี้ยง",
    content: "ไม่อนุญาตให้เลี้ยงสัตว์เลี้ยงทุกชนิดในห้องพักและพื้นที่ส่วนกลางของอาคาร"
  },
  {
    title: "การบอกเลิกสัญญาและการย้ายออก",
    content: "กรณีผู้เช่าประสงค์จะย้ายออก ต้องแจ้งให้ผู้ให้เช่าทราบล่วงหน้าเป็นลายลักษณ์อักษรไม่น้อยกว่า 30 วันก่อนครบกำหนดสัญญา"
  },
  {
    title: "ข้อตกลงเพิ่มเติม",
    content: "ระบุเงื่อนไขการต่อสัญญา การแจ้งย้ายออก การคืนเงินประกัน และระเบียบที่พักที่ทั้งสองฝ่ายตกลงกันก่อนลงนาม"
  }
];

function parseClausesFromTerms(termsString: string): ClauseItem[] {
  if (!termsString || !termsString.trim()) {
    return STANDARD_CLAUSES.map((c, i) => ({
      id: `std-${i + 1}`,
      title: c.title,
      content: c.content,
      enabled: i < 6,
    }));
  }
  const parts = termsString.split(/\n\s*\n/).filter(p => p.trim());
  if (parts.length === 0) {
    return STANDARD_CLAUSES.map((c, i) => ({
      id: `std-${i + 1}`,
      title: c.title,
      content: c.content,
      enabled: i < 6,
    }));
  }

  return parts.map((part, index) => {
    const lines = part.split("\n");
    let title = lines[0].trim();
    title = title.replace(/^\s*(ข้อ\s*)?\d+[\.\)]\s*/, "").trim();
    const content = lines.slice(1).join("\n").trim();
    return {
      id: `clause-${index + 1}-${Math.random().toString(36).slice(2, 7)}`,
      title: title || `ข้อกำหนดที่ ${index + 1}`,
      content: content || "",
      enabled: true,
    };
  });
}

const inputClass = "w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 disabled:opacity-70";
const primary = "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 transition-colors";
const secondary = "inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm hover:bg-[var(--subtle)] disabled:opacity-40 transition-colors";

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

  return (
    <section className="space-y-6">
      {demo && <LineSigningDemo record={demo} onClose={() => setDemo(null)} renderDocument={r => <LeaseDocument record={r} />} />}
      
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-widest text-emerald-600 dark:text-emerald-400">
            <FileSignature size={16} /> DIGITAL LEASES
          </div>
          <h2 className="text-2xl font-bold">สัญญาเช่าดิจิทัล</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">ร่างสัญญา กำหนดข้อตกลงรายข้อ ลงนามอิเล็กทรอนิกส์พร้อมพยาน 2 คน และแนบเอกสารสำคัญในที่เดียว</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={secondary} disabled={!occupied.length} onClick={() => setDemo(createLease(property, occupied[0]))}>
            ทดลองส่งสัญญาทาง LINE
          </button>
          <button className={primary} disabled={loading || Boolean(error) || !occupied.length} onClick={() => { setRoomId(occupied[0]?.id || ""); setCreating(true); }}>
            <Plus size={17} />สร้างสัญญาใหม่
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["สัญญาทั้งหมด", current.length, FileText],
          ["รอลงนาม", current.filter(r => !complete(r)).length, PenLine],
          ["ลงนามครบแล้ว", current.filter(complete).length, CheckCircle2]
        ].map(([label, value, Icon]) => {
          const Symbol = Icon as typeof FileText;
          return (
            <div key={String(label)} className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-600">
                <Symbol size={22} />
              </div>
              <div>
                <div className="text-2xl font-semibold">{String(value)}</div>
                <div className="text-xs text-[var(--muted)]">{String(label)}</div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-[var(--muted)]">
        โหมดทดลอง • สัญญาจัดเก็บอิสระในเบราว์เซอร์นี้ (IndexedDB) ไม่กระทบสัญญาเดิมหรือฐานข้อมูลหลัก • ปรับเลือกข้อสัญญาได้รายข้อ พร้อมเซ็นคู่สัญญา-พยาน 2 คน และแนบเอกสาร
      </p>

      {error && (
        <div role="alert" className="text-sm text-red-500">
          {error} <button className="underline" onClick={() => void refresh()}>ลองอีกครั้ง</button>
        </div>
      )}

      {creating && (
        <div className="rounded-2xl border border-emerald-500/40 bg-[var(--card)] p-5">
          <label className="mb-3 block text-sm font-medium" htmlFor="lease-room">เลือกห้องและผู้เช่า</label>
          <div className="flex flex-wrap gap-3">
            <select id="lease-room" className={`${inputClass} max-w-lg`} value={roomId} onChange={e => setRoomId(e.target.value)}>
              {occupied.map(r => (
                <option key={r.id} value={r.id}>
                  ห้อง {r.roomNumber} — {r.currentTenant?.fullName}
                </option>
              ))}
            </select>
            <button className={primary} onClick={() => {
              const room = occupied.find(r => r.id === roomId);
              if (room) {
                setSelected(createLease(property, room));
                setCreating(false);
              }
            }}>
              เริ่มร่างสัญญา
            </button>
            <button className={secondary} onClick={() => setCreating(false)}>
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <div className="flex flex-wrap gap-3 border-b border-[var(--border)] p-4">
          <label className="flex min-w-0 flex-1 items-center gap-2">
            <Search size={18} className="text-[var(--muted)]" />
            <input aria-label="ค้นหาสัญญา" className={inputClass} placeholder="ค้นหาชื่อผู้เช่าหรือเลขห้อง" value={query} onChange={e => setQuery(e.target.value)} />
          </label>
          <select aria-label="กรองสถานะสัญญา" className={`${inputClass} !w-auto`} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">ทุกสถานะ</option>
            <option value="draft">ฉบับร่าง</option>
            <option value="pending">รอลงนามเพิ่มเติม</option>
            <option value="signed">ลงนามครบแล้ว</option>
          </select>
        </div>

        {loading ? (
          <p className="p-12 text-center text-sm">กำลังโหลดสัญญา…</p>
        ) : !filtered.length ? (
          <div className="px-5 py-14 text-center">
            <FileSignature className="mx-auto mb-4 text-emerald-500" size={36} />
            <h3 className="font-semibold">{current.length ? "ไม่พบสัญญาที่ค้นหา" : "เริ่มต้นสัญญาฉบับแรก"}</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {!occupied.length ? "เพิ่มผู้เช่าให้ห้องพักก่อนสร้างสัญญา" : "เลือกห้องพัก แล้วกรอกรายละเอียด เลือกข้อสัญญา และลงนาม"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(r => (
              <div key={r.id} className="flex flex-wrap items-center gap-4 p-5 hover:bg-[var(--subtle)]/40 transition-colors">
                <div className="rounded-xl bg-[var(--subtle)] px-4 py-3 text-center">
                  <div className="text-[10px] text-[var(--muted)]">ห้อง</div>
                  <div className="text-lg font-semibold">{r.details.roomNumber}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{r.details.tenant}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{date(r.details.startDate)} – {date(r.details.endDate)}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                    <span>ค่าเช่า {money(r.details.rent)} บาท/เดือน</span>
                    <span>• {leaseLabel(r)}</span>
                    {r.attachments && r.attachments.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                        <Paperclip size={12} /> {r.attachments.length} เอกสารแนบ
                      </span>
                    )}
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${complete(r) ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                  {status(r)}
                </span>
                <button className={secondary} onClick={() => setSelected(r)}>
                  <FileText size={15} />เปิดสัญญา
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
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
  const [previewAttachment, setPreviewAttachment] = useState<LeaseAttachment | null>(null);

  // Structured Clauses Management
  const [clauses, setClauses] = useState<ClauseItem[]>(() => parseClausesFromTerms(initial.details.terms));

  const documentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saving = useRef(false);
  const isLocked = locked(record);
  const d = record.details;

  useEffect(() => {
    let alive = true;
    documentHash(initial).then(hash => {
      const valid = Object.values(initial.signatures).every(s => s.documentHash === hash);
      if (alive) {
        setVerified(valid);
        if (!valid) setError("เนื้อหาไม่ตรงกับฉบับที่ลงนาม ไม่สามารถลงนามเพิ่มหรือพิมพ์เป็นสัญญาได้");
      }
    }).catch(() => {
      if (alive) {
        setVerified(false);
        setError("ไม่สามารถตรวจสอบเอกสารได้ กรุณาใช้ localhost หรือ HTTPS");
      }
    });
    return () => { alive = false; };
  }, [initial]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty || signature) e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, signature]);

  function update<K extends keyof LeaseDetails>(key: K, value: LeaseDetails[K]) {
    setRecord(prev => ({ ...prev, details: { ...prev.details, [key]: value } }));
    setDirty(true);
    setChecked(false);
    setMessage("");
  }

  // Sync clauses to d.terms
  function syncClauses(updated: ClauseItem[]) {
    setClauses(updated);
    const formatted = updated
      .filter(c => c.enabled && (c.title.trim() || c.content.trim()))
      .map((c, idx) => `${idx + 1}. ${c.title.trim()}\n${c.content.trim()}`)
      .join("\n\n");
    update("terms", formatted);
  }

  function handleToggleClause(id: string) {
    if (isLocked) return;
    const updated = clauses.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c);
    syncClauses(updated);
  }

  function handleUpdateClause(id: string, field: "title" | "content", val: string) {
    if (isLocked) return;
    const updated = clauses.map(c => c.id === id ? { ...c, [field]: val } : c);
    syncClauses(updated);
  }

  function handleDeleteClause(id: string) {
    if (isLocked) return;
    const updated = clauses.filter(c => c.id !== id);
    syncClauses(updated);
  }

  function handleAddClause() {
    if (isLocked) return;
    const newClause: ClauseItem = {
      id: `clause-custom-${Date.now()}`,
      title: "ข้อกำหนดเพิ่มเติม",
      content: "ระบุข้อความรายละเอียดข้อกำหนดที่นี่...",
      enabled: true,
    };
    syncClauses([...clauses, newClause]);
  }

  function handleResetClauses() {
    if (isLocked) return;
    if (window.confirm("ต้องการรีเซ็ตข้อกำหนดกลับเป็นค่ามาตรฐานเริ่มต้นหรือไม่?")) {
      const reset = STANDARD_CLAUSES.map((c, i) => ({
        id: `std-${i + 1}-${Date.now()}`,
        title: c.title,
        content: c.content,
        enabled: i < 6,
      }));
      syncClauses(reset);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 8 * 1024 * 1024) {
        setError(`ไฟล์ "${file.name}" มีขนาดเกิน 8MB กรุณาเลือกไฟล์ที่เล็กลง`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const newAttachment: LeaseAttachment = {
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          dataUrl,
          uploadedAt: new Date().toISOString(),
        };
        setRecord(prev => ({
          ...prev,
          attachments: [...(prev.attachments || []), newAttachment]
        }));
        setDirty(true);
        setMessage(`แนบเอกสาร "${file.name}" สำเร็จ`);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeAttachment(id: string) {
    if (isLocked) return;
    setRecord(prev => ({
      ...prev,
      attachments: (prev.attachments || []).filter(a => a.id !== id)
    }));
    setDirty(true);
    setMessage("ลบเอกสารแนบแล้ว");
  }

  async function persist(next = record) {
    const saved = await saveLease(next);
    setRecord(saved);
    onSaved(saved);
    setDirty(false);
    return saved;
  }

  async function saveDraft() {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      await persist();
      setMessage("บันทึกฉบับร่างในเบราว์เซอร์นี้แล้ว");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  async function sign() {
    if (saving.current) return;
    const invalid = validateLease(d);
    if (invalid) { setError(invalid); return; }
    if (!signature || !consent || !checked || !verified || record.signatures[role] || !d[role]?.trim()) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      const hash = await documentHash(record);
      if (Object.values(record.signatures).some(s => s.documentHash !== hash)) {
        throw new Error("เนื้อหาสัญญาไม่ตรงกับลายเซ็นเดิม");
      }
      await persist({
        ...record,
        signatures: {
          ...record.signatures,
          [role]: {
            name: d[role].trim(),
            image: signature,
            signedAt: new Date().toISOString(),
            consent: consentText,
            documentHash: hash
          }
        }
      });
      setSignature("");
      setConsent(false);
      setPadKey(k => k + 1);
      setMessage(`บันทึกลายเซ็น${roleLabels[role]}แล้ว`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  async function print() {
    if (!verified || busy) return;
    setBusy(true);
    setError("");
    try {
      if (dirty) await persist();
      const frame = document.createElement("iframe");
      frame.style.cssText = "position:fixed;left:-10000px;top:0;width:900px;height:1000px;border:0";
      frame.title = "พิมพ์สัญญาเช่า";
      document.body.appendChild(frame);
      const doc = frame.contentDocument!;
      doc.open();
      doc.write('<!doctype html><html lang="th"><head><meta charset="utf-8"><title>สัญญาเช่า</title></head><body></body></html>');
      doc.close();

      const style = doc.createElement("style");
      style.textContent = `
@font-face { font-family: 'TH Sarabun New'; src: url('${window.location.origin}/fonts/THSarabunNew.ttf') format('truetype'); font-weight: 400; font-style: normal; }
@font-face { font-family: 'TH Sarabun New'; src: url('${window.location.origin}/fonts/THSarabunNewBold.ttf') format('truetype'); font-weight: 700; font-style: normal; }
@page { size: A4; margin: 15mm 18mm 18mm; }
body { font-family: 'TH Sarabun New', sans-serif; color: #172033; margin: 0; }
* { box-sizing: border-box; }
.lease-paper { padding: 0 !important; box-shadow: none !important; border: 0 !important; font-size: 16pt !important; line-height: 1.4 !important; }
.lease-paper h1 { font-size: 26pt; line-height: 1.4; margin: 10px 0 8px; text-align: center; letter-spacing: .2px; }
.lease-paper h2 { font-size: 18pt; margin: 18px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #cbd5e1; break-after: avoid; }
.lease-paper p { margin: 6px 0; orphans: 3; widows: 3; }
.paper-top { text-align: center; border-bottom: 2px solid #334155; padding-bottom: 14px; margin-bottom: 16px; }
.paper-meta { font-size: 13pt; color: #475569; }
.paper-top > p { font-size: 14pt; color: #475569; }
.paper-date { text-align: right; font-size: 14pt; margin: 12px 0 16px !important; }
.paper-parties { border-left: 3px solid #cbd5e1; padding-left: 14px; }
.paper-parties p + p { margin-top: 10px; }
.paper-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid #cbd5e1; margin: 14px 0 10px; break-inside: avoid; }
.paper-grid p { margin: 0; padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
.paper-grid p:nth-child(odd) { border-right: 1px solid #e2e8f0; }
.paper-grid p:nth-last-child(-n+2) { border-bottom: 0; }
.paper-note { font-size: 12pt; color: #64748b; }
.paper-terms { white-space: pre-wrap; overflow-wrap: anywhere; }
.paper-terms p { margin: 0 0 11px; break-inside: avoid; }
.paper-clause-title { display: block; font-weight: 700; margin-bottom: 3px; }
.paper-acceptance { margin-top: 18px !important; }
.paper-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 20px 32px; margin-top: 24px; break-inside: avoid; }
.paper-signature { break-inside: avoid; text-align: center; padding: 6px 10px; }
.paper-signature img { height: 70px; width: 100%; object-fit: contain; display: block; }
.paper-signature .blank { height: 70px; }
.paper-signature > p:nth-last-child(2) { border-top: 1px solid #94a3b8; padding-top: 6px; }
.paper-signature p { margin: 3px 0; font-size: 14pt; }
.paper-signature p:last-child { font-size: 12pt; }
.paper-evidence { font-size: 11pt; line-height: 1.6; color: #64748b; overflow-wrap: anywhere; break-inside: avoid; margin-top: 20px; border-top: 1px solid #cbd5e1; padding-top: 10px; }
.paper-banner { border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-size: 13pt; margin-bottom: 14px !important; }
.paper-attachments { break-before: auto; margin-top: 24px; padding-top: 16px; border-top: 1px dashed #cbd5e1; }
.paper-attachments-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 10px; }
.paper-attachment-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; text-align: center; break-inside: avoid; }
.paper-attachment-card img { max-height: 160px; max-width: 100%; object-fit: contain; margin: 0 auto; display: block; }
img { max-width: 100%; }
`;
      doc.head.appendChild(style);
      if (documentRef.current) doc.body.appendChild(documentRef.current.cloneNode(true));
      await Promise.all([
        doc.fonts.load('400 16px "TH Sarabun New"', 'สัญญา Lease'),
        doc.fonts.load('700 16px "TH Sarabun New"', 'สัญญา Lease'),
      ]);
      await doc.fonts.ready;
      await Promise.all(Array.from(doc.images).map(img => img.decode().catch(() => undefined)));
      frame.contentWindow!.addEventListener("afterprint", () => frame.remove(), { once: true });
      frame.contentWindow!.focus();
      frame.contentWindow!.print();
      setTimeout(() => frame.remove(), 60000);
    } catch (e) {
      setError(`เตรียมเอกสารไม่สำเร็จ: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  function field(key: keyof LeaseDetails, label: string, type = "text", placeholder = "") {
    return (
      <label key={key} className="block text-xs font-medium text-[var(--muted)]">
        {label}
        <input
          className={`${inputClass} mt-1.5`}
          type={type}
          placeholder={placeholder}
          value={d[key]}
          disabled={isLocked || busy}
          min={type === "number" ? (key === "dueDay" ? 1 : 0) : undefined}
          max={key === "dueDay" ? 28 : undefined}
          step={key === "dueDay" ? 1 : type === "number" ? "0.01" : undefined}
          onChange={e => update(key, type === "number" ? Number(e.target.value) : e.target.value)}
        />
      </label>
    );
  }

  return (
    <section className="space-y-5">
      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-[var(--card)] p-5 shadow-2xl border border-[var(--border)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Paperclip size={16} className="text-emerald-500" />
                <span className="truncate">{previewAttachment.name}</span>
                <span className="text-xs text-[var(--muted)]">({formatSize(previewAttachment.size)})</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--subtle)] hover:text-[var(--foreground)]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="py-4 flex justify-center max-h-[65vh] overflow-auto">
              {previewAttachment.type.startsWith("image/") ? (
                <img
                  src={previewAttachment.dataUrl}
                  alt={previewAttachment.name}
                  className="max-h-[60vh] object-contain rounded-lg border border-[var(--border)]"
                />
              ) : (
                <div className="py-16 text-center text-sm text-[var(--muted)]">
                  <FileText className="mx-auto mb-2 text-emerald-500" size={40} />
                  <p className="font-semibold">{previewAttachment.name}</p>
                  <p className="mt-1 text-xs">เอกสารประเภท {previewAttachment.type}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-3 border-t border-[var(--border)]">
              <button type="button" onClick={() => setPreviewAttachment(null)} className={secondary}>
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {showLineDemo && <LineSigningDemo record={record} onClose={() => setShowLineDemo(false)} renderDocument={r => <LeaseDocument record={r} />} />}

      <button
        className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        disabled={busy}
        onClick={() => {
          if ((!dirty && !signature) || window.confirm("มีข้อมูลหรือลายเซ็นที่ยังไม่บันทึก ต้องการออกจากเอกสารหรือไม่?")) {
            onBack();
          }
        }}
      >
        <ArrowLeft size={16} />กลับไปหน้าสัญญา
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">สัญญาห้อง {d.roomNumber}</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {d.tenant} · {leaseLabel(record)} · {status(record)}
            {record.attachments && record.attachments.length > 0 && ` · ${record.attachments.length} เอกสารแนบ`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={secondary} disabled={busy} onClick={() => setShowLineDemo(true)}>
            ส่งทาง LINE (ตัวอย่าง)
          </button>
          {!isLocked && (
            <button className={secondary} disabled={busy} onClick={() => void saveDraft()}>
              <Save size={15} />บันทึกฉบับร่าง
            </button>
          )}
          <button className={primary} disabled={busy || !verified} onClick={() => void print()}>
            <Printer size={15} />พิมพ์ / บันทึก PDF
          </button>
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600 border border-red-500/20">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-600 border border-emerald-500/20">{message}</p>}

      <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-3">
        {([
          ["details", "1. รายละเอียดสัญญา & เอกสารแนบ"],
          ["preview", "2. ตรวจทานเอกสาร A4"],
          ["sign", "3. ลงลายเซ็น (คู่สัญญา & พยาน)"]
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${tab === id ? "bg-emerald-600 text-white shadow-sm" : "text-[var(--muted)] hover:bg-[var(--subtle)] hover:text-[var(--foreground)]"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLocked && (
        <p className="flex items-center gap-2 text-xs text-[var(--muted)] bg-amber-500/10 border border-amber-500/20 px-3.5 py-2.5 rounded-xl">
          <LockKeyhole size={15} className="text-amber-600" />
          เนื้อหาถูกล็อกหลังเริ่มลงนาม หากต้องการแก้ไข ต้องสร้างสัญญาใหม่โดยเก็บฉบับนี้ไว้เป็นประวัติ
        </p>
      )}

      {/* TAB 1: DETAILS & ATTACHMENTS */}
      {tab === "details" && (
        <div className="space-y-6">
          {/* คู่สัญญา */}
          <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-7">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Users size={18} className="text-emerald-500" />
              คู่สัญญาและสถานที่ทำสัญญา
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {field("landlord", "ชื่อผู้ให้เช่า / ผู้มีอำนาจลงนาม *")}
              {field("landlordPhone", "โทรศัพท์ผู้ให้เช่า")}
              {field("tenant", "ชื่อผู้เช่า *")}
              {field("tenantPhone", "โทรศัพท์ผู้เช่า")}
              {field("tenantIdCard", "เลขประจำตัวผู้เช่า (ถ้ามี)")}
              {field("tenantAddress", "ที่อยู่ผู้เช่า *")}
              {field("propertyAddress", "ที่อยู่ที่พัก *")}
              {field("madeAt", "สถานที่ทำสัญญา *")}
            </div>
          </div>

          {/* พยาน 2 คน */}
          <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-7">
            <div>
              <h3 className="font-semibold text-base flex items-center gap-2">
                <PenLine size={18} className="text-emerald-500" />
                พยานรับทราบสัญญา (2 ท่าน)
              </h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                ระบุชื่อพยานเพื่อใช้ในส่วนลงนามท้ายสัญญา (ไม่บังคับ แต่แนะนำให้ระบุครบทั้ง 2 ท่านเพื่อความสมบูรณ์ทางกฎหมาย)
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {field("witness1", "ชื่อ-นามสกุล พยานคนที่ 1", "text", "เช่น นายสมศักดิ์ สุขใจ")}
              {field("witness2", "ชื่อ-นามสกุล พยานคนที่ 2", "text", "เช่น นางสาวสมศรี มั่งมี")}
            </div>
          </div>

          {/* ระยะเวลาและค่าใช้จ่าย */}
          <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-7">
            <h3 className="font-semibold text-base">ระยะเวลาและค่าใช้จ่าย</h3>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {field("agreementDate", "วันที่ทำสัญญา *", "date")}
              {field("startDate", "วันเริ่มสัญญา *", "date")}
              {field("endDate", "วันสิ้นสุดสัญญา *", "date")}
              {field("rent", "ค่าเช่าต่อเดือน (บาท)", "number")}
              {field("deposit", "เงินประกันที่ตกลง (บาท)", "number")}
              {field("advance", "ค่าเช่าล่วงหน้า (บาท)", "number")}
              {field("dueDay", "ชำระภายในวันที่ (1–28)", "number")}
              {field("electricRate", "ค่าไฟต่อหน่วย (บาท)", "number")}
              {field("waterRate", "ค่าน้ำต่อหน่วย (บาท)", "number")}
            </div>
          </div>

          {/* ข้อตกลงและเงื่อนไขสัญญา (เลือกรายข้อได้) */}
          <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ListCheck className="text-emerald-500" size={20} />
                  <h3 className="font-semibold text-base">ข้อกำหนดและเงื่อนไขสัญญา (เลือกใช้รายข้อได้)</h3>
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  ติ๊กเลือกเปิด/ปิดข้อที่ต้องการ หรือแก้ไขเนื้อหาได้ตามข้อตกลง ข้อที่เปิดใช้งานจะถูกจัดพิมพ์ลงในสัญญา A4
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600">
                  เปิดใช้งาน {clauses.filter(c => c.enabled).length} จาก {clauses.length} ข้อ
                </span>
                {!isLocked && (
                  <>
                    <button
                      type="button"
                      onClick={handleAddClause}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                    >
                      <Plus size={14} /> เพิ่มข้อใหม่
                    </button>
                    <button
                      type="button"
                      onClick={handleResetClauses}
                      className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--subtle)] transition-colors"
                      title="รีเซ็ตกลับเป็นข้อกำหนดมาตรฐาน"
                    >
                      <RotateCcw size={13} /> คืนค่ามาตรฐาน
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* รายการข้อกำหนดแบบการ์ดแต่ละข้อ */}
            <div className="space-y-3 pt-2">
              {clauses.map((clause, index) => {
                const enabledIndex = clauses.slice(0, index + 1).filter(c => c.enabled).length;

                return (
                  <div
                    key={clause.id}
                    className={`rounded-xl border transition-all ${
                      clause.enabled
                        ? "border-emerald-500/30 bg-[var(--card)] shadow-sm"
                        : "border-[var(--border)] opacity-60 bg-[var(--subtle)]/30"
                    }`}
                  >
                    {/* ส่วนหัวการ์ดข้อกำหนด */}
                    <div className="flex items-center justify-between gap-3 p-3.5 border-b border-[var(--border)]/60 bg-[var(--subtle)]/20 rounded-t-xl">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={clause.enabled}
                            disabled={isLocked || busy}
                            onChange={() => handleToggleClause(clause.id)}
                            className="h-4 w-4 rounded accent-emerald-600 cursor-pointer"
                          />
                          <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-bold ${
                            clause.enabled ? "bg-emerald-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                          }`}>
                            {clause.enabled ? `ข้อที่ ${enabledIndex}` : "ปิดใช้งาน"}
                          </span>
                        </label>

                        <input
                          type="text"
                          value={clause.title}
                          disabled={isLocked || busy}
                          onChange={e => handleUpdateClause(clause.id, "title", e.target.value)}
                          placeholder="ชื่อหัวข้อข้อกำหนด..."
                          className={`font-semibold text-sm bg-transparent border-b border-transparent hover:border-[var(--border)] focus:border-emerald-500 focus:outline-none flex-1 truncate px-1 py-0.5 ${
                            clause.enabled ? "text-[var(--foreground)]" : "text-[var(--muted)] line-through"
                          }`}
                        />
                      </div>

                      {!isLocked && (
                        <button
                          type="button"
                          onClick={() => handleDeleteClause(clause.id)}
                          title="ลบข้อนี้"
                          className="p-1 rounded-lg text-[var(--muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    {/* รายละเอียดข้อความของแต่ละข้อ */}
                    <div className="p-3.5">
                      <textarea
                        rows={2}
                        value={clause.content}
                        disabled={isLocked || busy || !clause.enabled}
                        onChange={e => handleUpdateClause(clause.id, "content", e.target.value)}
                        placeholder="ระบุข้อความรายละเอียดข้อกำหนด..."
                        className={`w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-2.5 text-xs leading-relaxed outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 disabled:opacity-70 ${
                          !clause.enabled ? "bg-[var(--subtle)]/40 text-[var(--muted)]" : ""
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* แนบเอกสารสำคัญ (Attachments) */}
          <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <Paperclip size={18} className="text-emerald-500" />
                  เอกสารแนบท้ายสัญญา ({record.attachments?.length || 0})
                </h3>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  แนบสำเนาบัตรประชาชน, ทะเบียนบ้าน, สลิปมัดจำ หรือเอกสารข้อตกลงเพิ่มเติม (รองรับไฟล์รูปภาพ JPG, PNG และ PDF สูงสุด 8MB)
                </p>
              </div>

              {!isLocked && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={primary}
                    disabled={busy}
                  >
                    <Upload size={16} /> อัปโหลดเอกสารแนบ
                  </button>
                </div>
              )}
            </div>

            {record.attachments && record.attachments.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
                {record.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="group relative flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 hover:border-emerald-500/50 transition-all shadow-sm"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 overflow-hidden">
                      {att.type.startsWith("image/") ? (
                        <img src={att.dataUrl} alt={att.name} className="h-full w-full object-cover" />
                      ) : (
                        <FileText size={22} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate text-[var(--foreground)]">{att.name}</p>
                      <p className="text-[11px] text-[var(--muted)]">{formatSize(att.size)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviewAttachment(att)}
                        title="ดูตัวอย่าง"
                        className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--subtle)] hover:text-emerald-600 transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                      {!isLocked && (
                        <button
                          type="button"
                          onClick={() => removeAttachment(att.id)}
                          title="ลบเอกสาร"
                          className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-red-500/10 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                onClick={() => !isLocked && fileInputRef.current?.click()}
                className={`rounded-xl border-2 border-dashed border-[var(--border)] p-6 text-center transition-colors ${
                  !isLocked ? "cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5" : "opacity-60"
                }`}
              >
                <ImageIcon className="mx-auto mb-2 text-[var(--muted)]" size={32} />
                <p className="text-xs font-medium text-[var(--muted)]">
                  {isLocked ? "ไม่มีเอกสารแนบ" : "คลิกที่นี่เพื่อแนบไฟล์สำเนาบัตรประชาชน หรือเอกสารอื่นๆ"}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            {!isLocked && (
              <button className={secondary} disabled={busy} onClick={() => void saveDraft()}>
                <Save size={16} /> บันทึกฉบับร่าง
              </button>
            )}
            <button
              className={primary}
              onClick={() => {
                const invalid = validateLease(d);
                if (invalid) { setError(invalid); return; }
                setError("");
                setTab("preview");
              }}
            >
              ตรวจทานเอกสาร A4 <FileText size={16} />
            </button>
          </div>
        </div>
      )}

      {/* TAB 2 & TAB 3: PREVIEW & SIGNING */}
      <div className={tab === "details" ? "hidden" : "grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"}>
        <LeaseDocument record={record} documentRef={documentRef} onPreviewAttachment={setPreviewAttachment} />

        <aside className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 xl:sticky xl:top-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold">
              <PenLine size={18} className="text-emerald-500" />
              ลายเซ็นอิเล็กทรอนิกส์
            </h3>
            <span className="text-xs text-[var(--muted)]">4 บทบาท</span>
          </div>
          <p className="text-xs leading-relaxed text-[var(--muted)]">
            เลือกผู้ลงนามแล้วให้ผู้มีอำนาจลงชื่อบนหน้าจอ ชื่อและเวลาจะถูกบันทึกพร้อมเนื้อหาสัญญา
          </p>

          {/* Cards for 4 signers */}
          <div className="space-y-2">
            {roles.map((r) => {
              const isSigned = Boolean(record.signatures[r]);
              const name = d[r]?.trim();
              const isSelected = role === r && tab === "sign";
              const isWitness = r.startsWith("witness");
              const disabled = !name && isWitness;

              return (
                <div
                  key={r}
                  onClick={() => {
                    if (!disabled && tab === "sign") {
                      setRole(r);
                      setSignature("");
                      setConsent(false);
                      setPadKey(k => k + 1);
                    }
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20"
                      : isSigned
                      ? "border-emerald-500/30 bg-[var(--subtle)]"
                      : disabled
                      ? "border-[var(--border)] opacity-50 bg-[var(--background)] cursor-not-allowed"
                      : "border-[var(--border)] bg-[var(--card)] hover:border-emerald-500/40 cursor-pointer"
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                      {roleLabels[r]}
                      {isWitness && !name && <span className="text-[10px] text-[var(--muted)] font-normal">(ไม่ได้ระบุ)</span>}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--muted)] truncate">
                      {name || "—"}
                    </p>
                  </div>
                  {isSigned ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-500/15 px-2 py-0.5 rounded-full shrink-0">
                      <CheckCircle2 size={13} /> ลงนามแล้ว
                    </span>
                  ) : disabled ? (
                    <span className="text-[10px] text-[var(--muted)] shrink-0">ไม่ต้องการเซ็น</span>
                  ) : (
                    <span className="text-[11px] font-medium text-amber-600 bg-amber-500/15 px-2 py-0.5 rounded-full shrink-0">
                      รอลงนาม
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {complete(record) ? (
            <div className="rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-600 border border-emerald-500/20">
              <CheckCircle2 className="mb-1" size={20} />
              <p className="font-semibold">ลงนามครบถ้วนแล้ว</p>
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                เอกสารถูกล็อกและพร้อมสำหรับพิมพ์หรือบันทึกเป็น PDF เก็บไว้เป็นหลักฐาน
              </p>
            </div>
          ) : (
            <>
              <label className="flex gap-2 text-xs leading-5">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={busy}
                  onChange={e => setChecked(e.target.checked)}
                  className="mt-0.5 accent-emerald-600"
                />
                <span>ตรวจทานเนื้อหาและรายละเอียดสัญญาฉบับนี้ครบถ้วนแล้ว</span>
              </label>

              {tab === "preview" ? (
                <button
                  className={`${primary} w-full`}
                  disabled={!checked || !verified}
                  onClick={() => {
                    const invalid = validateLease(d);
                    if (invalid) { setError(invalid); return; }
                    setError("");
                    setTab("sign");
                  }}
                >
                  ไปหน้าลงลายเซ็น <PenLine size={16} />
                </button>
              ) : (
                <div className="space-y-3 pt-1 border-t border-[var(--border)]">
                  <label className="block text-xs font-medium">
                    กำลังลงนามในฐานะ:
                    <select
                      className={`${inputClass} mt-1.5`}
                      value={role}
                      disabled={busy}
                      onChange={e => {
                        setRole(e.target.value as SignerRole);
                        setSignature("");
                        setConsent(false);
                        setPadKey(k => k + 1);
                      }}
                    >
                      {roles
                        .filter(r => r === "landlord" || r === "tenant" || d[r]?.trim())
                        .map(r => (
                          <option key={r} value={r}>
                            {roleLabels[r]} — {d[r] || "ยังไม่ระบุชื่อ"}
                          </option>
                        ))}
                    </select>
                  </label>

                  {record.signatures[role] ? (
                    <div className="rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-600 border border-emerald-500/20">
                      <p className="font-semibold">{roleLabels[role]} ({d[role]}) ลงนามเรียบร้อยแล้ว</p>
                      <p className="mt-1 text-[11px] text-[var(--muted)]">หากต้องการลงนามให้ท่านอื่น กรุณาเลือกบทบาทถัดไปด้านบน</p>
                    </div>
                  ) : (
                    <>
                      <SignaturePad key={`${role}-${padKey}`} onChange={setSignature} disabled={busy} />
                      <label className="flex gap-2 text-xs leading-5">
                        <input
                          type="checkbox"
                          checked={consent}
                          disabled={busy}
                          onChange={e => setConsent(e.target.checked)}
                          className="mt-0.5 accent-emerald-600"
                        />
                        <span>{consentText}</span>
                      </label>
                      <p className="text-[11px] text-[var(--muted)]">
                        เมื่อกดยืนยัน จะล็อกเนื้อหาในสัญญาและบันทึกลายเซ็นของ {d[role] || roleLabels[role]}
                      </p>
                      <button
                        className={`${primary} w-full`}
                        disabled={busy || !signature || !consent || !checked || !verified || !d[role]?.trim()}
                        onClick={() => void sign()}
                      >
                        <Check size={16} />
                        {busy ? "กำลังบันทึก…" : `ยืนยันลงนาม (${roleLabels[role]})`}
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </section>
  );
}

function LeaseDocument({
  record,
  documentRef,
  onPreviewAttachment
}: {
  record: LeaseRecord;
  documentRef?: React.RefObject<HTMLDivElement | null>;
  onPreviewAttachment?: (att: LeaseAttachment) => void;
}) {
  const d = record.details;

  return (
    <div
      ref={documentRef}
      className="lease-paper min-w-0 rounded-xl border border-slate-200 bg-white p-5 text-slate-800 shadow-sm sm:p-10"
      style={{ fontFamily: "\"TH Sarabun New\", sans-serif", fontSize: 20, lineHeight: 1.5 }}
    >
      <div className="paper-top mb-6 border-b border-slate-200 pb-5 text-center">
        <div className="paper-meta text-xs text-slate-500">{d.propertyName} · {leaseLabel(record)}</div>
        <h1 className="mt-3 text-2xl font-bold">สัญญาเช่าที่พักอาศัย</h1>
        <p className="mt-2 text-xs text-slate-500">ห้อง {d.roomNumber} · {status(record)}</p>
      </div>

      {!complete(record) && (
        <p className="paper-banner mb-5 rounded-lg bg-slate-100 p-2 text-center text-xs">
          {locked(record) ? "เอกสารอยู่ระหว่างการลงนาม — ยังลงนามไม่ครบ" : "ฉบับร่าง — ยังไม่ได้ลงนาม"}
        </p>
      )}

      <p className="paper-date text-right">ทำที่ {d.madeAt || "……………………"}<br />วันที่ {date(d.agreementDate)}</p>

      <h2 className="mb-2 mt-6 font-bold">คู่สัญญา</h2>
      <div className="paper-parties border-l-2 border-slate-200 pl-4">
        <p>
          สัญญาฉบับนี้ทำขึ้นระหว่าง <strong>{d.landlord || "……………………"}</strong> ผู้ให้เช่า / ผู้มีอำนาจลงนามของ {d.propertyName} ที่อยู่ {d.propertyAddress || "……………………"} โทรศัพท์ {d.landlordPhone || "—"}
        </p>
        <p className="mt-2">
          กับ <strong>{d.tenant}</strong> ผู้เช่า เลขประจำตัว {d.tenantIdCard || "ยังไม่ระบุ"} ที่อยู่ {d.tenantAddress || "……………………"} โทรศัพท์ {d.tenantPhone || "—"} ทั้งสองฝ่ายตกลงทำสัญญาเช่าโดยมีรายละเอียดดังนี้
        </p>
      </div>

      <h2 className="mb-2 mt-6 font-bold">รายละเอียดการเช่า</h2>
      <p>ห้องพักเลขที่ <strong>{d.roomNumber}</strong> ชั้น {d.floor} ของ {d.propertyName} ตั้งอยู่ที่ {d.propertyAddress || "……………………"} เพื่อใช้เป็นที่พักอาศัย</p>
      <p>เริ่มเช่าวันที่ <strong>{date(d.startDate)}</strong> ถึงวันที่ <strong>{date(d.endDate)}</strong></p>

      <div className="paper-grid my-4 grid gap-2 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
        <p>ค่าเช่าเดือนละ <strong>{money(d.rent)} บาท</strong></p>
        <p>ชำระภายในวันที่ <strong>{d.dueDay}</strong> ของเดือน</p>
        <p>เงินประกัน <strong>{money(d.deposit)} บาท</strong></p>
        <p>ค่าเช่าล่วงหน้า <strong>{money(d.advance)} บาท</strong></p>
        <p>ค่าไฟ {money(d.electricRate)} บาท/หน่วย</p>
        <p>ค่าน้ำ {money(d.waterRate)} บาท/หน่วย</p>
      </div>
      <p className="paper-note text-xs text-slate-500">ยอดข้างต้นเป็นจำนวนที่ตกลงตามสัญญา การรับชำระให้ยึดตามหลักฐานการชำระเงินแยกต่างหาก</p>

      <h2 className="mb-2 mt-6 font-bold">ข้อตกลงและเงื่อนไข</h2>
      <div className="paper-terms whitespace-pre-wrap break-words">
        {d.terms.split(/\n\s*\n/).map((part, i) => (
          <p className="mb-4" key={i}>
            {/^\s*\d+[.)]/.test(part) && part.includes("\n") ? (
              <>
                <strong className="paper-clause-title block mb-1">{part.slice(0, part.indexOf("\n"))}</strong>
                {part.slice(part.indexOf("\n") + 1)}
              </>
            ) : part}
          </p>
        ))}
      </div>

      <p className="paper-acceptance mt-6">
        คู่สัญญาได้อ่านและเข้าใจข้อความข้างต้นแล้ว เห็นว่าตรงตามเจตนาของตน จึงลงลายมือชื่ออิเล็กทรอนิกส์ไว้เป็นหลักฐาน และสามารถพิมพ์เก็บไว้ฝ่ายละหนึ่งฉบับ
      </p>

      {/* ลายเซ็น 4 บทบาท (ผู้ให้เช่า, ผู้เช่า, พยาน 1, พยาน 2) */}
      <div className="paper-signatures mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {roles.filter(role => role === "landlord" || role === "tenant" || d[role]?.trim()).map(role => (
          <div key={role} className="paper-signature text-center">
            <p className="text-xs text-slate-500 font-bold">{roleLabels[role]}</p>
            {record.signatures[role] ? (
              <img src={record.signatures[role]!.image} alt={`ลายเซ็น${roleLabels[role]}`} className="h-20 w-full object-contain my-1" />
            ) : (
              <div className="blank h-20 border-b border-dashed border-slate-300 my-1" />
            )}
            <p>({d[role] || "……………………"})</p>
            {record.signatures[role] && (
              <p className="text-[10px] text-slate-500">ลงนาม {time(record.signatures[role]!.signedAt)} (เวลาไทย)</p>
            )}
          </div>
        ))}
      </div>

      {/* เอกสารแนบท้ายสัญญา */}
      {record.attachments && record.attachments.length > 0 && (
        <div className="paper-attachments mt-8 pt-6 border-t border-slate-200 break-inside-avoid">
          <h2 className="mb-3 font-bold text-lg">เอกสารแนบท้ายสัญญา ({record.attachments.length} รายการ)</h2>
          <div className="paper-attachments-grid grid grid-cols-1 gap-4 sm:grid-cols-2">
            {record.attachments.map((att, idx) => (
              <div
                key={att.id}
                onClick={() => onPreviewAttachment && onPreviewAttachment(att)}
                className="paper-attachment-card border border-slate-200 rounded-lg p-3 text-center cursor-pointer hover:border-emerald-500 transition-colors"
              >
                <p className="text-xs font-semibold mb-2 text-slate-700">{idx + 1}. {att.name}</p>
                {att.type.startsWith("image/") ? (
                  <img src={att.dataUrl} alt={att.name} className="max-h-40 mx-auto object-contain rounded" />
                ) : (
                  <div className="py-6 text-xs text-slate-500 flex flex-col items-center justify-center gap-1">
                    <FileText size={28} className="text-slate-400" />
                    <span>[ไฟล์แนบเอกสาร PDF]</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {locked(record) && (
        <div className="paper-evidence mt-8 break-words border-t border-slate-200 pt-4 text-[10px] text-slate-500">
          <p>บันทึกการลงนามอิเล็กทรอนิกส์ · {leaseLabel(record)}</p>
          <p>{consentText}</p>
          <p>เวลาอ้างอิงจากเครื่องที่ลงนาม · จัดเก็บในระบบดิจิทัลของหอพัก</p>
        </div>
      )}
    </div>
  );
}
