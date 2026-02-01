/**
 * PHASE 12 — GENERATION GRID COMPONENT
 * 
 * Responsive grid layout for generation cards
 */

'use client';

import { GenerationCard } from './GenerationCard';
import type { GenerationListItem } from '@/lib/ads-mode/types';

interface GenerationGridProps {
    generations: GenerationListItem[];
}

export function GenerationGrid({ generations }: GenerationGridProps) {
    if (generations.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No generations found</p>
                <p className="text-gray-400 text-sm mt-2">
                    Start by generating your first ads sequence
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {generations.map((generation) => (
                <GenerationCard key={generation.id} generation={generation} />
            ))}
        </div>
    );
}
