
import React, { useState, useEffect } from 'react';
import { Product, Order, User, StoreSettings, CourierSettings, PixelSettings, Category, TwoFactorSettings, AdminPanelProps } from '../types';
import { CourierService } from '../CourierService';
import { PixelService } from '../PixelService';
import { api } from '../BackendAPI';
import { Bar, Doughnut } from 'react-chartjs-2';
import { ChartData, ChartOptions } from 'chart.js';
import 'chart.js/auto';
import * as QRCode from 'qrcode';
import * as OTPAuth from 'otpauth';

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  products, categories, orders, users, storeSettings, courierSettings, pixelSettings, twoFactorSettings,
  onUpdate, onAdd, onDelete, onUpdateOrder, onUpdateUser, 
  onUpdateSettings, onUpdateCourierSettings, onUpdatePixelSettings, onUpdateTwoFactorSettings, onAddCategory, onDeleteCategory, onUpdateCategory, onLogout 
}) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Real-time Data States
  const [dashData, setDashData] = useState<any>(null);
  const [localOrders, setLocalOrders] = useState<Order[]>(orders);
  const [localProducts, setLocalProducts] = useState<Product[]>(products);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{orders: Order[], products: Product[], users: User[]} | null>(null);

  // Sub-states
  const [courierTarget, setCourierTarget] = useState<Order | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  
  // Dispatch Form State
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchFormData, setDispatchFormData] = useState({
    courier: 'Pathao' as 'Pathao' | 'SteadFast',
    recipientName: '',
    phone: '',
    address: '',
    codAmount: 0,
    weight: 0.5,
    note: ''
  });
  
  const [pixelStats, setPixelStats] = useState(PixelService.getStats());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Product Edit/Add States
  const [showProductModal, setShowProductModal] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProductData, setNewProductData] = useState<Partial<Product>>({
    name: '', description: '', price: 0, originalPrice: 0, purchaseCost: 0,
    images: [], category: '', colors: [], sizes: [], stock: 100
  });
  const [newImageUrl, setNewImageUrl] = useState('');

  // Category Management States
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState<Partial<Category>>({ name: '', isActive: true });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Courier Setup States
  const [isVerifyingCourier, setIsVerifyingCourier] = useState<string | null>(null);

  // 2FA & System Settings States
  const [tfaStep, setTfaStep] = useState<'idle' | 'scanning' | 'verifying'>('idle');
  const [tfaSecret, setTfaSecret] = useState('');
  const [tfaQrUrl, setTfaQrUrl] = useState('');
  const [tfaCode, setTfaCode] = useState('');
  const [localStoreSettings, setLocalStoreSettings] = useState<StoreSettings>(storeSettings);

  // --- Realtime Engine & Initialization ---

  const refreshDashboard = async () => {
    const data = await api.getDashboardMetrics();
    setDashData(data);
    const notifs = await api.getNotifications();
    setNotifications(notifs);
    setUnreadCount(notifs.filter((n: any) => !n.read).length);
  };

  useEffect(() => {
    refreshDashboard();
    setLocalOrders(orders);
    setLocalProducts(products);
    setLocalStoreSettings(storeSettings);

    const unsubscribe = api.subscribe((dataType, data) => {
      if (dataType === 'orders') {
        setLocalOrders([...data]);
        refreshDashboard();
        setToast({ message: 'New Order Received! Dashboard Updated.', type: 'success' });
      } else if (dataType === 'products') {
        setLocalProducts([...data]);
      } else if (dataType === 'notifications') {
        setNotifications([...data]);
        setUnreadCount(data.filter((n: any) => !n.read).length);
      }
    });

    const interval = setInterval(() => {
      setPixelStats(PixelService.getStats());
    }, 5000); 

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [orders, products, storeSettings]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // --- Search Logic ---

  useEffect(() => {
    if (!globalSearch.trim()) {
      setSearchResults(null);
      return;
    }
    const q = globalSearch.toLowerCase();
    const foundOrders = localOrders.filter(o => 
      o.id.toLowerCase().includes(q) || 
      o.customerName.toLowerCase().includes(q) ||
      o.customerPhone.includes(q)
    ).slice(0, 5);
    const foundProducts = localProducts.filter(p => 
      p.name.toLowerCase().includes(q)
    ).slice(0, 5);
    const foundUsers = users.filter(u => 
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    ).slice(0, 5);

    setSearchResults({ orders: foundOrders, products: foundProducts, users: foundUsers });
  }, [globalSearch, localOrders, localProducts, users]);

  // --- Chart Configurations ---

  const revenueChartData: ChartData<'bar'> = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        type: 'bar' as const,
        label: 'Revenue (TK)',
        data: dashData?.revenueSeries || [],
        backgroundColor: '#6366f1',
        borderRadius: 4,
        barPercentage: 0.6,
        order: 2
      },
      {
        type: 'line' as const,
        label: 'Orders',
        data: (dashData?.orderSeries || []).map((v: number) => v * 1000), // Scale for visibility
        borderColor: '#22c55e',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 0,
        order: 1,
        yAxisID: 'y1'
      }
    ]
  };

  const revenueChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { 
        mode: 'index', 
        intersect: false,
        backgroundColor: '#1f2937',
        titleColor: '#f3f4f6',
        bodyColor: '#d1d5db',
        padding: 12,
        cornerRadius: 8
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { display: false, grid: { display: false } },
      y1: { display: false, position: 'right', grid: { display: false } }
    }
  };

  const sourceChartData: ChartData<'doughnut'> = {
    labels: ['Website', 'Social Media', 'Store'],
    datasets: [
      {
        data: [
          dashData?.salesSource?.website || 65, 
          dashData?.salesSource?.social || 25, 
          dashData?.salesSource?.store || 10
        ],
        backgroundColor: ['#6366f1', '#ec4899', '#f59e0b'],
        borderWidth: 0,
        hoverOffset: 4
      }
    ]
  };

  const sourceChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, font: { size: 10 } } }
    }
  };

  // --- 2FA Logic ---

  const generateSecret = (length = 16) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < length; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  };

  const initiate2FA = async () => {
    const secret = generateSecret();
    setTfaSecret(secret);
    
    // Create OTPAuth URL
    const totp = new OTPAuth.TOTP({
      issuer: 'Dataflow',
      label: 'Admin',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secret,
    });
    
    const uri = totp.toString();
    try {
      const qrUrl = await QRCode.toDataURL(uri);
      setTfaQrUrl(qrUrl);
      setTfaStep('scanning');
    } catch (err) {
      setToast({ message: 'Error generating QR Code', type: 'error' });
    }
  };

  const verifyAndEnable2FA = () => {
    const totp = new OTPAuth.TOTP({
      issuer: 'Dataflow',
      label: 'Admin',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: tfaSecret,
    });

    const delta = totp.validate({
      token: tfaCode,
      window: 1,
    });

    if (delta !== null) {
      if (onUpdateTwoFactorSettings) {
        onUpdateTwoFactorSettings({ enabled: true, secret: tfaSecret });
        setToast({ message: '2FA Enabled Successfully!', type: 'success' });
        setTfaStep('idle');
        setTfaCode('');
      }
    } else {
      setToast({ message: 'Invalid OTP. Please try again.', type: 'error' });
    }
  };

  const disable2FA = () => {
    if (confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
      if (onUpdateTwoFactorSettings) {
        onUpdateTwoFactorSettings({ enabled: false, secret: '' });
        setToast({ message: '2FA Disabled.', type: 'success' });
      }
    }
  };

  // --- Action Handlers ---

  const openDispatchModal = (order: Order) => {
    setCourierTarget(order);
    setDispatchFormData({
      courier: 'Pathao',
      recipientName: order.customerName,
      phone: order.customerPhone,
      address: `${order.customerAddress}, ${order.customerLocation}, Zip: ${order.customerZipCode}`,
      codAmount: order.totalPrice,
      weight: 0.5,
      note: order.customerNotes || ''
    });
    setShowDispatchModal(true);
  };

  const processDispatch = async () => {
    if (!courierTarget) return;
    setProcessingOrderId(courierTarget.id);
    const dispatchPayload = {
      ...courierTarget,
      customerName: dispatchFormData.recipientName,
      customerPhone: dispatchFormData.phone,
      customerAddress: dispatchFormData.address,
      customerLocation: '',
      customerZipCode: '',
      totalPrice: Number(dispatchFormData.codAmount),
      weight: Number(dispatchFormData.weight),
      courierNote: dispatchFormData.note
    };

    try {
      let result;
      if (dispatchFormData.courier === 'Pathao') {
        result = await CourierService.sendToPathao(dispatchPayload as Order, courierSettings?.pathao || {} as any);
      } else {
        result = await CourierService.sendToSteadfast(dispatchPayload as Order, courierSettings?.steadfast || {} as any);
      }
      
      const trackingId = result.consignment_id || result.tracking_code || result.id || (result.data?.consignment_id);
      
      onUpdateOrder({
        ...courierTarget,
        courierName: dispatchFormData.courier,
        courierTrackingId: trackingId,
        orderStatus: 'Shipped'
      });
      
      setToast({ message: `Shipment created via ${dispatchFormData.courier}. ID: ${trackingId}`, type: 'success' });
      setShowDispatchModal(false);
      setCourierTarget(null);
    } catch (err: any) {
      setToast({ message: err.message || 'Dispatch failed.', type: 'error' });
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleVerifyCourierConnection = async (type: 'Pathao' | 'SteadFast') => {
    setIsVerifyingCourier(type);
    try {
      if (type === 'Pathao') {
        await CourierService.verifyPathaoConnection(courierSettings?.pathao || {} as any);
        setToast({ message: `Pathao connection verified successfully.`, type: 'success' });
      } else {
        await CourierService.verifySteadfastConnection(courierSettings?.steadfast || {} as any);
        setToast({ message: `SteadFast connection verified.`, type: 'success' });
      }
    } catch (err: any) {
      setToast({ message: `Verification failed: ${err.message}`, type: 'error' });
    } finally {
      setIsVerifyingCourier(null);
    }
  };

  const handlePixelConnect = async () => {
    const settings = pixelSettings || { pixelId: '', appId: '', accessToken: '', testEventCode: '', currency: 'BDT', status: 'Inactive' };
    if (!settings.pixelId) return;
    
    setTimeout(() => {
        onUpdatePixelSettings?.({ ...settings, status: 'Active' });
        PixelService.initializeBrowserPixel(settings.pixelId);
        setToast({ message: "Meta Pixel & CAPI synchronized successfully.", type: 'success' });
    }, 1500);
  };

  const handleSaveProduct = async () => {
    if (!newProductData.name || !newProductData.price) {
        setToast({ message: 'Name and Price are required', type: 'error' });
        return;
    }
    
    const productToSave = {
        ...newProductData,
        id: editingProduct ? editingProduct.id : Date.now().toString(),
        isActive: true,
        isMain: newProductData.isMain || false
    } as Product;

    if (editingProduct) {
        onUpdate(productToSave);
    } else {
        onAdd(productToSave);
    }
    
    setShowProductModal(false);
    setEditingProduct(null);
    setNewProductData({
        name: '', description: '', price: 0, originalPrice: 0, purchaseCost: 0,
        images: [], category: '', colors: [], sizes: [], stock: 100
    });
  };

  const handleSaveCategory = () => {
    if (!categoryFormData.name) {
      setToast({ message: 'Category Name is required', type: 'error' });
      return;
    }

    if (editingCategory) {
      if (onUpdateCategory) {
        onUpdateCategory({ ...editingCategory, ...categoryFormData } as Category);
        setToast({ message: 'Category Updated', type: 'success' });
      }
    } else {
      onAddCategory(categoryFormData);
      setToast({ message: 'Category Added', type: 'success' });
    }
    setShowCategoryModal(false);
    setEditingCategory(null);
    setCategoryFormData({ name: '', isActive: true });
  };

  // --- Render Functions ---

  const renderHeader = () => (
    <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-10 sticky top-0 z-40">
      <div className="flex items-center gap-4 flex-grow max-w-2xl">
        <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div className="relative flex-grow">
          <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input 
            type="text" 
            placeholder="Search orders, products, or customers..." 
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
          />
          
          {/* Global Search Dropdown */}
          {searchResults && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fadeIn">
              {searchResults.orders.length > 0 && (
                <div className="p-4 border-b border-gray-50">
                  <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Orders</h5>
                  {searchResults.orders.map(o => (
                    <div key={o.id} onClick={() => { setViewingOrder(o); setGlobalSearch(''); }} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                      <span className="text-sm font-bold text-gray-900">#{o.id}</span>
                      <span className="text-xs text-gray-500">{o.customerName}</span>
                    </div>
                  ))}
                </div>
              )}
              {searchResults.products.length > 0 && (
                <div className="p-4 border-b border-gray-50">
                  <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Products</h5>
                  {searchResults.products.map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                      <img src={p.images[0]} className="w-8 h-8 rounded-md object-cover" alt=""/>
                      <span className="text-sm font-bold text-gray-900">{p.name}</span>
                    </div>
                  ))}
                </div>
              )}
              {searchResults.users.length > 0 && (
                <div className="p-4">
                  <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Customers</h5>
                  {searchResults.users.map(u => (
                    <div key={u.id} className="p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                      <p className="text-sm font-bold text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                  ))}
                </div>
              )}
              {searchResults.orders.length === 0 && searchResults.products.length === 0 && searchResults.users.length === 0 && (
                <div className="p-6 text-center text-sm text-gray-400">No results found.</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Notification Bell */}
        <div className="relative">
          <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 text-gray-400 hover:text-indigo-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white"></span>
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fadeIn">
              <div className="p-4 border-b border-gray-50 flex justify-between items-center">
                <h5 className="font-black text-gray-900 text-sm">Notifications</h5>
                <button onClick={() => { api.markNotificationsAsRead(); setUnreadCount(0); }} className="text-[10px] font-bold text-indigo-600 hover:underline">Mark all read</button>
              </div>
              <div className="max-h-80 overflow-y-auto no-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400">No notifications yet.</div>
                ) : (
                  notifications.map((notif: any) => (
                    <div key={notif.id} className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-indigo-50/30' : ''}`}>
                       <p className="text-xs font-bold text-gray-900 mb-1">{notif.title}</p>
                       <p className="text-[10px] text-gray-500 leading-relaxed">{notif.message}</p>
                       <p className="text-[9px] text-gray-300 mt-2 font-bold text-right">{new Date(notif.timestamp).toLocaleTimeString()}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pl-6 border-l border-gray-100">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black text-gray-900 leading-none uppercase tracking-widest">Admin Control</p>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em] mt-1">Live Connected</p>
          </div>
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg">A</div>
        </div>
      </div>
    </header>
  );

  const renderDashboard = () => (
    <div className="space-y-8 animate-fadeIn px-2 pb-10">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Earnings', value: `TK ${(dashData?.totalEarnings || 0).toLocaleString()}`, sub: `${dashData?.growth > 0 ? '+' : ''}${dashData?.growth}% from last month`, color: 'text-emerald-500', icon: '💰' },
          { label: 'Total Orders', value: dashData?.totalOrders || 0, sub: '+12% new orders', color: 'text-indigo-500', icon: '🛍️' },
          { label: 'Total Customers', value: dashData?.customers || 0, sub: 'Active users', color: 'text-blue-500', icon: '👥' },
          { label: 'Net Profit', value: `TK ${(dashData?.totalProfit || 0).toLocaleString()}`, sub: 'Based on Purchase Costs', color: 'text-orange-500', icon: '💳' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl">{stat.icon}</div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full bg-gray-50 ${stat.color}`}>{stat.sub}</span>
            </div>
            <h4 className="text-gray-400 text-xs font-bold uppercase tracking-widest">{stat.label}</h4>
            <h2 className="text-3xl font-black text-gray-900 mt-1">{stat.value}</h2>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-900">Revenue Analytics</h3>
            <select className="bg-gray-50 border-none text-xs font-bold rounded-lg px-3 py-1.5 outline-none">
              <option>This Year</option>
              <option>Last Year</option>
            </select>
          </div>
          <div className="h-64">
            <Bar data={revenueChartData} options={revenueChartOptions} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
           <h3 className="font-bold text-gray-900 mb-6">Sales Source</h3>
           <div className="h-48 relative">
             <Doughnut data={sourceChartData} options={sourceChartOptions} />
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <div className="text-center">
                 <span className="block text-2xl font-black text-gray-900">{(dashData?.totalOrders || 0) > 1000 ? '1k+' : dashData?.totalOrders}</span>
                 <span className="text-[10px] text-gray-400 font-bold uppercase">Orders</span>
               </div>
             </div>
           </div>
        </div>
      </div>

      {/* Recent Orders & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-900">Recent Transactions</h3>
            <button onClick={() => setActiveTab('orders')} className="text-indigo-600 text-xs font-bold uppercase tracking-wider hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-50">
                  <th className="pb-4 pl-2">Product</th>
                  <th className="pb-4">Customer</th>
                  <th className="pb-4">Amount</th>
                  <th className="pb-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dashData?.recentOrders?.map((order: Order) => (
                  <tr key={order.id} className="group hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setViewingOrder(order)}>
                    <td className="py-4 pl-2 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden">
                        <img src={order.items[0]?.product.images[0]} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 line-clamp-1 w-32">{order.items[0]?.product.name}</p>
                        <p className="text-[10px] text-gray-400">+{order.items.length - 1} more</p>
                      </div>
                    </td>
                    <td className="py-4">
                      <p className="text-xs font-bold text-gray-900">{order.customerName}</p>
                      <p className="text-[10px] text-gray-400">{order.customerLocation}</p>
                    </td>
                    <td className="py-4 font-black text-xs text-gray-900">TK {order.totalPrice.toLocaleString()}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${
                        order.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 
                        order.paymentStatus === 'Pending' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
           <h3 className="font-bold text-gray-900 mb-6">Top Performers</h3>
           <div className="space-y-6">
             {dashData?.topSales?.map((prod: any, idx: number) => (
               <div key={prod.id} className="flex items-center gap-4">
                 <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden">
                      <img src={prod.images[0]} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-white">
                      {idx + 1}
                    </div>
                 </div>
                 <div className="flex-grow">
                   <h4 className="text-xs font-bold text-gray-900 line-clamp-1">{prod.name}</h4>
                   <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                     <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.min((prod.totalSold / 50) * 100, 100)}%` }}></div>
                   </div>
                 </div>
                 <div className="text-right">
                   <p className="text-xs font-black text-gray-900">{prod.totalSold}</p>
                   <p className="text-[8px] font-bold text-gray-400 uppercase">SOLD</p>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>

      {/* Regional Stats */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-6">Regional Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Object.entries(dashData?.locationData || {}).map(([loc, count]: [string, any]) => (
            <div key={loc} className="bg-gray-50 p-4 rounded-2xl text-center hover:bg-indigo-50 transition-colors">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{loc}</h4>
              <p className="text-2xl font-black text-gray-900">{count}</p>
              <p className="text-[10px] text-gray-400 font-bold">Orders</p>
            </div>
          ))}
          {Object.keys(dashData?.locationData || {}).length === 0 && <p className="text-sm text-gray-400 italic col-span-full">No location data available yet.</p>}
        </div>
      </div>
    </div>
  );

  const renderOrders = () => (
    <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm animate-fadeIn">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900">All Orders</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              {['Order ID', 'Customer', 'Items', 'Total', 'Status', 'Payment', 'Actions'].map(h => (
                <th key={h} className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {localOrders.map(order => (
              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-bold text-sm">#{order.id}</td>
                <td className="px-6 py-4">
                  <div className="font-bold text-sm text-gray-900">{order.customerName}</div>
                  <div className="text-xs text-gray-500">{order.customerPhone}</div>
                </td>
                <td className="px-6 py-4 text-sm">{order.items.length} items</td>
                <td className="px-6 py-4 font-bold text-sm">TK {order.totalPrice}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                    order.orderStatus === 'Delivered' ? 'bg-emerald-50 text-emerald-600' :
                    order.orderStatus === 'Cancelled' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {order.orderStatus}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                    order.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {order.paymentStatus}
                  </span>
                </td>
                <td className="px-6 py-4 flex gap-2">
                  <button onClick={() => openDispatchModal(order)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 border border-indigo-200 px-3 py-1 rounded-lg">Dispatch</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderProductOptions = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-gray-900">Products</h3>
        <button 
          onClick={() => { setIsAddingProduct(true); setShowProductModal(true); setEditingProduct(null); }}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-colors"
        >
          + Add Product
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {localProducts.map(product => (
          <div key={product.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all group">
            <div className="aspect-[4/3] bg-gray-100 relative">
              <img src={product.images[0]} className="w-full h-full object-cover" alt={product.name} />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button onClick={() => { setEditingProduct(product); setNewProductData(product); setIsAddingProduct(false); setShowProductModal(true); }} className="bg-white text-gray-900 px-4 py-2 rounded-lg font-bold text-sm">Edit</button>
                <button onClick={() => { if(confirm('Delete product?')) onDelete(product.id); }} className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-sm">Delete</button>
              </div>
            </div>
            <div className="p-4">
              <h4 className="font-bold text-gray-900">{product.name}</h4>
              <p className="text-sm text-gray-500 mt-1">TK {product.price}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCategories = () => (
    <div className="space-y-6 animate-fadeIn">
       <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-gray-900">Categories</h3>
        <button 
          onClick={() => { setEditingCategory(null); setCategoryFormData({ name: '', isActive: true }); setShowCategoryModal(true); }}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-colors"
        >
          + Add Category
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
           <thead className="bg-gray-50">
             <tr>
               <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Name</th>
               <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
               <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Actions</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-gray-100">
             {categories.map(cat => (
               <tr key={cat.id}>
                 <td className="px-6 py-4 font-bold text-gray-900">{cat.name}</td>
                 <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold ${cat.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>{cat.isActive ? 'Active' : 'Inactive'}</span></td>
                 <td className="px-6 py-4 flex gap-2">
                   <button onClick={() => { setEditingCategory(cat); setCategoryFormData(cat); setShowCategoryModal(true); }} className="text-indigo-600 font-bold text-sm">Edit</button>
                   <button onClick={() => onDeleteCategory(cat.id)} className="text-red-600 font-bold text-sm">Delete</button>
                 </td>
               </tr>
             ))}
           </tbody>
        </table>
      </div>
    </div>
  );

  const renderCourierDispatch = () => (
     <div className="animate-fadeIn">
       <h3 className="text-2xl font-bold text-gray-900 mb-6">Bulk Courier Dispatch</h3>
       <p className="text-gray-500 mb-8">Select orders to bulk dispatch via your configured courier services.</p>
       {/* Reusing orders table for now, in a real app this would have selection checkboxes */}
       {renderOrders()}
     </div>
  );

  const renderCourierSetup = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn">
      <div className="bg-white p-8 rounded-3xl border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-red-600">Pathao Courier</h3>
          {isVerifyingCourier === 'Pathao' && <span className="text-xs font-bold text-gray-400 animate-pulse">Verifying...</span>}
        </div>
        <div className="space-y-4">
           <input placeholder="Client ID" className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none font-bold text-sm" value={courierSettings?.pathao?.clientId || ''} onChange={e => onUpdateCourierSettings?.({...courierSettings!, pathao: {...courierSettings?.pathao!, clientId: e.target.value}})} />
           <input placeholder="Client Secret" type="password" className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none font-bold text-sm" value={courierSettings?.pathao?.clientSecret || ''} onChange={e => onUpdateCourierSettings?.({...courierSettings!, pathao: {...courierSettings?.pathao!, clientSecret: e.target.value}})} />
           <input placeholder="Username" className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none font-bold text-sm" value={courierSettings?.pathao?.username || ''} onChange={e => onUpdateCourierSettings?.({...courierSettings!, pathao: {...courierSettings?.pathao!, username: e.target.value}})} />
           <input placeholder="Password" type="password" className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none font-bold text-sm" value={courierSettings?.pathao?.password || ''} onChange={e => onUpdateCourierSettings?.({...courierSettings!, pathao: {...courierSettings?.pathao!, password: e.target.value}})} />
           <input placeholder="Store ID" className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none font-bold text-sm" value={courierSettings?.pathao?.storeId || ''} onChange={e => onUpdateCourierSettings?.({...courierSettings!, pathao: {...courierSettings?.pathao!, storeId: e.target.value}})} />
           <div className="flex gap-4 mt-4">
             <button onClick={() => { api.saveCourierSettings(courierSettings!); setToast({message: 'Saved', type: 'success'}) }} className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-bold">Save</button>
             <button onClick={() => handleVerifyCourierConnection('Pathao')} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-bold">Test Connection</button>
           </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-teal-600">SteadFast Courier</h3>
          {isVerifyingCourier === 'SteadFast' && <span className="text-xs font-bold text-gray-400 animate-pulse">Verifying...</span>}
        </div>
        <div className="space-y-4">
           <input placeholder="Base URL (Default: https://portal.packzy.com/api/v1)" className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none font-bold text-sm" value={courierSettings?.steadfast?.baseUrl || ''} onChange={e => onUpdateCourierSettings?.({...courierSettings!, steadfast: {...courierSettings?.steadfast!, baseUrl: e.target.value}})} />
           <input placeholder="API Key" className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none font-bold text-sm" value={courierSettings?.steadfast?.apiKey || ''} onChange={e => onUpdateCourierSettings?.({...courierSettings!, steadfast: {...courierSettings?.steadfast!, apiKey: e.target.value}})} />
           <input placeholder="Secret Key" type="password" className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none font-bold text-sm" value={courierSettings?.steadfast?.secretKey || ''} onChange={e => onUpdateCourierSettings?.({...courierSettings!, steadfast: {...courierSettings?.steadfast!, secretKey: e.target.value}})} />
           <div className="flex gap-4 mt-4">
             <button onClick={() => { api.saveCourierSettings(courierSettings!); setToast({message: 'Saved', type: 'success'}) }} className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-bold">Save</button>
             <button onClick={() => handleVerifyCourierConnection('SteadFast')} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-bold">Test Connection</button>
           </div>
        </div>
      </div>
    </div>
  );

  const renderPixelSetup = () => (
    <div className="animate-fadeIn max-w-2xl mx-auto">
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="text-xl font-bold text-blue-600 mb-6">Facebook Pixel & CAPI</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase">Pixel ID</label>
            <input className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none font-bold mt-1" value={pixelSettings?.pixelId || ''} onChange={e => onUpdatePixelSettings?.({...pixelSettings!, pixelId: e.target.value})} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase">Access Token</label>
            <textarea rows={3} className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none font-bold mt-1" value={pixelSettings?.accessToken || ''} onChange={e => onUpdatePixelSettings?.({...pixelSettings!, accessToken: e.target.value})} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase">Test Event Code (Optional)</label>
            <input className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none font-bold mt-1" value={pixelSettings?.testEventCode || ''} onChange={e => onUpdatePixelSettings?.({...pixelSettings!, testEventCode: e.target.value})} />
          </div>
           <button onClick={handlePixelConnect} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold mt-4 shadow-lg shadow-blue-200">Save & Connect</button>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-100 grid grid-cols-2 gap-4">
           <div className="text-center p-4 bg-gray-50 rounded-xl">
             <div className="text-2xl font-black text-gray-900">{pixelStats.sent}</div>
             <div className="text-xs font-bold text-gray-400 uppercase">Events Sent</div>
           </div>
           <div className="text-center p-4 bg-gray-50 rounded-xl">
             <div className="text-2xl font-black text-gray-900">{pixelStats.failed}</div>
             <div className="text-xs font-bold text-gray-400 uppercase">Failed</div>
           </div>
        </div>
      </div>
    </div>
  );

  const renderSystemSettings = () => (
    <div className="space-y-10 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* General Settings */}
        <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm flex flex-col h-full">
          <div className="mb-8">
             <h3 className="text-2xl font-black text-gray-900">Store Configuration</h3>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">General Application Settings</p>
          </div>
          <div className="space-y-6 flex-grow">
            <div className="space-y-3">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Store Name</label>
              <input 
                value={localStoreSettings.storeName}
                onChange={e => setLocalStoreSettings({...localStoreSettings, storeName: e.target.value})}
                className="w-full px-6 py-4.5 bg-gray-50 rounded-2xl border-none outline-none font-bold focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Currency</label>
              <input 
                value={localStoreSettings.currency}
                onChange={e => setLocalStoreSettings({...localStoreSettings, currency: e.target.value})}
                className="w-full px-6 py-4.5 bg-gray-50 rounded-2xl border-none outline-none font-bold focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Tax (%)</label>
                <input 
                  type="number"
                  value={localStoreSettings.taxPercentage}
                  onChange={e => setLocalStoreSettings({...localStoreSettings, taxPercentage: Number(e.target.value)})}
                  className="w-full px-6 py-4.5 bg-gray-50 rounded-2xl border-none outline-none font-bold focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Shipping Fee</label>
                <input 
                  type="number"
                  value={localStoreSettings.shippingFee}
                  onChange={e => setLocalStoreSettings({...localStoreSettings, shippingFee: Number(e.target.value)})}
                  className="w-full px-6 py-4.5 bg-gray-50 rounded-2xl border-none outline-none font-bold focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp Number (Legacy)</label>
              <input 
                value={localStoreSettings.whatsappNumber || ''}
                onChange={e => setLocalStoreSettings({...localStoreSettings, whatsappNumber: e.target.value})}
                className="w-full px-6 py-4.5 bg-gray-50 rounded-2xl border-none outline-none font-bold focus:ring-2 focus:ring-indigo-100"
                placeholder="+8801..."
              />
            </div>
          </div>
          <button 
            onClick={() => { onUpdateSettings(localStoreSettings); setToast({message: 'Settings Updated', type: 'success'}); }}
            className="w-full mt-10 bg-indigo-600 text-white py-5 rounded-[24px] font-black text-lg shadow-xl hover:bg-indigo-700 transition-all"
          >
            Save Changes
          </button>
        </div>

        {/* 2FA Settings */}
        <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm flex flex-col h-full">
          <div className="mb-8">
             <h3 className="text-2xl font-black text-gray-900">Security</h3>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Two-Factor Authentication</p>
          </div>

          {twoFactorSettings?.enabled ? (
            <div className="flex flex-col items-center justify-center flex-grow py-10 space-y-6">
               <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center">
                 <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               </div>
               <div className="text-center">
                 <h4 className="text-xl font-black text-gray-900">2FA is Enabled</h4>
                 <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2">Your account is secured with two-factor authentication.</p>
               </div>
               <button 
                 onClick={disable2FA}
                 className="px-8 py-4 bg-red-50 text-red-600 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-red-100 transition-colors"
               >
                 Disable 2FA
               </button>
            </div>
          ) : (
            <div className="flex-grow flex flex-col">
              {tfaStep === 'idle' && (
                <div className="flex flex-col items-center justify-center flex-grow py-6 text-center">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Secure Your Account</h4>
                  <p className="text-sm text-gray-500 mb-8 max-w-xs">Add an extra layer of security to your admin account by enabling two-factor authentication.</p>
                  <button 
                    onClick={initiate2FA}
                    className="w-full bg-[#111827] text-white py-5 rounded-[24px] font-black text-lg shadow-xl hover:bg-black transition-all"
                  >
                    Setup 2FA
                  </button>
                </div>
              )}

              {tfaStep === 'scanning' && (
                <div className="flex flex-col items-center flex-grow animate-fadeIn">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Step 1: Scan QR Code</p>
                   <div className="bg-white p-4 rounded-3xl shadow-lg border border-gray-100 mb-6">
                     {tfaQrUrl ? <img src={tfaQrUrl} alt="2FA QR" className="w-48 h-48" /> : <div className="w-48 h-48 bg-gray-100 animate-pulse rounded-xl" />}
                   </div>
                   <div className="w-full space-y-4">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Step 2: Enter Code</p>
                     <input 
                       type="text" 
                       value={tfaCode}
                       onChange={e => setTfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                       placeholder="Enter 6-digit code"
                       className="w-full px-6 py-4.5 bg-gray-50 rounded-2xl border-none outline-none font-bold focus:ring-2 focus:ring-indigo-100 text-center tracking-[0.5em] text-xl"
                     />
                     <div className="flex gap-3">
                       <button onClick={() => setTfaStep('idle')} className="flex-1 py-4 rounded-xl font-bold text-gray-400 hover:bg-gray-50 transition-colors">Cancel</button>
                       <button onClick={verifyAndEnable2FA} className="flex-[2] bg-indigo-600 text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all">Verify & Enable</button>
                     </div>
                   </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Social & Communication Settings (The New Area) */}
      <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm animate-fadeIn">
         <div className="mb-8">
           <h3 className="text-2xl font-black text-gray-900">Social & Communication</h3>
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Direct Messaging Integration</p>
         </div>
         <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <svg className="w-4 h-4 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                WhatsApp Direct Order Link
              </label>
              <div className="relative">
                <input 
                  value={localStoreSettings.whatsappOrderLink || ''}
                  onChange={e => setLocalStoreSettings({...localStoreSettings, whatsappOrderLink: e.target.value})}
                  className="w-full px-6 py-4.5 bg-gray-50 rounded-2xl border-none outline-none font-bold focus:ring-2 focus:ring-indigo-100 pl-14"
                  placeholder="https://wa.me/..."
                />
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 font-bold ml-1 mt-2">Paste your full "wa.me" link here including text parameter</p>
            </div>
         </div>
         <button 
            onClick={() => { onUpdateSettings(localStoreSettings); setToast({message: 'Communication Settings Updated', type: 'success'}); }}
            className="w-full mt-10 bg-emerald-600 text-white py-5 rounded-[24px] font-black text-lg shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all"
          >
            Save Communication Settings
          </button>
      </div>
    </div>
  );

  const renderDispatchModal = () => {
    if (!showDispatchModal) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-scaleIn">
          <h3 className="text-xl font-bold mb-4 text-gray-900">Dispatch Order</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Courier Service</label>
              <select 
                value={dispatchFormData.courier}
                onChange={e => setDispatchFormData({...dispatchFormData, courier: e.target.value as any})}
                className="w-full p-3 bg-gray-50 rounded-xl mt-1 font-bold text-gray-900 border-none outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="Pathao">Pathao</option>
                <option value="SteadFast">SteadFast</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Recipient Name</label>
              <input 
                value={dispatchFormData.recipientName}
                onChange={e => setDispatchFormData({...dispatchFormData, recipientName: e.target.value})}
                className="w-full p-3 bg-gray-50 rounded-xl mt-1 font-bold text-gray-900 border-none outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
               <label className="text-xs font-bold text-gray-500 uppercase">Phone</label>
               <input 
                 value={dispatchFormData.phone}
                 onChange={e => setDispatchFormData({...dispatchFormData, phone: e.target.value})}
                 className="w-full p-3 bg-gray-50 rounded-xl mt-1 font-bold text-gray-900 border-none outline-none focus:ring-2 focus:ring-indigo-100"
               />
            </div>
            <div>
               <label className="text-xs font-bold text-gray-500 uppercase">Address</label>
               <textarea 
                 rows={2}
                 value={dispatchFormData.address}
                 onChange={e => setDispatchFormData({...dispatchFormData, address: e.target.value})}
                 className="w-full p-3 bg-gray-50 rounded-xl mt-1 font-bold text-gray-900 border-none outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
               />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">COD Amount</label>
                <input 
                  type="number"
                  value={dispatchFormData.codAmount}
                  onChange={e => setDispatchFormData({...dispatchFormData, codAmount: Number(e.target.value)})}
                  className="w-full p-3 bg-gray-50 rounded-xl mt-1 font-bold text-gray-900 border-none outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Weight (kg)</label>
                <input 
                  type="number"
                  step="0.1"
                  value={dispatchFormData.weight}
                  onChange={e => setDispatchFormData({...dispatchFormData, weight: Number(e.target.value)})}
                  className="w-full p-3 bg-gray-50 rounded-xl mt-1 font-bold text-gray-900 border-none outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
            <div>
               <label className="text-xs font-bold text-gray-500 uppercase">Note (Optional)</label>
               <input 
                 value={dispatchFormData.note}
                 onChange={e => setDispatchFormData({...dispatchFormData, note: e.target.value})}
                 className="w-full p-3 bg-gray-50 rounded-xl mt-1 font-bold text-gray-900 border-none outline-none focus:ring-2 focus:ring-indigo-100"
                 placeholder="e.g. Fragile"
               />
            </div>
          </div>
          <div className="mt-6 flex gap-3">
             <button onClick={() => setShowDispatchModal(false)} className="flex-1 py-3 font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
             <button onClick={processDispatch} disabled={!!processingOrderId} className="flex-1 bg-indigo-600 text-white py-3 font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
               {processingOrderId ? 'Processing...' : 'Confirm Dispatch'}
             </button>
          </div>
        </div>
      </div>
    );
  };

  const renderProductModal = () => {
    if (!showProductModal) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl p-8 shadow-2xl animate-scaleIn overflow-y-auto no-scrollbar">
           <div className="flex justify-between items-center mb-8">
             <div>
               <h3 className="text-2xl font-black text-gray-900">{isAddingProduct ? 'New Product' : 'Edit Product'}</h3>
               <p className="text-sm text-gray-400 font-bold mt-1">Manage inventory details</p>
             </div>
             <button onClick={() => setShowProductModal(false)} className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
             </button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Product Name</label>
                  <input 
                    value={newProductData.name}
                    onChange={e => setNewProductData({...newProductData, name: e.target.value})}
                    className="w-full p-4 bg-gray-50 rounded-xl font-bold text-gray-900 border-none outline-none focus:ring-2 focus:ring-indigo-100"
                    placeholder="e.g. Premium Shampoo Bar"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Price</label>
                    <input 
                      type="number"
                      value={newProductData.price}
                      onChange={e => setNewProductData({...newProductData, price: Number(e.target.value)})}
                      className="w-full p-4 bg-gray-50 rounded-xl font-bold text-gray-900 border-none outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Original Price</label>
                    <input 
                      type="number"
                      value={newProductData.originalPrice}
                      onChange={e => setNewProductData({...newProductData, originalPrice: Number(e.target.value)})}
                      className="w-full p-4 bg-gray-50 rounded-xl font-bold text-gray-900 border-none outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Purchase Cost</label>
                    <input 
                      type="number"
                      value={newProductData.purchaseCost}
                      onChange={e => setNewProductData({...newProductData, purchaseCost: Number(e.target.value)})}
                      className="w-full p-4 bg-gray-50 rounded-xl font-bold text-gray-900 border-none outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Stock</label>
                    <input 
                      type="number"
                      value={newProductData.stock}
                      onChange={e => setNewProductData({...newProductData, stock: Number(e.target.value)})}
                      className="w-full p-4 bg-gray-50 rounded-xl font-bold text-gray-900 border-none outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Description</label>
                  <textarea 
                    rows={4}
                    value={newProductData.description}
                    onChange={e => setNewProductData({...newProductData, description: e.target.value})}
                    className="w-full p-4 bg-gray-50 rounded-xl font-bold text-gray-900 border-none outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
                    placeholder="Product details..."
                  />
                </div>
             </div>
             
             <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Category</label>
                  <select 
                    value={newProductData.category}
                    onChange={e => setNewProductData({...newProductData, category: e.target.value})}
                    className="w-full p-4 bg-gray-50 rounded-xl font-bold text-gray-900 border-none outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                   <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Images</label>
                   <div className="flex gap-2">
                     <input 
                       value={newImageUrl}
                       onChange={e => setNewImageUrl(e.target.value)}
                       className="flex-grow p-4 bg-gray-50 rounded-xl font-bold text-gray-900 border-none outline-none focus:ring-2 focus:ring-indigo-100"
                       placeholder="Image URL"
                     />
                     <button 
                       onClick={() => {
                         if(newImageUrl && newProductData.images) {
                            setNewProductData({...newProductData, images: [...newProductData.images, newImageUrl]});
                            setNewImageUrl('');
                         }
                       }} 
                       className="bg-gray-900 text-white px-4 rounded-xl font-bold"
                     >
                       Add
                     </button>
                   </div>
                   <div className="flex gap-2 flex-wrap mt-2">
                      {(newProductData.images || []).map((img, idx) => (
                        <div key={idx} className="w-16 h-16 rounded-lg bg-gray-100 relative group overflow-hidden">
                          <img src={img} className="w-full h-full object-cover" alt="" />
                          <button 
                            onClick={() => setNewProductData({...newProductData, images: newProductData.images?.filter((_, i) => i !== idx)})}
                            className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Colors (Comma separated hex)</label>
                   <input 
                     value={(newProductData.colors || []).join(', ')}
                     onChange={e => setNewProductData({...newProductData, colors: e.target.value.split(',').map(s => s.trim())})}
                     className="w-full p-4 bg-gray-50 rounded-xl font-bold text-gray-900 border-none outline-none focus:ring-2 focus:ring-indigo-100"
                     placeholder="#FFFFFF, #000000"
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Sizes (Comma separated)</label>
                   <input 
                     value={(newProductData.sizes || []).join(', ')}
                     onChange={e => setNewProductData({...newProductData, sizes: e.target.value.split(',').map(s => s.trim())})}
                     className="w-full p-4 bg-gray-50 rounded-xl font-bold text-gray-900 border-none outline-none focus:ring-2 focus:ring-indigo-100"
                     placeholder="S, M, L, XL"
                   />
                </div>
             </div>
           </div>
           
           <div className="mt-10 pt-6 border-t border-gray-100 flex justify-end gap-4">
              <button onClick={() => setShowProductModal(false)} className="px-8 py-4 font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleSaveProduct} className="px-10 py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all transform hover:-translate-y-1">Save Product</button>
           </div>
        </div>
      </div>
    );
  };

  const renderCategoryModal = () => {
    if (!showCategoryModal) return null;
    return (
       <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
         <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl animate-scaleIn">
            <h3 className="text-xl font-black text-gray-900 mb-6">{editingCategory ? 'Edit Category' : 'New Category'}</h3>
            <div className="space-y-6">
               <div className="space-y-2">
                 <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Category Name</label>
                 <input 
                   value={categoryFormData.name || ''}
                   onChange={e => setCategoryFormData({...categoryFormData, name: e.target.value})}
                   className="w-full p-4 bg-gray-50 rounded-xl font-bold text-gray-900 border-none outline-none focus:ring-2 focus:ring-indigo-100"
                   placeholder="e.g. Summer Collection"
                 />
               </div>
               <div className="flex items-center gap-3 p-2">
                 <input 
                   type="checkbox"
                   checked={categoryFormData.isActive ?? true}
                   onChange={e => setCategoryFormData({...categoryFormData, isActive: e.target.checked})}
                   className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                 />
                 <label className="text-sm font-bold text-gray-700">Active Status</label>
               </div>
            </div>
            <div className="mt-8 flex gap-3">
               <button onClick={() => setShowCategoryModal(false)} className="flex-1 py-4 font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
               <button onClick={handleSaveCategory} className="flex-1 bg-indigo-600 text-white py-4 font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-colors">Save</button>
            </div>
         </div>
       </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#F8F9FB] overflow-hidden relative">
      {/* Sidebar */}
      <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-72'} bg-white border-r border-gray-100 transition-all duration-300 flex flex-col z-50`}>
        <div className="h-20 flex items-center justify-center border-b border-gray-50">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-200">A</div>
          {!isSidebarCollapsed && <span className="ml-3 font-bold text-xl text-gray-900 tracking-tight">Admin<span className="text-indigo-600">Panel</span></span>}
        </div>

        <nav className="flex-grow p-4 space-y-2 overflow-y-auto no-scrollbar">
          {[
            { id: 'dashboard', icon: <path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />, label: 'Overview' },
            { id: 'orders', icon: <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />, label: 'Orders' },
            { id: 'products', icon: <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 011 12V7a4 4 0 014-4z" />, label: 'Products' },
            { id: 'categories', icon: <path d="M4 6h16M4 12h16M4 18h7" />, label: 'Categories' },
            { id: 'courier', icon: <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />, label: 'Courier' },
            { id: 'integration', icon: <path d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />, label: 'Integration' },
            { id: 'pixel', icon: <path d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />, label: 'Pixel API' },
            { id: 'settings', icon: <><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>, label: 'Settings' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all group relative ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'text-gray-400 hover:bg-indigo-50 hover:text-indigo-600'}`}
            >
              <svg className={`w-6 h-6 ${activeTab === item.id ? 'text-white' : 'text-gray-400 group-hover:text-indigo-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {item.icon}
              </svg>
              {!isSidebarCollapsed && <span className="font-bold text-sm tracking-wide">{item.label}</span>}
              {isSidebarCollapsed && activeTab === item.id && <div className="absolute left-full ml-4 bg-indigo-900 text-white text-xs px-2 py-1 rounded-md shadow-lg whitespace-nowrap z-50">{item.label}</div>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-50">
          <button 
            onClick={onLogout}
            className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-red-400 hover:bg-red-50 hover:text-red-500 transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            {!isSidebarCollapsed && <span className="font-bold text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow flex flex-col h-full overflow-hidden relative">
         {renderHeader()}
         <div className="flex-grow overflow-y-auto p-8 no-scrollbar bg-[#F8F9FB]">
           {activeTab === 'dashboard' && renderDashboard()}
           {activeTab === 'orders' && renderOrders()}
           {activeTab === 'products' && renderProductOptions()}
           {activeTab === 'categories' && renderCategories()}
           {activeTab === 'courier' && renderCourierDispatch()}
           {activeTab === 'integration' && renderCourierSetup()}
           {activeTab === 'pixel' && renderPixelSetup()}
           {activeTab === 'settings' && renderSystemSettings()}
         </div>
      </main>

      {/* Modals */}
      {renderDispatchModal()}
      {renderProductModal()}
      {renderCategoryModal()}
      
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-fadeIn z-[1000] ${toast.type === 'success' ? 'bg-[#111827] text-white' : 'bg-red-500 text-white'}`}>
          {toast.type === 'success' ? <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg> : <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>}
          <span className="font-bold text-sm">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
