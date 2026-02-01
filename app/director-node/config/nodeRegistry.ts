/**
 * Node Registry - Central source of truth for all node types
 * This drives the popup node picker and ensures consistency
 */

export type HandleType = 'prompt' | 'image' | 'video' | 'text';

export interface HandleDefinition {
    id: string;
    type: HandleType;
    label: string;
    position?: 'top' | 'left' | 'bottom' | 'right';
}

export interface NodeDefinition {
    id: string;
    label: string;
    icon: string;
    category: string;
    subcategory?: string;
    description?: string;
    inputs: HandleDefinition[];
    outputs: HandleDefinition[];
    tags?: string[];
}

export const NODE_REGISTRY: NodeDefinition[] = [
    {
        id: 'Prompt',
        label: 'Prompt',
        icon: '📝',
        category: 'Input',
        description: 'Static text prompt',
        inputs: [],
        outputs: [
            { id: 'prompt', type: 'prompt', label: 'Prompt', position: 'right' }
        ],
        tags: ['text', 'input', 'prompt', 'static']
    },
    {
        id: 'CombineText',
        label: 'Combine Text',
        icon: '🔗',
        category: 'Text',
        description: 'Combine multiple text inputs',
        inputs: [
            { id: 'input', type: 'prompt', label: 'Input', position: 'left' }
        ],
        outputs: [
            { id: 'prompt', type: 'prompt', label: 'Combined', position: 'right' }
        ],
        tags: ['text', 'combine', 'merge', 'concatenate']
    },
    {
        id: 'ReferenceImage',
        label: 'Reference Image',
        icon: '🖼️',
        category: 'Input',
        description: 'Upload reference image',
        inputs: [],
        outputs: [
            { id: 'image', type: 'image', label: 'Image', position: 'right' }
        ],
        tags: ['image', 'upload', 'reference', 'input']
    },
    {
        id: 'ImageGen',
        label: 'Image Generation',
        icon: '🎨',
        category: 'Generation',
        subcategory: 'Image',
        description: 'Generate image from prompt',
        inputs: [
            { id: 'prompt', type: 'prompt', label: 'Prompt', position: 'left' },
            { id: 'reference_image', type: 'image', label: 'Reference', position: 'left' }
        ],
        outputs: [
            { id: 'image_asset', type: 'image', label: 'Image', position: 'right' }
        ],
        tags: ['image', 'generation', 'ai', 'nano banana', 'create']
    },
    {
        id: 'Router',
        label: 'Router',
        icon: '🔀',
        category: 'Logic',
        description: 'Route to multiple outputs',
        inputs: [
            { id: 'input', type: 'prompt', label: 'Input', position: 'left' }
        ],
        outputs: [
            { id: 'output-1', type: 'prompt', label: 'Output 1', position: 'right' },
            { id: 'output-2', type: 'prompt', label: 'Output 2', position: 'right' }
        ],
        tags: ['logic', 'route', 'branch', 'split']
    },
    {
        id: 'VideoGen',
        label: 'Video Generation',
        icon: '🎬',
        category: 'Generation',
        subcategory: 'Video',
        description: 'Generate video from prompt and image',
        inputs: [
            { id: 'prompt', type: 'prompt', label: 'Prompt', position: 'left' },
            { id: 'image', type: 'image', label: 'Image', position: 'left' }
        ],
        outputs: [
            { id: 'video', type: 'video', label: 'Video', position: 'right' }
        ],
        tags: ['video', 'generation', 'ai', 'animate', 'create']
    },
    {
        id: 'CombineImage',
        label: 'Combine Image',
        icon: '🎭',
        category: 'Processing',
        description: 'Combine multiple images into one reference',
        inputs: [
            { id: 'image', type: 'image', label: 'Images', position: 'left' }
        ],
        outputs: [
            { id: 'reference', type: 'image', label: 'Reference', position: 'right' }
        ],
        tags: ['image', 'combine', 'merge', 'reference', 'processing']
    },
    {
        id: 'DirectorStyle',
        label: 'Director Style',
        icon: '🎬',
        category: 'Text',
        description: 'Inject director style into prompt',
        inputs: [],
        outputs: [
            { id: 'text', type: 'text', label: 'Style', position: 'right' }
        ],
        tags: ['text', 'style', 'director', 'cinematic', 'preset']
    },
    {
        id: 'CinematicSetup',
        label: 'Cinematic Setup',
        icon: '🎥',
        category: 'Text',
        description: 'Inject cinematic setup into prompt',
        inputs: [],
        outputs: [
            { id: 'text', type: 'text', label: 'Setup', position: 'right' }
        ],
        tags: ['text', 'camera', 'lens', 'cinematic', 'preset']
    },
    {
        id: 'CameraMovement',
        label: 'Camera Movement',
        icon: '🎬',
        category: 'Text',
        description: 'Select camera movement style',
        inputs: [],
        outputs: [
            { id: 'text', type: 'text', label: 'Movement', position: 'right' }
        ],
        tags: ['text', 'movement', 'camera', 'cinematic', 'motion']
    }
];

/**
 * Get node definition by ID
 */
export function getNodeDefinition(nodeId: string): NodeDefinition | undefined {
    return NODE_REGISTRY.find(n => n.id === nodeId);
}

/**
 * Get all categories
 */
export function getCategories(): string[] {
    return Array.from(new Set(NODE_REGISTRY.map(n => n.category)));
}
