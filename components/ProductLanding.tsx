
import React, { useState } from 'react';
import { Product } from '../types';

interface ProductLandingProps {
  mainProduct: Product;
  otherProducts: Product[];
  onProductClick: (p: Product) => void;
  onOrderNow: (p: Product) => void;
}

const ProductLanding: React.FC<ProductLandingProps> = ({ mainProduct, otherProducts, onProductClick, onOrderNow }) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const activeOtherProducts = otherProducts.filter(p => p.isActive !== false);

  return (
    <div className="animate-fadeIn">
      {/* Zoom Overlay */}
      {isZoomed && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out transition-opacity duration-300"
          onClick={() => setIsZoomed(false)}
        >
          <img 
            src={mainProduct.images[0]} 
            alt={mainProduct.name} 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-scaleIn"
          />
        </div>
      )}

      {/* Hero Section - Main Product focus */}
      <section className="relative min-h-[90vh] flex items-center bg-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-purple-50 rounded-full blur-3xl opacity-30"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 w-full relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center py-20">
          <div className="order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
              </span>
              Featured Arrival
            </div>
            <h1 className="text-6xl lg:text-8xl font-black text-gray-900 leading-[1.1] mb-8 tracking-tighter">
              {mainProduct.name}
            </h1>
            <p className="text-gray-500 text-xl mb-10 max-w-lg leading-relaxed font-medium">
              {mainProduct.description}
            </p>
            <div className="flex items-center gap-8 mb-12">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Price</span>
                <span className="text-4xl font-black text-gray-900">TK{mainProduct.price.toLocaleString()}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">MSRP</span>
                <span className="text-xl text-gray-300 line-through">TK{mainProduct.originalPrice.toLocaleString()}</span>
              </div>
              <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl font-black text-sm">
                Save {Math.round((1 - mainProduct.price/mainProduct.originalPrice) * 100)}%
              </div>
            </div>
            
            <div className="flex flex-col gap-8">
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => onOrderNow(mainProduct)}
                  className="bg-gray-900 hover:bg-black text-white px-12 py-5 rounded-2xl font-black text-lg transition-all transform hover:scale-105 shadow-2xl shadow-gray-200"
                >
                  Order Now
                </button>
              </div>

              {/* Customer Rating Section - Moved to Left Column as requested */}
              <div className="inline-flex items-center gap-4 bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 w-fit animate-fadeIn">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg shadow-indigo-100">✨</div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none mb-1">Customer Rating</p>
                  <p className="text-xl font-black text-gray-900 leading-none">{mainProduct.rating} / 5.0</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="order-1 lg:order-2 relative">
             <div 
               className="relative z-10 aspect-[4/5] lg:aspect-square overflow-hidden rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] group cursor-zoom-in"
               onClick={() => setIsZoomed(true)}
             >
                <img 
                  src={mainProduct.images[0]} 
                  alt={mainProduct.name}
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                />
             </div>
          </div>
        </div>
      </section>

      {/* Featured Grid Section */}
      <section className="bg-gray-50 py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
            <div className="max-w-xl">
              <h2 className="text-5xl font-black text-gray-900 tracking-tighter mb-4">Curated Collection</h2>
              <p className="text-gray-500 font-medium text-lg uppercase tracking-widest text-[10px]">Exceptional quality. Uncompromising style.</p>
            </div>
            <button className="bg-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-sm hover:shadow-md transition-all border border-gray-100">
              Browse Everything
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {activeOtherProducts.map(product => (
              <div 
                key={product.id}
                className="group cursor-pointer flex flex-col"
                onClick={() => onProductClick(product)}
              >
                <div className="aspect-[4/5] overflow-hidden rounded-[2.5rem] relative mb-8 bg-white shadow-sm transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-2">
                  <img 
                    src={product.images[0]} 
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute top-6 left-6 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0">
                    <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black text-indigo-600 uppercase tracking-widest shadow-xl">
                      {product.category}
                    </div>
                  </div>
                  <div className="absolute bottom-6 right-6">
                    <div className="bg-indigo-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-200 transform translate-y-20 group-hover:translate-y-0 transition-all duration-500">
                       <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </div>
                </div>
                <div className="px-2">
                  <h3 className="text-2xl font-black text-gray-900 mb-2 transition-colors group-hover:text-indigo-600">{product.name}</h3>
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-black text-gray-900">TK{product.price.toLocaleString()}</span>
                    <span className="text-sm font-bold text-gray-300 line-through">TK{product.originalPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="bg-white py-20 border-y border-gray-50">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-12">
          {[
            { label: 'Secure Delivery', icon: '🚚', sub: 'Nationwide shipping' },
            { label: 'Premium Quality', icon: '💎', sub: 'Curated selections' },
            { label: 'Secure Payment', icon: '🛡️', sub: 'COD & Online' },
            { label: '24/7 Support', icon: '💬', sub: 'Always here' },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <span className="text-4xl mb-4">{item.icon}</span>
              <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-1">{item.label}</h4>
              <p className="text-xs text-gray-400 font-medium">{item.sub}</p>
            </div>
          ))}
        </div>
      </section>
      
      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default ProductLanding;
