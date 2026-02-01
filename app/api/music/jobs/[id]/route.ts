/**
 * PHASE 2.5 - Job Status Endpoint
 * 
 * GET /api/music/jobs/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/supabase/auth';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await supabaseServer();
        const user = await getAuthenticatedUser(supabase);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: jobId } = await params;

        // Get job
        const { data: job, error } = await supabase
            .from('music_jobs')
            .select('*')
            .eq('id', jobId)
            .eq('user_id', user.id)
            .single();

        if (error || !job) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        return NextResponse.json({
            id: job.id,
            status: job.status,
            audioType: job.audio_type,
            durationSec: job.duration_sec,
            preset: job.preset,
            text: job.text,
            providerTarget: job.provider_target,
            providerFinal: job.provider_final,
            fallbackUsed: job.fallback_used,
            errorCode: job.error_code,
            errorMessage: job.error_message,
            createdAt: job.created_at,
            startedAt: job.started_at,
            completedAt: job.completed_at
        });

    } catch (error: any) {
        console.error('[Jobs] Get error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
