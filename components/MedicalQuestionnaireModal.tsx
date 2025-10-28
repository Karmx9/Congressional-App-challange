
import React, { useEffect, useRef, useState } from 'react';
import { MedicalQuestionnaireData } from '../types';

interface MedicalQuestionnaireModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: MedicalQuestionnaireData | null) => void;
}

export const MedicalQuestionnaireModal: React.FC<MedicalQuestionnaireModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const [medicalHistory, setMedicalHistory] = useState('');
    const [currentMedications, setCurrentMedications] = useState('');
    const [concomitantMedications, setConcomitantMedications] = useState('');
    const [signsSymptoms, setSignsSymptoms] = useState('');
    const [labWork, setLabWork] = useState('');
    const [recentVaccinations, setRecentVaccinations] = useState('');

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data: MedicalQuestionnaireData = {
            medicalHistory: medicalHistory.trim() || undefined,
            currentMedications: currentMedications.trim() || undefined,
            concomitantMedications: concomitantMedications.trim() || undefined,
            signsSymptoms: signsSymptoms.trim() || undefined,
            labWork: labWork.trim() || undefined,
            recentVaccinations: recentVaccinations.trim() || undefined,
        };
        onSubmit(data);
    };

    const handleSkip = () => {
        onSubmit(null); // Submit null data if skipped
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div 
                ref={modalRef}
                className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()} // Prevent closing when clicking inside
            >
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Optional: Provide Medical Context</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto flex-grow">
                    <p className="text-gray-600 mb-4">
                        To help DermaGenius AI provide more tailored and safer insights, you can provide optional medical information.
                        **This information is processed locally and not stored on external servers.**
                        Remember, this is not a medical diagnosis.
                    </p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="medicalHistory" className="block text-sm font-medium text-gray-700">Medical History (relevant conditions, surgeries)</label>
                            <textarea
                                id="medicalHistory"
                                rows={2}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                                value={medicalHistory}
                                onChange={(e) => setMedicalHistory(e.target.value)}
                                placeholder="e.g., eczema, allergies, diabetes, recent surgeries"
                            ></textarea>
                        </div>
                        <div>
                            <label htmlFor="currentMedications" className="block text-sm font-medium text-gray-700">Current Medications (prescription, OTC, supplements)</label>
                            <textarea
                                id="currentMedications"
                                rows={2}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                                value={currentMedications}
                                onChange={(e) => setCurrentMedications(e.target.value)}
                                placeholder="e.g., Accutane, oral contraceptives, antibiotics, daily vitamins"
                            ></textarea>
                        </div>
                        <div>
                            <label htmlFor="concomitantMedications" className="block text-sm font-medium text-gray-700">Concomitant Medications (other topical treatments or drugs)</label>
                            <textarea
                                id="concomitantMedications"
                                rows={2}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                                value={concomitantMedications}
                                onChange={(e) => setConcomitantMedications(e.target.value)}
                                placeholder="e.g., topical retinoids, benzoyl peroxide, other skin creams"
                            ></textarea>
                        </div>
                        <div>
                            <label htmlFor="signsSymptoms" className="block text-sm font-medium text-gray-700">Signs & Symptoms (what you observe, how you feel)</label>
                            <textarea
                                id="signsSymptoms"
                                rows={2}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                                value={signsSymptoms}
                                onChange={(e) => setSignsSymptoms(e.target.value)}
                                placeholder="e.g., itching, burning, redness, dryness, sensitivity to sun"
                            ></textarea>
                        </div>
                        <div>
                            <label htmlFor="labWork" className="block text-sm font-medium text-gray-700">Recent Lab Work (e.g., hormone levels, specific deficiencies)</label>
                            <textarea
                                id="labWork"
                                rows={2}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                                value={labWork}
                                onChange={(e) => setLabWork(e.target.value)}
                                placeholder="e.g., Vitamin D deficiency, thyroid levels, recent blood tests"
                            ></textarea>
                        </div>
                        <div>
                            <label htmlFor="recentVaccinations" className="block text-sm font-medium text-gray-700">Recent Vaccinations</label>
                            <input
                                type="text"
                                id="recentVaccinations"
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                                value={recentVaccinations}
                                onChange={(e) => setRecentVaccinations(e.target.value)}
                                placeholder="e.g., COVID-19 (Pfizer, 3 months ago), Flu shot (1 month ago)"
                            />
                        </div>
                        
                        <div className="flex justify-end space-x-4 pt-4">
                            <button 
                                type="button"
                                onClick={handleSkip} 
                                className="bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                            >
                                Skip
                            </button>
                            <button 
                                type="submit" 
                                className="bg-teal-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-600 transition-colors"
                            >
                                Submit & Analyze
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
