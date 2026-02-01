/**
 * SPATIAL ROLE VALIDATION (HARD LOCK - FAIL-FAST)
 * 
 * This module enforces spatial role constraints as HARD LOCKS.
 * If a shot violates its assigned spatial_role, generation MUST be blocked.
 * 
 * NO auto-correction. NO fallback. NO "more realistic alternative".
 * A failed constraint is better than a beautiful lie.
 */

export type SpatialRole = 'grounded-static' | 'supported-elevated' | 'handled-transient' | 'folded-resting';

/**
 * Validation rules for each spatial role
 */
export const SPATIAL_ROLE_VALIDATION: Record<SpatialRole, {
    required: string[];
    forbidden: string[];
    description: string;
}> = {
    'supported-elevated': {
        description: 'Product MUST be attached to visible physical support (hanger, hook, rail)',
        required: [
            'Product attached to visible support',
            'Product elevated above ground',
            'Support structure visible (hanger, hook, rail, wall mount)'
        ],
        forbidden: [
            'Human hands visible',
            'Product resting on surface',
            'Product on floor',
            'Product appears to be in motion',
            'Invisible or unclear support'
        ]
    },
    'grounded-static': {
        description: 'Product MUST rest fully on a surface with visible gravity',
        required: [
            'Product resting on surface (bed, table, floor, rug)',
            'Gravity visible (natural contact, shadows)',
            'Product is static (not moving)'
        ],
        forbidden: [
            'Human hands visible',
            'Product hanging or elevated',
            'Product floating',
            'Product appears to be in motion'
        ]
    },
    'handled-transient': {
        description: 'Human hands REQUIRED, product in motion or manipulation',
        required: [
            'Human hands visible',
            'Hands interacting with product (holding, lifting, folding, adjusting)',
            'Product in motion or manipulation',
            'Realistic interaction (not staged)'
        ],
        forbidden: [
            'No human hands visible',
            'Product resting on surface without hands',
            'Product hanging without hands',
            'Hands visible but not interacting with product',
            'Staged or fashion-style posing'
        ]
    },
    'folded-resting': {
        description: 'Product folded/compact, resting on surface, inactive state',
        required: [
            'Product folded or compact (not fully extended)',
            'Product resting on surface (table, bed, floor)',
            'Inactive state (not being manipulated)'
        ],
        forbidden: [
            'Human hands visible',
            'Product fully extended (not folded)',
            'Product hanging or elevated',
            'Product appears to be in motion'
        ]
    }
};

/**
 * Validate if a generated image respects its spatial role
 * 
 * NOTE: This is a placeholder for future image analysis validation.
 * Currently, validation happens at the prompt level (hard constraints in prompt).
 * 
 * @param imageUrl - URL of generated image
 * @param spatialRole - Expected spatial role
 * @returns Validation result with pass/fail and violation details
 */
export async function validateSpatialRole(
    imageUrl: string,
    spatialRole: SpatialRole
): Promise<{
    valid: boolean;
    violations: string[];
    spatialRole: SpatialRole;
}> {
    // TODO: Implement image analysis validation
    // For now, we rely on prompt-level enforcement
    return {
        valid: true,
        violations: [],
        spatialRole
    };
}

/**
 * Get human-readable error message for spatial role violation
 */
export function getSpatialRoleViolationError(
    spatialRole: SpatialRole,
    violations: string[]
): string {
    const rules = SPATIAL_ROLE_VALIDATION[spatialRole];
    return `SPATIAL ROLE VIOLATION: ${spatialRole}

Expected: ${rules.description}

Violations detected:
${violations.map(v => `- ${v}`).join('\n')}

Required elements:
${rules.required.map(r => `- ${r}`).join('\n')}

Forbidden elements:
${rules.forbidden.map(f => `- ${f}`).join('\n')}

Generation BLOCKED. No fallback. No auto-correction.
A failed constraint is better than a beautiful lie.`;
}
