/**
 * Shot Prompt Generator for AAA Image Generation
 * 2-LAYER PROMPT SYSTEM to prevent averaging
 * 
 * Layer 1: Immutable base prompt (realism, performance ad aesthetic)
 * Layer 2: Strict shot-specific physical constraints
 */

import { AdTemplate, ProductCategory } from '@/lib/types/ads-mode';
import { HOOK_VARIANTS, CATEGORY_CONTEXT } from './prompts';

export type ShotType = 'hook' | 'proof' | 'variation' | 'winner';

/**
 * SPATIAL ROLES (4 strict roles - HARD LOCK, NOT SUGGESTION)
 * Defines HOW the product exists in space, not just where
 * NO repetition within same 4-shot sequence
 * VIOLATION = BLOCK GENERATION (fail-fast)
 */
export type SpatialRole = 'grounded-static' | 'supported-elevated' | 'handled-transient' | 'folded-resting';

/**
 * 4-SHOT ROLE PREPLANNING SYSTEM (HARD ENFORCEMENT)
 * Generates valid 4-shot plans BEFORE generation starts
 * NO on-the-fly selection, NO fallback to first role
 */

export interface ShotPlan {
    shotType: ShotType;
    spatialRole: SpatialRole;
    context: string;
}

export interface FourShotPlan {
    shots: ShotPlan[];
    seed: string; // For reproducibility and debugging
}

const SPATIAL_ROLE_DEFINITIONS: Record<SpatialRole, string> = {
    'supported-elevated': `🔒 SPATIAL ROLE: supported-elevated (HARD LOCK)

MANDATORY REQUIREMENTS:
- Product MUST be attached to visible physical support
  • Apparel: hanger, hook, rail, wall mount
  • Electronics/Other: stand, dock, holder, clamp, mount
- ZERO human presence (no hands, no body parts)
- ZERO manipulation (product is static, not being moved)

VIOLATION CRITERIA (BLOCK IF ANY):
- Product resting on flat surface instead of elevated support
- Human hands visible
- Product appears to be in motion
- Support is invisible or unclear

IF VIOLATED → BLOCK GENERATION. NO FALLBACK.`,

    'grounded-static': `🔒 SPATIAL ROLE: grounded-static (HARD LOCK)

MANDATORY REQUIREMENTS:
- Product MUST rest fully on a surface (bed, table, floor, rug)
- Gravity visible (natural contact, shadows)
- ZERO human presence (no hands, no body parts)
- Product is static (not being moved)

VIOLATION CRITERIA (BLOCK IF ANY):
- Product hanging or elevated
- Human hands visible
- Product appears to be floating
- Product appears to be in motion

IF VIOLATED → BLOCK GENERATION. NO FALLBACK.`,

    'handled-transient': `🔒 SPATIAL ROLE: handled-transient (HARD LOCK)

MANDATORY REQUIREMENTS:
- Human hands REQUIRED (must be visible)
- Product in motion or manipulation (holding, lifting, folding, adjusting)
- NOT resting (product is being actively handled)
- NOT staged (realistic interaction only)

VIOLATION CRITERIA (BLOCK IF ANY):
- No human hands visible
- Product resting on surface without hands
- Product hanging without hands
- Hands visible but not interacting with product

IF VIOLATED → BLOCK GENERATION. NO FALLBACK.`,

    'folded-resting': `🔒 SPATIAL ROLE: folded-resting (HARD LOCK)

MANDATORY REQUIREMENTS:
- Product folded or compact (not fully extended)
- Resting on surface (table, bed, floor)
- Inactive state (not being manipulated)
- ZERO human presence (no hands, no body parts)

VIOLATION CRITERIA (BLOCK IF ANY):
- Product fully extended (not folded)
- Product hanging or elevated
- Human hands visible
- Product appears to be in motion

IF VIOLATED → BLOCK GENERATION. NO FALLBACK.`
};

/**
 * Generate a valid 4-shot plan with guaranteed uniqueness
 * THROWS if no valid plan can be created
 */
export function generateFourShotPlan(seed: string): FourShotPlan {
    // RULE: shot2 (proof) = handled-transient ALWAYS
    const shot2Role: SpatialRole = 'handled-transient';

    // RULE: shots 1/3/4 must be all DIFFERENT from each other AND different from shot2
    // Available roles for shots 1/3/4: grounded-static, supported-elevated, folded-resting
    const availableRoles: SpatialRole[] = ['grounded-static', 'supported-elevated', 'folded-resting'];

    // Shot 1 (HOOK): supported-elevated OR grounded-static
    const shot1Options: SpatialRole[] = ['supported-elevated', 'grounded-static'];

    // Shot 3 (TRUST FLAT): folded-resting OR grounded-static
    const shot3Options: SpatialRole[] = ['folded-resting', 'grounded-static'];

    // Try to find a valid combination
    for (const shot1Role of shot1Options) {
        for (const shot3Role of shot3Options) {
            // Shot 4 must be the remaining role not used in shots 1 and 3
            const usedRoles = [shot1Role, shot3Role];
            const shot4Role = availableRoles.find(role => !usedRoles.includes(role));

            if (shot4Role && shot1Role !== shot3Role) {
                // Valid plan found!
                const contexts = selectRandomContexts(seed, 4);

                return {
                    shots: [
                        { shotType: 'hook', spatialRole: shot1Role, context: contexts[0] },
                        { shotType: 'proof', spatialRole: shot2Role, context: contexts[1] },
                        { shotType: 'variation', spatialRole: shot3Role, context: contexts[2] },
                        { shotType: 'winner', spatialRole: shot4Role, context: contexts[3] }
                    ],
                    seed
                };
            }
        }
    }

    // If we reach here, no valid plan exists (should never happen with current rules)
    throw new Error('HARD FAIL: Cannot generate valid 4-shot plan with unique spatial roles');
}

/**
 * CONTEXT POOL (10 realistic contexts - FINAL LIST)
 * Controlled variation contextuelle - NO creative freedom
 * Each shot must use a DIFFERENT context from this pool
 * NO repetition within a 4-shot series
 */
const CONTEXT_POOL = [
    "chambre minimaliste (lumière naturelle)",
    "dressing premium (bois clair ou foncé)",
    "sol textile neutre (laine, tapis, moquette)",
    "table bois clair",
    "sol brut / atelier",
    "canapé neutre",
    "porte-manteau simple",
    "banc ou chaise",
    "mur blanc lumière rasante",
    "sol béton doux"
];

/**
 * Select N random contexts from pool with no repetition
 * Uses stable seed for reproducibility
 */
function selectRandomContexts(seed: string, count: number): string[] {
    if (count > CONTEXT_POOL.length) {
        throw new Error(`Cannot select ${count} unique contexts from pool of ${CONTEXT_POOL.length}`);
    }

    // Simple seeded random using seed hash
    const shuffled = [...CONTEXT_POOL].sort((a, b) => {
        const hashA = hashString(seed + a);
        const hashB = hashString(seed + b);
        return hashA - hashB;
    });

    return shuffled.slice(0, count);
}

/**
 * Simple string hash function for seeded randomization
 */
function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

/**
 * LAYER 1: Immutable Base Prompt
 * Applied to ALL shots - never changes
 * SPATIAL ROLE = HARD LOCK (FAIL-FAST ENFORCEMENT)
 */
const IMMUTABLE_BASE_PROMPT = `You are generating a 4-shot product set. The PRODUCT is IMMUTABLE.

🔒 NEVER CHANGE:
- shape, proportions, print/artwork, texture, knit pattern
- defects, folds logic, gravity behavior

✅ ALLOWED TO VARY:
- realistic physical context ONLY
- credible interaction with environment
- camera distance and angle (subtle only)

⚙️ ABSOLUTE RULES:
- Product must ALWAYS be supported by visible surface or hands
- NO floating, NO invisible support, NO stylization
- NO cinematic exaggeration, NO redesign, NO beautification

🎨 LIGHTING (CONSISTENT ACROSS 4 SHOTS):
- Soft daylight OR soft indoor
- No dramatic contrast

🚫 ANTI-REPETITION RULE:
NO two shots may share the same:
- support surface
- orientation
- interaction type
- framing logic

🔒 SPATIAL ROLE ENFORCEMENT (HARD LOCK - FAIL-FAST):
Each shot has an assigned spatial_role.
The spatial_role is a HARD CONSTRAINT, NOT a suggestion.

IF THE SHOT VIOLATES ITS SPATIAL_ROLE:
→ DO NOT generate the image
→ DO NOT auto-correct
→ DO NOT use a fallback
→ FAIL IMMEDIATELY

A failed constraint is better than a beautiful lie.

CONTEXT RULES:
Use the specified context from the context pool.
Do NOT repeat the same context across shots.
No creative freedom - use ONLY authorized contexts.

❌ VALIDATION BLOCK IF:
- Product floats
- Support is unclear
- Pose is repeated
- Product appearance is altered
- Spatial role is violated

CORE PRINCIPLE:
"What the user validates is EXACTLY what they will export in video.
No surprise. No drift. No betrayal of the product."
Vertical 9:16.`;

/**
 * LAYER 2: Shot-Specific Strict Prompt Logic
 * SHOT ROLES (MANDATORY, NON-NEGOTIABLE) + SPATIAL DIVERSITY
 */
const SHOT_CONSTRAINTS: Record<ShotType, string> = {
    // SHOT 1 — HOOK (ANCHOR SHOT)
    hook: `🔹 SHOT 1 — HOOK (ANCHOR SHOT)

{{SPATIAL_ROLE}}

PRODUCT ALONE:
- Supported (bed, table, floor, wall, hanger, hook, rail)
- No hands
- Clean, readable silhouette
- Pose must be DIFFERENT from other shots

PURPOSE: Instant recognition of the real product

CONTEXT: {{CONTEXT}}

Soft daylight or soft indoor lighting.
Luxury e-commerce aesthetic.

EXACT REPRODUCTION:
- Exact shape, proportions, print/artwork, texture
- Exact monogram placement, scale, alignment

IF A HUMAN APPEARS OR PRODUCT FLOATS → AUTOMATIC RETRY REQUIRED.`,

    // SHOT 2 — TRUST (HANDLING / REALITY)
    proof: `🔹 SHOT 2 — TRUST (HANDLING / REALITY)

{{SPATIAL_ROLE}}

HUMAN HANDS ALLOWED:
- Hands must interact naturally (holding, lifting, folding)
- Hands must NOT hide artwork
- No repeated pose from Shot 1
- Realistic manipulation ONLY
- No styling, no posing, no fashion attitude

PURPOSE: Scale, texture, reality proof

CONTEXT: {{CONTEXT}}
(Must be DIFFERENT from HOOK context)

Physical realism prioritized over styling.

EXACT PRODUCT REPRODUCTION:
- Exact fabric texture, print/artwork, monogram accuracy
- Product obeys gravity when handled`,

    // SHOT 3 — TRUST (FLAT / E-COMMERCE)
    variation: `🔹 SHOT 3 — TRUST (FLAT / E-COMMERCE)

{{SPATIAL_ROLE}}

FLAT LAY OR PERFECTLY FRONTAL HANG:
- Full product visible
- Neutral surface
- No hands touching product
- Product folded/compact OR resting flat

PURPOSE: Technical clarity, catalog-level trust

CONTEXT: {{CONTEXT}}
(Must be DIFFERENT from previous contexts)

Pure catalog-grade clarity.

EXACT PROPORTIONS:
- Fabric texture and monogram clarity prioritized
- Perfect symmetry and alignment
- All details visible and readable

THIS SHOT IS MANDATORY AND MUST BE PRESERVED.`,

    // SHOT 4 — VARIATION (CONTEXT CHANGE)
    winner: `🔹 SHOT 4 — VARIATION (CONTEXT CHANGE)

{{SPATIAL_ROLE}}
(MUST be different from shots 1-3)

NEW PHYSICAL CONTEXT:
- Different support type (if bed was used → use table, floor, chair, wall, etc.)
- Different orientation or fold state
- Must feel naturally different, not decorative
- Still realistic and credible

PURPOSE: Context diversity without product drift

CONTEXT: {{CONTEXT}}
(Must be DIFFERENT from all previous contexts)

Variation from environment and angle, NOT product changes.

EXACT REPRODUCTION (NO DRIFT):
- Same fabric texture, print/artwork, monogram placement, proportions
- Product physically supported (no floating)

NO CREATIVE REINTERPRETATION.`
};

/**
 * Generate prompt for a specific shot using preplanned shot data
 */
export function generateShotPrompt(params: {
    shotPlan: ShotPlan;
    productName: string;
    category: ProductCategory;
    template: AdTemplate;
}): string {
    const { shotPlan, productName, category, template } = params;
    const { shotType, spatialRole, context } = shotPlan;

    const spatialRoleDefinition = SPATIAL_ROLE_DEFINITIONS[spatialRole];

    // Assemble: Base (immutable) + Category Context + Context + Spatial Role + Shot Constraints
    let prompt = `${IMMUTABLE_BASE_PROMPT}

Product: ${productName}
${CATEGORY_CONTEXT[category]}

CONTEXT: ${context}

${getShotConstraints(shotType, context, spatialRoleDefinition)}`;

    // For HOOK only: Add template-specific hook variant
    if (shotType === 'hook') {
        prompt += `\n\n${HOOK_VARIANTS[template]}`;
    }

    return prompt;
}

/**
 * Get shot constraints with context and spatial role
 */
function getShotConstraints(shotType: ShotType, context: string, spatialRole: string): string {
    const constraints = SHOT_CONSTRAINTS[shotType];
    return constraints
        .replace('{{CONTEXT}}', context)
        .replace('{{SPATIAL_ROLE}}', spatialRole);
}

/**
 * Validate that a 4-shot plan has no role repetition (HARD CHECK)
 */
export function validateFourShotPlan(plan: FourShotPlan): { valid: boolean; error?: string } {
    const roles = plan.shots.map(s => s.spatialRole);
    const uniqueRoles = new Set(roles);

    if (uniqueRoles.size !== roles.length) {
        return {
            valid: false,
            error: `HARD BLOCK: Spatial role repetition detected in plan. Roles: ${roles.join(', ')}`
        };
    }

    // Verify shot2 is handled-transient
    if (plan.shots[1].spatialRole !== 'handled-transient') {
        return {
            valid: false,
            error: `HARD BLOCK: Shot 2 (proof) must be handled-transient, got ${plan.shots[1].spatialRole}`
        };
    }

    return { valid: true };
}

/**
 * Get shot duration for video conversion (future)
 */
export function getShotDuration(shotType: ShotType): number {
    const durations: Record<ShotType, number> = {
        hook: 1.2,
        proof: 2.3,
        variation: 1.0,
        winner: 0.5
    };

    return durations[shotType];
}

/**
 * Get shot display name (new AAA architecture)
 */
export function getShotDisplayName(shotType: ShotType): string {
    const names: Record<ShotType, string> = {
        hook: 'Hero',              // SHOT 1: HOOK (Hero Reference)
        proof: 'Trust (Handling)', // SHOT 2: TRUST (Handling/Reality)
        variation: 'Trust (Flat)', // SHOT 3: TRUST (Flat/E-commerce)
        winner: 'Variation'        // SHOT 4: VARIATION (Angle/Context)
    };

    return names[shotType];
}
