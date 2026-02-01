// app/api/generate/recent/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

// ⚠️ DEV MODE: Bypass auth for local testing
const DEV_MODE = process.env.NODE_ENV === "development";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export async function GET() {
  let userId: string | null = null;

  if (DEV_MODE) {
    // ⚠️ DEV MODE: Show all generations (no filtering)
    console.log("[DEV MODE] Bypassing authentication for /recent");
  } else {
    // PRODUCTION: Require authentication
    const supabase = await supabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized - please sign in" },
        { status: 401 }
      );
    }
    userId = user.id;
  }

  // Use admin client in dev mode to bypass RLS
  const supabase = DEV_MODE ? supabaseAdmin() : await supabaseServer();

  // Build query
  let query = supabase
    .from("generations")
    .select("id, created_at, tool, preset, status, error, output_url")
    .order("created_at", { ascending: false })
    .limit(8);

  // In production, filter by user_id
  if (!DEV_MODE && userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[/api/generate/recent] Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, items: data ?? [] }, { status: 200 });
}


