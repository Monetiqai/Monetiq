"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Project = {
  id: string;
  product_name: string;
  style: string | null;
  goal: string | null;
  product_image_path?: string | null;
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

export default function ImagesPage() {
  const supabase = supabaseBrowser();
  const params = useParams<{ id: string }>();
  const projectId = params?.id;

  const [project, setProject] = useState<Project | null>(null);
  const [productThumbUrl, setProductThumbUrl] = useState<string | null>(null);

  const [assets, setAssets] = useState<AssetWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  // bottom bar controls
  const [modelLabel] = useState("Nano Banana Pro");
  const [ratio, setRatio] = useState<(typeof RATIOS)[number]>("16:9");
  const [quality, setQuality] = useState<(typeof QUALITIES)[number]>("1K");
  const [batchSize, setBatchSize] = useState<(typeof BATCHES)[number]>(2);
  const [autoRun, setAutoRun] = useState(true);

  // prompt
  const [userPrompt, setUserPrompt] = useState(
    "Mise en valeur du produit dans un décor ultra réaliste. IDENTITY LOCK: keep product identical (colors, logo, cut, texture). No random changes. No extra logos."
  );

  const [generating, setGenerating] = useState(false);
  const [runningAI, setRunningAI] = useState(false);

  // lightbox viewer studio
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [modalPrompt, setModalPrompt] = useState("");

  const displayedAssets = useMemo(() => assets.slice(0, 8), [assets]);

  function copyToClipboard(text: string) {
    navigator.clipboard?.writeText(text).catch(() => {});
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

  async function loadProjectAndAssets(id: string) {
    const { data: p, error: pErr } = await supabase
      .from("projects")
      .select("id, product_name, style, goal, product_image_path")
      .eq("id", id)
      .single();
    if (pErr) throw pErr;

    const proj = p as Project;
    setProject(proj);

    // product thumb
    if (proj.product_image_path) {
      const { data: signed, error: signErr } = await supabase.storage
        .from("products")
        .createSignedUrl(proj.product_image_path, 60 * 60);
      if (!signErr) setProductThumbUrl(signed.signedUrl);
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

    const rows = (a ?? []) as Asset[];

    const signedAssets = await Promise.all(
      rows.map(async (row) => {
        if (!row.storage_path) return { ...row, signedUrl: null } as AssetWithUrl;

        const { data, error } = await supabase.storage
          .from(row.storage_bucket || "assets")
          .createSignedUrl(row.storage_path, 60 * 60);

        if (error) return { ...row, signedUrl: null } as AssetWithUrl;
        return { ...row, signedUrl: data.signedUrl } as AssetWithUrl;
      })
    );

    setAssets(signedAssets);
  }

  useEffect(() => {
    (async () => {
      setMsg(null);
      setLoading(true);
      if (!projectId) return setLoading(false);

      try {
        await ensureAuth();
        await loadProjectAndAssets(projectId);
      } catch (e: any) {
        setMsg(e?.message ?? "Erreur chargement");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

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
      setMsg("✅ IA terminée : pending → ready/failed.");
    } catch (e: any) {
      setMsg(e?.message ?? "Erreur IA");
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

      if (autoRun) {
        await runAI();
      } else {
        setMsg("✅ Pending créés.");
      }
    } catch (e: any) {
      setMsg(e?.message ?? "Erreur Generate");
    } finally {
      setGenerating(false);
    }
  }

  // poll while running
  useEffect(() => {
    if (!projectId) return;
    const shouldPoll = generating || runningAI;
    if (!shouldPoll) return;
    const t = setInterval(() => {
      loadProjectAndAssets(projectId).catch(() => {});
    }, 2000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, generating, runningAI]);

  // styles for viewer
  function viewerBtnStyle(isClose = false): React.CSSProperties {
    return {
      padding: "8px 10px",
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.18)",
      background: isClose ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.06)",
      color: "white",
      cursor: "pointer",
      fontWeight: isClose ? 900 : 700,
    };
  }

  function miniBtnStyle(): React.CSSProperties {
    return {
      padding: "6px 10px",
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(255,255,255,0.06)",
      color: "white",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 800,
    };
  }

  function actionBtnStyle(): React.CSSProperties {
    return {
      flex: 1,
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(255,255,255,0.06)",
      color: "white",
      cursor: "pointer",
      fontWeight: 800,
    };
  }

  function InfoRow({ label, value }: { label: string; value: string }) {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0" }}>
        <span style={{ fontSize: 12, opacity: 0.7 }}>{label}</span>
        <span style={{ fontSize: 12, opacity: 0.95, maxWidth: 220, textAlign: "right", wordBreak: "break-word" }}>
          {value}
        </span>
      </div>
    );
  }

  if (loading) return <main style={{ padding: 24, color: "white", background: "#0b0b0b" }}>Chargement…</main>;

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
        .spin{
          width:16px;height:16px;border:2px solid rgba(255,255,255,.25);
          border-top-color: var(--sky);
          border-radius:999px;animation:s .9s linear infinite
        }
        @keyframes s{to{transform:rotate(360deg)}}
        .pill{display:inline-flex;align-items:center;gap:8px;padding:8px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);font-size:12px}
        .chip{display:inline-flex;align-items:center;gap:6px;padding:8px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);font-size:12px}
        .select{appearance:none;padding:8px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:white;font-size:12px}
        .prompt{
          flex:1;
          min-width:700px;
          padding:14px 16px;
          border-radius:18px;
          border:1px solid rgba(255,255,255,.16);
          background:rgba(255,255,255,.05);
          color:white;
          resize: vertical;
          line-height:1.45;
          font-size:14px;
          min-height: 96px;
        }
        .prompt:focus{outline:none;border-color: rgba(56,189,248,.55); box-shadow: 0 0 0 6px var(--skyGlow);}
        .generateBtn{
          padding:14px 18px;border-radius:14px;border:1px solid rgba(255,255,255,.12);
          background: var(--sky);color:#001018;font-weight:900;cursor:pointer;
          box-shadow: 0 10px 30px var(--skyGlow);
        }
        .generateBtn:hover{background: var(--sky2);}
        .generateBtn:disabled{opacity:.55;cursor:not-allowed;box-shadow:none}
        .bar{
          position:fixed;left:50%;transform:translateX(-50%);bottom:18px;width:min(1060px,92vw);
          background:rgba(20,20,20,.75);border:1px solid rgba(255,255,255,.14);border-radius:22px;padding:14px;
          backdrop-filter: blur(10px);
        }
        .row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
        .metaRow{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
        .thumb{
          width:44px;height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.14);
          background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;overflow:hidden;
        }
        .thumb img{width:100%;height:100%;object-fit:cover;display:block}
        .grid{
          padding:28px 28px 160px;max-width:1150px;margin:0 auto;
          display:grid;grid-template-columns:repeat(3,1fr);gap:16px
        }
        .card{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);border-radius:14px;overflow:hidden}
        .cardTop{display:flex;justify-content:space-between;padding:10px 12px;font-size:12px;opacity:.9}
        .imgBtn{width:100%;border:0;background:transparent;padding:0;cursor:zoom-in}
        .img{width:100%;height:210px;object-fit:cover;display:block}
        .pendingBox{height:210px;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;gap:10px}
        .progressWrap{height:8px;background:rgba(255,255,255,.12);border-radius:999px;overflow:hidden;flex:1}
        .progressBar{height:100%;width:var(--pct);background:var(--sky)}
        .link{color: white; opacity:.9}
        .link:hover{color: var(--sky)}
      `}</style>

      <div style={{ padding: 28, maxWidth: 1150, margin: "0 auto" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>
          Images — {project.product_name}
        </h1>
        <div style={{ marginTop: 6, opacity: 0.85, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span>Style : <strong>{project.style ?? "—"}</strong></span>
          <span>—</span>
          <span>Objectif : <strong>{project.goal ?? "—"}</strong></span>
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
                <span>Preview indisponible</span>
              </div>
            )}

            <div style={{ padding: 10, fontSize: 11, opacity: 0.65, wordBreak: "break-all" }}>
              {a.id}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="bar">
        <div className="row">
          <div className="thumb" title="Produit">
            {productThumbUrl ? <img src={productThumbUrl} alt="product" /> : <span style={{ fontSize: 12, opacity: 0.9 }}>IMG</span>}
          </div>

          <textarea
            className="prompt"
            rows={3}
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="Écris ton instruction… (Identity lock + décor + rendu)"
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
            <input
              type="checkbox"
              checked={autoRun}
              onChange={(e) => setAutoRun(e.target.checked)}
              style={{ transform: "translateY(1px)" }}
            />
            Auto-run
          </label>

          <button
            className="chip"
            onClick={runAI}
            disabled={runningAI || stats.pending === 0}
            style={{ cursor: runningAI || stats.pending === 0 ? "not-allowed" : "pointer" }}
            title="Run AI on pending"
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

      {/* Viewer studio */}
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
            {/* LEFT */}
            <div style={{ position: "relative", background: "rgba(0,0,0,0.35)" }}>
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  left: 12,
                  right: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    pointerEvents: "auto",
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    padding: "8px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(0,0,0,0.35)",
                  }}
                >
                  <span style={{ fontSize: 12, opacity: 0.9 }}>
                    {displayedAssets[viewerIndex].role} · {displayedAssets[viewerIndex].status}
                  </span>
                  <span style={{ fontSize: 12, opacity: 0.6 }}>
                    {viewerIndex + 1}/{displayedAssets.length}
                  </span>
                </div>

                <div style={{ pointerEvents: "auto", display: "flex", gap: 8 }}>
                  <button onClick={prevViewer} style={viewerBtnStyle()} aria-label="Prev">←</button>
                  <button onClick={nextViewer} style={viewerBtnStyle()} aria-label="Next">→</button>
                  <button onClick={closeViewer} style={viewerBtnStyle(true)} aria-label="Close">✕</button>
                </div>
              </div>

              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
                <img
                  src={displayedAssets[viewerIndex].signedUrl!}
                  alt="preview"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(0,0,0,0.2)",
                  }}
                />
              </div>
            </div>

            {/* RIGHT */}
            <div
              style={{
                borderLeft: "1px solid rgba(255,255,255,0.10)",
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div
                style={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 14,
                  padding: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div style={{ fontWeight: 800, fontSize: 12, opacity: 0.9 }}>PROMPT</div>
                  <button onClick={() => copyToClipboard(modalPrompt)} style={miniBtnStyle()}>
                    Copy
                  </button>
                </div>

                <textarea
                  value={modalPrompt}
                  onChange={(e) => setModalPrompt(e.target.value)}
                  rows={5}
                  style={{
                    width: "100%",
                    marginTop: 10,
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(0,0,0,0.22)",
                    color: "white",
                    resize: "vertical",
                    lineHeight: 1.4,
                  }}
                  placeholder="Prompt utilisé pour ce rendu…"
                />
              </div>

              <div
                style={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 14,
                  padding: 12,
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 12, opacity: 0.9, marginBottom: 10 }}>INFORMATION</div>

                <InfoRow label="Model" value={String(displayedAssets[viewerIndex]?.meta?.model ?? "—")} />
                <InfoRow label="Ratio" value={String(displayedAssets[viewerIndex]?.meta?.ui?.aspectRatio ?? ratio)} />
                <InfoRow label="Quality" value={String(displayedAssets[viewerIndex]?.meta?.ui?.quality ?? quality)} />
                <InfoRow label="Batch" value={String(displayedAssets[viewerIndex]?.meta?.ui?.batchSize ?? batchSize)} />
                <InfoRow label="Role" value={String(displayedAssets[viewerIndex]?.role ?? "—")} />
                <InfoRow label="Status" value={String(displayedAssets[viewerIndex]?.status ?? "—")} />
                <InfoRow label="Asset ID" value={String(displayedAssets[viewerIndex]?.id ?? "—")} />
              </div>

              <button
                onClick={() => {
                  window.location.href = `/project/${projectId}/videos`;
                }}
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "var(--sky)",
                  color: "#001018",
                  fontWeight: 900,
                  cursor: "pointer",
                  boxShadow: "0 10px 30px var(--skyGlow)",
                }}
              >
                🎬 Animate
              </button>

              <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
                <button
                  onClick={() =>
                    downloadUrl(displayedAssets[viewerIndex].signedUrl!, `${displayedAssets[viewerIndex].id}.png`)
                  }
                  style={actionBtnStyle()}
                >
                  Download
                </button>

                <button
                  onClick={() => {
                    const ref = project?.product_image_path ?? "";
                    copyToClipboard(ref);
                    setMsg("✅ Reference copied (path).");
                  }}
                  style={actionBtnStyle()}
                >
                  Reference
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
