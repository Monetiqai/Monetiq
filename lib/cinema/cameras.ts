export interface Camera {
    label: string;
    prompt: string;
}

export const CAMERAS: Record<string, Camera> = {
    red_vraptor: {
        label: "Red V-Raptor",
        prompt: "RED V-Raptor large-format digital sensor, very high micro-contrast and crisp edge definition, punchy midtones with modern digital color separation, clean sensor texture with minimal organic noise, NO filmic halation, NO soft highlight bloom, priority on sharp, modern, high-impact digital clarity over organic softness."
    },
    sony_venice: {
        label: "Sony Venice",
        prompt: "Sony VENICE full-frame digital sensor, moderate micro-contrast with smooth tonal transitions, neutral-to-warm cinematic color science, refined shadow detail with controlled chroma noise, NO aggressive edge sharpening, NO punchy digital contrast spikes, priority on smooth tonal continuity and natural color over perceived sharpness."
    },
    imax: {
        label: "IMAX Film Camera",
        prompt: "IMAX 70mm film capture, extremely high texture density with organic film grain, deep contrast with natural highlight halation, analog color depth with physical film response, NO digital cleanliness, NO sterile shadow rendering, priority on epic scale, analog texture, and physical realism over digital precision."
    },
    arri_alexa: {
        label: "Arri Alexa",
        prompt: "ARRI ALEXA digital sensor, low micro-contrast with extremely soft highlight roll-off, natural skin-tone priority with rich midtones, subtle organic sensor texture without digital harshness, NO high micro-contrast rendering, NO modern digital edge sharpness, priority on highlight roll-off and skin realism over detail acuity."
    },
    arriflex_16sr: {
        label: "Arriflex 16SR",
        prompt: "Arriflex 16SR 16mm film capture, pronounced organic grain with lower resolving power, punchy contrast and imperfect texture, visible analog artifacts and edge softness, NO clean digital surfaces, NO modern sharpness or noise reduction, priority on raw analog texture and documentary realism over image purity."
    },
    panavision_dxl2: {
        label: "Panavision Millennium DXL2",
        prompt: "Panavision DXL2 large-format digital sensor, balanced micro-contrast with premium tonal depth, rich color separation with cinematic saturation control, clean but high-end cinema texture, NO documentary flatness, NO aggressive digital sharpness, priority on polished Hollywood cinematic balance over raw realism."
    }
};
