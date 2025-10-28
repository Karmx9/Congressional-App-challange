import React, { useEffect, useRef, useState } from 'react';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    totalAmount: number;
    onPaymentSuccess: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, totalAmount, onPaymentSuccess }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    
    // In a real application, this key would be loaded securely.
    const stripeTestKey = "pk_test_51RmhgsQ02av8utAmFiDkx0ZQSGWc2DcHzkJx17jN89VZRaElgcPgBsqZ3ikzA60F7YtL6RM4snxtB5r2IOwLibL700lHLOjzoZ";

    const handlePayment = (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        // This simulates the tokenization and payment confirmation from a real payment provider.
        setTimeout(() => {
            setIsProcessing(false);
            setPaymentSuccess(true);
            // After success, trigger the parent component's success handler
            setTimeout(() => {
                onPaymentSuccess();
            }, 2500);
        }, 1500);
    };

    // Reset state when modal is opened
    useEffect(() => {
        if (isOpen) {
            setIsProcessing(false);
            setPaymentSuccess(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 fade-in" onClick={onClose}>
            <div ref={modalRef} className="card w-full max-w-md flex flex-col p-0" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Checkout</h2>
                        <p className="text-xs text-text-light">Powered by <span className="font-semibold" style={{color: '#635bff'}}>Stripe</span></p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-2xl">&times;</button>
                </div>

                {paymentSuccess ? (
                    <div className="p-8 text-center">
                        <div className="mx-auto w-16 h-16 flex items-center justify-center bg-green-100 rounded-full mb-4">
                            <i className="fas fa-check text-green-500 text-3xl"></i>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800">Payment Successful!</h3>
                        <p className="text-text-secondary mt-2">Thank you for your order. Your cart has been cleared.</p>
                    </div>
                ) : (
                    <form onSubmit={handlePayment} className="p-6 space-y-4">
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 text-blue-800 text-sm rounded-r-lg">
                            <p><i className="fas fa-shield-alt mr-2"></i><strong>This is a secure checkout simulation.</strong> We are demonstrating the use of a secure payment provider like Stripe.</p>
                        </div>
                        
                        {/* Secure Payment Element Placeholder */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-text-secondary">Payment Information</label>
                            <div className="w-full p-4 border border-dashed rounded-lg bg-slate-50 text-center text-text-secondary">
                                <i className="fab fa-stripe text-4xl text-gray-400 mb-2"></i>
                                <p className="text-sm font-semibold">Secure Payment Element</p>
                                <p className="text-xs">A secure form from Stripe would be rendered here. We never handle your card details directly.</p>
                            </div>
                        </div>
                        
                        <div className="border-t pt-4">
                             <div className="flex justify-between items-center text-lg">
                                <span className="text-text-secondary">Total</span>
                                <span className="font-bold text-text-primary">${totalAmount.toFixed(2)}</span>
                            </div>
                        </div>

                        <button type="submit" disabled={isProcessing} className="w-full btn" style={{backgroundColor: '#5433FF', color: 'white', opacity: isProcessing ? 0.6 : 1}}>
                            {isProcessing ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white inline-block mr-2"></div>
                                    Processing Payment...
                                </>
                            ) : `Pay $${totalAmount.toFixed(2)}`}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};
