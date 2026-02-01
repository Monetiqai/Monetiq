/**
 * Generation Payload Builder
 * 
 * Constructs typed GenerationPayload for video generation
 */

import { GenerationPayload, AdTemplate, VariantType, Platform, ProductCategory } from '@/lib/types/ads-mode';

/**
 * Build a complete GenerationPayload
 */
export function buildGenerationPayload(params: {
    // Provider
    provider: 'minimax' | 'runway' | 'other';
    model: string;

    // Product
    productName: string;
    category: ProductCategory;
    price?: number;
    imageUrl?: string;

    // Video config
    duration: number;
    resolution: string;
    aspectRatio: string;
    firstFrameImage?: string;

    // Prompt components
    basePrompt: string;
    templatePrompt: string;
    variantPrompt: string;
    platformPrompt: string;
    categoryContext: string;
    finalPrompt: string;

    // Overlays
    hookText: string;
    ctaText: string;
    theme: string;

    // Metadata
    templateType: AdTemplate;
    variantType: VariantType;
    platform: Platform;
    language: string;
}): GenerationPayload {
    return {
        provider: params.provider,
        model: params.model,

        product: {
            name: params.productName,
            category: params.category,
            price: params.price,
            image_url: params.imageUrl
        },

        video: {
            duration: params.duration,
            resolution: params.resolution,
            aspect_ratio: params.aspectRatio,
            first_frame_image: params.firstFrameImage
        },

        prompt_parts: {
            base: params.basePrompt,
            template: params.templatePrompt,
            variant: params.variantPrompt,
            platform: params.platformPrompt,
            category_context: params.categoryContext
        },

        final_prompt: params.finalPrompt,

        overlays: {
            hook_text: params.hookText,
            cta_text: params.ctaText,
            theme: params.theme
        },

        metadata: {
            template_type: params.templateType,
            variant_type: params.variantType,
            platform: params.platform,
            language: params.language,
            generated_at: new Date().toISOString()
        }
    };
}

/**
 * Clone payload for FINAL generation (from FAST winner)
 * Only changes: model (fast → final) and generation timestamp
 */
export function clonePayloadForFinal(
    fastPayload: GenerationPayload,
    finalModel: string
): GenerationPayload {
    return {
        ...fastPayload,
        model: finalModel,
        metadata: {
            ...fastPayload.metadata,
            generated_at: new Date().toISOString()
        }
    };
}
