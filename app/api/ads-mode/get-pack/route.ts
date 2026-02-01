import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
    try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!url || !serviceKey) {
            return NextResponse.json({ ok: false, error: "Missing Supabase config" }, { status: 500 });
        }

        // Get authenticated user
        const supabase = await supabaseServer();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        // Get pack ID from query params
        const { searchParams } = new URL(req.url);
        const packId = searchParams.get("id");

        if (!packId) {
            return NextResponse.json({ ok: false, error: "Pack ID is required" }, { status: 400 });
        }

        // Create admin client for polling provider status
        const admin = createClient(url, serviceKey);

        // Load ad pack
        const { data: pack, error: packError } = await admin
            .from("ad_packs")
            .select("*")
            .eq("id", packId)
            .eq("user_id", user.id)
            .single();

        if (packError || !pack) {
            return NextResponse.json({ ok: false, error: "Ad pack not found" }, { status: 404 });
        }

        // Load all variants for this pack
        const { data: variants, error: variantsError } = await admin
            .from("ad_variants")
            .select("*")
            .eq("ad_pack_id", packId)
            .order("variant_index", { ascending: true });

        if (variantsError) {
            console.error("[Ads Mode] Error loading variants:", variantsError);
            return NextResponse.json({ ok: false, error: variantsError.message }, { status: 500 });
        }

        // Check if all variants are done (shots_ready, shots_validated, ready, or failed)
        const allDone = variants?.every(v =>
            v.status === "shots_ready" ||
            v.status === "shots_validated" ||
            v.status === "ready" ||
            v.status === "failed"
        ) || false;

        // If all done and pack is still "generating", update to "ready"
        if (allDone && pack.status === "generating") {
            await admin
                .from("ad_packs")
                .update({ status: "ready" })
                .eq("id", packId);

            pack.status = "ready";
        }

        // Debug: Log variant statuses being returned
        console.log('[get-pack] Returning variants:', variants?.map(v => ({
            id: v.id.substring(0, 8),
            type: v.variant_type,
            status: v.status,
            hasVideoUrl: !!v.video_url
        })));

        return NextResponse.json({
            ok: true,
            pack,
            variants: variants || []
        });

    } catch (error: any) {
        console.error("[Ads Mode] Error in get-pack:", error);
        return NextResponse.json({
            ok: false,
            error: error?.message || "Internal server error"
        }, { status: 500 });
    }
}
