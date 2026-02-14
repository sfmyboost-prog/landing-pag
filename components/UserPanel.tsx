
import React, { useState, useEffect } from 'react';
import { CartItem, Product, User, Order } from '../types';

interface UserPanelProps {
  cart: CartItem[];
  users: User[];
  orders: Order[];
  wishlist: Product[];
  onViewProduct: (p: Product) => void;
  onPlaceOrder: (details: { name: string; email: string; phone: string; address: string; location: string; zipCode: string; notes: string; courier: 'Pathao' | 'SteadFast' | '' }) => Promise<void>;
  onUpdateCartItem: (index: number, updates: Partial<CartItem>) => void;
  onRemoveFromCart: (index: number) => void;
  onCloseSuccess: () => void;
}

const CheckoutProductVisual: React.FC<{ item: CartItem, onRemove: () => void }> = ({ item, onRemove }) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    if (item.product.images.length <= 1) return;

    const interval = setInterval(() => {
      if (!isZoomed) { // Pause slider when zoomed
        setActiveImageIndex((prev) => (prev + 1) % item.product.images.length);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [item.product.images.length, activeImageIndex, isZoomed]);

  return (
    <div className="flex flex-col gap-8 animate-fadeIn">
      {/* Zoom Overlay */}
      {isZoomed && (
        <div 
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out transition-opacity duration-300"
          onClick={() => setIsZoomed(false)}
        >
          <img 
            src={item.product.images[activeImageIndex]} 
            alt={item.product.name} 
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl animate-scaleIn"
          />
        </div>
      )}

      {/* Product Header - Matching Screenshot */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h2 className="text-4xl font-black text-gray-900 tracking-tighter leading-none">{item.product.name}</h2>
          <div className="flex items-center gap-1.5">
            <div className="flex text-yellow-400">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className={`w-3.5 h-3.5 ${i < Math.floor(item.product.rating) ? 'fill-current' : 'text-gray-200 fill-current'}`} viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              ))}
            </div>
            <span className="text-[10px] font-bold text-gray-400 ml-1 uppercase tracking-widest">Premium Selection</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-5xl font-black text-[#5844FF] tracking-tighter leading-none">TK{item.product.price.toLocaleString()}</span>
          <button 
            onClick={onRemove} 
            className="mt-1 text-[10px] font-black text-gray-300 hover:text-red-500 uppercase tracking-widest transition-colors"
          >
            REMOVE ITEM
          </button>
        </div>
      </div>

      {/* Main Image Slider with Sliding Transition */}
      <div 
        className="w-full bg-white rounded-[44px] shadow-sm ring-1 ring-gray-100 overflow-hidden relative cursor-zoom-in group"
        onClick={() => setIsZoomed(true)}
      >
        <div 
          className="flex transition-transform duration-700 ease-in-out h-[600px] items-center" 
          style={{ transform: `translateX(-${activeImageIndex * 100}%)` }}
        >
          {item.product.images.map((img, idx) => (
            <div key={idx} className="min-w-full h-full flex justify-center items-center p-6">
              <img 
                src={img} 
                className="max-h-full max-w-full object-contain" 
                alt={`${item.product.name} view ${idx + 1}`} 
              />
            </div>
          ))}
        </div>
        {/* Overlay hint */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
           <div className="bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full text-white text-xs font-bold uppercase tracking-widest">
             Click to Zoom
           </div>
        </div>
      </div>

      {/* Thumbnails Section */}
      <div className="flex flex-col gap-6">
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 px-1">
          {item.product.images.map((img, imgIdx) => (
            <button 
              key={imgIdx} 
              onClick={() => setActiveImageIndex(imgIdx)}
              className={`relative flex-shrink-0 w-24 h-24 rounded-[24px] overflow-hidden bg-white border-2 transition-all hover:scale-105 ${activeImageIndex === imgIdx ? 'border-[#5844FF] shadow-lg shadow-[#5844FF]/20' : 'border-gray-100 opacity-60'}`}
            >
              <img src={img} className="w-full h-full object-cover" alt={`${item.product.name} thumb ${imgIdx}`} />
              {activeImageIndex === imgIdx && (
                <div className="absolute inset-0 border-4 border-[#5844FF] rounded-[24px] pointer-events-none" />
              )}
            </button>
          ))}
        </div>

        {/* Short Description - Below Images as requested */}
        {item.product.shortDescription && (
          <div className="mt-4 px-2">
            <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Product Overview</h4>
            <p className="text-gray-600 font-medium leading-relaxed max-w-2xl">
              {item.product.shortDescription}
            </p>
          </div>
        )}
      </div>
      
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

const UserPanel: React.FC<UserPanelProps> = ({ 
  cart, 
  users,
  orders,
  wishlist, 
  onViewProduct, 
  onPlaceOrder, 
  onUpdateCartItem,
  onRemoveFromCart,
  onCloseSuccess 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    location: 'Dhaka',
    zipCode: '',
    notes: '',
    courier: '' as 'Pathao' | 'SteadFast' | ''
  });
  
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const total = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const newErrors: Record<string, boolean> = {};
    if (!formData.name.trim()) newErrors.name = true;
    if (!formData.phone.trim()) newErrors.phone = true;
    if (!formData.address.trim()) newErrors.address = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      const finalPhone = formData.phone.startsWith('+880') ? formData.phone : `+880${formData.phone}`;
      await onPlaceOrder({ ...formData, phone: finalPhone });
      setShowSuccess(true);
    } catch (err) {
      alert('Order failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (value.trim()) {
      setErrors(prev => ({ ...prev, [field]: false }));
    }
  };

  if (showSuccess) {
    return (
      <div className="max-w-xl mx-auto py-20 px-6 text-center animate-fadeIn">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
        </div>
        <h2 className="text-4xl font-black text-gray-900 mb-4">Order Placed!</h2>
        <p className="text-gray-500 text-lg mb-10 font-medium">Your premium selection is being prepared for dispatch. We will notify you once it's on the way.</p>
        <button onClick={onCloseSuccess} className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-black transition-colors">Continue Shopping</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 animate-fadeIn min-h-[70vh]">
      {cart.length > 0 ? (
        <div className="flex flex-col lg:flex-row gap-16">
          {/* Main Content: Product Details & Form */}
          <div className="lg:w-2/3 space-y-20">
            <div className="space-y-16">
              {cart.map((item, idx) => (
                <CheckoutProductVisual key={idx} item={item} onRemove={() => onRemoveFromCart(idx)} />
              ))}
            </div>
            
            {/* Delivery Information Section - Enhanced look */}
            <div className="bg-[#EAEFF5] p-8 md:p-14 rounded-[50px] shadow-sm">
              <h3 className="text-3xl font-black text-gray-900 mb-12 tracking-tight">Delivery Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-3">
                  <label className={`text-[11px] font-black uppercase tracking-widest ml-1 ${errors.name ? 'text-red-500' : 'text-gray-400'}`}>
                    FULL NAME
                  </label>
                  <input 
                    value={formData.name} 
                    onChange={e => handleInputChange('name', e.target.value)}
                    className={`w-full px-6 py-5 bg-white rounded-2xl border-none outline-none font-bold shadow-sm transition-all focus:ring-2 ${errors.name ? 'ring-2 ring-red-500 text-red-600 placeholder:text-red-300' : 'focus:ring-indigo-100 text-gray-700'}`} 
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="space-y-3">
                  <label className={`text-[11px] font-black uppercase tracking-widest ml-1 ${errors.phone ? 'text-red-500' : 'text-gray-400'}`}>
                    PHONE NUMBER
                  </label>
                  <div className={`flex items-center bg-white rounded-2xl shadow-sm transition-all focus-within:ring-2 ${errors.phone ? 'ring-2 ring-red-500' : 'focus-within:ring-indigo-100'}`}>
                    <span className={`pl-6 py-5 font-bold border-r border-gray-100 pr-3 ${errors.phone ? 'text-red-500' : 'text-gray-400'}`}>+880</span>
                    <input 
                      type="tel"
                      value={formData.phone} 
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        handleInputChange('phone', val);
                      }}
                      className={`flex-grow px-4 py-5 bg-transparent border-none outline-none font-bold ${errors.phone ? 'text-red-600 placeholder:text-red-300' : 'text-gray-700'}`} 
                      placeholder="17XXXXXXXX"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-widest ml-1 text-gray-400">
                    EMAIL ADDRESS (OPTIONAL)
                  </label>
                  <input 
                    type="email"
                    value={formData.email} 
                    onChange={e => handleInputChange('email', e.target.value)}
                    className="w-full px-8 py-5 bg-white rounded-2xl border-none outline-none font-bold shadow-sm focus:ring-2 focus:ring-indigo-100 text-gray-700" 
                    placeholder="name@example.com"
                  />
                </div>

                <div className="md:col-span-2 space-y-3">
                  <label className={`text-[11px] font-black uppercase tracking-widest ml-1 ${errors.address ? 'text-red-500' : 'text-gray-400'}`}>
                    SHIPPING ADDRESS
                  </label>
                  <textarea 
                    value={formData.address} 
                    onChange={e => handleInputChange('address', e.target.value)}
                    rows={4} 
                    className={`w-full px-8 py-6 bg-white rounded-[32px] border-none outline-none font-bold shadow-sm resize-none transition-all focus:ring-2 ${errors.address ? 'ring-2 ring-red-500 text-red-600 placeholder:text-red-300' : 'focus:ring-indigo-100 text-gray-700'}`} 
                    placeholder="House No, Street, Area, City"
                  />
                </div>

                <div className="md:col-span-2 space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-widest ml-1 text-gray-400">
                    ORDER NOTES
                  </label>
                  <textarea 
                    value={formData.notes} 
                    onChange={e => handleInputChange('notes', e.target.value)}
                    rows={2} 
                    className="w-full px-8 py-5 bg-white rounded-2xl border-none outline-none font-bold shadow-sm resize-none transition-all focus:ring-2 focus:ring-indigo-100 text-gray-700" 
                    placeholder="Additional instructions..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Sidebar - Matching Screenshot */}
          <div className="lg:w-1/3">
            <div className="bg-[#111827] text-white rounded-[50px] p-10 md:p-14 sticky top-24 shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl translate-x-10 -translate-y-10" />
              
              <h3 className="text-3xl font-black mb-12 tracking-tight">Order Summary</h3>
              
              <div className="space-y-6 mb-12 border-b border-white/5 pb-12">
                 <div className="flex justify-between items-center text-gray-400 font-black uppercase text-[11px] tracking-widest">
                   <span>SUBTOTAL</span>
                   <span className="text-white text-base">TK{total.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between items-center text-gray-400 font-black uppercase text-[11px] tracking-widest">
                   <span>SHIPPING</span>
                   <span className="text-emerald-400 text-base">FREE</span>
                 </div>

                 <div className="pt-12 text-center">
                    <span className="text-gray-500 text-[11px] font-black uppercase tracking-[0.3em] block mb-2">TOTAL AMOUNT DUE</span>
                    <div className="flex items-start justify-center gap-1">
                       <span className="text-2xl font-black text-white/30 mt-4">TK</span>
                       <span className="text-7xl md:text-8xl font-black tracking-tighter text-white">{total.toLocaleString()}</span>
                    </div>
                 </div>
              </div>

              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-[#5844FF] hover:bg-[#4a36ff] text-white py-6 rounded-3xl font-black text-xl transition-all shadow-xl disabled:opacity-50 transform hover:scale-[1.02] active:scale-95 z-10 relative"
              >
                {isSubmitting ? 'Processing...' : 'Complete Purchase'}
              </button>
              
              <p className="text-[10px] text-gray-500 text-center mt-8 uppercase font-bold tracking-widest leading-loose">
                SECURE CHECKOUT POWERED BY DATAFLOW<br/>
                YOUR DATA IS PROTECTED
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          <div className="flex justify-between items-center border-b border-gray-100 pb-8">
            <h2 className="text-4xl font-black text-gray-900 tracking-tighter">My Dibba</h2>
          </div>
          
          {orders.length === 0 ? (
            <div className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest">Your Dibba is empty.</div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {orders.map((order) => (
                <div key={order.id} className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-8 group hover:border-[#5844FF]/30 transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center font-black text-[#5844FF] text-2xl group-hover:scale-110 transition-transform">
                      {order.id.slice(0, 2)}
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-900">Order #{order.id}</h4>
                      <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{new Date(order.timestamp).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center md:items-end gap-3">
                    <span className="text-3xl font-black text-slate-900 tracking-tighter">TK{order.totalPrice.toLocaleString()}</span>
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${order.orderStatus === 'Delivered' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {order.orderStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserPanel;
