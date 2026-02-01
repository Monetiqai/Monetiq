'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    Node,
    Edge,
    addEdge,
    Connection,
    useNodesState,
    useEdgesState,
    NodeTypes,
    EdgeTypes,
    useReactFlow,
    OnConnectEnd,
    SelectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { PromptNode } from './nodes/PromptNode';
import { CombineTextNode } from './nodes/CombineTextNode';
import { ReferenceImageNode } from './nodes/ReferenceImageNode';
import { ImageGenNode } from './nodes/ImageGenNode';
import { RouterNode } from './nodes/RouterNode';
import { VideoGenNode } from './nodes/VideoGenNode';
import { CombineImageNode } from './nodes/CombineImageNode';
import { DirectorStyleNode } from './nodes/DirectorStyleNode';
import { CinematicSetupNode } from './nodes/CinematicSetupNode';
import { CameraMovementNode } from './nodes/CameraMovementNode';
import { DeletableEdge } from './edges/DeletableEdge';
import { PropertiesPanel } from './PropertiesPanel';
import { Toolbar } from './Toolbar';
import { NodePickerPopup } from './NodePickerPopup';
import { TimelineView } from './TimelineView';
import { BatchRunActionBar } from './BatchRunActionBar';
import { RenameNodeModal } from './RenameNodeModal';
import { NodeAssets } from './NodeAssets';
import { getNodeDefinition } from '../config/nodeRegistry';
import { findBestHandle, getEdgeColor, getHandleTypeFromId, HandleType } from '../utils/compatibility';

/**
 * Sanitize edges before saving to ensure stable JSON
 * Fixes edge corruption issue where type:'deletable' was being saved
 */
function sanitizeEdgesBeforeSave(edges: Edge[]): Edge[] {
    const allowedEdgeTypes = ['default', 'straight', 'step', 'smoothstep', 'bezier'];

    return edges.map(edge => ({
        ...edge,
        type: allowedEdgeTypes.includes(edge.type || '') ? edge.type : 'default',
        // Remove data.onDelete as it's a function and shouldn't be serialized
        data: edge.data ? { ...edge.data, onDelete: undefined } : undefined,
    }));
}

/**
 * Sanitize edges after loading from database
 */
function sanitizeEdgesOnLoad(edges: Edge[]): Edge[] {
    const allowedEdgeTypes = ['default', 'straight', 'step', 'smoothstep', 'bezier'];

    return edges.map(edge => ({
        ...edge,
        type: allowedEdgeTypes.includes(edge.type || '') ? edge.type : 'default',
    }));
}


const nodeTypes: NodeTypes = {
    Prompt: PromptNode,
    CombineText: CombineTextNode,
    ReferenceImage: ReferenceImageNode,
    ImageGen: ImageGenNode,
    Router: RouterNode,
    VideoGen: VideoGenNode,
    CombineImage: CombineImageNode,
    DirectorStyle: DirectorStyleNode,
    CinematicSetup: CinematicSetupNode,
    CameraMovement: CameraMovementNode,
};

const edgeTypes: EdgeTypes = {
    deletable: DeletableEdge,
};

export function DirectorNodeCanvas() {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [graphName, setGraphName] = useState('Untitled Graph');
    const [isSaving, setIsSaving] = useState(false);
    const [currentGraphId, setCurrentGraphId] = useState<string | null>(null); // FIX #2: Track loaded graph ID
    const reactFlowInstance = useReactFlow();
    const onGraphSavedRef = useRef<(() => void) | null>(null);

    // Node picker state
    const [nodePickerState, setNodePickerState] = useState<{
        isOpen: boolean;
        position: { x: number; y: number };
        sourceHandleType: HandleType;
        sourceHandleId: string;
        sourceNodeId: string;
        isSourceOutput: boolean;
    } | null>(null);

    // Timeline view state
    const [isTimelineOpen, setIsTimelineOpen] = useState(true);

    // Batch run state
    const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);

    // Rename modal state
    const [renameModalState, setRenameModalState] = useState<{
        isOpen: boolean;
        nodeId: string;
        currentName: string;
    } | null>(null);

    // NodeAssets panel state
    const [isNodeAssetsOpen, setIsNodeAssetsOpen] = useState(true);

    const updateNodeData = useCallback((nodeId: string, newData: any) => {
        setNodes((nds) =>
            nds.map((node) =>
                node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
            )
        );

        // Sync selectedNode if it's the node being updated
        setSelectedNode((current) => {
            if (current?.id === nodeId) {
                return { ...current, data: { ...current.data, ...newData } };
            }
            return current;
        });
    }, [setNodes]);

    // Auto-load graph on mount
    useEffect(() => {
        const autoLoadGraph = async () => {
            try {
                const res = await fetch('/api/director-node/graphs');

                // Handle auth errors
                if (res.status === 401) {
                    console.warn('[Director Node] Login required to load graphs');
                    return;
                }

                const data = await res.json();

                // No graphs found - leave canvas empty
                if (!data.graphs || data.graphs.length === 0) {
                    console.log('[Director Node] No graphs found, starting with empty canvas');
                    return;
                }

                // Load most recent graph
                if (data.graphs.length > 0) {
                    const graphToLoad = data.graphs[0]; // Already sorted by updated_at DESC
                    console.log('[Director Node] Loading graph:', graphToLoad.name);

                    // Hydrate state
                    setGraphName(graphToLoad.name || 'Untitled Graph');
                    setNodes(graphToLoad.graph_json.nodes || []);
                    setEdges(graphToLoad.graph_json.edges || []);
                    setCurrentGraphId(graphToLoad.id);

                    // Safe viewport restore - wait for ReactFlow init
                    if (graphToLoad.graph_json.viewport && reactFlowInstance) {
                        setTimeout(() => {
                            const { x, y, zoom } = graphToLoad.graph_json.viewport;
                            reactFlowInstance.setViewport({ x, y, zoom });
                        }, 100);
                    }
                }
            } catch (error) {
                console.error('[Director Node] Error auto-loading graph:', error);
            }
        };

        autoLoadGraph();
    }, []); // Run once on mount

    // Expose currentGraphId to window for nodes to access
    useEffect(() => {
        (window as any).currentDirectorNodeGraphId = currentGraphId;
    }, [currentGraphId]);

    // FIX #3: Removed duplicate loadGraph() and useEffect - all load logic is in auto-load above
    // Listen for node data updates (from inline editing)
    useEffect(() => {
        const handleNodeDataUpdate = (e: CustomEvent) => {
            const { nodeId, data } = e.detail;
            updateNodeData(nodeId, data);
        };

        window.addEventListener('updateNodeData', handleNodeDataUpdate as EventListener);

        return () => {
            window.removeEventListener('updateNodeData', handleNodeDataUpdate as EventListener);
        };
    }, [updateNodeData]);

    const saveGraph = async () => {
        setIsSaving(true);
        try {
            // FIX #4: Save REAL viewport
            const viewport = reactFlowInstance?.getViewport() || { x: 0, y: 0, zoom: 1 };

            const graphJson = {
                version: 'v1',
                nodes,
                edges,
                viewport // Real viewport from ReactFlow
            };

            // Use currentGraphId for UPDATE mode
            const method = currentGraphId ? 'PUT' : 'POST';
            const url = currentGraphId
                ? `/api/director-node/graphs/${currentGraphId}`
                : '/api/director-node/graphs';

            const body = currentGraphId
                ? { name: graphName, graph_json: graphJson } // PUT: no id in body
                : {
                    name: graphName,
                    graph_json: graphJson
                };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const errorData = await res.json();
                console.error('[Director Node] Save failed:', errorData);
                throw new Error(errorData.error || 'Failed to save graph');
            }

            const data = await res.json();
            console.log('[Director Node] Graph saved:', data);

            // FIX #2: Update currentGraphId after successful save
            if (data.id || data.graph?.id) {
                setCurrentGraphId(data.id || data.graph.id);
            }

            // Trigger graph list refresh
            if (onGraphSavedRef.current) {
                onGraphSavedRef.current();
            }
        } catch (error) {
            console.error('[Director Node] Error saving graph:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleNewGraph = useCallback(() => {
        if (nodes.length > 0 || edges.length > 0) {
            if (!confirm('Create new graph? Current unsaved changes will be lost.')) {
                return;
            }
        }
        // Clear canvas
        setNodes([]);
        setEdges([]);
        setGraphName('Untitled Graph');
        setCurrentGraphId(null);
    }, [nodes, edges, setNodes, setEdges]);

    const onDeleteEdge = useCallback((edgeId: string) => {
        setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    }, [setEdges]);

    const onConnect = useCallback(
        (params: Connection) => {
            setEdges((eds) => addEdge(
                {
                    ...params,
                    type: 'deletable', // Use deletable type to show delete button
                    deletable: true,
                    data: { onDelete: onDeleteEdge },
                },
                eds
            ));
        },
        [setEdges, onDeleteEdge]
    );

    const onNodeClick = useCallback((_: any, node: Node) => {
        setSelectedNode(node);
    }, []);

    // Selection change handler for batch run
    const onSelectionChange = useCallback(({ nodes: selectedNodes }: { nodes: Node[] }) => {
        setSelectedNodes(selectedNodes);
    }, []);

    // Node action handlers
    const duplicateNode = useCallback((nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        const newNode: Node = {
            ...node,
            id: `${node.type}-${Date.now()}`,
            position: {
                x: node.position.x + 20,
                y: node.position.y + 20
            },
            data: {
                ...node.data,
                label: `${node.data.label || node.type} (Copy)`
            }
        };

        setNodes(nds => [...nds, newNode]);
    }, [nodes, setNodes]);

    const deleteNode = useCallback((nodeId: string) => {
        setNodes(nds => nds.filter(n => n.id !== nodeId));
        setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
        if (selectedNode?.id === nodeId) {
            setSelectedNode(null);
        }
    }, [setNodes, setEdges, selectedNode]);

    const renameNode = useCallback((nodeId: string, newName: string) => {
        setNodes(nds => nds.map(n =>
            n.id === nodeId
                ? { ...n, data: { ...n.data, label: newName } }
                : n
        ));
    }, [setNodes]);

    const toggleNodeDisable = useCallback((nodeId: string) => {
        setNodes(nds => nds.map(n =>
            n.id === nodeId
                ? { ...n, data: { ...n.data, disabled: !n.data.disabled } }
                : n
        ));
    }, [setNodes]);

    // NodeAssets handlers
    const handleLoadGraph = useCallback((graph: any) => {
        console.log('[Canvas] Loading graph from NodeAssets:', graph.name);
        setGraphName(graph.name || 'Untitled Graph');
        setNodes(graph.graph_json.nodes || []);
        setEdges(graph.graph_json.edges || []);
        setCurrentGraphId(graph.id);

        // Restore viewport if present
        if (graph.graph_json.viewport && reactFlowInstance) {
            setTimeout(() => {
                const { x, y, zoom } = graph.graph_json.viewport;
                reactFlowInstance.setViewport({ x, y, zoom });
            }, 100);
        }
    }, [setNodes, setEdges, setCurrentGraphId, setGraphName, reactFlowInstance]);

    const handleUseAsset = useCallback((asset: any) => {
        console.log('[Canvas] Using asset:', asset.id);

        // Find selected ReferenceImageNode
        const selectedRefNode = selectedNode?.type === 'ReferenceImage' ? selectedNode : null;

        if (selectedRefNode) {
            // Inject asset into selected node
            updateNodeData(selectedRefNode.id, {
                reference_asset_id: asset.id,
                reference_url: asset.public_url
            });
        } else {
            // Find first ReferenceImageNode
            const refNode = nodes.find(n => n.type === 'ReferenceImage');
            if (refNode) {
                updateNodeData(refNode.id, {
                    reference_asset_id: asset.id,
                    reference_url: asset.public_url
                });
                setSelectedNode(refNode);
            } else {
                console.warn('[Canvas] No ReferenceImageNode found to inject asset');
                // TODO: Show picker or create new ReferenceImageNode
            }
        }
    }, [selectedNode, nodes, updateNodeData, setSelectedNode]);

    // Batch run handler
    const handleBatchRun = useCallback((nodeIds: string[]) => {
        nodeIds.forEach(nodeId => {
            const event = new CustomEvent('runNode', { detail: { nodeId } });
            window.dispatchEvent(event);
        });
    }, []);

    // Duplicate nodes handler
    const handleDuplicateNodes = useCallback((nodeIds: string[]) => {
        const nodesToDuplicate = nodes.filter(n => nodeIds.includes(n.id));
        const newNodes: Node[] = [];

        nodesToDuplicate.forEach(node => {
            const newNode = {
                ...node,
                id: `${node.type}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                position: {
                    x: node.position.x + 50,  // Offset by 50px
                    y: node.position.y + 50
                },
                selected: false,
                data: { ...node.data }  // Deep copy data
            };
            newNodes.push(newNode);
        });

        setNodes(nds => [...nds, ...newNodes]);
        console.log(`[Canvas] Duplicated ${newNodes.length} node(s)`);
    }, [nodes, setNodes]);

    // Delete nodes handler
    const handleDeleteNodes = useCallback((nodeIds: string[]) => {
        // Delete nodes
        setNodes(nds => nds.filter(n => !nodeIds.includes(n.id)));

        // Delete connected edges
        setEdges(eds => eds.filter(e =>
            !nodeIds.includes(e.source) && !nodeIds.includes(e.target)
        ));

        // Clear selection
        setSelectedNodes([]);
        setSelectedNode(null);

        console.log(`[Canvas] Deleted ${nodeIds.length} node(s) and their connections`);
    }, [setNodes, setEdges]);

    // Listen for node action events
    useEffect(() => {
        const handleDuplicateNode = (e: CustomEvent) => duplicateNode(e.detail.nodeId);
        const handleDeleteNode = (e: CustomEvent) => deleteNode(e.detail.nodeId);
        const handleRenameNode = (e: CustomEvent) => {
            setRenameModalState({
                isOpen: true,
                nodeId: e.detail.nodeId,
                currentName: e.detail.currentName
            });
        };
        const handleToggleDisable = (e: CustomEvent) => toggleNodeDisable(e.detail.nodeId);

        window.addEventListener('duplicateNode', handleDuplicateNode as EventListener);
        window.addEventListener('deleteNode', handleDeleteNode as EventListener);
        window.addEventListener('renameNode', handleRenameNode as EventListener);
        window.addEventListener('toggleNodeDisable', handleToggleDisable as EventListener);

        return () => {
            window.removeEventListener('duplicateNode', handleDuplicateNode as EventListener);
            window.removeEventListener('deleteNode', handleDeleteNode as EventListener);
            window.removeEventListener('renameNode', handleRenameNode as EventListener);
            window.removeEventListener('toggleNodeDisable', handleToggleDisable as EventListener);
        };
    }, [duplicateNode, deleteNode, toggleNodeDisable]);


    // Track connection state for node picker
    const connectingNodeId = useRef<string | null>(null);
    const connectingHandleId = useRef<string | null>(null);
    const connectingHandleType = useRef<HandleType | null>(null);

    // Track connection start
    const onConnectStart = useCallback((_: any, params: any) => {
        console.log('[NodePicker] onConnectStart', params);
        connectingNodeId.current = params.nodeId;
        connectingHandleId.current = params.handleId;
        connectingHandleType.current = getHandleTypeFromId(params.handleId || '');
    }, []);

    // Handle edge drop on empty canvas
    const onConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
        console.log('[NodePicker] onConnectEnd triggered', {
            hasNodeId: !!connectingNodeId.current,
            hasHandleId: !!connectingHandleId.current
        });

        // Check if we have connection info from onConnectStart
        if (!connectingNodeId.current || !connectingHandleId.current) {
            console.log('[NodePicker] No connecting node/handle tracked');
            connectingNodeId.current = null;
            connectingHandleId.current = null;
            connectingHandleType.current = null;
            return;
        }

        // Get the target element
        const target = 'changedTouches' in event ? event.changedTouches[0].target : event.target;

        // Check if dropped on the pane (not on a node)
        const isPane = (target as HTMLElement)?.classList?.contains('react-flow__pane');

        console.log('[NodePicker] Drop target', { isPane, targetClasses: (target as HTMLElement)?.className });

        if (isPane) {
            const { clientX, clientY } = 'changedTouches' in event ? event.changedTouches[0] : event;

            console.log('[NodePicker] Opening popup', {
                sourceNode: connectingNodeId.current,
                sourceHandle: connectingHandleId.current,
                handleType: connectingHandleType.current,
                position: { x: clientX, y: clientY }
            });

            setNodePickerState({
                isOpen: true,
                position: { x: clientX, y: clientY },
                sourceHandleType: connectingHandleType.current!,
                sourceHandleId: connectingHandleId.current,
                sourceNodeId: connectingNodeId.current,
                isSourceOutput: true
            });
        }

        // Reset connection tracking
        connectingNodeId.current = null;
        connectingHandleId.current = null;
        connectingHandleType.current = null;
    }, []);

    // Handle node selection from popup
    const handleNodeSelect = useCallback((nodeId: string) => {
        if (!nodePickerState) return;

        const nodeDef = getNodeDefinition(nodeId);
        if (!nodeDef) return;

        // Get canvas position from screen position
        const canvasPosition = reactFlowInstance.screenToFlowPosition({
            x: nodePickerState.position.x,
            y: nodePickerState.position.y
        });

        // Create new node at drop position
        const newNode: Node = {
            id: `node-${Date.now()}`,
            type: nodeId,
            position: canvasPosition,
            data: {}
        };

        setNodes(nds => [...nds, newNode]);

        // Find best compatible handle on new node
        const targetHandle = findBestHandle(
            nodeDef,
            nodePickerState.sourceHandleType,
            nodePickerState.isSourceOutput
        );

        if (targetHandle) {
            // Create edge with correct color
            const edgeColor = getEdgeColor(nodePickerState.sourceHandleType);

            const newEdge: Edge = {
                id: `edge-${Date.now()}`,
                source: nodePickerState.sourceNodeId,
                sourceHandle: nodePickerState.sourceHandleId,
                target: newNode.id,
                targetHandle: targetHandle.id,
                type: 'deletable', // Use deletable type to show delete button
                deletable: true,
                data: { onDelete: onDeleteEdge },
                style: {
                    stroke: edgeColor,
                    strokeWidth: 2
                },
                animated: false
            };

            setEdges(eds => [...eds, newEdge]);
        }

        // Close popup
        setNodePickerState(null);
    }, [nodePickerState, setNodes, setEdges, reactFlowInstance]);

    const addNode = (type: string) => {
        const newNode: Node = {
            id: `node-${Date.now()}`,
            type,
            position: { x: 250, y: 250 },
            data: { label: type }
        };
        setNodes((nds) => [...nds, newNode]);
    };

    return (
        <div className="flex h-screen bg-gray-900">
            {/* Toolbar */}
            <Toolbar
                onAddNode={addNode}
                onSave={saveGraph}
                onNewGraph={handleNewGraph}
                onGraphSaved={(callback) => {
                    // Store fetchGraphs callback from Toolbar
                    onGraphSavedRef.current = callback;
                }}
                isSaving={isSaving}
                graphName={graphName}
                onGraphNameChange={setGraphName}
                currentGraphId={currentGraphId}
                onLoadGraph={handleLoadGraph}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Canvas */}
                <div className="flex-1 relative">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        nodeTypes={nodeTypes}
                        edgeTypes={edgeTypes}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onConnectStart={onConnectStart}
                        onConnectEnd={onConnectEnd}
                        onNodeClick={onNodeClick}
                        onSelectionChange={onSelectionChange}
                        panOnDrag={true}
                        selectionMode={SelectionMode.Partial}
                        multiSelectionKeyCode="Shift"
                        fitView
                    >
                        <Background color="#444" gap={16} />
                        <Controls />
                        <MiniMap
                            nodeColor={(node) => {
                                switch (node.type) {
                                    case 'Prompt': return '#8b5cf6'; // Violet
                                    case 'CombineText': return '#8b5cf6'; // Violet
                                    case 'ReferenceImage': return '#f59e0b'; // Gold
                                    case 'ImageGen': return '#f59e0b'; // Gold
                                    case 'Router': return '#ec4899';
                                    case 'VideoGen': return '#ef4444';
                                    default: return '#6b7280';
                                }
                            }}
                        />

                        {/* Watermark Logo */}
                        <div
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                pointerEvents: 'none',
                                zIndex: 0,
                                opacity: 0.03,
                                width: '600px',
                                height: '600px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <img
                                src="/logo.png"
                                alt="Monetiq"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain'
                                }}
                            />
                        </div>
                    </ReactFlow>
                </div>

                {/* Timeline View */}
                <div
                    className="relative transition-all"
                    style={{
                        height: isTimelineOpen ? '280px' : '48px',
                        borderTop: '1px solid var(--node-border)'
                    }}
                >
                    {/* Toggle Button */}
                    <button
                        onClick={() => setIsTimelineOpen(!isTimelineOpen)}
                        className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-4 py-2 rounded-full font-medium transition-all z-10"
                        style={{
                            background: 'var(--node-bg)',
                            border: '1px solid var(--node-border)',
                            backdropFilter: 'var(--glass-blur)',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--text-secondary)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--sky)';
                            e.currentTarget.style.transform = 'translate(-50%, -50%) translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--node-border)';
                            e.currentTarget.style.transform = 'translate(-50%, -50%)';
                        }}
                    >
                        {isTimelineOpen ? '▼' : '▲'} Intensity Phases (Read-Only)
                    </button>

                    {/* Timeline Content */}
                    {isTimelineOpen && (
                        <div className="h-full overflow-y-auto p-4">
                            <TimelineView nodes={nodes} edges={edges} />
                        </div>
                    )}
                </div>
            </div>

            {/* Properties Panel */}
            {selectedNode && (
                <PropertiesPanel
                    node={selectedNode}
                    onUpdate={(newData) => updateNodeData(selectedNode.id, newData)}
                    onClose={() => setSelectedNode(null)}
                />
            )}

            {/* Node Picker Popup */}
            {nodePickerState && (
                <NodePickerPopup
                    isOpen={nodePickerState.isOpen}
                    position={nodePickerState.position}
                    sourceHandleType={nodePickerState.sourceHandleType}
                    isSourceOutput={nodePickerState.isSourceOutput}
                    onSelect={handleNodeSelect}
                    onClose={() => setNodePickerState(null)}
                />
            )}

            {/* Batch Run Action Bar */}
            <BatchRunActionBar
                selectedNodes={selectedNodes}
                onRunSelected={handleBatchRun}
                onDuplicate={handleDuplicateNodes}
                onDelete={handleDeleteNodes}
                onDismiss={() => setSelectedNodes([])}
            />

            {/* Rename Node Modal */}
            {renameModalState && (
                <RenameNodeModal
                    isOpen={renameModalState.isOpen}
                    currentName={renameModalState.currentName}
                    onClose={() => setRenameModalState(null)}
                    onSave={(newName) => {
                        if (renameModalState) {
                            renameNode(renameModalState.nodeId, newName);
                            setRenameModalState(null);
                        }
                    }}
                />
            )}
        </div>
    );
}
