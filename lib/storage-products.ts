import { supabaseBrowser } from "@/lib/supabase/browser";

export async function uploadProductImage(params: {
  projectId: string;
  file: File;
}) {
  const supabase = supabaseBrowser();

  const ext = params.file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${params.projectId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("products")
    .upload(path, params.file, {
      upsert: true,
      contentType: params.file.type || "image/jpeg",
    });

  if (uploadError) throw uploadError;

  const { data: signed, error: signError } = await supabase.storage
    .from("products")
    .createSignedUrl(path, 60 * 60);

  if (signError) throw signError;

  return { path, signedUrl: signed.signedUrl };
}
