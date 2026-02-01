// Runway API Types
// https://docs.runwayml.com/reference/image-to-video

export interface RunwayImageToVideoParams {
    promptImage: string; // URL to the image
    promptText?: string; // Optional text prompt
    model?: 'gen4_turbo' | 'gen3a_turbo' | 'veo3' | 'veo3.1'; // Available models
    duration?: number; // Duration in seconds (2-10 depending on model)
    ratio?: '1280:720' | '720:1280' | '1104:832' | '832:1104' | '960:960' | '1584:672' | '16:9' | '9:16' | '768:1280' | '1280:768'; // All Runway ratios
    watermark?: boolean; // Add watermark (default: false)
}

export interface RunwayTask {
    id: string; // Task ID (e.g., "task_abc123")
    status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
    output?: string[]; // Array of output video URLs
    failure?: string; // Error message if failed
    failureCode?: string; // Error code if failed
    createdAt?: string; // ISO timestamp
    startedAt?: string; // ISO timestamp
    completedAt?: string; // ISO timestamp
}

export interface RunwayError {
    error: {
        message: string;
        code?: string;
    };
}

export type RunwayResponse<T> = T | RunwayError;

export function isRunwayError(response: any): response is RunwayError {
    return response && typeof response.error === 'object';
}
