import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 401 });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const createNew = Boolean(body?.createNew);
    const name = (body?.productName as string | undefined)?.trim() || "Nouveau produit";

    // If createNew, always create a fresh project
    if (createNew) {
      const { data: created, error: insErr } = await supabase
        .from("projects")
        .insert({ user_id: user.id, product_name: name, status: "new" })
        .select("id")
        .single();

      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });
      return NextResponse.json({ ok: true, projectId: created.id });
    }

    // Otherwise, try to reuse latest project
    const { data: latest, error: selErr } = await supabase
      .from("projects")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!selErr && latest?.id) {
      return NextResponse.json({ ok: true, projectId: latest.id });
    }

    // If none exists, create one
    const { data: created, error: insErr } = await supabase
      .from("projects")
      .insert({ user_id: user.id, product_name: name, status: "new" })
      .select("id")
      .single();

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });
    return NextResponse.json({ ok: true, projectId: created.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
