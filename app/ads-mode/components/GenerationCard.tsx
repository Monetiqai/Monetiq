/**
 * PHASE 12 — GENERATION CARD COMPONENT
 * 
 * Card displaying 4-shot preview with metadata
 */

'use client';

import { StatusBadge } from './StatusBadge';
import Link from 'next/link';
import type { GenerationListItem } from '@/lib/ads-mode/types';

interface GenerationCardProps {
    generation: GenerationListItem;
}

export function GenerationCard({ generation }: GenerationCardProps) {
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <Link href={`/ads-mode/generation/${generation.id}`}>
            <div className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer bg-white">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 truncate">
                        {generation.product_name}
                    </h3>
                    <StatusBadge status={generation.status} />
                </div>

                {/* 4-Shot Grid */}
                <div className="grid grid-cols-2 gap-1 p-1 bg-gray-50">
                    {[1, 2, 3, 4].map((shotNum) => {
                        const url = generation[`shot_${shotNum}_url` as keyof GenerationListItem] as string | null;
                        return (
                            <div key={shotNum} className="aspect-square bg-gray-200 relative">
                                {url ? (
                                    <img
                                        src={url}
                                        alt={`Shot ${shotNum}`}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                                        {generation.status === 'generating' ? 'Generating...' : 'N/A'}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-3 text-sm text-gray-600">
                    <span>{formatDate(generation.created_at)}</span>
                </div>
            </div>
        </Link>
    );
}
