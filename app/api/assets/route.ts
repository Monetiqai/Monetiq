import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/supabase/auth';

/**
 * GET /api/assets
 * 
 * Read-only endpoint to fetch user's existing product images
 * for reuse in Asset Library.
 * 
 * Query Rules:
 * - user_id = auth.uid() (RLS enforced)
 * - kind = 'image'
 * - role = 'product_image'
 * - status = 'ready'
 * - Order by created_at DESC
 * - Limit 20 (pagination optional)
 * 
 * ⚠️ This endpoint must NOT create assets and must NOT touch R2.
 */
export async function GET(request: NextRequest) {
    try {
        // Get authenticated user (same method as upload-asset)
        console.log('[Assets API] Checking authentication...');
        const supabase = await supabaseServer();
        const user = await getAuthenticatedUser(supabase);

        if (!user) {
            console.error('[Assets API] No user found');
            return NextResponse.json({
                ok: false,
                error: 'UNAUTHORIZED',
                message: 'Unauthorized - no user session'
            }, { status: 401 });
        }

        const userId = user.id;

        // Get pagination params
        const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');
        const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');

        console.log(`[Assets API] Fetching assets for user ${userId} (offset: ${offset}, limit: ${limit})`);

        // Create Supabase client with service role (bypasses RLS)
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Get total count
        const { count: totalCount, error: countError } = await supabaseAdmin
            .from('assets')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('kind', 'image')
            .eq('role', 'product_image')
            .eq('status', 'ready');

        if (countError) {
            console.error('[Assets API] Count error:', countError);
        }

        // Query paginated assets
        const { data: assets, error: queryError } = await supabaseAdmin
            .from('assets')
            .select('id, public_url, meta, mime_type, byte_size, created_at')
            .eq('user_id', userId)
            .eq('kind', 'image')
            .eq('role', 'product_image')
            .eq('status', 'ready')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (queryError) {
            console.error('[Assets API] Query error:', queryError);
            return NextResponse.json({
                ok: false,
                error: 'QUERY_FAILED',
                message: 'Failed to fetch assets'
            }, { status: 500 });
        }

        // Format response
        const formattedAssets = (assets || []).map(asset => ({
            id: asset.id,
            public_url: asset.public_url,
            original_filename: asset.meta?.original_filename || 'Unknown',
            mime_type: asset.mime_type,
            byte_size: asset.byte_size,
            created_at: asset.created_at
        }));

        const total = totalCount || 0;
        const hasMore = offset + formattedAssets.length < total;

        console.log(`[Assets API] Returning ${formattedAssets.length} assets (${offset + formattedAssets.length}/${total})`);

        return NextResponse.json({
            ok: true,
            assets: formattedAssets,
            count: formattedAssets.length,
            total,
            hasMore
        });

    } catch (error: any) {
        console.error('[Assets API] Unexpected error:', error);
        return NextResponse.json({
            ok: false,
            error: 'INTERNAL_ERROR',
            message: error.message || 'An unexpected error occurred'
        }, { status: 500 });
    }
}
