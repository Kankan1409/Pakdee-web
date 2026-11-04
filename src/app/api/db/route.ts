import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { supabase } from "@/lib/supabase";

// Dedicated Project Database Storage Path (Port 3000)
// Uses ./data/db_port3000.json directly within the workspace for maximum stability
function getDbPaths(): { dataDir: string; dbFile: string } {
  const localDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(localDir)) {
    try {
      fs.mkdirSync(localDir, { recursive: true });
    } catch {}
  }
  return { dataDir: localDir, dbFile: path.join(localDir, "db_port3000.json") };
}

function normalizeKey(k: string): string {
  return k.replace(/^pakdee_(dev|test)_/, "");
}

function getInitialSeedData(): Record<string, any> {
  const rooms: any[] = [];
  for (let floor = 1; floor <= 4; floor++) {
    for (let unit = 1; unit <= 6; unit++) {
      const roomNum = `${floor}0${unit}`;
      let status = "vacant";
      let currentTenant: any = undefined;

      if (roomNum === "101") {
        status = "occupied";
        currentTenant = {
          id: "t-101",
          propertyId: "prop-1",
          fullName: "นายสมชาย สุขสบาย",
          phone: "089-999-8888",
          idCard: "1100200300400",
        };
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

      rooms.push({
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

  const defaultProperty = {
    id: "prop-1",
    name: "พักดี แมนชั่น (สาขา 1)",
    address: "123/45 ซอยสุขุมวิท 71 แขวงพระโขนงเหนือ เขตวัฒนา กรุงเทพฯ 10110",
    phone: "081-234-5678",
    promptpayNumber: "0812345678",
    promptpayName: "หอพัก พักดี แมนชั่น",
    plan: "pro",
    electricRate: 8,
    waterRate: 18,
    totalRooms: 24,
    vacantRooms: rooms.filter((r) => r.status === "vacant").length,
    occupiedRooms: rooms.filter((r) => r.status === "occupied" || r.status === "overdue" || r.status === "daily").length,
    dailyRooms: rooms.filter((r) => r.status === "daily").length,
    buildingName: "อาคาร A",
  };

  const defaultBranchSettings = {
    id: "settings-prop-1",
    branchName: "พักดี แมนชั่น (สาขา 1)",
    address: "123/45 ซอยสุขุมวิท 71 แขวงพระโขนงเหนือ เขตวัฒนา กรุงเทพฯ 10110",
    phone: "081-234-5678",
    ownerName: "นายพักดี มีสุข",
    ownerPhone: "081-234-5678",
    taxId: "0105566012345",
    waterRate: 18,
    electricRate: 8,
    useMinWater: false,
    minWaterUnits: 3,
    minWaterFee: 100,
    useMinElectric: false,
    minElectricUnits: 3,
    minElectricFee: 100,
    commonFee: 100,
    internetFee: 200,
    parkingFee: 300,
    billCycleDay: 25,
    billDueDay: 5,
    lateFeePerDay: 50,
    bankName: "ธนาคารกสิกรไทย",
    bankAccountNumber: "012-3-45678-9",
    bankAccountName: "หอพัก พักดี แมนชั่น",
    promptpayNumber: "0812345678",
    promptpayName: "หอพัก พักดี แมนชั่น",
    lineChannelAccessToken: "dYQhNvEG431k5dx9BUFNtrnn/MIwwalfh+VAAa9SzsVK1cbJkJSV+vBVM/6VRk155u/0l12Ig3JzFNtVYcyMRSt5F3NieNTSl5vq5mrf3qDr2Y6l3LoGeZw6aSxbYb5zNIFQJkUbOT5iy+I9gPIDwwdB04t89/1O/w1cDnyilFU=",
    lineChannelSecret: "018e6d879bb2e1861502701ef2ebb858",
    lineWebhookUrl: "https://api.pakdee.app/webhook/line/branch-1",
    contractTerms: "ผู้เช่าต้องชำระค่าเช่าภายในวันที่ 5 ของทุกเดือน หากล่าช้ามีค่าปรับวันละ 50 บาท ห้ามเลี้ยงสัตว์ และห้ามส่งเสียงดังหลังเวลา 22:00 น.",
  };

  const tenants = [
    {
      id: "t-101",
      propertyId: "prop-1",
      fullName: "นายสมชาย สุขสบาย",
      phone: "089-999-8888",
      idCard: "1100200300400",
      emergencyContact: "081-111-2222",
      lineId: "somchai_s",
      vehiclePlate: "1กข 1234 กทม.",
      roomId: "room-101",
    },
    {
      id: "t-102",
      propertyId: "prop-1",
      fullName: "นางสาวมณีรัตน์ แสงทอง",
      phone: "082-345-6789",
      idCard: "1100200300401",
      emergencyContact: "082-222-3333",
      lineId: "maneerat_s",
      vehiclePlate: "2กค 5678 กทม.",
      roomId: "room-102",
    },
    {
      id: "t-105",
      propertyId: "prop-1",
      fullName: "นายเอกชัย รุ่งโรจน์วิริยะ",
      phone: "087-777-6655",
      idCard: "1100200300405",
      emergencyContact: "083-333-4444",
      lineId: "ekkachai_r",
      vehiclePlate: "3กด 9012 กทม.",
      roomId: "room-105",
    },
  ];

  const invoices = [
    {
      id: "inv-202610-101",
      propertyId: "prop-1",
      invoiceNumber: "INV-202610-101",
      roomNumber: "101",
      tenantName: "นายสมชาย สุขสบาย",
      tenantPhone: "089-999-8888",
      billingDate: "2026-10-25",
      dueDate: "2026-11-05",
      items: [
        { name: "ค่าเช่าห้องพักประจำเดือน (ห้องแอร์)", units: 1, rate: 4000, amount: 4000 },
        { name: "ค่าไฟฟ้า (เลข 1420 ถึง 1485)", units: 65, rate: 8, amount: 520, meterPrev: 1420, meterCurr: 1485 },
        { name: "ค่าน้ำประปา (เลข 320 ถึง 328)", units: 8, rate: 18, amount: 144, meterPrev: 320, meterCurr: 328 },
        { name: "ค่าบริการส่วนกลางและเก็บขยะ", units: 1, rate: 100, amount: 100 },
        { name: "ค่าที่จอดรถยนต์", units: 1, rate: 300, amount: 300 },
      ],
      totalAmount: 5064,
      status: "paid",
      paidAt: "2026-10-26 10:15 น.",
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
      items: [
        { name: "ค่าเช่าห้องพักประจำเดือน", units: 1, rate: 4200, amount: 4200 },
        { name: "ค่าไฟฟ้า (60 หน่วย)", units: 60, rate: 8, amount: 480 },
        { name: "ค่าน้ำประปา (8 หน่วย)", units: 8, rate: 18, amount: 144 },
        { name: "ค่าปรับชำระล่าช้า (5 วัน)", units: 1, rate: 100, amount: 100 },
      ],
      totalAmount: 4924,
      status: "unpaid",
    },
  ];

  return {
    pakdee_dev_properties: [defaultProperty],
    pakdee_dev_active_property_id: "prop-1",
    pakdee_dev_rooms: rooms,
    pakdee_dev_tenants: tenants,
    pakdee_dev_invoices: invoices,
    pakdee_dev_contracts: [],
    pakdee_dev_repairs: [],
    pakdee_dev_expenses: [],
    pakdee_dev_branch_settings: defaultBranchSettings,
    pakdee_dev_broadcasts: [],
    pakdee_dev_activity_logs: [],
    pakdee_dev_meter_readings: [],
    pakdee_dev_daily_bookings: [
      {
        id: "b-seed-201",
        propertyId: "prop-1",
        roomNumber: "201",
        guestName: "คุณกานดา รักษ์ดี",
        guestPhone: "089-123-4567",
        checkInDate: "2026-10-28",
        checkInTime: "14:00",
        checkOutDate: "2026-10-30",
        checkOutTime: "12:00",
        nights: 2,
        dailyRate: 650,
        totalRoomPrice: 1300,
        keyDeposit: 500,
        status: "checked_in",
      },
    ],
  };
}

function ensureDbFile(): Record<string, any> {
  const { dataDir, dbFile } = getDbPaths();
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {}
  }

  if (!fs.existsSync(dbFile)) {
    // Auto-restore from bundled project database backup if moving to a new computer
    const bundledBackup = path.join(process.cwd(), "data", "db_port3000.json");
    if (fs.existsSync(bundledBackup)) {
      try {
        const content = fs.readFileSync(bundledBackup, "utf8");
        fs.writeFileSync(dbFile, content, "utf8");
        return JSON.parse(content);
      } catch (e) {
        console.warn("[HostDB] Failed to restore from bundled backup:", e);
      }
    }

    const initialDb = getInitialSeedData();
    try {
      fs.writeFileSync(dbFile, JSON.stringify(initialDb, null, 2), "utf8");
    } catch {}
    return initialDb;
  }

  try {
    const content = fs.readFileSync(dbFile, "utf8");
    const data = JSON.parse(content);
    // Auto-migrate branch settings to include all 28 fields if missing
    let modified = false;
    const initialSeed = getInitialSeedData();
    Object.keys(data).forEach((key) => {
      if (key.includes("branch_settings") && data[key] && typeof data[key] === "object") {
        const current = data[key];
        const template = initialSeed.pakdee_dev_branch_settings;
        let changed = false;
        Object.keys(template).forEach((field) => {
          if (current[field] === undefined) {
            current[field] = template[field];
            changed = true;
          }
        });
        if (changed) {
          data[key] = current;
          modified = true;
        }
      }
    });
    if (modified) {
      saveDbFile(data);
    }
    return data;
  } catch (err) {
    console.error("[HostDB] Error reading DB file, reinitializing:", err);
    const initialDb = getInitialSeedData();
    try {
      fs.writeFileSync(dbFile, JSON.stringify(initialDb, null, 2), "utf8");
    } catch {}
    return initialDb;
  }
}

let writeLock = Promise.resolve();

function saveDbFile(data: Record<string, any>): void {
  const { dataDir, dbFile } = getDbPaths();
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {}
  }
  const payload = JSON.stringify(data, null, 2);
  let attempts = 0;
  while (attempts < 3) {
    try {
      fs.writeFileSync(dbFile, payload, "utf8");
      return;
    } catch (e) {
      attempts++;
      if (attempts >= 3) {
        console.error("[HostDB] Failed to save DB file after 3 attempts:", e);
      }
    }
  }
}

// GET: Return entire database or single key
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    // 1. Try reading from Supabase Cloud pakdee_store first
    try {
      if (supabase) {
        if (key) {
          const { data, error } = await supabase.from("pakdee_store").select("value").eq("key", key).single();
          if (!error && data && data.value !== undefined) {
            return NextResponse.json({ success: true, key, value: data.value, source: "supabase" });
          }
        } else {
          const { data, error } = await supabase.from("pakdee_store").select("key, value");
          if (!error && data && data.length > 0) {
            const cloudDb: Record<string, any> = {};
            data.forEach((row: any) => {
              cloudDb[row.key] = row.value;
            });
            return NextResponse.json({ success: true, data: cloudDb, source: "supabase" });
          }
        }
      }
    } catch {}

    // 2. Fallback to local DB file
    const db = ensureDbFile();
    if (key) {
      const norm = normalizeKey(key);
      const value = db[key] ?? db[norm] ?? null;
      return NextResponse.json({ success: true, key, value, source: "local" });
    }

    return NextResponse.json({ success: true, data: db, source: "local" });
  } catch (err: any) {
    console.error("[HostDB] GET error:", err);
    return NextResponse.json({ success: false, error: err?.message || "Failed to read database" }, { status: 500 });
  }
}

// POST: Save key/value or batch update directly to host machine & Supabase Cloud
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Local persistence with write lock
    let currentDb: Record<string, any> = {};
    await new Promise<void>((resolve, reject) => {
      writeLock = writeLock
        .catch(() => {})
        .then(() => {
          const db = ensureDbFile();

          if (body.key && body.value !== undefined) {
            db[body.key] = body.value;
            const norm = normalizeKey(body.key);
            db[norm] = body.value;
          } else if (body.data && typeof body.data === "object") {
            Object.entries(body.data).forEach(([k, v]) => {
              db[k] = v;
              db[normalizeKey(k)] = v;
            });
          }

          currentDb = db;
          saveDbFile(db);
          resolve();
        })
        .catch(reject);
    });

    // 2. Async persist to Supabase Cloud pakdee_store & relational tables
    try {
      if (supabase) {
        const now = new Date().toISOString();
        if (body.key && body.value !== undefined) {
          const norm = normalizeKey(body.key);
          const rows = [
            { key: body.key, value: body.value, updated_at: now },
            ...(norm !== body.key ? [{ key: norm, value: body.value, updated_at: now }] : []),
          ];
          supabase
            .from("pakdee_store")
            .upsert(rows, { onConflict: "key" })
            .then(({ error }: any) => {
              if (error) console.warn("[HostDB] Supabase upsert error:", error.message);
            });
          import("@/lib/supabase-relational")
            .then(({ syncKeyToRelationalTable }) => syncKeyToRelationalTable(norm, body.value, currentDb))
            .catch(() => {});
        } else if (body.data && typeof body.data === "object") {
          const rowMap = new Map<string, any>();
          Object.entries(body.data).forEach(([k, v]) => {
            const norm = normalizeKey(k);
            rowMap.set(k, { key: k, value: v, updated_at: now });
            rowMap.set(norm, { key: norm, value: v, updated_at: now });
          });
          supabase
            .from("pakdee_store")
            .upsert(Array.from(rowMap.values()), { onConflict: "key" })
            .then(({ error }: any) => {
              if (error) console.warn("[HostDB] Supabase batch upsert error:", error.message);
            });
        }
      }
    } catch (e: any) {
      console.warn("[HostDB] Supabase Cloud persist skipped:", e?.message);
    }

    return NextResponse.json({ success: true, message: "Saved to database successfully" });
  } catch (err: any) {
    console.error("[HostDB] POST error:", err);
    return NextResponse.json({ success: false, error: err?.message || "Failed to save to database" }, { status: 500 });
  }
}
