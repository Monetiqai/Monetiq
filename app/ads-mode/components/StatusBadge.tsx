/**
 * PHASE 12 — STATUS BADGE COMPONENT
 * 
 * Visual indicator for generation status
 */

type Status = 'generating' | 'success' | 'failed' | 'partial';

interface StatusBadgeProps {
    status: Status;
}

export function StatusBadge({ status }: StatusBadgeProps) {
    const config = {
        generating: {
            label: 'Generating',
            className: 'bg-amber-100 text-amber-800 border-amber-300'
        },
        success: {
            label: 'Success',
            className: 'bg-green-100 text-green-800 border-green-300'
        },
        failed: {
            label: 'Failed',
            className: 'bg-red-100 text-red-800 border-red-300'
        },
        partial: {
            label: 'Partial',
            className: 'bg-blue-100 text-blue-800 border-blue-300'
        }
    };

    const { label, className } = config[status];

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`}>
            {label}
        </span>
    );
}
