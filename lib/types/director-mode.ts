// Multi-Scene Director Mode Type Definitions
// These types support the optional multi-scene workflow extension

/**
 * Scene abstraction (lightweight orchestration object)
 * Used only when templates are selected, invisible otherwise
 */
export interface Scene {
  id: string;
  projectId: string;
  index: number; // 0-based scene order
  intent: string; // Short description (e.g., "Opening shot")
  recommendedDuration: 6 | 10;
  recommendedMovement: string; // Camera movement ID
  anchorAssetId?: string; // Selected frame for this scene
  status: 'pending' | 'ready' | 'generating' | 'failed';
  createdAt: string;
}

/**
 * Template definition for pre-configured multi-scene workflows
 */
export interface Template {
  id: string;
  name: string;
  description: string;
  totalDuration: number; // seconds
  sceneCount: number;
  scenes: TemplateScene[];
}

/**
 * Individual scene configuration within a template
 */
export interface TemplateScene {
  intent: string;
  duration: 6 | 10;
  movement: string; // Camera movement ID (e.g., "dolly_in", "static")
}

/**
 * Render job for queue management
 * Tracks video generation status for individual scenes
 */
export interface RenderJob {
  id: string;
  sceneId: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  progress?: number;
  error?: string;
  videoAssetId?: string; // Asset ID of generated video
}
