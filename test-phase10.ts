/**
 * PHASE 10 — END-TO-END TEST SCRIPT
 * 
 * Tests real image generation with one generic product
 * 
 * ACCEPTANCE CRITERIA:
 * - 4 real images generated and uploaded
 * - URLs are accessible
 * - Roles and contexts match the plan
 * - No constraint-dropping fallback
 * - HOOK failure does not silently continue
 */

// Load environment variables from .env.local
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { generateAdsSequence } from './lib/ads-mode/ads-pipeline';
import { ensureStorageBucket } from './lib/ads-mode/image-generation';
import * as fs from 'fs';

// Test product (matching Phase 9)
const TEST_PRODUCT = {
    productId: 'test-hoodie-001',
    productName: 'Plain Hoodie',
    category: 'hoodies' as const,
    template: 'luxury' as const
};

async function runPhase10Test() {
    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║  PHASE 10 — E2E TEST                   ║`);
    console.log(`╚════════════════════════════════════════╝\n`);

    try {
        // Ensure storage bucket exists
        console.log('[Setup] Ensuring storage bucket exists...');
        await ensureStorageBucket();
        console.log('[Setup] ✓ Storage ready\n');

        // Generate ads sequence
        console.log(`[Test] Generating 4-shot sequence for: ${TEST_PRODUCT.productName}\n`);

        const result = await generateAdsSequence(TEST_PRODUCT);

        // Log results
        console.log(`\n╔════════════════════════════════════════╗`);
        console.log(`║  PHASE 10 TEST RESULTS                 ║`);
        console.log(`╚════════════════════════════════════════╝\n`);

        console.log(`Run ID: ${result.runId}`);
        console.log(`Status: ${result.status}`);
        console.log(`\nPlan:`);
        console.log(`  Seed: ${result.plan.seed}`);
        console.log(`  Roles: ${result.plan.roles.join(' → ')}`);
        console.log(`  Contexts: ${result.plan.contexts.map(c => c.split('(')[0].trim()).join(', ')}`);

        console.log(`\nShots:`);
        result.shots.forEach((shot, idx) => {
            console.log(`  ${idx + 1}. ${shot.shotType} (${shot.role})`);
            console.log(`     Status: ${shot.status}`);
            console.log(`     Retries: ${shot.retries}`);
            if (shot.url) {
                console.log(`     URL: ${shot.url}`);
            }
            if (shot.error) {
                console.log(`     Error: ${shot.error}`);
            }
        });

        console.log(`\nTotals:`);
        console.log(`  Plan Retries: ${result.totals.planRetries}`);
        console.log(`  Shot Retries: ${result.totals.shotRetries}`);

        // Validation
        console.log(`\n╔════════════════════════════════════════╗`);
        console.log(`║  VALIDATION                            ║`);
        console.log(`╚════════════════════════════════════════╝\n`);

        const validations = {
            'All 4 shots generated': result.shots.length === 4,
            'All shots successful': result.shots.every(s => s.status === 'SUCCESS'),
            'All URLs present': result.shots.every(s => !!s.url),
            'Roles match plan': result.shots.every((s, i) => s.role === result.plan.roles[i]),
            'Contexts match plan': result.shots.every((s, i) => s.context === result.plan.contexts[i]),
            'No role repetition': new Set(result.plan.roles).size === 4,
            'Shot 2 is handled-transient': result.plan.roles[1] === 'handled-transient'
        };

        let allPassed = true;
        for (const [check, passed] of Object.entries(validations)) {
            console.log(`${passed ? '✅' : '❌'} ${check}`);
            if (!passed) allPassed = false;
        }

        // Save detailed results
        const logDir = path.join(process.cwd(), 'test-logs', 'phase10');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        const resultFile = path.join(logDir, `${result.runId}-result.json`);
        fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));
        console.log(`\n[Log] Results saved to: ${resultFile}`);

        // Final verdict
        console.log(`\n╔════════════════════════════════════════╗`);
        if (allPassed && result.status === 'SUCCESS') {
            console.log(`║  ✅ PHASE 10 ACCEPTANCE: PASS          ║`);
        } else {
            console.log(`║  ❌ PHASE 10 ACCEPTANCE: FAIL          ║`);
        }
        console.log(`╚════════════════════════════════════════╝\n`);

        process.exit(allPassed && result.status === 'SUCCESS' ? 0 : 1);

    } catch (error: any) {
        console.error(`\n❌ PHASE 10 TEST FAILED`);
        console.error(`Error: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    runPhase10Test();
}

export { runPhase10Test };
