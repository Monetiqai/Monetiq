/**
 * Ads Mode Types
 * 
 * Type definitions for the Ads Mode feature - e-commerce ad generation with A/B testing
 */

// Ad Template Types
export type AdTemplate = 'scroll_stop' | 'trust_ugc' | 'problem_solution' | 'offer_promo';

// Variant Types (A/B test variants)
export type VariantType = 'hook' | 'trust' | 'aggressive' | 'offer';

// Platform Types
export type Platform = 'facebook' | 'instagram' | 'tiktok';

// Hook Types (internal metadata, not exposed in UI)
export type HookType =
    | 'pattern_interrupt'  // Unexpected movement, visual surprise
    | 'problem_first'      // Show problem before product
    | 'result_first'       // Show outcome immediately
    | 'direct_hit';        // Product instantly centered

// Ad Pack Status
export type AdPackStatus = 'draft' | 'generating' | 'ready' | 'failed';

// Ad Variant Status
export type AdVariantStatus = 'queued' | 'processing' | 'ready' | 'failed';

/**
 * Overlay Specification (JSON structure for text overlays)
 */
export interface OverlaySpec {
    hook: {
        text: string;
        start_time: number; // seconds
        end_time: number; // seconds
        position: 'top' | 'center' | 'bottom';
        style: {
            fontSize?: number;
            fontWeight?: string;
            color?: string;
            backgroundColor?: string;
        };
        safe_area: {
            x: number; // percentage
            y: number; // percentage
            width: number; // percentage
            height: number; // percentage
        };
        max_lines: number;
        max_chars: number;
        font_scale: number;
    };
    cta: {
        text: string;
        start_time: number;
        end_time: number;
        position: 'top' | 'center' | 'bottom';
        style: {
            fontSize?: number;
            fontWeight?: string;
            color?: string;
            backgroundColor?: string;
        };
        safe_area: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        max_lines: number;
        max_chars: number;
        font_scale: number;
    };
    theme: string;
}

/**
 * Ad Pack - Container for a set of ad variants
 */
export interface AdPack {
    id: string;
    user_id: string;
    project_id?: string;

    // Product Info
    product_name: string;
    product_image_asset_id?: string;
    category: ProductCategory;
    price?: number;

    // Ad Configuration
    template_type: AdTemplate;
    platform: Platform;
    variant_count: 2 | 3 | 4;

    // Video Configuration
    aspect_ratio: '9:16' | '1:1' | '16:9';
    language: string;

    // Provider Configuration
    provider: 'minimax' | 'runway' | 'other';
    model_fast: string;
    model_final: string;

    // Status
    status: AdPackStatus;
    last_error?: string;

    // Auto-generated name
    pack_name: string;

    // Metadata
    meta: Record<string, any>;
    created_at: string;
    updated_at: string;
}

/**
 * Generation Payload - Structured data for video generation
 */
export interface GenerationPayload {
    // Provider info
    provider: 'minimax' | 'runway' | 'other';
    model: string;

    // Product context
    product: {
        name: string;
        category: ProductCategory;
        price?: number;
        image_url?: string;
    };

    // Video configuration
    video: {
        duration: number;
        resolution: string;
        aspect_ratio: string;
        first_frame_image?: string;
    };

    // Prompt components (for reconstruction/debugging)
    prompt_parts: {
        base: string;
        template: string;
        variant: string;
        platform: string;
        category_context: string;
    };

    // Final assembled prompt
    final_prompt: string;

    // Overlays (for reference, actual spec in overlay_spec field)
    overlays: {
        hook_text: string;
        cta_text: string;
        theme: string;
    };

    // Generation metadata
    metadata: {
        template_type: AdTemplate;
        variant_type: VariantType;
        platform: Platform;
        language: string;
        generated_at: string;
    };
}

/**
 * Ad Variant - Individual ad variation within a pack
 */
export interface AdVariant {
    id: string;
    ad_pack_id: string;

    // Variant Info
    variant_type: VariantType;
    variant_index: number;

    // Video Asset
    asset_id?: string;

    // Status & Provider
    is_winner: boolean;
    is_final: boolean;
    status: AdVariantStatus;
    provider_job_id?: string; // MiniMax task_id or other provider job ID
    last_error?: string;

    // Generation Mode & Lineage
    generation_mode: 'fast' | 'final';
    source_variant_id?: string; // For FINAL variants: ID of the FAST winner variant

    // Prompt & Generation Data
    prompt_payload?: GenerationPayload; // Typed generation payload
    prompt_text?: string; // Actual prompt text

    // Text Overlays (generated but not yet burned into video)
    hook_text?: string;
    cta_text?: string;
    overlay_spec?: OverlaySpec;

    // Video Specs
    duration_sec: number;

    // Legacy (deprecated)
    internal_prompt?: string; // DEPRECATED: use prompt_text instead

    // Metadata
    meta: Record<string, any>;
    created_at: string;
    updated_at: string;
}

/**
 * Ad Template Configuration
 */
export interface AdTemplateConfig {
    id: AdTemplate;
    name: string;
    description: string;
    icon: string;
    targetMetric: string; // e.g., "Scroll Stop Rate", "Trust & Credibility"
}

/**
 * Variant Mapping Configuration
 */
export interface VariantMapping {
    count: 2 | 3 | 4;
    variants: VariantType[];
    description: string;
}

/**
 * Product Category
 */
export type ProductCategory =
    | 'fashion'
    | 'electronics'
    | 'beauty'
    | 'home'
    | 'sports'
    | 'food'
    | 'drinkware'
    | 'toys'
    | 'books'
    | 'health'
    | 'automotive'
    | 'jewelry'
    | 'other';

/**
 * Ad Pack with populated variants
 */
export interface AdPackWithVariants extends AdPack {
    variants: AdVariant[];
    winner?: AdVariant;
    final?: AdVariant;
}

/**
 * Create Ad Pack Request
 */
export interface CreateAdPackRequest {
    product_name: string;
    product_image_asset_id?: string; // Legacy: single image (backward compatible)
    product_image_asset_ids?: string[]; // New: multiple images (2-10 recommended)
    category: ProductCategory;
    price?: number;
    template_type: AdTemplate;
    platform: Platform;
    variant_count: 2 | 3 | 4;
    aspect_ratio?: '9:16' | '1:1' | '16:9';
    language?: string;
}

/**
 * Generate Variants Request
 */
export interface GenerateVariantsRequest {
    ad_pack_id: string;
    force?: boolean; // Force regeneration even if variants exist
}

/**
 * Mark Winner Request
 */
export interface MarkWinnerRequest {
    variant_id: string;
}

/**
 * Generate Final Request
 */
export interface GenerateFinalRequest {
    ad_pack_id: string;
}
