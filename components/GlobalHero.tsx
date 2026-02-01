"use client";

export default function GlobalHero() {
    return (
        <section style={{
            position: "relative",
            width: "100%",
            padding: "100px 24px 60px",
            background: "transparent",
            overflow: "hidden",
        }}>
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
                    opacity: 0.5,
                    filter: "saturate(0.9) contrast(1.05)",
                    pointerEvents: "none",
                    zIndex: 0,
                }}
            >
                <source src="/hero/global-hero.mp4" type="video/mp4" />
            </video>

            {/* Lighter Dark Overlay */}
            <div style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to bottom, rgba(11,14,20,0.5) 0%, rgba(11,14,20,0.7) 100%)",
                pointerEvents: "none",
                zIndex: 1,
            }} />

            {/* Subtle Background Elements */}
            <div style={{
                position: "absolute",
                inset: 0,
                background: `
          radial-gradient(circle at 50% 20%, rgba(255,255,255,0.03), transparent 60%),
          radial-gradient(circle at 20% 80%, rgba(255,255,255,0.02), transparent 50%)
        `,
                pointerEvents: "none",
                zIndex: 2,
            }} />

            {/* Content Container */}
            <div style={{
                position: "relative",
                maxWidth: "900px",
                margin: "0 auto",
                textAlign: "center",
                zIndex: 10,
            }}>
                {/* Main Title */}
                <h1 style={{
                    fontSize: "clamp(32px, 5vw, 56px)",
                    fontWeight: 900,
                    letterSpacing: "-2px",
                    lineHeight: 1.1,
                    margin: "0 0 24px",
                    color: "#fff",
                }}>
                    One platform.<br />
                    Three ways to create.
                </h1>

                {/* Core Explanation */}
                <p style={{
                    fontSize: "clamp(16px, 2vw, 20px)",
                    lineHeight: 1.5,
                    margin: "0 0 32px",
                    color: "rgba(255,255,255,0.85)",
                    fontWeight: 400,
                    maxWidth: "700px",
                    marginLeft: "auto",
                    marginRight: "auto",
                }}>
                    Monetiq is a creative platform designed to separate vision,<br />
                    architecture, and performance — without mixing them.
                </p>

                {/* Supporting Line */}
                <p style={{
                    fontSize: "14px",
                    lineHeight: 1.6,
                    margin: "0 0 40px",
                    color: "rgba(255,255,255,0.6)",
                    fontWeight: 500,
                    fontStyle: "italic",
                }}>
                    Most tools try to do everything at once.<br />
                    Monetiq does the opposite.
                </p>

                {/* Value Statement */}
                <div style={{
                    padding: "32px",
                    borderRadius: "16px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.02)",
                    backdropFilter: "blur(12px)",
                    marginBottom: "48px",
                }}>
                    <p style={{
                        fontSize: "15px",
                        lineHeight: 1.7,
                        margin: 0,
                        color: "rgba(255,255,255,0.78)",
                        fontWeight: 400,
                    }}>
                        Whether you are crafting cinematic stories, building scalable systems,
                        or testing performance ads, Monetiq gives each workflow its own space —
                        with the right mindset, the right tools, and the right discipline.
                    </p>
                </div>

                {/* Transition Line */}
                <p style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "2px",
                    color: "rgba(255,255,255,0.5)",
                    margin: "0 0 8px",
                }}>
                    Choose how you want to create
                </p>

                {/* Visual Separator */}
                <div style={{
                    width: "60px",
                    height: "2px",
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                    margin: "0 auto",
                }} />
            </div>
        </section>
    );
}
