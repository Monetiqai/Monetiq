"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { uploadProductImage } from "@/lib/storage-products";
import { useParams } from "next/navigation";

type Project = {
  id: string;
  product_name: string;
  style: string | null;
  goal: string | null;
  status: "new" | "images" | "validated" | "videos" | "exported";
  product_image_path: string | null;
};

const STYLES = [
  "Clean Commerce",
  "Premium Luxury",
  "Lifestyle Realistic",
  "Social UGC Ads",
  "Bold Promo Pop",
] as const;

const GOALS = ["Conversion produit", "Branding", "UGC", "Promo"] as const;

export default function ProjectPage() {
  const supabase = supabaseBrowser();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [style, setStyle] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);

  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProject() {
    const { data, error } = await supabase
      .from("projects")
      .select("id, product_name, style, goal, status, product_image_path")
      .eq("id", id)
      .single();

    if (error) throw error;

    const p = data as Project;
    setProject(p);
    setStyle(p.style);
    setGoal(p.goal);

    if (p.product_image_path) {
      const { data: signed, error: signErr } = await supabase.storage
        .from("products")
        .createSignedUrl(p.product_image_path, 60 * 60);

      if (!signErr) setImgUrl(signed.signedUrl);
    }
  }

  useEffect(() => {
    (async () => {
      setMsg(null);
      setLoading(true);

      const { data, error } = await supabase.auth.getUser();
      if (error) {
        setMsg(error.message);
        setLoading(false);
        return;
      }
      if (!data.user) {
        window.location.href = "/auth";
        return;
      }

      try {
        await loadProject();
      } catch (e: any) {
        setMsg(e?.message ?? "Erreur chargement projet");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const canSave = !!style && !!goal;
  const imagesHref = useMemo(() => `/project/${id}/images`, [id]);

  async function savePackChoice() {
    setMsg(null);
    if (!style || !goal) return;

    const { data, error } = await supabase
      .from("projects")
      .update({ style, goal, status: "images" })
      .eq("id", id)
      .select("id, product_name, style, goal, status, product_image_path")
      .single();

    if (error) {
      setMsg(error.message);
      return;
    }

    setProject(data as Project);
    setMsg("✅ Pack enregistré.");
  }

  async function onPickFile(file: File | null) {
    if (!file) return;
    setMsg(null);
    setUploading(true);

    try {
      const { path, signedUrl } = await uploadProductImage({ projectId: id, file });

      const { data, error } = await supabase
        .from("projects")
        .update({ product_image_path: path })
        .eq("id", id)
        .select("id, product_name, style, goal, status, product_image_path")
        .single();

      if (error) throw error;

      setProject(data as Project);
      setImgUrl(signedUrl);
      setMsg("✅ Image produit uploadée.");
    } catch (e: any) {
      setMsg(e?.message ?? "Erreur upload");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <main style={{ padding: 24 }}>
        <p>Chargement…</p>
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

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, fontWeight: 700 }}>Projet — {project.product_name}</h1>

      <section style={{ marginTop: 18, border: "1px solid #ddd", padding: 12 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>Image produit</h2>

        {imgUrl ? (
          <img
            src={imgUrl}
            alt="Produit"
            style={{ width: 220, height: 220, objectFit: "cover", border: "1px solid #ccc" }}
          />
        ) : (
          <div
            style={{
              width: 220,
              height: 220,
              background: "#eee",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #ccc",
            }}
          >
            Pas d’image
          </div>
        )}

        <div style={{ marginTop: 10 }}>
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          />
          {uploading && <p style={{ marginTop: 6 }}>Upload en cours…</p>}
        </div>
      </section>

      <h2 style={{ marginTop: 24 }}>1) Style visuel</h2>
      {STYLES.map((s) => (
        <button
          key={s}
          onClick={() => setStyle(s)}
          style={{
            display: "block",
            marginTop: 8,
            padding: 10,
            width: "100%",
            textAlign: "left",
            background: style === s ? "#d1fae5" : "#f3f3f3",
            border: "1px solid #ccc",
          }}
        >
          {s}
        </button>
      ))}

      <h2 style={{ marginTop: 24 }}>2) Objectif marketing</h2>
      {GOALS.map((g) => (
        <button
          key={g}
          onClick={() => setGoal(g)}
          style={{
            display: "block",
            marginTop: 8,
            padding: 10,
            width: "100%",
            textAlign: "left",
            background: goal === g ? "#d1fae5" : "#f3f3f3",
            border: "1px solid #ccc",
          }}
        >
          {g}
        </button>
      ))}

      <div style={{ marginTop: 18 }}>
        <strong>Choix :</strong> {style ?? "—"} / {goal ?? "—"}
      </div>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}

      <div style={{ marginTop: 18, display: "flex", gap: 12, alignItems: "center" }}>
        <button
          onClick={savePackChoice}
          disabled={!canSave}
          style={{ padding: "10px 14px", opacity: canSave ? 1 : 0.5 }}
        >
          💾 Enregistrer le pack
        </button>

        {project.status !== "new" ? (
          <Link href={imagesHref}>▶️ Aller aux images</Link>
        ) : (
          <span style={{ opacity: 0.6 }}>▶️ Aller aux images (enregistre d’abord)</span>
        )}
      </div>

      <div style={{ marginTop: 24 }}>
        <Link href="/dashboard">⬅️ Dashboard</Link>
      </div>
    </main>
  );
}
