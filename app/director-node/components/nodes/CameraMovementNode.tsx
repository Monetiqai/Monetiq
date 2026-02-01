'use client';

import { Handle, Position } from 'reactflow';
import { useState, useEffect, useRef } from 'react';
import { useNodeContextMenu } from '../../hooks/useNodeContextMenu';
import { NodeContextMenu } from '../NodeContextMenu';
import { CAMERA_MOVEMENTS, MOVEMENT_LABELS } from '@/lib/cinema/cinematic-movements.config';

export function CameraMovementNode({ id, data, selected }: any) {
    const [movement, setMovement] = useState(data.movement || 'static');
    const videoRef = useRef<HTMLVideoElement>(null);

    // Force video reload when movement changes
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.load();
            videoRef.current.play().catch(() => {
                // Ignore autoplay errors
            });
        }
    }, [movement]);

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
    } = useNodeContextMenu(id, data.label || 'Camera Movement', data.disabled || false);

    const handleMovementChange = (newMovement: string) => {
        setMovement(newMovement);

        // Update node data
        const event = new CustomEvent('updateNodeData', {
            detail: {
                nodeId: id,
                data: {
                    movement: newMovement,
                    output: MOVEMENT_LABELS[newMovement as keyof typeof MOVEMENT_LABELS]
                }
            }
        });
        window.dispatchEvent(event);
    };

    // Selection glow color (violet for text nodes)
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
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                    </svg>
                    <span className="nodeTitle">{data.label || 'Camera Movement'}</span>
                </div>
                <button
                    className="nodeContextMenuButton"
                    onPointerDownCapture={handleContextMenuPointerDownCapture}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        fontSize: '16px',
                        opacity: 0.7,
                        transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                >
                    ⋯
                </button>
            </div>

            {/* Content */}
            <div
                className="nodeContent"
                style={{
                    paddingTop: '24px'
                }}
            >
                {/* Movement Selector */}
                <div style={{ marginBottom: '12px' }}>
                    <label className="nodeLabel">Movement</label>
                    <select
                        className="nodeSelect"
                        value={movement}
                        onChange={(e) => handleMovementChange(e.target.value)}
                    >
                        {CAMERA_MOVEMENTS.map((mov) => (
                            <option key={mov} value={mov}>
                                {MOVEMENT_LABELS[mov]}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Video Preview */}
                <div style={{ marginTop: '12px' }}>
                    <video
                        ref={videoRef}
                        key={movement}
                        src={`/movements/${movement}.mp4`}
                        autoPlay
                        loop
                        muted
                        playsInline
                        style={{
                            width: '100%',
                            height: '120px',
                            display: 'block',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            background: 'rgba(0,0,0,0.3)'
                        }}
                        onError={(e) => {
                            // Fallback to webm if mp4 fails
                            const video = e.currentTarget;
                            if (video.src.endsWith('.mp4')) {
                                video.src = `/movements/${movement}.webm`;
                            }
                        }}
                    />
                </div>
            </div>

            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Right}
                id="text"
                style={{
                    background: '#8b5cf6',
                    width: '12px',
                    height: '12px',
                    border: '2px solid rgba(255,255,255,0.3)'
                }}
            />

            {/* Context Menu */}
            {contextMenuOpen && (
                <NodeContextMenu
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
