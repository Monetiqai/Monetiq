'use client';

import { useState, useCallback } from 'react';

export function useNodeContextMenu(nodeId: string, currentName: string, isDisabled: boolean = false) {
    const [contextMenuOpen, setContextMenuOpen] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

    // DEFINITIVE FIX: Open on pointerdown capture with full event isolation
    const handleContextMenuPointerDownCapture = useCallback((e: React.PointerEvent) => {
        // Capture phase: stop BEFORE ReactFlow sees it
        e.preventDefault();
        e.stopPropagation();
        // NOTE: Do NOT use stopImmediatePropagation() as it blocks ReactFlow's multi-select

        // COORDINATE FIX: Use clientX/Y (viewport coordinates) for position: fixed
        // This works correctly regardless of canvas pan/zoom/transform
        setContextMenuPosition({
            x: e.clientX,
            y: e.clientY
        });
        setContextMenuOpen(true);
    }, []);

    const handleContextMenuPointerDown = useCallback((e: React.PointerEvent) => {
        // Bubble phase: redundant defense (already handled in capture)
        e.preventDefault();
        e.stopPropagation();
        (e.nativeEvent as any).stopImmediatePropagation?.();
    }, []);

    const handleContextMenuClick = useCallback((e: React.MouseEvent) => {
        // Still handle click for fallback, but don't open (already opened on pointerdown)
        e.preventDefault();
        e.stopPropagation();
        (e.nativeEvent as any).stopImmediatePropagation?.();
    }, []);

    const handleContextMenuMouseDown = useCallback((e: React.MouseEvent) => {
        // Prevent drag initiation
        e.preventDefault();
        e.stopPropagation();
        (e.nativeEvent as any).stopImmediatePropagation?.();
    }, []);

    const handleDuplicate = useCallback(() => {
        const event = new CustomEvent('duplicateNode', { detail: { nodeId } });
        window.dispatchEvent(event);
    }, [nodeId]);

    const handleDelete = useCallback(() => {
        const event = new CustomEvent('deleteNode', { detail: { nodeId } });
        window.dispatchEvent(event);
    }, [nodeId]);

    const handleRename = useCallback(() => {
        const event = new CustomEvent('renameNode', { detail: { nodeId, currentName } });
        window.dispatchEvent(event);
    }, [nodeId, currentName]);

    const handleToggleDisable = useCallback(() => {
        const event = new CustomEvent('toggleNodeDisable', { detail: { nodeId } });
        window.dispatchEvent(event);
    }, [nodeId]);

    return {
        contextMenuOpen,
        contextMenuPosition,
        setContextMenuOpen,
        handleContextMenuClick,
        handleContextMenuMouseDown,
        handleContextMenuPointerDown,
        handleContextMenuPointerDownCapture,
        handleDuplicate,
        handleDelete,
        handleRename,
        handleToggleDisable
    };
}
