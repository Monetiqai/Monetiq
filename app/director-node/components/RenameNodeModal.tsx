'use client';

import { useState, useRef, useEffect } from 'react';

interface RenameNodeModalProps {
    isOpen: boolean;
    currentName: string;
    onClose: () => void;
    onSave: (newName: string) => void;
}

export function RenameNodeModal({ isOpen, currentName, onClose, onSave }: RenameNodeModalProps) {
    const [name, setName] = useState(currentName);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setName(currentName);
            // Focus input after render
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [isOpen, currentName]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (name.trim()) {
            onSave(name.trim());
            onClose();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black bg-opacity-50 animate-fadeIn"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 animate-scaleIn"
                style={{
                    background: 'var(--node-bg)',
                    border: '1px solid var(--node-border)',
                    backdropFilter: 'var(--glass-blur)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    padding: '24px',
                    minWidth: '400px'
                }}
            >
                {/* Header */}
                <h3
                    style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        color: 'white',
                        marginBottom: '16px'
                    }}
                >
                    Rename Node
                </h3>

                {/* Input */}
                <input
                    ref={inputRef}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter node name..."
                    style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--node-border)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        fontSize: '13px',
                        color: 'white',
                        outline: 'none',
                        marginBottom: '20px'
                    }}
                    onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--sky)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(56, 189, 248, 0.1)';
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--node-border)';
                        e.currentTarget.style.boxShadow = 'none';
                    }}
                />

                {/* Actions */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '12px'
                    }}
                >
                    <button
                        onClick={onClose}
                        className="transition-all"
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--node-border)',
                            borderRadius: '8px',
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                            cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="transition-all"
                        style={{
                            background: 'var(--sky)',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'white',
                            cursor: 'pointer',
                            boxShadow: '0 0 16px rgba(56, 189, 248, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 20px rgba(56, 189, 248, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 0 16px rgba(56, 189, 248, 0.3)';
                        }}
                    >
                        Save
                    </button>
                </div>
            </div>
        </>
    );
}
