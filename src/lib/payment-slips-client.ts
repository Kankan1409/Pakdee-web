export async function requestPaymentSlips(propertyId: string, action: string, id?: string, form?: FormData) {
  const user = JSON.parse(localStorage.getItem("pakdee_auth_session_v1") || "null");
  const password = localStorage.getItem("pakdee_user_password");
  if (!user?.id || !password) throw new Error("กรุณาเข้าสู่ระบบใหม่ก่อนดูสลิป");
  const encoded = btoa(Array.from(new TextEncoder().encode(`${user.id}:${password}`), b => String.fromCharCode(b)).join(""));
  const query = new URLSearchParams({ propertyId, action });
  if (id) query.set("id", id);
  const response = await fetch(`/api/payment-slips?${query}`, {
    method: "POST", headers: { Authorization: `Basic ${encoded}` }, body: form, cache: "no-store",
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "โหลดข้อมูลสลิปไม่สำเร็จ");
  }
  return response;
}

/** Same logged-in account check as requestPaymentSlips, for /api/line/reminders */
export async function requestLineReminders(propertyId: string, action: "preview" | "run" | "logs" | "test", roomNumber?: string) {
  const user = JSON.parse(localStorage.getItem("pakdee_auth_session_v1") || "null");
  const password = localStorage.getItem("pakdee_user_password");
  if (!user?.id || !password) throw new Error("กรุณาเข้าสู่ระบบใหม่");
  const encoded = btoa(Array.from(new TextEncoder().encode(`${user.id}:${password}`), b => String.fromCharCode(b)).join(""));
  const query = new URLSearchParams({ propertyId, action });
  if (roomNumber) query.set("roomNumber", roomNumber);
  const response = await fetch(`/api/line/reminders?${query}`, {
    method: "POST", headers: { Authorization: `Basic ${encoded}` }, cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "ดำเนินการแจ้งเตือนไม่สำเร็จ");
  return data;
}

/** Owner actions of /api/contracts/sign (same logged-in account check as requestPaymentSlips) */
export async function requestContractSign(propertyId: string, action: "create" | "status", body?: unknown) {
  const user = JSON.parse(localStorage.getItem("pakdee_auth_session_v1") || "null");
  const password = localStorage.getItem("pakdee_user_password");
  if (!user?.id || !password) throw new Error("กรุณาเข้าสู่ระบบใหม่");
  const encoded = btoa(Array.from(new TextEncoder().encode(`${user.id}:${password}`), b => String.fromCharCode(b)).join(""));
  const query = new URLSearchParams({ propertyId, action });
  const response = await fetch(`/api/contracts/sign?${query}`, {
    method: "POST",
    headers: { Authorization: `Basic ${encoded}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "ดำเนินการไม่สำเร็จ");
  return data;
}

/** /api/contracts/addenda (บันทึกแนบท้ายสัญญา) — owner only */
export async function requestContractAddenda(propertyId: string, action: "list" | "create" | "cancel", body?: unknown) {
  const user = JSON.parse(localStorage.getItem("pakdee_auth_session_v1") || "null");
  const password = localStorage.getItem("pakdee_user_password");
  if (!user?.id || !password) throw new Error("กรุณาเข้าสู่ระบบใหม่");
  const encoded = btoa(Array.from(new TextEncoder().encode(`${user.id}:${password}`), b => String.fromCharCode(b)).join(""));
  const query = new URLSearchParams({ propertyId, action });
  const response = await fetch(`/api/contracts/addenda?${query}`, {
    method: "POST",
    headers: { Authorization: `Basic ${encoded}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "ดำเนินการไม่สำเร็จ");
  return data;
}
