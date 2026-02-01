import type {
    RunwayImageToVideoParams,
    RunwayTask,
    RunwayResponse,
} from './types';
import { isRunwayError } from './types';

const RUNWAY_API_BASE = 'https://api.dev.runwayml.com/v1';

export class RunwayClient {
    private apiKey: string;

    constructor(apiKey: string) {
        if (!apiKey) {
            throw new Error('Runway API key is required');
        }
        this.apiKey = apiKey;
    }

    /**
     * Create an image-to-video generation task
     */
    async imageToVideo(params: RunwayImageToVideoParams): Promise<RunwayTask> {
        const response = await fetch(`${RUNWAY_API_BASE}/image_to_video`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'X-Runway-Version': '2024-11-06',
            },
            body: JSON.stringify({
                promptImage: params.promptImage,
                promptText: params.promptText,
                model: params.model ?? 'gen3a_turbo',
                duration: params.duration ?? 5,
                ratio: params.ratio ?? '16:9',
                watermark: params.watermark ?? false,
            }),
        });

        const data: RunwayResponse<RunwayTask> = await response.json();

        if (!response.ok || isRunwayError(data)) {
            console.error('[Runway] API error response:', {
                status: response.status,
                statusText: response.statusText,
                body: data,
            });
            const error = isRunwayError(data) ? data.error.message : `HTTP ${response.status}: ${JSON.stringify(data)}`;
            throw new Error(`Runway API error: ${error}`);
        }

        return data as RunwayTask;
    }

    /**
     * Get the status of a task
     */
    async getTaskStatus(taskId: string): Promise<RunwayTask> {
        const response = await fetch(`${RUNWAY_API_BASE}/tasks/${taskId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'X-Runway-Version': '2024-11-06',
            },
        });

        const data: RunwayResponse<RunwayTask> = await response.json();

        if (!response.ok || isRunwayError(data)) {
            const error = isRunwayError(data) ? data.error.message : 'Unknown error';
            throw new Error(`Runway API error: ${error}`);
        }

        return data as RunwayTask;
    }

    /**
     * Poll task status until completion
     * @param taskId Task ID to poll
     * @param intervalMs Polling interval in milliseconds (default: 5000)
     * @param timeoutMs Timeout in milliseconds (default: 300000 = 5 minutes)
     */
    async pollTaskUntilComplete(
        taskId: string,
        intervalMs: number = 5000,
        timeoutMs: number = 300000
    ): Promise<RunwayTask> {
        const startTime = Date.now();

        while (true) {
            const task = await this.getTaskStatus(taskId);

            // Check if task is complete
            if (task.status === 'SUCCEEDED' || task.status === 'FAILED') {
                return task;
            }

            // Check timeout
            if (Date.now() - startTime > timeoutMs) {
                throw new Error(`Task ${taskId} timed out after ${timeoutMs}ms`);
            }

            // Wait before next poll
            await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }
    }

    /**
     * Download video from URL
     */
    async downloadVideo(url: string): Promise<Buffer> {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to download video: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }
}

// Export singleton instance (optional)
export function createRunwayClient(apiKey?: string): RunwayClient {
    const key = apiKey || process.env.RUNWAY_API_KEY;
    if (!key) {
        throw new Error('RUNWAY_API_KEY environment variable is not set');
    }
    return new RunwayClient(key);
}
