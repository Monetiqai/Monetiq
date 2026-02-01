"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Project = {
  id: string;
  product_name: string;
  style: string | null;
  goal: string | null;
  product_image_path?: string | null; // DEPRECATED
  product_image_url?: string | null; // DEPRECATED - R2 public URL (non-canonical)
  canonical_product_image_url?: string | null; // Canonical: monetiq/inputs/{product_id}/source.png
};

type Asset = {
  id: string;
  kind: "image" | "video";
  role: string;
  status: "pending" | "ready" | "failed";
  storage_bucket: string;
  storage_path: string | null;
  mime_type: string | null;
  meta: any;
  created_at: string;
};

type AssetWithUrl = Asset & { signedUrl: string | null };

const RATIOS = ["1:1", "4:3", "3:4", "9:16", "16:9"] as const;
const QUALITIES = ["1K", "2K"] as const;
const BATCHES = [1, 2, 3, 4] as const;

export default function ImageToolPage() {
  const supabase = supabaseBrowser();

  const [projectId, setProjectId] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [productThumbUrl, setProductThumbUrl] = useState<string | null>(null);

  const [assets, setAssets] = useState<AssetWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [modelLabel] = useState("Nano Banana Pro");
  const [ratio, setRatio] = useState<(typeof RATIOS)[number]>("16:9");
  const [quality, setQuality] = useState<(typeof QUALITIES)[number]>("1K");
  const [batchSize, setBatchSize] = useState<(typeof BATCHES)[number]>(2);
  const [autoRun, setAutoRun] = useState(true);

  const [userPrompt, setUserPrompt] = useState(
    "Showcase the product in an ultra-realistic setting. IDENTITY LOCK: keep product identical (colors, logo, cut, texture). No random changes. No extra logos."
  );

  const [generating, setGenerating] = useState(false);
  const [runningAI, setRunningAI] = useState(false);

  // viewer studio
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [modalPrompt, setModalPrompt] = useState("");

  const displayedAssets = useMemo(() => assets.slice(0, 8), [assets]); // ✅ keep only last 8

  function copyToClipboard(text: string) {
    navigator.clipboard?.writeText(text).catch(() => { });
  }

  function downloadUrl(url: string, filename = "asset.png") {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noreferrer";
    a.click();
  }

  function openViewer(index: number) {
    setViewerIndex(index);
    const a = displayedAssets[index];
    const savedPrompt = a?.meta?.prompt || userPrompt || "";
    setModalPrompt(savedPrompt);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function loadProjectAndAssets(id: string) {
    const { data: p, error: pErr } = await supabase
      .from("projects")
      .select("id, product_name, style, goal, product_image_path, product_image_url, canonical_product_image_url")
      .eq("id", id)
      .single();
    if (pErr) throw pErr;

    const proj = p as Project;
    setProject(proj);

    // Prefer CANONICAL R2 URL, fallback to legacy URLs
    if (proj.canonical_product_image_url) {
      setProductThumbUrl(proj.canonical_product_image_url);
    } else if (proj.product_image_url) {
      // Legacy R2 URL (non-canonical)
      setProductThumbUrl(proj.product_image_url);
    } else if (proj.product_image_path) {
      // Legacy Supabase Storage
      const { data: s, error: sErr } = await supabase.storage.from("products").createSignedUrl(proj.product_image_path, 60 * 60);
      if (!sErr) setProductThumbUrl(s.signedUrl);
    } else {
      setProductThumbUrl(null);
    }

    const { data: a, error: aErr } = await supabase
      .from("assets")
      .select("id, kind, role, status, storage_bucket, storage_path, mime_type, meta, created_at")
      .eq("project_id", id)
      .eq("kind", "image")
      .order("created_at", { ascending: false });

    if (aErr) throw aErr;

    // Filter out Director Mode assets
    const rows = ((a ?? []) as Asset[]).filter(asset => !asset.meta?.isDirectorMode);

    const signedAssets = await Promise.all(
      rows.map(async (row) => {
        if (!row.storage_path) return { ...row, signedUrl: null } as AssetWithUrl;
        const url = await signedUrl(row.storage_bucket || "assets", row.storage_path);
        return { ...row, signedUrl: url } as AssetWithUrl;
      })
    );

    setAssets(signedAssets);
  }

  // ✅ auto boot: go straight to tool
  useEffect(() => {
    (async () => {
      setMsg(null);
      setLoading(true);

      try {
        const pid = await getOrCreateActiveProject();
        setProjectId(pid);
        await loadProjectAndAssets(pid);
      } catch (e: any) {
        setMsg(e?.message ?? "Boot error");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const recent = assets.slice(0, 24);
    const total = recent.length;
    const pending = recent.filter((a) => a.status === "pending").length;
    const ready = recent.filter((a) => a.status === "ready").length;
    const failed = recent.filter((a) => a.status === "failed").length;
    const done = ready + failed;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, pending, ready, failed, pct };
  }, [assets]);

  async function runAI() {
    if (!projectId) return;
    setRunningAI(true);
    setMsg(null);

    try {
      await ensureAuth();
      const res = await fetch("/api/generate/images/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, userPrompt }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text);

      await loadProjectAndAssets(projectId);
      setMsg("✅ AI completed: pending → ready/failed.");
    } catch (e: any) {
      setMsg(e?.message ?? "AI error");
    } finally {
      setRunningAI(false);
    }
  }

  async function generate() {
    if (!projectId) return;
    setGenerating(true);
    setMsg(null);

    try {
      await ensureAuth();
      const res = await fetch("/api/generate/images/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          roleName: "Lifestyle",
          aspectRatio: ratio,
          quality,
          batchSize,
          userPrompt,
        }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text);

      await loadProjectAndAssets(projectId);

      if (autoRun) await runAI();
    } catch (e: any) {
      setMsg(e?.message ?? "Generation error");
    } finally {
      setGenerating(false);
    }
  }

  // ✅ upload product image via R2 (using upload-asset API)
  async function uploadProductFromTool(file: File | null) {
    if (!file || !projectId) return;
    setMsg(null);

    try {
      // Upload via API (uses R2 with CANONICAL path)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('role', 'product_image');
      formData.append('projectId', projectId); // Required for canonical path

      const response = await fetch('/api/upload-asset', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const { url, assetId } = await response.json();

      // Update project with CANONICAL R2 URL
      const { error: dbErr } = await supabase.from("projects").update({
        canonical_product_image_url: url, // Canonical path: monetiq/inputs/{project_id}/source.png
        product_image_url: null,  // Deprecate legacy field
        product_image_path: null  // Deprecate legacy field
      }).eq("id", projectId);

      if (dbErr) throw dbErr;

      await loadProjectAndAssets(projectId);
      setMsg("✅ Product image uploaded to R2 (canonical path).");
    } catch (e: any) {
      setMsg(e?.message ?? "Upload error");
    }
  }

  if (loading) {
    return <main style={{ padding: 24, color: "white", background: "#0b0b0b" }}>Loading…</main>;
  }

  if (!projectId || !project) {
    return (
      <main style={{ padding: 24 }}>
        <p>Tool boot failed.</p>
        <Link href="/auth">Login</Link>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0b0b0b", color: "white" }}>
      <style>{`
        :root{
          --bg:#0b0b0b;
          --panel: rgba(255,255,255,.04);
          --border: rgba(255,255,255,.12);
          --textDim: rgba(255,255,255,.78);
          --cyan:#00BCD4;
          --cyan2:#00ACC1;
          --cyanGlow: rgba(0,188,212,0.25);
        }
        * { box-sizing: border-box; }
        
        .spin{
          width:16px;
          height:16px;
          border:2px solid rgba(255,255,255,.25);
          border-top-color:var(--cyan);
          border-radius:999px;
          animation:s .9s linear infinite
        }
        @keyframes s{to{transform:rotate(360deg)}}
        
        .pill{
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:8px 12px;
          border-radius:12px;
          border:1px solid var(--border);
          background:var(--panel);
          font-size:12px;
          font-weight:600;
        }
        
        .chip{
          display:inline-flex;
          align-items:center;
          gap:6px;
          padding:8px 10px;
          border-radius:12px;
          border:1px solid var(--border);
          background:var(--panel);
          font-size:11px;
          font-weight:700;
        }
        
        .select{
          appearance:none;
          padding:10px 12px;
          border-radius:12px;
          border:1px solid var(--border);
          background:rgba(0,0,0,.25);
          color:white;
          font-size:12px;
          outline:none;
          cursor:pointer;
        }
        .select:focus{
          border-color: var(--cyan);
          box-shadow: 0 0 0 6px var(--cyanGlow);
        }
        
        .prompt{
          flex:1;
          min-width:700px;
          padding:14px 16px;
          border-radius:14px;
          border:1px solid var(--border);
          background:rgba(0,0,0,.25);
          color:white;
          resize:vertical;
          line-height:1.45;
          font-size:13px;
          min-height:96px;
          font-family:inherit;
        }
        .prompt:focus{
          outline:none;
          border-color: var(--cyan);
          box-shadow: 0 0 0 6px var(--cyanGlow);
        }
        
        .generateBtn{
          padding:14px 20px;
          border-radius:14px;
          border:none;
          background: linear-gradient(135deg, #00BCD4 0%, #00ACC1 100%);
          color:white;
          font-weight:950;
          font-size:14px;
          cursor:pointer;
          box-shadow: 0 10px 30px var(--cyanGlow);
          transition: all 0.2s;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .generateBtn:hover{
          transform: translateY(-2px);
          box-shadow: 0 15px 40px var(--cyanGlow);
        }
        .generateBtn:active{
          transform: translateY(0);
        }
        .generateBtn:disabled{
          opacity:.5;
          cursor:not-allowed;
          box-shadow:none;
          transform: none;
        }
        
        .bar{
          position:fixed;
          left:50%;
          transform:translateX(-50%);
          bottom:18px;
          width:min(1060px,92vw);
          background:rgba(20,20,20,.85);
          border:1px solid var(--border);
          border-radius:18px;
          padding:16px;
          backdrop-filter: blur(12px);
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        }
        
        .row{
          display:flex;
          gap:12px;
          align-items:center;
          flex-wrap:wrap
        }
        
        .metaRow{
          display:flex;
          gap:10px;
          align-items:center;
          flex-wrap:wrap
        }
        
        .thumb{
          width:44px;
          height:44px;
          border-radius:12px;
          border:1px solid var(--border);
          background:var(--panel);
          display:flex;
          align-items:center;
          justify-content:center;
          overflow:hidden;
          cursor:pointer;
          transition: all 0.2s;
        }
        .thumb:hover{
          border-color: var(--cyan);
          box-shadow: 0 4px 12px var(--cyanGlow);
        }
        .thumb img{
          width:100%;
          height:100%;
          object-fit:cover;
          display:block
        }
        
        .grid{
          padding:28px 28px 160px;
          max-width:1150px;
          margin:0 auto;
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:18px
        }
        
        .card{
          border:1px solid var(--border);
          background:var(--panel);
          border-radius:14px;
          overflow:hidden;
          transition: all 0.2s;
        }
        .card:hover{
          border-color: var(--cyan);
          box-shadow: 0 10px 30px var(--cyanGlow);
        }
        
        .cardTop{
          display:flex;
          justify-content:space-between;
          padding:10px 12px;
          font-size:11px;
          font-weight:900;
          opacity:.85;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        
        .imgBtn{
          width:100%;
          border:0;
          background:transparent;
          padding:0;
          cursor:zoom-in;
          transition: opacity 0.2s;
        }
        .imgBtn:hover{
          opacity: 0.9;
        }
        
        .img{
          width:100%;
          height:210px;
          object-fit:cover;
          display:block
        }
        
        .pendingBox{
          height:210px;
          background:rgba(0,0,0,.65);
          display:flex;
          align-items:center;
          justify-content:center;
          gap:10px;
          font-size:12px;
          font-weight:700;
        }
        
        .progressWrap{
          height:8px;
          background:rgba(255,255,255,.12);
          border-radius:999px;
          overflow:hidden;
          flex:1
        }
        
        .progressBar{
          height:100%;
          width:var(--pct);
          background:var(--cyan);
          transition: width 0.3s;
        }
        
        .link{
          color: white;
          opacity:.9;
          transition: all 0.2s;
        }
        .link:hover{
          color: var(--cyan);
          opacity: 1;
        }
        
        /* Responsive */
        @media (max-width: 1024px) {
          .grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .prompt {
            min-width: 100%;
          }
        }
        
        @media (max-width: 768px) {
          .grid {
            grid-template-columns: 1fr;
            padding: 20px 20px 160px;
            gap: 15px;
          }
          .bar {
            bottom: 12px;
            padding: 12px;
          }
          .generateBtn {
            font-size: 13px;
            padding: 12px 16px;
          }
        }
      `}</style>

      <div style={{ padding: 28, maxWidth: 1150, margin: "0 auto" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Image Tool</h1>
        <div style={{ marginTop: 6, opacity: 0.85 }}>
          Style: <strong>{project.style ?? "—"}</strong> — Goal: <strong>{project.goal ?? "—"}</strong>
        </div>
        {msg && <div style={{ marginTop: 10, opacity: 0.92 }}>{msg}</div>}
      </div>

      <div className="grid">
        {displayedAssets.map((a, idx) => (
          <div key={a.id} className="card">
            <div className="cardTop">
              <span>{a.role}</span>
              <span>{a.status}</span>
            </div>

            {a.status === "pending" ? (
              <div className="pendingBox">
                <div className="spin" />
                <span>In progress</span>
              </div>
            ) : a.signedUrl ? (
              <button className="imgBtn" onClick={() => openViewer(idx)} aria-label="Open">
                <img className="img" src={a.signedUrl} alt="asset" />
              </button>
            ) : (
              <div className="pendingBox">
                <span>Preview unavailable</span>
              </div>
            )}

            <div style={{ padding: 10, fontSize: 11, opacity: 0.65, wordBreak: "break-all" }}>{a.id}</div>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="bar">
        <div className="row">
          {/* product thumbnail is now clickable upload */}
          <label className="thumb" title="Click to upload product image">
            {productThumbUrl ? <img src={productThumbUrl} alt="product" /> : <span style={{ fontSize: 12, opacity: 0.9 }}>IMG</span>}
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => uploadProductFromTool(e.target.files?.[0] ?? null)}
            />
          </label>

          <textarea
            className="prompt"
            rows={3}
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="Write your instruction… (Identity lock + setting + rendering)"
          />

          <button className="generateBtn" onClick={generate} disabled={generating || runningAI}>
            {generating || runningAI ? "In progress…" : `Generate ×${batchSize}`}
          </button>
        </div>

        <div className="metaRow" style={{ marginTop: 10 }}>
          <span className="chip">G {modelLabel}</span>

          <select className="select" value={ratio} onChange={(e) => setRatio(e.target.value as any)}>
            {RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>

          <select className="select" value={quality} onChange={(e) => setQuality(e.target.value as any)}>
            {QUALITIES.map((q) => <option key={q} value={q}>{q}</option>)}
          </select>

          <select className="select" value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value) as any)}>
            {BATCHES.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>

          <label className="chip" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={autoRun} onChange={(e) => setAutoRun(e.target.checked)} />
            Auto-run
          </label>

          <button
            className="chip"
            onClick={runAI}
            disabled={runningAI || stats.pending === 0}
            style={{ cursor: runningAI || stats.pending === 0 ? "not-allowed" : "pointer" }}
          >
            {runningAI ? <span className="spin" /> : "Run AI"}
          </button>

          <div className="progressWrap">
            <div className="progressBar" style={{ ["--pct" as any]: `${stats.pct}%` }} />
          </div>

          <span className="pill">{stats.pct}%</span>
          <span className="pill">pending: {stats.pending}</span>
          <span className="pill">ready: {stats.ready}</span>
          <span className="pill">failed: {stats.failed}</span>

          <div style={{ marginLeft: "auto", display: "flex", gap: 14 }}>
            <Link className="link" href="/library">Asset Library</Link>
          </div>
        </div>
      </div>

      {/* Viewer studio (optional keep simple) */}
      {viewerOpen && displayedAssets[viewerIndex]?.signedUrl && (
        <div
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeViewer();
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.82)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 24,
          }}
        >
          <div
            style={{
              width: "min(1280px, 96vw)",
              height: "min(86vh, 860px)",
              background: "rgba(16,16,16,0.92)",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 18,
              overflow: "hidden",
              display: "grid",
              gridTemplateColumns: "1fr 360px",
            }}
          >
            <div style={{ background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
              <img
                src={displayedAssets[viewerIndex].signedUrl!}
                alt="preview"
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)" }}
              />
            </div>

            <div style={{ borderLeft: "1px solid rgba(255,255,255,0.10)", padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 900 }}>Viewer</div>
                <button onClick={closeViewer} style={{ padding: "8px 10px", borderRadius: 10, cursor: "pointer" }}>✕</button>
              </div>

              <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 12, background: "rgba(255,255,255,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 900, fontSize: 12 }}>PROMPT</div>
                  <button onClick={() => copyToClipboard(modalPrompt)} style={{ padding: "6px 10px", borderRadius: 10, cursor: "pointer" }}>
                    Copy
                  </button>
                </div>
                <textarea
                  value={modalPrompt}
                  onChange={(e) => setModalPrompt(e.target.value)}
                  rows={6}
                  style={{ width: "100%", marginTop: 10, padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.22)", color: "white" }}
                />
              </div>

              <button
                onClick={() => downloadUrl(displayedAssets[viewerIndex].signedUrl!, `${displayedAssets[viewerIndex].id}.png`)}
                style={{ padding: "12px 14px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "white", cursor: "pointer", fontWeight: 900 }}
              >
                Download
              </button>

              <button
                onClick={() => {
                  // go to video tool without exposing project route in UX
                  window.location.href = `/video?start=${displayedAssets[viewerIndex].id}`;
                }}
                style={{ padding: "12px 14px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "var(--cyan)", color: "#001018", cursor: "pointer", fontWeight: 900 }}
              >
                🎬 Animate
              </button>

              <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between" }}>
                <button onClick={prevViewer} style={{ padding: "10px 12px", borderRadius: 12, cursor: "pointer" }}>←</button>
                <button onClick={nextViewer} style={{ padding: "10px 12px", borderRadius: 12, cursor: "pointer" }}>→</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
