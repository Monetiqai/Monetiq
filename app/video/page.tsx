"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { MODEL_CONFIGS } from "@/lib/runway/modelConfigs";

type Project = {
  id: string;
  product_name: string;
  style: string | null;
  goal: string | null;
};

type Asset = {
  id: string;
  kind: "image" | "video";
  role: string;
  status: "queued" | "generating" | "ready" | "failed";
  storage_bucket: string;
  storage_path: string | null;
  mime_type: string | null;
  meta: any;
  created_at: string;
};

type AssetWithUrl = Asset & { signedUrl: string | null };

const RATIOS = ["16:9", "9:16", "1:1"] as const;
const QUALITIES = ["720p", "1080p"] as const;
const DURATIONS = [6, 8] as const;

export default function VideoToolPage() {
  const supabase = supabaseBrowser();
  const searchParams = useSearchParams();

  const [projectId, setProjectId] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [startImageAssetId, setStartImageAssetId] = useState<string | null>(null);
  const [startImage, setStartImage] = useState<AssetWithUrl | null>(null);
  const [videos, setVideos] = useState<AssetWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // UI controls
  const [model, setModel] = useState<'gen4_turbo' | 'gen3a_turbo' | 'veo3' | 'veo3.1'>('gen3a_turbo');
  const modelConfig = MODEL_CONFIGS[model];
  const [ratio, setRatio] = useState<string>(modelConfig.defaultRatio);
  const [quality, setQuality] = useState<string>(modelConfig.defaultQuality);
  const [duration, setDuration] = useState<number>(modelConfig.defaultDuration);
  const [prompt, setPrompt] = useState("");

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

  async function getOrCreateActiveProject() {
    await ensureAuth();
    const res = await fetch("/api/projects/active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Failed to get active project");
    return json.projectId as string;
  }

  async function loadProject(pid: string) {
    const { data: p, error: pErr } = await supabase
      .from("projects")
      .select("id, product_name, style, goal")
      .eq("id", pid)
      .single();
    if (pErr) throw pErr;
    setProject(p as Project);
  }

  async function loadVideos(pid: string) {
    const { data: v, error: vErr } = await supabase
      .from("assets")
      .select("id, kind, role, status, storage_bucket, storage_path, mime_type, meta, created_at")
      .eq("project_id", pid)
      .eq("kind", "video")
      .order("created_at", { ascending: false });

    if (vErr) throw vErr;

    const rows = (v ?? []) as Asset[];
    const signedVideos = await Promise.all(
      rows.map(async (row) => {
        const url = row.storage_path ? await signedUrl(row.storage_bucket || "assets", row.storage_path) : null;
        return { ...row, signedUrl: url } as AssetWithUrl;
      })
    );

    // Only update if there are actual changes to prevent video remount
    setVideos((prev) => {
      const hasChanges =
        prev.length !== signedVideos.length ||
        prev.some((p, i) => p.id !== signedVideos[i]?.id || p.status !== signedVideos[i]?.status);

      return hasChanges ? signedVideos : prev;
    });
  }

  async function loadStartImageById(pid: string, assetId: string) {
    const { data, error } = await supabase
      .from("assets")
      .select("id, kind, role, status, storage_bucket, storage_path, mime_type, meta, created_at")
      .eq("id", assetId)
      .eq("project_id", pid)
      .eq("kind", "image")
      .single();

    if (error) throw error;

    const row = data as Asset;
    const url = row.storage_path ? await signedUrl(row.storage_bucket || "assets", row.storage_path) : null;
    setStartImage({ ...row, signedUrl: url });
  }

  async function init() {
    try {
      setLoading(true);
      const pid = await getOrCreateActiveProject();
      setProjectId(pid);
      await loadProject(pid);

      const startParam = searchParams.get("start");
      if (startParam) {
        setStartImageAssetId(startParam);
        await loadStartImageById(pid, startParam);
      }

      await loadVideos(pid);
    } catch (e: any) {
      console.error("Init error:", e);
      alert(e?.message ?? "Failed to initialize");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    init();
  }, []);

  // Pre-select model from URL query param (from landing page templates)
  useEffect(() => {
    const modelParam = searchParams.get('model');
    if (modelParam && ['gen4_turbo', 'gen3a_turbo', 'veo3', 'veo3.1'].includes(modelParam)) {
      handleModelChange(modelParam as 'gen4_turbo' | 'gen3a_turbo' | 'veo3' | 'veo3.1');
    }
  }, [searchParams]);


  // Auto-refresh videos every 2.5 seconds
  useEffect(() => {
    if (!projectId) return;
    const interval = setInterval(() => {
      loadVideos(projectId);
    }, 2500);
    return () => clearInterval(interval);
  }, [projectId]);

  function handleModelChange(newModel: 'gen4_turbo' | 'gen3a_turbo' | 'veo3' | 'veo3.1') {
    setModel(newModel);
    const config = MODEL_CONFIGS[newModel];
    // Auto-adjust parameters based on model
    setRatio(config.defaultRatio);
    setQuality(config.defaultQuality);
    setDuration(config.defaultDuration);
  }

  async function handleGenerate() {
    if (!projectId || !startImageAssetId) {
      alert("Missing project or reference image");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/generate/videos/runway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          startImageAssetId,
          prompt,
          ratio,
          durationSeconds: duration,
          model,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "Generation failed");
      }

      alert(`✅ Queued! Asset ID: ${json.assetId}`);
      await loadVideos(projectId);
    } catch (e: any) {
      console.error("Generate error:", e);
      alert(e?.message ?? "Failed to generate");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <main className="root">
        <div style={{ padding: 40, color: "white" }}>Loading...</div>
      </main>
    );
  }

  return (
    <main className="root">
      <style>{`
        :root {
          --bg: #0b0b0b;
          --panel: rgba(255,255,255,.04);
          --border: rgba(255,255,255,.12);
          --textDim: rgba(255,255,255,.78);
          --cyan: #00BCD4;
          --cyanGlow: rgba(0,188,212,0.25);
        }
        * { box-sizing: border-box; }
        a { color: inherit; text-decoration: none; }
        button { font: inherit; }
        .root {
          min-height: 100vh;
          background: var(--bg);
          color: white;
          display: flex;
          flex-direction: column;
        }
        .header {
          padding: 20px 30px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .headerTitle {
          font-size: 18px;
          font-weight: 950;
        }
        .headerSubtitle {
          font-size: 12px;
          opacity: 0.6;
          margin-top: 2px;
        }
        .main {
          flex: 1;
          display: flex;
        }
        .sidebar {
          width: 320px;
          border-right: 1px solid var(--border);
          padding: 20px;
          overflow-y: auto;
        }
        .content {
          flex: 1;
          padding: 30px;
          overflow-y: auto;
        }
        .section {
          margin-bottom: 24px;
        }
        .sectionTitle {
          font-size: 11px;
          font-weight: 950;
          opacity: 0.6;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .refImage {
          width: 100%;
          aspect-ratio: 1;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid var(--border);
          background: rgba(0,0,0,0.3);
        }
        .refImage img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .control {
          border: 1px solid var(--border);
          background: var(--panel);
          border-radius: 14px;
          padding: 10px;
          margin-bottom: 10px;
        }
        .controlTop {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 8px;
        }
        .controlLabel {
          font-size: 12px;
          font-weight: 950;
          opacity: 0.95;
        }
        .controlValue {
          font-size: 11px;
          opacity: 0.75;
        }
        .controlSelect {
          width: 100%;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: rgba(0,0,0,.25);
          color: white;
          padding: 10px;
          font-size: 12px;
          outline: none;
        }
        .controlSelect:focus {
          border-color: var(--cyan);
          box-shadow: 0 0 0 6px var(--cyanGlow);
        }
        .controlTextarea {
          width: 100%;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: rgba(0,0,0,.25);
          color: white;
          padding: 10px;
          font-size: 12px;
          outline: none;
          resize: vertical;
          min-height: 80px;
          font-family: inherit;
        }
        .controlTextarea:focus {
          border-color: var(--cyan);
          box-shadow: 0 0 0 6px var(--cyanGlow);
        }
        .gen {
          width: 100%;
          background: linear-gradient(135deg, #00BCD4 0%, #00ACC1 100%);
          color: white;
          font-weight: 950;
          font-size: 14px;
          padding: 14px 20px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          box-shadow: 0 10px 30px var(--cyanGlow);
          transition: all 0.2s;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .gen:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 40px var(--cyanGlow);
        }
        .gen:active {
          transform: translateY(0);
        }
        .gen:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .statusList {
          margin-top: 20px;
        }
        .statusItem {
          font-size: 11px;
          font-weight: 900;
          padding: 8px 10px;
          border: 1px solid var(--border);
          background: var(--panel);
          border-radius: 12px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .statusQueued { color: #FFA726; }
        .statusGenerating { color: #00BCD4; }
        .statusReady { color: #66BB6A; }
        .statusFailed { color: #EF5350; }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }
        .card {
          border: 1px solid var(--border);
          background: var(--panel);
          border-radius: 14px;
          overflow: hidden;
          transition: all 0.2s;
        }
        .card:hover {
          border-color: var(--cyan);
          box-shadow: 0 10px 30px var(--cyanGlow);
        }
        .cardMedia {
          width: 100%;
          aspect-ratio: 9/16;
          background: rgba(0,0,0,0.5);
        }
        .cardMedia video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .cardBody {
          padding: 12px;
        }
        .cardStatus {
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .cardDate {
          font-size: 10px;
          opacity: 0.5;
          margin-top: 4px;
        }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 1024px) {
          .main {
            flex-direction: column;
          }
          .sidebar {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid var(--border);
            max-height: none;
          }
          .grid {
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          }
        }

        @media (max-width: 768px) {
          .header {
            padding: 15px 20px;
          }
          .headerTitle {
            font-size: 16px;
          }
          .headerSubtitle {
            font-size: 11px;
          }
          .content {
            padding: 20px;
          }
          .sidebar {
            padding: 15px;
          }
          .grid {
            grid-template-columns: 1fr;
            gap: 15px;
          }
          .refImage {
            max-width: 300px;
            margin: 0 auto;
          }
        }

        @media (max-width: 480px) {
          .header {
            padding: 12px 15px;
          }
          .headerTitle {
            font-size: 14px;
          }
          .headerSubtitle {
            font-size: 10px;
          }
          .content {
            padding: 15px;
          }
          .sidebar {
            padding: 12px;
          }
          .gen {
            font-size: 13px;
            padding: 12px 16px;
          }
          .controlLabel {
            font-size: 11px;
          }
          .controlSelect,
          .controlTextarea {
            font-size: 11px;
            padding: 8px;
          }
        }
      `}</style>

      <div className="header">
        <div>
          <div className="headerTitle">Video Tool</div>
          <div className="headerSubtitle">
            {project ? `${project.product_name} · ${project.style ?? "No style"}` : "Loading..."} · Powered by Runway Gen-3
          </div>
        </div>
        <Link href="/" style={{ fontSize: 12, opacity: 0.7 }}>
          ← Back
        </Link>
      </div>

      <div className="main">
        <div className="sidebar">
          {/* Reference Image */}
          <div className="section">
            <div className="sectionTitle">Reference Image</div>
            {startImage?.signedUrl ? (
              <div className="refImage">
                <img src={startImage.signedUrl} alt="Reference" />
              </div>
            ) : (
              <div className="refImage" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, opacity: 0.5 }}>
                No image selected
              </div>
            )}
          </div>

          {/* Prompt */}
          <div className="section">
            <div className="control">
              <div className="controlTop">
                <div className="controlLabel">Prompt (optional)</div>
              </div>
              <textarea
                className="controlTextarea"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Add custom instructions..."
              />
            </div>
          </div>

          {/* Settings */}
          <div className="section">
            <div className="control">
              <div className="controlTop">
                <div className="controlLabel">Aspect Ratio</div>
                <div className="controlValue">{ratio}</div>
              </div>
              <select className="controlSelect" value={ratio} onChange={(e) => setRatio(e.target.value)}>
                {modelConfig.availableRatios.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="control">
              <div className="controlTop">
                <div className="controlLabel">Quality</div>
                <div className="controlValue">{quality}</div>
              </div>
              <select className="controlSelect" value={quality} onChange={(e) => setQuality(e.target.value)}>
                {modelConfig.availableQualities.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </div>

            <div className="control">
              <div className="controlTop">
                <div className="controlLabel">Duration</div>
                <div className="controlValue">{duration}s</div>
              </div>
              <select className="controlSelect" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {modelConfig.availableDurations.map((d) => (
                  <option key={d} value={d}>
                    {d} seconds
                  </option>
                ))}
              </select>
            </div>

            <div className="control" style={{ borderLeft: `4px solid ${modelConfig.color}`, background: `linear-gradient(135deg, ${modelConfig.color}11, ${modelConfig.color}22)` }}>
              <div className="controlTop">
                <div className="controlLabel">Model</div>
                <div className="controlValue" style={{ color: modelConfig.color, fontWeight: 900 }}>
                  {modelConfig.label} <span style={{ fontSize: '11px', opacity: 0.8 }}>{modelConfig.badge}</span>
                </div>
              </div>
              <select className="controlSelect" value={model} onChange={(e) => handleModelChange(e.target.value as any)} style={{ borderColor: modelConfig.color }}>
                <option value="gen4_turbo">⚡ Gen-4 Turbo (Fastest)</option>
                <option value="gen3a_turbo">⚡ Gen-3 Turbo</option>
                <option value="veo3">🎨 Veo 3 (Premium)</option>
                <option value="veo3.1">💎 Veo 3.1 (Ultra Premium)</option>
              </select>
            </div>
          </div>

          {/* Generate Button */}
          <button className="gen" onClick={handleGenerate} disabled={generating || !startImageAssetId}>
            {generating ? "Generating..." : "Generate ✦"}
          </button>

          {/* Status List */}
          <div className="statusList">
            <div className="sectionTitle">Generation Status</div>
            {videos.slice(0, 5).map((v) => (
              <div
                key={v.id}
                className={`statusItem ${v.status === "queued"
                  ? "statusQueued"
                  : v.status === "generating"
                    ? "statusGenerating"
                    : v.status === "ready"
                      ? "statusReady"
                      : "statusFailed"
                  }`}
              >
                {v.status === "queued" && "🕒 queue"}
                {v.status === "generating" && "⚙️ generating..."}
                {v.status === "ready" && "✅ ready"}
                {v.status === "failed" && "❌ failed"}
              </div>
            ))}
            {videos.length === 0 && (
              <div style={{ fontSize: 11, opacity: 0.5, padding: 10 }}>No generations yet</div>
            )}
          </div>
        </div>

        <div className="content">
          <div className="sectionTitle">Results</div>
          <div className="grid">
            {videos.map((v) => (
              <div key={v.id} className="card">
                <div className="cardMedia">
                  {v.signedUrl && v.status === "ready" && (
                    <video src={v.signedUrl} controls loop muted playsInline />
                  )}
                  {v.status !== "ready" && (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, opacity: 0.5 }}>
                      {v.status === "queued" && "🕒 Queued"}
                      {v.status === "generating" && "⚙️ Generating..."}
                      {v.status === "failed" && "❌ Failed"}
                    </div>
                  )}
                </div>
                <div className="cardBody">
                  <div
                    className={`cardStatus ${v.status === "queued"
                      ? "statusQueued"
                      : v.status === "generating"
                        ? "statusGenerating"
                        : v.status === "ready"
                          ? "statusReady"
                          : "statusFailed"
                      }`}
                  >
                    {v.status}
                  </div>
                  <div className="cardDate">{new Date(v.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
          {videos.length === 0 && (
            <div style={{ fontSize: 14, opacity: 0.5, padding: 40, textAlign: "center" }}>
              No videos yet. Click "Generate ✦" to create your first video.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
