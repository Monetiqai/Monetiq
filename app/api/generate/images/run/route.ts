import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { uploadMedia } from "@/lib/storage/media-store";

type AssetRow = {
  id: string;
  role: string;
  status: "pending" | "ready" | "failed";
  meta: any;
};

type ProjectRow = {
  id: string;
  product_name: string;
  style: string | null;
  goal: string | null;
  product_image_path: string | null;
  product_image_url?: string | null; // R2 public URL
};

// ✅ Nano Banana Pro (Gemini 3 Pro Image Preview)
const MODEL_ID = "gemini-3-pro-image-preview";
const GEN_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent`;

function aspectRatioFor(role: string, uiAspectRatio?: string) {
  // UI aspect ratio has priority if present
  if (uiAspectRatio && typeof uiAspectRatio === "string") return uiAspectRatio;
  // fallback defaults
  if (role.toLowerCase().includes("social")) return "4:3";
  return "1:1";
}

function imageSizeFor(projectStyle: string | null, uiQuality?: string) {
  if (uiQuality === "2K" || uiQuality === "4K") return uiQuality;
  if (projectStyle?.toLowerCase().includes("luxury")) return "2K";
  return "1K";
}

function baseInstruction(params: { project: ProjectRow; role: string }) {
  const name = params.project.product_name || "product";
  const style = params.project.style || "Clean Commerce";
  const goal = params.project.goal || "Conversion produit";

  return `
You are an e-commerce product imaging engine.

CRITICAL IDENTITY LOCK:
- Use the provided reference image as the single source of truth.
- The generated product MUST be the same product: same color blocking, same materials/texture, same logos/labels, same silhouette.
- Do NOT invent a different item. Do NOT change colors. Do NOT change branding.

Project:
- Product name: ${name}
- Visual style: ${style}
- Marketing goal: ${goal}

Role:
${params.role}

Output requirements:
- Photorealistic commercial quality
- No extra logos
- No random product changes
- If you add environment, keep product unchanged and consistent
`.trim();
}

function roleInstruction(role: string) {
  const r = role.toLowerCase();
  if (r.includes("hero")) return "Premium studio packshot of the SAME product. Clean background, soft shadow, centered framing.";
  if (r.includes("lifestyle")) return "Place the SAME product into a realistic lifestyle scene. Keep identity unchanged.";
  if (r.includes("detail")) return "Close-up macro detail on fabric texture and stitching. Preserve colors and materials.";
  if (r.includes("benefit")) return "Show comfort/warmth visually. No text overlay. Keep product unchanged.";
  if (r.includes("variant")) return "Alternative angle/framing for A/B testing. Same identity.";
  if (r.includes("social")) return "Ad-ready social feed composition. Punchy framing. Same identity.";
  return "Create a commercial image of the SAME product. Keep identity unchanged.";
}

function buildFinalPrompt(params: {
  project: ProjectRow;
  assetRole: string;
  userPrompt: string;
}) {
  const locked = baseInstruction({ project: params.project, role: params.assetRole });
  const roleHint = roleInstruction(params.assetRole);

  const user = (params.userPrompt || "").trim();
  const userBlock = user
    ? `\n\nUSER INSTRUCTIONS (must follow strictly):\n${user}\n`
    : "";

  return `${locked}\n\nTASK:\n${roleHint}${userBlock}`.trim();
}

async function nanoBananaGenerateImageBase64(params: {
  apiKey: string;
  prompt: string;
  referenceImageBase64: string;
  referenceMimeType: string;
  aspectRatio: string;
  imageSize: "1K" | "2K" | "4K";
}) {
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
          parts: [
            { text: params.prompt },
            {
              inlineData: {
                mimeType: params.referenceMimeType,
                data: params.referenceImageBase64,
              },
            },
          ],
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
    throw new Error(`Nano Banana Pro error ${res.status}: ${text}`);
  }

  const json = JSON.parse(text);
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  const imgPart = parts.find((p: any) => p?.inlineData?.data);

  if (!imgPart?.inlineData?.data) {
    throw new Error("No image returned by Nano Banana Pro (missing inlineData.data)");
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
    const projectId = body?.projectId as string | undefined;
    const userPromptFromUI = (body?.userPrompt as string | undefined) ?? "";

    if (!projectId) return NextResponse.json({ error: "projectId missing" }, { status: 400 });

    const admin = createClient(url, serviceKey);

    // Load project
    const { data: project, error: pErr } = await admin
      .from("projects")
      .select("id, product_name, style, goal, product_image_path, product_image_url")
      .eq("id", projectId)
      .single();

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });

    const proj = project as ProjectRow;
    // Check for R2 public URL or legacy path
    if (!proj.product_image_url && !proj.product_image_path) {
      return NextResponse.json(
        { error: "No product image uploaded. Upload a product image first." },
        { status: 400 }
      );
    }

    // Load pending assets
    const { data: pending, error: aErr } = await admin
      .from("assets")
      .select("id, role, status, meta")
      .eq("project_id", projectId)
      .eq("kind", "image")
      .eq("status", "pending");

    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 400 });

    const rows = (pending ?? []) as AssetRow[];
    if (rows.length === 0) return NextResponse.json({ ok: true, message: "No pending image assets." });

    // Download reference product image (R2 public URL or Supabase Storage)
    let referenceImageBase64: string;
    let referenceMimeType: string;

    if (proj.product_image_url) {
      // New: Fetch from R2 public URL
      const response = await fetch(proj.product_image_url);
      if (!response.ok) {
        return NextResponse.json(
          { error: `Cannot download product image from R2: ${response.statusText}` },
          { status: 400 }
        );
      }
      const arrayBuffer = await response.arrayBuffer();
      const refBuffer = Buffer.from(arrayBuffer);
      referenceImageBase64 = refBuffer.toString("base64");
      referenceMimeType = proj.product_image_url.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
    } else if (proj.product_image_path) {
      // Legacy: Download from Supabase Storage
      const { data: downloaded, error: dlErr } = await admin.storage.from("products").download(proj.product_image_path);
      if (dlErr || !downloaded) {
        return NextResponse.json(
          { error: `Cannot download product image: ${dlErr?.message ?? "unknown"}` },
          { status: 400 }
        );
      }
      const arrayBuffer = await downloaded.arrayBuffer();
      const refBuffer = Buffer.from(arrayBuffer);
      referenceImageBase64 = refBuffer.toString("base64");
      referenceMimeType = proj.product_image_path.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
    } else {
      return NextResponse.json(
        { error: "Product image has no public_url or storage_path" },
        { status: 400 }
      );
    }

    const results: Array<{ id: string; status: string; error?: string }> = [];

    for (const asset of rows) {
      try {
        // Prefer per-asset userPrompt (stored in meta.ui.userPrompt) or request body prompt
        const metaPrompt = asset.meta?.ui?.userPrompt ?? "";
        const effectiveUserPrompt = (userPromptFromUI || metaPrompt || "").trim();

        const uiAspectRatio = asset.meta?.ui?.aspectRatio;
        const uiQuality = asset.meta?.ui?.quality;

        const aspectRatio = aspectRatioFor(asset.role, uiAspectRatio);
        const imageSize = imageSizeFor(proj.style, uiQuality);

        const prompt = buildFinalPrompt({
          project: proj,
          assetRole: asset.role,
          userPrompt: effectiveUserPrompt,
        });

        const outB64 = await nanoBananaGenerateImageBase64({
          apiKey,
          prompt,
          referenceImageBase64,
          referenceMimeType,
          aspectRatio,
          imageSize,
        });

        const pngBuffer = Buffer.from(outB64, "base64");
        const filename = `${asset.id}.png`;

        // Upload to R2 via media-store
        const uploadResult = await uploadMedia({
          buffer: pngBuffer,
          filename,
          contentType: "image/png",
          path: `images/${projectId}`
        });

        const nextMeta = {
          ...(asset.meta ?? {}),
          kept: asset.meta?.kept ?? false,
          prompt,
          model: `models/${MODEL_ID}`,
          aspectRatio,
          imageSize,
          ui: {
            ...(asset.meta?.ui ?? {}),
            aspectRatio,
            quality: imageSize,
            userPrompt: effectiveUserPrompt,
          },
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
            mime_type: "image/png",
            byte_size: pngBuffer.length,
            meta: nextMeta,
          })
          .eq("id", asset.id);

        if (updErr) throw updErr;

        console.log(`✅ Image generated for asset ${asset.id}, R2 URL: ${uploadResult.url}`);

        results.push({ id: asset.id, status: "ready" });
      } catch (e: any) {
        await admin
          .from("assets")
          .update({
            status: "failed",
            meta: {
              ...(asset.meta ?? {}),
              kept: asset.meta?.kept ?? false,
              error: e?.message ?? "unknown_error",
              model: `models/${MODEL_ID}`,
            },
          })
          .eq("id", asset.id);

        results.push({ id: asset.id, status: "failed", error: e?.message ?? "unknown_error" });
      }
    }

    return NextResponse.json({ ok: true, model: `models/${MODEL_ID}`, results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
