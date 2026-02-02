import { NextResponse, NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/supabase/auth';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ runId: string }> }
) {
    try {
        const supabase = await supabaseServer();
        const { runId } = await context.params; // Await params in Next.js 16

        // Get current user (cached)
        const user = await getAuthenticatedUser(supabase);
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Fetch run
        const { data: run, error: runError } = await supabase
            .from('director_node_runs')
            .select('*')
            .eq('id', runId)
            .eq('user_id', user.id)
            .single();

        if (runError || !run) {
            return NextResponse.json({ error: 'Run not found' }, { status: 404 });
        }

        // Extract asset URL if available
        let assetUrl = null;
        if (run.output_payload?.image_asset?.url) {
            assetUrl = run.output_payload.image_asset.url;
        } else if (run.output_payload?.video_asset?.url) {
            assetUrl = run.output_payload.video_asset.url;
        }

        return NextResponse.json({
            run_id: run.id,
            node_id: run.node_id,
            status: run.status,
            outputs: run.output_payload,
            error: run.error_message,
            asset_url: assetUrl,
            started_at: run.started_at,
            completed_at: run.completed_at,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 });
    }
}
