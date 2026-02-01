import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { uploadMedia } from "@/lib/storage/media-store";

// Banana Pro (Gemini 3 Pro Image Preview)
const MODEL_ID = "gemini-3-pro-image-preview";
const GEN_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent`;

async function generateImageWithBananaPro(params: {
    apiKey: string;
    prompt: string;
    aspectRatio: string;
    imageSize: "1K" | "2K" | "4K";
    referenceImageBase64?: string;
    referenceMimeType?: string;
}) {
    const parts: any[] = [{ text: params.prompt }];

    // Add reference image if provided
    if (params.referenceImageBase64 && params.referenceMimeType) {
        parts.push({
            inlineData: {
                mimeType: params.referenceMimeType,
                data: params.referenceImageBase64,
            },
        });
    }

    const res = await fetch(GEN_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": params.apiKey,
        },
        body: JSON.stringify({
            contents: [
                {
                    role: "user",
                    parts,
                },
            ],
            generationConfig: {
                imageConfig: {
                    aspectRatio: params.aspectRatio,
                    imageSize: params.imageSize,
                },
            },
        }),
    });

    const text = await res.text();
    if (!res.ok) {
        throw new Error(`Banana Pro error ${res.status}: ${text}`);
    }

    const json = JSON.parse(text);
    console.log("🔍 Banana Pro Response:", JSON.stringify(json, null, 2));

    const parts_response = json?.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts_response.find((p: any) => p?.inlineData?.data);

    if (!imgPart?.inlineData?.data) {
        console.error("❌ No image in response. Full JSON:", json);
        throw new Error("No image returned by Banana Pro");
    }

    return imgPart.inlineData.data as string; // base64
}

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!apiKey) return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
        if (!url) return NextResponse.json({ error: "Missing NEXT_PUBLIC_SUPABASE_URL" }, { status: 500 });
        if (!serviceKey) return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

        const supa = await supabaseServer();
        const {
            data: { user },
            error: userErr,
        } = await supa.auth.getUser();

        if (userErr) return NextResponse.json({ error: userErr.message }, { status: 401 });
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json().catch(() => ({}));
        const { prompt, ratio, quality, batchSize, meta, referenceImage, projectId: providedProjectId } = body;

        if (!prompt) {
            return NextResponse.json({ error: "prompt missing" }, { status: 400 });
        }

        const admin = createClient(url, serviceKey);

        // Helper: Generate session name
        function generateSessionName(meta: any): string {
            const timestamp = new Date().toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });

            if (meta.storyboard_mode === 'narrative' && meta.scene_intents) {
                const sceneCount = meta.scene_intents.length;
                const templateName = getTemplateName(meta.template_id);
                return `Director Mode - ${templateName} (${sceneCount} scenes) - ${timestamp}`;
            }

            return `Director Mode - Single Shot - ${timestamp}`;
        }

        // Helper: Get template display name
        function getTemplateName(templateId: string | null): string {
            const templates: Record<string, string> = {
                'ad_15s': '15s Ad',
                'trailer_30s': '30s Trailer',
                'social_60s': '60s Social',
                'custom': 'Custom',
            };
            return templates[templateId || ''] || 'Single Shot';
        }

        // Use provided projectId or create a NEW project for the session
        let finalProjectId: string;

        if (providedProjectId) {
            // Validate that the provided project belongs to the user
            const { data: existingProject, error: validateErr } = await admin
                .from("projects")
                .select("id")
                .eq("id", providedProjectId)
                .eq("user_id", user.id)
                .single();

            if (validateErr || !existingProject) {
                return NextResponse.json({ error: "Invalid project or unauthorized" }, { status: 400 });
            }

            finalProjectId = providedProjectId;
        } else {
            // Fallback: Create a new project (backward compatible behavior)
            const sessionName = generateSessionName(meta);
            const sessionMetadata = {
                session_type: meta.storyboard_mode === 'narrative' ? 'storyboard' : 'single_shot',
                template_id: meta.template_id || null,
                scene_count: meta.scene_intents?.length || batchSize,
                scene_intents: meta.scene_intents || null,
                director_style: meta.director || null,
                camera: meta.camera || null,
                quality: quality || '2K',
                generated_at: new Date().toISOString(),

                // Store global prompt for storyboard mode (eliminates per-asset duplication)
                ...(meta.storyboard_mode === 'narrative' && {
                    global_prompt: {
                        scene_description: meta.scenePrompt || '',
                        cinema_settings: `Cinema: ${ratio || '21:9'}, ${meta.director || 'Default'}, ${meta.camera || 'Default'}`,
                        director_style: meta.director || null,
                        full_prompt: typeof prompt === 'string' ? prompt : (Array.isArray(prompt) && prompt.length > 0 ? prompt[0] : ''),
                    }
                })
            };

            const { data: newProject, error: projectErr } = await admin
                .from("projects")
                .insert({
                    user_id: user.id,
                    product_name: sessionName,
                    template_id: meta.template_id || null,
                    style: "cinematic",
                    goal: meta.scenePrompt || "Director Mode session",
                    status: "images",
                    meta: sessionMetadata,
                })
                .select("id")
                .single();

            if (projectErr) {
                return NextResponse.json({ error: projectErr.message }, { status: 400 });
            }

            finalProjectId = newProject.id;
        }

        const projectId = finalProjectId;

        // Create assets with "generating" status
        const rows = Array.from({ length: batchSize || 4 }).map((_, index) => ({
            user_id: user.id,
            project_id: projectId,
            kind: "image",
            role: "hero",
            status: "generating",
            storage_bucket: "assets",
            storage_path: null,
            mime_type: null,
            meta: {
                // For storyboard mode: store scene-specific data only (no prompt duplication)
                ...(meta.storyboard_mode === 'narrative' ? {
                    scene_index: index,
                    scene_intent: meta.scene_intents?.[index] || `Scene ${index + 1}`,
                } : {
                    // For single-shot mode: keep full prompt (backward compatible)
                    prompt: prompt,
                }),

                ratio: ratio || "21:9",
                quality: quality || "2K",
                director: meta.director || null,
                camera: meta.camera || null,
                lens: meta.lens || null,
                focal: meta.focal || null,
                aperture: meta.aperture || null,
                storyboard_mode: meta.storyboard_mode || null,
                source: "director_mode_v1",
                isDirectorMode: true,
            },
        }));

        const { data: inserted, error: insErr } = await admin
            .from("assets")
            .insert(rows)
            .select("id");

        if (insErr) {
            return NextResponse.json({ error: insErr.message }, { status: 400 });
        }

        const assetIds = inserted?.map((x) => x.id) ?? [];

        // Generate images asynchronously
        generateImagesAsync(admin, apiKey, assetIds, prompt, ratio || "21:9", quality || "2K", projectId, referenceImage, meta).catch(console.error);

        return NextResponse.json({ ok: true, assetIds });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
    }
}

async function generateImagesAsync(
    admin: any,
    apiKey: string,
    assetIds: string[],
    prompt: string | string[],
    ratio: string,
    quality: string,
    projectId: string,
    referenceImageUrl?: string,
    cinemaMetadata?: any
) {
    const imageSize = quality === "2K" || quality === "4K" ? quality : "1K";
    const aspectRatio = ratio === "21:9" ? "21:9" : "16:9";

    // Download reference image if provided
    let referenceImageBase64: string | undefined;
    let referenceMimeType: string | undefined;

    if (referenceImageUrl) {
        try {
            // Try to fetch from R2 public URL first, fallback to Supabase download
            if (referenceImageUrl.startsWith('http')) {
                const response = await fetch(referenceImageUrl);
                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    const refBuffer = Buffer.from(arrayBuffer);
                    referenceImageBase64 = refBuffer.toString("base64");
                    referenceMimeType = referenceImageUrl.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
                }
            } else {
                // Legacy: Download from Supabase Storage
                const pathMatch = referenceImageUrl.match(/director-mode\/[^?]+/);
                const storagePath = pathMatch ? pathMatch[0] : referenceImageUrl;
                const { data: downloaded, error: dlErr } = await admin.storage.from("assets").download(storagePath);
                if (!dlErr && downloaded) {
                    const arrayBuffer = await downloaded.arrayBuffer();
                    const refBuffer = Buffer.from(arrayBuffer);
                    referenceImageBase64 = refBuffer.toString("base64");
                    referenceMimeType = storagePath.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
                }
            }
        } catch (err) {
            console.warn("Failed to download reference image:", err);
        }
    }

    // Support both single prompt and array of prompts (for storyboard mode)
    const prompts = Array.isArray(prompt) ? prompt : Array(assetIds.length).fill(prompt);

    for (let i = 0; i < assetIds.length; i++) {
        const assetId = assetIds[i];
        const promptForAsset = prompts[i] || prompts[0]; // Fallback to first prompt

        try {
            // Generate image with Banana Pro
            const imageBase64 = await generateImageWithBananaPro({
                apiKey,
                prompt: promptForAsset,
                aspectRatio,
                imageSize,
                referenceImageBase64,
                referenceMimeType,
            });

            const pngBuffer = Buffer.from(imageBase64, "base64");
            const filename = `${assetId}.png`;
            const thumbnailFilename = `${assetId}_thumb.png`;

            // Generate thumbnail (400px wide) using sharp
            const sharp = require("sharp");
            const thumbnailBuffer = await sharp(pngBuffer)
                .resize(400, null, { withoutEnlargement: true })
                .png({ quality: 80 })
                .toBuffer();

            // Upload full-res image to R2 via media-store
            const uploadResult = await uploadMedia({
                buffer: pngBuffer,
                filename,
                contentType: "image/png",
                path: "director-mode/outputs"
            });

            // Upload thumbnail to R2
            const thumbnailResult = await uploadMedia({
                buffer: thumbnailBuffer,
                filename: thumbnailFilename,
                contentType: "image/png",
                path: "director-mode/outputs"
            });

            // Update asset to ready with R2 tracking
            const { error: updErr } = await admin
                .from("assets")
                .update({
                    status: "ready",
                    origin_provider: uploadResult.provider, // 'r2' or 'supabase'
                    r2_bucket: uploadResult.provider === 'r2' ? process.env.R2_BUCKET : null,
                    r2_key: uploadResult.provider === 'r2' ? uploadResult.key : null,
                    public_url: uploadResult.url, // R2 public URL
                    storage_bucket: null, // Legacy field
                    storage_path: null,   // Legacy field
                    mime_type: "image/png",
                    byte_size: pngBuffer.length,
                    meta: {
                        // For storyboard mode: keep scene-specific data only (no prompt duplication)
                        ...(cinemaMetadata?.storyboard_mode === 'narrative' ? {
                            scene_index: i,
                            scene_intent: cinemaMetadata?.scene_intents?.[i] || `Scene ${i + 1}`,
                        } : {
                            // For single-shot mode: keep full prompt (backward compatible)
                            prompt: promptForAsset,
                        }),

                        ratio,
                        quality,
                        model: `models/${MODEL_ID}`,
                        source: "director_mode_v1",
                        isDirectorMode: true,
                        hasReferenceImage: !!referenceImageBase64,
                        director: cinemaMetadata?.director || null,
                        camera: cinemaMetadata?.camera || null,
                        lens: cinemaMetadata?.lens || null,
                        focal: cinemaMetadata?.focal || null,
                        aperture: cinemaMetadata?.aperture || null,
                        storyboard_mode: cinemaMetadata?.storyboard_mode || null,
                        thumbnail_url: thumbnailResult.url, // R2 thumbnail URL
                    },
                })
                .eq("id", assetId);

            if (updErr) throw updErr;

            // Dual-write: Update asset with category for Asset Library
            try {
                await admin
                    .from('assets')
                    .update({ category: 'director_mode' })
                    .eq('id', assetId);

                console.log(`[Asset Library] ✓ Marked asset ${assetId} as director_mode`);
            } catch (libraryErr) {
                console.warn(`⚠️ Failed to set category for ${assetId}:`, libraryErr);
            }

            console.log(`✅ Generated image for asset ${assetId}, R2 URL: ${uploadResult.url}`);
        } catch (error: any) {
            console.error(`❌ Failed to generate image for asset ${assetId}: `, error);

            await admin
                .from("assets")
                .update({
                    status: "failed",
                    meta: {
                        // For storyboard mode: keep scene-specific data only
                        ...(cinemaMetadata?.storyboard_mode === 'narrative' ? {
                            scene_index: i,
                            scene_intent: cinemaMetadata?.scene_intents?.[i] || `Scene ${i + 1}`,
                        } : {
                            // For single-shot mode: keep full prompt
                            prompt: promptForAsset,
                        }),

                        ratio,
                        quality,
                        error: error.message,
                        source: "director_mode_v1",
                        isDirectorMode: true,
                        director: cinemaMetadata?.director || null,
                        camera: cinemaMetadata?.camera || null,
                        storyboard_mode: cinemaMetadata?.storyboard_mode || null,
                    },
                })
                .eq("id", assetId);
        }
    }
}
