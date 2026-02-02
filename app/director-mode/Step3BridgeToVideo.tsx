"use client";

import { useState } from "react";
import { cdn } from "@/lib/cdn";
import { Scene, RenderJob } from "@/lib/types/director-mode";

interface Step3Props {
    selectedMovement: string;
    setSelectedMovement: (movement: any) => void;
    aspectRatio: string;
    setAspectRatio: (ratio: any) => void;
    videoDuration: number;
    setVideoDuration: (duration: any) => void;
    qualityMode: "preview" | "final";
    setQualityMode: (mode: "preview" | "final") => void;
    audioEnabled: boolean;
    setAudioEnabled: (enabled: boolean) => void;
    slowMotion: boolean;
    setSlowMotion: (enabled: boolean) => void;
    videoBatch: number;
    setVideoBatch: (batch: any) => void;
    anchorAsset: any;
    scenes: Scene[];
    currentSceneIndex: number;
    setCurrentSceneIndex: (index: number) => void;
    renderQueue: RenderJob[];
    onBack: () => void;
    onGenerate: () => void;
    onGenerateAll?: () => void;
    generating: boolean;
    videoAssets: string[];
    videoStatuses: Record<string, string>;
}

const CAMERA_MOVEMENTS = [
    {
        id: "static",
        label: "Static",
        icon: "📷",
        desc: "Pure cinematic stillness",
        prompt: "Camera remains completely static. No movement, no shake, no zoom. Pure cinematic stillness, like a locked-off film shot."
    },
    {
        id: "handheld",
        label: "Handheld",
        icon: "🤳",
        desc: "Subtle cinematic handheld",
        prompt: "Subtle handheld camera movement. Natural human micro-shake, controlled and realistic. Cinematic handheld feel, not chaotic, not documentary."
    },
    {
        id: "zoom_in",
        label: "Zoom In",
        icon: "🔍",
        desc: "Slow smooth zoom toward subject",
        prompt: "Slow and smooth cinematic zoom in. Gradual push toward the subject. No digital artifacts, natural optical zoom feeling."
    },
    {
        id: "zoom_out",
        label: "Zoom Out",
        icon: "🔎",
        desc: "Smooth zoom revealing scene",
        prompt: "Slow cinematic zoom out. Camera gently pulls back, revealing more of the scene. Smooth, controlled, film-like movement."
    },
    {
        id: "camera_follows",
        label: "Camera Follows",
        icon: "🎯",
        desc: "Smooth subject tracking",
        prompt: "Camera smoothly follows the subject's position. Natural tracking movement, perfectly stabilized. Subject remains centered and dominant in frame."
    },
    {
        id: "pan_left",
        label: "Pan Left",
        icon: "⬅️",
        desc: "Horizontal left sweep",
        prompt: "Slow cinematic pan to the left. Horizontal camera movement only. Smooth, constant speed, no tilt or zoom."
    },
    {
        id: "pan_right",
        label: "Pan Right",
        icon: "➡️",
        desc: "Horizontal right sweep",
        prompt: "Slow cinematic pan to the right. Horizontal camera movement only. Clean and fluid cinematic motion."
    },
    {
        id: "tilt_up",
        label: "Tilt Up",
        icon: "⬆️",
        desc: "Vertical upward reveal",
        prompt: "Slow cinematic tilt upward. Vertical camera movement only. Smooth motion, revealing upper parts of the scene."
    },
    {
        id: "tilt_down",
        label: "Tilt Down",
        icon: "⬇️",
        desc: "Vertical downward motion",
        prompt: "Slow cinematic tilt downward. Vertical camera movement only. Controlled speed, natural film movement."
    },
    {
        id: "orbit_around",
        label: "Orbit Around",
        icon: "🔄",
        desc: "Circular rotation around subject",
        prompt: "Slow cinematic orbit around the subject. Camera rotates smoothly in a circular motion. Subject remains the focal point, background shifts naturally. Elegant, premium, controlled orbit — no distortion."
    },
    {
        id: "dolly_in",
        label: "Dolly In",
        icon: "🎬",
        desc: "Physical forward movement",
        prompt: "Cinematic dolly-in movement. Camera physically moves forward toward the subject. Strong sense of depth and immersion. Smooth rails, film-grade motion."
    },
    {
        id: "dolly_out",
        label: "Dolly Out",
        icon: "🎞️",
        desc: "Physical backward pull",
        prompt: "Cinematic dolly-out movement. Camera physically moves backward away from the subject. Smooth, dramatic, cinematic pull-back."
    },
    {
        id: "drone_shot",
        label: "Drone Shot",
        icon: "🚁",
        desc: "Floating stabilized motion",
        prompt: "Smooth drone-style camera movement. Floating, stabilized motion, cinematic and controlled. No aerial exaggeration, realistic cinematic drone feel."
    },
    {
        id: "jib_up",
        label: "Jib Up",
        icon: "🏗️",
        desc: "Crane upward lift",
        prompt: "Cinematic jib-up movement. Camera rises smoothly while maintaining framing. Vertical lift combined with slight forward motion."
    },
    {
        id: "jib_down",
        label: "Jib Down",
        icon: "⚙️",
        desc: "Crane downward motion",
        prompt: "Cinematic jib-down movement. Camera lowers smoothly, maintaining subject focus. Controlled crane-style motion."
    }
];

export default function Step3BridgeToVideo({
    selectedMovement,
    setSelectedMovement,
    aspectRatio,
    setAspectRatio,
    videoDuration,
    setVideoDuration,
    qualityMode,
    setQualityMode,
    audioEnabled,
    setAudioEnabled,
    slowMotion,
    setSlowMotion,
    videoBatch,
    setVideoBatch,
    anchorAsset,
    scenes,
    currentSceneIndex,
    setCurrentSceneIndex,
    renderQueue,
    onBack,
    onGenerate,
    onGenerateAll,
    generating,
    videoAssets,
    videoStatuses
}: Step3Props) {
    const [movementMenuOpen, setMovementMenuOpen] = useState(false);

    const selectedMovementData = CAMERA_MOVEMENTS.find(m => m.id === selectedMovement) || CAMERA_MOVEMENTS[0];
    const currentScene = scenes[currentSceneIndex];

    return (
        <div className="glass" style={{ borderRadius: "20px", padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
            {/* Scene Selector (only for multi-scene) */}
            {scenes.length > 1 && (
                <div style={{ marginBottom: "32px" }}>
                    <div style={{
                        fontSize: "11px",
                        fontWeight: 950,
                        textTransform: "uppercase",
                        letterSpacing: "2px",
                        opacity: 0.5,
                        marginBottom: "16px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                    }}>
                        <span style={{ color: "var(--gold)" }}>●</span> Scene Selector
                    </div>
                    <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "8px" }}>
                        {scenes.map((scene, index) => (
                            <button
                                key={scene.id}
                                onClick={() => setCurrentSceneIndex(index)}
                                style={{
                                    padding: "16px 20px",
                                    background: currentSceneIndex === index
                                        ? "linear-gradient(135deg, rgba(255,167,38,.15) 0%, rgba(255,143,0,.1) 100%)"
                                        : "rgba(255,255,255,.04)",
                                    border: currentSceneIndex === index
                                        ? "2px solid rgba(255,167,38,.4)"
                                        : "1px solid rgba(255,255,255,.12)",
                                    borderRadius: "12px",
                                    color: currentSceneIndex === index ? "var(--gold)" : "rgba(255,255,255,.6)",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                    minWidth: "140px",
                                    textAlign: "left",
                                    boxShadow: currentSceneIndex === index
                                        ? "0 4px 16px rgba(255,167,38,.2)"
                                        : "none",
                                }}
                                onMouseEnter={(e) => {
                                    if (currentSceneIndex !== index) {
                                        e.currentTarget.style.borderColor = "rgba(255,167,38,.2)";
                                        e.currentTarget.style.background = "rgba(255,255,255,.06)";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (currentSceneIndex !== index) {
                                        e.currentTarget.style.borderColor = "rgba(255,255,255,.12)";
                                        e.currentTarget.style.background = "rgba(255,255,255,.04)";
                                    }
                                }}
                            >
                                <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                                    Scene {index + 1}
                                </div>
                                <div style={{ fontSize: "10px", opacity: 0.7, lineHeight: "1.4" }}>
                                    {scene.intent}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Anchor Image - Cinematic Display */}
            {anchorAsset && (
                <div style={{ marginBottom: "48px" }}>
                    <div style={{
                        fontSize: "11px",
                        fontWeight: 950,
                        textTransform: "uppercase",
                        letterSpacing: "2px",
                        opacity: 0.5,
                        marginBottom: "20px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                    }}>
                        <span style={{ color: "var(--gold)" }}>●</span> Anchor Frame
                    </div>
                    <div style={{
                        position: "relative",
                        width: "100%",
                        maxWidth: "900px",
                        margin: "0 auto",
                        aspectRatio: "2.35 / 1",
                        borderRadius: "16px",
                        overflow: "hidden",
                        border: "2px solid rgba(255,167,38,.2)",
                        boxShadow: "0 16px 48px rgba(0,0,0,.4), 0 0 0 1px rgba(255,167,38,.1), inset 0 1px 0 rgba(255,255,255,.05)",
                        background: "#000"
                    }}>
                        <img
                            src={anchorAsset.signedUrl}
                            alt="Anchor"
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                display: "block"
                            }}
                        />
                        {/* Film grain overlay */}
                        <div style={{
                            position: "absolute",
                            inset: 0,
                            background: "radial-gradient(circle at center, transparent 0%, rgba(0,0,0,.1) 100%)",
                            pointerEvents: "none"
                        }} />
                    </div>
                </div>
            )}

            {/* Camera Movement Selector - Visual Grid */}
            <div style={{ marginBottom: "40px" }}>
                <div style={{
                    fontSize: "11px",
                    fontWeight: 950,
                    textTransform: "uppercase",
                    letterSpacing: "2px",
                    opacity: 0.5,
                    marginBottom: "20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                }}>
                    <span style={{ color: "var(--gold)" }}>●</span> Camera Movement
                </div>

                {/* Selected movement display + toggle button */}
                <div style={{
                    padding: "20px 24px",
                    background: "linear-gradient(135deg, rgba(255,167,38,.08) 0%, rgba(255,143,0,.04) 100%)",
                    border: "1px solid rgba(255,167,38,.2)",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: movementMenuOpen ? "16px" : "0",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: movementMenuOpen ? "0 8px 24px rgba(255,167,38,.2)" : "0 4px 12px rgba(0,0,0,.2)"
                }}
                    onClick={() => setMovementMenuOpen(!movementMenuOpen)}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <span style={{ fontSize: "28px" }}>{selectedMovementData.icon}</span>
                        <div>
                            <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "4px" }}>
                                {selectedMovementData.label}
                            </div>
                            <div style={{ fontSize: "12px", opacity: 0.6 }}>
                                {selectedMovementData.desc}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ fontSize: "11px", opacity: 0.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>
                            {movementMenuOpen ? "Close" : "Change"}
                        </span>
                        <span style={{ fontSize: "12px", opacity: 0.5 }}>
                            {movementMenuOpen ? "▲" : "▼"}
                        </span>
                    </div>
                </div>

                {/* Grid of movement previews - Collapsible */}
                {movementMenuOpen && (
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                        gap: "12px",
                        animation: "fadeIn 0.2s ease-out"
                    }}>
                        {CAMERA_MOVEMENTS.map((movement) => (
                            <div
                                key={movement.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedMovement(movement.id);
                                    setMovementMenuOpen(false);
                                }}
                                style={{
                                    position: "relative",
                                    aspectRatio: "16 / 9",
                                    borderRadius: "12px",
                                    overflow: "hidden",
                                    border: selectedMovement === movement.id
                                        ? "2px solid var(--gold)"
                                        : "1px solid rgba(255,255,255,.12)",
                                    background: "rgba(0,0,0,.4)",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                    boxShadow: selectedMovement === movement.id
                                        ? "0 8px 24px rgba(255,167,38,.3), 0 0 0 1px rgba(255,167,38,.2)"
                                        : "0 2px 8px rgba(0,0,0,.3)"
                                }}
                                onMouseEnter={(e) => {
                                    if (selectedMovement !== movement.id) {
                                        e.currentTarget.style.borderColor = "rgba(255,167,38,.3)";
                                        e.currentTarget.style.transform = "translateY(-2px)";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (selectedMovement !== movement.id) {
                                        e.currentTarget.style.borderColor = "rgba(255,255,255,.12)";
                                        e.currentTarget.style.transform = "translateY(0)";
                                    }
                                }}
                            >
                                {/* Video placeholder */}
                                <div style={{
                                    position: "absolute",
                                    inset: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background: "linear-gradient(135deg, rgba(255,167,38,.08) 0%, rgba(0,0,0,.6) 100%)",
                                    // fontSize: "32px" // Removed as video covers, fallback handles its own size
                                }}>
                                    {/* Try to load video, fallback to icon */}
                                    <video
                                        src={cdn(`/public/movements/${movement.id}.mp4`)}
                                        loop
                                        muted
                                        playsInline
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                            display: "block"
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.play()}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.pause();
                                            e.currentTarget.currentTime = 0; // Reset to start
                                        }}
                                        onError={(e) => {
                                            // Fallback to icon if video doesn't exist
                                            e.currentTarget.style.display = "none";
                                            const parent = e.currentTarget.parentElement;
                                            if (parent) {
                                                const iconDiv = document.createElement('div');
                                                iconDiv.textContent = movement.icon;
                                                iconDiv.style.fontSize = "32px";
                                                parent.appendChild(iconDiv);
                                            }
                                        }}
                                    />
                                </div>

                                {/* Label */}
                                <div style={{
                                    position: "absolute",
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    padding: "8px",
                                    background: "linear-gradient(to top, rgba(0,0,0,.9) 0%, transparent 100%)",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    textAlign: "center",
                                    color: selectedMovement === movement.id ? "var(--gold)" : "#fff",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.5px"
                                }}>
                                    {movement.label}
                                </div>

                                {/* Selected indicator */}
                                {selectedMovement === movement.id && (
                                    <div style={{
                                        position: "absolute",
                                        top: "8px",
                                        right: "8px",
                                        width: "24px",
                                        height: "24px",
                                        borderRadius: "50%",
                                        background: "var(--gold)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "12px",
                                        color: "#000",
                                        fontWeight: 900,
                                        boxShadow: "0 2px 8px rgba(255,167,38,.4)"
                                    }}>
                                        ✓
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Cinematic Parameters - Refined Grid */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "20px",
                marginBottom: "40px"
            }}>
                {/* Aspect Ratio */}
                <div>
                    <label style={{
                        display: "block",
                        fontSize: "10px",
                        fontWeight: 950,
                        textTransform: "uppercase",
                        letterSpacing: "1.5px",
                        opacity: 0.5,
                        marginBottom: "12px"
                    }}>
                        Aspect Ratio
                    </label>
                    <select
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value)}
                        className="premium-select"
                        style={{
                            background: "rgba(255,255,255,.04)",
                            border: "1px solid rgba(255,255,255,.12)",
                            padding: "14px 16px",
                            borderRadius: "10px",
                            fontSize: "14px"
                        }}
                    >
                        <option value="1:1">1:1 — Square (Social Media)</option>
                        <option value="4:5">4:5 — Portrait (Instagram)</option>
                        <option value="5:4">5:4 — Classic (Medium Format)</option>
                        <option value="9:16">9:16 — Vertical (Stories)</option>
                        <option value="16:9">16:9 — Widescreen (Standard)</option>
                        <option value="21:9">21:9 — Cinematic (Ultra-wide)</option>
                    </select>
                </div>

                {/* Duration */}
                <div>
                    <label style={{
                        display: "block",
                        fontSize: "10px",
                        fontWeight: 950,
                        textTransform: "uppercase",
                        letterSpacing: "1.5px",
                        opacity: 0.5,
                        marginBottom: "12px"
                    }}>
                        Duration
                    </label>
                    <select
                        value={videoDuration}
                        onChange={(e) => setVideoDuration(Number(e.target.value))}
                        className="premium-select"
                        style={{
                            background: "rgba(255,255,255,.04)",
                            border: "1px solid rgba(255,255,255,.12)",
                            padding: "14px 16px",
                            borderRadius: "10px",
                            fontSize: "14px"
                        }}
                    >
                        <option value={6}>6 seconds</option>
                        <option value={10}>10 seconds</option>
                    </select>
                </div>

                {/* Quality */}
                <div>
                    <label style={{
                        display: "block",
                        fontSize: "10px",
                        fontWeight: 950,
                        textTransform: "uppercase",
                        letterSpacing: "1.5px",
                        opacity: 0.5,
                        marginBottom: "12px"
                    }}>
                        Quality
                    </label>
                    <select
                        value={qualityMode}
                        onChange={(e) => setQualityMode(e.target.value as "preview" | "final")}
                        className="premium-select"
                        style={{
                            background: "rgba(255,255,255,.04)",
                            border: "1px solid rgba(255,255,255,.12)",
                            padding: "14px 16px",
                            borderRadius: "10px",
                            fontSize: "14px"
                        }}
                    >
                        <option value="preview">Preview — Fast</option>
                        <option value="final">Final — Max Quality</option>
                    </select>
                </div>

                {/* Batch */}
                <div>
                    <label style={{
                        display: "block",
                        fontSize: "10px",
                        fontWeight: 950,
                        textTransform: "uppercase",
                        letterSpacing: "1.5px",
                        opacity: 0.5,
                        marginBottom: "12px"
                    }}>
                        Variations
                    </label>
                    <select
                        value={videoBatch}
                        onChange={(e) => setVideoBatch(Number(e.target.value))}
                        className="premium-select"
                        style={{
                            background: "rgba(255,255,255,.04)",
                            border: "1px solid rgba(255,255,255,.12)",
                            padding: "14px 16px",
                            borderRadius: "10px",
                            fontSize: "14px"
                        }}
                    >
                        <option value={1}>1 variation</option>
                        <option value={2}>2 variations</option>
                        <option value={3}>3 variations</option>
                        <option value={4}>4 variations</option>
                    </select>
                </div>
            </div>

            {/* Resolution Warning for Final + 10s */}
            {qualityMode === "final" && videoDuration === 10 && (
                <div style={{
                    padding: "16px 20px",
                    background: "rgba(251, 191, 36, 0.1)",
                    border: "1px solid rgba(251, 191, 36, 0.3)",
                    borderRadius: "12px",
                    marginBottom: "40px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px"
                }}>
                    <span style={{ fontSize: "20px" }}>⚠️</span>
                    <div style={{ fontSize: "13px", lineHeight: "1.6" }}>
                        <strong style={{ color: "rgb(251, 191, 36)" }}>Resolution Notice:</strong> Final quality with 10 seconds uses <strong>768P</strong> resolution. For 1080P, use 6 seconds or switch to Preview mode.
                    </div>
                </div>
            )}

            {/* Toggles - Premium Pills */}
            <div style={{
                display: "flex",
                gap: "16px",
                marginBottom: "40px",
                flexWrap: "wrap"
            }}>
                {/* Audio Toggle */}
                <button
                    onClick={() => setAudioEnabled(!audioEnabled)}
                    style={{
                        padding: "12px 24px",
                        background: audioEnabled
                            ? "linear-gradient(135deg, rgba(255,167,38,.15) 0%, rgba(255,143,0,.1) 100%)"
                            : "rgba(255,255,255,.04)",
                        border: audioEnabled ? "1px solid rgba(255,167,38,.3)" : "1px solid rgba(255,255,255,.12)",
                        borderRadius: "24px",
                        color: audioEnabled ? "var(--gold)" : "rgba(255,255,255,.6)",
                        fontSize: "12px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                    }}
                >
                    <span>🔊</span> Audio {audioEnabled ? "ON" : "OFF"}
                </button>

                {/* Slow Motion Toggle */}
                <button
                    onClick={() => setSlowMotion(!slowMotion)}
                    style={{
                        padding: "12px 24px",
                        background: slowMotion
                            ? "linear-gradient(135deg, rgba(255,167,38,.15) 0%, rgba(255,143,0,.1) 100%)"
                            : "rgba(255,255,255,.04)",
                        border: slowMotion ? "1px solid rgba(255,167,38,.3)" : "1px solid rgba(255,255,255,.12)",
                        borderRadius: "24px",
                        color: slowMotion ? "var(--gold)" : "rgba(255,255,255,.6)",
                        fontSize: "12px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                    }}
                >
                    <span>🐢</span> Slow Motion {slowMotion ? "ON" : "OFF"}
                </button>
            </div>

            {/* Frame Controls - Elegant Buttons */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                marginBottom: "48px"
            }}>
                <button
                    className="btn-secondary"
                    style={{
                        padding: "16px",
                        fontSize: "13px",
                        fontWeight: 700,
                        letterSpacing: "1px"
                    }}
                >
                    🎬 Start Frame
                </button>
                <button
                    className="btn-secondary"
                    style={{
                        padding: "16px",
                        fontSize: "13px",
                        fontWeight: 700,
                        letterSpacing: "1px"
                    }}
                >
                    🎬 End Frame
                </button>
            </div>

            {/* Actions - Premium Spacing */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "32px",
                borderTop: "1px solid rgba(255,255,255,.08)"
            }}>
                <button
                    onClick={onBack}
                    className="btn-secondary"
                    style={{
                        padding: "14px 28px",
                        fontSize: "13px",
                        fontWeight: 700,
                        letterSpacing: "1px"
                    }}
                >
                    ← Back to Setup
                </button>
                <div style={{ display: "flex", gap: "12px" }}>
                    <button
                        onClick={onGenerate}
                        disabled={generating || !anchorAsset}
                        className="btn-premium"
                        style={{
                            padding: "16px 32px",
                            fontSize: "14px",
                            fontWeight: 950,
                            letterSpacing: "1.5px",
                            boxShadow: "0 8px 24px rgba(255,167,38,.3), inset 0 1px 0 rgba(255,255,255,.2)"
                        }}
                    >
                        {generating ? "⏳ Generating..." : scenes.length > 1 ? `🎬 Generate Scene ${currentSceneIndex + 1}` : "🎬 Generate Video"}
                    </button>
                    {scenes.length > 1 && onGenerateAll && (
                        <button
                            onClick={onGenerateAll}
                            disabled={generating}
                            className="btn-premium"
                            style={{
                                padding: "16px 32px",
                                fontSize: "14px",
                                fontWeight: 950,
                                letterSpacing: "1.5px",
                                background: "linear-gradient(135deg, #FF8F00 0%, #F57C00 100%)",
                                boxShadow: "0 8px 24px rgba(255,143,0,.3), inset 0 1px 0 rgba(255,255,255,.2)"
                            }}
                        >
                            🎬 Generate All {scenes.length} Scenes
                        </button>
                    )}
                </div>
            </div>

            {/* Video Generation Status Tracker */}
            {videoAssets.length > 0 && (
                <div style={{
                    marginTop: '32px',
                    padding: '24px',
                    background: 'rgba(255,255,255,.04)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,.08)'
                }}>
                    <div style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span style={{ color: 'var(--gold)' }}>●</span> Video Generation Status
                    </div>

                    <div style={{ display: 'grid', gap: '8px' }}>
                        {videoAssets.map(assetId => {
                            const status = videoStatuses[assetId] || 'Preparing';

                            const statusConfig: Record<string, { icon: string; color: string; bg: string }> = {
                                'Preparing': { icon: '⏳', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
                                'Queueing': { icon: '⏸️', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
                                'Processing': { icon: '⚙️', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
                                'Success': { icon: '✅', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
                                'Failed': { icon: '❌', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' }
                            };

                            const config = statusConfig[status] || statusConfig['Preparing'];
                            const isActive = status !== 'Success' && status !== 'Failed';

                            return (
                                <div key={assetId} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px',
                                    background: config.bg,
                                    border: `1px solid ${config.color}40`,
                                    borderRadius: '8px',
                                    animation: isActive ? 'pulse 2s ease-in-out infinite' : 'none',
                                    boxShadow: isActive ? `0 0 20px ${config.color}40` : 'none'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <span style={{ fontSize: '16px' }}>{config.icon}</span>
                                        <span style={{
                                            fontSize: '13px',
                                            fontWeight: 600
                                        }}>
                                            Video Generation
                                        </span>
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px'
                                    }}>
                                        <div style={{
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            color: config.color
                                        }}>
                                            {status}
                                        </div>
                                        {status === 'Success' && (
                                            <a
                                                href="/library?category=director_mode"
                                                style={{
                                                    padding: '6px 12px',
                                                    background: 'linear-gradient(135deg, var(--gold) 0%, #FF8F00 100%)',
                                                    color: '#000',
                                                    fontSize: '11px',
                                                    fontWeight: 900,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px',
                                                    borderRadius: '6px',
                                                    textDecoration: 'none',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    transition: 'all 0.2s',
                                                    boxShadow: '0 2px 8px rgba(255,167,38,.3)'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,167,38,.4)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(255,167,38,.3)';
                                                }}
                                            >
                                                📚 View in Library
                                            </a>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <style>{`
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
        `}</style>
                </div>
            )}

            {/* Render Queue (only for multi-scene) */}
            {renderQueue.length > 0 && (
                <div style={{
                    marginTop: "32px",
                    padding: "24px",
                    background: "rgba(255,255,255,.04)",
                    borderRadius: "16px",
                    border: "1px solid rgba(255,255,255,.08)"
                }}>
                    <div style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        marginBottom: "16px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                    }}>
                        <span style={{ color: "var(--gold)" }}>●</span> Render Queue
                    </div>
                    {renderQueue.map((job) => {
                        const sceneIndex = scenes.findIndex(s => s.id === job.sceneId);
                        return (
                            <div
                                key={job.id}
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "12px 16px",
                                    marginBottom: "8px",
                                    background: "rgba(0,0,0,.3)",
                                    borderRadius: "8px",
                                    border: "1px solid rgba(255,255,255,.06)"
                                }}
                            >
                                <span style={{ fontSize: "13px", fontWeight: 600 }}>
                                    Scene {sceneIndex + 1}
                                </span>
                                <span style={{
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    color: job.status === 'queued' ? 'rgba(255,255,255,.5)' :
                                        job.status === 'running' ? 'var(--gold)' :
                                            job.status === 'done' ? '#4ade80' : '#ef4444'
                                }}>
                                    {job.status === 'queued' ? '⏳ Queued' :
                                        job.status === 'running' ? '🎬 Generating' :
                                            job.status === 'done' ? '✅ Done' : '❌ Failed'}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
