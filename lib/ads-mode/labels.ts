/**
 * SINGLE SOURCE OF TRUTH FOR ADS MODE UI LABELS
 * 
 * This file defines all human-readable labels for shots, spatial roles, and contexts.
 * UI components MUST read from this file - no ad-hoc labels or guessing.
 * 
 * CRITICAL: This is UI/semantics only. NO generation logic here.
 */

import { ShotType, SpatialRole } from './shot-prompts';

/**
 * Shot Display Metadata
 * Defines what each shot IS and its PURPOSE
 */
export const SHOT_METADATA: Record<ShotType, {
    displayName: string;
    intent: string;
    category: 'HOOK' | 'TRUST' | 'VARIATION';
}> = {
    hook: {
        displayName: 'HOOK',
        intent: 'Maximum product readability, no human presence',
        category: 'HOOK'
    },
    proof: {
        displayName: 'TRUST — Handling',
        intent: 'Realistic human handling to build trust',
        category: 'TRUST'
    },
    variation: {
        displayName: 'TRUST — Flat',
        intent: 'Catalog-grade clarity, flat lay perspective',
        category: 'TRUST'
    },
    winner: {
        displayName: 'VARIATION',
        intent: 'Context diversity without product drift',
        category: 'VARIATION'
    }
};

/**
 * Spatial Role Display Metadata
 * PHYSICAL DESCRIPTIONS ONLY — NO CONCEPTUAL WORDING
 * ROLE FIRST, SHOT SECOND in UI hierarchy
 */
export const SPATIAL_ROLE_METADATA: Record<SpatialRole, {
    displayName: string;
    description: string; // Strict physical statement
    forbiddenStates: string; // What is NOT allowed
    icon: string;
    isLocked: boolean; // System-enforced, no variation
}> = {
    'grounded-static': {
        displayName: 'GROUNDED STATIC',
        description: 'Product fully resting on a surface. Visible contact shadow. No elevation, no hands.',
        forbiddenStates: 'Floating, invisible supports, hands visible, product hanging',
        icon: '📦',
        isLocked: true
    },
    'supported-elevated': {
        displayName: 'SUPPORTED ELEVATED',
        description: 'Product elevated using a visible physical support. Support must be clearly visible. No floating.',
        forbiddenStates: 'Invisible support, floating, hands visible, product on surface',
        icon: '🪝',
        isLocked: true
    },
    'handled-transient': {
        displayName: 'HANDLED TRANSIENT',
        description: 'Product held and manipulated by human hands. Hands visible. No face, no body, no posing.',
        forbiddenStates: 'No hands visible, product resting, face/body visible, staged posing',
        icon: '🤲',
        isLocked: true
    },
    'folded-resting': {
        displayName: 'FOLDED RESTING',
        description: 'Product folded and resting on a flat surface. No hands. No elevation.',
        forbiddenStates: 'Product fully extended, hands visible, hanging, floating',
        icon: '📐',
        isLocked: true
    }
};

/**
 * Context Family Labels
 * VARIABLE PER RUN (within lighting family)
 */
export const CONTEXT_FAMILY_LABELS = {
    'soft-daylight': 'Soft Daylight',
    'soft-indoor': 'Soft Indoor'
} as const;

/**
 * Locked vs Variable Indicators
 */
export const SYSTEM_CONSTRAINTS = {
    locked: {
        spatialRole: 'Spatial role — Locked by system',
        noRepetition: 'No repetition in sequence — Enforced',
        productImmutability: 'Product shape/print — Immutable'
    },
    variable: {
        context: 'Context — Variable per run (within lighting family)',
        backgroundSurface: 'Background surface — Variable per run'
    }
} as const;

/**
 * Status Display Labels
 * STRICT FAILURE COPY — NO GENERIC ERRORS
 */
export const STATUS_LABELS = {
    idle: 'Ready to Generate',
    generating_shots: 'Generating 4-Shot Plan...',
    shots_ready: 'Shots Ready for Validation',
    shots_validated: 'Shots Validated & Locked',
    shots_partial: 'Partial Generation (Some Shots Failed)',
    generation_failed: 'Generation blocked — spatial role conflict or constraint violation',
    exporting_clips: 'Converting to Video...',
    clips_ready: 'Video Clips Ready'
} as const;

/**
 * Helper: Get forbidden states for a spatial role
 */
export function getForbiddenStates(role: SpatialRole): string {
    return SPATIAL_ROLE_METADATA[role].forbiddenStates;
}

/**
 * Helper: Get full shot label with category
 */
export function getShotLabel(shotType: ShotType): string {
    const meta = SHOT_METADATA[shotType];
    return meta.displayName;
}

/**
 * Helper: Get shot intent description
 */
export function getShotIntent(shotType: ShotType): string {
    const meta = SHOT_METADATA[shotType];
    return meta.intent;
}

/**
 * Helper: Get spatial role display name
 */
export function getSpatialRoleLabel(role: SpatialRole): string {
    return SPATIAL_ROLE_METADATA[role].displayName;
}

/**
 * Helper: Get spatial role description
 */
export function getSpatialRoleDescription(role: SpatialRole): string {
    return SPATIAL_ROLE_METADATA[role].description;
}

/**
 * Helper: Detect context family from context string
 * (Simple heuristic based on context pool)
 */
export function getContextFamily(context: string): keyof typeof CONTEXT_FAMILY_LABELS {
    // Contexts with "lumière naturelle" or outdoor indicators
    if (context.includes('lumière naturelle') || context.includes('atelier')) {
        return 'soft-daylight';
    }
    return 'soft-indoor';
}

/**
 * Future-proofing badges (placeholders only, no logic)
 */
export const BADGE_LABELS = {
    videoCompatible: 'Video-Compatible',
    brandSafe: 'Brand-Safe',
    spatialLocked: 'Spatial Role Locked — No Repetition'
} as const;
