'use client';

import { DirectorNodeCanvas } from './components/Canvas';
import { ReactFlowProvider } from 'reactflow';

export default function DirectorNodePage() {
    return (
        <main className="h-screen">
            <ReactFlowProvider>
                <DirectorNodeCanvas />
            </ReactFlowProvider>
        </main>
    );
}
