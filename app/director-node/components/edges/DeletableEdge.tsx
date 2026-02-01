'use client';

import { EdgeProps, getBezierPath, BaseEdge } from 'reactflow';

export function DeletableEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style,
    markerEnd,
    data,
}: EdgeProps) {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    return (
        <>
            <BaseEdge path={edgePath} style={style} markerEnd={markerEnd} />
            {/* Delete button at center */}
            <foreignObject
                width={24}
                height={24}
                x={labelX - 12}
                y={labelY - 12}
                requiredExtensions="http://www.w3.org/1999/xhtml"
            >
                <button
                    type="button"
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        data?.onDelete?.(id);
                    }}
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{
                        background: 'rgba(0,0,0,0.6)',
                        border: '1px solid rgba(255,255,255,0.25)',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: 14,
                        lineHeight: '14px',
                    }}
                    aria-label="Delete edge"
                    title="Remove link"
                >
                    ×
                </button>
            </foreignObject>
        </>
    );
}
