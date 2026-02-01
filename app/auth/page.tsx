"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function AuthPage() {
  const supabase = supabaseBrowser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit() {
    setMsg(null);

    if (!email || !password) {
      setMsg("Email et mot de passe requis.");
      return;
    }

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMsg(error.message);
      else setMsg("Compte créé. Tu peux te connecter.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
      else window.location.href = "/";
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 420, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Connexion</h1>

      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <button
          onClick={() => setMode("login")}
          style={{ padding: "8px 12px", opacity: mode === "login" ? 1 : 0.5 }}
        >
          Se connecter
        </button>
        <button
          onClick={() => setMode("signup")}
          style={{ padding: "8px 12px", opacity: mode === "signup" ? 1 : 0.5 }}
        >
          Créer un compte
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          style={{ width: "100%", padding: 10, border: "1px solid #ccc" }}
        />
      </div>

      <div style={{ marginTop: 10 }}>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
          type="password"
          style={{ width: "100%", padding: 10, border: "1px solid #ccc" }}
        />
      </div>

      <button onClick={onSubmit} style={{ marginTop: 14, padding: "10px 14px", width: "100%" }}>
        {mode === "signup" ? "Créer le compte" : "Se connecter"}
      </button>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </main>
  );
}
