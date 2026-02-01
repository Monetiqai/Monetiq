import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { createRunwayClient } from "@/lib/runway";
import { uploadMedia } from "@/lib/storage/media-store";

function buildLockedPrompt(params: {
    productName: string;
    style?: string;
    goal?: string;
    userPrompt?: string;
}) {
    const name = params.productName || "product";
    const user = (params.userPrompt || "").trim();

    // Runway has 1000 char limit - keep it concise
    const prompt = `Animate this product image with subtle camera motion and lighting. Keep product identical: same colors, shape, logo, texture. No transformations. ${user || "Premium e-commerce look."}`.trim();

    // Ensure max 1000 chars
    return prompt.substring(0, 1000);
}

export async function POST(req: Request) {
    try {
        const apiKey = process.env.RUNWAY_API_KEY;
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!apiKey) return NextResponse.json({ error: "Missing RUNWAY_API_KEY" }, { status: 500 });
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
        const runwayRatio = ratio; // Use as-is (gen3a_turbo uses standard format like 16:9, 9:16)
        const duration = (body?.durationSeconds as number | undefined) ?? 5; // 2-10 seconds
        const model = (body?.model as 'gen4_turbo' | 'gen3a_turbo' | 'veo3' | 'veo3.1' | undefined) ?? 'gen3a_turbo';

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

        // Get image URL (R2 public URL or Supabase signed URL)
        let imageUrl: string;

        if (startImg.public_url) {
            // Use R2 public URL directly
            imageUrl = startImg.public_url;
        } else if (startImg.storage_path) {
            // Legacy: Create signed URL for Supabase Storage
            const { data: signedData, error: signErr } = await admin.storage
                .from(startImg.storage_bucket || "assets")
                .createSignedUrl(startImg.storage_path, 3600);

            if (signErr || !signedData) {
                return NextResponse.json({ error: "Failed to create signed URL for image" }, { status: 500 });
            }
            imageUrl = signedData.signedUrl;
        } else {
            return NextResponse.json({ error: "Start image has no public_url or storage_path" }, { status: 400 });
        }

        // Build prompt
        const lockedPrompt = buildLockedPrompt({
            productName: project.product_name,
            style: project.style,
            goal: project.goal,
            userPrompt,
        });

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
                    source: "runway_video_tool",
                    video_provider: "runway",
                    startImageAssetId,
                    prompt: lockedPrompt,
                    ratio,
                    durationSeconds: duration,
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
            lockedPrompt,
            runwayRatio,
            duration,
            model,
            apiKey,
            admin,
        }).catch((err) => {
            console.error(`[Runway] Async error for asset ${assetId}:`, err);
        });

        return NextResponse.json({ ok: true, assetId, status: "queued", provider: "runway" });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
    }
}

// Async generation function
async function generateVideoAsync(params: {
    assetId: string;
    projectId: string;
    imageUrl: string;
    lockedPrompt: string;
    runwayRatio: string;
    duration: number;
    model: 'gen4_turbo' | 'gen3a_turbo' | 'veo3' | 'veo3.1';
    apiKey: string;
    admin: any;
}) {
    const {
        assetId,
        projectId,
        imageUrl,
        lockedPrompt,
        runwayRatio,
        duration,
        model,
        apiKey,
        admin,
    } = params;

    try {
        // Update status to "generating"
        await admin
            .from("assets")
            .update({ status: "generating" })
            .eq("id", assetId);

        console.log(`[Runway] Starting generation for asset ${assetId}`);

        // Initialize Runway client
        const runway = createRunwayClient(apiKey);

        // Create generation task
        const task = await runway.imageToVideo({
            promptImage: imageUrl,
            promptText: lockedPrompt,
            model: model,
            duration: duration,
            ratio: runwayRatio as any, // Dynamic based on model
            watermark: false,
        });

        console.log(`[Runway] Task created: ${task.id}`);

        // Update meta with task ID
        await admin
            .from("assets")
            .update({
                meta: {
                    source: "runway_video_tool",
                    video_provider: "runway",
                    runwayTaskId: task.id,
                    prompt: lockedPrompt,
                    ratio: runwayRatio,
                    durationSeconds: duration,
                },
            })
            .eq("id", assetId);

        // Poll until complete (max 5 minutes)
        const completedTask = await runway.pollTaskUntilComplete(task.id, 5000, 300000);

        if (completedTask.status === 'FAILED') {
            throw new Error(`Runway task failed: ${completedTask.failure || 'Unknown error'}`);
        }

        if (!completedTask.output || completedTask.output.length === 0) {
            throw new Error('Runway: no output video returned');
        }

        const videoUrl = completedTask.output[0];
        console.log(`[Runway] Video ready: ${videoUrl}`);

        // Download video
        const videoBuffer = await runway.downloadVideo(videoUrl);

        const filename = `${assetId}.mp4`;

        // Upload to R2 via media-store
        const uploadResult = await uploadMedia({
            buffer: videoBuffer,
            filename,
            contentType: "video/mp4",
            path: `videos/${projectId}`
        });

        // Update to ready with R2 tracking
        await admin
            .from("assets")
            .update({
                status: "ready",
                origin_provider: uploadResult.provider,
                r2_bucket: uploadResult.provider === 'r2' ? process.env.R2_BUCKET : null,
                r2_key: uploadResult.provider === 'r2' ? uploadResult.key : null,
                public_url: uploadResult.url,
                storage_bucket: null,
                storage_path: null,
                mime_type: "video/mp4",
                byte_size: videoBuffer.length,
                meta: {
                    source: "runway_video_tool",
                    video_provider: "runway",
                    runwayTaskId: task.id,
                    prompt: lockedPrompt,
                    ratio: runwayRatio,
                    durationSeconds: duration,
                },
            })
            .eq("id", assetId);

        console.log(`✅ Runway video generated for asset ${assetId}, R2 URL: ${uploadResult.url}`);

        // Update project status
        await admin.from("projects").update({ status: "videos" }).eq("id", projectId);

        console.log(`[Runway] Success for asset ${assetId}`);
    } catch (error: any) {
        console.error(`[Runway] Failed for asset ${assetId}:`, error);

        await admin
            .from("assets")
            .update({
                status: "failed",
                meta: {
                    source: "runway_video_tool",
                    video_provider: "runway",
                    error: error?.message ?? "unknown_error",
                },
            })
            .eq("id", assetId);
    }
}
