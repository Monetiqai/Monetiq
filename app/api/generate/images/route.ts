import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

const ROLES = ["hero", "lifestyle", "detail", "benefit", "variant", "social"] as const;

export async function POST(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url) {
      return NextResponse.json({ error: "Missing NEXT_PUBLIC_SUPABASE_URL" }, { status: 500 });
    }
    if (!serviceKey) {
      return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
    }

    // user session (safe, uses cookies)
    const supa = await supabaseServer();
    const {
      data: { user },
      error: userErr,
    } = await supa.auth.getUser();

    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 401 });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const projectId = body?.projectId as string | undefined;

    if (!projectId) {
      return NextResponse.json({ error: "projectId missing" }, { status: 400 });
    }

    // admin client (service role) — created INSIDE handler
    const admin = createClient(url, serviceKey);

    const rows = ROLES.map((role) => ({
      user_id: user.id,
      project_id: projectId,
      kind: "image",
      role,
      status: "pending",
      storage_bucket: "assets",
      storage_path: null,
      mime_type: null,
      meta: { kept: false, source: "auto_pack_v1" },
    }));

    const { data: inserted, error: insErr } = await admin
      .from("assets")
      .insert(rows)
      .select("id");

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 400 });
    }

    const { error: pErr } = await admin.from("projects").update({ status: "images" }).eq("id", projectId);
    if (pErr) {
      return NextResponse.json({ error: pErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, assetIds: inserted?.map((x) => x.id) ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
