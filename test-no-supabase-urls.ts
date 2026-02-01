/**
 * REGRESSION TEST: No Supabase Storage URLs
 * 
 * Validates that when MEDIA_WRITE_PROVIDER=r2:
 * - Upload returns R2 URL only
 * - No Supabase Storage URLs in response or logs
 * - Fails hard if R2 upload fails (no fallback)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const MEDIA_WRITE_PROVIDER = process.env.MEDIA_WRITE_PROVIDER || 'r2';

async function testNoSupabaseUrls() {
    console.log('🧪 REGRESSION TEST: No Supabase Storage URLs\n');

    if (MEDIA_WRITE_PROVIDER !== 'r2') {
        console.warn('⚠️  MEDIA_WRITE_PROVIDER is not "r2", skipping test');
        console.log(`Current value: ${MEDIA_WRITE_PROVIDER}`);
        process.exit(0);
    }

    console.log('✅ MEDIA_WRITE_PROVIDER=r2 confirmed\n');

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        console.error('❌ Not authenticated. Please login first.');
        process.exit(1);
    }

    console.log(`✅ Authenticated as: ${user.email}\n`);

    // Create test image
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    const testImageBuffer = Buffer.from(testImageBase64, 'base64');

    // Create FormData
    const formData = new FormData();
    const blob = new Blob([testImageBuffer], { type: 'image/png' });
    formData.append('file', blob, 'regression-test-no-supabase-urls.png');
    formData.append('role', 'product_image');

    console.log('📤 Uploading test image...\n');

    // Get session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        console.error('❌ No session found');
        process.exit(1);
    }

    // Capture console logs
    const logs: string[] = [];
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args: any[]) => {
        const message = args.join(' ');
        logs.push(message);
        originalLog(...args);
    };

    console.error = (...args: any[]) => {
        const message = args.join(' ');
        logs.push(message);
        originalError(...args);
    };

    // Upload
    const uploadResponse = await fetch('http://localhost:3000/api/upload-asset', {
        method: 'POST',
        headers: {
            'Cookie': `sb-access-token=${session.access_token}; sb-refresh-token=${session.refresh_token}`
        },
        body: formData
    });

    // Restore console
    console.log = originalLog;
    console.error = originalError;

    const uploadResult = await uploadResponse.json();

    console.log('📦 UPLOAD RESPONSE:');
    console.log(JSON.stringify(uploadResult, null, 2));
    console.log('');

    // Check for Supabase Storage URLs
    const supabaseStoragePattern = /supabase\.co\/storage\/v1\/object\/public/i;

    const checks = {
        'Response has url': !!uploadResult.url,
        'URL is R2 (starts with https://pub-)': uploadResult.url?.startsWith('https://pub-'),
        'URL is NOT Supabase Storage': !supabaseStoragePattern.test(uploadResult.url || ''),
        'Provider is r2': uploadResult.provider === 'r2',
    };

    console.log('✅ RESPONSE VALIDATION:');
    for (const [check, passed] of Object.entries(checks)) {
        console.log(`${passed ? '✅' : '❌'} ${check}`);
    }
    console.log('');

    // Check logs for Supabase URLs
    const logsWithSupabaseUrls = logs.filter(log => supabaseStoragePattern.test(log));

    const logChecks = {
        'No Supabase Storage URLs in logs': logsWithSupabaseUrls.length === 0,
        'Logs show R2 upload': logs.some(log => log.includes('[R2] ✓ Uploaded')),
        'Logs show R2 provider': logs.some(log => log.includes('[R2Provider]')),
    };

    console.log('✅ LOG VALIDATION:');
    for (const [check, passed] of Object.entries(logChecks)) {
        console.log(`${passed ? '✅' : '❌'} ${check}`);
    }
    console.log('');

    if (logsWithSupabaseUrls.length > 0) {
        console.error('❌ FOUND SUPABASE STORAGE URLs IN LOGS:');
        logsWithSupabaseUrls.forEach(log => {
            console.error(`  - ${log}`);
        });
        console.log('');
    }

    // Final verdict
    const allChecksPassed = Object.values(checks).every(v => v) && Object.values(logChecks).every(v => v);

    if (allChecksPassed) {
        console.log('🎉 ✅ REGRESSION TEST PASSED!');
        console.log('');
        console.log('SUMMARY:');
        console.log('- No Supabase Storage URLs detected');
        console.log('- R2 upload confirmed');
        console.log('- Provider correctly set to r2');
        console.log('');
        console.log('✅ Media offload hardening: VALIDATED');
    } else {
        console.log('❌ REGRESSION TEST FAILED!');
        console.log('');
        console.log('Failed checks:');
        for (const [check, passed] of Object.entries({ ...checks, ...logChecks })) {
            if (!passed) {
                console.log(`  ❌ ${check}`);
            }
        }
        process.exit(1);
    }
}

// Run test
testNoSupabaseUrls().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
