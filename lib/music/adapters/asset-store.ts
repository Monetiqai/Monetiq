/**
 * PHASE 3.1 - Asset Store Adapter
 * 
 * Handles audio upload to R2 and asset creation in DB
 */

import type { AssetStore, SaveAudioParams, SaveAudioResult } from './types';
import { uploadMedia } from '@/lib/storage/media-store';
import { supabaseServiceRole } from '@/lib/supabase/server';

export class R2AssetStore implements AssetStore {
    async saveAudio(params: SaveAudioParams): Promise<SaveAudioResult> {
        const supabase = supabaseServiceRole();

        // Upload to R2 via uploadMedia
        let publicUrl: string;
        let r2Key: string;

        if (params.buffer) {
            const filename = `${params.meta.jobId}.wav`;
            const uploadResult = await uploadMedia({
                buffer: params.buffer,
                filename,
                contentType: 'audio/wav',
                path: `music-mode/${params.meta.userId}`
            });
            publicUrl = uploadResult.url;
            r2Key = uploadResult.key;
        } else if (params.url) {
            // If provider returns URL directly (future: Stable Audio webhook)
            publicUrl = params.url;
            r2Key = `external/${params.meta.jobId}`;
        } else {
            throw new Error('Either buffer or url must be provided');
        }

        // Create asset row
        const { data: asset, error } = await supabase
            .from('assets')
            .insert({
                user_id: params.meta.userId,
                kind: 'audio',
                role: `music_${params.meta.kind}`,
                status: 'ready',
                public_url: publicUrl,
                r2_key: r2Key,
                origin_provider: params.meta.provider,
                mime_type: 'audio/wav',
                meta: {
                    job_id: params.meta.jobId,
                    ...params.meta
                }
            })
            .select('id')
            .single();

        if (error) throw error;

        return {
            assetId: asset.id,
            publicUrl
        };
    }
}
