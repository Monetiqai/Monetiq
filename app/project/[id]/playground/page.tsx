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

function roleLabel(role: string) {
  const map: Record<string, string> = {
    hero: "Hero",
    lifestyle: "Lifestyle",
    detail: "Detail",
    benefit: "Benefit",
    variant: "Variant",
    social: "Social",
    master: "Master",
  };
  return map[role] ?? role;
}

export default function PlaygroundPage() {
  const supabase = supabaseBrowser();
  const params = useParams<{ id: string }>();
  const projectId = params?.id;

  // data
  const [project, setProject] = useState<Project | null>(null);
  const [assets, setAssets] = useState<AssetWithUrl[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  // UI controls
  const [prompt, setPrompt] = useState("Mise en valeur du produit dans un décor ultra réaliste");
  const [ratio, setRatio] = useState<(typeof RATIOS)[number]>("16:9");
  const [quality, setQuality] = useState<(typeof QUALITIES)[number]>("1K");
  const [batchSize, setBatchSize] = useState(2);
  const [renderName, setRenderName] = useState("Lifestyle");

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [runningAI, setRunningAI] = useState(false);

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
      .select("id, product_name, style, goal")
      .eq("id", id)
      .single();
    if (pErr) throw pErr;
    setProject(p as Project);

    const { data: a, error: aErr } = await supabase
      .from("assets")
      .select("id, kind, role, status, storage_bucket, storage_path, mime_type, meta, created_at")
      .eq("project_id", id)
      .eq("kind", "image")
      .order("created_at", { ascending: false });

    if (aErr) throw aErr;
    const rows = (a ?? []) as Asset[];

    const signed = await Promise.all(
      rows.map(async (row) => {
        if (!row.storage_path) return { ...row, signedUrl: null } as AssetWithUrl;
        const { data, error } = await supabase.storage
          .from(row.storage_bucket || "assets")
          .createSignedUrl(row.storage_path, 60 * 60);
        if (error) return { ...row, signedUrl: null } as AssetWithUrl;
        return { ...row, signedUrl: data.signedUrl } as AssetWithUrl;
      })
    );

    setAssets(signed);

    // auto-select latest ready
    if (!selectedAssetId) {
      const firstReady = signed.find((x) => x.status === "ready" && x.signedUrl);
      if (firstReady) setSelectedAssetId(firstReady.id);
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg(null);

      if (!projectId) {
        setLoading(false);
        return;
      }

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

  const selected = useMemo(
    () => assets.find((a) => a.id === selectedAssetId) ?? null,
    [assets, selectedAssetId]
  );

  const pendingCount = useMemo(() => assets.filter((a) => a.status === "pending").length, [assets]);

  async function generate() {
    if (!projectId) return;
    setGenerating(true);
    setMsg(null);

    try {
      await ensureAuth();

      // Create pending assets with your UI params
      const res = await fetch("/api/generate/images/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          roleName: renderName.trim() || "custom",
          aspectRatio: ratio,
          quality,
          batchSize,
          prompt, // stored in meta for later use if you want
        }),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text);

      await loadProjectAndAssets(projectId);
      setMsg("✅ In progress… (assets pending créés)");
    } catch (e: any) {
      setMsg(e?.message ?? "Erreur generate");
    } finally {
      setGenerating(false);
    }
  }

  async function runAI() {
    if (!projectId) return;
    setRunningAI(true);
    setMsg(null);

    try {
      await ensureAuth();

      // Your existing Nano Banana Pro run endpoint
      const res = await fetch("/api/generate/images/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text);

      await loadProjectAndAssets(projectId);
      setMsg("✅ IA terminée (pending → ready)");
    } catch (e: any) {
      setMsg(e?.message ?? "Erreur IA");
    } finally {
      setRunningAI(false);
    }
  }

  if (loading) {
    return <main style={{ padding: 24 }}>Chargement…</main>;
  }

  if (!projectId || !project) {
    return (
      <main style={{ padding: 24 }}>
        Projet introuvable. <Link href="/dashboard">Dashboard</Link>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        paddingBottom: 140, // space for bottom bar
      }}
    >
      {/* Top minimal header */}
      <div style={{ padding: 16, display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{project.product_name}</div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>
            Style: {project.style ?? "—"} — Objectif: {project.goal ?? "—"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href={`/project/${projectId}/images`}>Images</Link>
          <Link href={`/project/${projectId}/videos`}>Vidéos</Link>
          <Link href={`/project/${projectId}/export`}>Export</Link>
        </div>
      </div>

      {/* Canvas area */}
      <div style={{ display: "flex", gap: 16, padding: 16 }}>
        <div style={{ flex: 1, minHeight: 520, background: "#050505", border: "1px solid #222" }}>
          {!selected?.signedUrl ? (
            <div style={{ padding: 24, opacity: 0.85 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Canvas</div>
              <div style={{ marginTop: 8 }}>Aucun rendu sélectionné.</div>
              <div style={{ marginTop: 8, opacity: 0.7 }}>
                Clique sur un rendu à droite ou lance un Generate.
              </div>
            </div>
          ) : (
            <img
              src={selected.signedUrl}
              alt="canvas"
              style={{ width: "100%", height: 520, objectFit: "contain", display: "block" }}
            />
          )}
        </div>

        {/* Right thumbnails */}
        <div style={{ width: 340 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Rendus</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {assets.slice(0, 12).map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedAssetId(a.id)}
                style={{
                  background: selectedAssetId === a.id ? "#111" : "#070707",
                  border: selectedAssetId === a.id ? "1px solid #fff" : "1px solid #222",
                  padding: 8,
                  textAlign: "left",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  {roleLabel(a.role)} · {a.status}
                </div>

                <div style={{ marginTop: 6 }}>
                  {a.status === "pending" ? (
                    <div
                      style={{
                        height: 90,
                        background: "#111",
                        border: "1px solid #222",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 8,
                        fontSize: 12,
                        opacity: 0.9,
                      }}
                    >
                      In progress ⏳
                    </div>
                  ) : a.signedUrl ? (
                    <img
                      src={a.signedUrl}
                      alt="thumb"
                      style={{ width: "100%", height: 90, objectFit: "cover", border: "1px solid #222" }}
                    />
                  ) : (
                    <div
                      style={{
                        height: 90,
                        background: "#222",
                        border: "1px solid #333",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        opacity: 0.8,
                      }}
                    >
                      no preview
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div style={{ marginTop: 12, fontSize: 12, opacity: 0.8 }}>
            Pending: {pendingCount}
          </div>

          {msg && <div style={{ marginTop: 10, fontSize: 12, opacity: 0.9 }}>{msg}</div>}
        </div>
      </div>

      {/* Bottom Center Bar */}
      <div
        style={{
          position: "fixed",
          left: "50%",
          bottom: 18,
          transform: "translateX(-50%)",
          width: "min(980px, calc(100vw - 32px))",
          background: "rgba(20,20,20,0.92)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 18,
          padding: 14,
          backdropFilter: "blur(10px)",
        }}
      >
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          {/* Left prompt */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, opacity: 0.75 }}>Prompt</div>
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              style={{
                marginTop: 6,
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(0,0,0,0.35)",
                color: "#fff",
              }}
              placeholder="Décris le rendu à générer..."
            />

            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <span style={chipStyle}>Nano Banana Pro</span>

              <select value={ratio} onChange={(e) => setRatio(e.target.value as any)} style={selectStyle}>
                {RATIOS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              <select value={quality} onChange={(e) => setQuality(e.target.value as any)} style={selectStyle}>
                {QUALITIES.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>

              <select value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))} style={selectStyle}>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>{n}×</option>
                ))}
              </select>

              <input
                value={renderName}
                onChange={(e) => setRenderName(e.target.value)}
                style={{
                  ...selectStyle,
                  width: 160,
                }}
                placeholder="Nom du rendu"
              />
            </div>
          </div>

          {/* Right actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 170 }}>
            <button
              onClick={generate}
              disabled={generating}
              style={{
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "#c9ff2f",
                color: "#111",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Generate ×{batchSize}
            </button>

            <button
              onClick={runAI}
              disabled={runningAI || pendingCount === 0}
              style={{
                padding: "10px 14px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                cursor: pendingCount === 0 ? "not-allowed" : "pointer",
                opacity: pendingCount === 0 ? 0.6 : 1,
              }}
            >
              Run AI
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

const chipStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  fontSize: 12,
  color: "#fff",
};

const selectStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.35)",
  color: "#fff",
  fontSize: 12,
};
