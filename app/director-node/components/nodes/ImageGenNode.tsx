'use client';

import { Handle, Position } from 'reactflow';
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { NodeContextMenu } from '../NodeContextMenu';
import { useNodeContextMenu } from '../../hooks/useNodeContextMenu';

interface ImageGenNodeProps {
    data: {
        provider?: string;
        aspect_ratio?: string;
        resolution?: string;
        runs?: number;
        label?: string;
        disabled?: boolean;
        preview_url?: string; // Persisted preview image URL
    };
    id: string;
    selected?: boolean;
}

interface Run {
    id: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    asset_url?: string;
    error?: string;
    created_at: string;
    updated_at: string;
}

export function ImageGenNode({ data, id, selected }: ImageGenNodeProps) {
    const [latestRun, setLatestRun] = useState<Run | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    // Poll for run status
    useEffect(() => {
        if (!latestRun || (latestRun.status !== 'queued' && latestRun.status !== 'processing')) {
            return;
        }

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/director-node/runs/${latestRun.id}`);
                const data = await res.json();

                setLatestRun({
                    id: data.run_id,
                    status: data.status,
                    asset_url: data.asset_url,
                    error: data.error,
                    created_at: data.started_at || new Date().toISOString(),
                    updated_at: data.completed_at || new Date().toISOString(),
                });

                if (data.status === 'completed' && data.asset_url) {
                    // Save preview URL to node data for persistence
                    const event = new CustomEvent('updateNodeData', {
                        detail: {
                            nodeId: id,
                            data: { preview_url: data.asset_url }
                        }
                    });
                    window.dispatchEvent(event);
                }

                if (data.status === 'completed' || data.status === 'failed') {
                    setIsRunning(false);
                }
            } catch (error) {
                console.error('[ImageGen] Error polling run:', error);
            }
        }, 2000); // Poll every 2 seconds

        return () => clearInterval(interval);
    }, [latestRun]);

    // Context menu integration
    const {
        contextMenuOpen,
        contextMenuPosition,
        setContextMenuOpen,
        handleContextMenuClick,
        handleContextMenuMouseDown,
        handleContextMenuPointerDown,
        handleContextMenuPointerDownCapture,
        handleDuplicate,
        handleDelete,
        handleRename,
        handleToggleDisable
    } = useNodeContextMenu(id, data.label || 'Image Gen', data.disabled || false);

    // Listen for runNode event (batch run)
    useEffect(() => {
        const handleRunEvent = (e: CustomEvent) => {
            if (e.detail.nodeId === id && !data.disabled) {
                handleRun();
            }
        };

        window.addEventListener('runNode', handleRunEvent as EventListener);
        return () => window.removeEventListener('runNode', handleRunEvent as EventListener);
    }, [id, data.disabled]);

    // Load preview from node.data on mount (for persistence after reload)
    useEffect(() => {
        if (data.preview_url && !latestRun) {
            setLatestRun({
                id: 'persisted',
                status: 'completed',
                asset_url: data.preview_url,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
        }
    }, [data.preview_url]); // Only run when preview_url changes

    const handleRun = useCallback(async () => {
        setIsRunning(true);

        try {
            // Get graph_id from window (set by Canvas component)
            const graphId = (window as any).currentDirectorNodeGraphId;

            if (!graphId) {
                console.error('[ImageGen] No graph loaded. Please save the graph first.');
                setIsRunning(false);
                return;
            }

            const res = await fetch('/api/director-node/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    graph_id: graphId,
                    node_ids: [id] // Run this specific node
                })
            });

            const result = await res.json();

            // DEBUG: Log full response
            console.log('[ImageGen] API Response:', {
                status: res.status,
                ok: res.ok,
                result
            });

            if (result.runs && result.runs.length > 0) {
                const run = result.runs[0];
                console.log('[ImageGen] Run created:', run);
                setLatestRun({
                    id: run.run_id,
                    status: run.status,
                    asset_url: run.asset_url,
                    error: run.error,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });
            } else {
                console.error('[ImageGen] No runs returned from API. Full response:', result);
                setIsRunning(false);
            }
        } catch (error) {
            console.error('[ImageGen] Error creating run:', error);
            setIsRunning(false);
        }
    }, [id, data, isRunning]);

    // Download image handler
    const handleDownload = useCallback(async () => {
        if (!latestRun?.asset_url) return;

        try {
            // Direct download approach - bypasses CORS restrictions
            const a = document.createElement('a');
            a.href = latestRun.asset_url;
            a.download = `image-${id}-${Date.now()}.png`;
            a.target = '_blank'; // Open in new tab if download fails
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            console.log('[ImageGen] Image download initiated');
        } catch (error) {
            console.error('[ImageGen] Error downloading image:', error);
        }
    }, [latestRun, id]);

    // Selection glow color (gold for image nodes)
    const selectionGlow = selected && !data.disabled;
    const borderColor = selectionGlow ? '#f59e0b' : 'var(--node-border)';
    const boxShadow = selectionGlow
        ? '0 0 0 2px #f59e0b, 0 0 24px rgba(245, 158, 11, 0.4), var(--node-shadow)'
        : 'var(--node-shadow)';

    return (
        <div
            className="nodeCompact"
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
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span className="nodeTitle rowText">Image</span>
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

            {/* Preview Area */}
            <div style={{ padding: '12px', position: 'relative' }}>
                {latestRun && latestRun.status === 'completed' && latestRun.asset_url ? (
                    <img
                        src={latestRun.asset_url}
                        alt="Generated"
                        onClick={() => setShowPreviewModal(true)}
                        style={{
                            width: '100%',
                            borderRadius: '14px',
                            aspectRatio: '16/9',
                            objectFit: 'cover',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.02)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    />
                ) : latestRun && (latestRun.status === 'processing' || latestRun.status === 'queued') ? (
                    <div
                        style={{
                            width: '100%',
                            aspectRatio: '16/9',
                            background: 'var(--bg-panel)',
                            borderRadius: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <div
                                className="animate-spin"
                                style={{
                                    width: '24px',
                                    height: '24px',
                                    border: '2px solid var(--node-border)',
                                    borderTopColor: 'var(--sky)',
                                    borderRadius: '50%'
                                }}
                            />
                            <div className="nodeMeta">{latestRun.status === 'queued' ? 'Queued...' : 'Generating...'}</div>
                        </div>
                    </div>
                ) : latestRun && latestRun.status === 'failed' ? (
                    <div
                        style={{
                            width: '100%',
                            aspectRatio: '16/9',
                            background: 'var(--bg-panel)',
                            borderRadius: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', textAlign: 'center', padding: '12px' }}>
                            <div style={{ color: '#ef4444', fontSize: '11px' }}>Generation failed</div>
                            {latestRun.error && (
                                <div className="nodeMeta">{latestRun.error}</div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div
                        style={{
                            width: '100%',
                            aspectRatio: '16/9',
                            background: 'var(--bg-panel)',
                            borderRadius: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <div className="nodeMeta">No preview</div>
                    </div>
                )}

                {/* Action Buttons - Bottom Right */}
                <div style={{
                    position: 'absolute',
                    bottom: '18px',
                    right: '18px',
                    display: 'flex',
                    gap: '8px'
                }}>
                    {/* Download Button - Only show when image is available */}
                    {latestRun && latestRun.status === 'completed' && latestRun.asset_url && (
                        <button
                            className="nodrag nopan"
                            onClick={handleDownload}
                            style={{
                                padding: '8px 12px',
                                background: 'var(--bg-panel)',
                                border: '1px solid var(--node-border)',
                                borderRadius: '12px',
                                color: 'var(--text-primary)',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                backdropFilter: 'var(--glass-blur)',
                                transition: 'var(--transition-fast)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--bg-panel-hover)';
                                e.currentTarget.style.borderColor = 'var(--gold)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'var(--bg-panel)';
                                e.currentTarget.style.borderColor = 'var(--node-border)';
                            }}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download
                        </button>
                    )}

                    {/* Run Button */}
                    <button
                        onClick={handleRun}
                        disabled={isRunning}
                        style={{
                            padding: '8px 12px',
                            background: 'var(--bg-panel)',
                            border: '1px solid var(--node-border)',
                            borderRadius: '12px',
                            color: 'var(--text-primary)',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: isRunning ? 'not-allowed' : 'pointer',
                            opacity: isRunning ? 0.5 : 1,
                            backdropFilter: 'var(--glass-blur)',
                            transition: 'var(--transition-fast)'
                        }}
                        onMouseEnter={(e) => {
                            if (!isRunning) {
                                e.currentTarget.style.background = 'var(--bg-panel-hover)';
                                e.currentTarget.style.borderColor = 'var(--sky)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--bg-panel)';
                            e.currentTarget.style.borderColor = 'var(--node-border)';
                        }}
                    >
                        Run →
                    </button>
                </div>
            </div>

            {/* Handles */}
            {/* Input: prompt (purple, accepts Prompt OR CombineText) */}
            <Handle
                type="target"
                position={Position.Left}
                id="prompt"
                style={{
                    background: 'var(--edge-prompt)',
                    width: '10px',
                    height: '10px',
                    border: 'none',
                    boxShadow: '0 0 0 2px var(--edge-prompt-glow)',
                    top: '40%'
                }}
            />
            {/* Input: reference_image (gold, optional) */}
            <Handle
                type="target"
                position={Position.Left}
                id="reference_image"
                style={{
                    background: 'var(--gold)',
                    width: '10px',
                    height: '10px',
                    border: 'none',
                    boxShadow: '0 0 0 2px rgba(255, 215, 0, 0.3)',
                    top: '60%'
                }}
            />
            {/* Output: image_asset (gold) */}
            <Handle
                type="source"
                position={Position.Right}
                id="image_asset"
                style={{
                    background: 'var(--gold)',
                    width: '10px',
                    height: '10px',
                    border: 'none',
                    boxShadow: '0 0 0 2px rgba(255, 215, 0, 0.3)'
                }}
            />

            {/* Context Menu */}
            <NodeContextMenu
                nodeId={id}
                nodeType="ImageGen"
                isOpen={contextMenuOpen}
                position={contextMenuPosition}
                onClose={() => setContextMenuOpen(false)}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onRename={handleRename}
                onToggleDisable={handleToggleDisable}
                isDisabled={data.disabled || false}
            />

            {/* Image Preview Modal - Rendered via Portal */}
            {showPreviewModal && latestRun?.asset_url && typeof document !== 'undefined' && createPortal(
                <div
                    className="nodrag nopan"
                    onClick={() => setShowPreviewModal(false)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        width: '100vw',
                        height: '100vh',
                        background: 'rgba(0, 0, 0, 0.9)',
                        backdropFilter: 'blur(12px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 99999,
                        padding: '60px',
                        cursor: 'pointer'
                    }}
                >
                    {/* Close button */}
                    <button
                        onClick={() => setShowPreviewModal(false)}
                        style={{
                            position: 'absolute',
                            top: '30px',
                            right: '30px',
                            background: 'rgba(255, 255, 255, 0.15)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            borderRadius: '50%',
                            width: '50px',
                            height: '50px',
                            color: 'white',
                            fontSize: '28px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            zIndex: 100000
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                            e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                    >
                        ×
                    </button>

                    {/* Image container with download button */}
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        {/* Image */}
                        <img
                            src={latestRun.asset_url}
                            alt="Preview"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                maxWidth: '85vw',
                                maxHeight: '85vh',
                                borderRadius: '20px',
                                boxShadow: '0 25px 80px rgba(0, 0, 0, 0.6)',
                                cursor: 'default',
                                objectFit: 'contain',
                                display: 'block'
                            }}
                        />

                        {/* Download button - positioned at bottom center over the image */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDownload();
                            }}
                            style={{
                                position: 'absolute',
                                bottom: '30px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: 'rgba(20, 20, 30, 0.85)',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '8px',
                                padding: '12px 24px',
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                transition: 'all 0.2s ease',
                                zIndex: 1,
                                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(30, 30, 40, 0.95)';
                                e.currentTarget.style.transform = 'translateX(-50%) scale(1.05)';
                                e.currentTarget.style.boxShadow = '0 6px 24px rgba(0, 0, 0, 0.5)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(20, 20, 30, 0.85)';
                                e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
                                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.4)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
