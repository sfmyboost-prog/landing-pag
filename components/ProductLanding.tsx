
import React from 'react';
import { Product } from '../types';

interface ProductLandingProps {
  mainProduct: Product;
  otherProducts: Product[];
  onProductClick: (p: Product) => void;
  onOrderNow: (p: Product) => void;
}

const ProductLanding: React.FC<ProductLandingProps> = ({ mainProduct, otherProducts, onProductClick, onOrderNow }) => {
  // Only show products that are not deactivated
  const activeOtherProducts = otherProducts.filter(p => p.isActive !== false);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 animate-fadeIn">
      {/* Hero Section - Main Product */}
      <div className="relative bg-gray-50 rounded-3xl overflow-hidden mb-16 flex flex-col lg:flex-row items-center min-h-[500px]">
        <div className="w-full lg:w-1/2 p-12 flex flex-col justify-center order-2 lg:order-1">
          <span className="text-indigo-600 font-bold tracking-widest text-sm mb-4 uppercase">Featured Release</span>
          <h1 className="text-5xl lg:text-7xl font-extrabold text-gray-900 leading-tight mb-6">
            {mainProduct.name}
          </h1>
          <p className="text-gray-600 text-lg mb-8 max-w-md">
            {mainProduct.description.substring(0, 150)}...
          </p>
          <div className="flex items-center gap-6 mb-8">
            <span className="text-4xl font-bold text-gray-900">${mainProduct.price.toFixed(2)}</span>
            <span className="text-xl text-gray-400 line-through">${mainProduct.originalPrice.toFixed(2)}</span>
          </div>
          <button 
            onClick={() => onOrderNow(mainProduct)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-xl shadow-indigo-200 w-fit"
          >
            Order Now
          </button>
        </div>
        <div className="w-full lg:w-1/2 h-[400px] lg:h-[600px] order-1 lg:order-2">
          <img 
            src={mainProduct.images[0]} 
            alt={mainProduct.name}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Smaller Products Grid */}
      <section>
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">More Collections</h2>
            <p className="text-gray-500 mt-2">Curated essentials for your premium lifestyle.</p>
          </div>
          <button className="text-indigo-600 font-semibold flex items-center gap-2 hover:gap-3 transition-all">
            View All Collection
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {activeOtherProducts.map(product => (
            <div 
              key={product.id}
              className="group cursor-pointer bg-white rounded-2xl overflow-hidden border border-gray-100 transition-all hover:shadow-2xl hover:-translate-y-2"
              onClick={() => onProductClick(product)}
            >
              <div className="aspect-[4/5] overflow-hidden relative">
                <img 
                  src={product.images[0]} 
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-indigo-600 shadow-sm">
                  {Math.round((1 - product.price/product.originalPrice) * 100)}% OFF
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{product.category}</span>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    <span className="text-sm font-bold text-gray-700">{product.rating}</span>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors mb-2">{product.name}</h3>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-extrabold text-gray-900">${product.price.toFixed(2)}</span>
                  <span className="text-sm text-gray-400 line-through">${product.originalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ProductLanding;
