/**
 * PHASE 2.5 - Mock Stable Audio Provider
 * 
 * Mock implementation for testing (Phase 3 will replace with real API)
 */

import type { MusicProvider, MusicGenerateParams, ProviderResult } from './types';
import { logProviderCall } from './logger';

export class MockStableAudioProvider implements MusicProvider {
    async generate(params: MusicGenerateParams, jobId: string): Promise<ProviderResult> {
        const startTime = Date.now();

        // Log started
        await logProviderCall({
            jobId,
            provider: 'stable_audio_mock',
            action: 'generate',
            status: 'started',
            requestMeta: {
                preset: params.preset,
                duration_sec: params.durationSec,
                prompt: params.prompt
            }
        });

        try {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 500));

            // Generate mock WAV (tone varies by duration)
            const buffer = this.generateMockAudio(params.durationSec);
            const latencyMs = Date.now() - startTime;

            // Log succeeded
            await logProviderCall({
                jobId,
                provider: 'stable_audio_mock',
                action: 'generate',
                status: 'succeeded',
                latencyMs,
                responseMeta: {
                    size_bytes: buffer.length,
                    format: 'wav'
                }
            });

            return {
                buffer,
                meta: {
                    provider: 'stable_audio_mock',
                    durationSec: params.durationSec,
                    format: 'wav',
                    preset: params.preset
                }
            };

        } catch (error: any) {
            const latencyMs = Date.now() - startTime;

            // Log failed
            await logProviderCall({
                jobId,
                provider: 'stable_audio_mock',
                action: 'generate',
                status: 'failed',
                latencyMs,
                errorMessage: error.message
            });

            throw error;
        }
    }

    private generateMockAudio(durationSec: number): Buffer {
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

        // Generate tone (440Hz for instrumental)
        const frequency = 440;
        for (let i = 0; i < numSamples; i++) {
            const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3 * 32767;
            buffer.writeInt16LE(Math.floor(sample), 44 + i * 2);
        }

        return buffer;
    }
}
