import React from 'react';

interface LoaderProps {
    message: string;
}

export const Loader: React.FC<LoaderProps> = ({ message }) => {
    return (
        <div className="flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4" style={{borderColor: 'var(--brand-primary)'}}></div>
            <p className="text-lg text-text-secondary font-medium">{message}</p>
        </div>
    );
};
