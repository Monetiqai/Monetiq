'use client';

import { Handle, Position } from 'reactflow';
import { useState, useEffect } from 'react';
import { cdn } from '@/lib/cdn';
import { useNodeContextMenu } from '../../hooks/useNodeContextMenu';
import { NodeContextMenu } from '../NodeContextMenu';

const DIRECTOR_STYLES = {
    nolan: "Grounded cinematic realism with heavy physical presence. Natural, muted color palette with strong contrast and deep blacks. Dense atmosphere, weighty textures, believable materials. Dramatic light separation, controlled highlights, deep shadows. Serious, restrained tone, monumental but realistic image. No stylization, no exaggeration, no glossy look.",
    tarantino: "Bold, stylized realism with strong visual personality. High contrast image with rich, saturated colors. Graphic composition, striking faces, expressive details. Provocative, playful tension embedded in the image. Deliberate staging, iconic visual attitude.",
    spielberg: "Emotion-first cinematic image with clear visual readability. Warm, natural lighting enhancing human expression. Balanced composition, soft contrast, accessible color palette. Lively, immersive atmosphere with emotional clarity. Sense of wonder and humanity.",
    besson: "Graphic, high-impact cinematic image. Strong contrast with bold or neon color accents. Clean shapes, sharp silhouettes, sleek visual identity. Stylish, modern atmosphere with strong attitude. Iconic, fashion-forward presence.",
    kubrick: "Cold, controlled cinematic image with strict visual precision. Perfect symmetry and geometric composition. Neutral, clinical color palette with minimal warmth. Even, precise lighting, emotionally detached atmosphere. Calm, unsettling stillness.",
    anderson: "Highly stylized cinematic image with meticulous symmetry. Limited, pastel-oriented color palette. Flat, even lighting with minimal shadow depth. Illustrative, storybook-like visual order. Whimsical yet controlled atmosphere.",
    cameron: "High-fidelity cinematic image with epic visual presence. Clean, sharp textures and strong depth separation. Rich but controlled colors, crisp contrast. Powerful, immersive atmosphere with technical precision. Grand, impactful image quality.",
    burton: "Dark, gothic cinematic image with fairytale undertones. Exaggerated forms, dramatic contrast, deep shadows. Muted palette with selective highlights. Eerie, whimsical atmosphere with melancholic beauty. Storybook darkness.",
    scorsese: "Raw, immersive cinematic image with gritty realism. Textured lighting, strong contrast, natural imperfections. Earthy, slightly desaturated color palette. Intense emotional presence, lived-in atmosphere. Visceral, confrontational image quality.",
};

export function DirectorStyleNode({ id, data, selected }: any) {
    const [director, setDirector] = useState(data.director || 'nolan');

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
    } = useNodeContextMenu(id, data.label || 'Director Style', data.disabled || false);

    const handleDirectorChange = (newDirector: string) => {
        setDirector(newDirector);

        // Update node data
        const event = new CustomEvent('updateNodeData', {
            detail: {
                nodeId: id,
                data: {
                    director: newDirector,
                    output: DIRECTOR_STYLES[newDirector as keyof typeof DIRECTOR_STYLES]
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
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    <span className="nodeTitle rowText">{data.label || 'Director Style'}</span>
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
                <label className="nodeLabel">Director</label>
                <select
                    value={director}
                    onChange={(e) => handleDirectorChange(e.target.value)}
                    className="nodeSelect nodrag"
                >
                    <option value="nolan">Christopher Nolan</option>
                    <option value="tarantino">Quentin Tarantino</option>
                    <option value="spielberg">Steven Spielberg</option>
                    <option value="besson">Luc Besson</option>
                    <option value="kubrick">Stanley Kubrick</option>
                    <option value="anderson">Wes Anderson</option>
                    <option value="cameron">James Cameron</option>
                    <option value="burton">Tim Burton</option>
                    <option value="scorsese">Martin Scorsese</option>
                </select>

                {/* Director Photo Preview */}
                <div style={{ marginTop: '12px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <img
                        src={cdn(`/public/directors/${director}.jpg`)}
                        alt={director}
                        loading="lazy"
                        style={{
                            width: '100%',
                            height: '120px',
                            display: 'block',
                            objectFit: 'cover'
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
                    nodeType="directorstyle"
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
