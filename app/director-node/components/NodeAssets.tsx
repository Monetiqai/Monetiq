'use client';

import { useState, useEffect } from 'react';
import { Node, Edge } from 'reactflow';

interface Graph {
    id: string;
    name: string;
    updated_at: string;
    graph_json: {
        nodes: Node[];
        edges: Edge[];
        viewport?: { x: number; y: number; zoom: number };
    };
}

interface Asset {
    id: string;
    public_url: string;
    created_at: string;
    node_id: string | null;
    node_type: string | null;
    graph_id: string | null;
}

interface NodeAssetsProps {
    currentGraphId: string | null;
    onLoadGraph: (graph: Graph) => void;
    onUseAsset: (asset: Asset) => void;
}

export function NodeAssets({ currentGraphId, onLoadGraph, onUseAsset }: NodeAssetsProps) {
    const [graphs, setGraphs] = useState<Graph[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [isLoadingGraphs, setIsLoadingGraphs] = useState(false);
    const [isLoadingAssets, setIsLoadingAssets] = useState(false);
    const [activeTab, setActiveTab] = useState<'graphs' | 'assets'>('graphs');

    // Fetch graphs on mount
    useEffect(() => {
        fetchGraphs();
    }, []);

    // Fetch assets when currentGraphId changes
    useEffect(() => {
        if (currentGraphId && activeTab === 'assets') {
            fetchAssets(currentGraphId);
        }
    }, [currentGraphId, activeTab]);

    const fetchGraphs = async () => {
        setIsLoadingGraphs(true);
        try {
            const res = await fetch('/api/director-node/graphs');
            if (res.ok) {
                const data = await res.json();
                setGraphs(data.graphs || []);
            }
        } catch (error) {
            console.error('[NodeAssets] Error fetching graphs:', error);
        } finally {
            setIsLoadingGraphs(false);
        }
    };

    const fetchAssets = async (graphId: string) => {
        setIsLoadingAssets(true);
        try {
            const res = await fetch(`/api/director-node/assets?graph_id=${graphId}`);
            if (res.ok) {
                const data = await res.json();
                setAssets(data.assets || []);
            }
        } catch (error) {
            console.error('[NodeAssets] Error fetching assets:', error);
        } finally {
            setIsLoadingAssets(false);
        }
    };

    const handleLoadGraph = (graph: Graph) => {
        onLoadGraph(graph);
    };

    const handleUseAsset = (asset: Asset) => {
        onUseAsset(asset);
    };

    return (
        <div className="w-64 bg-gray-900 border-r border-gray-700 flex flex-col h-full">
            {/* Tabs */}
            <div className="flex border-b border-gray-700">
                <button
                    onClick={() => setActiveTab('graphs')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'graphs'
                            ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                >
                    Graphs
                </button>
                <button
                    onClick={() => setActiveTab('assets')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'assets'
                            ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                >
                    Assets
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'graphs' && (
                    <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">
                            Graph Library
                        </h3>
                        {isLoadingGraphs ? (
                            <div className="text-sm text-gray-500">Loading...</div>
                        ) : graphs.length === 0 ? (
                            <div className="text-sm text-gray-500">No graphs found</div>
                        ) : (
                            graphs.map((graph) => (
                                <div
                                    key={graph.id}
                                    className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-gray-600 transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-white truncate">
                                                {graph.name}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                {new Date(graph.updated_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleLoadGraph(graph)}
                                        className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                                    >
                                        Load
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'assets' && (
                    <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">
                            Asset Library
                        </h3>
                        {!currentGraphId ? (
                            <div className="text-sm text-gray-500">
                                Load a graph to see its assets
                            </div>
                        ) : isLoadingAssets ? (
                            <div className="text-sm text-gray-500">Loading...</div>
                        ) : assets.length === 0 ? (
                            <div className="text-sm text-gray-500">No assets generated yet</div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                {assets.map((asset) => (
                                    <div
                                        key={asset.id}
                                        className="bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors overflow-hidden"
                                    >
                                        <div className="aspect-square bg-gray-900 relative">
                                            <img
                                                src={asset.public_url}
                                                alt="Asset"
                                                className="w-full h-full object-cover"
                                            />
                                            {asset.node_type && (
                                                <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-black/70 text-white text-[10px] font-medium rounded">
                                                    {asset.node_type}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleUseAsset(asset)}
                                            className="w-full px-2 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-[10px] font-medium transition-colors"
                                        >
                                            Use as Reference
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
