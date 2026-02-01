"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Project = {
  id: string;
  product_name: string;
  style: string | null;
  goal: string | null;
  status: "new" | "images" | "validated" | "videos" | "exported";
  created_at: string;
  product_image_path?: string | null;
};

function formatStatus(s: Project["status"]) {
  if (s === "new") return "Nouveau";
  if (s === "images") return "Images";
  if (s === "validated") return "Validé";
  if (s === "videos") return "Vidéos";
  if (s === "exported") return "Exporté";
  return s;
}

export default function DashboardPage() {
  const supabase = supabaseBrowser();

  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  async function loadProjects() {
    setMsg(null);
    setLoading(true);

    const { data, error } = await supabase
      .from("projects")
      .select("id, product_name, style, goal, status, created_at, product_image_path")
      .order("created_at", { ascending: false });

    if (error) {
      setMsg(error.message);
      setProjects([]);
    } else {
      setProjects((data ?? []) as Project[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    (async () => {
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
      await loadProjects();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(() => projects, [projects]);

  async function onCreate() {
    setMsg(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      setMsg(userError.message);
      return;
    }
    if (!user) {
      window.location.href = "/auth";
      return;
    }

    const product_name = name.trim() || "Nouveau produit";

    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        product_name,
        status: "new",
      })
      .select("id")
      .single();

    if (error) {
      setMsg(error.message);
      return;
    }

    await loadProjects();
    window.location.href = `/project/${data.id}`;
  }

  async function onDelete(id: string) {
    setMsg(null);
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      setMsg(error.message);
      return;
    }
    await loadProjects();
  }

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Dashboard</h1>

      <div style={{ marginTop: 12 }}>
        <Link href="/logout">Se déconnecter</Link>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du produit (ex: Gummies Ventre Plat)"
          style={{ flex: 1, padding: 10, border: "1px solid #ccc" }}
        />
        <button onClick={onCreate} style={{ padding: "10px 14px" }}>
          ➕ Nouveau projet
        </button>
      </div>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}

      <h2 style={{ marginTop: 24, fontSize: 18 }}>Projets</h2>

      {loading ? (
        <p style={{ marginTop: 8, opacity: 0.8 }}>Chargement…</p>
      ) : sorted.length === 0 ? (
        <p style={{ marginTop: 8, opacity: 0.8 }}>
          Aucun projet. Crée ton premier projet.
        </p>
      ) : (
        <ul style={{ marginTop: 12, padding: 0, listStyle: "none" }}>
          {sorted.map((p) => (
            <li
              key={p.id}
              style={{
                border: "1px solid #ddd",
                padding: 12,
                marginBottom: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>
                  {p.product_name}
                  {p.product_image_path ? " 📷" : ""}
                </div>
                <div style={{ fontSize: 14, opacity: 0.8 }}>
                  Statut : {formatStatus(p.status)}
                  {p.style ? ` · Style: ${p.style}` : ""}
                  {p.goal ? ` · Objectif: ${p.goal}` : ""}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <Link href={`/project/${p.id}`}>Ouvrir</Link>
                <button onClick={() => onDelete(p.id)} style={{ opacity: 0.8 }}>
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
