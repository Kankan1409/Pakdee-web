"use client";

import { useRef, useState } from "react";
import type { PointerEvent } from "react";
import { Eraser, PenLine } from "lucide-react";

export function SignaturePad({ onChange, disabled }: { onChange: (image: string) => void; disabled?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const active = useRef<number | null>(null);
  const distance = useRef(0);
  const previous = useRef({ x: 0, y: 0 });
  const [ink, setInk] = useState(false);
  function point(e: PointerEvent<HTMLCanvasElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - box.left) * 800 / box.width, y: (e.clientY - box.top) * 280 / box.height };
  }
  function finish(e: PointerEvent<HTMLCanvasElement>) {
    if (active.current !== e.pointerId) return;
    active.current = null;
    if (distance.current > 18) { setInk(true); onChange(e.currentTarget.toDataURL("image/png")); }
  }
  return <div className="space-y-2">
    <div className="relative overflow-hidden rounded-xl border border-slate-300 bg-white">
      {!ink && <div className="pointer-events-none absolute left-4 top-3 flex items-center gap-2 text-xs text-slate-400"><PenLine size={14} />เขียนลายเซ็นด้วยเมาส์ นิ้ว หรือปากกา</div>}
      <canvas ref={canvas} width={800} height={280} aria-label="พื้นที่วาดลายเซ็น" className="block h-40 w-full touch-none" style={{ cursor: disabled ? "default" : "crosshair" }}
        onPointerDown={e => { if (disabled || active.current !== null || e.button !== 0) return; e.preventDefault(); active.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); previous.current = point(e); }}
        onPointerMove={e => {
          if (active.current !== e.pointerId || disabled) return;
          const ctx = e.currentTarget.getContext("2d"); if (!ctx) return;
          const next = point(e); distance.current += Math.hypot(next.x - previous.current.x, next.y - previous.current.y);
          ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#172554";
          ctx.beginPath(); ctx.moveTo(previous.current.x, previous.current.y); ctx.lineTo(next.x, next.y); ctx.stroke(); previous.current = next;
        }} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish} />
    </div>
    <button type="button" disabled={disabled} onClick={() => { canvas.current?.getContext("2d")?.clearRect(0, 0, 800, 280); distance.current = 0; setInk(false); onChange(""); }} className="flex items-center gap-1 text-xs text-[var(--muted)] disabled:opacity-40"><Eraser size={14} /> ล้างลายเซ็น</button>
  </div>;
}
