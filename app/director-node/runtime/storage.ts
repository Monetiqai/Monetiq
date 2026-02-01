/**
 * Director Node V1 - Storage Utilities
 * Assets table management (R2 only)
 * Uses shared /lib/storage/media-store for R2 uploads
 */

import { supabaseServer } from '@/lib/supabase/server';

/**
 * Save an asset to the assets table (R2 only)
 */
export async function saveAsset(data: {
    type: 'image' | 'video';
    url: string;
    r2_key: string;
    metadata: any;
    user_id: string;
    project_id?: string;
    status?: 'ready' | 'generating' | 'failed'; // Optional status override
}): Promise<string> {
    console.log(`[Storage] Saving asset to DB: ${data.type}`);

    const supabase = await supabaseServer();

    const { data: asset, error } = await supabase
        .from('assets')
        .insert({
            user_id: data.user_id,
            project_id: data.project_id || null,
            kind: data.type,
            role: 'generated',
            status: data.status || 'ready', // Use provided status or default to 'ready'
            origin_provider: 'r2',
            r2_bucket: process.env.R2_BUCKET,
            r2_key: data.r2_key,
            public_url: data.url,
            storage_bucket: null, // R2 only, no Supabase storage
            storage_path: null,
            mime_type: data.type === 'image' ? 'image/png' : 'video/mp4',
            meta: {
                ...data.metadata,
                source: 'director_node_v1',
            },
        })
        .select('id')
        .single();

    if (error) {
        console.error('[Storage] Failed to save asset:', error);
        throw new Error(`Failed to save asset: ${error.message}`);
    }

    console.log(`[Storage] Asset saved with ID: ${asset.id}`);
    return asset.id;
}

