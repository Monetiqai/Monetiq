'use client';

import { Handle, Position } from 'reactflow';
import { useNodeContextMenu } from '../../hooks/useNodeContextMenu';
import { NodeContextMenu } from '../NodeContextMenu';

interface RouterNodeProps {
    data: {
        branches_count?: number;
        label?: string;
        disabled?: boolean;
    };
    id: string;
    selected?: boolean;
}

export function RouterNode({ data, id, selected }: RouterNodeProps) {
    const branches = data.branches_count || 2;

    // Context menu integration
    const {
        contextMenuOpen,
        contextMenuPosition,
        setContextMenuOpen,
        handleContextMenuPointerDownCapture,
        handleDuplicate,
        handleDelete,
        handleRename,
        handleToggleDisable
    } = useNodeContextMenu(id, data.label || 'Router', data.disabled || false);

    // Selection glow color (violet for logic nodes)
    const selectionGlow = selected && !data.disabled;
    const borderColor = selectionGlow ? '#8b5cf6' : 'var(--node-border)';
    const boxShadow = selectionGlow
        ? '0 0 0 2px #8b5cf6, 0 0 24px rgba(139, 92, 246, 0.4), var(--node-shadow)'
        : 'var(--node-shadow)';

    return (
        <div
            className="nodeStandard"
            style={{
                background: 'var(--node-bg)',
                border: `1px solid ${borderColor}`,
                borderRadius: 'var(--node-radius)',
                boxShadow,
                backdropFilter: 'var(--glass-blur)',
                transition: 'all 0.2s ease',
                opacity: data.disabled ? 0.5 : 1,
                filter: data.disabled ? 'grayscale(0.5)' : 'none',
                pointerEvents: data.disabled ? 'none' : 'auto'
            }}
        >
            {/* Header */}
            <div className="nodeHeader">
                <div className="nodeHeaderLeft">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.9 }}>
                        <circle cx="12" cy="12" r="2" />
                        <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
                    </svg>
                    <span className="nodeTitle rowText">{data.label || 'Router'}</span>
                </div>
                <button
                    data-context-trigger="true"
                    className="nodrag nopan nodeHeaderRight hover:opacity-80 transition-opacity"
                    onPointerDownCapture={handleContextMenuPointerDownCapture}
                    style={{
                        color: 'var(--text-dim)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        pointerEvents: 'auto',
                        zIndex: 5
                    }}
                >
                    <span style={{ fontSize: '12px', lineHeight: 1 }}>⋯</span>
                </button>
            </div>

            {/* Content */}
            <div className="nodeContent">
                <div className="nodeMeta rowText">
                    {branches} branches
                </div>
            </div>

            {/* Handles */}
            <Handle
                type="target"
                position={Position.Left}
                style={{
                    background: 'var(--edge-prompt)',
                    width: '10px',
                    height: '10px',
                    border: 'none',
                    boxShadow: '0 0 0 2px var(--edge-prompt-glow)'
                }}
            />
            {Array.from({ length: branches }).map((_, i) => (
                <Handle
                    key={i}
                    type="source"
                    position={Position.Right}
                    id={`branch-${i}`}
                    style={{
                        background: 'var(--edge-prompt)',
                        width: '10px',
                        height: '10px',
                        border: 'none',
                        boxShadow: '0 0 0 2px var(--edge-prompt-glow)',
                        top: `${30 + (i * 40)}%`
                    }}
                />
            ))}

            {/* Context Menu */}
            {contextMenuOpen && (
                <NodeContextMenu
                    nodeId={id}
                    nodeType="router"
                    isOpen={contextMenuOpen}
                    position={contextMenuPosition}
                    onClose={() => setContextMenuOpen(false)}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDelete}
                    onRename={handleRename}
                    onToggleDisable={handleToggleDisable}
                    isDisabled={data.disabled || false}
                />
            )}
        </div>
    );
}
