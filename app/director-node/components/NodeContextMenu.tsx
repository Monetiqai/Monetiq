'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface NodeContextMenuProps {
    nodeId: string;
    nodeType: string;
    isOpen: boolean;
    position: { x: number; y: number };
    onClose: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
    onRename: () => void;
    onToggleDisable: () => void;
    isDisabled: boolean;
}

export function NodeContextMenu({
    nodeId,
    nodeType,
    isOpen,
    position,
    onClose,
    onDuplicate,
    onDelete,
    onRename,
    onToggleDisable,
    isDisabled
}: NodeContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [clampedPosition, setClampedPosition] = useState(position);

    // DEFINITIVE FIX: Close on outside click with capture-phase pointerdown
    useEffect(() => {
        if (!isOpen) return;

        const handleOutsidePointer = (e: PointerEvent) => {
            // ROBUST DETECTION: Use composedPath to handle SVG clicks
            // When clicking SVG icon, e.target is <path>, not <button>
            // composedPath() gives us the full event path from target to window
            const path = e.composedPath?.() || [];

            // Check if ANY element in the path has trigger or menu attribute
            const clickedTrigger = path.some((el: any) =>
                el.nodeType === 1 && el.hasAttribute?.('data-context-trigger')
            );
            const clickedMenu = path.some((el: any) =>
                el.nodeType === 1 && el.hasAttribute?.('data-context-menu')
            );

            // Ignore if clicking trigger or menu
            if (clickedTrigger || clickedMenu) {
                return;
            }

            // Close menu
            onClose();
        };

        // Defer listener activation to next tick + use capture phase
        const timeoutId = setTimeout(() => {
            document.addEventListener('pointerdown', handleOutsidePointer, { capture: true });
        }, 0);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('pointerdown', handleOutsidePointer, { capture: true });
        };
    }, [isOpen, onClose]);

    // COORDINATE FIX: Clamp menu to viewport bounds
    useEffect(() => {
        if (!isOpen || !menuRef.current) return;

        const menuRect = menuRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let { x, y } = position;

        // Clamp to right edge
        if (x + menuRect.width > viewportWidth) {
            x = viewportWidth - menuRect.width - 8; // 8px padding
        }

        // Clamp to bottom edge
        if (y + menuRect.height > viewportHeight) {
            y = viewportHeight - menuRect.height - 8; // 8px padding
        }

        // Clamp to left edge
        if (x < 8) x = 8;

        // Clamp to top edge
        if (y < 8) y = 8;

        setClampedPosition({ x, y });
    }, [isOpen, position]);

    // Close on escape
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const menuItems = [
        {
            icon: '🔄',
            label: 'Duplicate',
            onClick: () => {
                onDuplicate();
                onClose();
            }
        },
        {
            icon: '✏️',
            label: 'Rename',
            onClick: () => {
                onRename();
                onClose();
            }
        },
        {
            icon: isDisabled ? '👁️' : '🚫',
            label: isDisabled ? 'Enable' : 'Disable',
            onClick: () => {
                onToggleDisable();
                onClose();
            }
        },
        {
            icon: '🗑️',
            label: 'Delete',
            onClick: () => {
                onDelete();
                onClose();
            },
            danger: true
        }
    ];

    if (!isOpen) return null;

    const menuContent = (
        <div
            ref={menuRef}
            data-context-menu="true"
            className="animate-fadeIn"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
            onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
            onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
            style={{
                position: 'fixed', // COORDINATE FIX: Use fixed positioning for viewport coords
                left: `${clampedPosition.x}px`,
                top: `${clampedPosition.y}px`,
                background: 'var(--node-bg)',
                border: '1px solid var(--node-border)',
                backdropFilter: 'var(--glass-blur)',
                borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                minWidth: '160px',
                overflow: 'hidden',
                zIndex: 99999 // High z-index for portal
            }}
        >
            {menuItems.map((item, index) => (
                <button
                    key={index}
                    onClick={item.onClick}
                    className="w-full text-left transition-all"
                    style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '10px 16px',
                        fontSize: '13px',
                        color: item.danger ? '#ef4444' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        borderBottom: index < menuItems.length - 1 ? '1px solid var(--node-border)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                    }}
                >
                    <span style={{ fontSize: '14px' }}>{item.icon}</span>
                    <span>{item.label}</span>
                </button>
            ))}
        </div>
    );

    // COORDINATE FIX: Render in portal to document.body for correct positioning
    return createPortal(menuContent, document.body);
}
