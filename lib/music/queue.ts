/**
 * MUSIC MODE - Phase 2: Queue System
 * 
 * Functions for creating and managing music generation jobs
 */

import { supabaseServer } from '@/lib/supabase/server';

export type AudioType = 'instrumental' | 'voice_standard' | 'voice_premium';

export interface CreateMusicJobParams {
    userId: string;
    audioType: AudioType;
    preset?: string;
    durationSec: number;
    prompt?: string;
    text?: string;
    voiceId?: string;
}

/**
 * Create a new music generation job
 * Reserves quota and adds job to queue
 */
export async function createMusicJob(params: CreateMusicJobParams) {
    const supabase = await supabaseServer();

    // Reserve quota first
    const quotaOk = await reserveQuota(
        params.userId,
        params.audioType,
        params.durationSec
    );

    if (!quotaOk) {
        throw new Error('Insufficient quota. Please upgrade or wait for quota refresh.');
    }

    try {
        // Create job
        const { data: job, error } = await supabase
            .from('music_jobs')
            .insert({
                user_id: params.userId,
                status: 'queued',
                audio_type: params.audioType,
                duration_sec: params.durationSec,
                preset: params.preset,
                prompt: params.prompt,
                text: params.text,
                voice_id: params.voiceId,
                provider_target: getTargetProvider(params.audioType)
            })
            .select()
            .single();

        if (error) throw error;

        console.log('[Queue] Job created:', job.id);

        // Trigger worker (in production, this would be a webhook or cron)
        // For now, we'll process synchronously in the API

        return job;

    } catch (error) {
        // Refund quota if job creation failed
        await refundQuota(params.userId, params.audioType, params.durationSec, 'job_creation_failed');
        throw error;
    }
}

/**
 * Get target provider based on audio type
 */
function getTargetProvider(audioType: AudioType): string {
    switch (audioType) {
        case 'instrumental':
            return 'stable_audio';
        case 'voice_premium':
            return 'elevenlabs';
        case 'voice_standard':
            return 'polly';
    }
}

/**
 * Reserve quota for a job
 * Returns true if quota available, false otherwise
 */
async function reserveQuota(
    userId: string,
    audioType: AudioType,
    durationSec: number
): Promise<boolean> {
    const supabase = await supabaseServer();

    const field = audioType === 'voice_premium' ? 'seconds_premium' : 'seconds_standard';

    // Get current credits
    const { data: credits, error } = await supabase
        .from('usage_credits')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error || !credits) {
        console.error('[Quota] Failed to get credits:', error);
        return false;
    }

    // Check if enough quota
    if (credits[field] < durationSec) {
        console.warn('[Quota] Insufficient:', { userId, field, available: credits[field], needed: durationSec });
        return false;
    }

    // Reserve (decrement)
    const newLedger = [
        ...credits.ledger,
        {
            action: 'reserve',
            amount: -durationSec,
            field,
            timestamp: new Date().toISOString(),
            reason: 'job_creation'
        }
    ];

    const { error: updateError } = await supabase
        .from('usage_credits')
        .update({
            [field]: credits[field] - durationSec,
            ledger: newLedger
        })
        .eq('user_id', userId);

    if (updateError) {
        console.error('[Quota] Failed to reserve:', updateError);
        return false;
    }

    console.log('[Quota] Reserved:', { userId, field, amount: durationSec });
    return true;
}

/**
 * Refund quota (e.g., when job fails)
 */
export async function refundQuota(
    userId: string,
    audioType: AudioType,
    durationSec: number,
    reason: string
): Promise<void> {
    const supabase = await supabaseServer();

    const field = audioType === 'voice_premium' ? 'seconds_premium' : 'seconds_standard';

    const { data: credits } = await supabase
        .from('usage_credits')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (!credits) return;

    const newLedger = [
        ...credits.ledger,
        {
            action: 'refund',
            amount: durationSec,
            field,
            timestamp: new Date().toISOString(),
            reason
        }
    ];

    await supabase
        .from('usage_credits')
        .update({
            [field]: credits[field] + durationSec,
            ledger: newLedger
        })
        .eq('user_id', userId);

    console.log('[Quota] Refunded:', { userId, field, amount: durationSec, reason });
}

/**
 * Get user's current quota
 */
export async function getUserQuota(userId: string) {
    const supabase = await supabaseServer();

    const { data: credits } = await supabase
        .from('usage_credits')
        .select('seconds_standard, seconds_premium')
        .eq('user_id', userId)
        .single();

    return credits || { seconds_standard: 0, seconds_premium: 0 };
}
