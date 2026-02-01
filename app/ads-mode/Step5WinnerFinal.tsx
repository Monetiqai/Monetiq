"use client";

import { useState, useEffect } from "react";

interface Step5Props {
    adPackId: string;
    winnerVariantId?: string;
    setWinnerVariantId: (id: string) => void;
    onBack: () => void;
}

export default function Step5WinnerFinal({
    adPackId,
    winnerVariantId,
    setWinnerVariantId,
    onBack
}: Step5Props) {
    const [variants, setVariants] = useState<any[]>([]);
    const [finalVariant, setFinalVariant] = useState<any>(null);
    const [generatingFinal, setGeneratingFinal] = useState(false);
    const [selectedShots, setSelectedShots] = useState<Set<string>>(new Set());
    const [generatingVideos, setGeneratingVideos] = useState(false);
    const [videoProgress, setVideoProgress] = useState<{ current: number; total: number; percentage: number }>({ current: 0, total: 0, percentage: 0 });
    const [generatedVideos, setGeneratedVideos] = useState<Record<string, string>>({});
    const [videoStatuses, setVideoStatuses] = useState<Record<string, string>>({});

    useEffect(() => {
        loadVariants();
    }, [adPackId]);

    const loadVariants = async () => {
        try {
            const res = await fetch(`/api/ads-mode/get-pack?id=${adPackId}`);
            const data = await res.json();
            if (data.ok) {
                const nonFinalVariants = data.variants.filter((v: any) => !v.is_final);
                console.log('[Step5] Loaded variants:', nonFinalVariants);
                nonFinalVariants.forEach((v: any) => {
                    console.log(`[Step5] Variant ${v.variant_type}: status=${v.status}, video_url=${v.video_url ? 'EXISTS' : 'MISSING'}`);
                });
                setVariants(nonFinalVariants);
                const final = data.variants.find((v: any) => v.is_final);
                if (final) setFinalVariant(final);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const markWinner = async (variantId: string) => {
        try {
            const res = await fetch("/api/ads-mode/mark-winner", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ variant_id: variantId })
            });
            const data = await res.json();
            if (data.ok) {
                setWinnerVariantId(variantId);
                loadVariants();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const generateFinal = async () => {
        try {
            setGeneratingFinal(true);
            const res = await fetch("/api/ads-mode/generate-final", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ad_pack_id: adPackId })
            });
            const data = await res.json();
            if (data.ok) {
                // Poll for final
                setTimeout(loadVariants, 3000);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setGeneratingFinal(false);
        }
    };

    const toggleShotSelection = (variantId: string, shotType: string) => {
        const key = `${variantId}:${shotType}`; // Use : instead of - to avoid UUID conflicts
        const newSelected = new Set(selectedShots);
        if (newSelected.has(key)) {
            newSelected.delete(key);
        } else {
            newSelected.add(key);
        }
        setSelectedShots(newSelected);
    };

    const generateVideos = async () => {
        if (selectedShots.size === 0) {
            alert('Please select at least one shot to generate videos');
            return;
        }

        try {
            setGeneratingVideos(true);
            setVideoProgress({ current: 0, total: selectedShots.size, percentage: 0 });
            setGeneratedVideos({});

            // Group shots by variant
            const shotsByVariant: Record<string, string[]> = {};
            selectedShots.forEach(key => {
                const [variantId, shotType] = key.split(':');
                if (!shotsByVariant[variantId]) {
                    shotsByVariant[variantId] = [];
                }
                shotsByVariant[variantId].push(shotType);
            });

            // Generate videos for each variant
            for (const [variantId, shotTypes] of Object.entries(shotsByVariant)) {
                const res = await fetch('/api/ads-mode/generate-videos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ variantId, shotTypes })
                });

                const data = await res.json();
                if (!data.ok) {
                    console.error(`Failed to generate videos for variant ${variantId}:`, data.error);
                }
            }

            // Poll for progress
            pollVideoProgress();

        } catch (err) {
            console.error('Error generating videos:', err);
            alert('Failed to generate videos. Please try again.');
            setGeneratingVideos(false);
        }
    };

    const pollVideoProgress = async () => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/ads-mode/get-pack?id=${adPackId}`);
                const data = await res.json();

                if (data.ok && data.variants) {
                    setVariants(data.variants);

                    // Count completed videos
                    let completedCount = 0;
                    const newGeneratedVideos: Record<string, string> = {};
                    const newVideoStatuses: Record<string, string> = {};

                    console.log('[Progress Poll] Checking videos for', selectedShots.size, 'selected shots');

                    console.log('[Progress Poll] Checking videos for', selectedShots.size, 'selected shots');

                    data.variants.forEach((variant: any) => {
                        const videos = variant.meta?.videos || {};
                        const statuses = variant.meta?.video_statuses || {};
                        console.log(`[Progress Poll] Variant ${variant.id.substring(0, 8)}:`);
                        console.log(`  - meta exists:`, !!variant.meta);
                        console.log(`  - videos type:`, typeof videos);
                        console.log(`  - videos is array:`, Array.isArray(videos));
                        console.log(`  - videos keys:`, Object.keys(videos));
                        console.log(`  - videos value:`, videos);
                        console.log(`  - statuses:`, statuses);

                        selectedShots.forEach(key => {
                            const [variantId, shotType] = key.split(':');
                            if (variant.id === variantId) {
                                // Track status
                                if (statuses[shotType]) {
                                    newVideoStatuses[key] = statuses[shotType];
                                }
                                // Track completed videos
                                if (videos[shotType]) {
                                    completedCount++;
                                    newGeneratedVideos[key] = videos[shotType];
                                    console.log(`[Progress Poll] ✓ Found video for ${shotType}`);
                                }
                            }
                        });
                    });


                    const percentage = selectedShots.size > 0 ? Math.round((completedCount / selectedShots.size) * 100) : 0;
                    console.log(`[Progress Poll] Progress: ${completedCount}/${selectedShots.size} = ${percentage}%`);

                    setVideoProgress({ current: completedCount, total: selectedShots.size, percentage });
                    setGeneratedVideos(newGeneratedVideos);
                    setVideoStatuses(newVideoStatuses);

                    // All done
                    if (completedCount === selectedShots.size && selectedShots.size > 0) {
                        console.log('[Progress Poll] ✓ All videos complete!');
                        clearInterval(interval);
                        setGeneratingVideos(false);
                    }
                }
            } catch (err) {
                console.error('Poll error:', err);
            }
        }, 3000); // Poll every 3 seconds
    };

    const winner = variants.find(v => v.is_winner);

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
                <span style={{ color: "var(--gold)" }}>5.</span>
                Select Winner & Generate Final
            </h2>
            <p style={{
                fontSize: "14px",
                opacity: 0.6,
                marginBottom: "32px"
            }}>
                Select shots to convert to videos, then choose a winner for final generation
            </p>

            {/* Shot Selection Section */}
            {variants.length > 0 && (
                <div style={{
                    marginBottom: "32px",
                    padding: "24px",
                    background: "rgba(56, 189, 248, 0.05)",
                    border: "1px solid rgba(56, 189, 248, 0.2)",
                    borderRadius: "12px"
                }}>
                    <h3 style={{
                        fontSize: "18px",
                        fontWeight: 700,
                        marginBottom: "16px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                    }}>
                        🎬 Video Generation
                        {selectedShots.size > 0 && (
                            <span style={{
                                fontSize: "12px",
                                padding: "4px 8px",
                                background: "var(--sky-blue)",
                                borderRadius: "6px",
                                color: "#000",
                                fontWeight: 900
                            }}>
                                {selectedShots.size} selected
                            </span>
                        )}
                    </h3>

                    {/* Shots Grid */}
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                        gap: "12px",
                        marginBottom: "16px"
                    }}>
                        {variants.map((variant: any) => {
                            const shots = variant.meta?.shots || {};
                            const videos = variant.meta?.videos || {};
                            const shotTypes = ['hook', 'proof', 'variation', 'winner'];

                            return shotTypes.map(shotType => {
                                const shot = shots[shotType];
                                const video = videos[shotType];
                                const key = `${variant.id}:${shotType}`; // Use : instead of -
                                const isSelected = selectedShots.has(key);

                                if (!shot?.image_url) return null;

                                return (
                                    <div
                                        key={key}
                                        onClick={() => toggleShotSelection(variant.id, shotType)}
                                        style={{
                                            padding: "12px",
                                            background: isSelected
                                                ? "rgba(56, 189, 248, 0.15)"
                                                : "rgba(255, 255, 255, 0.03)",
                                            border: isSelected
                                                ? "2px solid var(--sky-blue)"
                                                : "1px solid rgba(255, 255, 255, 0.1)",
                                            borderRadius: "8px",
                                            cursor: "pointer",
                                            transition: "all 0.2s"
                                        }}
                                    >
                                        {/* Checkbox + Label */}
                                        <div style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            marginBottom: "8px"
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => { }}
                                                style={{
                                                    width: "16px",
                                                    height: "16px",
                                                    cursor: "pointer"
                                                }}
                                            />
                                            <div style={{
                                                fontSize: "12px",
                                                fontWeight: 700,
                                                textTransform: "capitalize"
                                            }}>
                                                {shotType}
                                            </div>
                                        </div>

                                        {/* Thumbnail */}
                                        <img
                                            src={shot.image_url}
                                            alt={shotType}
                                            style={{
                                                width: "100%",
                                                height: "120px",
                                                objectFit: "cover",
                                                borderRadius: "6px",
                                                marginBottom: "8px"
                                            }}
                                        />

                                        {/* Status */}
                                        <div style={{
                                            fontSize: "10px",
                                            opacity: 0.7,
                                            textAlign: "center"
                                        }}>
                                            {video ? "✅ Video ready" : "⏳ No video"}
                                        </div>
                                    </div>
                                );
                            });
                        })}
                    </div>

                    {/* Generate Videos Button */}
                    <button
                        onClick={generateVideos}
                        disabled={selectedShots.size === 0 || generatingVideos}
                        className="ads-btn ads-btn-primary"
                        style={{
                            width: "100%",
                            padding: "16px",
                            fontSize: "14px",
                            fontWeight: 900,
                            opacity: selectedShots.size === 0 || generatingVideos ? 0.5 : 1,
                            cursor: selectedShots.size === 0 || generatingVideos ? "not-allowed" : "pointer"
                        }}
                    >
                        {generatingVideos
                            ? `⏳ Generating videos...`
                            : selectedShots.size === 0
                                ? "Select shots to generate videos"
                                : `🎬 Generate ${selectedShots.size} Video${selectedShots.size > 1 ? 's' : ''}`
                        }
                    </button>

                    {/* Progress Section */}
                    {generatingVideos && (
                        <div style={{
                            marginTop: "16px",
                            padding: "20px",
                            background: "rgba(255, 255, 255, 0.03)",
                            borderRadius: "12px",
                            border: "1px solid rgba(255, 255, 255, 0.1)"
                        }}>
                            <div style={{
                                fontSize: "16px",
                                fontWeight: 700,
                                marginBottom: "16px",
                                textAlign: "center"
                            }}>
                                🎬 Generating Videos
                            </div>

                            {/* Individual Video Statuses */}
                            <div style={{
                                display: "grid",
                                gap: "8px"
                            }}>
                                {Array.from(selectedShots).map(key => {
                                    const [, shotType] = key.split(':');
                                    const status = videoStatuses[key] || 'Waiting';
                                    const hasVideo = generatedVideos[key];

                                    const statusConfig: Record<string, { icon: string; color: string; bg: string }> = {
                                        'Waiting': { icon: '⏸️', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)' },
                                        'Preparing': { icon: '⏳', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
                                        'Queueing': { icon: '⏸️', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
                                        'Processing': { icon: '⚙️', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
                                        'Success': { icon: '✅', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' }
                                    };

                                    const config = statusConfig[status] || statusConfig['Waiting'];
                                    const isActive = status !== 'Waiting' && !hasVideo;

                                    return (
                                        <div key={key} style={{
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
                                                    fontWeight: 600,
                                                    textTransform: 'capitalize'
                                                }}>
                                                    {shotType}
                                                </span>
                                            </div>
                                            <div style={{
                                                fontSize: '12px',
                                                fontWeight: 700,
                                                color: config.color
                                            }}>
                                                {hasVideo ? 'Complete' : status}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <style jsx>{`
                                @keyframes pulse {
                                    0%, 100% { opacity: 1; transform: scale(1); }
                                    50% { opacity: 0.8; transform: scale(1.02); }
                                }
                            `}</style>
                        </div>
                    )}


                    {/* Video Preview Section */}
                    {!generatingVideos && Object.keys(generatedVideos).length > 0 && (
                        <div style={{
                            marginTop: "24px",
                            padding: "24px",
                            background: "rgba(74, 222, 128, 0.05)",
                            border: "1px solid rgba(74, 222, 128, 0.2)",
                            borderRadius: "12px"
                        }}>
                            <h4 style={{
                                fontSize: "16px",
                                fontWeight: 700,
                                marginBottom: "16px",
                                color: "#4ade80"
                            }}>
                                ✅ Videos Generated Successfully
                            </h4>

                            <div style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                                gap: "16px"
                            }}>
                                {Object.entries(generatedVideos).map(([key, url]) => {
                                    const [, shotType] = key.split(':');
                                    return (
                                        <div key={key} style={{
                                            background: "rgba(0, 0, 0, 0.3)",
                                            borderRadius: "8px",
                                            overflow: "hidden",
                                            border: "1px solid rgba(74, 222, 128, 0.3)"
                                        }}>
                                            <div style={{
                                                padding: "8px",
                                                background: "rgba(74, 222, 128, 0.1)",
                                                fontSize: "12px",
                                                fontWeight: 700,
                                                textTransform: "capitalize",
                                                textAlign: "center"
                                            }}>
                                                {shotType}
                                            </div>
                                            <video
                                                src={url}
                                                controls
                                                loop
                                                style={{
                                                    width: "100%",
                                                    display: "block",
                                                    maxHeight: "300px"
                                                }}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )
            }

            {/* Variants Grid */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "16px",
                marginBottom: "32px"
            }}>
                {variants.map((variant: any) => (
                    <div
                        key={variant.id}
                        style={{
                            padding: "20px",
                            background: variant.is_winner
                                ? "linear-gradient(135deg, rgba(255,167,38,.15) 0%, rgba(255,143,0,.1) 100%)"
                                : "rgba(255,255,255,.04)",
                            border: variant.is_winner
                                ? "2px solid var(--gold)"
                                : "1px solid rgba(255,255,255,.12)",
                            borderRadius: "12px"
                        }}
                    >
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "12px"
                        }}>
                            <div style={{ fontSize: "16px", fontWeight: 700 }}>
                                {variant.variant_type.toUpperCase()}
                            </div>
                            {variant.is_winner && (
                                <div style={{
                                    padding: "4px 12px",
                                    background: "var(--gold)",
                                    borderRadius: "12px",
                                    fontSize: "11px",
                                    fontWeight: 900,
                                    color: "#000"
                                }}>
                                    ✓ WINNER
                                </div>
                            )}
                        </div>

                        {/* Status Indicator */}
                        {variant.status !== "ready" && (
                            <div style={{
                                padding: "12px",
                                background: variant.status === "processing"
                                    ? "rgba(59,130,246,0.1)"
                                    : "rgba(239,68,68,0.1)",
                                border: `1px solid ${variant.status === "processing" ? "rgba(59,130,246,0.3)" : "rgba(239,68,68,0.3)"}`,
                                borderRadius: "8px",
                                marginBottom: "16px",
                                textAlign: "center"
                            }}>
                                <div style={{ fontSize: "13px", fontWeight: 600 }}>
                                    {variant.status === "processing" && "⏳ Video generating..."}
                                    {variant.status === "queued" && "⏸️ Queued for generation"}
                                    {variant.status === "failed" && "❌ Generation failed"}
                                </div>
                            </div>
                        )}

                        {/* Video Preview */}
                        {variant.video_url && variant.status === "ready" && (
                            <div style={{
                                marginBottom: "16px",
                                borderRadius: "8px",
                                overflow: "hidden",
                                background: "#000"
                            }}>
                                <video
                                    src={variant.video_url}
                                    controls
                                    loop
                                    style={{
                                        width: "100%",
                                        display: "block",
                                        maxHeight: "400px"
                                    }}
                                />
                            </div>
                        )}

                        {!variant.video_url && variant.status === "ready" && (
                            <div style={{
                                padding: "40px",
                                background: "rgba(239,68,68,0.1)",
                                border: "1px solid rgba(239,68,68,0.3)",
                                borderRadius: "8px",
                                textAlign: "center",
                                marginBottom: "16px"
                            }}>
                                <div style={{ fontSize: "14px", color: "#ef4444" }}>
                                    ⚠️ Video URL missing
                                </div>
                            </div>
                        )}

                        <div style={{ fontSize: "12px", opacity: 0.6, marginBottom: "16px" }}>
                            Hook: {variant.hook_text || "Generating..."}
                        </div>

                        {!variant.is_winner && variant.status === "ready" && (
                            <button
                                onClick={() => markWinner(variant.id)}
                                className="ads-btn ads-btn-primary"
                                style={{
                                    width: "100%",
                                    padding: "12px",
                                    fontSize: "13px",
                                    fontWeight: 900
                                }}
                            >
                                Select as Winner
                            </button>
                        )}

                        {variant.is_winner && (
                            <div style={{
                                padding: "12px",
                                background: "rgba(74,222,128,0.1)",
                                border: "1px solid rgba(74,222,128,0.3)",
                                borderRadius: "8px",
                                fontSize: "12px",
                                fontWeight: 700,
                                color: "#4ade80",
                                textAlign: "center"
                            }}>
                                Selected for final generation
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Generate Final - Only shown after winner selection */}
            {
                winner && !finalVariant && (
                    <div style={{
                        padding: "24px",
                        background: "rgba(59,130,246,.1)",
                        border: "1px solid rgba(59,130,246,.3)",
                        borderRadius: "12px",
                        marginBottom: "32px",
                        textAlign: "center"
                    }}>
                        <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>
                            🎯 Winner Selected!
                        </div>
                        <div style={{ fontSize: "13px", opacity: 0.7, marginBottom: "16px" }}>
                            Ready to generate the final high-quality version
                        </div>
                        <button
                            onClick={generateFinal}
                            disabled={generatingFinal}
                            className="ads-btn ads-btn-primary"
                            style={{ padding: "16px 32px" }}
                        >
                            {generatingFinal ? "Generating..." : "Generate Final Version"}
                        </button>
                    </div>
                )
            }

            {/* Final Variant */}
            {
                finalVariant && (
                    <div style={{
                        padding: "24px",
                        background: "rgba(74,222,128,.1)",
                        border: "2px solid rgba(74,222,128,.3)",
                        borderRadius: "12px",
                        marginBottom: "32px"
                    }}>
                        <div style={{ fontSize: "18px", fontWeight: 900, marginBottom: "8px", color: "#4ade80" }}>
                            ✓ Final Version Ready
                        </div>
                        <div style={{ fontSize: "14px", opacity: 0.7 }}>
                            Status: {finalVariant.status}
                        </div>
                    </div>
                )
            }

            <button onClick={onBack} className="ads-btn ads-btn-secondary" style={{ width: "100%" }}>
                ← Back
            </button>
        </div >
    );
}
