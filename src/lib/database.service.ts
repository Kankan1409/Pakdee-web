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

// In-Memory Host Synchronized Cache
const memoryDb: Record<string, any> = {};
let isServerSynced = false;
let lastDbMtime = 0;

// Resolve DB file path when running in Node.js server context
function getDbFilePath(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = eval("require")("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = eval("require")("path");
    const candidates = [
      path.join(process.cwd(), "data", "db_port3000.json"),
      path.join(process.cwd(), "Pakdee", "data", "db_port3000.json"),
      "D:\\DESKTOP\\Pakdee\\data\\db_port3000.json",
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return candidates[0];
  } catch {
    return "";
  }
}

// Synchronize in-memory cache with host file DB when running on the server
function syncServerDbIfNeeded(): void {
  if (typeof window !== "undefined") return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = eval("require")("fs");
    const filePath = getDbFilePath();
    if (!filePath || !fs.existsSync(filePath)) return;
    const stats = fs.statSync(filePath);
    if (stats.mtimeMs > lastDbMtime) {
      lastDbMtime = stats.mtimeMs;
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw);
      Object.assign(memoryDb, parsed);
      isServerSynced = true;
    }
  } catch (e) {
    console.warn("[DatabaseService] syncServerDbIfNeeded warning:", e);
  }
}

// Write to host file DB when running on the server
function writeServerDb(key: string, value: any): void {
  if (typeof window !== "undefined") return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = eval("require")("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = eval("require")("path");
    const filePath = getDbFilePath() || path.join(process.cwd(), "data", "db_port3000.json");
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    let currentDb: Record<string, any> = {};
    if (fs.existsSync(filePath)) {
      try {
        currentDb = JSON.parse(fs.readFileSync(filePath, "utf8"));
      } catch {}
    }
    currentDb[key] = value;
    const normKey = key.replace(/^pakdee_(dev|test)_/, "");
    currentDb[normKey] = value;
    fs.writeFileSync(filePath, JSON.stringify(currentDb, null, 2), "utf8");
    try {
      lastDbMtime = fs.statSync(filePath).mtimeMs;
    } catch {}
  } catch (e) {
    console.warn("[DatabaseService] writeServerDb warning:", e);
  }
}

// Safe Local & Server-Synchronized Storage Helper
function getLocal<T>(key: string, fallback: T): T {
  // 1. Sync from server DB file if in Node.js runtime
  if (typeof window === "undefined") {
    syncServerDbIfNeeded();
  }

  // 2. In-memory cache synced from Host Server has highest priority
  if (memoryDb[key] !== undefined && memoryDb[key] !== null) {
    return memoryDb[key] as T;
  }
  const normKey = key.replace(/^pakdee_(dev|test)_/, "");
  if (memoryDb[normKey] !== undefined && memoryDb[normKey] !== null) {
    return memoryDb[normKey] as T;
  }

  // 3. Client-side LocalStorage fallback
  if (typeof window === "undefined") return fallback;
  try {
    let raw = localStorage.getItem(key) || localStorage.getItem(normKey);
    // Backward compatibility: If dev key not found yet, check legacy key
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

  // 2. Server-side Node.js File Database Sync
  if (typeof window === "undefined") {
    writeServerDb(key, value);
    return;
  }

  // 3. Save to client LocalStorage (cache mirror)
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to save to localStorage [${key}]:`, e);
  }

  // 4. Persist directly to Host Machine Database via /api/db
  fetch("/api/db", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
    keepalive: true,
  }).catch((err) => {
    console.warn(`[HostDB] Sync failed for [${key}]:`, err);
  });

  // 5. Live persist to Supabase Cloud pakdee_store
  try {
    supabase
      .from("pakdee_store")
      .upsert({
        key,
        value,
        updated_at: new Date().toISOString(),
      })
      .then(({ error }: any) => {
        if (error) console.warn(`[Supabase] Client upsert error [${key}]:`, error.message);
      });
  } catch (err) {
    console.warn(`[Supabase] Client upsert skipped [${key}]:`, err);
  }
}

// Realtime Channel Handle for Supabase Live Cloud Updates (Singleton Safe)
let realtimeChannel: any = null;

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
      .find((c: any) => c.topic === "realtime:pakdee_store_changes" || c.topic === "pakdee_store_changes");

    if (existing) {
      realtimeChannel = existing;
      (window as any).__PAKDEE_REALTIME_CHANNEL__ = existing;
      return;
    }

    // 3. Create fresh channel only if no active channel exists
    const channel = supabase
      .channel("pakdee_store_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pakdee_store",
        },
        (payload: any) => {
          if (payload?.new && payload.new.key) {
            const { key, value } = payload.new;
            memoryDb[key] = value;
            const normKey = key.replace(/^pakdee_(dev|test)_/, "");
            memoryDb[normKey] = value;
            try {
              localStorage.setItem(key, JSON.stringify(value));
            } catch {}
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("pakdee_db_updated", { detail: { key, value } })
              );
            }
          }
        }
      )
      .subscribe((status: string) => {
        console.log("[Supabase Realtime] pakdee_store subscription status:", status);
      });

    realtimeChannel = channel;
    (window as any).__PAKDEE_REALTIME_CHANNEL__ = channel;
  } catch (err: any) {
    console.warn("[Supabase Realtime] setup safely handled:", err?.message);
  }
}

export const DatabaseService = {
  /**
   * Initialize and synchronize with Supabase Cloud & Host Machine Database (/api/db)
   * Ensures devices connecting via Cloud or LAN always have the authoritative live data
   */
  async init(): Promise<boolean> {
    if (typeof window === "undefined") {
      syncServerDbIfNeeded();
      return true;
    }

    // 1. Activate live real-time subscription on Supabase Cloud
    setupRealtimeSync();

    // 2. PRIMARY: Query authoritative data DIRECTLY from Supabase Cloud (qygelgekosmklwrgnaxq)
    try {
      const { data: cloudStore, error } = await supabase
        .from("pakdee_store")
        .select("key, value");

      if (!error && cloudStore && cloudStore.length > 0) {
        cloudStore.forEach((row: any) => {
          memoryDb[row.key] = row.value;
          const normKey = row.key.replace(/^pakdee_(dev|test)_/, "");
          memoryDb[normKey] = row.value;
          try {
            localStorage.setItem(row.key, JSON.stringify(row.value));
          } catch {}
        });
        isServerSynced = true;
        console.log(`[Supabase Cloud Direct] Loaded ${cloudStore.length} keys directly from Supabase Cloud`);
        return true;
      } else if (error) {
        console.warn("[Supabase Cloud Direct] Supabase query warning:", error.message);
      }
    } catch (e: any) {
      console.warn("[Supabase Cloud Direct] Cloud fetch failed, falling back to local server:", e?.message);
    }

    // 3. Fallback to local server /api/db only when offline
    try {
      const res = await fetch("/api/db", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          Object.entries(json.data).forEach(([k, v]) => {
            memoryDb[k] = v;
            try {
              localStorage.setItem(k, JSON.stringify(v));
            } catch {}
          });
          isServerSynced = true;
          return true;
        }
      }
    } catch (err) {
      console.warn("[DatabaseService] Offline fallback to localStorage:", err);
    }
    return false;
  },

  isServerSynced(): boolean {
    return isServerSynced;
  },

  /**
   * Atomically persist multiple keys to memory, localStorage, and Host Machine Database (/api/db)
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
        } catch {}
      }
    });

    // 2. PRIMARY: Persist directly to Supabase Cloud pakdee_store (qygelgekosmklwrgnaxq)
    try {
      const rows = Object.entries(data).map(([k, v]) => ({
        key: k,
        value: v,
        updated_at: new Date().toISOString(),
      }));
      supabase
        .from("pakdee_store")
        .upsert(rows)
        .then(({ error }: any) => {
          if (error) console.warn("[Supabase Cloud Direct] Batch upsert warning:", error.message);
        });
    } catch (e: any) {
      console.warn("[Supabase Cloud Direct] Batch persist error:", e?.message);
    }

    // 3. Secondary: Background sync to local /api/db mirror
    if (typeof window !== "undefined") {
      try {
        fetch("/api/db", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
          keepalive: true,
        }).catch(() => {});
      } catch {}
    }

    return true;
    return true;
  },

  // -------------------------------------------------------------
  // HELPER: ACTIVE PROPERTY & BRANCH SETTINGS KEYS
  // -------------------------------------------------------------
  getActivePropertyId(): string {
    const id = getLocal<string | null>(KEYS.ACTIVE_PROPERTY_ID, null);
    if (id) return id;
    const props = getLocal<BranchItem[]>(KEYS.PROPERTIES, []);
    if (props.length > 0 && props[0].id) return props[0].id;
    return "prop-1";
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
      return [defaultBranch];
    }

    if (props.length === 0) {
      return [];
    }

    // Accurately compute totalRooms, vacantRooms, occupiedRooms and synchronize rates from each branch's settings
    const refreshed = props.map((p) => {
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
    const properties = await this.getAllProperties();
    let matched = false;
    const updated = properties.map((p) => {
      if (p.id === propertyId || properties.length === 1) {
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
    promptpayNumber: string;
    promptpayName: string;
    electricRate: number;
    waterRate: number;
    initialRoomCount: number;
    imageUrl?: string;
  }): Promise<BranchItem | null> {
    const newId = `prop-${Date.now()}`;
    const newBranch: BranchItem = {
      id: newId,
      name: branchData.name,
      address: branchData.address,
      phone: branchData.phone,
      promptpayNumber: branchData.promptpayNumber,
      promptpayName: branchData.promptpayName,
      electricRate: branchData.electricRate,
      waterRate: branchData.waterRate,
      plan: "pro",
      totalRooms: branchData.initialRoomCount,
      buildingName: "อาคาร 1",
      imageUrl: branchData.imageUrl || undefined,
    };

    const currentProps = await this.getAllProperties();
    const updatedProps = [...currentProps, newBranch];

    // Seed branch-specific settings for isolation
    const newSettings: BranchSettingsDetail = {
      ...initialBranchSettings,
      id: `settings-${newId}`,
      branchName: branchData.name,
      address: branchData.address,
      phone: branchData.phone,
      promptpayNumber: branchData.promptpayNumber,
      promptpayName: branchData.promptpayName,
      electricRate: Number(branchData.electricRate),
      waterRate: Number(branchData.waterRate),
      imageUrl: branchData.imageUrl || undefined,
    };

    // Seed initial isolated rooms for the new branch
    const existingRooms = this.getAllRawRooms();
    const newRooms: Room[] = [];
    const roomsPerFloor = Math.ceil(branchData.initialRoomCount / 3) || 1;
    for (let i = 1; i <= branchData.initialRoomCount; i++) {
      const floor = Math.floor((i - 1) / roomsPerFloor) + 1;
      const roomNum = `${floor}${String((i - 1) % roomsPerFloor + 1).padStart(2, "0")}`;
      newRooms.push({
        id: `room-${newId}-${roomNum}`,
        propertyId: newId,
        buildingId: `bldg-${newId}`,
        roomNumber: roomNum,
        floor,
        type: "Standard",
        monthlyRate: 4000,
        dailyRate: 650,
        status: "vacant",
        currentElectricMeter: 100,
        currentWaterMeter: 50,
      });
    }

    // Atomically persist all 4 items together to Host Database
    await this.persistBatch({
      [KEYS.PROPERTIES]: updatedProps,
      [KEYS.ACTIVE_PROPERTY_ID]: newId,
      [this.getBranchSettingsKey(newId)]: newSettings,
      [KEYS.ROOMS]: [...newRooms, ...existingRooms],
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
    const current = await this.getAllProperties();
    const filteredProps = current.filter((p) => p.id !== propertyId);
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

    // Remove branch-specific settings from local cache
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(this.getBranchSettingsKey(propertyId));
      } catch {}
    }

    await this.logActivity("DELETE", "SETTINGS", `ลบสาขาหอพัก ID: ${propertyId}`, propertyId);
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

    // Auto migrate any legacy rooms missing propertyId into prop-1
    let needsUpdate = false;
    const migrated = rooms.map((r) => {
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
    return rooms;
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
      id: existingIdx >= 0 ? allRooms[existingIdx].id : `room-${propId}-${roomData.roomNumber}-${Date.now()}`,
      propertyId: propId,
      buildingId: roomData.buildingId || (propId === "prop-1" ? "bldg-a" : `bldg-${propId}`),
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
        id: existingIdx >= 0 ? currentAll[existingIdx].id : `room-${propId}-${rData.roomNumber}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        propertyId: propId,
        buildingId: rData.buildingId || (propId === "prop-1" ? "bldg-a" : `bldg-${propId}`),
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

    // Guaranteed Host Machine Persistence: Explicitly await write to ensure file is written before any page transitions
    if (typeof window !== "undefined") {
      try {
        await fetch("/api/db", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: KEYS.ROOMS, value: updated }),
          keepalive: true,
        });
      } catch (e) {
        console.warn("[HostDB] Direct room status write error:", e);
      }
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

    // Safety Guard: Check if room has active tenant, contract, or unpaid invoices
    if (target.status === "occupied" || target.currentTenant) {
      return { success: false, error: `ไม่สามารถลบห้อง ${target.roomNumber} ได้เนื่องจากยังมีผู้เช่าพักอาศัยอยู่ กรุณาย้ายหรือเช็คเอาท์ผู้เช่าออกก่อน` };
    }

    const allInvoices = this.getAllRawInvoices();
    const unpaidInv = allInvoices.find(
      (inv) => inv.roomNumber === target.roomNumber && (inv.status === "unpaid" || inv.status === "overdue" || inv.status === "partial")
    );
    if (unpaidInv) {
      return { success: false, error: `ไม่สามารถลบห้อง ${target.roomNumber} ได้เนื่องจากยังมีบิลค้างชำระ (บิลเลขที่ ${unpaidInv.invoiceNumber})` };
    }

    const updated = allRooms.filter((r) => r.id !== roomId);
    setLocal(KEYS.ROOMS, updated);

    // Guaranteed Host Machine Persistence: Explicitly await write to ensure file is written before any page transitions
    if (typeof window !== "undefined") {
      try {
        await fetch("/api/db", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: KEYS.ROOMS, value: updated }),
          keepalive: true,
        });
      } catch (e) {
        console.warn("[HostDB] Direct room status write error:", e);
      }
    }
    await this.logActivity("DELETE", "ROOM", `ลบห้องพัก ${target?.roomNumber || roomId}`, target?.propertyId);
    return { success: true };
  },

  async deleteRooms(roomIds: string[]): Promise<{ success: boolean; error?: string }> {
    const allRooms = this.getAllRawRooms();
    // Safety check for all rooms
    for (const rid of roomIds) {
      const room = allRooms.find((r) => r.id === rid);
      if (room && (room.status === "occupied" || room.currentTenant)) {
        return { success: false, error: `ไม่สามารถลบห้อง ${room.roomNumber} ได้เนื่องจากมีผู้เช่าอยู่` };
      }
    }
    const updated = allRooms.filter((r) => !roomIds.includes(r.id));
    setLocal(KEYS.ROOMS, updated);

    // Guaranteed Host Machine Persistence: Explicitly await write to ensure file is written before any page transitions
    if (typeof window !== "undefined") {
      try {
        await fetch("/api/db", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: KEYS.ROOMS, value: updated }),
          keepalive: true,
        });
      } catch (e) {
        console.warn("[HostDB] Direct room status write error:", e);
      }
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

    // Guaranteed Host Machine Persistence: Explicitly await write to ensure file is written before any page transitions
    if (typeof window !== "undefined") {
      try {
        await fetch("/api/db", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: KEYS.ROOMS, value: updated }),
          keepalive: true,
        });
      } catch (e) {
        console.warn("[HostDB] Direct room status write error:", e);
      }
    }
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
      id: `mtr-${Date.now()}-${roomId}`,
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
    let tenants = getLocal<Tenant[]>(KEYS.TENANTS, []);
    if (tenants.length === 0) {
      tenants = [
        {
          id: "t-101",
          propertyId: "prop-1",
          fullName: "นายสมชาย สุขสบาย",
          phone: "089-999-8888",
          idCard: "1100200300400",
          gender: "MALE",
          age: 28,
          lineId: "somchai_suk",
          emergencyContact: "นางสมศรี สุขสบาย (081-111-2222)",
          vehiclePlate: "1กข 1234 กทม.",
          invoiceLang: "TH",
        },
      ];
      setLocal(KEYS.TENANTS, tenants);
    }

    if (propertyId) {
      return tenants.filter((t) => (t.propertyId || "prop-1") === propertyId);
    }
    return tenants;
  },

  async createTenant(tenantData: Omit<Tenant, "id"> & { propertyId?: string }): Promise<Tenant | null> {
    const propId = tenantData.propertyId || this.getActivePropertyId();
    const newTenant: Tenant = {
      id: `t-${Date.now()}`,
      propertyId: propId,
      ...tenantData,
    };
    const current = await this.getTenants();
    setLocal(KEYS.TENANTS, [newTenant, ...current]);
    await this.logActivity("CREATE", "TENANT", `ลงทะเบียนผู้เช่าใหม่: ${newTenant.fullName} (${newTenant.phone})`, propId);
    return newTenant;
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
      const parsed = parseInt(clean, 10);
      return isNaN(parsed) ? clean.toLowerCase() : String(parsed);
    };
    const reqNorm = norm(cleanRoom);

    let roomMatch = allRooms.find(
      (r) =>
        (r.propertyId || "prop-1") === (propId || "prop-1") &&
        (r.roomNumber.trim().toLowerCase() === cleanRoom.toLowerCase() || norm(r.roomNumber) === reqNorm)
    );
    if (!roomMatch) {
      roomMatch = allRooms.find(
        (r) => r.roomNumber.trim().toLowerCase() === cleanRoom.toLowerCase() || norm(r.roomNumber) === reqNorm
      );
    }

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

    // 3. ยึดข้อมูลผู้เช่าจากหน้าแผนผัง (currentTenant) เป็นหลัก
    // หากหน้าแผนผังมีชื่อผู้เช่า (เช่น ผู้เช่าใหม่) ให้ใช้ชื่อและข้อมูลผู้เช่าจากหน้าแผนผังเสมอ
    const activeName = roomMatch.currentTenant?.fullName || lineDisplayName || `ผู้เช่าห้อง ${cleanRoom}`;
    const activePhone = roomMatch.currentTenant?.phone || "-";
    const activeIdCard = roomMatch.currentTenant?.idCard || "-";
    const tenantId = roomMatch.currentTenant?.id || `t-${roomMatch.propertyId || "prop-1"}-${cleanRoom}`;

    // 4. แทนสิทธิ์ (Replace Rights): ปลดสิทธิ์ผู้เช่าคนเดิมที่มีชื่อไม่ตรงกันออกจากห้องนี้
    const updatedTenants = allTenants.map((t) => {
      if (
        (t.propertyId || "prop-1") === (roomMatch!.propertyId || "prop-1") &&
        (t.roomNumber || "").trim() === cleanRoom &&
        t.id !== tenantId &&
        t.fullName !== activeName
      ) {
        // คนเก่าถูกปลดสิทธิ์ออกจากห้องนี้
        return { ...t, roomNumber: undefined, roomId: undefined, lineUserId: undefined };
      }
      return t;
    });

    // 5. บันทึก / อัปเดตข้อมูลผู้เช่าคนปัจจุบันที่ผูกกับห้องนี้
    const currentTenantIdx = updatedTenants.findIndex(
      (t) =>
        (t.propertyId || "prop-1") === (roomMatch!.propertyId || "prop-1") &&
        (t.id === tenantId || (t.roomNumber || "").trim() === cleanRoom)
    );

    const targetTenant: Tenant = {
      ...(currentTenantIdx !== -1 ? updatedTenants[currentTenantIdx] : {}),
      id: tenantId,
      propertyId: roomMatch.propertyId || propId,
      roomId: roomMatch.id,
      roomNumber: cleanRoom,
      fullName: activeName,
      phone: activePhone,
      idCard: activeIdCard,
      lineUserId,
      lineDisplayName: lineDisplayName || activeName,
      lineLinkedAt: new Date().toISOString(),
    };

    if (currentTenantIdx !== -1) {
      updatedTenants[currentTenantIdx] = targetTenant;
    } else {
      updatedTenants.push(targetTenant);
    }
    setLocal(KEYS.TENANTS, updatedTenants);

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
    const updated = allRooms.map((r) =>
      r.id === roomId
        ? {
            ...r,
            status: "occupied" as RoomStatus,
            currentTenant: tenant,
            leaseEndDate: leaseEndDate || r.leaseEndDate || "2027-10-31",
          }
        : r
    );
    setLocal(KEYS.ROOMS, updated);

    // Guaranteed Host Machine Persistence: Explicitly await write to ensure file is written before any page transitions
    if (typeof window !== "undefined") {
      try {
        await fetch("/api/db", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: KEYS.ROOMS, value: updated }),
          keepalive: true,
        });
      } catch (e) {
        console.warn("[HostDB] Direct room status write error:", e);
      }
    }
    return true;
  },

  // -------------------------------------------------------------
  // 5. INVOICES & BILLING (BRANCH-ISOLATED)
  // -------------------------------------------------------------
  getAllRawInvoices(): Invoice[] {
    let invoices = getLocal<Invoice[]>(KEYS.INVOICES, []);
    if (invoices.length === 0) {
      invoices = [
        {
          id: "inv-202610-101",
          propertyId: "prop-1",
          invoiceNumber: "INV-202610-101",
          roomNumber: "101",
          tenantName: "นายสมชาย สุขสบาย",
          tenantPhone: "089-999-8888",
          billingDate: "2026-10-25",
          dueDate: "2026-11-05",
          totalAmount: 5064,
          status: "paid",
          paidAt: "2026-10-26 10:15 น.",
          items: [
            { name: "ค่าเช่าห้องพักประจำเดือน (ห้อง 101)", units: 1, rate: 4000, amount: 4000 },
            { name: "ค่าไฟฟ้า (เลข 1420 ถึง 1485)", units: 65, rate: 8, amount: 520, meterPrev: 1420, meterCurr: 1485 },
            { name: "ค่าน้ำประปา (เลข 320 ถึง 328)", units: 8, rate: 18, amount: 144, meterPrev: 320, meterCurr: 328 },
            { name: "ค่าบริการส่วนกลางและเก็บขยะ", amount: 400 },
          ],
        },
        {
          id: "inv-202610-105",
          propertyId: "prop-1",
          invoiceNumber: "INV-202610-105",
          roomNumber: "105",
          tenantName: "นายเอกชัย รุ่งโรจน์วิริยะ",
          tenantPhone: "087-777-6655",
          billingDate: "2026-10-25",
          dueDate: "2026-10-20",
          totalAmount: 4924,
          status: "unpaid",
          items: [
            { name: "ค่าเช่าห้องพักประจำเดือน (ห้อง 105)", units: 1, rate: 4000, amount: 4000 },
            { name: "ค่าไฟฟ้า (60 หน่วย)", units: 60, rate: 8, amount: 480 },
            { name: "ค่าน้ำประปา (8 หน่วย)", units: 8, rate: 18, amount: 144 },
            { name: "ค่าส่วนกลาง", amount: 300 },
          ],
        },
      ];
      setLocal(KEYS.INVOICES, invoices);
      return invoices;
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
      id: isOverwrite ? allInvoices[existingIdx].id : `inv-${propId}-${Date.now()}-${invoiceData.roomNumber}`,
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
        paymentMethod: "promptpay",
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
    const all = getLocal<ContractItem[]>(KEYS.CONTRACTS, initialContracts);
    return all.filter((c) => (c.propertyId || "prop-1") === targetPropId);
  },

  async addContract(
    item: Omit<ContractItem, "id" | "createdAt" | "contractNumber"> & { propertyId?: string }
  ): Promise<ContractItem> {
    const propId = item.propertyId || this.getActivePropertyId();
    const all = getLocal<ContractItem[]>(KEYS.CONTRACTS, initialContracts);
    const newContract: ContractItem = {
      ...item,
      id: "cnt-" + Date.now(),
      propertyId: propId,
      contractNumber: `CT-2026-${item.roomNumber}-${Math.floor(100 + Math.random() * 900)}`,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setLocal(KEYS.CONTRACTS, [newContract, ...all]);

    // Synchronize Room to occupied in database
    const allRooms = this.getAllRawRooms();
    const updatedRooms = allRooms.map((r) => {
      if ((r.propertyId || "prop-1") === propId && r.roomNumber === item.roomNumber) {
        return {
          ...r,
          status: "occupied" as RoomStatus,
          leaseEndDate: item.endDate,
          currentTenant: {
            id: `t-${Date.now()}`,
            propertyId: propId,
            fullName: item.tenantName,
            phone: item.tenantPhone,
            idCard: "-",
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
    if (typeof window !== "undefined") {
      try {
        await fetch("/api/db", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: KEYS.CONTRACTS, value: updated }),
        });
      } catch (err) {
        console.warn("[HostDB] Sync contract signature failed:", err);
      }
    }
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
          id: `b-auto-${r.roomNumber}-${Date.now()}`,
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

    // Persist immediately to host database
    if (typeof window !== "undefined") {
      try {
        await fetch("/api/db", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: {
              [KEYS.DAILY_BOOKINGS]: updatedBookings,
              [KEYS.ROOMS]: updatedRooms,
            },
          }),
        });
      } catch (err) {
        console.warn("[HostDB] Sync daily booking failed:", err);
      }
    }

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

    if (typeof window !== "undefined") {
      try {
        const payload: Record<string, any> = { [KEYS.DAILY_BOOKINGS]: updated };
        if (updatedRooms) payload[KEYS.ROOMS] = updatedRooms;
        await fetch("/api/db", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: payload }),
        });
      } catch (err) {
        console.warn("[HostDB] Sync update daily booking failed:", err);
      }
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
    const all = getLocal<RepairItem[]>(KEYS.REPAIRS, initialRepairs);
    return all.filter((r) => (r.propertyId || "prop-1") === targetPropId);
  },

  async addRepair(
    item: Omit<RepairItem, "id" | "reportedAt"> & { propertyId?: string }
  ): Promise<RepairItem> {
    const propId = item.propertyId || this.getActivePropertyId();
    const all = getLocal<RepairItem[]>(KEYS.REPAIRS, initialRepairs);
    const newRepair: RepairItem = {
      ...item,
      id: "rep-" + Date.now(),
      propertyId: propId,
      reportedAt: new Date().toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }) + " น.",
    };
    setLocal(KEYS.REPAIRS, [newRepair, ...all]);
    await this.logActivity("CREATE", "REPAIR", `แจ้งซ่อมห้อง ${item.roomNumber}: ${item.title}`, propId);
    return newRepair;
  },

  async updateRepairStatus(id: string, status: RepairItem["status"]): Promise<boolean> {
    const all = getLocal<RepairItem[]>(KEYS.REPAIRS, initialRepairs);
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
    const all = getLocal<ExpenseItem[]>(KEYS.EXPENSES, initialExpenses);
    return all.filter((e) => (e.propertyId || "prop-1") === targetPropId);
  },

  async addExpense(
    item: Omit<ExpenseItem, "id"> & { propertyId?: string }
  ): Promise<ExpenseItem> {
    const propId = item.propertyId || this.getActivePropertyId();
    const all = getLocal<ExpenseItem[]>(KEYS.EXPENSES, initialExpenses);
    const newExpense: ExpenseItem = {
      ...item,
      id: "exp-" + Date.now(),
      propertyId: propId,
    };
    setLocal(KEYS.EXPENSES, [newExpense, ...all]);
    await this.logActivity("CREATE", "SETTINGS", `บันทึกรายจ่าย: ${item.title} (฿${item.amount.toLocaleString()})`, propId);
    return newExpense;
  },

  async deleteExpense(id: string, propertyId?: string): Promise<boolean> {
    const propId = propertyId || this.getActivePropertyId();
    const all = getLocal<ExpenseItem[]>(KEYS.EXPENSES, initialExpenses);
    const target = all.find((e) => e.id === id);
    const updated = all.filter((e) => e.id !== id);
    setLocal(KEYS.EXPENSES, updated);
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
    const all = getLocal<BroadcastItem[]>(KEYS.BROADCASTS, initialBroadcasts);
    return all.filter((b) => (b.propertyId || "prop-1") === targetPropId);
  },

  async sendBroadcast(
    item: Omit<BroadcastItem, "id" | "sentAt" | "status"> & { propertyId?: string }
  ): Promise<BroadcastItem> {
    const propId = item.propertyId || this.getActivePropertyId();
    const all = getLocal<BroadcastItem[]>(KEYS.BROADCASTS, initialBroadcasts);
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
    const all = getLocal<ActivityLogItem[]>(KEYS.ACTIVITY_LOGS, initialActivityLogs);
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
      id: "log-" + Date.now(),
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

    // Force await sync to host database so file is written before any refresh
    if (typeof window !== "undefined") {
      try {
        await fetch("/api/db", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: branchSettingsKey, value: updated }),
        });
      } catch (err) {
        console.warn("[HostDB] Await sync branch settings failed:", err);
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
    allKeysToReset.forEach((k) => setLocal(k, []));

    const batchPayload: Record<string, any> = {};
    allKeysToReset.forEach((k) => {
      batchPayload[k] = [];
    });
    await this.persistBatch(batchPayload);
    return true;
  },

  resetToCleanSlate(): void {
    if (typeof window === "undefined") return;
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
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
