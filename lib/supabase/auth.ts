import { SupabaseClient, User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * SINGLE SOURCE OF TRUTH for authentication
 * 
 * ⚠️ NO React cache() - unreliable in Route Handlers (app/api/**)
 * 
 * Simple, deterministic auth check that calls supabase.auth.getUser()
 * directly on every request. This ensures consistent behavior:
 * - Logged in → returns User
 * - Logged out → returns null
 * - Session refresh → works correctly
 * 
 * Usage in API routes:
 * ```ts
 * import { supabaseServer } from '@/lib/supabase/server';
 * import { requireUser } from '@/lib/supabase/auth';
 * 
 * export async function GET(req: NextRequest) {
 *   const supabase = await supabaseServer();
 *   const user = await requireUser(supabase); // Throws 401 if not authenticated
 *   
 *   // ... rest of handler
 * }
 * ```
 */

/**
 * Get authenticated user (returns null if not authenticated)
 */
export async function getAuthenticatedUser(supabase: SupabaseClient): Promise<User | null> {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) {
            console.error('[Auth] Error fetching user:', error.message);
            return null;
        }

        return user;
    } catch (e: any) {
        console.error('[Auth] Exception:', e?.message ?? 'Unknown error');
        return null;
    }
}

/**
 * Require authenticated user (throws 401 Response if not authenticated)
 * 
 * Use this in API routes for cleaner code:
 * ```ts
 * const user = await requireUser(supabase);
 * // If we reach here, user is guaranteed to be authenticated
 * ```
 */
export async function requireUser(supabase: SupabaseClient): Promise<User> {
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
        throw new Response('Unauthorized', { status: 401 });
    }

    return user;
}
