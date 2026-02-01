import { supabaseBrowser } from "@/lib/supabase/browser";

export async function uploadAssetFile(params: {
  projectId: string;
  kind: "image" | "video";
  file: File;
}) {
  const supabase = supabaseBrowser();

  const ext = params.file.name.split(".").pop()?.toLowerCase() || (params.kind === "image" ? "png" : "mp4");
  const id = crypto.randomUUID();
  const folder = params.kind === "image" ? "images" : "videos";
  const path = `${params.projectId}/${folder}/${id}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("assets")
    .upload(path, params.file, {
      upsert: true,
      contentType: params.file.type || (params.kind === "image" ? "image/png" : "video/mp4"),
    });

  if (uploadError) throw uploadError;

  const { data: signed, error: signError } = await supabase.storage
    .from("assets")
    .createSignedUrl(path, 60 * 60); // 1h

  if (signError) throw signError;

  return { path, signedUrl: signed.signedUrl };
}
