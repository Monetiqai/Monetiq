/**
 * Overlay Generation Utilities
 * 
 * Generate overlay specifications for text overlays (hook + CTA)
 * These specs are stored in the database but not yet burned into videos
 */

import { OverlaySpec } from '@/lib/types/ads-mode';

/**
 * Overlay Theme Configuration
 */
export interface OverlayTheme {
    name: string;
    hook: {
        textColor: string;
        backgroundColor: string;
        fontWeight: string;
    };
    cta: {
        textColor: string;
        backgroundColor: string;
        fontWeight: string;
    };
}

/**
 * Predefined overlay themes
 */
export const OVERLAY_THEMES: Record<string, OverlayTheme> = {
    default: {
        name: 'Default',
        hook: {
            textColor: '#FFFFFF',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            fontWeight: 'bold'
        },
        cta: {
            textColor: '#FFFFFF',
            backgroundColor: 'rgba(255, 167, 38, 0.9)', // Gold/orange
            fontWeight: 'bold'
        }
    },
    modern: {
        name: 'Modern',
        hook: {
            textColor: '#000000',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            fontWeight: '900'
        },
        cta: {
            textColor: '#FFFFFF',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            fontWeight: 'bold'
        }
    },
    vibrant: {
        name: 'Vibrant',
        hook: {
            textColor: '#FFFFFF',
            backgroundColor: 'rgba(255, 59, 92, 0.9)', // Pink/red
            fontWeight: 'bold'
        },
        cta: {
            textColor: '#FFFFFF',
            backgroundColor: 'rgba(0, 209, 178, 0.9)', // Teal
            fontWeight: 'bold'
        }
    }
};

/**
 * Generate overlay specification for a variant
 */
export function generateOverlaySpec(params: {
    hookText: string;
    ctaText: string;
    duration: number; // total video duration in seconds
    theme?: string; // theme name, defaults to 'default'
    aspectRatio?: string; // '9:16', '1:1', '16:9'
}): OverlaySpec {
    const { hookText, ctaText, duration, theme = 'default', aspectRatio = '9:16' } = params;

    const selectedTheme = OVERLAY_THEMES[theme] || OVERLAY_THEMES.default;

    // Calculate safe areas based on aspect ratio
    const safeAreas = getSafeAreas(aspectRatio);

    // Auto font scale based on text length
    const hookFontScale = calculateFontScale(hookText, 'hook');
    const ctaFontScale = calculateFontScale(ctaText, 'cta');

    return {
        hook: {
            text: hookText,
            start_time: 0,
            end_time: 1.5, // Hook shows for first 1.5 seconds
            position: 'top',
            style: {
                fontSize: Math.round(32 * hookFontScale),
                fontWeight: selectedTheme.hook.fontWeight,
                color: selectedTheme.hook.textColor,
                backgroundColor: selectedTheme.hook.backgroundColor
            },
            safe_area: safeAreas.top,
            max_lines: 2,
            max_chars: 50,
            font_scale: hookFontScale
        },
        cta: {
            text: ctaText,
            start_time: duration - 1.5, // CTA shows for last 1.5 seconds
            end_time: duration,
            position: 'bottom',
            style: {
                fontSize: Math.round(28 * ctaFontScale),
                fontWeight: selectedTheme.cta.fontWeight,
                color: selectedTheme.cta.textColor,
                backgroundColor: selectedTheme.cta.backgroundColor
            },
            safe_area: safeAreas.bottom,
            max_lines: 1,
            max_chars: 20, // CTAs should be very short
            font_scale: ctaFontScale
        },
        theme: theme
    };
}

/**
 * Get safe areas based on aspect ratio
 */
function getSafeAreas(aspectRatio: string): {
    top: { x: number; y: number; width: number; height: number };
    bottom: { x: number; y: number; width: number; height: number };
} {
    // Safe areas as percentages of total video dimensions
    // Accounts for platform UI elements (Instagram buttons, TikTok controls, etc.)

    if (aspectRatio === '9:16') {
        // Vertical video - most restrictive
        return {
            top: { x: 5, y: 10, width: 90, height: 15 }, // 10% from top
            bottom: { x: 5, y: 75, width: 90, height: 15 } // 25% from bottom
        };
    } else if (aspectRatio === '1:1') {
        // Square
        return {
            top: { x: 5, y: 5, width: 90, height: 15 },
            bottom: { x: 5, y: 80, width: 90, height: 15 }
        };
    } else {
        // 16:9 or other
        return {
            top: { x: 5, y: 5, width: 90, height: 15 },
            bottom: { x: 5, y: 80, width: 90, height: 15 }
        };
    }
}

/**
 * Calculate font scale based on text length
 */
function calculateFontScale(text: string, type: 'hook' | 'cta'): number {
    const length = text.length;

    if (type === 'hook') {
        // Hook can be longer
        if (length <= 20) return 1.0;
        if (length <= 35) return 0.9;
        if (length <= 50) return 0.8;
        return 0.7;
    } else {
        // CTA should be very short
        if (length <= 10) return 1.0;
        if (length <= 15) return 0.9;
        return 0.8;
    }
}
