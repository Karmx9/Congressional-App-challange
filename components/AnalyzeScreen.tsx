
import React, { useState, useCallback } from 'react';
import { ImageUploader } from './ImageUploader';
import { AnalysisResult } from './AnalysisResult';
import { Loader } from './Loader';
import { MedicalQuestionnaireModal } from './MedicalQuestionnaireModal';
import { analyzeSkinImage } from '../services/geminiService';
import { searchProducts } from '../services/productSearchService';
import { SkincareAnalysis, AnalysisRecord, RoutinePreferences, MedicalQuestionnaireData, ShoppingProduct, Product } from '../types';

interface AnalyzeScreenProps {
    onAnalysisSuccess: (record: AnalysisRecord) => void;
    onGenerateRoutineRequest: (analysis: SkincareAnalysis, preferences: RoutinePreferences, medicalData: MedicalQuestionnaireData | null) => void;
    onClearAllHistory: () => void;
    analysisHistoryCount: number;
    onAddToCart: (product: ShoppingProduct) => void;
}

const AnalyzeScreen: React.FC<AnalyzeScreenProps> = ({ onAnalysisSuccess, onGenerateRoutineRequest, onClearAllHistory, analysisHistoryCount, onAddToCart }) => {
    // --- State managed by this screen ---
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [currentAnalysisResult, setCurrentAnalysisResult] = useState<SkincareAnalysis | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loaderMessage, setLoaderMessage] = useState("Analyzing your skin with AI...");
    const [error, setError] = useState<string | null>(null);
    const [shoppingProductOptions, setShoppingProductOptions] = useState<Record<string, ShoppingProduct[] | 'loading' | 'error'>>({});
    const [isAdvanced, setIsAdvanced] = useState(false); // State for advanced diagnosis

    // Medical Questionnaire flow state
    const [isMedicalQuestionnaireModalOpen, setIsMedicalQuestionnaireModalOpen] = useState(false);
    const [tempImageFile, setTempImageFile] = useState<File | null>(null);
    const [tempImageB64, setTempImageB64] = useState<string | null>(null);

    // --- Handlers ---

    const handleStartNew = useCallback(() => {
        setImageFile(null);
        setCurrentAnalysisResult(null);
        setError(null);
        setTempImageFile(null);
        setTempImageB64(null);
        setIsMedicalQuestionnaireModalOpen(false);
        setShoppingProductOptions({});
    }, []);

    const handleImageSelect = useCallback(async (file: File) => {
        handleStartNew();
        setTempImageFile(file);

        const reader = new FileReader();
        reader.onloadend = () => {
            setTempImageB64(reader.result as string);
            setIsMedicalQuestionnaireModalOpen(true);
        };
        reader.readAsDataURL(file);
    }, [handleStartNew]);
    
    const handleAnalysis = useCallback(async (file: File, imageB64: string, medicalData: MedicalQuestionnaireData | null) => {
        setIsLoading(true);
        setError(null);
        setCurrentAnalysisResult(null);
        setShoppingProductOptions({});
        try {
            setLoaderMessage(isAdvanced ? "Performing advanced diagnosis with specialized AI..." : "Analyzing your skin with AI...");
            const result = await analyzeSkinImage(file, medicalData, isAdvanced);
            
            setCurrentAnalysisResult(result);
            setImageFile(file);
            setIsLoading(false);

            const newRecord: AnalysisRecord = { 
                date: new Date().toISOString(), 
                analysis: result, 
                imageB64, 
                medicalData 
            };
            onAnalysisSuccess(newRecord); 
            
            // Set all to loading initially
            const initialLoadingState: Record<string, 'loading'> = {};
            result.recommendations.forEach(rec => {
                const recKey = `${rec.name}-${rec.brand}`;
                initialLoadingState[recKey] = 'loading';
            });
            setShoppingProductOptions(initialLoadingState);

            // Fetch product options and then auto-add to cart
            const allFetchedOptions: Record<string, ShoppingProduct[] | 'error'> = {};
            const fetchPromises = result.recommendations.map(async (rec: Product) => {
                const recKey = `${rec.name}-${rec.brand}`;
                try {
                    const options = await searchProducts(rec);
                    allFetchedOptions[recKey] = options;
                } catch (err) {
                    console.error(`Failed to fetch options for ${rec.name}`, err);
                    allFetchedOptions[recKey] = 'error';
                }
            });

            await Promise.all(fetchPromises);
            
            setShoppingProductOptions(prev => ({...prev, ...allFetchedOptions}));

            // Auto-add first valid product of each recommendation to cart
            result.recommendations.forEach(rec => {
                const recKey = `${rec.name}-${rec.brand}`;
                const options = allFetchedOptions[recKey];
                if (Array.isArray(options) && options.length > 0) {
                    onAddToCart(options[0]);
                }
            });

        } catch (err: any) {
            setError(err.message || "An unknown error occurred during analysis.");
            setImageFile(null); // Clear image on error
            setIsLoading(false);
        }
    }, [onAnalysisSuccess, isAdvanced, onAddToCart]);


    const handleMedicalQuestionnaireSubmit = useCallback(async (medicalData: MedicalQuestionnaireData | null) => {
        setIsMedicalQuestionnaireModalOpen(false);
        if (!tempImageFile || !tempImageB64) {
            setError("No image selected for analysis.");
            return;
        }
        await handleAnalysis(tempImageFile, tempImageB64, medicalData);
        setTempImageFile(null);
        setTempImageB64(null);
    }, [tempImageFile, tempImageB64, handleAnalysis]);


    // --- Render Logic ---

    const renderContent = () => {
        if (isLoading) {
            return <Loader message={loaderMessage} />;
        }
        if (error) {
            return (
                <div className="text-center p-6 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 font-semibold">An Error Occurred</p>
                    <p className="text-red-500 mt-2">{error}</p>
                    <button onClick={handleStartNew} className="mt-4 bg-red-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600">
                        Try Again
                    </button>
                </div>
            );
        }
        if (currentAnalysisResult) {
            return (
                <AnalysisResult 
                    analysis={{...currentAnalysisResult, medicalData: (currentAnalysisResult as any).medicalData}} 
                    onReset={handleStartNew} 
                    onGenerateRoutine={(preferences) => onGenerateRoutineRequest(currentAnalysisResult, preferences, (currentAnalysisResult as any).medicalData || null)} 
                    onAddToCart={onAddToCart}
                    shoppingProductOptions={shoppingProductOptions}
                />
            );
        }
        return <ImageUploader onImageSelect={handleImageSelect} isLoading={isLoading} imageFile={imageFile} isAdvanced={isAdvanced} onAdvancedToggle={setIsAdvanced} />;
    };

    return (
        <div className="w-full max-w-4xl mx-auto">
            {renderContent()}
            {isMedicalQuestionnaireModalOpen && (
                <MedicalQuestionnaireModal
                    isOpen={isMedicalQuestionnaireModalOpen}
                    onClose={() => {
                        setIsMedicalQuestionnaireModalOpen(false);
                        handleStartNew();
                    }}
                    onSubmit={handleMedicalQuestionnaireSubmit}
                />
            )}

            {analysisHistoryCount > 0 && !currentAnalysisResult && !isLoading && (
                 <div className="text-center mt-8">
                    <button
                        onClick={onClearAllHistory}
                        className="text-gray-400 hover:text-red-500 text-sm font-semibold"
                    >
                        <i className="fas fa-trash-alt mr-2"></i>Clear All History & Reset App
                    </button>
                </div>
            )}
        </div>
    );
};

export default AnalyzeScreen;
