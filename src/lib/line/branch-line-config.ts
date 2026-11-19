/**
 * LINE OA ของแต่ละสาขา (แต่ละบัญชีใช้ OA ของตัวเอง)
 *
 * ใช้ Channel Access Token / Channel Secret จากตั้งค่าสาขา (branch_settings) เท่านั้น
 * ไม่ใช้ LINE_CHANNEL_ACCESS_TOKEN / LINE_CHANNEL_SECRET ใน .env เป็นค่าสำรองอีกแล้ว:
 * เดิมสาขาที่ยังไม่ได้ตั้ง OA จะส่งบิล/ประกาศออกทาง OA ใน .env (ซึ่งเป็นของบัญชีอื่น)
 * และข้อความที่เข้า OA นั้นจะถูกนำไปประมวลผลกับทุกสาขาที่ไม่ได้ตั้ง OA
 */

export const LINE_OA_NOT_CONFIGURED =
  "ยังไม่ได้ตั้งค่า LINE OA ของสาขานี้ — ใส่ Channel Access Token และ Channel Secret ที่หน้า \"ตั้งค่าหอพัก & LINE OA\"";

type LineSettings = { lineChannelAccessToken?: string; lineChannelSecret?: string } | null | undefined;

/** Channel Access Token ของสาขา ("" = ยังไม่ได้ตั้ง) */
export function branchLineToken(settings: LineSettings): string {
  return String(settings?.lineChannelAccessToken || "").trim();
}

/** Channel Secret ของสาขา ("" = ยังไม่ได้ตั้ง) */
export function branchLineSecret(settings: LineSettings): string {
  return String(settings?.lineChannelSecret || "").trim();
}
