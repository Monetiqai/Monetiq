"use client";

import { cdn } from "@/lib/cdn";
import UnifiedCard from "./UnifiedCard";
import UnifiedCTA from "./UnifiedCTA";

export default function HeroAdsModeVideo() {
    return (
        <UnifiedCard mode="ads" variant="hero">
            {/* Video Background */}
            <video
                autoPlay
                loop
                muted
                playsInline
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: 0.85,
                    filter: "saturate(0.85) contrast(0.95) blur(1px)",
                    pointerEvents: "none"
                }}
            >
                <source src={cdn("/public/hero/ads-mode-hero.mp4")} type="video/mp4" />
            </video>

            {/* Stronger Dark Overlay for Text Readability */}
            <div style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to bottom, rgba(0,0,0,.4) 0%, rgba(0,0,0,.7) 100%)",
                pointerEvents: "none"
            }} />

            {/* Content - Centered */}
            <div style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "48px 24px",
                textAlign: "center",
                zIndex: 1
            }}>
                {/* Headline */}
                <h1 style={{
                    fontSize: "clamp(20px, 2.5vw, 28px)",
                    fontWeight: 900,
                    letterSpacing: "-1px",
                    lineHeight: 1.1,
                    margin: "0 0 16px",
                    color: "#fff",
                    textTransform: "uppercase",
                    textShadow: "0 2px 40px rgba(0,0,0,.8)"
                }}>
                    <span style={{ color: "#38BDF8" }}>ADS</span> MODE
                </h1>

                {/* Subheadline */}
                <p style={{
                    fontSize: "clamp(10px, 1.1vw, 12px)",
                    lineHeight: 1.4,
                    margin: "0 0 6px",
                    color: "rgba(255,255,255,.9)",
                    textShadow: "0 2px 20px rgba(0,0,0,.8)",
                    maxWidth: "600px",
                    fontWeight: 600,
                    letterSpacing: "0.5px"
                }}>
                    Performance ads. Tested. Ready to scale.
                </p>

                {/* Supporting text */}
                <p style={{
                    fontSize: "clamp(10px, 1.1vw, 11px)",
                    lineHeight: 1.3,
                    margin: "0 0 20px",
                    color: "rgba(255,255,255,.7)",
                    textShadow: "0 2px 20px rgba(0,0,0,.8)",
                    maxWidth: "500px",
                    fontWeight: 400,
                    letterSpacing: "0.3px"
                }}>
                    Built to decide. Not to impress.
                </p>

                {/* CTA */}
                <UnifiedCTA
                    mode="ads"
                    href="/ads-mode"
                    microCopy="Takes less than 2 minutes. No setup."
                >
                    Create your first Ad Pack
                </UnifiedCTA>
            </div>
        </UnifiedCard>
    );
}
