import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { GenerateVariantsRequest } from "@/lib/types/ads-mode";
import { generateAdPrompt, getVariantTypes } from "@/lib/ads-mode/prompts";
import { generateOverlaySpec } from "@/lib/ads-mode/overlays";
import { buildGenerationPayload } from "@/lib/ads-mode/payload";
import { createMinimaxClient } from "@/lib/minimax";
import { getHookTypeForVariant } from "@/lib/ads-mode/hooks";

export async function POST(req: Request) {
    try {
        const apiKey = process.env.MINIMAX_API_KEY;
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!apiKey) {
            return NextResponse.json({ ok: false, error: "Missing MINIMAX_API_KEY" }, { status: 500 });
        }
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
        const body: GenerateVariantsRequest = await req.json();
        const { ad_pack_id, force = false } = body;

        if (!ad_pack_id) {
            return NextResponse.json({ ok: false, error: "ad_pack_id is required" }, { status: 400 });
        }

        // Create admin client
        const admin = createClient(url, serviceKey);

        // Load ad pack
        const { data: adPack, error: packError } = await admin
            .from("ad_packs")
            .select("*")
            .eq("id", ad_pack_id)
            .eq("user_id", user.id)
            .single();

        if (packError || !adPack) {
            return NextResponse.json({ ok: false, error: "Ad pack not found" }, { status: 404 });
        }

        // IDEMPOTENCE: Check if variants already exist
        const { data: existingVariants } = await admin
            .from("ad_variants")
            .select("*")
            .eq("ad_pack_id", ad_pack_id)
            .eq("is_final", false); // Only check FAST variants

        if (existingVariants && existingVariants.length > 0 && !force) {
            console.log(`[Ads Mode] Variants already exist for pack ${ad_pack_id}, returning existing`);
            return NextResponse.json({
                ok: true,
                data: {
                    variantIds: existingVariants.map(v => v.id),
                    count: existingVariants.length,
                    existing: true
                }
            });
        }

        // If force=true, delete existing variants
        if (force && existingVariants && existingVariants.length > 0) {
            console.log(`[Ads Mode] Force regeneration: deleting ${existingVariants.length} existing variants`);
            await admin
                .from("ad_variants")
                .delete()
                .eq("ad_pack_id", ad_pack_id)
                .eq("is_final", false);
        }

        // PRODUCT IMAGE RESOLUTION
        // Two modes:
        // 1. PROJECT-BASED: Use canonical_product_image_url from projects (preferred)
        // 2. ADS MODE: Use product_image_asset_id from ad_packs (fallback for Ads Mode)
        let imageUrl: string | undefined;

        if (adPack.project_id) {
            // MODE 1: PROJECT-BASED (canonical path)
            const { data: project, error: projectError } = await admin
                .from('projects')
                .select('id, product_name, canonical_product_image_url')
                .eq('id', adPack.project_id)
                .single();

            if (projectError) {
                console.error(`❌ Failed to fetch project ${adPack.project_id}:`, projectError);
                return NextResponse.json({
                    ok: false,
                    error: 'PROJECT_FETCH_FAILED',
                    message: `Failed to fetch project: ${projectError.message}`
                }, { status: 500 });
            }

            // HARD ABORT if canonical image missing
            if (!project.canonical_product_image_url) {
                console.error(`❌ HARD ABORT: Missing canonical product image for project ${adPack.project_id}`);

                return NextResponse.json({
                    ok: false,
                    error: 'CANONICAL_IMAGE_MISSING',
                    message: 'Product must have a canonical image at monetiq/inputs/{product_id}/source.png',
                    projectId: adPack.project_id
                }, { status: 400 });
            }

            // Validate canonical URL format
            const expectedPath = `monetiq/inputs/${adPack.project_id}/source.png`;
            if (!project.canonical_product_image_url.includes(expectedPath)) {
                console.error(`❌ HARD ABORT: Non-canonical product image URL for project ${adPack.project_id}`);
                console.error(`   Expected path: ${expectedPath}`);
                console.error(`   Actual URL: ${project.canonical_product_image_url}`);

                return NextResponse.json({
                    ok: false,
                    error: 'NON_CANONICAL_IMAGE_PATH',
                    message: 'Product image must use canonical path',
                    expectedPath,
                    actualUrl: project.canonical_product_image_url
                }, { status: 400 });
            }

            imageUrl = project.canonical_product_image_url;
            console.log(`✅ Using canonical product image: ${expectedPath}`);

        } else if (adPack.product_image_asset_id) {
            // MODE 2: ADS MODE (asset-based, temporary path)
            const { data: asset, error: assetError } = await admin
                .from('assets')
                .select('public_url')
                .eq('id', adPack.product_image_asset_id)
                .single();

            if (assetError || !asset?.public_url) {
                console.error(`❌ Failed to fetch asset ${adPack.product_image_asset_id}:`, assetError);
                return NextResponse.json({
                    ok: false,
                    error: 'ASSET_FETCH_FAILED',
                    message: 'Failed to fetch product image asset'
                }, { status: 400 });
            }

            imageUrl = asset.public_url;
            console.log(`✅ Using Ads Mode product image (asset-based): ${adPack.product_image_asset_id}`);

        } else {
            // No product image available - HARD ABORT
            console.error(`❌ HARD ABORT: No product image available for ad_pack ${ad_pack_id}`);
            return NextResponse.json({
                ok: false,
                error: 'PRODUCT_IMAGE_REQUIRED',
                message: 'Ad pack must have either project_id or product_image_asset_id'
            }, { status: 400 });
        }

        if (!imageUrl) {
            return NextResponse.json({ ok: false, error: "Product image required" }, { status: 400 });
        }

        // Determine variant types based on count
        const variantTypes = getVariantTypes(adPack.variant_count);

        // Create variant records and trigger generation
        const variantIds: string[] = [];

        for (let i = 0; i < variantTypes.length; i++) {
            const variantType = variantTypes[i];

            try {
                console.log(`[Ads Mode] Generating variant ${i + 1}/${variantTypes.length}: ${variantType}`);
                console.log(`[Ads Mode] Ad Pack data:`, {
                    productName: adPack.product_name,
                    category: adPack.category,
                    price: adPack.price,
                    template: adPack.template_type,
                    platform: adPack.platform
                });

                // Generate prompt for this variant
                const { prompt, hookText, ctaText } = generateAdPrompt({
                    productName: adPack.product_name,
                    category: adPack.category,
                    price: adPack.price,
                    template: adPack.template_type,
                    variant: variantType,
                    platform: adPack.platform,
                    hookSeed: i // Deterministic hook selection
                });

                // Generate overlay spec
                const overlaySpec = generateOverlaySpec({
                    hookText,
                    ctaText,
                    duration: 6,
                    theme: 'default',
                    aspectRatio: adPack.aspect_ratio
                });

                // Build typed generation payload
                // STRATEGY: Image-to-Video mode (Fast model + firstFrameImage + prompt)
                // - We USE firstFrameImage (product image) as the starting point
                // - The PROMPT transforms it into contextual scenes (hands, surfaces, movement)
                // - This is DIFFERENT from locking to white background - the prompt drives the transformation
                const generationPayload = buildGenerationPayload({
                    provider: 'minimax',
                    model: adPack.model_fast, // Fast model works with Image-to-Video
                    productName: adPack.product_name,
                    category: adPack.category,
                    price: adPack.price,
                    imageUrl,
                    duration: 6,
                    resolution: '1080P',
                    aspectRatio: adPack.aspect_ratio,
                    firstFrameImage: imageUrl,
                    basePrompt: 'E-commerce ad base prompt',
                    templatePrompt: `Template: ${adPack.template_type}`,
                    variantPrompt: `Variant: ${variantType}`,
                    platformPrompt: `Platform: ${adPack.platform}`,
                    categoryContext: `Category: ${adPack.category}`,
                    finalPrompt: prompt,
                    hookText,
                    ctaText,
                    theme: 'default',
                    templateType: adPack.template_type,
                    variantType,
                    platform: adPack.platform,
                    language: adPack.language
                });

                // Create variant record
                const { data: variant, error: variantError } = await admin
                    .from("ad_variants")
                    .insert({
                        ad_pack_id: adPack.id,
                        variant_type: variantType,
                        variant_index: i,
                        generation_mode: 'fast',
                        status: "queued",
                        hook_text: hookText,
                        cta_text: ctaText,
                        overlay_spec: overlaySpec,
                        prompt_payload: generationPayload,
                        prompt_text: prompt,
                        duration_sec: 6,
                        meta: {
                            source: "ads_mode",
                            template: adPack.template_type,
                            platform: adPack.platform,
                            hook_type: getHookTypeForVariant(variantType) // Internal traceability
                        }
                    })
                    .select()
                    .single();

                if (variantError) {
                    console.error(`[Ads Mode] Error creating variant ${variantType}:`, variantError);
                    continue;
                }

                variantIds.push(variant.id);

                // Trigger async generation
                generateVariantVideoAsync({
                    variantId: variant.id,
                    adPackId: adPack.id,
                    payload: generationPayload,
                    imageUrl,
                    apiKey,
                    admin
                }).catch((err) => {
                    console.error(`[Ads Mode] Async error for variant ${variant.id}:`, err);
                });

            } catch (variantGenError: any) {
                console.error(`[Ads Mode] Error generating variant ${variantType}:`, variantGenError);
                console.error(`[Ads Mode] Error stack:`, variantGenError.stack);
                // Continue to next variant instead of failing entire batch
                continue;
            }
        }
        await admin
            .from("ad_packs")
            .update({ status: "generating" })
            .eq("id", adPack.id);

        console.log(`[Ads Mode] Started generating ${variantIds.length} variants for pack ${adPack.id}`);

        return NextResponse.json({
            ok: true,
            data: {
                variantIds,
                count: variantIds.length,
                existing: false
            }
        });

    } catch (error: any) {
        console.error("[Ads Mode] Error in generate-variants:", error);
        return NextResponse.json({
            ok: false,
            error: error?.message || "Internal server error"
        }, { status: 500 });
    }
}

// Async generation function
async function generateVariantVideoAsync(params: {
    variantId: string;
    adPackId: string;
    payload: any;
    imageUrl: string;
    apiKey: string;
    admin: any;
}) {
    const { variantId, adPackId, payload, imageUrl, apiKey, admin } = params;

    try {
        // Update variant status to processing
        await admin
            .from("ad_variants")
            .update({ status: "processing" })
            .eq("id", variantId);

        console.log(`[Ads Mode] Starting generation for variant ${variantId}`);

        // Initialize MiniMax client
        const minimax = createMinimaxClient(apiKey);

        // Create video generation task (FAST mode with Image-to-Video)
        // STRATEGY: Use product image as starting point + strong prompt for scene transformation
        // The prompt will transform the static product into contextual scenes with hands, surfaces, movement
        const { task_id } = await minimax.createVideoTask({
            prompt: payload.final_prompt,
            model: payload.model,
            firstFrameImage: imageUrl, // Product image as reference for transformation
            duration: payload.video.duration,
            resolution: payload.video.resolution
        });

        // Store provider_job_id immediately
        await admin
            .from("ad_variants")
            .update({ provider_job_id: task_id })
            .eq("id", variantId);

        console.log(`[Ads Mode] MiniMax task created: ${task_id} for variant ${variantId}`);

        // Poll until complete
        const completedTask = await minimax.pollTaskUntilComplete(task_id, 5000, 900000);

        if (completedTask.status === "Failed") {
            throw new Error(`MiniMax task failed: ${completedTask.error || "Unknown error"}`);
        }

        if (!completedTask.file_id) {
            throw new Error("MiniMax: no file_id returned");
        }

        // Get download URL
        const downloadUrl = await minimax.getDownloadUrl(completedTask.file_id);
        const videoBuffer = await minimax.downloadVideo(downloadUrl);

        console.log(`[Ads Mode] Video downloaded (${videoBuffer.length} bytes) for variant ${variantId}`);

        // Upload to Supabase Storage
        const storagePath = `ads/${adPackId}/${variantId}.mp4`;

        const { error: upErr } = await admin.storage
            .from("assets")
            .upload(storagePath, videoBuffer, {
                contentType: "video/mp4",
                upsert: true
            });

        if (upErr) throw upErr;

        // Create asset record
        const { data: asset, error: assetErr } = await admin
            .from("assets")
            .insert({
                user_id: (await admin.from("ad_packs").select("user_id").eq("id", adPackId).single()).data.user_id,
                project_id: null,
                kind: "video",
                role: "ad_variant",
                status: "ready",
                storage_bucket: "assets",
                storage_path: storagePath,
                mime_type: "video/mp4",
                meta: {
                    source: "ads_mode",
                    ad_pack_id: adPackId,
                    ad_variant_id: variantId,
                    minimax_task_id: task_id,
                    minimax_file_id: completedTask.file_id
                }
            })
            .select()
            .single();

        if (assetErr) throw assetErr;

        // Generate signed URL for the video (valid for 1 year)
        const { data: signedUrlData } = await admin.storage
            .from("assets")
            .createSignedUrl(storagePath, 31536000); // 1 year in seconds

        const videoUrl = signedUrlData?.signedUrl || null;

        // Update variant with asset_id, video_url, and status
        const { error: updateError } = await admin
            .from("ad_variants")
            .update({
                asset_id: asset.id,
                video_url: videoUrl,
                status: "ready"
            })
            .eq("id", variantId);

        if (updateError) {
            console.error(`[Ads Mode] ERROR updating variant ${variantId}:`, updateError);
            throw updateError;
        }

        console.log(`[Ads Mode] Video URL saved: ${videoUrl ? 'YES' : 'NO'} for variant ${variantId}`);
        console.log(`[Ads Mode] Database UPDATE completed for variant ${variantId} - status set to "ready"`);

        // Check if all variants are ready
        const { data: allVariants } = await admin
            .from("ad_variants")
            .select("status")
            .eq("ad_pack_id", adPackId)
            .eq("is_final", false);

        const allReady = allVariants?.every((v: any) => v.status === "ready" || v.status === "failed");

        if (allReady) {
            await admin
                .from("ad_packs")
                .update({ status: "ready" })
                .eq("id", adPackId);
        }

        console.log(`[Ads Mode] Success for variant ${variantId}`);

    } catch (error: any) {
        console.error(`[Ads Mode] Failed for variant ${variantId}:`, error);

        await admin
            .from("ad_variants")
            .update({
                status: "failed",
                last_error: error?.message || "unknown_error"
            })
            .eq("id", variantId);
    }
}
