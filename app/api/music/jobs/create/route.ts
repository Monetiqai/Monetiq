/**
 * PHASE 2.5 - Job Creation Endpoint
 * 
 * Atomic job creation with quota reservation
 * POST /api/music/jobs/create
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/supabase/auth';

export async function POST(req: NextRequest) {
    try {
        const supabase = await supabaseServer();
        const user = await getAuthenticatedUser(supabase);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { preset, duration, type, text } = body;

        // Validate inputs
        if (!type || !['instrumental', 'voice_standard', 'voice_premium'].includes(type)) {
            return NextResponse.json({ error: 'Invalid audio type' }, { status: 400 });
        }

        if (!duration || ![6, 15, 30].includes(duration)) {
            return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
        }

        if (type !== 'instrumental' && !text?.trim()) {
            return NextResponse.json({ error: 'Text required for voice types' }, { status: 400 });
        }

        console.log('[Jobs] Creating job:', { type, duration, userId: user.id });

        // Atomic quota reservation + job creation using DB transaction
        const field = type === 'voice_premium' ? 'seconds_premium' : 'seconds_standard';

        // Use RPC function for atomic operation
        const { data: result, error: rpcError } = await supabase.rpc('reserve_quota_and_create_job', {
            p_user_id: user.id,
            p_audio_type: type,
            p_duration_sec: duration,
            p_preset: preset || null,
            p_text: text || null,
            p_quota_field: field
        });

        if (rpcError) {
            console.error('[Jobs] RPC error:', rpcError);

            // Check if it's a quota error
            if (rpcError.message?.includes('Insufficient quota')) {
                return NextResponse.json({
                    error: 'Insufficient quota',
                    details: rpcError.message
                }, { status: 402 });
            }

            return NextResponse.json({
                error: 'Failed to create job',
                details: rpcError.message
            }, { status: 500 });
        }

        if (!result || !result.job_id) {
            return NextResponse.json({ error: 'Job creation failed' }, { status: 500 });
        }

        console.log('[Jobs] ✓ Job created:', result.job_id);

        // Trigger worker asynchronously (fire and forget)
        fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/music/worker`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }).catch(err => console.error('[Jobs] Worker trigger failed:', err));

        return NextResponse.json({
            jobId: result.job_id,
            status: 'queued'
        });

    } catch (error: any) {
        console.error('[Jobs] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal error' },
            { status: 500 }
        );
    }
}
