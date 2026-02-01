'use client';

import { Node, Edge } from 'reactflow';
import { analyzeTimeline, PHASE_CONFIG, EmotionalPhase } from '../lib/timeline-analyzer';
import { useMemo } from 'react';

interface TimelineViewProps {
    nodes: Node[];
    edges: Edge[];
}

export function TimelineView({ nodes, edges }: TimelineViewProps) {
    const analysis = useMemo(() => {
        if (nodes.length === 0) return null;
        return analyzeTimeline(nodes, edges);
    }, [nodes, edges]);

    if (!analysis || nodes.length === 0) {
        return (
            <div
                className="p-6 rounded-xl"
                style={{
                    background: 'var(--node-bg)',
                    border: '1px solid var(--node-border)',
                    backdropFilter: 'var(--glass-blur)'
                }}
            >
                <p className="nodeMeta text-center">
                    Add nodes to analyze intensity phases
                </p>
            </div>
        );
    }

    const { nodes: timelineNodes, warnings } = analysis;

    return (
        <div
            className="p-6 rounded-xl flex flex-col gap-6"
            style={{
                background: 'var(--node-bg)',
                border: '1px solid var(--node-border)',
                backdropFilter: 'var(--glass-blur)'
            }}
        >
            {/* Header */}
            <div>
                <h2
                    className="nodeTitle mb-1"
                    style={{
                        fontSize: '15px',
                        whiteSpace: 'normal'
                    }}
                >
                    Emotional Intensity Flow
                </h2>
                <p className="nodeMeta">
                    Phase analysis • Not a timeline • No execution
                </p>
            </div>

            {/* Phase Bars */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    {Object.values(EmotionalPhase).map(phase => {
                        const config = PHASE_CONFIG[phase];
                        const phaseNodes = timelineNodes.filter(n => n.phase === phase);
                        const phaseWeight = phaseNodes.reduce((sum, n) => sum + n.beatWeight, 0);
                        const phasePercent = (phaseWeight / analysis.totalWeight) * 100;

                        return (
                            <div
                                key={phase}
                                className="flex-1 relative group cursor-pointer transition-all"
                                style={{
                                    height: '48px',
                                    background: `linear-gradient(135deg, ${config.color}40, ${config.color}20)`,
                                    border: `1px solid ${config.color}60`,
                                    borderRadius: '8px',
                                    minWidth: `${phasePercent}%`,
                                    opacity: phaseNodes.length > 0 ? 1 : 0.3
                                }}
                            >
                                {/* Phase Label */}
                                <div
                                    className="absolute inset-0 flex flex-col items-center justify-center"
                                    style={{
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        color: config.color,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}
                                >
                                    <span>{config.label}</span>
                                    <span style={{ fontSize: '9px', opacity: 0.7 }}>
                                        {phaseNodes.length} node{phaseNodes.length !== 1 ? 's' : ''}
                                    </span>
                                </div>

                                {/* Hover Tooltip */}
                                <div
                                    className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap"
                                    style={{
                                        background: 'rgba(0, 0, 0, 0.9)',
                                        border: `1px solid ${config.color}`,
                                        fontSize: '11px',
                                        color: 'white',
                                        zIndex: 10
                                    }}
                                >
                                    <div className="font-semibold mb-1">{config.label}</div>
                                    <div style={{ opacity: 0.8 }}>{config.description}</div>
                                    <div style={{ opacity: 0.6, marginTop: '4px' }}>
                                        Intensity: {phaseNodes.length > 0 ? 'Present' : 'Empty'}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Node Markers */}
                <div className="relative" style={{ height: '32px' }}>
                    <div
                        className="absolute inset-0 flex items-center"
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '8px',
                            border: '1px solid var(--node-border)'
                        }}
                    >
                        {timelineNodes.map((node, index) => {
                            const position = (node.cumulativePercent / 100) * 100;
                            const phaseColor = PHASE_CONFIG[node.phase].color;

                            return (
                                <div
                                    key={node.id}
                                    className="absolute group cursor-pointer"
                                    style={{
                                        left: `${position}%`,
                                        transform: 'translateX(-50%)',
                                        zIndex: timelineNodes.length - index
                                    }}
                                >
                                    {/* Node Marker */}
                                    <div
                                        className="transition-all"
                                        style={{
                                            width: '8px',
                                            height: '24px',
                                            background: phaseColor,
                                            borderRadius: '4px',
                                            border: '1px solid rgba(255, 255, 255, 0.3)',
                                            boxShadow: `0 0 8px ${phaseColor}40`
                                        }}
                                    />

                                    {/* Hover Tooltip */}
                                    <div
                                        className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap"
                                        style={{
                                            background: 'rgba(0, 0, 0, 0.95)',
                                            border: `1px solid ${phaseColor}`,
                                            fontSize: '11px',
                                            color: 'white',
                                            zIndex: 100
                                        }}
                                    >
                                        <div className="font-semibold" style={{ color: phaseColor }}>
                                            {node.label}
                                        </div>
                                        <div style={{ opacity: 0.8, marginTop: '4px' }}>
                                            Type: {node.type}
                                        </div>
                                        <div style={{ opacity: 0.8 }}>
                                            Beat intensity: {node.beatWeight.toFixed(1)}
                                        </div>
                                        <div style={{ opacity: 0.8 }}>
                                            Phase: {PHASE_CONFIG[node.phase].label}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Rhythm Warnings */}
            {warnings.length > 0 && (
                <div className="flex flex-col gap-2">
                    {warnings.map((warning, index) => (
                        <div
                            key={index}
                            className="px-4 py-3 rounded-lg flex items-start gap-3"
                            style={{
                                background: warning.severity === 'warning'
                                    ? 'rgba(251, 191, 36, 0.1)'
                                    : 'rgba(56, 189, 248, 0.1)',
                                border: `1px solid ${warning.severity === 'warning' ? '#fbbf24' : '#38bdf8'}40`,
                                fontSize: '12px'
                            }}
                        >
                            <span style={{
                                fontSize: '16px',
                                color: warning.severity === 'warning' ? '#fbbf24' : '#38bdf8'
                            }}>
                                {warning.severity === 'warning' ? '⚠️' : 'ℹ️'}
                            </span>
                            <span style={{
                                color: 'var(--text-secondary)',
                                lineHeight: 1.5
                            }}>
                                {warning.message}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Stats */}
            <div
                className="flex items-center justify-between pt-4"
                style={{ borderTop: '1px solid var(--node-border)' }}
            >
                <div className="nodeMeta">
                    {timelineNodes.length} beat{timelineNodes.length !== 1 ? 's' : ''} analyzed
                </div>
                <div className="nodeMeta">
                    Total intensity: {analysis.totalWeight.toFixed(1)}
                </div>
            </div>
        </div>
    );
}
