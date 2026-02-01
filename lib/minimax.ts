/**
 * MiniMax (Hailuo 2.3) Video Generation Client
 * Supports Preview (Fast) and Final (Max Quality) modes
 */

const MINIMAX_BASE_URL = "https://api.minimax.io";

export type MinimaxModel = "MiniMax-Hailuo-2.3-Fast" | "MiniMax-Hailuo-2.3";

export interface MinimaxVideoParams {
    prompt: string;
    model: MinimaxModel;
    firstFrameImage?: string; // Optional - URL to anchor frame. If omitted, generates scenes from prompt
    duration?: number; // 5 or 10 seconds
    resolution?: string; // Default: "1080P"
}

export interface MinimaxTaskResponse {
    task_id: string;
}

export interface MinimaxTaskStatus {
    status: "Queueing" | "Processing" | "Success" | "Failed";
    file_id?: string;
    error?: string;
    progress?: number;
}

export function createMinimaxClient(apiKey: string) {
    const headers = {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
    };

    return {
        /**
         * Step A: Create video generation task
         */
        async createVideoTask(params: MinimaxVideoParams): Promise<MinimaxTaskResponse> {
            console.log('[MiniMax] Creating video task with params:', {
                model: params.model,
                prompt: params.prompt.substring(0, 100) + '...',
                firstFrameImage: params.firstFrameImage ? params.firstFrameImage.substring(0, 50) + '...' : 'NONE (scene generation mode)',
                duration: params.duration,
            });

            const requestBody: any = {
                model: params.model,
                prompt: params.prompt,
                duration: params.duration || 6, // Default to 6 seconds
                resolution: params.resolution || "1080P", // Default to 1080P
                prompt_optimizer: true, // Enable prompt optimization
            };

            // Only include first_frame_image if provided (for locked-frame mode)
            if (params.firstFrameImage) {
                requestBody.first_frame_image = params.firstFrameImage;
            }

            const response = await fetch(`${MINIMAX_BASE_URL}/v1/video_generation`, {
                method: "POST",
                headers,
                body: JSON.stringify(requestBody),
            });

            console.log('[MiniMax] API Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[MiniMax] API Error Response:', errorText);
                throw new Error(`MiniMax API error (${response.status}): ${errorText}`);
            }

            const data = await response.json();
            console.log('[MiniMax] API Response data:', JSON.stringify(data, null, 2));

            // Check base_resp.status_code first (0 = success, non-zero = error)
            if (data.base_resp && data.base_resp.status_code !== 0) {
                const errorMsg = data.base_resp.status_msg || 'Unknown error';
                console.error('[MiniMax] API Error:', {
                    status_code: data.base_resp.status_code,
                    status_msg: errorMsg,
                    full_response: data
                });
                throw new Error(`MiniMax API error (code ${data.base_resp.status_code}): ${errorMsg}`);
            }

            if (!data.task_id) {
                console.error('[MiniMax] No task_id in response. Full response:', data);
                throw new Error("MiniMax: No task_id returned");
            }

            console.log('[MiniMax] Task created successfully:', data.task_id);
            return { task_id: data.task_id };
        },

        /**
         * Step B: Poll task status
         */
        async pollTaskStatus(taskId: string): Promise<MinimaxTaskStatus> {
            const response = await fetch(
                `${MINIMAX_BASE_URL}/v1/query/video_generation?task_id=${taskId}`,
                { headers }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`MiniMax poll error (${response.status}): ${errorText}`);
            }

            const data = await response.json();

            // Log full response if task failed for debugging
            if (data.status === "Failed" || data.status === "Fail") {
                console.error('[MiniMax] Task failed, full API response:', JSON.stringify(data, null, 2));
            }

            return {
                status: data.status,
                file_id: data.file_id,
                error: data.error_message || data.error,
                progress: data.progress,
            };
        },

        /**
         * Poll until task completes (with timeout)
         */
        async pollTaskUntilComplete(
            taskId: string,
            pollInterval: number = 5000,
            maxWaitTime: number = 900000 // 15 minutes
        ): Promise<MinimaxTaskStatus> {
            const startTime = Date.now();

            while (true) {
                const elapsed = Date.now() - startTime;

                if (elapsed > maxWaitTime) {
                    throw new Error(`MiniMax: Task ${taskId} timed out after ${maxWaitTime}ms`);
                }

                const status = await this.pollTaskStatus(taskId);

                console.log(`[MiniMax] Task ${taskId} status: ${status.status} (${elapsed}ms elapsed)`);

                if (status.status === "Success") {
                    return status;
                }

                if (status.status === "Failed") {
                    // Log full error details for debugging
                    console.error('[MiniMax] Task failed with details:', {
                        taskId,
                        error: status.error,
                        fullStatus: status
                    });
                    throw new Error(`MiniMax: Task failed - ${status.error || "Unknown error"}`);
                }

                // Wait before next poll
                await new Promise((resolve) => setTimeout(resolve, pollInterval));
            }
        },

        /**
         * Step C: Get download URL from file_id
         */
        async getDownloadUrl(fileId: string): Promise<string> {
            const response = await fetch(
                `${MINIMAX_BASE_URL}/v1/files/retrieve?file_id=${fileId}`,
                { headers }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`MiniMax file retrieve error (${response.status}): ${errorText}`);
            }

            const data = await response.json();

            if (!data.file || !data.file.download_url) {
                throw new Error("MiniMax: No download URL in response");
            }

            return data.file.download_url;
        },

        /**
         * Download video from URL
         */
        async downloadVideo(url: string): Promise<Buffer> {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Failed to download video: ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
        },
    };
}
