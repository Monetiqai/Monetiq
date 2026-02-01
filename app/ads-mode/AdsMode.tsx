"use client";

import { useState, useEffect } from "react";
import { AdTemplate, Platform, ProductCategory } from "@/lib/types/ads-mode";
import Step1ProductSetup from "./Step1ProductSetup";
import Step2TemplateSelection from "./Step2TemplateSelection";
import Step3VariantConfig from "./Step3VariantConfig";
import Step4Generation from "./Step4Generation";
import Step5WinnerFinal from "./Step5WinnerFinal";
import AdsOnboarding from "./AdsOnboarding";
import Step1Tooltip from "./Step1Tooltip";

export default function AdsMode() {
    // Onboarding state
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showStep1Tooltip, setShowStep1Tooltip] = useState(false);

    // Check onboarding status on mount
    useEffect(() => {
        const completed = localStorage.getItem("ads_onboarding_completed");
        if (!completed) {
            setShowOnboarding(true);
        }
    }, []);

    const handleOnboardingComplete = () => {
        setShowOnboarding(false);
        localStorage.setItem("ads_onboarding_completed", "true");
        // Show tooltip after onboarding
        setShowStep1Tooltip(true);
    };

    // Current step (1-5)
    const [currentStep, setCurrentStep] = useState(1);

    // Step 1: Product Setup
    const [productName, setProductName] = useState("");
    const [productCategory, setProductCategory] = useState<ProductCategory>("electronics");
    const [productImageAssetIds, setProductImageAssetIds] = useState<string[]>([]); // Changed to array

    // Step 2: Template Selection
    const [selectedTemplate, setSelectedTemplate] = useState<AdTemplate>("scroll_stop");
    const [selectedPlatform, setSelectedPlatform] = useState<Platform>("instagram");

    // Step 3: Variant Config
    const [variantCount, setVariantCount] = useState<2 | 3 | 4>(3);

    // Step 4: Generation
    const [adPackId, setAdPackId] = useState<string | undefined>(undefined);
    const [generating, setGenerating] = useState(false);

    // Rehydrate from localStorage on mount
    useEffect(() => {
        const draft = localStorage.getItem("ads_mode_draft");
        console.log('[AdsMode] Rehydrating from localStorage:', draft);

        if (draft) {
            try {
                const parsed = JSON.parse(draft);
                console.log('[AdsMode] Parsed draft:', parsed);

                if (parsed.productName) setProductName(parsed.productName);
                if (parsed.productCategory) setProductCategory(parsed.productCategory);
                if (parsed.productImageAssetIds) {
                    console.log('[AdsMode] Restoring asset IDs:', parsed.productImageAssetIds);
                    setProductImageAssetIds(parsed.productImageAssetIds);
                }
                if (parsed.selectedTemplate) setSelectedTemplate(parsed.selectedTemplate);
                if (parsed.selectedPlatform) setSelectedPlatform(parsed.selectedPlatform);
                if (parsed.variantCount) setVariantCount(parsed.variantCount);
            } catch (error) {
                console.error('[AdsMode] Failed to parse draft:', error);
            }
        } else {
            console.log('[AdsMode] No draft found in localStorage');
        }
    }, []);

    // Persist to localStorage on change
    useEffect(() => {
        // Don't persist on initial mount (wait for rehydration first)
        const draft = {
            productName,
            productCategory,
            productImageAssetIds,
            selectedTemplate,
            selectedPlatform,
            variantCount
        };
        console.log('[AdsMode] Persisting to localStorage:', draft);
        localStorage.setItem("ads_mode_draft", JSON.stringify(draft));
    }, [productName, productCategory, productImageAssetIds, selectedTemplate, selectedPlatform, variantCount]);

    // Step 5: Winner/Final
    const [winnerVariantId, setWinnerVariantId] = useState<string | undefined>(undefined);

    const handleNext = () => {
        if (currentStep < 5) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    return (
        <>
            {/* Onboarding Flow */}
            {showOnboarding && (
                <AdsOnboarding onComplete={handleOnboardingComplete} />
            )}

            {/* Step 1 Tooltip */}
            {showStep1Tooltip && currentStep === 1 && (
                <Step1Tooltip
                    show={showStep1Tooltip}
                    onDismiss={() => setShowStep1Tooltip(false)}
                />
            )}

            <div
                data-ads-mode
                style={{
                    background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)",
                    padding: "40px 20px",
                    minHeight: "calc(100vh - 80px)" // Subtract padding to fit exactly
                }}
            >
                {/* Header */}
                <div style={{
                    maxWidth: "1200px",
                    margin: "0 auto 40px",
                    textAlign: "center"
                }}>
                    <h1 style={{
                        fontSize: "48px",
                        fontWeight: 950,
                        background: "linear-gradient(135deg, #38BDF8 0%, #0EA5E9 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        marginBottom: "16px"
                    }}>
                        Ads Mode
                    </h1>
                    <p style={{
                        fontSize: "18px",
                        opacity: 0.7,
                        maxWidth: "600px",
                        margin: "0 auto"
                    }}>
                        Create high-performance e-commerce ads with automated A/B testing
                    </p>
                </div>

                {/* Progress Indicator */}
                <div style={{
                    maxWidth: "1200px",
                    margin: "0 auto 40px",
                    display: "flex",
                    justifyContent: "center",
                    gap: "12px"
                }}>
                    {[1, 2, 3, 4, 5].map((step) => (
                        <div
                            key={step}
                            style={{
                                width: "60px",
                                height: "4px",
                                borderRadius: "2px",
                                background: step <= currentStep
                                    ? "linear-gradient(135deg, #38BDF8 0%, #0EA5E9 100%)"
                                    : "rgba(255, 255, 255, 0.1)",
                                transition: "all 0.3s"
                            }}
                        />
                    ))}
                </div>

                {/* Step Content */}
                {currentStep === 1 && (
                    <Step1ProductSetup
                        productName={productName}
                        setProductName={setProductName}
                        productCategory={productCategory}
                        setProductCategory={setProductCategory}
                        productImageAssetIds={productImageAssetIds}
                        setProductImageAssetIds={setProductImageAssetIds}
                        onNext={handleNext}
                    />
                )}

                {currentStep === 2 && (
                    <Step2TemplateSelection
                        selectedTemplate={selectedTemplate}
                        setSelectedTemplate={setSelectedTemplate}
                        selectedPlatform={selectedPlatform}
                        setSelectedPlatform={setSelectedPlatform}
                        onNext={handleNext}
                        onBack={handleBack}
                    />
                )}

                {currentStep === 3 && (
                    <Step3VariantConfig
                        variantCount={variantCount}
                        setVariantCount={setVariantCount}
                        onNext={handleNext}
                        onBack={handleBack}
                    />
                )}

                {currentStep === 4 && (
                    <Step4Generation
                        productName={productName}
                        productCategory={productCategory}
                        productImageAssetIds={productImageAssetIds}
                        selectedTemplate={selectedTemplate}
                        selectedPlatform={selectedPlatform}
                        variantCount={variantCount}
                        adPackId={adPackId}
                        setAdPackId={setAdPackId}
                        generating={generating}
                        setGenerating={setGenerating}
                        onNext={handleNext}
                        onBack={handleBack}
                    />
                )}

                {currentStep === 5 && (
                    <Step5WinnerFinal
                        adPackId={adPackId!}
                        winnerVariantId={winnerVariantId}
                        setWinnerVariantId={setWinnerVariantId}
                        onBack={handleBack}
                    />
                )}
            </div>
        </>
    );
}
