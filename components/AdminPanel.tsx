
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, Order, User, StoreSettings, CourierSettings, PixelSettings, Category, TwoFactorSettings } from '../types';
import { CourierService } from '../CourierService';
import { api } from '../BackendAPI';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

interface AdminPanelProps {
  products: Product[];
  categories: Category[];
  orders: Order[];
  users: User[];
  storeSettings: StoreSettings;
  courierSettings?: CourierSettings;
  pixelSettings?: PixelSettings;
  onUpdate: (p: Product) => void;
  onAdd: (p: Product) => void;
  onDelete: (id: string) => void;
  onUpdateOrder: (o: Order) => void;
  onUpdateUser: (u: User) => void;
  onUpdateSettings: (s: StoreSettings) => void;
  onUpdateCourierSettings?: (s: CourierSettings) => void;
  onUpdatePixelSettings?: (s: PixelSettings) => void;
  onAddCategory: (cat: string) => void;
  onDeleteCategory: (id: string) => void;
  onUpdateCategory?: (cat: Category) => void;
  onLogout: () => void;
}

const Sparkline: React.FC<{ data: number[], color: string }> = ({ data, color }) => {
  if (data.length === 0) return null;
  const max = Math.max(...data) || 1;
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 100;
  const height = 30;
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((d - min) / range) * height
  }));
  const path = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
  
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-8 overflow-visible">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.2 }} />
          <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <path d={`${path} L ${width},${height} L 0,${height} Z`} fill={`url(#grad-${color})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
};

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  products, categories, orders, users, storeSettings, courierSettings, pixelSettings,
  onUpdate, onAdd, onDelete, onUpdateOrder, onUpdateUser, 
  onUpdateSettings, onUpdateCourierSettings, onUpdatePixelSettings, onAddCategory, onDeleteCategory, onLogout 
}) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [courierTarget, setCourierTarget] = useState<Order | null>(null);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [courierBalances, setCourierBalances] = useState<Record<string, string>>({});
  
  const [dashData, setDashData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [salesScale, setSalesScale] = useState(1); 
  
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [twoFactorSettings, setTwoFactorSettings] = useState<TwoFactorSettings>({ enabled: false, secret: '' });
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  const refreshDashboard = async () => {
    const data = await api.getDashboardMetrics();
    setDashData(data);
    setIsLoading(false);
  };

  const loadAuthSettings = async () => {
    const settings = await api.getTwoFactorSettings();
    setTwoFactorSettings(settings);
    generateQrCode(settings.secret);
  };

  const generateQrCode = async (secret: string) => {
    try {
      const totp = new OTPAuth.TOTP({
        issuer: 'Dataflow',
        label: 'Admin',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: secret,
      });
      const url = totp.toString();
      const dataUrl = await QRCode.toDataURL(url);
      setQrCodeUrl(dataUrl);
    } catch (e) {
      console.error('Failed to generate QR code', e);
    }
  };

  const handleSystemReset = async () => {
    if (confirm("Reset everything to zero? This will cancel all stats and current order counts.")) {
      await api.clearSystemData();
      await refreshDashboard();
      setToast({ message: "System metrics reset to zero.", type: 'success' });
    }
  };

  useEffect(() => {
    refreshDashboard();
    loadAuthSettings();
    const interval = setInterval(refreshDashboard, 5000); 
    return () => clearInterval(interval);
  }, []);

  const [dispatchSelections, setDispatchSelections] = useState<Record<string, 'Pathao' | 'SteadFast'>>({});
  const [isVerifyingPixel, setIsVerifyingPixel] = useState(false);
  const [isVerifyingCourier, setIsVerifyingCourier] = useState<string | null>(null);
  const [pixelError, setPixelError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 8000); // Longer timeout for complex errors
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.productId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOrders = orders.filter(o => 
    o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.id.includes(searchQuery)
  );

  const handleSendOrderToCourier = async (order: Order, courier: 'Pathao' | 'SteadFast') => {
    setProcessingOrderId(order.id);
    try {
      let result;
      if (courier === 'Pathao') {
        result = await CourierService.sendToPathao(order, courierSettings?.pathao || {} as any);
      } else {
        result = await CourierService.sendToSteadfast(order, courierSettings?.steadfast || {} as any);
      }
      const trackingId = result.consignment_id || result.tracking_code || result.id || (result.data?.consignment_id);
      onUpdateOrder({
        ...order,
        courierName: courier,
        courierTrackingId: trackingId,
        orderStatus: 'Shipped'
      });
      setToast({ 
        message: `Shipment created via ${courier}. ID: ${trackingId}`, 
        type: 'success' 
      });
    } catch (err: any) {
      setToast({ 
        message: err.message || 'Dispatch failed.', 
        type: 'error' 
      });
    } finally {
      setProcessingOrderId(null);
      setCourierTarget(null);
    }
  };

  const handleVerifyCourierConnection = async (type: 'Pathao' | 'SteadFast') => {
    setIsVerifyingCourier(type);
    try {
      if (type === 'Pathao') {
        await CourierService.verifyPathaoConnection(courierSettings?.pathao || {} as any);
        setToast({ message: `Pathao connection verified successfully.`, type: 'success' });
      } else {
        const balanceData = await CourierService.verifySteadfastConnection(courierSettings?.steadfast || {} as any);
        if (balanceData && balanceData.current_balance !== undefined) {
          setCourierBalances(prev => ({ ...prev, SteadFast: balanceData.current_balance }));
          setToast({ message: `SteadFast verified. Balance: TK ${balanceData.current_balance}`, type: 'success' });
        } else {
          setToast({ message: `SteadFast connection verified.`, type: 'success' });
        }
      }
    } catch (err: any) {
      setToast({ message: `Verification failed: ${err.message}`, type: 'error' });
    } finally {
      setIsVerifyingCourier(null);
    }
  };

  const handlePixelConnect = async () => {
    if (!pixelSettings?.pixelId || !pixelSettings?.accessToken) {
      setPixelError("Pixel ID and Access Token are required.");
      return;
    }
    setIsVerifyingPixel(true);
    setPixelError(null);
    onUpdatePixelSettings?.({ ...pixelSettings, status: 'Connecting' });
    try {
      await CourierService.verifyPixelConnection(pixelSettings.pixelId, pixelSettings.accessToken);
      onUpdatePixelSettings?.({ ...pixelSettings, status: 'Active' });
      setToast({ message: "Meta Pixel integrated successfully.", type: 'success' });
    } catch (err: any) {
      setPixelError(err.message || "Pixel connection failed.");
      onUpdatePixelSettings?.({ ...pixelSettings, status: 'Inactive' });
    } finally {
      setIsVerifyingPixel(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setGalleryPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file as Blob);
      });
    }
  };

  const removeGalleryImage = (index: number) => {
    setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleRegenerateAuthSecret = () => {
    if (confirm("Are you sure? This will invalidate your existing authenticator connection.")) {
      const newSecret = new OTPAuth.Secret().base32;
      setTwoFactorSettings(prev => ({ ...prev, secret: newSecret }));
      generateQrCode(newSecret);
    }
  };

  const handleSaveAuthSettings = async () => {
    await api.saveTwoFactorSettings(twoFactorSettings);
    setToast({ message: "Authentication settings updated successfully.", type: 'success' });
  };

  const renderDashboard = () => {
    if (isLoading || !dashData) return (
      <div className="flex items-center justify-center h-64 animate-pulse">
        <div className="text-gray-300 font-black text-xl tracking-tighter uppercase">Initializing Data Matrix...</div>
      </div>
    );

    const scaledEarnings = dashData.totalEarnings * salesScale;
    const scaledProfit = dashData.totalProfit * salesScale;

    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="flex justify-between items-center px-2">
           <h3 className="text-3xl font-black text-gray-900 tracking-tight">Real-Time Insights</h3>
           <div className="flex items-center gap-4">
              <div className="flex items-center bg-white border border-gray-100 rounded-2xl px-4 py-2 shadow-sm gap-3">
                 <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Adjust Scale:</span>
                 <select 
                   value={salesScale} 
                   onChange={(e) => setSalesScale(parseFloat(e.target.value))}
                   className="bg-transparent border-none outline-none font-black text-indigo-600 text-xs cursor-pointer"
                 >
                    <option value="0.5">50% (Low)</option>
                    <option value="1">100% (Normal)</option>
                    <option value="1.5">150% (High)</option>
                    <option value="2">200% (Surge)</option>
                 </select>
              </div>
              <button 
                onClick={handleSystemReset}
                className="bg-red-50 hover:bg-red-100 text-red-500 px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm border border-red-100"
              >
                Reset All
              </button>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total Earnings', value: `TK ${scaledEarnings.toLocaleString()}`, color: '#22c55e', icon: '💰', series: dashData.revenueSeries.slice(-7).map((v: any) => v * salesScale) },
            { label: 'Total Orders', value: dashData.totalOrders, color: '#f97316', icon: '🛍️', series: dashData.orderSeries.slice(-7) },
            { label: 'Customers', value: dashData.customers, color: '#6366f1', icon: '👥', series: [10, 25, 45, 30, 60, 80, 95] },
            { label: 'Total Profit', value: `TK ${scaledProfit.toLocaleString()}`, color: '#3b82f6', icon: '💎', series: dashData.revenueSeries.map((v: any) => v * 0.4 * salesScale).slice(-7) },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col transition-all hover:shadow-xl hover:-translate-y-1">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50 text-xl" style={{ color: stat.color }}>{stat.icon}</div>
                   <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                      <div className="flex items-center gap-1.5 text-emerald-500 text-[10px] font-bold">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4l-8 8h16l-8-8z"/></svg>
                        1.56%
                      </div>
                   </div>
                </div>
              </div>
              <h4 className="text-2xl font-black text-gray-900 tracking-tight mb-4">{stat.value}</h4>
              <Sparkline data={stat.series} color={stat.color} />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
           <div className="xl:col-span-8 bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
             <div className="flex justify-between items-center mb-10">
               <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">Live Activity Stream</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Orders appearing as they occur</p>
               </div>
               <span className="w-3 h-3 bg-emerald-500 rounded-full animate-ping"></span>
             </div>
             
             {dashData.recentOrders.length > 0 ? (
               <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-50 text-gray-400 text-[9px] font-black uppercase tracking-widest">
                        <th className="pb-4">ORDER</th>
                        <th className="pb-4">CUSTOMER</th>
                        <th className="pb-4">TOTAL</th>
                        <th className="pb-4">STATUS</th>
                        <th className="pb-4 text-right">TIME</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {dashData.recentOrders.map((order: Order) => (
                        <tr key={order.id} className="group hover:bg-gray-50/50 transition-colors">
                          <td className="py-5">
                            <span className="font-bold text-gray-900">#{order.id}</span>
                          </td>
                          <td className="py-5">
                            <div className="text-sm font-black text-gray-900">{order.customerName}</div>
                            <div className="text-[10px] font-medium text-gray-400">{order.customerPhone}</div>
                          </td>
                          <td className="py-5">
                            <span className="font-black text-indigo-600">TK {order.totalPrice.toLocaleString()}</span>
                          </td>
                          <td className="py-5">
                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                              order.orderStatus === 'Pending' ? 'bg-amber-50 text-amber-600' :
                              order.orderStatus === 'Delivered' ? 'bg-emerald-50 text-emerald-600' :
                              'bg-indigo-50 text-indigo-600'
                            }`}>
                              {order.orderStatus}
                            </span>
                          </td>
                          <td className="py-5 text-right">
                             <span className="text-[10px] font-bold text-gray-400">{new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
             ) : (
               <div className="py-20 text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">📦</div>
                  <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Awaiting Transmissions...</p>
               </div>
             )}
           </div>

           <div className="xl:col-span-4 bg-[#111827] p-10 rounded-[3rem] text-white shadow-2xl overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700"></div>
              <div className="relative z-10">
                 <h3 className="text-2xl font-black tracking-tight mb-2">Analysis System</h3>
                 <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-10">Scalable Performance Metrics</p>
                 
                 <div className="space-y-10">
                    <div>
                       <div className="flex justify-between items-end mb-4">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Revenue Flow</span>
                          <span className="text-xl font-black text-emerald-400">+{Math.round((salesScale - 1) * 100)}%</span>
                       </div>
                       <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 transition-all duration-1000" 
                            style={{ width: `${Math.min(100, (salesScale / 2) * 100)}%` }}
                          ></div>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                       <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Projected ROI</p>
                          <h4 className="text-xl font-black text-white">42.8%</h4>
                       </div>
                       <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Volatility</p>
                          <h4 className="text-xl font-black text-white">Normal</h4>
                       </div>
                    </div>

                    <div className="pt-8 border-t border-white/5">
                       <p className="text-gray-400 text-sm leading-relaxed mb-8">
                         Market conditions are currently {salesScale > 1.2 ? 'Hyperactive' : salesScale < 0.8 ? 'Stagnant' : 'Optimal'}. 
                       </p>
                       <button 
                         onClick={() => setSalesScale(1)}
                         className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-white/5"
                       >
                         Normalize Projections
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    );
  };

  const renderProductOptions = () => (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm gap-4">
        <div className="relative w-full md:w-96">
          <input 
            type="text" 
            placeholder="Search catalog..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-gray-50 rounded-[20px] border-none outline-none font-bold text-gray-700 placeholder:text-gray-300 focus:ring-2 focus:ring-indigo-600/10 transition-all"
          />
          <svg className="w-6 h-6 absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
        <button 
          onClick={() => {
            setGalleryPreviews([]);
            setIsAddingProduct(true);
          }}
          className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-[20px] font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
          Add New Product
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filteredProducts.map(product => (
          <div key={product.id} className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden group hover:shadow-2xl hover:-translate-y-1 transition-all duration-500">
            <div className="h-64 relative overflow-hidden bg-gray-50">
              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
              <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={() => onDelete(product.id)} className="p-3 bg-white/90 backdrop-blur-md rounded-2xl text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </div>
            <div className="p-8">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{product.category}</span>
                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-md">{product.productId}</span>
              </div>
              <h4 className="font-black text-gray-900 mb-3 truncate group-hover:text-indigo-600 transition-colors">{product.name}</h4>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl font-black text-gray-900">TK{product.price.toLocaleString()}</span>
                <span className="text-sm font-bold text-gray-300 line-through">TK{product.originalPrice.toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button onClick={() => onUpdate({ ...product, isActive: !product.isActive })} className="py-3.5 bg-gray-50 rounded-2xl text-[10px] font-black text-gray-500 uppercase tracking-widest hover:bg-indigo-50 hover:text-indigo-600 transition-all">
                  {product.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => onUpdate({ ...product, isMain: !product.isMain })} className={`py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${product.isMain ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-50 text-gray-500 hover:bg-indigo-50'}`}>
                  {product.isMain ? 'Featured' : 'Feature'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isAddingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[500] flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-[#EAEFF5] rounded-[40px] w-full max-w-4xl p-10 shadow-2xl animate-fadeIn my-auto relative overflow-hidden">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-black tracking-tight text-[#111827]">Product Registration</h2>
              <button onClick={() => setIsAddingProduct(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);
              const imageUrlInput = (formData.get('imageUrl') as string);
              const allImages = [...galleryPreviews];
              if (imageUrlInput) allImages.unshift(imageUrlInput);
              if (allImages.length === 0) { alert("Please provide at least one product image."); return; }

              const newP: Product = {
                id: Math.random().toString(36).substr(2, 9),
                name: formData.get('title') as string,
                description: formData.get('desc') as string,
                price: Number(formData.get('salePrice')),
                originalPrice: Number(formData.get('discountPrice')),
                purchaseCost: Number(formData.get('yourPrice')),
                internalPrice: Number(formData.get('ourPrice')),
                images: allImages,
                colors: ["#000000"],
                sizes: ["M", "L"],
                productId: `#SKU-${Math.floor(Math.random()*9000+1000)}`,
                category: "Apparel",
                deliveryRegions: ["Global"],
                isActive: true,
                stock: 100,
                rating: 5,
                reviewCount: 0
              };
              onAdd(newP);
              setIsAddingProduct(false);
              setGalleryPreviews([]);
              setToast({ message: "Product listed successfully", type: 'success' });
            }} className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">PRODUCT TITLE</label>
                  <input name="title" required className="w-full px-6 py-4 bg-white rounded-2xl border-none outline-none font-bold text-gray-700 shadow-sm" placeholder="e.g. Minimalist Watch" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">PRODUCT DESCRIPTION</label>
                  <textarea name="desc" required rows={4} className="w-full px-6 py-4 bg-white rounded-2xl border-none outline-none font-bold text-gray-700 shadow-sm resize-none" placeholder="Elaborate features..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">PRIMARY IMAGE URL / GALLERY</label>
                  <div className="flex gap-3">
                    <input name="imageUrl" className="flex-grow px-6 py-4 bg-white rounded-2xl border-none outline-none font-bold text-gray-700 shadow-sm" placeholder="https://..." />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="px-6 h-14 bg-[#10B981] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm">UPLOADED</button>
                    <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </div>
                  {galleryPreviews.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-3 animate-fadeIn">
                       {galleryPreviews.map((preview, idx) => (
                         <div key={idx} className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-white shadow-md">
                            <img src={preview} className="w-full h-full object-cover" />
                            <button type="button" onClick={() => removeGalleryImage(idx)} className="absolute top-1 right-1 bg-white/90 rounded-full p-1 text-red-500 shadow-sm"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                         </div>
                       ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">SALE PRICE</label>
                    <div className="relative">
                       <input name="salePrice" type="number" required className="w-full px-12 py-4 bg-[#ECFDF5] rounded-2xl border-none outline-none font-black text-[#10B981] shadow-sm" placeholder="0" />
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#10B981] font-black text-xs">TK</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">DISCOUNT PRICE (ORIG)</label>
                    <div className="relative">
                       <input name="discountPrice" type="number" required className="w-full px-12 py-4 bg-white rounded-2xl border-none outline-none font-black text-gray-400 shadow-sm" placeholder="0" />
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 font-black text-xs">TK</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 p-8 bg-[#F0F5FF] rounded-[32px] border border-white shadow-sm">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">YOUR PRICE (COST)</label>
                    <input name="yourPrice" type="number" required className="w-full px-6 py-4 bg-white rounded-2xl border-none outline-none font-black text-rose-500 shadow-sm" placeholder="10" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">OUR PRICE (INT)</label>
                    <input name="ourPrice" type="number" required className="w-full px-6 py-4 bg-white rounded-2xl border-none outline-none font-black text-[#5844FF] shadow-sm" placeholder="12" />
                  </div>
                </div>

                <div className="pt-6 relative">
                  <button type="submit" className="w-full bg-[#111827] text-white py-6 rounded-3xl font-black text-lg shadow-xl hover:bg-black transition-all">Confirm Listing</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const renderOrders = () => (
    <div className="space-y-8 animate-fadeIn">
      <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                <th className="pb-6">ID</th>
                <th className="pb-6">Customer</th>
                <th className="pb-6">Total</th>
                <th className="pb-6">Status</th>
                <th className="pb-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-6 font-bold text-gray-900">#{order.id}</td>
                  <td className="py-6">
                    <div className="text-gray-900 font-bold">{order.customerName}</div>
                    <div className="text-gray-400 text-xs">{order.customerPhone}</div>
                  </td>
                  <td className="py-6 font-black text-indigo-600">TK {order.totalPrice.toLocaleString()}</td>
                  <td className="py-6">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${order.orderStatus === 'Shipped' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-600'}`}>{order.orderStatus}</span>
                  </td>
                  <td className="py-6 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {!order.courierTrackingId && (
                        <button 
                          onClick={() => setCourierTarget(order)}
                          className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          Send To Courier
                        </button>
                      )}
                      <button className="text-gray-300 font-bold text-[10px] uppercase tracking-widest hover:text-indigo-600 transition-colors">Details</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderCourierDispatch = () => (
    <div className="space-y-8 animate-fadeIn pb-20">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {(courierTarget ? [courierTarget] : filteredOrders.filter(o => !o.courierTrackingId)).map(order => (
          <div key={order.id} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-xl transition-all">
            <div className="p-8 border-b border-gray-50 flex justify-between items-start">
              <div className="flex gap-4 items-center">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center font-black text-indigo-600 text-xl">#{order.id.slice(-4)}</div>
                <div>
                  <h4 className="font-black text-gray-900 leading-tight">{order.customerName}</h4>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{order.customerPhone}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-indigo-600">TK {order.totalPrice.toLocaleString()}</span>
              </div>
            </div>
            <div className="px-8 py-8">
               <div className="flex items-center gap-4">
                  <select 
                    value={dispatchSelections[order.id] || ''}
                    onChange={(e) => setDispatchSelections({ ...dispatchSelections, [order.id]: e.target.value as any })}
                    className="flex-grow h-14 px-6 bg-gray-50 border-none rounded-xl outline-none font-bold text-gray-700 text-sm appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-100 transition-all"
                  >
                    <option value="" disabled>Select Courier Service...</option>
                    <option value="Pathao">Pathao Delivery</option>
                    <option value="SteadFast">SteadFast Courier</option>
                  </select>
                  <button 
                    disabled={!!processingOrderId || !dispatchSelections[order.id]}
                    onClick={() => handleSendOrderToCourier(order, dispatchSelections[order.id])}
                    className={`h-14 px-8 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl ${
                      processingOrderId === order.id 
                        ? 'bg-indigo-300 text-white cursor-not-allowed' 
                        : 'bg-[#818CF8] text-white hover:bg-[#6366F1] shadow-indigo-100 active:scale-95 disabled:bg-gray-100 disabled:text-gray-300 disabled:shadow-none'
                    }`}
                  >
                    {processingOrderId === order.id ? 'PROCESSING...' : 'DISPATCH'}
                  </button>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderApiSettings = () => (
    <div className="max-w-4xl space-y-10 animate-fadeIn pb-20">
      <div className="bg-white p-12 rounded-[3rem] border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center text-2xl shadow-sm">📦</div>
            <div>
              <h3 className="text-3xl font-black text-gray-900 tracking-tight leading-none">Pathao Courier API</h3>
              <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-2">Configuration Module</p>
            </div>
          </div>
          <button 
            onClick={() => handleVerifyCourierConnection('Pathao')}
            disabled={!!isVerifyingCourier}
            className="px-6 py-3 bg-orange-50 text-orange-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-100 transition-all disabled:opacity-50"
          >
            {isVerifyingCourier === 'Pathao' ? 'Verifying...' : 'Verify Pathao'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            { label: 'Client ID', key: 'clientId', sub: 'pathao' },
            { label: 'Client Secret', key: 'clientSecret', sub: 'pathao' },
            { label: 'Store ID', key: 'storeId', sub: 'pathao' },
            { label: 'Username', key: 'username', sub: 'pathao' },
            { label: 'Password', key: 'password', sub: 'pathao', type: 'password' }
          ].map(field => (
            <div key={field.key} className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{field.label}</label>
              <input 
                type={field.type || 'text'} 
                value={(courierSettings?.pathao as any)?.[field.key] || ''} 
                onChange={e => onUpdateCourierSettings?.({ ...courierSettings!, pathao: { ...courierSettings!.pathao, [field.key]: e.target.value } })} 
                className="w-full px-8 py-5 bg-gray-50 rounded-[20px] border-none outline-none font-black text-gray-800 focus:ring-2 focus:ring-orange-100 transition-all" 
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-12 rounded-[3rem] border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-2xl shadow-sm">🚚</div>
            <div>
              <h3 className="text-3xl font-black text-gray-900 tracking-tight leading-none">SteadFast Courier API</h3>
              <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-2">Integration Module</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {courierBalances.SteadFast && (
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Live Balance</span>
                <span className="text-lg font-black text-emerald-600 leading-none">TK {courierBalances.SteadFast}</span>
              </div>
            )}
            <button 
              onClick={() => handleVerifyCourierConnection('SteadFast')}
              disabled={!!isVerifyingCourier}
              className="px-6 py-3 bg-blue-50 text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all disabled:opacity-50"
            >
              {isVerifyingCourier === 'SteadFast' ? 'Verifying...' : 'Verify SteadFast'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            { label: 'API Key', key: 'apiKey', sub: 'steadfast' },
            { label: 'Secret Key', key: 'secretKey', sub: 'steadfast' },
            { label: 'Merchant ID', key: 'merchantId', sub: 'steadfast' }
          ].map(field => (
            <div key={field.key} className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{field.label}</label>
              <input 
                type="text" 
                value={(courierSettings?.steadfast as any)?.[field.key] || ''} 
                onChange={e => onUpdateCourierSettings?.({ ...courierSettings!, steadfast: { ...courierSettings!.steadfast, [field.key]: e.target.value } })} 
                className="w-full px-8 py-5 bg-gray-50 rounded-[20px] border-none outline-none font-black text-gray-800 focus:ring-2 focus:ring-blue-100 transition-all" 
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPixelSetup = () => {
    const settings = pixelSettings || { pixelId: '', appId: '', accessToken: '', testEventCode: '', status: 'Inactive' };
    return (
      <div className="max-w-4xl space-y-10 animate-fadeIn pb-20">
        <div className="bg-white p-12 rounded-[3rem] border border-gray-100 shadow-sm">
          <div className="flex items-center gap-5 mb-10">
            <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-2xl shadow-sm">🎯</div>
            <div>
              <h3 className="text-3xl font-black text-gray-900 tracking-tight leading-none">Meta Pixel & CAPI</h3>
              <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-2">Conversion Tracking Module</p>
            </div>
          </div>

          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Pixel ID</label>
                <input 
                  type="text" 
                  value={settings.pixelId} 
                  onChange={e => onUpdatePixelSettings?.({ ...settings, pixelId: e.target.value })} 
                  className="w-full px-8 py-5 bg-gray-50 rounded-[20px] border-none outline-none font-black text-gray-800 focus:ring-2 focus:ring-indigo-100 transition-all" 
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">App ID</label>
                <input 
                  type="text" 
                  value={settings.appId} 
                  onChange={e => onUpdatePixelSettings?.({ ...settings, appId: e.target.value })} 
                  className="w-full px-8 py-5 bg-gray-50 rounded-[20px] border-none outline-none font-black text-gray-800 focus:ring-2 focus:ring-indigo-100 transition-all" 
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">System Access Token</label>
              <input 
                type="password" 
                value={settings.accessToken} 
                onChange={e => onUpdatePixelSettings?.({ ...settings, accessToken: e.target.value })} 
                className="w-full px-8 py-5 bg-gray-50 rounded-[20px] border-none outline-none font-black text-gray-800 focus:ring-2 focus:ring-indigo-100 transition-all" 
              />
            </div>

            {pixelError && (
              <div className="bg-red-50 text-red-500 p-6 rounded-2xl flex items-center gap-4 animate-fadeIn">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                <span className="font-bold text-sm">{pixelError}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-6 border-t border-gray-50">
               <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${settings.status === 'Active' ? 'bg-emerald-500 animate-pulse' : settings.status === 'Connecting' ? 'bg-amber-500 animate-pulse' : 'bg-gray-300'}`}></div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Connection Status: {settings.status}</span>
               </div>
               <button 
                  onClick={handlePixelConnect}
                  disabled={isVerifyingPixel}
                  className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2"
               >
                  {isVerifyingPixel ? 'Verifying...' : 'Test Connection'}
               </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAuthentication = () => (
    <div className="max-w-4xl space-y-10 animate-fadeIn pb-20">
      <div className="bg-white p-12 rounded-[3rem] border border-gray-100 shadow-sm">
        <div className="flex items-center gap-5 mb-10">
          <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-2xl shadow-sm">🔐</div>
          <div>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight leading-none">Two-Factor Authentication</h3>
            <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-2">Admin Security Module</p>
          </div>
        </div>

        <div className="space-y-10">
          <div className="flex items-center justify-between p-8 bg-gray-50 rounded-[2.5rem]">
            <div>
              <h4 className="text-lg font-black text-gray-900">Enable 2FA</h4>
              <p className="text-sm text-gray-500 font-medium">Require a 6-digit TOTP code during login</p>
            </div>
            <button 
              onClick={() => setTwoFactorSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
              className={`w-16 h-8 rounded-full transition-all relative ${twoFactorSettings.enabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${twoFactorSettings.enabled ? 'left-9' : 'left-1 shadow-sm'}`}></div>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Secret Key (Base32)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    readOnly
                    value={twoFactorSettings.secret} 
                    className="w-full px-8 py-5 bg-gray-50 rounded-[20px] border-none outline-none font-black text-indigo-600 font-mono text-sm" 
                  />
                  <button onClick={() => { navigator.clipboard.writeText(twoFactorSettings.secret); setToast({ message: 'Secret copied to clipboard', type: 'success' }); }} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-indigo-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-3 8h3m-3 4h3m-6-4h.01M9 17h.01"/></svg>
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={handleRegenerateAuthSecret}
                  className="w-full py-4 bg-orange-50 text-orange-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-100 transition-all border border-orange-100"
                >
                  Regenerate Secret Key
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-6 bg-white border border-gray-100 rounded-[2.5rem] shadow-inner">
               {qrCodeUrl ? (
                 <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48 mb-4 mix-blend-multiply" />
               ) : (
                 <div className="w-48 h-48 bg-gray-50 animate-pulse rounded-2xl mb-4"></div>
               )}
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center px-4">Scan with Google Authenticator or Authy</p>
            </div>
          </div>

          <div className="pt-10 border-t border-gray-50 flex justify-end">
            <button 
              onClick={handleSaveAuthSettings}
              className="bg-indigo-600 text-white px-14 py-5 rounded-[20px] font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F8F9FB] overflow-hidden font-inter selection:bg-indigo-100 selection:text-indigo-900">
      <aside className={`${isSidebarCollapsed ? 'w-24' : 'w-80'} bg-white border-r border-gray-100 flex flex-col transition-all duration-500 ease-in-out z-50`}>
        <div className="p-10 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-[18px] flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-indigo-100 transform -rotate-6">D</div>
          {!isSidebarCollapsed && <span className="text-2xl font-black text-gray-900 tracking-tighter">Dataflow</span>}
        </div>
        <nav className="flex-grow px-6 space-y-3 mt-4">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '⚡' },
            { id: 'products', label: 'Product Options', icon: '🛒' },
            { id: 'orders', label: 'Shipments', icon: '📦' },
            { id: 'dispatch', label: 'Courier Dispatch', icon: '🚚' },
            { id: 'pixel-setup', label: 'Pixel Setup', icon: '🎯' },
            { id: 'api-settings', label: 'API Settings', icon: '🔌' },
            { id: 'auth-settings', label: 'Authentication', icon: '🔐' },
            { id: 'settings', label: 'Workspace', icon: '🛠️' },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-5 px-8'} py-5 rounded-[24px] transition-all duration-300 ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-200 scale-[1.02]' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
              <span className="text-xl">{item.icon}</span>
              {!isSidebarCollapsed && <span className="font-black text-[11px] uppercase tracking-[0.2em]">{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-10">
          <button onClick={onLogout} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-5 px-8'} py-5 bg-red-50 text-red-500 rounded-[24px] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all shadow-sm`}>
            <span>👋</span>{!isSidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <main className="flex-grow overflow-y-auto p-12 md:p-16 custom-scrollbar relative">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8">
          <div className="relative group">
            <h2 className="text-5xl font-black text-gray-900 tracking-tighter capitalize">{activeTab.replace('-', ' ')}</h2>
            <div className="flex items-center gap-2 text-gray-400 font-bold mt-2 uppercase text-[10px] tracking-widest">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>Live Systems Operational
            </div>
          </div>
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-4 bg-white p-2 pr-6 rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:shadow-xl transition-all">
                <img src="https://ui-avatars.com/api/?name=Kristin+Watson&background=6366f1&color=fff" className="w-10 h-10 rounded-xl" alt="" />
                <div>
                   <p className="text-xs font-black text-gray-900">Kristin Watson</p>
                   <p className="text-[9px] font-bold text-gray-400 uppercase">Sale Administrator</p>
                </div>
             </div>
          </div>
        </header>

        <div className="max-w-[1500px]">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'products' && renderProductOptions()}
          {activeTab === 'orders' && renderOrders()}
          {activeTab === 'dispatch' && renderCourierDispatch()}
          {activeTab === 'pixel-setup' && renderPixelSetup()}
          {activeTab === 'api-settings' && renderApiSettings()}
          {activeTab === 'auth-settings' && renderAuthentication()}
          {activeTab === 'settings' && <div>Settings Module Ready</div>}
        </div>
      </main>

      {toast && (
        <div className={`fixed bottom-10 right-10 z-[300] flex items-center gap-5 px-10 py-6 rounded-[32px] shadow-2xl animate-bounceIn border max-w-md ${toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-200' : 'bg-red-600 text-white border-red-500 shadow-red-200'}`}>
          <div className="w-10 h-10 bg-white/20 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-xl">{toast.type === 'success' ? '✔' : '✖'}</div>
          <div>
            <p className="font-black text-[10px] uppercase tracking-[0.2em] mb-0.5 opacity-80">{toast.type === 'success' ? 'Transmission Success' : 'System Alert'}</p>
            <p className="font-black text-sm tracking-tight leading-snug">{toast.message}</p>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; border: 3px solid #F8F9FB; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E0; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounceIn { 0% { opacity: 0; transform: scale(0.95) translateY(20px); } 70% { opacity: 1; transform: scale(1.02) translateY(-5px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-bounceIn { animation: bounceIn 0.5s cubic-bezier(0.17, 0.67, 0.83, 0.67) forwards; }
      `}</style>
    </div>
  );
};

export default AdminPanel;