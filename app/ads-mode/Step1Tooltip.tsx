"use client";

import { useState, useEffect } from "react";

interface TooltipProps {
    show: boolean;
    onDismiss: () => void;
}

export default function Step1Tooltip({ show, onDismiss }: TooltipProps) {
    useEffect(() => {
        if (show) {
            // Auto-dismiss after 5 seconds
            const timer = setTimeout(() => {
                onDismiss();
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [show, onDismiss]);

    if (!show) return null;

    return (
        <div style={{
            position: "fixed",
            top: "120px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            animation: "slideDown 0.3s ease-out"
        }}>
            <div style={{
                background: "linear-gradient(135deg, rgba(56,189,248,0.95) 0%, rgba(14,165,233,0.95) 100%)",
                padding: "16px 24px",
                borderRadius: "12px",
                boxShadow: "0 8px 32px rgba(56,189,248,0.3)",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                maxWidth: "400px"
            }}>
                <div style={{
                    fontSize: "24px"
                }}>
                    💡
                </div>
                <div>
                    <div style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#000",
                        marginBottom: "4px"
                    }}>
                        Start with your product
                    </div>
                    <div style={{
                        fontSize: "12px",
                        color: "rgba(0,0,0,0.7)"
                    }}>
                        We'll handle the rest.
                    </div>
                </div>
                <button
                    onClick={onDismiss}
                    style={{
                        marginLeft: "auto",
                        background: "rgba(0,0,0,0.2)",
                        border: "none",
                        borderRadius: "50%",
                        width: "24px",
                        height: "24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "#000",
                        fontSize: "16px",
                        fontWeight: 700
                    }}
                >
                    ×
                </button>
            </div>

            <style jsx>{`
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}
