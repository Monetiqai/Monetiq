"use client";

import UnifiedCard from "./UnifiedCard";
import UnifiedCTA from "./UnifiedCTA";

export default function HeroDirectorMode() {
    return (
        <UnifiedCard mode="director" variant="hero">
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
                <source src="/hero/director-mode-hero.mp4" type="video/mp4" />
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
                    <span style={{ color: "#FFA726" }}>DIRECTOR</span> MODE
                </h1>

                {/* Subheadline */}
                <p style={{
                    fontSize: "clamp(10px, 1.1vw, 12px)",
                    lineHeight: 1.4,
                    margin: "0 0 20px",
                    color: "rgba(255,255,255,.9)",
                    textShadow: "0 2px 20px rgba(0,0,0,.8)",
                    maxWidth: "600px",
                    fontWeight: 400,
                    letterSpacing: "0.5px"
                }}>
                    Create your film like your favorite director.<br />
                    Choose a cinematic style. Shape your vision.
                </p>

                {/* CTA */}
                <UnifiedCTA
                    mode="director"
                    href="/director-mode"
                    microCopy="Choose a cinematic style. Shape your vision."
                >
                    Enter the Studio
                </UnifiedCTA>
            </div>
        </UnifiedCard>
    );
}
