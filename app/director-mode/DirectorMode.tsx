"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { DIRECTORS } from "@/lib/cinema";
import {
  CAMERAS,
  LENSES,
  FOCAL_LENGTHS,
  APERTURES,
  QUALITIES,
  BATCHES,
  ASPECT_RATIOS,
  CINEMATIC_DEFAULTS
} from "@/lib/cinema/cinematic-setup.config";
import { buildPrompt } from "@/lib/presets/utils";
import Step3BridgeToVideo from "./Step3BridgeToVideo";
import { Scene, RenderJob } from "@/lib/types/director-mode";
import { DIRECTOR_TEMPLATES } from "@/lib/templates/director-templates";

type Asset = {
  id: string;
  kind: "image" | "video";
  role: string;
  status: "pending" | "ready" | "failed" | "queued" | "generating";
  storage_bucket: string;
  storage_path: string | null;
  mime_type: string | null;
  meta: any;
  created_at: string;
};

type AssetWithUrl = Asset & { signedUrl: string | null };

// Step 3 - Video movements
const CAMERA_MOVEMENTS = [
  "static", "handheld", "zoom_in", "zoom_out", "camera_follows",
  "pan_left", "pan_right", "tilt_up", "tilt_down", "orbit_around",
  "dolly_in", "dolly_out", "jib_up", "jib_down", "drone_shot", "360_roll"
] as const;

const MOVEMENT_LABELS: Record<typeof CAMERA_MOVEMENTS[number], string> = {
  static: "Static",
  handheld: "Handheld",
  zoom_in: "Zoom In",
  zoom_out: "Zoom Out",
  camera_follows: "Camera Follows",
  pan_left: "Pan Left",
  pan_right: "Pan Right",
  tilt_up: "Tilt Up",
  tilt_down: "Tilt Down",
  orbit_around: "Orbit Around",
  dolly_in: "Dolly In",
  dolly_out: "Dolly Out",
  jib_up: "Jib Up",
  jib_down: "Jib Down",
  drone_shot: "Drone Shot",
  "360_roll": "360 Roll"
};

const VIDEO_DURATIONS = [6, 10] as const;
const VIDEO_BATCHES = [1, 2, 3, 4] as const;

export default function DirectorMode() {
  const supabase = supabaseBrowser();

  // Project state
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Array<{ id: string; product_name: string; created_at: string }>>([])
  const [newProjectName, setNewProjectName] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

  // Step state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1 data
  const [scenePrompt, setScenePrompt] = useState("");
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [selectedDirector, setSelectedDirector] = useState("nolan");

  // Multi-scene extension (additive)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [sceneCount, setSceneCount] = useState<number>(1);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [currentSceneIndex, setCurrentSceneIndex] = useState<number>(0);
  const [storyboardMode, setStoryboardMode] = useState(false);
  const [renderQueue, setRenderQueue] = useState<RenderJob[]>([]);

  // Step 2 data
  const [camera, setCamera] = useState("red_vraptor");
  const [lens, setLens] = useState("cooke_s4");
  const [focal, setFocal] = useState("35mm");
  const [aperture, setAperture] = useState("f4");
  const [quality, setQuality] = useState<(typeof QUALITIES)[number]>("2K");
  const [batchSize, setBatchSize] = useState<(typeof BATCHES)[number]>(4);

  // Step 3 data - Bridge to Video
  const [selectedMovement, setSelectedMovement] = useState<typeof CAMERA_MOVEMENTS[number]>("static");
  const [aspectRatio, setAspectRatio] = useState<typeof ASPECT_RATIOS[number]>("21:9");
  const [videoDuration, setVideoDuration] = useState<typeof VIDEO_DURATIONS[number]>(6);
  const [qualityMode, setQualityMode] = useState<"preview" | "final">("preview");
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [slowMotion, setSlowMotion] = useState(false);
  const [videoBatch, setVideoBatch] = useState<typeof VIDEO_BATCHES[number]>(1);
  const [anchorAsset, setAnchorAsset] = useState<AssetWithUrl | null>(null);

  // Assets & UI
  const [assets, setAssets] = useState<AssetWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Video Status Tracking
  const [videoAssets, setVideoAssets] = useState<string[]>([]);
  const [videoStatuses, setVideoStatuses] = useState<Record<string, string>>({});
  const [pollingActive, setPollingActive] = useState(false);

  // Viewer
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [specsExpanded, setSpecsExpanded] = useState(false);

  const displayedAssets = useMemo(() => assets.slice(0, 12), [assets]);
  const director = DIRECTORS[selectedDirector];

  // Utilities
  function downloadUrl(url: string, filename = "asset.png") {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noreferrer";
    a.click();
  }

  function openViewer(index: number) {
    setViewerIndex(index);
    setViewerOpen(true);
  }

  function closeViewer() {
    setViewerOpen(false);
  }

  function prevViewer() {
    setViewerIndex((i) => (i - 1 + displayedAssets.length) % displayedAssets.length);
  }

  function nextViewer() {
    setViewerIndex((i) => (i + 1) % displayedAssets.length);
  }

  useEffect(() => {
    if (!viewerOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeViewer();
      if (e.key === "ArrowLeft") prevViewer();
      if (e.key === "ArrowRight") nextViewer();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewerOpen, displayedAssets.length]);

  async function ensureAuth() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user) {
      window.location.href = "/auth";
      return null;
    }
    return data.user;
  }

  async function signedUrl(bucket: string, path: string) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
    if (error) return null;
    return data.signedUrl;
  }

  async function loadProjects() {
    const user = await ensureAuth();
    if (!user) return;

    const { data, error } = await supabase
      .from("projects")
      .select("id, product_name, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setProjects(data);
    }
  }

  async function createProject() {
    if (!newProjectName.trim()) {
      alert("Please enter a project name");
      return;
    }

    setCreatingProject(true);
    try {
      const user = await ensureAuth();
      if (!user) return;

      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          product_name: newProjectName.trim(),
          status: "new",
        })
        .select("id, product_name, created_at")
        .single();

      if (error) throw error;

      setProjectId(data.id);
      setNewProjectName("");
      await loadProjects();
    } catch (error: any) {
      alert(error?.message ?? "Failed to create project");
    } finally {
      setCreatingProject(false);
    }
  }

  async function loadAssets() {
    const user = await ensureAuth();
    if (!user) return;

    const { data: a, error: aErr } = await supabase
      .from("assets")
      .select("id, kind, role, status, storage_bucket, storage_path, public_url, mime_type, meta, created_at")
      .eq("user_id", user.id)
      .eq("kind", "image")
      .order("created_at", { ascending: false });

    if (aErr) throw aErr;

    // Filter for Director Mode assets (check meta.isDirectorMode)
    const rows = ((a ?? []) as Asset[]).filter(asset => asset.meta?.isDirectorMode === true);

    const signedAssets = await Promise.all(
      rows.map(async (row: any) => {
        // R2 assets: use public_url directly
        if (row.public_url) {
          const thumbnailUrl = row.meta?.thumbnail_url || null;
          return { ...row, signedUrl: row.public_url, thumbnailUrl } as AssetWithUrl & { thumbnailUrl: string | null };
        }

        // Legacy Supabase Storage assets: generate signed URLs
        if (!row.storage_path) return { ...row, signedUrl: null, thumbnailUrl: null } as AssetWithUrl & { thumbnailUrl: string | null };

        const url = await signedUrl(row.storage_bucket || "assets", row.storage_path);

        let thumbUrl = null;
        try {
          const thumbPath = row.storage_path.replace('.png', '_thumb.png');
          thumbUrl = await signedUrl(row.storage_bucket || "assets", thumbPath);
        } catch (error) { }

        return { ...row, signedUrl: url, thumbnailUrl: thumbUrl } as AssetWithUrl & { thumbnailUrl: string | null };
      })
    );

    setAssets(signedAssets as any);
  }

  useEffect(() => {
    (async () => {
      setMsg(null);
      setLoading(true);
      try {
        await Promise.all([loadAssets(), loadProjects()]);
      } catch (e: any) {
        setMsg(e?.message ?? "Boot error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadAssets().catch(() => { });
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Poll video statuses
  useEffect(() => {
    if (!pollingActive || videoAssets.length === 0) return;

    const pollVideos = async () => {
      try {
        const { data, error } = await supabase
          .from('assets')
          .select('id, status')
          .in('id', videoAssets)
          .eq('kind', 'video');

        if (error) throw error;

        const newStatuses: Record<string, string> = {};
        let allComplete = true;

        data?.forEach((asset: any) => {
          const mappedStatus = mapAssetStatusToDisplay(asset.status);
          newStatuses[asset.id] = mappedStatus;

          if (mappedStatus !== 'Success' && mappedStatus !== 'Failed') {
            allComplete = false;
          }
        });

        setVideoStatuses(prev => ({ ...prev, ...newStatuses }));

        // Stop polling when all complete
        if (allComplete) {
          setPollingActive(false);
        }
      } catch (err) {
        console.error('Video polling error:', err);
      }
    };

    const interval = setInterval(pollVideos, 3000); // Poll every 3s
    pollVideos(); // Initial poll

    return () => clearInterval(interval);
  }, [pollingActive, videoAssets]);

  // Helper: Map DB status to display status
  function mapAssetStatusToDisplay(dbStatus: string): string {
    switch (dbStatus) {
      case 'queued': return 'Queueing';
      case 'generating': return 'Processing';
      case 'ready': return 'Success';
      case 'failed': return 'Failed';
      default: return 'Preparing';
    }
  }


  const stats = useMemo(() => {
    const recent = assets.slice(0, 24);
    const total = recent.length;
    const pending = recent.filter((a) => a.status === "pending" || a.status === "queued").length;
    const generating = recent.filter((a) => a.status === "generating").length;
    const ready = recent.filter((a) => a.status === "ready").length;
    const failed = recent.filter((a) => a.status === "failed").length;
    const runningAI = pending > 0 || generating > 0;
    return { total, pending, generating, ready, failed, runningAI };
  }, [assets]);

  function handleNextStep() {
    if (!scenePrompt.trim()) {
      alert("Please describe your scene");
      return;
    }

    // Generate scenes based on template selection (additive logic)
    if (selectedTemplate && DIRECTOR_TEMPLATES[selectedTemplate]) {
      const template = DIRECTOR_TEMPLATES[selectedTemplate];

      // For custom template, use sceneCount; otherwise use template definition
      const scenesToGenerate = selectedTemplate === 'custom'
        ? sceneCount
        : template.sceneCount;

      const generatedScenes: Scene[] = [];

      for (let i = 0; i < scenesToGenerate; i++) {
        const templateScene = template.scenes[i];
        generatedScenes.push({
          id: `scene-${Date.now()}-${i}`,
          projectId: projectId || '',
          index: i,
          intent: templateScene?.intent || `Scene ${i + 1}`,
          recommendedDuration: templateScene?.duration || 6,
          recommendedMovement: templateScene?.movement || 'static',
          status: 'pending',
          createdAt: new Date().toISOString(),
        });
      }

      setScenes(generatedScenes);
      setCurrentSceneIndex(0);
    } else {
      // Single scene (default behavior - backward compatible)
      setScenes([{
        id: `scene-${Date.now()}-0`,
        projectId: projectId || '',
        index: 0,
        intent: scenePrompt,
        recommendedDuration: 6,
        recommendedMovement: 'static',
        status: 'pending',
        createdAt: new Date().toISOString(),
      }]);
      setCurrentSceneIndex(0);
    }

    setCurrentStep(2);
  }

  function handleBackToStep1() {
    setCurrentStep(1);
  }

  async function handleShootPreviews() {
    if (!scenePrompt.trim()) {
      alert("Please describe your scene");
      return;
    }

    setGenerating(true);

    try {
      const user = await ensureAuth();
      if (!user) return;

      const directorPrompt = DIRECTORS[selectedDirector].prompt;
      const cameraPrompt = CAMERAS[camera].prompt;
      const lensPrompt = LENSES[lens].prompt;
      const focalPrompt = FOCAL_LENGTHS[focal].prompt;
      const aperturePrompt = APERTURES[aperture].prompt;

      const cinemaParts = [directorPrompt, cameraPrompt, lensPrompt, focalPrompt, aperturePrompt];
      const negative = "No amateur footage, no shaky cam, no overexposed highlights, no digital noise, no cheap effects, maintain cinematic quality and coherence.";
      const cinemaPrompt = buildPrompt(cinemaParts, negative);

      const fullPrompt = `${scenePrompt.trim()}\\n\\n${cinemaPrompt}`;

      let referenceImageUrl = null;
      if (referenceImage) {
        try {
          const fileName = `director-mode/${user.id}/${Date.now()}_${referenceImage.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("assets")
            .upload(fileName, referenceImage);

          if (uploadError) {
            console.warn("Reference image upload failed:", uploadError);
            // Continue without reference image
          } else {
            const { data: urlData } = await supabase.storage
              .from("assets")
              .createSignedUrl(uploadData.path, 60 * 60);

            if (urlData) referenceImageUrl = urlData.signedUrl;
          }
        } catch (err) {
          console.warn("Reference image upload error:", err);
          // Continue without reference image
        }
      }

      // Storyboard Mode: Generate narrative progression prompts
      let promptsToSend: string | string[] = fullPrompt;
      let storyboardMetadata = {};

      if (storyboardMode && scenes.length > 1) {
        // Generate distinct narrative beat prompts for each scene
        const narrativePrompts = scenes.map((scene, index) => {
          const beatNumber = index + 1;
          const totalBeats = scenes.length;

          // Temporal progression instruction
          const progressionInstruction = `[NARRATIVE BEAT ${beatNumber}/${totalBeats}: ${scene.intent}] This is a DISTINCT moment in time. Show a NEW action, emotion, or situation. Do NOT repeat previous beats. Maintain character and environment consistency but CHANGE the moment being depicted.`;

          // Inject progression instruction before cinema prompt
          return `${scenePrompt.trim()}\n\n${progressionInstruction}\n\n${cinemaPrompt}`;
        });

        promptsToSend = narrativePrompts;
        storyboardMetadata = {
          storyboard_mode: 'narrative',
          beat_enforcement: 'strict',
          temporal_progression: 'required',
          angle_variation_only: 'forbidden',
          scene_intents: scenes.map(s => s.intent),
        };
      }

      const response = await fetch("/api/generate/images/director-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptsToSend,
          referenceImage: referenceImageUrl,
          ratio: "21:9",
          quality,
          batchSize: storyboardMode && scenes.length > 1 ? scenes.length : batchSize,
          projectId: projectId || undefined, // Pass projectId if selected
          meta: {
            director: selectedDirector,
            camera,
            lens,
            focal,
            aperture,
            scenePrompt,
            ...storyboardMetadata,
          },
        }),
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json?.error ?? "Generation failed");
      }

      setMsg("🎬 Shooting previews... Your cinematic frames will appear shortly.");
    } catch (error: any) {
      console.error(error);
      setMsg(error?.message ?? "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateVideo() {
    if (!anchorAsset) {
      alert("Please select an anchor frame first");
      return;
    }

    if (!projectId) {
      alert("Please select a project first");
      return;
    }

    setGenerating(true);

    try {
      const user = await ensureAuth();
      if (!user) return;

      // Build movement prompt
      const movementData = CAMERA_MOVEMENTS.find(m => m === selectedMovement);
      const movementPrompt = movementData ? MOVEMENT_LABELS[movementData] : "Static";

      // Build final prompt (combine scene prompt + cinema settings + movement)
      const directorPrompt = DIRECTORS[selectedDirector].prompt;
      const cameraPrompt = CAMERAS[camera].prompt;
      const finalPrompt = `${scenePrompt.trim()}\n\nCinematic Style: ${directorPrompt}\nCamera: ${cameraPrompt}\nMovement: ${movementPrompt}`;

      const response = await fetch("/api/generate/videos/minimax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          anchorAssetId: anchorAsset.id,
          prompt: finalPrompt,
          movement: movementPrompt,
          duration: videoDuration,
          aspectRatio,
          qualityMode,
        }),
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json?.error ?? "Video generation failed");
      }

      const result = await response.json();

      // Track the video asset for status updates
      if (result.assetId) {
        setVideoAssets(prev => [...prev, result.assetId]);
        setVideoStatuses(prev => ({ ...prev, [result.assetId]: 'Preparing' }));
        setPollingActive(true);
      }

      setMsg(`🎬 Video generation started! Quality: ${qualityMode === "preview" ? "Preview (Fast)" : "Final (Max Quality)"}. Check the Asset Library in a few minutes.`);
    } catch (error: any) {
      console.error(error);
      setMsg(error?.message ?? "Video generation failed");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="loadingScreen">
        <div className="spin" />
        <div style={{ marginTop: "16px", fontSize: "14px", opacity: 0.7 }}>Loading Director Mode...</div>
        <style>{`
          .loadingScreen {
            min-height: 100vh;
            background: #0b0b0b;
            color: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            justifyContent: center;
          }
          .spin {
            width: 24px;
            height: 24px;
            border: 3px solid rgba(255,255,255,.15);
            border-top-color: #FFA726;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          
          @keyframes pulse-glow {
            0%, 100% { 
              opacity: 1;
              box-shadow: 0 0 20px rgba(255, 167, 38, 0.3);
            }
            50% { 
              opacity: 0.85;
              box-shadow: 0 0 30px rgba(255, 167, 38, 0.5);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0b0b0b", color: "white" }}>
      <style>{`
        :root {
          --bg: #0b0b0b;
          --panel: rgba(255,255,255,.04);
          --panel2: rgba(255,255,255,.06);
          --border: rgba(255,255,255,.12);
          --textDim: rgba(255,255,255,.78);
          --sky: #FFA726;
          --sky2: #FF8F00;
          --skyGlow: rgba(56,189,248,0.25);
          --gold: #FFA726;
          --goldGlow: rgba(255,167,38,0.2);
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* Premium Glassmorphism */
        .glass {
          background: linear-gradient(135deg, rgba(255,255,255,.08) 0%, rgba(255,255,255,.04) 100%);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,.15);
          box-shadow: 
            0 8px 32px rgba(0,0,0,.3),
            inset 0 1px 0 rgba(255,255,255,.1);
        }

        .glass-dark {
          background: linear-gradient(135deg, rgba(0,0,0,.4) 0%, rgba(0,0,0,.2) 100%);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,.1);
        }

        /* Premium Inputs */
        .premium-input {
          width: 100%;
          padding: 14px 16px;
          background: rgba(0,0,0,.3);
          border: 1px solid rgba(255,255,255,.15);
          border-radius: 12px;
          color: white;
          font-size: 14px;
          font-family: inherit;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .premium-input:focus {
          outline: none;
          border-color: var(--sky);
          box-shadow: 0 0 0 4px var(--skyGlow), 0 4px 12px rgba(0,0,0,.2);
          background: rgba(0,0,0,.4);
        }

        .premium-input::placeholder {
          color: rgba(255,255,255,.3);
        }

        .premium-select {
          width: 100%;
          padding: 14px 16px;
          background: rgba(0,0,0,.3);
          border: 1px solid rgba(255,255,255,.15);
          border-radius: 12px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%2338BDF8' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 16px center;
          padding-right: 40px;
        }

        .premium-select option {
          background: #1a1a1a;
          color: white;
          padding: 12px;
          font-weight: 600;
        }

        .premium-select:hover {
          border-color: rgba(56,189,248,.3);
          background: rgba(0,0,0,.4);
        }

        .premium-select:focus {
          outline: none;
          border-color: var(--sky);
          box-shadow: 0 0 0 4px var(--skyGlow);
        }

        /* Premium Buttons */
        .btn-premium {
          padding: 16px 32px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, var(--sky) 0%, var(--sky2) 100%);
          color: #001018;
          font-weight: 950;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 
            0 12px 34px var(--skyGlow),
            0 0 0 1px rgba(255,255,255,.1),
            inset 0 1px 0 rgba(255,255,255,.2);
          position: relative;
          overflow: hidden;
        }

        .btn-premium::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,.2) 0%, transparent 100%);
          opacity: 0;
          transition: opacity 0.3s;
        }

        .btn-premium:hover::before {
          opacity: 1;
        }

        .btn-premium:hover {
          transform: translateY(-2px);
          box-shadow: 
            0 16px 44px var(--skyGlow),
            0 0 0 1px rgba(255,255,255,.2),
            inset 0 1px 0 rgba(255,255,255,.3);
        }

        .btn-premium:active {
          transform: translateY(0);
        }

        .btn-premium:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .btn-secondary {
          padding: 12px 24px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.2);
          background: rgba(255,255,255,.06);
          color: white;
          font-weight: 900;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          border-color: rgba(255,255,255,.3);
          background: rgba(255,255,255,.1);
          transform: translateY(-1px);
        }

        /* Step Indicator */
        .step-indicator {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
        }

        .step-badge {
          padding: 12px 20px;
          border-radius: 14px;
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 1px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
        }

        .step-badge.active {
          background: linear-gradient(135deg, rgba(56,189,248,.2) 0%, rgba(56,189,248,.1) 100%);
          border: 1px solid rgba(56,189,248,.4);
          color: var(--sky);
          box-shadow: 0 4px 16px var(--skyGlow);
        }

        .step-badge.inactive {
          background: rgba(255,255,255,.03);
          border: 1px solid rgba(255,255,255,.08);
          color: rgba(255,255,255,.4);
        }

        .step-line {
          flex: 1;
          height: 2px;
          background: linear-gradient(90deg, rgba(56,189,248,.3) 0%, rgba(255,255,255,.1) 100%);
          border-radius: 1px;
        }

        /* Director Card */
        .director-card {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 32px;
          background: linear-gradient(135deg, rgba(255,167,38,.12) 0%, rgba(255,143,0,.08) 100%);
          border: 2px solid rgba(255,167,38,.3);
          border-radius: 20px;
          margin-top: 24px;
          box-shadow: 0 8px 32px rgba(255,167,38,.2), inset 0 1px 0 rgba(255,255,255,.1);
          position: relative;
          overflow: hidden;
        }

        .director-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--gold), transparent);
          opacity: 0.6;
        }

        .director-photo {
          width: 120px;
          height: 120px;
          border-radius: 16px;
          object-fit: cover;
          border: 3px solid rgba(255,167,38,.6);
          box-shadow: 0 8px 24px rgba(255,167,38,.4), 0 0 40px rgba(255,167,38,.2);
          flex-shrink: 0;
        }

        .director-info h3 {
          font-size: 24px;
          font-weight: 950;
          margin-bottom: 8px;
          background: linear-gradient(135deg, #FFA726 0%, #FFD54F 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .director-info p {
          font-size: 14px;
          opacity: 0.9;
          line-height: 1.6;
        }

        /* Asset Grid */
        .asset-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
          margin-top: 32px;
        }

        .asset-card {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .asset-card:hover {
          transform: translateY(-4px);
          border-color: rgba(56,189,248,.3);
          box-shadow: 0 12px 32px rgba(0,0,0,.4), 0 0 0 1px rgba(56,189,248,.2);
        }

        .asset-preview {
          aspect-ratio: 21 / 9;
          background: rgba(0,0,0,.4);
          position: relative;
          overflow: hidden;
        }

        .asset-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .asset-status {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,.6);
          backdrop-filter: blur(4px);
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .asset-meta {
          padding: 14px 16px;
          font-size: 11px;
          opacity: 0.6;
          border-top: 1px solid rgba(255,255,255,.06);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .asset-grid {
            grid-template-columns: 1fr;
          }
          .step-indicator {
            flex-direction: column;
            align-items: stretch;
          }
          .step-line {
            display: none;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,.08)", padding: "20px 0", background: "rgba(0,0,0,.3)" }}>
        <div style={{ width: "min(1400px, 94vw)", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "22px", fontWeight: 950, letterSpacing: "-0.5px", marginBottom: "4px" }}>
              🎬 <span style={{ color: "var(--gold)" }}>DIRECTOR</span> MODE
            </div>
            <div style={{ fontSize: "12px", opacity: 0.6, letterSpacing: "0.3px" }}>
              Professional Cinematic Image Generation · 21:9 Format
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => {
                localStorage.removeItem("director-mode-onboarding-seen");
                window.location.reload();
              }}
              className="btn-secondary"
            >
              📽️ Rewatch
            </button>
            <Link href="/" className="btn-secondary" style={{ textDecoration: "none", display: "inline-block" }}>
              ← Home
            </Link>
          </div>
        </div>
      </div>

      <div style={{ width: "min(1400px, 94vw)", margin: "0 auto", paddingTop: "40px", paddingBottom: "80px" }}>
        {/* Step Indicator */}
        <div className="step-indicator">
          <div className={`step-badge ${currentStep === 1 ? "active" : "inactive"}`}>
            STEP 1 · CREATIVE INPUT
          </div>
          <div className="step-line" />
          <div className={`step-badge ${currentStep === 2 ? "active" : "inactive"}`}>
            STEP 2 · CINEMATIC SETUP
          </div>
          <div className="step-line" />
          <div className={`step-badge ${currentStep === 3 ? "active" : "inactive"}`}>
            STEP 3 · BRIDGE TO VIDEO
          </div>
        </div>

        {/* Step 1 */}
        {currentStep === 1 && (
          <div className="glass" style={{ borderRadius: "20px", padding: "32px" }}>
            {/* Project Selector */}
            <div style={{ marginBottom: "32px", paddingBottom: "32px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", letterSpacing: "1px", opacity: 0.7, marginBottom: "16px" }}>
                Project
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "16px" }}>
                {/* Create New Project */}
                <div>
                  <label style={{ display: "block", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.5, marginBottom: "8px" }}>
                    Create New Project
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Enter project name..."
                      className="premium-input"
                      style={{ flex: 1, padding: "12px 14px" }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !creatingProject) {
                          createProject();
                        }
                      }}
                    />
                    <button
                      onClick={createProject}
                      disabled={creatingProject || !newProjectName.trim()}
                      className="btn-secondary"
                      style={{ whiteSpace: "nowrap" }}
                    >
                      {creatingProject ? "Creating..." : "Create"}
                    </button>
                  </div>
                </div>

                {/* Select Existing Project */}
                <div>
                  <label style={{ display: "block", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.5, marginBottom: "8px" }}>
                    Select Existing Project
                  </label>
                  <select
                    value={projectId || ""}
                    onChange={(e) => setProjectId(e.target.value || null)}
                    className="premium-select"
                  >
                    <option value="">-- Select a project --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.product_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selected Project Display */}
              {projectId && (
                <div style={{
                  padding: "12px 16px",
                  background: "linear-gradient(135deg, rgba(56,189,248,.15) 0%, rgba(56,189,248,.08) 100%)",
                  border: "1px solid rgba(56,189,248,.3)",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px"
                }}>
                  <div style={{ fontSize: "18px" }}>✓</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "11px", opacity: 0.7, marginBottom: "2px" }}>Selected Project:</div>
                    <div style={{ fontSize: "14px", fontWeight: 700 }}>
                      {projects.find(p => p.id === projectId)?.product_name || "Unknown Project"}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", letterSpacing: "1px", opacity: 0.7, marginBottom: "12px" }}>
                Scene Description
              </label>
              <textarea
                value={scenePrompt}
                onChange={(e) => setScenePrompt(e.target.value)}
                placeholder="Describe your cinematic scene in detail... (e.g., 'A sleek sports car racing through a neon-lit Tokyo street at night, rain-soaked asphalt reflecting vibrant lights, cinematic atmosphere, moody and atmospheric')"
                className="premium-input"
                style={{ minHeight: "140px", resize: "vertical", lineHeight: "1.6" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginBottom: "24px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", letterSpacing: "1px", opacity: 0.7, marginBottom: "12px" }}>
                  Reference Image (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setReferenceImage(e.target.files?.[0] || null)}
                  className="premium-input"
                  style={{ padding: "12px" }}
                />
                {referenceImage && (
                  <div style={{
                    marginTop: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px",
                    background: "rgba(255,255,255,.04)",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,.08)"
                  }}>
                    <img
                      src={URL.createObjectURL(referenceImage)}
                      alt="Reference preview"
                      style={{
                        width: "80px",
                        height: "80px",
                        objectFit: "cover",
                        borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,.12)"
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                        ✓ Reference Image
                      </div>
                      <div style={{ fontSize: "11px", opacity: 0.5 }}>
                        {referenceImage.name}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", letterSpacing: "1px", opacity: 0.7, marginBottom: "12px" }}>
                  Director Style
                </label>
                <select
                  value={selectedDirector}
                  onChange={(e) => setSelectedDirector(e.target.value)}
                  className="premium-select"
                >
                  {Object.keys(DIRECTORS).map((key) => (
                    <option key={key} value={key} style={{ background: "#1a1a1a", padding: "12px" }}>
                      {DIRECTORS[key].name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Multi-Scene Template (Optional - Additive Feature) */}
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", letterSpacing: "1px", opacity: 0.7, marginBottom: "12px" }}>
                  Template (Optional)
                </label>
                <select
                  value={selectedTemplate || ''}
                  onChange={(e) => {
                    const templateId = e.target.value || null;
                    setSelectedTemplate(templateId);
                    if (templateId && DIRECTOR_TEMPLATES[templateId]) {
                      const template = DIRECTOR_TEMPLATES[templateId];
                      setSceneCount(template.sceneCount);
                    } else {
                      setSceneCount(1);
                    }
                  }}
                  className="premium-select"
                >
                  <option value="">None (Single Scene)</option>
                  {Object.values(DIRECTOR_TEMPLATES).map((template) => (
                    <option key={template.id} value={template.id} style={{ background: "#1a1a1a" }}>
                      {template.name} — {template.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scene Count (only for custom template) */}
              {selectedTemplate === 'custom' && (
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", letterSpacing: "1px", opacity: 0.7, marginBottom: "12px" }}>
                    Scene Count
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={sceneCount}
                    onChange={(e) => setSceneCount(Number(e.target.value))}
                    className="premium-input"
                    style={{ padding: "14px 16px" }}
                  />
                </div>
              )}
            </div>

            {director && (
              <div className="director-card">
                <img src={director.photo} alt={director.name} className="director-photo" />
                <div className="director-info">
                  <h3>{director.name}</h3>
                  <p>{director.tagline}</p>
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "center", marginTop: "32px" }}>
              <button onClick={handleNextStep} className="btn-premium">
                Next Step →
              </button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {currentStep === 2 && (
          <div className="glass" style={{ borderRadius: "20px", padding: "32px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "24px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", letterSpacing: "1px", opacity: 0.7, marginBottom: "12px" }}>
                  Camera
                </label>
                <select value={camera} onChange={(e) => setCamera(e.target.value)} className="premium-select">
                  {Object.keys(CAMERAS).map((key) => (
                    <option key={key} value={key} style={{ background: "#1a1a1a" }}>
                      {CAMERAS[key].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", letterSpacing: "1px", opacity: 0.7, marginBottom: "12px" }}>
                  Lens
                </label>
                <select value={lens} onChange={(e) => setLens(e.target.value)} className="premium-select">
                  {Object.keys(LENSES).map((key) => (
                    <option key={key} value={key} style={{ background: "#1a1a1a" }}>
                      {LENSES[key].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", letterSpacing: "1px", opacity: 0.7, marginBottom: "12px" }}>
                  Focal Length
                </label>
                <select value={focal} onChange={(e) => setFocal(e.target.value)} className="premium-select">
                  {Object.keys(FOCAL_LENGTHS).map((key) => (
                    <option key={key} value={key} style={{ background: "#1a1a1a" }}>
                      {FOCAL_LENGTHS[key].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", letterSpacing: "1px", opacity: 0.7, marginBottom: "12px" }}>
                  Aperture
                </label>
                <select value={aperture} onChange={(e) => setAperture(e.target.value)} className="premium-select">
                  {Object.keys(APERTURES).map((key) => (
                    <option key={key} value={key} style={{ background: "#1a1a1a" }}>
                      {APERTURES[key].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", letterSpacing: "1px", opacity: 0.7, marginBottom: "12px" }}>
                  Quality
                </label>
                <select value={quality} onChange={(e) => setQuality(e.target.value as any)} className="premium-select">
                  {QUALITIES.map((q) => (
                    <option key={q} value={q} style={{ background: "#1a1a1a" }}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", letterSpacing: "1px", opacity: 0.7, marginBottom: "12px" }}>
                  Batch Size
                </label>
                <select value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value) as any)} className="premium-select">
                  {BATCHES.map((b) => (
                    <option key={b} value={b} style={{ background: "#1a1a1a" }}>
                      {b} frames
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Storyboard Mode Toggle (only for multi-scene) */}
            {scenes.length > 1 && (
              <div style={{ marginBottom: "24px" }}>
                <button
                  onClick={() => setStoryboardMode(!storyboardMode)}
                  style={{
                    width: "100%",
                    padding: "16px 24px",
                    background: storyboardMode
                      ? "linear-gradient(135deg, rgba(255,167,38,.15) 0%, rgba(255,143,0,.1) 100%)"
                      : "rgba(255,255,255,.04)",
                    border: storyboardMode
                      ? "1px solid rgba(255,167,38,.3)"
                      : "1px solid rgba(255,255,255,.12)",
                    borderRadius: "12px",
                    color: storyboardMode ? "var(--gold)" : "rgba(255,255,255,.7)",
                    fontSize: "13px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                  }}
                >
                  {storyboardMode ? "📸 Storyboard Mode" : "🎬 Variations Mode"}
                  <span style={{ fontSize: "11px", opacity: 0.7, textTransform: "none", letterSpacing: "0.5px" }}>
                    {storyboardMode ? `(${scenes.length} frames, 1 per scene)` : `(${batchSize} variations of same shot)`}
                  </span>
                </button>
              </div>
            )}

            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", letterSpacing: "1px", opacity: 0.7, marginBottom: "12px" }}>
                📽️ Aspect Ratio
              </label>
              <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as any)} className="premium-select">
                {ASPECT_RATIOS.map((ratio) => (
                  <option key={ratio} value={ratio} style={{ background: "#1a1a1a" }}>
                    {ratio} — {
                      ratio === "1:1" ? "Square (Social Media)" :
                        ratio === "4:5" ? "Portrait (Instagram)" :
                          ratio === "5:4" ? "Classic (Medium Format)" :
                            ratio === "9:16" ? "Vertical (Stories)" :
                              ratio === "16:9" ? "Widescreen (Standard)" :
                                "Cinematic (Ultra-wide)"
                    }
                  </option>
                ))}
              </select>

              <div className="glass-dark" style={{
                padding: "16px 20px",
                borderRadius: "12px",
                marginTop: "12px",
                fontSize: "12px",
                opacity: 0.9,
                borderLeft: `4px solid ${aspectRatio === "1:1" ? "#FF6B9D" :
                  aspectRatio === "4:5" ? "#A29BFE" :
                    aspectRatio === "5:4" ? "#74B9FF" :
                      aspectRatio === "9:16" ? "#55EFC4" :
                        aspectRatio === "16:9" ? "#FFEAA7" :
                          "var(--gold)"
                  }`
              }}>
                📽️ Aspect Ratio: <strong style={{
                  color:
                    aspectRatio === "1:1" ? "#FF6B9D" :
                      aspectRatio === "4:5" ? "#A29BFE" :
                        aspectRatio === "5:4" ? "#74B9FF" :
                          aspectRatio === "9:16" ? "#55EFC4" :
                            aspectRatio === "16:9" ? "#FFEAA7" :
                              "var(--gold)"
                }}>{aspectRatio} {
                    aspectRatio === "1:1" ? "Square" :
                      aspectRatio === "4:5" ? "Portrait" :
                        aspectRatio === "5:4" ? "Classic" :
                          aspectRatio === "9:16" ? "Vertical" :
                            aspectRatio === "16:9" ? "Widescreen" :
                              "Cinematic"
                  }</strong> ({
                  aspectRatio === "1:1" ? "Perfect square format for social media" :
                    aspectRatio === "4:5" ? "Portrait format ideal for Instagram and mobile" :
                      aspectRatio === "5:4" ? "Classic medium format photography ratio" :
                        aspectRatio === "9:16" ? "Vertical format for stories and reels" :
                          aspectRatio === "16:9" ? "Standard widescreen format for video" :
                            "Ultra-wide format for professional cinema"
                })
              </div>
            </div>


            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={handleBackToStep1} className="btn-secondary">
                ← Back
              </button>
              <button
                onClick={handleShootPreviews}
                disabled={generating || stats.runningAI}
                className="btn-premium"
              >
                {generating ? "Shooting..." : stats.runningAI ? "Processing..." : "📽️ Shoot Previews"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3 - Bridge to Video */}
        {currentStep === 3 && (
          <Step3BridgeToVideo
            selectedMovement={selectedMovement}
            setSelectedMovement={setSelectedMovement}
            aspectRatio={aspectRatio}
            setAspectRatio={setAspectRatio}
            videoDuration={videoDuration}
            setVideoDuration={setVideoDuration}
            qualityMode={qualityMode}
            setQualityMode={setQualityMode}
            audioEnabled={audioEnabled}
            setAudioEnabled={setAudioEnabled}
            slowMotion={slowMotion}
            setSlowMotion={setSlowMotion}
            videoBatch={videoBatch}
            setVideoBatch={setVideoBatch}
            anchorAsset={anchorAsset}
            scenes={scenes}
            currentSceneIndex={currentSceneIndex}
            setCurrentSceneIndex={setCurrentSceneIndex}
            renderQueue={renderQueue}
            onBack={() => setCurrentStep(2)}
            onGenerate={handleGenerateVideo}
            onGenerateAll={() => alert("Generate all scenes coming soon!")}
            generating={generating}
            videoAssets={videoAssets}
            videoStatuses={videoStatuses}
          />
        )}

        {/* Message */}
        {msg && (
          <div
            className="glass"
            style={{
              padding: "20px",
              borderRadius: "16px",
              marginTop: "24px",
              fontSize: "14px",
              textAlign: "center",
              animation: generating ? "pulse-glow 2s ease-in-out infinite" : "none"
            }}
          >
            {msg}
          </div>
        )}

        {/* Stats */}
        {stats.total > 0 && (
          <div style={{ marginTop: "40px", marginBottom: "20px", fontSize: "12px", opacity: 0.6, letterSpacing: "0.5px" }}>
            {stats.total} TOTAL · {stats.ready} READY · {stats.pending + stats.generating} PROCESSING · {stats.failed} FAILED
          </div>
        )}

        {/* Assets Grid */}
        {displayedAssets.length > 0 && (
          <div className="asset-grid">
            {displayedAssets.map((asset, index) => (
              <div
                key={asset.id}
                onClick={() => asset.status === "ready" && openViewer(index)}
                className="asset-card"
              >
                <div className="asset-preview">
                  {asset.status === "ready" && asset.signedUrl ? (
                    <>
                      <img
                        src={(asset as any).thumbnailUrl || asset.signedUrl}
                        alt="Preview"
                        onLoad={(e) => {
                          e.currentTarget.style.opacity = "1";
                          const loader = e.currentTarget.previousElementSibling;
                          if (loader) loader.remove();

                          // Load full-res in background if thumbnail was shown
                          if ((asset as any).thumbnailUrl && asset.signedUrl) {
                            const imgElement = e.currentTarget; // Store reference
                            const fullImg = new Image();
                            fullImg.src = asset.signedUrl;
                            fullImg.onload = () => {
                              if (imgElement && imgElement.parentElement && asset.signedUrl) { // Check if still mounted and signedUrl exists
                                imgElement.src = asset.signedUrl;
                              }
                            };
                          }
                        }}
                        style={{ opacity: 0, transition: "opacity 0.3s" }}
                      />
                      <div className="loading-spinner" style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(0,0,0,.5)"
                      }}>
                        <div className="spinner" />
                      </div>
                    </>
                  ) : (
                    <div className="asset-status">
                      {asset.status === "pending" ? "🎬 Processing..." : asset.status === "queued" ? "⏳ Queued" : asset.status === "generating" ? "🎬 Generating" : "❌ Failed"}
                    </div>
                  )}
                </div>
                <div className="asset-meta">
                  {new Date(asset.created_at).toLocaleString()}
                </div>

                {/* Bridge to Video Button */}
                {asset.status === "ready" && currentStep === 2 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAnchorAsset(asset);
                      setCurrentStep(3);
                    }}
                    style={{
                      marginTop: "12px",
                      width: "100%",
                      padding: "12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      background: "linear-gradient(135deg, #FFA726 0%, #FF8F00 100%)",
                      border: "none",
                      borderRadius: "8px",
                      color: "#000",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      boxShadow: "0 4px 12px rgba(255,167,38,.3)"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 6px 16px rgba(255,167,38,.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(255,167,38,.3)";
                    }}
                  >
                    🎬 Bridge to Video
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {displayedAssets.length === 0 && !loading && (
          <div className="glass" style={{ padding: "80px 40px", textAlign: "center", borderRadius: "20px", marginTop: "40px" }}>
            <div style={{ fontSize: "64px", marginBottom: "20px", opacity: 0.3 }}>🎬</div>
            <div style={{ fontSize: "20px", fontWeight: 900, marginBottom: "12px" }}>No Frames Yet</div>
            <div style={{ fontSize: "14px", opacity: 0.6, maxWidth: "500px", margin: "0 auto" }}>
              {currentStep === 1 ? "Define your creative vision and select a director style to begin" : "Configure your cinematic setup and shoot your first previews"}
            </div>
          </div>
        )}
      </div>

      {/* Premium Viewer Modal */}
      {viewerOpen && displayedAssets[viewerIndex] && (
        <div
          onClick={closeViewer}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.97)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            backdropFilter: "blur(30px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "1800px",
              width: "100%",
              height: "90vh",
              display: "grid",
              gridTemplateColumns: "1fr 400px",
              gap: "24px",
            }}
          >
            {/* Left: Image */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              overflow: "hidden",
            }}>
              <img
                src={displayedAssets[viewerIndex].signedUrl || ""}
                alt="Preview"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  borderRadius: "16px",
                  boxShadow: "0 30px 80px rgba(0,0,0,.8)",
                }}
              />
              <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                <button onClick={prevViewer} className="btn-secondary">
                  ← Previous
                </button>
                <button
                  onClick={() => downloadUrl(displayedAssets[viewerIndex].signedUrl || "", `director-mode-${displayedAssets[viewerIndex].id}.png`)}
                  className="btn-premium"
                >
                  📥 Download
                </button>
                <button onClick={nextViewer} className="btn-secondary">
                  Next →
                </button>
              </div>
            </div>

            {/* Right: Metadata Panel */}
            <div style={{
              background: "linear-gradient(135deg, rgba(255,255,255,.03) 0%, rgba(255,255,255,.01) 100%)",
              backdropFilter: "blur(20px) saturate(180%)",
              border: "1px solid rgba(255,255,255,.08)",
              borderRadius: "20px",
              padding: "32px",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              overflow: "auto",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.1), 0 20px 60px rgba(0,0,0,.4)",
            }}>
              {/* Title */}
              <div>
                <h2 style={{
                  fontSize: "24px",
                  fontWeight: 950,
                  background: "linear-gradient(135deg, #00d4ff 0%, #0099ff 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  marginBottom: "8px",
                  letterSpacing: "0.5px",
                }}>
                  CINEMATIC FRAME
                </h2>
                <div style={{
                  fontSize: "11px",
                  color: "rgba(255,255,255,.5)",
                  fontWeight: 600,
                  letterSpacing: "1px",
                }}>
                  {new Date(displayedAssets[viewerIndex].created_at).toLocaleString()}
                </div>
              </div>

              {/* Prompt */}
              {displayedAssets[viewerIndex].meta?.prompt && (
                <div>
                  <div style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    opacity: 0.5,
                    marginBottom: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}>
                    <span>PROMPT</span>
                    <button
                      onClick={() => {
                        const prompt = displayedAssets[viewerIndex]?.meta?.prompt;
                        if (prompt) {
                          navigator.clipboard.writeText(prompt);
                          alert("Prompt copied!");
                        }
                      }}
                      style={{
                        padding: "4px 10px",
                        fontSize: "10px",
                        fontWeight: 600,
                        background: "rgba(255,255,255,.08)",
                        border: "1px solid rgba(255,255,255,.15)",
                        borderRadius: "6px",
                        color: "rgba(255,255,255,.7)",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,.15)";
                        e.currentTarget.style.color = "rgba(255,255,255,1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,.08)";
                        e.currentTarget.style.color = "rgba(255,255,255,.7)";
                      }}
                    >
                      📋 Copy
                    </button>
                  </div>
                  <div style={{
                    fontSize: "13px",
                    lineHeight: "1.5",
                    color: "rgba(255,255,255,.7)",
                    maxHeight: promptExpanded ? "none" : "2.8em",
                    overflow: "hidden",
                    position: "relative",
                  }}>
                    {displayedAssets[viewerIndex]?.meta?.prompt}
                  </div>
                  {(displayedAssets[viewerIndex]?.meta?.prompt?.length || 0) > 100 && (
                    <button
                      onClick={() => setPromptExpanded(!promptExpanded)}
                      style={{
                        marginTop: "8px",
                        padding: "6px 12px",
                        fontSize: "11px",
                        fontWeight: 600,
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,.15)",
                        borderRadius: "6px",
                        color: "rgba(255,255,255,.6)",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "rgba(255,255,255,.3)";
                        e.currentTarget.style.color = "rgba(255,255,255,.9)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "rgba(255,255,255,.15)";
                        e.currentTarget.style.color = "rgba(255,255,255,.6)";
                      }}
                    >
                      {promptExpanded ? "Show less" : "View all"}
                    </button>
                  )}
                </div>
              )}

              {/* Information */}
              <div>
                <div style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  opacity: 0.5,
                  marginBottom: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}>
                  <span style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    background: "rgba(255,255,255,.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                  }}>ℹ</span>
                  INFORMATION
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0px" }}>
                  {/* Director */}
                  {displayedAssets[viewerIndex].meta?.director && (
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: "1px solid rgba(255,255,255,.05)",
                    }}>
                      <span style={{ fontSize: "13px", opacity: 0.5 }}>Director</span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#ffd700" }}>
                        {DIRECTORS[displayedAssets[viewerIndex].meta.director as keyof typeof DIRECTORS]?.name || displayedAssets[viewerIndex].meta.director}
                      </span>
                    </div>
                  )}

                  {/* Camera */}
                  {displayedAssets[viewerIndex].meta?.camera && (
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: "1px solid rgba(255,255,255,.05)",
                    }}>
                      <span style={{ fontSize: "13px", opacity: 0.5 }}>Camera</span>
                      <span style={{ fontSize: "13px", fontWeight: 600 }}>
                        {CAMERAS[displayedAssets[viewerIndex].meta.camera as keyof typeof CAMERAS]?.label || displayedAssets[viewerIndex].meta.camera}
                      </span>
                    </div>
                  )}

                  {/* Lens */}
                  {displayedAssets[viewerIndex].meta?.lens && (
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: "1px solid rgba(255,255,255,.05)",
                    }}>
                      <span style={{ fontSize: "13px", opacity: 0.5 }}>Lens</span>
                      <span style={{ fontSize: "13px", fontWeight: 600 }}>
                        {LENSES[displayedAssets[viewerIndex].meta.lens as keyof typeof LENSES]?.label || displayedAssets[viewerIndex].meta.lens}
                      </span>
                    </div>
                  )}

                  {/* Focal Length */}
                  {displayedAssets[viewerIndex].meta?.focal && specsExpanded && (
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: "1px solid rgba(255,255,255,.05)"
                    }}>
                      <span style={{ fontSize: "13px", opacity: 0.5 }}>Focal Length</span>
                      <span style={{ fontSize: "13px", fontWeight: 600 }}>
                        {FOCAL_LENGTHS[displayedAssets[viewerIndex].meta.focal as keyof typeof FOCAL_LENGTHS]?.label || displayedAssets[viewerIndex].meta.focal}
                      </span>
                    </div>
                  )}

                  {/* Aperture */}
                  {displayedAssets[viewerIndex].meta?.aperture && specsExpanded && (
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: "1px solid rgba(255,255,255,.05)"
                    }}>
                      <span style={{ fontSize: "13px", opacity: 0.5 }}>Aperture</span>
                      <span style={{ fontSize: "13px", fontWeight: 600 }}>
                        {APERTURES[displayedAssets[viewerIndex].meta.aperture as keyof typeof APERTURES]?.label || displayedAssets[viewerIndex].meta.aperture}
                      </span>
                    </div>
                  )}

                  {/* Quality */}
                  {displayedAssets[viewerIndex].meta?.quality && specsExpanded && (
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: "1px solid rgba(255,255,255,.05)"
                    }}>
                      <span style={{ fontSize: "13px", opacity: 0.5 }}>Quality</span>
                      <span style={{ fontSize: "13px", fontWeight: 600 }}>{displayedAssets[viewerIndex].meta.quality}</span>
                    </div>
                  )}

                  {/* Aspect Ratio */}
                  {specsExpanded && (
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: "1px solid rgba(255,255,255,.05)"
                    }}>
                      <span style={{ fontSize: "13px", opacity: 0.5 }}>Aspect Ratio</span>
                      <span style={{ fontSize: "13px", fontWeight: 600 }}>21:9</span>
                    </div>
                  )}

                  {/* Created */}
                  {specsExpanded && (
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "12px 0"
                    }}>
                      <span style={{ fontSize: "13px", opacity: 0.5 }}>Created</span>
                      <span style={{ fontSize: "13px", fontWeight: 600 }}>
                        {new Date(displayedAssets[viewerIndex].created_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Show less/more button */}
                <button
                  onClick={() => setSpecsExpanded(!specsExpanded)}
                  style={{
                    marginTop: "12px",
                    padding: "8px 0",
                    fontSize: "12px",
                    fontWeight: 600,
                    background: "transparent",
                    border: "none",
                    color: "rgba(255,255,255,.5)",
                    cursor: "pointer",
                    width: "100%",
                    textAlign: "center",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "rgba(255,255,255,.9)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "rgba(255,255,255,.5)";
                  }}
                >
                  {specsExpanded ? "Show less" : "Show more"}
                  <span style={{ fontSize: "10px" }}>{specsExpanded ? "▲" : "▼"}</span>
                </button>
              </div>

              {/* Bridge to Video Button */}
              <button
                onClick={() => {
                  setAnchorAsset(displayedAssets[viewerIndex]);
                  setCurrentStep(3);
                  closeViewer();
                }}
                style={{
                  marginTop: "auto",
                  padding: "18px 28px",
                  fontSize: "15px",
                  fontWeight: 950,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  background: "linear-gradient(135deg, #FFA726 0%, #FF8F00 100%)",
                  border: "none",
                  borderRadius: "12px",
                  color: "#000",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 0 30px rgba(255, 167, 38, 0.4), inset 0 1px 0 rgba(255,255,255,.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 0 40px rgba(255, 167, 38, 0.6), inset 0 1px 0 rgba(255,255,255,.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 0 30px rgba(255, 167, 38, 0.4), inset 0 1px 0 rgba(255,255,255,.3)";
                }}
              >
                🎬 Bridge to Video
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
