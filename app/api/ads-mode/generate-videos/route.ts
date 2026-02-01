import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/supabase/auth';
import { createMinimaxClient } from '@/lib/minimax';
import { uploadMedia } from '@/lib/storage/media-store';

/**
 * POST /api/ads-mode/generate-videos
 * 
 * Generate videos from Gemini shots using Minimax
 * 
 * Request body:
 * {
 *   "variantId": "uuid"
 * }
 * 
 * Workflow:
 * 1. Get variant with 4 shots (hook/proof/variation/winner)
 * 2. For each shot → Create Minimax video task
 * 3. Poll until complete
 * 4. Download video → Upload to R2
 * 5. Update variant with video URLs
 */
export async function POST(request: NextRequest) {
    try {
        // Get authenticated user
        console.log('[Generate Videos API] Checking authentication...');
        const supabase = await supabaseServer();
        const user = await getAuthenticatedUser(supabase);

        if (!user) {
            console.error('[Generate Videos API] No user found');
            return NextResponse.json({
                ok: false,
                error: 'UNAUTHORIZED',
                message: 'Authentication required'
            }, { status: 401 });
        }

        const userId = user.id;

        // Parse request body
        const { variantId, shotTypes } = await request.json();

        if (!variantId) {
            return NextResponse.json({
                ok: false,
                error: 'INVALID_REQUEST',
                message: 'variantId is required'
            }, { status: 400 });
        }

        // shotTypes is optional - if not provided, generate all 4 shots
        const shotsToGenerate = shotTypes || ['hook', 'proof', 'variation', 'winner'];

        console.log(`[Generate Videos API] Generating videos for variant ${variantId}, shots: ${shotsToGenerate.join(', ')}`);

        // Create Supabase admin client
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Fetch variant with shots
        const { data: variant, error: fetchError } = await supabaseAdmin
            .from('ad_variants')
            .select('id, ad_pack_id, meta, status')
            .eq('id', variantId)
            .single();

        if (fetchError || !variant) {
            console.error('[Generate Videos API] Fetch error:', fetchError);
            return NextResponse.json({
                ok: false,
                error: 'VARIANT_NOT_FOUND',
                message: 'Variant not found'
            }, { status: 404 });
        }

        // Verify ownership via ad_pack
        const { data: adPack } = await supabaseAdmin
            .from('ad_packs')
            .select('user_id')
            .eq('id', variant.ad_pack_id)
            .single();

        if (!adPack || adPack.user_id !== userId) {
            return NextResponse.json({
                ok: false,
                error: 'UNAUTHORIZED',
                message: 'You do not own this variant'
            }, { status: 403 });
        }

        // Check if shots exist
        const shots = variant.meta?.shots;
        if (!shots || !shots.hook || !shots.proof || !shots.variation || !shots.winner) {
            return NextResponse.json({
                ok: false,
                error: 'SHOTS_NOT_READY',
                message: 'Variant must have all 4 shots generated first'
            }, { status: 400 });
        }

        // Update status to video_generating
        await supabaseAdmin
            .from('ad_variants')
            .update({ status: 'video_generating' })
            .eq('id', variantId);

        // Start async video generation
        generateVideosAsync({
            variantId,
            shots,
            shotTypes: shotsToGenerate,
            admin: supabaseAdmin
        }).catch(err => {
            console.error('[Generate Videos API] Async error:', err);
        });

        return NextResponse.json({
            ok: true,
            message: 'Video generation started',
            variantId,
            shotTypes: shotsToGenerate
        });

    } catch (error: any) {
        console.error('[Generate Videos API] Unexpected error:', error);
        return NextResponse.json({
            ok: false,
            error: 'INTERNAL_ERROR',
            message: error.message || 'An unexpected error occurred'
        }, { status: 500 });
    }
}

/**
 * Async function to generate videos from shots
 */
async function generateVideosAsync(params: {
    variantId: string;
    shots: any;
    shotTypes: string[];
    admin: any;
}) {
    const { variantId, shots, shotTypes, admin } = params;

    try {
        const apiKey = process.env.MINIMAX_API_KEY;
        if (!apiKey) {
            throw new Error('MINIMAX_API_KEY not configured');
        }

        const minimax = createMinimaxClient(apiKey);
        const videoUrls: any = {};

        // Generate video ONLY for selected shots
        for (const shotType of shotTypes) {
            const shot = shots[shotType];
            if (!shot?.image_url) {
                console.warn(`[Generate Videos] No image for ${shotType}, skipping`);
                continue;
            }

            console.log(`[Generate Videos] Generating video for ${shotType}...`);

            try {
                // Simple prompt for Minimax (image already contains all visual info)
                const videoPrompt = `Smooth camera movement, professional product video, cinematic lighting`;

                // Create Minimax task
                const { task_id } = await minimax.createVideoTask({
                    prompt: videoPrompt,
                    model: 'MiniMax-Hailuo-2.3-Fast',
                    firstFrameImage: shot.image_url,
                    duration: 6, // Minimax Fast supports 6s or 10s only
                    resolution: '1080P'
                });

                console.log(`[Generate Videos] Minimax task created: ${task_id} for ${shotType}`);

                // Update DB with initial status
                const { data: initialVariant } = await admin
                    .from('ad_variants')
                    .select('meta')
                    .eq('id', variantId)
                    .single();

                await admin
                    .from('ad_variants')
                    .update({
                        meta: {
                            ...(initialVariant?.meta || {}),
                            video_statuses: {
                                ...(initialVariant?.meta?.video_statuses || {}),
                                [shotType]: 'Preparing'
                            }
                        }
                    })
                    .eq('id', variantId);

                // Poll with status updates
                let taskStatus = 'Preparing';
                const startTime = Date.now();
                const maxWaitTime = 300000; // 5 minutes

                while (taskStatus !== 'Success' && taskStatus !== 'Failed') {
                    if (Date.now() - startTime > maxWaitTime) {
                        throw new Error('Video generation timeout');
                    }

                    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s

                    const statusResult = await minimax.pollTaskStatus(task_id);
                    taskStatus = statusResult.status;

                    // Update DB with current status
                    const { data: cv } = await admin
                        .from('ad_variants')
                        .select('meta')
                        .eq('id', variantId)
                        .single();

                    await admin
                        .from('ad_variants')
                        .update({
                            meta: {
                                ...(cv?.meta || {}),
                                video_statuses: {
                                    ...(cv?.meta?.video_statuses || {}),
                                    [shotType]: taskStatus
                                }
                            }
                        })
                        .eq('id', variantId);

                    console.log(`[Generate Videos] ${shotType} status: ${taskStatus}`);

                    if (taskStatus === 'Success') {
                        break;
                    } else if (taskStatus === 'Failed') {
                        throw new Error(`Minimax task failed: ${statusResult.error || 'Unknown error'}`);
                    }
                }

                const completedTask = await minimax.pollTaskStatus(task_id);

                if (completedTask.status === 'Failed') {
                    throw new Error(`Minimax task failed: ${completedTask.error}`);
                }

                if (!completedTask.file_id) {
                    throw new Error('No file_id returned');
                }

                // Download video
                const downloadUrl = await minimax.getDownloadUrl(completedTask.file_id);
                const videoBuffer = await minimax.downloadVideo(downloadUrl);

                console.log(`[Generate Videos] Video downloaded (${videoBuffer.length} bytes) for ${shotType}`);

                // Upload to R2 via media-store
                const filename = `${variantId}-${shotType}.mp4`;
                const result = await uploadMedia({
                    buffer: videoBuffer,
                    filename,
                    contentType: 'video/mp4',
                    path: `ads/videos/${variantId}`
                });

                videoUrls[shotType] = result.url;

                console.log(`[Generate Videos] ✓ ${shotType} video uploaded to ${result.provider}: ${result.url}`);

                // Update DB immediately after each video (for real-time progress)
                const { data: currentVariant } = await admin
                    .from('ad_variants')
                    .select('meta')
                    .eq('id', variantId)
                    .single();

                await admin
                    .from('ad_variants')
                    .update({
                        meta: {
                            ...(currentVariant?.meta || {}),
                            videos: videoUrls
                        }
                    })
                    .eq('id', variantId);

                console.log(`[Generate Videos] ✓ Updated DB with ${shotType} video`);

            } catch (shotError: any) {
                console.error(`[Generate Videos] Failed to generate ${shotType}:`, shotError);
                videoUrls[shotType] = null;
            }
        }

        // Update variant with video URLs
        const { data: currentVariant } = await admin
            .from('ad_variants')
            .select('meta')
            .eq('id', variantId)
            .single();

        await admin
            .from('ad_variants')
            .update({
                status: 'video_ready',
                meta: {
                    ...(currentVariant?.meta || {}),
                    videos: videoUrls
                }
            })
            .eq('id', variantId);

        console.log(`[Generate Videos] ✓ All videos generated for variant ${variantId}`);

    } catch (error: any) {
        console.error(`[Generate Videos] Fatal error for variant ${variantId}:`, error);

        await admin
            .from('ad_variants')
            .update({
                status: 'video_failed',
                meta: {
                    ...shots,
                    video_error: error.message
                }
            })
            .eq('id', variantId);
    }
}
