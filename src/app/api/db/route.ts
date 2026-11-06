import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { syncKeyToRelationalTable } from "@/lib/supabase-relational";

function normalizeKey(k: string): string {
  return k.replace(/^pakdee_(dev|test)_/, "");
}

// GET: Read current database state directly from Supabase Cloud (no local db_port3000.json file)
export async function GET() {
  try {
    const { data: rows, error } = await supabase
      .from("pakdee_store")
      .select("key, value");

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        data: {},
      });
    }

    const db: Record<string, any> = {};
    if (rows && rows.length > 0) {
      for (const row of rows) {
        if (row.key && row.value !== undefined) {
          const normKey = normalizeKey(row.key);
          db[`pakdee_dev_${normKey}`] = row.value;
          db[normKey] = row.value;
        }
      }
    }

    return NextResponse.json({
      success: true,
      dbPath: "Supabase Cloud Only (db_port3000.json disabled)",
      data: db,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to read from Supabase" },
      { status: 500 }
    );
  }
}

// POST: Save key/value or batch data directly to Supabase Cloud (no local db_port3000.json file)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body && typeof body === "object") {
      const nowIso = new Date().toISOString();
      const rowsToUpsert: { key: string; value: any; updated_at: string }[] = [];

      if (typeof body.key === "string" && body.value !== undefined) {
        const normKey = normalizeKey(body.key);
        const canonicalKey = `pakdee_dev_${normKey}`;
        rowsToUpsert.push({ key: canonicalKey, value: body.value, updated_at: nowIso });
        if (normKey !== canonicalKey) {
          rowsToUpsert.push({ key: normKey, value: body.value, updated_at: nowIso });
        }
        syncKeyToRelationalTable(normKey, body.value, body.data || {}).catch(() => {});
      } else if (body.data && typeof body.data === "object") {
        Object.entries(body.data).forEach(([k, val]) => {
          const normKey = normalizeKey(k);
          const canonicalKey = `pakdee_dev_${normKey}`;
          rowsToUpsert.push({ key: canonicalKey, value: val, updated_at: nowIso });
          if (normKey !== canonicalKey) {
            rowsToUpsert.push({ key: normKey, value: val, updated_at: nowIso });
          }
          syncKeyToRelationalTable(normKey, val, body.data || {}).catch(() => {});
        });
      }

      if (rowsToUpsert.length > 0) {
        await supabase
          .from("pakdee_store")
          .upsert(rowsToUpsert, { onConflict: "key" });
      }
    }

    return NextResponse.json({
      success: true,
      dbPath: "Supabase Cloud Only (db_port3000.json disabled)",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to write to Supabase" },
      { status: 500 }
    );
  }
}
