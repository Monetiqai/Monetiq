/**
 * Director Node V1 - Background Worker
 * Processes queued runs asynchronously
 */

import { createClient } from '@supabase/supabase-js';
import { executeNode, resolveNodeInputs, RuntimeContext, NodeExecutionResult } from './executor';

function supabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(url, serviceKey, { auth: { persistSession: false } });
}

/**
 * Load previous completed runs for nodes in the graph
 * This prevents re-executing nodes that already have validated results
 */
async function loadPreviousRuns(
    graphId: string,
    graphJson: any,
    context: RuntimeContext
): Promise<void> {
    const supabase = supabaseAdmin();

    // Get all node IDs in the graph
    const nodeIds = graphJson.nodes.map((n: any) => n.id);

    // Fetch the most recent completed run for each node
    const { data: previousRuns } = await supabase
        .from('director_node_runs')
        .select('*')
        .eq('graph_id', graphId)
        .eq('status', 'completed')
        .in('node_id', nodeIds)
        .order('completed_at', { ascending: false });

    if (!previousRuns || previousRuns.length === 0) {
        console.log('[Worker] No previous completed runs found');
        return;
    }

    // Group by node_id and take the most recent for each
    const latestRunsByNode = new Map<string, any>();
    for (const run of previousRuns) {
        if (!latestRunsByNode.has(run.node_id)) {
            latestRunsByNode.set(run.node_id, run);
        }
    }

    // Pre-populate context.nodeResults with previous outputs
    for (const [nodeId, run] of latestRunsByNode.entries()) {
        if (run.output_payload) {
            context.nodeResults.set(nodeId, {
                nodeId: nodeId,
                state: 'success' as const,
                outputs: run.output_payload,
            });
            console.log(`[Worker] ✓ Loaded cached result for node ${nodeId} (from run ${run.id})`);
        }
    }


    console.log(`[Worker] Loaded ${context.nodeResults.size} cached results from previous runs`);
}

/**
 * Execute a node and all its dependencies recursively
 */
async function executeNodeWithDependencies(
    node: any,
    graphJson: any,
    context: RuntimeContext
): Promise<NodeExecutionResult> {
    // Check if already executed (from cache or previous execution in this run)
    if (context.nodeResults.has(node.id)) {
        console.log(`[Worker] Node ${node.id} already executed, using cached result`);
        return context.nodeResults.get(node.id)!;
    }

    console.log(`[Worker] Executing node ${node.id} (${node.type})`)

        ;

    // Find all incoming edges (dependencies)
    const incomingEdges = graphJson.edges.filter((e: any) => e.target === node.id);

    // Execute all dependencies first
    for (const edge of incomingEdges) {
        const sourceNode = graphJson.nodes.find((n: any) => n.id === edge.source);
        if (!sourceNode) {
            throw new Error(`Source node ${edge.source} not found`);
        }

        // Recursively execute dependency
        await executeNodeWithDependencies(sourceNode, graphJson, context);
    }

    // Now all dependencies are executed, resolve inputs
    const inputs = resolveNodeInputs(node.id, node.type, graphJson.edges, context);

    console.log(`[Worker] Node ${node.id} inputs:`, inputs);

    // Execute this node
    const result = await executeNode(node, inputs || {}, context);

    // Store result in context
    context.nodeResults.set(node.id, result);

    return result;
}


export async function processRun(runId: string) {
    const supabase = supabaseAdmin();

    console.log(`[Worker] Attempting to claim run ${runId}`);

    // Atomically claim the run (prevent duplicate processing)
    const { data: run, error: claimError } = await supabase
        .from('director_node_runs')
        .update({
            status: 'processing',
            started_at: new Date().toISOString()
        })
        .eq('id', runId)
        .eq('status', 'queued') // Only claim if still queued
        .select()
        .single();

    if (claimError || !run) {
        console.log(`[Worker] Run ${runId} already claimed or not found`);
        return;
    }

    console.log(`[Worker] Processing run ${runId} for node ${run.node_id}`);

    try {
        // Reconstruct graph context from meta
        const graphJson = run.meta?.graph_json;
        if (!graphJson) {
            throw new Error('No graph_json in run meta');
        }

        // Find the node
        const node = graphJson.nodes.find((n: any) => n.id === run.node_id);
        if (!node) {
            throw new Error(`Node ${run.node_id} not found in graph`);
        }

        // Create runtime context
        const context: RuntimeContext = {
            runId: run.id,
            graphId: run.graph_id,
            userId: run.user_id,
            projectId: run.project_id,
            nodeResults: new Map(),
        };

        // Load previous completed runs to avoid re-executing validated nodes
        await loadPreviousRuns(run.graph_id, graphJson, context);

        console.log(`[Worker] Executing node ${node.id} (${node.type}) with dependencies`);


        // Execute node and all its dependencies recursively
        const result = await executeNodeWithDependencies(node, graphJson, context);

        if (result.state !== 'success') {
            throw new Error(result.error || 'Node execution failed');
        }

        console.log(`[Worker] Node executed successfully`);

        // POST-PROCESSING: Handle VideoGen async generation
        if (node.type === 'VideoGen' && result.outputs?.video_asset) {
            const videoAsset = result.outputs.video_asset;

            if (videoAsset.status === 'generating' && videoAsset.asset_id) {
                console.log(`[Worker] Starting Minimax video generation for asset ${videoAsset.asset_id}`);

                try {
                    console.log('[VideoGen] JOB START', { runId, assetId: videoAsset.asset_id });
                    // Get asset metadata
                    const { data: assetData } = await supabase
                        .from('assets')
                        .select('meta')
                        .eq('id', videoAsset.asset_id)
                        .single();

                    const meta = assetData?.meta || {};

                    // Recalculate node inputs to get the prompt from CameraMovement
                    const { resolveNodeInputs } = await import('./executor');
                    const nodeInputs = resolveNodeInputs(node.id, node.type, graphJson.edges, context);

                    // Use prompt from node inputs (camera movement) or fallback to meta.prompt
                    const prompt = nodeInputs?.prompt || meta.prompt || 'Generate video from keyframe';

                    console.log('[VideoGen] Using prompt:', prompt);

                    // Call Minimax provider
                    const { generateVideoWithMinimax } = await import('@/lib/generation/video-providers');
                    const videoResult = await generateVideoWithMinimax({
                        imageUrl: meta.keyframe,
                        prompt: prompt,
                        model: meta.model || 'MiniMax-Hailuo-2.3-Fast',
                        duration: meta.duration || 6,
                    });

                    console.log(`[Worker] Video generated (${videoResult.videoBuffer.length} bytes)`);

                    // ===== FINALIZE PHASE START =====
                    console.log('[VideoGen] FINALIZE: start', {
                        runId,
                        assetId: videoAsset.asset_id,
                        bytes: videoResult.videoBuffer.length
                    });

                    // Upload to R2
                    const { uploadMedia } = await import('@/lib/storage/media-store');
                    const uploadResult = await uploadMedia({
                        buffer: videoResult.videoBuffer,
                        filename: `${videoAsset.asset_id}.mp4`,
                        contentType: 'video/mp4',
                        path: 'director-node/outputs',
                    });

                    console.log(`[Worker] Video uploaded to R2: ${uploadResult.url}`);
                    console.log('[VideoGen] FINALIZE: uploaded', {
                        r2Key: uploadResult.key,
                        assetUrl: uploadResult.url
                    });

                    // Update asset to ready (ATOMIC)
                    const { error: assetUpdateError } = await supabase
                        .from('assets')
                        .update({
                            status: 'ready',
                            public_url: uploadResult.url,
                            r2_key: uploadResult.key,
                            r2_bucket: process.env.R2_BUCKET || 'monetiqai',
                            mime_type: 'video/mp4',
                            byte_size: videoResult.videoBuffer.length,
                            meta: {
                                ...meta,
                                task_id: videoResult.taskId,
                                file_id: videoResult.fileId,
                                status: 'ready',
                            },
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', videoAsset.asset_id)
                        .select()
                        .single();

                    if (assetUpdateError) {
                        throw new Error(`Failed to update asset: ${assetUpdateError.message}`);
                    }

                    console.log(`[Worker] Asset ${videoAsset.asset_id} updated to ready`);
                    console.log('[VideoGen] FINALIZE: assets updated', {
                        assetId: videoAsset.asset_id,
                        status: 'ready',
                        assetUrl: uploadResult.url
                    });

                    // Update run with asset URL (ATOMIC)
                    const { error: runUpdateError } = await supabase
                        .from('director_node_runs')
                        .update({
                            status: 'completed',
                            provider: 'minimax',
                            asset_url: uploadResult.url,
                            output_payload: {
                                ...result.outputs,
                                video_asset: {
                                    asset_id: videoAsset.asset_id,
                                    url: uploadResult.url,
                                    r2_key: uploadResult.key,
                                    status: 'ready',
                                }
                            },
                            completed_at: new Date().toISOString(),
                        })
                        .eq('id', runId)
                        .select()
                        .single();

                    if (runUpdateError) {
                        throw new Error(`Failed to update run: ${runUpdateError.message}`);
                    }

                    console.log('[VideoGen] FINALIZE: run updated', {
                        runId,
                        status: 'completed',
                        assetUrl: uploadResult.url
                    });
                    console.log('[VideoGen] JOB DONE', { runId });
                    console.log(`[Worker] ✅ Run ${runId} completed with video generation`);
                    return; // Early return - already updated

                } catch (videoError: any) {
                    console.error('[VideoGen] FINALIZE FAILED', videoError);
                    console.error(`[Worker] Video generation failed:`, videoError);

                    // Update asset to failed
                    await supabase
                        .from('assets')
                        .update({
                            status: 'failed',
                            meta: { error: videoError.message, source: 'director_node_v1' },
                        })
                        .eq('id', videoAsset.asset_id);

                    // Update run to failed (ATOMIC)
                    await supabase
                        .from('director_node_runs')
                        .update({
                            status: 'failed',
                            error_message: videoError.message || 'Video generation failed',
                            completed_at: new Date().toISOString(),
                        })
                        .eq('id', runId);

                    console.log('[VideoGen] FINALIZE: end (error)', { runId });
                    return;
                } finally {
                    console.log('[VideoGen] FINALIZE: end', { runId });
                }
            }
        }

        // Update run with success (non-VideoGen or already processed)
        await supabase
            .from('director_node_runs')
            .update({
                status: 'completed',
                output_payload: result.outputs,
                completed_at: new Date().toISOString(),
            })
            .eq('id', runId);

        console.log(`[Worker] ✅ Run ${runId} completed successfully`);

    } catch (error: any) {
        console.error(`[Worker] ❌ Run ${runId} failed:`, error.message);

        // Update run with error
        await supabase
            .from('director_node_runs')
            .update({
                status: 'failed',
                error_message: error.message,
                completed_at: new Date().toISOString(),
            })
            .eq('id', runId);

        // Update placeholder asset to failed if exists
        if (run.placeholder_asset_id) {
            await supabase
                .from('assets')
                .update({
                    status: 'failed',
                    meta: { error: error.message, source: 'director_node_v1' },
                })
                .eq('id', run.placeholder_asset_id);
        }
    }
}

