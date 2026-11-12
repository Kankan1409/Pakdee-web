import { supabase } from "@/lib/supabase";
import {
  Property,
  Room,
  Tenant,
  Invoice,
  ContractItem,
  RepairItem,
  ExpenseItem,
  DailyBooking,
  BranchSettingsDetail,
  ActivityLogItem,
  RoomStatus,
  PlanType,
} from "@/types/dormitory";

const SHORT_ID_REGEX = /^[A-Z]\d{4}$/i;

const shortIdRegistry: Record<string, Map<string, string>> = {};
const shortIdCounters: Record<string, number> = {};

function detectPrefix(rawId: string, fallbackSeed: string): string {
  const combined = `${rawId} ${fallbackSeed}`.toLowerCase();
  if (combined.includes("-item-") || combined.startsWith("item-") || combined.startsWith("m")) return "M";
  if (combined.startsWith("settings-") || combined.includes("settings-")) return "S";
  if (combined.startsWith("bldg-") || combined.includes("bldg-")) return "B";
  if (combined.startsWith("prop-") || combined.includes("prop-")) return "P";
  if (combined.startsWith("tenant-") || combined.startsWith("t-") || combined.includes("tenant-")) return "T";
  if (combined.startsWith("room-") || combined.startsWith("r-") || combined.includes("room-")) return "R";
  if (combined.startsWith("contract-") || combined.startsWith("cnt-") || combined.includes("contract-")) return "C";
  if (combined.startsWith("inv-") || combined.includes("inv-")) return "I";
  if (combined.startsWith("mtr-") || combined.includes("mtr-")) return "W";
  if (combined.startsWith("repair-") || combined.startsWith("rep-") || combined.includes("repair-")) return "F";
  if (combined.startsWith("exp-") || combined.includes("exp-")) return "E";
  if (combined.startsWith("daily-") || combined.startsWith("b-auto-") || combined.includes("daily-")) return "D";
  if (combined.startsWith("usr-") || combined.startsWith("user-") || combined.includes("user-")) return "U";
  if (combined.startsWith("log-") || combined.includes("log-")) return "L";
  if (combined.startsWith("slip-") || combined.includes("slip-")) return "K";
  return "X";
}

function registerShortId(prefix: string, rawKey: string, shortId: string): string {
  const upPrefix = prefix.toUpperCase();
  const upShort = shortId.toUpperCase();
  if (!shortIdRegistry[upPrefix]) {
    shortIdRegistry[upPrefix] = new Map<string, string>();
  }
  shortIdRegistry[upPrefix].set(rawKey, upShort);
  const num = parseInt(upShort.slice(1), 10);
  if (!isNaN(num) && num > (shortIdCounters[upPrefix] || 0)) {
    shortIdCounters[upPrefix] = num;
  }
  return upShort;
}

/**
 * Converts any string ID (e.g. "prop-1", "room-101", "t-123")
 * into a clean 5-character short ID (1 letter prefix + 4 digits, e.g. "P0001", "R0001", "T0001").
 */
export function toUuid(rawId: string | undefined | null, fallbackSeed = "pakdee-default"): string {
  const str = String(rawId || "").trim();
  if (SHORT_ID_REGEX.test(str)) {
    const up = str.toUpperCase();
    return registerShortId(up[0], str.toLowerCase(), up);
  }

  const input = (str || fallbackSeed).trim();
  const lowerInput = input.toLowerCase();
  const prefix = detectPrefix(str, fallbackSeed);

  if (!shortIdRegistry[prefix]) {
    shortIdRegistry[prefix] = new Map<string, string>();
  }
  const existing = shortIdRegistry[prefix].get(lowerInput);
  if (existing) return existing;

  // Well-known deterministic mappings
  const propMatch = lowerInput.match(/^(?:bldg-|settings-)?prop-(\d{1,4})$/);
  if (propMatch) {
    const n = parseInt(propMatch[1], 10);
    if (n >= 1 && n <= 9999) {
      return registerShortId(prefix, lowerInput, `${prefix}${String(n).padStart(4, "0")}`);
    }
  }
  const shortPropMatch = lowerInput.match(/^(?:bldg-|settings-)p(\d{4})$/);
  if (shortPropMatch) {
    return registerShortId(prefix, lowerInput, `${prefix}${shortPropMatch[1]}`);
  }
  if (lowerInput === "bldg-a") {
    return registerShortId("B", lowerInput, "B0001");
  }
  if (lowerInput === "usr-owner-01") {
    return registerShortId("U", lowerInput, "U0001");
  }
  if (lowerInput === "usr-mgr-01") {
    return registerShortId("U", lowerInput, "U0002");
  }

  // Sequential 4-digit assignment (0001..9999)
  const nextNum = Math.min(9999, (shortIdCounters[prefix] || 0) + 1);
  shortIdCounters[prefix] = nextNum;
  const generated = `${prefix}${String(nextNum).padStart(4, "0")}`;
  return registerShortId(prefix, lowerInput, generated);
}

/**
 * Formats a date string into YYYY-MM-DD for PostgreSQL DATE columns.
 */
export function toPgDate(val: string | undefined | null, fallbackDate: string | null = null): string | null {
  if (!val) return fallbackDate;
  const trimmed = String(val).trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    let year = parseInt(isoMatch[1], 10);
    if (year > 2400) year -= 543;
    return `${year}-${isoMatch[2]}-${isoMatch[3]}`;
  }
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    let year = parseInt(slashMatch[3], 10);
    if (year > 2400) year -= 543;
    const month = slashMatch[2].padStart(2, "0");
    const day = slashMatch[1].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return fallbackDate;
}

/**
 * Formats a timestamp string into ISO 8601 for PostgreSQL TIMESTAMPTZ columns.
 */
export function toPgTimestamp(val: string | undefined | null, fallbackNow = false): string | null {
  if (!val) return fallbackNow ? new Date().toISOString() : null;
  const trimmed = String(val).trim();

  // (origin/main 2f42266) Handle ISO-like strings first (guard against Buddhist Era years > 2400)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?/);
  if (isoMatch) {
    let year = parseInt(isoMatch[1], 10);
    if (year > 2400) year -= 543;
    const h = isoMatch[4] || "00";
    const m = isoMatch[5] || "00";
    const s = isoMatch[6] || "00";
    const tz = isoMatch[7] || "+07:00";
    const parsed = new Date(`${year}-${isoMatch[2]}-${isoMatch[3]}T${h}:${m}:${s}${tz}`);
    if (!isNaN(parsed.getTime())) return parsed.toISOString();
  }

  // Handle Thai D/M/YYYY [HH:mm[:ss]] strings (avoid US M/D parsing and 2569 AD bug)
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (slashMatch) {
    let year = parseInt(slashMatch[3], 10);
    if (year > 2400) year -= 543;
    const month = slashMatch[2].padStart(2, "0");
    const day = slashMatch[1].padStart(2, "0");
    const h = (slashMatch[4] || "00").padStart(2, "0");
    const m = (slashMatch[5] || "00").padStart(2, "0");
    const s = (slashMatch[6] || "00").padStart(2, "0");
    const parsed = new Date(`${year}-${month}-${day}T${h}:${m}:${s}+07:00`);
    if (!isNaN(parsed.getTime())) return parsed.toISOString();
  }

  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    if (d.getUTCFullYear() > 2400) {
      d.setUTCFullYear(d.getUTCFullYear() - 543);
    }
    return d.toISOString();
  }
  return fallbackNow ? new Date().toISOString() : null;
}

/** (origin/main 2f42266) "YYYY-MM" from a meter month value; converts Buddhist Era years. */
function normalizeMeterMonth(raw: any): string {
  const str = String(raw || "").trim();
  const match = str.match(/^(\d{4})-(\d{2})/);
  if (match) {
    let year = parseInt(match[1], 10);
    if (year > 2400) year -= 543;
    return `${year}-${match[2]}`;
  }
  return new Date().toISOString().slice(0, 7);
}

// Cache of columns that do not exist in the remote Supabase schema for each table (persisted across HMR)
const globalCacheKey = "__PAKDEE_MISSING_COLUMNS__";
const missingColumnsCache: Record<string, Set<string>> =
  (globalThis as any)[globalCacheKey] ||
  ((globalThis as any)[globalCacheKey] = {
    tenants: new Set([
      "gender",
      "age",
      "tax_id",
      "email",
      "address",
      "id_card_image_url",
      "invoice_lang",
      "notes",
      "updated_at",
    ]),
  });

function stripMissingColumns(table: string, rows: Record<string, any>[]): Record<string, any>[] {
  const missing = missingColumnsCache[table];
  if (!missing || missing.size === 0) return rows;
  return rows.map((row) => {
    const copy: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
      if (!missing.has(k)) {
        copy[k] = v;
      }
    }
    return copy;
  });
}

/**
 * Schema-adaptive upsert that automatically strips any columns not present
 * in the target Supabase table and handles foreign-key / unique conflicts gracefully.
 */
export async function safeUpsert(
  table: string,
  rows: Record<string, any>[],
  onConflict = "id"
): Promise<boolean> {
  if (!rows || rows.length === 0) return true;
  if (!missingColumnsCache[table]) {
    missingColumnsCache[table] = new Set();
  }

  let currentConflict = onConflict;
  let currentRows = dedupeRows(stripMissingColumns(table, rows), onConflict);

  for (let attempt = 0; attempt < 12; attempt++) {
    const { error } = await supabase.from(table).upsert(currentRows, { onConflict: currentConflict });
    if (!error) return true;

    const msg = error.message || "";

    // 0. Same key twice in one batch ("ON CONFLICT DO UPDATE command cannot affect row a second time")
    if (msg.includes("cannot affect row a second time")) {
      currentRows = dedupeRows(currentRows, currentConflict);
      continue;
    }

    // 1. Missing column in PostgREST schema cache or PostgreSQL table
    const colMatch =
      msg.match(/Could not find the '([^']+)' column/i) ||
      msg.match(/column "([^"]+)" of relation "[^"]+" does not exist/i);
    if (colMatch && colMatch[1]) {
      const badCol = colMatch[1];
      missingColumnsCache[table].add(badCol);
      currentRows = stripMissingColumns(table, currentRows);
      continue;
    }

    // 2. ON CONFLICT target does not exist
    if (msg.includes("no unique or exclusion constraint") && currentConflict !== "id") {
      currentConflict = "id";
      continue;
    }

    // 3. Retry supported alternate unique keys
    if (msg.includes("duplicate key value violates unique constraint")) {
      if (table === "rooms" && currentConflict !== "building_id,room_number") {
        currentConflict = "building_id,room_number";
        continue;
      }
      if (table === "contracts" && currentConflict !== "contract_number") {
        currentConflict = "contract_number";
        continue;
      }
      if (table === "invoices" && currentConflict !== "invoice_number") {
        currentConflict = "invoice_number";
        continue;
      }
      if (table === "branch_settings" && currentConflict !== "property_id") {
        currentConflict = "property_id";
        continue;
      }
    }

    // 4. Foreign Key constraint violation on nullable FK columns
    if (msg.includes("violates foreign key constraint")) {
      let fkFixed = false;
      const nullableFks = ["building_id", "current_tenant_id", "room_id", "tenant_id", "property_id"];
      for (const fkCol of nullableFks) {
        if (msg.includes(fkCol) && currentRows.some((r) => r[fkCol] !== null && r[fkCol] !== undefined)) {
          currentRows = currentRows.map((r) => ({ ...r, [fkCol]: null }));
          fkFixed = true;
          break;
        }
      }
      if (fkFixed) continue;
    }

    console.warn(`[Supabase Relational] Upsert ${table} failed:`, error.code, msg, error.details || "");
    return false;
  }
  console.warn(`[Supabase Relational] Upsert ${table} gave up after retries`);
  return false;
}

/**
 * Keeps one row per conflict key (the last one wins). Postgres rejects an upsert batch
 * that contains the same key twice, which fails the WHOLE batch with HTTP 400.
 */
function dedupeRows(rows: Record<string, any>[], conflict: string): Record<string, any>[] {
  const cols = conflict.split(",").map((c) => c.trim());
  const byKey = new Map<string, Record<string, any>>();
  const noKey: Record<string, any>[] = [];
  for (const r of rows) {
    if (cols.some((c) => r[c] === null || r[c] === undefined)) {
      noKey.push(r);
      continue;
    }
    byKey.set(cols.map((c) => String(r[c]).toLowerCase()).join("|"), r);
  }
  return [...byKey.values(), ...noKey];
}

/**
 * Deletes rows in `table` whose `id` is not in `keepIds` so deleted items in the app
 * are also removed from the corresponding Supabase relational table.
 */
// Tables whose rows belong to a branch (property) and must go when the branch is deleted.
// Order matters: children before parents (invoice_items/meter_readings cascade from invoices/rooms).
const BRANCH_CHILD_TABLES = [
  // payment_slips -> invoices is ON DELETE RESTRICT, so slips must go before their bills
  "payment_slips",
  "invoices",
  "contracts",
  "repairs",
  "expenses",
  "rooms",
  "buildings",
  "branch_settings",
] as const;

/**
 * Permanently removes branches (properties) and every row that belongs to them.
 * Does not rely on the FK's ON DELETE rule, which on some databases is SET NULL and
 * would leave orphan rows (property_id = NULL) behind.
 */
export async function deletePropertiesCascade(propertyIds: string[]): Promise<void> {
  const ids = Array.from(new Set(propertyIds.filter(Boolean)));
  if (ids.length === 0) return;
  for (const table of BRANCH_CHILD_TABLES) {
    const { error } = await supabase.from(table).delete().in("property_id", ids);
    if (error) console.warn(`[Supabase Relational] Delete ${table} for branch failed:`, error.message);
  }
  const { error } = await supabase.from("properties").delete().in("id", ids);
  if (error) console.warn("[Supabase Relational] Delete properties failed:", error.message);
}

export async function pruneOrphanRows(table: string, keepIds: string[]): Promise<void> {
  try {
    const { data: existing, error } = await supabase.from(table).select("id");
    if (error || !existing || existing.length === 0) return;
    const keepSet = new Set(keepIds.map((id) => id.toLowerCase()));
    let toDelete = existing
      .map((row: any) => String(row.id))
      .filter((id) => !keepSet.has(id.toLowerCase()));

    // Never delete a tenant that still has invoices: the FK is ON DELETE SET NULL, so the
    // bill (often still unpaid) would lose who owes it. Keep former tenants as history.
    if (table === "tenants" && toDelete.length > 0) {
      const { data: billed } = await supabase.from("invoices").select("tenant_id").in("tenant_id", toDelete);
      const billedSet = new Set((billed || []).map((r: any) => String(r.tenant_id).toLowerCase()));
      toDelete = toDelete.filter((id) => !billedSet.has(id.toLowerCase()));
    }

    if (table === "properties") {
      await deletePropertiesCascade(toDelete);
      return;
    }

    if (toDelete.length > 0) {
      if (table === "tenants") {
        await supabase.from("rooms").update({ current_tenant_id: null }).in("current_tenant_id", toDelete);
      }
      await supabase.from(table).delete().in("id", toDelete);
    }
  } catch {}
}

// ============================================================================
// INDIVIDUAL TABLE SYNC FUNCTIONS (WEB APP -> SUPABASE RELATIONAL TABLES)
// ============================================================================

export async function syncPropertiesToSupabase(properties: Property[]): Promise<void> {
  const rows = properties.map((p) => ({
    id: toUuid(p.id, `prop-${p.name}`),
    name: p.name || "",
    address: p.address || "",
    phone: p.phone || "",
    promptpay_number: p.promptpayNumber || "",
    promptpay_name: p.promptpayName || "",
    electric_rate: Number(p.electricRate ?? 8),
    water_rate: Number(p.waterRate ?? 18),
    plan: p.plan || "pro",
    // Which account owns this branch — keeps branches separate between accounts/devices
    owner_id: (p as any).ownerId || null,
    owner_phone: (p as any).ownerPhone || null,
    updated_at: new Date().toISOString(),
  }));

  await safeUpsert("properties", rows, "id");

  // Also ensure a default building exists for each property
  const buildingRows = properties.map((p) => {
    const propId = p.id || "prop-1";
    const bldgId = propId === "prop-1" ? "bldg-a" : `bldg-${propId}`;
    return {
      id: toUuid(bldgId),
      property_id: toUuid(propId),
      name: "อาคาร A",
      total_floors: 4,
    };
  });
  await safeUpsert("buildings", buildingRows, "id");
}

export async function syncBranchSettingsToSupabase(
  propertyId: string,
  settings: BranchSettingsDetail
): Promise<void> {
  if (!propertyId || !settings) return;
  const propUuid = toUuid(propertyId);
  const row = {
    id: toUuid(settings.id || `settings-${propertyId}`),
    property_id: propUuid,
    branch_name: settings.branchName || "",
    address: settings.address || "",
    phone: settings.phone || "",
    owner_name: settings.ownerName || "",
    owner_phone: settings.ownerPhone || "",
    tax_id: settings.taxId || "",
    water_rate: Number(settings.waterRate ?? 18),
    electric_rate: Number(settings.electricRate ?? 8),
    use_min_water: Boolean(settings.useMinWater),
    min_water_units: Number(settings.minWaterUnits ?? 5),
    min_water_fee: Number(settings.minWaterFee ?? 100),
    use_min_electric: Boolean(settings.useMinElectric),
    min_electric_units: Number(settings.minElectricUnits ?? 10),
    min_electric_fee: Number(settings.minElectricFee ?? 150),
    common_fee: Number(settings.commonFee ?? 300),
    internet_fee: Number(settings.internetFee ?? 0),
    parking_fee: Number(settings.parkingFee ?? 0),
    bill_cycle_day: Number(settings.billCycleDay ?? 25),
    bill_due_day: Number(settings.billDueDay ?? 5),
    late_fee_per_day: Number(settings.lateFeePerDay ?? 50),
    bank_name: settings.bankName || "",
    bank_account_number: settings.bankAccountNumber || "",
    bank_account_name: settings.bankAccountName || "",
    promptpay_number: settings.promptpayNumber || "",
    promptpay_name: settings.promptpayName || "",
    line_channel_access_token: settings.lineChannelAccessToken || "",
    line_channel_secret: settings.lineChannelSecret || "",
    signature_url: settings.signatureUrl || "",
    stamp_url: settings.stampUrl || "",
    contract_terms: settings.contractTerms || "",
    // JSONB column (docs/supabase_branch_notification_settings.sql); stripped by safeUpsert if missing
    notification_settings: settings.notificationSettings ?? null,
    updated_at: new Date().toISOString(),
  };

  await safeUpsert("branch_settings", [row], "property_id");
}

/**
 * Merges explicit tenants from KEYS.TENANTS with any active currentTenant on rooms
 * and active contracts so no tenant is ever missing from `public.tenants`.
 */
export function collectUnifiedTenants(
  rawTenants: Tenant[],
  rawRooms: Room[] = [],
  rawContracts: ContractItem[] = []
): Tenant[] {
  const byKey = new Map<string, Tenant>();

  for (const t of rawTenants || []) {
    if (!t || !t.fullName) continue;
    const existingByName = Array.from(byKey.values()).find(
      (x) =>
        x.fullName.trim() === t.fullName.trim() &&
        (x.propertyId || "prop-1") === (t.propertyId || "prop-1")
    );
    if (existingByName) {
      const mergedId = toUuid(
        existingByName.idCard && existingByName.idCard !== "-" ? existingByName.id : t.id
      );
      byKey.delete(toUuid(existingByName.id));
      byKey.set(mergedId, {
        ...existingByName,
        ...t,
        id: mergedId,
        idCard:
          t.idCard && t.idCard !== "-"
            ? t.idCard
            : existingByName.idCard && existingByName.idCard !== "-"
            ? existingByName.idCard
            : t.idCard || "-",
        lineId: t.lineId || t.lineUserId || existingByName.lineId || existingByName.lineUserId,
        lineUserId: t.lineUserId || existingByName.lineUserId,
      });
    } else {
      const key = t.id ? toUuid(t.id) : `${t.fullName.trim()}|${(t.phone || "").trim()}`;
      byKey.set(key, {
        ...t,
        id: toUuid(t.id || `tenant-${t.fullName}-${t.phone}`),
      });
    }
  }

  for (const r of rawRooms || []) {
    if (r?.currentTenant?.fullName) {
      const ct = r.currentTenant;
      const uuid = toUuid(ct.id || `tenant-${r.propertyId || "prop-1"}-${r.roomNumber}-${ct.fullName}`);
      const existing = byKey.get(uuid) || Array.from(byKey.values()).find(
        (x) => x.fullName.trim() === ct.fullName.trim()
      );
      if (existing) {
        byKey.set(toUuid(existing.id), {
          ...existing,
          ...ct,
          id: toUuid(existing.id),
          idCard:
            ct.idCard && ct.idCard !== "-"
              ? ct.idCard
              : existing.idCard && existing.idCard !== "-"
              ? existing.idCard
              : ct.idCard || "-",
          lineId: ct.lineId || ct.lineUserId || existing.lineId || existing.lineUserId,
          lineUserId: ct.lineUserId || existing.lineUserId,
          emergencyContact: ct.emergencyContact || existing.emergencyContact,
          vehiclePlate: ct.vehiclePlate || existing.vehiclePlate,
          propertyId: ct.propertyId || r.propertyId || existing.propertyId || "prop-1",
          roomId: r.id,
          roomNumber: r.roomNumber,
        });
      } else {
        byKey.set(uuid, {
          ...ct,
          id: uuid,
          propertyId: ct.propertyId || r.propertyId || "prop-1",
          roomId: r.id,
          roomNumber: r.roomNumber,
        });
      }
    }
  }

  for (const c of rawContracts || []) {
    if (c && c.tenantName && c.status !== "terminated" && c.status !== "expired") {
      const alreadyExists = Array.from(byKey.values()).some(
        (x) => x.fullName.trim() === c.tenantName.trim()
      );
      if (!alreadyExists) {
        const uuid = toUuid(`tenant-contract-${c.propertyId || "prop-1"}-${c.roomNumber}-${c.tenantName}`);
        byKey.set(uuid, {
          id: uuid,
          propertyId: c.propertyId || "prop-1",
          roomNumber: c.roomNumber,
          fullName: c.tenantName,
          phone: c.tenantPhone || "-",
          idCard: "-",
          depositAmount: c.depositAmount,
          hasTv: c.hasTv,
          tvRentalFee: c.tvRentalFee,
          hasFridge: c.hasFridge,
          fridgeRentalFee: c.fridgeRentalFee,
          hasCommonFee: c.hasCommonFee,
          commonFee: c.commonFee,
          hasWifi: c.hasWifi,
          wifiFee: c.wifiFee,
          hasParking: c.hasParking,
          parkingFee: c.parkingFee,
          additionalFees: c.additionalFees,
        });
      }
    }
  }

  return Array.from(byKey.values());
}

export async function syncTenantsToSupabase(
  tenants: Tenant[],
  rooms: Room[] = [],
  contracts: ContractItem[] = []
): Promise<void> {
  const unified = collectUnifiedTenants(tenants, rooms, contracts);
  const rows = unified.map((t) => ({
    id: toUuid(t.id, `tenant-${t.fullName}-${t.phone}`),
    full_name: t.fullName || "ไม่ระบุชื่อ",
    phone: t.phone || "-",
    id_card: (t.idCard || "").slice(0, 20),
    gender: (t.gender || "MALE").slice(0, 10),
    age: Number(t.age || 25),
    line_id: t.lineId || t.lineUserId || "",
    // LINE display name only — never the LINE user ID (that lives in line_id)
    Line_Acc: t.Line_Acc || t.lineAcc || t.lineDisplayName || null,
    tax_id: t.taxId || "",
    email: t.email || "",
    address: t.address || "",
    emergency_contact: t.emergencyContact || "",
    vehicle_plate: t.vehiclePlate || "",
    id_card_image_url: t.idCardImageUrl || "",
    invoice_lang: (t.invoiceLang || "TH").slice(0, 10),
    notes: t.notes || (t.roomNumber ? `ห้อง ${t.roomNumber}` : ""),
    updated_at: new Date().toISOString(),
  }));

  await safeUpsert("tenants", rows, "id");
  await pruneOrphanRows("tenants", rows.map((r) => r.id));
}

export async function syncRoomsToSupabase(
  rooms: Room[],
  tenants: Tenant[] = [],
  contracts: ContractItem[] = []
): Promise<void> {
  // 1. Ensure buildings referenced by rooms exist first
  const buildingMap = new Map<string, { id: string; property_id: string; name: string; total_floors: number }>();
  for (const r of rooms) {
    const propId = r.propertyId || "prop-1";
    const bldgId = r.buildingId || (propId === "prop-1" ? "bldg-a" : `bldg-${propId}`);
    const bldgUuid = toUuid(bldgId);
    if (!buildingMap.has(bldgUuid)) {
      buildingMap.set(bldgUuid, {
        id: bldgUuid,
        property_id: toUuid(propId),
        name: "อาคาร A",
        total_floors: Math.max(4, r.floor || 1),
      });
    }
  }
  if (buildingMap.size > 0) {
    await safeUpsert("buildings", Array.from(buildingMap.values()), "id");
  }

  // 2. Ensure tenants referenced by rooms exist in public.tenants first
  const unifiedTenants = collectUnifiedTenants(tenants, rooms, contracts);
  if (unifiedTenants.length > 0) {
    await syncTenantsToSupabase(tenants, rooms, contracts);
  }

  // 3. Map rooms to public.rooms schema
  const rows = rooms.map((r) => {
    const propId = r.propertyId || "prop-1";
    const bldgId = r.buildingId || (propId === "prop-1" ? "bldg-a" : `bldg-${propId}`);
    let tenantUuid: string | null = null;
    if (r.currentTenant?.fullName) {
      const matched = unifiedTenants.find(
        (t) =>
          (r.currentTenant?.id && toUuid(t.id) === toUuid(r.currentTenant.id)) ||
          t.fullName.trim() === r.currentTenant?.fullName.trim()
      );
      tenantUuid = matched
        ? toUuid(matched.id)
        : toUuid(r.currentTenant.id || `tenant-${propId}-${r.roomNumber}-${r.currentTenant.fullName}`);
    }

    return {
      id: toUuid(r.id, `room-${propId}-${r.roomNumber}`),
      property_id: toUuid(propId),
      building_id: toUuid(bldgId),
      room_number: String(r.roomNumber),
      floor: Number(r.floor || 1),
      type: (r.type || "Standard").slice(0, 50),
      monthly_rate: Number(r.monthlyRate || 4000),
      daily_rate: Number(r.dailyRate || 650),
      status: (r.status || "vacant").slice(0, 30),
      current_electric_meter: Number(r.currentElectricMeter || 0),
      current_water_meter: Number(r.currentWaterMeter || 0),
      current_tenant_id: tenantUuid,
      lease_end_date: toPgDate(r.leaseEndDate, null),
      updated_at: new Date().toISOString(),
    };
  });

  await safeUpsert("rooms", rows, "id");
}

export async function syncContractsToSupabase(
  contracts: ContractItem[],
  rooms: Room[] = [],
  tenants: Tenant[] = []
): Promise<void> {
  // Ensure any tenant named in contracts is synced to public.tenants
  if (contracts.length > 0) {
    await syncTenantsToSupabase(tenants, rooms, contracts);
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const nextYearStr = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);

  const rows = contracts.map((c) => {
    const propId = c.propertyId || "prop-1";
    const matchedRoom = rooms.find(
      (r) => (r.propertyId || "prop-1") === propId && r.roomNumber === c.roomNumber
    );
    const roomUuid = matchedRoom ? toUuid(matchedRoom.id) : null;

    return {
      id: toUuid(c.id, `contract-${c.contractNumber}`),
      property_id: toUuid(propId),
      contract_number: c.contractNumber || `CT-${c.roomNumber}-${Date.now()}`,
      room_id: roomUuid,
      room_number: String(c.roomNumber || ""),
      tenant_name: c.tenantName || "ไม่ระบุชื่อ",
      tenant_phone: c.tenantPhone || "-",
      start_date: toPgDate(c.startDate, todayStr)!,
      end_date: toPgDate(c.endDate, nextYearStr)!,
      monthly_rent: Number(c.monthlyRent || 0),
      deposit_amount: Number(c.depositAmount || 0),
      advance_rent: Number(c.advanceRent || 0),
      status: (c.status || "active").slice(0, 30),
      terms_text: c.terms || (c.clauses ? JSON.stringify(c.clauses) : ""),
      signed_at: toPgTimestamp(c.signedAt, false),
      // Signatures (docs/supabase_contract_signing.sql). Only sent when present so a device
      // without the signature in memory never erases one saved by another device / the tenant.
      ...(c.signatureUrl ? { tenant_signature_url: c.signatureUrl } : {}),
      ...(c.landlordSignatureUrl ? { landlord_signature_url: c.landlordSignatureUrl } : {}),
    };
  });

  await safeUpsert("contracts", rows, "id");
}

export async function syncInvoicesToSupabase(
  invoices: Invoice[],
  rooms: Room[] = [],
  tenants: Tenant[] = []
): Promise<void> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const unifiedTenants = collectUnifiedTenants(tenants, rooms);

  const invoiceRows: Record<string, any>[] = [];
  const itemRows: Record<string, any>[] = [];

  for (const inv of invoices) {
    const propId = inv.propertyId || "prop-1";
    const invUuid = toUuid(inv.id, `inv-${inv.invoiceNumber}`);
    const matchedRoom = rooms.find(
      (r) => (r.propertyId || "prop-1") === propId && r.roomNumber === inv.roomNumber
    );
    // Resolve the invoice's tenant, most reliable first:
    // 1) stored tenantId  2) same name (prefer same room)  3) the room's current tenant
    // Daily bills are named "<guest> (รายวัน)"; compare without that suffix so they link to the guest
    const invName = (inv.tenantName || "").replace(/\s*\(รายวัน\)\s*$/, "").trim();
    const sameName = (t: Tenant) => Boolean(invName) && t.fullName.trim() === invName;
    const roomTenant = matchedRoom?.currentTenant;
    const matchedTenant =
      (inv.tenantId ? unifiedTenants.find((t) => toUuid(t.id) === toUuid(inv.tenantId)) : undefined) ||
      unifiedTenants.find((t) => sameName(t) && t.roomNumber === inv.roomNumber) ||
      unifiedTenants.find(sameName) ||
      (roomTenant
        ? unifiedTenants.find(
            (t) =>
              (roomTenant.id && toUuid(t.id) === toUuid(roomTenant.id)) ||
              (roomTenant.fullName && t.fullName.trim() === roomTenant.fullName.trim())
          )
        : undefined);

    const billingMonth = (inv.billingDate || todayStr).slice(0, 7);

    invoiceRows.push({
      id: invUuid,
      property_id: toUuid(propId),
      invoice_number: inv.invoiceNumber || `INV-${inv.roomNumber}-${Date.now()}`,
      room_id: matchedRoom ? toUuid(matchedRoom.id) : null,
      tenant_id: matchedTenant ? toUuid(matchedTenant.id) : null,
      // Name/phone as written on the bill, kept even if the tenant record is later removed
      tenant_name: inv.tenantName || null,
      tenant_phone: inv.tenantPhone || null,
      billing_month: billingMonth,
      due_date: toPgDate(inv.dueDate, todayStr)!,
      total_amount: Number(inv.totalAmount || 0),
      status: (inv.status || "unpaid").slice(0, 30),
      slip_url: inv.slipUrl || "",
      paid_at: toPgTimestamp(inv.paidAt, inv.status === "paid"),
    });

    (inv.items || []).forEach((item, idx) => {
      itemRows.push({
        id: toUuid(item.id || `${invUuid}-item-${idx}`),
        invoice_id: invUuid,
        name: item.name || "รายการค่าใช้จ่าย",
        units: item.units !== undefined ? Number(item.units) : null,
        rate: item.rate !== undefined ? Number(item.rate) : null,
        amount: Number(item.amount || 0),
        meter_prev: item.meterPrev !== undefined ? Number(item.meterPrev) : null,
        meter_curr: item.meterCurr !== undefined ? Number(item.meterCurr) : null,
      });
    });
  }

  await safeUpsert("invoices", invoiceRows, "id");

  if (itemRows.length > 0) {
    await safeUpsert("invoice_items", itemRows, "id");
  }
}

export async function syncMeterReadingsToSupabase(
  readings: any[],
  rooms: Room[] = []
): Promise<void> {
  const rows = (readings || []).map((m, idx) => {
    const propId = m.property_id || "prop-1";
    const matchedRoom = rooms.find(
      (r) =>
        r.id === m.room_id ||
        toUuid(r.id) === toUuid(m.room_id) ||
        ((r.propertyId || "prop-1") === propId && r.roomNumber === m.room_number)
    );
    const roomUuid = matchedRoom ? toUuid(matchedRoom.id) : toUuid(m.room_id || `room-${m.room_number}`);
    const monthStr = normalizeMeterMonth(m.reading_month ?? m.billing_month).slice(0, 10);
    const elecPrev = Number(m.electric_prev || 0);
    const elecCurr = Number(m.electric_curr || 0);
    const elecUnits = Number(m.electric_units ?? Math.max(0, elecCurr - elecPrev)) || Math.max(0, elecCurr - elecPrev);
    const waterPrev = Number(m.water_prev || 0);
    const waterCurr = Number(m.water_curr || 0);
    const waterUnits = Number(m.water_units ?? Math.max(0, waterCurr - waterPrev)) || Math.max(0, waterCurr - waterPrev);

    return {
      id: toUuid(m.id || `mtr-${roomUuid}-${monthStr}-${idx}`),
      room_id: roomUuid,
      // Include both schemas; safeUpsert automatically strips whichever column does not exist.
      reading_month: monthStr,
      billing_month: monthStr,
      electric_prev: elecPrev,
      electric_curr: elecCurr,
      electric_units: elecUnits,
      water_prev: waterPrev,
      water_curr: waterCurr,
      water_units: waterUnits,
      recorded_at: toPgTimestamp(m.recorded_at, true)!,
    };
  });

  await safeUpsert("meter_readings", rows, "id");
}

export async function syncRepairsToSupabase(repairs: RepairItem[]): Promise<void> {
  const rows = (repairs || []).map((r) => ({
    id: toUuid(r.id, `repair-${r.roomNumber}-${r.title}`),
    property_id: toUuid(r.propertyId || "prop-1"),
    room_number: String(r.roomNumber || ""),
    tenant_name: "",
    category: (r.category || "other").slice(0, 50),
    title: r.title || "แจ้งซ่อม",
    description: r.description || "",
    status: (r.status || "pending").slice(0, 30),
    technician_name: r.technicianName || "",
    cost: Number(r.cost || 0),
    reported_at: toPgTimestamp(r.reportedAt, true)!,
    completed_at: toPgTimestamp(r.completedAt, r.status === "completed"),
  }));

  await safeUpsert("repairs", rows, "id");
}

export async function syncExpensesToSupabase(expenses: ExpenseItem[]): Promise<void> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const rows = (expenses || []).map((e) => ({
    id: toUuid(e.id, `exp-${e.title}-${e.date}`),
    property_id: toUuid(e.propertyId || "prop-1"),
    title: e.title || "รายจ่าย",
    category: (e.category || "other").slice(0, 50),
    amount: Number(e.amount || 0),
    expense_date: toPgDate(e.date, todayStr)!,
    notes: e.notes || (e.paidTo ? `จ่ายให้: ${e.paidTo}` : ""),
  }));

  await safeUpsert("expenses", rows, "id");
}

export async function syncDailyBookingsToSupabase(bookings: DailyBooking[]): Promise<void> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const rows = (bookings || []).map((b) => ({
    id: toUuid(b.id, `daily-${b.roomNumber}-${b.checkInDate}`),
    room_number: String(b.roomNumber || ""),
    guest_name: b.guestName || "ผู้เข้าพักรายวัน",
    guest_phone: b.guestPhone || "-",
    check_in_date: toPgDate(b.checkInDate, todayStr)!,
    check_in_time: (b.checkInTime || "14:00").slice(0, 10),
    check_out_date: toPgDate(b.checkOutDate, tomorrowStr)!,
    check_out_time: (b.checkOutTime || "12:00").slice(0, 10),
    nights: Number(b.nights || 1),
    daily_rate: Number(b.dailyRate || 650),
    total_room_price: Number(b.totalRoomPrice || 650),
    key_deposit: Number(b.keyDeposit ?? 500),
    status: (b.status || "confirmed").slice(0, 30),
  }));

  await safeUpsert("daily_bookings", rows, "id");
}

export async function syncActivityLogsToSupabase(logs: ActivityLogItem[]): Promise<void> {
  const rows = (logs || []).slice(0, 50).map((l, idx) => ({
    id: toUuid(l.id, `log-${idx}-${l.description}`),
    user_name: l.userName || "เจ้าของหอพัก",
    action: (l.action || "UPDATE").slice(0, 20),
    entity: (l.entity || "ROOM").slice(0, 30),
    description: l.description || "",
  }));

  await safeUpsert("activity_logs", rows, "id");
}

/**
 * Dispatches any normalized store key update to its corresponding relational table(s) in Supabase.
 */
export async function syncKeyToRelationalTable(
  normKey: string,
  value: any,
  memoryDb: Record<string, any>
): Promise<void> {
  try {
    const rooms: Room[] = Array.isArray(memoryDb["rooms"]) ? memoryDb["rooms"] : [];
    const tenants: Tenant[] = Array.isArray(memoryDb["tenants"]) ? memoryDb["tenants"] : [];
    const contracts: ContractItem[] = Array.isArray(memoryDb["contracts"]) ? memoryDb["contracts"] : [];

    if (normKey === "properties" && Array.isArray(value)) {
      // No auto-prune here: another device/account may have created branches this device
      // hasn't loaded yet. Branches are removed only by an explicit deleteBranch().
      await syncPropertiesToSupabase(value);
    } else if (normKey.startsWith("branch_settings_") && value && typeof value === "object") {
      const propId = normKey.replace("branch_settings_", "");
      await syncBranchSettingsToSupabase(propId, value);
    } else if (normKey === "tenants" && Array.isArray(value)) {
      await syncTenantsToSupabase(value, rooms, contracts);
      const unified = collectUnifiedTenants(value, rooms, contracts);
      await pruneOrphanRows("tenants", unified.map((t) => toUuid(t.id, `tenant-${t.fullName}-${t.phone}`)));
    } else if (normKey === "rooms" && Array.isArray(value)) {
      await syncRoomsToSupabase(value, tenants, contracts);
      await pruneOrphanRows("rooms", value.map((r: any) => toUuid(r.id, `room-${r.propertyId || "prop-1"}-${r.roomNumber}`)));
    } else if (normKey === "contracts" && Array.isArray(value)) {
      await syncContractsToSupabase(value, rooms, tenants);
      await pruneOrphanRows("contracts", value.map((c: any) => toUuid(c.id, `contract-${c.contractNumber}`)));
    } else if (normKey === "invoices" && Array.isArray(value)) {
      await syncInvoicesToSupabase(value, rooms, tenants);
      await pruneOrphanRows("invoices", value.map((inv: any) => toUuid(inv.id, `inv-${inv.invoiceNumber}`)));
    } else if (normKey === "meter_readings" && Array.isArray(value)) {
      await syncMeterReadingsToSupabase(value, rooms);
    } else if (normKey === "repairs" && Array.isArray(value)) {
      await syncRepairsToSupabase(value);
      await pruneOrphanRows("repairs", value.map((r: any) => toUuid(r.id, `repair-${r.roomNumber}-${r.title}`)));
    } else if (normKey === "expenses" && Array.isArray(value)) {
      await syncExpensesToSupabase(value);
      await pruneOrphanRows("expenses", value.map((e: any) => toUuid(e.id, `exp-${e.title}-${e.date}`)));
    } else if (normKey === "daily_bookings" && Array.isArray(value)) {
      await syncDailyBookingsToSupabase(value);
      await pruneOrphanRows("daily_bookings", value.map((b: any) => toUuid(b.id, `daily-${b.roomNumber}-${b.checkInDate}`)));
    } else if (normKey === "activity_logs" && Array.isArray(value)) {
      await syncActivityLogsToSupabase(value);
    }
  } catch (e: any) {
    console.warn(`[Supabase Relational] Sync warning for [${normKey}]:`, e?.message);
  }
}

let isFullSyncRunning = false;

/**
 * Synchronizes the entire in-memory database state into all separate Supabase relational tables
 * sequentially in topological foreign-key order without flooding connection pool.
 */
export async function syncAllToRelationalTables(memoryDb: Record<string, any>): Promise<void> {
  if (isFullSyncRunning) return;
  isFullSyncRunning = true;
  try {
    const properties: Property[] = Array.isArray(memoryDb["properties"]) ? memoryDb["properties"] : [];
    const rooms: Room[] = Array.isArray(memoryDb["rooms"]) ? memoryDb["rooms"] : [];
    const rawTenants: Tenant[] = Array.isArray(memoryDb["tenants"]) ? memoryDb["tenants"] : [];
    const contracts: ContractItem[] = Array.isArray(memoryDb["contracts"]) ? memoryDb["contracts"] : [];
    const invoices: Invoice[] = Array.isArray(memoryDb["invoices"]) ? memoryDb["invoices"] : [];
    const meterReadings: any[] = Array.isArray(memoryDb["meter_readings"]) ? memoryDb["meter_readings"] : [];
    const repairs: RepairItem[] = Array.isArray(memoryDb["repairs"]) ? memoryDb["repairs"] : [];
    const expenses: ExpenseItem[] = Array.isArray(memoryDb["expenses"]) ? memoryDb["expenses"] : [];
    const dailyBookings: DailyBooking[] = Array.isArray(memoryDb["daily_bookings"]) ? memoryDb["daily_bookings"] : [];
    const activityLogs: ActivityLogItem[] = Array.isArray(memoryDb["activity_logs"]) ? memoryDb["activity_logs"] : [];

    // 1. Properties & Buildings
    if (properties.length > 0) {
      await syncPropertiesToSupabase(properties);
    }

    // 2. Branch Settings for each property
    for (const p of properties) {
      const bSettings = memoryDb[`branch_settings_${p.id}`] || memoryDb["branch_settings"];
      if (bSettings) {
        await syncBranchSettingsToSupabase(p.id, bSettings);
      }
    }

    // 3. Tenants (merged from tenants + rooms.currentTenant + contracts)
    await syncTenantsToSupabase(rawTenants, rooms, contracts);

    // 4. Rooms
    await syncRoomsToSupabase(rooms, rawTenants, contracts);

    // 5. Dependent tables sequentially to avoid connection pool saturation
    await syncContractsToSupabase(contracts, rooms, rawTenants);
    await syncInvoicesToSupabase(invoices, rooms, rawTenants);
    await syncMeterReadingsToSupabase(meterReadings, rooms);
    await syncRepairsToSupabase(repairs);
    await syncExpensesToSupabase(expenses);
    await syncDailyBookingsToSupabase(dailyBookings);
    await syncActivityLogsToSupabase(activityLogs);
  } catch (e: any) {
    console.warn("[Supabase Relational] Full relational sync warning:", e?.message);
  } finally {
    isFullSyncRunning = false;
  }
}

/**
 * Core context (properties, branch_settings, tenants, rooms) for server endpoints such as
 * /api/line/broadcast — used by DatabaseService.initCoreOnly (origin/main 2f42266).
 * Merge fix: origin/main implemented this with a new mapper built on older code (no short ids,
 * branch filters, notification/signature fields). To keep one mapping, it reuses
 * loadFromRelationalTables and returns only the core keys.
 */
export async function loadCoreContextFromSupabase(
  existingMemoryDb: Record<string, any> = {}
): Promise<{ hasCoreData: boolean; data: Record<string, any> }> {
  const { hasRelationalData, data } = await loadFromRelationalTables(existingMemoryDb);
  const core: Record<string, any> = {};
  for (const [key, value] of Object.entries(data || {})) {
    if (key === "properties" || key === "tenants" || key === "rooms" || key.startsWith("branch_settings")) {
      core[key] = value;
    }
  }
  return { hasCoreData: hasRelationalData, data: core };
}

/**
 * Loads data directly from the separate Supabase relational tables and merges with
 * any extended JSON fields in memoryDb.
 */
export async function loadFromRelationalTables(
  existingMemoryDb: Record<string, any>
): Promise<{ hasRelationalData: boolean; data: Record<string, any> }> {
  const result: Record<string, any> = {};
  let hasRelationalData = false;

  try {
    const [
      propsRes,
      settingsRes,
      tenantsRes,
      roomsRes,
      contractsRes,
      invoicesRes,
      invoiceItemsRes,
      metersRes,
      repairsRes,
      expensesRes,
      dailyRes,
      logsRes,
    ] = await Promise.all([
      supabase.from("properties").select("*"),
      supabase.from("branch_settings").select("*"),
      supabase.from("tenants").select("*"),
      supabase.from("rooms").select("*"),
      supabase.from("contracts").select("*"),
      supabase.from("invoices").select("*"),
      supabase.from("invoice_items").select("*"),
      supabase.from("meter_readings").select("*").order("recorded_at", { ascending: false }),
      supabase.from("repairs").select("*"),
      supabase.from("expenses").select("*"),
      supabase.from("daily_bookings").select("*"),
      supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(50),
    ]);

    const responses = { properties: propsRes, branch_settings: settingsRes,
      tenants: tenantsRes, rooms: roomsRes, contracts: contractsRes,
      invoices: invoicesRes, invoice_items: invoiceItemsRes, meter_readings: metersRes,
      repairs: repairsRes, expenses: expensesRes, daily_bookings: dailyRes, activity_logs: logsRes };
    for (const [table, response] of Object.entries(responses)) {
      if (response.error) throw new Error(`[Supabase ${table}] ${response.error.message}`, { cause: response.error });
    }

    const propRows = propsRes.data || [];
    const roomRows = roomsRes.data || [];
    const tenantRows = tenantsRes.data || [];
    const contractRows = contractsRes.data || [];

    // Supabase Cloud is the authoritative Single Source of Truth (including when tables are intentionally emptied)
    hasRelationalData = true;


    // Map properties (use authoritative 5-character IDs directly from Supabase)
    const existingProps: Property[] = Array.isArray(existingMemoryDb["properties"])
      ? existingMemoryDb["properties"]
      : [];
    const defaultPropId = propRows[0]?.id ? String(propRows[0].id) : "P0001";
    // Rows whose branch no longer exists (property_id NULL or unknown) are leftovers from a
    // deleted branch. Skip them instead of attaching them to the first branch.
    const knownBranchIds = new Set(propRows.map((row: any) => String(row.id).toLowerCase()));
    const belongsToKnownBranch = (row: any) => knownBranchIds.has(String(row?.property_id || "").toLowerCase());
    const uuidToPropId = new Map<string, string>();
    for (const ep of existingProps) {
      uuidToPropId.set(toUuid(ep.id).toLowerCase(), ep.id);
    }

    result["properties"] = propRows.map((row: any) => {
      const origId = String(row.id);
      uuidToPropId.set(origId.toLowerCase(), origId);
      const existingMatch = existingProps.find((p) => p.id === origId);
      const ownerFields: Record<string, string> = {};
      const ownerId = row.owner_id ?? (existingMatch as any)?.ownerId;
      const ownerPhone = row.owner_phone ?? (existingMatch as any)?.ownerPhone;
      if (ownerId) ownerFields.ownerId = String(ownerId);
      if (ownerPhone) ownerFields.ownerPhone = String(ownerPhone);
      return {
        ...(existingMatch || {}),
        ...ownerFields,
        id: origId,
        name: row.name,
        address: row.address || "",
        phone: row.phone || "",
        promptpayNumber: row.promptpay_number || "",
        promptpayName: row.promptpay_name || "",
        electricRate: Number(row.electric_rate ?? 8),
        waterRate: Number(row.water_rate ?? 18),
        plan: (row.plan || "pro") as PlanType,
      } satisfies Property;
    });

    // Map branch_settings
    if (settingsRes.data && settingsRes.data.length > 0) {
      for (const sRow of settingsRes.data) {
        // Skip settings left over from a deleted branch (property_id NULL or unknown).
        // Previously they fell back to the FIRST branch and overwrote its real name/settings.
        const rawPropId = String(sRow.property_id || "").toLowerCase();
        if (!rawPropId || !knownBranchIds.has(rawPropId)) continue;
        const propId = uuidToPropId.get(rawPropId) || String(sRow.property_id);
        const existingSetting = existingMemoryDb[`branch_settings_${propId}`] || {};
        result[`branch_settings_${propId}`] = {
          ...existingSetting,
          id: String(sRow.id),
          branchName: sRow.branch_name || existingSetting.branchName || "",
          address: sRow.address ?? existingSetting.address ?? "",
          phone: sRow.phone ?? existingSetting.phone ?? "",
          ownerName: sRow.owner_name ?? existingSetting.ownerName ?? "",
          ownerPhone: sRow.owner_phone ?? existingSetting.ownerPhone ?? "",
          taxId: sRow.tax_id ?? existingSetting.taxId ?? "",
          waterRate: Number(sRow.water_rate ?? existingSetting.waterRate ?? 18),
          electricRate: Number(sRow.electric_rate ?? existingSetting.electricRate ?? 8),
          useMinWater: Boolean(sRow.use_min_water ?? existingSetting.useMinWater),
          minWaterUnits: Number(sRow.min_water_units ?? existingSetting.minWaterUnits ?? 5),
          minWaterFee: Number(sRow.min_water_fee ?? existingSetting.minWaterFee ?? 100),
          useMinElectric: Boolean(sRow.use_min_electric ?? existingSetting.useMinElectric),
          minElectricUnits: Number(sRow.min_electric_units ?? existingSetting.minElectricUnits ?? 10),
          minElectricFee: Number(sRow.min_electric_fee ?? existingSetting.minElectricFee ?? 150),
          commonFee: Number(sRow.common_fee ?? existingSetting.commonFee ?? 300),
          internetFee: Number(sRow.internet_fee ?? existingSetting.internetFee ?? 0),
          parkingFee: Number(sRow.parking_fee ?? existingSetting.parkingFee ?? 0),
          billCycleDay: Number(sRow.bill_cycle_day ?? existingSetting.billCycleDay ?? 25),
          billDueDay: Number(sRow.bill_due_day ?? existingSetting.billDueDay ?? 5),
          lateFeePerDay: Number(sRow.late_fee_per_day ?? existingSetting.lateFeePerDay ?? 50),
          bankName: sRow.bank_name ?? existingSetting.bankName ?? "",
          bankAccountNumber: sRow.bank_account_number ?? existingSetting.bankAccountNumber ?? "",
          bankAccountName: sRow.bank_account_name ?? existingSetting.bankAccountName ?? "",
          promptpayNumber: sRow.promptpay_number ?? existingSetting.promptpayNumber ?? "",
          promptpayName: sRow.promptpay_name ?? existingSetting.promptpayName ?? "",
          lineChannelAccessToken: sRow.line_channel_access_token ?? existingSetting.lineChannelAccessToken ?? "",
          lineChannelSecret: sRow.line_channel_secret ?? existingSetting.lineChannelSecret ?? "",
          signatureUrl: sRow.signature_url ?? existingSetting.signatureUrl ?? "",
          stampUrl: sRow.stamp_url ?? existingSetting.stampUrl ?? "",
          contractTerms: sRow.contract_terms ?? existingSetting.contractTerms ?? "",
          notificationSettings:
            sRow.notification_settings && typeof sRow.notification_settings === "object"
              ? sRow.notification_settings
              : existingSetting.notificationSettings,
        } satisfies BranchSettingsDetail;
      }
    }

    // Map tenants
    const existingTenants: Tenant[] = Array.isArray(existingMemoryDb["tenants"])
      ? existingMemoryDb["tenants"]
      : [];
    const tenantByUuid = new Map<string, Tenant>();
    const mappedTenants: Tenant[] = tenantRows.map((tRow: any) => {
      const rowUuid = String(tRow.id).toLowerCase();
      const existingMatch = existingTenants.find(
        (et) => toUuid(et.id).toLowerCase() === rowUuid || et.fullName === tRow.full_name
      );
      const mapped: Tenant = {
        ...(existingMatch || {}),
        id: String(tRow.id),
        propertyId: existingMatch?.propertyId && /^[A-Z]\d{4}$/i.test(existingMatch.propertyId) ? existingMatch.propertyId : defaultPropId,
        fullName: tRow.full_name || "ไม่ระบุชื่อ",
        phone: tRow.phone || "-",
        idCard: tRow.id_card || existingMatch?.idCard || "",
        gender: (tRow.gender || existingMatch?.gender || "MALE") as "MALE" | "FEMALE" | "OTHER",
        age: Number(tRow.age ?? existingMatch?.age ?? 25),
        lineId: tRow.line_id ?? existingMatch?.lineId ?? "",
        Line_Acc: tRow.Line_Acc ?? tRow.line_acc ?? tRow.line_Acc ?? tRow.LineAcc ?? existingMatch?.Line_Acc ?? existingMatch?.lineAcc ?? "",
        lineAcc: tRow.Line_Acc ?? tRow.line_acc ?? tRow.line_Acc ?? tRow.LineAcc ?? existingMatch?.Line_Acc ?? existingMatch?.lineAcc ?? "",
        taxId: tRow.tax_id ?? existingMatch?.taxId ?? "",
        email: tRow.email ?? existingMatch?.email ?? "",
        address: tRow.address ?? existingMatch?.address ?? "",
        emergencyContact: tRow.emergency_contact ?? existingMatch?.emergencyContact ?? "",
        vehiclePlate: tRow.vehicle_plate ?? existingMatch?.vehiclePlate ?? "",
        idCardImageUrl: tRow.id_card_image_url ?? existingMatch?.idCardImageUrl ?? "",
        invoiceLang: (tRow.invoice_lang || existingMatch?.invoiceLang || "TH") as "TH" | "EN",
        notes: tRow.notes ?? existingMatch?.notes ?? "",
      };
      tenantByUuid.set(rowUuid, mapped);
      return mapped;
    });
    result["tenants"] = mappedTenants;

    // Map rooms
    const existingRooms: Room[] = Array.isArray(existingMemoryDb["rooms"])
      ? existingMemoryDb["rooms"]
      : [];
    const uuidToRoomNumber = new Map<string, string>();
    result["rooms"] = roomRows.filter(belongsToKnownBranch).map((rRow: any) => {
      const rowUuid = String(rRow.id).toLowerCase();
      const propId = uuidToPropId.get(String(rRow.property_id || "").toLowerCase()) || String(rRow.property_id || defaultPropId);
      const existingRoom = existingRooms.find(
        (er) =>
          toUuid(er.id).toLowerCase() === rowUuid ||
          ((er.propertyId || defaultPropId) === propId && er.roomNumber === rRow.room_number)
      );
      uuidToRoomNumber.set(rowUuid, rRow.room_number);
      const linkedTenant = rRow.current_tenant_id
        ? tenantByUuid.get(String(rRow.current_tenant_id).toLowerCase()) || existingRoom?.currentTenant
        : rRow.status === "occupied" || rRow.status === "overdue"
          ? existingRoom?.currentTenant
          : undefined;
      if (linkedTenant) {
        linkedTenant.propertyId = propId;
      }

      return {
        ...(existingRoom || {}),
        id: String(rRow.id),
        propertyId: propId,
        buildingId: rRow.building_id ? String(rRow.building_id) : "B0001",
        roomNumber: String(rRow.room_number),
        floor: Number(rRow.floor || 1),
        type: rRow.type || existingRoom?.type || "Standard",
        monthlyRate: Number(rRow.monthly_rate ?? existingRoom?.monthlyRate ?? 4000),
        dailyRate: Number(rRow.daily_rate ?? existingRoom?.dailyRate ?? 650),
        status: (rRow.status || "vacant") as RoomStatus,
        currentElectricMeter: Number(rRow.current_electric_meter ?? existingRoom?.currentElectricMeter ?? 0),
        currentWaterMeter: Number(rRow.current_water_meter ?? existingRoom?.currentWaterMeter ?? 0),
        currentTenant: linkedTenant,
        leaseEndDate: rRow.lease_end_date || existingRoom?.leaseEndDate || undefined,
      } satisfies Room;
    });

    // Map contracts
    const existingContracts: ContractItem[] = Array.isArray(existingMemoryDb["contracts"])
      ? existingMemoryDb["contracts"]
      : [];
    result["contracts"] = contractRows.filter(belongsToKnownBranch).map((cRow: any) => {
      const rowUuid = String(cRow.id).toLowerCase();
      const propId = uuidToPropId.get(String(cRow.property_id || "").toLowerCase()) || String(cRow.property_id || defaultPropId);
      const existingContract = existingContracts.find(
        (ec) => toUuid(ec.id).toLowerCase() === rowUuid || ec.contractNumber === cRow.contract_number
      );
      let parsedClauses = existingContract?.clauses;
      if (!parsedClauses && cRow.terms_text && String(cRow.terms_text).trim().startsWith("[")) {
        try {
          parsedClauses = JSON.parse(cRow.terms_text);
        } catch {}
      }
      return {
        ...(existingContract || {}),
        id: String(cRow.id),
        propertyId: propId,
        contractNumber: cRow.contract_number,
        roomNumber: String(cRow.room_number),
        tenantName: cRow.tenant_name,
        tenantPhone: cRow.tenant_phone,
        startDate: cRow.start_date,
        endDate: cRow.end_date,
        monthlyRent: Number(cRow.monthly_rent || 0),
        depositAmount: Number(cRow.deposit_amount || 0),
        advanceRent: Number(cRow.advance_rent || 0),
        status: (cRow.status || "active") as ContractItem["status"],
        clauses: parsedClauses,
        createdAt: cRow.created_at ? String(cRow.created_at).slice(0, 10) : existingContract?.createdAt || new Date().toISOString().slice(0, 10),
        signedAt: cRow.signed_at || existingContract?.signedAt,
        signatureUrl: cRow.tenant_signature_url || existingContract?.signatureUrl,
        landlordSignatureUrl: cRow.landlord_signature_url || existingContract?.landlordSignatureUrl,
      } satisfies ContractItem;
    });

    // Map invoices & invoice_items
    const existingInvoices: Invoice[] = Array.isArray(existingMemoryDb["invoices"])
      ? existingMemoryDb["invoices"]
      : [];
    const invRows = invoicesRes.data || [];
    const itemRows = invoiceItemsRes.data || [];
    result["invoices"] = invRows.filter(belongsToKnownBranch).map((iRow: any) => {
      const rowUuid = String(iRow.id).toLowerCase();
      const propId = uuidToPropId.get(String(iRow.property_id || "").toLowerCase()) || String(iRow.property_id || defaultPropId);
      const existingInv = existingInvoices.find(
        (ei) => toUuid(ei.id).toLowerCase() === rowUuid || ei.invoiceNumber === iRow.invoice_number
      );
      const relItems = itemRows
        .filter((it: any) => String(it.invoice_id).toLowerCase() === rowUuid)
        .map((it: any) => ({
          id: String(it.id),
          name: it.name,
          units: it.units !== null && it.units !== undefined ? Number(it.units) : undefined,
          rate: it.rate !== null && it.rate !== undefined ? Number(it.rate) : undefined,
          amount: Number(it.amount || 0),
          meterPrev: it.meter_prev !== null && it.meter_prev !== undefined ? Number(it.meter_prev) : undefined,
          meterCurr: it.meter_curr !== null && it.meter_curr !== undefined ? Number(it.meter_curr) : undefined,
        }));
      const linkedTenant = iRow.tenant_id
        ? tenantByUuid.get(String(iRow.tenant_id).toLowerCase())
        : undefined;
      const roomNumber =
        existingInv?.roomNumber ||
        (iRow.room_id ? uuidToRoomNumber.get(String(iRow.room_id).toLowerCase()) : "") ||
        (() => { const p = String(iRow.invoice_number || "").split("-"); return (p.length >= 4 && p[1] === "D") ? p[3] : p.length >= 3 ? p[2] : p.pop() || ""; })() ||
        "";

      return {
        ...(existingInv || {}),
        id: String(iRow.id),
        propertyId: propId,
        invoiceNumber: iRow.invoice_number,
        roomNumber,
        tenantName: existingInv?.tenantName || iRow.tenant_name || linkedTenant?.fullName || "ผู้เช่า",
        tenantPhone: existingInv?.tenantPhone || iRow.tenant_phone || linkedTenant?.phone || "-",
        billingDate: existingInv?.billingDate || `${iRow.billing_month}-25`,
        dueDate: iRow.due_date,
        totalAmount: Number(iRow.total_amount || 0),
        status: (iRow.status || "unpaid") as Invoice["status"],
        slipUrl: iRow.slip_url || existingInv?.slipUrl,
        paidAt: iRow.paid_at || existingInv?.paidAt,
        items: relItems.length > 0 ? relItems : existingInv?.items || [],
      } satisfies Invoice;
    });

    // Map meter_readings (from origin/main 2f42266: keep local ids, room's branch/tenant, B.E.-safe month/time)
    if (metersRes.data) {
      const existingMeters: any[] = Array.isArray(existingMemoryDb["meter_readings"])
        ? existingMemoryDb["meter_readings"]
        : [];
      const mappedRooms: Room[] = Array.isArray(result["rooms"]) ? result["rooms"] : [];
      result["meter_readings"] = metersRes.data.map((mRow: any) => {
        const rowUuid = String(mRow.id || "").toLowerCase();
        const rUuid = String(mRow.room_id || "").toLowerCase();
        const room = mappedRooms.find((r) => toUuid(r.id).toLowerCase() === rUuid);
        const existingMeter = existingMeters.find((em) => toUuid(em.id).toLowerCase() === rowUuid);
        const elecPrev = Number(mRow.electric_prev ?? existingMeter?.electric_prev ?? 0);
        const elecCurr = Number(mRow.electric_curr ?? existingMeter?.electric_curr ?? 0);
        const waterPrev = Number(mRow.water_prev ?? existingMeter?.water_prev ?? 0);
        const waterCurr = Number(mRow.water_curr ?? existingMeter?.water_curr ?? 0);
        const elecUnits = Number(mRow.electric_units ?? 0) || Math.max(0, elecCurr - elecPrev);
        const waterUnits = Number(mRow.water_units ?? 0) || Math.max(0, waterCurr - waterPrev);
        const rawRecordedAt = mRow.recorded_at || existingMeter?.recorded_at || "";
        const normalizedRecordedAt = toPgTimestamp(rawRecordedAt, false) || rawRecordedAt;

        return {
          id: existingMeter?.id || String(mRow.id),
          property_id: room?.propertyId || existingMeter?.property_id || defaultPropId,
          room_id: existingMeter?.room_id || String(mRow.room_id || ""),
          room_number: room?.roomNumber || uuidToRoomNumber.get(rUuid) || mRow.room_number || existingMeter?.room_number || "",
          tenant_name: mRow.tenant_name || room?.currentTenant?.fullName || existingMeter?.tenant_name || "",
          billing_month: normalizeMeterMonth(mRow.reading_month ?? mRow.billing_month ?? existingMeter?.billing_month),
          electric_prev: elecPrev,
          electric_curr: elecCurr,
          electric_units: elecUnits,
          water_prev: waterPrev,
          water_curr: waterCurr,
          water_units: waterUnits,
          recorded_at: normalizedRecordedAt,
        };
      });
    }

    // Map repairs
    if (repairsRes.data) {
      const existingRepairs: RepairItem[] = Array.isArray(existingMemoryDb["repairs"])
        ? existingMemoryDb["repairs"]
        : [];
      result["repairs"] = repairsRes.data.filter(belongsToKnownBranch).map((rRow: any) => {
        const rowUuid = String(rRow.id).toLowerCase();
        const propId = uuidToPropId.get(String(rRow.property_id || "").toLowerCase()) || String(rRow.property_id || defaultPropId);
        const existingRep = existingRepairs.find((er) => toUuid(er.id).toLowerCase() === rowUuid);
        return {
          ...(existingRep || {}),
          id: String(rRow.id),
          propertyId: propId,
          roomNumber: String(rRow.room_number),
          category: (rRow.category || "other") as RepairItem["category"],
          title: rRow.title,
          description: rRow.description || "",
          priority: existingRep?.priority || "normal",
          status: (rRow.status || "pending") as RepairItem["status"],
          cost: Number(rRow.cost || 0),
          technicianName: rRow.technician_name || existingRep?.technicianName,
          reportedAt: existingRep?.reportedAt || rRow.reported_at,
          completedAt: existingRep?.completedAt || rRow.completed_at,
        } satisfies RepairItem;
      });
    }

    // Map expenses
    if (expensesRes.data) {
      const existingExpenses: ExpenseItem[] = Array.isArray(existingMemoryDb["expenses"])
        ? existingMemoryDb["expenses"]
        : [];
      result["expenses"] = expensesRes.data.filter(belongsToKnownBranch).map((eRow: any) => {
        const rowUuid = String(eRow.id).toLowerCase();
        const propId = uuidToPropId.get(String(eRow.property_id || "").toLowerCase()) || String(eRow.property_id || defaultPropId);
        const existingExp = existingExpenses.find((ee) => toUuid(ee.id).toLowerCase() === rowUuid);
        return {
          ...(existingExp || {}),
          id: String(eRow.id),
          propertyId: propId,
          category: (eRow.category || "other") as ExpenseItem["category"],
          title: eRow.title,
          amount: Number(eRow.amount || 0),
          date: eRow.expense_date,
          paidTo: existingExp?.paidTo || eRow.notes || "-",
          notes: eRow.notes || "",
        } satisfies ExpenseItem;
      });
    }

    // Map daily_bookings
    if (dailyRes.data) {
      const existingDaily: DailyBooking[] = Array.isArray(existingMemoryDb["daily_bookings"])
        ? existingMemoryDb["daily_bookings"]
        : [];
      result["daily_bookings"] = dailyRes.data.map((dRow: any) => {
        const rowUuid = String(dRow.id).toLowerCase();
        const existingDb = existingDaily.find((ed) => toUuid(ed.id).toLowerCase() === rowUuid);
        return {
          ...(existingDb || {}),
          id: String(dRow.id),
          propertyId: existingDb?.propertyId && /^[A-Z]\d{4}$/i.test(existingDb.propertyId) ? existingDb.propertyId : defaultPropId,
          roomNumber: String(dRow.room_number),
          guestName: dRow.guest_name,
          guestPhone: dRow.guest_phone,
          checkInDate: dRow.check_in_date,
          checkInTime: dRow.check_in_time || "14:00",
          checkOutDate: dRow.check_out_date,
          checkOutTime: dRow.check_out_time || "12:00",
          nights: Number(dRow.nights || 1),
          dailyRate: Number(dRow.daily_rate || 650),
          totalRoomPrice: Number(dRow.total_room_price || 650),
          keyDeposit: Number(dRow.key_deposit ?? 500),
          status: (dRow.status || "confirmed") as DailyBooking["status"],
        } satisfies DailyBooking;
      });
    }

    // Map activity_logs
    if (logsRes.data) {
      result["activity_logs"] = logsRes.data.map((lRow: any) => ({
        id: String(lRow.id),
        propertyId: "prop-1",
        userName: lRow.user_name,
        action: lRow.action as ActivityLogItem["action"],
        entity: lRow.entity as ActivityLogItem["entity"],
        description: lRow.description,
        createdAt: lRow.created_at,
      }));
    }
  } catch (e: any) {
    console.warn("[Supabase Relational] Load from relational tables warning:", e?.message);
    throw e;
  }

  return { hasRelationalData, data: result };
}

