export interface FocalLength {
    label: string;
    prompt: string;
}

export const FOCAL_LENGTHS: Record<string, FocalLength> = {
    '8mm': {
        label: "8mm (Ultra Wide)",
        prompt: "8mm ultra-wide focal length, extreme perspective expansion with exaggerated foreground scale, strong spatial distortion and dynamic depth exaggeration, background pushed far away with dramatic environment dominance, NO natural facial proportions, NO subtle perspective rendering, priority on immersive spatial impact over realism or intimacy."
    },
    '14mm': {
        label: "14mm (Wide)",
        prompt: "14mm wide-angle focal length, expanded spatial depth with controlled perspective stretch, foreground emphasis with energetic environment presence, clear subject-to-background distance without extreme distortion, NO telephoto compression, NO intimate portrait geometry, priority on environmental storytelling over subject isolation."
    },
    '35mm': {
        label: "35mm (Balanced)",
        prompt: "35mm focal length, balanced spatial geometry with natural perspective, realistic subject-to-background relationship, moderate depth separation without visual distortion, NO exaggerated compression, NO wide-angle spatial stretch, priority on narrative realism and versatility over stylization."
    },
    '50mm': {
        label: "50mm (Intimate)",
        prompt: "50mm focal length, mild background compression with tighter spatial relationships, natural portrait proportions and calmer geometry, subject emphasis with reduced environmental dominance, NO wide-angle expansion, NO strong telephoto flattening, priority on intimacy and subject presence over spatial drama."
    }
};
