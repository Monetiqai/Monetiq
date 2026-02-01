"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { validateVideoFile } from "@/lib/videoUtils";
import { extractFirstFrame } from "@/lib/videoToImage";
import { DIRECTORS, CAMERAS, LENSES, FOCAL_LENGTHS, APERTURES } from "@/lib/cinema";

const preloadVideo = (url: string) => {
  if (!url) return;
  try {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "video";
    link.href = url;
    document.head.appendChild(link);
    // cleanup
    setTimeout(() => link.remove(), 1500);
  } catch { }
};

type ControlDef =
  | { key: string; label: string; type: "select"; options: { label: string; value: string }[]; help?: string }
  | { key: string; label: string; type: "slider"; min: number; max: number; step: number; unit?: string; help?: string };

type PresetConfig = {
  title: string;
  controls: ControlDef[];
  defaults: Record<string, string | number>;
};

const PRESET_CONFIGS: Record<string, PresetConfig> = {
  "neon-tech-outline": {
    title: "Neon Tech Outline",
    defaults: {
      neonColor: "cyan",
      intensity: 60,
      focus: "ui",
      speed: "slow",
    },
    controls: [
      {
        key: "neonColor",
        label: "Neon color",
        type: "select",
        options: [
          { label: "Cyan", value: "cyan" },
          { label: "Electric Blue", value: "blue" },
          { label: "Purple", value: "purple" },
          { label: "Lime", value: "lime" },
        ],
        help: "Keep 1 color for premium consistency.",
      },
      { key: "intensity", label: "Intensity", type: "slider", min: 20, max: 90, step: 5, unit: "%", help: "Too high looks cheap." },
      {
        key: "focus",
        label: "Focus zone",
        type: "select",
        options: [
          { label: "Interface", value: "ui" },
          { label: "Subject", value: "subject" },
          { label: "Object", value: "object" },
          { label: "Auto", value: "auto" },
        ],
      },
      {
        key: "speed",
        label: "Animation speed",
        type: "select",
        options: [
          { label: "Slow (premium)", value: "slow" },
          { label: "Normal", value: "normal" },
          { label: "Fast (ads)", value: "fast" },
        ],
      },
    ],
  },

  "ui-highlight": {
    title: "UI Highlight",
    defaults: {
      focusIntensity: "balanced",
      demoPacing: "slow",
      accentStyle: "glow",
    },
    controls: [
      {
        key: "focusIntensity",
        label: "Focus intensity",
        type: "select",
        options: [
          { label: "Soft", value: "soft" },
          { label: "Balanced", value: "balanced" },
          { label: "Strong", value: "strong" },
        ],
      },
      {
        key: "demoPacing",
        label: "Demo pacing",
        type: "select",
        options: [
          { label: "Slow (explain)", value: "slow" },
          { label: "Normal", value: "normal" },
          { label: "Fast (ads)", value: "fast" },
        ],
      },
      {
        key: "accentStyle",
        label: "Accent style",
        type: "select",
        options: [
          { label: "Glow", value: "glow" },
          { label: "Outline", value: "outline" },
          { label: "Blur background", value: "blur" },
        ],
      },
    ],
  },

  "abstract-data-flow": {
    title: "Abstract Data Flow",
    defaults: {
      complexity: "standard",
      output: "decision",
      speed: "calm",
    },
    controls: [
      {
        key: "complexity",
        label: "Flow complexity",
        type: "select",
        options: [
          { label: "Simple", value: "simple" },
          { label: "Standard", value: "standard" },
          { label: "Advanced", value: "advanced" },
        ],
      },
      {
        key: "output",
        label: "Output type",
        type: "select",
        options: [
          { label: "Decision", value: "decision" },
          { label: "Score", value: "score" },
          { label: "Alert", value: "alert" },
          { label: "Automation", value: "automation" },
        ],
      },
      {
        key: "speed",
        label: "Processing speed",
        type: "select",
        options: [
          { label: "Calm (premium)", value: "calm" },
          { label: "Normal", value: "normal" },
          { label: "Fast", value: "fast" },
        ],
      },
    ],
  },

  "minimal-line-art": {
    title: "Minimal Line Art",
    defaults: {
      lineStyle: "continuous",
      contrast: "balanced",
      motion: "draw",
    },
    controls: [
      {
        key: "lineStyle",
        label: "Line style",
        type: "select",
        options: [
          { label: "Continuous", value: "continuous" },
          { label: "Dashed", value: "dashed" },
          { label: "Cornered", value: "cornered" },
        ],
      },
      {
        key: "contrast",
        label: "Contrast",
        type: "select",
        options: [
          { label: "Light", value: "light" },
          { label: "Balanced", value: "balanced" },
          { label: "Dark", value: "dark" },
        ],
      },
      {
        key: "motion",
        label: "Animation",
        type: "select",
        options: [
          { label: "Appear", value: "appear" },
          { label: "Draw", value: "draw" },
          { label: "Pulse (subtle)", value: "pulse" },
        ],
      },
    ],
  },

  "smart-callout": {
    title: "Smart Callout",
    defaults: {
      ctaType: "button",
      direction: "auto",
      intensity: "balanced",
      timing: "mid",
    },
    controls: [
      {
        key: "ctaType",
        label: "CTA target",
        type: "select",
        options: [
          { label: "Button", value: "button" },
          { label: "Link", value: "link" },
          { label: "Form", value: "form" },
          { label: "Pricing card", value: "pricing" },
        ],
      },
      {
        key: "direction",
        label: "Callout direction",
        type: "select",
        options: [
          { label: "Auto", value: "auto" },
          { label: "Left", value: "left" },
          { label: "Right", value: "right" },
          { label: "Top", value: "top" },
        ],
      },
      {
        key: "intensity",
        label: "Intensity",
        type: "select",
        options: [
          { label: "Soft", value: "soft" },
          { label: "Balanced", value: "balanced" },
          { label: "Strong", value: "strong" },
        ],
      },
      {
        key: "timing",
        label: "Appear timing",
        type: "select",
        options: [
          { label: "Early", value: "early" },
          { label: "Mid", value: "mid" },
          { label: "Late", value: "late" },
        ],
      },
    ],
  },
};

type GeneratePayload = {
  tool: string;
  preset: string;
  settings: Record<string, string | number>;
  // later: inputVideoUrl?: string;
};

function buildPresetPrompt(presetSlug: string, settings: Record<string, string | number>) {
  // Base prompts locked (you can tune wording later)
  const BASE: Record<string, string> = {
    "neon-tech-outline":
      "Futuristic neon tech outline animation over video, clean glowing lines tracing key elements only, dark background, premium AI SaaS aesthetic, smooth controlled motion.",
    "ui-highlight":
      "Clean UI highlight animation over software interface video, soft glow focus on key actions and buttons, smooth zoom and emphasis, professional and readable SaaS demo style.",
    "abstract-data-flow":
      "Abstract data flow animation over video, glowing particles and thin lines representing AI processing, smooth convergence toward a clear output, intelligent and trustworthy motion.",
    "minimal-line-art":
      "Minimal line art animation over video, thin continuous lines subtly outlining key elements, clean professional tech branding, calm motion, trust-focused visual language.",
    "smart-callout":
      "Smart callout animation over video, clean directional indicators pointing to the call-to-action, subtle glow and motion, modern SaaS conversion style, clear visual hierarchy.",
  };

  // Modifiers derived from settings (safe, controlled)
  const mods: string[] = [];

  if (presetSlug === "neon-tech-outline") {
    if (settings.neonColor) mods.push(`Neon color: ${settings.neonColor}.`);
    if (settings.intensity) mods.push(`Glow intensity: ${settings.intensity}%.`);
    if (settings.focus) mods.push(`Focus zone: ${settings.focus}.`);
    if (settings.speed) mods.push(`Animation speed: ${settings.speed}.`);
  }

  if (presetSlug === "ui-highlight") {
    if (settings.focusIntensity) mods.push(`Focus intensity: ${settings.focusIntensity}.`);
    if (settings.demoPacing) mods.push(`Demo pacing: ${settings.demoPacing}.`);
    if (settings.accentStyle) mods.push(`Accent style: ${settings.accentStyle}.`);
  }

  if (presetSlug === "abstract-data-flow") {
    if (settings.complexity) mods.push(`Flow complexity: ${settings.complexity}.`);
    if (settings.output) mods.push(`Output type: ${settings.output}.`);
    if (settings.speed) mods.push(`Processing speed: ${settings.speed}.`);
  }

  if (presetSlug === "minimal-line-art") {
    if (settings.lineStyle) mods.push(`Line style: ${settings.lineStyle}.`);
    if (settings.contrast) mods.push(`Contrast: ${settings.contrast}.`);
    if (settings.motion) mods.push(`Animation: ${settings.motion}.`);
  }

  if (presetSlug === "smart-callout") {
    if (settings.ctaType) mods.push(`CTA target: ${settings.ctaType}.`);
    if (settings.direction) mods.push(`Direction: ${settings.direction}.`);
    if (settings.intensity) mods.push(`Intensity: ${settings.intensity}.`);
    if (settings.timing) mods.push(`Timing: ${settings.timing}.`);
  }

  const base = BASE[presetSlug] ?? "Premium mixed media video preset.";
  const negative = "No cartoon, no chaotic motion, no overexposed glow, keep it clean and premium.";
  return `${base}\n${mods.join(" ")}\n${negative}`;
}

function buildGeneratePayload(toolSlug: string, presetSlug: string, settings: Record<string, string | number>): GeneratePayload {
  return {
    tool: toolSlug,
    preset: presetSlug,
    settings,
  };
}


export type PresetItem = {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  tag_color: "sky" | "lime" | "neutral" | string;
  presetSlug: string;
  mediaUrl: string;   // mp4
  posterUrl?: string; // jpg optional
};

function Tag({ text, color }: { text: string; color: string }) {
  const cls =
    color === "lime" ? "tag tagLime" : color === "neutral" ? "tag" : "tag tagSky";
  return <div className={cls}>{text}</div>;
}

function HoverVideo({
  src,
  poster,
  active,
}: {
  src: string;
  poster?: string;
  active?: boolean; // selected preset = always playing
}) {
  const ref = useRef<HTMLVideoElement | null>(null);

  // Keep selected always playing
  useEffect(() => {
    const v = ref.current;
    if (!v) return;



    if (active) {
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      const p = v.play();
      // ignore autoplay errors silently
      if (p && typeof (p as any).catch === "function") (p as any).catch(() => { });
    } else {
      v.pause();
      try { v.currentTime = 0; } catch { }
    }
  }, [active]);

  const onEnter = () => {
    const v = ref.current;
    if (!v) return;
    if (active) return; // ✅ selected preset ignores hover

    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    const p = v.play();
    if (p && typeof (p as any).catch === "function") (p as any).catch(() => { });
  };

  const onLeave = () => {
    const v = ref.current;
    if (!v) return;
    if (active) return; // ✅ selected preset ignores hover

    v.pause();
    try { v.currentTime = 0; } catch { }
  };

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      preload="metadata"
      muted
      playsInline
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
    />
  );
}

export default function PresetBrowser({
  toolSlug,
  presets,
  selected,
}: {
  toolSlug: string;
  presets: PresetItem[];
  selected: PresetItem | null;
}) {
  // ✅ GUARD: tool slug must exist
  if (!toolSlug) {
    return (
      <main className="root">
        <div style={{ padding: 20, color: "white" }}>
          Tool slug missing.
        </div>
      </main>
    );
  }

  // ✅ Instant preset switch (no Next navigation)
  const initialSlug =
    selected?.presetSlug || presets[0]?.presetSlug || "";

  const [selectedSlug, setSelectedSlug] = useState<string>(initialSlug);

  // Keep selected preset in sync with URL when user uses back/forward
  useEffect(() => {
    const onPop = () => {
      const sp = new URLSearchParams(window.location.search);
      const slug = sp.get("preset") || presets[0]?.presetSlug || "";
      setSelectedSlug(slug);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [presets]);

  // If props.selected changes (rare), sync state
  useEffect(() => {
    if (selected?.presetSlug) setSelectedSlug(selected.presetSlug);
  }, [selected?.presetSlug]);

  const [tab, setTab] = useState<"presets" | "how" | "community">("presets");



  // ✅ values stored per preset (kept when switching)
  const [presetValues, setPresetValues] = useState<
    Record<string, Record<string, string | number>>
  >({});

  const activeConfig = PRESET_CONFIGS[selectedSlug];

  const activeValues: Record<string, string | number> = useMemo(() => {
    const defaults = activeConfig?.defaults ?? {};
    const saved = presetValues[selectedSlug] ?? {};
    return { ...defaults, ...saved };
  }, [activeConfig, presetValues, selectedSlug]);

  const setValue = (key: string, value: string | number) => {
    setPresetValues((prev) => ({
      ...prev,
      [selectedSlug]: {
        ...(prev[selectedSlug] ?? {}),
        [key]: value,
      },
    }));
  };

  const onGenerate = async () => {
    if (!selectedSlug) return;

    const payload = buildGeneratePayload(toolSlug, selectedSlug, activeValues);
    const prompt = buildPresetPrompt(selectedSlug, activeValues);

    // Add input_url if video was uploaded
    if (inputVideoUrl) {
      (payload as any).input_url = inputVideoUrl;
    }

    console.log("🚀 [Generate] Starting request with payload:", { ...payload, prompt });

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, prompt }),
      });

      console.log("📡 [Generate] Response status:", res.status, res.statusText);

      const raw = await res.text();
      console.log("📄 [Generate] Raw response:", raw);

      let json: any = null;

      try {
        json = raw ? JSON.parse(raw) : null;
        console.log("✅ [Generate] Parsed JSON:", json);
      } catch (parseError) {
        // If it's HTML (Next error page), show snippet
        console.error("❌ [Generate] Non-JSON response:", raw.slice(0, 300));
        alert(`API returned non-JSON (status ${res.status}). Check server logs.\n\n${raw.slice(0, 120)}...`);
        return;
      }

      if (!res.ok || !json?.ok) {
        console.error("❌ [Generate] Failed:", { status: res.status, json });
        alert(`Generate failed (status ${res.status}): ${json?.error ?? "unknown error"}`);
        return;
      }

      if (json?.ok && json?.generation?.id) {
        alert(`Queued ✅ id: ${json.generation.id}`);
        setLastGenerationId(json.generation.id);
        fetchRecent();
        console.log("✅ [Generate] Queued:", json.generation);
      } else {
        alert("Generate OK but missing generation.id — check response in console");
        console.log("⚠️ [Generate] Response:", json);
      }

    } catch (err: any) {
      console.error("💥 [Generate] Network error:", err);
      alert(`Network error: ${err?.message ?? "unknown"}`);
    }
  };

  const [lastGenerationId, setLastGenerationId] = useState<string | null>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // Video upload state
  const [inputVideo, setInputVideo] = useState<File | null>(null);
  const [inputVideoUrl, setInputVideoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processingJobs, setProcessingJobs] = useState<Set<string>>(new Set());

  const fetchRecent = async () => {
    setLoadingRecent(true);
    try {
      const res = await fetch("/api/generate/recent");
      const raw = await res.text();
      const json = raw ? JSON.parse(raw) : null;
      if (json?.ok) setRecent(json.items ?? []);
    } catch (e) {
      // silent
    } finally {
      setLoadingRecent(false);
    }
  };

  // Auto-trigger Edge Function for queued jobs
  const processQueuedJobs = async () => {
    const queuedJobs = recent.filter(
      (job) => job.status === "queued" && !processingJobs.has(job.id)
    );

    for (const job of queuedJobs) {
      // Mark as being processed to avoid duplicate calls
      setProcessingJobs((prev) => new Set(prev).add(job.id));

      try {
        console.log(`🚀 [Auto-process] Triggering Edge Function for job ${job.id}`);

        const res = await fetch(
          `https://dxerwqcmgmwhunglbkln.supabase.co/functions/v1/process-generation`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ generation_id: job.id }),
          }
        );

        if (res.ok) {
          console.log(`✅ [Auto-process] Job ${job.id} triggered successfully`);
        } else {
          console.warn(`⚠️ [Auto-process] Job ${job.id} trigger failed:`, res.status);
        }
      } catch (error) {
        console.error(`❌ [Auto-process] Error triggering job ${job.id}:`, error);
      }
    }
  };

  useEffect(() => {
    fetchRecent();
    const t = setInterval(fetchRecent, 2500);
    return () => clearInterval(t);
  }, []);

  // Auto-process queued jobs
  useEffect(() => {
    if (recent.length > 0) {
      processQueuedJobs();
    }
  }, [recent]);

  // Video upload with progress tracking
  const uploadWithProgress = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', 'dev-uploads');

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const result = JSON.parse(xhr.responseText);
          if (result.ok) {
            resolve(result.url);
          } else {
            reject(new Error(result.error || 'Upload failed'));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));

      xhr.open('POST', '/api/upload-video');
      xhr.send(formData);
    });
  };

  // Image upload for image-to-video generation
  const handleImageUpload = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    try {
      console.log('🖼️ Uploading image...', file.name, file.type, file.size);

      // Simple validation
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file (PNG, JPEG, etc.)');
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB max
        throw new Error('Image too large. Max 10MB');
      }

      setUploadProgress(20);

      // Upload image directly with progress tracking
      const url = await uploadWithProgress(file);

      console.log('✅ Image uploaded:', url);

      setInputVideoUrl(url);
      setInputVideo(file); // Store for preview

    } catch (error: any) {
      console.error('❌ Upload failed:', error);
      alert(error.message || 'Upload failed');
      setInputVideo(null);
      setInputVideoUrl(null);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeVideo = () => {
    setInputVideo(null);
    setInputVideoUrl(null);
  };

  const selectedPreset =
    presets.find((p) => p.presetSlug === selectedSlug) ?? selected ?? presets[0] ?? null;
  const [fadeKey, setFadeKey] = useState(0);

  useEffect(() => {
    // trigger a tiny transition each time preset changes
    setFadeKey((x) => x + 1);
  }, [selectedSlug]);

  const selectedId = selectedPreset?.id ?? "";
  const selectedTitle = selectedPreset?.title ?? "Preset";
  const selectedSubtitle = selectedPreset?.subtitle ?? "";

  // Blue DA (same spirit as your landing)
  return (
    <main className="root">
      <style>{`
        :root{
          --bg:#0b0b0b;
          --panel: rgba(255,255,255,.04);
          --panel2: rgba(255,255,255,.06);
          --border: rgba(255,255,255,.12);
          --textDim: rgba(255,255,255,.78);

          --sky:#00BCD4;
          --sky2:#00ACC1;
          --skyGlow: rgba(0,188,212,0.25);

          --lime:#00BCD4;
          --limeGlow: rgba(0,188,212,0.22);
        }
        *{box-sizing:border-box}
        a{color:inherit;text-decoration:none}
        button{font:inherit}
        .root{
          min-height:100vh;
          background: var(--bg);
          color:white;
        }

        .control{
  border:1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.04);
  border-radius: 14px;
  padding: 10px;
}
.controlTop{
  display:flex;
  align-items:baseline;
  justify-content:space-between;
  gap:10px;
  margin-bottom: 8px;
}
.controlLabel{
  font-size:12px;
  font-weight:950;
  opacity:.95;
}
.controlHelp{
  font-size:11px;
  opacity:.62;
  line-height:1.2;
}
.controlValue{
  font-size:11px;
  opacity:.75;
}
.controlSelect{
  width:100%;
  border-radius: 12px;
  border:1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.25);
  color:white;
  padding: 10px;
  font-size:12px;
  outline:none;
}
.controlSelect:focus{
  border-color: rgba(56,189,248,.35);
  box-shadow: 0 0 0 6px var(--skyGlow);
}
.controlRange{
  width:100%;
}

        

        .fadeIn{
          width:100%;
          height:100%;
          animation: fadeIn .18s ease;
        }

        @keyframes fadeIn{
         from{opacity:.45; transform: scale(0.995);}
         to{opacity:1; transform: scale(1);}
        }

        button.card{
         padding: 0;
         border: 1px solid rgba(255,255,255,.12);
         background: rgba(255,255,255,.03);
        }

        .wrap{
          width:min(1300px, 94vw);
          margin:0 auto;
          padding: 16px 0 40px;
        }

        /* Topbar */
        .top{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          flex-wrap:wrap;
          padding: 10px 0 14px;
        }
        .crumb{
          display:flex; align-items:center; gap:10px;
          opacity:.9; font-size:12px;
        }
        .pill{
          display:inline-flex; align-items:center; gap:8px;
          padding: 8px 10px;
          border-radius: 999px;
          border:1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.04);
          font-size: 12px;
        }
        .dot{
          width:8px;height:8px;border-radius:999px;
          background: var(--sky);
          box-shadow: 0 0 0 6px var(--skyGlow);
        }
        .btn{
          display:inline-flex; align-items:center; justify-content:center;
          padding:10px 12px; border-radius:14px;
          border:1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.06);
          font-weight:900; font-size:12px;
          cursor:pointer;
        }
        .btn:hover{border-color: rgba(56,189,248,.35); box-shadow: 0 0 0 6px var(--skyGlow);}
        .btnPrimary{
          background: var(--sky);
          color:#ffffff;
          border-color: rgba(255,255,255,.06);
          box-shadow: 0 12px 34px var(--skyGlow);
        }
        .btnPrimary:hover{background: var(--sky2); box-shadow: 0 16px 44px var(--skyGlow);}

        /* Layout */
        .layout{
          display:grid;
          grid-template-columns: 320px 1fr;
          gap: 14px;
          align-items:start;
        }

        /* Left panel */
        .left{
          position: sticky;
          top: 12px;
          border:1px solid rgba(255,255,255,.12);
          background: linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.03));
          border-radius: 18px;
          overflow:hidden;
        }
        .leftHeader{
          padding: 12px;
          border-bottom: 1px solid rgba(255,255,255,.10);
          display:flex; align-items:center; justify-content:space-between; gap:10px;
        }
        .leftTitle{
          display:flex; flex-direction:column; gap:4px;
        }
        .leftTitle strong{font-size:13px; font-weight:950;}
        .leftTitle span{font-size:12px; opacity:.75; line-height:1.35}
        .leftPreview{
          height: 160px;
          background: rgba(0,0,0,.25);
          border-bottom: 1px solid rgba(255,255,255,.10);
          position:relative;
        }
        .leftPreview:after{
          content:"";
          position:absolute; inset:0;
          background: radial-gradient(circle at 20% 0%, rgba(0,188,212,.18), transparent 60%);
          pointer-events:none;
        }

        .leftBody{padding: 12px;}
        .upload{
          border:1px dashed rgba(255,255,255,.18);
          background: rgba(255,255,255,.03);
          border-radius: 16px;
          padding: 14px;
          text-align:center;
          font-size:12px;
          opacity:.85;
        }
        .row{
          margin-top: 10px;
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap:10px;
        }
        .select{
          border:1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.04);
          border-radius: 14px;
          padding: 10px;
          font-size:12px;
          display:flex; justify-content:space-between; align-items:center;
          opacity:.95;
        }
        .gen{
          margin-top: 12px;
          width:100%;
          border:none;
          padding: 12px 14px;
          border-radius: 14px;
          background: var(--lime);
          color:#ffffff;
          font-weight: 950;
          cursor:pointer;
          box-shadow: 0 12px 34px var(--limeGlow);
        }
        .gen:hover{filter: brightness(1.03);}

        /* Center */
        .center{
          border:1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.02);
          border-radius: 18px;
          padding: 12px;
        }
        .tabs{
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          align-items:center;
          margin-bottom: 12px;
        }
        .tab{
          padding: 8px 10px;
          border-radius: 999px;
          border:1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.03);
          font-size:12px;
          opacity:.86;
          cursor:pointer;
        }
        .tabActive{
          opacity: 1;
          border-color: rgba(56,189,248,.35);
          box-shadow: 0 0 0 6px var(--skyGlow);
        }

        /* Preset grid */
        .grid{
          display:grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .card{
          border:1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.03);
          border-radius: 18px;
          overflow:hidden;
          position:relative;
          transition: .18s ease;
        }
        .card:hover{
          border-color: rgba(56,189,248,.32);
          box-shadow: 0 0 0 6px var(--skyGlow);
          transform: translateY(-1px);
        }
        .cardSelected{
          border-color: rgba(56,189,248,.55);
          box-shadow: 0 0 0 8px rgba(56,189,248,.14);
        }
        .media{
          height: 150px;
          position: relative;
          background: linear-gradient(135deg, rgba(255,255,255,.06), rgba(255,255,255,.02));
          border-bottom: 1px solid rgba(255,255,255,.10);
        }
        .media:after{
          content:"";
          position:absolute; inset:0;
          background: radial-gradient(circle at 20% 0%, rgba(0,188,212,.18), transparent 60%);
          pointer-events:none;
          z-index:1;
          opacity: 0.6;
        }
        .body{padding: 12px;}
        .title{font-weight:950; font-size:13px; color:#ffffff;}
        .desc{margin-top:6px; font-size:12px; opacity:.75; line-height:1.35; color:#ffffff;}
        .meta{margin-top:10px; display:flex; align-items:center; justify-content:space-between; font-size:12px; opacity:.78;}
        .tag{
          position:absolute; top:12px; left:12px;
          font-size:11px; font-weight:950;
          padding:6px 8px; border-radius:999px;
          border:1px solid rgba(255,255,255,.14);
          background: rgba(0,0,0,.35);
          z-index: 2;
        }
        .tagSky{color: var(--sky);}
        .tagLime{color: var(--lime); border-color: rgba(215,255,47,.22);}

        /* Responsive */
        @media (max-width: 1020px){
          .layout{grid-template-columns: 1fr; }
          .left{position: relative; top:auto;}
          .grid{grid-template-columns: repeat(2, minmax(0, 1fr));}
        }
        @media (max-width: 640px){
          .wrap{width:min(980px, 92vw)}
          .grid{grid-template-columns: 1fr;}
          .media{height: 170px;}
          .leftPreview{height: 190px;}
          .row{grid-template-columns: 1fr;}
        }
      `}</style>

      <div className="wrap">
        <div className="top">
          <div className="crumb">
            <span className="pill"><span className="dot" /> Tool</span>
            <span style={{ opacity: 0.75 }}>/</span>
            <strong style={{ fontSize: 12 }}>{toolSlug}</strong>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="btn" href="/">Back to landing</Link>
            <Link className="btn btnPrimary" href={`/tool/${toolSlug}?preset=${presets[0]?.presetSlug ?? ""}`}>
              All presets →
            </Link>
          </div>
        </div>

        <div className="layout">
          {/* LEFT */}
          <aside className="left">
            <div className="leftPreview">
              {selectedPreset?.mediaUrl ? (
                <div key={fadeKey} className="fadeIn">
                  <HoverVideo
                    src={selectedPreset.mediaUrl}
                    poster={selectedPreset.posterUrl}
                    active={true}
                  />
                </div>
              ) : null}
            </div>

            <div className="leftHeader">
              <div className="leftTitle">
                <strong>{selectedTitle}</strong>
                <span>{selectedSubtitle}</span>
              </div>
              <span className="pill" style={{ opacity: 0.9 }}>Active</span>
            </div>

            <div className="leftBody">
              <div className="upload">
                Upload video to edit
                <div style={{ marginTop: 6, opacity: 0.7 }}>Duration required: 1–10 seconds</div>
              </div>

              <div className="row">
                <div className="select">
                  <span>Frame rate</span>
                  <strong>8 FPS</strong>
                </div>
                <div className="select">
                  <span>Resolution</span>
                  <strong>1K</strong>
                </div>
              </div>

              {/* ✅ Preset controls */}
              {activeConfig && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 950, fontSize: 12, marginBottom: 8, opacity: 0.95 }}>
                    Preset settings
                  </div>

                  <div style={{ display: "grid", gap: 10 }}>
                    {activeConfig.controls.map((c) => {
                      const v = activeValues[c.key];

                      if (c.type === "select") {
                        return (
                          <div key={c.key} className="control">
                            <div className="controlTop">
                              <span className="controlLabel">{c.label}</span>
                              {c.help ? <span className="controlHelp">{c.help}</span> : null}
                            </div>

                            <select
                              className="controlSelect"
                              value={String(v ?? "")}
                              onChange={(e) => setValue(c.key, e.target.value)}
                            >
                              {c.options.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      }

                      // slider
                      return (
                        <div key={c.key} className="control">
                          <div className="controlTop">
                            <span className="controlLabel">{c.label}</span>
                            <span className="controlValue">
                              {Number(v ?? c.min)}
                              {c.unit ?? ""}
                            </span>
                          </div>

                          <input
                            className="controlRange"
                            type="range"
                            min={c.min}
                            max={c.max}
                            step={c.step}
                            value={Number(v ?? c.min)}
                            onChange={(e) => setValue(c.key, Number(e.target.value))}
                          />

                          {c.help ? <div className="controlHelp" style={{ marginTop: 6 }}>{c.help}</div> : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}


              {/* Image Upload Section */}
              <div style={{ marginBottom: 20, marginTop: 20 }}>
                <div style={{ fontWeight: 950, fontSize: 13, marginBottom: 8 }}>
                  🖼️ Reference Image (Optional)
                </div>
                <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 12 }}>
                  Upload an image to use as visual reference for generation
                </div>

                {!inputVideo ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    style={{
                      border: '2px dashed rgba(255,255,255,0.2)',
                      borderRadius: 12,
                      padding: '30px 20px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      background: 'rgba(255,255,255,0.02)',
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      {uploading ? `Uploading... ${uploadProgress}%` : 'Click or drag image here'}
                    </div>
                    {uploading && (
                      <div style={{
                        marginTop: 12,
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: 8,
                        overflow: 'hidden',
                        height: 6,
                      }}>
                        <div style={{
                          height: '100%',
                          background: "linear-gradient(90deg, #00BCD4, #00E5FF)",
                          width: `${uploadProgress}%`,
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                    )}
                    <div style={{ fontSize: 10, opacity: 0.6 }}>
                      PNG, JPEG, WebP • Max 10MB
                    </div>
                  </div>
                ) : (
                  <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: 'rgba(0,0,0,0.3)' }}>
                    <img
                      src={URL.createObjectURL(inputVideo)}
                      alt="Reference"
                      style={{
                        width: '100%',
                        height: 200,
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                    <div style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 11, opacity: 0.8 }}>{inputVideo.name}</div>
                      <button
                        onClick={removeVideo}
                        style={{
                          background: 'rgba(255,0,0,0.2)',
                          border: '1px solid rgba(255,0,0,0.4)',
                          color: '#ff6b6b',
                          padding: '6px 12px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button className="gen" onClick={onGenerate}>
                Generate ✦
              </button>
              <div style={{ marginTop: 14 }}>
                <div style={{ fontWeight: 950, fontSize: 12, opacity: 0.95 }}>
                  Generation status
                </div>

                <div style={{ marginTop: 8, fontSize: 11, opacity: 0.7, lineHeight: 1.4 }}>
                  ✨ Auto-processing enabled — jobs process automatically
                </div>

                {lastGenerationId ? (
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                    Last job: <span style={{ color: "var(--sky)" }}>{lastGenerationId}</span>
                  </div>
                ) : (
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.6 }}>
                    No job yet
                  </div>
                )}

                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {(recent ?? []).slice(0, 6).map((g) => (
                    <div
                      key={g.id}
                      style={{
                        border: "1px solid rgba(255,255,255,.10)",
                        background: "rgba(255,255,255,.03)",
                        borderRadius: 14,
                        padding: 10,
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 900, fontSize: 12 }}>
                          {g.preset}
                        </div>
                        <div style={{ marginTop: 4, fontSize: 11, opacity: 0.65 }}>
                          {new Date(g.created_at).toLocaleString()}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 900,
                            color:
                              g.status === "ready"
                                ? "var(--lime)"
                                : g.status === "failed"
                                  ? "#ff6b6b"
                                  : "var(--sky)",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            justifyContent: "flex-end",
                          }}
                        >
                          {/* Loading spinner for queued/processing */}
                          {(g.status === "queued" || g.status === "processing") && (
                            <span
                              style={{
                                display: "inline-block",
                                width: 12,
                                height: 12,
                                border: "2px solid var(--sky)",
                                borderTopColor: "transparent",
                                borderRadius: "50%",
                                animation: "spin 1s linear infinite",
                              }}
                            />
                          )}
                          <span>
                            {g.status === "queued" && "⏳ waiting..."}
                            {g.status === "processing" && "⚙️ generating..."}
                            {g.status === "ready" && "✅ ready"}
                            {g.status === "failed" && "❌ failed"}
                          </span>
                        </div>

                        {g.status === "ready" && g.output_url ? (
                          <a
                            href={g.output_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: "inline-flex",
                              marginTop: 6,
                              fontSize: 11,
                              fontWeight: 900,
                              color: "var(--lime)",
                              textDecoration: "none",
                            }}
                          >
                            View result →
                          </a>
                        ) : null}

                        {g.status === "failed" && g.error ? (
                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 10,
                              opacity: 0.7,
                              maxWidth: 150,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={g.error}
                          >
                            {g.error}
                          </div>
                        ) : null}

                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 8, fontSize: 11, opacity: 0.55 }}>
                  {loadingRecent ? "Refreshing…" : "Auto-refresh every 2.5s"}
                </div>
              </div>




              <div style={{ marginTop: 10, fontSize: 11, opacity: 0.6, lineHeight: 1.4 }}>
                Tip: Hover a preset to preview. Selected preset stays playing.
              </div>
            </div>
          </aside>

          {/* CENTER */}
          <section className="center">
            <div className="tabs">
              <button
                className={`tab ${tab === "presets" ? "tabActive" : ""}`}
                onClick={() => setTab("presets")}

              >
                All Presets
              </button>
              <button
                className={`tab ${tab === "how" ? "tabActive" : ""}`}
                onClick={() => setTab("how")}
              >
                How it works
              </button>
              <button
                className={`tab ${tab === "community" ? "tabActive" : ""}`}
                onClick={() => setTab("community")}
              >
                Community
              </button>
            </div>

            {tab === "presets" ? (
              <div className="grid">
                {presets.map((p) => {
                  const isSelected = p.id === selectedId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`card ${isSelected ? "cardSelected" : ""}`}
                      aria-current={isSelected ? "true" : "false"}

                      // ✅ PRELOAD VIDEO ON HOVER / FOCUS
                      onMouseEnter={() => preloadVideo(p.mediaUrl)}
                      onFocus={() => preloadVideo(p.mediaUrl)}

                      // ✅ INSTANT PRESET SWITCH
                      onClick={() => {
                        if (p.presetSlug === selectedSlug) return;

                        setSelectedSlug(p.presetSlug);

                        const url = `/tool/${toolSlug}?preset=${p.presetSlug}`;
                        window.history.pushState({ preset: p.presetSlug }, "", url);
                      }}

                      style={{ textAlign: "left", cursor: "pointer" }}
                    >

                      {p.tag ? (
                        <div className={`tag ${p.tag_color === "lime" ? "tagLime" : "tagSky"}`}>
                          {p.tag}
                        </div>
                      ) : null}

                      <div className="media">
                        <HoverVideo
                          src={p.mediaUrl}
                          poster={p.posterUrl}
                          active={isSelected}
                        />
                      </div>

                      <div className="body">
                        <div className="title">{p.title}</div>
                        <div className="desc">{p.subtitle}</div>
                        <div className="meta">
                          <span style={{ opacity: 0.7 }}>Preset</span>
                          <span style={{ opacity: 0.9 }}>→</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : tab === "how" ? (
              <div style={{ padding: 8, fontSize: 13, opacity: 0.8, lineHeight: 1.6 }}>
                Upload → Pick a preset → Adjust safe controls → Generate → Export.
                <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
                  Presets are controlled to keep your brand consistent.
                </div>
              </div>
            ) : (
              <div style={{ padding: 8, fontSize: 13, opacity: 0.8, lineHeight: 1.6 }}>
                Community coming soon.
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
