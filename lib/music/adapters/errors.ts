/**
 * PHASE 3.2 - Provider Error Types
 * 
 * Typed errors for provider adapters with retry logic
 */

export class ProviderError extends Error {
    constructor(
        message: string,
        public code: string,
        public provider: string,
        public retryable: boolean = false,
        public originalError?: any
    ) {
        super(message);
        this.name = 'ProviderError';
    }
}

// Error codes taxonomy
export const ErrorCodes = {
    // Network errors (retryable)
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT: 'TIMEOUT',

    // Rate limiting (retryable with backoff)
    RATE_LIMIT: 'RATE_LIMIT',

    // Validation errors (not retryable)
    INVALID_INPUT: 'INVALID_INPUT',
    INVALID_VOICE_ID: 'INVALID_VOICE_ID',
    TEXT_TOO_LONG: 'TEXT_TOO_LONG',

    // Auth errors (not retryable)
    AUTH_ERROR: 'AUTH_ERROR',
    QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',

    // Provider errors (not retryable)
    PROVIDER_ERROR: 'PROVIDER_ERROR',
    GENERATION_FAILED: 'GENERATION_FAILED'
} as const;

export function isRetryable(error: ProviderError): boolean {
    return error.retryable || [
        ErrorCodes.NETWORK_ERROR,
        ErrorCodes.TIMEOUT,
        ErrorCodes.RATE_LIMIT
    ].includes(error.code as any);
}
