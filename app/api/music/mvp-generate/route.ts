import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { supabaseServer } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/supabase/auth';

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

// Generate placeholder audio
function generatePlaceholderAudio(durationSec: number): Buffer {
    const sampleRate = 44100;
    const numSamples = sampleRate * durationSec;
    const dataSize = numSamples * 2;
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

    const frequency = durationSec === 6 ? 440 : durationSec === 15 ? 523 : 659;
    for (let i = 0; i < numSamples; i++) {
        const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3 * 32767;
        buffer.writeInt16LE(Math.floor(sample), 44 + i * 2);
    }

    return buffer;
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await supabaseServer();
        const user = await getAuthenticatedUser(supabase);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { preset, duration, type, text } = body;

        console.log('[Music MVP] Generating:', { preset, duration, type });

        // Generate placeholder audio
        const audioBuffer = generatePlaceholderAudio(duration);

        // Upload to R2
        const key = `music-mode/${user.id}/mvp/${Date.now()}.wav`;

        await r2Client.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
            Body: audioBuffer,
            ContentType: 'audio/wav'
        }));

        const baseUrl = R2_PUBLIC_BASE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
        const publicUrl = `https://${baseUrl}/${key}`;

        // Create asset row
        const { data: asset, error: dbError } = await supabase
            .from('assets')
            .insert({
                user_id: user.id,
                kind: 'audio',
                role: type === 'instrumental' ? 'music_instrumental' : `music_voice_${type.replace('voice_', '')}`,
                status: 'ready',
                public_url: publicUrl,
                r2_key: key,
                origin_provider: 'r2',
                mime_type: 'audio/wav',
                meta: {
                    preset: type === 'instrumental' ? preset : undefined,
                    duration_sec: duration,
                    type,
                    text: type !== 'instrumental' ? text : undefined,
                    mock: true,
                    size_bytes: audioBuffer.length
                }
            })
            .select()
            .single();

        if (dbError) {
            console.error('[Music MVP] DB error:', dbError);
            return NextResponse.json({ error: 'Failed to save asset' }, { status: 500 });
        }

        console.log('[Music MVP] ✓ Generated:', asset.id);

        return NextResponse.json({
            assetId: asset.id,
            url: publicUrl
        });

    } catch (error: any) {
        console.error('[Music MVP] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Generation failed' },
            { status: 500 }
        );
    }
}
