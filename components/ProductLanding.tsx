
import React, { useState, useEffect } from 'react';
import { Product, StoreSettings } from '../types';
import SupabaseProductGrid from './SupabaseProductGrid';

interface ProductLandingProps {
  mainProduct: Product;
  otherProducts: Product[];
  onProductClick: (p: Product) => void;
  onOrderNow: (p: Product) => void;
  storeSettings: StoreSettings;
}

// Mock Reviews Data generated based on provided "Nature Shampoo Bar" details
const REVIEWS = [
  { id: 1, name: "Fatima Rahman", rating: 5, date: "2 days ago", comment: "Amazing product! My hair feels so soft and strong. The herbal scent is lovely." },
  { id: 2, name: "Sadia Islam", rating: 5, date: "3 days ago", comment: "খুবই ভালো কাজ করে। চুল পড়া অনেক কমেছে। (Works really well. Hair fall reduced a lot.)" },
  { id: 3, name: "Tanvir Ahmed", rating: 5, date: "4 days ago", comment: "Best organic shampoo I've used. No harsh chemicals, just pure nature." },
  { id: 4, name: "Nusrat Jahan", rating: 5, date: "5 days ago", comment: "Cacumen Biotae magic! My roots feel stronger than ever." },
  { id: 5, name: "Ayesha Siddiqua", rating: 4, date: "1 week ago", comment: "Good for daily use. Keeps the scalp clean and dandruff free." },
];

const ProductLanding: React.FC<ProductLandingProps> = ({ mainProduct, onProductClick, onOrderNow, storeSettings }) => {
  const [showReviews, setShowReviews] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setActiveImageIndex(0);
    setIsExpanded(false);
  }, [mainProduct.id]);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://via.placeholder.com/800x800?text=Product+Image+Unavailable';
    e.currentTarget.onerror = null;
  };

  const handleThumbError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://via.placeholder.com/100x100?text=NA';
    e.currentTarget.onerror = null;
  };

  return (
    <div className="animate-fadeIn pb-20">
      {/* Reviews Modal */}
      {showReviews && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowReviews(false)}></div>
          <div className="bg-white rounded-[32px] w-full max-w-2xl max-h-[80vh] shadow-2xl relative z-10 overflow-hidden flex flex-col animate-scaleIn">
            <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-20">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Customer Reviews</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    ))}
                  </div>
                  <span className="text-sm font-bold text-gray-500">4.9/5 (24 Reviews)</span>
                </div>
              </div>
              <button onClick={() => setShowReviews(false)} className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 md:p-8 space-y-6 no-scrollbar">
              {REVIEWS.map((review) => (
                <div key={review.id} className="flex gap-4 p-4 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-600 font-black text-sm md:text-base">
                    {review.name.split(' ').map(n => n[0]).join('').substring(0,2)}
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-gray-900 text-sm md:text-base">{review.name}</h4>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{review.date}</span>
                    </div>
                    <div className="flex text-yellow-400 mb-2">
                       {[...Array(5)].map((_, i) => (
                         <svg key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-current' : 'text-gray-200 fill-current'}`} viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                       ))}
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50/50">
               <button 
                 onClick={() => { setShowReviews(false); onOrderNow(mainProduct); }} 
                 className="w-full bg-[#111827] text-white py-4 rounded-xl font-black text-lg shadow-xl hover:bg-black transition-all"
               >
                 Buy Now - TK{mainProduct.price}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center bg-[#F8F9FB] overflow-hidden pt-6 md:pt-10">
        {/* Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
           <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-emerald-200/20 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3"></div>
           <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-teal-200/20 rounded-full blur-[100px] -translate-x-1/3 translate-y-1/3"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-8 w-full relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          
          {/* Text Content */}
          <div className="lg:col-span-6 flex flex-col justify-center order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 self-start bg-white border border-emerald-50 px-3 py-1.5 md:px-4 md:py-2 rounded-full shadow-sm mb-6 md:mb-8 animate-fadeIn">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
              </span>
              <span className="text-[10px] md:text-xs font-black text-emerald-900 uppercase tracking-widest">Featured Drop</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-gray-900 leading-[1.1] mb-4 md:mb-6 tracking-tight">
              {mainProduct.name}
            </h1>
            
            <div className="relative mb-6 md:mb-8 max-w-lg">
              <div className={`text-base md:text-lg text-gray-500 leading-relaxed font-medium whitespace-pre-line ${!isExpanded ? 'line-clamp-6' : ''}`}>
                {mainProduct.description}
              </div>
              <button 
                onClick={() => setIsExpanded(!isExpanded)} 
                className="text-indigo-600 font-bold text-sm mt-2 hover:underline"
              >
                {isExpanded ? 'Show Less' : 'Read More'}
              </button>
            </div>

            <div className="flex items-end gap-4 md:gap-6 mb-8 md:mb-10 border-b border-gray-200 pb-6 md:pb-8">
              <div>
                <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Price</p>
                <p className="text-4xl md:text-5xl font-black text-[#111827]">TK{mainProduct.price.toLocaleString()}</p>
              </div>
              {mainProduct.originalPrice > mainProduct.price && (
                <div className="mb-1.5 md:mb-2">
                  <p className="text-lg md:text-xl text-gray-400 line-through font-bold">TK{mainProduct.originalPrice.toLocaleString()}</p>
                </div>
              )}
              {mainProduct.discountPercentage && (
                 <div className="mb-2 md:mb-3 px-2.5 py-1 md:px-3 bg-red-50 text-red-600 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-lg">
                   -{mainProduct.discountPercentage}% OFF
                 </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 md:gap-4">
              <button 
                onClick={() => onOrderNow(mainProduct)}
                className="bg-[#111827] text-white px-8 py-4 md:px-10 md:py-5 rounded-2xl font-black text-base md:text-lg hover:bg-black transition-all transform hover:-translate-y-1 shadow-xl hover:shadow-2xl flex items-center gap-2 md:gap-3"
              >
                <span>Order it here</span>
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
              </button>
              <button 
                onClick={() => onProductClick(mainProduct)}
                className="bg-white text-[#111827] px-8 py-4 md:px-10 md:py-5 rounded-2xl font-black text-base md:text-lg border border-gray-200 hover:bg-gray-50 transition-all"
              >
                View details
              </button>
              
              {storeSettings.whatsappOrderLink && (
                 <a 
                   href={storeSettings.whatsappOrderLink}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="bg-[#25D366] text-white px-8 py-4 md:px-10 md:py-5 rounded-2xl font-black text-base md:text-lg hover:bg-[#20bd5a] transition-all transform hover:-translate-y-1 shadow-xl hover:shadow-2xl flex items-center gap-2 md:gap-3"
                 >
                   <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                   <span>WhatsApp</span>
                 </a>
              )}
            </div>
          </div>

          {/* Image Content */}
          <div className="lg:col-span-6 relative order-1 lg:order-2">
             <div 
               onClick={() => onProductClick(mainProduct)}
               className="relative aspect-[4/5] lg:aspect-square bg-white rounded-[32px] md:rounded-[40px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden group cursor-pointer"
             >
                <img 
                  src={mainProduct.images[activeImageIndex]} 
                  alt={mainProduct.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  onError={handleImageError}
                />
                
                {/* Floating Badge (Clickable Review Trigger) */}
                <div 
                  onClick={(e) => { e.stopPropagation(); setShowReviews(true); }}
                  className="absolute bottom-4 right-4 md:bottom-8 md:right-8 bg-white/90 backdrop-blur-md px-4 py-3 md:px-6 md:py-4 rounded-2xl md:rounded-3xl shadow-lg border border-white/50 flex flex-col items-center animate-bounce cursor-pointer hover:bg-white hover:scale-110 transition-all group/badge"
                  style={{ animationDuration: '3s' }}
                >
                   <span className="text-xl md:text-2xl group-hover/badge:scale-125 transition-transform">⭐</span>
                   <span className="text-xs md:text-sm font-black text-gray-900 mt-1">{mainProduct.rating}/5</span>
                   <span className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider underline decoration-gray-300 underline-offset-2">{mainProduct.reviewCount} Reviews</span>
                </div>
             </div>
             
             {/* Thumbnails */}
             <div className="flex gap-3 md:gap-4 mt-6 overflow-x-auto pb-2 no-scrollbar px-1 justify-center lg:justify-start">
                {mainProduct.images.map((img, idx) => (
                   <button 
                     key={idx}
                     onClick={(e) => { e.stopPropagation(); setActiveImageIndex(idx); }}
                     className={`relative w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border-2 transition-all flex-shrink-0 ${activeImageIndex === idx ? 'border-gray-900 ring-2 ring-gray-100' : 'border-transparent opacity-70 hover:opacity-100 hover:scale-105'}`}
                   >
                     <img 
                       src={img} 
                       className="w-full h-full object-cover" 
                       alt={`Thumbnail ${idx + 1}`} 
                       onError={handleThumbError}
                     />
                   </button>
                ))}
             </div>
          </div>
        </div>
      </section>

      {/* Features / Trust Strip */}
      <section className="py-10 md:py-16 border-y border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-8 md:gap-8">
           {[
             { title: 'Authentic', desc: '100% Original Products', icon: '🛡️' },
             { title: 'Fast Delivery', desc: 'Nationwide Shipping', icon: '🚀' },
             { title: 'Easy Return', desc: '7 Days Return Policy', icon: '↩️' },
             { title: 'Secure Pay', desc: 'COD & Digital Payment', icon: '🔒' }
           ].map((item, i) => (
             <div key={i} className="flex items-center gap-3 md:gap-4 group">
               <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-50 rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl group-hover:bg-emerald-50 group-hover:scale-110 transition-all">{item.icon}</div>
               <div>
                 <h4 className="font-black text-gray-900 text-xs md:text-sm uppercase tracking-wider">{item.title}</h4>
                 <p className="text-[10px] md:text-xs text-gray-500 font-medium">{item.desc}</p>
               </div>
             </div>
           ))}
        </div>
      </section>

      {/* Supabase Products Section */}
      <SupabaseProductGrid />
      
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
