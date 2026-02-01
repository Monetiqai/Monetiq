/**
 * PHASE 12 — GENERATION FILTERS COMPONENT
 * 
 * Client-side filters for status and sorting
 */

'use client';

interface GenerationFiltersProps {
    onFilterChange: (filters: { status: string; sort: string }) => void;
}

export function GenerationFilters({ onFilterChange }: GenerationFiltersProps) {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const form = e.target.form;
        if (!form) return;

        const formData = new FormData(form);
        onFilterChange({
            status: formData.get('status') as string,
            sort: formData.get('sort') as string
        });
    };

    return (
        <form className="flex gap-4 mb-6">
            <div className="flex-1">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                </label>
                <select
                    id="status"
                    name="status"
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">All</option>
                    <option value="success">Success</option>
                    <option value="failed">Failed</option>
                    <option value="generating">Generating</option>
                    <option value="partial">Partial</option>
                </select>
            </div>

            <div className="flex-1">
                <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-1">
                    Sort By
                </label>
                <select
                    id="sort"
                    name="sort"
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                </select>
            </div>
        </form>
    );
}
