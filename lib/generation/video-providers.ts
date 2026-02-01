/**
 * Shared Video Generation Providers
 * Extracted from Director Mode for reuse across platform
 */

import { createMinimaxClient, MinimaxModel } from '../minimax';

export interface VideoGenerationParams {
    imageUrl: string;        // Keyframe URL (reference_image)
    prompt: string;          // Text prompt
    model?: MinimaxModel;    // Default: 'MiniMax-Hailuo-2.3-Fast'
    duration?: number;       // 6 or 10 seconds (default: 6)
    resolution?: string;     // '1080P' or '768P' (auto-determined)
}

export interface VideoGenerationResult {
    videoBuffer: Buffer;
    fileId: string;
    taskId: string;
    provider: string;
}

/**
 * Generate video using Minimax (Hailuo 2.3)
 * Async function that polls until completion (max 15 minutes)
 * Extracted from /app/api/generate/videos/minimax/route.ts
 */
export async function generateVideoWithMinimax(
    params: VideoGenerationParams
): Promise<VideoGenerationResult> {
    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) {
        throw new Error('MINIMAX_API_KEY not configured');
    }

    const model = params.model || 'MiniMax-Hailuo-2.3';
    const duration = params.duration || 6;

    console.log('[VideoGen] Using Minimax (Hailuo 2.3)');
    console.log(`[VideoGen] Model: ${model}, Duration: ${duration}s`);

    const client = createMinimaxClient(apiKey);

    // Determine resolution based on model and duration
    // MiniMax-Hailuo-2.3 and Fast don't support 10s at 1080P
    const resolution = params.resolution || (
        (model === 'MiniMax-Hailuo-2.3' || model === 'MiniMax-Hailuo-2.3-Fast') && duration === 10
            ? '768P'
            : '1080P'
    );

    console.log(`[VideoGen] Using resolution: ${resolution}`);

    // Step 1: Create video generation task
    const { task_id } = await client.createVideoTask({
        prompt: params.prompt,
        model,
        firstFrameImage: params.imageUrl,
        duration,
        resolution,
    });

    console.log(`[VideoGen] Task created: ${task_id}`);

    // Step 2: Poll until complete (max 15 minutes)
    const completedTask = await client.pollTaskUntilComplete(task_id, 5000, 900000);

    if (completedTask.status === 'Failed') {
        throw new Error(`Minimax task failed: ${completedTask.error || 'Unknown error'}`);
    }

    if (!completedTask.file_id) {
        throw new Error('Minimax: no file_id returned');
    }

    console.log(`[VideoGen] Task completed, file_id: ${completedTask.file_id}`);

    // Step 3: Get download URL
    const downloadUrl = await client.getDownloadUrl(completedTask.file_id);
    console.log(`[VideoGen] Download URL obtained`);

    // Step 4: Download video
    const videoBuffer = await client.downloadVideo(downloadUrl);
    console.log(`[VideoGen] Video downloaded (${videoBuffer.length} bytes)`);

    return {
        videoBuffer,
        fileId: completedTask.file_id,
        taskId: task_id,
        provider: 'minimax',
    };
}

