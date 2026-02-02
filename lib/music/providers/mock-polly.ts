/**
 * PHASE 2.5 - Mock Polly Provider
 * 
 * Mock implementation for testing (Phase 3 will replace with real AWS SDK)
 */

import type { VoiceProvider, VoiceTTSParams, ProviderResult } from './types';
import { logProviderCall } from './logger';

export class MockPollyProvider implements VoiceProvider {
    async tts(params: VoiceTTSParams): Promise<ProviderResult> {
        const startTime = Date.now();

        // Log started
        await logProviderCall({
            jobId: 'mock',
            provider: 'polly_mock',
            action: 'tts',
            status: 'started',
            requestMeta: {
                text_length: params.text.length,
                voice_id: params.voiceId || 'standard_voice'
            }
        });

        try {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 300));

            // Generate mock WAV (523Hz for standard voice)
            const durationSec = Math.ceil(params.text.length / 15); // ~15 chars per second
            const buffer = this.generateMockVoice(durationSec, 523);
            const latencyMs = Date.now() - startTime;

            // Log succeeded
            await logProviderCall({
                jobId: 'mock',
                provider: 'polly_mock',
                action: 'tts',
                status: 'succeeded',
                latencyMs,
                responseMeta: {
                    size_bytes: buffer.length,
                    format: 'wav',
                    duration_sec: durationSec
                }
            });

            return {
                buffer,
                meta: {
                    provider: 'polly_mock',
                    durationSec,
                    format: 'wav',
                    voiceId: params.voiceId || 'Joanna'
                }
            };

        } catch (error: any) {
            const latencyMs = Date.now() - startTime;

            // Log failed
            await logProviderCall({
                jobId: 'mock',
                provider: 'polly_mock',
                action: 'tts',
                status: 'failed',
                latencyMs,
                errorMessage: error.message
            });

            throw error;
        }
    }

    private generateMockVoice(durationSec: number, frequency: number): Buffer {
        const sampleRate = 44100;
        const numSamples = sampleRate * durationSec;
        const dataSize = numSamples * 2;
        const buffer = Buffer.alloc(44 + dataSize);

        // WAV header
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

        // Generate tone
        for (let i = 0; i < numSamples; i++) {
            const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3 * 32767;
            buffer.writeInt16LE(Math.floor(sample), 44 + i * 2);
        }

        return buffer;
    }
}
