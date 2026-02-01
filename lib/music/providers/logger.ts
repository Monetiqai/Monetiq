/**
 * PHASE 3.1 - Provider Call Logger (Enhanced with Security)
 * 
 * Logs all provider API calls to provider_calls table
 * SECURITY: Sanitizes metadata to prevent logging secrets
 */

import { supabaseServiceRole } from '@/lib/supabase/server';
import type { ProviderCallLog } from './types';

/**
 * Sanitize metadata to remove secrets
 * Only allows whitelisted safe fields
 */
function sanitizeMeta(meta: Record<string, any>): Record<string, any> {
    const safe: Record<string, any> = {};
    const allowedKeys = [
        'duration_sec', 'preset', 'type', 'voice_id', 'lang', 'style',
        'provider_job_id', 'size_bytes', 'format', 'text_length'
    ];

    for (const key of allowedKeys) {
        if (meta[key] !== undefined) {
            safe[key] = meta[key];
        }
    }

    return safe;
}

export async function logProviderCall(log: ProviderCallLog): Promise<void> {
    try {
        const supabase = supabaseServiceRole();

        await supabase.from('provider_calls').insert({
            job_id: log.jobId,
            provider: log.provider,
            action: log.action,
            status: log.status,
            latency_ms: log.latencyMs,
            request_meta: sanitizeMeta(log.requestMeta || {}),
            response_meta: sanitizeMeta(log.responseMeta || {}),
            error_code: log.errorCode,
            error_message: log.errorMessage
        });

        console.log(`[ProviderLog] ${log.provider}.${log.action} → ${log.status}`);
    } catch (error) {
        console.error('[ProviderLog] Failed to log:', error);
        // Don't throw - logging failure shouldn't break the flow
    }
}
