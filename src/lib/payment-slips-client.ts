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
