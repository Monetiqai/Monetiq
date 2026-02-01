"use client";

import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function LogoutPage() {
  useEffect(() => {
    (async () => {
      const supabase = supabaseBrowser();
      await supabase.auth.signOut();
      window.location.href = "/auth";
    })();
  }, []);

  return <main style={{ padding: 24 }}>Déconnexion…</main>;
}
