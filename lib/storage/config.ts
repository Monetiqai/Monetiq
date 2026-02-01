/**
 * PHASE 11.5 — STORAGE CONFIGURATION
 * 
 * Feature flags and config for media offload
 */

import { MediaConfig, StorageProvider } from './types';

export const MEDIA_CONFIG: MediaConfig = {
    // Dual-write: upload to both providers during transition
    dualWrite: process.env.MEDIA_DUAL_WRITE === 'true',

    // Primary write provider
    writeProvider: (process.env.MEDIA_WRITE_PROVIDER || 'supabase') as StorageProvider,

    // Enable background migration
    migrationEnabled: process.env.MEDIA_MIGRATION_ENABLED === 'true'
};

export const R2_CONFIG = {
    endpoint: process.env.R2_ENDPOINT,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET || 'ecommerce-ai-media',
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL || ''
};

export const SUPABASE_CONFIG = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!
};

/**
 * Validate required config
 */
export function validateStorageConfig(): void {
    if (MEDIA_CONFIG.writeProvider === 'r2') {
        if (!R2_CONFIG.endpoint || !R2_CONFIG.accessKeyId || !R2_CONFIG.secretAccessKey) {
            throw new Error('R2 credentials not configured. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
        }
        if (!R2_CONFIG.publicBaseUrl) {
            console.warn('R2_PUBLIC_BASE_URL not set. Public URLs will use R2 endpoint.');
        }
    }
}
