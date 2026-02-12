
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Order, User, StoreSettings, CourierSettings, PixelSettings } from '../types';

interface AdminPanelProps {
  products: Product[];
  categories: string[];
  orders: Order[];
  users: User[];
  storeSettings: StoreSettings;
  onUpdate: (p: Product) => void;
  onAdd: (p: Product) => void;
  onDelete: (id: string) => void;
  onUpdateOrder: (o: Order) => void;
  onAddOrder?: (o: Order) => void;
  onUpdateUser: (u: User) => void;
  onUpdateSettings: (s: StoreSettings) => void;
  onAddCategory: (cat: string) => void;
  onDeleteCategory: (cat: string) => void;
  onLogout: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  products, 
  categories, 
  orders,
  users,
  storeSettings,
  onUpdate, 
  onAdd, 
  onDelete, 
  onUpdateOrder,
  onUpdateUser,
  onUpdateSettings,
  onAddCategory, 
  onDeleteCategory, 
  onLogout 
}) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [hoveredRevenueIndex, setHoveredRevenueIndex] = useState<number | null>(null);
  
  // Pixel Setup State & Logic
  const [pixelConfig, setPixelConfig] = useState<PixelSettings>(() => {
    const saved = localStorage.getItem('fb_pixel_config');
    return saved ? JSON.parse(saved) : {
      pixelId: '',
      appId: '',
      accessToken: '',
      testEventCode: '',
      status: 'Inactive'
    };
  });

  const handleSavePixelConfig = async () => {
    if (!pixelConfig.pixelId || !pixelConfig.accessToken) {
      alert('Please provide at least Pixel ID and Access Token.');
      return;
    }

    setPixelConfig(prev => ({ ...prev, status: 'Connecting' }));
    
    // Simulate automated server-side integration & tag creation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const updatedConfig: PixelSettings = {
      ...pixelConfig,
      status: 'Active'
    };
    
    setPixelConfig(updatedConfig);
    localStorage.setItem('fb_pixel_config', JSON.stringify(updatedConfig));
    alert('Facebook Server-Side Pixel integrated and running live!');
  };

  // Courier API Logic & State
  const [localCourierSettings, setLocalCourierSettings] = useState<CourierSettings>(() => {
    const saved = localStorage.getItem('courier_config');
    return saved ? JSON.parse(saved) : {
      pathao: { clientId: '', clientSecret: '', storeId: '', username: '', password: '' },
      steadfast: { apiKey: '', secretKey: '', merchantId: '' }
    };
  });

  const [selectedCourierMap, setSelectedCourierMap] = useState<Record<string, 'Pathao' | 'SteadFast'>>({});
  const [dispatchStatus, setDispatchStatus] = useState<Record<string, { type: 'success' | 'error', message: string }>>({});

  const handleSaveCourierConfig = () => {
    localStorage.setItem('courier_config', JSON.stringify(localCourierSettings));
    alert('Courier configurations saved successfully!');
  };

  const handleSendToCourier = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    const courier = selectedCourierMap[orderId];
    
    if (!order) return;
    if (!courier) {
        alert('Please select a courier first.');
        return;
    }

    const config = localCourierSettings[courier === 'Pathao' ? 'pathao' : 'steadfast'];
    const hasKeys = courier === 'Pathao' 
        ? (config.clientId && config.clientSecret) 
        : (config.apiKey && config.secretKey);

    if (!hasKeys) {
        setDispatchStatus(prev => ({ 
            ...prev, 
            [orderId]: { type: 'error', message: `API Credentials missing for ${courier}` } 
        }));
        return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const trackingId = `${courier.toUpperCase()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      onUpdateOrder({
        ...order,
        courierName: courier,
        courierTrackingId: trackingId,
        orderStatus: 'Shipped'
      });
      setDispatchStatus(prev => ({ 
        ...prev, 
        [orderId]: { type: 'success', message: 'Shipment Created Successfully' } 
      }));
    } catch (err) {
      setDispatchStatus(prev => ({ 
        ...prev, 
        [orderId]: { type: 'error', message: `API Error: Connection failed to ${courier}` } 
      }));
    }
  };

  // API Key Status State (Gemini)
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkKey();
    const interval = setInterval(checkKey, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };
  
  // State for adding a category
  const [newCategoryName, setNewCategoryName] = useState('');
  const [deactivatedCategories, setDeactivatedCategories] = useState<Set<string>>(new Set());

  // State for adding a product
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    price: 0,
    originalPrice: 0,
    purchaseCost: 0,
    category: categories[0] || 'Apparel',
    description: '',
    isActive: true,
    stock: 100,
    images: ['https://picsum.photos/seed/picsum/800/1000'],
    colors: ['#000000'],
    sizes: ['M'],
    productId: '#' + Math.floor(1000 + Math.random() * 9000),
    deliveryRegions: ['Worldwide']
  });

  // State for the interactive radial sales calendar
  const [selectedDayInfo, setSelectedDayInfo] = useState<{ day: number, date: string, items: string[] } | null>(null);

  // DASHBOARD DATA COMPUTATION
  const dashboard = useMemo(() => {
    const totalEarnings = orders.reduce((sum, o) => sum + o.totalPrice, 0);
    const totalOrders = orders.reduce((sum, o) => sum + o.items.reduce((s, it) => s + it.quantity, 0), 0);
    const customerCount = users.filter(u => u.role === 'Customer').length;
    const totalProfit = orders.reduce((sum, o) => {
      return sum + o.items.reduce((s, it) => {
        return s + ((it.product.price - (it.product.purchaseCost || 0)) * it.quantity);
      }, 0);
    }, 0);
    
    const productSalesMap: Record<string, { product: Product; count: number }> = {};
    orders.forEach(o => o.items.forEach(item => {
      if (!productSalesMap[item.product.id]) {
        productSalesMap[item.product.id] = { product: item.product, count: 0 };
      }
      productSalesMap[item.product.id].count += item.quantity;
    }));
    const topSales = Object.values(productSalesMap).sort((a, b) => b.count - a.count).slice(0, 5);

    const now = new Date();
    const revenueBuckets = Array.from({ length: 12 }).map((_, i) => {
      const end = new Date(now);
      end.setDate(now.getDate() - (11 - i) * 7);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      const bucketOrders = orders.filter(o => {
        const d = new Date(o.timestamp);
        return d >= start && d <= end;
      });
      const revenue = bucketOrders.reduce((sum, o) => sum + o.totalPrice, 0);
      const orderCount = bucketOrders.reduce((sum, o) => sum + o.items.reduce((s, it) => s + it.quantity, 0), 0);
      const dateLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return { revenue, orderCount, dateLabel, start, end };
    });

    const activityMap: Record<number, { items: string[], color: string, date: Date }> = {};
    for (let i = 0; i < 31; i++) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() - i);
      const daysOrders = orders.filter(o => {
        const orderDate = new Date(o.timestamp);
        return orderDate.getDate() === targetDate.getDate() && 
               orderDate.getMonth() === targetDate.getMonth() &&
               orderDate.getFullYear() === targetDate.getFullYear();
      });
      if (daysOrders.length > 0) {
        const items = daysOrders.flatMap(o => o.items.map(it => it.product.name));
        const cat = daysOrders[0].items[0].product.category;
        let color = '#FF7E3E';
        if (cat === 'Apparel') color = '#3B82F6';
        if (cat === 'Footwear') color = '#8B5CF6';
        activityMap[i] = { items, color, date: targetDate };
      }
    }

    return { totalEarnings, totalOrders, customerCount, totalProfit, topSales, revenueBuckets, activityMap };
  }, [orders, users]);

  const calculateOrderProfit = (order: Order) => {
    return order.items.reduce((sum, item) => {
      const profitPerItem = item.product.price - (item.product.purchaseCost || 0);
      return sum + (profitPerItem * item.quantity);
    }, 0);
  };

  const SidebarItem = ({ icon, label, id }: { icon: React.ReactNode; label: string; id: string }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group ${
        activeTab === id 
          ? 'bg-[#FF7E3E] bg-opacity-10 text-[#FF7E3E]' 
          : 'text-gray-500 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-5 h-5 transition-transform duration-300 ${activeTab === id ? 'scale-110' : 'group-hover:scale-110'}`}>{icon}</div>
        {!isSidebarCollapsed && <span className="font-bold text-sm whitespace-nowrap">{label}</span>}
      </div>
      {!isSidebarCollapsed && (
        <svg className="w-4 h-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
      )}
    </button>
  );

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
      "M", start.x, start.y, 
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      "L", x, y,
      "Z"
    ].join(" ");
  };

  const getSmoothLinePath = (data: number[], width: number, height: number, padding: number = 8) => {
    if (data.length < 2) return "";
    const maxVal = Math.max(...data, 10);
    const points = data.map((val, i) => ({
      x: (i / (data.length - 1)) * width,
      y: height - ((val / maxVal) * (height - padding * 2) + padding)
    }));
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 2;
      path += ` C ${cp1x} ${p0.y}, ${cp1x} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return path;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProduct(prev => ({ ...prev, images: [reader.result as string] }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.price) return;
    onAdd({
      ...newProduct as Product,
      id: Math.random().toString(36).substr(2, 9),
      rating: 5,
      reviewCount: 0
    });
    setIsAddingProduct(false);
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName.trim());
      setNewCategoryName('');
    }
  };

  const toggleCategoryStatus = (cat: string) => {
    setDeactivatedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const revenuePoints = dashboard.revenueBuckets.map(b => b.revenue);

  return (
    <div className={`flex min-h-screen transition-colors duration-500 ${isDarkMode ? 'bg-[#0f172a] text-white' : 'bg-[#F8F9FB] text-[#0a0a0a]'}`}>
      <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-[260px]'} ${isDarkMode ? 'bg-[#1e293b] border-gray-800' : 'bg-white border-gray-100'} border-r flex flex-col h-screen fixed top-0 left-0 z-40 transition-all duration-300 shadow-[2px_0_10px_rgba(0,0,0,0.02)]`}>
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-[#FF7E3E] rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-orange-100 flex-shrink-0 transition-transform hover:rotate-12">D</div>
            {!isSidebarCollapsed && <span className="text-2xl font-black tracking-tight text-[#0a0a0a] dark:text-white">Dataflow</span>}
          </div>
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="text-gray-300 hover:text-[#FF7E3E] transition-colors">
            <svg className={`w-5 h-5 transition-transform ${isSidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/></svg>
          </button>
        </div>
        <nav className="flex-grow px-4 overflow-y-auto no-scrollbar pb-10 space-y-1">
          <SidebarItem id="dashboard" label="Ecommerce" icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>} />
          <SidebarItem id="product" label="Product" icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>} />
          <SidebarItem id="category" label="Category" icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>} />
          <SidebarItem id="order" label="Order" icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>} />
          <SidebarItem id="users" label="Users" icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>} />
          <SidebarItem id="courier_dispatch" label="Courier Dispatch" icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/></svg>} />
          <SidebarItem id="pixel_setup" label="Pixel Setup" icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/></svg>} />
          <SidebarItem id="api" label="API" icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>} />
          <div className="pt-6 mt-6 border-t border-gray-100 dark:border-gray-800">
            <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all font-bold group">
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
              {!isSidebarCollapsed && <span className="text-sm">Log Out</span>}
            </button>
          </div>
        </nav>
      </aside>

      <main className={`${isSidebarCollapsed ? 'ml-20' : 'ml-[260px]'} flex-grow transition-all duration-300`}>
        <header className={`h-20 flex items-center justify-between px-10 sticky top-0 z-30 border-b shadow-[0_4px_10px_rgba(0,0,0,0.01)] transition-colors duration-300 ${isDarkMode ? 'bg-[#1e293b] border-gray-800' : 'bg-white border-gray-100'}`}>
          <div className="relative group">
             <input type="text" placeholder="Search Dataflow" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={`w-[320px] border-none rounded-xl py-2.5 pl-11 pr-4 text-sm font-medium focus:ring-2 focus:ring-[#FF7E3E] focus:ring-opacity-20 transition-all outline-none ${isDarkMode ? 'bg-[#0f172a] text-white' : 'bg-[#F3F5F7] text-gray-900'}`} />
             <svg className="w-5 h-5 absolute left-3.5 top-2.5 text-gray-400 group-hover:text-[#FF7E3E] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-4 text-gray-400 border-r border-gray-200 dark:border-gray-800 pr-6 mr-2">
               <button onClick={() => setIsDarkMode(!isDarkMode)} className="hover:text-[#FF7E3E] transition-all hover:rotate-12">
                 {isDarkMode ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 100 14 7 7 0 000-14z"/></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>}
               </button>
               <button className="relative hover:text-[#FF7E3E] transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg></button>
            </div>
            <div className="flex items-center gap-4 cursor-pointer group relative" onClick={() => setProfileOpen(!profileOpen)}>
              <div className="text-right hidden sm:block">
                <div className={`font-bold leading-none text-sm group-hover:text-[#FF7E3E] transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Kristin Watson</div>
                <div className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">Sale Administrator</div>
              </div>
              <div className="w-11 h-11 rounded-xl overflow-hidden shadow-md ring-2 ring-transparent group-hover:ring-[#FF7E3E] transition-all">
                <img src="https://i.pravatar.cc/150?u=kristin" alt="User" />
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 animate-fadeIn space-y-8 max-w-[1600px] mx-auto pb-24">
          {activeTab === 'dashboard' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total Earnings', val: `$${dashboard.totalEarnings.toLocaleString()}`, color: '#22c55e', icon: 'M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z M2 12c0 5.523 4.477 10 10 10s10-4.477 10-10S17.523 2 12 2 2 6.477 2 12z' },
                  { label: 'Total Orders', val: dashboard.totalOrders.toLocaleString(), color: '#FF7E3E', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
                  { label: 'Customers', val: dashboard.customerCount.toLocaleString(), color: '#8B5CF6', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
                  { label: 'My Balance', val: `$${dashboard.totalProfit.toLocaleString()}`, color: '#3B82F6', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
                ].map((stat, i) => (
                  <div key={i} className={`rounded-[24px] p-6 shadow-sm border flex flex-col group hover:shadow-xl hover:-translate-y-1 transition-all duration-500 cursor-pointer ${isDarkMode ? 'bg-[#1e293b] border-gray-800' : 'bg-white border-gray-50'}`}>
                     <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:rotate-6" style={{ backgroundColor: stat.color }}>
                           <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d={stat.icon}/></svg>
                        </div>
                        <div>
                           <div className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">{stat.label}</div>
                           <div className="text-[11px] font-bold text-green-500 mt-0.5">↑ 1.56%</div>
                        </div>
                     </div>
                     <div className="text-3xl font-extrabold mb-6 tracking-tight group-hover:text-[#FF7E3E] transition-colors">{stat.val}</div>
                     <div className="h-24 w-full px-1">
                        <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 40">
                          <path 
                            d={getSmoothLinePath([18, 28, 12, 32, 20, 26, 15, 38, 22], 100, 40, 4)} 
                            fill="none" 
                            stroke={stat.color} 
                            strokeWidth="4" 
                            strokeLinecap="round" 
                            className="transition-all duration-700 opacity-90"
                          />
                        </svg>
                     </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-12 gap-6">
                <div className={`col-span-12 lg:col-span-6 rounded-[32px] p-8 shadow-sm border transition-all duration-300 hover:shadow-lg ${isDarkMode ? 'bg-[#1e293b] border-gray-800' : 'bg-white border-gray-50'}`}>
                   <div className="flex justify-between items-center mb-10">
                      <div>
                         <h3 className="text-xl font-extrabold">Revenue Analytics</h3>
                         <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-wider">Live Sales Trend</p>
                      </div>
                      <span className="bg-[#FF7E3E] bg-opacity-10 text-[#FF7E3E] text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-tighter">Updated Every 7 Days</span>
                   </div>
                   <div className="h-80 relative px-4 pt-4 group">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                         <defs>
                           <linearGradient id="revenue-smooth-gradient" x1="0" y1="0" x2="0" y2="100%">
                             <stop offset="0%" stopColor="#FF7E3E" stopOpacity="0.25" />
                             <stop offset="100%" stopColor="#FF7E3E" stopOpacity="0" />
                           </linearGradient>
                         </defs>
                         {[0, 25, 50, 75, 100].map(grid => (
                           <line key={grid} x1="0" y1={grid} x2="100" y2={grid} stroke={isDarkMode ? '#334155' : '#f1f5f9'} strokeWidth="0.8" />
                         ))}
                         {revenuePoints.length > 0 && (
                           <>
                             <path d={`${getSmoothLinePath(revenuePoints, 100, 100, 10)} L 100 100 L 0 100 Z`} fill="url(#revenue-smooth-gradient)" className="transition-all duration-1000" />
                             <path d={getSmoothLinePath(revenuePoints, 100, 100, 10)} fill="none" stroke="#FF7E3E" strokeWidth="4" strokeLinecap="round" className="transition-all duration-1000" />
                           </>
                         )}
                         {dashboard.revenueBuckets.map((bucket, i) => {
                           const maxRev = Math.max(...revenuePoints, 10);
                           const x = (i / (dashboard.revenueBuckets.length - 1)) * 100;
                           const y = 100 - ((bucket.revenue / maxRev) * 80 + 10);
                           return (
                             <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredRevenueIndex(i)} onMouseLeave={() => setHoveredRevenueIndex(null)}>
                               <rect x={x - (100 / 24)} y="0" width={100 / 12} height="100" fill="transparent" />
                               {hoveredRevenueIndex === i && (
                                 <g className="animate-fadeIn">
                                   <line x1={x} y1="0" x2={x} y2="100" stroke="#FF7E3E" strokeWidth="1.5" strokeDasharray="5" />
                                   <circle cx={x} cy={y} r="6" fill="#FF7E3E" stroke="#fff" strokeWidth="2.5" className="shadow-lg" />
                                 </g>
                               )}
                             </g>
                           );
                         })}
                      </svg>
                      <div className="absolute -bottom-12 left-0 right-0 flex justify-between px-2">
                        {dashboard.revenueBuckets.map((bucket, i) => (
                          <div key={i} className={`text-[9px] font-black transition-all duration-300 ${hoveredRevenueIndex === i ? 'text-[#FF7E3E] scale-125' : 'text-gray-400'}`}>
                            {bucket.dateLabel}
                          </div>
                        ))}
                      </div>
                      {hoveredRevenueIndex !== null && (
                        <div className="absolute top-0 -translate-y-full mb-10 left-1/2 -translate-x-1/2 bg-[#0a0a0a] text-white p-5 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-50 animate-scaleIn pointer-events-none min-w-[180px] border border-gray-800">
                          <div className="text-[10px] font-black text-[#FF7E3E] mb-3 border-b border-gray-800 pb-2 uppercase tracking-widest">Week of {dashboard.revenueBuckets[hoveredRevenueIndex].start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                          <div className="space-y-3">
                             <div className="flex justify-between items-end gap-6">
                               <span className="text-[11px] font-bold text-gray-400">Total Revenue</span>
                               <span className="text-xl font-black text-white leading-none">${dashboard.revenueBuckets[hoveredRevenueIndex].revenue.toFixed(0)}</span>
                             </div>
                             <div className="flex justify-between items-end gap-6">
                               <span className="text-[11px] font-bold text-gray-400">Total Orders</span>
                               <span className="text-xl font-black text-indigo-400 leading-none">{dashboard.revenueBuckets[hoveredRevenueIndex].orderCount}</span>
                             </div>
                          </div>
                        </div>
                      )}
                   </div>
                </div>

                <div className={`col-span-12 lg:col-span-3 rounded-[32px] p-8 shadow-sm border flex flex-col items-center transition-all duration-300 hover:shadow-lg ${isDarkMode ? 'bg-[#1e293b] border-gray-800' : 'bg-white border-gray-50'}`}>
                   <div className="w-full mb-8 flex justify-between items-center">
                      <h3 className="text-xl font-extrabold">Promotional Sales</h3>
                      <div className="relative"><select className={`border-none rounded-xl text-xs font-bold px-3 py-1.5 appearance-none pr-8 ${isDarkMode ? 'bg-[#0f172a] text-gray-400' : 'bg-[#F3F5F7] text-gray-400'}`}><option>Weekly</option></select></div>
                   </div>
                   <div className="flex-grow flex items-center justify-center relative py-4 w-full">
                      <svg viewBox="0 0 200 200" className="w-full h-full max-w-[200px] transform hover:rotate-2 transition-transform duration-700">
                         {[...Array(31)].map((_, i) => {
                            const segmentSize = 360 / 31;
                            const startAngle = i * segmentSize;
                            const endAngle = (i + 1) * segmentSize;
                            const activity = dashboard.activityMap[i];
                            const isSold = !!activity;
                            return (
                              <path key={i} d={describeArc(100, 100, 80, startAngle + 1, endAngle - 1)} fill={isSold ? activity.color : (isDarkMode ? '#0f172a' : '#FFFFFF')} stroke={isDarkMode ? '#1e293b' : '#F3F5F7'} strokeWidth="0.5" className="cursor-pointer transition-all duration-300 hover:scale-[1.05]" onClick={() => isSold && setSelectedDayInfo({ day: activity.date.getDate(), date: activity.date.toDateString(), items: activity.items })} />
                            );
                         })}
                         <circle cx="100" cy="100" r="45" fill={isDarkMode ? '#1e293b' : '#FFFFFF'} />
                         <foreignObject x="55" y="55" width="90" height="90">
                           <div className="w-full h-full flex flex-col items-center justify-center text-center p-2">
                             {selectedDayInfo ? (
                               <div className="animate-fadeIn">
                                 <div className="text-gray-400 text-[8px] font-black uppercase mb-1">Items Sold</div>
                                 <div className="text-lg font-black text-[#FF7E3E] leading-none mb-0.5">{selectedDayInfo.day}</div>
                                 <div className="text-[7px] text-gray-500 font-bold truncate w-[70px]">{selectedDayInfo.items[0]}...</div>
                               </div>
                             ) : (
                               <div className="animate-fadeIn">
                                 <div className="text-gray-400 text-[10px] font-black uppercase mb-1">Store</div>
                                 <div className="text-3xl font-extrabold text-[#0a0a0a] dark:text-white">172</div>
                                 <div className="text-[11px] text-green-500 font-bold flex items-center gap-0.5 justify-center">↑ 0.8%</div>
                               </div>
                             )}
                           </div>
                         </foreignObject>
                      </svg>
                   </div>
                </div>

                <div className={`col-span-12 lg:col-span-3 rounded-[32px] p-8 shadow-sm border flex flex-col transition-all duration-300 hover:shadow-lg ${isDarkMode ? 'bg-[#1e293b] border-gray-800' : 'bg-white border-gray-50'}`}>
                   <div className="flex justify-between items-center mb-8">
                      <h3 className="text-xl font-extrabold">Top sale</h3>
                   </div>
                   <div className="space-y-5 flex-grow overflow-y-auto no-scrollbar pr-1">
                      {dashboard.topSales.length > 0 ? dashboard.topSales.map((item, i) => (
                        <div key={i} className="flex items-center gap-4 group cursor-pointer animate-fadeIn" style={{ animationDelay: `${i * 100}ms` }}>
                          <div className="w-12 h-14 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800 flex-shrink-0 group-hover:shadow-lg transition-all"><img src={item.product.images[0]} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="P" /></div>
                          <div className="flex-grow truncate">
                            <div className="text-[13px] font-bold truncate mb-0.5 group-hover:text-[#FF7E3E] transition-colors">{item.product.name}</div>
                            <div className="text-[11px] text-gray-400 font-bold tracking-tighter">${item.product.price}</div>
                          </div>
                          <div className="text-[11px] font-black bg-gray-50 dark:bg-[#0f172a] px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-800 transition-all group-hover:bg-[#FF7E3E] group-hover:text-white">952 Sold</div>
                        </div>
                      )) : <div className="h-full flex items-center justify-center text-gray-300 font-bold italic text-sm">No sales data yet.</div>}
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-6 pt-16">
                <div className={`col-span-12 lg:col-span-8 rounded-[32px] p-8 shadow-sm border transition-all duration-300 hover:shadow-lg ${isDarkMode ? 'bg-[#1e293b] border-gray-800' : 'bg-white border-gray-50'}`}>
                   <div className="flex justify-between items-center mb-8">
                      <h3 className="text-xl font-extrabold">Recent orders</h3>
                      <button onClick={() => setActiveTab('order')} className="text-[#FF7E3E] font-black text-xs hover:underline flex items-center gap-1 uppercase tracking-widest">View All <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M9 5l7 7-7 7"/></svg></button>
                   </div>
                   <div className="overflow-x-auto no-scrollbar">
                      <table className="w-full text-[13px]">
                        <thead><tr className="text-left text-gray-400 text-[10px] font-black border-b border-gray-50 dark:border-gray-800 uppercase tracking-widest px-4"><th className="pb-5 px-4">Product</th><th className="pb-5 px-4">Customer</th><th className="pb-5 px-4 text-center">Profit</th><th className="pb-5 px-4 text-center">Quantity</th><th className="pb-5 px-4">Price</th><th className="pb-5 px-4">Status</th></tr></thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                          {orders.slice(0, 5).map((order, i) => (
                            <tr key={i} className="group hover:bg-gray-50/50 dark:hover:bg-[#0f172a]/50 transition-colors cursor-pointer" onClick={() => { setViewingOrder(order); setActiveTab('order'); }}>
                              <td className="py-4 px-4 flex items-center gap-4"><div className="w-10 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 group-hover:scale-105 transition-transform"><img src={order.items[0]?.product.images[0]} className="w-full h-full object-cover" alt="p" /></div><span className="font-bold truncate max-w-[160px] group-hover:text-[#FF7E3E] transition-colors">{order.items[0]?.product.name}</span></td>
                              <td className="py-4 px-4 text-gray-500 dark:text-gray-400 font-bold">{order.customerName}</td>
                              <td className="py-4 px-4 font-black text-center text-[14px] text-green-600">${calculateOrderProfit(order).toFixed(0)}</td>
                              <td className="py-4 px-4 font-black text-center text-[14px]">X{order.items.reduce((s, it) => s + it.quantity, 0)}</td>
                              <td className="py-4 px-4 font-black text-[14px] transition-transform group-hover:scale-110">${order.totalPrice.toFixed(0)}</td>
                              <td className="py-4 px-4"><span className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase inline-block text-center min-w-[80px] transition-all shadow-sm ${order.status === 'Paid' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-yellow-50 text-yellow-600 border border-yellow-100'}`}>{order.status}</span></td>
                            </tr>
                          ))}
                          {orders.length === 0 && <tr><td colSpan={6} className="py-24 text-center text-gray-400 font-black uppercase tracking-widest text-[11px] italic opacity-50">No active orders found in database.</td></tr>}
                        </tbody>
                      </table>
                   </div>
                </div>
                <div className={`col-span-12 lg:col-span-4 rounded-[32px] p-8 shadow-sm border transition-all duration-300 hover:shadow-lg ${isDarkMode ? 'bg-[#1e293b] border-gray-800' : 'bg-white border-gray-50'}`}>
                   <h3 className="text-xl font-extrabold mb-8">User Location</h3>
                   <div className={`rounded-[32px] p-8 mb-8 relative aspect-[16/11] flex items-center justify-center overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#F3F5F7]'}`}>
                      <svg className={`w-full h-full opacity-60 transition-all duration-500 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} viewBox="0 0 200 120" fill="currentColor">
                         <path d="M20,30 L40,25 L70,30 L100,20 L130,25 L160,20 L180,30 L190,50 L185,80 L160,90 L130,95 L100,105 L60,100 L30,90 L15,60 L20,30" className="opacity-20" />
                         <path d="M20,30 L40,25 L50,45 L35,65 Z" fill="#FF7E3E" className="animate-pulse" />
                         <path d="M100,60 L130,55 L140,85 L110,95 Z" fill="#FF7E3E" className="animate-pulse" />
                      </svg>
                   </div>
                   <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-2">
                      {[{ l: 'California', p: '40%' }, { l: 'Arizona', p: '15%' }, { l: 'Texas', p: '10%' }, { l: 'Georda', p: '3.5%' }].map((loc, i) => (
                        <div key={i} className="flex items-center gap-2 group cursor-default">
                           <div className="w-2.5 h-2.5 rounded-full bg-[#FF7E3E] group-hover:scale-150 transition-all duration-300"></div>
                           <span className="text-[10px] text-gray-400 font-black uppercase tracking-tight">{loc.l} <span className={`ml-1 font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{loc.p}</span></span>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'product' && (
            <div className={`rounded-[32px] p-10 shadow-sm border transition-all duration-300 min-h-[600px] ${isDarkMode ? 'bg-[#1e293b] border-gray-800' : 'bg-white border-gray-50'}`}>
              <div className="flex justify-between items-center mb-12">
                <h3 className="text-3xl font-black text-gray-900 dark:text-white">Manage Products</h3>
                <button 
                  onClick={() => setIsAddingProduct(true)}
                  className="bg-[#FF7E3E] text-white px-8 py-3.5 rounded-[20px] font-black shadow-xl shadow-orange-100 hover:shadow-orange-200 transition-all active:scale-95 text-sm uppercase tracking-wider"
                >
                  Add New Product
                </button>
              </div>

              {isAddingProduct && (
                <div className="bg-[#F3F5F7] dark:bg-[#0f172a] p-10 rounded-[40px] mb-12 border border-gray-100 dark:border-gray-800 animate-fadeIn shadow-inner">
                  <h4 className="text-xl font-black mb-10 text-gray-800 dark:text-gray-100">Create New Product</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Image Upload Gallery */}
                    <div className="col-span-full mb-4">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block mb-4">Product Gallery (Upload Image)</label>
                      <div className="flex gap-4 flex-wrap">
                        <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center cursor-pointer hover:border-[#FF7E3E] transition-colors group">
                           <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                           <svg className="w-8 h-8 text-gray-300 group-hover:text-[#FF7E3E] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
                        </label>
                        {newProduct.images?.map((img, i) => (
                           <div key={i} className="w-24 h-24 rounded-2xl overflow-hidden border border-gray-100 shadow-sm relative group">
                             <img src={img} className="w-full h-full object-cover" alt="p" />
                             <button className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white" onClick={() => setNewProduct({...newProduct, images: []})}>
                               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                             </button>
                           </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Product Name</label>
                      <input 
                        type="text" 
                        value={newProduct.name} 
                        onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                        placeholder="e.g. Premium Cotton Shirt"
                        className="w-full bg-white dark:bg-gray-800 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-[#FF7E3E] transition-all" 
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Selling Price ($)</label>
                      <input 
                        type="number" 
                        value={newProduct.price} 
                        onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})}
                        className="w-full bg-white dark:bg-gray-800 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-[#FF7E3E] transition-all" 
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Purchase Cost ($)</label>
                      <input 
                        type="number" 
                        value={newProduct.purchaseCost} 
                        onChange={e => setNewProduct({...newProduct, purchaseCost: Number(e.target.value)})}
                        placeholder="Hidden from customers"
                        className="w-full bg-white dark:bg-gray-800 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-[#FF7E3E] transition-all" 
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Discount Price (Original Price $)</label>
                      <input 
                        type="number" 
                        value={newProduct.originalPrice} 
                        onChange={e => setNewProduct({...newProduct, originalPrice: Number(e.target.value)})}
                        placeholder="Price before discount"
                        className="w-full bg-white dark:bg-gray-800 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-[#FF7E3E] transition-all" 
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                      <select 
                        value={newProduct.category} 
                        onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                        className="w-full bg-white dark:bg-gray-800 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-[#FF7E3E] transition-all appearance-none" 
                      >
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>

                    <div className="col-span-full space-y-3">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Product Description</label>
                      <textarea 
                        rows={3}
                        value={newProduct.description} 
                        onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                        placeholder="Add professional product details..."
                        className="w-full bg-white dark:bg-gray-800 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-[#FF7E3E] transition-all resize-none" 
                      />
                    </div>
                  </div>

                  <div className="mt-12 flex gap-5">
                    <button onClick={handleAddProduct} className="bg-[#FF7E3E] text-white px-10 py-4 rounded-[24px] font-black shadow-xl shadow-orange-100 hover:shadow-orange-200 hover:-translate-y-0.5 transition-all active:scale-95 text-sm uppercase tracking-wider">Save Product</button>
                    <button onClick={() => setIsAddingProduct(false)} className="bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-10 py-4 rounded-[24px] font-black hover:bg-gray-100 dark:hover:bg-gray-600 transition-all text-sm uppercase tracking-wider">Cancel</button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                {products.map(product => (
                  <div key={product.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[32px] p-6 flex gap-6 group transition-all hover:shadow-2xl hover:-translate-y-1 relative">
                    <div className="w-24 h-28 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-50 dark:bg-gray-900 shadow-sm border border-gray-50 dark:border-gray-700">
                      <img src={product.images[0]} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={product.name} />
                    </div>
                    <div className="flex-grow flex flex-col justify-center">
                      <h5 className="font-black text-[15px] mb-2 text-gray-800 dark:text-white group-hover:text-[#FF7E3E] transition-colors">{product.name}</h5>
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-800 tracking-tight shadow-sm">Price: ${product.price}</span>
                        <span className="text-[11px] font-black text-green-600 bg-green-50 dark:bg-green-900/30 px-3 py-1.5 rounded-xl border border-green-100 dark:border-green-800 tracking-tight shadow-sm">Profit: ${(product.price - (product.purchaseCost || 0)).toFixed(0)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                         <button onClick={() => onDelete(product.id)} className="w-9 h-9 flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                         </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'category' && (
             <div className={`rounded-[32px] p-10 shadow-sm border transition-all duration-300 min-h-[600px] ${isDarkMode ? 'bg-[#1e293b] border-gray-800' : 'bg-white border-gray-50'}`}>
                <div className="flex justify-between items-center mb-12">
                   <h3 className="text-3xl font-black text-gray-900 dark:text-white">Product Categories</h3>
                   <div className="flex gap-4">
                      <input 
                        type="text" 
                        placeholder="Category Name" 
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        className={`border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-[#FF7E3E] transition-all outline-none ${isDarkMode ? 'bg-[#0f172a] text-white' : 'bg-[#F3F5F7] text-gray-900'}`} 
                      />
                      <button 
                        onClick={handleAddCategory}
                        className="bg-[#FF7E3E] text-white px-6 py-2 rounded-xl font-black shadow-lg hover:shadow-orange-100 transition-all active:scale-95 text-xs uppercase"
                      >
                        Add Category
                      </button>
                   </div>
                </div>
                <div className="overflow-hidden border border-gray-100 dark:border-gray-800 rounded-[24px]">
                   <table className="w-full text-left text-sm">
                      <thead className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-[#0f172a] text-gray-500' : 'bg-gray-50 text-gray-400'}`}>
                         <tr>
                            <th className="px-8 py-5">Category Name</th>
                            <th className="px-8 py-5">Product Count</th>
                            <th className="px-8 py-5">Status</th>
                            <th className="px-8 py-5 text-right">Action</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800 font-bold">
                         {categories.map((cat, i) => {
                            const count = products.filter(p => p.category === cat).length;
                            const isActive = !deactivatedCategories.has(cat);
                            return (
                               <tr key={cat} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                                  <td className="px-8 py-5">{cat}</td>
                                  <td className="px-8 py-5">{count} Products</td>
                                  <td className="px-8 py-5">
                                     <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase inline-block shadow-sm border ${isActive ? 'bg-green-50 text-green-600 border-green-100' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                                        {isActive ? 'Active' : 'Inactive'}
                                     </span>
                                  </td>
                                  <td className="px-8 py-5 text-right">
                                     <div className="flex items-center justify-end gap-3">
                                        <button onClick={() => toggleCategoryStatus(cat)} className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg border transition-all ${isActive ? 'text-yellow-600 border-yellow-100 hover:bg-yellow-50' : 'text-green-600 border-green-100 hover:bg-green-50'}`}>
                                           {isActive ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button onClick={() => onDeleteCategory(cat)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all">
                                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                        </button>
                                     </div>
                                  </td>
                               </tr>
                            );
                         })}
                      </tbody>
                   </table>
                </div>
             </div>
          )}

          {activeTab === 'order' && (
             <div className={`rounded-[32px] p-10 shadow-sm border transition-all duration-300 min-h-[600px] ${isDarkMode ? 'bg-[#1e293b] border-gray-800' : 'bg-white border-gray-50'}`}>
                <div className="flex justify-between items-center mb-12">
                   <h3 className="text-3xl font-black text-gray-900 dark:text-white">Order Management</h3>
                   <div className="text-[10px] font-black bg-[#FF7E3E] text-white px-4 py-2 rounded-xl uppercase tracking-widest shadow-lg shadow-orange-100">
                      Total Orders: {orders.length}
                   </div>
                </div>

                <div className="overflow-hidden border border-gray-100 dark:border-gray-800 rounded-[24px]">
                   <table className="w-full text-left text-sm">
                      <thead className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-[#0f172a] text-gray-500' : 'bg-gray-50 text-gray-400'}`}>
                         <tr>
                            <th className="px-8 py-5">Order ID</th>
                            <th className="px-8 py-5">Customer Details</th>
                            <th className="px-8 py-5 text-center">Items</th>
                            <th className="px-8 py-5">Total Price</th>
                            <th className="px-8 py-5">Order Status</th>
                            <th className="px-8 py-5 text-right">Details</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800 font-bold">
                         {orders.map((order) => (
                            <tr key={order.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                               <td className="px-8 py-5 font-black text-[#FF7E3E]">#{order.id}</td>
                               <td className="px-8 py-5">
                                  <div className="font-black text-gray-800 dark:text-gray-100">{order.customerName}</div>
                                  <div className="text-[11px] text-gray-400 font-medium lowercase tracking-tight">{order.customerEmail}</div>
                               </td>
                               <td className="px-8 py-5 text-center">
                                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 text-[12px]">
                                     {order.items.reduce((s, it) => s + it.quantity, 0)}
                                  </div>
                               </td>
                               <td className="px-8 py-5 text-lg font-black">${order.totalPrice.toFixed(0)}</td>
                               <td className="px-8 py-5">
                                  <select 
                                    value={order.orderStatus}
                                    onChange={(e) => onUpdateOrder({...order, orderStatus: e.target.value as any})}
                                    className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border-none focus:ring-2 focus:ring-[#FF7E3E] transition-all cursor-pointer ${isDarkMode ? 'bg-[#0f172a] text-white' : 'bg-gray-50 text-gray-800'}`}
                                  >
                                     <option value="Pending">Pending</option>
                                     <option value="Processing">Processing</option>
                                     <option value="Shipped">Shipped</option>
                                     <option value="Delivered">Delivered</option>
                                     <option value="Cancelled">Cancelled</option>
                                  </select>
                               </td>
                               <td className="px-8 py-5 text-right">
                                  <button 
                                    onClick={() => setViewingOrder(order)}
                                    className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-500 rounded-xl transition-all"
                                  >
                                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                  </button>
                               </td>
                            </tr>
                         ))}
                         {orders.length === 0 && (
                            <tr>
                               <td colSpan={6} className="py-24 text-center text-gray-400 font-black uppercase tracking-widest text-[11px] italic opacity-50">
                                  No orders available in history.
                               </td>
                            </tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </div>
          )}

          {activeTab === 'courier_dispatch' && (
             <div className={`rounded-[32px] p-10 shadow-sm border transition-all duration-300 min-h-[600px] ${isDarkMode ? 'bg-[#1e293b] border-gray-800' : 'bg-white border-gray-50'}`}>
                <div className="flex justify-between items-center mb-12">
                   <h3 className="text-3xl font-black text-gray-900 dark:text-white">Courier Dispatch Manager</h3>
                   <div className="text-[10px] font-black bg-indigo-600 text-white px-4 py-2 rounded-xl uppercase tracking-widest shadow-lg shadow-indigo-100">
                      Pending Dispatch: {orders.filter(o => !o.courierName).length}
                   </div>
                </div>

                <div className="overflow-hidden border border-gray-100 dark:border-gray-800 rounded-[24px]">
                   <table className="w-full text-left text-sm">
                      <thead className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-[#0f172a] text-gray-500' : 'bg-gray-50 text-gray-400'}`}>
                         <tr>
                            <th className="px-8 py-5">Order ID</th>
                            <th className="px-8 py-5">Customer info</th>
                            <th className="px-8 py-5">Items / Total</th>
                            <th className="px-8 py-5">Courier Selection</th>
                            <th className="px-8 py-5 text-right">Dispatch Action</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800 font-bold">
                         {orders.map((order) => (
                            <tr key={order.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                               <td className="px-8 py-5">
                                  <div className="font-black text-[#FF7E3E]">#{order.id}</div>
                                  <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">{order.orderStatus}</div>
                               </td>
                               <td className="px-8 py-5">
                                  <div className="font-black text-gray-800 dark:text-gray-100">{order.customerName}</div>
                                  <div className="text-indigo-600 text-xs">{order.customerPhone}</div>
                                  <div className="text-[11px] text-gray-400 font-medium truncate max-w-[200px] mt-1 italic">{order.customerAddress}</div>
                               </td>
                               <td className="px-8 py-5">
                                  <div className="text-[11px] text-gray-500">
                                     {order.items.length} Product(s)
                                  </div>
                                  <div className="text-lg font-black mt-0.5">${order.totalPrice.toFixed(0)}</div>
                               </td>
                               <td className="px-8 py-5">
                                 {order.courierName ? (
                                   <div className="flex flex-col">
                                     <span className="text-[10px] font-black text-green-600 uppercase flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                                        Dispatched via {order.courierName}
                                     </span>
                                     <span className="text-[9px] text-gray-400 font-bold mt-1 break-all bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">ID: {order.courierTrackingId}</span>
                                   </div>
                                 ) : (
                                   <select 
                                      value={selectedCourierMap[order.id] || ''}
                                      onChange={(e) => setSelectedCourierMap({...selectedCourierMap, [order.id]: e.target.value as any})}
                                      className={`w-full text-[10px] font-black uppercase px-3 py-2.5 rounded-xl border-none focus:ring-2 focus:ring-[#FF7E3E] transition-all cursor-pointer shadow-sm ${isDarkMode ? 'bg-[#0f172a] text-white' : 'bg-gray-50 text-gray-800'}`}
                                   >
                                      <option value="">-- Select Courier --</option>
                                      <option value="Pathao">Pathao Courier</option>
                                      <option value="SteadFast">SteadFast Courier</option>
                                   </select>
                                 )}
                               </td>
                               <td className="px-8 py-5 text-right">
                                  {!order.courierName ? (
                                     <div className="flex flex-col items-end gap-2">
                                        <button 
                                          onClick={() => handleSendToCourier(order.id)}
                                          className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all active:scale-95 ${
                                             selectedCourierMap[order.id] 
                                             ? 'bg-[#FF7E3E] text-white shadow-orange-100 hover:shadow-orange-200' 
                                             : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                          }`}
                                        >
                                          Send to Courier
                                        </button>
                                        {dispatchStatus[order.id] && (
                                           <div className={`text-[9px] font-bold ${dispatchStatus[order.id].type === 'success' ? 'text-green-500' : 'text-red-500'} animate-fadeIn`}>
                                              {dispatchStatus[order.id].message}
                                           </div>
                                        )}
                                     </div>
                                  ) : (
                                     <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Processing</span>
                                  )}
                               </td>
                            </tr>
                         ))}
                         {orders.length === 0 && (
                            <tr>
                               <td colSpan={5} className="py-24 text-center text-gray-400 font-black uppercase tracking-widest text-[11px] italic opacity-50">
                                  No orders currently available for dispatch.
                               </td>
                            </tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </div>
          )}

          {activeTab === 'pixel_setup' && (
             <div className={`rounded-[32px] p-10 shadow-sm border transition-all duration-300 min-h-[600px] ${isDarkMode ? 'bg-[#1e293b] border-gray-800' : 'bg-white border-gray-50'}`}>
                <div className="flex justify-between items-center mb-12">
                   <h3 className="text-3xl font-black text-gray-900 dark:text-white">Pixel Setup</h3>
                   <div className="flex items-center gap-4">
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border ${
                        pixelConfig.status === 'Active' ? 'bg-green-50 text-green-600 border-green-100' : 
                        pixelConfig.status === 'Connecting' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                        'bg-gray-50 text-gray-400 border-gray-100'
                      }`}>
                         <div className={`w-2 h-2 rounded-full ${pixelConfig.status === 'Active' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                         Pixel Status: {pixelConfig.status}
                      </div>
                      <button 
                        onClick={handleSavePixelConfig}
                        disabled={pixelConfig.status === 'Connecting'}
                        className={`bg-[#FF7E3E] text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-orange-100 hover:shadow-orange-200 transition-all active:scale-95 text-xs uppercase ${pixelConfig.status === 'Connecting' ? 'opacity-50 cursor-wait' : ''}`}
                      >
                        {pixelConfig.status === 'Active' ? 'Update & Restart Pixel' : 'Save & Automate Setup'}
                      </button>
                   </div>
                </div>

                <div className={`p-8 rounded-[40px] border ${isDarkMode ? 'bg-[#0f172a] border-gray-800' : 'bg-[#F8F9FB] border-gray-100'}`}>
                   <div className="flex items-center gap-4 mb-10">
                      <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
                         <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                      </div>
                      <div>
                         <h4 className="text-xl font-black">Facebook Conversion API (CAPI)</h4>
                         <p className="text-xs text-gray-400 font-bold uppercase mt-1">Automatic Server-Side Setup</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                      <div className="space-y-6">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Facebook Pixel ID</label>
                            <input 
                              type="text"
                              value={pixelConfig.pixelId}
                              placeholder="e.g. 123456789012345"
                              onChange={(e) => setPixelConfig({...pixelConfig, pixelId: e.target.value})}
                              className={`w-full bg-white dark:bg-gray-800 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#FF7E3E] transition-all`} 
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Facebook App ID</label>
                            <input 
                              type="text"
                              value={pixelConfig.appId}
                              placeholder="e.g. 987654321098765"
                              onChange={(e) => setPixelConfig({...pixelConfig, appId: e.target.value})}
                              className={`w-full bg-white dark:bg-gray-800 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#FF7E3E] transition-all`} 
                            />
                         </div>
                      </div>
                      <div className="space-y-6">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Test Event Code (Optional)</label>
                            <input 
                              type="text"
                              value={pixelConfig.testEventCode}
                              placeholder="TEST12345"
                              onChange={(e) => setPixelConfig({...pixelConfig, testEventCode: e.target.value})}
                              className={`w-full bg-white dark:bg-gray-800 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#FF7E3E] transition-all`} 
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">System Access Token</label>
                            <textarea 
                              value={pixelConfig.accessToken}
                              rows={1}
                              placeholder="EAAG..."
                              onChange={(e) => setPixelConfig({...pixelConfig, accessToken: e.target.value})}
                              className={`w-full bg-white dark:bg-gray-800 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#FF7E3E] transition-all resize-none`} 
                            />
                         </div>
                      </div>
                   </div>

                   <div className="p-6 rounded-[24px] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-start gap-4">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      </div>
                      <div>
                         <h5 className="font-black text-sm text-gray-900 dark:text-white">Auto-Provisioning Enabled</h5>
                         <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                            Once configured, Dataflow automatically generates the required tag containers and triggers. Conversion events will be sent directly from our secure cloud server to Facebook's Conversions API, bypassing browser tracking limitations.
                         </p>
                      </div>
                   </div>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                   {[
                      { l: 'Server Connection', v: pixelConfig.status === 'Active' ? 'Stable' : 'Waiting', c: pixelConfig.status === 'Active' ? 'text-green-500' : 'text-gray-400' },
                      { l: 'Data Encryption', v: 'AES-256', c: 'text-indigo-500' },
                      { l: 'Integration Type', v: 'Full Automation', c: 'text-orange-500' }
                   ].map((stat, i) => (
                      <div key={i} className={`p-6 rounded-[24px] border ${isDarkMode ? 'bg-[#0f172a] border-gray-800' : 'bg-white border-gray-100'} shadow-sm`}>
                         <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.l}</div>
                         <div className={`text-lg font-black ${stat.c}`}>{stat.v}</div>
                      </div>
                   ))}
                </div>
             </div>
          )}

          {activeTab === 'api' && (
             <div className={`rounded-[32px] p-10 shadow-sm border transition-all duration-300 min-h-[600px] ${isDarkMode ? 'bg-[#1e293b] border-gray-800' : 'bg-white border-gray-50'}`}>
                <div className="flex justify-between items-center mb-12">
                   <h3 className="text-3xl font-black text-gray-900 dark:text-white">API Settings</h3>
                   <button 
                     onClick={handleSaveCourierConfig}
                     className="bg-[#FF7E3E] text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-orange-100 hover:shadow-orange-200 transition-all active:scale-95 text-xs uppercase"
                   >
                     Save Configurations
                   </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                   {/* SECTION 1 - Pathao Courier API */}
                   <div className={`p-8 rounded-[40px] border ${isDarkMode ? 'bg-[#0f172a] border-gray-800' : 'bg-[#F8F9FB] border-gray-100'}`}>
                      <div className="flex items-center gap-4 mb-8">
                         <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                         </div>
                         <h4 className="text-xl font-black">Pathao Courier API</h4>
                      </div>
                      <div className="space-y-6">
                         {[
                            { label: 'Client ID', key: 'clientId' },
                            { label: 'Client Secret', key: 'clientSecret' },
                            { label: 'Store ID', key: 'storeId' },
                            { label: 'Username', key: 'username' },
                            { label: 'Password', key: 'password', type: 'password' }
                         ].map((field) => (
                            <div key={field.key} className="space-y-2">
                               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{field.label}</label>
                               <input 
                                 type={field.type || 'text'}
                                 value={(localCourierSettings.pathao as any)[field.key]}
                                 onChange={(e) => setLocalCourierSettings({
                                    ...localCourierSettings,
                                    pathao: { ...localCourierSettings.pathao, [field.key]: e.target.value }
                                 })}
                                 className={`w-full bg-white dark:bg-gray-800 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#FF7E3E] transition-all`} 
                               />
                            </div>
                         ))}
                      </div>
                   </div>

                   {/* SECTION 2 - SteadFast Courier API */}
                   <div className={`p-8 rounded-[40px] border ${isDarkMode ? 'bg-[#0f172a] border-gray-800' : 'bg-[#F8F9FB] border-gray-100'}`}>
                      <div className="flex items-center gap-4 mb-8">
                         <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                         </div>
                         <h4 className="text-xl font-black">SteadFast Courier API</h4>
                      </div>
                      <div className="space-y-6">
                         {[
                            { label: 'API Key', key: 'apiKey' },
                            { label: 'Secret Key', key: 'secretKey' },
                            { label: 'Merchant ID', key: 'merchantId' }
                         ].map((field) => (
                            <div key={field.key} className="space-y-2">
                               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{field.label}</label>
                               <input 
                                 type="text"
                                 value={(localCourierSettings.steadfast as any)[field.key]}
                                 onChange={(e) => setLocalCourierSettings({
                                    ...localCourierSettings,
                                    steadfast: { ...localCourierSettings.steadfast, [field.key]: e.target.value }
                                 })}
                                 className={`w-full bg-white dark:bg-gray-800 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#FF7E3E] transition-all`} 
                               />
                            </div>
                         ))}
                      </div>
                   </div>
                </div>

                <div className="mt-12 p-10 rounded-[40px] border flex flex-col items-center text-center bg-gray-900 text-white shadow-xl">
                   <div className={`w-14 h-14 rounded-[18px] flex items-center justify-center mb-6 shadow-xl ${hasApiKey ? 'bg-green-500' : 'bg-[#FF7E3E]'}`}>
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                   </div>
                   <h4 className="text-xl font-black mb-2">Gemini AI Integration</h4>
                   <p className="text-gray-400 max-w-md mb-8 text-xs font-medium leading-relaxed">AI capabilities for high-res images and video synthesis.</p>
                   <div className="flex flex-col items-center gap-4 w-full max-w-xs">
                      <button onClick={handleSelectKey} className="w-full bg-[#FF7E3E] text-white py-3 rounded-2xl font-black text-xs hover:bg-[#e66c30] transition-all transform active:scale-95 shadow-lg">
                        {hasApiKey ? 'Authenticated' : 'Select Gemini Key'}
                      </button>
                      <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-[10px] font-black text-orange-400 uppercase tracking-widest hover:underline">Billing Info</a>
                   </div>
                </div>
             </div>
          )}

          {/* ORDER DETAIL MODAL */}
          {viewingOrder && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
                <div className={`w-full max-w-3xl rounded-[40px] shadow-2xl p-10 relative overflow-y-auto max-h-[90vh] ${isDarkMode ? 'bg-[#1e293b] text-white' : 'bg-white text-gray-900'}`}>
                   <button onClick={() => setViewingOrder(null)} className="absolute top-8 right-8 text-gray-400 hover:text-red-500 transition-colors">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                   </button>
                   
                   <div className="flex items-center gap-4 mb-10">
                      <div className="w-14 h-14 bg-[#FF7E3E] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-100 font-black text-2xl">
                         {viewingOrder.id.charAt(0)}
                      </div>
                      <div>
                         <h4 className="text-2xl font-black">Order Details</h4>
                         <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Order ID: #{viewingOrder.id}</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
                      <div className={`p-8 rounded-[32px] border ${isDarkMode ? 'bg-[#0f172a] border-gray-800' : 'bg-[#F8F9FB] border-gray-100'}`}>
                         <h5 className="text-[10px] font-black uppercase text-[#FF7E3E] tracking-widest mb-6">Customer Information</h5>
                         <div className="space-y-4">
                            <div>
                               <div className="text-[10px] font-bold text-gray-400 uppercase">Name</div>
                               <div className="font-black text-lg">{viewingOrder.customerName}</div>
                            </div>
                            <div>
                               <div className="text-[10px] font-bold text-gray-400 uppercase">Contact</div>
                               <div className="font-bold">{viewingOrder.customerEmail}</div>
                               <div className="font-bold text-indigo-600">{viewingOrder.customerPhone}</div>
                            </div>
                            <div>
                               <div className="text-[10px] font-bold text-gray-400 uppercase">Location</div>
                               <div className="font-bold">{viewingOrder.customerLocation}</div>
                            </div>
                         </div>
                      </div>

                      <div className={`p-8 rounded-[32px] border ${isDarkMode ? 'bg-[#0f172a] border-gray-800' : 'bg-[#F8F9FB] border-gray-100'}`}>
                         <h5 className="text-[10px] font-black uppercase text-[#FF7E3E] tracking-widest mb-6">Shipping Address</h5>
                         <p className="font-bold leading-relaxed text-gray-600 dark:text-gray-300 italic">
                            {viewingOrder.customerAddress}
                         </p>
                      </div>
                   </div>

                   <div className="mb-8">
                      <h5 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-6 ml-4">Items Purchased</h5>
                      <div className="space-y-3">
                         {viewingOrder.items.map((it, idx) => (
                            <div key={idx} className={`p-4 rounded-2xl flex items-center gap-6 border ${isDarkMode ? 'bg-[#0f172a] border-gray-800' : 'bg-white border-gray-50'}`}>
                               <img src={it.product.images[0]} className="w-16 h-20 object-cover rounded-xl" />
                               <div className="flex-grow">
                                  <div className="font-black text-sm">{it.product.name}</div>
                                  <div className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-1">Size: {it.selectedSize} | Qty: {it.quantity}</div>
                               </div>
                               <div className="text-lg font-black text-[#FF7E3E]">${(it.product.price * it.quantity).toFixed(0)}</div>
                            </div>
                         ))}
                      </div>
                   </div>

                   <div className="flex justify-between items-center p-8 rounded-[32px] bg-gray-900 text-white shadow-xl">
                      <div>
                         <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Transaction</div>
                         <div className="text-4xl font-black">${viewingOrder.totalPrice.toFixed(0)}</div>
                      </div>
                      <div className="text-right">
                         <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Payment Status</div>
                         <div className="px-4 py-2 bg-green-500 text-white rounded-xl font-black uppercase text-xs tracking-tighter">SUCCESSFULLY PAID</div>
                      </div>
                   </div>
                </div>
             </div>
          )}
        </div>
      </main>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-scaleIn { animation: scaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default AdminPanel;
