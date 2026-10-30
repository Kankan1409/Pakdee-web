"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, CheckCircle2, Copy, FileText, MessageCircle, Send, Smartphone, X } from "lucide-react";
import { consentText, documentHash } from "@/lib/leases";
import type { LeaseRecord } from "@/lib/leases";
import { SignaturePad } from "./signature-pad";

const button = "flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40";

/** An in-memory walkthrough. No messages, storage writes or shareable links. */
export function LineSigningDemo({ record, renderDocument, onClose }: {
  record: LeaseRecord; renderDocument: (record: LeaseRecord) => ReactNode; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [snapshot, setSnapshot] = useState<LeaseRecord>(() => ({ ...structuredClone(record), signatures: {} }));
  const [screen, setScreen] = useState<"chat" | "read" | "sign" | "done">("chat");
  const [sent, setSent] = useState(false);
  const [read, setRead] = useState(false);
  const [consent, setConsent] = useState(false);
  const [ink, setInk] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const inFlight = useRef(false);
  const d = snapshot.details;
  const signed = Boolean(snapshot.signatures.tenant);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  async function copyMessage() {
    try {
      await navigator.clipboard.writeText("[ข้อความตัวอย่าง — ยังไม่มีลิงก์ใช้งานจริง]\nสวัสดีค่ะ/ครับ ทางหอพักส่งสัญญาเช่าให้ตรวจสอบ กรุณาอ่านรายละเอียดและลงนามผ่านลิงก์ด้านล่าง โดยไม่ต้องสมัครบัญชี\n[ลิงก์สำหรับลงนามจะพร้อมเมื่อเปิดใช้งานระบบออนไลน์]");
      setCopied(true); setNotice("");
    } catch { setNotice("คัดลอกไม่ได้ กรุณาอนุญาตคลิปบอร์ดในเบราว์เซอร์ หรือลองใหม่"); }
  }
  async function sign() {
    if (!ink || !read || !consent || inFlight.current || signed) return;
    inFlight.current = true; setBusy(true); setNotice("");
    try {
      const hash = await documentHash(snapshot);
      setSnapshot(prev => ({ ...prev, signatures: { tenant: { name: d.tenant, image: ink, signedAt: new Date().toISOString(), consent: consentText, documentHash: hash } } }));
      setScreen("done");
    } catch { setNotice("ยังแสดงผลลายเซ็นไม่ได้ กรุณาลองใหม่"); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <dialog ref={dialog} aria-labelledby="line-demo-title" onCancel={e => { e.preventDefault(); if (!busy) onClose(); }} className="fixed inset-0 m-auto max-h-[94dvh] w-[min(1140px,96vw)] overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 p-0 text-slate-800 shadow-2xl backdrop:bg-black/65">
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4"><div><h2 id="line-demo-title" className="flex items-center gap-2 font-semibold"><MessageCircle className="text-emerald-600" size={20} />ส่งสัญญาทาง LINE</h2><p className="mt-1 text-xs text-slate-500">ตัวอย่างการใช้งาน · ไม่ส่ง LINE จริง · ไม่บันทึกลายเซ็นลงสัญญา</p></div><button autoFocus aria-label="ปิดตัวอย่าง LINE" disabled={busy} onClick={onClose} className="rounded-full p-2 hover:bg-slate-100"><X size={20} /></button></div>
    <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(240px,1fr)_minmax(320px,460px)]">
      <section className="space-y-5">
        <div><span className="text-xs font-semibold tracking-wider text-emerald-600">หน้าของเจ้าของหอ</span><h3 className="mt-2 text-xl font-bold">ให้ผู้เช่าเซ็นจากแชต LINE</h3><p className="mt-2 text-sm leading-7 text-slate-500">เจ้าของหอเตรียมข้อความ ผู้เช่ากดเปิดสัญญาแล้วลงนามบนมือถือ ลองทำตามขั้นตอนในหน้าจอตัวอย่างด้านข้างได้เลย</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs text-slate-500">สัญญาเช่า · ห้อง {d.roomNumber}</p><p className="mt-2 font-semibold">{d.tenant || "ผู้เช่าตัวอย่าง"}</p><p className="mt-1 text-sm text-slate-500">{d.propertyName}</p><div role="status" className={`mt-4 rounded-xl p-3 text-sm ${signed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{signed ? "ผู้เช่าลงนามแล้ว (จำลอง)" : screen !== "chat" ? "ผู้เช่าเปิดอ่านแล้ว (จำลอง)" : sent ? "รอผู้เช่าเปิดอ่าน (จำลอง)" : "พร้อมทดลองส่ง"}</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="mb-3 text-sm font-semibold">ตัวอย่างข้อความถึงผู้เช่า</p><p className="whitespace-pre-line rounded-xl bg-slate-50 p-4 text-sm leading-7">สวัสดีค่ะ/ครับ ทางหอพักส่งสัญญาเช่าให้ตรวจสอบ กรุณาอ่านรายละเอียดและลงนามผ่านลิงก์ด้านล่าง โดยไม่ต้องสมัครบัญชี</p><p className="mt-3 text-xs leading-6 text-slate-500">โหมดนี้ใช้ปุ่มเปิดสัญญาในแชตจำลองแทนลิงก์จริง ไม่สามารถส่งให้เปิดจากอีกเครื่องได้</p><div className="mt-4 flex flex-wrap gap-2"><button className={button} disabled={sent} onClick={() => { setSent(true); setScreen("chat"); }}><Send size={15} />{sent ? "ส่งในตัวอย่างแล้ว" : "จำลองส่งทาง LINE"}</button><button onClick={() => void copyMessage()} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs"><Copy size={14} />{copied ? "คัดลอกข้อความตัวอย่างแล้ว" : "คัดลอกข้อความตัวอย่าง"}</button></div></div>
        <ol className="space-y-3 text-sm text-slate-500">{["จำลองส่งข้อความจากเจ้าของหอ", "กดเปิดสัญญาในแชตของผู้เช่า", "อ่านสัญญา ยอมรับ และทดลองเซ็น"].map((text, i) => <li key={text} className="flex items-center gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-700">{i+1}</span>{text}</li>)}</ol>
        {signed && <p className="rounded-xl bg-emerald-50 p-4 text-sm leading-7 text-emerald-700">สถานะฝั่งเจ้าของหอเปลี่ยนให้เห็นทันทีในตัวอย่างนี้ เมื่อเชื่อมระบบออนไลน์จึงจะรับลายเซ็นจากผู้เช่าคนละเครื่องได้</p>}
        {notice && <p role="alert" className="text-sm text-red-600">{notice}</p>}
      </section>
      <section aria-label="หน้าจอผู้เช่าจำลอง" className="min-w-0 overflow-hidden rounded-[28px] border-[6px] border-slate-800 bg-white shadow-xl">
        <div className="flex items-center justify-between bg-slate-800 px-4 pb-3 pt-2 text-xs text-white"><span className="flex items-center gap-2"><Smartphone size={13} />มุมมองมือถือผู้เช่า</span><span>DEMO</span></div>
        {screen === "chat" ? <div className="min-h-[510px] bg-[#dce8ec]"><div className="border-b border-slate-300 bg-[#e8f0f3] p-4 text-center text-sm font-semibold">{d.propertyName || "หอพัก"} · แชตตัวอย่าง</div><div className="p-4">{!sent ? <p className="mt-24 text-center text-sm leading-7 text-slate-500">กด “จำลองส่งทาง LINE”<br />เพื่อดูข้อความที่ผู้เช่าจะได้รับ</p> : <><p className="mb-4 text-center text-[10px] text-slate-500">ข้อความจำลอง · ไม่ได้ส่งไปยัง LINE</p><div className="mr-5 rounded-2xl rounded-tl-sm bg-white p-4 text-sm leading-7 shadow-sm">สวัสดีคุณ {d.tenant || "ผู้เช่า"}<br />กรุณาตรวจสอบสัญญาเช่าห้อง {d.roomNumber} และลงนามผ่านปุ่มด้านล่างได้เลยค่ะ/ครับ<div className="mt-4 rounded-xl border border-slate-200 p-3"><FileText size={25} className="mb-2 text-emerald-600" /><p className="font-semibold">สัญญาเช่าที่พักอาศัย</p><p className="text-xs text-slate-500">อ่านและเซ็นได้ ไม่ต้องสมัครบัญชี</p><button className={`${button} mt-4 w-full`} onClick={() => setScreen("read")}>เปิดสัญญา (ตัวอย่าง)</button></div></div></>}</div></div> : <div className="p-4">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3"><span className="text-xs font-bold text-emerald-700">PAKDEE · สัญญาเช่า</span><span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] text-amber-700">ทดลองเท่านั้น</span></div>
          {screen === "done" ? <div className="py-10 text-center"><CheckCircle2 size={56} className="mx-auto text-emerald-600" /><h3 className="mt-5 text-xl font-bold">ทดลองลงนามสำเร็จ</h3><p className="mt-3 text-sm leading-7 text-slate-500">หน้าของเจ้าของหอแสดงสถานะใหม่แล้ว<br />ลายเซ็นนี้ใช้แสดงตัวอย่างเท่านั้น</p>{/* Canvas data URL is local and intentionally unoptimized. */}<img className="mx-auto my-5 h-24 w-full object-contain" src={snapshot.signatures.tenant?.image} alt="ลายเซ็นตัวอย่างของผู้เช่า" /><p className="text-sm">{d.tenant}</p><button className={`${button} mx-auto mt-6`} onClick={() => setScreen("read")}>ดูเอกสารที่ทดลองเซ็น</button></div> : <>
            <h3 className="text-lg font-bold">{screen === "read" ? "ตรวจสอบสัญญาของคุณ" : "ลงลายเซ็นของคุณ"}</h3><p className="mb-4 mt-1 text-xs text-slate-500">ห้อง {d.roomNumber} · {d.tenant || "ผู้เช่าตัวอย่าง"}</p>
            {screen === "read" ? <><div className="max-h-[430px] overflow-y-auto rounded-xl border border-slate-200 [&_.lease-paper]:border-0 [&_.lease-paper]:p-4 [&_.lease-paper]:shadow-none [&_.paper-signatures]:grid-cols-1 [&_.paper-grid]:grid-cols-1 [&_h1]:text-xl">{renderDocument(snapshot)}</div>{signed ? <p className="mt-4 text-center text-sm text-emerald-700">ลงนามในตัวอย่างนี้แล้ว</p> : <><label className="my-4 flex gap-2 text-xs leading-6"><input type="checkbox" checked={read} onChange={e => setRead(e.target.checked)} className="mt-1 accent-emerald-600" />ฉันอ่านรายละเอียดสัญญาตัวอย่างครบแล้ว</label><button className={`${button} w-full`} disabled={!read} onClick={() => setScreen("sign")}>ถัดไป: ทดลองลงนาม</button></>}</> : <><button className="mb-4 flex items-center gap-1 text-xs text-slate-500" disabled={busy} onClick={() => { setInk(""); setConsent(false); setScreen("read"); }}><ArrowLeft size={13} />กลับไปอ่านสัญญา</button><div className="rounded-xl bg-slate-50 p-3 text-sm">ผู้ลงนาม: {d.tenant || "ผู้เช่าตัวอย่าง"}</div><div className="my-4"><SignaturePad onChange={setInk} disabled={busy} /></div><label className="my-4 flex gap-2 text-xs leading-6"><input type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)} className="mt-1 accent-emerald-600" />ฉันยอมรับเงื่อนไขและยินยอมทดลองใช้ลายเซ็นอิเล็กทรอนิกส์ในตัวอย่างนี้</label><button className={`${button} w-full`} disabled={!ink || !consent || busy} onClick={() => void sign()}>{busy ? "กำลังแสดงผล…" : "ยืนยันลายเซ็น (ทดลอง)"}</button><p className="mt-3 text-center text-[10px] text-slate-500">ไม่บันทึกลงสัญญาจริง และไม่ส่งข้อมูลออกจากเครื่อง</p></>}
          </>}
        </div>}
      </section>
    </div>
  </dialog>;
}
