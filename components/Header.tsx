import React from 'react';

export const Header: React.FC = () => {
    return (
        <header className="bg-white shadow-md sticky top-0 z-10">
            <div className="container mx-auto flex items-center justify-center p-4">
                 <i className="fas fa-spa text-3xl mr-3" style={{color: 'var(--brand-primary)'}}></i>
                <h1 className="text-3xl font-extrabold tracking-tight" style={{
                    background: 'linear-gradient(to right, var(--brand-primary), var(--brand-secondary))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                }}>
                    DermaGenius AI
                </h1>
            </div>
        </header>
    );
};
