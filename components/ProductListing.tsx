import React from 'react';
import { ShoppingProduct } from '../types';

interface ProductListingProps {
    product: ShoppingProduct;
    onAddToCart: (product: ShoppingProduct) => void;
}

const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    return (
        <div className="flex items-center text-yellow-400">
            {[...Array(fullStars)].map((_, i) => <i key={`full-${i}`} className="fas fa-star"></i>)}
            {halfStar && <i className="fas fa-star-half-alt"></i>}
            {[...Array(emptyStars)].map((_, i) => <i key={`empty-${i}`} className="far fa-star"></i>)}
        </div>
    );
};

export const ProductListing: React.FC<ProductListingProps> = ({ product, onAddToCart }) => {
    const iconClass = {
        'Cleanser': 'fa-soap', 'Moisturizer': 'fa-tint', 'Serum': 'fa-flask',
        'Sunscreen': 'fa-sun', 'Toner': 'fa-spray-can', 'Treatment': 'fa-pills',
    }[product.type] || 'fa-tag';

    return (
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="flex-shrink-0">
                <img src={product.imageUrl} alt={product.name} className="w-28 h-28 object-cover rounded-md shadow-sm" />
            </div>
            <div className="flex-grow text-center sm:text-left">
                <span className="text-xs font-semibold uppercase" style={{color: 'var(--brand-secondary)'}}><i className={`fas ${iconClass} mr-1.5`}></i>{product.type}</span>
                <h4 className="font-bold text-lg text-text-primary">{product.name} <span className="font-normal text-text-secondary">by {product.brand}</span></h4>
                <p className="text-text-secondary text-sm mt-1">{product.reason}</p>
                 <div className="flex items-center justify-center sm:justify-start mt-2 space-x-2 text-sm text-text-light">
                    <StarRating rating={product.rating} />
                    <span>{product.rating.toFixed(1)}</span>
                    <span>({product.reviewCount.toLocaleString()} reviews)</span>
                </div>
            </div>
            <div className="flex-shrink-0 flex flex-col items-center space-y-2 w-full sm:w-auto">
                <span className="text-2xl font-bold text-text-primary">{product.price}</span>
                 <button 
                    onClick={() => onAddToCart(product)} 
                    className="w-full sm:w-auto btn btn-primary text-sm"
                >
                    <i className="fas fa-cart-plus mr-2"></i>Add to Cart
                </button>
                <a 
                    href={product.shoppingUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-text-light hover:text-brand-secondary"
                >
                    View on {product.merchant} <i className="fas fa-external-link-alt ml-1"></i>
                </a>
            </div>
        </div>
    );
};
