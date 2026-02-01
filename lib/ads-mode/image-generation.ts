/**
 * PHASE 10 — REAL IMAGE GENERATION MODULE
 * 
 * Connects validated 4-shot planning to real Gemini image generation
 * Handles upload to Supabase Storage
 * 
 * CRITICAL RULES:
 * - NO constraint bypass in retry logic
 * - Structured logging for every attempt
 * - Fail-fast on violations
 */

import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Gemini AI (lazy)
let genAI: GoogleGenAI | null = null;
function getGenAI() {
    if (!genAI) {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY environment variable is required');
        }
        genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return genAI;
}

// Initialize Supabase client (lazy, server-side)
let supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
    if (!supabase) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!url || !key) {
            throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
        }

        supabase = createClient(url, key);
    }
    return supabase;
}

// Storage bucket name
const STORAGE_BUCKET = 'ads-images';

// Log directory
const LOG_DIR = path.join(process.cwd(), 'test-logs', 'phase10');

/**
 * Ensure log directory exists
 */
function ensureLogDir() {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }
}

/**
 * Log a generation attempt to JSONL file
 */
export function logGenerationAttempt(params: {
    runId: string;
    shotId: string;
    attempt: number;
    role: string;
    context: string;
    status: 'SUCCESS' | 'FAILED' | 'RETRY';
    error?: string;
    url?: string;
}) {
    ensureLogDir();

    const logEntry = {
        timestamp: new Date().toISOString(),
        ...params
    };

    const logFile = path.join(LOG_DIR, `${params.runId}.jsonl`);
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
}

/**
 * Generate image from prompt using Gemini 2.5 Flash
 * Returns base64 image data
 */
export async function generateImageFromPrompt(params: {
    prompt: string;
    runId: string;
    shotId: string;
}): Promise<{ imageBuffer: Buffer; modelMeta: any }> {
    const { prompt, runId, shotId } = params;

    try {
        console.log(`[ImageGen] Generating image for ${shotId}...`);

        // Use Gemini 2.5 Flash Image (native image generation)
        const ai = getGenAI();

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: prompt
        });

        // Extract image from response
        const candidates = response.candidates;
        if (!candidates || candidates.length === 0) {
            throw new Error('No candidates returned from Gemini API');
        }

        const candidate = candidates[0];
        if (!candidate || !candidate.content || !candidate.content.parts) {
            throw new Error('Invalid response structure from Gemini API');
        }

        const parts = candidate.content.parts;

        // Find image part
        let imageBuffer: Buffer | null = null;
        let mimeType = 'image/png';

        for (const part of parts) {
            if (part.text) {
                console.log(`[ImageGen] Model response text: ${part.text}`);
            } else if (part.inlineData && part.inlineData.data) {
                // Found image data
                const base64Data = part.inlineData.data;
                imageBuffer = Buffer.from(base64Data, 'base64');
                mimeType = part.inlineData.mimeType || 'image/png';
                break;
            }
        }

        if (!imageBuffer) {
            throw new Error('No image data found in response. Gemini 2.5 Flash Image may not have generated an image.');
        }

        console.log(`[ImageGen] ✓ Image generated (${imageBuffer.length} bytes)`);

        return {
            imageBuffer,
            modelMeta: {
                model: 'gemini-2.5-flash-image',
                mimeType,
                size: imageBuffer.length
            }
        };

    } catch (error: any) {
        console.error(`[ImageGen] Error generating image: ${error.message}`);
        throw error;
    }
}

/**
 * Upload generated image using media-store abstraction
 * Returns public URL and provider info
 * 
 * PHASE 11.5: Now uses media-store for provider-agnostic upload
 */
export async function uploadGeneratedImage(params: {
    buffer: Buffer;
    storagePath: string;
}): Promise<{ publicUrl: string; provider: string; key: string }> {
    const { buffer, storagePath } = params;

    try {
        console.log(`[Storage] Uploading to ${storagePath}...`);

        // Use media-store abstraction (supports R2/Supabase)
        const { uploadMedia } = await import('@/lib/storage/media-store');

        // Extract path components
        const pathParts = storagePath.split('/');
        const filename = pathParts.pop() || 'image.png';
        const path = pathParts.join('/');

        const result = await uploadMedia({
            buffer,
            filename,
            contentType: 'image/png',
            path
        });

        console.log(`[Storage] ✓ Uploaded to ${result.provider}: ${result.url}`);

        return {
            publicUrl: result.url,
            provider: result.provider,
            key: result.key
        };

    } catch (error: any) {
        console.error(`[Storage] Error uploading: ${error.message}`);
        throw error;
    }
}

/**
 * Generate and upload a single shot
 * Orchestrates: prompt → generate → upload → log
 * 
 * PHASE 11.5: Now returns provider and key for DB tracking
 */
export async function generateAndUploadShot(params: {
    prompt: string;
    runId: string;
    shotId: string;
    productId: string;
    role: string;
    context: string;
    attempt: number;
}): Promise<{ url: string; provider: string; key: string; meta: any }> {
    const { prompt, runId, shotId, productId, role, context, attempt } = params;

    try {
        // Log attempt start
        logGenerationAttempt({
            runId,
            shotId,
            attempt,
            role,
            context,
            status: 'RETRY'
        });

        // Generate image
        const { imageBuffer, modelMeta } = await generateImageFromPrompt({
            prompt,
            runId,
            shotId
        });

        // Upload to storage (via media-store)
        const storagePath = `${productId}/${runId}/${shotId}.png`;
        const { publicUrl, provider, key } = await uploadGeneratedImage({
            buffer: imageBuffer,
            storagePath
        });

        // Log success
        logGenerationAttempt({
            runId,
            shotId,
            attempt,
            role,
            context,
            status: 'SUCCESS',
            url: publicUrl
        });

        console.log(`[Shot] ✓ ${shotId} generated and uploaded`);

        return {
            url: publicUrl,
            provider,
            key,
            meta: modelMeta
        };

    } catch (error: any) {
        // Log failure
        logGenerationAttempt({
            runId,
            shotId,
            attempt,
            role,
            context,
            status: 'FAILED',
            error: error.message
        });

        console.error(`[Shot] ✗ ${shotId} failed: ${error.message}`);
        throw error;
    }
}

/**
 * Ensure storage bucket exists
 * Call this once during setup
 */
export async function ensureStorageBucket() {
    try {
        const { data: buckets, error } = await getSupabase().storage.listBuckets();

        if (error) {
            throw error;
        }

        const bucketExists = buckets?.some(b => b.name === STORAGE_BUCKET);

        if (!bucketExists) {
            console.log(`[Storage] Creating bucket: ${STORAGE_BUCKET}`);

            const { error: createError } = await getSupabase().storage.createBucket(STORAGE_BUCKET, {
                public: true,
                fileSizeLimit: 10485760 // 10MB
            });

            if (createError) {
                throw createError;
            }

            console.log(`[Storage] ✓ Bucket created: ${STORAGE_BUCKET}`);
        } else {
            console.log(`[Storage] ✓ Bucket exists: ${STORAGE_BUCKET}`);
        }

    } catch (error: any) {
        console.error(`[Storage] Error ensuring bucket: ${error.message}`);
        throw error;
    }
}
