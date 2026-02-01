/**
 * MUSIC MODE - Phase 0: R2 Audio Upload Test
 * 
 * This script tests that:
 * 1. uploadMedia() can upload audio files to R2
 * 2. assets table accepts kind='audio'
 * 3. public_url is accessible
 * 
 * Run: npx tsx scripts/test-audio-upload.ts
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local'), override: true });

// Force R2 provider for this test
process.env.MEDIA_WRITE_PROVIDER = 'r2';

console.log(`[DEBUG] MEDIA_WRITE_PROVIDER = ${process.env.MEDIA_WRITE_PROVIDER}`);
console.log(`[DEBUG] R2_ENDPOINT = ${process.env.R2_ENDPOINT ? '✓ set' : '✗ missing'}`);
console.log(`[DEBUG] R2_ACCESS_KEY_ID = ${process.env.R2_ACCESS_KEY_ID ? '✓ set' : '✗ missing'}\n`);

import { uploadMedia } from '@/lib/storage/media-store';
import { createClient } from '@/lib/supabase/server';

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
    buffer.writeUInt32LE(16, 16); // fmt chunk size
    buffer.writeUInt16LE(1, 20); // audio format (PCM)
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28); // byte rate
    buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32); // block align
    buffer.writeUInt16LE(bitsPerSample, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    // Silent audio data (zeros)
    buffer.fill(0, 44);

    return buffer;
}

async function testAudioUpload() {
    console.log('🎵 MUSIC MODE - R2 Audio Upload Test\n');

    try {
        // Step 1: Generate test audio
        console.log('[1/4] Generating test audio (1s silence)...');
        const audioBuffer = generateSilentWav(1);
        console.log(`✓ Generated ${audioBuffer.length} bytes WAV file\n`);

        // Step 2: Upload to R2
        console.log('[2/4] Uploading to R2...');
        const uploadResult = await uploadMedia({
            buffer: audioBuffer,
            filename: `test-audio-${Date.now()}.wav`,
            contentType: 'audio/wav',
            path: 'music-mode/test'
        });
        console.log('✓ Upload successful!');
        console.log(`  Provider: ${uploadResult.provider}`);
        console.log(`  Key: ${uploadResult.key}`);
        console.log(`  URL: ${uploadResult.url}\n`);

        // Step 3: Create asset row
        console.log('[3/4] Creating asset row in database...');
        const supabase = await createClient();

        // Get current user (for testing, use service role or hardcode user_id)
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
        console.error('  2. Check R2 credentials in .env');
        console.error('  3. Ensure authenticated user exists\n');
        throw error;
    }
}

// Run test
testAudioUpload()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
