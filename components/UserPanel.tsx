
import React, { useState, useRef, useEffect } from 'react';
import { CartItem, Product, User, Order } from '../types';

interface UserPanelProps {
  cart: CartItem[];
  users: User[];
  orders: Order[];
  wishlist: Product[];
  onViewProduct: (p: Product) => void;
  onPlaceOrder: (details: { name: string; email: string; phone: string; address: string; location: string; zipCode: string; courier: 'Pathao' | 'SteadFast' | '' }) => Promise<void>;
  onUpdateCartItem: (index: number, updates: Partial<CartItem>) => void;
  onRemoveFromCart: (index: number) => void;
  onCloseSuccess: () => void;
}

const CheckoutProductVisual: React.FC<{ item: CartItem, onRemove: () => void }> = ({ item, onRemove }) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (item.product.images.length <= 1) return;
    const interval = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % item.product.images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [item.product.images.length]);

  return (
    <div className="flex flex-col gap-10 animate-fadeIn">
      <div className="flex justify-between items-end border-b border-gray-100 pb-6">
        <div className="space-y-1">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-none">{item.product.name}</h2>
          <div className="flex items-center gap-1.5">
            {[...Array(5)].map((_, i) => (
              <svg key={i} className={`w-3.5 h-3.5 ${i < Math.floor(item.product.rating) ? 'text-yellow-400 fill-current' : 'text-gray-200 fill-current'}`} viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
            ))}
            <span className="text-[10px] font-bold text-gray-400 ml-1 uppercase tracking-widest">Premium Selection</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-3xl md:text-5xl font-black text-[#5844FF] tracking-tighter leading-none">${item.product.price.toFixed(2)}</span>
          <button onClick={onRemove} className="mt-2 text-xs font-black text-gray-300 hover:text-red-500 uppercase tracking-widest transition-colors">Remove Item</button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="w-full aspect-[4/3] md:aspect-[16/9] rounded-[40px] overflow-hidden bg-white shadow-inner ring-1 ring-gray-100 transition-all duration-500 relative group">
          <img 
            src={item.product.images[activeImageIndex]} 
            className="w-full h-full object-contain p-4 transition-opacity duration-500" 
            alt={item.product.name} 
            key={activeImageIndex} 
          />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2.5 z-20 bg-black/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
            {item.product.images.map((_, dotIdx) => (
              <div 
                key={dotIdx} 
                className={`h-1.5 rounded-full transition-all duration-500 ${activeImageIndex === dotIdx ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 px-1">
          {item.product.images.map((img, imgIdx) => (
            <button 
              key={imgIdx} 
              onClick={() => setActiveImageIndex(imgIdx)}
              className={`relative flex-shrink-0 w-24 h-24 rounded-[20px] overflow-hidden bg-white border-2 transition-all hover:scale-105 ${activeImageIndex === imgIdx ? 'border-[#5844FF] shadow-lg shadow-[#5844FF]/20' : 'border-gray-100'}`}
            >
              <img src={img} className="w-full h-full object-cover" alt={`${item.product.name} thumb ${imgIdx}`} />
            </button>
          ))}
        </div>
      </div>
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
  const [activeTab, setActiveTab] = useState<'checkout' | 'orders'>('checkout');
  const [details, setDetails] = useState({
    name: '',
    email: '',
    phone: '+880',
    address: '',
    location: '',
    zipCode: '',
    courier: '' as 'Pathao' | 'SteadFast' | ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  
  const total = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  useEffect(() => {
    if (cart.length === 0) {
      setActiveTab('orders');
    } else {
      setActiveTab('checkout');
    }
  }, [cart.length]);

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
  };

  const validatePhone = (phone: string) => {
    const bdPhoneRegex = /^\+8801[3-9]\d{8}$/;
    return bdPhoneRegex.test(phone.trim());
  };

  const handleSubmitOrder = async () => {
    const newErrors: Record<string, string> = {};
    if (!details.name.trim()) newErrors.name = 'Required';
    if (!details.email.trim() || !validateEmail(details.email)) newErrors.email = 'Correct the email.';
    if (details.phone === '+880' || !validatePhone(details.phone)) newErrors.phone = 'Correct the number.';
    if (!details.location.trim()) newErrors.location = 'Required';
    if (!details.zipCode.trim()) newErrors.zipCode = 'Required';
    if (!details.address.trim()) newErrors.address = 'Required';
    if (!details.courier) newErrors.courier = 'Please select a courier';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsPlacingOrder(true);
    try {
        await onPlaceOrder(details);
        setActiveTab('orders');
        onCloseSuccess();
    } catch (err) {
        alert("Something went wrong. Please try again.");
    } finally {
        setIsPlacingOrder(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.startsWith('+880')) setDetails({...details, phone: val});
    else if (val === '' || val.length < 4) setDetails({...details, phone: '+880'});
    if(errors.phone) setErrors({...errors, phone: ''});
  };

  const getFieldClass = (fieldName: string) => {
    const base = "w-full rounded-2xl px-6 py-5 text-sm font-bold outline-none transition-all border-2";
    if (errors[fieldName]) {
      return `${base} border-red-600 bg-red-50 text-red-900 placeholder-red-400 focus:ring-0`;
    }
    return `${base} bg-white border-slate-200 focus:ring-4 focus:ring-indigo-100 focus:border-[#5844FF] text-slate-900`;
  };

  const getLabelClass = (fieldName: string) => {
    return `text-[11px] font-black uppercase tracking-widest ml-1 ${errors[fieldName] ? 'text-red-600' : 'text-slate-600'}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 animate-fadeIn min-h-[70vh]">
      <div className="flex border-b border-gray-100 mb-12 overflow-x-auto no-scrollbar gap-8">
        <button 
          onClick={() => cart.length > 0 && setActiveTab('checkout')}
          className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'checkout' ? 'text-[#5844FF]' : 'text-gray-400 hover:text-gray-600'} ${cart.length === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
          Secure Checkout
          {activeTab === 'checkout' && <div className="absolute bottom-0 left-0 w-full h-1 bg-[#5844FF] rounded-t-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('orders')}
          className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'orders' ? 'text-[#5844FF]' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Dibba {orders.length > 0 && `(${orders.length})`}
          {activeTab === 'orders' && <div className="absolute bottom-0 left-0 w-full h-1 bg-[#5844FF] rounded-t-full" />}
        </button>
      </div>

      {activeTab === 'checkout' ? (
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="lg:w-2/3 space-y-12">
            <section className="bg-white p-6 md:p-12 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden">
              <div className="space-y-20">
                {cart.map((item, idx) => (
                  <CheckoutProductVisual 
                    key={idx} 
                    item={item} 
                    onRemove={() => onRemoveFromCart(idx)} 
                  />
                ))}
              </div>
            </section>

            <section id="delivery-section" className="bg-white p-12 rounded-[40px] border border-gray-100 shadow-sm space-y-10 animate-fadeIn">
              <div className="pb-6 border-b border-gray-100">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Customer Delivery Details</h3>
                <p className="text-slate-500 text-xs font-bold mt-1 uppercase tracking-widest">Verify information for secure dispatch</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                   <label className={getLabelClass('name')}>Full Name</label>
                   <input 
                    type="text" 
                    placeholder="e.g. Kristin Watson" 
                    value={details.name} 
                    onChange={e => {setDetails({...details, name: e.target.value}); if(errors.name) setErrors({...errors, name: ''});}} 
                    className={getFieldClass('name')} 
                   />
                   {errors.name && <p className="text-[10px] font-black text-red-600 ml-1 uppercase">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                   <label className={getLabelClass('email')}>Email Address</label>
                   <input 
                    type="email" 
                    placeholder="mail@example.com" 
                    value={details.email} 
                    onChange={e => {setDetails({...details, email: e.target.value}); if(errors.email) setErrors({...errors, email: ''});}} 
                    className={getFieldClass('email')} 
                   />
                   {errors.email && <p className="text-[10px] font-black text-red-600 ml-1 uppercase">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                   <label className={getLabelClass('phone')}>Phone Number (BD)</label>
                   <input 
                    type="text" 
                    value={details.phone} 
                    onChange={handlePhoneChange} 
                    className={getFieldClass('phone')} 
                   />
                   {errors.phone && <p className="text-[10px] font-black text-red-600 ml-1 uppercase">{errors.phone}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className={getLabelClass('location')}>General Location</label>
                     <input 
                      type="text" 
                      placeholder="City, Area" 
                      value={details.location} 
                      onChange={e => {setDetails({...details, location: e.target.value}); if(errors.location) setErrors({...errors, location: ''});}} 
                      className={getFieldClass('location')} 
                     />
                     {errors.location && <p className="text-[10px] font-black text-red-600 ml-1 uppercase">{errors.location}</p>}
                  </div>
                  <div className="space-y-2">
                     <label className={getLabelClass('zipCode')}>Zip Code</label>
                     <input 
                      type="text" 
                      placeholder="e.g. 1200" 
                      value={details.zipCode} 
                      onChange={e => {setDetails({...details, zipCode: e.target.value}); if(errors.zipCode) setErrors({...errors, zipCode: ''});}} 
                      className={getFieldClass('zipCode')} 
                     />
                     {errors.zipCode && <p className="text-[10px] font-black text-red-600 ml-1 uppercase">{errors.zipCode}</p>}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className={getLabelClass('address')}>Shipping Address</label>
                <textarea 
                  placeholder="House #, Road #, Detailed Location..." 
                  value={details.address} 
                  onChange={e => {setDetails({...details, address: e.target.value}); if(errors.address) setErrors({...errors, address: ''});}} 
                  rows={3} 
                  className={`${getFieldClass('address')} resize-none`} 
                />
                {errors.address && <p className="text-[10px] font-black text-red-600 ml-1 uppercase">{errors.address}</p>}
              </div>

              <div className="space-y-6 pt-4">
                 <span className={getLabelClass('courier')}>Choose Delivery Method</span>
                 <div className="grid grid-cols-2 gap-4">
                    {['Pathao', 'SteadFast'].map(c => (
                       <button key={c} type="button" onClick={() => {setDetails({...details, courier: c as any}); if(errors.courier) setErrors({...errors, courier: ''});}} className={`p-6 rounded-[28px] border-2 transition-all flex items-center justify-between group ${details.courier === c ? 'border-[#5844FF] bg-[#5844FF]/5 shadow-lg' : errors.courier ? 'border-red-400 bg-red-50' : 'border-slate-100 bg-white hover:border-slate-300'}`}>
                          <span className={`text-sm font-black uppercase tracking-widest ${details.courier === c ? 'text-[#5844FF]' : errors.courier ? 'text-red-600' : 'text-slate-500'}`}>{c} Courier</span>
                          <div className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${details.courier === c ? 'border-[#5844FF] bg-[#5844FF]' : errors.courier ? 'border-red-500' : 'border-slate-300'}`}>
                             {details.courier === c && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                       </button>
                    ))}
                 </div>
                 {errors.courier && <p className="text-[10px] font-black text-red-600 ml-1 uppercase">Please select a delivery partner</p>}
              </div>
            </section>
          </div>

          <div className="lg:w-1/3">
            <div className="bg-[#111827] text-white rounded-[44px] p-12 sticky top-24 shadow-2xl border border-white/5">
              <h3 className="text-2xl font-black mb-10 tracking-tight text-white">Order Summary</h3>
              <div className="space-y-5 mb-10 border-b border-white/10 pb-10">
                 <div className="flex justify-between text-gray-400 text-sm font-bold uppercase tracking-wider"><span>Subtotal</span><span className="text-white">${total.toFixed(2)}</span></div>
                 <div className="flex justify-between text-gray-400 text-sm font-bold uppercase tracking-wider"><span>Shipping</span><span className="text-emerald-400 font-black">FREE</span></div>
                 <div className="pt-10 text-center">
                    <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] block mb-4">Total Amount Due</span>
                    <div className="flex items-start justify-center">
                       <span className="text-2xl font-black text-white/40 mt-2">$</span>
                       <span className="text-7xl font-black tracking-tighter text-white">{total.toFixed(2)}</span>
                    </div>
                 </div>
              </div>
              <button 
                 onClick={handleSubmitOrder} 
                 disabled={isPlacingOrder} 
                 className="w-full py-6 rounded-[28px] bg-[#5844FF] hover:bg-[#4a36e0] text-white font-black text-xl transition-all transform active:scale-95 disabled:opacity-50 shadow-xl shadow-[#5844FF]/20 flex items-center justify-center gap-3"
              >
                {isPlacingOrder ? (
                  <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : 'Confirm Order Now'}
              </button>
              <p className="text-[9px] font-black text-gray-500 mt-8 text-center uppercase tracking-widest leading-relaxed px-4 opacity-50">Verified Secure Transaction</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div>
               <h2 className="text-4xl font-black text-slate-900 tracking-tight">Dibba Activity</h2>
               <p className="text-slate-500 text-sm font-medium mt-2">Historical archive of your confirmed selections from Amar Bazari.</p>
            </div>
            <button onClick={() => window.location.reload()} className="px-6 py-3 rounded-2xl bg-white border border-slate-200 text-xs font-black text-[#5844FF] uppercase tracking-widest shadow-sm hover:shadow-md transition-all">New Order</button>
          </div>
          
          {orders.length === 0 ? (
            <div className="bg-white p-24 rounded-[48px] border border-dashed border-slate-200 text-center shadow-inner">
              <p className="text-slate-400 font-bold text-lg">No orders confirmed in your Dibba.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {orders.map((order) => (
                <div key={order.id} className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-8 group hover:border-[#5844FF]/30 transition-all hover:shadow-lg">
                  <div className="flex items-center gap-8">
                    <div className="w-16 h-16 rounded-[24px] bg-slate-50 flex items-center justify-center text-[#5844FF]/20 font-black text-2xl">#</div>
                    <div>
                      <h4 className="text-xl font-black text-slate-900 tracking-tight">Order #{order.id}</h4>
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">{new Date(order.timestamp).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center md:items-end gap-3">
                    <span className="text-3xl font-black text-slate-900 tracking-tighter">${order.totalPrice.toFixed(2)}</span>
                    <span className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-sm ${
                      order.orderStatus === 'Delivered' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-[#5844FF]'
                    }`}>{order.orderStatus}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.6s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default UserPanel;
