import { useEffect } from 'react';

interface AssetPreviewModalProps {
    asset: any | null;
    onClose: () => void;
    onNext?: () => void;
    onPrev?: () => void;
}

export default function AssetPreviewModal({ asset, onClose, onNext, onPrev }: AssetPreviewModalProps) {
    // Keyboard navigation
    useEffect(() => {
        if (!asset) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft' && onPrev) onPrev();
            if (e.key === 'ArrowRight' && onNext) onNext();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [asset, onClose, onPrev, onNext]);

    if (!asset) return null;

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '20px'
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'rgba(20, 20, 20, 0.95)',
                    borderRadius: '16px',
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    position: 'relative',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'rgba(0, 0, 0, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#fff',
                        fontSize: '24px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10
                    }}
                >
                    ×
                </button>

                {/* Navigation Arrows */}
                {onPrev && (
                    <button
                        onClick={onPrev}
                        style={{
                            position: 'absolute',
                            left: '16px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'rgba(0, 0, 0, 0.7)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: '#fff',
                            fontSize: '20px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10
                        }}
                    >
                        ←
                    </button>
                )}

                {onNext && (
                    <button
                        onClick={onNext}
                        style={{
                            position: 'absolute',
                            right: '16px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'rgba(0, 0, 0, 0.7)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: '#fff',
                            fontSize: '20px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10
                        }}
                    >
                        →
                    </button>
                )}

                {/* Image */}
                <img
                    src={asset.public_url}
                    alt={asset.original_filename}
                    style={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: '70vh',
                        objectFit: 'contain',
                        display: 'block'
                    }}
                />

                {/* Metadata */}
                <div style={{
                    padding: '20px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', color: '#fff' }}>
                        {asset.original_filename}
                    </div>
                    <div style={{ display: 'flex', gap: '24px', fontSize: '13px', opacity: 0.7 }}>
                        <div>
                            <span style={{ opacity: 0.5 }}>Size:</span> {formatBytes(asset.byte_size)}
                        </div>
                        <div>
                            <span style={{ opacity: 0.5 }}>Type:</span> {asset.mime_type}
                        </div>
                        <div>
                            <span style={{ opacity: 0.5 }}>Uploaded:</span> {formatDate(asset.created_at)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
