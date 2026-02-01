import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Validate Shots API
 * Marks variant shots as validated by user (code-level enforcement)
 */
export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { variant_id } = body;

    if (!variant_id) {
      return NextResponse.json({ ok: false, error: "variant_id required" }, { status: 400 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Load variant
    const { data: variant, error: variantError } = await admin
      .from("ad_variants")
      .select("*, ad_packs!inner(user_id)")
      .eq("id", variant_id)
      .single();

    if (variantError || !variant) {
      return NextResponse.json({ ok: false, error: "Variant not found" }, { status: 404 });
    }

    // Verify ownership
    if (variant.ad_packs.user_id !== user.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
    }

    // CODE-LEVEL ENFORCEMENT: Check all 4 shots exist
    const shots = variant.meta?.shots;

    if (!shots) {
      return NextResponse.json({
        ok: false,
        error: "No shots generated yet. Generate shots first."
      }, { status: 400 });
    }

    const requiredShots = ['hook', 'proof', 'variation', 'winner'];
    const missingShots = requiredShots.filter(type => !shots[type]?.image_url);

    if (missingShots.length > 0) {
      return NextResponse.json({
        ok: false,
        error: `Missing shots: ${missingShots.join(', ')}. All 4 shots must be generated before validation.`
      }, { status: 400 });
    }

    console.log(`[Validate Shots] Validating shots for variant ${variant_id}`);

    // Mark as validated
    await admin
      .from("ad_variants")
      .update({
        status: "shots_validated",
        meta: {
          ...variant.meta,
          shots_validated: true,
          validated_at: new Date().toISOString()
        }
      })
      .eq("id", variant_id);

    console.log(`[Validate Shots] ✓ Shots validated for variant ${variant_id}`);

    return NextResponse.json({
      ok: true,
      message: "Shots validated successfully. Ready for export."
    });

  } catch (error: any) {
    console.error("[Validate Shots] Error:", error);
    return NextResponse.json({
      ok: false,
      error: error?.message || "Internal server error"
    }, { status: 500 });
  }
}
