import React, { useEffect, useRef } from 'react';

interface ImageComparisonModalProps {
    isOpen: boolean;
    onClose: () => void;
    images: { src: string; date: string }[];
}

export const ImageComparisonModal: React.FC<ImageComparisonModalProps> = ({ isOpen, onClose, images }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    if (!isOpen) return null;

    const [img1, img2] = images;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div 
                ref={modalRef}
                className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()} // Prevent closing when clicking inside
            >
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Image Comparison</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
                    {img1 && (
                        <div className="flex flex-col items-center">
                            <p className="text-sm font-semibold mb-2 text-gray-700">Before: {new Date(img1.date).toLocaleDateString()}</p>
                            <img src={img1.src} alt="Comparison Image 1" className="w-full h-auto object-contain rounded-lg shadow-md max-h-[40vh]" />
                        </div>
                    )}
                    {img2 && (
                        <div className="flex flex-col items-center">
                            <p className="text-sm font-semibold mb-2 text-gray-700">After: {new Date(img2.date).toLocaleDateString()}</p>
                            <img src={img2.src} alt="Comparison Image 2" className="w-full h-auto object-contain rounded-lg shadow-md max-h-[40vh]" />
                        </div>
                    )}
                    {(!img1 || !img2) && (
                        <p className="col-span-2 text-center text-gray-500">Please select two images to compare.</p>
                    )}
                </div>
                 <div className="p-4 border-t text-right">
                    <button 
                        onClick={onClose} 
                        className="bg-teal-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-600 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
