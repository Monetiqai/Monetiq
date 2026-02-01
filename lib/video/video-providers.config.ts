export type VideoProvider = 'minimax' | 'veo';
export type VideoResolution = '768p' | '1080p' | '720p' | '1440p';
export type VideoDuration = 3 | 5 | 6 | 8 | 10;

export interface ProviderResolutionConfig {
    resolution: VideoResolution;
    label: string;
    durations: VideoDuration[];
}

export interface ProviderConfig {
    id: VideoProvider;
    label: string;
    resolutions: ProviderResolutionConfig[];
    defaultResolution: VideoResolution;
    defaultDuration: VideoDuration;
}

export const VIDEO_PROVIDER_CONFIGS: Record<VideoProvider, ProviderConfig> = {
    minimax: {
        id: 'minimax',
        label: 'MiniMax-Hailuo-2.3',
        resolutions: [
            {
                resolution: '768p',
                label: '768p',
                durations: [6, 10]
            },
            {
                resolution: '1080p',
                label: '1080p',
                durations: [6]
            }
        ],
        defaultResolution: '768p',
        defaultDuration: 6
    },
    veo: {
        id: 'veo',
        label: 'Veo',
        resolutions: [
            // Placeholder - to be configured later
            {
                resolution: '1080p',
                label: '1080p',
                durations: [5, 8]
            }
        ],
        defaultResolution: '1080p',
        defaultDuration: 5
    }
};

// Helper function to get available durations for a provider/resolution
export function getAvailableDurations(provider: VideoProvider, resolution: VideoResolution): VideoDuration[] {
    const config = VIDEO_PROVIDER_CONFIGS[provider];
    const resConfig = config.resolutions.find(r => r.resolution === resolution);
    return resConfig?.durations || [];
}

// Helper function to validate provider/resolution/duration combination
export function isValidCombination(provider: VideoProvider, resolution: VideoResolution, duration: VideoDuration): boolean {
    const durations = getAvailableDurations(provider, resolution);
    return durations.includes(duration);
}

// Helper to get default values for a provider
export function getProviderDefaults(provider: VideoProvider): { resolution: VideoResolution; duration: VideoDuration } {
    const config = VIDEO_PROVIDER_CONFIGS[provider];
    return {
        resolution: config.defaultResolution,
        duration: config.defaultDuration
    };
}
