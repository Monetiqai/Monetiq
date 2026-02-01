"use client";

import { AdTemplate, Platform } from "@/lib/types/ads-mode";

interface Step2Props {
    selectedTemplate: AdTemplate;
    setSelectedTemplate: (template: AdTemplate) => void;
    selectedPlatform: Platform;
    setSelectedPlatform: (platform: Platform) => void;
    onNext: () => void;
    onBack: () => void;
}

const TEMPLATES = [
    {
        id: "scroll_stop" as AdTemplate,
        name: "Scroll Stop",
        icon: "⚡",
        description: "Maximum attention grab in first second",
        metric: "Scroll Stop Rate"
    },
    {
        id: "trust_ugc" as AdTemplate,
        name: "Trust / UGC",
        icon: "🤝",
        description: "Authentic, relatable presentation",
        metric: "Trust & Credibility"
    },
    {
        id: "problem_solution" as AdTemplate,
        name: "Problem → Solution",
        icon: "💡",
        description: "Show pain point then product as hero",
        metric: "Problem Awareness"
    },
    {
        id: "offer_promo" as AdTemplate,
        name: "Offer / Promo",
        icon: "🎁",
        description: "Urgency-driven, deal-focused",
        metric: "Conversion Rate"
    }
];

const PLATFORMS = [
    { id: "facebook" as Platform, name: "Facebook", icon: "📘" },
    { id: "instagram" as Platform, name: "Instagram", icon: "📸" },
    { id: "tiktok" as Platform, name: "TikTok", icon: "🎵" }
];

export default function Step2TemplateSelection({
    selectedTemplate,
    setSelectedTemplate,
    selectedPlatform,
    setSelectedPlatform,
    onNext,
    onBack
}: Step2Props) {
    return (
        <div className="glass" style={{
            borderRadius: "20px",
            padding: "40px",
            maxWidth: "1000px",
            margin: "0 auto"
        }}>
            <h2 style={{
                fontSize: "28px",
                fontWeight: 900,
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
                gap: "12px"
            }}>
                <span style={{ color: "var(--gold)" }}>2.</span>
                Choose Ad Template
            </h2>
            <p style={{
                fontSize: "14px",
                opacity: 0.6,
                marginBottom: "32px"
            }}>
                Select the ad style that matches your marketing goal
            </p>

            {/* Templates Grid */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
                marginBottom: "32px"
            }}>
                {TEMPLATES.map((template) => (
                    <div
                        key={template.id}
                        onClick={() => setSelectedTemplate(template.id)}
                        style={{
                            position: "relative",
                            padding: "24px",
                            background: selectedTemplate === template.id
                                ? "linear-gradient(135deg, rgba(255,167,38,.15) 0%, rgba(255,143,0,.1) 100%)"
                                : "rgba(255,255,255,.04)",
                            border: selectedTemplate === template.id
                                ? "2px solid var(--gold)"
                                : "1px solid rgba(255,255,255,.12)",
                            borderRadius: "12px",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            textAlign: "center"
                        }}
                    >
                        {template.id === "scroll_stop" && (
                            <div style={{
                                position: "absolute",
                                top: "12px",
                                right: "12px",
                                padding: "4px 10px",
                                background: "var(--gold)",
                                borderRadius: "8px",
                                fontSize: "10px",
                                fontWeight: 900,
                                color: "#000",
                                textTransform: "uppercase",
                                letterSpacing: "0.5px"
                            }}>
                                Recommended
                            </div>
                        )}
                        <div style={{ fontSize: "40px", marginBottom: "12px" }}>{template.icon}</div>
                        <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>
                            {template.name}
                        </div>
                        <div style={{ fontSize: "12px", opacity: 0.6, marginBottom: "12px" }}>
                            {template.description}
                        </div>
                        <div style={{
                            fontSize: "11px",
                            padding: "4px 12px",
                            background: "rgba(255,167,38,.2)",
                            borderRadius: "12px",
                            display: "inline-block",
                            color: "var(--gold)"
                        }}>
                            {template.metric}
                        </div>
                    </div>
                ))}
            </div>

            {/* Platform Selection */}
            <div style={{ marginBottom: "32px" }}>
                <label style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    opacity: 0.7,
                    marginBottom: "12px"
                }}>
                    Target Platform
                </label>
                <div style={{ display: "flex", gap: "12px" }}>
                    {PLATFORMS.map((platform) => (
                        <button
                            key={platform.id}
                            onClick={() => setSelectedPlatform(platform.id)}
                            style={{
                                flex: 1,
                                padding: "16px",
                                background: selectedPlatform === platform.id
                                    ? "linear-gradient(135deg, rgba(255,167,38,.15) 0%, rgba(255,143,0,.1) 100%)"
                                    : "rgba(255,255,255,.04)",
                                border: selectedPlatform === platform.id
                                    ? "2px solid var(--gold)"
                                    : "1px solid rgba(255,255,255,.12)",
                                borderRadius: "10px",
                                color: "#fff",
                                fontSize: "14px",
                                fontWeight: 700,
                                cursor: "pointer",
                                transition: "all 0.2s"
                            }}
                        >
                            <div style={{ fontSize: "24px", marginBottom: "8px" }}>{platform.icon}</div>
                            {platform.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "12px" }}>
                <button onClick={onBack} className="ads-btn ads-btn-secondary" style={{ flex: 1 }}>
                    ← Back
                </button>
                <button onClick={onNext} className="ads-btn ads-btn-primary" style={{ flex: 2 }}>
                    Continue to Variant Config →
                </button>
            </div>
        </div>
    );
}
