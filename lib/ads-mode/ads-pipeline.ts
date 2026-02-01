/**
 * PHASE 11 — ADS PIPELINE ORCHESTRATOR (WITH DB PERSISTENCE)
 * 
 * Orchestrates 4-shot ad sequence generation
 * Uses validated planning from Phase 9 + real image generation from image-generation.ts
 * 
 * PHASE 11 ADDITIONS:
 * - BLOCKING DB persistence (throws on error)
 * - Create record at start (status='generating')
 * - Update shot URLs after each shot
 * - Finalize status at end (success/failed)
 * 
 * CRITICAL RULES:
 * - NO modification to planning logic (Phase 9 validated)
 * - Retry logic MUST NOT drop constraints
 * - HOOK failure → abort or replan immediately
 * - NO silent fallback prompts
 * - DB errors BLOCK execution (no silent continuation)
 */

import { generateFourShotPlan, validateFourShotPlan, generateShotPrompt, ShotPlan, FourShotPlan } from './shot-prompts';
import { generateAndUploadShot, logGenerationAttempt } from './image-generation';
import { ProductCategory, AdTemplate } from '@/lib/types/ads-mode';
import { createAdsGeneration, updateShotUrl, finalizeGeneration } from './db-helpers';

// Retry configuration
const MAX_SHOT_RETRIES = 3; // Retry individual shot up to 3 times
const MAX_PLAN_RETRIES = 2; // Retry with new plan up to 2 times

// Simple types for Phase 10
type SimpleCategory = 'hoodies' | 'bags' | 'tshirts' | 'accessories';
type SimpleTemplate = 'luxury' | 'streetwear' | 'minimalist' | 'bold';

// Map simple categories to ProductCategory
const CATEGORY_MAP: Record<SimpleCategory, ProductCategory> = {
    'hoodies': 'fashion',
    'bags': 'fashion',
    'tshirts': 'fashion',
    'accessories': 'jewelry'
};

// Map simple templates to AdTemplate
const TEMPLATE_MAP: Record<SimpleTemplate, AdTemplate> = {
    'luxury': 'scroll_stop',
    'streetwear': 'trust_ugc',
    'minimalist': 'problem_solution',
    'bold': 'offer_promo'
};

/**
 * Shot result for a single shot in the sequence
 */
export interface ShotResult {
    shotId: string;
    shotType: string;
    role: string;
    context: string;
    url?: string;
    status: 'SUCCESS' | 'FAILED';
    retries: number;
    error?: string;
}

/**
 * Complete ads sequence result
 */
export interface AdsSequenceResult {
    generationId?: string; // Phase 11: DB record ID
    runId: string;
    plan: {
        roles: string[];
        contexts: string[];
        seed: string;
    };
    shots: ShotResult[];
    status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
    totals: {
        planRetries: number;
        shotRetries: number;
    };
    error?: string;
}

/**
 * Generate complete 4-shot ads sequence
 * 
 * Behavior:
 * 1. Generate plan using Phase 9 validated logic
 * 2. For each shot:
 *    - Build prompt
 *    - Generate and upload
 *    - Retry on failure (up to MAX_SHOT_RETRIES)
 * 3. If shot fails after retries:
 *    - Regenerate entire plan (up to MAX_PLAN_RETRIES)
 * 4. HOOK failure → abort or replan immediately
 * 5. NEVER drop constraints
 */
export async function generateAdsSequence(params: {
    productId: string;
    productName: string;
    category: SimpleCategory | ProductCategory;
    template: SimpleTemplate | AdTemplate;
    userId?: string;
    runId?: string;
}): Promise<AdsSequenceResult> {
    const { productId, productName, userId, runId: providedRunId } = params;

    // Map simple types to full types
    const category: ProductCategory = (params.category in CATEGORY_MAP)
        ? CATEGORY_MAP[params.category as SimpleCategory]
        : params.category as ProductCategory;

    const template: AdTemplate = (params.template in TEMPLATE_MAP)
        ? TEMPLATE_MAP[params.template as SimpleTemplate]
        : params.template as AdTemplate;

    // Generate unique run ID
    const runId = providedRunId || `run-${productId}-${Date.now()}`;

    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║  PHASE 10 — ADS SEQUENCE GENERATION    ║`);
    console.log(`╚════════════════════════════════════════╝\n`);
    console.log(`Run ID: ${runId}`);
    console.log(`Product: ${productName}`);
    console.log(`Category: ${category}`);
    console.log(`Template: ${template}\n`);

    let planRetries = 0;
    let totalShotRetries = 0;
    let generationId: string | undefined;

    // Retry with new plan if needed
    while (planRetries <= MAX_PLAN_RETRIES) {
        try {
            // STEP 1: Generate plan (Phase 9 validated logic - NO MODIFICATION)
            const seed = `${runId}-plan-${planRetries}-${Date.now()}`;
            console.log(`[Plan] Generating 4-shot plan (attempt ${planRetries + 1}/${MAX_PLAN_RETRIES + 1})...`);

            const plan = generateFourShotPlan(seed);

            // Validate plan (Phase 9 hard checks)
            const validation = validateFourShotPlan(plan);
            if (!validation.valid) {
                throw new Error(`Plan validation failed: ${validation.error}`);
            }

            const roles = plan.shots.map(s => s.spatialRole);
            const contexts = plan.shots.map(s => s.context);

            console.log(`[Plan] ✓ Valid plan generated`);
            console.log(`[Plan] Roles: ${roles.join(' → ')}`);
            console.log(`[Plan] Contexts: ${contexts.map(c => c.split('(')[0].trim()).join(', ')}\n`);

            // PHASE 11: Create DB record (BLOCKING - throws on error)
            if (!generationId) {
                const dbResult = await createAdsGeneration({
                    userId,
                    productId,
                    productName,
                    category: params.category as string,
                    template: params.template as string,
                    runId,
                    planSeed: seed,
                    planRoles: roles,
                    planContexts: contexts
                });
                generationId = dbResult.id;
            }

            // STEP 2: Execute each shot
            const shotResults: ShotResult[] = [];
            let sequenceFailed = false;

            for (let shotIndex = 0; shotIndex < plan.shots.length; shotIndex++) {
                const shotPlan = plan.shots[shotIndex];
                const shotId = `shot-${shotIndex + 1}-${shotPlan.shotType}`;

                console.log(`[Shot ${shotIndex + 1}/4] Generating ${shotPlan.shotType} (${shotPlan.spatialRole})...`);

                // Build prompt for this shot
                const prompt = generateShotPrompt({
                    shotPlan,
                    productName,
                    category,
                    template
                });

                // Try to generate shot with retries
                let shotRetries = 0;
                let shotSuccess = false;
                let shotUrl: string | undefined;
                let shotProvider: string | undefined;
                let shotKey: string | undefined;
                let shotError: string | undefined;

                while (shotRetries < MAX_SHOT_RETRIES && !shotSuccess) {
                    try {
                        const result = await generateAndUploadShot({
                            prompt,
                            runId,
                            shotId,
                            productId,
                            role: shotPlan.spatialRole,
                            context: shotPlan.context,
                            attempt: shotRetries + 1
                        });

                        shotUrl = result.url;
                        shotProvider = result.provider;
                        shotKey = result.key;
                        shotSuccess = true;
                        console.log(`[Shot ${shotIndex + 1}/4] ✓ SUCCESS (${shotRetries} retries)`);

                        // PHASE 11: Update shot URL in DB (BLOCKING - throws on error)
                        // PHASE 11.5: Now includes provider and key
                        await updateShotUrl({
                            runId,
                            shotIndex: shotIndex + 1,
                            url: shotUrl,
                            provider: shotProvider,
                            r2Key: shotProvider === 'r2' ? shotKey : undefined
                        });

                    } catch (error: any) {
                        shotRetries++;
                        totalShotRetries++;
                        shotError = error.message;

                        console.error(`[Shot ${shotIndex + 1}/4] ✗ Attempt ${shotRetries} failed: ${error.message}`);

                        // HOOK failure → abort immediately or replan
                        if (shotPlan.shotType === 'hook' && shotRetries >= MAX_SHOT_RETRIES) {
                            console.error(`[Shot ${shotIndex + 1}/4] ⛔ HOOK FAILED - Replanning entire sequence`);
                            sequenceFailed = true;
                            break;
                        }

                        // Wait before retry (exponential backoff)
                        if (shotRetries < MAX_SHOT_RETRIES) {
                            const waitTime = Math.pow(2, shotRetries) * 1000;
                            console.log(`[Shot ${shotIndex + 1}/4] Waiting ${waitTime}ms before retry...`);
                            await new Promise(resolve => setTimeout(resolve, waitTime));
                        }
                    }
                }

                // Record shot result
                shotResults.push({
                    shotId,
                    shotType: shotPlan.shotType,
                    role: shotPlan.spatialRole,
                    context: shotPlan.context,
                    url: shotUrl,
                    status: shotSuccess ? 'SUCCESS' : 'FAILED',
                    retries: shotRetries,
                    error: shotError
                });

                // If shot failed after all retries, break and replan
                if (!shotSuccess) {
                    console.error(`[Shot ${shotIndex + 1}/4] ⛔ Failed after ${shotRetries} retries`);
                    sequenceFailed = true;
                    break;
                }
            }

            // If all shots succeeded, return success
            if (!sequenceFailed && shotResults.every(s => s.status === 'SUCCESS')) {
                console.log(`\n✅ SEQUENCE COMPLETE - All 4 shots generated successfully`);
                console.log(`Total retries: ${totalShotRetries}\n`);

                // PHASE 11: Finalize DB record (BLOCKING - throws on error)
                await finalizeGeneration({
                    runId,
                    status: 'success',
                    totalPlanRetries: planRetries,
                    totalShotRetries,
                    metadata: { shots: shotResults }
                });

                return {
                    generationId,
                    runId,
                    plan: {
                        roles,
                        contexts,
                        seed
                    },
                    shots: shotResults,
                    status: 'SUCCESS',
                    totals: {
                        planRetries,
                        shotRetries: totalShotRetries
                    }
                };
            }

            // Sequence failed, try with new plan
            console.error(`\n⚠️  Sequence failed, replanning (${planRetries + 1}/${MAX_PLAN_RETRIES})...\n`);
            planRetries++;

        } catch (error: any) {
            console.error(`[Plan] Error: ${error.message}`);
            planRetries++;

            if (planRetries > MAX_PLAN_RETRIES) {
                // PHASE 11: Try to finalize as failed (best effort)
                try {
                    await finalizeGeneration({
                        runId,
                        status: 'failed',
                        totalPlanRetries: planRetries,
                        totalShotRetries,
                        errorMessage: error.message
                    });
                } catch (finalizeError) {
                    console.error('[Pipeline] Could not finalize failed run:', finalizeError);
                }

                return {
                    generationId,
                    runId,
                    plan: {
                        roles: [],
                        contexts: [],
                        seed: ''
                    },
                    shots: [],
                    status: 'FAILED',
                    totals: {
                        planRetries,
                        shotRetries: totalShotRetries
                    },
                    error: error.message
                };
            }
        }
    }

    // All plan retries exhausted
    console.error(`\n❌ SEQUENCE FAILED - Exhausted all plan retries\n`);

    // PHASE 11: Try to finalize as failed (best effort)
    try {
        await finalizeGeneration({
            runId,
            status: 'failed',
            totalPlanRetries: planRetries,
            totalShotRetries,
            errorMessage: 'Exhausted all plan retries'
        });
    } catch (finalizeError) {
        console.error('[Pipeline] Could not finalize failed run:', finalizeError);
    }

    return {
        generationId,
        runId,
        plan: {
            roles: [],
            contexts: [],
            seed: ''
        },
        shots: [],
        status: 'FAILED',
        totals: {
            planRetries,
            shotRetries: totalShotRetries
        },
        error: 'Exhausted all plan retries'
    };
}

/**
 * Build prompt for a specific shot
 * Uses Phase 9 validated prompt generation
 */
function buildPromptForShot(params: {
    shotPlan: ShotPlan;
    productName: string;
    category: ProductCategory;
    template: AdTemplate;
}): string {
    return generateShotPrompt(params);
}
