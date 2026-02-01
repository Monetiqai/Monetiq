/**
 * PHASE 12 — GENERATION DETAIL PAGE
 * 
 * Full view of a single generation with all shots and metadata
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { StatusBadge } from '../../components/StatusBadge';

export default async function GenerationDetailPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params;

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
        redirect('/auth/signup');
    }

    // Fetch generation (RLS enforced) with explicit projection
    const { data: generation, error } = await supabase
        .from('ads_generations')
        .select('id, run_id, product_name, category, template, status, plan_seed, plan_roles, plan_contexts, shot_1_url, shot_2_url, shot_3_url, shot_4_url, plan_retries, shot_retries, created_at, updated_at')
        .eq('id', id)
        .single();

    if (error || !generation) {
        notFound();
    }

    const shots = [
        { num: 1, type: 'hook', role: generation.plan_roles[0], url: generation.shot_1_url },
        { num: 2, type: 'proof', role: generation.plan_roles[1], url: generation.shot_2_url },
        { num: 3, type: 'variation', role: generation.plan_roles[2], url: generation.shot_3_url },
        { num: 4, type: 'winner', role: generation.plan_roles[3], url: generation.shot_4_url }
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Back Button */}
                <Link
                    href="/ads-mode/dashboard"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
                >
                    ← Back to Dashboard
                </Link>

                {/* Header */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-2xl font-bold text-gray-900">
                            {generation.product_name}
                        </h1>
                        <StatusBadge status={generation.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-600">Run ID:</span>
                            <p className="font-mono text-xs text-gray-900 mt-1 break-all">
                                {generation.run_id}
                            </p>
                        </div>
                        <div>
                            <span className="text-gray-600">Category:</span>
                            <p className="text-gray-900 mt-1">{generation.category}</p>
                        </div>
                        <div>
                            <span className="text-gray-600">Template:</span>
                            <p className="text-gray-900 mt-1">{generation.template}</p>
                        </div>
                        <div>
                            <span className="text-gray-600">Created:</span>
                            <p className="text-gray-900 mt-1">
                                {new Date(generation.created_at).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Plan Details */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Plan</h2>

                    <div className="space-y-3">
                        <div>
                            <span className="text-gray-600 text-sm">Seed:</span>
                            <p className="font-mono text-xs text-gray-900 mt-1 break-all">
                                {generation.plan_seed}
                            </p>
                        </div>

                        <div>
                            <span className="text-gray-600 text-sm">Roles:</span>
                            <p className="text-gray-900 mt-1">
                                {generation.plan_roles.join(' → ')}
                            </p>
                        </div>

                        <div>
                            <span className="text-gray-600 text-sm">Contexts:</span>
                            <p className="text-gray-900 mt-1">
                                {generation.plan_contexts.join(', ')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Shots */}
                <div className="space-y-6">
                    {shots.map((shot) => (
                        <div key={shot.num} className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Shot {shot.num}: {shot.type}
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Spatial Role: <span className="font-medium">{shot.role}</span>
                            </p>

                            {shot.url ? (
                                <div className="space-y-3">
                                    <img
                                        src={shot.url}
                                        alt={`Shot ${shot.num}`}
                                        className="w-full rounded-lg"
                                    />
                                    <a
                                        href={shot.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-block text-sm text-blue-600 hover:text-blue-800"
                                    >
                                        Open in new tab →
                                    </a>
                                </div>
                            ) : (
                                <div className="bg-gray-100 rounded-lg p-8 text-center text-gray-500">
                                    {generation.status === 'generating' ? 'Generating...' : 'Not available'}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Metadata */}
                <div className="bg-white rounded-lg shadow p-6 mt-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h2>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-600">Plan Retries:</span>
                            <p className="text-gray-900 mt-1">{generation.plan_retries || 0}</p>
                        </div>
                        <div>
                            <span className="text-gray-600">Shot Retries:</span>
                            <p className="text-gray-900 mt-1">{generation.shot_retries || 0}</p>
                        </div>
                        <div>
                            <span className="text-gray-600">Updated:</span>
                            <p className="text-gray-900 mt-1">
                                {new Date(generation.updated_at).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
