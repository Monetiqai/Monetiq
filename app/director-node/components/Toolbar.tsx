'use client';

import { useState, useEffect } from 'react';

interface ToolbarProps {
    onAddNode: (type: string) => void;
    onSave: () => void;
    onNewGraph: () => void;
    onGraphSaved?: (callback: () => void) => void;
    isSaving: boolean;
    graphName: string;
    onGraphNameChange: (name: string) => void;
    currentGraphId: string | null;
    onLoadGraph: (graph: any) => void;
}

const nodeCategories = [
    {
        category: 'Text',
        nodes: [
            {
                type: 'Prompt',
                label: 'Prompt',
                icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                )
            },
            {
                type: 'CombineText',
                label: 'Combine',
                icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                )
            },
            {
                type: 'DirectorStyle',
                label: 'Director Style',
                icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 7h10v10H7z" />
                        <path d="M3 3h18v18H3z" />
                    </svg>
                )
            },
            {
                type: 'CinematicSetup',
                label: 'Cinematic Setup',
                icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="7" width="20" height="10" rx="2" />
                        <circle cx="8" cy="12" r="2" />
                        <circle cx="16" cy="12" r="2" />
                    </svg>
                )
            },
            {
                type: 'CameraMovement',
                label: 'Camera Movement',
                icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                    </svg>
                )
            },
        ]
    },
    {
        category: 'Image',
        nodes: [
            {
                type: 'ReferenceImage',
                label: 'Ref Image',
                icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                    </svg>
                )
            },
            {
                type: 'ImageGen',
                label: 'Image Gen',
                icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                    </svg>
                )
            },
            {
                type: 'CombineImage',
                label: 'Combine Image',
                icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                    </svg>
                )
            },
        ]
    },
    {
        category: 'Video',
        nodes: [
            {
                type: 'VideoGen',
                label: 'Video Gen',
                icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                        <line x1="7" y1="2" x2="7" y2="22" />
                        <line x1="17" y1="2" x2="17" y2="22" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                    </svg>
                )
            },
        ]
    },
];

export function Toolbar({
    onAddNode,
    onSave,
    onNewGraph,
    onGraphSaved,
    isSaving,
    graphName,
    onGraphNameChange,
    currentGraphId,
    onLoadGraph
}: ToolbarProps) {
    const [graphs, setGraphs] = useState<any[]>([]);
    const [isLoadingGraphs, setIsLoadingGraphs] = useState(false);

    const fetchGraphs = async () => {
        setIsLoadingGraphs(true);
        try {
            const res = await fetch('/api/director-node/graphs');
            if (res.ok) {
                const data = await res.json();
                setGraphs(data.graphs || []);
            }
        } catch (error) {
            console.error('[Toolbar] Error fetching graphs:', error);
        } finally {
            setIsLoadingGraphs(false);
        }
    };

    // Fetch graphs on mount
    useEffect(() => {
        fetchGraphs();
        // Pass fetchGraphs to parent via onGraphSaved
        if (onGraphSaved) {
            onGraphSaved(fetchGraphs);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once on mount

    const handleDuplicateGraph = async (graph: any) => {
        try {
            const res = await fetch('/api/director-node/graphs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: `${graph.name} (Copy)`,
                    graph_json: graph.graph_json,
                }),
            });
            if (res.ok) {
                fetchGraphs(); // Refresh list
            }
        } catch (error) {
            console.error('[Toolbar] Error duplicating graph:', error);
        }
    };

    const handleRenameGraph = async (graph: any) => {
        const newName = prompt('Enter new name:', graph.name);
        if (!newName || newName === graph.name) return;

        try {
            const res = await fetch(`/api/director-node/graphs/${graph.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newName,
                    graph_json: graph.graph_json,
                }),
            });
            if (res.ok) {
                fetchGraphs(); // Refresh list
            }
        } catch (error) {
            console.error('[Toolbar] Error renaming graph:', error);
        }
    };

    const handleDeleteGraph = async (graph: any) => {
        if (!confirm(`Delete "${graph.name}"?`)) return;

        try {
            const res = await fetch(`/api/director-node/graphs/${graph.id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                fetchGraphs(); // Refresh list
            }
        } catch (error) {
            console.error('[Toolbar] Error deleting graph:', error);
        }
    };
    return (
        <div
            className="w-64 p-4 flex flex-col gap-4"
            style={{
                background: 'var(--node-bg)',
                borderRight: '1px solid var(--node-border)',
                backdropFilter: 'var(--glass-blur)'
            }}
        >
            {/* Graph Name */}
            <div>
                <label
                    className="block mb-2 nodeTitle"
                    style={{ whiteSpace: 'normal', color: 'white' }}
                >
                    Graph Name
                </label>
                <input
                    type="text"
                    value={graphName}
                    onChange={(e) => onGraphNameChange(e.target.value)}
                    className="w-full px-3 py-2 rounded text-white focus:outline-none focus:ring-2"
                    style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--node-border)',
                        borderRadius: '12px',
                        fontSize: '13px',
                        transition: 'var(--transition-fast)'
                    }}
                    onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--sky)';
                        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(56, 189, 248, 0.2)';
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--node-border)';
                        e.currentTarget.style.boxShadow = 'none';
                    }}
                />
            </div>

            {/* Save Button */}
            <button
                onClick={onSave}
                disabled={isSaving}
                className="w-full px-4 py-2 rounded font-medium transition-all"
                style={{
                    background: isSaving ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.08)',
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    opacity: isSaving ? 0.5 : 1,
                    border: '1px solid var(--node-border)'
                }}
                onMouseEnter={(e) => {
                    if (!isSaving) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                        e.currentTarget.style.borderColor = 'var(--text-secondary)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = isSaving ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.borderColor = 'var(--node-border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                }}
            >
                {isSaving ? 'Saving...' : '💾 Save Graph'}
            </button>

            {/* New Graph Button */}
            <button
                onClick={onNewGraph}
                className="w-full px-4 py-2 rounded font-medium transition-all"
                style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid var(--node-border)'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.borderColor = 'var(--text-secondary)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.borderColor = 'var(--node-border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                }}
            >
                ✨ New Graph
            </button>

            {/* Divider */}
            <div style={{ borderTop: '1px solid var(--node-border)' }} />

            {/* Node Types */}
            <div>
                <h3
                    className="nodeTitle mb-3"
                    style={{ whiteSpace: 'normal', color: 'white' }}
                >
                    Add Nodes
                </h3>
                <div className="flex flex-col gap-4">
                    {nodeCategories.map(({ category, nodes }) => {
                        // Determine category color
                        const categoryColor = category === 'Text'
                            ? '#8b5cf6' // Violet for Text
                            : '#f59e0b'; // Gold for Image and Video

                        return (
                            <div key={category}>
                                {/* Category Header */}
                                <div
                                    className="nodeMeta mb-2"
                                    style={{
                                        fontSize: '11px',
                                        color: categoryColor,
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}
                                >
                                    {category}
                                </div>

                                {/* Category Nodes */}
                                <div className="flex flex-col gap-2">
                                    {nodes.map(({ type, label, icon }) => (
                                        <button
                                            key={type}
                                            onClick={() => onAddNode(type)}
                                            className="px-3 py-2 rounded text-sm font-medium transition-all text-left flex items-center gap-2"
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid var(--node-border)',
                                                borderRadius: '12px',
                                                color: 'white',
                                                fontSize: '13px',
                                                fontWeight: 600
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                                e.currentTarget.style.borderColor = 'var(--sky)';
                                                e.currentTarget.style.transform = 'translateX(2px)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                                e.currentTarget.style.borderColor = 'var(--node-border)';
                                                e.currentTarget.style.transform = 'translateX(0)';
                                            }}
                                        >
                                            <span style={{ opacity: 0.9 }}>{icon}</span>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid var(--node-border)' }} />

            {/* Saved Graphs */}
            <div>
                <h3
                    className="nodeTitle mb-3"
                    style={{ whiteSpace: 'normal', color: 'white' }}
                >
                    Saved Graphs
                </h3>
                {isLoadingGraphs ? (
                    <div className="text-xs text-gray-500">Loading...</div>
                ) : graphs.length === 0 ? (
                    <div className="text-xs text-gray-500">No saved graphs</div>
                ) : (
                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                        {graphs.slice(0, 5).map((graph) => (
                            <div
                                key={graph.id}
                                className="px-2 py-2 rounded transition-all"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid var(--node-border)',
                                    borderRadius: '12px',
                                }}
                            >
                                <div
                                    className="nodeMeta truncate mb-2"
                                    style={{
                                        fontSize: '11px',
                                        color: 'var(--text-secondary)'
                                    }}
                                >
                                    {graph.name}
                                </div>
                                {/* Action Icons */}
                                <div className="flex gap-1">
                                    {/* Load */}
                                    <button
                                        onClick={() => onLoadGraph(graph)}
                                        className="flex-1 p-1.5 rounded transition-all"
                                        style={{
                                            background: 'rgba(56, 189, 248, 0.1)',
                                            border: '1px solid rgba(56, 189, 248, 0.3)',
                                            borderRadius: '8px',
                                        }}
                                        title="Load graph"
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)';
                                            e.currentTarget.style.borderColor = 'var(--sky)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)';
                                            e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.3)';
                                        }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--sky)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: 'auto', display: 'block' }}>
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="7 10 12 15 17 10" />
                                            <line x1="12" y1="15" x2="12" y2="3" />
                                        </svg>
                                    </button>

                                    {/* Duplicate */}
                                    <button
                                        onClick={() => handleDuplicateGraph(graph)}
                                        className="flex-1 p-1.5 rounded transition-all"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid var(--node-border)',
                                            borderRadius: '8px',
                                        }}
                                        title="Duplicate graph"
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                            e.currentTarget.style.borderColor = 'var(--text-secondary)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                            e.currentTarget.style.borderColor = 'var(--node-border)';
                                        }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: 'auto', display: 'block' }}>
                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                        </svg>
                                    </button>

                                    {/* Rename */}
                                    <button
                                        onClick={() => handleRenameGraph(graph)}
                                        className="flex-1 p-1.5 rounded transition-all"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid var(--node-border)',
                                            borderRadius: '8px',
                                        }}
                                        title="Rename graph"
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                            e.currentTarget.style.borderColor = 'var(--text-secondary)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                            e.currentTarget.style.borderColor = 'var(--node-border)';
                                        }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: 'auto', display: 'block' }}>
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                    </button>

                                    {/* Delete */}
                                    <button
                                        onClick={() => handleDeleteGraph(graph)}
                                        className="flex-1 p-1.5 rounded transition-all"
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                            borderRadius: '8px',
                                        }}
                                        title="Delete graph"
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                            e.currentTarget.style.borderColor = '#ef4444';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                                        }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: 'auto', display: 'block' }}>
                                            <polyline points="3 6 5 6 21 6" />
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Info */}
            <div
                className="mt-auto pt-4"
                style={{ borderTop: '1px solid var(--node-border)' }}
            >
                <p className="nodeMeta">
                    Director Node v1.0
                    <br />
                    Isolated Module
                </p>
            </div>
        </div>
    );
}
