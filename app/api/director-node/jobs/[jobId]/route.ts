import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/supabase/auth';

/**
 * GET /api/director-node/jobs/[jobId]
 * Get a specific job by ID
 * 
 * Response: {
 *   id: string,
 *   status: 'queued' | 'running' | 'succeeded' | 'failed',
 *   output_url?: string,
 *   output_asset_id?: string,
 *   error_message?: string,
 *   created_at: string,
 *   updated_at: string,
 *   payload: object
 * }
 */
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ jobId: string }> }
) {
    try {
        const supabase = await supabaseServer();
        const { jobId } = await context.params;

        if (!jobId) {
            return NextResponse.json(
                { error: 'jobId is required' },
                { status: 400 }
            );
        }

        // Get current user (cached)
        const user = await getAuthenticatedUser(supabase);
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Fetch job (RLS will ensure user owns it)
        const { data: job, error } = await supabase
            .from('director_node_jobs')
            .select('*')
            .eq('id', jobId)
            .single();

        if (error || !job) {
            console.error('[Director Node Jobs] Job not found:', error);
            return NextResponse.json(
                { error: 'Job not found or unauthorized' },
                { status: 404 }
            );
        }

        return NextResponse.json(job);
    } catch (error: any) {
        console.error('[Director Node Jobs] GET [jobId] error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
