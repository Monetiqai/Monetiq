'use client';

import { Handle, Position } from 'reactflow';
import { useNodeContextMenu } from '../../hooks/useNodeContextMenu';
import { NodeContextMenu } from '../NodeContextMenu';
import { useState, useEffect, useRef } from 'react';

interface ReferenceImageNodeProps {
    data: {
        asset_id?: string;
        label?: string;
        disabled?: boolean;
        preview_url?: string; // Persisted preview URL
    };
    id: string;
    selected?: boolean;
}

export function ReferenceImageNode({ data, id, selected }: ReferenceImageNodeProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load preview from node.data on mount (for persistence)
    useEffect(() => {
        if (data.preview_url) {
            setPreviewUrl(data.preview_url);
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
    } = useNodeContextMenu(id, data.label || 'Reference Image', data.disabled || false);

    const handleFileUpload = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }

        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/director-node/upload-reference', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Upload failed');
            }

            const result = await res.json();
            console.log('[ReferenceImage] Upload success:', result);

            // Update preview
            setPreviewUrl(result.public_url);

            // Update node data for persistence
            const event = new CustomEvent('updateNodeData', {
                detail: {
                    nodeId: id,
                    data: {
                        asset_id: result.asset_id,
                        preview_url: result.public_url
                    }
                }
            });
            window.dispatchEvent(event);

        } catch (error: any) {
            console.error('[ReferenceImage] Upload error:', error);
            alert(error.message || 'Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileUpload(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!data.disabled) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (data.disabled) return;

        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFileUpload(file);
        }
    };

    const handleClick = () => {
        if (!data.disabled && !isUploading) {
            fileInputRef.current?.click();
        }
    };

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
                    <span className="nodeTitle rowText">{data.label || 'Reference'}</span>
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

            {/* Preview / Upload Area */}
            <div style={{ padding: '12px', position: 'relative' }}>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    style={{ display: 'none' }}
                />

                {previewUrl ? (
                    // Show preview
                    <div
                        onClick={handleClick}
                        style={{
                            width: '100%',
                            aspectRatio: '16/9',
                            borderRadius: '14px',
                            overflow: 'hidden',
                            cursor: data.disabled ? 'default' : 'pointer',
                            position: 'relative'
                        }}
                    >
                        <img
                            src={previewUrl}
                            alt="Reference"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                            }}
                        />
                        {!data.disabled && (
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'rgba(0,0,0,0.5)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: 0,
                                    transition: 'opacity 0.2s',
                                    fontSize: '11px',
                                    color: 'white',
                                    fontWeight: 600
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                            >
                                Click to replace
                            </div>
                        )}
                    </div>
                ) : (
                    // Show upload dropzone
                    <div
                        onClick={handleClick}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        style={{
                            width: '100%',
                            aspectRatio: '16/9',
                            background: isDragging ? 'var(--bg-panel-hover)' : 'var(--bg-panel)',
                            borderRadius: '14px',
                            border: isDragging ? '2px dashed var(--gold)' : '2px dashed var(--node-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: data.disabled ? 'default' : 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {isUploading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                <div
                                    className="animate-spin"
                                    style={{
                                        width: '24px',
                                        height: '24px',
                                        border: '2px solid var(--node-border)',
                                        borderTopColor: 'var(--gold)',
                                        borderRadius: '50%'
                                    }}
                                />
                                <div className="nodeMeta">Uploading...</div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '12px' }}>
                                <div className="nodeMeta">Click or drag image</div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Handle */}
            <Handle
                type="source"
                position={Position.Right}
                id="reference_image"
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
                    nodeType="ReferenceImage"
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

