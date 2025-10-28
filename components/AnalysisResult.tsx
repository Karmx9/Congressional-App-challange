import React, { useState } from 'react';
import type { SkincareAnalysis, SkinConcern, RoutinePreferences, MedicalQuestionnaireData, ShoppingProduct, Product } from '../types';
import { ProductListing } from './ProductListing';
import { DermatologistFinder } from './DermatologistFinder';

const ConcernCard: React.FC<{ concern: SkinConcern }> = ({ concern }) => {
    const severityColor = {
        'Mild': 'bg-green-100 text-green-800 border-green-200',
        'Moderate': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'Severe': 'bg-red-100 text-red-800 border-red-200',
    }[concern.severity];

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-start">
                <h4 className="font-bold text-text-primary">{concern.concern}</h4>
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${severityColor} border`}>
                    {concern.severity}
                </span>
            </div>
            <p className="text-text-secondary text-sm mt-1">{concern.description}</p>
        </div>
    );
};

interface AnalysisResultProps {
    analysis: SkincareAnalysis;
    onReset: () => void;
    onGenerateRoutine: (preferences: RoutinePreferences) => void;
    onAddToCart: (product: ShoppingProduct) => void;
    shoppingProductOptions: Record<string, ShoppingProduct[] | 'loading' | 'error'>;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ analysis, onReset, onGenerateRoutine, onAddToCart, shoppingProductOptions }) => {
    const [routinePreferences, setRoutinePreferences] = useState<RoutinePreferences>({
        intensity: 'standard',
        timeCommitment: 'detailed',
    });

    const handleGenerateClick = () => {
        onGenerateRoutine(routinePreferences);
    };

    const medicalData = (analysis as any).medicalData as MedicalQuestionnaireData | undefined;


    return (
        <div className="w-full max-w-4xl mx-auto space-y-8">
            <div className="card">
                {analysis.confidenceScore !== undefined && ( 
                    <div className="mb-4 flex justify-between items-center bg-teal-50 p-3 rounded-lg border border-teal-200">
                        <h4 className="text-lg font-semibold text-teal-800">Advanced Diagnosis</h4>
                        <div className="text-right">
                            <span className="font-bold text-xl text-teal-600">{(analysis.confidenceScore * 100).toFixed(1)}%</span>
                            <p className="text-xs text-teal-700">Confidence Score</p>
                        </div>
                    </div>
                )}

                <h3 className="text-2xl font-bold text-gray-800 mb-2">Your AI Skin Summary</h3>
                <p className="text-text-secondary">{analysis.summary}</p>
                <p className="text-xs text-text-light mt-4 italic">
                    Disclaimer: This is an AI-generated analysis and not a medical diagnosis. It incorporates user-provided medical context (if any). Always consult a dermatologist for professional medical advice.
                </p>
                
                {medicalData && Object.values(medicalData).some(val => val) && (
                    <div className="mt-6 border-t pt-4">
                        <h4 className="text-lg font-semibold text-gray-800 mb-2">Medical Context Provided:</h4>
                        <ul className="text-text-secondary text-sm list-disc list-inside space-y-1">
                            {medicalData.medicalHistory && <li><strong>History:</strong> {medicalData.medicalHistory}</li>}
                            {medicalData.currentMedications && <li><strong>Current Meds:</strong> {medicalData.currentMedications}</li>}
                            {medicalData.concomitantMedications && <li><strong>Concomitant Meds:</strong> {medicalData.concomitantMedications}</li>}
                            {medicalData.signsSymptoms && <li><strong>Symptoms:</strong> {medicalData.signsSymptoms}</li>}
                            {medicalData.labWork && <li><strong>Lab Work:</strong> {medicalData.labWork}</li>}
                            {medicalData.recentVaccinations && <li><strong>Vaccinations:</strong> {medicalData.recentVaccinations}</li>}
                        </ul>
                    </div>
                )}
                
                {analysis.differentialDiagnosis && analysis.differentialDiagnosis.length > 0 && (
                    <div className="mt-6 border-t pt-4">
                        <h4 className="text-lg font-semibold text-gray-800 mb-2">Differential Diagnosis</h4>
                        <p className="text-sm text-text-light mb-3 -mt-1">Other conditions the AI considered as possibilities.</p>
                        <div className="space-y-3">
                            {analysis.differentialDiagnosis.map((diag, index) => (
                                <div key={index} className="bg-slate-50 p-3 rounded-md border">
                                    <div className="flex justify-between items-center">
                                        <h5 className="font-semibold text-gray-700">{diag.condition}</h5>
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${diag.confidence === 'High' ? 'bg-orange-100 text-orange-800' : diag.confidence === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-200 text-gray-700'}`}>
                                            {diag.confidence}
                                        </span>
                                    </div>
                                    <p className="text-sm text-text-secondary mt-1">{diag.reasoning}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {analysis.potentialCauses && (
                    <div className="mt-6 border-t pt-4">
                        <h4 className="text-lg font-semibold text-gray-800 mb-2">Potential Causes:</h4>
                        <p className="text-text-secondary">{analysis.potentialCauses}</p>
                    </div>
                )}

                {analysis.recommendedTests && (
                    <div className="mt-6 border-t pt-4">
                        <h4 className="text-lg font-semibold text-gray-800 mb-2">Recommended Tests</h4>
                        <p className="text-text-secondary">{analysis.recommendedTests}</p>
                    </div>
                )}

                {analysis.importantConsiderations && (
                    <div className="mt-6 border-t pt-4">
                        <h4 className="text-lg font-semibold text-gray-800 mb-2">Important Considerations:</h4>
                        <p className="text-text-secondary">{analysis.importantConsiderations}</p>
                    </div>
                )}

                <div className="mt-6 border-t pt-4">
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">Routine Preferences</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label htmlFor="intensity" className="block text-sm font-medium text-text-secondary">Intensity:</label>
                            <select
                                id="intensity"
                                className="form-select mt-1"
                                value={routinePreferences.intensity}
                                onChange={(e) => setRoutinePreferences({ ...routinePreferences, intensity: e.target.value as 'gentle' | 'standard' | 'intensive' })}
                            >
                                <option value="gentle">Gentle</option>
                                <option value="standard">Standard</option>
                                <option value="intensive">Intensive</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="timeCommitment" className="block text-sm font-medium text-text-secondary">Time Commitment:</label>
                            <select
                                id="timeCommitment"
                                className="form-select mt-1"
                                value={routinePreferences.timeCommitment}
                                onChange={(e) => setRoutinePreferences({ ...routinePreferences, timeCommitment: e.target.value as 'quick' | 'detailed' })}
                            >
                                <option value="quick">Quick (Minimal Steps)</option>
                                <option value="detailed">Detailed (Comprehensive)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                     <button
                        onClick={handleGenerateClick}
                        className="w-full btn btn-primary"
                    >
                        <i className="fas fa-magic mr-2"></i>Generate My Routine
                    </button>
                    <button
                        onClick={onReset}
                        className="w-full btn btn-secondary"
                    >
                        <i className="fas fa-undo mr-2"></i>Start New Analysis
                    </button>
                </div>
            </div>

            <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Identified Concerns</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysis.concerns.map((c, i) => <ConcernCard key={i} concern={c} />)}
                </div>
            </div>

            <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Product Recommendations</h3>
                <p className="text-sm text-text-light mb-4 -mt-2">AI has found a few diverse options for each recommended product type. Add your favorite to the cart!</p>
                <div className="space-y-8">
                     {analysis.recommendations.map((rec: Product, i) => {
                        const recKey = `${rec.name}-${rec.brand}`;
                        const options = shoppingProductOptions[recKey];

                        return (
                            <div key={i} className="bg-slate-50 p-4 rounded-xl border">
                                <div className="mb-4">
                                     <h4 className="font-bold text-lg text-gray-800">{rec.name} <span className="font-normal text-text-secondary">by {rec.brand}</span></h4>
                                     <p className="text-text-secondary text-sm mt-1"><strong><i className="fas fa-comment-medical mr-2 text-teal-500"></i>AI's Reason:</strong> {rec.reason}</p>
                                </div>

                                <div className="space-y-4">
                                    {options === 'loading' && (
                                        <div className="flex items-center justify-center p-4">
                                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-500"></div>
                                            <p className="ml-3 text-text-secondary">Finding best options...</p>
                                        </div>
                                    )}
                                    {options === 'error' && (
                                        <div className="text-center p-4 bg-red-50 border border-red-200 rounded-lg">
                                            <p className="text-red-600 font-semibold">Could not find product options for this recommendation.</p>
                                        </div>
                                    )}
                                    {Array.isArray(options) && options.length > 0 && options.map((p, j) => (
                                        <ProductListing key={j} product={p} onAddToCart={onAddToCart} />
                                    ))}
                                     {Array.isArray(options) && options.length === 0 && (
                                        <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                            <p className="text-yellow-700">No specific products found for this recommendation.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <DermatologistFinder concerns={analysis.concerns} />
        </div>
    );
};
