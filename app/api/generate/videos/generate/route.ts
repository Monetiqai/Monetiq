import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { GoogleGenAI } from "@google/genai";
import { unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { uploadMedia } from "@/lib/storage/media-store";

const VEO_MODEL = "veo-3.1-generate-preview";

function buildLockedPrompt(params: {
    productName: string;
    style?: string;
    goal?: string;
    userPrompt?: string;
}) {
    const name = params.productName || "product";
    const style = params.style || "Premium Luxury";
    const goal = params.goal || "Conversion";
    const user = (params.userPrompt || "").trim();

    return `
ANIMATE THIS EXACT REFERENCE IMAGE INTO A SHORT VIDEO.

IDENTITY LOCK (CRITICAL):
- The product in the video must remain identical to the reference image.
- Do NOT transform it into another product (no watch, no candle, no random item).
- Keep the same colors, shape, logo, material texture.
- Only add camera motion + subtle lighting/fabric movement.
- No text overlay, no watermark.

Context:
Product: "${name}"
Style: ${style}
Goal: ${goal}

User instructions (must follow strictly):
${user || "Make it realistic, premium e-commerce look."}

Duration: 6 seconds.
`.trim();
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
        const { data: { user }, error: userErr } = await supa.auth.getUser();
        if (userErr) return NextResponse.json({ error: userErr.message }, { status: 401 });
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json().catch(() => ({}));
        const projectId = body?.projectId as string | undefined;
        const startImageAssetId = body?.startImageAssetId as string | undefined;
        const userPrompt = body?.prompt as string | undefined;
        const ratio = (body?.ratio as string | undefined) ?? "9:16";
        const durationSeconds = Number(body?.durationSeconds ?? 6);
        const quality = (body?.quality as string | undefined) ?? "720p";

        if (!projectId) return NextResponse.json({ error: "projectId missing" }, { status: 400 });
        if (!startImageAssetId) return NextResponse.json({ error: "startImageAssetId missing" }, { status: 400 });

        const admin = createClient(url, serviceKey);

        // Load project
        const { data: project, error: pErr } = await admin
            .from("projects")
            .select("id, product_name, style, goal")
            .eq("id", projectId)
            .single();

        if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });

        // Load start image
        const { data: startImg, error: sErr } = await admin
            .from("assets")
            .select("id, storage_bucket, storage_path, public_url, r2_key, origin_provider, status")
            .eq("id", startImageAssetId)
            .eq("project_id", projectId)
            .eq("kind", "image")
            .single();

        if (sErr) return NextResponse.json({ error: sErr.message }, { status: 400 });

        if (startImg.status !== "ready") {
            return NextResponse.json({ error: "Selected start image is not ready" }, { status: 400 });
        }
        // Check for R2 public_url or legacy storage_path
        if (!startImg.public_url && !startImg.storage_path) {
            return NextResponse.json({ error: "Selected start image has no public_url or storage_path" }, { status: 400 });
        }

        // Create asset with status "queued"
        const { data: newAsset, error: createErr } = await admin
            .from("assets")
            .insert({
                user_id: user.id,
                project_id: projectId,
                kind: "video",
                role: "video_1",
                status: "queued",
                meta: {
                    source: "video_tool_v2",
                    startImageAssetId,
                    prompt: userPrompt,
                    ratio,
                    durationSeconds,
                    quality,
                },
            })
            .select("id")
            .single();

        if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 });

        const assetId = newAsset.id;

        // Trigger generation asynchronously (don't wait)
        generateVideoAsync({
            assetId,
            projectId,
            startImageAssetId,
            startImg,
            project,
            userPrompt,
            ratio,
            durationSeconds,
            quality,
            apiKey,
            admin,
        }).catch((err) => {
            console.error(`[Generate] Async error for asset ${assetId}:`, err);
        });

        return NextResponse.json({ ok: true, assetId, status: "queued" });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
    }
}

// Async generation function
async function generateVideoAsync(params: {
    assetId: string;
    projectId: string;
    startImageAssetId: string;
    startImg: any;
    project: any;
    userPrompt?: string;
    ratio: string;
    durationSeconds: number;
    quality: string;
    apiKey: string;
    admin: any;
}) {
    const {
        assetId,
        projectId,
        startImageAssetId,
        startImg,
        project,
        userPrompt,
        ratio,
        durationSeconds,
        quality,
        apiKey,
        admin,
    } = params;

    try {
        // Update status to "generating"
        await admin
            .from("assets")
            .update({ status: "generating" })
            .eq("id", assetId);

        console.log(`[Generate] Starting generation for asset ${assetId}`);

        // Download start image (support R2 public URL or legacy Supabase Storage)
        let startImageBase64: string;

        if (startImg.public_url) {
            // New: Fetch from R2 public URL
            const response = await fetch(startImg.public_url);
            if (!response.ok) {
                throw new Error(`Cannot download start image from R2: ${response.statusText}`);
            }
            const arr = await response.arrayBuffer();
            startImageBase64 = Buffer.from(arr).toString("base64");
        } else {
            // Legacy: Download from Supabase Storage
            const { data: blob, error: dlErr } = await admin.storage
                .from(startImg.storage_bucket || "assets")
                .download(startImg.storage_path);

            if (dlErr || !blob) {
                throw new Error(`Cannot download start image: ${dlErr?.message ?? "unknown"}`);
            }

            const arr = await blob.arrayBuffer();
            startImageBase64 = Buffer.from(arr).toString("base64");
        }

        const lockedPrompt = buildLockedPrompt({
            productName: project.product_name,
            style: project.style,
            goal: project.goal,
            userPrompt,
        });

        // Initialize Gemini AI SDK
        const ai = new GoogleGenAI({ apiKey });

        let op = await ai.models.generateVideos({
            model: VEO_MODEL,
            prompt: lockedPrompt,
            image: {
                imageBytes: startImageBase64,
                mimeType: "image/jpeg",
            },
            config: {
                aspectRatio: ratio,
                resolution: quality === "1080p" ? "1080p" : "720p",
                durationSeconds,
                personGeneration: "allow_adult",
            },
        });

        // Poll until done
        const startedAt = Date.now();
        const timeoutMs = 420_000; // 7 minutes

        while (!op.done) {
            if (Date.now() - startedAt > timeoutMs) {
                throw new Error("Veo operation timeout after 7 minutes");
            }
            await new Promise((r) => setTimeout(r, 10_000));
            op = await ai.operations.getVideosOperation({ operation: op });
        }

        // Check for errors
        if (op.error) {
            throw new Error(`Veo operation failed: ${JSON.stringify(op.error)}`);
        }

        const videoFile = op.response?.generatedVideos?.[0]?.video;
        if (!videoFile) {
            throw new Error(`Veo: no generated video returned. Response: ${JSON.stringify(op.response)}`);
        }

        // Download video
        const tmpPath = join(tmpdir(), `${assetId}.mp4`);
        await ai.files.download({
            file: videoFile,
            downloadPath: tmpPath,
        });

        const mp4 = await import("fs/promises").then((fs) => fs.readFile(tmpPath));

        const filename = `${assetId}.mp4`;

        // Upload to R2 via media-store
        const uploadResult = await uploadMedia({
            buffer: mp4,
            filename,
            contentType: "video/mp4",
            path: `videos/${projectId}`
        });

        // Update to ready with R2 tracking
        await admin
            .from("assets")
            .update({
                status: "ready",
                origin_provider: uploadResult.provider, // 'r2' or 'supabase'
                r2_bucket: uploadResult.provider === 'r2' ? process.env.R2_BUCKET : null,
                r2_key: uploadResult.provider === 'r2' ? uploadResult.key : null,
                public_url: uploadResult.url, // R2 public URL
                storage_bucket: null, // Legacy field
                storage_path: null,   // Legacy field
                mime_type: "video/mp4",
                byte_size: mp4.length,
                meta: {
                    source: "video_tool_v2",
                    startImageAssetId,
                    prompt: lockedPrompt,
                    model: VEO_MODEL,
                },
            })
            .eq("id", assetId);

        // Update project status
        await admin.from("projects").update({ status: "videos" }).eq("id", projectId);

        // Cleanup
        await unlink(tmpPath).catch(() => { });

        console.log(`[Generate] Success for asset ${assetId}, R2 URL: ${uploadResult.url}`);
    } catch (error: any) {
        console.error(`[Generate] Failed for asset ${assetId}:`, error);

        await admin
            .from("assets")
            .update({
                status: "failed",
                meta: {
                    source: "video_tool_v2",
                    startImageAssetId,
                    error: error?.message ?? "unknown_error",
                    model: VEO_MODEL,
                },
            })
            .eq("id", assetId);
    }
}
