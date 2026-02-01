/**
 * PHASE 12 — LIST GENERATIONS API ENDPOINT
 * 
 * GET /api/ads-mode/generations
 * 
 * Returns paginated list of user's ads generations
 * Auth-scoped via RLS (users see only their own)
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        // Create auth-scoped Supabase client
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    }
                }
            }
        );

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Parse query params
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || undefined;
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
        const offset = parseInt(searchParams.get('offset') || '0');
        const order = searchParams.get('order') || 'created_at';
        const direction = searchParams.get('direction') === 'asc' ? 'asc' : 'desc';

        // Build query with minimal projection (no overfetch)
        let query = supabase
            .from('ads_generations')
            .select('id, run_id, product_name, status, shot_1_url, shot_2_url, shot_3_url, shot_4_url, created_at', { count: 'exact' });

        // Filter by status if provided
        if (status && ['generating', 'success', 'failed', 'partial'].includes(status)) {
            query = query.eq('status', status);
        }

        // Order and paginate
        query = query
            .order(order, { ascending: direction === 'asc' })
            .range(offset, offset + limit - 1);

        const { data: generations, error, count } = await query;

        if (error) {
            console.error('[API] Error fetching generations:', error);
            return NextResponse.json(
                { error: 'Failed to fetch generations' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            generations: generations || [],
            total: count || 0,
            limit,
            offset
        });

    } catch (error: any) {
        console.error('[API] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
