"use client";

import { useState, useEffect } from "react";
import DirectorMode from "./DirectorMode";
import OnboardingSlider from "./OnboardingSlider";

export default function DirectorModePage() {
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        // Check if user has seen onboarding
        const hasSeenOnboarding = localStorage.getItem('director-mode-onboarding-seen');
        if (!hasSeenOnboarding) {
            setShowOnboarding(true);
        }
    }, []);

    const handleOnboardingComplete = () => {
        setShowOnboarding(false);
    };

    // Prevent hydration mismatch
    if (!isClient) {
        return null;
    }

    return (
        <>
            {showOnboarding ? (
                <OnboardingSlider onComplete={handleOnboardingComplete} />
            ) : (
                <DirectorMode />
            )}
        </>
    );
}
