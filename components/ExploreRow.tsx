"use client";

import Link from "next/link";
import { useState } from "react";
import AutoVideo from "@/components/AutoVideo";

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
};

export default function ExploreRow({
  tools,
  isAuthed,
  isPro,
}: {
  tools: Tool[];
  isAuthed: boolean;
  isPro: boolean;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <section className="hscroll" aria-label="tools-row">
      {tools.map((t) => {
        const tagClass = t.tag_color === "lime" ? "tagLime" : "tagSky";
        const href = t.href || "/dashboard";
        const isLocked = (t.tag_color === "lime" || t.tag === "PRO") && !isPro;
        const targetHref = !isAuthed ? "/auth" : isLocked ? "/pricing" : href;
        const dim = hovered && hovered !== t.id;

        return (
          <Link
            key={t.id}
            href={targetHref}
            className={`toolCard ${dim ? "dim" : ""}`}
            onMouseEnter={() => setHovered(t.id)}
            onMouseLeave={() => setHovered(null)}
          >
            {/* TAG */}
            {t.tag && <div className={`tag ${tagClass}`}>{t.tag}</div>}

            {/* LOCKED BADGE */}
            {isLocked && (
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  fontSize: 11,
                  fontWeight: 950,
                  padding: "6px 8px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,.14)",
                  background: "rgba(0,0,0,.45)",
                  color: "rgba(255,255,255,.9)",
                  zIndex: 4,
                }}
              >
                LOCKED
              </div>
            )}

            {/* MEDIA */}
            <div className="media" style={{ position: "relative" }}>
              {t.mediaUrl && (t.media_kind ?? "video") === "video" ? (
                <AutoVideo
                  src={t.mediaUrl}
                  poster={t.posterUrl ?? undefined}
                  threshold={0.35}
                />
              ) : t.mediaUrl ? (
                <img src={t.mediaUrl} alt={t.title} />
              ) : null}

              {/* LOCK OVERLAY */}
              {isLocked && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,.35)",
                    backdropFilter: "blur(2px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 3,
                    borderBottom: "1px solid rgba(255,255,255,.10)",
                  }}
                >
                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,.14)",
                      background: "rgba(0,0,0,.45)",
                      fontSize: 12,
                      fontWeight: 950,
                    }}
                  >
                    Upgrade to unlock →
                  </div>
                </div>
              )}
            </div>

            {/* BODY */}
            <div className="body">
              <div className="title">{t.title}</div>
              <div className="desc">{t.subtitle ?? ""}</div>
              <div className="meta">
                <span>Open</span>
                <span className="arrow">→</span>
              </div>
            </div>
          </Link>
        );
      })}
    </section>
  );
}
