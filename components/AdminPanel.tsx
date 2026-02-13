
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, Order, User, StoreSettings, CourierSettings, PixelSettings, Category } from '../types';
import { CourierService } from '../CourierService';
import { api } from '../BackendAPI';

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

const SkeletonCard = () => (
  <div className="p-6 rounded-3xl border bg-white border-[#EFEFEF] animate-pulse">
    <div className="w-12 h-12 rounded-2xl bg-gray-200 mb-6"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
    <div className="h-8 bg-gray-200 rounded w-3/4 mb-6"></div>
    <div className="h-16 bg-gray-100 rounded w-full"></div>
  </div>
);

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  products, categories, orders, users, storeSettings, courierSettings, pixelSettings,
  onUpdate, onAdd, onDelete, onUpdateOrder, onUpdateUser, 
  onUpdateSettings, onUpdateCourierSettings, onUpdatePixelSettings, onAddCategory, onDeleteCategory, onUpdateCategory, onLogout 
}) => {
  const [activeTab, setActiveTab] = useState('ecommerce');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    actionLabel: string;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    actionLabel: 'Confirm'
  });
  
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  
  // Date/Time State
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dayOffset, setDayOffset] = useState(0);

  // Animation helper state
  const [updateKey, setUpdateKey] = useState(0);

  // Pixel Setup State
  const [isTestingPixel, setIsTestingPixel] = useState(false);
  const [pixelError, setPixelError] = useState('');
  const [pixelStep, setPixelStep] = useState(0); 

  // Courier Dispatch State
  const [dispatchingOrders, setDispatchingOrders] = useState<Record<string, boolean>>({});
  const [selectedCouriers, setSelectedCouriers] = useState<Record<string, 'Pathao' | 'SteadFast'>>({});

  // Real-time Data
  const [metrics, setMetrics] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Search Results
  const [searchResults, setSearchResults] = useState<{ products: Product[], orders: Order[], users: User[] } | null>(null);

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);

  // Forms
  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: '', description: '', price: 0, originalPrice: 0, purchaseCost: 0, internalPrice: 0,
    stock: 0, category: categories[0]?.name || '', images: [''],
    colors: ['#000000'], sizes: ['M'], productId: '#' + Math.floor(1000 + Math.random() * 9000), isActive: true,
    hasSizes: true, hasColors: true, deliveryRegions: []
  });

  const [categoryForm, setCategoryForm] = useState<Partial<Category>>({
    name: '', isActive: true
  });

  // Live Clock Effect
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Poll for live updates every 5 seconds
  useEffect(() => {
    const fetchLiveMetrics = async () => {
      try {
        const viewingDate = new Date(currentTime.getTime() + dayOffset * 24 * 60 * 60 * 1000);
        const yOffset = viewingDate.getFullYear() - new Date().getFullYear();
        const [m, n] = await Promise.all([
          api.getDashboardMetrics(yOffset),
          api.getNotifications()
        ]);
        setMetrics(m);
        setNotifications(n);
        setLoadingMetrics(false);
        // Trigger entrance animations for updated items
        setUpdateKey(prev => prev + 1);
      } catch (err) {
        console.error("Metric sync failed", err);
      }
    };

    fetchLiveMetrics();
    const interval = setInterval(fetchLiveMetrics, 5000);
    return () => clearInterval(interval);
  }, [orders, products, dayOffset, currentTime.toDateString()]);

  // Global Search Logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const q = searchQuery.toLowerCase();
    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(q) || p.productId.toLowerCase().includes(q));
    const filteredOrders = orders.filter(o => o.id.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q));
    const filteredUsers = users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    
    setSearchResults({ products: filteredProducts, orders: filteredOrders, users: filteredUsers });
  }, [searchQuery, products, orders, users]);

  const handleTestPixel = async () => {
    if (!pixelSettings?.pixelId || !pixelSettings?.appId || !pixelSettings?.accessToken) {
      setPixelError('Missing credentials. Please enter Pixel ID, App ID, and Access Token.');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Test Pixel Connection',
      message: 'This will initiate a connection request to Facebook Conversions API. Continue?',
      actionLabel: 'Connect & Test',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setPixelError('');
        setIsTestingPixel(true);
        setPixelStep(1);

        try {
          await new Promise(r => setTimeout(r, 2000));
          setPixelStep(2); 
          await new Promise(r => setTimeout(r, 2000));
          setPixelStep(3); 
          await new Promise(r => setTimeout(r, 1500));
          
          onUpdatePixelSettings?.({ ...pixelSettings, status: 'Active' });
          alert('SUCCESS: Server-side Conversions API is now live.');
        } catch (e) {
          setPixelError('Automated setup failed. Please check your token permissions.');
        } finally {
          setIsTestingPixel(false);
          setPixelStep(0);
        }
      }
    });
  };

  const handleSendToCourier = async (order: Order) => {
    const courier = selectedCouriers[order.id] || order.courierName || 'Pathao';
    
    setConfirmModal({
      isOpen: true,
      title: 'Dispatch Shipment',
      message: `Are you sure you want to send Order #${order.id} to ${courier}? This action will create a live consignment in the courier system.`,
      actionLabel: `Send to ${courier}`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setDispatchingOrders(prev => ({ ...prev, [order.id]: true }));

        try {
          let response;
          if (courier === 'SteadFast') {
            response = await CourierService.sendToSteadfast(order, courierSettings?.steadfast!);
          } else {
            response = await CourierService.sendToPathao(order, courierSettings?.pathao!);
          }

          const trackingId = response.consignment_id || response.tracking_code;
          onUpdateOrder({
            ...order,
            orderStatus: 'Shipped',
            courierName: courier,
            courierTrackingId: trackingId
          });

          alert(`✔ Shipment Created Successfully!\nCourier: ${courier}\nTracking ID: ${trackingId}`);
        } catch (err: any) {
          alert(`❌ Failure: ${err.message || 'Unknown API Error'}`);
        } finally {
          setDispatchingOrders(prev => ({ ...prev, [order.id]: false }));
        }
      }
    });
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeImageIndex !== null) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const newImages = [...(productForm.images || [])];
        newImages[activeImageIndex] = dataUrl;
        setProductForm(prev => ({ ...prev, images: newImages }));
        setActiveImageIndex(null);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerGallery = (index: number) => {
    setActiveImageIndex(index);
    setTimeout(() => {
        fileInputRef.current?.click();
    }, 10);
  };

  const sidebarItems = [
    { id: 'ecommerce', label: 'Ecommerce', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg> },
    { id: 'product', label: 'Product', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg> },
    { id: 'category', label: 'Category', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg> },
    { id: 'order', label: 'Order', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg> },
    { id: 'courier', label: 'Courier Dispatch', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v3.217a1 1 0 001.083.996h.923a1 1 0 01.994 1.11 3.01 3.01 0 002.822 2.677h3.356a3.01 3.01 0 002.822-2.677 1 1 0 01.994-1.11h.923c.5 0 .937-.36 1.05-.845l1.082-4.636A2 2 0 0020.12 4H14v10h-1z" /></svg> },
    { id: 'pixel', label: 'Pixel Setup', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg> },
    { id: 'users', label: 'Users', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg> },
    { id: 'setting', label: 'API Settings', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg> }
  ];

  const getLinePath = (data: number[], w: number, h: number) => {
    if (!data || data.length < 2) return "";
    const max = Math.max(...data, 10);
    const pts = data.map((v, i) => ({ x: (i / (data.length - 1)) * w, y: h - ((v / max) * (h - 10) + 5) }));
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const cpX = pts[i].x + (pts[i+1].x - pts[i].x) / 2;
      d += ` C ${cpX} ${pts[i].y}, ${cpX} ${pts[i+1].y}, ${pts[i+1].x} ${pts[i+1].y}`;
    }
    return d;
  };

  const dashboardStats = useMemo(() => {
    const recentOrdersList = [...orders].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);
    return { recentOrdersList };
  }, [orders]);

  const handleOpenProductModal = (product?: Product) => {
    if (product) { setEditingProduct(product); setProductForm(product); }
    else { setEditingProduct(null); setProductForm({ name: '', description: '', price: 0, originalPrice: 0, purchaseCost: 0, internalPrice: 0, stock: 0, category: categories[0]?.name || '', images: [''], isActive: true, colors: ['#000000'], sizes: ['M'], productId: '#' + Math.floor(1000 + Math.random() * 9000), hasSizes: true, hasColors: true, deliveryRegions: [] }); }
    setShowProductModal(true);
  };

  const handleOpenCategoryModal = (category?: Category) => {
    if (category) { setEditingCategory(category); setCategoryForm(category); }
    else { setEditingCategory(null); setCategoryForm({ name: '', isActive: true }); }
    setShowCategoryModal(true);
  };

  return (
    <div className={`flex min-h-screen transition-colors duration-500 ${isDarkMode ? 'bg-[#111315] text-[#F3F5F7]' : 'bg-[#F3F5F7] text-[#111315]'}`}>
      
      {/* Sidebar */}
      <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-[260px]'} ${isDarkMode ? 'bg-[#1A1D1F] border-[#272B30]' : 'bg-white border-[#EFEFEF]'} border-r h-screen fixed top-0 left-0 z-40 transition-all duration-300 shadow-[2px_0_10px_rgba(0,0,0,0.02)] flex flex-col`}>
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-[#FF7E3E] rounded-xl flex items-center justify-center text-white font-black text-xl flex-shrink-0">D</div>
            {!isSidebarCollapsed && <span className="text-2xl font-black tracking-tight whitespace-nowrap">Dataflow</span>}
          </div>
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="text-gray-400 hover:text-[#FF7E3E] transition-colors flex-shrink-0">
            <svg className={`w-5 h-5 transition-transform ${isSidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7"/></svg>
          </button>
        </div>
        
        <nav className="flex-grow px-4 overflow-y-auto no-scrollbar space-y-1">
          {sidebarItems.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${activeTab === item.id ? 'bg-[#FF7E3E] text-white shadow-lg shadow-orange-100/50' : 'text-[#6F767E] hover:bg-gray-50 dark:hover:bg-[#272B30]'}`}>
              <div className="w-5 h-5 flex-shrink-0">{item.icon}</div>
              {!isSidebarCollapsed && <span className="font-bold text-sm">{item.label}</span>}
            </button>
          ))}
          <div className="pt-6 mt-6 border-t dark:border-[#272B30]">
             <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all font-bold">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                {!isSidebarCollapsed && <span className="text-sm">Log Out</span>}
             </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className={`${isSidebarCollapsed ? 'ml-20' : 'ml-[260px]'} flex-grow transition-all duration-300 min-h-screen flex flex-col`}>
        {/* Top Header */}
        <header className={`h-24 flex items-center justify-between px-10 sticky top-0 z-30 transition-colors duration-300 border-b ${isDarkMode ? 'bg-[#111315] border-[#272B30]' : 'bg-white border-[#EFEFEF]'}`}>
          <div className="flex items-center gap-8">
            <div className="relative group">
               <input 
                type="text" 
                placeholder="Search products, orders, users..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-[420px] border-none rounded-xl py-3 pl-12 pr-4 text-sm font-bold outline-none ${isDarkMode ? 'bg-[#1A1D1F] text-[#F3F5F7]' : 'bg-[#F3F5F7] text-[#111315]'}`} 
               />
               <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
               
               {/* Search Dropdown */}
               {searchResults && (
                 <div className={`absolute top-full left-0 mt-2 w-full max-h-[400px] overflow-y-auto rounded-2xl shadow-2xl z-50 border p-4 ${isDarkMode ? 'bg-[#1A1D1F] border-[#272B30]' : 'bg-white border-gray-100'}`}>
                   <h4 className="text-[10px] font-black uppercase text-gray-400 mb-2">Search Results</h4>
                   <div className="space-y-4">
                     {searchResults.products.length > 0 && (
                       <div>
                         <p className="text-[9px] font-black text-orange-500 uppercase mb-1">Products</p>
                         {searchResults.products.map(p => (
                           <div key={p.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors" onClick={() => { setSearchQuery(''); handleOpenProductModal(p); }}>
                             <img src={p.images[0]} className="w-8 h-8 rounded-lg object-cover" />
                             <span className="text-xs font-bold">{p.name}</span>
                           </div>
                         ))}
                       </div>
                     )}
                     {searchResults.orders.length > 0 && (
                       <div>
                         <p className="text-[9px] font-black text-purple-500 uppercase mb-1">Orders</p>
                         {searchResults.orders.map(o => (
                           <div key={o.id} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors" onClick={() => { setSearchQuery(''); setActiveTab('order'); }}>
                             <p className="text-xs font-bold">#{o.id} - {o.customerName}</p>
                             <p className="text-[10px] text-gray-400">${o.totalPrice}</p>
                           </div>
                         ))}
                       </div>
                     )}
                     {searchResults.products.length === 0 && searchResults.orders.length === 0 && searchResults.users.length === 0 && (
                       <p className="text-xs text-gray-400 py-4 text-center">No results found for "{searchQuery}"</p>
                     )}
                   </div>
                 </div>
               )}
            </div>

            {/* Live Date/Clock */}
            <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-[#1A1D1F] rounded-xl border border-[#EFEFEF] dark:border-[#272B30]">
               <svg className="w-4 h-4 text-[#FF7E3E]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
               <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-gray-400 leading-none">Live System Date</span>
                  <span className="text-xs font-black mt-1 uppercase">
                    {currentTime.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                    <span className="text-[#FF7E3E] ml-2">{currentTime.toLocaleTimeString()}</span>
                  </span>
               </div>
            </div>
          </div>
          
          <div className="flex items-center gap-5">
             <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-[#FF7E3E] transition-colors">
                {isDarkMode ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 100 14 7 7 0 000-14z"/></svg> : <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>}
             </button>
             
             {/* Notification Icon */}
             <div className="relative">
               <button onClick={() => { setShowNotifications(!showNotifications); if(!showNotifications) api.markNotificationsAsRead(); }} className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-[#FF7E3E] transition-colors relative">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                  )}
               </button>
               {showNotifications && (
                 <div className={`absolute top-full right-0 mt-2 w-72 rounded-2xl shadow-2xl z-50 border p-4 ${isDarkMode ? 'bg-[#1A1D1F] border-[#272B30]' : 'bg-white border-gray-100'}`}>
                   <h4 className="text-[11px] font-black uppercase text-gray-400 mb-3 px-2">Notifications</h4>
                   <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                     {notifications.length === 0 ? (
                       <p className="text-xs text-center py-4 text-gray-400">No notifications</p>
                     ) : (
                       notifications.map(n => (
                         <div key={n.id} className={`p-3 rounded-xl transition-colors ${n.read ? 'opacity-60' : 'bg-orange-50 dark:bg-orange-900/10'}`}>
                           <p className="text-xs font-bold">{n.title}</p>
                           <p className="text-[10px] text-gray-500 mt-1">{n.message}</p>
                         </div>
                       ))
                     )}
                   </div>
                 </div>
               )}
             </div>

             <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md cursor-pointer ml-2">
                <img src="https://i.pravatar.cc/150?u=kristin" alt="Admin" className="w-full h-full object-cover" />
             </div>
             <div className="hidden lg:block cursor-pointer">
                <p className="text-sm font-black leading-none">Kristin Watson</p>
                <p className="text-[10px] font-bold text-[#6F767E] mt-1">Sale Administrator</p>
             </div>
          </div>
        </header>

        <div className="p-10 space-y-8 flex-grow animate-fadeIn max-w-[1600px] mx-auto w-full">
          {activeTab === 'ecommerce' && (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {loadingMetrics ? (
                  <>
                    <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
                  </>
                ) : (
                  [
                    { label: 'Total Earnings', val: `$${metrics?.totalEarnings.toLocaleString()}`, color: '#27AE60', bg: 'rgba(39, 174, 96, 0.1)', pts: metrics?.revenueSeries || [0,0,0,0,0,0] },
                    { label: 'Total Orders', val: metrics?.totalOrders.toLocaleString(), color: '#FF7E3E', bg: 'rgba(255, 126, 62, 0.1)', pts: metrics?.orderSeries || [0,0,0,0,0,0] },
                    { label: 'Customers', val: metrics?.customers.toLocaleString(), color: '#6C5DD3', bg: 'rgba(108, 93, 211, 0.1)', pts: [5, 12, 10, 20, 18, 25] },
                    { label: 'My Balance', val: `$${metrics?.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#0085FF', bg: 'rgba(0, 133, 255, 0.1)', pts: [15, 25, 20, 35, 30, 45] },
                  ].map((stat, i) => (
                    <div key={i} className={`p-6 rounded-3xl border transition-all cursor-pointer group ${isDarkMode ? 'bg-[#1A1D1F] border-[#272B30] hover:border-[#FF7E3E]' : 'bg-white border-[#EFEFEF] hover:border-[#FF7E3E]'}`}>
                      <div className="flex items-start justify-between mb-6">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: stat.color }}>
                           <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-[11px] font-black text-[#27AE60]">
                             <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3a1 1 0 011 1v10.586l3.293-3.293a1 1 0 111.414 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 111.414-1.414L9 14.586V4a1 1 0 011-1z" transform="rotate(180 10 10)"/></svg>
                             1.56%
                          </div>
                          <p className="text-[10px] font-bold text-[#6F767E] uppercase">Weekly</p>
                        </div>
                      </div>
                      <div>
                         <p className="text-[11px] font-bold text-[#6F767E] uppercase tracking-wider">{stat.label}</p>
                         <p key={updateKey} className="text-3xl font-black mt-1 animate-metricPulse transition-all duration-700">{stat.val}</p>
                      </div>
                      <div className="mt-6 h-16 w-full">
                         <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 40">
                            <path d={getLinePath(stat.pts, 100, 40)} fill="none" stroke={stat.color} strokeWidth="4" strokeLinecap="round" className="transition-all duration-1000 ease-in-out" />
                            <path d={`${getLinePath(stat.pts, 100, 40)} L 100 40 L 0 40 Z`} fill={stat.bg} className="transition-all duration-1000 ease-in-out" />
                         </svg>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Charts & Lists */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                 {/* Revenue Chart */}
                 <div className={`lg:col-span-6 p-8 rounded-[32px] border ${isDarkMode ? 'bg-[#1A1D1F] border-[#272B30]' : 'bg-white border-[#EFEFEF]'}`}>
                    <div className="flex justify-between items-center mb-10">
                       <h3 className="text-xl font-black flex items-center gap-2">
                         Revenue Performance
                         {dayOffset === 0 && <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse ml-1"></span>}
                       </h3>
                       <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#272B30] rounded-2xl px-4 py-3 shadow-inner border border-gray-100 dark:border-gray-800 transition-all duration-300">
                          <button 
                            onClick={() => setDayOffset(prev => prev - 1)}
                            className="w-8 h-8 flex items-center justify-center bg-white dark:bg-[#1A1D1F] rounded-xl shadow-sm text-gray-400 hover:text-[#FF7E3E] transition-all transform active:scale-90"
                            title="Decrease Date"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                          </button>
                          
                          <div className="flex flex-col items-center px-4">
                             <div className="flex items-center gap-2 mb-1">
                                <span className="text-[9px] font-black text-[#FF7E3E] uppercase tracking-[0.2em] leading-none">
                                   {dayOffset === 0 ? 'Live System Date' : 'Browsing Analytics'}
                                </span>
                             </div>
                             <span key={dayOffset} className="text-[13px] font-black uppercase text-[#111315] dark:text-white tracking-tight animate-fadeIn">
                                {(() => {
                                  const d = new Date(currentTime.getTime() + dayOffset * 24 * 60 * 60 * 1000);
                                  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' });
                                })()}
                             </span>
                          </div>

                          <button 
                            onClick={() => setDayOffset(prev => prev + 1)}
                            className="w-8 h-8 flex items-center justify-center bg-white dark:bg-[#1A1D1F] rounded-xl shadow-sm text-gray-400 hover:text-[#FF7E3E] transition-all transform active:scale-90"
                            title="Increase Date"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                          </button>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-8 mb-10">
                       <div className="space-y-1">
                          <p className="text-xs font-bold text-[#6F767E] flex items-center gap-2">
                             <span className="w-2 h-2 rounded-full bg-[#FF7E3E]"></span> Revenue (Monthly)
                          </p>
                          <div className="flex items-center gap-3">
                             <span key={updateKey} className="text-2xl font-black animate-metricPulse">${metrics?.totalEarnings.toLocaleString()}</span>
                          </div>
                       </div>
                    </div>
                    <div className="h-[320px] w-full flex items-end justify-between gap-3 px-2 pb-6 border-b dark:border-[#272B30] relative overflow-hidden">
                       {(metrics?.revenueSeries || Array(12).fill(0)).map((val: number, i: number) => {
                          const max = Math.max(...(metrics?.revenueSeries || [1000]), 1000);
                          const h = (val / max) * 100;
                          return (
                            <div key={i} className="flex-grow bg-[#FF7E3E]/10 dark:bg-[#FF7E3E]/5 rounded-t-xl overflow-hidden relative group h-full flex flex-col justify-end transition-all duration-300">
                               <div 
                                className="w-full bg-[#FF7E3E] transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:bg-[#e66c30] group-hover:scale-y-110 origin-bottom" 
                                style={{ height: `${Math.max(h, 5)}%` }}
                               ></div>
                               <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10">${val.toLocaleString()}</div>
                            </div>
                          );
                       })}
                       <svg className="absolute inset-0 w-full h-full pointer-events-none p-4" preserveAspectRatio="none" viewBox="0 0 100 100">
                          <path d={getLinePath(metrics?.orderSeries || [], 100, 100)} fill="none" stroke="#6C5DD3" strokeWidth="2" strokeLinecap="round" className="transition-all duration-1000 ease-in-out" />
                       </svg>
                    </div>
                    <div className="flex justify-between px-2 mt-4 text-[10px] font-black text-[#6F767E] uppercase">
                       {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m => <span key={m}>{m}</span>)}
                    </div>
                 </div>

                 {/* Top Sale */}
                 <div className={`lg:col-span-3 p-8 rounded-[32px] border ${isDarkMode ? 'bg-[#1A1D1F] border-[#272B30]' : 'bg-white border-[#EFEFEF]'}`}>
                    <div className="flex justify-between items-center mb-10">
                       <h3 className="text-xl font-black">Top Products</h3>
                       <button className="text-[10px] font-black text-blue-500 uppercase tracking-widest">View All</button>
                    </div>
                    <div className="space-y-6">
                       {metrics?.topSales.map((item: any, idx: number) => (
                         <div key={idx} className="flex items-center justify-between group cursor-pointer transform hover:translate-x-1 transition-transform" onClick={() => handleOpenProductModal(item.p)}>
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 shadow-sm border border-gray-100">
                                  <img src={item.p.images[0]} className="w-full h-full object-cover" />
                               </div>
                               <div className="min-w-0">
                                  <p className="text-xs font-black truncate max-w-[100px] group-hover:text-[#FF7E3E] transition-colors">{item.p.name}</p>
                                  <p className="text-[10px] font-bold text-[#6F767E] mt-0.5">${item.p.price}</p>
                               </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black whitespace-nowrap">{item.count} Sold</p>
                              <p className="text-[8px] font-bold text-green-500 mt-0.5">+{Math.floor(Math.random() * 20)}%</p>
                            </div>
                         </div>
                       ))}
                       {metrics?.topSales.length === 0 && <p className="text-xs text-gray-400 text-center py-10">No sales data yet</p>}
                    </div>
                 </div>

                 {/* User Location */}
                 <div className={`lg:col-span-3 p-8 rounded-[32px] border ${isDarkMode ? 'bg-[#1A1D1F] border-[#272B30]' : 'bg-white border-[#EFEFEF]'}`}>
                    <h3 className="text-xl font-black mb-10">Sales by Region</h3>
                    <div className="aspect-square bg-gray-50 dark:bg-[#272B30] rounded-3xl overflow-hidden relative group mb-8 border border-gray-100 dark:border-gray-800">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/US_High_Resolution_Map.png/800px-US_High_Resolution_Map.png" className="w-full h-full object-cover opacity-50 grayscale group-hover:grayscale-0 transition-all duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                          <div className="w-4 h-4 bg-orange-500 rounded-full animate-ping"></div>
                        </div>
                    </div>
                    <div className="space-y-4">
                       {Object.entries(metrics?.locationData || {}).map(([loc, count]: [string, any], idx) => (
                         <div key={loc} className="flex items-center justify-between animate-rowIn" style={{ animationDelay: `${idx * 100}ms` }}>
                            <div className="flex items-center gap-2">
                               <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                               <span className="text-xs font-bold text-[#6F767E]">{loc}</span>
                            </div>
                            <span className="text-xs font-black">{Math.round((count / (metrics?.totalOrders || 1)) * 100)}%</span>
                         </div>
                       ))}
                       {Object.keys(metrics?.locationData || {}).length === 0 && <p className="text-xs text-gray-400 text-center">Awaiting order data...</p>}
                    </div>
                 </div>

                 {/* Recent Orders Table */}
                 <div className={`lg:col-span-12 p-10 rounded-[32px] border overflow-hidden ${isDarkMode ? 'bg-[#1A1D1F] border-[#272B30]' : 'bg-white border-[#EFEFEF]'}`}>
                    <div className="flex justify-between items-center mb-10">
                      <h3 className="text-2xl font-black">Live Order Activity</h3>
                      <button className="bg-orange-500 text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl shadow-lg shadow-orange-100 transition-transform active:scale-95">Export CSV</button>
                    </div>
                    <div className="overflow-x-auto no-scrollbar">
                       <table className="w-full min-w-[900px] text-left">
                          <thead>
                             <tr className="text-[10px] font-black text-[#6F767E] uppercase tracking-widest border-b dark:border-[#272B30]">
                                <th className="pb-6">Product</th>
                                <th className="pb-6">Customer</th>
                                <th className="pb-6">Order ID</th>
                                <th className="pb-6 text-center">Qty</th>
                                <th className="pb-6">Amount</th>
                                <th className="pb-6">Date</th>
                                <th className="pb-6 text-right">Status</th>
                             </tr>
                          </thead>
                          <tbody key={updateKey} className="divide-y dark:divide-[#272B30]">
                             {dashboardStats.recentOrdersList.map((order, idx) => (
                               <tr key={order.id} className="group hover:bg-gray-50 dark:hover:bg-[#272B30]/30 transition-colors cursor-pointer animate-rowIn" style={{ animationDelay: `${idx * 50}ms` }}>
                                  <td className="py-6 flex items-center gap-4">
                                     <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100">
                                        <img src={order.items[0]?.product.images[0]} className="w-full h-full object-cover" />
                                     </div>
                                     <div className="flex flex-col min-w-0">
                                       <span className="text-sm font-black truncate max-w-[200px]">{order.items[0]?.product.name}</span>
                                       <div className="flex flex-wrap gap-1 mt-1">
                                         {order.items.map((it, i) => (
                                           <span key={i} className="text-[9px] font-bold text-gray-400">
                                             {it.product.hasSizes && `[Size: ${it.selectedSize}]`} {it.product.hasColors && `[Color: ${it.selectedColor}]`}
                                           </span>
                                         ))}
                                       </div>
                                     </div>
                                  </td>
                                  <td className="py-6">
                                     <p className="text-sm font-black">{order.customerName}</p>
                                     <p className="text-[10px] text-gray-400">{order.customerEmail}</p>
                                  </td>
                                  <td className="py-6 text-sm font-bold text-orange-500">#{order.id}</td>
                                  <td className="py-6 text-sm font-black text-center">x{order.items.reduce((s, it) => s + it.quantity, 0)}</td>
                                  <td className="py-6 text-sm font-black">${order.totalPrice.toLocaleString()}</td>
                                  <td className="py-6 text-xs font-bold text-gray-400">{new Date(order.timestamp).toLocaleDateString()}</td>
                                  <td className="py-6 text-right">
                                     <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase shadow-sm transition-colors ${
                                       order.orderStatus === 'Delivered' ? 'bg-[#27AE60]/10 text-[#27AE60]' :
                                       order.orderStatus === 'Shipped' ? 'bg-blue-500/10 text-blue-500' :
                                       order.orderStatus === 'Pending' ? 'bg-purple-500/10 text-purple-500' :
                                       'bg-red-500/10 text-red-500'
                                     }`}>{order.orderStatus}</span>
                                  </td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>
              </div>
            </>
          )}

          {activeTab === 'product' && (
            <div className={`p-10 rounded-[32px] border ${isDarkMode ? 'bg-[#1A1D1F] border-[#272B30]' : 'bg-white border-[#EFEFEF]'}`}>
               <div className="flex justify-between items-center mb-12">
                  <div>
                    <h3 className="text-3xl font-black">Inventory Database</h3>
                    <p className="text-sm font-bold text-[#6F767E] mt-2">Manage all system stock and product specifications</p>
                  </div>
                  <button onClick={() => handleOpenProductModal()} className="bg-[#FF7E3E] text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-[#e66c30] transition-all shadow-xl shadow-orange-100 hover:scale-[1.02]">
                     + Register New Item
                  </button>
               </div>
               <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full min-w-[1000px] text-left">
                     <thead>
                        <tr className="text-[10px] font-black text-[#6F767E] uppercase tracking-widest border-b dark:border-[#272B30]">
                           <th className="pb-6">Product</th>
                           <th className="pb-6">Category</th>
                           <th className="pb-6 text-center">Stock Units</th>
                           <th className="pb-6">Price</th>
                           <th className="pb-6">Disc %</th>
                           <th className="pb-6 text-right">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y dark:divide-[#272B30]">
                        {products.map((p, idx) => (
                           <tr key={p.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors animate-rowIn" style={{ animationDelay: `${idx * 30}ms` }}>
                              <td className="py-6 flex items-center gap-4">
                                 <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 shadow-sm border border-gray-100 transition-transform group-hover:scale-110">
                                    <img src={p.images[0]} className="w-full h-full object-cover" />
                                 </div>
                                 <div className="flex flex-col">
                                   <span className="text-sm font-black group-hover:text-[#FF7E3E] transition-colors">{p.name}</span>
                                   <span className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">
                                     Options: {p.hasSizes ? 'Size' : ''} {p.hasColors ? 'Color' : ''} {(!p.hasSizes && !p.hasColors) ? 'None' : ''}
                                   </span>
                                 </div>
                              </td>
                              <td className="py-6 text-sm font-bold text-[#6F767E]">{p.category}</td>
                              <td className="py-6 text-center">
                                 <span className={`px-2 py-1 rounded text-[10px] font-black uppercase transition-all duration-300 ${p.stock < 10 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                                    {p.stock} Units
                                 </span>
                              </td>
                              <td className="py-6 text-sm font-black">${p.price}</td>
                              <td className="py-6 text-sm font-black text-[#FF7E3E]">{p.discountPercentage || 0}%</td>
                              <td className="py-6 text-right">
                                 <div className="flex justify-end gap-2">
                                    <button onClick={() => handleOpenProductModal(p)} className="p-2.5 rounded-xl hover:bg-orange-50 hover:text-orange-500 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
                                    <button onClick={() => { 
                                      setConfirmModal({
                                        isOpen: true,
                                        title: 'Delete Product',
                                        message: `Are you sure you want to permanently delete '${p.name}' from the database? This cannot be undone.`,
                                        actionLabel: 'Delete Permanently',
                                        isDestructive: true,
                                        onConfirm: () => { onDelete(p.id); setConfirmModal(prev => ({...prev, isOpen: false})); }
                                      });
                                    }} className="p-2.5 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          )}

          {activeTab === 'category' && (
            <div className={`p-10 rounded-[32px] border ${isDarkMode ? 'bg-[#1A1D1F] border-[#272B30]' : 'bg-white border-[#EFEFEF]'}`}>
               <div className="flex justify-between items-center mb-12">
                  <div>
                    <h3 className="text-3xl font-black">Category Management</h3>
                    <p className="text-sm font-bold text-[#6F767E] mt-2">Manage your product categorization hierarchy</p>
                  </div>
                  <button onClick={() => handleOpenCategoryModal()} className="bg-[#FF7E3E] text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-[#e66c30] transition-all shadow-xl shadow-orange-100 hover:scale-[1.02]">
                     + New Category
                  </button>
               </div>
               <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full min-w-[800px] text-left">
                     <thead>
                        <tr className="text-[10px] font-black text-[#6F767E] uppercase tracking-widest border-b dark:border-[#272B30]">
                           <th className="pb-6">ID</th>
                           <th className="pb-6">Category Name</th>
                           <th className="pb-6">Status</th>
                           <th className="pb-6 text-right">Quick Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y dark:divide-[#272B30]">
                        {categories.map((cat, idx) => (
                           <tr key={cat.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/10 transition-colors animate-rowIn" style={{ animationDelay: `${idx * 40}ms` }}>
                              <td className="py-6 text-xs font-bold text-gray-400">#{cat.id}</td>
                              <td className="py-6">
                                 <span className="text-sm font-black group-hover:text-[#FF7E3E] transition-colors">{cat.name}</span>
                              </td>
                              <td className="py-6">
                                 <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${cat.isActive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    {cat.isActive ? 'Active' : 'Hidden'}
                                 </span>
                              </td>
                              <td className="py-6 text-right">
                                 <div className="flex justify-end gap-2">
                                    <button onClick={() => handleOpenCategoryModal(cat)} className="p-2.5 rounded-xl hover:bg-orange-50 hover:text-orange-500 transition-all">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                                    </button>
                                    <button onClick={() => { 
                                      setConfirmModal({
                                        isOpen: true,
                                        title: 'Delete Category',
                                        message: `Delete category '${cat.name}'? Products assigned to this category might lose their categorization.`,
                                        actionLabel: 'Delete Category',
                                        isDestructive: true,
                                        onConfirm: () => { onDeleteCategory(cat.id); setConfirmModal(prev => ({...prev, isOpen: false})); }
                                      });
                                    }} className="p-2.5 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                    </button>
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          )}

          {activeTab === 'order' && (
            <div className={`p-10 rounded-[32px] border ${isDarkMode ? 'bg-[#1A1D1F] border-[#272B30]' : 'bg-white border-[#EFEFEF]'}`}>
               <h3 className="text-3xl font-black mb-12">Fulfillment Center</h3>
               <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full min-w-[1000px] text-left">
                     <thead>
                        <tr className="text-[10px] font-black text-[#6F767E] uppercase tracking-widest border-b dark:border-[#272B30]">
                           <th className="pb-6">Order ID</th>
                           <th className="pb-6">Customer Profile</th>
                           <th className="pb-6">Amount</th>
                           <th className="pb-6">Payment</th>
                           <th className="pb-6">Fulfillment</th>
                           <th className="pb-6 text-right">Quick Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y dark:divide-[#272B30]">
                        {orders.map((o, idx) => (
                           <tr key={o.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/10 transition-colors animate-rowIn" style={{ animationDelay: `${idx * 40}ms` }}>
                              <td className="py-6 text-sm font-black text-orange-500">#{o.id}</td>
                              <td className="py-6">
                                 <div className="flex flex-col">
                                    <span className="text-sm font-black">{o.customerName}</span>
                                    <span className="text-[10px] font-bold text-[#6F767E]">{o.customerEmail}</span>
                                 </div>
                              </td>
                              <td className="py-6 text-sm font-black">${o.totalPrice.toLocaleString()}</td>
                              <td className="py-6">
                                 <select 
                                    value={o.paymentStatus} 
                                    onChange={(e) => onUpdateOrder({...o, paymentStatus: e.target.value as any})}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase outline-none border-none shadow-sm transition-colors ${
                                       o.paymentStatus === 'Paid' ? 'bg-[#27AE60]/10 text-[#27AE60]' :
                                       o.paymentStatus === 'Pending' ? 'bg-[#FF7E3E]/10 text-[#FF7E3E]' :
                                       'bg-[#EB5757]/10 text-[#EB5757]'
                                    }`}
                                 >
                                    <option value="Paid">Paid</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Cancel">Cancel</option>
                                 </select>
                              </td>
                              <td className="py-6">
                                 <select 
                                    value={o.orderStatus} 
                                    onChange={(e) => onUpdateOrder({...o, orderStatus: e.target.value as any})}
                                    className="bg-gray-50 dark:bg-[#272B30] text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border-none outline-none shadow-sm transition-all"
                                 >
                                    {['Pending','Processing','Shipped','Delivered','Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                                 </select>
                              </td>
                              <td className="py-6 text-right">
                                 <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <button className="p-2.5 rounded-xl hover:bg-orange-50 hover:text-orange-500 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          )}

          {activeTab === 'courier' && (
            <div className={`p-10 rounded-[32px] border ${isDarkMode ? 'bg-[#1A1D1F] border-[#272B30]' : 'bg-white border-[#EFEFEF]'}`}>
               <div className="flex justify-between items-center mb-12">
                  <div>
                    <h3 className="text-3xl font-black">Courier Dispatch Manager</h3>
                    <p className="text-sm font-bold text-[#6F767E] mt-2">Manage customer shipments and delivery tracking</p>
                  </div>
               </div>
               <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full min-w-[1000px] text-left">
                     <thead>
                        <tr className="text-[10px] font-black text-[#6F767E] uppercase tracking-widest border-b dark:border-[#272B30]">
                           <th className="pb-6">Order / Customer</th>
                           <th className="pb-6">Delivery Details</th>
                           <th className="pb-6">Products</th>
                           <th className="pb-6">Price</th>
                           <th className="pb-6">Select Courier</th>
                           <th className="pb-6 text-right">Dispatch</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y dark:divide-[#272B30]">
                        {orders.map((o, idx) => (
                           <tr key={o.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/10 transition-colors animate-rowIn" style={{ animationDelay: `${idx * 40}ms` }}>
                              <td className="py-6">
                                 <div className="flex flex-col">
                                    <span className="text-xs font-black text-orange-500">#{o.id}</span>
                                    <span className="text-sm font-black">{o.customerName}</span>
                                    <span className="text-[10px] font-bold text-[#6F767E]">{o.customerPhone}</span>
                                 </div>
                              </td>
                              <td className="py-6 max-w-[200px]">
                                 <p className="text-xs font-bold leading-relaxed truncate" title={o.customerAddress}>{o.customerAddress}</p>
                                 <p className="text-[10px] font-black text-blue-500 uppercase mt-1">{o.customerLocation}</p>
                              </td>
                              <td className="py-6">
                                 <div className="flex flex-col gap-1">
                                    {o.items.map((item, idx2) => (
                                       <span key={idx2} className="text-[10px] font-bold bg-gray-100 dark:bg-[#272B30] px-2 py-0.5 rounded truncate max-w-[150px] transition-transform hover:scale-105">
                                          {item.quantity}x {item.product.name}
                                          <span className="text-[8px] text-indigo-500 ml-1">
                                            {item.product.hasSizes && `[Size: ${item.selectedSize}]`} {item.product.hasColors && `[Color: ${item.selectedColor}]`}
                                          </span>
                                       </span>
                                    ))}
                                 </div>
                              </td>
                              <td className="py-6 text-sm font-black">${o.totalPrice.toLocaleString()}</td>
                              <td className="py-6">
                                 {o.orderStatus === 'Shipped' || o.orderStatus === 'Delivered' ? (
                                    <div className="flex flex-col">
                                       <span className="text-[10px] font-black uppercase text-green-500">{o.courierName}</span>
                                       <span className="text-[9px] font-bold text-gray-400">ID: {o.courierTrackingId}</span>
                                    </div>
                                 ) : (
                                    <select 
                                       value={selectedCouriers[o.id] || o.customerCourierPreference || 'Pathao'} 
                                       onChange={(e) => setSelectedCouriers(prev => ({ ...prev, [o.id]: e.target.value as any }))}
                                       className="bg-gray-50 dark:bg-[#272B30] text-[10px] font-black uppercase px-3 py-2 rounded-xl border-none outline-none shadow-sm transition-all"
                                    >
                                       <option value="Pathao">Pathao Courier</option>
                                       <option value="SteadFast">SteadFast Courier</option>
                                    </select>
                                 )}
                              </td>
                              <td className="py-6 text-right">
                                 {o.orderStatus === 'Shipped' || o.orderStatus === 'Delivered' ? (
                                    <span className="text-[10px] font-black text-green-600 bg-green-50 px-3 py-1.5 rounded-xl uppercase animate-fadeIn">Sent</span>
                                 ) : (
                                    <button 
                                       onClick={() => handleSendToCourier(o)}
                                       disabled={dispatchingOrders[o.id]}
                                       className="bg-[#FF7E3E] text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-orange-100 hover:scale-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-wait"
                                    >
                                       {dispatchingOrders[o.id] ? 'Sending...' : 'Send to Courier'}
                                    </button>
                                 )}
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          )}

          {activeTab === 'setting' && (
             <div className={`p-10 rounded-[32px] border ${isDarkMode ? 'bg-[#1A1D1F] border-[#272B30]' : 'bg-white border-[#EFEFEF]'}`}>
                <h3 className="text-3xl font-black mb-12">API Settings Manager</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                   {/* Pathao Settings */}
                   <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-6">
                         <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white font-black">P</div>
                         <h4 className="text-lg font-black uppercase tracking-widest">Pathao Courier API</h4>
                      </div>
                      <div className="space-y-4">
                         {['clientId', 'clientSecret', 'storeId', 'username', 'password'].map((field) => (
                            <div key={field} className="space-y-1">
                               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{field}</label>
                               <input 
                                  type={field.includes('Secret') || field.includes('password') ? 'password' : 'text'}
                                  value={(courierSettings?.pathao as any)?.[field] || ''}
                                  onChange={(e) => onUpdateCourierSettings?.({ ...courierSettings!, pathao: { ...courierSettings!.pathao, [field]: e.target.value } })}
                                  className={`w-full px-5 py-3 border-none rounded-xl font-bold text-sm outline-none transition-colors ${isDarkMode ? 'bg-[#272B30]' : 'bg-gray-50'} focus:ring-2 focus:ring-orange-500/20`} 
                                  placeholder={`Enter ${field}`}
                               />
                            </div>
                         ))}
                      </div>
                   </div>

                   {/* SteadFast Settings */}
                   <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-6">
                         <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black">S</div>
                         <h4 className="text-lg font-black uppercase tracking-widest">SteadFast Courier API</h4>
                      </div>
                      <div className="space-y-4">
                         {['apiKey', 'secretKey', 'merchantId'].map((field) => (
                            <div key={field} className="space-y-1">
                               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{field}</label>
                               <input 
                                  type={field.includes('Key') ? 'password' : 'text'}
                                  value={(courierSettings?.steadfast as any)?.[field] || ''}
                                  onChange={(e) => onUpdateCourierSettings?.({ ...courierSettings!, steadfast: { ...courierSettings!.steadfast, [field]: e.target.value } })}
                                  className={`w-full px-5 py-3 border-none rounded-xl font-bold text-sm outline-none transition-colors ${isDarkMode ? 'bg-[#272B30]' : 'bg-gray-50'} focus:ring-2 focus:ring-blue-500/20`} 
                                  placeholder={`Enter ${field}`}
                               />
                            </div>
                         ))}
                      </div>
                   </div>
                </div>

                <div className="mt-12 pt-8 border-t dark:border-[#272B30] flex justify-end">
                   <button onClick={() => alert('Settings Saved Locally.')} className="bg-[#FF7E3E] text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl shadow-orange-100 hover:scale-105 active:scale-95 transition-all">
                      Save API Configurations
                   </button>
                </div>
             </div>
          )}

          {activeTab === 'users' && (
            <div className={`p-10 rounded-[32px] border ${isDarkMode ? 'bg-[#1A1D1F] border-[#272B30]' : 'bg-white border-[#EFEFEF]'}`}>
               <h3 className="text-3xl font-black mb-12">User Directory</h3>
               <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full min-w-[800px] text-left">
                     <thead>
                        <tr className="text-[10px] font-black text-[#6F767E] uppercase tracking-widest border-b dark:border-[#272B30]">
                           <th className="pb-6">Profile</th>
                           <th className="pb-6">Role</th>
                           <th className="pb-6">Status</th>
                           <th className="pb-6">Registration</th>
                           <th className="pb-6 text-right">Access</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y dark:divide-[#272B30]">
                        {users.map((u, idx) => (
                           <tr key={u.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors animate-rowIn" style={{ animationDelay: `${idx * 40}ms` }}>
                              <td className="py-6 flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center font-black text-indigo-600 transition-transform group-hover:rotate-12">
                                    {u.name.charAt(0)}
                                 </div>
                                 <div>
                                    <p className="text-sm font-black">{u.name}</p>
                                    <p className="text-[10px] text-gray-400">{u.email}</p>
                                 </div>
                              </td>
                              <td className="py-6 text-sm font-bold text-[#6F767E]">{u.role}</td>
                              <td className="py-6">
                                 <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${u.status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    {u.status}
                                 </span>
                              </td>
                              <td className="py-6 text-xs font-bold text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                              <td className="py-6 text-right">
                                 <button onClick={() => onUpdateUser({ ...u, status: u.status === 'Active' ? 'Banned' : 'Active' })} className={`p-2 rounded-xl transition-all ${u.status === 'Active' ? 'hover:bg-red-50 hover:text-red-500' : 'hover:bg-green-50 hover:text-green-500'}`}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                                 </button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          )}

          {activeTab === 'pixel' && (
             <div className={`p-10 rounded-[32px] border ${isDarkMode ? 'bg-[#1A1D1F] border-[#272B30]' : 'bg-white border-[#EFEFEF]'}`}>
                <div className="flex justify-between items-center mb-12">
                   <div>
                      <h3 className="text-3xl font-black">Pixel Setup (CAPI)</h3>
                      <p className="text-sm font-bold text-[#6F767E] mt-2">Manage server-side Facebook Conversions API automatically.</p>
                   </div>
                   <div className="flex items-center gap-3">
                      <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${pixelSettings?.status === 'Active' ? 'bg-[#27AE60]/10 text-[#27AE60]' : 'bg-red-500/10 text-red-500'}`}>
                         Status: {pixelSettings?.status}
                      </span>
                   </div>
                </div>

                <div className="max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-12">
                   <div className="md:col-span-7 space-y-8">
                      <div className="p-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl flex items-start gap-4 transition-all hover:shadow-lg">
                          <div className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center font-bold flex-shrink-0">f</div>
                          <div>
                              <h4 className="font-bold text-blue-900 dark:text-blue-300">Automated Server Integration</h4>
                              <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                                 Bypass browser ad-blockers and iOS privacy restrictions with a zero-touch server setup.
                              </p>
                          </div>
                      </div>

                      <div className="space-y-6">
                           <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-[#6F767E] uppercase tracking-widest">Facebook Pixel ID</label>
                                 <input 
                                    type="text" 
                                    value={pixelSettings?.pixelId || ''} 
                                    onChange={e => onUpdatePixelSettings?.({...pixelSettings!, pixelId: e.target.value})}
                                    className={`w-full px-5 py-4 border-none rounded-2xl font-bold text-sm outline-none transition-colors ${isDarkMode ? 'bg-[#272B30]' : 'bg-gray-50'}`} 
                                    placeholder="e.g. 1234567890"
                                 />
                              </div>
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-[#6F767E] uppercase tracking-widest">Facebook App ID</label>
                                 <input 
                                    type="text" 
                                    value={pixelSettings?.appId || ''} 
                                    onChange={e => onUpdatePixelSettings?.({...pixelSettings!, appId: e.target.value})}
                                    className={`w-full px-5 py-4 border-none rounded-2xl font-bold text-sm outline-none transition-colors ${isDarkMode ? 'bg-[#272B30]' : 'bg-gray-50'}`} 
                                    placeholder="e.g. 9876543210"
                                 />
                              </div>
                           </div>

                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-[#6F767E] uppercase tracking-widest">System Access Token (CAPI)</label>
                              <textarea 
                                 rows={4}
                                 value={pixelSettings?.accessToken || ''} 
                                 onChange={e => onUpdatePixelSettings?.({...pixelSettings!, accessToken: e.target.value})}
                                 className={`w-full px-5 py-4 border-none rounded-2xl font-bold text-sm outline-none resize-none transition-colors ${isDarkMode ? 'bg-[#272B30]' : 'bg-gray-50'}`} 
                                 placeholder="Paste your Facebook Conversions API Access Token here..."
                              />
                           </div>

                           {pixelError && (
                              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2 animate-bounce">
                                 <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                                 {pixelError}
                              </div>
                           )}

                           <div className="pt-4">
                              <button 
                                 onClick={handleTestPixel}
                                 disabled={isTestingPixel}
                                 className={`w-full py-5 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all ${
                                    isTestingPixel ? 'bg-gray-200 text-gray-400 cursor-wait' : 'bg-[#FF7E3E] text-white shadow-xl shadow-orange-100 hover:scale-[1.01] active:scale-95'
                                 }`}
                              >
                                 {isTestingPixel ? (
                                    <>
                                       <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                       {pixelStep === 1 ? 'Verifying Credentials...' : pixelStep === 2 ? 'Deploying Cloud Tags...' : 'Finalizing Live Sync...'}
                                    </>
                                 ) : (
                                    <>
                                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                                       Test & Save Connection
                                    </>
                                 )}
                              </button>
                           </div>
                      </div>
                   </div>

                   <div className="md:col-span-5 space-y-6">
                       <div className={`p-8 rounded-[32px] border ${isDarkMode ? 'bg-[#111315] border-[#272B30]' : 'bg-gray-50 border-transparent'}`}>
                           <h4 className="text-sm font-black uppercase mb-6 tracking-widest">Automation Log</h4>
                           <div className="space-y-4">
                               {[
                                 { label: 'Cloud Deployment', status: pixelSettings?.status === 'Active' ? 'Complete' : 'Pending' },
                                 { label: 'Event Deduplication', status: pixelSettings?.status === 'Active' ? 'Enabled' : 'Pending' },
                                 { label: 'Pixel Data Flow', status: pixelSettings?.status === 'Active' ? 'Active' : 'Offline' },
                                 { label: 'Tag Verification', status: pixelSettings?.status === 'Active' ? 'Passed' : 'Pending' },
                               ].map((log, i) => (
                                 <div key={i} className="flex items-center justify-between text-[11px] font-bold">
                                    <span className="text-[#6F767E]">{log.label}</span>
                                    <span className={`transition-colors duration-500 ${log.status === 'Complete' || log.status === 'Active' || log.status === 'Passed' || log.status === 'Enabled' ? 'text-green-500 font-black' : 'text-gray-400'}`}>{log.status}</span>
                                 </div>
                               ))}
                           </div>
                       </div>
                       
                       <div className="p-8 rounded-[32px] bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 transition-transform hover:scale-[1.02]">
                           <h4 className="text-sm font-black text-orange-600 uppercase mb-2 tracking-widest">Pro Tip</h4>
                           <p className="text-xs font-bold text-orange-800 dark:text-orange-300 leading-relaxed">
                              Your Facebook Pixel will automatically capture purchase events from the checkout page once connected. No manual event tagging required.
                           </p>
                       </div>
                   </div>
                </div>
             </div>
          )}
        </div>
        
        <footer className={`p-8 text-center text-[10px] font-black text-[#6F767E] uppercase tracking-widest ${isDarkMode ? 'border-[#272B30]' : 'border-[#EFEFEF]'} border-t transition-colors`}>
           Dataflow Enterprise Analytics © 2026 • Real-time Monitoring Engine v2.4.0
        </footer>
      </main>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className={`w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden flex flex-col ${isDarkMode ? 'bg-[#1A1D1F] border-[#272B30]' : 'bg-white border-[#EFEFEF]'} border animate-scaleIn`}>
            <div className="p-8 text-center space-y-4">
              <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${confirmModal.isDestructive ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'}`}>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </div>
              <h3 className="text-2xl font-black">{confirmModal.title}</h3>
              <p className={`text-sm font-bold ${isDarkMode ? 'text-gray-400' : 'text-[#6F767E]'} leading-relaxed`}>{confirmModal.message}</p>
            </div>
            <div className="p-8 pt-0 grid grid-cols-2 gap-4">
              <button 
                onClick={() => setConfirmModal(prev => ({...prev, isOpen: false}))}
                className={`py-4 rounded-2xl font-black text-sm transition-all ${isDarkMode ? 'bg-[#272B30] text-white hover:bg-gray-800' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                Cancel
              </button>
              <button 
                onClick={confirmModal.onConfirm}
                className={`py-4 rounded-2xl font-black text-sm text-white shadow-xl transition-all hover:scale-105 active:scale-95 ${confirmModal.isDestructive ? 'bg-red-500 shadow-red-100' : 'bg-[#FF7E3E] shadow-orange-100'}`}
              >
                {confirmModal.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-fadeIn">
           <div className={`w-full max-w-5xl max-h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col ${isDarkMode ? 'bg-[#1A1D1F] border-[#272B30]' : 'bg-white border-[#EFEFEF]'} border animate-scaleIn`}>
              <div className="p-10 border-b dark:border-[#272B30] flex justify-between items-center">
                 <div>
                    <h3 className="text-2xl font-black">{editingProduct ? 'Update SKU' : 'New Database Entry'}</h3>
                    <p className="text-xs font-bold text-[#6F767E] mt-1">Configure item properties and inventory levels.</p>
                 </div>
                 <button onClick={() => setShowProductModal(false)} className="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-[#272B30] flex items-center justify-center transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); if(editingProduct) onUpdate(productForm as Product); else onAdd({...productForm, id: Math.random().toString(36).substr(2,9)} as Product); setShowProductModal(false); }} className="flex-grow overflow-y-auto p-10 no-scrollbar space-y-8">
                 <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageFileChange} 
                    accept="image/*" 
                    className="hidden" 
                 />

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-[#6F767E]">Product Name</label>
                          <input type="text" required value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className={`w-full px-5 py-4 border-none rounded-2xl font-bold text-sm outline-none transition-colors ${isDarkMode ? 'bg-[#272B30]' : 'bg-gray-50'} focus:ring-2 focus:ring-orange-500/10`} />
                       </div>
                       
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-[#6F767E]">Category</label>
                          <select 
                            value={productForm.category} 
                            onChange={e => setProductForm({...productForm, category: e.target.value})}
                            className={`w-full px-5 py-4 border-none rounded-2xl font-bold text-sm outline-none transition-colors ${isDarkMode ? 'bg-[#272B30]' : 'bg-gray-50'}`}
                          >
                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                          </select>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase text-[#6F767E]">Public Price ($)</label>
                             <input type="number" required value={productForm.price} onChange={e => setProductForm({...productForm, price: Number(e.target.value)})} className={`w-full px-5 py-4 border-none rounded-2xl font-bold text-sm outline-none transition-colors ${isDarkMode ? 'bg-[#272B30]' : 'bg-gray-50'}`} />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase text-[#6F767E]">Inventory Stock</label>
                             <input type="number" required value={productForm.stock} onChange={e => setProductForm({...productForm, stock: Number(e.target.value)})} className={`w-full px-5 py-4 border-none rounded-2xl font-bold text-sm outline-none transition-colors ${isDarkMode ? 'bg-[#272B30]' : 'bg-gray-50'}`} />
                          </div>
                       </div>

                       {/* Variant Control Toggles */}
                       <div className="p-6 rounded-[24px] bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 space-y-4">
                          <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Enable Product Variants</h4>
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                               <span className="text-xs font-bold text-[#6F767E]">Display Size Options</span>
                               <button type="button" onClick={() => setProductForm(prev => ({...prev, hasSizes: !productForm.hasSizes}))} className={`w-10 h-5 rounded-full relative transition-all duration-500 ${productForm.hasSizes ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-500 ${productForm.hasSizes ? 'left-5.5' : 'left-0.5'}`}></div>
                               </button>
                            </div>
                            <div className="flex items-center justify-between">
                               <span className="text-xs font-bold text-[#6F767E]">Display Color Options</span>
                               <button type="button" onClick={() => setProductForm(prev => ({...prev, hasColors: !productForm.hasColors}))} className={`w-10 h-5 rounded-full relative transition-all duration-500 ${productForm.hasColors ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-500 ${productForm.hasColors ? 'left-5.5' : 'left-0.5'}`}></div>
                               </button>
                            </div>
                          </div>
                       </div>

                       <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase text-[#6F767E]">Product Media Gallery</label>
                          <div className="space-y-3">
                            {productForm.images?.map((url, idx) => (
                              <div key={idx} className="flex gap-2 items-center group/img animate-fadeIn">
                                <div 
                                  onClick={() => triggerGallery(idx)}
                                  className="w-12 h-14 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200 cursor-pointer hover:border-orange-500 transition-all hover:scale-105"
                                >
                                  {url ? <img src={url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></div>}
                                </div>
                                <div className="flex-grow relative">
                                  <input 
                                    type="text" 
                                    value={url} 
                                    onChange={(e) => {
                                      const newImages = [...(productForm.images || [])];
                                      newImages[idx] = e.target.value;
                                      setProductForm(prev => ({...prev, images: newImages}));
                                    }}
                                    placeholder="Image URL or Uploaded Base64..."
                                    className={`w-full px-4 py-3 pr-10 border-none rounded-xl font-bold text-xs outline-none transition-colors ${isDarkMode ? 'bg-[#272B30]' : 'bg-gray-50'}`}
                                  />
                                  <button 
                                    type="button" 
                                    onClick={() => triggerGallery(idx)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 transition-transform active:scale-90"
                                    title="Upload from Gallery"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                  </button>
                                </div>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const newImages = (productForm.images || []).filter((_, i) => i !== idx);
                                    setProductForm(prev => ({...prev, images: newImages.length ? newImages : ['']}));
                                  }}
                                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover/img:opacity-100"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                              </div>
                            ))}
                            <div className="flex gap-3 pt-2">
                              <button 
                                type="button"
                                onClick={() => setProductForm(prev => ({...prev, images: [...(productForm.images || []), '']}))}
                                className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 flex items-center gap-1 ml-1 transition-transform active:scale-95"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
                                Add URL Field
                              </button>
                              <button 
                                type="button"
                                onClick={() => {
                                  const newImages = [...(productForm.images || []), ''];
                                  setProductForm(prev => ({...prev, images: newImages}));
                                  setTimeout(() => triggerGallery(newImages.length - 1), 0);
                                }}
                                className="text-[10px] font-black uppercase text-orange-600 hover:text-orange-700 flex items-center gap-1 ml-1 transition-transform active:scale-95"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                Add from Gallery
                              </button>
                            </div>
                          </div>
                       </div>
                    </div>
                    <div className="space-y-8">
                       <div className="p-6 rounded-[24px] bg-[#FF7E3E]/5 border border-[#FF7E3E]/20 space-y-4 shadow-inner transition-all hover:bg-[#FF7E3E]/10">
                          <h4 className="text-xs font-black uppercase text-[#FF7E3E] tracking-widest">Financial Strategy</h4>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1">
                                <label className="text-[9px] font-bold text-[#6F767E] uppercase">Acquisition Cost</label>
                                <input type="number" step="0.01" value={productForm.purchaseCost} onChange={e => setProductForm(prev => ({...prev, purchaseCost: Number(e.target.value)}))} className={`w-full px-4 py-3 rounded-xl border-none font-bold text-sm outline-none transition-colors ${isDarkMode ? 'bg-[#1A1D1F]' : 'bg-white'} focus:ring-1 focus:ring-orange-500/10`} />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[9px] font-bold text-[#6F767E] uppercase">Internal Val.</label>
                                <input type="number" step="0.01" value={productForm.internalPrice} onChange={e => setProductForm(prev => ({...prev, internalPrice: Number(e.target.value)}))} className={`w-full px-4 py-3 rounded-xl border-none font-bold text-sm outline-none transition-colors ${isDarkMode ? 'bg-[#1A1D1F]' : 'bg-white'} focus:ring-1 focus:ring-orange-500/10`} />
                             </div>
                          </div>
                       </div>

                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-[#6F767E]">Product Description</label>
                          <textarea 
                            rows={6}
                            value={productForm.description} 
                            onChange={e => setProductForm(prev => ({...prev, description: e.target.value}))} 
                            className={`w-full px-5 py-4 border-none rounded-2xl font-bold text-sm outline-none resize-none transition-colors ${isDarkMode ? 'bg-[#272B30]' : 'bg-gray-50'} focus:ring-2 focus:ring-orange-500/10`} 
                          />
                       </div>

                       <div className="flex items-center gap-3">
                          <button type="button" onClick={() => setProductForm(prev => ({...prev, isActive: !productForm.isActive}))} className={`w-12 h-6 rounded-full relative transition-all duration-500 ${productForm.isActive ? 'bg-[#FF7E3E]' : 'bg-gray-300'}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-500 ${productForm.isActive ? 'left-7' : 'left-1'}`}></div>
                          </button>
                          <span className="text-xs font-bold text-[#6F767E]">Listing is Active</span>
                       </div>
                    </div>
                 </div>
                 <div className="pt-10 flex justify-end gap-4 border-t dark:border-[#272B30]">
                    <button type="submit" className="bg-[#FF7E3E] text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl shadow-orange-100 transform active:scale-95 transition-all hover:scale-[1.02]">
                       Commit Database Changes
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-fadeIn">
           <div className={`w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col ${isDarkMode ? 'bg-[#1A1D1F] border-[#272B30]' : 'bg-white border-[#EFEFEF]'} border animate-scaleIn`}>
              <div className="p-8 border-b dark:border-[#272B30] flex justify-between items-center">
                 <h3 className="text-xl font-black">{editingCategory ? 'Edit Category' : 'New Category'}</h3>
                 <button onClick={() => setShowCategoryModal(false)} className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-[#272B30] flex items-center justify-center transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg></button>
              </div>
              <form onSubmit={(e) => { 
                e.preventDefault(); 
                if(editingCategory) onUpdateCategory?.(categoryForm as Category); 
                else onAddCategory(categoryForm.name!); 
                setShowCategoryModal(false); 
              }} className="p-8 space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-[#6F767E] tracking-widest">Category Name</label>
                    <input type="text" required value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} className={`w-full px-5 py-4 border-none rounded-2xl font-bold text-sm outline-none transition-colors ${isDarkMode ? 'bg-[#272B30]' : 'bg-gray-50'} focus:ring-2 focus:ring-orange-500/10`} placeholder="e.g. Footwear" />
                 </div>
                 <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setCategoryForm({...categoryForm, isActive: !categoryForm.isActive})} className={`w-12 h-6 rounded-full relative transition-all duration-500 ${categoryForm.isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-500 ${categoryForm.isActive ? 'left-7' : 'left-1'}`}></div>
                    </button>
                    <span className="text-xs font-bold text-[#6F767E]">Visible in Storefront</span>
                 </div>
                 <div className="pt-4">
                    <button type="submit" className="w-full bg-[#FF7E3E] text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-orange-100 transform active:scale-95 transition-all hover:scale-[1.02]">
                       Save Category
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes rowIn { from { opacity: 0; transform: translateX(-15px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes metricPulse { 
          0% { transform: scale(1); filter: brightness(1); } 
          50% { transform: scale(1.04); filter: brightness(1.15); text-shadow: 0 0 15px rgba(255, 126, 62, 0.2); } 
          100% { transform: scale(1); filter: brightness(1); } 
        }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        .animate-scaleIn { animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-rowIn { animation: rowIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        .animate-metricPulse { animation: metricPulse 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .left-5\\.5 { left: 1.375rem; }
      `}</style>
    </div>
  );
};

export default AdminPanel;
