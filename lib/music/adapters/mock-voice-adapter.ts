/**
 * PHASE 3.1 - Mock Voice Adapter
 * 
 * Mock implementation of VoiceAdapter interface
 */

import type { VoiceAdapter, VoiceTTSParams, VoiceTTSResult } from './types';

export class MockVoiceAdapter implements VoiceAdapter {
    async tts(params: VoiceTTSParams): Promise<VoiceTTSResult> {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300));

        // Estimate duration based on text length (~15 chars per second)
        const durationSec = Math.ceil(params.text.length / 15);

        // Generate mock WAV (523Hz for standard, 659Hz for premium)
        const frequency = params.voiceId?.includes('premium') ? 659 : 523;
        const buffer = this.generateMockWAV(durationSec, frequency);

        return {
            audioBuffer: buffer,
            meta: {
                provider: 'mock_voice',
                durationSec,
                format: 'wav',
                voiceId: params.voiceId || 'default',
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
