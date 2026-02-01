/**
 * PHASE 3.2 - ElevenLabs Adapter
 * 
 * Premium voice synthesis using ElevenLabs (voice_premium)
 */

import type { VoiceAdapter, VoiceTTSParams, VoiceTTSResult } from './types';
import { ProviderError, ErrorCodes } from './errors';

export class ElevenLabsAdapter implements VoiceAdapter {
    private readonly apiKey: string;
    private readonly baseUrl = 'https://api.elevenlabs.io/v1';
    private readonly timeout = 60000; // 60s (ElevenLabs can be slow)
    private readonly maxRetries = 1; // Only 1 retry for premium provider

    constructor() {
        this.apiKey = process.env.ELEVENLABS_API_KEY!;
        if (!this.apiKey) {
            throw new Error('ELEVENLABS_API_KEY not set');
        }
    }

    async tts(params: VoiceTTSParams): Promise<VoiceTTSResult> {
        const { text, voiceId = 'EXAVITQu4vr4xnSDxMaL', style } = params; // Default: Bella

        // Validation
        if (!text || text.length === 0) {
            throw new ProviderError(
                'Text is required',
                ErrorCodes.INVALID_INPUT,
                'elevenlabs',
                false
            );
        }

        if (text.length > 5000) {
            throw new ProviderError(
                'Text too long (max 5000 chars)',
                ErrorCodes.TEXT_TOO_LONG,
                'elevenlabs',
                false
            );
        }

        // Retry logic
        let lastError: any;
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                const result = await this.synthesizeWithTimeout(text, voiceId, style);
                return result;
            } catch (error: any) {
                lastError = error;

                // Don't retry on rate limit (let Phase 4 handle fallback)
                if (error instanceof ProviderError && error.code === ErrorCodes.RATE_LIMIT) {
                    throw error;
                }

                // Don't retry on non-retryable errors
                if (error instanceof ProviderError && !error.retryable) {
                    throw error;
                }

                // Retry with backoff
                if (attempt < this.maxRetries) {
                    const delay = 2000; // 2s
                    console.log(`[ElevenLabs] Retry ${attempt + 1}/${this.maxRetries} after ${delay}ms`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError;
    }

    private async synthesizeWithTimeout(
        text: string,
        voiceId: string,
        style?: string
    ): Promise<VoiceTTSResult> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(
                `${this.baseUrl}/text-to-speech/${voiceId}`,
                {
                    method: 'POST',
                    headers: {
                        'xi-api-key': this.apiKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        text,
                        model_id: 'eleven_multilingual_v2',
                        voice_settings: {
                            stability: 0.5,
                            similarity_boost: 0.75,
                            style: style ? parseFloat(style) : 0.0
                        }
                    }),
                    signal: controller.signal
                }
            );

            // Handle rate limiting
            if (response.status === 429) {
                throw new ProviderError(
                    'ElevenLabs rate limit exceeded',
                    ErrorCodes.RATE_LIMIT,
                    'elevenlabs',
                    false // Don't retry, let Phase 4 fallback to Polly
                );
            }

            // Handle auth errors
            if (response.status === 401) {
                throw new ProviderError(
                    'Invalid API key',
                    ErrorCodes.AUTH_ERROR,
                    'elevenlabs',
                    false
                );
            }

            // Handle quota errors
            if (response.status === 402) {
                throw new ProviderError(
                    'ElevenLabs quota exceeded',
                    ErrorCodes.QUOTA_EXCEEDED,
                    'elevenlabs',
                    false
                );
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new ProviderError(
                    `ElevenLabs API error: ${errorText}`,
                    ErrorCodes.PROVIDER_ERROR,
                    'elevenlabs',
                    false
                );
            }

            const buffer = Buffer.from(await response.arrayBuffer());

            // Estimate duration (rough: ~150 chars per second)
            const durationSec = Math.ceil(text.length / 150);

            return {
                audioBuffer: buffer,
                meta: {
                    provider: 'elevenlabs',
                    durationSec,
                    format: 'mp3',
                    voiceId,
                    providerJobId: response.headers.get('request-id') || undefined
                }
            };

        } catch (error: any) {
            if (error.name === 'AbortError') {
                throw new ProviderError(
                    'Request timeout',
                    ErrorCodes.TIMEOUT,
                    'elevenlabs',
                    true
                );
            }

            if (error instanceof ProviderError) {
                throw error;
            }

            // Generic network error
            throw new ProviderError(
                error.message || 'ElevenLabs API error',
                ErrorCodes.NETWORK_ERROR,
                'elevenlabs',
                true,
                error
            );

        } finally {
            clearTimeout(timeoutId);
        }
    }
}
