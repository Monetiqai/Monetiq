/**
 * PHASE 11.5 — STORAGE TYPES
 * 
 * Shared types for media storage abstraction
 */

export type StorageProvider = 'supabase' | 'r2';

export interface MediaProvider {
    /**
     * Upload object to storage
     */
    putObject(params: {
        buffer: Buffer;
        key: string;
        contentType: string;
        cacheControl?: string;
    }): Promise<{ url: string; key: string }>;

    /**
     * Get public URL for a key
     */
    getPublicUrl(key: string): string;

    /**
     * Copy object (optional, for migration)
     */
    copyObject?(params: {
        sourceKey: string;
        destKey: string;
    }): Promise<void>;
}

export interface UploadResult {
    provider: StorageProvider;
    key: string;
    url: string;
    bucket: string;
}

export interface MediaAsset {
    public_url?: string;
    origin_provider?: StorageProvider;
    supabase_bucket?: string;
    supabase_path?: string;
    r2_bucket?: string;
    r2_key?: string;
}

export interface MediaConfig {
    dualWrite: boolean;
    writeProvider: StorageProvider;
    migrationEnabled: boolean;
}
