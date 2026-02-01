"use client";

import { OnboardingStep } from "./steps";

interface OnboardingCardProps {
    step: OnboardingStep;
    currentIndex: number;
    totalSteps: number;
    onNext: () => void;
    onSkip: () => void;
    isLast: boolean;
}

export default function OnboardingCard({
    step,
    currentIndex,
    totalSteps,
    onNext,
    onSkip,
    isLast
}: OnboardingCardProps) {
    return (
        <div style={{
            position: "relative",
            width: "100%",
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "clamp(24px, 5vw, 80px)",
            background: "#0b0b0b",
            color: "#fff"
        }}>
            {/* Header */}
            <div style={{
                position: "absolute",
                top: "32px",
                left: "0",
                right: "0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0 clamp(24px, 5vw, 80px)",
                zIndex: 10
            }}>
                <div style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "rgba(255,255,255,.5)",
                    textTransform: "uppercase",
                    letterSpacing: "1px"
                }}>
                    Step {currentIndex + 1} / {totalSteps}
                </div>
                <button
                    onClick={onSkip}
                    style={{
                        background: "none",
                        border: "none",
                        color: "rgba(255,255,255,.7)",
                        fontSize: "14px",
                        fontWeight: 700,
                        cursor: "pointer",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        transition: "color 0.2s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = "#FFA726"}
                    onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,.7)"}
                >
                    Skip →
                </button>
            </div>

            {/* Content Container */}
            <div style={{
                maxWidth: "900px",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "48px"
            }}>
                {/* Image */}
                <div style={{
                    width: "100%",
                    maxWidth: "800px",
                    aspectRatio: "2.35 / 1",
                    borderRadius: "16px",
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,.12)",
                    background: "rgba(255,255,255,.04)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}>
                    <img
                        src={step.image}
                        alt={step.title}
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover"
                        }}
                        onError={(e) => {
                            // Fallback to placeholder
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                                e.currentTarget.style.display = "none";
                                parent.innerHTML = `
                  <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: rgba(255,255,255,.3); font-size: 48px;">
                    🎬
                  </div>
                `;
                            }
                        }}
                    />
                </div>

                {/* Text Content */}
                <div style={{
                    textAlign: "center",
                    maxWidth: "700px"
                }}>
                    <h2 style={{
                        fontSize: "clamp(24px, 4vw, 36px)",
                        fontWeight: 900,
                        letterSpacing: "-0.5px",
                        margin: "0 0 20px",
                        textTransform: "uppercase",
                        lineHeight: 1.2
                    }}>
                        {step.title}
                    </h2>
                    <p style={{
                        fontSize: "clamp(15px, 2vw, 18px)",
                        lineHeight: 1.6,
                        color: "rgba(255,255,255,.8)",
                        margin: 0,
                        fontWeight: 400
                    }}>
                        {step.description}
                    </p>
                </div>

                {/* CTA Button */}
                <button
                    onClick={onNext}
                    style={{
                        padding: "18px 40px",
                        fontSize: "14px",
                        fontWeight: 700,
                        color: isLast ? "#000" : "#fff",
                        background: isLast ? "#FFA726" : "#000",
                        border: isLast ? "none" : "1px solid rgba(255,255,255,.3)",
                        borderRadius: "8px",
                        cursor: "pointer",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        transition: "all 0.2s ease",
                        boxShadow: isLast ? "0 8px 24px rgba(255,167,38,.4)" : "none"
                    }}
                    onMouseEnter={(e) => {
                        if (isLast) {
                            e.currentTarget.style.background = "#FF8F00";
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = "0 12px 32px rgba(255,167,38,.5)";
                        } else {
                            e.currentTarget.style.background = "rgba(0,0,0,.8)";
                            e.currentTarget.style.borderColor = "rgba(255,255,255,.5)";
                            e.currentTarget.style.transform = "translateY(-2px)";
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (isLast) {
                            e.currentTarget.style.background = "#FFA726";
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 8px 24px rgba(255,167,38,.4)";
                        } else {
                            e.currentTarget.style.background = "#000";
                            e.currentTarget.style.borderColor = "rgba(255,255,255,.3)";
                            e.currentTarget.style.transform = "translateY(0)";
                        }
                    }}
                >
                    {isLast ? "🎬 Enter Director Mode" : "Next Step →"}
                </button>
            </div>

            {/* Progress Dots */}
            <div style={{
                position: "absolute",
                bottom: "40px",
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                gap: "8px",
                zIndex: 10
            }}>
                {Array.from({ length: totalSteps }).map((_, index) => (
                    <div
                        key={index}
                        style={{
                            width: index === currentIndex ? "24px" : "8px",
                            height: "8px",
                            borderRadius: "4px",
                            background: index === currentIndex ? "#FFA726" : "rgba(255,255,255,.2)",
                            transition: "all 0.3s ease"
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
