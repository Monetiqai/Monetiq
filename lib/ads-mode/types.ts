/**
 * PHASE 12 — SHARED TYPES
 * 
 * Contract-safe types for dashboard UI
 */

/**
 * Generation list item (minimal projection for cards)
 */
export type GenerationListItem = {
    id: string;
    run_id: string;
    product_name: string;
    status: 'generating' | 'success' | 'failed' | 'partial';
    shot_1_url: string | null;
    shot_2_url: string | null;
    shot_3_url: string | null;
    shot_4_url: string | null;
    created_at: string;
};

/**
 * Generation detail (full projection for detail page)
 */
export type GenerationDetail = {
    id: string;
    run_id: string;
    product_name: string;
    category: string;
    template: string;
    status: 'generating' | 'success' | 'failed' | 'partial';
    plan_seed: string;
    plan_roles: string[];
    plan_contexts: string[];
    shot_1_url: string | null;
    shot_2_url: string | null;
    shot_3_url: string | null;
    shot_4_url: string | null;
    plan_retries: number;
    shot_retries: number;
    created_at: string;
    updated_at: string;
};

/**
 * API response for list endpoint
 */
export type GenerationsListResponse = {
    generations: GenerationListItem[];
    total: number;
    limit: number;
    offset: number;
};
