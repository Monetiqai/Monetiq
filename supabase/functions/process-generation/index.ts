import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenAI } from "npm:@google/genai@^1.37.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Generation {
  id: string;
  user_id: string;
  tool: string;
  preset: string;
  settings: Record<string, any>;
  prompt: string;
  status: string;
  input_url?: string;
}

function mapToVeoConfig(settings: Record<string, any>) {
  const aspectRatio = settings?.aspectRatio ?? "9:16";
  const resolution = settings?.resolution ?? "1080p";
  const negativePrompt =
    "cartoon, drawing, low quality, chaotic motion, overexposed glow, jitter";
  return { aspectRatio, resolution, negativePrompt };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get generation_id from request body
    const { generation_id } = await req.json();
    if (!generation_id) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing generation_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Claim the job atomically (prevents double-processing)
    const { data: job, error: claimError } = await supabase
      .from("generations")
      .update({ status: "processing", error: null })
      .eq("id", generation_id)
      .eq("status", "queued") // Only claim if still queued
      .select()
      .single();

    if (claimError || !job) {
      console.log(`Job ${generation_id} already claimed or not found`);
      return new Response(
        JSON.stringify({ ok: true, message: "Job already claimed or not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing job ${job.id} for user ${job.user_id}`);

    // Initialize Gemini AI
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY")!;
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    const veo = mapToVeoConfig(job.settings ?? {});

    // Only Veo 3.1 is available in current API version
    const model = "veo-3.1-generate-preview";

    // Call Veo API - support both image-to-video and text-to-video
    let op;

    // IMPORTANT: Video-to-video code preserved for future API migration
    // TODO: When migrating to API that supports external video-to-video, uncomment this:
    /*
    if (job.input_url && job.input_url.includes('.mp4')) {
      // Video-to-video mode (FUTURE - requires API that supports external videos)
      console.log(`Using video-to-video mode with input: ${job.input_url}`);
      op = await ai.models.generateVideos({
        model,
        prompt: job.prompt,
        config: {
          aspectRatio: veo.aspectRatio,
          resolution: veo.resolution,
          negativePrompt: veo.negativePrompt,
          inputVideo: job.input_url, // Parameter name may vary by API
        },
      });
    } else
    */

    // Image-to-video mode (image becomes the animated video)
    if (job.input_url) {
      console.log(`Using image-to-video mode with image: ${job.input_url}`);

      try {
        // Download image from Supabase Storage
        console.log('Downloading image...');
        const imageResponse = await fetch(job.input_url);

        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.status}`);
        }

        // Get MIME type from response
        const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
        console.log(`Image MIME type: ${mimeType}`);

        // Convert to base64
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64Image = btoa(
          new Uint8Array(imageBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ''
          )
        );

        console.log(`Image downloaded and encoded (${base64Image.length} chars)`);

        // Clean base64 (remove data URI prefix if present)
        const cleanBase64 = base64Image.includes("base64,")
          ? base64Image.split("base64,")[1]
          : base64Image;

        console.log('Base64 validation:', {
          mimeType,
          hasPrefix: base64Image.startsWith("data:"),
          originalLength: base64Image.length,
          cleanLength: cleanBase64.length,
          starts: cleanBase64.slice(0, 20)
        });

        // ✅ CORRECT: Use imageBytes for @google/genai SDK (not bytesBase64Encoded!)
        op = await ai.models.generateVideos({
          model,
          prompt: job.prompt,
          image: {
            imageBytes: cleanBase64,  // ← imageBytes for Gemini SDK!
            mimeType: mimeType
          },
          config: {
            aspectRatio: veo.aspectRatio,
            resolution: veo.resolution,
            negativePrompt: veo.negativePrompt,
            personGeneration: "allow_adult",
          },
        });
      } catch (error: any) {
        console.error('Failed to process image:', error);
        console.log('Falling back to text-to-video mode');

        // Fallback to text-to-video if image processing fails
        op = await ai.models.generateVideos({
          model,
          prompt: job.prompt,
          config: {
            aspectRatio: veo.aspectRatio,
            resolution: veo.resolution,
            negativePrompt: veo.negativePrompt,
          },
        });
      }
    } else {
      // Text-to-video mode (no reference image)
      console.log(`Using text-to-video mode`);
      op = await ai.models.generateVideos({
        model,
        prompt: job.prompt,
        config: {
          aspectRatio: veo.aspectRatio,
          resolution: veo.resolution,
          negativePrompt: veo.negativePrompt,
        },
      });
    }

    // Poll until done (max 7 minutes)
    const startedAt = Date.now();
    const timeoutMs = 7 * 60 * 1000;

    while (!op.done) {
      if (Date.now() - startedAt > timeoutMs) {
        throw new Error("Veo timeout after 7 minutes");
      }
      await sleep(10_000); // Poll every 10 seconds
      op = await ai.operations.getVideosOperation({ operation: op });
    }

    // Extract generated video
    const generated = op.response?.generatedVideos;
    const videoFile = generated?.[0]?.video;

    if (!videoFile) {
      console.error("Veo operation response:", JSON.stringify(op.response ?? null, null, 2));
      throw new Error("Veo: no generated video returned by operation");
    }

    // Download video to temporary file
    const tmpDir = await Deno.makeTempDir();
    const tmpFile = `${tmpDir}/${job.id}.mp4`;

    await ai.files.download({
      file: videoFile,
      downloadPath: tmpFile,
    });

    const videoBytes = await Deno.readFile(tmpFile);

    // Upload to Supabase Storage
    const bucket = "outputs";
    const storagePath = `${job.id}.mp4`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, videoBytes, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL (will be changed to signed URL when bucket becomes private)
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    const publicUrl = urlData.publicUrl;

    // Update job status to ready
    const { error: updateError } = await supabase
      .from("generations")
      .update({ status: "ready", output_url: publicUrl })
      .eq("id", job.id);

    if (updateError) {
      throw new Error(`Failed to update job: ${updateError.message}`);
    }

    // Cleanup temp file
    await Deno.remove(tmpFile);
    await Deno.remove(tmpDir);

    console.log(`Job ${job.id} completed successfully`);

    return new Response(
      JSON.stringify({ ok: true, job_id: job.id, output_url: publicUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error processing generation:", error);

    // Try to update job status to failed
    try {
      const { generation_id } = await req.json();
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase
        .from("generations")
        .update({ status: "failed", error: error?.message ?? String(error) })
        .eq("id", generation_id);
    } catch (updateError) {
      console.error("Failed to update error status:", updateError);
    }

    return new Response(
      JSON.stringify({ ok: false, error: error?.message ?? String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
