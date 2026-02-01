/**
 * PHASE 11.5 — MEDIA STORE (Main Abstraction Layer)
 * 
 * Provider-agnostic media storage with dual-write/dual-read support
 * 
 * Usage:
 * - uploadMedia() - Upload with automatic provider selection
 * - getMediaUrl() - Get canonical URL with fallback logic
 * - migrateAssetToR2() - Background migration helper
 */

import { R2Provider } from './providers/r2-provider';
import { SupabaseProvider } from './providers/supabase-provider';
import { UploadResult, MediaAsset, StorageProvider } from './types';
import { MEDIA_CONFIG, validateStorageConfig } from './config';

// Lazy-loaded providers
let r2Provider: R2Provider | null = null;
let supabaseProvider: SupabaseProvider | null = null;

function getR2Provider(): R2Provider {
    if (!r2Provider) {
        r2Provider = new R2Provider();
    }
    return r2Provider;
}

function getSupabaseProvider(bucket: string = 'ads-images'): SupabaseProvider {
    if (!supabaseProvider) {
        supabaseProvider = new SupabaseProvider(bucket);
    }
    return supabaseProvider;
}

/**
 * Upload media to storage
 * 
 * Supports dual-write during transition:
 * - Primary: writeProvider (r2 or supabase)
 * - Secondary: if dualWrite=true, also upload to other provider
 */
export async function uploadMedia(params: {
    buffer: Buffer;
    filename: string;
    contentType: string;
    path: string; // e.g., 'ads-images/product-id/run-id'
}): Promise<UploadResult> {
    const { buffer, filename, contentType, path } = params;

    // Validate config
    validateStorageConfig();

    const key = `${path}/${filename}`;
    const provider = MEDIA_CONFIG.writeProvider;

    console.log(`[MediaStore] Uploading to ${provider}: ${key}`);

    try {
        // Primary upload
        let result: { url: string; key: string };

        if (provider === 'r2') {
            const r2 = getR2Provider();
            result = await r2.putObject({
                buffer,
                key,
                contentType
            });
        } else {
            const supabase = getSupabaseProvider();
            result = await supabase.putObject({
                buffer,
                key,
                contentType
            });
        }

        // Dual-write (optional, for transition)
        if (MEDIA_CONFIG.dualWrite) {
            try {
                console.log(`[MediaStore] Dual-write enabled, uploading to secondary provider...`);

                if (provider === 'r2') {
                    // Also upload to Supabase
                    const supabase = getSupabaseProvider();
                    await supabase.putObject({
                        buffer,
                        key,
                        contentType
                    });
                } else {
                    // Also upload to R2
                    const r2 = getR2Provider();
                    await r2.putObject({
                        buffer,
                        key,
                        contentType
                    });
                }

                console.log(`[MediaStore] ✓ Dual-write complete`);
            } catch (dualWriteError: any) {
                console.error(`[MediaStore] Dual-write failed (non-blocking): ${dualWriteError.message}`);
                // Don't fail the upload if dual-write fails
            }
        }

        return {
            provider,
            key: result.key,
            url: result.url,
            bucket: provider === 'r2' ? (process.env.R2_BUCKET || 'ecommerce-ai-media') : 'ads-images'
        };

    } catch (error: any) {
        console.error(`[MediaStore] Upload failed: ${error.message}`);
        throw error;
    }
}

/**
 * Get canonical media URL with fallback logic
 * 
 * Priority:
 * 1. public_url (if present)
 * 2. R2 URL (if origin_provider='r2' and r2_key exists)
 * 3. Supabase URL (if origin_provider='supabase' and supabase_path exists)
 * 
 * This ensures backward compatibility with existing assets
 */
export function getMediaUrl(asset: MediaAsset): string {
    // Prefer public_url (canonical)
    if (asset.public_url) {
        return asset.public_url;
    }

    // Fallback based on provider
    if (asset.origin_provider === 'r2' && asset.r2_key) {
        const r2 = getR2Provider();
        return r2.getPublicUrl(asset.r2_key);
    }

    if (asset.origin_provider === 'supabase' && asset.supabase_path) {
        const supabase = getSupabaseProvider();
        return supabase.getPublicUrl(asset.supabase_path);
    }

    throw new Error('No valid media URL found for asset');
}

/**
 * Migrate asset from Supabase to R2
 * 
 * Used by background migration script
 */
export async function migrateAssetToR2(params: {
    supabaseBucket: string;
    supabasePath: string;
    r2Key: string;
    contentType: string;
}): Promise<{ url: string; key: string }> {
    const { supabaseBucket, supabasePath, r2Key, contentType } = params;

    console.log(`[Migration] ${supabasePath} → ${r2Key}`);

    try {
        // Download from Supabase
        const supabase = getSupabaseProvider(supabaseBucket);
        const buffer = await supabase.downloadObject(supabasePath);

        // Upload to R2
        const r2 = getR2Provider();
        const result = await r2.putObject({
            buffer,
            key: r2Key,
            contentType
        });

        console.log(`[Migration] ✓ Migrated: ${result.url}`);

        return result;

    } catch (error: any) {
        console.error(`[Migration] Failed: ${error.message}`);
        throw error;
    }
}
