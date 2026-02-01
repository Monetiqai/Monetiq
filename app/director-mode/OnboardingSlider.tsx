"use client";

import { useState, useEffect } from "react";
import OnboardingCard from "./onboarding/OnboardingCard";
import { ONBOARDING_STEPS } from "./onboarding/steps";

interface OnboardingSliderProps {
    onComplete: () => void;
}

export default function OnboardingSlider({ onComplete }: OnboardingSliderProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

    const handleNext = () => {
        if (currentStep < ONBOARDING_STEPS.length - 1) {
            setDirection('forward');
            setCurrentStep(currentStep + 1);
        } else {
            // Last step - enter tool
            handleComplete();
        }
    };

    const handleSkip = () => {
        handleComplete();
    };

    const handleComplete = () => {
        // Mark as seen in localStorage
        localStorage.setItem('director-mode-onboarding-seen', 'true');
        onComplete();
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === 'Enter') {
                handleNext();
            } else if (e.key === 'Escape') {
                handleSkip();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentStep]);

    return (
        <div style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "#0b0b0b"
        }}>
            <OnboardingCard
                step={ONBOARDING_STEPS[currentStep]}
                currentIndex={currentStep}
                totalSteps={ONBOARDING_STEPS.length}
                onNext={handleNext}
                onSkip={handleSkip}
                isLast={currentStep === ONBOARDING_STEPS.length - 1}
            />
        </div>
    );
}
