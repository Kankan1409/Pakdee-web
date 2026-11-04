import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { syncKeyToRelationalTable } from "@/lib/supabase-relational";

function normalizeKey(k: string): string {
  return k.replace(/^pakdee_(dev|test)_/, "");
}

// GET: Return entire database or single key directly from Supabase Cloud (pakdee_store)
// Local file data/db_port3000.json is completely disabled.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (key) {
      const { data, error } = await supabase
        .from("pakdee_store")
        .select("value")
        .eq("key", key)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message, source: "supabase" },
          { status: 500 }
        );
      }

      if (data && data.value !== undefined) {
        return NextResponse.json({
          success: true,
          key,
          value: data.value,
          source: "supabase",
        });
      }

      // Fallback check with normalized key in Supabase
      const norm = normalizeKey(key);
      if (norm !== key) {
        const { data: normData } = await supabase
          .from("pakdee_store")
          .select("value")
          .eq("key", norm)
          .maybeSingle();

        if (normData && normData.value !== undefined) {
          return NextResponse.json({
            success: true,
            key,
            value: normData.value,
            source: "supabase",
          });
        }
      }

      return NextResponse.json({
        success: true,
        key,
        value: null,
        source: "supabase",
      });
    }

    const { data, error } = await supabase
      .from("pakdee_store")
      .select("key, value");

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message, source: "supabase" },
        { status: 500 }
      );
    }

    const cloudDb: Record<string, any> = {};
    (data || []).forEach((row: any) => {
      cloudDb[row.key] = row.value;
    });

    return NextResponse.json({
      success: true,
      data: cloudDb,
      source: "supabase",
    });
  } catch (err: any) {
    console.error("[Supabase API] GET error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to read from Supabase" },
      { status: 500 }
    );
  }
}

// POST: Save key/value or batch update directly to Supabase Cloud (pakdee_store)
// Local file data/db_port3000.json is completely disabled.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const nowIso = new Date().toISOString();

    if (Array.isArray(body.deleteKeys) && body.deleteKeys.length > 0) {
      const keysToDelete = new Set<string>();
      body.deleteKeys.forEach((k: string) => {
        keysToDelete.add(k);
        keysToDelete.add(normalizeKey(k));
      });
      await supabase
        .from("pakdee_store")
        .delete()
        .in("key", Array.from(keysToDelete));
    }

    if (body.key && body.value !== undefined) {
      const normKey = normalizeKey(body.key);
      const rowsToUpsert: { key: string; value: any; updated_at: string }[] = [
        {
          key: body.key,
          value: body.value,
          updated_at: nowIso,
        },
      ];
      if (normKey !== body.key) {
        rowsToUpsert.push({
          key: normKey,
          value: body.value,
          updated_at: nowIso,
        });
      }

      const { error } = await supabase.from("pakdee_store").upsert(rowsToUpsert);

      // Also sync to the corresponding separate relational table in Supabase
      await syncKeyToRelationalTable(normKey, body.value, { [normKey]: body.value });

      if (error) {
        console.warn("[Supabase API] Upsert error:", error.message);
        return NextResponse.json(
          { success: false, error: error.message, source: "supabase" },
          { status: 500 }
        );
      }
    } else if (body.data && typeof body.data === "object") {
      const rowMap = new Map<string, { key: string; value: any; updated_at: string }>();
      const normDb: Record<string, any> = {};
      Object.entries(body.data).forEach(([k, v]) => {
        rowMap.set(k, { key: k, value: v, updated_at: nowIso });
        const normKey = normalizeKey(k);
        normDb[normKey] = v;
        if (normKey !== k) {
          rowMap.set(normKey, { key: normKey, value: v, updated_at: nowIso });
        }
      });

      for (const [normKey, val] of Object.entries(normDb)) {
        await syncKeyToRelationalTable(normKey, val, normDb);
      }

      const rows = Array.from(rowMap.values());
      if (rows.length > 0) {
        const { error } = await supabase.from("pakdee_store").upsert(rows);
        if (error) {
          console.warn("[Supabase API] Batch upsert error:", error.message);
          return NextResponse.json(
            { success: false, error: error.message, source: "supabase" },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      source: "supabase",
      message: "Saved to Supabase successfully",
    });
  } catch (err: any) {
    console.error("[Supabase API] POST error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to save to Supabase" },
      { status: 500 }
    );
  }
}
