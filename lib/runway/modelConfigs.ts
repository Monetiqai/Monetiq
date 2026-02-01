export interface ModelConfig {
    model: 'gen4_turbo' | 'gen3a_turbo' | 'veo3' | 'veo3.1';
    color: string;
    label: string;
    badge: string;
    defaultRatio: string;
    defaultQuality: string;
    defaultDuration: number;
    availableRatios: string[];
    availableQualities: string[];
    availableDurations: number[];
}

export const MODEL_CONFIGS: Record<'gen4_turbo' | 'gen3a_turbo' | 'veo3' | 'veo3.1', ModelConfig> = {
    gen4_turbo: {
        model: 'gen4_turbo',
        color: '#87CEEB',
        label: 'Gen-4 Turbo',
        badge: '⚡ Fastest',
        defaultRatio: '720:1280',
        defaultQuality: '720p',
        defaultDuration: 4,
        availableRatios: ['1280:720', '720:1280', '1104:832', '832:1104', '960:960', '1584:672'],
        availableQualities: ['720p'],
        availableDurations: [2, 3, 4, 5, 6, 7, 8, 9, 10],
    },
    gen3a_turbo: {
        model: 'gen3a_turbo',
        color: '#4FC3F7',
        label: 'Gen-3 Turbo',
        badge: '⚡ Fast',
        defaultRatio: '768:1280',
        defaultQuality: '720p',
        defaultDuration: 5,
        availableRatios: ['768:1280', '1280:768'],
        availableQualities: ['720p', '1080p'],
        availableDurations: [5, 10],
    },
    veo3: {
        model: 'veo3',
        color: '#29B6F6',
        label: 'Veo 3',
        badge: '🎨 Premium',
        defaultRatio: '1280:720',
        defaultQuality: '1080p',
        defaultDuration: 8,
        availableRatios: ['1280:720', '720:1280', '1080:1920', '1920:1080'],
        availableQualities: ['1080p'],
        availableDurations: [8],
    },
    'veo3.1': {
        model: 'veo3.1',
        color: '#0288D1',
        label: 'Veo 3.1',
        badge: '💎 Ultra Premium',
        defaultRatio: '1280:720',
        defaultQuality: '1080p',
        defaultDuration: 4,
        availableRatios: ['1280:720', '720:1280', '1080:1920', '1920:1080'],
        availableQualities: ['1080p', '4K'],
        availableDurations: [4, 6, 8],
    },
} as const;
