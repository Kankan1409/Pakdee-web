"use client";

/**
 * หน้าให้ผู้เช่าอ่านและลงนามสัญญา (เปิดจากปุ่มในข้อความ LINE) — ไม่ต้องเข้าสู่ระบบ
 * ใช้รหัสลับในลิงก์ + เบอร์โทร 4 ตัวท้ายยืนยันตัวตน เนื้อหาสัญญาถูกล็อกไว้ตั้งแต่ตอนส่ง
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

interface SignView {
  status: "pending" | "signed" | "cancelled" | "expired";
  contractNumber: string;
  roomNumber: string;
  tenantName: string;
  landlordName: string;
  contractHtml: string;
  contentHash: string;
  landlordSignatureUrl: string | null;
  tenantSignatureUrl: string | null;
  signedAt: string | null;
  expiresAt: string;
}

async function callApi(action: "get" | "sign", token: string, body?: unknown): Promise<SignView> {
  const res = await fetch(`/api/contracts/sign?action=${action}&token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาด กรุณาลองใหม่");
  return data as SignView;
}

export default function SignContractPage() {
  const params = useParams<{ token: string }>();
  const token = String(params?.token || "");
  const [view, setView] = useState<SignView | null>(null);
  const [loadError, setLoadError] = useState("");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  useEffect(() => {
    if (!token) return;
    callApi("get", token).then(setView).catch((e) => setLoadError(e.message));
  }, [token]);

  // Canvas sized to its box at device pixel ratio so the signature is sharp on phones
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setHasDrawn(false);
  }, []);

  useEffect(() => {
    if (view?.status === "pending") setupCanvas();
  }, [view?.status, setupCanvas]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = point(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawing.current = true;
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = point(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };
  const onUp = () => {
    drawing.current = false;
  };

  const submit = async () => {
    if (!canvasRef.current) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const signed = await callApi("sign", token, {
        phoneLast4,
        accepted,
        signatureDataUrl: canvasRef.current.toDataURL("image/png"),
      });
      setView(signed);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-slate-100 text-slate-900 py-4 px-3 sm:py-8">
      <div className="max-w-3xl mx-auto space-y-4">{children}</div>
    </div>
  );

  if (loadError) {
    return shell(
      <div className="bg-white rounded-2xl p-6 text-center space-y-2 shadow-sm">
        <div className="text-lg font-bold">ไม่สามารถเปิดสัญญาได้</div>
        <div className="text-sm text-slate-600">{loadError}</div>
      </div>
    );
  }
  if (!view) {
    return shell(<div className="bg-white rounded-2xl p-6 text-center text-sm text-slate-500 shadow-sm">กำลังโหลดสัญญา...</div>);
  }

  const signatureBlock = (
    <div className="grid grid-cols-2 gap-4 sm:gap-8 pt-6 border-t border-slate-200 text-center text-xs">
      <div>
        <div className="min-h-[64px] flex items-center justify-center border-b border-dashed border-slate-400 mb-2 pb-1">
          {view.landlordSignatureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={view.landlordSignatureUrl} alt="ลายเซ็นผู้ให้เช่า" className="h-12 max-w-[160px] object-contain" />
          ) : (
            <div className="text-[11px] text-slate-400 italic">ฝ่ายบริหารจัดการหอพัก</div>
          )}
        </div>
        <div>ผู้ให้เช่า</div>
        <div className="text-[11px] text-slate-600 mt-0.5">( {view.landlordName || "หอพัก"} )</div>
      </div>
      <div>
        <div className="min-h-[64px] flex items-center justify-center border-b border-dashed border-slate-400 mb-2 pb-1">
          {view.tenantSignatureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={view.tenantSignatureUrl} alt="ลายเซ็นผู้เช่า" className="h-12 max-w-[160px] object-contain" />
          ) : (
            <div className="h-8" />
          )}
        </div>
        <div>ผู้เช่า</div>
        <div className="text-[11px] text-slate-800 font-semibold mt-0.5">( {view.tenantName} )</div>
      </div>
    </div>
  );

  return shell(
    <>
      {view.status === "signed" && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-sm print:hidden">
          <div className="font-bold">✅ ลงนามสัญญาเรียบร้อยแล้ว</div>
          <div className="text-xs mt-1">
            เวลา {view.signedAt ? new Date(view.signedAt).toLocaleString("th-TH") : "-"} · บันทึกเป็น PDF ได้จากปุ่มด้านล่าง
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
          >
            พิมพ์ / บันทึกเป็น PDF
          </button>
        </div>
      )}
      {(view.status === "cancelled" || view.status === "expired") && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 text-sm">
          {view.status === "expired" ? "ลิงก์นี้หมดอายุแล้ว" : "ลิงก์นี้ถูกยกเลิกแล้ว"} กรุณาติดต่อหอพักเพื่อขอลิงก์ใหม่
        </div>
      )}

      <div className="bg-white rounded-2xl p-4 sm:p-8 shadow-sm">
        <div className="text-[11px] text-slate-500 mb-3 print:hidden">
          สัญญาเลขที่ {view.contractNumber} · ห้อง {view.roomNumber}
        </div>
        {/* เนื้อหาสัญญาที่ล็อกไว้ตอนส่ง (ผ่านการกรองฝั่งเซิร์ฟเวอร์แล้ว) */}
        <div
          className="space-y-4 text-[13px] leading-[1.8] text-black"
          dangerouslySetInnerHTML={{ __html: view.contractHtml }}
        />
        {signatureBlock}
        <div className="mt-4 text-[9px] text-slate-400 break-all">
          รหัสตรวจสอบเนื้อหาสัญญา (SHA-256): {view.contentHash}
        </div>
      </div>

      {view.status === "pending" && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 print:hidden">
          <div className="font-bold">ลงนามสัญญา</div>
          <label className="block text-sm space-y-1">
            <span>เบอร์โทรศัพท์ของคุณ 4 ตัวท้าย (เพื่อยืนยันตัวตน)</span>
            <input
              inputMode="numeric"
              maxLength={4}
              value={phoneLast4}
              onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="w-32 px-3 py-2 rounded-xl border border-slate-300 text-center text-lg tracking-widest"
              placeholder="••••"
            />
          </label>
          <div className="space-y-1">
            <div className="text-sm flex items-center justify-between">
              <span>เซ็นชื่อในกรอบด้านล่าง</span>
              <button type="button" onClick={setupCanvas} className="text-xs text-slate-500 underline">
                ล้างลายเซ็น
              </button>
            </div>
            <canvas
              ref={canvasRef}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerLeave={onUp}
              className="w-full h-44 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 touch-none"
            />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1" />
            <span>ข้าพเจ้าได้อ่านและเข้าใจข้อความในสัญญานี้ทั้งหมดแล้ว และตกลงลงนามด้วยลายมือชื่ออิเล็กทรอนิกส์</span>
          </label>
          {submitError && <div className="text-sm text-rose-600">{submitError}</div>}
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !accepted || !hasDrawn || phoneLast4.length !== 4}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-40"
          >
            {submitting ? "กำลังบันทึก..." : "ยืนยันลงนามสัญญา"}
          </button>
          <div className="text-[11px] text-slate-500">
            ลิงก์ใช้ได้ถึง {new Date(view.expiresAt).toLocaleString("th-TH")} · ระบบบันทึกวันเวลาและอุปกรณ์ที่ใช้ลงนามไว้เป็นหลักฐาน
          </div>
        </div>
      )}
    </>
  );
}
