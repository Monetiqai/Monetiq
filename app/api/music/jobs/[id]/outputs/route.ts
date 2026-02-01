/**
 * PHASE 2.5 - Job Outputs Endpoint
 * 
 * GET /api/music/jobs/[id]/outputs
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

        // Verify job belongs to user
        const { data: job } = await supabase
            .from('music_jobs')
            .select('id')
            .eq('id', jobId)
            .eq('user_id', user.id)
            .single();

        if (!job) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        // Get outputs with asset details
        const { data: outputs, error } = await supabase
            .from('music_outputs')
            .select(`
        id,
        kind,
        duration_sec,
        meta,
        created_at,
        assets (
          id,
          public_url,
          r2_key,
          mime_type,
          meta
        )
      `)
            .eq('job_id', jobId);

        if (error) {
            console.error('[Outputs] Query error:', error);
            return NextResponse.json({ error: 'Failed to fetch outputs' }, { status: 500 });
        }

        return NextResponse.json({
            outputs: outputs || []
        });

    } catch (error: any) {
        console.error('[Outputs] Error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
