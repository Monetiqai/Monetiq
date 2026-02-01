import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { createMinimaxClient, MinimaxModel } from "@/lib/minimax";
import { uploadMedia } from "@/lib/storage/media-store";

export async function POST(req: Request) {
    try {
        const apiKey = process.env.MINIMAX_API_KEY;
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!apiKey) return NextResponse.json({ error: "Missing MINIMAX_API_KEY" }, { status: 500 });
        if (!url) return NextResponse.json({ error: "Missing NEXT_PUBLIC_SUPABASE_URL" }, { status: 500 });
        if (!serviceKey) return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

        const supa = await supabaseServer();
        const { data: { user }, error: userErr } = await supa.auth.getUser();
        if (userErr) return NextResponse.json({ error: userErr.message }, { status: 401 });
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json().catch(() => ({}));
        const projectId = body?.projectId as string | undefined;
        const anchorAssetId = body?.anchorAssetId as string | undefined;
        const prompt = body?.prompt as string | undefined;
        const movement = body?.movement as string | undefined;
        const duration = (body?.duration as number | undefined) ?? 6;
        const aspectRatio = (body?.aspectRatio as string | undefined) ?? "21:9";
        const qualityMode = (body?.qualityMode as "preview" | "final" | undefined) ?? "preview";

        if (!projectId) return NextResponse.json({ error: "projectId missing" }, { status: 400 });
        if (!anchorAssetId) return NextResponse.json({ error: "anchorAssetId missing" }, { status: 400 });
        if (!prompt) return NextResponse.json({ error: "prompt missing" }, { status: 400 });

        const admin = createClient(url, serviceKey);

        // Load project
        const { data: project, error: pErr } = await admin
            .from("projects")
            .select("id, product_name, meta")
            .eq("id", projectId)
            .single();

        if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });

        // Load anchor frame image
        const { data: anchorImg, error: aErr } = await admin
            .from("assets")
            .select("id, storage_bucket, storage_path, public_url, r2_key, origin_provider, status")
            .eq("id", anchorAssetId)
            .eq("project_id", projectId)
            .eq("kind", "image")
            .single();

        if (aErr) return NextResponse.json({ error: aErr.message }, { status: 400 });

        if (anchorImg.status !== "ready") {
            return NextResponse.json({ error: "Anchor frame is not ready" }, { status: 400 });
        }
        // Check for R2 public_url or legacy storage_path
        if (!anchorImg.public_url && !anchorImg.storage_path) {
            return NextResponse.json({ error: "Anchor frame has no public_url or storage_path" }, { status: 400 });
        }

        // Get image URL (R2 public URL or Supabase signed URL)
        let imageUrl: string;

        if (anchorImg.public_url) {
            // Use R2 public URL directly
            imageUrl = anchorImg.public_url;
        } else if (anchorImg.storage_path) {
            // Legacy: Create signed URL for Supabase Storage
            const { data: signedData, error: signErr } = await admin.storage
                .from(anchorImg.storage_bucket || "assets")
                .createSignedUrl(anchorImg.storage_path, 3600);

            if (signErr || !signedData) {
                return NextResponse.json({ error: "Failed to create signed URL for anchor frame" }, { status: 500 });
            }
            imageUrl = signedData.signedUrl;
        } else {
            return NextResponse.json({ error: "Anchor frame has no public_url or storage_path" }, { status: 400 });
        }

        // Determine model based on quality mode
        const model: MinimaxModel = qualityMode === "final"
            ? "MiniMax-Hailuo-2.3"
            : "MiniMax-Hailuo-2.3-Fast";

        // Build final prompt (combine base prompt + movement)
        const finalPrompt = movement
            ? `${prompt}\n\nCamera Movement: ${movement}`
            : prompt;

        // Create asset with status "queued"
        const { data: newAsset, error: createErr } = await admin
            .from("assets")
            .insert({
                user_id: user.id,
                project_id: projectId,
                kind: "video",
                role: "video_1",
                status: "queued",
                category: "director_mode",
                meta: {
                    source: "director_mode_video",
                    video_provider: "minimax",
                    model,
                    quality_mode: qualityMode,
                    prompt: finalPrompt,
                    movement,
                    duration,
                    aspect_ratio: aspectRatio,
                    anchor_asset_id: anchorAssetId,
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
            imageUrl,
            prompt: finalPrompt,
            model,
            duration,
            qualityMode,
            aspectRatio,
            movement,
            anchorAssetId,
            apiKey,
            admin,
        }).catch((err) => {
            console.error(`[MiniMax] Async error for asset ${assetId}:`, err);
        });

        return NextResponse.json({ ok: true, assetId, status: "queued", provider: "minimax" });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
    }
}

// Async generation function
async function generateVideoAsync(params: {
    assetId: string;
    projectId: string;
    imageUrl: string;
    prompt: string;
    model: MinimaxModel;
    duration: number;
    qualityMode: "preview" | "final";
    aspectRatio: string;
    movement?: string;
    anchorAssetId: string;
    apiKey: string;
    admin: any;
}) {
    const {
        assetId,
        projectId,
        imageUrl,
        prompt,
        model,
        duration,
        qualityMode,
        aspectRatio,
        movement,
        anchorAssetId,
        apiKey,
        admin,
    } = params;

    try {
        // Update status to "generating"
        await admin
            .from("assets")
            .update({ status: "generating" })
            .eq("id", assetId);

        console.log(`[MiniMax] Starting generation for asset ${assetId} (model: ${model})`);

        // Initialize MiniMax client
        const minimax = createMinimaxClient(apiKey);

        // Step A: Create generation task
        // Determine resolution based on model and duration constraints
        // MiniMax-Hailuo-2.3 (final) doesn't support 10s at 1080P
        const resolution = model === "MiniMax-Hailuo-2.3" && duration === 10
            ? "768P"
            : "1080P";

        console.log(`[MiniMax] Using resolution: ${resolution} for model: ${model}, duration: ${duration}s`);

        const { task_id } = await minimax.createVideoTask({
            prompt,
            model,
            firstFrameImage: imageUrl,
            duration,
            resolution,
        });

        console.log(`[MiniMax] Task created: ${task_id}`);

        // Update meta with task ID
        await admin
            .from("assets")
            .update({
                meta: {
                    source: "director_mode_video",
                    video_provider: "minimax",
                    task_id,
                    model,
                    quality_mode: qualityMode,
                    prompt,
                    movement,
                    duration,
                    aspect_ratio: aspectRatio,
                    anchor_asset_id: anchorAssetId,
                },
            })
            .eq("id", assetId);

        // Step B: Poll until complete (max 15 minutes)
        const completedTask = await minimax.pollTaskUntilComplete(task_id, 5000, 900000);

        if (completedTask.status === "Failed") {
            throw new Error(`MiniMax task failed: ${completedTask.error || "Unknown error"}`);
        }

        if (!completedTask.file_id) {
            throw new Error("MiniMax: no file_id returned");
        }

        console.log(`[MiniMax] Task completed, file_id: ${completedTask.file_id}`);

        // Step C: Get download URL
        const downloadUrl = await minimax.getDownloadUrl(completedTask.file_id);
        console.log(`[MiniMax] Download URL obtained`);

        // Download video
        const videoBuffer = await minimax.downloadVideo(downloadUrl);
        console.log(`[MiniMax] Video downloaded (${videoBuffer.length} bytes)`);

        const filename = `${assetId}.mp4`;

        // Upload to R2 via media-store
        const uploadResult = await uploadMedia({
            buffer: videoBuffer,
            filename,
            contentType: "video/mp4",
            path: `videos/${projectId}`
        });

        console.log(`[MiniMax] Video uploaded to R2: ${uploadResult.url}`);

        // Update to ready with R2 tracking
        await admin
            .from("assets")
            .update({
                status: "ready",
                category: "director_mode",
                origin_provider: uploadResult.provider,
                r2_bucket: uploadResult.provider === 'r2' ? process.env.R2_BUCKET : null,
                r2_key: uploadResult.provider === 'r2' ? uploadResult.key : null,
                public_url: uploadResult.url,
                storage_bucket: null,
                storage_path: null,
                mime_type: "video/mp4",
                byte_size: videoBuffer.length,
                meta: {
                    source: "director_mode_video",
                    video_provider: "minimax",
                    task_id,
                    file_id: completedTask.file_id,
                    model,
                    quality_mode: qualityMode,
                    prompt,
                    movement,
                    duration,
                    aspect_ratio: aspectRatio,
                    anchor_asset_id: anchorAssetId,
                },
            })
            .eq("id", assetId);

        console.log(`✅ MiniMax video generated for asset ${assetId}, R2 URL: ${uploadResult.url}`);

        // Update project status
        await admin.from("projects").update({ status: "videos" }).eq("id", projectId);

        console.log(`[MiniMax] Success for asset ${assetId}`);
    } catch (error: any) {
        console.error(`[MiniMax] Failed for asset ${assetId}:`, error);

        await admin
            .from("assets")
            .update({
                status: "failed",
                meta: {
                    source: "director_mode_video",
                    video_provider: "minimax",
                    error: error?.message ?? "unknown_error",
                    quality_mode: qualityMode,
                    model,
                },
            })
            .eq("id", assetId);
    }
}
