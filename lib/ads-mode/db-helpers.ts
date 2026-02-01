/**
 * PHASE 11 — DATABASE HELPERS
 * 
 * BLOCKING operations: All functions THROW on error (no silent failures)
 * Uses service role key for backend operations (bypasses RLS)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy-loaded service client
let serviceClient: SupabaseClient | null = null;

function getSupabaseServiceClient(): SupabaseClient {
    if (!serviceClient) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!url || !key) {
            throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
        }

        serviceClient = createClient(url, key);
    }

    return serviceClient;
}

/**
 * Ads Generation Record (matches DB schema)
 */
export interface AdsGenerationRecord {
    id: string;
    user_id: string | null;
    product_id: string;
    product_name: string;
    category: string;
    template: string;
    run_id: string;
    plan_seed: string;
    plan_roles: string[]; // JSONB array of strings
    plan_contexts: string[]; // JSONB array of strings
    shot_1_url: string | null;
    shot_2_url: string | null;
    shot_3_url: string | null;
    shot_4_url: string | null;
    status: 'generating' | 'success' | 'failed' | 'partial';
    total_plan_retries: number;
    total_shot_retries: number;
    error_message: string | null;
    metadata: any;
    created_at: string;
    updated_at: string;
}

/**
 * Create initial generation record
 * BLOCKING: Throws on error (hard fail)
 */
export async function createAdsGeneration(params: {
    userId?: string;
    productId: string;
    productName: string;
    category: string;
    template: string;
    runId: string;
    planSeed: string;
    planRoles: string[]; // Array of strings
    planContexts: string[];
}): Promise<{ id: string }> {
    const supabase = getSupabaseServiceClient();

    console.log('[DB] Creating ads generation record...');

    const { data, error } = await supabase
        .from('ads_generations')
        .insert({
            user_id: params.userId || null,
            product_id: params.productId,
            product_name: params.productName,
            category: params.category,
            template: params.template,
            run_id: params.runId,
            plan_seed: params.planSeed,
            plan_roles: params.planRoles, // JSONB array of strings
            plan_contexts: params.planContexts,
            status: 'generating'
        })
        .select('id')
        .single();

    if (error) {
        console.error('[DB] Failed to create generation:', error);
        throw new Error(`DB persistence failed: ${error.message}`);
    }

    console.log(`[DB] ✓ Generation created: ${data.id}`);
    return { id: data.id };
}

/**
 * Update shot URL
 * BLOCKING: Throws on error after 1 retry
 * 
 * PHASE 11.5: Now tracks storage provider and R2 key
 */
export async function updateShotUrl(params: {
    runId: string;
    shotIndex: number; // 1-4
    url: string;
    provider?: string; // 'supabase' or 'r2'
    r2Key?: string;
}): Promise<void> {
    const supabase = getSupabaseServiceClient();
    const { shotIndex, url, runId, provider, r2Key } = params;

    if (shotIndex < 1 || shotIndex > 4) {
        throw new Error(`Invalid shotIndex: ${shotIndex}. Must be 1-4.`);
    }

    const columnName = `shot_${shotIndex}_url`;
    const providerColumn = `shot_${shotIndex}_provider`;
    const keyColumn = `shot_${shotIndex}_r2_key`;

    console.log(`[DB] Updating ${columnName}...`);

    // Build update object
    const updateData: any = { [columnName]: url };

    if (provider) {
        updateData[providerColumn] = provider;
    }

    if (r2Key) {
        updateData[keyColumn] = r2Key;
    }

    // Try once
    let { error } = await supabase
        .from('ads_generations')
        .update(updateData)
        .eq('run_id', runId);

    // Retry once on failure
    if (error) {
        console.warn(`[DB] Retry updating ${columnName}...`);
        await new Promise(resolve => setTimeout(resolve, 1000));

        ({ error } = await supabase
            .from('ads_generations')
            .update(updateData)
            .eq('run_id', runId));
    }

    if (error) {
        console.error(`[DB] Failed to update ${columnName}:`, error);
        throw new Error(`DB update failed for ${columnName}: ${error.message}`);
    }

    console.log(`[DB] ✓ ${columnName} updated`);
}

/**
 * Finalize generation
 * BLOCKING: Throws on error (hard fail)
 */
export async function finalizeGeneration(params: {
    runId: string;
    status: 'success' | 'failed' | 'partial';
    totalPlanRetries: number;
    totalShotRetries: number;
    errorMessage?: string;
    metadata?: any;
}): Promise<void> {
    const supabase = getSupabaseServiceClient();

    console.log(`[DB] Finalizing generation (status: ${params.status})...`);

    const { error } = await supabase
        .from('ads_generations')
        .update({
            status: params.status,
            total_plan_retries: params.totalPlanRetries,
            total_shot_retries: params.totalShotRetries,
            error_message: params.errorMessage || null,
            metadata: params.metadata || {}
        })
        .eq('run_id', params.runId);

    if (error) {
        console.error('[DB] Failed to finalize generation:', error);
        throw new Error(`DB finalization failed: ${error.message}`);
    }

    console.log('[DB] ✓ Generation finalized');
}

/**
 * Get generation by ID
 * Used by GET endpoint (will use user-scoped client there)
 */
export async function getGenerationById(id: string): Promise<AdsGenerationRecord | null> {
    const supabase = getSupabaseServiceClient();

    const { data, error } = await supabase
        .from('ads_generations')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            // Not found
            return null;
        }
        throw new Error(`Failed to fetch generation: ${error.message}`);
    }

    return data as AdsGenerationRecord;
}

/**
 * Get generation by runId
 */
export async function getGenerationByRunId(runId: string): Promise<AdsGenerationRecord | null> {
    const supabase = getSupabaseServiceClient();

    const { data, error } = await supabase
        .from('ads_generations')
        .select('*')
        .eq('run_id', runId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            // Not found
            return null;
        }
        throw new Error(`Failed to fetch generation: ${error.message}`);
    }

    return data as AdsGenerationRecord;
}
