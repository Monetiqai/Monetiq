/**
 * Director Node V1 - Node Contracts
 * Strict I/O definitions per node type
 */

// Input/Output Types
export type PromptText = string;
export type CombinedPrompt = string;
export type ReferenceImage = {
    url: string;
    r2Key: string;
    width: number;
    height: number;
};
export type ImageAsset = {
    url: string;
    r2Key: string;
    width: number;
    height: number;
    assetId: string; // FK to assets table
};
export type VideoAsset = {
    url: string;
    r2Key: string;
    duration: number;
    fps: number;
    assetId: string; // FK to assets table
};

// Node Input Contracts
export interface PromptNodeInputs {
    // No inputs
}

export interface CombineTextNodeInputs {
    prompt_texts: PromptText[]; // 1..N
}

export interface ReferenceImageNodeInputs {
    // No inputs
}

export interface ImageGenNodeInputs {
    combined_prompt: CombinedPrompt; // REQUIRED
    reference_image?: ReferenceImage; // OPTIONAL
}

export interface RouterNodeInputs {
    image_asset: ImageAsset; // PRIMARY
    combined_prompt?: CombinedPrompt; // ALLOWED SECONDARY
}

export interface VideoGenNodeInputs {
    reference_image: ReferenceImage; // REQUIRED (keyframe)
    prompt_text?: PromptText; // OPTIONAL
    negative_prompt_text?: PromptText; // OPTIONAL (provider-aware)
}

// Node Output Contracts
export interface PromptNodeOutputs {
    prompt_text: PromptText;
}

export interface CombineTextNodeOutputs {
    combined_prompt: CombinedPrompt;
}

export interface ReferenceImageNodeOutputs {
    reference_image: ReferenceImage;
}

export interface ImageGenNodeOutputs {
    image_asset: ImageAsset;
}

export interface RouterNodeOutputs {
    // Dynamic branches (branch_A, branch_B, etc.)
    // Output is the same as input (no transformation)
    [key: `branch_${string}`]: ImageAsset | CombinedPrompt;
}

export interface VideoGenNodeOutputs {
    video_asset: VideoAsset;
}

export interface CameraMovementNodeInputs {
    // No inputs - reads from node.data.movement
}

export interface CameraMovementNodeOutputs {
    prompt_text: PromptText;
}

// Node Contract Map
export interface NodeContracts {
    prompt: {
        inputs: PromptNodeInputs;
        outputs: PromptNodeOutputs;
    };
    combineText: {
        inputs: CombineTextNodeInputs;
        outputs: CombineTextNodeOutputs;
    };
    referenceImage: {
        inputs: ReferenceImageNodeInputs;
        outputs: ReferenceImageNodeOutputs;
    };
    imageGen: {
        inputs: ImageGenNodeInputs;
        outputs: ImageGenNodeOutputs;
    };
    router: {
        inputs: RouterNodeInputs;
        outputs: RouterNodeOutputs;
    };
    videoGen: {
        inputs: VideoGenNodeInputs;
        outputs: VideoGenNodeOutputs;
    };
    cameraMovement: {
        inputs: CameraMovementNodeInputs;
        outputs: CameraMovementNodeOutputs;
    };
}

// Validation Rules
export const VALIDATION_RULES = {
    // Prompt → Image direct is FORBIDDEN
    forbiddenEdges: [
        { source: 'prompt', target: 'imageGen' }
    ],
    // Prompt → Combine → Image is REQUIRED
    requiredPath: ['prompt', 'combineText', 'imageGen'],
    // Image is pivot
    imagePivot: true,
    // Video always derived from image
    videoRequiresImage: true,
    // Router never transforms
    routerPassthrough: true,
} as const;
