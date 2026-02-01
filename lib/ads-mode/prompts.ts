/**
 * Ads Mode Prompt System
 * 
 * Internal prompt generation for e-commerce ads
 * NEVER exposed to users - fully automated
 */

import { AdTemplate, VariantType, Platform, ProductCategory } from '@/lib/types/ads-mode';

/**
 * BASE PROMPT - Fixed structure + realism rules ONLY
 * NO hook logic - that goes in HOOK_VARIANTS
 * Target: 15-20 lines max
 */
const BASE_PROMPT = `E-commerce ad, TikTok/IG style, 5 seconds, 9:16 vertical.

3-SHOT STRUCTURE:
Shot 1 (0-1.2s): Hook opening
Shot 2 (1.2-3.5s): Product usage/proof, hands interacting
Shot 3 (3.5-5s): Clean product shot, white/neutral background

REALISM RULES:
✅ Shots 1-2: hands visible, real surfaces (table/counter), natural lighting, shadows, depth
✅ UGC style: handheld phone camera feel, slight imperfections, natural movement
✅ Product image = reference for appearance only
❌ NO floating product in void, NO white background in Shots 1-2, NO cinematic smooth camera

This is a performance ad for TikTok/Instagram, not a product animation.`;

/**
 * HOOK VARIANTS - 1 line per type, Shot 1 differentiation ONLY
 * CRITICAL: HOOK uses supported-elevated spatial role
 * MANDATORY: ZERO hands, ZERO manipulation, ZERO motion
 * Product MUST be on visible support (stand/dock/holder/hanger/hook/mount)
 * Differentiation via composition/lighting/framing, NOT handling
 */
export const HOOK_VARIANTS: Record<AdTemplate, string> = {
    scroll_stop: "Shot 1: Product upright on visible premium stand/dock, ultra clean, no hands, no motion, high readability",
    trust_ugc: "Shot 1: Product on visible stand in real-life neutral setting, no hands, static, natural light",
    problem_solution: "Shot 1: Product shown clearly on stand next to subtle 'problem context' object, no hands, static",
    offer_promo: "Shot 1: Product centered on stand, label/finish emphasized, no hands, static, bright premium lighting"
};

/**
 * Hook Pools - Multiple hooks per variant type for variety
 */
const HOOK_POOLS: Record<VariantType, string[]> = {
    hook: [
        "Wait... you need to see this",
        "Stop scrolling right now",
        "This is insane",
        "You won't believe this",
        "Holy sh*t look at this",
        "This changes everything",
        "No way this is real",
        "I can't believe I found this",
        "This is what you've been missing",
        "Your feed just got better",
        "Okay this is actually crazy",
        "Drop everything and watch",
        "This broke the internet",
        "I'm obsessed with this",
        "Game changer alert"
    ],
    trust: [
        "Here's why everyone loves this",
        "Thousands already switched",
        "This is why it's trending",
        "Real people, real results",
        "The reviews don't lie",
        "Join the community",
        "Trusted by thousands",
        "See why people are raving",
        "This is the real deal",
        "Verified buyers agree",
        "The proof is in",
        "People can't stop talking",
        "Rated 5 stars for a reason",
        "This is what trust looks like",
        "Real customers, real love"
    ],
    aggressive: [
        "Don't miss this",
        "Limited time only",
        "Going fast - act now",
        "Last chance alert",
        "Selling out quick",
        "Grab yours before it's gone",
        "Stock running low",
        "This won't last",
        "Hurry - almost sold out",
        "Final hours",
        "Don't regret missing this",
        "Time's running out",
        "Act fast or miss out",
        "Only a few left",
        "Ending soon"
    ],
    offer: [
        "This price won't last",
        "Massive discount alert",
        "Save big right now",
        "Deal of the day",
        "Price drop happening now",
        "Lowest price ever",
        "Flash sale active",
        "Unbeatable deal",
        "Crazy discount inside",
        "Limited offer",
        "Special price today",
        "Discount ends soon",
        "Best price guaranteed",
        "Sale price live",
        "Exclusive deal"
    ]
};

/**
 * CTA Templates - SHORT (2-4 words max)
 */
const CTA_TEMPLATES: Record<VariantType, string> = {
    hook: 'Shop Now',
    trust: 'Join Thousands', // Shortened from "Join Thousands of Happy Customers"
    aggressive: 'Claim Yours',
    offer: 'Get Discount'
};

/**
 * Platform-specific optimizations
 */
const PLATFORM_OPTIMIZATIONS: Record<Platform, string> = {
    facebook: `
PLATFORM: Facebook Feed
- Aspect ratio: 9:16 (vertical) or 1:1 (square) - use 9:16
- Sound: Assume sound OFF (visual storytelling)
- Captions: Essential (not implemented yet)
- Pacing: Medium-fast (users scroll but engage longer)`,

    instagram: `
PLATFORM: Instagram Reels
- Aspect ratio: 9:16 (vertical) ONLY
- Sound: Can use sound but visual must work without
- Aesthetic: Polished, trendy, visually appealing
- Pacing: Fast, snappy, modern`,

    tiktok: `
PLATFORM: TikTok
- Aspect ratio: 9:16 (vertical) ONLY
- Sound: Important but visual must standalone
- Aesthetic: Raw, authentic, trend-aware
- Pacing: Very fast, instant hook, rapid cuts`
};

/**
 * Product category context - MINIMAL scene settings (2-3 words)
 */
export const CATEGORY_CONTEXT: Record<ProductCategory, string> = {
    fashion: 'Scene: bedroom/closet',
    electronics: 'Scene: modern desk',
    beauty: 'Scene: bathroom counter',
    home: 'Scene: living room',
    sports: 'Scene: gym/outdoors',
    food: 'Scene: kitchen table',
    drinkware: 'Scene: kitchen/desk',
    toys: 'Scene: playroom floor',
    books: 'Scene: reading nook',
    health: 'Scene: wellness space',
    automotive: 'Scene: garage/driveway',
    jewelry: 'Scene: vanity table',
    other: 'Scene: casual setting'
};

/**
 * Select hook from pool (random or category-based)
 */
export function selectHook(params: {
    variant: VariantType;
    category?: ProductCategory;
    seed?: number; // For deterministic selection
}): string {
    const { variant, seed } = params;
    const pool = HOOK_POOLS[variant];

    if (seed !== undefined) {
        // Deterministic selection based on seed
        const index = seed % pool.length;
        return pool[index];
    }

    // Random selection
    const index = Math.floor(Math.random() * pool.length);
    return pool[index];
}

/**
 * Generate complete ad prompt with 3-shot structure
 */
export function generateAdPrompt(params: {
    productName: string;
    category: ProductCategory;
    price?: number;
    template: AdTemplate;
    variant: VariantType;
    platform: Platform;
    hookSeed?: number; // For deterministic hook selection
}): {
    prompt: string;
    hookText: string;
    ctaText: string;
} {
    const { productName, category, price, template, variant, platform, hookSeed } = params;

    // Select hook and CTA for overlays
    const hookText = selectHook({ variant, category, seed: hookSeed });
    const ctaText = CTA_TEMPLATES[variant];

    // Get minimal category scene context (1 line)
    const sceneContext = CATEGORY_CONTEXT[category] || '';

    // Assemble modular prompt: BASE + HOOK_VARIANT + CONTEXT
    const sections = [
        BASE_PROMPT,
        '',
        HOOK_VARIANTS[template],
        '',
        `Product: ${productName} (${category})`,
        sceneContext,
        price ? `Price: $${price}` : '',
        '',
        `Platform: ${platform}, Format: 9:16 vertical, Duration: 5 seconds`
    ];

    const prompt = sections.filter(Boolean).join('\n');

    return {
        prompt,
        hookText,
        ctaText
    };
}

/**
 * Generate pack name
 */
export function generatePackName(params: {
    productName: string;
    template: AdTemplate;
    platform: Platform;
}): string {
    const { productName, template, platform } = params;

    const templateNames: Record<AdTemplate, string> = {
        scroll_stop: 'Scroll Stop',
        trust_ugc: 'Trust UGC',
        problem_solution: 'Problem Solution',
        offer_promo: 'Offer Promo'
    };

    const platformNames: Record<Platform, string> = {
        facebook: 'Facebook',
        instagram: 'Instagram',
        tiktok: 'TikTok'
    };

    return `${productName} – ${templateNames[template]} – ${platformNames[platform]}`;
}

/**
 * Get variant types for a given count
 */
export function getVariantTypes(count: 2 | 3 | 4): VariantType[] {
    const mappings: Record<2 | 3 | 4, VariantType[]> = {
        2: ['hook', 'trust'],
        3: ['hook', 'trust', 'aggressive'],
        4: ['hook', 'trust', 'aggressive', 'offer']
    };

    return mappings[count];
}
