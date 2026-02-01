/**
 * PHASE 12 — DASHBOARD CLIENT COMPONENT
 * 
 * Client-side filtering and state management
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { GenerationFilters } from '../components/GenerationFilters';
import { GenerationGrid } from '../components/GenerationGrid';
import type { GenerationListItem } from '@/lib/ads-mode/types';

interface DashboardClientProps {
    initialGenerations: GenerationListItem[];
}

export function DashboardClient({ initialGenerations }: DashboardClientProps) {
    const [generations, setGenerations] = useState<GenerationListItem[]>(initialGenerations);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({ status: 'all', sort: 'newest' });
    const didHydrate = useRef(false);

    useEffect(() => {
        // Skip first render - use server-provided initialGenerations
        if (!didHydrate.current) {
            didHydrate.current = true;
            return;
        }

        // Only fetch when filters change
        fetchGenerations();
    }, [filters]);

    const fetchGenerations = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();

            if (filters.status !== 'all') {
                params.set('status', filters.status);
            }

            params.set('order', 'created_at');
            params.set('direction', filters.sort === 'newest' ? 'desc' : 'asc');
            params.set('limit', '20');

            const response = await fetch(`/api/ads-mode/generations?${params}`);

            if (!response.ok) {
                throw new Error('Failed to fetch generations');
            }

            const data = await response.json();
            setGenerations(data.generations);
        } catch (error) {
            console.error('Error fetching generations:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <GenerationFilters onFilterChange={setFilters} />

            {loading ? (
                <div className="text-center py-12">
                    <p className="text-gray-500">Loading...</p>
                </div>
            ) : (
                <GenerationGrid generations={generations} />
            )}
        </>
    );
}
