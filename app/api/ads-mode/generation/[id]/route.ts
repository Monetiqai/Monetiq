/**
 * PHASE 11 — GET ADS GENERATION BY ID
 * 
 * SECURITY: Uses user-scoped Supabase client (auth cookies)
 * RLS enforced: Users can only read their own generations
 * 
 * Returns 401 if not authenticated
 * Returns 404 if not found or not owned
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;

    try {
        // Create USER-SCOPED Supabase client (uses auth cookies)
        const cookieStore = await cookies();

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // ANON key, not service role
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                },
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

        // Query with RLS enforcement (SELECT policy: auth.uid() = user_id)
        const { data: generation, error } = await supabase
            .from('ads_generations')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !generation) {
            return NextResponse.json(
                { error: 'Generation not found' },
                { status: 404 }
            );
        }

        // RLS ensures user can only see their own records
        return NextResponse.json(generation);

    } catch (error: any) {
        console.error('[API] Error fetching generation:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
