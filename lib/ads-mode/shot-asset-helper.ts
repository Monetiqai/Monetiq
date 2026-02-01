import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Dual-write helper: Create or update asset for a generated shot
 * Prevents duplicates by upserting based on variant_id + shot_type
 */
export async function upsertShotAsset(params: {
    admin: SupabaseClient;
    userId: string;
    adPackId: string;
    variantId: string;
    shotType: string;
    imageUrl: string;
    prompt: string;
    spatialRole: string;
    metadata: any;
}): Promise<string | null> {
    const { admin, userId, adPackId, variantId, shotType, imageUrl, prompt, spatialRole, metadata } = params;

    try {
        // Check if asset already exists for this variant + shot type
        const { data: existing } = await admin
            .from('assets')
            .select('id')
            .eq('user_id', userId)
            .eq('meta->>variant_id', variantId)
            .eq('meta->>shot_type', shotType)
            .maybeSingle();

        const assetPayload = {
            user_id: userId,
            project_id: null, // Ads Mode has no project
            kind: 'image' as const,
            role: `shot_${shotType}`, // shot_hook, shot_proof, shot_variation, shot_winner
            status: 'ready' as const,
            category: 'ads_mode',
            origin_provider: 'r2',
            public_url: imageUrl,
            r2_key: imageUrl.split('.r2.dev/')[1] || null,
            r2_bucket: process.env.R2_BUCKET || null,
            storage_bucket: null,
            storage_path: null,
            mime_type: 'image/jpeg',
            meta: {
                ad_pack_id: adPackId,
                variant_id: variantId,
                shot_type: shotType,
                spatial_role: spatialRole,
                prompt,
                ...metadata
            }
        };

        if (existing) {
            // Update existing asset
            const { data, error } = await admin
                .from('assets')
                .update(assetPayload)
                .eq('id', existing.id)
                .select('id')
                .single();

            if (error) {
                console.error(`[Dual-Write] Failed to update asset for ${shotType}:`, error);
                return null;
            }

            console.log(`[Dual-Write] ✓ Updated asset ${data.id} for ${shotType}`);
            return data.id;
        } else {
            // Insert new asset
            const { data, error } = await admin
                .from('assets')
                .insert(assetPayload)
                .select('id')
                .single();

            if (error) {
                console.error(`[Dual-Write] Failed to create asset for ${shotType}:`, error);
                return null;
            }

            console.log(`[Dual-Write] ✓ Created asset ${data.id} for ${shotType}`);
            return data.id;
        }
    } catch (error) {
        console.error(`[Dual-Write] Error upserting asset for ${shotType}:`, error);
        return null;
    }
}
