// app/tool/[tool]/page.tsx
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import PresetBrowser, { PresetItem } from "./PresetBrowser";

function supabasePublicServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anon, { auth: { persistSession: false } });
}

function publicUrl(bucket: string, path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function getPresets(): Promise<PresetItem[]> {
  const supabase = supabasePublicServer();

  const { data, error } = await supabase
    .from("landing_tools")
    .select(
      "id,title,subtitle,tag,tag_color,thumb_bucket,thumb_path,poster_path,sort,category,is_active"
    )
    .eq("is_active", true)
    .eq("category", "preset")
    .order("sort", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((p: any) => {
    const bucket = p.thumb_bucket || "landing";
    return {
      id: p.id,
      title: p.title,
      subtitle: p.subtitle ?? "",
      tag: p.tag ?? "",
      tag_color: p.tag_color ?? "sky",
      presetSlug: slugify(p.title),
      mediaUrl: p.thumb_path ? publicUrl(bucket, p.thumb_path) : "",
      posterUrl: p.poster_path ? publicUrl(bucket, p.poster_path) : "",
    } satisfies PresetItem;
  });
}

export default async function ToolPage(props: {
  params: Promise<{ tool: string }> | { tool: string };
  searchParams?: Promise<{ preset?: string }> | { preset?: string };
}) {
  // ✅ Next 16: params/searchParams can be Promises
  const params = await props.params;
  const searchParams = props.searchParams ? await props.searchParams : undefined;

  const toolSlug = params.tool; // ex: "mixed-media"
  const presets = await getPresets();

  // ✅ Safe empty state
  if (!presets || presets.length === 0) {
    return <PresetBrowser toolSlug={toolSlug} presets={[]} selected={null} />;
  }

  // ✅ Force clean URL with preset
  if (!searchParams?.preset) {
    redirect(`/tool/${toolSlug}?preset=${presets[0].presetSlug}`);
  }

  const requested = (searchParams.preset ?? "").toLowerCase();
  const selected = presets.find((p) => p.presetSlug === requested) ?? presets[0];

  return <PresetBrowser toolSlug={toolSlug} presets={presets} selected={selected} />;
}
