import React from 'react';

type Mode = 'director' | 'node' | 'ads';
type Variant = 'hero' | 'section' | 'step' | 'warning';

interface UnifiedCardProps {
    mode: Mode;
    variant?: Variant;
    children: React.ReactNode;
    className?: string;
}

const modeAccents = {
    director: '#FFA726',
    node: '#8B5CF6',
    ads: '#38BDF8',
};

const modeAccentsRgb = {
    director: '255, 167, 38',
    node: '139, 92, 246',
    ads: '56, 189, 248',
};

export default function UnifiedCard({
    mode,
    variant = 'section',
    children,
    className = ''
}: UnifiedCardProps) {
    const accent = modeAccents[mode];
    const accentRgb = modeAccentsRgb[mode];

    const baseStyles = {
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
        padding: '24px',
        position: 'relative' as const,
    };

    const variantStyles = {
        hero: {
            height: '280px',
            borderTop: `2px solid rgba(${accentRgb}, 0.3)`,
            overflow: 'hidden' as const,
        },
        section: {
            marginTop: '24px',
        },
        step: {
            padding: '16px',
        },
        warning: {
            border: '2px solid rgba(239, 68, 68, 0.4)',
            background: 'rgba(239, 68, 68, 0.08)',
            marginTop: '20px',
        },
    };

    const combinedStyles = {
        ...baseStyles,
        ...variantStyles[variant],
    };

    return (
        <div
            className={className}
            style={combinedStyles}
            data-mode={mode}
            data-variant={variant}
        >
            {children}
        </div>
    );
}
