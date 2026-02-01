'use client';

import React from 'react';
import { Handle, Position } from 'reactflow';
import { useState } from 'react';
import { useNodeContextMenu } from '../../hooks/useNodeContextMenu';
import { NodeContextMenu } from '../NodeContextMenu';

interface CombineImageNodeProps {
    id: string;
    data: {
        label?: string;
        disabled?: boolean;
        input_assets?: Array<{ id: string; url: string }>;
        output_asset?: { id: string; url: string };
        input_count?: number; // Number of input handles (4-10)
    };
    selected?: boolean;
}

export function CombineImageNode({ id, data, selected }: CombineImageNodeProps) {
    const [isRunning, setIsRunning] = useState(false);

    // Get input count from data (default 4)
    const inputCount = data.input_count || 4;

    // Calculate node height based on input count
    const baseHeight = 120; // Base height for content
    const handleSpacing = 30; // Space needed per handle
    const minHeight = baseHeight + (inputCount * handleSpacing);

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
    } = useNodeContextMenu(id, data.label || 'Combine Image', data.disabled || false);

    const handleRun = () => {
        setIsRunning(true);
        const event = new CustomEvent('runNode', { detail: { nodeId: id } });
        window.dispatchEvent(event);
    };

    // Selection glow color (gold for image nodes)
    const selectionGlow = selected && !data.disabled;
    const borderColor = selectionGlow ? 'var(--gold)' : 'var(--node-border)';
    const boxShadow = selectionGlow
        ? '0 0 0 2px var(--gold), 0 0 24px rgba(255, 215, 0, 0.4), var(--node-shadow)'
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
                minWidth: '200px',
                minHeight: `${minHeight}px`
            }}
        >
            {/* Header */}
            <div className="nodeHeader">
                <div className="nodeHeaderLeft">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.9 }}>
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                    </svg>
                    <span className="nodeTitle rowText">{data.label || 'Combine Image'}</span>
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
            <div className="nodeContent" style={{ padding: '12px' }}>
                {/* Input Assets Preview */}
                {data.input_assets && data.input_assets.length > 0 ? (
                    <div>
                        <div className="nodeMeta" style={{ marginBottom: '8px' }}>
                            {data.input_assets.length} image{data.input_assets.length > 1 ? 's' : ''}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
                            {data.input_assets.slice(0, 4).map((asset, idx) => (
                                <div key={idx} style={{ aspectRatio: '1', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', overflow: 'hidden' }}>
                                    <img
                                        src={asset.url}
                                        alt={`Input ${idx + 1}`}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </div>
                            ))}
                        </div>
                        {data.input_assets.length > 4 && (
                            <div className="nodeMeta" style={{ marginTop: '4px', fontSize: '10px' }}>
                                +{data.input_assets.length - 4} more
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="nodeMeta" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                        Connect images
                    </div>
                )}

                {/* Output Preview */}
                {data.output_asset && (
                    <div style={{ marginTop: '12px' }}>
                        <div className="nodeMeta" style={{ marginBottom: '8px' }}>
                            Reference Output
                        </div>
                        <div style={{ aspectRatio: '1', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', overflow: 'hidden' }}>
                            <img
                                src={data.output_asset.url}
                                alt="Combined Reference"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Handles - GOLD color for image assets */}
            {/* Dynamic input handles based on input_count */}
            {Array.from({ length: inputCount }, (_, i) => {
                const handleNumber = i + 1;
                const topPercentage = ((i + 1) / (inputCount + 1)) * 100;

                return (
                    <React.Fragment key={`handle-group-${handleNumber}`}>
                        {/* Reference label - positioned inside the node */}
                        <div
                            style={{
                                position: 'absolute',
                                left: '8px',
                                top: `${topPercentage}%`,
                                transform: 'translateY(-50%)',
                                fontSize: '10px',
                                color: 'var(--gold)',
                                fontWeight: 600,
                                pointerEvents: 'none',
                                userSelect: 'none',
                                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                                zIndex: 1
                            }}
                        >
                            Ref {handleNumber}
                        </div>

                        {/* Handle */}
                        <Handle
                            type="target"
                            position={Position.Left}
                            id={`image_${handleNumber}`}
                            style={{
                                background: 'var(--gold)',
                                width: '10px',
                                height: '10px',
                                border: 'none',
                                boxShadow: '0 0 0 2px rgba(255, 215, 0, 0.3)',
                                top: `${topPercentage}%`
                            }}
                        />
                    </React.Fragment>
                );
            })}

            {/* Single output (right) - reference_image */}
            <Handle
                type="source"
                position={Position.Right}
                id="reference"
                style={{
                    background: 'var(--gold)',
                    width: '10px',
                    height: '10px',
                    border: 'none',
                    boxShadow: '0 0 0 2px rgba(255, 215, 0, 0.3)'
                }}
            />

            {/* Context Menu */}
            {contextMenuOpen && (
                <NodeContextMenu
                    nodeId={id}
                    nodeType="combineImage"
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
