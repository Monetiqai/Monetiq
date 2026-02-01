// Shared utilities for preset-based tools

export function buildPrompt(parts: (string | undefined)[], negative?: string): string {
    const validParts = parts.filter((p): p is string => Boolean(p));
    const prompt = validParts.join(" ");

    if (negative) {
        return `${prompt}\n\n${negative}`;
    }

    return prompt;
}

export function validateSettings(
    settings: Record<string, string | number>,
    required: string[]
): boolean {
    return required.every(key => settings[key] !== undefined && settings[key] !== "");
}

export function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/['\"]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}
