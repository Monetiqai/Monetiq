/**
 * Hook Type Mapping
 * Maps variant types to their corresponding hook strategies
 * Used for internal metadata tracking (not exposed in UI)
 */

import { VariantType, HookType, AdTemplate } from '@/lib/types/ads-mode';

/**
 * Get hook type for a variant type
 * This mapping determines which hook strategy each variant uses
 */
export function getHookTypeForVariant(variantType: VariantType): HookType {
    const mapping: Record<VariantType, HookType> = {
        hook: 'pattern_interrupt',      // Scroll Stop template
        trust: 'problem_first',          // Trust UGC template
        aggressive: 'result_first',      // Problem Solution template
        offer: 'direct_hit'              // Offer Promo template
    };

    return mapping[variantType];
}

/**
 * Get hook type for a template
 * Alternative mapping using template type
 */
export function getHookTypeForTemplate(template: AdTemplate): HookType {
    const mapping: Record<AdTemplate, HookType> = {
        scroll_stop: 'pattern_interrupt',
        trust_ugc: 'problem_first',
        problem_solution: 'result_first',
        offer_promo: 'direct_hit'
    };

    return mapping[template];
}

/**
 * Get human-readable hook description (for internal debugging)
 */
export function getHookDescription(hookType: HookType): string {
    const descriptions: Record<HookType, string> = {
        pattern_interrupt: 'Pattern Interrupt - Unexpected movement, visual surprise',
        problem_first: 'Problem First - Show problem/frustration before product',
        result_first: 'Result First - Show outcome/satisfaction immediately',
        direct_hit: 'Direct Hit - Product instantly centered, bold presentation'
    };

    return descriptions[hookType];
}
