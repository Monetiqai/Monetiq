"use client";

import { useState } from "react";

interface OnboardingProps {
    onComplete: () => void;
}

export default function AdsOnboarding({ onComplete }: OnboardingProps) {
    const [currentScreen, setCurrentScreen] = useState(0);

    const handleNext = () => {
        if (currentScreen < 2) {
            setCurrentScreen(currentScreen + 1);
        } else {
            onComplete();
        }
    };

    const handleSkip = () => {
        onComplete();
    };

    const screens = [
        {
            title: "CREATE ADS THAT SELL",
            description: "Upload your product. We generate high-performance ad variants. You pick the winner and scale.",
            buttonText: "Next Step →"
        },
        {
            title: "TEST, PICK, SCALE",
            description: "We generate 2–4 variants optimized for A/B testing. Choose what performs best. Generate final quality only for the winner.",
            buttonText: "Next Step →"
        },
        {
            title: "RESULTS IN MINUTES",
            description: "No prompts. No editing. No guesswork. Just data-driven performance marketing that converts.",
            buttonText: "Start Creating"
        }
    ];

    const currentScreenData = screens[currentScreen];
    const isLast = currentScreen === 2;

    return (
        <div style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "#0b0b0b"
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
                    Step {currentScreen + 1} / 3
                </div>
                <button
                    onClick={handleSkip}
                    className="ads-btn ads-btn-tertiary"
                >
                    Skip →
                </button>
            </div>

            {/* Content */}
            <div style={{
                position: "relative",
                width: "100%",
                height: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "clamp(24px, 5vw, 80px)",
                color: "#fff"
            }}>
                <div style={{
                    maxWidth: "900px",
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "48px"
                }}>
                    {/* Visual Image */}
                    <div style={{
                        width: "100%",
                        maxWidth: "800px",
                        aspectRatio: "2.35 / 1",
                        borderRadius: "16px",
                        overflow: "hidden",
                        border: "1px solid rgba(255,255,255,.12)",
                        background: "linear-gradient(135deg, rgba(255,167,38,.15) 0%, rgba(255,143,0,.08) 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative"
                    }}>
                        {/* Animated gradient background */}
                        <div style={{
                            position: "absolute",
                            inset: 0,
                            background: "radial-gradient(circle at 50% 50%, rgba(255,167,38,.2) 0%, transparent 70%)",
                            animation: "pulse 3s ease-in-out infinite"
                        }} />

                        {/* Icon/Visual element */}
                        <div style={{
                            position: "relative",
                            fontSize: "clamp(60px, 10vw, 120px)",
                            opacity: 0.9,
                            filter: "drop-shadow(0 0 40px rgba(255,167,38,.4))"
                        }}>
                            {currentScreen === 0 && "🎯"}
                            {currentScreen === 1 && "📊"}
                            {currentScreen === 2 && "🚀"}
                        </div>
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
                            {currentScreenData.title}
                        </h2>
                        <p style={{
                            fontSize: "clamp(15px, 2vw, 18px)",
                            lineHeight: 1.6,
                            color: "rgba(255,255,255,.8)",
                            margin: 0,
                            fontWeight: 400
                        }}>
                            {currentScreenData.description}
                        </p>
                    </div>

                    {/* CTA Button */}
                    <button
                        onClick={handleNext}
                        className={`ads-btn ${isLast ? 'ads-btn-primary' : 'ads-btn-secondary'}`}
                    >
                        {currentScreenData.buttonText}
                    </button>
                </div>
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
                {[0, 1, 2].map((index) => (
                    <div
                        key={index}
                        style={{
                            width: currentScreen === index ? "24px" : "8px",
                            height: "8px",
                            borderRadius: "4px",
                            background: currentScreen === index ? "#38BDF8" : "rgba(255,255,255,.2)",
                            transition: "all 0.3s ease"
                        }}
                    />
                ))}
            </div>

            <style jsx>{`
                @keyframes pulse {
                    0%, 100% {
                        opacity: 0.5;
                        transform: scale(1);
                    }
                    50% {
                        opacity: 0.8;
                        transform: scale(1.05);
                    }
                }
            `}</style>
        </div>
    );
}
