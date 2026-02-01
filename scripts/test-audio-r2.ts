/**
 * MUSIC MODE - Phase 0: R2 Audio Upload Test (Direct)
 * 
 * Run: npx tsx scripts/test-audio-r2.ts
 */

// Load environment variables FIRST
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local'), override: true });

// Clean up quoted values
Object.keys(process.env).forEach(key => {
    if (process.env[key]?.startsWith('"') && process.env[key]?.endsWith('"')) {
        process.env[key] = process.env[key]!.slice(1, -1);
    }
});

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

// Create R2 client
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

// Generate 1s silent WAV
function generateSilentWav(): Buffer {
    const sampleRate = 44100;
    const dataSize = sampleRate * 2; // 1 second, 16-bit mono
    const buffer = Buffer.alloc(44 + dataSize);

    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(1, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    buffer.fill(0, 44);

    return buffer;
}

async function test() {
    console.log('🎵 MUSIC MODE - R2 Audio Upload Test\n');

    try {
        // 1. Generate audio
        console.log('[1/4] Generating test audio...');
        const audioBuffer = generateSilentWav();
        console.log(`✓ Generated ${audioBuffer.length} bytes\n`);

        // 2. Upload to R2
        console.log('[2/4] Uploading to R2...');
        const key = `music-mode/test/test-audio-${Date.now()}.wav`;

        await r2Client.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
            Body: audioBuffer,
            ContentType: 'audio/wav'
        }));

        const baseUrl = R2_PUBLIC_BASE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
        const publicUrl = `https://${baseUrl}/${key}`;

        console.log('✓ Uploaded!');
        console.log(`  URL: ${publicUrl}\n`);

        // 3. Create asset row
        console.log('[3/4] Creating asset row...');
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Get first user from database (for testing)
        const { data: users } = await supabase.auth.admin.listUsers();

        if (!users || users.users.length === 0) {
            throw new Error('No users found in database. Create a user first.');
        }

        const userId = users.users[0].id;
        console.log(`  Using user: ${userId}`);

        const { data: asset, error } = await supabase
            .from('assets')
            .insert({
                user_id: userId,
                kind: 'audio',
                role: 'music_test',
                status: 'ready',
                public_url: publicUrl,
                r2_key: key,
                origin_provider: 'r2',
                mime_type: 'audio/wav',
                meta: { test: true, duration_sec: 1, size_bytes: audioBuffer.length }
            })
            .select()
            .single();

        if (error) throw new Error(`DB insert failed: ${error.message}`);

        console.log('✓ Asset created!');
        console.log(`  ID: ${asset.id}\n`);

        // 4. Verify URL
        console.log('[4/4] Verifying public URL...');
        const response = await fetch(publicUrl);

        if (!response.ok) throw new Error(`URL not accessible: ${response.status}`);

        console.log('✓ URL accessible!\n');

        console.log('🎉 ALL TESTS PASSED!\n');
        console.log('Phase 0 DONE:');
        console.log('  ✅ Audio uploaded to R2');
        console.log('  ✅ Asset row created with kind=\'audio\'');
        console.log('  ✅ Public URL accessible\n');

    } catch (error: any) {
        console.error('\n❌ TEST FAILED:', error.message);
        console.error('\nCheck:');
        console.error('  1. Migration applied: npx supabase db push');
        console.error('  2. R2 credentials in .env.local');
        console.error('  3. Replace testUserId with real user\n');
        throw error;
    }
}

test()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
