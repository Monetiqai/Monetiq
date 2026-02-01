/**
 * Shared Image Generation Providers
 * Extracted from Director Mode for reuse across the platform
 */

export interface ImageGenerationParams {
    prompt: string;
    aspectRatio?: '16:9' | '21:9' | '1:1';
    imageSize?: '1K' | '2K' | '4K';
    referenceImageBase64?: string; // Legacy: single image
    referenceMimeType?: string;
    referenceImages?: Array<{ data: string, mimeType: string }>; // NEW: Multiple images from CombineImage
}

export interface ImageGenerationResult {
    imageBase64: string;
    mimeType: string;
}

/**
 * Generate image using Gemini (Banana Pro)
 * Extracted from /app/api/generate/images/director-mode/route.ts
 */
export async function generateImageWithGemini(
    params: ImageGenerationParams
): Promise<ImageGenerationResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY not configured');
    }

    const MODEL_ID = 'gemini-3-pro-image-preview';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent`;

    const parts: any[] = [{ text: params.prompt }];

    // Add reference images (supports up to 14 images per Gemini API)
    if (params.referenceImages && params.referenceImages.length > 0) {
        // Multiple images from CombineImage
        console.log(`[Gemini] Adding ${params.referenceImages.length} reference images`);
        for (const img of params.referenceImages) {
            parts.push({
                inlineData: {
                    mimeType: img.mimeType,
                    data: img.data,
                },
            });
        }
    } else if (params.referenceImageBase64 && params.referenceMimeType) {
        // Legacy: single image
        console.log(`[Gemini] Adding single reference image (legacy)`);
        parts.push({
            inlineData: {
                mimeType: params.referenceMimeType,
                data: params.referenceImageBase64,
            },
        });
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
            contents: [{
                role: 'user',
                parts,
            }],
            generationConfig: {
                temperature: 0, // Reduce identity drift for character consistency
                responseModalities: ['TEXT', 'IMAGE'], // CRITICAL: Enable character consistency
                imageConfig: {
                    aspectRatio: params.aspectRatio || '16:9',
                    imageSize: params.imageSize || '2K',
                },
            },
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const json = await response.json();

    // Log full response for debugging
    console.log('[Gemini] API Response:', JSON.stringify(json, null, 2));

    // Check for finish reason
    const candidate = json?.candidates?.[0];
    if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
        console.error('[Gemini] Generation failed:', {
            finishReason: candidate.finishReason,
            finishMessage: candidate.finishMessage,
            prompt: params.prompt.substring(0, 200) + '...',
            hasReferenceImage: !!params.referenceImageBase64
        });
    }

    const parts_response = json?.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts_response.find((p: any) => p?.inlineData?.data);

    if (!imgPart?.inlineData?.data) {
        console.error('❌ No image in Gemini response. Full JSON:', json);
        console.error('[Gemini] Prompt used:', params.prompt);
        console.error('[Gemini] Config:', {
            aspectRatio: params.aspectRatio || '16:9',
            imageSize: params.imageSize || '2K',
            hasReference: !!params.referenceImageBase64
        });
        throw new Error('No image returned by Gemini API');
    }

    return {
        imageBase64: imgPart.inlineData.data,
        mimeType: 'image/png',
    };
}
