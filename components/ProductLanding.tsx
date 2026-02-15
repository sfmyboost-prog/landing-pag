
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
    <div className="animate-fadeIn pb-20">
      {/* Zoom Overlay */}
      {isZoomed && (
        <div 
          className="fixed inset-0 z-[100] bg-white flex items-center justify-center cursor-zoom-out transition-all duration-300"
          onClick={() => setIsZoomed(false)}
        >
          <img 
            src={mainProduct.images[0]} 
            alt={mainProduct.name} 
            className="w-full h-full object-contain animate-scaleIn"
          />
        </div>
      )}

      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center bg-[#F8F9FB] overflow-hidden pt-10">
        {/* Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
           <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-indigo-200/20 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3"></div>
           <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-purple-200/20 rounded-full blur-[100px] -translate-x-1/3 translate-y-1/3"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 w-full relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Text Content */}
          <div className="lg:col-span-6 flex flex-col justify-center order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 self-start bg-white border border-indigo-50 px-4 py-2 rounded-full shadow-sm mb-8 animate-fadeIn">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600"></span>
              </span>
              <span className="text-xs font-black text-indigo-900 uppercase tracking-widest">Featured Drop</span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-black text-gray-900 leading-[1.1] mb-6 tracking-tight">
              {mainProduct.name}
            </h1>
            
            <p className="text-lg text-gray-500 mb-8 leading-relaxed max-w-lg font-medium">
              {mainProduct.description}
            </p>

            <div className="flex items-end gap-6 mb-10 border-b border-gray-200 pb-8">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Price</p>
                <p className="text-5xl font-black text-[#111827]">TK{mainProduct.price.toLocaleString()}</p>
              </div>
              {mainProduct.originalPrice > mainProduct.price && (
                <div className="mb-2">
                  <p className="text-xl text-gray-400 line-through font-bold">TK{mainProduct.originalPrice.toLocaleString()}</p>
                </div>
              )}
              {mainProduct.discountPercentage && (
                 <div className="mb-3 px-3 py-1 bg-red-50 text-red-600 text-xs font-black uppercase tracking-widest rounded-lg">
                   -{mainProduct.discountPercentage}% OFF
                 </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => onOrderNow(mainProduct)}
                className="bg-[#111827] text-white px-10 py-5 rounded-2xl font-black text-lg hover:bg-black transition-all transform hover:-translate-y-1 shadow-xl hover:shadow-2xl flex items-center gap-3"
              >
                <span>Buy Now</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
              </button>
              <button 
                onClick={() => onProductClick(mainProduct)}
                className="bg-white text-[#111827] px-10 py-5 rounded-2xl font-black text-lg border border-gray-200 hover:bg-gray-50 transition-all"
              >
                View Details
              </button>
            </div>
          </div>

          {/* Image Content */}
          <div className="lg:col-span-6 relative order-1 lg:order-2">
             <div 
               className="relative aspect-[4/5] lg:aspect-square bg-white rounded-[40px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden cursor-zoom-in group"
               onClick={() => setIsZoomed(true)}
             >
                <img 
                  src={mainProduct.images[0]} 
                  alt={mainProduct.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                
                {/* Floating Badge */}
                <div className="absolute bottom-8 right-8 bg-white/90 backdrop-blur-md px-6 py-4 rounded-3xl shadow-lg border border-white/50 flex flex-col items-center animate-bounce" style={{ animationDuration: '3s' }}>
                   <span className="text-2xl">⭐</span>
                   <span className="text-sm font-black text-gray-900 mt-1">{mainProduct.rating}/5</span>
                   <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{mainProduct.reviewCount} Reviews</span>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Features / Trust Strip */}
      <section className="py-12 border-y border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
           {[
             { title: 'Authentic', desc: '100% Original Products', icon: '🛡️' },
             { title: 'Fast Delivery', desc: 'Nationwide Shipping', icon: '🚀' },
             { title: 'Easy Return', desc: '7 Days Return Policy', icon: '↩️' },
             { title: 'Secure Pay', desc: 'COD & Digital Payment', icon: '🔒' }
           ].map((item, i) => (
             <div key={i} className="flex items-center gap-4 group">
               <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-indigo-50 group-hover:scale-110 transition-all">{item.icon}</div>
               <div>
                 <h4 className="font-black text-gray-900 text-sm uppercase tracking-wider">{item.title}</h4>
                 <p className="text-xs text-gray-500 font-medium">{item.desc}</p>
               </div>
             </div>
           ))}
        </div>
      </section>

      {/* More Products Section */}
      {activeOtherProducts.length > 0 && (
        <section className="py-24 px-6 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
            <div>
              <h2 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">More to Explore</h2>
              <p className="text-gray-500 font-medium">Discover other premium items from our collection.</p>
            </div>
            <div className="h-1 flex-grow bg-gray-100 rounded-full mx-8 hidden md:block"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {activeOtherProducts.map(product => (
              <div 
                key={product.id}
                className="group bg-white rounded-3xl p-4 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col"
                onClick={() => onProductClick(product)}
              >
                <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-gray-50 relative mb-6">
                  <img 
                    src={product.images[0]} 
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {product.discountPercentage && (
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-red-600 shadow-sm">
                      -{product.discountPercentage}%
                    </div>
                  )}
                  <div className="absolute inset-x-4 bottom-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onOrderNow(product); }}
                      className="w-full bg-[#111827] text-white py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-black flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                      Order Now
                    </button>
                  </div>
                </div>
                
                <div className="px-2 pb-2 flex-grow flex flex-col">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{product.category}</p>
                  <h3 className="text-lg font-black text-gray-900 mb-2 leading-tight group-hover:text-indigo-600 transition-colors">{product.name}</h3>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-xl font-black text-[#111827]">TK{product.price.toLocaleString()}</span>
                    {product.originalPrice > product.price && (
                      <span className="text-sm font-bold text-gray-300 line-through">TK{product.originalPrice.toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      
      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default ProductLanding;
