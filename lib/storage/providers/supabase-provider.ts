/**
 * PHASE 11.5 — SUPABASE STORAGE PROVIDER
 * 
 * Legacy provider for Supabase Storage (backward compatibility)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MediaProvider } from '../types';
import { SUPABASE_CONFIG } from '../config';

export class SupabaseProvider implements MediaProvider {
    private client: SupabaseClient;
    private defaultBucket: string;

    constructor(bucket: string = 'ads-images') {
        this.client = createClient(
            SUPABASE_CONFIG.url,
            SUPABASE_CONFIG.serviceKey
        );
        this.defaultBucket = bucket;

        console.log('[SupabaseProvider] Initialized with bucket:', this.defaultBucket);
    }

    async putObject(params: {
        buffer: Buffer;
        key: string;
        contentType: string;
        cacheControl?: string;
    }): Promise<{ url: string; key: string }> {
        const { buffer, key, contentType, cacheControl } = params;

        console.log(`[Supabase] Uploading: ${key} (${buffer.length} bytes)`);

        try {
            const { data, error } = await this.client.storage
                .from(this.defaultBucket)
                .upload(key, buffer, {
                    contentType,
                    cacheControl: cacheControl || 'public, max-age=31536000',
                    upsert: true
                });

            if (error) {
                throw error;
            }

            const url = this.getPublicUrl(key);
            console.log(`[Supabase] ✓ Uploaded: ${url}`);

            return { url, key };

        } catch (error: any) {
            console.error(`[Supabase] Upload failed: ${error.message}`);
            throw new Error(`Supabase upload failed: ${error.message}`);
        }
    }

    getPublicUrl(key: string): string {
        const { data } = this.client.storage
            .from(this.defaultBucket)
            .getPublicUrl(key);

        return data.publicUrl;
    }

    async downloadObject(key: string): Promise<Buffer> {
        const { data, error } = await this.client.storage
            .from(this.defaultBucket)
            .download(key);

        if (error) {
            throw new Error(`Supabase download failed: ${error.message}`);
        }

        return Buffer.from(await data.arrayBuffer());
    }
}
