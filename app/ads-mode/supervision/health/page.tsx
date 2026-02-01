/**
 * PHASE 12 — SYSTEM HEALTH (MONETIQ-SAFE)
 * 
 * Backend-only aggregates, no UI calculations
 * Server component with auth check
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function SystemHealthPage() {
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

    // Fetch backend-calculated metrics (auth.uid scoped)
    const { data: health, error: healthError } = await supabase.rpc('get_system_health');

    if (healthError) {
        console.error('Error fetching system health:', healthError);
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-7xl mx-auto px-6 py-6">
                {/* Header */}
                <div className="mb-6">
                    <Link href="/ads-mode/supervision" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
                        ← Back to overview
                    </Link>
                    <h1 className="text-xl font-bold">System Health</h1>
                </div>

                {/* Metrics Grid - Backend-calculated values only */}
                {health ? (
                    <div className="grid grid-cols-3 gap-4">
                        {/* Core Metrics */}
                        <div className="border border-gray-200 p-6">
                            <p className="text-sm text-gray-600 mb-2">total_runs</p>
                            <p className="text-3xl font-bold">{health.total_runs}</p>
                        </div>

                        <div className="border border-gray-200 p-6">
                            <p className="text-sm text-gray-600 mb-2">hook_fail_count</p>
                            <p className="text-3xl font-bold">{health.hook_fail_count}</p>
                        </div>

                        <div className="border border-gray-200 p-6">
                            <p className="text-sm text-gray-600 mb-2">abort_count</p>
                            <p className="text-3xl font-bold">{health.abort_count}</p>
                        </div>

                        {/* Retry Metrics */}
                        <div className="border border-gray-200 p-6">
                            <p className="text-sm text-gray-600 mb-2">retry_count</p>
                            <p className="text-3xl font-bold">{health.retry_count}</p>
                        </div>

                        <div className="border border-gray-200 p-6">
                            <p className="text-sm text-gray-600 mb-2">total_plan_retries_sum</p>
                            <p className="text-3xl font-bold">{health.total_plan_retries_sum}</p>
                        </div>

                        <div className="border border-gray-200 p-6">
                            <p className="text-sm text-gray-600 mb-2">total_shot_retries_sum</p>
                            <p className="text-3xl font-bold">{health.total_shot_retries_sum}</p>
                        </div>

                        {/* Cost Metrics */}
                        <div className="border border-gray-200 p-6">
                            <p className="text-sm text-gray-600 mb-2">total_cost_sum</p>
                            <p className="text-3xl font-bold">
                                {typeof health.total_cost_sum === 'number'
                                    ? health.total_cost_sum.toFixed(4)
                                    : '0.0000'}
                            </p>
                        </div>

                        <div className="border border-gray-200 p-6">
                            <p className="text-sm text-gray-600 mb-2">avg_cost_per_run</p>
                            <p className="text-3xl font-bold">
                                {typeof health.avg_cost_per_run === 'number'
                                    ? health.avg_cost_per_run.toFixed(4)
                                    : '0.0000'}
                            </p>
                        </div>

                        {/* R2 Compliance Metrics */}
                        <div className="border border-gray-200 p-6">
                            <p className="text-sm text-gray-600 mb-2">r2_only_runs_count</p>
                            <p className="text-3xl font-bold">{health.r2_only_runs_count}</p>
                        </div>

                        <div className="border border-gray-200 p-6">
                            <p className="text-sm text-gray-600 mb-2">missing_public_url_count</p>
                            <p className="text-3xl font-bold">{health.missing_public_url_count}</p>
                        </div>
                    </div>
                ) : (
                    <div className="border border-gray-200 p-6">
                        <p className="text-sm text-gray-600">
                            {healthError
                                ? `Error loading system health: ${healthError.message}`
                                : 'No system health data available'}
                        </p>
                    </div>
                )}

                {/* Note */}
                <p className="mt-6 text-xs text-gray-500">
                    All metrics computed backend-side via get_system_health() DB function
                </p>
            </div>
        </div>
    );
}
