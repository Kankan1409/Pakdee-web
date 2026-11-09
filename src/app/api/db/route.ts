import { NextRequest, NextResponse } from "next/server";
import { syncKeyToRelationalTable, loadFromRelationalTables } from "@/lib/supabase-relational";

function normalizeKey(k: string): string {
  return k.replace(/^pakdee_(dev|test)_/, "");
}

// GET: Read current database state directly from Supabase Relational Tables (pakdee_store completely removed)
export async function GET() {
  try {
    const { hasRelationalData, data: relationalData } = await loadFromRelationalTables({});

    const db: Record<string, any> = {};
    if (hasRelationalData && relationalData) {
      for (const [key, value] of Object.entries(relationalData)) {
        if (value !== undefined) {
          const normKey = normalizeKey(key);
          db[`pakdee_dev_${normKey}`] = value;
          db[normKey] = value;
        }
      }
    }

    return NextResponse.json({
      success: true,
      dbPath: "Supabase Cloud Relational Tables",
      data: db,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to read from Supabase Relational Tables" },
      { status: 500 }
    );
  }
}

// POST: Save key/value or batch data directly to Supabase Relational Tables (pakdee_store completely removed)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body && typeof body === "object") {
      if (typeof body.key === "string" && body.value !== undefined) {
        const normKey = normalizeKey(body.key);
        await syncKeyToRelationalTable(normKey, body.value, body.data || {});
      } else if (body.data && typeof body.data === "object") {
        for (const [k, val] of Object.entries(body.data)) {
          const normKey = normalizeKey(k);
          await syncKeyToRelationalTable(normKey, val, body.data || {});
        }
      }
    }

    return NextResponse.json({
      success: true,
      dbPath: "Supabase Cloud Relational Tables",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to write to Supabase Relational Tables" },
      { status: 500 }
    );
  }
}
