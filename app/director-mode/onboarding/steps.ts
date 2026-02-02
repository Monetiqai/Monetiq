import { cdn } from "@/lib/cdn";

export interface OnboardingStep {
    id: number;
    title: string;
    description: string;
    image: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
    {
        id: 1,
        title: "START WITH YOUR IDEA",
        description: "Describe the scene you want to create. Explain what happens, the atmosphere, and the subject. No technical terms required — think visually.",
        image: cdn("/public/onboarding/step-1-vision.jpeg")
    },
    {
        id: 2,
        title: "SET THE VISUAL DIRECTION",
        description: "Upload an image to guide mood, composition, or lighting. This reference helps maintain visual consistency.",
        image: cdn("/public/onboarding/step-2-reference.jpeg")
    },
    {
        id: 3,
        title: "STRUCTURE BEFORE GENERATION",
        description: "Define framing intentions and visual rhythm. This step translates your idea into cinematic structure.",
        image: cdn("/public/onboarding/step-3-storyboard.jpeg")
    },
    {
        id: 4,
        title: "DEFINE THE CREATIVE LANGUAGE",
        description: "Select a film director to set storytelling rhythm, framing, and mood. You're choosing a cinematic grammar — not copying a movie.",
        image: cdn("/public/onboarding/step-4-director.jpeg")
    },
    {
        id: 5,
        title: "DESIGN THE CINEMATIC SETUP",
        description: "Select camera body, lens, and focal length. These choices define depth, perspective, and realism. Guided and curated — no expertise required.",
        image: cdn("/public/onboarding/step-5-rig.jpeg")
    },
    {
        id: 6,
        title: "GENERATE CINEMATIC STILLS",
        description: "Create a batch of high-fidelity static images in 21:9 format. Explore composition and lighting before moving to motion.",
        image: cdn("/public/onboarding/step-6-previews.jpeg")
    },
    {
        id: 7,
        title: "LOCK THE PERFECT SHOT",
        description: "Choose the strongest image from the batch. This frame becomes the visual foundation of your scene.",
        image: cdn("/public/onboarding/step-7-anchor.jpeg")
    },
    {
        id: 8,
        title: "BRING THE IMAGE TO LIFE",
        description: "Transition from still imagery to motion. Animation respects your anchor composition.",
        image: cdn("/public/onboarding/step-8-bridge.jpeg")
    },
    {
        id: 9,
        title: "CHOREOGRAPH THE MOVEMENT",
        description: "Select camera motion and describe the action inside the scene. Define the duration of your shot. You are now directing.",
        image: cdn("/public/onboarding/step-9-camera.jpeg")
    },
    {
        id: 10,
        title: "RENDER THE FILM",
        description: "Generate the final cinematic video. Polished, cohesive, and ready to use.",
        image: cdn("/public/onboarding/step-10-final.jpeg")
    }
];
