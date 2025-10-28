import React, { useState } from 'react';
import { CartItem } from '../types';
import { CheckoutModal } from './CheckoutModal';

interface StoreScreenProps {
    cart: CartItem[];
    onUpdateQuantity: (shoppingUrl: string, quantity: number) => void;
    onRemoveItem: (shoppingUrl: string) => void;
    onClearCart: () => void;
}

const StoreScreen: React.FC<StoreScreenProps> = ({ cart, onUpdateQuantity, onRemoveItem, onClearCart }) => {
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

    const calculateSubtotal = () => {
        return cart.reduce((total, item) => {
            const price = parseFloat(item.price.replace(/[^0-9.-]+/g,""));
            return total + (price * item.quantity);
        }, 0);
    };

    const subtotal = calculateSubtotal();

    if (cart.length === 0) {
        return (
            <div className="text-center p-8 card">
                <i className="fas fa-shopping-cart text-5xl text-gray-300 mb-4"></i>
                <h2 className="text-2xl font-semibold text-gray-700">Your Shopping Cart is Empty</h2>
                <p className="text-text-secondary mt-2">Get a personalized skin analysis to see product recommendations you can add here.</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto card p-6">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-3xl font-bold text-gray-800">Your Cart</h2>
                <button 
                    onClick={onClearCart}
                    className="text-sm text-text-light hover:text-red-600"
                >
                    Clear All
                </button>
            </div>

            <div className="space-y-4">
                {cart.map(item => (
                    <div key={item.shoppingUrl} className="flex items-center space-x-4 border-b pb-4">
                        <img src={item.imageUrl} alt={item.name} className="w-20 h-20 object-cover rounded-md shadow-sm flex-shrink-0" />
                        <div className="flex-grow">
                            <h3 className="font-semibold text-text-primary">{item.name}</h3>
                            <p className="text-sm text-text-secondary">{item.brand}</p>
                            <p className="text-lg font-bold text-text-primary mt-1" style={{color: 'var(--brand-secondary)'}}>{item.price}</p>
                        </div>
                        <div className="flex items-center space-x-3">
                            <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => onUpdateQuantity(item.shoppingUrl, parseInt(e.target.value, 10))}
                                className="form-input w-20 p-2 text-center"
                            />
                            <button onClick={() => onRemoveItem(item.shoppingUrl)} className="text-gray-400 hover:text-red-500 text-lg">
                                <i className="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 pt-4 border-t">
                <div className="flex justify-between items-center text-xl font-bold">
                    <span className="text-text-secondary">Subtotal</span>
                    <span className="text-text-primary">${subtotal.toFixed(2)}</span>
                </div>
                <p className="text-right text-sm text-text-light mt-1">Taxes and shipping calculated at checkout (simulation).</p>
                <button
                    onClick={() => setIsCheckoutModalOpen(true)}
                    className="mt-6 w-full btn btn-primary"
                >
                    Proceed to Checkout
                </button>
            </div>

            <CheckoutModal
                isOpen={isCheckoutModalOpen}
                onClose={() => setIsCheckoutModalOpen(false)}
                totalAmount={subtotal}
                onPaymentSuccess={() => {
                    onClearCart();
                    setIsCheckoutModalOpen(false);
                }}
            />
        </div>
    );
};

export default StoreScreen;
