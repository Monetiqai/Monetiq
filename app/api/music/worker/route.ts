/**
 * PHASE 3.2 - Worker with Real Provider Adapters
 * 
 * Implements atomic job claiming with real providers (Polly, ElevenLabs, Stable Audio)
 * Features: worker_id tracking, UPDATE...WHERE...RETURNING claim, retry logic, error code logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServiceRole } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';
import { PollyAdapter } from '@/lib/music/adapters/polly-adapter';
import { ElevenLabsAdapter } from '@/lib/music/adapters/elevenlabs-adapter';
import { StableAudioAdapter } from '@/lib/music/adapters/stable-audio-adapter';
import { R2AssetStore } from '@/lib/music/adapters/asset-store';
import { logProviderCall } from '@/lib/music/providers/logger';
import { ProviderError } from '@/lib/music/adapters/errors';
import type { MusicAdapter, VoiceAdapter, AssetStore } from '@/lib/music/adapters/types';

export async function POST(req: NextRequest) {
    const supabase = supabaseServiceRole();
    const workerId = randomUUID(); // Unique ID for this worker invocation

    console.log('[Worker] Starting with ID:', workerId);

    try {
        // Try to claim a job (with retry logic)
        const job = await claimNextJob(supabase, workerId);

        if (!job) {
            return NextResponse.json({ message: 'No jobs in queue' });
        }

        console.log('[Worker] Claimed job:', job.id);

        try {
            const result = await processJobWithAdapters(job);

            // Mark succeeded (verify we still own this job)
            await supabase
                .from('music_jobs')
                .update({
                    status: 'succeeded',
                    completed_at: new Date().toISOString(),
                    provider_final: result.provider
                })
                .eq('id', job.id)
                .eq('worker_id', workerId);

            console.log('[Worker] ✓ Job succeeded:', job.id);

            return NextResponse.json({
                jobId: job.id,
                status: 'succeeded',
                assetId: result.assetId,
                workerId
            });

        } catch (error: any) {
            console.error('[Worker] Job failed:', error);

            // Mark failed (only if we still own it)
            await supabase
                .from('music_jobs')
                .update({
                    status: 'failed',
                    error_message: error.message,
                    completed_at: new Date().toISOString()
                })
                .eq('id', job.id)
                .eq('worker_id', workerId);

            // Refund quota
            await refundQuota(job);

            return NextResponse.json({
                jobId: job.id,
                status: 'failed',
                error: error.message,
                workerId
            });
        }

    } catch (error: any) {
        console.error('[Worker] Error:', error);
        return NextResponse.json(
            { error: error.message, workerId },
            { status: 500 }
        );
    }
}

/**
 * Atomically claim the next queued job
 * Returns null if no jobs available or all claims failed
 */
async function claimNextJob(supabase: any, workerId: string, maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        // Get next queued jobs (without locking yet)
        const { data: candidates } = await supabase
            .from('music_jobs')
            .select('id')
            .eq('status', 'queued')
            .order('created_at', { ascending: true })
            .limit(5); // Get multiple candidates to reduce contention

        if (!candidates || candidates.length === 0) {
            return null; // No jobs in queue
        }

        // Try to claim each candidate
        for (const candidate of candidates) {
            const { data: claimedJobs } = await supabase
                .from('music_jobs')
                .update({
                    status: 'running',
                    started_at: new Date().toISOString(),
                    worker_id: workerId
                })
                .eq('id', candidate.id)
                .eq('status', 'queued') // CRITICAL: Only claim if still queued
                .select();

            if (claimedJobs && claimedJobs.length > 0) {
                console.log(`[Worker] ✓ Claimed job ${claimedJobs[0].id} (attempt ${attempt + 1})`);
                return claimedJobs[0];
            }

            // Job was claimed by another worker, try next candidate
            console.log(`[Worker] ✗ Job ${candidate.id} already claimed, trying next`);
        }

        // All candidates were claimed, retry with fresh batch
        console.log(`[Worker] All candidates claimed, retrying (${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay before retry
    }

    console.log('[Worker] Failed to claim any job after retries');
    return null;
}

async function processJobWithAdapters(job: any) {
    const supabase = supabaseServiceRole();
    const startTime = Date.now();

    // Select adapter based on audio_type
    let adapter: MusicAdapter | VoiceAdapter;
    let action: string;
    let kind: 'music' | 'voice';
    let provider: string;

    if (job.audio_type === 'instrumental') {
        adapter = new StableAudioAdapter();
        action = 'generate';
        kind = 'music';
        provider = 'stable_audio';
    } else if (job.audio_type === 'voice_premium') {
        adapter = new ElevenLabsAdapter();
        action = 'tts';
        kind = 'voice';
        provider = 'elevenlabs';
    } else {
        adapter = new PollyAdapter();
        action = 'tts';
        kind = 'voice';
        provider = 'polly';
    }

    // Log started
    await logProviderCall({
        jobId: job.id,
        provider,
        action,
        status: 'started',
        requestMeta: {
            duration_sec: job.duration_sec,
            preset: job.preset,
            type: job.audio_type,
            text_length: job.text?.length
        }
    });

    let result;
    try {
        // Call adapter
        if (job.audio_type === 'instrumental') {
            result = await (adapter as MusicAdapter).generate({
                prompt: job.prompt,
                durationSec: job.duration_sec,
                preset: job.preset
            });
        } else {
            result = await (adapter as VoiceAdapter).tts({
                text: job.text,
                ...(job.voice_id && { voiceId: job.voice_id }) // Only pass voiceId if defined
            });
        }

        const latencyMs = Date.now() - startTime;

        // Log succeeded
        await logProviderCall({
            jobId: job.id,
            provider,
            action,
            status: 'succeeded',
            latencyMs,
            responseMeta: {
                size_bytes: result.audioBuffer?.length,
                format: result.meta.format,
                provider_job_id: result.meta.providerJobId,
                duration_sec: result.meta.durationSec
            }
        });

    } catch (error: any) {
        const latencyMs = Date.now() - startTime;

        // Extract error code if ProviderError
        const errorCode = error instanceof ProviderError ? error.code : 'UNKNOWN_ERROR';

        // Log failed
        await logProviderCall({
            jobId: job.id,
            provider,
            action,
            status: 'failed',
            latencyMs,
            errorCode,
            errorMessage: error.message
        });

        throw error;
    }

    // Save audio via AssetStore
    const assetStore: AssetStore = new R2AssetStore();
    const saveResult = await assetStore.saveAudio({
        buffer: result.audioBuffer,
        url: result.audioUrl,
        meta: {
            userId: job.user_id,
            jobId: job.id,
            kind,
            ...result.meta,
            provider // Override with local provider variable
        }
    });

    console.log('[Worker] Asset saved:', saveResult.assetId);

    // Create music_output with defensive error handling
    const { error: outputError } = await supabase
        .from('music_outputs')
        .insert({
            job_id: job.id,
            asset_id: saveResult.assetId,
            kind,
            duration_sec: result.meta.durationSec,
            meta: result.meta
        });

    // If unique constraint violation, it means output already exists (shouldn't happen with atomic claim)
    if (outputError && outputError.code === '23505') {
        console.warn('[Worker] ⚠ Output already exists for job:', job.id);
        // Don't throw - job was already processed successfully
    } else if (outputError) {
        throw outputError;
    }

    return {
        provider,
        assetId: saveResult.assetId,
        url: saveResult.publicUrl
    };
}

async function refundQuota(job: any) {
    const supabase = supabaseServiceRole();

    const field = job.audio_type === 'voice_premium' ? 'seconds_premium' : 'seconds_standard';

    const { data: credits } = await supabase
        .from('usage_credits')
        .select('*')
        .eq('user_id', job.user_id)
        .single();

    if (!credits) return;

    const newLedger = [
        ...credits.ledger,
        {
            action: 'refund',
            amount: job.duration_sec,
            field,
            job_id: job.id,
            timestamp: new Date().toISOString(),
            reason: 'job_failed'
        }
    ];

    await supabase
        .from('usage_credits')
        .update({
            [field]: credits[field] + job.duration_sec,
            ledger: newLedger
        })
        .eq('user_id', job.user_id);

    console.log('[Worker] Refunded quota:', { userId: job.user_id, field, amount: job.duration_sec });
}
