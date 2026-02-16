
import React, { useState } from 'react';
import { Product, CartItem } from '../types';

interface ProductDetailViewProps {
  product: Product;
  onBack: () => void;
  onOrderNow: (item: CartItem) => void;
  onToggleWishlist: (product: Product) => void;
  isWishlisted: boolean;
}

const ProductDetailView: React.FC<ProductDetailViewProps> = ({ 
  product, 
  onBack, 
  onOrderNow, 
  onToggleWishlist, 
  isWishlisted 
}) => {
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState(product.sizes[0]);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [quantity, setQuantity] = useState(1);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const handleOrderNow = () => {
    onOrderNow({
      product,
      quantity,
      selectedSize,
      selectedColor
    });
  };

  const handleNextImage = () => {
    setSelectedImage((prev) => (prev + 1) % product.images.length);
  };

  const handlePrevImage = () => {
    setSelectedImage((prev) => (prev - 1 + product.images.length) % product.images.length);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://via.placeholder.com/800x800?text=Product+Image+Unavailable';
    e.currentTarget.onerror = null;
  };

  const handleThumbError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://via.placeholder.com/100x100?text=NA';
    e.currentTarget.onerror = null;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12 animate-fadeIn">
      <button 
        onClick={onBack}
        className="mb-6 md:mb-8 flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors font-medium text-sm md:text-base"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        Back to Gallery
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        {/* Left Column: Images */}
        <div className="space-y-4">
          <div className="aspect-[4/5] bg-gray-100 rounded-[24px] md:rounded-[32px] overflow-hidden shadow-lg border border-gray-100 relative group">
            <img 
              src={product.images[selectedImage]} 
              alt={product.name}
              className="w-full h-full object-cover animate-scaleIn"
              onError={handleImageError}
            />
            {/* Navigation Arrows */}
            <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity">
               <button onClick={(e) => { e.stopPropagation(); handlePrevImage(); }} className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md shadow-lg flex items-center justify-center hover:bg-white transition-all transform hover:scale-110">
                 <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
               </button>
               <button onClick={(e) => { e.stopPropagation(); handleNextImage(); }} className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md shadow-lg flex items-center justify-center hover:bg-white transition-all transform hover:scale-110">
                 <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
               </button>
            </div>
          </div>
          <div className="flex gap-3 md:gap-4 overflow-x-auto py-2 no-scrollbar px-1">
            {product.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImage(idx)}
                className={`flex-shrink-0 w-16 h-20 md:w-20 md:h-24 rounded-xl overflow-hidden border-2 transition-all ${
                  selectedImage === idx ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img 
                  src={img} 
                  alt={`Thumb ${idx}`} 
                  className="w-full h-full object-cover" 
                  onError={handleThumbError}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Details */}
        <div className="flex flex-col">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-1">{product.name}</h1>
            {product.shortDescription && (
              <p className="text-indigo-600 font-bold text-xs md:text-sm mb-3 uppercase tracking-wide">{product.shortDescription}</p>
            )}
            <div className="flex items-center gap-4">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className={`w-4 h-4 md:w-5 md:h-5 ${i < Math.floor(product.rating) ? 'fill-current' : 'fill-gray-200'}`} viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                ))}
              </div>
              <span className="text-gray-400 text-xs md:text-sm font-medium">({product.reviewCount} Ratings)</span>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-8">
            <span className="text-xl md:text-2xl text-gray-400 line-through font-medium">TK{product.originalPrice.toLocaleString()}</span>
            <span className="text-3xl md:text-4xl font-extrabold text-indigo-600">TK{product.price.toLocaleString()}</span>
          </div>

          <div className="space-y-6 mb-10">
            <div>
              <h4 className="text-gray-900 font-bold mb-2 uppercase text-[10px] tracking-widest text-gray-400">Description</h4>
              <p className={`text-gray-600 leading-relaxed text-sm md:text-base whitespace-pre-line ${!isDescriptionExpanded ? 'line-clamp-6' : ''}`}>
                {product.description}
              </p>
              {product.description.length > 200 && (
                <button 
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)} 
                  className="text-indigo-600 font-bold text-sm mt-2 hover:underline"
                >
                  {isDescriptionExpanded ? 'Show Less' : 'Read More'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-gray-900 font-bold mb-1 text-[10px] uppercase tracking-widest text-gray-400">Product id</h4>
                <p className="text-gray-900 font-bold text-sm">{product.productId}</p>
              </div>
              <div>
                <h4 className="text-gray-900 font-bold mb-1 text-[10px] uppercase tracking-widest text-gray-400">Delivery</h4>
                <p className="text-gray-900 font-bold text-sm">{(product.deliveryRegions || []).join(', ')}</p>
              </div>
            </div>
          </div>

          {/* Selectors */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Quantity</label>
              <select 
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full border-gray-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 py-3 px-4 bg-gray-50 font-semibold text-base"
              >
                {[1,2,3,4,5,10].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Size</label>
              <select 
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="w-full border-gray-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 py-3 px-4 bg-gray-50 font-semibold text-base"
              >
                {product.sizes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="mb-8">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-3">Available Colors</h4>
            <div className="flex gap-4">
              {product.colors.map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-10 h-10 rounded-full border-2 transition-all p-0.5 ${
                    selectedColor === color ? 'border-indigo-600 scale-110' : 'border-transparent'
                  }`}
                >
                  <div 
                    className="w-full h-full rounded-full" 
                    style={{ backgroundColor: color }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 md:gap-4">
            <button 
              onClick={handleOrderNow}
              className="flex-grow bg-gray-900 hover:bg-black text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 md:gap-3 transition-all transform hover:scale-[1.02] shadow-xl text-sm md:text-base"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
              ORDER NOW
            </button>
            <button 
              onClick={() => onToggleWishlist(product)}
              className={`flex-grow bg-gray-50 py-4 rounded-xl font-bold flex items-center justify-center gap-2 md:gap-3 transition-all hover:bg-gray-100 text-sm md:text-base ${
                isWishlisted ? 'text-red-500' : 'text-gray-900'
              }`}
            >
              <svg className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
              {isWishlisted ? 'SAVED' : 'WISHLIST'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailView;
