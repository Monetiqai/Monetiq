/**
 * PHASE 12 — ADS MODE DASHBOARD PAGE
 * 
 * Main dashboard for viewing ads generations
 * Server component with auth check
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { GenerationGrid } from '../components/GenerationGrid';
import { DashboardClient } from './DashboardClient';

export default async function DashboardPage() {
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
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        redirect('/auth/signup');
    }

    // Fetch initial generations (first page) with minimal projection
    const { data: generations } = await supabase
        .from('ads_generations')
        .select('id, run_id, product_name, status, shot_1_url, shot_2_url, shot_3_url, shot_4_url, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Ads Mode Dashboard</h1>
                    <p className="text-gray-600 mt-2">
                        View and manage your generated ads sequences
                    </p>
                </div>

                {/* Client-side filtering and grid */}
                <DashboardClient initialGenerations={generations || []} />
            </div>
        </div>
    );
}
