'use client';

import { useState, useEffect, useRef } from 'react';
import { NODE_REGISTRY, NodeDefinition, HandleType } from '../config/nodeRegistry';
import { getCompatibleNodes, groupByCategory } from '../utils/compatibility';

interface NodePickerPopupProps {
    isOpen: boolean;
    position: { x: number; y: number };
    sourceHandleType: HandleType;
    isSourceOutput: boolean;
    onSelect: (nodeId: string) => void;
    onClose: () => void;
}

export function NodePickerPopup({
    isOpen,
    position,
    sourceHandleType,
    isSourceOutput,
    onSelect,
    onClose
}: NodePickerPopupProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const popupRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Get compatible nodes
    const compatibleNodes = getCompatibleNodes(
        sourceHandleType,
        isSourceOutput,
        NODE_REGISTRY
    );

    // Filter by search query
    const filteredNodes = compatibleNodes.filter(node =>
        node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Group by category
    const groupedNodes = groupByCategory(filteredNodes);

    // Focus search input when popup opens
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredNodes[selectedIndex]) {
                    onSelect(filteredNodes[selectedIndex].id);
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, filteredNodes.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, filteredNodes, onSelect, onClose]);

    // Click outside to close
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        // Delay to avoid immediate close on drop
        const timeoutId = setTimeout(() => {
            window.addEventListener('mousedown', handleClickOutside);
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Reset selection when search changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [searchQuery]);

    if (!isOpen) return null;

    return (
        <div
            ref={popupRef}
            className="node-picker-popup fixed z-50 overflow-hidden"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: '320px',
                maxHeight: '400px',
                background: 'var(--node-bg)',
                border: '1px solid var(--node-border)',
                borderRadius: 'var(--node-radius)',
                boxShadow: 'var(--node-shadow)',
                backdropFilter: 'var(--glass-blur)'
            }}
        >
            {/* Search Input */}
            <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--node-border)' }}>
                <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search nodes or models"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'var(--bg-panel)',
                        border: '1px solid var(--node-border)',
                        borderRadius: '12px',
                        color: 'var(--text-primary)',
                        fontSize: 'var(--font-sm)',
                        outline: 'none',
                        transition: 'var(--transition-fast)'
                    }}
                    onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--sky)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px var(--sky-glow)';
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--node-border)';
                        e.currentTarget.style.boxShadow = 'none';
                    }}
                />
            </div>

            {/* Node List */}
            <div style={{ overflowY: 'auto', maxHeight: '320px' }}>
                {filteredNodes.length === 0 ? (
                    <div style={{
                        padding: 'var(--spacing-lg)',
                        textAlign: 'center',
                        color: 'var(--text-dim)',
                        fontSize: 'var(--font-sm)'
                    }}>
                        No compatible nodes
                    </div>
                ) : (
                    Object.entries(groupedNodes).map(([category, nodes]) => (
                        <div key={category}>
                            {/* Category Header */}
                            <div style={{
                                padding: '8px 12px',
                                fontSize: 'var(--font-xs)',
                                color: 'var(--text-dim)',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                background: 'var(--bg-panel)'
                            }}>
                                {category}
                            </div>

                            {/* Nodes in Category */}
                            {nodes.map((node, localIndex) => {
                                const globalIndex = filteredNodes.indexOf(node);
                                const isSelected = globalIndex === selectedIndex;

                                return (
                                    <button
                                        key={node.id}
                                        onClick={() => onSelect(node.id)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            textAlign: 'left',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            background: isSelected ? 'var(--bg-panel-hover)' : 'transparent',
                                            border: 'none',
                                            borderLeft: isSelected ? '2px solid var(--sky)' : '2px solid transparent',
                                            cursor: 'pointer',
                                            transition: 'var(--transition-fast)',
                                            color: 'var(--text-primary)'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isSelected) {
                                                e.currentTarget.style.background = 'var(--bg-panel)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isSelected) {
                                                e.currentTarget.style.background = 'transparent';
                                            }
                                        }}
                                    >
                                        {/* Icon */}
                                        <span style={{ fontSize: 'var(--font-md)', flexShrink: 0 }}>{node.icon}</span>

                                        {/* Content */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                color: 'var(--text-primary)',
                                                fontSize: 'var(--font-sm)',
                                                fontWeight: 500
                                            }}>
                                                {node.label}
                                            </div>
                                            {node.description && (
                                                <div style={{
                                                    color: 'var(--text-dim)',
                                                    fontSize: 'var(--font-xs)',
                                                    marginTop: '2px',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {node.description}
                                                </div>
                                            )}
                                        </div>

                                        {/* Subcategory Indicator */}
                                        {node.subcategory && (
                                            <span style={{ color: 'var(--text-dim)', fontSize: 'var(--font-sm)', flexShrink: 0 }}>›</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
