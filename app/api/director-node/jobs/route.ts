import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/supabase/auth';

/**
 * POST /api/director-node/jobs
 * Create a new image/video generation job
 * 
 * Body: {
 *   graph_id: string,
 *   node_id: string,
 *   kind: 'image' | 'video',
 *   provider: string,
 *   payload: {
 *     prompt: string,
 *     aspect_ratio?: string,
 *     resolution?: string,
 *     seed?: number,
 *     ...
 *   }
 * }
 * 
 * Response (immediate, <300ms): {
 *   job_id: string,
 *   status: 'queued',
 *   message: 'Job created successfully'
 * }
 */
export async function POST(req: NextRequest) {
    try {
        const supabase = await supabaseServer();
        const body = await req.json();
        const { graph_id, node_id, kind, provider, payload } = body;

        // Validation
        if (!graph_id || !node_id || !kind || !provider || !payload) {
            return NextResponse.json(
                { error: 'graph_id, node_id, kind, provider, and payload are required' },
                { status: 400 }
            );
        }

        if (!['image', 'video'].includes(kind)) {
            return NextResponse.json(
                { error: 'kind must be "image" or "video"' },
                { status: 400 }
            );
        }

        if (!payload.prompt) {
            return NextResponse.json(
                { error: 'payload.prompt is required' },
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

        // Verify graph ownership (RLS will handle this, but explicit check for better UX)
        const { data: graph, error: graphError } = await supabase
            .from('director_node_graphs')
            .select('id')
            .eq('id', graph_id)
            .single();

        if (graphError || !graph) {
            return NextResponse.json(
                { error: 'Graph not found or unauthorized' },
                { status: 404 }
            );
        }

        // Create job
        const { data: job, error: jobError } = await supabase
            .from('director_node_jobs')
            .insert({
                user_id: user.id,
                graph_id,
                node_id,
                kind,
                provider,
                payload,
                status: 'queued'
            })
            .select()
            .single();

        if (jobError) {
            console.error('[Director Node Jobs] Error creating job:', jobError);
            return NextResponse.json(
                { error: 'Failed to create job' },
                { status: 500 }
            );
        }

        console.log('[Director Node Jobs] Job created:', job.id);

        return NextResponse.json({
            job_id: job.id,
            status: 'queued',
            message: 'Job created successfully'
        });
    } catch (error: any) {
        console.error('[Director Node Jobs] POST error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/director-node/jobs?node_id=<id>
 * Get all jobs for a specific node
 */
export async function GET(req: NextRequest) {
    try {
        const supabase = await supabaseServer();
        const { searchParams } = new URL(req.url);
        const nodeId = searchParams.get('node_id');

        if (!nodeId) {
            return NextResponse.json(
                { error: 'node_id is required' },
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

        // Fetch jobs (RLS will filter by user_id automatically)
        const { data: jobs, error } = await supabase
            .from('director_node_jobs')
            .select('*')
            .eq('node_id', nodeId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Director Node Jobs] Error fetching jobs:', error);
            return NextResponse.json(
                { error: 'Failed to fetch jobs' },
                { status: 500 }
            );
        }

        return NextResponse.json({ jobs: jobs || [] });
    } catch (error: any) {
        console.error('[Director Node Jobs] GET error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
