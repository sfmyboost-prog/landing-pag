
import React, { useState } from 'react';
import { CartItem, Product } from '../types';

interface UserPanelProps {
  cart: CartItem[];
  wishlist: Product[];
  onViewProduct: (p: Product) => void;
  onPlaceOrder: (details: { name: string; email: string; phone: string; address: string; location: string }) => void;
}

const UserPanel: React.FC<UserPanelProps> = ({ cart, wishlist, onViewProduct, onPlaceOrder }) => {
  const [details, setDetails] = useState({
    name: 'Leslie Alexander',
    email: 'leslie.alex@example.com',
    phone: '+1 (555) 012-3456',
    address: '123 Elite St, Fashion District, New York, NY 10001',
    location: 'New York, USA'
  });

  const total = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  const handleSubmitOrder = () => {
    if (Object.values(details).some(v => !v)) {
      alert('Please fill in all customer details.');
      return;
    }
    onPlaceOrder(details);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 animate-fadeIn">
      <div className="flex flex-col lg:flex-row gap-12">
        <div className="lg:w-2/3">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-8 flex items-center gap-3">
            Your Selection
            <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{cart.length} Items</span>
          </h2>

          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-50 pb-4">Customer Delivery Details</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full Name</label>
                  <input type="text" value={details.name} onChange={e => setDetails({...details, name: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-1 focus:ring-indigo-100" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                  <input type="email" value={details.email} onChange={e => setDetails({...details, email: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-1 focus:ring-indigo-100" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone Number</label>
                  <input type="text" value={details.phone} onChange={e => setDetails({...details, phone: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-1 focus:ring-indigo-100" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">General Location</label>
                  <input type="text" value={details.location} onChange={e => setDetails({...details, location: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-1 focus:ring-indigo-100" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Shipping Address</label>
                <textarea value={details.address} onChange={e => setDetails({...details, address: e.target.value})} rows={2} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-1 focus:ring-indigo-100 resize-none" />
              </div>
            </div>

            {cart.map((item, idx) => (
              <div key={idx} className="flex items-center gap-6 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <img src={item.product.images[0]} className="w-20 h-24 rounded-xl object-cover" />
                <div className="flex-grow">
                  <h4 className="font-bold text-gray-900">{item.product.name}</h4>
                  <div className="text-sm text-gray-400 mt-1">Qty: {item.quantity} | {item.selectedSize}</div>
                </div>
                <div className="text-indigo-600 font-extrabold">${(item.product.price * item.quantity).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:w-1/3">
          <div className="bg-gray-900 text-white rounded-[32px] p-8 shadow-2xl sticky top-24">
            <h3 className="text-xl font-bold mb-8">Summary</h3>
            <div className="space-y-4 mb-10 border-b border-gray-800 pb-8">
               <div className="flex justify-between text-gray-400 text-sm"><span>Subtotal</span><span>${total.toFixed(2)}</span></div>
               <div className="flex justify-between text-gray-400 text-sm"><span>Shipping</span><span className="text-green-400">FREE</span></div>
               <div className="flex justify-between font-bold text-2xl mt-4 text-white"><span>Total</span><span>${total.toFixed(2)}</span></div>
            </div>
            <button 
              onClick={handleSubmitOrder}
              disabled={cart.length === 0}
              className={`w-full py-5 rounded-2xl font-bold transition-all transform active:scale-95 shadow-xl ${
                cart.length === 0 ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-900'
              }`}
            >
              Secure Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPanel;
