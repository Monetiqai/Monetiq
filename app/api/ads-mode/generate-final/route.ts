import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { GenerateFinalRequest } from "@/lib/types/ads-mode";
import { clonePayloadForFinal } from "@/lib/ads-mode/payload";
import { createMinimaxClient } from "@/lib/minimax";

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
        const body: GenerateFinalRequest = await req.json();
        const { ad_pack_id } = body;

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

        // Find winner variant (must be FAST, not FINAL)
        const { data: winner, error: winnerError } = await admin
            .from("ad_variants")
            .select("*")
            .eq("ad_pack_id", ad_pack_id)
            .eq("is_winner", true)
            .eq("is_final", false)
            .eq("generation_mode", "fast")
            .single();

        if (winnerError || !winner) {
            return NextResponse.json({
                ok: false,
                error: "No winner selected. Please mark a FAST variant as winner first."
            }, { status: 400 });
        }

        // Check if final already exists (DB enforces this, but check for better error message)
        const { data: existingFinal } = await admin
            .from("ad_variants")
            .select("id")
            .eq("ad_pack_id", ad_pack_id)
            .eq("is_final", true)
            .single();

        if (existingFinal) {
            return NextResponse.json({
                ok: false,
                error: "Final variant already exists for this pack. Only one final allowed per pack."
            }, { status: 400 });
        }

        // Validate winner has required data
        if (!winner.prompt_payload) {
            return NextResponse.json({
                ok: false,
                error: "Winner variant missing prompt_payload. Cannot generate final."
            }, { status: 400 });
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
            return NextResponse.json({ ok: false, error: "Product image not found" }, { status: 400 });
        }

        // Clone payload from winner (only change: model)
        const finalPayload = clonePayloadForFinal(winner.prompt_payload, adPack.model_final);

        // Create final variant record
        const { data: finalVariant, error: createError } = await admin
            .from("ad_variants")
            .insert({
                ad_pack_id: ad_pack_id,
                variant_type: winner.variant_type,
                variant_index: 99, // Special index for final
                generation_mode: 'final',
                source_variant_id: winner.id, // Link to FAST winner
                status: "queued",
                is_winner: false,
                is_final: true,
                hook_text: winner.hook_text,
                cta_text: winner.cta_text,
                overlay_spec: winner.overlay_spec,
                prompt_payload: finalPayload,
                prompt_text: winner.prompt_text,
                duration_sec: winner.duration_sec,
                meta: {
                    source: "ads_mode_final",
                    winner_variant_id: winner.id,
                    template: adPack.template_type,
                    platform: adPack.platform
                }
            })
            .select()
            .single();

        if (createError) {
            console.error("[Ads Mode] Error creating final variant:", createError);
            return NextResponse.json({
                ok: false,
                error: createError.message
            }, { status: 500 });
        }

        // Trigger async generation
        generateFinalVideoAsync({
            variantId: finalVariant.id,
            adPackId: ad_pack_id,
            payload: finalPayload,
            imageUrl,
            apiKey,
            admin
        }).catch((err) => {
            console.error(`[Ads Mode] Async error for final variant ${finalVariant.id}:`, err);
        });

        console.log(`[Ads Mode] Started generating final variant for pack ${ad_pack_id}`);

        return NextResponse.json({
            ok: true,
            data: {
                variantId: finalVariant.id,
                sourceVariantId: winner.id
            }
        });

    } catch (error: any) {
        console.error("[Ads Mode] Error in generate-final:", error);
        return NextResponse.json({
            ok: false,
            error: error?.message || "Internal server error"
        }, { status: 500 });
    }
}

// Async generation function for final variant
async function generateFinalVideoAsync(params: {
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

        console.log(`[Ads Mode] Starting FINAL generation for variant ${variantId}`);

        // Initialize MiniMax client
        const minimax = createMinimaxClient(apiKey);

        // Create video generation task (FINAL mode - high quality)
        // Uses same Image-to-Video strategy as FAST: product image + prompt transformation
        // This ensures the FINAL matches the winner's visual identity
        const { task_id } = await minimax.createVideoTask({
            prompt: payload.final_prompt,
            model: payload.model, // MiniMax-Hailuo-2.3-Fast (final quality)
            firstFrameImage: imageUrl, // Product image as reference (same as winner)
            duration: payload.video.duration,
            resolution: payload.video.resolution
        });

        // Store provider_job_id immediately
        await admin
            .from("ad_variants")
            .update({ provider_job_id: task_id })
            .eq("id", variantId);

        console.log(`[Ads Mode] MiniMax FINAL task created: ${task_id} for variant ${variantId}`);

        // Poll until complete (may take longer for final quality)
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

        console.log(`[Ads Mode] FINAL video downloaded (${videoBuffer.length} bytes) for variant ${variantId}`);

        // Upload to Supabase Storage
        const storagePath = `ads/${adPackId}/final_${variantId}.mp4`;

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
                role: "ad_variant_final",
                status: "ready",
                storage_bucket: "assets",
                storage_path: storagePath,
                mime_type: "video/mp4",
                meta: {
                    source: "ads_mode_final",
                    ad_pack_id: adPackId,
                    ad_variant_id: variantId,
                    minimax_task_id: task_id,
                    minimax_file_id: completedTask.file_id,
                    quality: "final"
                }
            })
            .select()
            .single();

        if (assetErr) throw assetErr;

        // Generate signed URL for the FINAL video (valid for 1 year)
        const { data: signedUrlData } = await admin.storage
            .from("assets")
            .createSignedUrl(storagePath, 31536000); // 1 year in seconds

        const videoUrl = signedUrlData?.signedUrl || null;

        // Update variant with asset_id, video_url, and status
        await admin
            .from("ad_variants")
            .update({
                asset_id: asset.id,
                video_url: videoUrl,
                status: "ready"
            })
            .eq("id", variantId);

        console.log(`[Ads Mode] FINAL variant ${variantId} completed successfully. Video URL: ${videoUrl ? 'SAVED' : 'MISSING'}`);

    } catch (error: any) {
        console.error(`[Ads Mode] Failed for FINAL variant ${variantId}:`, error);

        await admin
            .from("ad_variants")
            .update({
                status: "failed",
                last_error: error?.message || "unknown_error"
            })
            .eq("id", variantId);
    }
}
