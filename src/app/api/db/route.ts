import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

function normalizeKey(k: string): string {
  return k.replace(/^pakdee_(dev|test)_/, "");
}

/**
 * PAKDEE PURE SUPABASE CLOUD API (/api/db)
 * All operations read and write directly to Supabase Cloud PostgreSQL (pakdee_store)
 * Zero local file dependency
 */

// GET: Return entire database or single key directly from Supabase Cloud
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (key) {
      const { data, error } = await supabase
        .from("pakdee_store")
        .select("key, value")
        .eq("key", key)
        .maybeSingle();

      if (!error && data && data.value !== undefined) {
        return NextResponse.json({ success: true, key, value: data.value, source: "supabase" });
      }

      // Try normalized key
      const norm = normalizeKey(key);
      const { data: normData, error: normErr } = await supabase
        .from("pakdee_store")
        .select("key, value")
        .eq("key", norm)
        .maybeSingle();

      if (!normErr && normData && normData.value !== undefined) {
        return NextResponse.json({ success: true, key, value: normData.value, source: "supabase" });
      }

      return NextResponse.json({ success: true, key, value: null, source: "supabase" });
    }

    // Return all keys
    const { data, error } = await supabase
      .from("pakdee_store")
      .select("key, value");

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const cloudDb: Record<string, any> = {};
    if (data) {
      data.forEach((row: any) => {
        cloudDb[row.key] = row.value;
      });
    }

    return NextResponse.json({ success: true, data: cloudDb, source: "supabase" });
  } catch (err: any) {
    console.error("[PureSupabase API] GET error:", err);
    return NextResponse.json({ success: false, error: err?.message || "Failed to read database" }, { status: 500 });
  }
}

// POST: Save key/value or batch update directly to Supabase Cloud pakdee_store
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.key && body.value !== undefined) {
      const { error } = await supabase
        .from("pakdee_store")
        .upsert({
          key: body.key,
          value: body.value,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
    } else if (body.data && typeof body.data === "object") {
      const rows = Object.entries(body.data).map(([k, v]) => ({
        key: k,
        value: v,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("pakdee_store")
        .upsert(rows);

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message: "Saved to Supabase Cloud successfully" });
  } catch (err: any) {
    console.error("[PureSupabase API] POST error:", err);
    return NextResponse.json({ success: false, error: err?.message || "Failed to save to database" }, { status: 500 });
  }
}
