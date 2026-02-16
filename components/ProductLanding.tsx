
import React, { useState } from 'react';
import { Product } from '../types';

interface ProductLandingProps {
  mainProduct: Product;
  otherProducts: Product[];
  onProductClick: (p: Product) => void;
  onOrderNow: (p: Product) => void;
}

// Mock Reviews Data generated based on provided "Nature Shampoo Bar" details
const REVIEWS = [
  { id: 1, name: "Fatima Rahman", rating: 5, date: "2 days ago", comment: "Amazing product! My hair feels so soft and strong. The herbal scent is lovely." },
  { id: 2, name: "Sadia Islam", rating: 5, date: "3 days ago", comment: "খুবই ভালো কাজ করে। চুল পড়া অনেক কমেছে। (Works really well. Hair fall reduced a lot.)" },
  { id: 3, name: "Tanvir Ahmed", rating: 5, date: "4 days ago", comment: "Best organic shampoo I've used. No harsh chemicals, just pure nature." },
  { id: 4, name: "Nusrat Jahan", rating: 5, date: "5 days ago", comment: "Cacumen Biotae magic! My roots feel stronger than ever." },
  { id: 5, name: "Ayesha Siddiqua", rating: 4, date: "1 week ago", comment: "Good for daily use. Keeps the scalp clean and dandruff free." },
  { id: 6, name: "Rashedul Karim", rating: 5, date: "1 week ago", comment: "Great for travel. No plastic waste and effective cleaning." },
  { id: 7, name: "Farhana Akter", rating: 5, date: "1 week ago", comment: "চুল এখন অনেক বেশি ঘন মনে হয়। ধন্যবাদ! (Hair feels much thicker now. Thanks!)" },
  { id: 8, name: "Mehedi Hasan", rating: 5, date: "2 weeks ago", comment: "Finally found something that stopped my hair fall. Usman Grass works wonders." },
  { id: 9, name: "Sumaiya Khan", rating: 5, date: "2 weeks ago", comment: "Leaves hair shiny and vibrant without conditioner." },
  { id: 10, name: "Rubel Hossain", rating: 5, date: "2 weeks ago", comment: "প্রথমবার ব্যবহার করলাম, অসাধারণ রেজাল্ট। (Used for the first time, amazing result.)" },
  { id: 11, name: "Jannatul Ferdous", rating: 5, date: "2 weeks ago", comment: "Love the natural herbal extract smell. Very refreshing." },
  { id: 12, name: "Arif Chowdhury", rating: 4, date: "3 weeks ago", comment: "Good product. A bit different from liquid shampoo but better for hair." },
  { id: 13, name: "Sharmin Sultana", rating: 5, date: "3 weeks ago", comment: "রুক্ষ চুল এখন অনেক সফট। (Rough hair is now very soft.)" },
  { id: 14, name: "Imran Khan", rating: 5, date: "3 weeks ago", comment: "Highly effective against dandruff. Saw results in 3 washes." },
  { id: 15, name: "Tasnim Jara", rating: 5, date: "1 month ago", comment: "Completely natural and chemical free. Safe for the whole family." },
  { id: 16, name: "Rakib Hassan", rating: 5, date: "1 month ago", comment: "Best value for money. One bar lasts a long time." },
  { id: 17, name: "Sabrina Momtaz", rating: 5, date: "1 month ago", comment: "My hair texture has improved significantly." },
  { id: 18, name: "Fahim Uddin", rating: 5, date: "1 month ago", comment: "প্রাকৃতিক উপাদানে তৈরি তাই কোনো পার্শ্বপ্রতিক্রিয়া নেই। (Made of natural ingredients so no side effects.)" },
  { id: 19, name: "Mahiya Mahi", rating: 5, date: "1 month ago", comment: "Simply the best shampoo bar in Bangladesh." },
  { id: 20, name: "Sajidul Islam", rating: 4, date: "1 month ago", comment: "Keeps hair oil-free for longer periods." },
  { id: 21, name: "Nazmun Nahar", rating: 5, date: "2 months ago", comment: "Highly recommended for hair regrowth." },
  { id: 22, name: "Kamrul Hasan", rating: 5, date: "2 months ago", comment: "চুলের গোড়া শক্ত করে। (Strengthens hair roots.)" },
  { id: 23, name: "Laila Yeasmin", rating: 5, date: "2 months ago", comment: "Eco-friendly and hair-friendly. What more do you need?" },
  { id: 24, name: "Zubayer Ahmed", rating: 5, date: "2 months ago", comment: "Excellent product quality. Fast delivery too." }
];

const ProductLanding: React.FC<ProductLandingProps> = ({ mainProduct, otherProducts, onProductClick, onOrderNow }) => {
  const [showReviews, setShowReviews] = useState(false);

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
           <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-indigo-200/20 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3"></div>
           <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-purple-200/20 rounded-full blur-[100px] -translate-x-1/3 translate-y-1/3"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-8 w-full relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          
          {/* Text Content */}
          <div className="lg:col-span-6 flex flex-col justify-center order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 self-start bg-white border border-indigo-50 px-3 py-1.5 md:px-4 md:py-2 rounded-full shadow-sm mb-6 md:mb-8 animate-fadeIn">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600"></span>
              </span>
              <span className="text-[10px] md:text-xs font-black text-indigo-900 uppercase tracking-widest">Featured Drop</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-gray-900 leading-[1.1] mb-4 md:mb-6 tracking-tight">
              {mainProduct.name}
            </h1>
            
            <div className="text-base md:text-lg text-gray-500 mb-6 md:mb-8 leading-relaxed max-w-lg font-medium whitespace-pre-wrap">
              {mainProduct.description.substring(0, 200)}...
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
                <span>Buy Now</span>
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
              </button>
              <button 
                onClick={() => onProductClick(mainProduct)}
                className="bg-white text-[#111827] px-8 py-4 md:px-10 md:py-5 rounded-2xl font-black text-base md:text-lg border border-gray-200 hover:bg-gray-50 transition-all"
              >
                View Details
              </button>
            </div>
          </div>

          {/* Image Content */}
          <div className="lg:col-span-6 relative order-1 lg:order-2">
             <div 
               className="relative aspect-[4/5] lg:aspect-square bg-white rounded-[32px] md:rounded-[40px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden group"
             >
                <img 
                  src={mainProduct.images[0]} 
                  alt={mainProduct.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                
                {/* Floating Badge (Clickable Review Trigger) */}
                <div 
                  onClick={() => setShowReviews(true)}
                  className="absolute bottom-4 right-4 md:bottom-8 md:right-8 bg-white/90 backdrop-blur-md px-4 py-3 md:px-6 md:py-4 rounded-2xl md:rounded-3xl shadow-lg border border-white/50 flex flex-col items-center animate-bounce cursor-pointer hover:bg-white hover:scale-110 transition-all group/badge"
                  style={{ animationDuration: '3s' }}
                >
                   <span className="text-xl md:text-2xl group-hover/badge:scale-125 transition-transform">⭐</span>
                   <span className="text-xs md:text-sm font-black text-gray-900 mt-1">{mainProduct.rating}/5</span>
                   <span className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider underline decoration-gray-300 underline-offset-2">{mainProduct.reviewCount} Reviews</span>
                </div>
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
               <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-50 rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl group-hover:bg-indigo-50 group-hover:scale-110 transition-all">{item.icon}</div>
               <div>
                 <h4 className="font-black text-gray-900 text-xs md:text-sm uppercase tracking-wider">{item.title}</h4>
                 <p className="text-[10px] md:text-xs text-gray-500 font-medium">{item.desc}</p>
               </div>
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
