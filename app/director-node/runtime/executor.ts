/**
 * Director Node Executor
 * Handles execution of individual nodes in the graph
 * Last modified: 2026-01-29 16:35 - Confirmed correct module loading
 */

import { GraphNode, GraphEdge, NodeType } from '../types/graph_schema_v1';
import { NodeContracts } from '../types/node_contracts';

// Node Execution State
export type NodeState = 'idle' | 'running' | 'success' | 'error';

export interface NodeExecutionResult {
    nodeId: string;
    state: NodeState;
    outputs?: Record<string, any>;
    error?: string;
    startedAt?: string;
    completedAt?: string;
}

// Runtime Context (persisted per run)
export interface RuntimeContext {
    runId: string;
    graphId: string;
    userId: string;
    projectId?: string;
    nodeResults: Map<string, NodeExecutionResult>;
}

/**
 * Resolve output key from node type and handle ID
 * This prevents silent failures when handle IDs don't match output keys
 */
function resolveOutputKey(nodeType: string, handleId?: string): string | null {
    if (!handleId) return null;

    // Map handle IDs to actual output keys for each node type
    const handleToOutputMap: Record<string, Record<string, string>> = {
        'prompt': {
            'prompt': 'prompt_text',
            'prompt_text': 'prompt_text', // Allow both for compatibility
        },
        'combinetext': {
            'combined': 'prompt',
            'combined_prompt': 'prompt',
            'prompt': 'prompt',
        },
        'imagegen': {
            'image': 'image_asset',
            'image_asset': 'image_asset',
        },
        'referenceimage': {
            'reference': 'reference_image',
            'reference_image': 'reference_image',
        },
        'combineimage': {
            'reference': 'reference_image',
            'reference_image': 'reference_image',
        },
        'videogen': {
            'video': 'video_asset',
            'video_asset': 'video_asset',
        },
        'directorstyle': {
            'text': 'prompt_text',
            'prompt_text': 'prompt_text',
        },
        'cinematicsetup': {
            'text': 'prompt_text',
            'prompt_text': 'prompt_text',
        },
        'cameramovement': {
            'text': 'prompt_text',
            'prompt_text': 'prompt_text',
        },
    };

    const normalizedType = nodeType.toLowerCase();
    const normalizedHandle = handleId.toLowerCase();

    return handleToOutputMap[normalizedType]?.[normalizedHandle] ?? null;
}

/**
 * Resolve input key from node type and handle ID
 * Maps target handle IDs to actual input parameter names
 */
function resolveInputKey(nodeType: string, handleId?: string): string | null {
    if (!handleId) return null;

    // Map handle IDs to actual input keys for each node type
    const handleToInputMap: Record<string, Record<string, string>> = {
        'combinetext': {
            'input': 'prompt_texts',
            'prompt_text': 'prompt_texts',
            'prompt_texts': 'prompt_texts',
        },
        'imagegen': {
            'prompt': 'prompt',
            'combined_prompt': 'prompt',
            'combined': 'prompt',
            'reference': 'reference_image',
            'reference_image': 'reference_image',
        },
        'combineimage': {
            'image': 'images',
            'images': 'images',
            'image_1': 'images',
            'image_2': 'images',
            'image_3': 'images',
            'image_4': 'images',
            'image_5': 'images',
            'image_6': 'images',
            'image_7': 'images',
            'image_8': 'images',
            'image_9': 'images',
            'image_10': 'images',
        },
        'videogen': {
            'image': 'reference_image',           // From ImageGen or ReferenceImage
            'keyframe': 'reference_image',        // Legacy support
            'reference_image': 'reference_image', // Direct mapping
        },
    };

    const normalizedType = nodeType.toLowerCase();
    const normalizedHandle = handleId.toLowerCase();

    return handleToInputMap[normalizedType]?.[normalizedHandle] ?? handleId; // Fallback to handleId
}


/**
 * Resolve inputs for a node from its incoming edges
 */
export function resolveNodeInputs(
    nodeId: string,
    nodeType: NodeType,
    edges: GraphEdge[],
    context: RuntimeContext
): Record<string, any> | null {
    const inputs: Record<string, any> = {};

    // Find all incoming edges
    const incomingEdges = edges.filter(e => e.target === nodeId);

    // For each incoming edge, get the output from the source node
    for (const edge of incomingEdges) {
        const sourceResult = context.nodeResults.get(edge.source);

        // If source hasn't run yet or failed, inputs are incomplete
        if (!sourceResult || sourceResult.state !== 'success') {
            console.log(`[Executor] Source node ${edge.source} not ready`);
            return null;
        }

        // Resolve the output key from the handle ID
        const sourceNodeType = sourceResult.outputs?.__nodeType || 'unknown';
        const outputKey = resolveOutputKey(sourceNodeType, edge.sourceHandle);

        if (!outputKey) {
            console.error(`[Executor] Invalid output handle "${edge.sourceHandle}" on ${sourceNodeType}`);
            throw new Error(`Invalid output handle "${edge.sourceHandle}" on node type "${sourceNodeType}"`);
        }

        // Get the output from source node using resolved key
        const sourceOutput = sourceResult.outputs?.[outputKey];
        if (sourceOutput === undefined) {
            console.error(`[Executor] Output key "${outputKey}" not found in ${sourceNodeType} outputs:`, sourceResult.outputs);
            return null;
        }

        // Map to target input handle using resolveInputKey
        const targetInputKey = resolveInputKey(nodeType, edge.targetHandle);
        if (!targetInputKey) {
            console.error(`[Executor] Invalid target handle "${edge.targetHandle}" on ${nodeType}`);
            throw new Error(`Invalid target handle "${edge.targetHandle}" on node type "${nodeType}"`);
        }

        console.log(`[Executor] Mapping ${sourceNodeType}.${outputKey} → ${nodeType}.${targetInputKey}`);

        // Handle array inputs (e.g., CombineText)
        if (Array.isArray(inputs[targetInputKey])) {
            inputs[targetInputKey].push(sourceOutput);
        } else if (inputs[targetInputKey]) {
            // Convert to array if multiple inputs
            inputs[targetInputKey] = [inputs[targetInputKey], sourceOutput];
        } else {
            inputs[targetInputKey] = sourceOutput;
        }
    }

    return inputs;
}

/**
 * Validate node inputs against contract
 */
export function validateNodeInputs(
    nodeType: NodeType,
    inputs: Record<string, any>
): { valid: boolean; error?: string } {
    // Normalize to lowercase for case-insensitive matching
    const normalizedType = nodeType.toLowerCase();

    // Type-specific validation
    switch (normalizedType) {
        case 'prompt':
            // No inputs required
            return { valid: true };

        case 'combinetext':
            if (!inputs.prompt_texts || !Array.isArray(inputs.prompt_texts) || inputs.prompt_texts.length === 0) {
                return { valid: false, error: 'CombineText requires at least 1 prompt_text input' };
            }
            return { valid: true };

        case 'referenceimage':
            // No inputs required
            return { valid: true };

        case 'imagegen':
            // V1.1: ImageGen can accept prompt from:
            // 1. Connected CombineText node (inputs.prompt)
            // 2. Standalone mode with node.data.prompt
            // Note: Direct Prompt → ImageGen is forbidden (checked separately)

            // Allow standalone mode - validation will happen in executeNode
            return { valid: true };

        case 'router':
            if (!inputs.image_asset) {
                return { valid: false, error: 'Router requires image_asset input' };
            }
            return { valid: true };

        case 'videogen':
            if (!inputs.reference_image) {
                return { valid: false, error: 'VideoGen requires reference_image input (keyframe)' };
            }
            return { valid: true };

        case 'directorstyle':
        case 'cinematicsetup':
        case 'cameramovement':
            // No inputs required - these are config injectors
            return { valid: true };

        case 'combineimage':
            // CombineImage requires at least 1 image input
            if (!inputs.images || (Array.isArray(inputs.images) && inputs.images.length === 0)) {
                return { valid: false, error: 'CombineImage requires at least 1 image input' };
            }
            return { valid: true };

        default:
            return { valid: false, error: `Unknown node type: ${nodeType}` };
    }
}

/**
 * Execute a single node
 */
export async function executeNode(
    node: GraphNode,
    inputs: Record<string, any>,
    context: RuntimeContext
): Promise<NodeExecutionResult> {
    console.log(`[Executor] ===== EXECUTING NODE =====`);
    console.log(`[Executor] Node ID: ${node.id}`);
    console.log(`[Executor] Node Type: "${node.type}"`);
    console.log(`[Executor] Node Type (typeof): ${typeof node.type}`);
    console.log(`[Executor] Node Type (length): ${node.type?.length}`);
    console.log(`[Executor] ============================`);

    const result: NodeExecutionResult = {
        nodeId: node.id,
        state: 'running',
        startedAt: new Date().toISOString(),
    };

    try {
        // Validate inputs
        const validation = validateNodeInputs(node.type, inputs);
        if (!validation.valid) {
            result.state = 'error';
            result.error = validation.error;
            result.completedAt = new Date().toISOString();
            return result;
        }

        // Execute node based on type
        let outputs: Record<string, any>;

        // Normalize node type to lowercase for case-insensitive matching
        const normalizedType = node.type.toLowerCase();

        console.log(`[Executor] About to enter switch with normalizedType: "${normalizedType}"`);

        switch (normalizedType) {
            case 'prompt':
                outputs = await executePromptNode(node, inputs);
                break;
            case 'combinetext':
                outputs = await executeCombineTextNode(node, inputs);
                break;
            case 'referenceimage':
                outputs = await executeReferenceImageNode(node, inputs);
                break;
            case 'imagegen':
                outputs = await executeImageGenNode(node, inputs, context);
                break;
            case 'router':
                outputs = await executeRouterNode(node, inputs);
                break;
            case 'videogen':
                outputs = await executeVideoGenNode(node, inputs, context);
                break;
            case 'directorstyle':
                outputs = await executeDirectorStyleNode(node, inputs);
                break;
            case 'cinematicsetup':
                outputs = await executeCinematicSetupNode(node, inputs);
                break;
            case 'combineimage':
                console.log('[Executor] ✓ Executing CombineImage node');
                outputs = await executeCombineImageNode(node, inputs);
                console.log('[Executor] CombineImage outputs:', outputs);
                break;
            case 'cameramovement':
                console.log('[Executor] ✓ Executing CameraMovement node');
                outputs = await executeCameraMovementNode(node, inputs);
                console.log('[Executor] CameraMovement outputs:', outputs);
                break;
            default:
                console.error(`[Executor] ❌ Unknown node type: ${node.type}`);
                throw new Error(`Unknown node type: ${node.type}`);
        }

        result.state = 'success';
        result.outputs = {
            ...outputs,
            __nodeType: node.type, // Add node type for handle resolution
        };
        result.completedAt = new Date().toISOString();

        console.log(`[Executor] Node ${node.id} completed with state: ${result.state}`);

    } catch (error) {
        result.state = 'error';
        result.error = error instanceof Error ? error.message : String(error);
        result.completedAt = new Date().toISOString();

        console.error(`[Executor] Node ${node.id} failed with error:`, result.error);
    }

    return result;
}

// Node-specific execution functions (stubs - to be implemented)
async function executePromptNode(node: GraphNode, inputs: Record<string, any>) {
    return {
        prompt_text: (node.data as any).text || ''
    };
}

async function executeCombineTextNode(node: GraphNode, inputs: Record<string, any>) {
    const separator = (node.data as any).separator || ', ';
    const combined = inputs.prompt_texts.join(separator);
    return {
        prompt: combined,
        prompt_metadata: { source: 'CombineText' } // Marker for validation
    };
}

async function executeReferenceImageNode(node: GraphNode, inputs: Record<string, any>) {
    // Return stored reference image
    const data = node.data as any;

    // Check for preview_url (new) or imageUrl (legacy)
    const imageUrl = data.preview_url || data.imageUrl;
    const r2Key = data.r2_key || data.r2Key;

    if (!imageUrl) {
        throw new Error('Reference image not uploaded');
    }

    return {
        reference_image: {
            url: imageUrl,
            r2_key: r2Key,
            asset_id: data.asset_id,
        }
    };
}

async function executeCombineImageNode(node: GraphNode, inputs: Record<string, any>) {
    console.log('[CombineImage] ===== STARTING EXECUTION =====');
    console.log('[CombineImage] Inputs received:', JSON.stringify(inputs, null, 2));

    // Collect all connected images
    const images = inputs.images || [];

    if (!Array.isArray(images)) {
        // If single image, convert to array
        const singleImage = images;
        return {
            reference_image: {
                images: [{ ...singleImage, reference_number: 1, reference_label: 'Ref 1' }],
                count: 1,
                labeled: true
            }
        };
    }

    if (images.length === 0) {
        throw new Error('CombineImage requires at least 1 image input');
    }

    if (images.length > 14) {
        throw new Error('CombineImage supports maximum 14 images (Gemini API limit)');
    }

    // Add reference numbers and labels to each image
    const labeledImages = images.map((img: any, index: number) => ({
        ...img,
        reference_number: index + 1,
        reference_label: `Ref ${index + 1}`
    }));

    console.log(`[CombineImage] ✓ Successfully combined ${labeledImages.length} reference images with labels`);
    labeledImages.forEach((img: any) => {
        console.log(`[CombineImage]   - ${img.reference_label}: ${img.url}`);
    });

    return {
        reference_image: {
            images: labeledImages,
            count: labeledImages.length,
            labeled: true
        }
    };
}

async function executeImageGenNode(node: GraphNode, inputs: Record<string, any>, context: RuntimeContext) {
    const data = node.data as any;
    const provider = data.provider || 'gemini';

    console.log(`[ImageGen] Executing with provider: ${provider}`);

    if (provider !== 'gemini') {
        throw new Error(`Unsupported provider: ${provider}. V1 supports gemini only.`);
    }

    // Extract inputs
    // Priority: inputs.prompt (from connected node) > node.data.prompt (standalone mode) > test prompt
    let prompt = inputs.prompt;
    if (!prompt && data.prompt) {
        console.log(`[ImageGen] Using standalone prompt from node.data`);
        prompt = data.prompt;
    }

    // TEST MODE: Use default prompt if none provided
    if (!prompt) {
        console.log(`[ImageGen] No prompt found, using test prompt`);
        prompt = "A serene landscape with mountains and a lake at sunset, photorealistic, 4K";
    }

    const referenceImage = inputs.reference_image; // Optional

    // Handle multiple reference images from CombineImage or single from ReferenceImage
    let referenceImagesBase64: Array<{ data: string, mimeType: string }> = [];

    if (referenceImage?.images && Array.isArray(referenceImage.images)) {
        // Multiple images from CombineImage
        console.log(`[ImageGen] Processing ${referenceImage.images.length} reference images from CombineImage`);

        for (const img of referenceImage.images) {
            try {
                const response = await fetch(img.url);
                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    const base64 = Buffer.from(arrayBuffer).toString('base64');
                    referenceImagesBase64.push({
                        data: base64,
                        mimeType: 'image/png'
                    });
                }
            } catch (err) {
                console.warn('[ImageGen] Failed to download reference image:', err);
            }
        }


        // Add reference labels to prompt if images are labeled (from CombineImage)
        if (referenceImagesBase64.length > 0 && prompt) {
            if (referenceImage.labeled) {
                // Images have reference labels (Ref 1, Ref 2, etc.)
                const referenceLabels = referenceImage.images
                    .map((img: any, i: number) => `Reference Image ${i + 1} (${img.reference_label})`)
                    .join(', ');

                prompt = `Using ${referenceLabels}. ${prompt}`;
                console.log(`[ImageGen] ✓ Added reference labels to prompt: ${referenceLabels}`);
            } else {
                // Legacy: unlabeled multi-image
                prompt = `These subjects, ${prompt}`;
                console.log(`[ImageGen] Enhanced prompt with ${referenceImagesBase64.length} character references`);
            }
        }
    } else if (referenceImage?.url) {
        // Single image from ReferenceImage node (legacy)
        console.log(`[ImageGen] Processing single reference image`);
        try {
            const response = await fetch(referenceImage.url);
            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                const base64 = Buffer.from(arrayBuffer).toString('base64');
                referenceImagesBase64.push({
                    data: base64,
                    mimeType: 'image/png'
                });
            }
        } catch (err) {
            console.warn('[ImageGen] Failed to download reference image:', err);
        }

        // Add demonstrative pronoun for character consistency
        if (referenceImagesBase64.length > 0 && prompt) {
            prompt = `This subject, ${prompt}`;
            console.log(`[ImageGen] Enhanced prompt with character reference`);
        }
    }

    console.log(`[ImageGen] Prompt: ${prompt}`);
    if (referenceImagesBase64.length > 0) {
        console.log(`[ImageGen] Using ${referenceImagesBase64.length} reference image(s)`);
    }

    // Generate image using shared Gemini provider
    const { generateImageWithGemini } = await import('@/lib/generation/image-providers');
    const result = await generateImageWithGemini({
        prompt,
        aspectRatio: data.aspectRatio || '16:9',
        imageSize: data.imageSize || '2K',
        referenceImages: referenceImagesBase64.length > 0 ? referenceImagesBase64 : undefined,
    });

    console.log(`[ImageGen] Image generated successfully`);

    // Upload to R2 using shared storage lib
    const { uploadMedia } = await import('@/lib/storage/media-store');
    const pngBuffer = Buffer.from(result.imageBase64, 'base64');
    const filename = `${node.id}_${Date.now()}.png`;

    const uploadResult = await uploadMedia({
        buffer: pngBuffer,
        filename,
        contentType: 'image/png',
        path: 'director-node/outputs',
    });

    console.log(`[ImageGen] Uploaded to R2: ${uploadResult.url}`);

    // Save to assets table (R2 only)
    const { saveAsset } = await import('./storage');
    const assetId = await saveAsset({
        type: 'image',
        url: uploadResult.url,
        r2_key: uploadResult.key,
        user_id: context.userId,
        project_id: context.projectId,
        metadata: {
            provider: 'gemini',
            prompt,
            aspectRatio: data.aspectRatio || '16:9',
            imageSize: data.imageSize || '2K',
            hasReferenceImage: referenceImagesBase64.length > 0,
            referenceImageCount: referenceImagesBase64.length,
            node_id: node.id,
        },
    });

    console.log(`[ImageGen] Asset saved: ${assetId}`);

    return {
        image_asset: {
            asset_id: assetId,
            url: uploadResult.url,
            r2_key: uploadResult.key,
        },
    };
}

async function executeRouterNode(node: GraphNode, inputs: Record<string, any>) {
    // Router passes through without transformation
    const data = node.data as any;
    const branches = data.branches || 2;
    const outputs: Record<string, any> = {};

    // Create N branches with same input
    for (let i = 0; i < branches; i++) {
        const branchKey = `branch_${String.fromCharCode(65 + i)}`; // A, B, C...
        outputs[branchKey] = inputs.image_asset || inputs.combined_prompt;
    }

    return outputs;
}

// Director Style presets
const DIRECTOR_STYLES: Record<string, string> = {
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

async function executeDirectorStyleNode(node: GraphNode, inputs: Record<string, any>) {
    const data = node.data as any;
    const director = data.director || 'nolan';
    const styleText = DIRECTOR_STYLES[director] || DIRECTOR_STYLES.nolan;

    return {
        text: styleText,
        prompt_text: styleText // Also output as prompt_text for CombineText compatibility
    };
}

async function executeCinematicSetupNode(node: GraphNode, inputs: Record<string, any>) {
    const { buildCinematicPrompt, CINEMATIC_DEFAULTS } = await import('@/lib/cinema/cinematic-setup.config');

    const data = node.data as any;

    const config = {
        camera: data.camera || CINEMATIC_DEFAULTS.camera,
        lens: data.lens || CINEMATIC_DEFAULTS.lens,
        focal: data.focal || CINEMATIC_DEFAULTS.focal,
        aperture: data.aperture || CINEMATIC_DEFAULTS.aperture,
        quality: data.quality || CINEMATIC_DEFAULTS.quality,
        aspectRatio: data.aspectRatio || CINEMATIC_DEFAULTS.aspectRatio,
    };

    const setupText = buildCinematicPrompt(config);

    return {
        text: setupText,
        prompt_text: setupText // CombineText compatibility
    };
}

async function executeCameraMovementNode(node: GraphNode, inputs: Record<string, any>) {
    const { MOVEMENT_PROMPTS, MOVEMENT_DEFAULTS } = await import('@/lib/cinema/cinematic-movements.config');

    const data = node.data as any;
    const movement = data.movement || MOVEMENT_DEFAULTS.movement;
    const movementText = MOVEMENT_PROMPTS[movement as keyof typeof MOVEMENT_PROMPTS] || 'Static shot, no camera movement, locked frame, stable composition';

    return {
        prompt_text: movementText
    };
}

async function executeVideoGenNode(node: GraphNode, inputs: Record<string, any>, context: RuntimeContext) {
    const { VIDEO_PROVIDER_CONFIGS, isValidCombination, getProviderDefaults } = await import('@/lib/video/video-providers.config');

    const data = node.data as any;
    const provider = data.provider || 'minimax';

    // Get defaults for provider
    const defaults = getProviderDefaults(provider);
    const resolution = data.resolution || defaults.resolution;
    const duration = data.duration || defaults.duration;

    console.log(`[VideoGen] Executing with provider: ${provider}, resolution: ${resolution}, duration: ${duration}s (async mode)`);

    // Validate provider
    if (provider !== 'minimax' && provider !== 'veo') {
        throw new Error(`Unsupported provider: ${provider}. Supported: minimax, veo`);
    }

    // Validate resolution/duration combination
    if (!isValidCombination(provider, resolution, duration)) {
        const config = VIDEO_PROVIDER_CONFIGS[provider];
        const resConfig = config.resolutions.find(r => r.resolution === resolution);
        const validDurations = resConfig?.durations || [];
        throw new Error(
            `Invalid combination for ${config.label}: ${resolution} does not support ${duration}s. ` +
            `Valid durations for ${resolution}: ${validDurations.join(', ')}s`
        );
    }

    // Extract reference image (REQUIRED)
    // VideoGen receives 'image' from ImageGen node
    const referenceImage = inputs.image || inputs.reference_image;
    if (!referenceImage?.url) {
        throw new Error('VideoGen requires image input (keyframe from ImageGen)');
    }

    console.log(`[VideoGen] ✓ Validation passed - ${provider} ${resolution} ${duration}s`);
    console.log(`[VideoGen] Keyframe: ${referenceImage.url}`);

    // ASYNC PATTERN: Create placeholder asset and return immediately
    // Background worker will handle actual generation

    const { saveAsset } = await import('./storage');
    const placeholderAssetId = await saveAsset({
        type: 'video',
        url: '', // Will be populated by worker
        r2_key: '', // Will be populated by worker
        user_id: context.userId,
        project_id: context.projectId,
        status: 'generating', // Placeholder status
        metadata: {
            provider: 'minimax',
            keyframe: referenceImage.url,
            prompt: data.prompt || 'Generate video from keyframe',
            duration: data.duration || 6,
            model: data.model || 'MiniMax-Hailuo-2.3',
            node_id: node.id,
            run_id: context.runId,
        },
    });

    console.log(`[VideoGen] Placeholder asset created: ${placeholderAssetId}`);

    // Enqueue background job by updating run metadata
    // Worker will pick this up and process it
    const { supabaseServiceRole } = await import('@/lib/supabase/server');
    const admin = supabaseServiceRole();

    await admin
        .from('director_node_runs')
        .update({
            status: 'processing',
            node_results: {
                video_generation: {
                    asset_id: placeholderAssetId,
                    keyframe_url: referenceImage.url,
                    prompt: data.prompt || 'Generate video from keyframe',
                    duration: data.duration || 6,
                    model: data.model || 'MiniMax-Hailuo-2.3',
                }
            }
        })
        .eq('id', context.runId);

    console.log(`[VideoGen] Background job enqueued for run ${context.runId}`);

    // Return placeholder immediately
    // Worker will update asset when generation completes
    return {
        video_asset: {
            asset_id: placeholderAssetId,
            url: null, // Will be populated by worker
            r2_key: null,
            status: 'generating',
        },
    };
}

