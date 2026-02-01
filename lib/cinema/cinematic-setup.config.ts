// Re-export existing cinema configs
export { CAMERAS, LENSES, FOCAL_LENGTHS, APERTURES } from './index';

// Quality options with prompts
export const QUALITY_PROMPTS: Record<string, string> = {
    "1K": "1K quality render, moderate detail density with simplified micro-texture, clean readable surfaces with reduced fine grain, higher tolerance to minor simplification artifacts, NO ultra-fine texture expectation, NO film-grain dominance, priority on speed, readability, and structural validation over realism.",
    "2K": "2K quality render, high detail fidelity with believable surface texture, balanced sharpness and organic noise/grain presence, controlled artifact suppression with cinematic realism, NO low-detail plastic surfaces, NO over-sharpened digital edges, priority on production-ready realism and visual credibility.",
    "4K": "4K quality render, maximum perceived detail density and micro-texture preservation, fine surface detail with controlled natural grain, minimal artifact tolerance and high realism expectation, NO texture smoothing, NO resolution downscaling behavior, priority on visual fidelity and texture integrity over performance."
};

export const QUALITIES = ["1K", "2K", "4K"] as const;

// Batch size options
export const BATCHES = [2, 4, 6, 8] as const;

// Aspect ratio options with prompts
export const ASPECT_RATIO_PROMPTS: Record<string, string> = {
    "1:1": "1:1 square framing, centralized composition with strong symmetry, graphic balance and iconic visual impact, NO lateral storytelling, NO cinematic blocking, priority on bold subject presence and visual punch over narrative flow.",
    "4:5": "4:5 vertical framing, editorial portrait composition with controlled headroom, subject-forward layout optimized for mobile reading, NO wide cinematic staging, NO horizontal narrative flow, priority on subject readability and elegance over spatial storytelling.",
    "5:4": "5:4 framing, classic photographic composition with balanced negative space, medium-format still image language, NO dynamic cinematic motion cues, NO vertical-first composition, priority on photographic stability and elegance over narrative movement.",
    "9:16": "9:16 vertical framing, top-to-bottom visual reading with strong subject stacking, mobile-first composition optimized for reels and stories, NO cinematic widescreen blocking, NO lateral negative space dominance, priority on vertical impact and immediacy over cinematic depth.",
    "16:9": "16:9 widescreen framing, balanced horizontal composition with natural screen grammar, left-to-right narrative blocking, NO ultra-wide cinematic staging, NO vertical-first dominance, priority on clarity and mainstream cinematic readability.",
    "21:9": "21:9 ultra-wide cinematic framing, panoramic horizontal staging with strong negative space, theatrical composition and feature-film language, NO centered social framing, NO vertical composition logic, priority on cinematic scale and dramatic staging over immediacy."
};

export const ASPECT_RATIOS = ["1:1", "4:5", "5:4", "9:16", "16:9", "21:9"] as const;

// Aspect ratio descriptions (for UI display)
export const ASPECT_RATIO_DESCRIPTIONS: Record<string, string> = {
    "1:1": "Square (Social Media) - Perfect square format for social media",
    "4:5": "Portrait (Instagram) - Portrait format ideal for Instagram and mobile",
    "5:4": "Classic (Medium Format) - Classic medium format photography ratio",
    "9:16": "Vertical (Stories) - Vertical format for stories and reels",
    "16:9": "Widescreen (Standard) - Standard widescreen format for video",
    "21:9": "Cinematic (Ultra-wide) - Ultra-wide format for professional cinema"
};

// Default values
export const CINEMATIC_DEFAULTS = {
    camera: "red_vraptor",
    lens: "cooke_s4",
    focal: "35mm",
    aperture: "f4",
    quality: "2K" as const,
    batchSize: 4 as const,
    aspectRatio: "21:9" as const,
};

// Helper function to build cinematic prompt from config
export function buildCinematicPrompt(config: {
    camera: string;
    lens: string;
    focal: string;
    aperture: string;
    quality: typeof QUALITIES[number];
    aspectRatio: typeof ASPECT_RATIOS[number];
}): string {
    // Import types locally to avoid circular dependency
    const { CAMERAS, LENSES, FOCAL_LENGTHS, APERTURES } = require('./index');

    const cameraPrompt = CAMERAS[config.camera]?.prompt || "";
    const lensPrompt = LENSES[config.lens]?.prompt || "";
    const focalPrompt = FOCAL_LENGTHS[config.focal]?.prompt || "";
    const aperturePrompt = APERTURES[config.aperture]?.prompt || "";
    const qualityPrompt = QUALITY_PROMPTS[config.quality] || "";
    const aspectRatioPrompt = ASPECT_RATIO_PROMPTS[config.aspectRatio] || "";

    return `${cameraPrompt} ${lensPrompt} ${focalPrompt} ${aperturePrompt} ${qualityPrompt} ${aspectRatioPrompt}`.trim();
}
