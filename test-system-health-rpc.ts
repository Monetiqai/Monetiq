/**
 * TEST SCRIPT — System Health Function (Node.js)
 * 
 * Tests get_system_health() via authenticated RPC call
 * 
 * Usage:
 *   npx tsx test-system-health-rpc.ts
 * 
 * Prerequisites:
 *   - User must be logged in (session in browser)
 *   - Or provide SUPABASE_ACCESS_TOKEN env var
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testSystemHealth() {
    console.log('🧪 Testing get_system_health() via authenticated RPC...\n');

    // Check required env vars
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('❌ Missing environment variables:');
        console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
        console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅' : '❌');
        process.exit(1);
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Option 1: Use existing session (if available)
    // Option 2: Sign in with email/password

    console.log('📧 Please provide credentials to test:');
    console.log('   (Or set SUPABASE_ACCESS_TOKEN env var)\n');

    // For testing, you can hardcode credentials temporarily
    // OR use environment variable
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

    if (accessToken) {
        // Use access token directly
        console.log('🔑 Using access token from env...');
        supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: '' // Not needed for this test
        });
    } else if (email && password) {
        // Sign in with credentials
        console.log(`🔑 Signing in as ${email}...`);
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (authError) {
            console.error('❌ Authentication failed:', authError.message);
            process.exit(1);
        }

        console.log('✅ Authenticated as:', authData.user?.id);
    } else {
        console.error('❌ No authentication method provided.');
        console.error('   Set one of:');
        console.error('   - SUPABASE_ACCESS_TOKEN (from browser dev tools)');
        console.error('   - TEST_USER_EMAIL + TEST_USER_PASSWORD');
        console.error('\nTo get access token:');
        console.error('   1. Open browser dev tools (F12)');
        console.error('   2. Go to Application > Local Storage');
        console.error('   3. Find supabase.auth.token');
        console.error('   4. Copy access_token value');
        console.error('   5. Run: SUPABASE_ACCESS_TOKEN=<token> npx tsx test-system-health-rpc.ts');
        process.exit(1);
    }

    // Call the function
    console.log('\n📞 Calling get_system_health()...');

    const { data, error } = await supabase.rpc('get_system_health');

    if (error) {
        console.error('❌ RPC Error:', error);
        process.exit(1);
    }

    console.log('✅ Function returned successfully!\n');

    // Validate structure
    const expectedKeys = [
        'total_runs',
        'hook_fail_count',
        'abort_count',
        'retry_count',
        'total_plan_retries_sum',
        'total_shot_retries_sum',
        'total_cost_sum',
        'avg_cost_per_run',
        'r2_only_runs_count',
        'missing_public_url_count'
    ];

    const missingKeys = expectedKeys.filter(key => !(key in data));

    if (missingKeys.length > 0) {
        console.warn('⚠️ Missing keys:', missingKeys);
    } else {
        console.log('✅ All expected keys present\n');
    }

    // Display metrics
    console.log('📊 System Health Metrics:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Core Metrics:');
    console.log(`  Total Runs:           ${data.total_runs}`);
    console.log(`  Hook Failures:        ${data.hook_fail_count}`);
    console.log(`  Aborts:               ${data.abort_count}`);
    console.log('');
    console.log('Retry Metrics:');
    console.log(`  Runs with Retries:    ${data.retry_count}`);
    console.log(`  Total Plan Retries:   ${data.total_plan_retries_sum}`);
    console.log(`  Total Shot Retries:   ${data.total_shot_retries_sum}`);
    console.log('');
    console.log('Cost Metrics:');
    console.log(`  Total Cost:           $${data.total_cost_sum?.toFixed(4) || '0.0000'}`);
    console.log(`  Avg Cost per Run:     $${data.avg_cost_per_run?.toFixed(4) || '0.0000'}`);
    console.log('');
    console.log('R2 Compliance:');
    console.log(`  R2-Only Runs:         ${data.r2_only_runs_count}`);
    console.log(`  Missing Public URLs:  ${data.missing_public_url_count}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Calculate percentages
    if (data.total_runs > 0) {
        console.log('\n📈 Calculated Metrics:');
        const hookFailRate = (data.hook_fail_count / data.total_runs * 100).toFixed(2);
        const abortRate = (data.abort_count / data.total_runs * 100).toFixed(2);
        const retryRate = (data.retry_count / data.total_runs * 100).toFixed(2);
        const r2Coverage = (data.r2_only_runs_count / data.total_runs * 100).toFixed(2);

        console.log(`  Hook Fail Rate:       ${hookFailRate}%`);
        console.log(`  Abort Rate:           ${abortRate}%`);
        console.log(`  Retry Rate:           ${retryRate}%`);
        console.log(`  R2 Coverage:          ${r2Coverage}%`);
    }

    console.log('\n✅ Test completed successfully!');

    process.exit(0);
}

// Run test
testSystemHealth().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
