"use client";

import React, { useCallback, useEffect, useState } from "react";
import { requestLineReminders } from "@/lib/payment-slips-client";
import type { Room } from "@/types/dormitory";

interface ReminderItem {
  invoiceNumber: string;
  roomNumber: string;
  tenantName: string;
  dueDate: string;
  kind: string;
  amount: number;
  hasLine: boolean;
  status?: string;
  error?: string;
}

interface ReminderLog {
  invoice_number: string;
  room_number: string | null;
  due_date: string | null;
  kind: string;
  status: string;
  error: string | null;
  sent_at: string;
}

const kindLabel = (kind: string) => {
  const [k, n] = kind.split(":");
  if (k === "before") return n === "0" ? "วันครบกำหนด" : `ก่อนครบกำหนด ${n} วัน`;
  if (k === "overdue") return `เลยกำหนด ${n} วัน`;
  return kind;
};

const statusLabel: Record<string, { text: string; cls: string }> = {
  sent: { text: "ส่งแล้ว", cls: "text-emerald-600 dark:text-emerald-400" },
  already_sent: { text: "ส่งไปแล้ว", cls: "text-[var(--muted)]" },
  failed: { text: "ส่งไม่สำเร็จ", cls: "text-rose-600 dark:text-rose-400" },
  no_line: { text: "ยังไม่ผูก LINE", cls: "text-amber-600 dark:text-amber-400" },
  simulated: { text: "ไม่มี LINE token", cls: "text-amber-600 dark:text-amber-400" },
};

/** "Today's reminders" + send-now + history, shown in Branch Settings > Notifications. */
export function LineRemindersPanel({ propertyId, rooms = [] }: { propertyId?: string; rooms?: Room[] }) {
  // ห้องที่ผู้เช่าผูก LINE แล้ว (ใช้กับปุ่มส่งทดสอบ)
  const linkedRooms = rooms.filter((r) => {
    const t = r.currentTenant;
    return Boolean(t && (/^U[0-9a-f]{32}$/i.test(t.lineUserId || "") || /^U[0-9a-f]{32}$/i.test(t.lineId || "")));
  });
  const [testRoom, setTestRoom] = useState<string>("");
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState<boolean>(false);
  const sendTest = async () => {
    const roomNo = testRoom || linkedRooms[0]?.roomNumber;
    if (!propertyId || !roomNo) return;
    setTesting(true);
    setTestResult(null);
    try {
      const data = await requestLineReminders(propertyId, "test", roomNo);
      setTestResult({ ok: true, text: data.message || "ส่งแล้ว" });
    } catch (e: any) {
      setTestResult({ ok: false, text: e?.message || String(e) });
    } finally {
      setTesting(false);
    }
  };
  const [items, setItems] = useState<ReminderItem[] | null>(null);
  const [skipReason, setSkipReason] = useState<string>("");
  const [logs, setLogs] = useState<ReminderLog[]>([]);
  const [busy, setBusy] = useState<"" | "preview" | "run">("");
  const [error, setError] = useState<string>("");

  const loadLogs = useCallback(async () => {
    if (!propertyId) return;
    try {
      const data = await requestLineReminders(propertyId, "logs");
      setLogs(Array.isArray(data.logs) ? data.logs : []);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }, [propertyId]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const call = async (action: "preview" | "run") => {
    if (!propertyId) return;
    setBusy(action);
    setError("");
    try {
      const data = await requestLineReminders(propertyId, action);
      setItems(Array.isArray(data.items) ? data.items : []);
      setSkipReason(data.skippedBranches?.[0]?.reason || "");
      if (action === "run") await loadLogs();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setBusy("");
    }
  };

  const pending = (items || []).filter((i) => !i.status || i.status === "failed");

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-[var(--foreground)] border-b border-[var(--border)] pb-2">
        แจ้งเตือนวันนี้ & ประวัติการส่ง
      </h3>
      <p className="text-[11px] text-[var(--muted)]">
        ระบบตรวจทุก 10 นาที และส่งเมื่อถึงเวลาที่ตั้งไว้ (ทำงานเฉพาะตอนที่เครื่องเซิร์ฟเวอร์เปิดอยู่) การเตือนแต่ละครั้งจะไม่ถูกส่งซ้ำ
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => call("preview")}
          disabled={!propertyId || busy !== ""}
          className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-xs font-semibold text-[var(--foreground)] hover:border-emerald-500 transition cursor-pointer disabled:opacity-50"
        >
          {busy === "preview" ? "กำลังตรวจ..." : "ดูรายการที่ต้องเตือนวันนี้"}
        </button>
        <button
          type="button"
          onClick={() => call("run")}
          disabled={!propertyId || busy !== "" || items === null || pending.length === 0}
          title={items === null ? "กด 'ดูรายการที่ต้องเตือนวันนี้' ก่อน" : pending.length === 0 ? "ไม่มีรายการที่ต้องส่ง" : ""}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy === "run" ? "กำลังส่ง..." : `ส่งเตือนตอนนี้ (${pending.length})`}
        </button>
      </div>

      <div className="p-3 rounded-xl bg-[var(--subtle)] border border-[var(--border)] space-y-2">
        <div className="text-xs font-semibold text-[var(--foreground)]">ส่งทดสอบ (ส่งทันที ไม่นับเป็นการเตือนจริง)</div>
        {linkedRooms.length === 0 ? (
          <div className="text-[11px] text-[var(--muted)]">ยังไม่มีห้องที่ผู้เช่าผูก LINE</div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={testRoom || linkedRooms[0].roomNumber}
              onChange={(e) => setTestRoom(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-xs"
            >
              {linkedRooms.map((r) => (
                <option key={r.id} value={r.roomNumber}>
                  ห้อง {r.roomNumber} — {r.currentTenant?.fullName}
                  {r.currentTenant?.Line_Acc || r.currentTenant?.lineDisplayName ? ` (LINE: ${r.currentTenant?.Line_Acc || r.currentTenant?.lineDisplayName})` : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={sendTest}
              disabled={!propertyId || testing}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              {testing ? "กำลังส่ง..." : "ส่งทดสอบ"}
            </button>
          </div>
        )}
        {testResult && (
          <div className={`text-[11px] ${testResult.ok ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {testResult.text}
          </div>
        )}
      </div>

      {error && <div className="text-[11px] text-rose-600 dark:text-rose-400">{error}</div>}
      {skipReason && <div className="text-[11px] text-amber-600 dark:text-amber-400">{skipReason}</div>}

      {items !== null && (
        <div className="rounded-xl border border-[var(--border)] divide-y divide-[var(--border)] text-xs">
          {items.length === 0 ? (
            <div className="p-3 text-[var(--muted)]">วันนี้ไม่มีบิลที่ต้องเตือน</div>
          ) : (
            items.map((i) => (
              <div key={`${i.invoiceNumber}-${i.kind}`} className="p-2.5 flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold text-[var(--foreground)]">
                    ห้อง {i.roomNumber} · {kindLabel(i.kind)}
                  </div>
                  <div className="text-[10px] text-[var(--muted)]">
                    {i.invoiceNumber} · ฿{Number(i.amount).toLocaleString()} · ครบกำหนด {i.dueDate}
                  </div>
                </div>
                <span className={`text-[11px] font-semibold ${statusLabel[i.status || ""]?.cls || (i.hasLine ? "text-[var(--foreground)]" : "text-amber-600")}`} title={i.error || ""}>
                  {statusLabel[i.status || ""]?.text || (i.hasLine ? "รอส่ง" : "ยังไม่ผูก LINE")}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      <div className="text-[11px] font-bold text-[var(--foreground)] pt-1">ประวัติการส่งล่าสุด</div>
      <div className="rounded-xl border border-[var(--border)] divide-y divide-[var(--border)] text-xs max-h-64 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="p-3 text-[var(--muted)]">ยังไม่มีประวัติการส่ง</div>
        ) : (
          logs.map((l, idx) => (
            <div key={idx} className="p-2.5 flex items-center justify-between gap-2">
              <div>
                <div className="font-semibold text-[var(--foreground)]">
                  ห้อง {l.room_number || "-"} · {kindLabel(l.kind)}
                </div>
                <div className="text-[10px] text-[var(--muted)]">
                  {l.invoice_number} · {new Date(l.sent_at).toLocaleString("th-TH")}
                </div>
              </div>
              <span className={`text-[11px] font-semibold ${statusLabel[l.status]?.cls || ""}`} title={l.error || ""}>
                {statusLabel[l.status]?.text || l.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
