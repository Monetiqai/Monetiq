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
  status: "new" | "images" | "validated" | "videos" | "exported";
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

function downloadJson(filename: string, data: any) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportPage() {
  const supabase = supabaseBrowser();
  const params = useParams<{ id: string }>();
  const projectId = params?.id;

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [assets, setAssets] = useState<AssetWithUrl[]>([]);

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
    // Project
    const { data: p, error: pErr } = await supabase
      .from("projects")
      .select("id, product_name, style, goal, status")
      .eq("id", id)
      .single();

    if (pErr) throw pErr;
    setProject(p as Project);

    // Assets all kinds
    const { data: a, error: aErr } = await supabase
      .from("assets")
      .select("id, kind, role, status, storage_bucket, storage_path, mime_type, meta, created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: false });

    if (aErr) throw aErr;

    const rows = (a ?? []) as Asset[];

    // Signed URLs
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
  }

  useEffect(() => {
    (async () => {
      setMsg(null);
      setLoading(true);

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

  const images = useMemo(() => assets.filter((a) => a.kind === "image"), [assets]);
  const videos = useMemo(() => assets.filter((a) => a.kind === "video"), [assets]);

  async function markExported() {
    if (!projectId) return;
    setMsg(null);

    try {
      await ensureAuth();

      const { error } = await supabase
        .from("projects")
        .update({ status: "exported" })
        .eq("id", projectId);

      if (error) throw error;

      setMsg("✅ Projet marqué Exporté.");
      await loadProjectAndAssets(projectId);
    } catch (e: any) {
      setMsg(e?.message ?? "Erreur update status");
    }
  }

  function exportConfigJson() {
    if (!project) return;

    const payload = {
      project,
      assets: assets.map((a) => ({
        id: a.id,
        kind: a.kind,
        role: a.role,
        status: a.status,
        storage_bucket: a.storage_bucket,
        storage_path: a.storage_path,
        mime_type: a.mime_type,
        meta: a.meta,
        created_at: a.created_at,
      })),
      exported_at: new Date().toISOString(),
      note: "Signed URLs are temporary and not stored in config.",
    };

    downloadJson(`project-${project.id}-export.json`, payload);
  }

  if (loading) {
    return (
      <main style={{ padding: 24 }}>
        <p>Chargement…</p>
      </main>
    );
  }

  if (!projectId) {
    return (
      <main style={{ padding: 24 }}>
        <p>Route ID manquant.</p>
        <Link href="/dashboard">⬅️ Dashboard</Link>
      </main>
    );
  }

  if (!project) {
    return (
      <main style={{ padding: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700 }}>Projet introuvable</h1>
        {msg && <p style={{ marginTop: 8 }}>{msg}</p>}
        <div style={{ marginTop: 16 }}>
          <Link href="/dashboard">⬅️ Dashboard</Link>
        </div>
      </main>
    );
  }

  const imagesHref = `/project/${projectId}/images`;
  const videosHref = `/project/${projectId}/videos`;

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, fontWeight: 700 }}>Export — {project.product_name}</h1>

      <p style={{ marginTop: 8 }}>
        <strong>Style :</strong> {project.style ?? "—"} — <strong>Objectif :</strong> {project.goal ?? "—"} —{" "}
        <strong>Status :</strong> {project.status}
      </p>

      <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <button onClick={exportConfigJson} style={{ padding: "10px 14px" }}>
          📄 Exporter config JSON
        </button>

        <button onClick={markExported} style={{ padding: "10px 14px" }}>
          ✅ Marquer “Exporté”
        </button>

        <Link href="/dashboard">⬅️ Dashboard</Link>
      </div>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}

      {/* IMAGES */}
      <section style={{ marginTop: 20, border: "1px solid #ddd", padding: 12 }}>
        <h2 style={{ fontSize: 18 }}>Images ({images.length})</h2>

        {images.length === 0 ? (
          <p style={{ marginTop: 8, opacity: 0.8 }}>Aucune image.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
              marginTop: 12,
            }}
          >
            {images.map((img) => (
              <div key={img.id} style={{ border: "1px solid #bbb", padding: 8, background: "#f3f3f3" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong style={{ fontSize: 13 }}>{img.role}</strong>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>{img.status}</span>
                </div>

                <div style={{ marginTop: 8 }}>
                  {img.signedUrl ? (
                    <img
                      src={img.signedUrl}
                      alt="img"
                      style={{ width: "100%", height: 150, objectFit: "cover", border: "1px solid #ccc" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: 150,
                        background: "#e5e5e5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid #ccc",
                      }}
                    >
                      Preview indisponible
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  {img.signedUrl ? (
                    <a href={img.signedUrl} download>
                      Télécharger
                    </a>
                  ) : (
                    <span style={{ opacity: 0.6 }}>Télécharger</span>
                  )}
                </div>

                <div style={{ marginTop: 8, fontSize: 11, opacity: 0.7, wordBreak: "break-all" }}>
                  {img.id}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* VIDEOS */}
      <section style={{ marginTop: 20, border: "1px solid #ddd", padding: 12 }}>
        <h2 style={{ fontSize: 18 }}>Vidéos ({videos.length})</h2>

        {videos.length === 0 ? (
          <p style={{ marginTop: 8, opacity: 0.8 }}>Aucune vidéo.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 12,
              marginTop: 12,
            }}
          >
            {videos.map((v) => (
              <div key={v.id} style={{ border: "1px solid #bbb", padding: 8, background: "#f3f3f3" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong style={{ fontSize: 13 }}>{v.role}</strong>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>{v.status}</span>
                </div>

                <div style={{ marginTop: 8 }}>
                  {v.signedUrl ? (
                    <video
                      src={v.signedUrl}
                      controls
                      style={{ width: "100%", height: 260, background: "#000" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: 260,
                        background: "#e5e5e5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid #ccc",
                      }}
                    >
                      Preview indisponible
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  {v.signedUrl ? (
                    <a href={v.signedUrl} download>
                      Télécharger
                    </a>
                  ) : (
                    <span style={{ opacity: 0.6 }}>Télécharger</span>
                  )}
                </div>

                <div style={{ marginTop: 8, fontSize: 11, opacity: 0.7, wordBreak: "break-all" }}>
                  {v.id}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div style={{ marginTop: 24, display: "flex", gap: 16 }}>
        <Link href={imagesHref}>⬅️ Retour images</Link>
        <Link href={videosHref}>⬅️ Retour vidéos</Link>
      </div>
    </main>
  );
}
