import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';

interface ProfileSettingsProps {
    userProfile: UserProfile | null;
    setUserProfile: (profile: UserProfile) => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ userProfile, setUserProfile }) => {
    const [skinType, setSkinType] = useState(userProfile?.skinType || '');
    const [allergies, setAllergies] = useState(userProfile?.allergies.join(', ') || '');
    const [goals, setGoals] = useState(userProfile?.goals || '');
    const [savedMessage, setSavedMessage] = useState<string | null>(null);

    useEffect(() => {
        // Clear message after a few seconds
        if (savedMessage) {
            const timer = setTimeout(() => setSavedMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [savedMessage]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const updatedProfile: UserProfile = {
            skinType,
            allergies: allergies.split(',').map(a => a.trim()).filter(Boolean),
            goals,
        };
        setUserProfile(updatedProfile);
        setSavedMessage("Profile saved successfully!");
    };

    return (
        <div className="w-full max-w-2xl mx-auto bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-gray-200 text-center">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Your Skincare Profile</h2>
            <p className="text-gray-600 mb-6">Tell us about your skin to get more personalized advice from DermaGenius AI.</p>

            <form onSubmit={handleSave} className="space-y-6 text-left">
                <div>
                    <label htmlFor="skinType" className="block text-sm font-medium text-gray-700">Skin Type</label>
                    <select
                        id="skinType"
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md"
                        value={skinType}
                        onChange={(e) => setSkinType(e.target.value)}
                    >
                        <option value="">Select your skin type</option>
                        <option value="Normal">Normal</option>
                        <option value="Oily">Oily</option>
                        <option value="Dry">Dry</option>
                        <option value="Combination">Combination</option>
                        <option value="Sensitive">Sensitive</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="allergies" className="block text-sm font-medium text-gray-700">Known Allergies (comma-separated)</label>
                    <input
                        type="text"
                        id="allergies"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                        value={allergies}
                        onChange={(e) => setAllergies(e.target.value)}
                        placeholder="e.g., Retinoids, Fragrance, Nuts"
                    />
                </div>

                <div>
                    <label htmlFor="goals" className="block text-sm font-medium text-gray-700">Skincare Goals</label>
                    <textarea
                        id="goals"
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                        value={goals}
                        onChange={(e) => setGoals(e.target.value)}
                        placeholder="e.g., Reduce acne, anti-aging, improve hydration"
                    ></textarea>
                </div>

                <button
                    type="submit"
                    className="mt-6 w-full bg-teal-500 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-transform duration-200 transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
                >
                    Save Profile
                </button>
                {savedMessage && (
                    <p className="mt-4 text-center text-green-600 text-sm">{savedMessage}</p>
                )}
            </form>
            <p className="text-xs text-gray-400 mt-4">
                <i className="fas fa-info-circle mr-1"></i> Your profile is stored locally on your device and helps DermaGenius AI tailor its advice.
            </p>
        </div>
    );
};