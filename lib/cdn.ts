/**
 * CDN Helper for Static Media Assets
 * 
 * Centralizes CDN URL generation for all static media (videos, images, etc.)
 * Falls back to local paths in development when CDN is not configured.
 */

export const CDN_BASE =
    process.env.NEXT_PUBLIC_CDN_BASE_URL ||
    process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ||
    "";

/**
 * Generate CDN URL for static media assets
 * 
 * @param path - Path to asset, should start with /public/
 * @returns Full CDN URL or local path as fallback
 * 
 * @example
 * cdn("/public/hero/node-mode-hero.mp4")
 * // Production: "https://cdn.monetiq.ai/public/hero/node-mode-hero.mp4"
 * // Dev: "/public/hero/node-mode-hero.mp4"
 */
export function cdn(path: string): string {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;

    // In dev, Next serves /public/* as /*
    if (!CDN_BASE) {
        return cleanPath.replace(/^\/public\//, "/");
    }

    const cleanBase = CDN_BASE.replace(/\/$/, "");
    return `${cleanBase}${cleanPath}`;
}

