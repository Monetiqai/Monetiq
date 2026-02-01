/**
 * TEST: Ads Mode Step 1 Upload → R2 Validation
 * 
 * Validates that /api/upload-asset correctly:
 * - Uploads to R2 (not Supabase Storage)
 * - Returns R2 public URL
 * - Tracks origin_provider='r2' in DB
 * - Populates r2_key and public_url
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function testUploadAssetR2() {
    console.log('🧪 TEST: Ads Mode Upload Asset → R2 Validation\n');

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.error('❌ Missing environment variables');
        console.error('SUPABASE_URL:', SUPABASE_URL ? 'OK' : 'MISSING');
        console.error('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'OK' : 'MISSING');
        process.exit(1);
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        console.error('❌ Not authenticated. Please login first.');
        console.log('Run: npm run dev and login via UI');
        process.exit(1);
    }

    console.log(`✅ Authenticated as: ${user.email}`);
    console.log(`User ID: ${user.id}\n`);

    // Create a test image (1x1 red pixel PNG)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    const testImageBuffer = Buffer.from(testImageBase64, 'base64');

    // Create FormData
    const formData = new FormData();
    const blob = new Blob([testImageBuffer], { type: 'image/png' });
    formData.append('file', blob, 'test-upload-r2.png');
    formData.append('role', 'product_image');

    console.log('📤 Uploading test image to /api/upload-asset...\n');

    // Get session token for authentication
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        console.error('❌ No session found');
        process.exit(1);
    }

    // Upload via API
    const uploadResponse = await fetch('http://localhost:3000/api/upload-asset', {
        method: 'POST',
        headers: {
            'Cookie': `sb-access-token=${session.access_token}; sb-refresh-token=${session.refresh_token}`
        },
        body: formData
    });

    const uploadResult = await uploadResponse.json();

    console.log('📦 UPLOAD RESPONSE:');
    console.log(JSON.stringify(uploadResult, null, 2));
    console.log('');

    // Validation checks
    const checks = {
        'Response has assetId': !!uploadResult.assetId,
        'Response has url': !!uploadResult.url,
        'URL starts with R2 domain': uploadResult.url?.startsWith('https://pub-'),
        'URL is NOT Supabase Storage': !uploadResult.url?.includes('supabase.co/storage'),
        'Response has provider': !!uploadResult.provider,
        'Provider is r2': uploadResult.provider === 'r2',
        'Response has key': !!uploadResult.key,
    };

    console.log('✅ VALIDATION CHECKS:');
    for (const [check, passed] of Object.entries(checks)) {
        console.log(`${passed ? '✅' : '❌'} ${check}`);
    }
    console.log('');

    if (!uploadResult.assetId) {
        console.error('❌ No assetId returned, cannot check DB');
        process.exit(1);
    }

    // Check DB record
    console.log('🔍 Checking DB record...\n');

    const { data: asset, error: dbError } = await supabase
        .from('assets')
        .select('id, origin_provider, r2_bucket, r2_key, public_url, storage_bucket, storage_path, byte_size, mime_type')
        .eq('id', uploadResult.assetId)
        .single();

    if (dbError) {
        console.error('❌ DB query error:', dbError);
        process.exit(1);
    }

    console.log('📊 DB RECORD:');
    console.log(JSON.stringify(asset, null, 2));
    console.log('');

    const dbChecks = {
        'origin_provider is r2': asset.origin_provider === 'r2',
        'r2_bucket populated': !!asset.r2_bucket,
        'r2_key populated': !!asset.r2_key,
        'public_url populated': !!asset.public_url,
        'public_url is R2 URL': asset.public_url?.startsWith('https://pub-'),
        'storage_bucket is null': asset.storage_bucket === null,
        'storage_path is null': asset.storage_path === null,
        'byte_size populated': !!asset.byte_size,
        'mime_type populated': !!asset.mime_type,
    };

    console.log('✅ DB VALIDATION CHECKS:');
    for (const [check, passed] of Object.entries(dbChecks)) {
        console.log(`${passed ? '✅' : '❌'} ${check}`);
    }
    console.log('');

    // Final verdict
    const allChecksPassed = Object.values(checks).every(v => v) && Object.values(dbChecks).every(v => v);

    if (allChecksPassed) {
        console.log('🎉 ✅ ALL CHECKS PASSED!');
        console.log('');
        console.log('SUMMARY:');
        console.log(`- URL: ${uploadResult.url}`);
        console.log(`- Provider: ${uploadResult.provider}`);
        console.log(`- R2 Key: ${uploadResult.key}`);
        console.log(`- DB origin_provider: ${asset.origin_provider}`);
        console.log(`- DB public_url: ${asset.public_url}`);
        console.log('');
        console.log('✅ Upload Asset R2 Integration: VALIDATED');
    } else {
        console.log('❌ SOME CHECKS FAILED!');
        console.log('');
        console.log('Failed checks:');
        for (const [check, passed] of Object.entries({ ...checks, ...dbChecks })) {
            if (!passed) {
                console.log(`  ❌ ${check}`);
            }
        }
        process.exit(1);
    }
}

// Run test
testUploadAssetR2().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
