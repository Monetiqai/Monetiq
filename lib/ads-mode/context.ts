/**
 * Category Context System for Ads Mode
 * 
 * Maps product categories to realistic environments and scenes
 * Used to generate contextual 3-shot ad structures
 */

import { ProductCategory, VariantType } from '@/lib/types/ads-mode';

/**
 * Scene contexts for each product category
 * Each category has multiple scene options for variety
 */
export const CATEGORY_SCENES: Record<ProductCategory, string[]> = {
    drinkware: [
        'hand holding cup on modern kitchen counter, morning sunlight, visible wood grain texture',
        'product on minimalist office desk next to laptop, hand reaching for it, natural indoor light',
        'hand gripping bottle in gym setting, workout equipment blurred in background, fluorescent lighting',
        'product in car cupholder, dashboard visible, hand adjusting it, afternoon light through windshield',
        'hand holding cup outdoors on picnic table, natural greenery background, dappled sunlight',
        'product on cozy home table with soft blanket, hand placing it down, warm lamp light'
    ],

    beauty: [
        'hand placing product on clean bathroom counter, mirror reflection visible, natural window light',
        'product on elegant vanity table, hand reaching for it, soft warm lighting, wood texture visible',
        'hand holding product in spa-like setting, towels and candles in background, ambient lighting',
        'product on modern bathroom sink, hand picking it up, water droplets on counter, bright daylight',
        'hand placing product on bedroom vanity, morning light streaming in, makeup items nearby',
        'product on minimalist bathroom shelf with plants, hand adjusting it, soft natural light'
    ],

    fashion: [
        'urban street setting with brick wall background',
        'full-length mirror in bright bedroom',
        'organized closet with hanging clothes',
        'outdoor setting with natural lighting',
        'modern apartment interior',
        'boutique-style setting with soft lighting'
    ],

    electronics: [
        'modern desk setup with monitor and keyboard',
        'unboxing scene on clean white table',
        'tech workspace with cables and accessories',
        'cozy living room with ambient lighting',
        'minimalist desk with plant and notebook',
        'home office with bookshelf background'
    ],

    home: [
        'cozy living room with sofa and cushions',
        'dining table with place settings',
        'kitchen counter with cooking utensils',
        'bedroom nightstand with lamp',
        'coffee table in bright living space',
        'home office desk with decorative items'
    ],

    sports: [
        'gym floor with exercise equipment',
        'outdoor park or trail setting',
        'home workout space with yoga mat',
        'sports field or court',
        'fitness studio with mirrors',
        'outdoor athletic setting with natural light'
    ],

    food: [
        'kitchen counter with cooking ingredients',
        'dining table with place setting',
        'outdoor picnic or BBQ setting',
        'modern kitchen with natural light',
        'rustic wooden table',
        'breakfast nook with morning light'
    ],

    toys: [
        'colorful playroom with toys scattered',
        'living room floor with soft carpet',
        'outdoor backyard or park',
        'kids bedroom with bright colors',
        'family room with cozy setting',
        'play area with natural lighting'
    ],

    books: [
        'cozy reading nook with armchair',
        'bookshelf with organized books',
        'coffee table with warm beverage',
        'library or study setting',
        'bed with soft pillows and blanket',
        'outdoor bench with natural setting'
    ],

    health: [
        'clean bathroom counter with organized products',
        'modern kitchen with healthy ingredients',
        'wellness space with plants and natural light',
        'gym or fitness setting',
        'spa-like bathroom environment',
        'minimalist health-focused setting'
    ],

    automotive: [
        'car interior with dashboard visible',
        'garage or workshop setting',
        'driveway with vehicle in background',
        'car detailing setup',
        'automotive workspace',
        'vehicle exterior with clean background'
    ],

    jewelry: [
        'elegant vanity with soft lighting',
        'jewelry box on dresser',
        'minimalist white surface with shadows',
        'luxury boutique setting',
        'soft fabric background with natural light',
        'display case with ambient lighting'
    ],

    other: [
        'clean modern table with natural light',
        'minimalist indoor setting',
        'organized shelf or counter',
        'bright room with window light',
        'neutral background with depth',
        'contemporary interior space'
    ]
};

/**
 * Usage/proof scenarios for each category
 * Describes how the product should be shown being used
 */
export const CATEGORY_USAGE: Record<ProductCategory, string[]> = {
    drinkware: [
        'hand gripping and tilting cup toward camera, visible condensation droplets running down sides, steam rising',
        'hand pouring liquid into container from above, liquid splashing slightly, natural pour motion',
        'extreme close-up of liquid swirling inside transparent container, ice cubes visible, hand rotating cup',
        'hand wrapping fingers around handle with natural grip, slight camera shake, product label clearly visible',
        'hand filling product from tap or bottle, water stream visible, slight overflow, realistic motion'
    ],

    beauty: [
        'hands applying product to skin with gentle circular motions',
        'product being dispensed or opened',
        'close-up of texture on skin',
        'water droplets on product surface',
        'hands massaging product into face or body'
    ],

    fashion: [
        'hands adjusting fabric or fit',
        'close-up of fabric texture and movement',
        'person wearing item with natural movement',
        'hands touching material to show quality',
        'item being styled or accessorized'
    ],

    electronics: [
        'hands unboxing and revealing product',
        'fingers interacting with buttons or screen',
        'product powering on with LED indicators',
        'close-up of ports, features, or details',
        'hands connecting cables or accessories'
    ],

    home: [
        'hands placing or arranging product',
        'product being used in its intended function',
        'close-up of texture or material quality',
        'hands interacting with product features',
        'product integrated into living space'
    ],

    sports: [
        'product in active use during exercise',
        'hands gripping or adjusting product',
        'close-up of material flex or durability',
        'product being worn or carried',
        'action shot showing product performance'
    ],

    food: [
        'hands preparing or serving food',
        'close-up of food texture and freshness',
        'steam rising from hot food',
        'product being opened or unwrapped',
        'food being plated or arranged'
    ],

    toys: [
        'hands playing with toy showing features',
        'toy in action with movement',
        'close-up of toy details and quality',
        'hands demonstrating toy functionality',
        'toy being assembled or transformed'
    ],

    books: [
        'hands opening book and flipping pages',
        'close-up of book cover and spine',
        'fingers tracing text on page',
        'book being placed on shelf',
        'hands holding book in reading position'
    ],

    health: [
        'hands opening product packaging',
        'product being measured or dispensed',
        'close-up of product texture or form',
        'hands using product as intended',
        'product being applied or consumed'
    ],

    automotive: [
        'hands installing or attaching product',
        'product being used on vehicle',
        'close-up of product fit and finish',
        'hands demonstrating product features',
        'product in use showing effectiveness'
    ],

    jewelry: [
        'hands putting on jewelry piece',
        'close-up of jewelry catching light',
        'fingers adjusting clasp or fit',
        'jewelry being worn with natural movement',
        'hands opening jewelry box to reveal piece'
    ],

    other: [
        'hands interacting with product',
        'close-up of product details and quality',
        'product being used or demonstrated',
        'hands showing product features',
        'product in functional use'
    ]
};

/**
 * Select scene context for a category and variant
 * Returns a specific scene description for the opening shot
 */
export function selectSceneForCategory(
    category: ProductCategory,
    variantType: VariantType,
    seed?: number
): string {
    const scenes = CATEGORY_SCENES[category] || CATEGORY_SCENES.other;

    // Use variant type and optional seed for deterministic selection
    const variantIndex = ['hook', 'trust', 'aggressive', 'offer'].indexOf(variantType);
    const index = seed !== undefined
        ? (seed + variantIndex) % scenes.length
        : variantIndex % scenes.length;

    return scenes[index];
}

/**
 * Select usage scenario for a category
 * Returns description of how product should be shown being used
 */
export function selectUsageForCategory(
    category: ProductCategory,
    variantType: VariantType,
    seed?: number
): string {
    const usages = CATEGORY_USAGE[category] || CATEGORY_USAGE.other;

    // Use variant type and optional seed for deterministic selection
    const variantIndex = ['hook', 'trust', 'aggressive', 'offer'].indexOf(variantType);
    const index = seed !== undefined
        ? (seed + variantIndex) % usages.length
        : variantIndex % usages.length;

    return usages[index];
}

/**
 * Get complete 3-shot scene structure for a category
 */
export function get3ShotStructure(params: {
    category: ProductCategory;
    variantType: VariantType;
    productName: string;
    seed?: number;
}): {
    contextHook: string;
    usageProof: string;
    cleanProduct: string;
} {
    const { category, variantType, productName, seed } = params;

    const sceneContext = selectSceneForCategory(category, variantType, seed);
    const usageScenario = selectUsageForCategory(category, variantType, seed);

    return {
        contextHook: `${productName} placed in ${sceneContext}, natural lighting, scroll-stopping composition`,
        usageProof: `${usageScenario}, UGC handheld feel, close-ups showing quality and details`,
        cleanProduct: `${productName} on clean neutral background, professional product shot, sharp and clear`
    };
}
