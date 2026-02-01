/**
 * PHASE 3.1 - Adapter Interfaces
 * 
 * Clean interfaces for music generation, voice synthesis, and asset storage
 */

// Music generation adapter
export interface MusicAdapter {
    generate(params: MusicGenerateParams): Promise<MusicGenerateResult>;
}

export interface MusicGenerateParams {
    prompt?: string;
    durationSec: number;
    preset?: string;
}

export interface MusicGenerateResult {
    audioBuffer?: Buffer;
    audioUrl?: string;
    meta: {
        provider: string;
        durationSec: number;
        format: string;
        providerJobId?: string;
        [key: string]: any;
    };
}

// Voice synthesis adapter
export interface VoiceAdapter {
    tts(params: VoiceTTSParams): Promise<VoiceTTSResult>;
}

export interface VoiceTTSParams {
    text: string;
    voiceId?: string;
    lang?: string;
    style?: string;
}

export interface VoiceTTSResult {
    audioBuffer?: Buffer;
    audioUrl?: string;
    meta: {
        provider: string;
        durationSec: number;
        format: string;
        voiceId?: string;
        providerJobId?: string;
        [key: string]: any;
    };
}

// Asset storage adapter
export interface AssetStore {
    saveAudio(params: SaveAudioParams): Promise<SaveAudioResult>;
}

export interface SaveAudioParams {
    buffer?: Buffer;
    url?: string;
    meta: {
        userId: string;
        jobId: string;
        kind: 'music' | 'voice';
        provider: string;
        [key: string]: any;
    };
}

export interface SaveAudioResult {
    assetId: string;
    publicUrl: string;
}
