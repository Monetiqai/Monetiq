"use client";

import { useEffect, useState } from "react";

type Asset = {
    id: string;
    project_id: string;
    kind: "image" | "video";
    role: string;
    status: "pending" | "ready" | "failed";
    storage_bucket: string;
    storage_path: string | null;
    mime_type: string | null;
    meta: any;
    created_at: string;
};

type AssetWithUrl = Asset & { signedUrl: string | null };

interface AssetPreviewModalProps {
    asset: AssetWithUrl | null;
    projectName?: string | null;
    onClose: () => void;
    onDelete?: (assetId: string) => void;
    onDownload?: (url: string, filename: string) => void;
}

export default function AssetPreviewModal({
    asset,
    projectName,
    onClose,
    onDelete,
    onDownload,
}: AssetPreviewModalProps) {
    // State for global prompt toggle and project metadata
    const [showFullPrompt, setShowFullPrompt] = useState(false);
    const [projectMeta, setProjectMeta] = useState<any>(null);

    // Fetch project metadata for storyboard assets
    useEffect(() => {
        if (!asset?.project_id) return;

        async function fetchProjectMeta() {
            const { supabaseBrowser } = await import('@/lib/supabase/browser');
            const supabase = supabaseBrowser();

            const { data } = await supabase
                .from('projects')
                .select('meta')
                .eq('id', asset!.project_id)
                .single();

            if (data?.meta) {
                setProjectMeta(data.meta);
            }
        }

        fetchProjectMeta();
    }, [asset?.project_id]);

    // Close on ESC key
    useEffect(() => {
        if (!asset) return;

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [asset, onClose]);

    if (!asset) return null;

    const handleDownload = () => {
        if (asset.signedUrl && onDownload) {
            const filename = `${asset.role}_${asset.id}.${asset.kind === "image" ? "png" : "mp4"}`;
            onDownload(asset.signedUrl, filename);
        }
    };

    const handleDelete = () => {
        if (confirm(`Delete this ${asset.kind}? This action cannot be undone.`)) {
            onDelete?.(asset.id);
            onClose();
        }
    };

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.85)",
                backdropFilter: "blur(8px)",
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
                animation: "fadeIn 0.2s ease-out",
            }}
            onClick={onClose}
        >
            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .modal-content {
          animation: slideUp 0.3s ease-out;
        }
        .action-btn {
          padding: 12px 20px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.2);
          background: rgba(255,255,255,.08);
          color: white;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .action-btn:hover {
          border-color: rgba(56,189,248,.5);
          background: rgba(56,189,248,.15);
          transform: translateY(-1px);
        }
        .action-btn-danger {
          border-color: rgba(239,68,68,.3);
          background: rgba(239,68,68,.1);
        }
        .action-btn-danger:hover {
          border-color: rgba(239,68,68,.6);
          background: rgba(239,68,68,.2);
        }
        .metadata-row {
          display: flex;
          gap: 8px;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,.06);
        }
        .metadata-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          opacity: 0.5;
          min-width: 100px;
        }
        .metadata-value {
          font-size: 13px;
          opacity: 0.9;
          flex: 1;
        }
      `}</style>

            <div
                className="modal-content"
                style={{
                    background: "linear-gradient(135deg, rgba(20,20,20,.95) 0%, rgba(10,10,10,.98) 100%)",
                    borderRadius: "20px",
                    border: "1px solid rgba(255,255,255,.15)",
                    maxWidth: "1200px",
                    width: "100%",
                    maxHeight: "90vh",
                    overflow: "auto",
                    boxShadow: "0 24px 64px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.1)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    style={{
                        padding: "20px 24px",
                        borderBottom: "1px solid rgba(255,255,255,.08)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <div>
                        <h2 style={{ fontSize: "20px", fontWeight: 900, margin: 0, marginBottom: "4px" }}>
                            Asset Preview
                        </h2>
                        <div style={{ fontSize: "12px", opacity: 0.6 }}>
                            {asset.kind === "image" ? "Image" : "Video"} · {asset.role}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: "rgba(255,255,255,.08)",
                            border: "1px solid rgba(255,255,255,.15)",
                            borderRadius: "10px",
                            width: "36px",
                            height: "36px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            fontSize: "18px",
                            color: "white",
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", padding: "24px" }}>
                    {/* Preview */}
                    <div>
                        <div
                            style={{
                                background: "#000",
                                borderRadius: "16px",
                                overflow: "hidden",
                                border: "1px solid rgba(255,255,255,.1)",
                                aspectRatio: "21/9",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            {asset.signedUrl ? (
                                asset.kind === "image" ? (
                                    <img
                                        src={asset.signedUrl}
                                        alt="Asset preview"
                                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                                    />
                                ) : (
                                    <video
                                        src={asset.signedUrl}
                                        controls
                                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                                    />
                                )
                            ) : (
                                <div style={{ opacity: 0.5, fontSize: "14px" }}>No preview available</div>
                            )}
                        </div>

                        {/* Actions */}
                        <div style={{ marginTop: "20px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                            {asset.signedUrl && (
                                <button className="action-btn" onClick={handleDownload}>
                                    ⬇️ Download
                                </button>
                            )}
                            <button className="action-btn" onClick={() => window.open(`/director-mode`, "_blank")}>
                                🎬 Use in Director
                            </button>
                            {onDelete && (
                                <button className="action-btn action-btn-danger" onClick={handleDelete}>
                                    🗑️ Delete
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Metadata */}
                    <div>
                        <h3 style={{ fontSize: "14px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "16px", opacity: 0.7 }}>
                            Metadata
                        </h3>

                        <div className="metadata-row">
                            <div className="metadata-label">Status</div>
                            <div className="metadata-value">
                                <span
                                    style={{
                                        padding: "4px 10px",
                                        borderRadius: "6px",
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        textTransform: "uppercase",
                                        background: asset.status === "ready" ? "rgba(34,197,94,.2)" : asset.status === "failed" ? "rgba(239,68,68,.2)" : "rgba(250,204,21,.2)",
                                        color: asset.status === "ready" ? "#22c55e" : asset.status === "failed" ? "#ef4444" : "#facc15",
                                    }}
                                >
                                    {asset.status}
                                </span>
                            </div>
                        </div>

                        <div className="metadata-row">
                            <div className="metadata-label">Type</div>
                            <div className="metadata-value">{asset.kind}</div>
                        </div>

                        <div className="metadata-row">
                            <div className="metadata-label">Role</div>
                            <div className="metadata-value">{asset.role}</div>
                        </div>

                        {projectName && (
                            <div className="metadata-row">
                                <div className="metadata-label">Project</div>
                                <div className="metadata-value">{projectName}</div>
                            </div>
                        )}

                        {/* Scene Info (for storyboard assets) */}
                        {asset.meta?.scene_index !== undefined && (
                            <>
                                <div className="metadata-row">
                                    <div className="metadata-label">Scene</div>
                                    <div className="metadata-value">
                                        Scene {asset.meta.scene_index + 1}
                                        {projectMeta?.scene_count && ` of ${projectMeta.scene_count}`}
                                    </div>
                                </div>

                                <div className="metadata-row">
                                    <div className="metadata-label">Scene Intent</div>
                                    <div className="metadata-value" style={{ fontSize: "12px", lineHeight: "1.5" }}>
                                        {asset.meta.scene_intent || 'N/A'}
                                    </div>
                                </div>

                                {/* Toggle for full storyboard prompt */}
                                {projectMeta?.global_prompt && (
                                    <div style={{ marginTop: "12px" }}>
                                        <button
                                            onClick={() => setShowFullPrompt(!showFullPrompt)}
                                            style={{
                                                background: "rgba(255,167,38,.1)",
                                                border: "1px solid rgba(255,167,38,.3)",
                                                borderRadius: "8px",
                                                padding: "8px 12px",
                                                color: "#FFA726",
                                                fontSize: "11px",
                                                fontWeight: 700,
                                                cursor: "pointer",
                                                width: "100%",
                                                textAlign: "left",
                                                transition: "all 0.2s",
                                            }}
                                        >
                                            {showFullPrompt ? "▼ Hide" : "▶ Show"} Full Storyboard Prompt
                                        </button>

                                        {showFullPrompt && (
                                            <div
                                                style={{
                                                    marginTop: "8px",
                                                    padding: "12px",
                                                    background: "rgba(255,255,255,.03)",
                                                    borderRadius: "8px",
                                                    border: "1px solid rgba(255,255,255,.06)",
                                                    fontSize: "11px",
                                                    lineHeight: "1.6",
                                                    opacity: 0.8,
                                                }}
                                            >
                                                <div style={{ marginBottom: "8px" }}>
                                                    <strong style={{ color: "#FFA726" }}>Scene Description:</strong>
                                                    <div style={{ marginTop: "4px" }}>{projectMeta.global_prompt.scene_description}</div>
                                                </div>
                                                <div>
                                                    <strong style={{ color: "#FFA726" }}>Cinema Settings:</strong>
                                                    <div style={{ marginTop: "4px" }}>{projectMeta.global_prompt.cinema_settings}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Single-shot prompt (backward compatible) */}
                        {asset.meta?.prompt && asset.meta?.scene_index === undefined && (
                            <div className="metadata-row">
                                <div className="metadata-label">Prompt</div>
                                <div className="metadata-value" style={{ fontSize: "12px", lineHeight: "1.5" }}>
                                    {asset.meta.prompt}
                                </div>
                            </div>
                        )}

                        {asset.meta?.model && (
                            <div className="metadata-row">
                                <div className="metadata-label">Model</div>
                                <div className="metadata-value">{asset.meta.model}</div>
                            </div>
                        )}

                        {asset.meta?.quality && (
                            <div className="metadata-row">
                                <div className="metadata-label">Quality</div>
                                <div className="metadata-value">{asset.meta.quality}</div>
                            </div>
                        )}

                        {asset.meta?.director && (
                            <div className="metadata-row">
                                <div className="metadata-label">Director Style</div>
                                <div className="metadata-value">{asset.meta.director}</div>
                            </div>
                        )}

                        <div className="metadata-row">
                            <div className="metadata-label">Created</div>
                            <div className="metadata-value">
                                {new Date(asset.created_at).toLocaleString()}
                            </div>
                        </div>

                        <div className="metadata-row">
                            <div className="metadata-label">Asset ID</div>
                            <div className="metadata-value" style={{ fontSize: "10px", fontFamily: "monospace", opacity: 0.6 }}>
                                {asset.id}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
