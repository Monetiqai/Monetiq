/**
 * PHASE 3.2 - Amazon Polly Adapter
 * 
 * Voice synthesis using AWS Polly (voice_standard)
 */

import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import type { VoiceAdapter, VoiceTTSParams, VoiceTTSResult } from './types';
import { ProviderError, ErrorCodes } from './errors';

export class PollyAdapter implements VoiceAdapter {
    private client: PollyClient;
    private readonly timeout = 30000; // 30s
    private readonly maxRetries = 2;

    constructor() {
        this.client = new PollyClient({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
            }
        });
    }

    async tts(params: VoiceTTSParams): Promise<VoiceTTSResult> {
        const { text, voiceId = 'Joanna', lang = 'en-US' } = params;

        // Validation
        if (!text || text.length === 0) {
            throw new ProviderError(
                'Text is required',
                ErrorCodes.INVALID_INPUT,
                'polly',
                false
            );
        }

        if (text.length > 3000) {
            throw new ProviderError(
                'Text too long (max 3000 chars)',
                ErrorCodes.TEXT_TOO_LONG,
                'polly',
                false
            );
        }

        // Retry logic
        let lastError: any;
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                const result = await this.synthesizeWithTimeout(text, voiceId, lang);
                return result;
            } catch (error: any) {
                lastError = error;

                // Don't retry on non-retryable errors
                if (error instanceof ProviderError && !error.retryable) {
                    throw error;
                }

                // Retry with exponential backoff
                if (attempt < this.maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000; // 1s, 2s
                    console.log(`[Polly] Retry ${attempt + 1}/${this.maxRetries} after ${delay}ms`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError;
    }

    private async synthesizeWithTimeout(
        text: string,
        voiceId: string,
        lang: string
    ): Promise<VoiceTTSResult> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const command = new SynthesizeSpeechCommand({
                Text: text,
                VoiceId: voiceId as any, // Cast to avoid strict type checking
                OutputFormat: 'mp3',
                LanguageCode: lang as any // Cast to avoid strict type checking
                // Removed Engine: 'neural' - not supported in all regions
            });

            const response = await this.client.send(command, {
                abortSignal: controller.signal
            });

            if (!response.AudioStream) {
                throw new ProviderError(
                    'No audio stream in response',
                    ErrorCodes.PROVIDER_ERROR,
                    'polly',
                    false
                );
            }

            // Convert stream to buffer
            const chunks: Uint8Array[] = [];
            const stream = response.AudioStream as any; // Cast to handle async iteration
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);

            // Estimate duration (rough: ~150 chars per second for speech)
            const durationSec = Math.ceil(text.length / 150);

            return {
                audioBuffer: buffer,
                meta: {
                    provider: 'polly',
                    durationSec,
                    format: 'mp3',
                    voiceId,
                    providerJobId: response.RequestCharacters?.toString()
                }
            };

        } catch (error: any) {
            if (error.name === 'AbortError') {
                throw new ProviderError(
                    'Request timeout',
                    ErrorCodes.TIMEOUT,
                    'polly',
                    true
                );
            }

            // Map AWS errors
            if (error.name === 'InvalidParameterException') {
                throw new ProviderError(
                    error.message,
                    ErrorCodes.INVALID_VOICE_ID,
                    'polly',
                    false,
                    error
                );
            }

            if (error.name === 'ThrottlingException') {
                throw new ProviderError(
                    'Rate limit exceeded',
                    ErrorCodes.RATE_LIMIT,
                    'polly',
                    true,
                    error
                );
            }

            // Generic network error
            throw new ProviderError(
                error.message || 'Polly API error',
                ErrorCodes.NETWORK_ERROR,
                'polly',
                true,
                error
            );

        } finally {
            clearTimeout(timeoutId);
        }
    }
}
