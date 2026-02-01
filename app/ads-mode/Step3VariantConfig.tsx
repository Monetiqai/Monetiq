"use client";

interface Step3Props {
    variantCount: 2 | 3 | 4;
    setVariantCount: (count: 2 | 3 | 4) => void;
    onNext: () => void;
    onBack: () => void;
}

const VARIANT_MAPPINGS = [
    { count: 2, variants: ["Hook", "Trust"], description: "Quick A/B test" },
    { count: 3, variants: ["Hook", "Trust", "Aggressive"], description: "Balanced testing" },
    { count: 4, variants: ["Hook", "Trust", "Aggressive", "Offer"], description: "Complete testing" }
];

export default function Step3VariantConfig({
    variantCount,
    setVariantCount,
    onNext,
    onBack
}: Step3Props) {
    return (
        <div className="glass" style={{
            borderRadius: "20px",
            padding: "40px",
            maxWidth: "800px",
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
                <span style={{ color: "var(--gold)" }}>3.</span>
                A/B Test Configuration
            </h2>
            <p style={{
                fontSize: "14px",
                opacity: 0.6,
                marginBottom: "32px"
            }}>
                Choose how many ad variants to test
            </p>

            {/* Variant Count Selection */}
            <div style={{ marginBottom: "32px" }}>
                {VARIANT_MAPPINGS.map((mapping) => (
                    <div
                        key={mapping.count}
                        onClick={() => setVariantCount(mapping.count as 2 | 3 | 4)}
                        style={{
                            padding: "24px",
                            background: variantCount === mapping.count
                                ? "linear-gradient(135deg, rgba(255,167,38,.15) 0%, rgba(255,143,0,.1) 100%)"
                                : "rgba(255,255,255,.04)",
                            border: variantCount === mapping.count
                                ? "2px solid var(--gold)"
                                : "1px solid rgba(255,255,255,.12)",
                            borderRadius: "12px",
                            marginBottom: "16px",
                            cursor: "pointer",
                            transition: "all 0.2s"
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontSize: "20px", fontWeight: 900, marginBottom: "8px" }}>
                                    {mapping.count} Variants
                                </div>
                                <div style={{ fontSize: "13px", opacity: 0.7, marginBottom: "12px" }}>
                                    {mapping.description}
                                </div>
                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                    {mapping.variants.map((variant) => (
                                        <span
                                            key={variant}
                                            style={{
                                                padding: "4px 12px",
                                                background: "rgba(255,167,38,.2)",
                                                borderRadius: "12px",
                                                fontSize: "11px",
                                                fontWeight: 700,
                                                color: "var(--gold)"
                                            }}
                                        >
                                            {variant}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            {variantCount === mapping.count && (
                                <div style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "50%",
                                    background: "var(--gold)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "16px",
                                    color: "#000",
                                    fontWeight: 900
                                }}>
                                    ✓
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Info Box */}
            <div style={{
                padding: "16px",
                background: "rgba(59, 130, 246, 0.1)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                borderRadius: "10px",
                marginBottom: "32px"
            }}>
                <div style={{ fontSize: "13px", lineHeight: "1.6", opacity: 0.9 }}>
                    💡 <strong>Variants to generate:</strong> {
                        VARIANT_MAPPINGS.find(m => m.count === variantCount)?.variants.join(", ")
                    }
                    <br />
                    Each variant tests a different marketing angle to find what resonates best with your audience.
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "12px" }}>
                <button onClick={onBack} className="ads-btn ads-btn-secondary" style={{ flex: 1 }}>
                    ← Back
                </button>
                <button onClick={onNext} className="ads-btn ads-btn-primary" style={{ flex: 2 }}>
                    Start Generation →
                </button>
            </div>
        </div>
    );
}
