"use client";

import { useMemo, useState } from "react";
import ExploreRow from "@/components/ExploreRow";

type Tool = {
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
  tag: string | null;
  tag_color: "sky" | "lime" | "neutral" | null;
  media_kind: "video" | "image" | null;
  mediaUrl: string | null;
  posterUrl: string | null;
  category: string | null;
  is_featured: boolean | null;
  sort: number;
};

function normalizeCategory(c: string | null | undefined) {
  const v = (c ?? "").trim();
  return v.length ? v : "Other";
}

export default function ExploreSection({
  tools,
  isAuthed,
  isPro,
}: {
  tools: Tool[];
  isAuthed: boolean;
  isPro: boolean;
}) {
  const [active, setActive] = useState<string>("All");

  const categories = useMemo(() => {
    const set = new Set<string>();
    tools.forEach((t) => set.add(normalizeCategory(t.category)));
    const arr = Array.from(set).sort((a, b) => a.localeCompare(b));
    return ["All", "Featured", ...arr];
  }, [tools]);

  const filtered = useMemo(() => {
    if (active === "All") return tools;

    if (active === "Featured") {
      return tools.filter((t) => !!t.is_featured);
    }

    return tools.filter((t) => normalizeCategory(t.category) === active);
  }, [tools, active]);

  return (
    <section>
      {/* Header */}
      <div className="rowHead" id="explore">
        <div>
          <strong>Explore</strong>
          <div>
            <span>Templates + categories (instant filters)</span>
          </div>
        </div>
      </div>

      {/* Chips */}
      <div className="chipsWrap" aria-label="category-filters">
        {categories.map((c) => {
          const selected = c === active;
          return (
            <button
              key={c}
              type="button"
              className={`chipBtn ${selected ? "chipBtnActive" : ""}`}
              onClick={() => setActive(c)}
            >
              {c}
            </button>
          );
        })}
      </div>

      {/* Results */}
      <ExploreRow tools={filtered} isAuthed={isAuthed} isPro={isPro} />

      {/* Local styles (keeps your page.tsx clean) */}
      <style>{`
        .chipsWrap{
          margin-top: 10px;
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          align-items:center;
        }
        .chipBtn{
          appearance:none;
          border:1px solid rgba(255,255,255,.14);
          background: rgba(255,255,255,.06);
          color: rgba(255,255,255,.88);
          padding: 9px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          transition: .16s ease;
        }
        .chipBtn:hover{
          border-color: rgba(56,189,248,.32);
          box-shadow: 0 0 0 6px rgba(56,189,248,.18);
        }
        .chipBtnActive{
          background: rgba(56,189,248,.92);
          color: #001018;
          border-color: rgba(255,255,255,.06);
          box-shadow: 0 12px 34px rgba(56,189,248,.18);
        }
      `}</style>
    </section>
  );
}
