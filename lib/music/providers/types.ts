/**
 * PHASE 2.5 - Provider Types
 * 
 * Interfaces for music and voice providers
 */

export interface MusicGenerateParams {
    prompt?: string;
    preset?: string;
    durationSec: number;
}

export interface VoiceTTSParams {
    text: string;
    voiceId?: string;
    lang?: string;
}

export interface ProviderResult {
    buffer: Buffer;
    meta: {
        provider: string;
        durationSec: number;
        format: string;
        [key: string]: any;
    };
}

export interface MusicProvider {
    generate(params: MusicGenerateParams): Promise<ProviderResult>;
}

export interface VoiceProvider {
    tts(params: VoiceTTSParams): Promise<ProviderResult>;
}

export interface ProviderCallLog {
    jobId: string;
    provider: string;
    action: string;
    status: 'started' | 'succeeded' | 'failed';
    latencyMs?: number;
    requestMeta?: Record<string, any>;
    responseMeta?: Record<string, any>;
    errorCode?: string;
    errorMessage?: string;
}
