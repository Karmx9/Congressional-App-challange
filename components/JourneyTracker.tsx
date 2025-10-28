import React, { useState } from 'react';
import { AnalysisRecord } from '../types';

interface JourneyTrackerProps {
    history: AnalysisRecord[];
    onSelectAnalysis: (record: AnalysisRecord) => void;
    onCompareImages: (records: AnalysisRecord[]) => void;
}

export const JourneyTracker: React.FC<JourneyTrackerProps> = ({ history, onSelectAnalysis, onCompareImages }) => {
    const [selectedRecords, setSelectedRecords] = useState<AnalysisRecord[]>([]);

    const handleToggleSelect = (record: AnalysisRecord) => {
        setSelectedRecords(prev => {
            if (prev.includes(record)) {
                return prev.filter(r => r !== record);
            } else if (prev.length < 2) {
                return [...prev, record];
            }
            return prev; // Max 2 selections
        });
    };

    const handleCompareClick = () => {
        if (selectedRecords.length === 2) {
            onCompareImages(selectedRecords);
            setSelectedRecords([]); // Clear selection after comparison
        }
    };


    if (history.length === 0) {
        return (
            <div className="text-center p-8 bg-white rounded-lg shadow border">
                <i className="fas fa-book-open text-4xl text-gray-300 mb-4"></i>
                <h3 className="text-xl font-semibold text-gray-700">Your Skincare Journey</h3>
                <p className="text-gray-500 mt-2">You haven't analyzed your skin yet. Go to the "Analyze" tab to get your first report!</p>
            </div>
        );
    }
    
    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800 text-center">Your Skincare Journey</h2>
            
            {history.length >= 2 && (
                <div className="text-center">
                    <button
                        onClick={handleCompareClick}
                        disabled={selectedRecords.length !== 2}
                        className="bg-blue-500 text-white font-bold py-2 px-4 rounded-lg shadow hover:bg-blue-600 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        title="Select two analyses to compare"
                    >
                        <i className="fas fa-images mr-2"></i>Compare Selected ({selectedRecords.length}/2)
                    </button>
                </div>
            )}

            <div className="space-y-4">
                {history.slice().reverse().map((record, index) => {
                    const isSelected = selectedRecords.includes(record);
                    return (
                        <div 
                            key={index} 
                            className={`bg-white p-4 rounded-lg shadow border transition ${isSelected ? 'border-teal-500 ring-2 ring-teal-200' : 'border-gray-200'} hover:shadow-md hover:border-teal-400`}
                        >
                            <div className="flex justify-between items-center cursor-pointer" onClick={() => onSelectAnalysis(record)}>
                                <div className="flex items-center space-x-4">
                                    {record.imageB64 && (
                                        <img src={record.imageB64} alt="Skin snapshot" className="w-16 h-16 object-cover rounded-md shadow-sm flex-shrink-0" />
                                    )}
                                    <div>
                                        <p className="font-bold text-teal-600">Analysis from {new Date(record.date).toLocaleDateString()}</p>
                                        <p className="text-sm text-gray-600 line-clamp-2">{record.analysis.summary}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    {history.length >= 2 && (
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => {
                                                e.stopPropagation(); // Prevent card click from firing
                                                handleToggleSelect(record);
                                            }}
                                            disabled={!isSelected && selectedRecords.length >= 2}
                                            className="form-checkbox h-5 w-5 text-teal-600 rounded focus:ring-teal-500"
                                            title="Select for comparison"
                                        />
                                    )}
                                    <i className="fas fa-chevron-right text-gray-400"></i>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};