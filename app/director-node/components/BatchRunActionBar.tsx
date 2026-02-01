'use client';

import { Node } from 'reactflow';

interface BatchRunActionBarProps {
    selectedNodes: Node[];
    onRunSelected: (nodeIds: string[]) => void;
    onDuplicate: (nodeIds: string[]) => void;
    onDelete: (nodeIds: string[]) => void;
    onDismiss: () => void;
}

export function BatchRunActionBar({ selectedNodes, onRunSelected, onDuplicate, onDelete, onDismiss }: BatchRunActionBarProps) {
    const eligibleNodes = selectedNodes.filter(node =>
        node.type === 'ImageGen' || node.type === 'VideoGen'
    );

    if (selectedNodes.length === 0) {
        return null;
    }

    const handleRun = () => {
        const nodeIds = eligibleNodes.map(n => n.id);
        onRunSelected(nodeIds);
    };

    const handleDuplicate = () => {
        const nodeIds = selectedNodes.map(n => n.id);
        onDuplicate(nodeIds);
    };

    const handleDelete = () => {
        const nodeIds = selectedNodes.map(n => n.id);
        onDelete(nodeIds);
    };

    return (
        <div
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-slideUp"
            style={{
                background: 'var(--node-bg)',
                border: '1px solid var(--node-border)',
                backdropFilter: 'var(--glass-blur)',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                padding: '16px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}
        >
            {/* Node Count Badge */}
            <div
                style={{
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--sky)'
                }}
            >
                {selectedNodes.length} node{selectedNodes.length !== 1 ? 's' : ''} selected
            </div>

            {/* Duplicate Button */}
            <button
                onClick={handleDuplicate}
                className="transition-all"
                style={{
                    background: 'rgba(139, 92, 246, 0.15)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--violet)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(139, 92, 246, 0.25)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)';
                    e.currentTarget.style.transform = 'translateY(0)';
                }}
            >
                <span style={{ fontSize: '14px' }}>⧉</span> Duplicate
            </button>

            {/* Delete Button */}
            <button
                onClick={handleDelete}
                className="transition-all"
                style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--red)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                    e.currentTarget.style.transform = 'translateY(0)';
                }}
            >
                <span style={{ fontSize: '14px' }}>🗑️</span> Delete
            </button>

            {/* Run Button - Only show for eligible nodes */}
            {eligibleNodes.length > 0 && (
                <button
                    onClick={handleRun}
                    className="transition-all"
                    style={{
                        background: 'var(--sky)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 20px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'white',
                        cursor: 'pointer',
                        boxShadow: '0 0 16px rgba(56, 189, 248, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(56, 189, 248, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 0 16px rgba(56, 189, 248, 0.3)';
                    }}
                >
                    ▶ Run Selected
                </button>
            )}

            {/* Dismiss Button */}
            <button
                onClick={onDismiss}
                className="transition-opacity"
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    fontSize: '18px',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    lineHeight: 1
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '0.5';
                }}
            >
                ×
            </button>
        </div>
    );
}
