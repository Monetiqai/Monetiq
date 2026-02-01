import { Template } from '@/lib/types/director-mode';

/**
 * Pre-configured templates for common cinematic workflows
 * Each template defines a multi-scene structure with recommended settings
 */
export const DIRECTOR_TEMPLATES: Record<string, Template> = {
    ad_15s: {
        id: 'ad_15s',
        name: '15s Ad',
        description: 'Quick product showcase with 3 dynamic shots',
        totalDuration: 15,
        sceneCount: 3,
        scenes: [
            {
                intent: 'Hero shot - product reveal',
                duration: 5,
                movement: 'dolly_in'
            },
            {
                intent: 'Detail shot - key feature',
                duration: 5,
                movement: 'zoom_in'
            },
            {
                intent: 'Lifestyle shot - product in use',
                duration: 5,
                movement: 'pan_right'
            },
        ],
    },

    trailer_30s: {
        id: 'trailer_30s',
        name: '30s Trailer',
        description: 'Cinematic story arc with 6 scenes',
        totalDuration: 30,
        sceneCount: 6,
        scenes: [
            {
                intent: 'Establishing shot',
                duration: 5,
                movement: 'drone_shot'
            },
            {
                intent: 'Character introduction',
                duration: 5,
                movement: 'dolly_in'
            },
            {
                intent: 'Tension build',
                duration: 5,
                movement: 'handheld'
            },
            {
                intent: 'Action peak',
                duration: 5,
                movement: 'orbit_around'
            },
            {
                intent: 'Emotional moment',
                duration: 5,
                movement: 'static'
            },
            {
                intent: 'Final reveal',
                duration: 5,
                movement: 'zoom_out'
            },
        ],
    },

    social_60s: {
        id: 'social_60s',
        name: '60s Social',
        description: 'Extended social media story with 4 acts',
        totalDuration: 60,
        sceneCount: 4,
        scenes: [
            {
                intent: 'Hook - grab attention',
                duration: 10,
                movement: 'zoom_in'
            },
            {
                intent: 'Story - build narrative',
                duration: 10,
                movement: 'pan_right'
            },
            {
                intent: 'Climax - peak moment',
                duration: 10,
                movement: 'orbit_around'
            },
            {
                intent: 'Call to action',
                duration: 10,
                movement: 'dolly_in'
            },
        ],
    },

    custom: {
        id: 'custom',
        name: 'Custom Multi-Scene',
        description: 'Define your own scene count and structure',
        totalDuration: 0,
        sceneCount: 0,
        scenes: [],
    },
};

/**
 * Get template by ID with fallback to single scene
 */
export function getTemplate(templateId: string | null): Template | null {
    if (!templateId) return null;
    return DIRECTOR_TEMPLATES[templateId] || null;
}

/**
 * Check if a template ID is valid
 */
export function isValidTemplate(templateId: string): boolean {
    return templateId in DIRECTOR_TEMPLATES;
}
