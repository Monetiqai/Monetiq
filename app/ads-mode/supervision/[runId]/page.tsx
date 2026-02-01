/**
 * PHASE 12 — RUN DETAIL (MONETIQ-SAFE)
 * 
 * Pre-plan first, then execution, then decision
 * Server component with auth check
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function RunDetailPage({ params }: { params: { runId: string } }) {
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

    // Fetch generation
    const { data: generation } = await supabase
        .from('ads_generations')
        .select('*')
        .eq('run_id', params.runId)
        .single();

    if (!generation) {
        return (
            <div className="min-h-screen bg-white p-6">
                <p>Run not found</p>
                <Link href="/ads-mode/supervision" className="text-blue-600 hover:underline">
                    ← Back to overview
                </Link>
            </div>
        );
    }

    // Fetch variants
    const { data: variants } = await supabase
        .from('ad_variants')
        .select('*')
        .eq('generation_id', generation.id)
        .order('shot_index');

    const meta = generation.meta || {};

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-7xl mx-auto px-6 py-6">
                {/* Header */}
                <div className="mb-6">
                    <Link href="/ads-mode/supervision" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
                        ← Back to overview
                    </Link>
                    <h1 className="text-xl font-bold">Run Detail: {params.runId}</h1>
                </div>

                {/* SECTION 1: PRE-PLAN (PRIMARY) */}
                <section className="mb-8 border border-gray-200 p-6">
                    <h2 className="text-lg font-bold mb-4">Pre-Plan</h2>

                    {variants && variants.length > 0 ? (
                        <div className="space-y-4">
                            {variants.map(variant => {
                                const variantMeta = variant.meta || {};
                                return (
                                    <div key={variant.shot_index} className="border-b border-gray-100 pb-4 last:border-b-0">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="font-medium">shot_index:</span>
                                                <span className="ml-2">{variant.shot_index}</span>
                                            </div>
                                            <div>
                                                <span className="font-medium">spatial_role:</span>
                                                <span className="ml-2">{variantMeta.spatial_role || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="font-medium">structure_position:</span>
                                                <span className="ml-2">{variantMeta.structure_position || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="font-medium">rule_set_hash:</span>
                                                <span className="ml-2 font-mono text-xs">{variantMeta.rule_set_hash || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-600">No pre-plan data available</p>
                    )}
                </section>

                {/* SECTION 2: EXECUTION (SECONDARY) */}
                <section className="mb-8 border border-gray-200 p-6">
                    <h2 className="text-lg font-bold mb-4">Execution</h2>

                    {variants && variants.length > 0 ? (
                        <div className="space-y-6">
                            {variants.map(variant => {
                                const variantMeta = variant.meta || {};
                                return (
                                    <div key={variant.shot_index} className="border-b border-gray-100 pb-6 last:border-b-0">
                                        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                            <div>
                                                <span className="font-medium">shot_index:</span>
                                                <span className="ml-2">{variant.shot_index}</span>
                                            </div>
                                            <div>
                                                <span className="font-medium">model_used:</span>
                                                <span className="ml-2">{variantMeta.model_used || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="font-medium">provider:</span>
                                                <span className="ml-2">{variantMeta.provider || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="font-medium">generation_duration:</span>
                                                <span className="ml-2">{variantMeta.generation_duration || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="font-medium">media_provider:</span>
                                                <span className="ml-2">{variantMeta.media_provider || 'N/A'}</span>
                                            </div>
                                            <div className="col-span-2">
                                                <span className="font-medium">public_url:</span>
                                                <span className="ml-2 font-mono text-xs break-all">
                                                    {variant.public_url || 'N/A'}
                                                </span>
                                            </div>
                                        </div>

                                        {variant.public_url && (
                                            <div className="mt-4">
                                                <img
                                                    src={variant.public_url}
                                                    alt={`Shot ${variant.shot_index}`}
                                                    className="max-w-xs border border-gray-200"
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-600">No execution data available</p>
                    )}
                </section>

                {/* SECTION 3: DECISION (TERTIARY) */}
                <section className="mb-8 border border-gray-200 p-6">
                    <h2 className="text-lg font-bold mb-4">Decision</h2>

                    <div className="space-y-3 text-sm">
                        <div>
                            <span className="font-medium">final_status:</span>
                            <span className="ml-2">{generation.status}</span>
                        </div>
                        <div>
                            <span className="font-medium">hook_validation_result:</span>
                            <span className="ml-2">{meta.hook_validation_result || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="font-medium">abort_reason:</span>
                            <span className="ml-2">{meta.abort_reason || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="font-medium">retry_reason:</span>
                            <span className="ml-2">{meta.retry_reason || 'N/A'}</span>
                        </div>

                        {meta.enforcement_flags && (
                            <div className="mt-4">
                                <p className="font-medium mb-2">enforcement_flags:</p>
                                <pre className="bg-gray-50 p-3 border border-gray-200 text-xs font-mono overflow-x-auto">
                                    {JSON.stringify(meta.enforcement_flags, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
