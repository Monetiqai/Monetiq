"use client";

import { useState, useEffect } from "react";
import { AdTemplate, Platform, ProductCategory } from "@/lib/types/ads-mode";
import {
    getShotLabel,
    getShotIntent,
    getSpatialRoleLabel,
    getSpatialRoleDescription,
    getContextFamily,
    STATUS_LABELS,
    BADGE_LABELS,
    SHOT_METADATA
} from "@/lib/ads-mode/labels";
import { SpatialRole } from "@/lib/ads-mode/shot-prompts";

interface Step4Props {
    productName: string;
    productCategory: ProductCategory;
    productImageAssetIds: string[]; // Changed to array
    selectedTemplate: AdTemplate;
    selectedPlatform: Platform;
    variantCount: 2 | 3 | 4;
    adPackId?: string;
    setAdPackId: (id: string) => void;
    generating: boolean;
    setGenerating: (gen: boolean) => void;
    onNext: () => void;
    onBack: () => void;
}

type ShotType = 'hook' | 'proof' | 'variation' | 'winner';

export default function Step4Generation({
    productName,
    productCategory,
    productImageAssetIds,
    selectedTemplate,
    selectedPlatform,
    variantCount,
    adPackId,
    setAdPackId,
    generating,
    setGenerating,
    onNext,
    onBack
}: Step4Props) {
    const [variants, setVariants] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [validatingVariantId, setValidatingVariantId] = useState<string | null>(null);

    // Load variants when adPackId changes
    useEffect(() => {
        if (adPackId) {
            loadVariants(adPackId);
        }
    }, [adPackId]);

    const loadVariants = async (packId: string) => {
        try {
            const res = await fetch(`/api/ads-mode/get-pack?id=${packId}`);
            const data = await res.json();
            if (data.ok && data.variants) {
                setVariants(data.variants);

                // Check if all shots are ready or validated
                const allDone = data.variants.every((v: any) =>
                    v.status === "shots_ready" ||
                    v.status === "shots_validated" ||
                    v.status === "failed"
                );

                if (allDone && generating) {
                    setGenerating(false);
                }
            }
        } catch (err) {
            console.error('[Step4] Error loading variants:', err);
        }
    };

    const startGeneration = async () => {
        try {
            setGenerating(true);
            setError(null);

            // Step 1: Create ad pack
            const createRes = await fetch("/api/ads-mode/create-pack", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    product_name: productName,
                    product_image_asset_ids: productImageAssetIds, // Send array
                    category: productCategory,
                    template_type: selectedTemplate,
                    platform: selectedPlatform,
                    variant_count: variantCount
                })
            });

            const createData = await createRes.json();
            if (!createData.success) throw new Error(createData.error || "Failed to create pack");

            setAdPackId(createData.adPack.id);

            // Step 2: Generate AAA shots (not videos)
            const genRes = await fetch("/api/ads-mode/generate-shots", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ad_pack_id: createData.adPack.id
                })
            });

            const genData = await genRes.json();
            if (!genData.ok) throw new Error(genData.error || "Failed to generate shots");

            // Poll for completion
            pollVariants(createData.adPack.id);

        } catch (err: any) {
            setError(err.message);
            setGenerating(false);
        }
    };

    const pollVariants = async (packId: string) => {
        let pollInterval = 3000; // Start at 3s
        let retryCount = 0;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/ads-mode/get-pack?id=${packId}`);

                // Handle rate limiting with exponential backoff
                if (res.status === 429 || res.status === 401) {
                    retryCount++;
                    const backoff = Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10s
                    const jitter = Math.random() * 1000; // 0-1s jitter
                    console.warn(`[Step4 Poll] Rate limited, backing off ${backoff + jitter}ms`);

                    clearInterval(interval);
                    setTimeout(() => pollVariants(packId), backoff + jitter);
                    return;
                }

                const data = await res.json();

                if (data.ok && data.pack) {
                    setVariants(data.variants || []);
                    retryCount = 0; // Reset on success

                    const allDone = data.variants.every((v: any) =>
                        v.status === "shots_ready" ||
                        v.status === "shots_partial" ||
                        v.status === "shots_validated" ||
                        v.status === "failed"
                    );

                    if (allDone) {
                        clearInterval(interval);
                        setGenerating(false);
                    }
                }
            } catch (err) {
                console.error("[Step4 Poll] Error:", err);
            }
        }, pollInterval);
    };

    const validateShots = async (variantId: string) => {
        try {
            setValidatingVariantId(variantId);

            const res = await fetch("/api/ads-mode/validate-shots", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ variant_id: variantId })
            });

            const data = await res.json();

            if (!data.ok) {
                throw new Error(data.error || "Failed to validate shots");
            }

            // Reload variants to get updated status
            if (adPackId) {
                await loadVariants(adPackId);
            }

        } catch (err: any) {
            alert(err.message);
        } finally {
            setValidatingVariantId(null);
        }
    };

    const canProceedToWinner = variants.length > 0 && variants.some(v => v.meta?.shots_validated);

    return (
        <div className="glass" style={{
            borderRadius: "20px",
            padding: "40px",
            maxWidth: "1200px",
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
                <span style={{ color: "var(--sky-blue)" }}>4.</span>
                Generate Ad Shots
            </h2>
            <p style={{
                fontSize: "14px",
                opacity: 0.6,
                marginBottom: "32px"
            }}>
                Creating {variantCount} professional ad shot sets for testing
            </p>

            {error && (
                <div style={{
                    padding: "16px",
                    background: "rgba(255,0,0,0.1)",
                    border: "1px solid rgba(255,0,0,0.3)",
                    borderRadius: "12px",
                    marginBottom: "24px",
                    color: "#ff6b6b"
                }}>
                    {error}
                </div>
            )}

            {!adPackId && !generating && (
                <div style={{ textAlign: "center", padding: "60px 0" }}>
                    <div style={{ fontSize: "64px", marginBottom: "24px" }}>📸</div>
                    <button
                        onClick={startGeneration}
                        className="ads-btn ads-btn-primary"
                        style={{
                            padding: "20px 40px",
                            fontSize: "18px",
                            fontWeight: 900
                        }}
                    >
                        Generate Ad Shots
                    </button>
                    <p style={{
                        fontSize: "12px",
                        opacity: 0.5,
                        marginTop: "16px"
                    }}>
                        4 professional shots per variant
                    </p>
                </div>
            )}

            {generating && variants.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                    <div style={{
                        width: "60px",
                        height: "60px",
                        border: "4px solid rgba(135,206,250,0.2)",
                        borderTop: "4px solid var(--sky-blue)",
                        borderRadius: "50%",
                        margin: "0 auto 24px",
                        animation: "spin 1s linear infinite"
                    }} />
                    <p style={{ opacity: 0.7 }}>Preparing shot generation...</p>
                </div>
            )}

            {/* Variants Grid */}
            {variants.length > 0 && (
                <div style={{
                    display: "grid",
                    gap: "24px",
                    marginBottom: "32px"
                }}>
                    {variants.map((variant: any) => (
                        <VariantCard
                            key={variant.id}
                            variant={variant}
                            onValidate={() => validateShots(variant.id)}
                            validating={validatingVariantId === variant.id}
                        />
                    ))}
                </div>
            )}

            {/* Navigation */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "40px"
            }}>
                <button
                    onClick={onBack}
                    className="ads-btn ads-btn-secondary"
                >
                    ← Back
                </button>

                <button
                    onClick={onNext}
                    className="ads-btn ads-btn-primary"
                    disabled={!canProceedToWinner}
                    style={{
                        opacity: canProceedToWinner ? 1 : 0.5,
                        cursor: canProceedToWinner ? "pointer" : "not-allowed"
                    }}
                >
                    Select Winner →
                </button>
            </div>
        </div>
    );
}

// Variant Card Component
function VariantCard({ variant, onValidate, validating }: {
    variant: any;
    onValidate: () => void;
    validating: boolean;
}) {
    const shots = variant.meta?.shots || {};
    const shotsValidated = variant.meta?.shots_validated;
    const status = variant.status;

    const shotTypes: ShotType[] = ['hook', 'proof', 'variation', 'winner'];

    return (
        <div className="glass" style={{
            padding: "24px",
            borderRadius: "16px",
            border: shotsValidated ? "2px solid var(--sky-blue)" : "1px solid rgba(255,255,255,0.1)"
        }}>
            {/* Header */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px"
            }}>
                <div>
                    <h3 style={{
                        fontSize: "18px",
                        fontWeight: 900,
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        marginBottom: "4px"
                    }}>
                        {variant.variant_type}
                    </h3>
                    <StatusBadge status={status} validated={shotsValidated} />
                </div>

                {shotsValidated && (
                    <div style={{
                        padding: "8px 16px",
                        background: "var(--sky-blue)",
                        color: "#000",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: 900,
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                    }}>
                        ✓ Locked
                    </div>
                )}
            </div>

            {/* 4-Shot Grid */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "12px",
                marginBottom: "20px"
            }}>
                {shotTypes.map((shotType, idx) => (
                    <ShotTile
                        key={shotType}
                        shotType={shotType}
                        shot={shots[shotType]}
                        status={status}
                    />
                ))}
            </div>

            {/* Actions */}
            {status === "shots_ready" && !shotsValidated && (
                <div>
                    <button
                        onClick={onValidate}
                        disabled={validating}
                        className="ads-btn ads-btn-primary"
                        style={{
                            width: "100%",
                            padding: "16px",
                            fontSize: "16px",
                            fontWeight: 900
                        }}
                    >
                        {validating ? "Validating..." : "Validate Shots"}
                    </button>
                    <p style={{
                        fontSize: "11px",
                        opacity: 0.5,
                        textAlign: "center",
                        marginTop: "8px"
                    }}>
                        This locks what you will export
                    </p>
                </div>
            )}

            {shotsValidated && (
                <div style={{
                    padding: "12px",
                    background: "rgba(135,206,250,0.1)",
                    borderRadius: "8px",
                    textAlign: "center",
                    fontSize: "12px",
                    opacity: 0.7
                }}>
                    What you validated is what you will export
                </div>
            )}
        </div>
    );
}

// Shot Tile Component
function ShotTile({ shotType, shot, status }: {
    shotType: ShotType;
    shot: any;
    status: string;
}) {
    const isGenerating = status === "generating_shots";
    const hasFailed = shot?.error;
    const hasImage = shot?.image_url;

    const shotMeta = SHOT_METADATA[shotType];
    const spatialRole = shot?.spatial_role as SpatialRole | undefined;
    const context = shot?.context;

    return (
        <div style={{
            position: "relative",
            aspectRatio: "9/16",
            background: "rgba(0,0,0,0.3)",
            borderRadius: "12px",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.1)"
        }}>
            {/* Loading State */}
            {isGenerating && !hasImage && (
                <div style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(135deg, rgba(135,206,250,0.1), rgba(135,206,250,0.05))",
                    gap: "12px"
                }}>
                    <div style={{
                        width: "30px",
                        height: "30px",
                        border: "3px solid rgba(135,206,250,0.2)",
                        borderTop: "3px solid var(--sky-blue)",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite"
                    }} />
                    <div style={{ fontSize: "10px", opacity: 0.5, textAlign: "center", padding: "0 8px" }}>
                        {shotMeta.displayName}
                    </div>
                </div>
            )}

            {/* Error State */}
            {hasFailed && (
                <div style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(255,0,0,0.1)",
                    gap: "8px",
                    padding: "12px"
                }}>
                    <div style={{ fontSize: "32px" }}>⚠️</div>
                    <div style={{ fontSize: "10px", opacity: 0.7, textAlign: "center" }}>
                        {shotMeta.displayName} Failed
                    </div>
                </div>
            )}

            {/* Image */}
            {hasImage && (
                <img
                    src={shot.image_url}
                    alt={`${shotMeta.displayName} shot`}
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover"
                    }}
                />
            )}

            {/* Shot Info Overlay */}
            <div style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "12px 8px 8px",
                background: "linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.7), transparent)"
            }}>
                {/* Shot Name */}
                <div style={{
                    fontSize: "11px",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "var(--sky-blue)",
                    marginBottom: "4px"
                }}>
                    {shotMeta.displayName}
                </div>

                {/* Spatial Role Badge */}
                {spatialRole && (
                    <div style={{
                        fontSize: "9px",
                        padding: "2px 6px",
                        background: "rgba(135,206,250,0.2)",
                        borderRadius: "4px",
                        display: "inline-block",
                        marginBottom: "2px",
                        border: "1px solid rgba(135,206,250,0.3)"
                    }}>
                        {getSpatialRoleLabel(spatialRole)}
                    </div>
                )}

                {/* Lock Indicator */}
                {hasImage && (
                    <div style={{
                        fontSize: "8px",
                        opacity: 0.5,
                        marginTop: "2px"
                    }}>
                        🔒 {BADGE_LABELS.spatialLocked.split('—')[0].trim()}
                    </div>
                )}
            </div>
        </div>
    );
}

// Status Badge Component
function StatusBadge({ status, validated }: { status: string; validated: boolean }) {
    if (validated) {
        return (
            <div style={{
                display: "inline-block",
                padding: "4px 12px",
                background: "var(--sky-blue)",
                color: "#000",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 900,
                textTransform: "uppercase"
            }}>
                Validated
            </div>
        );
    }

    const statusConfig: Record<string, { label: string; color: string }> = {
        idle: { label: STATUS_LABELS.idle, color: "rgba(255,255,255,0.2)" },
        generating_shots: { label: "Generating...", color: "rgba(135,206,250,0.3)" },
        shots_ready: { label: "Ready", color: "rgba(135,206,250,0.5)" },
        shots_partial: { label: "Partial", color: "rgba(255,167,38,0.5)" },
        shots_validated: { label: "Validated", color: "var(--sky-blue)" },
        generation_failed: { label: "Blocked", color: "rgba(255,0,0,0.5)" },
        failed: { label: "Failed", color: "rgba(255,0,0,0.5)" }
    };

    const config = statusConfig[status] || { label: status, color: "rgba(255,255,255,0.2)" };

    return (
        <div style={{
            display: "inline-block",
            padding: "4px 12px",
            background: config.color,
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: 700,
            textTransform: "uppercase"
        }}>
            {config.label}
        </div>
    );
}
