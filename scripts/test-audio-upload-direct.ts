/**
 * MUSIC MODE - Phase 0: R2 Audio Upload Test (Direct R2)
 * 
 * This script tests R2 audio upload directly without media-store abstraction
 * 
 * Run: npx tsx scripts/test-audio-upload-direct.ts
 */

// Load environment variables FIRST
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local'), override: true });

// Clean up quoted values (dotenv doesn't strip quotes automatically)
Object.keys(process.env).forEach(key => {
    if (process.env[key]?.startsWith('"') && process.env[key]?.endsWith('"')) {
        process.env[key] = process.env[key]!.slice(1, -1);
    }
});

console.log('[DEBUG] R2_ENDPOINT:', process.env.R2_ENDPOINT);
console.log('[DEBUG] R2_ACCESS_KEY_ID:', process.env.R2_ACCESS_KEY_ID?.substring(0, 8) + '...');
console.log('[DEBUG] R2_BUCKET:', process.env.R2_BUCKET);
console.log('');

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@/lib/supabase/server';

// Create R2 client directly (avoid config.ts timing issues)
const r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
    }
});

const R2_BUCKET = process.env.R2_BUCKET || 'monetiqai';
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL!;

// Generate minimal WAV file (1 second of silence)
function generateSilentWav(durationSec: number = 1): Buffer {
    const sampleRate = 44100;
    const numChannels = 1;
    const bitsPerSample = 16;
    const numSamples = sampleRate * durationSec;
    const dataSize = numSamples * numChannels * (bitsPerSample / 8);

    const buffer = Buffer.alloc(44 + dataSize);

    // WAV header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
    buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
    buffer.writeUInt16LE(bitsPerSample, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    buffer.fill(0, 44);

    return buffer;
}

async function testAudioUpload() {
    console.log('🎵 MUSIC MODE - R2 Audio Upload Test (Direct)\n');

    try {
        // Step 1: Generate test audio
        console.log('[1/4] Generating test audio (1s silence)...');
        const audioBuffer = generateSilentWav(1);
        console.log(`✓ Generated ${audioBuffer.length} bytes WAV file\n`);

        // Step 2: Upload directly to R2
        console.log('[2/4] Uploading directly to R2...');
        const r2 = new R2Provider();
        const key = `music-mode/test/test-audio-${Date.now()}.wav`;

        const uploadResult = await r2.putObject({
            buffer: audioBuffer,
            key,
            contentType: 'audio/wav'
        });

        console.log('✓ Upload successful!');
        console.log(`  Provider: R2`);
        console.log(`  Key: ${uploadResult.key}`);
        console.log(`  URL: ${uploadResult.url}\n`);

        // Step 3: Create asset row
        console.log('[3/4] Creating asset row in database...');
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            throw new Error('No authenticated user. Run this script with auth context.');
        }

        const { data: asset, error } = await supabase
            .from('assets')
            .insert({
                user_id: user.id,
                kind: 'audio', // ← This tests the migration!
                role: 'music_test',
                status: 'ready',
                public_url: uploadResult.url,
                r2_key: uploadResult.key,
                origin_provider: 'r2',
                mime_type: 'audio/wav',
                file_size: audioBuffer.length,
                meta: {
                    test: true,
                    duration_sec: 1,
                    format: 'wav'
                }
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Database insert failed: ${error.message}`);
        }

        console.log('✓ Asset created!');
        console.log(`  Asset ID: ${asset.id}`);
        console.log(`  Kind: ${asset.kind}`);
        console.log(`  Public URL: ${asset.public_url}\n`);

        // Step 4: Verify public URL is accessible
        console.log('[4/4] Verifying public URL...');
        const response = await fetch(asset.public_url);

        if (!response.ok) {
            throw new Error(`Public URL not accessible: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        console.log('✓ Public URL accessible!');
        console.log(`  Status: ${response.status}`);
        console.log(`  Content-Type: ${contentType}\n`);

        // Success!
        console.log('🎉 ALL TESTS PASSED!\n');
        console.log('Phase 0 DONE Criteria:');
        console.log('  ✅ Audio file uploaded to R2');
        console.log('  ✅ public_url is publicly accessible');
        console.log('  ✅ Asset row created with kind=\'audio\', origin_provider=\'r2\'');
        console.log('\nReady to proceed to Phase 1 (MVP)!\n');

        return asset;

    } catch (error: any) {
        console.error('\n❌ TEST FAILED:', error.message);
        console.error('\nTroubleshooting:');
        console.error('  1. Run migration: npx supabase db push');
        console.error('  2. Check R2 credentials in .env.local');
        console.error('  3. Ensure authenticated user exists\n');
        throw error;
    }
}

// Run test
testAudioUpload()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
