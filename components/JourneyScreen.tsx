
import React, { useState } from 'react';
import { JourneyTracker } from './JourneyTracker';
import { AnalysisRecord } from '../types';

interface JourneyScreenProps {
    analysisHistory: AnalysisRecord[];
    onSelectAnalysis: (record: AnalysisRecord) => void;
    onCompareImages: (records: AnalysisRecord[]) => void;
}

const JourneyScreen: React.FC<JourneyScreenProps> = ({ analysisHistory, onSelectAnalysis, onCompareImages }) => {
    
    if (analysisHistory.length === 0) {
        return (
            <div className="text-center p-8 bg-white rounded-lg shadow border">
                <i className="fas fa-book-open text-4xl text-gray-300 mb-4"></i>
                <h3 className="text-xl font-semibold text-gray-700">Your Skincare Journey</h3>
                <p className="text-gray-500 mt-2">You haven't analyzed your skin yet. Go to the "Analyze" tab to get your first report!</p>
            </div>
        );
    }
    
    return (
        <JourneyTracker
            history={analysisHistory}
            onSelectAnalysis={onSelectAnalysis}
            onCompareImages={onCompareImages}
        />
    );
};

export default JourneyScreen;
