"use client";

export default function ModeTransition() {
    return (
        <div style={{
            textAlign: "center",
            padding: "60px 24px 50px",
            position: "relative",
        }}>
            {/* Three faint vertical guides aligned with mode columns */}
            <div style={{
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: "100%",
                maxWidth: "1400px",
                height: "100%",
                display: "flex",
                justifyContent: "space-between",
                padding: "0 calc((100% - 1200px) / 2)",
                opacity: 0.06,
                pointerEvents: "none",
            }}>
                <div style={{ width: "1px", background: "linear-gradient(to bottom, transparent, white 30%, white 70%, transparent)" }} />
                <div style={{ width: "1px", background: "linear-gradient(to bottom, transparent, white 30%, white 70%, transparent)" }} />
                <div style={{ width: "1px", background: "linear-gradient(to bottom, transparent, white 30%, white 70%, transparent)" }} />
            </div>

            {/* Transition text */}
            <p style={{
                fontSize: "13px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "3px",
                color: "rgba(255,255,255,0.35)",
                margin: "0 0 20px",
                transition: "color 0.3s ease",
            }}>
                Choose your mindset
            </p>

            {/* Subtle divider */}
            <div style={{
                width: "100px",
                height: "1px",
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                margin: "0 auto",
            }} />
        </div>
    );
}
