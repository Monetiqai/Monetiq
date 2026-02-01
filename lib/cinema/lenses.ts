export interface Lens {
    label: string;
    prompt: string;
}

export const LENSES: Record<string, Lens> = {
    cooke_s4: {
        label: "Cooke S4",
        prompt: "Cooke S4 prime lenses, low micro-contrast with warm color response, soft highlight transitions and gentle edge falloff, creamy circular bokeh with smooth focus roll-off, NO crisp edge acuity, NO high micro-contrast rendering, priority on skin texture and emotional softness over optical sharpness."
    },
    zeiss_ultra: {
        label: "Zeiss Ultra Prime",
        prompt: "Zeiss Ultra Prime lenses, high micro-contrast with precise edge definition, neutral color rendering and geometric accuracy, clean separation and firm focus transitions, NO warm color bias, NO soft highlight bloom, priority on clarity, structure, and optical precision over softness."
    },
    panavision_c: {
        label: "Panavision C-Series",
        prompt: "Panavision C-Series anamorphic lenses, oval bokeh with horizontal stretch, pronounced horizontal flare streaks, edge softness and classic anamorphic distortion, NO spherical bokeh, NO modern clean rendering, priority on vintage anamorphic character over optical correctness."
    },
    hawk_vlite: {
        label: "Hawk V-Lite",
        prompt: "Hawk V-Lite anamorphic lenses, controlled oval bokeh with cleaner geometry, subtle horizontal flares with restrained distortion, balanced anamorphic character without heavy artifacts, NO exaggerated vintage distortion, NO spherical depth rendering, priority on modern anamorphic control over raw vintage character."
    },
    arri_signature: {
        label: "Arri Signature Prime",
        prompt: "ARRI Signature Prime lenses, modern clean optics with natural bokeh, high resolution with smooth edge consistency, minimal aberrations and neutral color response, NO vintage softness, NO optical distortion or flare dominance, priority on realism and optical neutrality over character."
    },
    helios: {
        label: "Helios",
        prompt: "Helios vintage lenses, swirly bokeh with strong background rotation, lower contrast and warm rendering, imperfect edge sharpness and visible aberrations, NO clean modern optics, NO neutral background blur, priority on expressive background motion over optical accuracy."
    },
    petzval: {
        label: "Petzval",
        prompt: "Petzval optics, extreme field curvature with sharp center and dramatic edge falloff, strong swirly bokeh and vintage glow, romantic aberrations and optical imperfection, NO uniform sharpness across frame, NO modern contrast control, priority on center-focus drama and vintage character over realism."
    },
    laowa_macro: {
        label: "Laowa Macro",
        prompt: "Laowa macro lenses, extreme close-focus capability with high texture resolution, tight depth plane and rapid focus falloff, minimal distortion with inspection-level detail, NO dreamy softness, NO artistic bokeh dominance, priority on surface detail and micro-texture over cinematic blur."
    },
    lensbaby: {
        label: "Lensbaby",
        prompt: "Lensbaby optics, selective focus with pronounced blur gradients, intentional optical aberrations and field curvature, dreamlike softness with creative distortion, NO optical correctness, NO clean edge definition, priority on artistic expression over technical accuracy."
    },
    canon_k35: {
        label: "Canon K-35",
        prompt: "Canon K-35 vintage cinema prime lenses, low-to-moderate micro-contrast with warm color bias, soft highlight bloom and gentle halation on bright areas, slightly imperfect edge sharpness with organic falloff, NO modern clinical sharpness, NO neutral or cold color rendering, priority on vintage softness, glow, and nostalgic cinematic character over precision."
    }
};
