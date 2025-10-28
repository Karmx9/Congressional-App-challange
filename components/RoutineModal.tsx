import React, { useEffect, useRef } from 'react';

// Let TypeScript know that 'marked' is available on the window
declare var marked: { parse: (text: string) => string };

interface RoutineModalProps {
    isOpen: boolean;
    onClose: () => void;
    routineHtml: string;
    isLoading: boolean;
}

export const RoutineModal: React.FC<RoutineModalProps> = ({ isOpen, onClose, routineHtml, isLoading }) => {
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
                    <h2 className="text-xl font-bold text-gray-800">Your Personalized Skincare Routine</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {isLoading ? (
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500 mx-auto mb-4"></div>
                            <p>Generating your routine with Gemini Pro...</p>
                        </div>
                    ) : (
                        <div 
                            className="prose prose-sm sm:prose-base max-w-none"
                            dangerouslySetInnerHTML={{ __html: routineHtml }}
                        />
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
