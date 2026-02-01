'use client';

import { Handle, Position } from 'reactflow';
import { useEffect, useState, useCallback } from 'react';
import { NodeContextMenu } from '../NodeContextMenu';
import { useNodeContextMenu } from '../../hooks/useNodeContextMenu';

interface VideoGenNodeProps {
    data: {
        provider?: string;
        duration?: number;
        label?: string;
        disabled?: boolean;
        preview_url?: string; // Persisted video URL
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

export function VideoGenNode({ data, id, selected }: VideoGenNodeProps) {
    const [latestRun, setLatestRun] = useState<Run | null>(null);
    const [isRunning, setIsRunning] = useState(false);

    // Load preview from node.data on mount (for persistence)
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
    }, [data.preview_url]);

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
    } = useNodeContextMenu(id, data.label || 'Video Gen', data.disabled || false);

    // Poll run status when queued or processing
    useEffect(() => {
        if (!latestRun || !latestRun.id || (latestRun.status !== 'queued' && latestRun.status !== 'processing')) {
            return;
        }

        console.log('[VideoGen] Starting polling for run:', latestRun.id);

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/director-node/runs/${latestRun.id}`);
                if (!res.ok) {
                    console.error('[VideoGen] Failed to fetch run status');
                    return;
                }

                const data = await res.json();

                console.log('[VideoGen] Poll response:', data);

                setLatestRun({
                    id: data.run_id || data.id,  // API returns run_id, not id
                    status: data.status,
                    asset_url: data.asset_url,
                    error: data.error,
                    created_at: data.created_at || data.started_at,
                    updated_at: data.updated_at || data.completed_at,
                });

                console.log('[VideoGen] Updated latestRun:', {
                    id: data.run_id || data.id,
                    status: data.status,
                    asset_url: data.asset_url,
                });

                if (data.status === 'completed' && data.asset_url) {
                    console.log('[VideoGen] ✓ Video completed! URL:', data.asset_url);
                    // Save preview URL to node data for persistence
                    const event = new CustomEvent('updateNodeData', {
                        detail: {
                            nodeId: id,
                            data: { preview_url: data.asset_url }
                        }
                    });
                    window.dispatchEvent(event);
                    console.log('[VideoGen] Dispatched updateNodeData event');
                }

                if (data.status === 'completed' || data.status === 'failed') {
                    console.log('[VideoGen] Stopping polling, final status:', data.status);
                    setIsRunning(false);
                }
            } catch (error) {
                console.error('[VideoGen] Error polling run status:', error);
            }
        }, 2000); // Poll every 2 seconds

        return () => clearInterval(interval);
    }, [latestRun, id]);

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

    const handleRun = useCallback(async () => {
        setIsRunning(true);

        try {
            // Get graph_id from window (set by Canvas component)
            const graphId = (window as any).currentDirectorNodeGraphId;

            if (!graphId) {
                console.error('[VideoGen] No graph loaded. Please save the graph first.');
                setIsRunning(false);
                return;
            }

            const res = await fetch('/api/director-node/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    graph_id: graphId,
                    node_ids: [id]
                })
            });

            const result = await res.json();
            console.log('[VideoGen] API Response:', result);

            if (result.runs && result.runs.length > 0) {
                const run = result.runs[0];
                console.log('[VideoGen] Run created:', run);

                // Extract run_id (handle both run.run_id and run.id)
                const runId = run.run_id || run.id;

                console.log('[VideoGen] Extracted runId:', runId);
                console.log('[VideoGen] run.run_id:', run.run_id);
                console.log('[VideoGen] run.id:', run.id);

                if (!runId) {
                    console.error('[VideoGen] No run_id in API response:', run);
                    setIsRunning(false);
                    return;
                }

                setLatestRun({
                    id: runId,
                    status: run.status || 'queued',
                    asset_url: run.asset_url,
                    error: run.error,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });
            } else {
                console.error('[VideoGen] No runs returned from API');
                setIsRunning(false);
            }
        } catch (error) {
            console.error('[VideoGen] Error creating run:', error);
            setIsRunning(false);
        }
    }, [id, data, isRunning]);

    // Selection glow color (gold for video nodes)
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
                        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                        <line x1="7" y1="2" x2="7" y2="22" />
                        <line x1="17" y1="2" x2="17" y2="22" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <line x1="2" y1="7" x2="7" y2="7" />
                        <line x1="2" y1="17" x2="7" y2="17" />
                        <line x1="17" y1="17" x2="22" y2="17" />
                        <line x1="17" y1="7" x2="22" y2="7" />
                    </svg>
                    <span className="nodeTitle rowText">{data.label || 'Video'}</span>
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

            {/* Preview / Status */}
            <div style={{ padding: '12px', position: 'relative' }}>
                {latestRun?.asset_url ? (
                    <div style={{ position: 'relative' }}>
                        <video
                            src={latestRun.asset_url}
                            controls
                            style={{
                                width: '100%',
                                aspectRatio: '16/9',
                                borderRadius: '14px',
                                objectFit: 'cover',
                                background: '#000'
                            }}
                        />
                        {latestRun.status === 'processing' && (
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(0,0,0,0.7)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '14px',
                                gap: '8px'
                            }}>
                                <div
                                    className="animate-spin"
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        border: '3px solid rgba(255,255,255,0.3)',
                                        borderTopColor: '#f59e0b',
                                        borderRadius: '50%'
                                    }}
                                />
                                <div className="nodeMeta" style={{ color: 'white' }}>Generating...</div>
                            </div>
                        )}
                    </div>
                ) : latestRun?.status === 'queued' || latestRun?.status === 'processing' ? (
                    <div style={{
                        width: '100%',
                        aspectRatio: '16/9',
                        borderRadius: '14px',
                        background: 'var(--bg-panel)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}>
                        <div
                            className="animate-spin"
                            style={{
                                width: '32px',
                                height: '32px',
                                border: '3px solid var(--node-border)',
                                borderTopColor: '#f59e0b',
                                borderRadius: '50%'
                            }}
                        />
                        <div className="nodeMeta">
                            {latestRun.status === 'queued' ? 'Queued...' : 'Generating...'}
                        </div>
                    </div>
                ) : latestRun?.status === 'failed' ? (
                    <div style={{
                        width: '100%',
                        aspectRatio: '16/9',
                        borderRadius: '14px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '12px'
                    }}>
                        <div className="nodeMeta" style={{ color: '#ef4444', textAlign: 'center' }}>
                            {latestRun.error || 'Generation failed'}
                        </div>
                    </div>
                ) : (
                    <div className="nodeMeta rowText">
                        {data.provider || 'kling'} • {data.duration || 6}s
                    </div>
                )}

                {/* Run Button - Bottom Right */}
                <button
                    onClick={handleRun}
                    disabled={isRunning}
                    className="nodrag nopan"
                    style={{
                        position: 'absolute',
                        bottom: '16px',
                        right: '16px',
                        padding: '10px 16px',
                        background: 'rgba(30, 30, 35, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '10px',
                        color: 'white',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: isRunning ? 'not-allowed' : 'pointer',
                        opacity: isRunning ? 0.5 : 1,
                        backdropFilter: 'blur(12px)',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                        if (!isRunning) {
                            e.currentTarget.style.background = 'rgba(245, 158, 11, 0.15)';
                            e.currentTarget.style.borderColor = '#f59e0b';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(30, 30, 35, 0.95)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    Run →
                </button>
            </div>

            {/* Handles */}
            <Handle
                type="target"
                position={Position.Left}
                id="image"
                style={{
                    background: 'var(--edge-image)',
                    width: '10px',
                    height: '10px',
                    border: 'none',
                    boxShadow: '0 0 0 2px var(--edge-image-glow)',
                    top: '30%'
                }}
            />
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
                    top: '70%'
                }}
            />
            <Handle
                type="source"
                position={Position.Right}
                id="video"
                style={{
                    background: '#a855f7',
                    width: '10px',
                    height: '10px',
                    border: 'none',
                    boxShadow: '0 0 0 2px rgba(168, 85, 247, 0.3)'
                }}
            />

            {/* Context Menu */}
            {contextMenuOpen && (
                <NodeContextMenu
                    nodeId={id}
                    nodeType="VideoGen"
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

