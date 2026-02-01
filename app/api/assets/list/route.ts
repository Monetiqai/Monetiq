import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/supabase/auth';

const R2_BASE = 'https://pub-96fe4308b28846e4bb836ce572af23f7.r2.dev';

export async function GET(req: NextRequest) {
    try {
        const supabase = await supabaseServer();

        // Auth check
        const user = await getAuthenticatedUser(supabase);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse query params
        const { searchParams } = new URL(req.url);
        const category = searchParams.get('category'); // 'ads_mode' | 'director_mode' | 'project'
        const kind = searchParams.get('kind'); // 'image' | 'video'
        const role = searchParams.get('role'); // 'product_image', 'hook', etc.
        const projectId = searchParams.get('project_id');
        const status = searchParams.get('status'); // 'ready', 'pending', etc.
        const limit = parseInt(searchParams.get('limit') || '60');
        const offset = parseInt(searchParams.get('offset') || '0');

        // Ads Mode specific filters (meta fields)
        const shotType = searchParams.get('shot_type'); // 'hook' | 'proof' | 'variation' | 'winner'
        const adPackId = searchParams.get('ad_pack_id');
        const variantId = searchParams.get('variant_id');

        // Build query
        let query = supabase
            .from('assets')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        // Apply filters
        if (category) {
            // Specific category selected
            query = query.eq('category', category);
        } else {
            // "All Categories" - exclude uploads, only show director_mode and ads_mode
            query = query.in('category', ['director_mode', 'ads_mode']);
        }

        if (kind) query = query.eq('kind', kind);
        if (role) query = query.eq('role', role);
        if (status) query = query.eq('status', status);
        if (projectId) query = query.eq('project_id', projectId);

        // Meta filters (for Ads Mode)
        if (shotType) query = query.eq('meta->>shot_type', shotType);
        if (adPackId) query = query.eq('meta->>ad_pack_id', adPackId);
        if (variantId) query = query.eq('meta->>variant_id', variantId);


        const { data, error, count } = await query;

        if (error) {
            console.error('[Assets List] Query error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Add display URLs using correct URL logic
        // Priority: public_url -> R2_BASE + r2_key -> null
        const assets = (data || []).map(asset => {
            let displayUrl = null;

            if (asset.public_url) {
                // Use public_url if available
                displayUrl = asset.public_url;
            } else if (asset.r2_key) {
                // Fallback to R2_BASE + r2_key
                displayUrl = `${R2_BASE}/${asset.r2_key}`;
            }
            // Note: storage_path/storage_bucket are null for R2 assets, don't use them

            return {
                ...asset,
                displayUrl
            };
        });

        return NextResponse.json({
            ok: true,
            assets,
            total: count || 0,
            limit,
            offset
        });

    } catch (error: any) {
        console.error('[Assets List] Error:', error);
        return NextResponse.json({
            error: error?.message || 'Internal server error'
        }, { status: 500 });
    }
}
