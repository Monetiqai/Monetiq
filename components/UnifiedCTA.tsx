import React from 'react';
import Link from 'next/link';

type Mode = 'director' | 'node' | 'ads';

interface UnifiedCTAProps {
    mode: Mode;
    href: string;
    children: React.ReactNode;
    microCopy?: string;
}

const modeConfig = {
    director: {
        bg: '#FFA726',
        bgHover: '#FF8F00',
        color: '#000',
        rgb: '255, 167, 38',
    },
    node: {
        bg: '#8B5CF6',
        bgHover: '#7C3AED',
        color: '#fff',
        rgb: '139, 92, 246',
    },
    ads: {
        bg: '#38BDF8',
        bgHover: '#0EA5E9',
        color: '#000',
        rgb: '56, 189, 248',
    },
};

export default function UnifiedCTA({ mode, href, children, microCopy }: UnifiedCTAProps) {
    const config = modeConfig[mode];
    const [isHovered, setIsHovered] = React.useState(false);

    const buttonStyles = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        padding: '16px 32px',
        fontSize: '14px',
        fontWeight: 700,
        color: config.color,
        background: isHovered ? config.bgHover : config.bg,
        border: `1px solid rgba(${config.rgb}, 0.3)`,
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        textDecoration: 'none',
        textTransform: 'uppercase' as const,
        letterSpacing: '1px',
        boxShadow: isHovered
            ? `0 12px 32px rgba(${config.rgb}, 0.5)`
            : `0 8px 24px rgba(${config.rgb}, 0.4)`,
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Link
                href={href}
                style={buttonStyles}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <span>{children}</span>
            </Link>

            {microCopy && (
                <p style={{
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.6)',
                    margin: 0,
                    fontStyle: 'italic',
                    textShadow: '0 1px 10px rgba(0, 0, 0, 0.8)',
                }}>
                    {microCopy}
                </p>
            )}
        </div>
    );
}
