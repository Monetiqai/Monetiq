'use client';

import { use } from 'react';
import { DirectorNodeCanvas } from '../components/Canvas';
import { ReactFlowProvider } from 'reactflow';

interface PageProps {
    params: Promise<{ projectId: string }>;
    searchParams: Promise<{ graph_id?: string }>;
}

export default function DirectorNodePage({ params, searchParams }: PageProps) {
    const { projectId } = use(params);
    const { graph_id } = use(searchParams);

    return (
        <main className="h-screen">
            <ReactFlowProvider>
                <DirectorNodeCanvas projectId={projectId} graphId={graph_id} />
            </ReactFlowProvider>
        </main>
    );
}
