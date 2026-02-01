'use client';

import { Handle, Position } from 'reactflow';
import { useNodeContextMenu } from '../../hooks/useNodeContextMenu';
import { NodeContextMenu } from '../NodeContextMenu';

interface CombineTextNodeProps {
    data: {
        separator?: string;
        label?: string;
        disabled?: boolean;
    };
    id: string;
    selected?: boolean;
}

export function CombineTextNode({ data, id, selected }: CombineTextNodeProps) {
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
    } = useNodeContextMenu(id, data.label || 'Combine Text', data.disabled || false);

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
                pointerEvents: data.disabled ? 'none' : 'auto',
                minWidth: '200px'
            }}
        >
            {/* Header */}
            <div className="nodeHeader">
                <div className="nodeHeaderLeft">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.9 }}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    <span className="nodeTitle rowText">{data.label || 'Combine Text'}</span>
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

            {/* Content - Aggregator Info */}
            <div className="nodeContent" style={{ padding: '12px' }}>
                <div className="nodeMeta" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Aggregates multiple prompts
                </div>
                {data.separator && (
                    <div className="nodeMeta" style={{ textAlign: 'center', marginTop: '4px', fontSize: '10px' }}>
                        Separator: "{data.separator}"
                    </div>
                )}
            </div>

            {/* Handles - Single input (purple), single output (purple) */}
            <Handle
                type="target"
                position={Position.Left}
                id="input"
                style={{
                    background: 'var(--edge-prompt)',
                    width: '10px',
                    height: '10px',
                    border: 'none',
                    boxShadow: '0 0 0 2px var(--edge-prompt-glow)'
                }}
            />
            <Handle
                type="source"
                position={Position.Right}
                id="combined_prompt"
                style={{
                    background: 'var(--edge-prompt)',
                    width: '10px',
                    height: '10px',
                    border: 'none',
                    boxShadow: '0 0 0 2px var(--edge-prompt-glow)'
                }}
            />

            {/* Context Menu */}
            {contextMenuOpen && (
                <NodeContextMenu
                    nodeId={id}
                    nodeType="combineText"
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
