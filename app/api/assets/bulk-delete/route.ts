import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/supabase/auth';

/**
 * POST /api/assets/bulk-delete
 * 
 * Bulk delete assets from database.
 * 
 * Request body:
 * {
 *   "assetIds": ["uuid1", "uuid2", ...]
 * }
 * 
 * Security:
 * - Validates user owns all assets before deleting
 * 
 * Note: R2 cleanup can be done via background job if needed
 */
export async function POST(request: NextRequest) {
    try {
        // Get authenticated user
        console.log('[Bulk Delete API] Checking authentication...');
        const supabase = await supabaseServer();
        const user = await getAuthenticatedUser(supabase);

        if (!user) {
            console.error('[Bulk Delete API] No user found');
            return NextResponse.json({
                ok: false,
                error: 'UNAUTHORIZED',
                message: 'Authentication required'
            }, { status: 401 });
        }

        const userId = user.id;

        // Parse request body
        const { assetIds } = await request.json();

        if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
            return NextResponse.json({
                ok: false,
                error: 'INVALID_REQUEST',
                message: 'assetIds array is required'
            }, { status: 400 });
        }

        console.log(`[Bulk Delete API] Deleting ${assetIds.length} assets for user ${userId}`);

        // Create Supabase admin client
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Fetch assets to verify ownership
        const { data: assets, error: fetchError } = await supabaseAdmin
            .from('assets')
            .select('id, user_id')
            .in('id', assetIds);

        if (fetchError) {
            console.error('[Bulk Delete API] Fetch error:', fetchError);
            return NextResponse.json({
                ok: false,
                error: 'FETCH_FAILED',
                message: 'Failed to fetch assets'
            }, { status: 500 });
        }

        // Verify all assets belong to the user
        const unauthorizedAssets = assets?.filter(a => a.user_id !== userId) || [];
        if (unauthorizedAssets.length > 0) {
            console.error('[Bulk Delete API] Unauthorized assets:', unauthorizedAssets.map(a => a.id));
            return NextResponse.json({
                ok: false,
                error: 'UNAUTHORIZED',
                message: 'You do not own all of these assets'
            }, { status: 403 });
        }

        if (!assets || assets.length !== assetIds.length) {
            console.warn('[Bulk Delete API] Some assets not found');
            return NextResponse.json({
                ok: false,
                error: 'NOT_FOUND',
                message: 'Some assets were not found'
            }, { status: 404 });
        }

        // Delete from database
        console.log('[Bulk Delete API] Deleting from database...');
        const { error: deleteError } = await supabaseAdmin
            .from('assets')
            .delete()
            .in('id', assetIds);

        if (deleteError) {
            console.error('[Bulk Delete API] Delete error:', deleteError);
            return NextResponse.json({
                ok: false,
                error: 'DELETE_FAILED',
                message: 'Failed to delete assets from database'
            }, { status: 500 });
        }

        console.log(`[Bulk Delete API] Successfully deleted ${assetIds.length} assets`);

        return NextResponse.json({
            ok: true,
            deleted: assetIds.length,
            message: `Successfully deleted ${assetIds.length} asset(s)`
        });

    } catch (error: any) {
        console.error('[Bulk Delete API] Unexpected error:', error);
        return NextResponse.json({
            ok: false,
            error: 'INTERNAL_ERROR',
            message: error.message || 'An unexpected error occurred'
        }, { status: 500 });
    }
}
