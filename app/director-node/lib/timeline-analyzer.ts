import { Node, Edge } from 'reactflow';

/**
 * Emotional phases for Timeline View
 */
export enum EmotionalPhase {
    HOOK = 'HOOK',
    BUILD = 'BUILD',
    TENSION = 'TENSION',
    CHAOS = 'CHAOS',
    RELEASE = 'RELEASE',
    OUTRO = 'OUTRO'
}

/**
 * Phase configuration
 */
export const PHASE_CONFIG = {
    [EmotionalPhase.HOOK]: {
        range: [0, 10],
        color: '#38bdf8',
        label: 'Hook',
        description: 'Grab attention immediately'
    },
    [EmotionalPhase.BUILD]: {
        range: [10, 30],
        color: '#10b981',
        label: 'Build',
        description: 'Establish context and raise stakes'
    },
    [EmotionalPhase.TENSION]: {
        range: [30, 50],
        color: '#fbbf24',
        label: 'Tension',
        description: 'Introduce conflict or complexity'
    },
    [EmotionalPhase.CHAOS]: {
        range: [50, 70],
        color: '#f97316',
        label: 'Chaos',
        description: 'Peak complexity, maximum intensity'
    },
    [EmotionalPhase.RELEASE]: {
        range: [70, 90],
        color: '#a855f7',
        label: 'Release',
        description: 'Resolve tension, provide catharsis'
    },
    [EmotionalPhase.OUTRO]: {
        range: [90, 100],
        color: '#ec4899',
        label: 'Outro',
        description: 'Leave lasting impression'
    }
} as const;

/**
 * Beat weights by node type
 */
export const BEAT_WEIGHTS: Record<string, number> = {
    Prompt: 0.5,
    CombineText: 0.3,
    ReferenceImage: 0.5,
    ImageGen: 1.0,
    VideoGen: 2.0,
    Router: 0.2
};

/**
 * Timeline node with beat information
 */
export interface TimelineNode {
    id: string;
    type: string;
    label: string;
    beatWeight: number;
    cumulativePercent: number;
    phase: EmotionalPhase;
    depth: number;
    parallelBranches: number;
}

/**
 * Rhythm warning
 */
export interface RhythmWarning {
    type: 'flat_rhythm' | 'early_climax' | 'missing_release' | 'multiple_peaks' | 'weak_hook';
    message: string;
    severity: 'warning' | 'info';
}

/**
 * Timeline analysis result
 */
export interface TimelineAnalysis {
    nodes: TimelineNode[];
    warnings: RhythmWarning[];
    totalWeight: number;
    maxWeight: number;
}

/**
 * Topological sort of graph nodes
 */
export function topologicalSort(nodes: Node[], edges: Edge[]): Node[] {
    const adjList = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Initialize
    nodes.forEach(node => {
        adjList.set(node.id, []);
        inDegree.set(node.id, 0);
    });

    // Build adjacency list and in-degree map
    edges.forEach(edge => {
        const from = edge.source;
        const to = edge.target;
        adjList.get(from)?.push(to);
        inDegree.set(to, (inDegree.get(to) || 0) + 1);
    });

    // Queue nodes with no incoming edges
    const queue: string[] = [];
    inDegree.forEach((degree, nodeId) => {
        if (degree === 0) {
            queue.push(nodeId);
        }
    });

    const sorted: Node[] = [];
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    while (queue.length > 0) {
        const nodeId = queue.shift()!;
        const node = nodeMap.get(nodeId);
        if (node) {
            sorted.push(node);
        }

        // Reduce in-degree for neighbors
        adjList.get(nodeId)?.forEach(neighbor => {
            const newDegree = (inDegree.get(neighbor) || 0) - 1;
            inDegree.set(neighbor, newDegree);
            if (newDegree === 0) {
                queue.push(neighbor);
            }
        });
    }

    // If sorted length < nodes length, there's a cycle (shouldn't happen in valid graph)
    if (sorted.length < nodes.length) {
        console.warn('[Timeline] Cycle detected in graph, returning partial sort');
    }

    return sorted;
}

/**
 * Calculate node depth (distance from root)
 */
export function calculateNodeDepth(nodeId: string, edges: Edge[]): number {
    const parents = edges.filter(e => e.target === nodeId);
    if (parents.length === 0) return 0;

    const parentDepths = parents.map(p => calculateNodeDepth(p.source, edges));
    return Math.max(...parentDepths) + 1;
}

/**
 * Count parallel branches from a Router node
 */
export function countParallelBranches(nodeId: string, edges: Edge[]): number {
    return edges.filter(e => e.source === nodeId).length;
}

/**
 * Calculate beat weight for a node with modifiers
 */
export function calculateBeatWeight(
    node: Node,
    edges: Edge[],
    allNodes: Node[]
): number {
    const nodeType = node.type || 'Unknown';
    const baseWeight = BEAT_WEIGHTS[nodeType] || 0.5;
    let weight = baseWeight;

    // Modifier: Parallel branches (Router outputs)
    if (nodeType === 'Router') {
        const branches = countParallelBranches(node.id, edges);
        weight += branches * 0.5;
    }

    // Modifier: Deep nesting
    const depth = calculateNodeDepth(node.id, edges);
    if (depth > 3) {
        weight += (depth - 3) * 0.3;
    }

    // Modifier: CombineText after Router (resolution signal)
    if (nodeType === 'CombineText') {
        const parents = edges.filter(e => e.target === node.id);
        const hasRouterParent = parents.some(p => {
            const parentNode = allNodes.find(n => n.id === p.source);
            return parentNode?.type === 'Router';
        });
        if (hasRouterParent) {
            weight += 0.4;
        }
    }

    return weight;
}

/**
 * Map cumulative percentage to emotional phase
 */
export function getPhaseForPercent(percent: number): EmotionalPhase {
    if (percent < 10) return EmotionalPhase.HOOK;
    if (percent < 30) return EmotionalPhase.BUILD;
    if (percent < 50) return EmotionalPhase.TENSION;
    if (percent < 70) return EmotionalPhase.CHAOS;
    if (percent < 90) return EmotionalPhase.RELEASE;
    return EmotionalPhase.OUTRO;
}

/**
 * Analyze graph and generate timeline
 */
export function analyzeTimeline(nodes: Node[], edges: Edge[]): TimelineAnalysis {
    // Step 1: Topological sort
    const sortedNodes = topologicalSort(nodes, edges);

    // Step 2: Calculate beat weights
    const nodesWithWeights = sortedNodes.map(node => ({
        node,
        weight: calculateBeatWeight(node, edges, nodes),
        depth: calculateNodeDepth(node.id, edges),
        parallelBranches: node.type === 'Router' ? countParallelBranches(node.id, edges) : 0
    }));

    // Step 3: Calculate total weight and cumulative percentages
    const totalWeight = nodesWithWeights.reduce((sum, n) => sum + n.weight, 0);
    let cumulative = 0;

    const timelineNodes: TimelineNode[] = nodesWithWeights.map(({ node, weight, depth, parallelBranches }) => {
        cumulative += weight;
        const cumulativePercent = (cumulative / totalWeight) * 100;

        return {
            id: node.id,
            type: node.type || 'Unknown',
            label: node.data.label || node.type || 'Unknown',
            beatWeight: weight,
            cumulativePercent,
            phase: getPhaseForPercent(cumulativePercent),
            depth,
            parallelBranches
        };
    });

    // Step 4: Detect rhythm warnings
    const warnings: RhythmWarning[] = [];

    // Warning 1: Flat rhythm
    const weights = nodesWithWeights.map(n => n.weight);
    const mean = weights.reduce((a, b) => a + b, 0) / weights.length;
    const variance = weights.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / weights.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev < 0.5) {
        warnings.push({
            type: 'flat_rhythm',
            message: 'Flat rhythm detected. Consider adding intensity variation.',
            severity: 'warning'
        });
    }

    // Warning 2: Early climax
    const maxWeight = Math.max(...weights);
    const maxWeightNode = timelineNodes.find(n => n.beatWeight === maxWeight);
    if (maxWeightNode && maxWeightNode.cumulativePercent < 30) {
        warnings.push({
            type: 'early_climax',
            message: `Climax too early (${maxWeightNode.label} at ${Math.round(maxWeightNode.cumulativePercent)}%). Audience may lose interest after peak.`,
            severity: 'warning'
        });
    }

    // Warning 3: Missing release
    const releaseNodes = timelineNodes.filter(n => n.phase === EmotionalPhase.RELEASE);
    const chaosNodes = timelineNodes.filter(n => n.phase === EmotionalPhase.CHAOS);
    const releaseWeight = releaseNodes.reduce((sum, n) => sum + n.beatWeight, 0);
    const chaosWeight = chaosNodes.reduce((sum, n) => sum + n.beatWeight, 0);

    if (releaseWeight > chaosWeight && chaosWeight > 0) {
        warnings.push({
            type: 'missing_release',
            message: 'No release detected. Film may feel abrupt or exhausting.',
            severity: 'warning'
        });
    }

    // Warning 4: Multiple peaks
    const highWeightNodes = timelineNodes.filter(n => n.beatWeight > 1.5);
    if (highWeightNodes.length > 2) {
        warnings.push({
            type: 'multiple_peaks',
            message: `Multiple peaks detected (${highWeightNodes.length} high-intensity nodes). Consider consolidating climax.`,
            severity: 'info'
        });
    }

    // Warning 5: Weak hook
    if (timelineNodes.length > 0 && timelineNodes[0].beatWeight < 0.8) {
        warnings.push({
            type: 'weak_hook',
            message: 'Weak hook. Consider starting with visual impact.',
            severity: 'info'
        });
    }

    return {
        nodes: timelineNodes,
        warnings,
        totalWeight,
        maxWeight
    };
}
