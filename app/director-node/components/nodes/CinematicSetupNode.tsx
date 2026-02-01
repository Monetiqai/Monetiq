'use client';

import { Handle, Position } from 'reactflow';
import { useState } from 'react';
import { useNodeContextMenu } from '../../hooks/useNodeContextMenu';
import { NodeContextMenu } from '../NodeContextMenu';
import {
    CAMERAS,
    LENSES,
    FOCAL_LENGTHS,
    APERTURES,
    QUALITIES,
    ASPECT_RATIOS,
    CINEMATIC_DEFAULTS
} from '@/lib/cinema/cinematic-setup.config';

export function CinematicSetupNode({ id, data, selected }: any) {
    const [camera, setCamera] = useState(data.camera || CINEMATIC_DEFAULTS.camera);
    const [lens, setLens] = useState(data.lens || CINEMATIC_DEFAULTS.lens);
    const [focal, setFocal] = useState(data.focal || CINEMATIC_DEFAULTS.focal);
    const [aperture, setAperture] = useState(data.aperture || CINEMATIC_DEFAULTS.aperture);
    const [quality, setQuality] = useState(data.quality || CINEMATIC_DEFAULTS.quality);
    const [aspectRatio, setAspectRatio] = useState(data.aspectRatio || CINEMATIC_DEFAULTS.aspectRatio);

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
    } = useNodeContextMenu(id, data.label || 'Cinematic Setup', data.disabled || false);

    const updateNodeData = (updates: any) => {
        window.dispatchEvent(new CustomEvent('updateNodeData', {
            detail: { nodeId: id, data: updates }
        }));
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
                pointerEvents: data.disabled ? 'none' : 'auto',
                minWidth: '280px'
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
                    <span className="nodeTitle rowText">{data.label || 'Cinematic Setup'}</span>
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
            <div className="nodeContent" style={{ paddingTop: '24px' }}>
                {/* Camera */}
                <div style={{ marginBottom: '12px' }}>
                    <label className="nodeLabel">Camera</label>
                    <select
                        value={camera}
                        onChange={(e) => {
                            setCamera(e.target.value);
                            updateNodeData({ camera: e.target.value });
                        }}
                        className="nodeSelect nodrag"
                    >
                        {Object.keys(CAMERAS).map((key) => (
                            <option key={key} value={key}>
                                {CAMERAS[key].label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Lens */}
                <div style={{ marginBottom: '12px' }}>
                    <label className="nodeLabel">Lens</label>
                    <select
                        value={lens}
                        onChange={(e) => {
                            setLens(e.target.value);
                            updateNodeData({ lens: e.target.value });
                        }}
                        className="nodeSelect nodrag"
                    >
                        {Object.keys(LENSES).map((key) => (
                            <option key={key} value={key}>
                                {LENSES[key].label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Focal Length */}
                <div style={{ marginBottom: '12px' }}>
                    <label className="nodeLabel">Focal Length</label>
                    <select
                        value={focal}
                        onChange={(e) => {
                            setFocal(e.target.value);
                            updateNodeData({ focal: e.target.value });
                        }}
                        className="nodeSelect nodrag"
                    >
                        {Object.keys(FOCAL_LENGTHS).map((key) => (
                            <option key={key} value={key}>
                                {FOCAL_LENGTHS[key].label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Aperture */}
                <div style={{ marginBottom: '12px' }}>
                    <label className="nodeLabel">Aperture</label>
                    <select
                        value={aperture}
                        onChange={(e) => {
                            setAperture(e.target.value);
                            updateNodeData({ aperture: e.target.value });
                        }}
                        className="nodeSelect nodrag"
                    >
                        {Object.keys(APERTURES).map((key) => (
                            <option key={key} value={key}>
                                {APERTURES[key].label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Quality */}
                <div style={{ marginBottom: '12px' }}>
                    <label className="nodeLabel">Quality</label>
                    <select
                        value={quality}
                        onChange={(e) => {
                            setQuality(e.target.value);
                            updateNodeData({ quality: e.target.value });
                        }}
                        className="nodeSelect nodrag"
                    >
                        {QUALITIES.map((q) => (
                            <option key={q} value={q}>{q}</option>
                        ))}
                    </select>
                </div>

                {/* Aspect Ratio */}
                <div style={{ marginBottom: '12px' }}>
                    <label className="nodeLabel">Aspect Ratio</label>
                    <select
                        value={aspectRatio}
                        onChange={(e) => {
                            setAspectRatio(e.target.value);
                            updateNodeData({ aspectRatio: e.target.value });
                        }}
                        className="nodeSelect nodrag"
                    >
                        {ASPECT_RATIOS.map((ratio) => (
                            <option key={ratio} value={ratio}>{ratio}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Right}
                id="text"
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
                    nodeType="cinematicsetup"
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
