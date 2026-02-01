import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { GoogleGenAI } from "@google/genai";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { uploadMedia } from "@/lib/storage/media-store";

type AssetRow = {
  id: string;
  role: string;
  status: "pending" | "ready" | "failed";
  storage_path: string | null;
  meta: any;
};

type ImageAssetRow = {
  id: string;
  storage_bucket: string;
  storage_path: string | null;
  public_url?: string | null;
  r2_key?: string | null;
  origin_provider?: string | null;
  status: "ready" | "pending" | "failed";
};

type ProjectRow = {
  id: string;
  product_name: string;
  style: string | null;
  goal: string | null;
};

const VEO_MODEL = "veo-3.1-generate-preview";

function buildLockedPrompt(params: {
  project: ProjectRow;
  userPrompt?: string;
}) {
  const name = params.project.product_name || "product";
  const style = params.project.style || "Premium Luxury";
  const goal = params.project.goal || "Conversion";

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

    // Load selected start image asset
    const { data: startImg, error: sErr } = await admin
      .from("assets")
      .select("id, storage_bucket, storage_path, public_url, r2_key, origin_provider, status")
      .eq("id", startImageAssetId)
      .eq("project_id", projectId)
      .eq("kind", "image")
      .single();

    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 400 });

    const startRow = startImg as ImageAssetRow;
    if (startRow.status !== "ready") {
      return NextResponse.json({ error: "Selected start image is not ready" }, { status: 400 });
    }
    // Check for R2 public_url or legacy storage_path
    if (!startRow.public_url && !startRow.storage_path) {
      return NextResponse.json({ error: "Selected start image has no public_url or storage_path" }, { status: 400 });
    }

    // Load pending video assets
    const { data: pending, error: aErr } = await admin
      .from("assets")
      .select("id, role, status, storage_path, meta")
      .eq("project_id", projectId)
      .eq("kind", "video")
      .eq("status", "pending");

    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 400 });

    const rows = (pending ?? []) as AssetRow[];
    if (rows.length === 0) return NextResponse.json({ ok: true, message: "No pending video assets." });

    // Download start frame bytes (support R2 public URL or legacy Supabase Storage)
    let startImageBase64: string;

    if (startRow.public_url) {
      // New: Fetch from R2 public URL
      const response = await fetch(startRow.public_url);
      if (!response.ok) {
        return NextResponse.json({ error: `Cannot download start image from R2: ${response.statusText}` }, { status: 400 });
      }
      const arr = await response.arrayBuffer();
      startImageBase64 = Buffer.from(arr).toString("base64");
    } else if (startRow.storage_path) {
      // Legacy: Download from Supabase Storage
      const { data: blob, error: dlErr } = await admin.storage
        .from(startRow.storage_bucket || "assets")
        .download(startRow.storage_path);

      if (dlErr || !blob) {
        return NextResponse.json({ error: `Cannot download start image: ${dlErr?.message ?? "unknown"}` }, { status: 400 });
      }

      const arr = await blob.arrayBuffer();
      startImageBase64 = Buffer.from(arr).toString("base64");
    } else {
      return NextResponse.json({ error: "Start image has no public_url or storage_path" }, { status: 400 });
    }

    const lockedPrompt = buildLockedPrompt({ project: project as ProjectRow, userPrompt });

    // Initialize Gemini AI SDK
    const ai = new GoogleGenAI({ apiKey });

    const results: Array<{ id: string; status: string; error?: string }> = [];

    // Generate for each pending video asset (usually 1)
    for (const asset of rows) {
      try {
        // Use Gemini SDK with veo-3.1-generate-preview
        let op = await ai.models.generateVideos({
          model: VEO_MODEL,
          prompt: lockedPrompt,
          image: {
            imageBytes: startImageBase64,
            mimeType: "image/jpeg"
          },
          config: {
            aspectRatio: ratio,
            resolution: quality === "1080p" ? "1080p" : "720p",
            durationSeconds,
            personGeneration: "allow_adult",
          },
        });

        // Poll until done (SDK handles operation tracking)
        const startedAt = Date.now();
        const timeoutMs = 420_000; // 7 minutes

        while (!op.done) {
          if (Date.now() - startedAt > timeoutMs) {
            throw new Error("Veo operation timeout after 7 minutes");
          }
          await new Promise((r) => setTimeout(r, 10_000)); // Poll every 10 seconds
          op = await ai.operations.getVideosOperation({ operation: op });
        }

        // Extract generated video
        console.log("Operation completed. Checking response...");
        console.log("Full operation response:", JSON.stringify(op.response, null, 2));

        // Check for errors in the operation
        if (op.error) {
          console.error("Operation error:", JSON.stringify(op.error, null, 2));
          throw new Error(`Veo operation failed: ${JSON.stringify(op.error)}`);
        }

        const videoFile = op.response?.generatedVideos?.[0]?.video;

        if (!videoFile) {
          console.error("No video in response. Full response structure:");
          console.error("- response exists:", !!op.response);
          console.error("- generatedVideos exists:", !!op.response?.generatedVideos);
          console.error("- generatedVideos length:", op.response?.generatedVideos?.length);
          console.error("- first item:", JSON.stringify(op.response?.generatedVideos?.[0], null, 2));

          throw new Error(`Veo: no generated video returned by operation. Response: ${JSON.stringify(op.response)}`);
        }

        // Download video to temporary file
        const tmpPath = join(tmpdir(), `${asset.id}.mp4`);

        await ai.files.download({
          file: videoFile,
          downloadPath: tmpPath,
        });

        const mp4 = await import("fs/promises").then(fs => fs.readFile(tmpPath));

        const filename = `${asset.id}.mp4`;

        // Upload to R2 via media-store
        const uploadResult = await uploadMedia({
          buffer: mp4,
          filename,
          contentType: "video/mp4",
          path: `videos/${projectId}`
        });

        const nextMeta = {
          ...(asset.meta ?? {}),
          prompt: lockedPrompt,
          model: VEO_MODEL,
          source: asset.meta?.source ?? "auto_video_v1",
          startImageAssetId,
        };

        // Update to ready with R2 tracking
        const { error: updErr } = await admin
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
            byte_size: mp4.length,
            meta: nextMeta,
          })
          .eq("id", asset.id);

        if (updErr) throw updErr;

        console.log(`✅ Video generated for asset ${asset.id}, R2 URL: ${uploadResult.url}`);

        // Cleanup temp file
        await unlink(tmpPath).catch(() => { });

        results.push({ id: asset.id, status: "ready" });
      } catch (e: any) {
        await admin
          .from("assets")
          .update({
            status: "failed",
            meta: {
              ...(asset.meta ?? {}),
              error: e?.message ?? "unknown_error",
              model: VEO_MODEL,
              startImageAssetId,
            },
          })
          .eq("id", asset.id);

        results.push({ id: asset.id, status: "failed", error: e?.message ?? "unknown_error" });
      }
    }

    // Update project status if any ready
    if (results.some((r) => r.status === "ready")) {
      await admin.from("projects").update({ status: "videos" }).eq("id", projectId);
    }

    return NextResponse.json({ ok: true, model: VEO_MODEL, results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
