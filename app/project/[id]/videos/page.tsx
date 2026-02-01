"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

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
  status: "pending" | "ready" | "failed";
  storage_bucket: string;
  storage_path: string | null;
  mime_type: string | null;
  meta: any;
  created_at: string;
};

type AssetWithUrl = Asset & { signedUrl: string | null };

const RATIOS = ["16:9", "9:16", "1:1", "4:3", "3:4"] as const;
const QUALITIES = ["720p", "1080p"] as const;
const DURATIONS = [6, 8] as const;

const PRESETS = [
  { id: "general", label: "GENERAL" },
  { id: "cinematic_push", label: "Cinematic Push-in" },
  { id: "parallax_pan", label: "Parallax Pan" },
  { id: "detail_macro", label: "Detail Macro" },
  { id: "lifestyle_walk", label: "Lifestyle" },
] as const;

export default function VideosPage() {
  const supabase = supabaseBrowser();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const projectId = params?.id;

  // ✅ selected reference image asset (NO MASTER)
  const [startImageAssetId, setStartImageAssetId] = useState<string | null>(null);
  const [startImage, setStartImage] = useState<AssetWithUrl | null>(null);

  // picker modal
  const [pickerOpen, setPickerOpen] = useState(false);
  const [imageOptions, setImageOptions] = useState<AssetWithUrl[]>([]);
  const [uploadingRef, setUploadingRef] = useState(false);

  const [project, setProject] = useState<Project | null>(null);
  const [videos, setVideos] = useState<AssetWithUrl[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // UI controls
  const [preset, setPreset] = useState<(typeof PRESETS)[number]["id"]>("general");
  const [ratio, setRatio] = useState<(typeof RATIOS)[number]>("16:9");
  const [quality, setQuality] = useState<(typeof QUALITIES)[number]>("720p");
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>(8);

  const [enhance, setEnhance] = useState(true);
  const [multiShot, setMultiShot] = useState(false);

  const [prompt, setPrompt] = useState(
    "Animate the reference image into a short realistic e-commerce clip. IDENTITY LOCK: keep the product identical. No transformations. Only camera motion + subtle lighting/fabric motion."
  );

  const [creating, setCreating] = useState(false);
  const [running, setRunning] = useState(false);

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

  async function loadProject(id: string) {
    const { data: p, error: pErr } = await supabase
      .from("projects")
      .select("id, product_name, style, goal")
      .eq("id", id)
      .single();
    if (pErr) throw pErr;
    setProject(p as Project);
  }

  async function loadVideos(id: string) {
    const { data: v, error: vErr } = await supabase
      .from("assets")
      .select("id, kind, role, status, storage_bucket, storage_path, mime_type, meta, created_at")
      .eq("project_id", id)
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

    setVideos(signedVideos);
  }

  async function loadStartImageById(id: string) {
    const { data, error } = await supabase
      .from("assets")
      .select("id, kind, role, status, storage_bucket, storage_path, mime_type, meta, created_at")
      .eq("id", id)
      .eq("kind", "image")
      .single();

    if (error) throw error;

    const row = data as Asset;
    const url = row.storage_path ? await signedUrl(row.storage_bucket || "assets", row.storage_path) : null;
    setStartImage({ ...row, signedUrl: url });
  }

  async function loadImageOptions(id: string) {
    // list READY images for project
    const { data, error } = await supabase
      .from("assets")
      .select("id, kind, role, status, storage_bucket, storage_path, mime_type, meta, created_at")
      .eq("project_id", id)
      .eq("kind", "image")
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) throw error;

    const rows = (data ?? []) as Asset[];
    const signedImgs = await Promise.all(
      rows.map(async (row) => {
        const url = row.storage_path ? await signedUrl(row.storage_bucket || "assets", row.storage_path) : null;
        return { ...row, signedUrl: url } as AssetWithUrl;
      })
    );

    setImageOptions(signedImgs);
  }

  // init: pick start from query ?start=
  useEffect(() => {
    if (!projectId) return;
    const start = searchParams.get("start");
    if (start) setStartImageAssetId(start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // load page
  useEffect(() => {
    (async () => {
      setMsg(null);
      setLoading(true);

      if (!projectId) return setLoading(false);

      try {
        await ensureAuth();
        await loadProject(projectId);
        await loadVideos(projectId);

        // if start id exists, load it
        if (startImageAssetId) {
          await loadStartImageById(startImageAssetId);
        }
      } catch (e: any) {
        setMsg(e?.message ?? "Erreur chargement");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, startImageAssetId]);

  const stats = useMemo(() => {
    const total = videos.length;
    const pending = videos.filter((v) => v.status === "pending").length;
    const ready = videos.filter((v) => v.status === "ready").length;
    const failed = videos.filter((v) => v.status === "failed").length;
    const done = ready + failed;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, pending, ready, failed, pct };
  }, [videos]);

  async function createPendingVideo() {
    if (!projectId) return;
    setCreating(true);
    setMsg(null);

    try {
      await ensureAuth();

      const res = await fetch("/api/generate/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text);

      await loadVideos(projectId);
      setMsg("✅ 1 vidéo pending créée.");
    } catch (e: any) {
      setMsg(e?.message ?? "Erreur création video");
    } finally {
      setCreating(false);
    }
  }

  async function runVeo() {
    if (!projectId) return;
    if (!startImageAssetId) {
      setMsg("⚠️ Choisis une image de référence avant de générer.");
      return;
    }

    setRunning(true);
    setMsg(null);

    try {
      await ensureAuth();

      const res = await fetch("/api/generate/videos/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          startImageAssetId, // ✅ crucial
          prompt,
          ratio,
          durationSeconds: duration,
          // keep extra info (optional)
          preset,
          quality,
          enhance,
          multiShot,
        }),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text);

      await loadVideos(projectId);
      setMsg("✅ Veo terminé : pending → ready/failed.");
    } catch (e: any) {
      setMsg(e?.message ?? "Erreur Veo");
    } finally {
      setRunning(false);
    }
  }

  async function openPicker() {
    if (!projectId) return;
    setMsg(null);
    try {
      await ensureAuth();
      await loadImageOptions(projectId);
      setPickerOpen(true);
    } catch (e: any) {
      setMsg(e?.message ?? "Erreur chargement images");
    }
  }

  function chooseStartImage(a: AssetWithUrl) {
    setStartImageAssetId(a.id);
    setStartImage(a);
    setPickerOpen(false);
    setMsg("✅ Image de référence sélectionnée.");
  }

  function removeStartImage() {
    setStartImageAssetId(null);
    setStartImage(null);
    setMsg("✅ Image de référence retirée.");
  }

  // upload new reference image -> store in assets bucket and insert row -> select it
  async function uploadNewReference(file: File | null) {
    if (!file || !projectId) return;
    setUploadingRef(true);
    setMsg(null);

    try {
      const user = await ensureAuth();
      if (!user) return;

      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${projectId}/refs/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage.from("assets").upload(path, file, {
        upsert: true,
        contentType: file.type || "image/png",
      });
      if (upErr) throw upErr;

      const { data: signed, error: sErr } = await supabase.storage.from("assets").createSignedUrl(path, 60 * 60);
      if (sErr) throw sErr;

      const { data: row, error: insErr } = await supabase
        .from("assets")
        .insert({
          user_id: user.id,
          project_id: projectId,
          kind: "image",
          role: "video_ref",
          status: "ready",
          storage_bucket: "assets",
          storage_path: path,
          mime_type: file.type || "image/png",
          meta: { source: "video_ref_upload" },
        })
        .select("id, kind, role, status, storage_bucket, storage_path, mime_type, meta, created_at")
        .single();

      if (insErr) throw insErr;

      const newAsset = row as Asset;
      setStartImageAssetId(newAsset.id);
      setStartImage({ ...newAsset, signedUrl: signed.signedUrl });
      setPickerOpen(false);
      setMsg("✅ Nouvelle image de référence uploadée.");
    } catch (e: any) {
      setMsg(e?.message ?? "Erreur upload référence");
    } finally {
      setUploadingRef(false);
    }
  }

  // poll refresh
  useEffect(() => {
    if (!projectId) return;
    const shouldPoll = creating || running;
    if (!shouldPoll) return;

    const t = setInterval(() => {
      loadVideos(projectId).catch(() => {});
    }, 2500);

    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, creating, running]);

  if (loading) {
    return <main style={{ padding: 24, color: "white", background: "#0b0b0b" }}>Chargement…</main>;
  }
  if (!projectId || !project) {
    return (
      <main style={{ padding: 24 }}>
        <p>Projet introuvable.</p>
        <Link href="/dashboard">⬅️ Dashboard</Link>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0b0b0b", color: "white" }}>
      <style>{`
        :root{
          --sky:#38BDF8;
          --sky2:#0EA5E9;
          --skyGlow: rgba(56,189,248,0.25);
        }
        .layout{
          display:grid;
          grid-template-columns: 320px 1fr;
          gap: 18px;
          padding: 22px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .panel{
          border:1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.04);
          border-radius: 16px;
          padding: 14px;
        }
        .title{font-size:26px;font-weight:900;margin:0}
        .sub{opacity:.85;margin-top:6px}
        .chip{
          display:inline-flex;align-items:center;gap:8px;
          padding:8px 10px;border-radius:999px;
          border:1px solid rgba(255,255,255,.14);
          background: rgba(255,255,255,.06);
          font-size:12px;
        }
        .btn{
          width:100%;
          padding: 12px 14px;
          border-radius: 14px;
          border:1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.06);
          color:white;
          cursor:pointer;
          font-weight:900;
        }
        .btnPrimary{
          background: var(--sky);
          color:#001018;
          box-shadow: 0 10px 30px var(--skyGlow);
          border-color: rgba(255,255,255,.10);
        }
        .btnPrimary:hover{background: var(--sky2);}
        .btn:disabled{opacity:.55;cursor:not-allowed;box-shadow:none}
        .select, .textarea{
          width:100%;
          padding:10px 12px;
          border-radius: 12px;
          border:1px solid rgba(255,255,255,.14);
          background: rgba(0,0,0,.20);
          color:white;
        }
        .textarea{resize:vertical;line-height:1.4}
        .label{font-size:12px;opacity:.8;margin-bottom:6px}
        .thumb{
          width:100%;
          aspect-ratio: 16/9;
          border-radius: 14px;
          border:1px solid rgba(255,255,255,.12);
          overflow:hidden;
          background: rgba(255,255,255,.06);
          display:flex;align-items:center;justify-content:center;
          position: relative;
        }
        .thumb img{width:100%;height:100%;object-fit:cover;display:block}
        .thumbBar{
          position:absolute;
          bottom:10px;
          left:10px;
          right:10px;
          display:flex;
          gap:8px;
        }
        .miniBtn{
          flex:1;
          padding:8px 10px;
          border-radius: 12px;
          border:1px solid rgba(255,255,255,.14);
          background: rgba(0,0,0,.35);
          color:white;
          cursor:pointer;
          font-weight:800;
          font-size:12px;
        }
        .miniBtn:hover{border-color: rgba(56,189,248,.5)}
        .spin{width:16px;height:16px;border:2px solid rgba(255,255,255,.25);border-top-color:var(--sky);border-radius:999px;animation:s .9s linear infinite}
        @keyframes s{to{transform:rotate(360deg)}}
        .progressWrap{height:8px;background:rgba(255,255,255,.12);border-radius:999px;overflow:hidden;flex:1}
        .progressBar{height:100%;width:var(--pct);background:var(--sky)}
        .grid{
          display:grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-top: 14px;
        }
        .card{
          border:1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.04);
          border-radius: 14px;
          overflow:hidden;
        }
        .cardTop{
          display:flex;justify-content:space-between;
          padding:10px 12px;font-size:12px;opacity:.9;
        }
        .pendingBox{
          height: 260px;
          background: rgba(0,0,0,.55);
          display:flex;align-items:center;justify-content:center;gap:10px;
        }
        .video{
          width:100%;
          height:260px;
          background:#000;
        }
        .modalOverlay{
          position:fixed; inset:0;
          background: rgba(0,0,0,0.82);
          display:flex; align-items:center; justify-content:center;
          z-index: 9999;
          padding: 24px;
        }
        .modal{
          width:min(980px, 96vw);
          max-height: 86vh;
          background: rgba(16,16,16,0.96);
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 18px;
          overflow:hidden;
          display:flex;
          flex-direction:column;
        }
        .modalHeader{
          display:flex; justify-content:space-between; align-items:center;
          padding: 12px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.10);
        }
        .modalBody{
          padding: 14px;
          overflow:auto;
        }
        .pickGrid{
          display:grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-top: 12px;
        }
        .pickItem{
          border:1px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          overflow:hidden;
          background: rgba(255,255,255,0.04);
          cursor:pointer;
        }
        .pickItem img{width:100%;height:120px;object-fit:cover;display:block}
        .pickItem:hover{border-color: rgba(56,189,248,0.45)}
      `}</style>

      <div style={{ padding: 22, maxWidth: 1400, margin: "0 auto" }}>
        <h1 className="title">Video — {project.product_name}</h1>
        <div className="sub">
          Style : <strong>{project.style ?? "—"}</strong> — Objectif : <strong>{project.goal ?? "—"}</strong>
        </div>
        {msg && <div style={{ marginTop: 10, opacity: 0.95 }}>{msg}</div>}
      </div>

      <div className="layout">
        {/* LEFT SIDEBAR */}
        <div className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <div style={{ fontWeight: 900 }}>Create Video</div>
            {(creating || running) && <div className="spin" title="In progress" />}
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="label">Reference image</div>

            <div className="thumb">
              {startImage?.signedUrl ? (
                <img src={startImage.signedUrl} alt="ref" />
              ) : (
                <span style={{ opacity: 0.8, fontSize: 12 }}>No reference selected</span>
              )}

              <div className="thumbBar">
                <button className="miniBtn" onClick={openPicker}>
                  Change
                </button>
                <button className="miniBtn" onClick={removeStartImage} disabled={!startImageAssetId}>
                  Remove
                </button>
              </div>
            </div>

            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="chip">Model: Veo</span>
              <span className="chip">Preset: {preset}</span>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="label">Prompt (lock + motion)</div>
            <textarea
              className="textarea"
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the motion, camera, and keep identity..."
            />
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <label className="chip" style={{ cursor: "pointer" }}>
                <input type="checkbox" checked={enhance} onChange={(e) => setEnhance(e.target.checked)} />
                Enhance
              </label>
              <label className="chip" style={{ cursor: "pointer" }}>
                <input type="checkbox" checked={multiShot} onChange={(e) => setMultiShot(e.target.checked)} />
                Multi-shot
              </label>
            </div>
          </div>

          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div className="label">Ratio</div>
              <select className="select" value={ratio} onChange={(e) => setRatio(e.target.value as any)}>
                {RATIOS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="label">Quality</div>
              <select className="select" value={quality} onChange={(e) => setQuality(e.target.value as any)}>
                {QUALITIES.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="label">Duration</div>
              <select className="select" value={duration} onChange={(e) => setDuration(Number(e.target.value) as any)}>
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>{d}s</option>
                ))}
              </select>
            </div>

            <div>
              <div className="label">Preset</div>
              <select className="select" value={preset} onChange={(e) => setPreset(e.target.value as any)}>
                {PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <button className="btn" onClick={createPendingVideo} disabled={creating}>
              ⚡ Create video (pending)
            </button>
          </div>

          <div style={{ marginTop: 10 }}>
            <button
              className="btn btnPrimary"
              onClick={runVeo}
              disabled={running || stats.pending === 0 || !startImageAssetId}
              title={!startImageAssetId ? "Select a reference image first" : "Run Veo"}
            >
              🎬 Generate (Run Veo)
            </button>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
            <div className="progressWrap">
              <div className="progressBar" style={{ ["--pct" as any]: `${stats.pct}%` }} />
            </div>
            <span className="chip">{stats.pct}%</span>
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="chip">pending: {stats.pending}</span>
            <span className="chip">ready: {stats.ready}</span>
            <span className="chip">failed: {stats.failed}</span>
          </div>

          <div style={{ marginTop: 14 }}>
            <Link href={`/project/${projectId}/images`} style={{ color: "white", opacity: 0.9 }}>
              ⬅️ Back to Images
            </Link>
          </div>
        </div>

        {/* RIGHT CONTENT */}
        <div className="panel">
          <div style={{ fontSize: 28, fontWeight: 900 }}>MAKE VIDEOS IN ONE CLICK</div>
          <div style={{ opacity: 0.8, marginTop: 6 }}>
            Choose a reference image, pick preset, generate final animated video.
          </div>

          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <div className="panel" style={{ padding: 14 }}>
              <div style={{ fontWeight: 900 }}>ADD IMAGE</div>
              <div style={{ opacity: 0.75, marginTop: 6 }}>Your selected reference image is used.</div>
              <div style={{ marginTop: 10, opacity: 0.9 }}>
                {startImageAssetId ? "✅ Reference loaded" : "⚠️ No reference selected"}
              </div>
            </div>

            <div className="panel" style={{ padding: 14 }}>
              <div style={{ fontWeight: 900 }}>CHOOSE PRESET</div>
              <div style={{ opacity: 0.75, marginTop: 6 }}>Pick a camera movement preset.</div>
              <div style={{ marginTop: 10 }}>
                <span className="chip">{PRESETS.find((p) => p.id === preset)?.label ?? preset}</span>
              </div>
            </div>

            <div className="panel" style={{ padding: 14 }}>
              <div style={{ fontWeight: 900 }}>GET VIDEO</div>
              <div style={{ opacity: 0.75, marginTop: 6 }}>Click Generate to create your final animated video.</div>
              <div style={{ marginTop: 10 }}>
                <button className="btn btnPrimary" onClick={runVeo} disabled={running || stats.pending === 0 || !startImageAssetId}>
                  🎬 Generate
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, fontWeight: 900 }}>RESULTS</div>

          {videos.length === 0 ? (
            <div style={{ marginTop: 10, opacity: 0.8 }}>No videos yet. Create pending then generate.</div>
          ) : (
            <div className="grid">
              {videos.slice(0, 4).map((v) => (
                <div key={v.id} className="card">
                  <div className="cardTop">
                    <span>{v.role}</span>
                    <span>{v.status}</span>
                  </div>

                  {v.status === "pending" ? (
                    <div className="pendingBox">
                      <div className="spin" />
                      <span>In progress</span>
                    </div>
                  ) : v.signedUrl ? (
                    <video className="video" src={v.signedUrl} controls />
                  ) : (
                    <div className="pendingBox">Preview unavailable</div>
                  )}

                  <div style={{ padding: 10, fontSize: 11, opacity: 0.7, wordBreak: "break-all" }}>{v.id}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Picker Modal */}
      {pickerOpen && (
        <div
          className="modalOverlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPickerOpen(false);
          }}
        >
          <div className="modal">
            <div className="modalHeader">
              <div style={{ fontWeight: 900 }}>Choose reference image</div>
              <button className="miniBtn" onClick={() => setPickerOpen(false)}>✕</button>
            </div>

            <div className="modalBody">
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <label className="chip" style={{ cursor: "pointer" }}>
                  Upload new reference
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => uploadNewReference(e.target.files?.[0] ?? null)}
                    disabled={uploadingRef}
                  />
                </label>

                {uploadingRef && (
                  <span className="chip">
                    <span className="spin" /> Uploading…
                  </span>
                )}

                <span style={{ opacity: 0.75, fontSize: 12 }}>
                  Tip: choose a clean product frame for best identity lock.
                </span>
              </div>

              <div className="pickGrid">
                {imageOptions.map((a) => (
                  <div key={a.id} className="pickItem" onClick={() => chooseStartImage(a)} title={a.id}>
                    {a.signedUrl ? (
                      <img src={a.signedUrl} alt="ref" />
                    ) : (
                      <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.7 }}>
                        No preview
                      </div>
                    )}
                    <div style={{ padding: 8, fontSize: 11, opacity: 0.85 }}>
                      {a.role} · {a.status}
                    </div>
                  </div>
                ))}
              </div>

              {imageOptions.length === 0 && (
                <div style={{ marginTop: 12, opacity: 0.8 }}>
                  No ready images yet. Generate images first.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
