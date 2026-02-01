import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { generateImage } from "@/lib/gemini/client";
import {
    generateShotPrompt,
    generateFourShotPlan,
    validateFourShotPlan,
    FourShotPlan,
    ShotType
} from "@/lib/ads-mode/shot-prompts";
import { upsertShotAsset } from "@/lib/ads-mode/shot-asset-helper";

/**
 * Generate AAA Shots API
 * Generates 4 professional ad shots per variant using Gemini
 * WITH HARD SPATIAL ROLE ENFORCEMENT
 */
export async function POST(req: Request) {
    try {
        const supabase = await supabaseServer();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { ad_pack_id } = body;

        if (!ad_pack_id) {
            return NextResponse.json({ ok: false, error: "ad_pack_id required" }, { status: 400 });
        }

        const admin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

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

        // Load variants
        const { data: variants, error: variantsError } = await admin
            .from("ad_variants")
            .select("*")
            .eq("ad_pack_id", ad_pack_id)
            .eq("is_final", false);

        if (variantsError || !variants) {
            return NextResponse.json({ ok: false, error: "Variants not found" }, { status: 404 });
        }

        // PRODUCT IMAGE RESOLUTION
        // Two modes:
        // 1. PROJECT-BASED: Use canonical_product_image_url from projects (preferred)
        // 2. ADS MODE: Use product_image_asset_id from ad_packs (fallback for Ads Mode)
        let productImageUrl: string | undefined;

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

            productImageUrl = project.canonical_product_image_url;
            console.log(`✅ Using canonical product image: ${expectedPath}`);

        } else if (adPack.product_image_asset_ids || adPack.product_image_asset_id) {
            // MODE 2: ADS MODE (asset-based, temporary path)
            // Support both multiple images (new) and single image (legacy)

            const assetIds = adPack.product_image_asset_ids ||
                (adPack.product_image_asset_id ? [adPack.product_image_asset_id] : []);

            if (assetIds.length === 0) {
                console.warn(`⚠️ No product images available for ad_pack ${ad_pack_id}`);
            } else {
                // Fetch all asset URLs
                const { data: assets, error: assetError } = await admin
                    .from('assets')
                    .select('id, public_url')
                    .in('id', assetIds);

                if (assetError || !assets || assets.length === 0) {
                    console.error(`❌ Failed to fetch assets:`, assetError);
                    return NextResponse.json({
                        ok: false,
                        error: 'ASSET_FETCH_FAILED',
                        message: 'Failed to fetch product image assets'
                    }, { status: 400 });
                }

                // Collect ALL image URLs for multi-image generation
                const productImageUrls = assets.map(a => a.public_url);
                productImageUrl = productImageUrls[0]; // Primary for backward compatibility

                console.log(`✅ Using Ads Mode product images (asset-based): ${assets.length} image(s)`);
                console.log(`   Primary: ${assetIds[0]}`);
                console.log(`   All URLs:`, productImageUrls);
            }

        } else {
            // No product image available
            console.warn(`⚠️ No product image available for ad_pack ${ad_pack_id}`);
        }


        console.log(`[Generate Shots] Starting for ${variants.length} variants`);
        console.log(`[Generate Shots] Product Image URL:`, productImageUrl || 'MISSING');

        // Collect all product image URLs (for multi-image generation)
        let allProductImageUrls: string[] = [];
        if (adPack.product_image_asset_ids || adPack.product_image_asset_id) {
            const assetIds = adPack.product_image_asset_ids ||
                (adPack.product_image_asset_id ? [adPack.product_image_asset_id] : []);

            if (assetIds.length > 0) {
                const { data: assets } = await admin
                    .from('assets')
                    .select('public_url')
                    .in('id', assetIds);

                if (assets) {
                    allProductImageUrls = assets.map((a: any) => a.public_url);
                }
            }
        } else if (adPack.project_id) {
            // For project mode, use single canonical URL
            allProductImageUrls = productImageUrl ? [productImageUrl] : [];
        }

        console.log(`[Generate Shots] Using ${allProductImageUrls.length} reference image(s) for generation`);

        // Generate 4 shots for each variant (async)
        for (const variant of variants) {
            // Mark as generating
            await admin
                .from("ad_variants")
                .update({ status: "generating_shots" })
                .eq("id", variant.id);

            // Start async generation
            generateVariantShotsAsync({
                variantId: variant.id,
                productName: adPack.product_name,
                category: adPack.category,
                template: adPack.template_type,
                productImageUrl, // Legacy: single URL for backward compatibility
                productImageUrls: allProductImageUrls, // New: all URLs for multi-image generation
                userId: user.id,
                adPackId: ad_pack_id,
                admin
            });
        }

        return NextResponse.json({
            ok: true,
            message: `Generating 4 AAA shots for ${variants.length} variants`,
            variant_count: variants.length
        });

    } catch (error: any) {
        console.error("[Generate Shots] Error:", error);
        return NextResponse.json({
            ok: false,
            error: error?.message || "Internal server error"
        }, { status: 500 });
    }
}

/**
 * Async shot generation for a single variant
 * WITH PREPLANNING + HARD ENFORCEMENT + RETRY LOGIC
 */
async function generateVariantShotsAsync(params: {
    variantId: string;
    productName: string;
    category: string;
    template: string;
    productImageUrl?: string; // Legacy: single URL
    productImageUrls?: string[]; // New: multiple URLs
    userId: string; // For dual-write
    adPackId: string; // For dual-write
    admin: any;
}) {
    const { variantId, productName, category, template, productImageUrl, productImageUrls, userId, adPackId, admin } = params;
    const MAX_PLAN_RETRIES = 3;
    const MAX_SHOT_RETRIES = 2;

    try {
        console.log(`[Generate Shots] Starting for variant ${variantId}`);

        let planAttempt = 0;
        let shots: Record<string, any> = {};
        let plan: FourShotPlan | null = null;

        // Retry loop for plan generation
        while (planAttempt < MAX_PLAN_RETRIES) {
            planAttempt++;

            const seed = `${variantId}-attempt-${planAttempt}-${Date.now()}`;

            try {
                // STEP 1: Generate preplanned 4-shot plan
                plan = generateFourShotPlan(seed);

                // STEP 2: Validate plan (hard check)
                const validation = validateFourShotPlan(plan);
                if (!validation.valid) {
                    throw new Error(validation.error);
                }

                console.log(`[Generate Shots] Plan ${planAttempt}/${MAX_PLAN_RETRIES}:`,
                    plan.shots.map(s => `${s.shotType}:${s.spatialRole}`).join(', '));

                // STEP 3: Generate each shot according to plan
                shots = {};
                let allShotsSucceeded = true;

                for (let i = 0; i < plan.shots.length; i++) {
                    const shotPlan = plan.shots[i];
                    const shotType = shotPlan.shotType;
                    let shotAttempt = 0;
                    let shotGenerated = false;

                    while (shotAttempt < MAX_SHOT_RETRIES && !shotGenerated) {
                        shotAttempt++;

                        try {
                            const prompt = generateShotPrompt({
                                shotPlan,
                                productName,
                                category: category as any,
                                template: template as any
                            });

                            console.log(`[Generate Shots] ${shotType} (${i + 1}/4, attempt ${shotAttempt}/${MAX_SHOT_RETRIES})`);

                            // CONSTRAINT EXTRACTION SYSTEM
                            // DECISION (LOCKED): Gemini receives ONE canonical image only
                            // Additional images are used for constraint extraction ONLY
                            // 
                            // Reason: Gemini uses first image as dominant anchor.
                            // Additional images cause semantic drift (logos, orientation, mechanical details).
                            //
                            // Required for:
                            // - Image → video reproducibility
                            // - Ads Mode guarantees
                            // - Non-cosmetic diversity

                            const canonicalImageUrl = productImageUrls?.[0] || productImageUrl;
                            const additionalImageUrls = productImageUrls?.slice(1) || [];

                            console.log(`[Constraint System] Canonical: ${canonicalImageUrl ? 'SET' : 'MISSING'}`);
                            console.log(`[Constraint System] Additional images for extraction: ${additionalImageUrls.length}`);

                            // Extract constraints from additional images (WITHOUT passing them to Gemini)
                            const { extractConstraints, formatConstraintsForPrompt } = await import('@/lib/gemini/constraint-extractor');

                            const constraints = await extractConstraints({
                                canonicalImageUrl: canonicalImageUrl || '',
                                additionalImageUrls,
                                productCategory: category
                            });

                            const constraintPrompt = formatConstraintsForPrompt(constraints);

                            // Enhanced prompt with extracted constraints
                            const finalPrompt = `${constraintPrompt}

GENERATION TASK:
${prompt}

REMINDER: The reference image defines EXACT structure. Any deviation from hard constraints above is a FAILURE.`;

                            console.log(`[Constraint System] Constraints extracted and formatted`);

                            // CRITICAL: Pass ONLY canonical image to Gemini
                            const { imageUrl, metadata } = await generateImage({
                                prompt: finalPrompt,
                                referenceImageUrl: canonicalImageUrl, // ONE image only
                                quality: 'standard'
                            });

                            shots[shotType] = {
                                image_url: imageUrl,
                                prompt,
                                spatial_role: shotPlan.spatialRole,
                                context: shotPlan.context,
                                shot_index: i + 1,
                                generated_at: new Date().toISOString(),
                                ...metadata
                            };

                            // Dual-write: Create asset record for Asset Library
                            const assetId = await upsertShotAsset({
                                admin,
                                userId,
                                adPackId,
                                variantId,
                                shotType,
                                imageUrl,
                                prompt,
                                spatialRole: shotPlan.spatialRole,
                                metadata
                            });

                            // Add asset_id to shot metadata
                            if (assetId) {
                                shots[shotType].asset_id = assetId;
                            }

                            shotGenerated = true;
                            console.log(`[Generate Shots] ✓ ${shotType} complete`);

                        } catch (shotError: any) {
                            console.error(`[Generate Shots] ${shotType} failed (attempt ${shotAttempt}):`, shotError.message);

                            if (shotAttempt >= MAX_SHOT_RETRIES) {
                                shots[shotType] = {
                                    error: shotError.message,
                                    finishReason: shotError.finishReason,
                                    spatial_role: shotPlan.spatialRole,
                                    context: shotPlan.context,
                                    shot_index: i + 1,
                                    failed_at: new Date().toISOString()
                                };

                                allShotsSucceeded = false;

                                // CRITICAL: HOOK failure aborts sequence
                                if (shotType === 'hook') {
                                    console.error(`[Generate Shots] HOOK FAILED. Aborting sequence.`);
                                    throw new Error(`HOOK FAILURE: Cannot proceed without valid HOOK shot`);
                                }
                            }
                        }
                    }
                }

                if (allShotsSucceeded) {
                    console.log(`[Generate Shots] ✓ All 4 shots generated`);
                    break;
                }

                console.warn(`[Generate Shots] Some shots failed. Trying new plan...`);

            } catch (planError: any) {
                console.error(`[Generate Shots] Plan ${planAttempt} failed:`, planError.message);

                if (planAttempt >= MAX_PLAN_RETRIES) {
                    throw planError;
                }
            }
        }

        // Update variant
        const allShotsGenerated = plan?.shots.every((s, i) => shots[s.shotType]?.image_url);

        const { data: existingVariant } = await admin
            .from("ad_variants")
            .select("meta")
            .eq("id", variantId)
            .single();

        await admin
            .from("ad_variants")
            .update({
                status: allShotsGenerated ? "shots_ready" : "shots_partial",
                meta: {
                    ...(existingVariant?.meta || {}),
                    shots,
                    plan_seed: plan?.seed,
                    plan_attempts: planAttempt
                }
            })
            .eq("id", variantId);

        console.log(`[Generate Shots] ✓ Variant ${variantId}: ${allShotsGenerated ? "shots_ready" : "shots_partial"}`);

    } catch (error: any) {
        console.error(`[Generate Shots] Fatal error for variant ${variantId}:`, error);

        await admin
            .from("ad_variants")
            .update({
                status: "generation_failed",
                meta: {
                    error: error.message,
                    failed_at: new Date().toISOString()
                }
            })
            .eq("id", variantId);
    }
}
