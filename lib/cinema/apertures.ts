export interface Aperture {
    label: string;
    prompt: string;
}

export const APERTURES: Record<string, Aperture> = {
    f1_4: {
        label: "f/1.4 (Artistic)",
        prompt: "Aperture f/1.4, extremely shallow depth of field with rapid focus falloff, soft focus transitions with pronounced background separation, highlight bloom and potential glow on specular highlights, NO deep scene readability, NO flat focus planes, priority on subject isolation, glow, and expressive depth over clarity."
    },
    f4: {
        label: "f/4 (Balanced)",
        prompt: "Aperture f/4, controlled depth of field with readable environment, smooth and natural focus transitions, clean highlights without excessive bloom, NO extreme blur dominance, NO clinical full-depth sharpness, priority on cinematic balance between subject separation and scene clarity."
    },
    f11: {
        label: "f/11 (Clinical)",
        prompt: "Aperture f/11, deep depth of field with extended scene sharpness, minimal background blur and strong overall readability, high highlight control with minimal bloom, NO shallow depth isolation, NO artistic focus falloff, priority on detail retention and scene clarity over cinematic separation."
    }
};
