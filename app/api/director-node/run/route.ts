import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { processRun } from '@/app/director-node/runtime/worker';

// Force reload: 2026-01-29 16:23 - CameraMovement fix

/**
 * Background processing function (fire-and-forget)
 */
async function processRunsAsync(runIds: string[]) {
    for (const runId of runIds) {
        try {
            await processRun(runId);
        } catch (error) {
            console.error(`[Worker] Failed to process run ${runId}:`, error);
        }
    }
}

/**
 * POST /api/director-node/run
 * Execute one or more nodes in a graph
 * 
 * Body: {
 *   graph_id: string,
 *   node_ids: string[] // Array of React Flow node IDs to execute
 * }
 * 
 * Response: {
 *   runs: [
 *     {
 *       run_id: string,
 *       node_id: string,
 *       status: 'success' | 'failed',
 *       asset_id?: string,
 *       asset_url?: string,
 *       error?: string
 *     }
 *   ]
 * }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { graph_id, node_ids } = body;

        // Validation
        if (!graph_id || !node_ids || !Array.isArray(node_ids) || node_ids.length === 0) {
            return NextResponse.json(
                { error: 'graph_id and node_ids (array) are required' },
                { status: 400 }
            );
        }

        // Authenticate user
        const supabase = await supabaseServer();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }



        // Fetch graph (verify ownership via RLS)
        const { data: graph, error: graphError } = await supabase
            .from('director_node_graphs')
            .select('*')
            .eq('id', graph_id)
            .single();

        if (graphError || !graph) {
            console.error('[Director Node] Graph not found:', graphError);
            return NextResponse.json(
                { error: 'Graph not found or unauthorized' },
                { status: 404 }
            );
        }

        // Parse graph_json
        const graphJson = graph.graph_json as {
            nodes: any[];
            edges: any[];
            viewport?: any;
        };

        // Find requested nodes
        const nodesToExecute = graphJson.nodes.filter((n: any) =>
            node_ids.includes(n.id)
        );

        if (nodesToExecute.length === 0) {
            return NextResponse.json(
                { error: 'No matching nodes found in graph' },
                { status: 400 }
            );
        }

        // Create runs with queued status (async pattern)
        const runs = [];

        for (const node of nodesToExecute) {
            console.log(`[Director Node] Queuing node: ${node.id} (${node.type})`);

            // Create placeholder asset for generation nodes
            let placeholderAssetId: string | null = null;

            if (node.type === 'ImageGen' || node.type === 'VideoGen') {
                const { data: asset, error: assetError } = await supabase
                    .from('assets')
                    .insert({
                        user_id: user.id,
                        project_id: graph.project_id,
                        kind: node.type === 'ImageGen' ? 'image' : 'video',
                        role: 'generated',
                        status: 'generating', // Placeholder
                        origin_provider: 'r2',
                        meta: {
                            node_id: node.id,
                            source: 'director_node_v1',
                        },
                    })
                    .select('id')
                    .single();

                if (!assetError && asset) {
                    placeholderAssetId = asset.id;
                }
            }

            // Create run record with queued status
            const { data: run, error: runError } = await supabase
                .from('director_node_runs')
                .insert({
                    user_id: user.id,
                    project_id: graph.project_id,
                    graph_id: graph.id,
                    node_id: node.id,
                    node_type: node.type,
                    provider: node.data?.provider || null,
                    status: 'queued', // NOT executing yet
                    placeholder_asset_id: placeholderAssetId,
                    meta: {
                        graph_json: graphJson, // Store for worker
                    },
                })
                .select()
                .single();

            if (runError) {
                console.error('[Director Node] Error creating run:', runError);
                runs.push({
                    node_id: node.id,
                    status: 'failed',
                    error: 'Failed to create run record'
                });
            } else {
                runs.push({
                    run_id: run.id,
                    node_id: node.id,
                    status: 'queued',
                    asset_id: placeholderAssetId,
                });
            }
        }

        // Trigger background worker (fire-and-forget)
        const runIds = runs.filter(r => r.run_id).map(r => r.run_id);
        if (runIds.length > 0) {
            processRunsAsync(runIds).catch(console.error);
        }

        return NextResponse.json({ runs });
    } catch (error: any) {
        console.error('[Director Node] POST /run error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/director-node/run?graph_id=<uuid>
 * Get all runs for a graph
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const graphId = searchParams.get('graph_id');

        if (!graphId) {
            return NextResponse.json(
                { error: 'graph_id is required' },
                { status: 400 }
            );
        }

        // Authenticate user
        const supabase = await supabaseServer();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }



        // Fetch runs (RLS will filter by user_id automatically)
        const { data: runs, error } = await supabase
            .from('director_node_runs')
            .select('*')
            .eq('graph_id', graphId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Director Node] Error fetching runs:', error);
            return NextResponse.json(
                { error: 'Failed to fetch runs' },
                { status: 500 }
            );
        }

        return NextResponse.json({ runs: runs || [] });
    } catch (error: any) {
        console.error('[Director Node] GET /run error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
