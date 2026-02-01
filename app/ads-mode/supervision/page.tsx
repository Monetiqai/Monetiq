/**
 * PHASE 12 — RUNS OVERVIEW (MONETIQ-SAFE)
 * 
 * Fixed chronological list, no filters
 * Server component with auth check
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function SupervisionPage() {
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

    // Fetch runs - FIXED chronological order, NO filters
    const { data: runs } = await supabase
        .from('ads_generations')
        .select('id, run_id, created_at, status, product_name, metadata, total_plan_retries, total_shot_retries, shot_1_provider, shot_2_provider, shot_3_provider, shot_4_provider')
        .order('created_at', { ascending: false })
        .limit(100);

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-7xl mx-auto px-6 py-6">
                {/* Header */}
                <h1 className="text-xl font-bold mb-6">Runs Overview</h1>

                {/* NO FILTERS - Fixed chronological list */}

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-200">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">run_id</th>
                                <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">mode</th>
                                <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">created_at</th>
                                <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">status</th>
                                <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">hook_status</th>
                                <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">abort_reason</th>
                                <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">retry_index</th>
                                <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">total_cost</th>
                                <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">primary_model</th>
                                <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">media_provider</th>
                            </tr>
                        </thead>
                        <tbody>
                            {runs?.map(run => {
                                const metadata = run.metadata || {};
                                const totalRetries = (run.total_plan_retries || 0) + (run.total_shot_retries || 0);
                                const allR2 = run.shot_1_provider === 'r2' && run.shot_2_provider === 'r2'
                                    && run.shot_3_provider === 'r2' && run.shot_4_provider === 'r2';

                                return (
                                    <tr key={run.id} className="hover:bg-gray-50">
                                        <td className="border border-gray-200 px-4 py-2">
                                            <Link
                                                href={`/ads-mode/supervision/${run.run_id}`}
                                                className="text-blue-600 hover:underline font-mono text-xs"
                                            >
                                                {run.run_id}
                                            </Link>
                                        </td>
                                        <td className="border border-gray-200 px-4 py-2 text-sm">
                                            {metadata.mode || metadata.workflow || 'N/A'}
                                        </td>
                                        <td className="border border-gray-200 px-4 py-2 font-mono text-xs">
                                            {new Date(run.created_at).toISOString()}
                                        </td>
                                        <td className="border border-gray-200 px-4 py-2 text-sm">
                                            {run.status}
                                        </td>
                                        <td className="border border-gray-200 px-4 py-2 text-sm">
                                            {metadata.hook_status || 'N/A'}
                                        </td>
                                        <td className="border border-gray-200 px-4 py-2 text-sm">
                                            {metadata.abort_reason || '-'}
                                        </td>
                                        <td className="border border-gray-200 px-4 py-2 text-sm">
                                            {totalRetries}
                                        </td>
                                        <td className="border border-gray-200 px-4 py-2 text-sm">
                                            {metadata.total_cost || 0}
                                        </td>
                                        <td className="border border-gray-200 px-4 py-2 text-sm">
                                            {metadata.primary_model || 'N/A'}
                                        </td>
                                        <td className="border border-gray-200 px-4 py-2 text-sm">
                                            {allR2 ? 'r2' : 'mixed'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Row count */}
                <p className="mt-4 text-sm text-gray-600">
                    Showing {runs?.length || 0} runs (most recent 100)
                </p>
            </div>
        </div>
    );
}
