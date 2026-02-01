import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { CreateAdPackRequest } from "@/lib/types/ads-mode";
import { generatePackName, getVariantTypes } from "@/lib/ads-mode/prompts";

export async function POST(req: Request) {
    try {
        // Get authenticated user
        const supabase = await supabaseServer();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Parse request body
        const body: CreateAdPackRequest = await req.json();
        const {
            product_name,
            product_image_asset_id,
            product_image_asset_ids,
            category,
            price,
            template_type,
            platform,
            variant_count
        } = body;

        // Validate required fields
        if (!product_name || !category || !template_type || !platform || !variant_count) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Validate variant_count
        if (![2, 3, 4].includes(variant_count)) {
            return NextResponse.json(
                { error: "variant_count must be 2, 3, or 4" },
                { status: 400 }
            );
        }

        // Handle multiple images with backward compatibility
        let imageIds: string[] = [];
        if (product_image_asset_ids && product_image_asset_ids.length > 0) {
            // New format: multiple images
            imageIds = product_image_asset_ids;

            // Validate: max 10 images
            if (imageIds.length > 10) {
                return NextResponse.json(
                    { error: "Maximum 10 product images allowed" },
                    { status: 400 }
                );
            }
        } else if (product_image_asset_id) {
            // Legacy format: single image
            imageIds = [product_image_asset_id];
        }

        // Generate pack name
        const pack_name = generatePackName({
            productName: product_name,
            template: template_type,
            platform
        });

        // Create ad pack
        const { data: adPack, error: createError } = await supabase
            .from("ad_packs")
            .insert({
                user_id: user.id,
                product_name,
                product_image_asset_id: imageIds[0] || null, // Primary image (backward compatible)
                product_image_asset_ids: imageIds.length > 0 ? imageIds : null, // New: multiple images
                category,
                price,
                template_type,
                platform,
                variant_count,
                pack_name,
                status: "draft",
                meta: {}
            })
            .select()
            .single();

        if (createError) {
            console.error("[Ads Mode] Error creating ad pack:", createError);
            return NextResponse.json(
                { error: createError.message },
                { status: 500 }
            );
        }

        console.log(`[Ads Mode] Created ad pack: ${adPack.id} - ${pack_name}`);

        // Create variants for the ad pack
        const variantTypes = getVariantTypes(variant_count);
        const variantsToCreate = variantTypes.map((variantType, index) => ({
            ad_pack_id: adPack.id,
            variant_type: variantType,
            variant_index: index + 1, // 1-indexed
            is_final: false,
            status: "queued",
            meta: {}
        }));

        const { data: variants, error: variantsError } = await supabase
            .from("ad_variants")
            .insert(variantsToCreate)
            .select();

        if (variantsError) {
            console.error("[Ads Mode] Error creating variants:", variantsError);
            // Rollback: delete the ad pack
            await supabase.from("ad_packs").delete().eq("id", adPack.id);
            return NextResponse.json(
                { error: "Failed to create variants" },
                { status: 500 }
            );
        }

        console.log(`[Ads Mode] Created ${variants.length} variants for pack ${adPack.id}`);

        return NextResponse.json({
            success: true,
            adPack,
            variants
        });

    } catch (error: any) {
        console.error("[Ads Mode] Error in create-pack:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
