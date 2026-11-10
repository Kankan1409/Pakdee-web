import {
  Room,
  Property,
  Invoice,
  Tenant,
  RoomStatus,
  RepairItem,
  ContractItem,
  ExpenseItem,
  BroadcastItem,
  ActivityLogItem,
  BranchSettingsDetail,
  DailyBooking,
  defaultRoomTypes,
} from "@/types/dormitory";
import {
  initialProperty,
  initialRooms,
  initialRepairs,
  initialContracts,
  initialExpenses,
  initialBroadcasts,
  initialActivityLogs,
  initialBranchSettings,
} from "@/lib/mock-data";
import { BranchItem } from "@/components/branch/branch-selector-view";
import { supabase } from "@/lib/supabase";
import {
  syncKeyToRelationalTable,
  syncAllToRelationalTables,
  loadFromRelationalTables,
  toUuid,
} from "@/lib/supabase-relational";

/**
 * PAKDEE LOCAL-FIRST DATABASE ENGINE
 * สถาปัตยกรรม Local Database ความเร็วสูง 100% พร้อม Multi-Branch Data Isolation
 * ข้อมูลแต่ละสาขา (ห้องพัก, บิล, สัญญา, แจ้งซ่อม, การตั้งค่า) แยกขาดจากกันเด็ดขาด
 * บันทึกและดึงข้อมูลจาก LocalStorage ทันที ไม่มี Network Latency
 * รองรับการย้ายขึ้น Supabase ในอนาคตผ่านสคริปต์ supabase_schema_complete.sql
 */
export const IS_LOCAL_MODE = false;

// Storage Keys - Dedicated Isolated Database for Port 3000 (Dev Environment)
const KEYS = {
  PROPERTIES: "pakdee_dev_properties",
  ACTIVE_PROPERTY_ID: "pakdee_dev_active_property_id",
  ROOMS: "pakdee_dev_rooms",
  TENANTS: "pakdee_dev_tenants",
  INVOICES: "pakdee_dev_invoices",
  PAYMENTS: "pakdee_dev_payments",
  RECEIPTS: "pakdee_dev_receipts",
  CONTRACTS: "pakdee_dev_contracts",
  REPAIRS: "pakdee_dev_repairs",
  EXPENSES: "pakdee_dev_expenses",
  BRANCH_SETTINGS: "pakdee_dev_branch_settings",
  BROADCASTS: "pakdee_dev_broadcasts",
  ACTIVITY_LOGS: "pakdee_dev_activity_logs",
  METER_READINGS: "pakdee_dev_meter_readings",
  DAILY_BOOKINGS: "pakdee_dev_daily_bookings",
};

// In-Memory Supabase Cloud Synchronized Cache (data/db_port3000.json completely disabled)
const memoryDb: Record<string, any> = {};
let isServerSynced = false;

const relationalSyncTimers: Record<string, ReturnType<typeof setTimeout>> = {};
function scheduleRelationalSync(normKey: string, value: any): void {
  if (normKey === "activity_logs" || normKey === "active_property_id") return;
  if (typeof window === "undefined") {
    syncKeyToRelationalTable(normKey, value, memoryDb).catch(() => {});
    return;
  }
  if (relationalSyncTimers[normKey]) {
    clearTimeout(relationalSyncTimers[normKey]);
  }
  relationalSyncTimers[normKey] = setTimeout(() => {
    delete relationalSyncTimers[normKey];
    syncKeyToRelationalTable(normKey, value, memoryDb).catch(() => {});
  }, 1200);
}

// Safe Supabase-Synchronized Storage Helper
function getCurrentSessionUser(): { id: string; phone?: string; email?: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("pakdee_auth_session_v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.id) return parsed;
  } catch {}
  return null;
}

function isCustomRegisteredUser(user: { id: string; phone?: string; email?: string } | null): boolean {
  if (!user || !user.id) return false;
  return user.id !== "usr-owner-01" && user.id !== "usr-mgr-01" && user.id !== "U0001" && user.id !== "U0002";
}

function nextShortId(prefix: string, existingIds: (string | undefined)[]): string {
  const p = prefix.toUpperCase().slice(0, 1);
  let maxNum = 0;
  for (const id of existingIds) {
    if (!id) continue;
    const m = id.match(new RegExp(`^${p}(\\d+)$`, "i"));
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxNum && n < 9999) maxNum = n;
    }
  }
  const next = maxNum > 0 ? maxNum + 1 : existingIds.length + 1;
  return `${p}${String(Math.min(next, 9999)).padStart(4, "0")}`;
}

function getLocal<T>(key: string, fallback: T): T {
  // 1. In-memory cache synced from Supabase Cloud has highest priority
  if (memoryDb[key] !== undefined && memoryDb[key] !== null) {
    return memoryDb[key] as T;
  }
  const normKey = key.replace(/^pakdee_(dev|test)_/, "");
  if (memoryDb[normKey] !== undefined && memoryDb[normKey] !== null) {
    return memoryDb[normKey] as T;
  }

  // 2. Client-side LocalStorage fallback
  if (typeof window === "undefined") return fallback;
  try {
    let raw = localStorage.getItem(key) || localStorage.getItem(normKey);
    if (!raw && key.startsWith("pakdee_dev_")) {
      const legacyKey = key.replace("pakdee_dev_", "pakdee_");
      raw = localStorage.getItem(legacyKey);
      if (raw) {
        localStorage.setItem(key, raw);
      }
    }
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    memoryDb[key] = parsed;
    return parsed;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, value: T): void {
  // 1. Immediately update in-memory cache
  memoryDb[key] = value;
  const normKey = key.replace(/^pakdee_(dev|test)_/, "");
  memoryDb[normKey] = value;

  // 2. Save to client LocalStorage (browser cache mirror)
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      if (normKey !== key) {
        localStorage.setItem(normKey, JSON.stringify(value));
      }
    } catch (e) {
      console.warn(`Failed to save to localStorage [${key}]:`, e);
    }
  }

  // 3. Persist directly to Supabase Relational Tables (pakdee_store removed)
  try {
    scheduleRelationalSync(normKey, value);
  } catch (err) {
    console.warn(`[Supabase Relational] Sync error [${normKey}]:`, err);
  }
}

// Realtime Channel Handle for Supabase Live Cloud Updates (Singleton Safe)
let realtimeChannel: any = null;
let activeInitPromise: Promise<boolean> | null = null;

function setupRealtimeSync(): void {
  if (typeof window === "undefined") return;

  // 1. Check window global to survive Hot Module Reloading (HMR) and Fast Refresh
  if (realtimeChannel || (window as any).__PAKDEE_REALTIME_CHANNEL__) {
    realtimeChannel = realtimeChannel || (window as any).__PAKDEE_REALTIME_CHANNEL__;
    return;
  }

  try {
    // 2. Check if a channel with this topic is already active in Supabase client cache
    const existing = supabase
      .getChannels()
      .find((c: any) => c.topic === "realtime:pakdee_relational_changes" || c.topic === "pakdee_relational_changes");

    if (existing) {
      realtimeChannel = existing;
      (window as any).__PAKDEE_REALTIME_CHANNEL__ = existing;
      return;
    }

    // 3. Create fresh channel subscribing to public PostgreSQL relational changes
    const channel = supabase
      .channel("pakdee_relational_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
        },
        (payload: any) => {
          if (payload?.table && typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("pakdee_db_updated", { detail: { table: payload.table, payload } })
            );
          }
        }
      )
      .subscribe((status: string) => {
        console.log("[Supabase Realtime] Relational subscription status:", status);
      });

    realtimeChannel = channel;
    (window as any).__PAKDEE_REALTIME_CHANNEL__ = channel;
  } catch (err: any) {
    console.warn("[Supabase Realtime] setup safely handled:", err?.message);
  }
}

export const DatabaseService = {
  /**
   * Initialize and synchronize directly with Supabase Cloud (qygelgekosmklwrgnaxq)
   * Local file data/db_port3000.json is completely disabled.
   */
  async init(): Promise<boolean> {
    if (activeInitPromise) {
      return activeInitPromise;
    }

    activeInitPromise = (async () => {
      try {
        // 1. Activate live real-time subscription on Supabase Cloud (browser only)
        if (typeof window !== "undefined") {
          setupRealtimeSync();
        }

        // 2. Query authoritative data DIRECTLY from Supabase Relational Tables
        try {
          const timeoutPromise = new Promise<{ hasRelationalData: boolean; data: Record<string, any> }>((resolve) =>
            setTimeout(() => resolve({ hasRelationalData: false, data: {} }), 3500)
          );
          const { hasRelationalData, data: relationalData } = await Promise.race([
            loadFromRelationalTables(memoryDb),
            timeoutPromise,
          ]);

          if (hasRelationalData && relationalData) {
            Object.entries(relationalData).forEach(([key, value]) => {
              memoryDb[key] = value;
              const canonicalKey = `pakdee_dev_${key}`;
              memoryDb[canonicalKey] = value;
              if (typeof window !== "undefined") {
                try {
                  localStorage.setItem(canonicalKey, JSON.stringify(value));
                  localStorage.setItem(key, JSON.stringify(value));
                } catch {}
              }
            });

            // Auto-heal activePropertyId if browser localStorage had a pre-migration ID
            const loadedProps: any[] = Array.isArray(relationalData["properties"]) ? relationalData["properties"] : [];
            const loadedRooms: any[] = Array.isArray(relationalData["rooms"]) ? relationalData["rooms"] : [];
            if (loadedProps.length > 0) {
              const currentActive = getLocal<string | null>(KEYS.ACTIVE_PROPERTY_ID, null);
              if (!currentActive || !loadedProps.some((p) => p.id === currentActive)) {
                const propWithRooms = loadedProps.find((p) => loadedRooms.some((r) => r.propertyId === p.id));
                const bestPropId = propWithRooms?.id || loadedProps[0].id;
                memoryDb[KEYS.ACTIVE_PROPERTY_ID] = bestPropId;
                memoryDb["active_property_id"] = bestPropId;
                if (typeof window !== "undefined") {
                  try {
                    localStorage.setItem(KEYS.ACTIVE_PROPERTY_ID, JSON.stringify(bestPropId));
                    localStorage.setItem("active_property_id", JSON.stringify(bestPropId));
                  } catch {}
                }
              }
            }

            isServerSynced = true;
            console.log(`[Supabase Relational Direct] Successfully loaded ${Object.keys(relationalData).length} entities directly from Supabase Relational Tables`);
            return true;
          }
        } catch (err: any) {
          console.warn("[Supabase Relational Direct] Load warning:", err?.message);
        }

        return false;
      } finally {
        activeInitPromise = null;
      }
    })();

    return activeInitPromise;
  },

  isServerSynced(): boolean {
    return isServerSynced;
  },

  /**
   * Atomically persist multiple keys to memory, localStorage, and Supabase Cloud
   */
  async persistBatch(data: Record<string, any>): Promise<boolean> {
    // 1. Update in-memory cache and localStorage
    Object.entries(data).forEach(([key, val]) => {
      memoryDb[key] = val;
      const normKey = key.replace(/^pakdee_(dev|test)_/, "");
      memoryDb[normKey] = val;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(key, JSON.stringify(val));
          if (normKey !== key) {
            localStorage.setItem(normKey, JSON.stringify(val));
          }
        } catch {}
      }
    });

    // 2. Persist directly to Supabase Relational Tables (pakdee_store removed)
    try {
      Object.entries(data).forEach(([k, v]) => {
        const normKey = k.replace(/^pakdee_(dev|test)_/, "");
        scheduleRelationalSync(normKey, v);
      });
    } catch (e: any) {
      console.warn("[Supabase Relational Direct] Batch persist error:", e?.message);
    }

    return true;
  },

  // -------------------------------------------------------------
  // HELPER: ACTIVE PROPERTY & BRANCH SETTINGS KEYS
  // -------------------------------------------------------------
  getActivePropertyId(): string {
    const id = getLocal<string | null>(KEYS.ACTIVE_PROPERTY_ID, null);
    const props = getLocal<BranchItem[]>(KEYS.PROPERTIES, []);
    if (id && (props.length === 0 || props.some((p) => p.id === id))) return id;
    if (props.length > 0 && props[0].id) return props[0].id;
    return "P0001";
  },

  setActivePropertyId(id: string): void {
    setLocal(KEYS.ACTIVE_PROPERTY_ID, id);
  },

  getBranchSettingsKey(propertyId: string): string {
    if (!propertyId || propertyId === "prop-1") {
      return KEYS.BRANCH_SETTINGS;
    }
    return `${KEYS.BRANCH_SETTINGS}_${propertyId}`;
  },

  // -------------------------------------------------------------
  // 1. PROPERTIES & MULTI-BRANCH MANAGEMENT
  // -------------------------------------------------------------
  async getProperty(propertyId?: string): Promise<Property | null> {
    const properties = await this.getAllProperties();
    if (properties.length === 0) {
      return null;
    }

    const targetId = propertyId || this.getActivePropertyId();
    let found = properties.find((p) => p.id === targetId);
    if (!found) found = { ...properties[0] };
    else found = { ...found };

    // Synchronize rates and details from the branch-specific settings
    const branchSettingsKey = this.getBranchSettingsKey(found.id);
    const branchSettings = getLocal<BranchSettingsDetail | null>(branchSettingsKey, null);
    if (branchSettings) {
      if (branchSettings.electricRate !== undefined) found.electricRate = Number(branchSettings.electricRate);
      if (branchSettings.waterRate !== undefined) found.waterRate = Number(branchSettings.waterRate);
      if (branchSettings.branchName) found.name = branchSettings.branchName;
      if (branchSettings.address) found.address = branchSettings.address;
      if (branchSettings.phone) found.phone = branchSettings.phone;
      if (branchSettings.promptpayNumber) found.promptpayNumber = branchSettings.promptpayNumber;
      if (branchSettings.promptpayName) found.promptpayName = branchSettings.promptpayName;
      if (branchSettings.imageUrl) found.imageUrl = branchSettings.imageUrl;
    }

    return found;
  },

  async getAllProperties(): Promise<BranchItem[]> {
    if (!isServerSynced && typeof window !== "undefined") {
      await this.init();
    }
    const props = getLocal<BranchItem[] | null>(KEYS.PROPERTIES, null);
    const allRooms = this.getAllRawRooms();

    const sessionUser = getCurrentSessionUser();
    const isCustomUser = isCustomRegisteredUser(sessionUser);

    if (props === null) {
      const prop1Rooms = allRooms.filter((r) => (r.propertyId || "prop-1") === "prop-1");
      const defaultBranch: BranchItem = {
        ...initialProperty,
        id: "prop-1",
        totalRooms: prop1Rooms.length || 24,
        vacantRooms: prop1Rooms.filter((r) => r.status === "vacant").length,
        occupiedRooms: prop1Rooms.filter((r) => r.status === "occupied" || r.status === "overdue" || r.status === "daily").length,
        dailyRooms: prop1Rooms.filter((r) => r.status === "daily").length,
        buildingName: "อาคาร A",
      };
      const branchSettings = getLocal<BranchSettingsDetail | null>(KEYS.BRANCH_SETTINGS, null);
      if (branchSettings) {
        if (branchSettings.electricRate !== undefined) defaultBranch.electricRate = Number(branchSettings.electricRate);
        if (branchSettings.waterRate !== undefined) defaultBranch.waterRate = Number(branchSettings.waterRate);
        if (branchSettings.branchName) defaultBranch.name = branchSettings.branchName;
      }
      setLocal(KEYS.PROPERTIES, [defaultBranch]);
      if (isCustomUser) {
        return [];
      }
      return [defaultBranch];
    }

    if (props.length === 0) {
      return [];
    }

    // Filter branches by account owner so newly registered accounts start with their own branches
    const userScopedProps = props.filter((p: any) => {
      if (typeof window === "undefined") return true;
      if (isCustomUser && sessionUser) {
        const cleanUserPhone = String(sessionUser.phone || "").replace(/\D/g, "");
        const cleanPropPhone = String(p.phone || p.ownerPhone || "").replace(/\D/g, "");
        return (
          !p.ownerId ||
          p.ownerId === sessionUser.id ||
          p.ownerId === "usr-owner-01" ||
          p.ownerId === "usr-mgr-01" ||
          (cleanUserPhone.length >= 9 && cleanPropPhone.length >= 9 && cleanUserPhone === cleanPropPhone)
        );
      }
      return !p.ownerId || p.ownerId === "usr-owner-01" || p.ownerId === "usr-mgr-01";
    });

    if (userScopedProps.length === 0) {
      return [];
    }

    // Accurately compute totalRooms, vacantRooms, occupiedRooms and synchronize rates from each branch's settings
    const refreshed = userScopedProps.map((p) => {
      const branchRooms = allRooms.filter((r) => (r.propertyId || "prop-1") === p.id);
      const bSettingsKey = this.getBranchSettingsKey(p.id);
      const bSettings = getLocal<BranchSettingsDetail | null>(bSettingsKey, null);

      const vacantCount = branchRooms.filter((r) => r.status === "vacant").length;
      const occupiedCount = branchRooms.filter((r) => r.status === "occupied" || r.status === "overdue" || r.status === "daily").length;
      const dailyCount = branchRooms.filter((r) => r.status === "daily").length;

      return {
        ...p,
        totalRooms: branchRooms.length,
        vacantRooms: vacantCount,
        occupiedRooms: occupiedCount,
        dailyRooms: dailyCount,
        electricRate: bSettings?.electricRate !== undefined ? Number(bSettings.electricRate) : p.electricRate,
        waterRate: bSettings?.waterRate !== undefined ? Number(bSettings.waterRate) : p.waterRate,
        name: bSettings?.branchName || p.name,
        address: bSettings?.address || p.address,
        phone: bSettings?.phone || p.phone,
        promptpayNumber: bSettings?.promptpayNumber || p.promptpayNumber,
        promptpayName: bSettings?.promptpayName || p.promptpayName,
      };
    });

    return refreshed;
  },

  async updateProperty(propertyId: string, updates: Partial<Property>): Promise<boolean> {
    const rawProps = getLocal<BranchItem[]>(KEYS.PROPERTIES, []);
    let matched = false;
    const updated = rawProps.map((p) => {
      if (p.id === propertyId) {
        matched = true;
        return { ...p, ...updates };
      }
      return p;
    });

    if (!matched && updated.length > 0) {
      updated[0] = { ...updated[0], ...updates };
    }

    setLocal(KEYS.PROPERTIES, updated);

    // Also sync rates and details into branch-specific settings
    const targetId = matched ? propertyId : updated[0].id;
    const branchSettingsKey = this.getBranchSettingsKey(targetId);
    const currentSettings = getLocal<BranchSettingsDetail | null>(branchSettingsKey, null) || {
      ...initialBranchSettings,
      branchName: updates.name || "พักดี แมนชั่น",
    };

    const settingsUpdates: Partial<BranchSettingsDetail> = {};
    if (updates.electricRate !== undefined) settingsUpdates.electricRate = Number(updates.electricRate);
    if (updates.waterRate !== undefined) settingsUpdates.waterRate = Number(updates.waterRate);
    if (updates.name) settingsUpdates.branchName = updates.name;
    if (updates.address) settingsUpdates.address = updates.address;
    if (updates.phone) settingsUpdates.phone = updates.phone;
    if (updates.ownerName !== undefined) settingsUpdates.ownerName = updates.ownerName;
    if (updates.promptpayNumber) settingsUpdates.promptpayNumber = updates.promptpayNumber;
    if (updates.promptpayName) settingsUpdates.promptpayName = updates.promptpayName;
    if (updates.imageUrl !== undefined) settingsUpdates.imageUrl = updates.imageUrl;

    setLocal(branchSettingsKey, { ...currentSettings, ...settingsUpdates });

    await this.logActivity("UPDATE", "SETTINGS", `อัปเดตข้อมูลสาขาหอพัก: ${updates.name || propertyId}`, targetId);
    return true;
  },

  async createBranch(branchData: {
    name: string;
    address: string;
    phone: string;
    ownerName?: string;
    promptpayNumber: string;
    promptpayName: string;
    electricRate: number;
    waterRate: number;
    initialRoomCount: number;
    imageUrl?: string;
  }): Promise<BranchItem | null> {
    const rawProps = getLocal<BranchItem[]>(KEYS.PROPERTIES, []);
    const newId = nextShortId("P", rawProps.map((p) => p.id));
    const sessionUser = getCurrentSessionUser();
    const newBranch: BranchItem & { ownerId?: string; ownerPhone?: string } = {
      id: newId,
      name: branchData.name,
      address: branchData.address,
      phone: branchData.phone,
      ownerName: branchData.ownerName,
      promptpayNumber: branchData.promptpayNumber,
      promptpayName: branchData.promptpayName,
      electricRate: branchData.electricRate,
      waterRate: branchData.waterRate,
      plan: "pro",
      totalRooms: 0,
      buildingName: "อาคาร 1",
      imageUrl: branchData.imageUrl || undefined,
      ownerId: sessionUser?.id || "U0001",
      ownerPhone: sessionUser?.phone,
    };

    const updatedProps = [...rawProps, newBranch];

    // Seed branch-specific settings for isolation
    const newSettings: BranchSettingsDetail = {
      ...initialBranchSettings,
      id: `S${newId.slice(1)}`,
      branchName: branchData.name,
      address: branchData.address,
      phone: branchData.phone,
      ownerName: branchData.ownerName || "",
      promptpayNumber: branchData.promptpayNumber,
      promptpayName: branchData.promptpayName,
      electricRate: Number(branchData.electricRate),
      waterRate: Number(branchData.waterRate),
      imageUrl: branchData.imageUrl || undefined,
    };

    // สาขาใหม่เริ่มต้นด้วย 0 ห้องเสมอ (ไม่สร้างห้องอัตโนมัติ ให้ผู้ใช้กดเพิ่มห้องเอง)
    const existingRooms = this.getAllRawRooms();

    await this.persistBatch({
      [KEYS.PROPERTIES]: updatedProps,
      [KEYS.ACTIVE_PROPERTY_ID]: newId,
      [this.getBranchSettingsKey(newId)]: newSettings,
      [KEYS.ROOMS]: existingRooms,
    });

    await this.logActivity(
      "CREATE",
      "SETTINGS",
      `สร้างสาขาหอพักใหม่: ${branchData.name} (${branchData.initialRoomCount} ห้อง, ค่าไฟ ${branchData.electricRate} บ., ค่าน้ำ ${branchData.waterRate} บ.)`,
      newId
    );
    return newBranch;
  },

  async deleteBranch(propertyId: string): Promise<boolean> {
    const rawProps = getLocal<BranchItem[]>(KEYS.PROPERTIES, []);
    const filteredProps = rawProps.filter((p) => p.id !== propertyId);
    setLocal(KEYS.PROPERTIES, filteredProps);

    // Clean up isolated data belonging to this branch
    const allRooms = this.getAllRawRooms();
    const allInvoices = this.getAllRawInvoices();
    const allContracts = getLocal<ContractItem[]>(KEYS.CONTRACTS, []);
    const allRepairs = getLocal<RepairItem[]>(KEYS.REPAIRS, []);
    const allExpenses = getLocal<ExpenseItem[]>(KEYS.EXPENSES, []);

    const batchPayload: Record<string, any> = {
      [KEYS.PROPERTIES]: filteredProps,
      [KEYS.ROOMS]: allRooms.filter((r) => (r.propertyId || "prop-1") !== propertyId),
      [KEYS.INVOICES]: allInvoices.filter((inv) => (inv.propertyId || "prop-1") !== propertyId),
      [KEYS.CONTRACTS]: allContracts.filter((c) => (c.propertyId || "prop-1") !== propertyId),
      [KEYS.REPAIRS]: allRepairs.filter((r) => (r.propertyId || "prop-1") !== propertyId),
      [KEYS.EXPENSES]: allExpenses.filter((e) => (e.propertyId || "prop-1") !== propertyId),
    };

    if (this.getActivePropertyId() === propertyId) {
      batchPayload[KEYS.ACTIVE_PROPERTY_ID] = filteredProps.length > 0 ? filteredProps[0].id : "";
      if (filteredProps.length > 0) {
        this.setActivePropertyId(filteredProps[0].id);
      } else {
        this.setActivePropertyId("");
      }
    }

    await this.persistBatch(batchPayload);

    // Permanently delete from Supabase PostgreSQL table 'properties'
    try {
      const propUuid = toUuid(propertyId);
      await supabase.from("properties").delete().or(`id.eq.${propUuid},id.eq.${propertyId}`);
    } catch (err: any) {
      console.warn("[Supabase Relational] Delete property warning:", err?.message);
    }

    // Remove branch-specific settings from local cache
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(this.getBranchSettingsKey(propertyId));
      } catch {}
    }

    await this.logActivity("DELETE", "SETTINGS", `ลบข้อมูลสาขา ID: ${propertyId}`);
    return true;
  },

  // -------------------------------------------------------------
  // 2. ROOMS MANAGEMENT (BRANCH-ISOLATED)
  // -------------------------------------------------------------
  getAllRawRooms(): Room[] {
    const rooms = getLocal<Room[] | null>(KEYS.ROOMS, null);
    if (rooms === null) {
      const seeded: Room[] = [];
      const tenantSeed = getLocal<Tenant[]>(KEYS.TENANTS, []);
      for (let floor = 1; floor <= 4; floor++) {
        for (let unit = 1; unit <= 6; unit++) {
          const roomNum = `${floor}0${unit}`;
          let status: RoomStatus = "vacant";
          let currentTenant: Tenant | undefined = undefined;

          if (roomNum === "101" && tenantSeed.length > 0) {
            status = "occupied";
            currentTenant = tenantSeed[0];
          } else if (roomNum === "102") {
            status = "occupied";
            currentTenant = {
              id: "t-102",
              propertyId: "prop-1",
              fullName: "นางสาวมณีรัตน์ แสงทอง",
              phone: "082-345-6789",
              idCard: "1100200300401",
            };
          } else if (roomNum === "105") {
            status = "overdue";
            currentTenant = {
              id: "t-105",
              propertyId: "prop-1",
              fullName: "นายเอกชัย รุ่งโรจน์วิริยะ",
              phone: "087-777-6655",
              idCard: "1100200300405",
            };
          } else if (roomNum === "201") {
            status = "daily";
          } else if (roomNum === "204") {
            status = "cleaning";
          }

          seeded.push({
            id: `room-${roomNum}`,
            propertyId: "prop-1",
            buildingId: "bldg-a",
            roomNumber: roomNum,
            floor,
            type: floor === 4 ? "Deluxe Suite" : "Standard",
            monthlyRate: floor === 4 ? 4500 : 4000,
            dailyRate: 650,
            status,
            currentTenant,
            currentElectricMeter: 1200 + floor * 100 + unit * 15,
            currentWaterMeter: 240 + floor * 20 + unit * 5,
            leaseEndDate: status === "occupied" ? "2027-10-31" : undefined,
          });
        }
      }
      setLocal(KEYS.ROOMS, seeded);
      return seeded;
    }

    // Auto migrate any legacy rooms missing propertyId into prop-1 and strip auto-seeded branch rooms
    let needsUpdate = false;
    const cleaned = rooms.filter((r) => {
      const isAutoSeededBranchRoom =
        /^room-prop-\d+-\d+$/.test(r.id) &&
        r.currentElectricMeter === 100 &&
        r.currentWaterMeter === 50 &&
        r.status === "vacant" &&
        !r.currentTenant;
      if (isAutoSeededBranchRoom) {
        needsUpdate = true;
        return false;
      }
      return true;
    });
    const migrated = cleaned.map((r) => {
      if (!r.propertyId) {
        needsUpdate = true;
        return { ...r, propertyId: "prop-1" };
      }
      return r;
    });
    if (needsUpdate) {
      setLocal(KEYS.ROOMS, migrated);
      return migrated;
    }
    return migrated;
  },

  async getRooms(propertyId?: string, buildingId?: string): Promise<Room[]> {
    const targetPropId = propertyId || this.getActivePropertyId();
    const allRooms = this.getAllRawRooms();
    let branchRooms = allRooms.filter((r) => (r.propertyId || "prop-1") === targetPropId);

    if (buildingId) {
      branchRooms = branchRooms.filter((r) => r.buildingId === buildingId);
    }

    return branchRooms.sort((a, b) =>
      a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true })
    );
  },

  async addRoom(roomData: {
    roomNumber: string;
    floor: number;
    type: string;
    monthlyRate: number;
    dailyRate?: number;
    status: RoomStatus;
    buildingId?: string;
    propertyId?: string;
  }): Promise<Room | null> {
    const propId = roomData.propertyId || this.getActivePropertyId();
    const allRooms = this.getAllRawRooms();

    const existingIdx = allRooms.findIndex(
      (r) => (r.propertyId || "prop-1") === propId && r.roomNumber === roomData.roomNumber
    );

    const newRoom: Room = {
      id: existingIdx >= 0 ? allRooms[existingIdx].id : nextShortId("R", allRooms.map((r) => r.id)),
      propertyId: propId,
      buildingId: roomData.buildingId || (propId === "prop-1" || propId === "P0001" ? "B0001" : `B${propId.replace(/^[A-Za-z-]+/, "").padStart(4, "0").slice(-4)}`),
      roomNumber: roomData.roomNumber,
      floor: roomData.floor,
      type: roomData.type,
      monthlyRate: roomData.monthlyRate,
      dailyRate: roomData.dailyRate || 650,
      status: roomData.status || "vacant",
      currentElectricMeter: existingIdx >= 0 ? allRooms[existingIdx].currentElectricMeter : 0,
      currentWaterMeter: existingIdx >= 0 ? allRooms[existingIdx].currentWaterMeter : 0,
    };

    let updatedRooms: Room[];
    if (existingIdx >= 0) {
      updatedRooms = allRooms.map((r, idx) => (idx === existingIdx ? newRoom : r));
    } else {
      updatedRooms = [...allRooms, newRoom];
    }

    setLocal(KEYS.ROOMS, updatedRooms);

    // Guaranteed Host Machine Persistence: Explicitly await write to ensure file is written before any page refresh
    if (typeof window !== "undefined") {
      try {
        await fetch("/api/db", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: KEYS.ROOMS, value: updatedRooms }),
          keepalive: true,
        });
      } catch (e) {
        console.warn("[HostDB] Await sync room failed:", e);
      }
    }

    await this.logActivity("CREATE", "ROOM", `เพิ่มห้องพัก ${newRoom.roomNumber} (ชั้น ${newRoom.floor})`, propId);
    return newRoom;
  },

  async addRoomsBatch(
    roomsList: {
      roomNumber: string;
      floor: number;
      type: string;
      monthlyRate: number;
      dailyRate?: number;
      status: RoomStatus;
      buildingId?: string;
      propertyId?: string;
    }[],
    propertyId?: string
  ): Promise<Room[]> {
    const propId = propertyId || this.getActivePropertyId();
    const allRooms = this.getAllRawRooms();
    const createdRooms: Room[] = [];

    let currentAll = [...allRooms];

    for (const rData of roomsList) {
      const existingIdx = currentAll.findIndex(
        (r) => (r.propertyId || "prop-1") === propId && r.roomNumber === rData.roomNumber
      );

      const newRoom: Room = {
        id: existingIdx >= 0 ? currentAll[existingIdx].id : nextShortId("R", currentAll.map((r) => r.id)),
        propertyId: propId,
        buildingId: rData.buildingId || (propId === "prop-1" || propId === "P0001" ? "B0001" : `B${propId.replace(/^[A-Za-z-]+/, "").padStart(4, "0").slice(-4)}`),
        roomNumber: rData.roomNumber,
        floor: rData.floor,
        type: rData.type,
        monthlyRate: rData.monthlyRate,
        dailyRate: rData.dailyRate || 650,
        status: rData.status || "vacant",
        currentElectricMeter: existingIdx >= 0 ? currentAll[existingIdx].currentElectricMeter : 0,
        currentWaterMeter: existingIdx >= 0 ? currentAll[existingIdx].currentWaterMeter : 0,
      };

      if (existingIdx >= 0) {
        currentAll[existingIdx] = newRoom;
      } else {
        currentAll.push(newRoom);
      }
      createdRooms.push(newRoom);
    }

    // 1. Immediately update in-memory and localStorage
    setLocal(KEYS.ROOMS, currentAll);

    // 2. Guaranteed Host Machine Persistence: Explicitly await write in ONE single atomic POST
    if (typeof window !== "undefined") {
      try {
        await fetch("/api/db", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: KEYS.ROOMS, value: currentAll }),
          keepalive: true,
        });
      } catch (err) {
        console.warn("[HostDB] Batch sync rooms failed:", err);
      }
    }

    await this.logActivity(
      "CREATE",
      "ROOM",
      `เพิ่มห้องพักเป็นชุด ${createdRooms.length} ห้อง (${createdRooms.map((r) => r.roomNumber).join(", ")})`,
      propId
    );

    return createdRooms;
  },

  async updateRoomStatus(roomId: string, status: RoomStatus): Promise<boolean> {
    const allRooms = this.getAllRawRooms();
    const targetRoom = allRooms.find((r) => r.id === roomId || r.roomNumber === roomId);
    const updated = allRooms.map((r) => {
      if (r.id === roomId || r.roomNumber === roomId) {
        if (status === "vacant" || status === "cleaning") {
          return { ...r, status, currentTenant: undefined, leaseEndDate: undefined };
        }
        return { ...r, status };
      }
      return r;
    });
    setLocal(KEYS.ROOMS, updated);

    // If marked as vacant, detach room assignment from any daily guest in tenants registry
    if (status === "vacant" && targetRoom) {
      const allTenants = getLocal<Tenant[]>(KEYS.TENANTS, []);
      const updatedTenants = allTenants.map((t) => {
        if (
          (t.propertyId || "prop-1") === (targetRoom.propertyId || "prop-1") &&
          (t.roomNumber === targetRoom.roomNumber || t.roomId === targetRoom.id) &&
          t.notes?.includes("[ผู้เข้าพักรายวัน]")
        ) {
          return { ...t, roomNumber: undefined, roomId: undefined };
        }
        return t;
      });
      setLocal(KEYS.TENANTS, updatedTenants);
    }

    // Data Coherence: When a room becomes vacant or cleaning, automatically terminate active contracts for that room
    if ((status === "vacant" || status === "cleaning") && targetRoom?.roomNumber) {
      await this.terminateRoomContracts(targetRoom.roomNumber, targetRoom.propertyId);
    }

    return true;
  },

  async deleteRoom(roomId: string): Promise<{ success: boolean; error?: string }> {
    const allRooms = this.getAllRawRooms();
    const target = allRooms.find((r) => r.id === roomId);
    if (!target) return { success: false, error: "ไม่พบข้อมูลห้องพัก" };

    // Safety Guard: Check if room has active tenant
    if (target.status === "occupied" || target.status === "daily" || target.status === "overdue" || target.currentTenant) {
      return { success: false, error: `ไม่สามารถลบห้อง ${target.roomNumber} ได้เนื่องจากยังมีผู้เช่าพักอาศัยอยู่ กรุณาย้ายหรือเช็คเอาท์ผู้เช่าออกก่อน` };
    }

    const updated = allRooms.filter((r) => r.id !== roomId);
    setLocal(KEYS.ROOMS, updated);

    // Clean up any old invoices belonging to the deleted vacant room
    const allInvoices = this.getAllRawInvoices();
    const filteredInvoices = allInvoices.filter(
      (inv) => !(inv.roomNumber === target.roomNumber && (!inv.propertyId || !target.propertyId || inv.propertyId === target.propertyId))
    );
    if (filteredInvoices.length !== allInvoices.length) {
      setLocal(KEYS.INVOICES, filteredInvoices);
    }

    // 1. Permanently delete from Supabase PostgreSQL table 'rooms'
    try {
      const propId = target.propertyId || "prop-1";
      const roomUuid = toUuid(target.id, `room-${propId}-${target.roomNumber}`);
      const bldgId = target.buildingId || (propId === "prop-1" ? "bldg-a" : `bldg-${propId}`);
      const bldgUuid = toUuid(bldgId);

      // Unlink any invoices referencing this room to prevent FK restrict violations
      await supabase
        .from("invoices")
        .update({ room_id: null })
        .or(`room_id.eq.${roomUuid},room_id.eq.${target.id}`);

      // Match either exact UUID or target.id, or building_id + room_number
      const { error: delErr, count } = await supabase
        .from("rooms")
        .delete({ count: "exact" })
        .or(`id.eq.${roomUuid},id.eq.${target.id},and(building_id.eq.${bldgUuid},room_number.eq.${target.roomNumber})`);

      if (delErr) {
        console.warn(`[Supabase Relational] Delete room ${target.roomNumber} warning:`, delErr.message);
      } else {
        console.log(`[Supabase Relational] Successfully deleted room ${target.roomNumber} from Supabase Cloud (rows affected: ${count})`);
      }
    } catch (err: any) {
      console.warn(`[Supabase Relational] Delete room ${target.roomNumber} error:`, err?.message);
    }

    await this.logActivity("DELETE", "ROOM", `ลบห้องพัก ${target?.roomNumber || roomId}`, target?.propertyId);
    return { success: true };
  },

  async deleteRooms(roomIds: string[]): Promise<{ success: boolean; error?: string }> {
    const allRooms = this.getAllRawRooms();
    const targets = allRooms.filter((r) => roomIds.includes(r.id));
    for (const room of targets) {
      if (room && (room.status === "occupied" || room.currentTenant)) {
        return { success: false, error: `ไม่สามารถลบห้อง ${room.roomNumber} ได้เนื่องจากมีผู้เช่าอยู่` };
      }
    }
    const updated = allRooms.filter((r) => !roomIds.includes(r.id));
    setLocal(KEYS.ROOMS, updated);

    // Permanently delete batch from Supabase PostgreSQL table 'rooms'
    try {
      const idsToDelete: string[] = [];
      targets.forEach((t) => {
        const propId = t.propertyId || "prop-1";
        idsToDelete.push(toUuid(t.id, `room-${propId}-${t.roomNumber}`));
        if (t.id) idsToDelete.push(t.id);
      });
      if (idsToDelete.length > 0) {
        // Unlink any invoices referencing these rooms to prevent FK restrict violations
        await supabase
          .from("invoices")
          .update({ room_id: null })
          .in("room_id", idsToDelete);
        const { error: delErr, count } = await supabase
          .from("rooms")
          .delete({ count: "exact" })
          .in("id", idsToDelete);
        if (delErr) {
          console.warn("[Supabase Relational] Batch delete rooms warning:", delErr.message);
        } else {
          console.log(`[Supabase Relational] Successfully deleted ${count} rooms from Supabase Cloud`);
        }
      }
    } catch (err: any) {
      console.warn("[Supabase Relational] Batch delete rooms error:", err?.message);
    }

    await this.logActivity("DELETE", "ROOM", `ลบห้องพักจำนวน ${roomIds.length} ห้องพร้อมกัน`);
    return { success: true };
  },

  async checkoutRoom(roomId: string): Promise<boolean> {
    const allRooms = this.getAllRawRooms();
    const updated = allRooms.map((r) =>
      r.id === roomId
        ? { ...r, status: "cleaning" as RoomStatus, currentTenant: undefined, leaseEndDate: undefined }
        : r
    );
    setLocal(KEYS.ROOMS, updated);

    await this.logActivity("UPDATE", "ROOM", `สรุปย้ายออกห้อง ID: ${roomId} และส่งต่อแผนกแม่บ้าน`);
    return true;
  },

  // -------------------------------------------------------------
  // 3. METER READINGS (BRANCH-AWARE)
  // -------------------------------------------------------------
  async saveMeterReading(
    roomId: string,
    electricCurr: number,
    waterCurr: number,
    electricPrev: number,
    waterPrev: number,
    billingMonth: string = new Date().toISOString().slice(0, 7),
    propertyId?: string
  ): Promise<boolean> {
    const allRooms = this.getAllRawRooms();
    const targetRoom = allRooms.find((r) => r.id === roomId);
    const targetPropId = propertyId || targetRoom?.propertyId || this.getActivePropertyId();

    const updatedRooms = allRooms.map((r) =>
      r.id === roomId ? { ...r, currentElectricMeter: electricCurr, currentWaterMeter: waterCurr } : r
    );
    setLocal(KEYS.ROOMS, updatedRooms);

    const history = getLocal<any[]>(KEYS.METER_READINGS, []);
    const newRecord = {
      id: nextShortId("W", history.map((m) => m.id)),
      property_id: targetPropId,
      room_id: roomId,
      room_number: targetRoom?.roomNumber || "",
      billing_month: billingMonth,
      electric_prev: electricPrev,
      electric_curr: electricCurr,
      electric_units: Math.max(0, electricCurr - electricPrev),
      water_prev: waterPrev,
      water_curr: waterCurr,
      water_units: Math.max(0, waterCurr - waterPrev),
      recorded_at: new Date().toLocaleString("th-TH"),
    };
    setLocal(KEYS.METER_READINGS, [newRecord, ...history]);

    await this.logActivity(
      "UPDATE",
      "METER",
      `จดมิเตอร์ห้อง ${targetRoom?.roomNumber}: ไฟ ${electricCurr}, น้ำ ${waterCurr}`,
      targetPropId
    );
    return true;
  },

  async getMeterReadings(propertyId?: string): Promise<any[]> {
    const targetPropId = propertyId || this.getActivePropertyId();
    const history = getLocal<any[]>(KEYS.METER_READINGS, []);
    return history.filter((m) => (m.property_id || "prop-1") === targetPropId);
  },

  async getLatestMeterReading(roomId: string, billingMonth?: string): Promise<any | null> {
    const history = getLocal<any[]>(KEYS.METER_READINGS, []);
    const month = billingMonth || new Date().toISOString().slice(0, 7);
    const found = history.find((m) => m.room_id === roomId && m.billing_month === month);
    if (found) return found;
    return history.find((m) => m.room_id === roomId) || null;
  },

  // -------------------------------------------------------------
  // 4. TENANTS (BRANCH-ISOLATED)
  // -------------------------------------------------------------
  async getTenants(propertyId?: string): Promise<Tenant[]> {
    const tenants = getLocal<Tenant[]>(KEYS.TENANTS, []);
    if (propertyId) {
      return tenants.filter((t) => (t.propertyId || "prop-1") === propertyId);
    }
    return tenants;
  },

  async createTenant(tenantData: Omit<Tenant, "id"> & { propertyId?: string }): Promise<Tenant | null> {
    const propId = tenantData.propertyId || this.getActivePropertyId();
    const current = await this.getTenants();
    const cleanIdCard = (tenantData.idCard || "").trim();
    const tenantId = cleanIdCard && cleanIdCard !== "-" ? cleanIdCard : nextShortId("T", current.map((t) => t.id));
    const newTenant: Tenant = {
      id: tenantId,
      propertyId: propId,
      ...tenantData,
    };
    const filtered = current.filter((t) => t.id !== tenantId);
    setLocal(KEYS.TENANTS, [newTenant, ...filtered]);
    await this.logActivity("CREATE", "TENANT", `ลงทะเบียนผู้เช่าใหม่: ${newTenant.fullName} (${newTenant.phone})`, propId);
    return newTenant;
  },

  isRoomNumberMatch(roomA?: string, roomB?: string): boolean {
    if (!roomA || !roomB) return false;
    const cleanA = roomA.replace(/\D/g, "");
    const cleanB = roomB.replace(/\D/g, "");
    if (cleanA && cleanB && cleanA === cleanB) return true;
    return roomA.trim().toLowerCase() === roomB.trim().toLowerCase();
  },

  async bindTenantLineUser(
    propertyId: string,
    roomNumber: string,
    lineUserId: string,
    lineDisplayName?: string
  ): Promise<Tenant | null> {
    const propId = propertyId || this.getActivePropertyId() || "prop-1";
    const cleanRoom = roomNumber.trim();
    const allRooms = this.getAllRawRooms();
    const allTenants = getLocal<Tenant[]>(KEYS.TENANTS, []);

    // 1. ค้นหาห้องจากหน้าแผนผัง (Room Matrix) เป็นความจริงหลัก (Single Source of Truth)
    const norm = (num: string) => {
      const clean = (num || "").trim();
      return /^\d+$/.test(clean) ? String(Number(clean)) : clean.toLowerCase();
    };
    const reqNorm = norm(cleanRoom);

    const roomMatch = allRooms.find(
      (r) =>
        (r.propertyId || "prop-1") === (propId || "prop-1") &&
        (r.roomNumber.trim().toLowerCase() === cleanRoom.toLowerCase() || norm(r.roomNumber) === reqNorm)
    );

    if (!roomMatch) {
      return null; // ไม่มีห้องนี้ในระบบ
    }

    // 2. หากห้องในหน้าแผนผังว่าง (vacant) หรือกำลังทำความสะอาด (cleaning) โดยไม่มีผู้เช่าลงทะเบียน
    if ((roomMatch.status === "vacant" || roomMatch.status === "cleaning") && !roomMatch.currentTenant) {
      // ปลดสิทธิ์ผู้เช่าคนเก่าทั้งหมดที่เคยผูกกับห้องนี้ เพื่อป้องกันไม่ให้ข้อมูลคนเก่ายังค้างในห้อง
      const detached = allTenants.map((t) => {
        if ((t.propertyId || "prop-1") === (roomMatch!.propertyId || "prop-1") && (t.roomNumber || "").trim() === cleanRoom) {
          return { ...t, roomNumber: undefined, roomId: undefined, lineUserId: undefined };
        }
        return t;
      });
      setLocal(KEYS.TENANTS, detached);
      return null;
    }

    // 3. ยึดข้อมูลผู้เช่าจากหน้าแผนผัง (currentTenant) และทะเบียนผู้เช่าเดิมเป็นหลัก (อัปเดตตัวเดิม ไม่สร้างซ้ำ)
    const activeName = roomMatch.currentTenant?.fullName || lineDisplayName || `ผู้เช่าห้อง ${cleanRoom}`;
    const existingTenantRecord = allTenants.find(
      (t) =>
        (t.propertyId || "prop-1") === (roomMatch!.propertyId || "prop-1") &&
        ((roomMatch!.currentTenant?.id && t.id === roomMatch!.currentTenant.id) ||
          (t.roomNumber || "").trim() === cleanRoom ||
          t.roomId === roomMatch!.id ||
          t.fullName.trim() === activeName.trim())
    );

    const activePhone =
      (existingTenantRecord?.phone && existingTenantRecord.phone !== "-" ? existingTenantRecord.phone : undefined) ||
      (roomMatch.currentTenant?.phone && roomMatch.currentTenant.phone !== "-" ? roomMatch.currentTenant.phone : undefined) ||
      "-";
    const activeIdCard =
      (existingTenantRecord?.idCard && existingTenantRecord.idCard !== "-" ? existingTenantRecord.idCard : undefined) ||
      (roomMatch.currentTenant?.idCard && roomMatch.currentTenant.idCard !== "-" ? roomMatch.currentTenant.idCard : undefined) ||
      "-";
    const tenantId =
      (activeIdCard && activeIdCard !== "-" ? activeIdCard.trim() : undefined) ||
      existingTenantRecord?.id ||
      roomMatch.currentTenant?.id ||
      `t-${roomMatch.propertyId || "prop-1"}-${cleanRoom}`;

    // 4. แทนสิทธิ์ (Replace Rights): ปลดสิทธิ์ผู้เช่าคนเดิมที่มีชื่อไม่ตรงกันออกจากห้องนี้
    const updatedTenants = allTenants.map((t) => {
      if (
        (t.propertyId || "prop-1") === (roomMatch!.propertyId || "prop-1") &&
        (t.roomNumber || "").trim() === cleanRoom &&
        t.id !== tenantId &&
        t.fullName.trim() !== activeName.trim()
      ) {
        // คนเก่าถูกปลดสิทธิ์ออกจากห้องนี้
        return { ...t, roomNumber: undefined, roomId: undefined, lineUserId: undefined };
      }
      return t;
    });

    // 5. บันทึก / อัปเดตข้อมูลผู้เช่าคนปัจจุบันที่ผูกกับห้องนี้ (อัปเดตแถวเดิม ไม่สร้างแถวซ้ำ)
    const currentTenantIdx = updatedTenants.findIndex(
      (t) =>
        (t.propertyId || "prop-1") === (roomMatch!.propertyId || "prop-1") &&
        (t.id === tenantId ||
          (t.roomNumber || "").trim() === cleanRoom ||
          t.roomId === roomMatch!.id ||
          t.fullName.trim() === activeName.trim())
    );

    const targetTenant: Tenant = {
      ...(roomMatch.currentTenant || {}),
      ...(currentTenantIdx !== -1 ? updatedTenants[currentTenantIdx] : {}),
      id: tenantId,
      propertyId: roomMatch.propertyId || propId,
      roomId: roomMatch.id,
      roomNumber: cleanRoom,
      fullName: activeName,
      phone: activePhone,
      idCard: activeIdCard,
      lineId: lineUserId,
      lineUserId,
      lineDisplayName: lineDisplayName || activeName,
      Line_Acc: lineDisplayName || activeName,
      lineAcc: lineDisplayName || activeName,
      lineLinkedAt: new Date().toISOString(),
    };

    if (currentTenantIdx !== -1) {
      updatedTenants[currentTenantIdx] = targetTenant;
    } else {
      updatedTenants.push(targetTenant);
    }

    // ลบรายการซ้ำของคนเดียวกันในห้องเดียวกัน (ถ้าเคยเกิดซ้ำมาก่อน) ให้เหลือแถวเดียว
    const dedupedTenants = updatedTenants.filter(
      (t, idx) =>
        idx === currentTenantIdx ||
        t.id === tenantId ||
        !(
          (t.propertyId || "prop-1") === (roomMatch!.propertyId || "prop-1") &&
          t.fullName.trim() === activeName.trim() &&
          t.id !== tenantId
        )
    );
    setLocal(KEYS.TENANTS, dedupedTenants);

    // 6. อัปเดตสถานะห้องในหน้าแผนผัง (Room Matrix) ให้มี currentTenant ที่ผูก LINE สำเร็จ
    const updatedRooms = allRooms.map((r) => {
      if ((r.propertyId || "prop-1") === (roomMatch!.propertyId || "prop-1") && r.roomNumber.trim() === cleanRoom) {
        return {
          ...r,
          status: (r.status === "cleaning" ? "cleaning" : "occupied") as RoomStatus,
          currentTenant: {
            ...(r.currentTenant || {}),
            ...targetTenant,
          },
        };
      }
      return r;
    });
    setLocal(KEYS.ROOMS, updatedRooms);

    await this.logActivity("UPDATE", "TENANT", `ผูก LINE ผู้เช่าห้อง ${cleanRoom} (${activeName})`, propId);
    return targetTenant;
  },

  async getTenantByLineUser(lineUserId: string, propertyId?: string): Promise<Tenant | null> {
    if (!lineUserId) return null;
    const propId = propertyId || this.getActivePropertyId() || "prop-1";
    const allTenants = getLocal<Tenant[]>(KEYS.TENANTS, []);
    const directMatch = allTenants.find((t) => (t.propertyId || "prop-1") === propId && t.lineUserId === lineUserId);
    if (directMatch) return directMatch;

    const allRooms = this.getAllRawRooms();
    const roomMatch = allRooms.find(
      (r) => (r.propertyId || "prop-1") === propId && r.currentTenant?.lineUserId === lineUserId
    );
    if (roomMatch && roomMatch.currentTenant) {
      return {
        ...roomMatch.currentTenant,
        propertyId: propId,
        roomNumber: roomMatch.roomNumber,
      };
    }
    return null;
  },

  async updateInvoiceLineStatus(
    invoiceId: string,
    status: "sent" | "failed",
    timestamp?: string
  ): Promise<Invoice | null> {
    const all = this.getAllRawInvoices();
    const idx = all.findIndex((i) => i.id === invoiceId);
    if (idx === -1) return null;

    const timeStr = timestamp || new Date().toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }) + " น.";
    all[idx] = {
      ...all[idx],
      lineDeliveryStatus: status,
      lineSentAt: status === "sent" ? timeStr : all[idx].lineSentAt,
    };
    setLocal(KEYS.INVOICES, all);
    return all[idx];
  },

  async assignTenantToRoom(tenantId: string, roomId: string, leaseEndDate?: string): Promise<boolean> {
    const tenants = await this.getTenants();
    const tenant = tenants.find((t) => t.id === tenantId);
    if (!tenant) return false;

    const allRooms = this.getAllRawRooms();
    const targetRoom = allRooms.find((r) => r.id === roomId);
    const enrichedTenant: Tenant = {
      ...tenant,
      roomId,
      roomNumber: targetRoom?.roomNumber || tenant.roomNumber,
    };

    const updatedTenants = tenants.map((t) => (t.id === tenantId ? enrichedTenant : t));
    setLocal(KEYS.TENANTS, updatedTenants);

    const updated = allRooms.map((r) =>
      r.id === roomId
        ? {
            ...r,
            status: "occupied" as RoomStatus,
            currentTenant: enrichedTenant,
            leaseEndDate: leaseEndDate || r.leaseEndDate || "2027-10-31",
          }
        : r
    );
    setLocal(KEYS.ROOMS, updated);
    return true;
  },

  // -------------------------------------------------------------
  // 5. INVOICES & BILLING (BRANCH-ISOLATED)
  // -------------------------------------------------------------
  getAllRawInvoices(): Invoice[] {
    const invoices = getLocal<Invoice[]>(KEYS.INVOICES, []);
    if (invoices.length === 0) {
      return [];
    }

    // Auto migrate any legacy invoices missing propertyId into prop-1 and sanitize 0-unit charges
    let needsUpdate = false;
    const migrated = invoices.map((inv) => {
      let updatedInv = inv;
      if (!inv.propertyId) {
        needsUpdate = true;
        updatedInv = { ...updatedInv, propertyId: "prop-1" };
      }
      // Defensive fix: If meter units is 0 (prev === curr), electric and water amount MUST be 0
      let itemsChanged = false;
      const sanitizedItems = (updatedInv.items || []).map((item) => {
        const isMeterZero = item.units === 0 || (item.meterPrev !== undefined && item.meterCurr !== undefined && item.meterPrev === item.meterCurr);
        const isUtility = item.name.includes("ค่าไฟ") || item.name.includes("ค่าน้ำ");
        if (isMeterZero && isUtility && item.amount > 0) {
          itemsChanged = true;
          return { ...item, amount: 0 };
        }
        return item;
      });
      if (itemsChanged) {
        needsUpdate = true;
        const newTotal = sanitizedItems.reduce((acc, it) => acc + (it.amount || 0), 0);
        updatedInv = {
          ...updatedInv,
          items: sanitizedItems,
          totalAmount: newTotal,
          remainingAmount: updatedInv.status === "paid" ? 0 : newTotal - (updatedInv.paidAmount || 0),
        };
      }
      return updatedInv;
    });
    if (needsUpdate) {
      setLocal(KEYS.INVOICES, migrated);
      return migrated;
    }
    return invoices;
  },

  async getInvoices(propertyId?: string): Promise<Invoice[]> {
    const targetPropId = propertyId || this.getActivePropertyId();
    const allInvoices = this.getAllRawInvoices();
    return allInvoices.filter((inv) => (inv.propertyId || "prop-1") === targetPropId);
  },

  async createInvoice(invoiceData: {
    roomNumber: string;
    roomId: string;
    tenantId?: string;
    tenantName: string;
    tenantPhone: string;
    billingMonth: string;
    dueDate: string;
    totalAmount: number;
    propertyId?: string;
    status?: "unpaid" | "pending_review" | "paid" | "overdue" | "cancelled";
    items: {
      name: string;
      units?: number;
      rate?: number;
      amount: number;
      meterPrev?: number;
      meterCurr?: number;
    }[];
  }): Promise<boolean> {
    const propId = invoiceData.propertyId || this.getActivePropertyId();
    const invoiceNumber = `INV-${invoiceData.billingMonth.replace("-", "")}-${invoiceData.roomNumber}`;
    const allInvoices = this.getAllRawInvoices();

    const existingIdx = allInvoices.findIndex(
      (i) => (i.propertyId || "prop-1") === propId && i.invoiceNumber === invoiceNumber
    );

    let isOverwrite = false;
    let finalInvoiceNumber = invoiceNumber;

    if (existingIdx >= 0) {
      const existing = allInvoices[existingIdx];
      // กฎการเงิน: หากบิลเดิมชำระแล้ว หรือเป็นของผู้เช่าคนละคน ให้เก็บรักษาไว้ (LOG) ไม่ลบ/ไม่ทับเด็ดขาด
      if (existing.status === "paid" || existing.status === "partial" || existing.tenantName !== invoiceData.tenantName) {
        finalInvoiceNumber = `INV-${invoiceData.billingMonth.replace("-", "")}-${invoiceData.roomNumber}-${Date.now().toString().slice(-4)}`;
        isOverwrite = false;
      } else {
        isOverwrite = true;
      }
    }

    // Newly generated or recalculated bills MUST start as "unpaid" so tenants can pay!
    const targetStatus = invoiceData.status || "unpaid";

    const newInvoice: Invoice = {
      id: isOverwrite ? allInvoices[existingIdx].id : nextShortId("I", allInvoices.map((i) => i.id)),
      propertyId: propId,
      invoiceNumber: finalInvoiceNumber,
      roomNumber: invoiceData.roomNumber,
      tenantName: invoiceData.tenantName,
      tenantPhone: invoiceData.tenantPhone,
      billingDate: invoiceData.billingMonth + "-25",
      dueDate: invoiceData.dueDate,
      totalAmount: invoiceData.totalAmount,
      status: targetStatus,
      items: invoiceData.items,
      paidAt: targetStatus === "paid" ? (isOverwrite ? allInvoices[existingIdx].paidAt : new Date().toISOString()) : undefined,
    };

    let updated: Invoice[];
    if (isOverwrite) {
      updated = allInvoices.map((inv, idx) => (idx === existingIdx ? newInvoice : inv));
    } else {
      updated = [newInvoice, ...allInvoices];
    }

    setLocal(KEYS.INVOICES, updated);
    await this.persistBatch({ [KEYS.INVOICES]: updated });
    await this.logActivity(
      "CREATE",
      "INVOICE",
      `ออกใบแจ้งหนี้ ${invoiceNumber} ห้อง ${invoiceData.roomNumber} (฿${invoiceData.totalAmount.toLocaleString()})`,
      propId
    );
    return true;
  },

  async createDirectInvoice(invoice: Invoice): Promise<boolean> {
    const propId = invoice.propertyId || this.getActivePropertyId();
    const allInvoices = this.getAllRawInvoices();
    const updated = [invoice, ...allInvoices.filter((i) => i.id !== invoice.id)];
    setLocal(KEYS.INVOICES, updated);
    await this.persistBatch({ [KEYS.INVOICES]: updated });
    await this.logActivity(
      "CREATE",
      "INVOICE",
      `ออกใบแจ้งหนี้/ใบสรุปยอด ${invoice.invoiceNumber} ห้อง ${invoice.roomNumber} (฿${invoice.totalAmount.toLocaleString()})`,
      propId
    );
    return true;
  },

  async updateInvoiceStatus(
    invoiceId: string,
    status: "paid" | "unpaid" | "overdue" | "partial" | "pending_review" | "cancelled",
    paidAmount?: number,
    extraData?: Partial<Invoice>
  ): Promise<boolean> {
    const allInvoices = this.getAllRawInvoices();
    const target = allInvoices.find((i) => i.id === invoiceId);
    if (!target) return false;

    const actualTotal = Number(target.totalAmount) || 0;
    const actualPaid = paidAmount !== undefined ? Number(paidAmount) : status === "paid" ? actualTotal : 0;
    const remaining = Math.max(0, actualTotal - actualPaid);
    const resolvedStatus = remaining === 0 && actualPaid > 0 ? "paid" : actualPaid > 0 ? "partial" : status;

    const updated = allInvoices.map((inv) =>
      inv.id === invoiceId
        ? {
            ...inv,
            status: resolvedStatus,
            paidAmount: actualPaid,
            remainingAmount: remaining,
            paidAt: actualPaid > 0 ? new Date().toLocaleString("th-TH") : inv.paidAt,
            ...(extraData || {}),
          }
        : inv
    );
    setLocal(KEYS.INVOICES, updated);

    // Record into Payment Ledger if payment was made
    if (actualPaid > 0) {
      await this.recordPayment({
        invoiceId: target.id,
        propertyId: target.propertyId || this.getActivePropertyId(),
        roomNumber: target.roomNumber,
        tenantName: target.tenantName,
        amount: actualPaid,
        paymentMethod: (extraData as any)?.paymentMethod || "cash",
      });
    }

    await this.logActivity("PAYMENT", "INVOICE", `อัปเดตสถานะบิล ID ${invoiceId} เป็น "${resolvedStatus}" (ยอดชำระ ฿${actualPaid.toLocaleString()})`);
    return true;
  },

  // -------------------------------------------------------------
  // 5.5 PAYMENTS & RECEIPTS (FINANCIAL LEDGER)
  // -------------------------------------------------------------
  getAllRawPayments(): any[] {
    return getLocal<any[]>(KEYS.PAYMENTS, []);
  },

  async getPayments(propertyId?: string): Promise<any[]> {
    const targetPropId = propertyId || this.getActivePropertyId();
    const all = this.getAllRawPayments();
    return all.filter((p) => (p.propertyId || "prop-1") === targetPropId);
  },

  async recordPayment(paymentData: {
    invoiceId: string;
    amount: number;
    propertyId?: string;
    roomNumber?: string;
    tenantName?: string;
    paymentMethod?: "transfer" | "cash" | "promptpay" | "credit_card";
    notes?: string;
  }): Promise<any> {
    const propId = paymentData.propertyId || this.getActivePropertyId();
    const all = this.getAllRawPayments();
    const idx = all.length + 1;
    const paymentId = `pmt-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const paymentNumber = `PMT-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, "0")}-${idx.toString().padStart(4, "0")}`;

    const newPayment = {
      id: paymentId,
      paymentNumber,
      propertyId: propId,
      invoiceId: paymentData.invoiceId,
      roomNumber: paymentData.roomNumber,
      tenantName: paymentData.tenantName,
      amount: paymentData.amount,
      paymentMethod: paymentData.paymentMethod || "promptpay",
      paidAt: new Date().toISOString(),
      receivedBy: "admin",
      status: "completed",
      notes: paymentData.notes,
      version: 1,
      createdAt: new Date().toISOString(),
    };

    const updatedPayments = [newPayment, ...all];
    setLocal(KEYS.PAYMENTS, updatedPayments);

    // Also auto-generate official Receipt
    const allReceipts = getLocal<any[]>(KEYS.RECEIPTS, []);
    const receiptNumber = `REC-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, "0")}-${(allReceipts.length + 1).toString().padStart(4, "0")}`;
    const newReceipt = {
      id: `rec-${Date.now()}`,
      receiptNumber,
      propertyId: propId,
      paymentId,
      invoiceId: paymentData.invoiceId,
      roomNumber: paymentData.roomNumber || "",
      tenantName: paymentData.tenantName || "",
      amount: paymentData.amount,
      issuedAt: new Date().toISOString(),
      issuedBy: "admin",
    };
    setLocal(KEYS.RECEIPTS, [newReceipt, ...allReceipts]);

    await this.persistBatch({
      [KEYS.PAYMENTS]: updatedPayments,
      [KEYS.RECEIPTS]: [newReceipt, ...allReceipts],
    });

    await this.logActivity("PAYMENT", "INVOICE", `บันทึกการรับเงิน ${paymentNumber} ยอด ฿${paymentData.amount.toLocaleString()} (ออกใบเสร็จ ${receiptNumber})`, propId);
    return newPayment;
  },

  // -------------------------------------------------------------
  // 6. CONTRACTS (BRANCH-ISOLATED)
  // -------------------------------------------------------------
  async getContracts(propertyId?: string): Promise<ContractItem[]> {
    const targetPropId = propertyId || this.getActivePropertyId();
    const all = getLocal<ContractItem[]>(KEYS.CONTRACTS, []);
    return all.filter((c) => (c.propertyId || "prop-1") === targetPropId);
  },

  async addContract(
    item: Omit<ContractItem, "id" | "createdAt" | "contractNumber"> & { propertyId?: string }
  ): Promise<ContractItem> {
    const propId = item.propertyId || this.getActivePropertyId();
    const all = getLocal<ContractItem[]>(KEYS.CONTRACTS, []);
    const newContract: ContractItem = {
      ...item,
      id: nextShortId("C", all.map((c) => c.id)),
      propertyId: propId,
      contractNumber: `CT-2026-${item.roomNumber}-${Math.floor(100 + Math.random() * 900)}`,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setLocal(KEYS.CONTRACTS, [newContract, ...all]);

    // Synchronize Room to occupied in database (preserve existing tenant ID & details)
    const allRooms = this.getAllRawRooms();
    const allTenants = getLocal<Tenant[]>(KEYS.TENANTS, []);
    const matchedTenant = allTenants.find(
      (t) =>
        (t.propertyId || "prop-1") === propId &&
        ((t.roomNumber || "").trim() === (item.roomNumber || "").trim() ||
          t.fullName.trim() === (item.tenantName || "").trim())
    );

    const updatedRooms = allRooms.map((r) => {
      if ((r.propertyId || "prop-1") === propId && r.roomNumber === item.roomNumber) {
        const baseTenant = matchedTenant || r.currentTenant;
        return {
          ...r,
          status: "occupied" as RoomStatus,
          leaseEndDate: item.endDate,
          currentTenant: {
            ...(baseTenant || {}),
            id:
              (baseTenant?.idCard && baseTenant.idCard !== "-" ? baseTenant.idCard.trim() : undefined) ||
              baseTenant?.id ||
              nextShortId("T", allTenants.map((t) => t.id)),
            propertyId: propId,
            roomId: r.id,
            roomNumber: r.roomNumber,
            fullName: item.tenantName || baseTenant?.fullName || "",
            phone: item.tenantPhone || baseTenant?.phone || "-",
            idCard: baseTenant?.idCard && baseTenant.idCard !== "-" ? baseTenant.idCard : "-",
          },
        };
      }
      return r;
    });
    setLocal(KEYS.ROOMS, updatedRooms);

    await this.logActivity("CREATE", "CONTRACT", `สร้างสัญญาเช่าห้อง ${item.roomNumber} ผู้เช่า: ${item.tenantName}`, propId);
    return newContract;
  },

  async updateContractStatus(id: string, status: ContractItem["status"]): Promise<boolean> {
    const all = getLocal<ContractItem[]>(KEYS.CONTRACTS, initialContracts);
    const target = all.find((c) => c.id === id);
    const updated = all.map((c) => (c.id === id ? { ...c, status } : c));
    setLocal(KEYS.CONTRACTS, updated);

    // If terminated or expired, mark room as vacant
    if (target && (status === "terminated" || status === "expired")) {
      const allRooms = this.getAllRawRooms();
      const targetPropId = target.propertyId || "prop-1";
      const updatedRooms = allRooms.map((r) => {
        if ((r.propertyId || "prop-1") === targetPropId && r.roomNumber === target.roomNumber) {
          return {
            ...r,
            status: "vacant" as RoomStatus,
            currentTenant: undefined,
            leaseEndDate: undefined,
          };
        }
        return r;
      });
      setLocal(KEYS.ROOMS, updatedRooms);
    }
    return true;
  },

  async updateContractSignature(id: string, signatureUrl: string): Promise<boolean> {
    const all = getLocal<ContractItem[]>(KEYS.CONTRACTS, initialContracts);
    const updated = all.map((c) =>
      c.id === id
        ? {
            ...c,
            signatureUrl,
            status: "active" as ContractItem["status"],
            signedAt: new Date().toLocaleString("th-TH"),
          }
        : c
    );
    setLocal(KEYS.CONTRACTS, updated);
    await this.logActivity("UPDATE", "CONTRACT", `ลงนามสัญญาเช่าอิเล็กทรอนิกส์ (E-Signature) เรียบร้อยแล้ว`);
    return true;
  },

  async terminateRoomContracts(roomNumber: string, propertyId?: string): Promise<boolean> {
    const all = getLocal<ContractItem[]>(KEYS.CONTRACTS, initialContracts);
    const targetPropId = propertyId || this.getActivePropertyId();
    const updated = all.map((c) =>
      c.roomNumber === roomNumber && (!targetPropId || (c.propertyId || "prop-1") === targetPropId) && c.status === "active"
        ? { ...c, status: "terminated" as const }
        : c
    );
    setLocal(KEYS.CONTRACTS, updated);

    // Only reset tenant info, DO NOT overwrite room status if it was set to "cleaning"
    const allRooms = this.getAllRawRooms();
    const updatedRooms = allRooms.map((r) => {
      if ((!targetPropId || (r.propertyId || "prop-1") === targetPropId) && r.roomNumber === roomNumber) {
        return {
          ...r,
          // Preserve "cleaning" if already set, otherwise set to vacant
          status: (r.status === "cleaning" ? "cleaning" : "vacant") as RoomStatus,
          leaseEndDate: undefined,
          currentTenant: undefined,
        };
      }
      return r;
    });
    setLocal(KEYS.ROOMS, updatedRooms);

    return true;
  },

  // -------------------------------------------------------------
  // DAILY BOOKINGS (BRANCH-ISOLATED)
  // -------------------------------------------------------------
  async getDailyBookings(propertyId?: string): Promise<DailyBooking[]> {
    const targetPropId = propertyId || this.getActivePropertyId();
    const all = getLocal<DailyBooking[]>(KEYS.DAILY_BOOKINGS, []);
    const branchBookings = all.filter((b) => (b.propertyId || "prop-1") === targetPropId);

    // Auto-heal / Coherence: ตรวจสอบห้องที่มีสถานะ "daily" แต่ยังไม่มีรายการบันทึกการจอง
    const allRooms = this.getAllRawRooms();
    const branchDailyRooms = allRooms.filter(
      (r) => (r.propertyId || "prop-1") === targetPropId && r.status === "daily"
    );

    const missingBookings: DailyBooking[] = [];
    for (const r of branchDailyRooms) {
      const hasBooking = branchBookings.some((b) => b.roomNumber === r.roomNumber);
      if (!hasBooking) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
        const syntheticBooking: DailyBooking = {
          id: nextShortId("D", [...all, ...missingBookings].map((b) => b.id)),
          propertyId: targetPropId,
          roomNumber: r.roomNumber,
          guestName: r.currentTenant?.fullName || "ผู้เข้าพักรายวัน",
          guestPhone: r.currentTenant?.phone || "-",
          checkInDate: todayStr,
          checkInTime: "14:00",
          checkOutDate: tomorrowStr,
          checkOutTime: "12:00",
          nights: 1,
          dailyRate: r.dailyRate || 650,
          totalRoomPrice: r.dailyRate || 650,
          keyDeposit: 500,
          status: "checked_in",
        };
        missingBookings.push(syntheticBooking);
      }
    }

    if (missingBookings.length > 0) {
      const updated = [...missingBookings, ...all];
      setLocal(KEYS.DAILY_BOOKINGS, updated);
      return [...missingBookings, ...branchBookings];
    }

    return branchBookings;
  },

  async addDailyBooking(booking: DailyBooking, propertyId?: string): Promise<DailyBooking> {
    const propId = propertyId || this.getActivePropertyId();
    const all = getLocal<DailyBooking[]>(KEYS.DAILY_BOOKINGS, []);
    const item: DailyBooking = {
      ...booking,
      propertyId: propId,
    };
    const updatedBookings = [item, ...all];
    setLocal(KEYS.DAILY_BOOKINGS, updatedBookings);

    // Update room status to 'daily'
    const allRooms = this.getAllRawRooms();
    const updatedRooms = allRooms.map((r) => {
      if ((r.propertyId || "prop-1") === propId && r.roomNumber === booking.roomNumber) {
        return { ...r, status: "daily" as RoomStatus };
      }
      return r;
    });
    setLocal(KEYS.ROOMS, updatedRooms);

    await this.logActivity("CREATE", "ROOM", `บันทึกการจองรายวันห้อง ${booking.roomNumber} (${booking.guestName})`, propId);
    return item;
  },

  async updateDailyBooking(id: string, updates: Partial<DailyBooking>): Promise<boolean> {
    const all = getLocal<DailyBooking[]>(KEYS.DAILY_BOOKINGS, []);
    const updated = all.map((b) => (b.id === id ? { ...b, ...updates } : b));
    setLocal(KEYS.DAILY_BOOKINGS, updated);

    const target = all.find((b) => b.id === id);
    let updatedRooms: Room[] | null = null;
    if (target && updates.status === "checked_in") {
      const allRooms = this.getAllRawRooms();
      updatedRooms = allRooms.map((r) => {
        if ((r.propertyId || "prop-1") === (target.propertyId || "prop-1") && r.roomNumber === target.roomNumber) {
          return { ...r, status: "daily" as RoomStatus };
        }
        return r;
      });
      setLocal(KEYS.ROOMS, updatedRooms);
    }

    return true;
  },

  async removeDailyBooking(id: string, roomNumber?: string): Promise<boolean> {
    const all = getLocal<DailyBooking[]>(KEYS.DAILY_BOOKINGS, []);
    const updated = all.filter((b) => {
      if (id) return b.id !== id;
      if (roomNumber) return b.roomNumber !== roomNumber;
      return true;
    });
    setLocal(KEYS.DAILY_BOOKINGS, updated);
    return true;
  },

  // -------------------------------------------------------------
  // 7. REPAIRS (BRANCH-ISOLATED)
  // -------------------------------------------------------------
  async getRepairs(propertyId?: string): Promise<RepairItem[]> {
    const targetPropId = propertyId || this.getActivePropertyId();
    const all = getLocal<RepairItem[]>(KEYS.REPAIRS, []);
    return all.filter((r) => (r.propertyId || "prop-1") === targetPropId);
  },

  async addRepair(
    item: Omit<RepairItem, "id" | "reportedAt"> & { propertyId?: string }
  ): Promise<RepairItem> {
    const propId = item.propertyId || this.getActivePropertyId();
    const all = getLocal<RepairItem[]>(KEYS.REPAIRS, []);
    const newRepair: RepairItem = {
      ...item,
      id: nextShortId("F", all.map((r) => r.id)),
      propertyId: propId,
      reportedAt: new Date().toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }) + " น.",
    };
    setLocal(KEYS.REPAIRS, [newRepair, ...all]);
    await this.logActivity("CREATE", "REPAIR", `แจ้งซ่อมห้อง ${item.roomNumber}: ${item.title}`, propId);
    return newRepair;
  },

  async updateRepairStatus(id: string, status: RepairItem["status"]): Promise<boolean> {
    const all = getLocal<RepairItem[]>(KEYS.REPAIRS, []);
    const updated = all.map((r) =>
      r.id === id
        ? {
            ...r,
            status,
            completedAt: status === "completed" ? new Date().toLocaleString("th-TH") : r.completedAt,
          }
        : r
    );
    setLocal(KEYS.REPAIRS, updated);
    return true;
  },

  // -------------------------------------------------------------
  // 8. EXPENSES (BRANCH-ISOLATED)
  // -------------------------------------------------------------
  async getExpenses(propertyId?: string): Promise<ExpenseItem[]> {
    const targetPropId = propertyId || this.getActivePropertyId();
    const all = getLocal<ExpenseItem[]>(KEYS.EXPENSES, []);
    return all.filter((e) => (e.propertyId || "prop-1") === targetPropId);
  },

  async addExpense(
    item: Omit<ExpenseItem, "id"> & { propertyId?: string }
  ): Promise<ExpenseItem> {
    const propId = item.propertyId || this.getActivePropertyId();
    const all = getLocal<ExpenseItem[]>(KEYS.EXPENSES, []);
    const newExpense: ExpenseItem = {
      ...item,
      id: nextShortId("E", all.map((e) => e.id)),
      propertyId: propId,
    };
    setLocal(KEYS.EXPENSES, [newExpense, ...all]);
    await this.logActivity("CREATE", "SETTINGS", `บันทึกรายจ่าย: ${item.title} (฿${item.amount.toLocaleString()})`, propId);
    return newExpense;
  },

  async deleteExpense(id: string, propertyId?: string): Promise<boolean> {
    const propId = propertyId || this.getActivePropertyId();
    const all = getLocal<ExpenseItem[]>(KEYS.EXPENSES, []);
    const target = all.find((e) => e.id === id);
    const updated = all.filter((e) => e.id !== id);
    setLocal(KEYS.EXPENSES, updated);

    // Permanently delete from Supabase PostgreSQL table 'expenses'
    try {
      const expUuid = toUuid(id);
      await supabase.from("expenses").delete().or(`id.eq.${expUuid},id.eq.${id}`);
    } catch (err: any) {
      console.warn("[Supabase Relational] Delete expense warning:", err?.message);
    }

    if (target) {
      await this.logActivity("DELETE", "SETTINGS", `ลบรายการรายจ่าย: ${target.title} (฿${target.amount.toLocaleString()})`, propId);
    }
    return true;
  },

  // -------------------------------------------------------------
  // 9. BROADCASTS & NOTIFICATIONS
  // -------------------------------------------------------------
  async getBroadcasts(propertyId?: string): Promise<BroadcastItem[]> {
    const targetPropId = propertyId || this.getActivePropertyId();
    const all = getLocal<BroadcastItem[]>(KEYS.BROADCASTS, []);
    return all.filter((b) => (b.propertyId || "prop-1") === targetPropId);
  },

  async sendBroadcast(
    item: Omit<BroadcastItem, "id" | "sentAt" | "status"> & { propertyId?: string }
  ): Promise<BroadcastItem> {
    const propId = item.propertyId || this.getActivePropertyId();
    const all = getLocal<BroadcastItem[]>(KEYS.BROADCASTS, []);
    const newBroadcast: BroadcastItem = {
      ...item,
      id: "bc-" + Date.now(),
      propertyId: propId,
      sentAt: new Date().toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }) + " น.",
      status: "sent",
    };
    setLocal(KEYS.BROADCASTS, [newBroadcast, ...all]);
    await this.logActivity("SEND", "ROOM", `ส่งบรอดแคสต์ LINE: ${item.title} (${item.recipientCount} ห้อง)`, propId);
    return newBroadcast;
  },

  // -------------------------------------------------------------
  // 10. ACTIVITY LOGS / AUDIT TRAIL
  // -------------------------------------------------------------
  async getActivityLogs(propertyId?: string): Promise<ActivityLogItem[]> {
    const targetPropId = propertyId || this.getActivePropertyId();
    const all = getLocal<ActivityLogItem[]>(KEYS.ACTIVITY_LOGS, []);
    return all.filter((l) => (l.propertyId || "prop-1") === targetPropId);
  },

  async logActivity(
    action: ActivityLogItem["action"],
    entity: ActivityLogItem["entity"],
    description: string,
    propertyId?: string
  ): Promise<void> {
    const propId = propertyId || this.getActivePropertyId();
    const all = getLocal<ActivityLogItem[]>(KEYS.ACTIVITY_LOGS, initialActivityLogs);
    const newLog: ActivityLogItem = {
      id: nextShortId("L", all.map((l) => l.id)),
      propertyId: propId,
      userName: "คุณพักดี มีสุข (เจ้าของหอพัก)",
      action,
      entity,
      description,
      createdAt: new Date().toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }) + " น.",
    };
    setLocal(KEYS.ACTIVITY_LOGS, [newLog, ...all.slice(0, 49)]);
  },

  // -------------------------------------------------------------
  // 11. BRANCH SETTINGS 10 TABS (BRANCH-SPECIFIC)
  // -------------------------------------------------------------
  async getBranchSettings(
    property?: Property | null,
    propertyId?: string
  ): Promise<BranchSettingsDetail> {
    const propId = propertyId || property?.id || this.getActivePropertyId();
    const branchSettingsKey = this.getBranchSettingsKey(propId);
    let saved = getLocal<BranchSettingsDetail | null>(branchSettingsKey, null);
    if (!saved) {
      saved = getLocal<BranchSettingsDetail | null>(KEYS.BRANCH_SETTINGS, null);
    }

    if (saved) {
      const roomTypes = saved.roomTypes && saved.roomTypes.length > 0 ? saved.roomTypes : defaultRoomTypes;
      if (property) {
        return {
          ...saved,
          roomTypes,
          branchName: saved.branchName || property.name,
          address: saved.address || property.address,
          phone: saved.phone || property.phone,
          promptpayNumber: saved.promptpayNumber || property.promptpayNumber,
          promptpayName: saved.promptpayName || property.promptpayName,
          electricRate: saved.electricRate !== undefined ? Number(saved.electricRate) : (property.electricRate ?? 8),
          waterRate: saved.waterRate !== undefined ? Number(saved.waterRate) : (property.waterRate ?? 18),
        };
      }
      return {
        ...saved,
        roomTypes,
      };
    }

    // Default template tailored for this specific branch
    const defaultSettings: BranchSettingsDetail = {
      ...initialBranchSettings,
      id: `settings-${propId}`,
      branchName: property?.name || (propId === "prop-1" ? "พักดี แมนชั่น (สาขา 1)" : `พักดี แมนชั่น (${propId})`),
      address: property?.address || initialBranchSettings.address,
      phone: property?.phone || initialBranchSettings.phone,
      promptpayNumber: property?.promptpayNumber || initialBranchSettings.promptpayNumber,
      promptpayName: property?.promptpayName || initialBranchSettings.promptpayName,
      electricRate: property?.electricRate ?? 8,
      waterRate: property?.waterRate ?? 18,
    };
    setLocal(branchSettingsKey, defaultSettings);
    return defaultSettings;
  },

  async updateBranchSettings(
    updates: Partial<BranchSettingsDetail>,
    propertyId?: string
  ): Promise<BranchSettingsDetail> {
    const propId = propertyId || this.getActivePropertyId();
    const branchSettingsKey = this.getBranchSettingsKey(propId);
    const current = await this.getBranchSettings(null, propId);
    const updated = { ...current, ...updates };
    setLocal(branchSettingsKey, updated);

    // Synchronize to the corresponding branch in KEYS.PROPERTIES
    const propUpdates: Partial<Property> = {};
    if (updated.branchName) propUpdates.name = updated.branchName;
    if (updated.address) propUpdates.address = updated.address;
    if (updated.phone) propUpdates.phone = updated.phone;
    if (updated.promptpayNumber) propUpdates.promptpayNumber = updated.promptpayNumber;
    if (updated.promptpayName) propUpdates.promptpayName = updated.promptpayName;
    if (updated.electricRate !== undefined) propUpdates.electricRate = Number(updated.electricRate);
    if (updated.waterRate !== undefined) propUpdates.waterRate = Number(updated.waterRate);

    if (Object.keys(propUpdates).length > 0) {
      const allProps = await this.getAllProperties();
      const updatedProps = allProps.map((p) => (p.id === propId ? { ...p, ...propUpdates } : p));
      setLocal(KEYS.PROPERTIES, updatedProps);

      // Direct relational Supabase sync
      try {
        supabase
          .from("properties")
          .update({
            name: updated.branchName,
            address: updated.address,
            phone: updated.phone,
            promptpay_number: updated.promptpayNumber,
            promptpay_name: updated.promptpayName,
            electric_rate: updated.electricRate,
            water_rate: updated.waterRate,
          })
          .eq("name", updated.branchName || "วิภาวรรณ 1")
          .then(() => {});

        supabase
          .from("properties")
          .select("id")
          .eq("name", updated.branchName || "วิภาวรรณ 1")
          .maybeSingle()
          .then(({ data: propRow }: any) => {
            if (propRow?.id) {
              supabase
                .from("branch_settings")
                .upsert(
                  {
                    property_id: propRow.id,
                    branch_name: updated.branchName,
                    address: updated.address,
                    phone: updated.phone,
                    owner_name: updated.ownerName,
                    owner_phone: updated.ownerPhone,
                    tax_id: updated.taxId,
                    water_rate: updated.waterRate,
                    electric_rate: updated.electricRate,
                    use_min_water: Boolean(updated.useMinWater),
                    min_water_units: updated.minWaterUnits,
                    min_water_fee: updated.minWaterFee,
                    use_min_electric: Boolean(updated.useMinElectric),
                    min_electric_units: updated.minElectricUnits,
                    min_electric_fee: updated.minElectricFee,
                    common_fee: updated.commonFee,
                    internet_fee: updated.internetFee,
                    parking_fee: updated.parkingFee,
                    bill_cycle_day: updated.billCycleDay,
                    bill_due_day: updated.billDueDay,
                    late_fee_per_day: updated.lateFeePerDay,
                    bank_name: updated.bankName,
                    bank_account_number: updated.bankAccountNumber,
                    bank_account_name: updated.bankAccountName,
                    promptpay_number: updated.promptpayNumber,
                    promptpay_name: updated.promptpayName,
                    line_channel_access_token: updated.lineChannelAccessToken,
                    line_channel_secret: updated.lineChannelSecret,
                    contract_terms: updated.contractTerms,
                  },
                  { onConflict: "property_id" }
                )
                .then(({ error }: any) => {
                  if (error) console.warn("[Supabase Cloud] Relational branch_settings error:", error.message);
                });
            }
          });
      } catch (e: any) {
        console.warn("[Supabase Cloud] Relational sync skipped:", e?.message);
      }
    }

    await this.logActivity(
      "UPDATE",
      "SETTINGS",
      `อัปเดตการตั้งค่าสาขา: ${updated.branchName} (ไฟ ${updated.electricRate} บ., น้ำ ${updated.waterRate} บ.)`,
      propId
    );
    return updated;
  },

  // -------------------------------------------------------------
  // 12. DATA RESET & SEEDING UTILITIES
  // -------------------------------------------------------------
  isLocalMode(): boolean {
    return IS_LOCAL_MODE;
  },

  async createStandardRooms(): Promise<Room[]> {
    const standardRooms = [...initialRooms];
    setLocal(KEYS.ROOMS, standardRooms);
    await this.logActivity("CREATE", "ROOM", "สร้างผังห้องมาตรฐาน 24 ห้อง");
    return standardRooms;
  },

  async clearAllData(): Promise<boolean> {
    this.resetToCleanSlate();
    const allKeysToReset = [
      KEYS.ROOMS,
      KEYS.TENANTS,
      KEYS.INVOICES,
      KEYS.CONTRACTS,
      KEYS.REPAIRS,
      KEYS.EXPENSES,
      KEYS.DAILY_BOOKINGS,
      KEYS.METER_READINGS,
      KEYS.PAYMENTS,
      KEYS.RECEIPTS,
      KEYS.BROADCASTS,
      KEYS.ACTIVITY_LOGS,
    ];

    const batchPayload: Record<string, any> = {};
    allKeysToReset.forEach((k) => {
      const normKey = k.replace(/^pakdee_(dev|test)_/, "");
      memoryDb[k] = [];
      memoryDb[normKey] = [];
      batchPayload[k] = [];
      batchPayload[normKey] = [];
    });

    await this.persistBatch(batchPayload);

    // Also clear all rows in separate Supabase relational tables in safe FK order
    try {
      // Unlink room_id on invoices first so rooms can be deleted without FK conflict
      await supabase
        .from("invoices")
        .update({ room_id: null })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      const relationalTablesToClear = [
        "invoice_items",
        "meter_readings",
        "repairs",
        "expenses",
        "daily_bookings",
        "contracts",
        "rooms",
        "tenants",
        "activity_logs",
      ];
      for (const table of relationalTablesToClear) {
        await supabase
          .from(table)
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");
      }
    } catch (e: any) {
      console.warn("[Supabase Relational] Clear all tables warning:", e?.message);
    }

    return true;
  },

  resetToCleanSlate(): void {
    if (typeof window === "undefined") return;
    Object.values(KEYS).forEach((k) => {
      localStorage.removeItem(k);
      localStorage.removeItem(k.replace(/^pakdee_(dev|test)_/, ""));
    });
  },

  exportDatabaseToJson(): string {
    if (typeof window === "undefined") return "{}";
    const backup: Record<string, any> = {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      data: {},
    };
    Object.entries(KEYS).forEach(([name, key]) => {
      backup.data[name] = getLocal(key, null);
    });
    return JSON.stringify(backup, null, 2);
  },

  importDatabaseFromJson(jsonStr: string): boolean {
    if (typeof window === "undefined") return false;
    try {
      const parsed = JSON.parse(jsonStr);
      const data = parsed.data || parsed;
      Object.entries(KEYS).forEach(([name, key]) => {
        if (data[name] !== undefined && data[name] !== null) {
          setLocal(key, data[name]);
        }
      });
      return true;
    } catch (e) {
      console.error("Import failed:", e);
      return false;
    }
  },
};
