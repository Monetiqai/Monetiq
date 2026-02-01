/**
 * PHASE 11 — CONSTRAINT VALIDATION TESTS
 * 
 * Tests that DB constraints properly reject invalid data
 * 
 * Expected: All 4 tests should FAIL (constraints block invalid inserts)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testConstraints() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  PHASE 11 — CONSTRAINT TESTS           ║');
    console.log('╚════════════════════════════════════════╝\n');

    const tests = [
        {
            name: 'Invalid: 3 roles (should be 4)',
            data: {
                product_id: 'test',
                product_name: 'Test',
                category: 'hoodies',
                template: 'luxury',
                run_id: `test-invalid-1-${Date.now()}`,
                plan_seed: 'seed',
                plan_roles: ['role1', 'role2', 'role3'], // Only 3
                plan_contexts: ['ctx1', 'ctx2', 'ctx3', 'ctx4']
            },
            expectedError: 'plan_roles_is_array_of_4'
        },
        {
            name: 'Invalid: Shot2 ≠ handled-transient',
            data: {
                product_id: 'test',
                product_name: 'Test',
                category: 'hoodies',
                template: 'luxury',
                run_id: `test-invalid-2-${Date.now()}`,
                plan_seed: 'seed',
                plan_roles: [
                    'supported-elevated',
                    'grounded-static', // Should be handled-transient
                    'folded-resting',
                    'handled-transient'
                ],
                plan_contexts: ['ctx1', 'ctx2', 'ctx3', 'ctx4']
            },
            expectedError: 'shot2_is_handled_transient'
        },
        {
            name: 'Invalid: Duplicate roles',
            data: {
                product_id: 'test',
                product_name: 'Test',
                category: 'hoodies',
                template: 'luxury',
                run_id: `test-invalid-3-${Date.now()}`,
                plan_seed: 'seed',
                plan_roles: [
                    'supported-elevated',
                    'handled-transient',
                    'supported-elevated', // Duplicate
                    'grounded-static'
                ],
                plan_contexts: ['ctx1', 'ctx2', 'ctx3', 'ctx4']
            },
            expectedError: 'roles_are_unique'
        },
        {
            name: 'Invalid: Invalid role value',
            data: {
                product_id: 'test',
                product_name: 'Test',
                category: 'hoodies',
                template: 'luxury',
                run_id: `test-invalid-4-${Date.now()}`,
                plan_seed: 'seed',
                plan_roles: [
                    'invalid-role', // Not in allowed set
                    'handled-transient',
                    'folded-resting',
                    'grounded-static'
                ],
                plan_contexts: ['ctx1', 'ctx2', 'ctx3', 'ctx4']
            },
            expectedError: 'roles_are_valid'
        }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        try {
            const { error } = await supabase
                .from('ads_generations')
                .insert(test.data);

            if (error) {
                // Expected: constraint violation
                const errorMessage = error.message.toLowerCase();
                const expectedConstraint = test.expectedError.toLowerCase();

                if (errorMessage.includes(expectedConstraint) || errorMessage.includes('constraint') || errorMessage.includes('check')) {
                    console.log(`✅ ${test.name}`);
                    console.log(`   Correctly rejected: ${error.message}\n`);
                    passed++;
                } else {
                    console.log(`❌ ${test.name}`);
                    console.log(`   Wrong error: ${error.message}`);
                    console.log(`   Expected: ${test.expectedError}\n`);
                    failed++;
                }
            } else {
                // Unexpected: insert succeeded
                console.log(`❌ ${test.name}`);
                console.log(`   ERROR: Insert succeeded (should have been rejected)\n`);
                failed++;
            }
        } catch (error: any) {
            console.log(`❌ ${test.name}`);
            console.log(`   Exception: ${error.message}\n`);
            failed++;
        }
    }

    console.log('\n╔════════════════════════════════════════╗');
    console.log(`║  Results: ${passed}/${tests.length} passed              ║`);
    console.log('╚════════════════════════════════════════╝\n');

    process.exit(failed > 0 ? 1 : 0);
}

testConstraints();
