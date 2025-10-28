
import React, { useState } from 'react';
import { findDermatologists } from '../services/geminiService';
import type { Dermatologist, SkinConcern } from '../types';

interface DermatologistFinderProps {
    concerns: SkinConcern[];
}

export const DermatologistFinder: React.FC<DermatologistFinderProps> = ({ concerns }) => {
    const [zipCode, setZipCode] = useState('');
    const [dermatologists, setDermatologists] = useState<Dermatologist[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!zipCode.trim() || !/^\d{5}(-\d{4})?$/.test(zipCode.trim())) {
            setError('Please enter a valid 5-digit US zip code.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setDermatologists([]);
        setSearched(true);

        try {
            const results = await findDermatologists(concerns, zipCode.trim());
            setDermatologists(results);
        } catch (err: any) {
            setError(`Failed to find dermatologists: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mt-8 border-t pt-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Find a Local Dermatologist</h3>
            <p className="text-sm text-gray-500 mb-4">
                Based on your analysis for concerns like "{concerns.map(c => c.concern).join(', ')}", find a specialist near you.
            </p>
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
                <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="Enter your 5-digit zip code"
                    className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    pattern="\d{5}"
                    title="Please enter a 5-digit zip code"
                    required
                />
                <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-teal-500 text-white font-bold py-2 px-4 rounded-lg shadow hover:bg-teal-600 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-wait"
                >
                    {isLoading ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white inline-block mr-2"></div>
                            Searching...
                        </>
                    ) : (
                        <><i className="fas fa-search-location mr-2"></i>Find Specialists</>
                    )}
                </button>
            </form>

            {error && <p className="mt-4 text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}
            
            <div className="mt-6 space-y-3">
                {isLoading && (
                     <div className="text-center p-4">
                        <p className="text-gray-600">Searching for specialists with Google Maps...</p>
                    </div>
                )}
                {!isLoading && searched && dermatologists.length === 0 && (
                    <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-700">No dermatologists found for your criteria. Please try another zip code.</p>
                    </div>
                )}
                {dermatologists.map((derm, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg shadow border border-gray-200 flex items-center justify-between gap-4">
                        <div className="flex-grow">
                            <h4 className="font-bold text-gray-800">{derm.name}</h4>
                            <p className="text-sm text-gray-600">{derm.address}</p>
                        </div>
                        <a 
                            href={derm.mapsUri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex-shrink-0 bg-blue-500 text-white font-bold py-2 px-3 rounded-lg shadow-md hover:bg-blue-600 transition-colors text-sm"
                        >
                           <i className="fas fa-map-marker-alt mr-2"></i>View on Map
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
};
