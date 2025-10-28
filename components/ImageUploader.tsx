import React, { useRef, useState, useEffect } from 'react';

interface ImageUploaderProps {
    onImageSelect: (file: File) => void;
    isLoading: boolean;
    imageFile: File | null;
    isAdvanced: boolean;
    onAdvancedToggle: (isAdvanced: boolean) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect, isLoading, imageFile, isAdvanced, onAdvancedToggle }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);

    useEffect(() => {
        if (!imageFile) {
            setPreview(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
        };
        reader.readAsDataURL(imageFile);
    }, [imageFile]);


    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onImageSelect(file);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="w-full max-w-2xl mx-auto card text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Get Your Personal Skin Analysis</h2>
            <p className="text-text-secondary mb-6">Upload a clear, well-lit photo of your skin to begin.</p>
            
            <div className="flex items-center justify-center mb-6 p-3 bg-slate-100 rounded-lg">
                <label htmlFor="advanced-toggle" className="flex items-center cursor-pointer">
                    <div className="relative">
                        <input id="advanced-toggle" type="checkbox" className="sr-only" checked={isAdvanced} onChange={(e) => onAdvancedToggle(e.target.checked)} disabled={isLoading} />
                        <div className="toggle-switch-bg block w-14 h-8 bg-gray-300 rounded-full transition"></div>
                        <div className="toggle-switch-dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full shadow-md"></div>
                    </div>
                    <div className="ml-4 text-gray-700 text-left">
                        <span className="font-semibold">Advanced Diagnosis</span>
                        <p className="text-xs text-text-light">For deeper, clinical-grade insights.</p>
                    </div>
                </label>
            </div>

            <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-6 transition-all duration-300 hover:border-brand-primary hover:bg-teal-50/50 cursor-pointer" onClick={triggerFileInput}>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                    disabled={isLoading}
                />
                {preview ? (
                     <div className="relative w-full pb-[100%] rounded-lg overflow-hidden shadow-inner">
                        <img src={preview} alt="Skin preview" className="absolute top-0 left-0 w-full h-full object-cover" />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center space-y-3 text-text-light">
                        <i className="fas fa-camera-retro text-5xl text-gray-400"></i>
                        <p className="font-semibold text-text-secondary">Click to upload or take a photo</p>
                        <p className="text-sm">PNG, JPG, or WEBP accepted</p>
                    </div>
                )}
            </div>

            <button
                onClick={triggerFileInput}
                disabled={isLoading}
                className="mt-6 w-full btn btn-primary"
            >
                {isLoading ? 'Analyzing...' : preview ? 'Change Photo' : 'Select Photo'}
            </button>
             <p className="text-xs text-gray-400 mt-4">
                <i className="fas fa-lock mr-1"></i> Your photos are private and are not stored.
            </p>
        </div>
    );
};
