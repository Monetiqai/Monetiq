/**
 * PHASE 3.2 - Stable Audio Adapter
 * 
 * Music generation using Stability AI Stable Audio (instrumental)
 */

import type { MusicAdapter, MusicGenerateParams, MusicGenerateResult } from './types';
import { ProviderError, ErrorCodes } from './errors';

export class StableAudioAdapter implements MusicAdapter {
    private readonly apiKey: string;
    private readonly baseUrl = 'https://api.stability.ai/v2beta/audio/generate';
    private readonly timeout = 120000; // 120s (music generation is slow)
    private readonly maxRetries = 1;

    constructor() {
        this.apiKey = process.env.STABILITY_API_KEY!;
        if (!this.apiKey) {
            throw new Error('STABILITY_API_KEY not set');
        }
    }

    async generate(params: MusicGenerateParams): Promise<MusicGenerateResult> {
        const { prompt, durationSec, preset } = params;

        // Build prompt from preset if no explicit prompt
        const finalPrompt = prompt || this.buildPromptFromPreset(preset);

        // Validation
        if (!finalPrompt || finalPrompt.length === 0) {
            throw new ProviderError(
                'Prompt is required',
                ErrorCodes.INVALID_INPUT,
                'stable_audio',
                false
            );
        }

        if (durationSec > 47) {
            throw new ProviderError(
                'Duration too long (max 47s for Stable Audio)',
                ErrorCodes.INVALID_INPUT,
                'stable_audio',
                false
            );
        }

        // Retry logic
        let lastError: any;
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                const result = await this.generateWithTimeout(finalPrompt, durationSec);
                return result;
            } catch (error: any) {
                lastError = error;

                // Don't retry on non-retryable errors
                if (error instanceof ProviderError && !error.retryable) {
                    throw error;
                }

                // Retry with backoff
                if (attempt < this.maxRetries) {
                    const delay = 3000; // 3s
                    console.log(`[StableAudio] Retry ${attempt + 1}/${this.maxRetries} after ${delay}ms`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError;
    }

    private buildPromptFromPreset(preset?: string): string {
        const presets: Record<string, string> = {
            'Cinematic': 'Cinematic orchestral music, epic, dramatic, sweeping strings',
            'Epic': 'Epic trailer music, powerful drums, heroic brass, intense',
            'Upbeat': 'Upbeat energetic music, positive vibes, catchy melody',
            'Calm': 'Calm ambient music, peaceful, relaxing, soft piano',
            'Dark': 'Dark atmospheric music, mysterious, tension, deep bass'
        };

        return presets[preset || 'Cinematic'] || presets['Cinematic'];
    }

    private async generateWithTimeout(
        prompt: string,
        durationSec: number
    ): Promise<MusicGenerateResult> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt,
                    duration: durationSec,
                    output_format: 'mp3'
                }),
                signal: controller.signal
            });

            // Handle rate limiting
            if (response.status === 429) {
                throw new ProviderError(
                    'Stable Audio rate limit exceeded',
                    ErrorCodes.RATE_LIMIT,
                    'stable_audio',
                    true
                );
            }

            // Handle auth errors
            if (response.status === 401) {
                throw new ProviderError(
                    'Invalid API key',
                    ErrorCodes.AUTH_ERROR,
                    'stable_audio',
                    false
                );
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new ProviderError(
                    `Stable Audio API error: ${errorText}`,
                    ErrorCodes.PROVIDER_ERROR,
                    'stable_audio',
                    false
                );
            }

            const buffer = Buffer.from(await response.arrayBuffer());

            return {
                audioBuffer: buffer,
                meta: {
                    provider: 'stable_audio',
                    durationSec,
                    format: 'mp3',
                    providerJobId: response.headers.get('x-request-id') || undefined
                }
            };

        } catch (error: any) {
            if (error.name === 'AbortError') {
                throw new ProviderError(
                    'Request timeout',
                    ErrorCodes.TIMEOUT,
                    'stable_audio',
                    true
                );
            }

            if (error instanceof ProviderError) {
                throw error;
            }

            // Generic network error
            throw new ProviderError(
                error.message || 'Stable Audio API error',
                ErrorCodes.NETWORK_ERROR,
                'stable_audio',
                true,
                error
            );

        } finally {
            clearTimeout(timeoutId);
        }
    }
}
