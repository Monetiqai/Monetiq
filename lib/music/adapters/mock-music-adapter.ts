/**
 * PHASE 3.1 - Mock Music Adapter
 * 
 * Mock implementation of MusicAdapter interface
 */

import type { MusicAdapter, MusicGenerateParams, MusicGenerateResult } from './types';

export class MockMusicAdapter implements MusicAdapter {
    async generate(params: MusicGenerateParams): Promise<MusicGenerateResult> {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Generate mock WAV
        const buffer = this.generateMockWAV(params.durationSec, 440); // 440Hz for music

        return {
            audioBuffer: buffer,
            meta: {
                provider: 'mock_music',
                durationSec: params.durationSec,
                format: 'wav',
                preset: params.preset,
                providerJobId: `mock_${Date.now()}`
            }
        };
    }

    private generateMockWAV(durationSec: number, frequency: number): Buffer {
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
