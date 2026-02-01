/**
 * Constraint Extraction System (v2.0 - LOCKED)
 * 
 * Extracts hard constraints from reference images WITHOUT passing them to Gemini.
 * Ensures structural fidelity and prevents semantic drift.
 * 
 * MANDATORY BLOCKS:
 * 1️⃣ Constraint Typing (CRITICAL/SECONDARY/INFO)
 * 2️⃣ Canonical Truth Rule (canonical always wins)
 * 3️⃣ Negative Constraints (HARD)
 * 4️⃣ Prompt Injection STRICTE (machine-readable)
 */

// ============================================================================
// 1️⃣ CONSTRAINT TYPING (OBLIGATOIRE)
// ============================================================================

export type ConstraintLevel = 'CRITICAL' | 'SECONDARY' | 'INFO';

export interface Constraint {
    key: string;
    value: string | number | boolean;
    level: ConstraintLevel; // CRITICAL = violation = FAIL immédiat
    source_image_ids: string[];
}

export interface ProductConstraints {
    constraints: Constraint[];
    canonical_image_id: string; // Canonical truth source
}

// ============================================================================
// 2️⃣ CANONICAL TRUTH RULE
// ============================================================================

/**
 * If multiple reference images disagree:
 * → Canonical image ALWAYS wins
 * → Other images can ONLY restrict, never override
 * 
 * Non négociable.
 */
function resolveConflict(
    canonicalValue: any,
    additionalValues: any[]
): any {
    // Canonical image ALWAYS wins
    return canonicalValue;
}

// ============================================================================
// 3️⃣ NEGATIVE CONSTRAINTS (HARD)
// ============================================================================

const FORBIDDEN_ELEMENTS: Constraint[] = [
    {
        key: 'FORBIDDEN_LOGO_NOT_IN_REFERENCE',
        value: true,
        level: 'CRITICAL',
        source_image_ids: []
    },
    {
        key: 'FORBIDDEN_MIRRORED_TEXT',
        value: true,
        level: 'CRITICAL',
        source_image_ids: []
    },
    {
        key: 'FORBIDDEN_ADDITIONAL_BUTTONS',
        value: true,
        level: 'CRITICAL',
        source_image_ids: []
    },
    {
        key: 'FORBIDDEN_STRUCTURAL_PARTS_NOT_IN_REFERENCE',
        value: true,
        level: 'CRITICAL',
        source_image_ids: []
    }
];

// ➡️ Violation = FAIL, pas retry silencieux.

// ============================================================================
// EXTRACTION FUNCTION
// ============================================================================

/**
 * Extract constraints from multiple reference images
 * 
 * NOTE: This is a PLACEHOLDER for future AI-based extraction.
 * For MVP, we use heuristics and metadata.
 */
export async function extractConstraints(params: {
    canonicalImageUrl: string;
    additionalImageUrls: string[];
    productCategory: string;
}): Promise<ProductConstraints> {
    const { canonicalImageUrl, additionalImageUrls, productCategory } = params;

    console.log('[Constraint Extractor] Analyzing reference images...');
    console.log(`  Canonical: ${canonicalImageUrl}`);
    console.log(`  Additional: ${additionalImageUrls.length} image(s)`);

    const constraints: Constraint[] = [];
    const canonicalImageId = canonicalImageUrl.split('/').pop() || 'canonical';

    // Add FORBIDDEN elements (CRITICAL level)
    constraints.push(...FORBIDDEN_ELEMENTS);

    // Category-specific constraints
    if (productCategory === 'electronics') {
        constraints.push({
            key: 'LOGO_ORIENTATION',
            value: 'LEFT_TO_RIGHT',
            level: 'CRITICAL',
            source_image_ids: [canonicalImageId]
        });

        constraints.push({
            key: 'BUTTON_LAYOUT',
            value: 'EXACT_AS_REFERENCE',
            level: 'CRITICAL',
            source_image_ids: [canonicalImageId]
        });

        constraints.push({
            key: 'PORT_POSITIONS',
            value: 'LOCKED',
            level: 'CRITICAL',
            source_image_ids: [canonicalImageId]
        });

        constraints.push({
            key: 'SCREEN_ORIENTATION',
            value: 'MATCH_REFERENCE',
            level: 'CRITICAL',
            source_image_ids: [canonicalImageId]
        });
    }

    if (productCategory === 'fashion') {
        constraints.push({
            key: 'LOGO_POSITION',
            value: 'TOP_CENTER',
            level: 'CRITICAL',
            source_image_ids: [canonicalImageId]
        });

        constraints.push({
            key: 'PATTERN_ALTERATION',
            value: 'FORBIDDEN',
            level: 'CRITICAL',
            source_image_ids: [canonicalImageId]
        });
    }

    // Universal constraints
    constraints.push({
        key: 'OBJECT_SYMMETRY',
        value: 'PRESERVE',
        level: 'CRITICAL',
        source_image_ids: [canonicalImageId]
    });

    constraints.push({
        key: 'HANDS_VISIBLE',
        value: false,
        level: 'CRITICAL',
        source_image_ids: []
    });

    constraints.push({
        key: 'ACCESSORIES_NOT_IN_REFERENCE',
        value: 'FORBIDDEN',
        level: 'CRITICAL',
        source_image_ids: []
    });

    console.log(`[Constraint Extractor] Extracted ${constraints.length} constraints`);

    return {
        constraints,
        canonical_image_id: canonicalImageId
    };
}

// ============================================================================
// 4️⃣ PROMPT INJECTION STRICTE (machine-readable)
// ============================================================================

/**
 * Format constraints into MACHINE-READABLE prompt instructions
 * 
 * ❌ Mauvais: "Make sure the logo is correct"
 * ✅ Bon: LOGO_ORIENTATION = LEFT_TO_RIGHT
 */
export function formatConstraintsForPrompt(constraints: ProductConstraints): string {
    const lines: string[] = [
        '═══════════════════════════════════════════════════════',
        'HARD CONSTRAINTS (MACHINE-READABLE)',
        '═══════════════════════════════════════════════════════',
        ''
    ];

    // Group by level
    const critical = constraints.constraints.filter(c => c.level === 'CRITICAL');
    const secondary = constraints.constraints.filter(c => c.level === 'SECONDARY');
    const info = constraints.constraints.filter(c => c.level === 'INFO');

    // CRITICAL constraints (violation = FAIL)
    if (critical.length > 0) {
        lines.push('🚨 CRITICAL CONSTRAINTS (VIOLATION = IMMEDIATE FAIL):');
        lines.push('');
        critical.forEach(c => {
            lines.push(`${c.key} = ${String(c.value).toUpperCase()}`);
        });
        lines.push('');
    }

    // SECONDARY constraints
    if (secondary.length > 0) {
        lines.push('⚠️  SECONDARY CONSTRAINTS:');
        lines.push('');
        secondary.forEach(c => {
            lines.push(`${c.key} = ${String(c.value).toUpperCase()}`);
        });
        lines.push('');
    }

    // INFO constraints
    if (info.length > 0) {
        lines.push('ℹ️  INFO CONSTRAINTS:');
        lines.push('');
        info.forEach(c => {
            lines.push(`${c.key} = ${String(c.value).toUpperCase()}`);
        });
        lines.push('');
    }

    // Canonical truth rule
    lines.push('═══════════════════════════════════════════════════════');
    lines.push('CANONICAL TRUTH RULE:');
    lines.push(`CANONICAL_IMAGE_ID = ${constraints.canonical_image_id}`);
    lines.push('IF_CONFLICT → CANONICAL_ALWAYS_WINS');
    lines.push('═══════════════════════════════════════════════════════');
    lines.push('');
    lines.push('⚠️  CRITICAL: Any deviation from CRITICAL constraints = FAILURE.');
    lines.push('⚠️  NO RETRY. NO AUTO-FIX. FAIL IMMEDIATELY.');
    lines.push('');

    return lines.join('\n');
}

/**
 * FUTURE: AI-based constraint extraction using Gemini Vision
 * 
 * This would analyze additional images to extract:
 * - Logo detection and position
 * - Button/port detection
 * - Symmetry analysis
 * - Mechanical detail cataloging
 */
export async function extractConstraintsAI(params: {
    canonicalImageUrl: string;
    additionalImageUrls: string[];
}): Promise<ProductConstraints> {
    // TODO: Implement AI-based extraction
    // For now, fall back to heuristics
    return extractConstraints({
        ...params,
        productCategory: 'electronics' // Default
    });
}
