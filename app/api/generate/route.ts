import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

type Body = {
  tool: string;
  preset: string;
  settings: Record<string, string | number>;
  prompt: string;
  input_url?: string; // For future video upload support
};

// ⚠️ DEV MODE: Bypass auth for local testing
// Set to false before deploying to production!
const DEV_MODE = process.env.NODE_ENV === "development";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<Body>;

  if (!body.tool || !body.preset || !body.prompt || !body.settings) {
    return NextResponse.json(
      { ok: false, error: "Missing fields: tool, preset, settings, prompt" },
      { status: 400 }
    );
  }

  let userId: string | null = null;

  if (DEV_MODE) {
    // ⚠️ DEV MODE: Use a test user_id or null
    // This allows testing without authentication
    console.log("[DEV MODE] Bypassing authentication");
    userId = null; // Will be NULL in dev, which is fine for testing
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

  // Use admin client to insert (bypasses RLS in dev mode)
  const supabase = DEV_MODE ? supabaseAdmin() : await supabaseServer();

  // Insert generation with user_id
  const { data, error } = await supabase
    .from("generations")
    .insert({
      user_id: userId, // Will be null in dev mode
      tool: body.tool,
      preset: body.preset,
      settings: body.settings,
      prompt: body.prompt,
      status: "queued",
      input_url: body.input_url ?? null, // Video upload support
    })
    .select("id, created_at, status")
    .single();

  console.log("[/api/generate] Job queued:", {
    mode: DEV_MODE ? "DEV" : "PROD",
    user_id: userId,
    tool: body.tool,
    preset: body.preset,
    generation_id: data?.id,
  });

  if (error) {
    console.error("[/api/generate] Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Edge Function will be triggered automatically by database webhook
  return NextResponse.json({ ok: true, generation: data }, { status: 200 });
}


