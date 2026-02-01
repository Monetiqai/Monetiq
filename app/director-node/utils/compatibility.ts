/**
 * Compatibility utilities for node picker
 * Handles filtering and matching based on handle types
 */

import { NodeDefinition, HandleDefinition, HandleType } from '../config/nodeRegistry';

// Re-export HandleType for convenience
export type { HandleType };

/**
 * Get compatible nodes for a given handle type
 * @param sourceHandleType - Type of the source handle (prompt, image, video)
 * @param isSourceOutput - True if dragging from output handle, false if from input
 * @param registry - Array of node definitions to filter
 * @returns Filtered array of compatible nodes
 */
export function getCompatibleNodes(
    sourceHandleType: HandleType,
    isSourceOutput: boolean,
    registry: NodeDefinition[]
): NodeDefinition[] {
    return registry.filter(node => {
        if (isSourceOutput) {
            // Source is output → need nodes with compatible input
            return node.inputs.some(input => input.type === sourceHandleType);
        } else {
            // Source is input → need nodes with compatible output
            return node.outputs.some(output => output.type === sourceHandleType);
        }
    });
}

/**
 * Find best compatible handle on target node
 * @param targetNode - Node definition to search
 * @param sourceHandleType - Type of handle to match
 * @param isSourceOutput - True if source is output, false if input
 * @returns Best matching handle or null
 */
export function findBestHandle(
    targetNode: NodeDefinition,
    sourceHandleType: HandleType,
    isSourceOutput: boolean
): HandleDefinition | null {
    const handles = isSourceOutput ? targetNode.inputs : targetNode.outputs;

    // Find first handle with matching type
    return handles.find(h => h.type === sourceHandleType) || null;
}

/**
 * Get edge color based on handle type
 * @param handleType - Type of handle (prompt, image, video)
 * @returns Hex color code
 */
export function getEdgeColor(handleType: HandleType): string {
    switch (handleType) {
        case 'prompt': return '#8b5cf6'; // Violet
        case 'image': return '#f59e0b';  // Gold
        case 'video': return '#ef4444';  // Red
        default: return '#6b7280';       // Gray
    }
}

/**
 * Get handle type from handle ID
 * Parses handle ID to determine its type
 * @param handleId - Handle identifier (e.g., 'prompt', 'image', 'ref')
 * @returns Handle type
 */
export function getHandleTypeFromId(handleId: string): HandleType {
    const id = handleId.toLowerCase();

    if (id.includes('prompt') || id.includes('text')) {
        return 'prompt';
    }
    if (id.includes('image') || id.includes('ref')) {
        return 'image';
    }
    if (id.includes('video')) {
        return 'video';
    }

    // Default to prompt
    return 'prompt';
}

/**
 * Group nodes by category
 * @param nodes - Array of node definitions
 * @returns Object with categories as keys and node arrays as values
 */
export function groupByCategory(nodes: NodeDefinition[]): Record<string, NodeDefinition[]> {
    return nodes.reduce((acc, node) => {
        const category = node.category;
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(node);
        return acc;
    }, {} as Record<string, NodeDefinition[]>);
}
