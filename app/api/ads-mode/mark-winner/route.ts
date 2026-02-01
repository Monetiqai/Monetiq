import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { MarkWinnerRequest } from "@/lib/types/ads-mode";

export async function POST(req: Request) {
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

        // Parse request body
        const body: MarkWinnerRequest = await req.json();
        const { variant_id } = body;

        if (!variant_id) {
            return NextResponse.json({ ok: false, error: "variant_id is required" }, { status: 400 });
        }

        // Create admin client
        const admin = createClient(url, serviceKey);

        // Load variant with pack info
        const { data: variant, error: variantError } = await admin
            .from("ad_variants")
            .select("*, ad_packs!inner(user_id, id)")
            .eq("id", variant_id)
            .single();

        if (variantError || !variant) {
            return NextResponse.json({ ok: false, error: "Variant not found" }, { status: 404 });
        }

        // Verify ownership
        if (variant.ad_packs.user_id !== user.id) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
        }

        // Cannot mark final variants as winners
        if (variant.is_final) {
            return NextResponse.json({
                ok: false,
                error: "Cannot mark final variant as winner. Only FAST variants can be winners."
            }, { status: 400 });
        }

        // Cannot mark failed variants as winners
        if (variant.status === 'failed') {
            return NextResponse.json({
                ok: false,
                error: "Cannot mark failed variant as winner"
            }, { status: 400 });
        }

        const adPackId = variant.ad_pack_id;

        // Unmark all other variants in the same pack
        // DB unique partial index ensures only 1 winner, but we do this for safety
        await admin
            .from("ad_variants")
            .update({ is_winner: false })
            .eq("ad_pack_id", adPackId);

        // Mark this variant as winner
        await admin
            .from("ad_variants")
            .update({ is_winner: true })
            .eq("id", variant_id);

        console.log(`[Ads Mode] Marked variant ${variant_id} as winner for pack ${adPackId}`);

        // Fetch updated pack + all variants for UI refresh
        const { data: updatedPack } = await admin
            .from("ad_packs")
            .select("*")
            .eq("id", adPackId)
            .single();

        const { data: updatedVariants } = await admin
            .from("ad_variants")
            .select("*")
            .eq("ad_pack_id", adPackId)
            .order("variant_index", { ascending: true });

        return NextResponse.json({
            ok: true,
            data: {
                variant_id,
                pack: updatedPack,
                variants: updatedVariants
            }
        });

    } catch (error: any) {
        console.error("[Ads Mode] Error in mark-winner:", error);
        return NextResponse.json({
            ok: false,
            error: error?.message || "Internal server error"
        }, { status: 500 });
    }
}
