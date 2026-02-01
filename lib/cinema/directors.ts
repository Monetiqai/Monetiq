export interface Director {
    name: string;
    tagline: string;
    photo: string;
    prompt: string;
}

export const DIRECTORS: Record<string, Director> = {
    tarantino: {
        name: "Quentin Tarantino",
        tagline: "Narrative tension & realism",
        photo: "/directors/tarantino.jpg",
        prompt: "Cinematic composition with strong narrative tension, realistic lighting with high contrast, dynamic camera movements, bold color grading with saturated primaries, sharp focus on characters and dialogue-driven scenes, vintage film aesthetic with grain texture, Tarantino-style visual storytelling."
    },
    spielberg: {
        name: "Steven Spielberg",
        tagline: "Epic storytelling & wonder",
        photo: "/directors/spielberg.jpg",
        prompt: "Epic cinematic framing with emotional depth, warm natural lighting, smooth tracking shots and crane movements, balanced color palette with golden hour tones, focus on human emotion and grand scale, classic Hollywood aesthetic, Spielberg-style wonder and adventure."
    },
    besson: {
        name: "Luc Besson",
        tagline: "Stylized action & color",
        photo: "/directors/besson.jpg",
        prompt: "Stylized action cinematography, vibrant saturated colors, dynamic camera work with fluid movements, European cinema aesthetic, bold visual contrasts, kinetic energy, Luc Besson-style visual flair and intensity."
    },
    nolan: {
        name: "Christopher Nolan",
        tagline: "Precision & complexity",
        photo: "/directors/nolan.jpg",
        prompt: "Precise geometric composition, natural practical lighting with deep shadows, IMAX-quality clarity, desaturated color grading with cool tones, complex layered storytelling, architectural framing, minimal CGI aesthetic, Nolan-style intellectual precision."
    },
    kubrick: {
        name: "Stanley Kubrick",
        tagline: "Symmetry & perfection",
        photo: "/directors/kubrick.jpg",
        prompt: "Perfect symmetrical composition, meticulous framing, controlled lighting with dramatic shadows, wide-angle perspective, slow deliberate camera movements, clinical color palette, Kubrick-style visual perfection and psychological depth."
    },
    anderson: {
        name: "Wes Anderson",
        tagline: "Whimsy & symmetry",
        photo: "/directors/anderson.jpg",
        prompt: "Perfectly centered symmetrical composition, pastel color palette, flat frontal framing, whimsical production design, precise camera movements, nostalgic aesthetic, Wes Anderson-style quirky visual storytelling and meticulous detail."
    },
    cameron: {
        name: "James Cameron",
        tagline: "Technical mastery & scale",
        photo: "/directors/cameron.jpg",
        prompt: "Epic scale cinematography, cutting-edge technical execution, immersive camera work, balanced natural lighting, rich color depth, seamless visual effects integration, Cameron-style blockbuster visual spectacle and innovation."
    },
    burton: {
        name: "Tim Burton",
        tagline: "Gothic fantasy & darkness",
        photo: "/directors/burton.jpg",
        prompt: "Gothic expressionist composition, high contrast lighting with deep blacks, twisted perspective, dark fantasy color palette with muted tones, exaggerated production design, Burton-style macabre whimsy and visual imagination."
    },
    scorsese: {
        name: "Martin Scorsese",
        tagline: "Gritty realism & energy",
        photo: "/directors/scorsese.jpg",
        prompt: "Gritty realistic cinematography, dynamic handheld camera work, natural lighting with warm tones, energetic tracking shots, authentic New York aesthetic, character-driven framing, Scorsese-style raw emotional intensity and visual rhythm."
    }
};
