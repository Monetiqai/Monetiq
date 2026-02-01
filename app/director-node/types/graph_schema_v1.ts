import { z } from 'zod';

/**
 * Director Node V1 - Graph Schema
 * LOCKED: Only these node types are allowed
 */

// Node Types (EXHAUSTIVE LIST)
export const NodeTypeSchema = z.enum([
    'prompt',
    'combineText',
    'referenceImage',
    'imageGen',
    'router',
    'videoGen'
]);
export type NodeType = z.infer<typeof NodeTypeSchema>;

// Provider Types
export const ImageProviderSchema = z.enum(['nano_banana', 'chatgpt_image', 'seeddream']);
export const VideoProviderSchema = z.enum(['veo', 'kling']);

// Base Node Data (common to all nodes)
const BaseNodeDataSchema = z.object({
    label: z.string(),
    disabled: z.boolean().default(false),
});

// Prompt Node
const PromptNodeDataSchema = BaseNodeDataSchema.extend({
    text: z.string().default(''),
});

// Combine Text Node
const CombineTextNodeDataSchema = BaseNodeDataSchema.extend({
    separator: z.string().default(', '),
});

// Reference Image Node
const ReferenceImageNodeDataSchema = BaseNodeDataSchema.extend({
    imageUrl: z.string().optional(),
    r2Key: z.string().optional(),
});

// Image Gen Node
const ImageGenNodeDataSchema = BaseNodeDataSchema.extend({
    provider: ImageProviderSchema.default('nano_banana'),
    width: z.number().default(1024),
    height: z.number().default(1024),
    seed: z.number().optional(),
});

// Router Node
const RouterNodeDataSchema = BaseNodeDataSchema.extend({
    branches: z.number().min(2).max(10).default(2),
});

// Video Gen Node
const VideoGenNodeDataSchema = BaseNodeDataSchema.extend({
    provider: VideoProviderSchema.default('veo'),
    duration: z.number().min(2).max(10).default(5),
    fps: z.number().default(24),
});

// Union of all node data types
export const NodeDataSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('prompt'), ...PromptNodeDataSchema.shape }),
    z.object({ type: z.literal('combineText'), ...CombineTextNodeDataSchema.shape }),
    z.object({ type: z.literal('referenceImage'), ...ReferenceImageNodeDataSchema.shape }),
    z.object({ type: z.literal('imageGen'), ...ImageGenNodeDataSchema.shape }),
    z.object({ type: z.literal('router'), ...RouterNodeDataSchema.shape }),
    z.object({ type: z.literal('videoGen'), ...VideoGenNodeDataSchema.shape }),
]);

// Graph Node (React Flow compatible)
export const GraphNodeSchema = z.object({
    id: z.string(),
    type: NodeTypeSchema,
    position: z.object({
        x: z.number(),
        y: z.number(),
    }),
    data: NodeDataSchema,
});

// Graph Edge
export const GraphEdgeSchema = z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    sourceHandle: z.string().optional(),
    targetHandle: z.string().optional(),
});

// Complete Graph
export const DirectorGraphV1Schema = z.object({
    version: z.literal('v1'),
    nodes: z.array(GraphNodeSchema),
    edges: z.array(GraphEdgeSchema),
    metadata: z.object({
        createdAt: z.string().datetime(),
        updatedAt: z.string().datetime(),
        name: z.string().optional(),
        description: z.string().optional(),
    }),
});

export type DirectorGraphV1 = z.infer<typeof DirectorGraphV1Schema>;
export type GraphNode = z.infer<typeof GraphNodeSchema>;
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;
export type NodeData = z.infer<typeof NodeDataSchema>;
