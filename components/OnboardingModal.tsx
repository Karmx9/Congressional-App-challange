import React, { useState } from 'react';

interface OnboardingModalProps {
    isOpen: boolean;
    onFinish: () => void;
}

const onboardingSteps = [
    {
        icon: 'fa-hand-sparkles',
        title: 'Welcome to DermaGenius AI!',
        content: 'Your personal AI skincare advisor. Let\'s take a quick tour of the key features to get you started on your journey to healthier skin.'
    },
    {
        icon: 'fa-camera-retro',
        title: '1. Snap & Analyze',
        content: 'Upload a clear photo of your skin on the \'Analyze\' tab. Our AI provides a detailed analysis of your skin concerns, from acne to hyperpigmentation.'
    },
    {
        icon: 'fa-shopping-basket',
        title: '2. Get Smart Recommendations',
        content: 'Based on your analysis, you\'ll receive personalized product recommendations. We even find shopping options for you and add the best one to your cart automatically!'
    },
    {
        icon: 'fa-comments',
        title: '3. Chat & Explore',
        content: 'Have questions? Head to the \'Chat\' tab to talk with our AI. Ask for a detailed routine, get info on ingredients, or find local dermatologists.'
    },
    {
        icon: 'fa-rocket',
        title: 'You\'re All Set!',
        content: 'Ready to start your journey? Click the button below to begin your first skin analysis.'
    }
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onFinish }) => {
    const [currentStep, setCurrentStep] = useState(0);

    if (!isOpen) return null;

    const step = onboardingSteps[currentStep];
    const isLastStep = currentStep === onboardingSteps.length - 1;

    const goToNext = () => {
        if (!isLastStep) {
            setCurrentStep(s => s + 1);
        } else {
            onFinish();
        }
    };

    const goToPrev = () => {
        if (currentStep > 0) {
            setCurrentStep(s => s - 1);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 fade-in">
            <div className="card w-full max-w-md flex flex-col text-center p-6 md:p-8">
                <div className="mb-6">
                    <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full" style={{ background: 'linear-gradient(to right, var(--brand-primary-light), var(--brand-primary))' }}>
                        <i className={`fas ${step.icon} text-white text-3xl`}></i>
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-text-primary mb-3">{step.title}</h2>
                <p className="text-text-secondary mb-8">{step.content}</p>

                <div className="flex justify-center items-center mb-6 space-x-2">
                    {onboardingSteps.map((_, index) => (
                        <div key={index} className={`w-2 h-2 rounded-full transition-all duration-300 ${currentStep === index ? 'bg-brand-primary w-4' : 'bg-border-color'}`}></div>
                    ))}
                </div>

                <div className="flex gap-4">
                    {currentStep > 0 && (
                        <button onClick={goToPrev} className="btn btn-secondary flex-1">
                            Previous
                        </button>
                    )}
                    <button onClick={goToNext} className="btn btn-primary flex-grow" style={{flexBasis: currentStep === 0 ? '100%' : 'auto'}}>
                        {isLastStep ? 'Get Started!' : 'Next'}
                    </button>
                </div>
            </div>
        </div>
    );
};