
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, Order, User, StoreSettings, CourierSettings, PixelSettings, Category } from '../types';
import { CourierService } from '../CourierService';
import { PixelService } from '../PixelService';
import { api } from '../BackendAPI';
import { Bar, Doughnut } from 'react-chartjs-2';
import { ChartData, ChartOptions } from 'chart.js';
import 'chart.js/auto';

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
  onAddCategory: (cat: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
  onUpdateCategory?: (cat: Category) => void;
  onLogout: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  products, categories, orders, users, storeSettings, courierSettings, pixelSettings,
  onUpdate, onAdd, onDelete, onUpdateOrder, onUpdateUser, 
  onUpdateSettings, onUpdateCourierSettings, onUpdatePixelSettings, onAddCategory, onDeleteCategory, onUpdateCategory, onLogout 
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
  const [dispatchSelections, setDispatchSelections] = useState<Record<string, 'Pathao' | 'SteadFast'>>({});
  
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
  
  const [salesScale, setSalesScale] = useState(1);
  const [pixelStats, setPixelStats] = useState(PixelService.getStats());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Product Edit/Add States
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newProductData, setNewProductData] = useState<Partial<Product>>({
    name: '', description: '', price: 0, originalPrice: 0, purchaseCost: 0,
    images: [], category: '', colors: [], sizes: [], stock: 100
  });

  // Category Management States
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState<Partial<Category>>({ name: '', isActive: true });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Courier Setup States
  const [activeCourierConfig, setActiveCourierConfig] = useState<'pathao' | 'steadfast'>('pathao');
  const [isVerifyingCourier, setIsVerifyingCourier] = useState<string | null>(null);

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
  }, []);

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

  // --- Render Functions ---

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

  // --- Category Modal Logic ---
  const openAddCategoryModal = () => {
    setCategoryFormData({ name: '', isActive: true });
    setEditingCategory(null);
    setShowCategoryModal(true);
  };

  const openEditCategoryModal = (cat: Category) => {
    setCategoryFormData({ ...cat });
    setEditingCategory(cat);
    setShowCategoryModal(true);
  };

  const handleSaveCategory = () => {
    if (!categoryFormData.name) {
      setToast({ message: 'Category name is required', type: 'error' });
      return;
    }

    if (editingCategory && onUpdateCategory) {
      onUpdateCategory({ ...editingCategory, ...categoryFormData } as Category);
      setToast({ message: 'Category updated successfully', type: 'success' });
    } else {
      onAddCategory(categoryFormData);
      setToast({ message: 'Category added successfully', type: 'success' });
    }
    setShowCategoryModal(false);
  };

  // --- Product Modal Logic ---

  const openAddProductModal = () => {
    setNewProductData({
      name: '', description: '', price: 0, originalPrice: 0, purchaseCost: 0,
      images: [], category: categories[0]?.name || '', colors: [], sizes: [], stock: 100
    });
    setNewImageUrl('');
    setEditingProduct(null);
    setIsAddingProduct(true);
  };

  const openEditProductModal = (product: Product) => {
    setNewProductData({ ...product });
    setNewImageUrl(product.images[0] || ''); // Keep first image in input for legacy/compatibility
    setEditingProduct(product);
    setIsAddingProduct(true); 
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setNewProductData(prev => ({
            ...prev,
            images: [...(prev.images || []), result]
        }));
        setNewImageUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setNewProductData(prev => ({
      ...prev,
      images: prev.images?.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleSaveProduct = () => {
    let finalImages = [...(newProductData.images || [])];
    if (newImageUrl && !finalImages.includes(newImageUrl)) {
        finalImages.push(newImageUrl);
    }
    if (finalImages.length === 0) finalImages = ['https://via.placeholder.com/300'];

    const productToSave: Product = {
      id: editingProduct ? editingProduct.id : Date.now().toString(),
      name: newProductData.name || 'Untitled Product',
      price: Number(newProductData.price) || 0,
      originalPrice: Number(newProductData.originalPrice) || 0,
      purchaseCost: Number(newProductData.purchaseCost) || 0,
      internalPrice: Number(newProductData.internalPrice) || Number(newProductData.price) || 0,
      description: newProductData.description || '',
      images: finalImages,
      category: newProductData.category || 'Uncategorized',
      stock: Number(newProductData.stock) || 0,
      rating: editingProduct?.rating || 4.5,
      reviewCount: editingProduct?.reviewCount || 0,
      colors: newProductData.colors || [],
      sizes: newProductData.sizes || [],
      productId: editingProduct?.productId || `#${Math.floor(1000 + Math.random()*9000)}`,
      deliveryRegions: ['Nationwide'],
      isActive: true,
      hasColors: false,
      hasSizes: false
    };

    if (editingProduct) {
      onUpdate(productToSave);
      setToast({ message: 'Product updated successfully.', type: 'success' });
    } else {
      onAdd(productToSave);
      setToast({ message: 'New product added to inventory.', type: 'success' });
    }
    setIsAddingProduct(false);
    setEditingProduct(null);
  };
  
  const renderCategories = () => (
    <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm animate-fadeIn">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h3 className="text-2xl font-black text-[#111827]">Categories</h3>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Manage product categories</p>
        </div>
        <button 
          onClick={openAddCategoryModal}
          className="bg-indigo-600 text-white pl-4 pr-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
          Add Category
        </button>
      </div>
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-left">
          <thead>
            <tr className="text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-50">
              <th className="pb-6">ID</th>
              <th className="pb-6">NAME</th>
              <th className="pb-6">STATUS</th>
              <th className="pb-6 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {categories.map(cat => (
              <tr key={cat.id} className="group hover:bg-gray-50/50 transition-colors">
                <td className="py-6 font-mono text-xs text-gray-500">#{cat.id.substring(0,6)}</td>
                <td className="py-6 font-bold text-gray-900">{cat.name}</td>
                <td className="py-6">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${cat.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                    {cat.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-6 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEditCategoryModal(cat)} className="text-indigo-600 font-bold text-xs uppercase hover:underline">Edit</button>
                    <button onClick={() => onDeleteCategory(cat.id)} className="text-red-500 font-bold text-xs uppercase hover:underline ml-4">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderCategoryModal = () => {
    if (!showCategoryModal) return null;
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[700] flex items-center justify-center p-6 animate-fadeIn">
        <div className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-black text-gray-900">{editingCategory ? 'Edit Category' : 'New Category'}</h3>
            <button onClick={() => setShowCategoryModal(false)} className="text-gray-400 hover:text-red-500 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category Name</label>
              <input 
                value={categoryFormData.name} 
                onChange={e => setCategoryFormData({...categoryFormData, name: e.target.value})} 
                className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-none outline-none font-bold focus:ring-2 focus:ring-indigo-100"
                placeholder="e.g. Footwear" 
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
              <span className="text-sm font-bold text-gray-700">Active Status</span>
              <button 
                onClick={() => setCategoryFormData({...categoryFormData, isActive: !categoryFormData.isActive})}
                className={`w-12 h-7 rounded-full p-1 transition-colors ${categoryFormData.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${categoryFormData.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
          <div className="pt-8 mt-4 border-t border-gray-50 flex gap-4">
            <button onClick={() => setShowCategoryModal(false)} className="flex-1 py-4 rounded-xl font-bold text-gray-400 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={handleSaveCategory} className="flex-[2] bg-indigo-600 text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">Save</button>
          </div>
        </div>
      </div>
    );
  };

  const renderOrders = () => (
    <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm animate-fadeIn">
      <div className="flex justify-between items-center mb-10">
        <div><h3 className="text-2xl font-black text-[#111827]">Customer Orders</h3></div>
      </div>
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-left">
          <thead>
            <tr className="text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-50">
              <th className="pb-6">INVOICE</th><th className="pb-6">CUSTOMER</th><th className="pb-6">TOTAL</th><th className="pb-6">STATUS</th><th className="pb-6 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {localOrders.map(order => (
              <tr key={order.id} onClick={() => setViewingOrder(order)} className="group cursor-pointer hover:bg-gray-50/50 transition-all">
                <td className="py-6 font-bold text-gray-900">#{order.id}</td>
                <td className="py-6">
                  <div className="font-black text-gray-900">{order.customerName}</div>
                  <div className="text-[10px] text-gray-400 font-medium">{order.customerPhone}</div>
                </td>
                <td className="py-6 font-black text-indigo-600">TK {order.totalPrice.toLocaleString()}</td>
                <td className="py-6">
                  <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${order.orderStatus === 'Shipped' ? 'bg-blue-50 text-blue-600' : order.orderStatus === 'Delivered' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {order.orderStatus}
                  </span>
                </td>
                <td className="py-6 text-right">
                   {!order.courierTrackingId && (
                     <button 
                       onClick={(e) => { e.stopPropagation(); openDispatchModal(order); }} 
                       className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase hover:bg-indigo-700 shadow-lg transition-all"
                     >
                       Send to Courier
                     </button>
                   )}
                   {order.courierTrackingId && (
                     <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dispatched</span>
                   )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderProductOptions = () => (
      <div>
        <div className="flex justify-between items-center mb-8 px-2">
           <div>
             <h3 className="text-2xl font-black text-gray-900">Inventory Management</h3>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Manage your store catalog</p>
           </div>
           <button 
             onClick={openAddProductModal} 
             className="bg-indigo-600 text-white pl-4 pr-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 transform active:scale-95"
           >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
             Add Product
           </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {localProducts.map(product => (
            <div key={product.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-xl transition-all relative">
              <div className="h-64 relative bg-gray-50"><img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" /></div>
              <div className="p-6">
                <h4 className="font-black text-gray-900 truncate mb-1">{product.name}</h4>
                <div className="flex items-center gap-2 mb-6"><span className="text-xl font-black text-[#5844FF]">TK {product.price.toLocaleString()}</span></div>
                <div className="flex gap-2">
                  <button onClick={() => openEditProductModal(product)} className="flex-grow py-3 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Edit</button>
                  <button onClick={() => onDelete(product.id)} className="flex-grow py-3 bg-red-50 text-red-600 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
  );

  const renderProductModal = () => {
    if (!isAddingProduct) return null;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[700] flex items-center justify-center p-6 animate-fadeIn">
        <div className="bg-white rounded-[40px] w-full max-w-2xl p-10 shadow-2xl relative overflow-hidden">
           <button onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }} className="absolute top-8 right-8 text-gray-400 hover:text-red-500 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
           
           <div className="mb-8">
             <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-1">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Inventory Control</p>
           </div>

           <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Product Title</label>
                <input 
                  value={newProductData.name}
                  onChange={e => setNewProductData({...newProductData, name: e.target.value})}
                  className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-none outline-none font-bold focus:ring-2 focus:ring-indigo-100"
                  placeholder="e.g. Classic Leather Sneakers"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
                <textarea 
                  rows={3}
                  value={newProductData.description}
                  onChange={e => setNewProductData({...newProductData, description: e.target.value})}
                  className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-none outline-none font-bold focus:ring-2 focus:ring-indigo-100 resize-none"
                  placeholder="Product details..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Selling Price (TK)</label>
                   <input 
                     type="number"
                     value={newProductData.price}
                     onChange={e => setNewProductData({...newProductData, price: Number(e.target.value)})}
                     className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-none outline-none font-bold focus:ring-2 focus:ring-indigo-100"
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Purchase Cost (TK)</label>
                   <input 
                     type="number"
                     value={newProductData.purchaseCost}
                     onChange={e => setNewProductData({...newProductData, purchaseCost: Number(e.target.value)})}
                     className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-none outline-none font-bold focus:ring-2 focus:ring-indigo-100"
                     placeholder="For internal profit calc"
                   />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Original Price (MSRP)</label>
                   <input 
                     type="number"
                     value={newProductData.originalPrice}
                     onChange={e => setNewProductData({...newProductData, originalPrice: Number(e.target.value)})}
                     className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-none outline-none font-bold focus:ring-2 focus:ring-indigo-100"
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Stock Quantity</label>
                   <input 
                     type="number"
                     value={newProductData.stock}
                     onChange={e => setNewProductData({...newProductData, stock: Number(e.target.value)})}
                     className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-none outline-none font-bold focus:ring-2 focus:ring-indigo-100"
                   />
                 </div>
              </div>

              {newProductData.images && newProductData.images.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Gallery ({newProductData.images.length})</label>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {newProductData.images.map((img, idx) => (
                      <div key={idx} className="relative flex-shrink-0 group">
                        <img src={img} alt={`Product ${idx}`} className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
                        <button 
                          onClick={() => removeImage(idx)}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Image Source</label>
                
                <div className="flex gap-2 mb-2">
                  <input 
                    value={newImageUrl}
                    onChange={e => setNewImageUrl(e.target.value)}
                    className="flex-grow px-5 py-4 bg-gray-50 rounded-2xl border-none outline-none font-bold focus:ring-2 focus:ring-indigo-100 text-xs text-gray-500 font-mono"
                    placeholder="Paste URL or upload below..."
                  />
                  {newImageUrl && <img src={newImageUrl} className="w-14 h-14 rounded-xl object-cover border border-gray-200 bg-white" alt="Preview" />}
                </div>

                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="product-image-upload"
                  />
                  <label 
                    htmlFor="product-image-upload"
                    className="flex items-center justify-center w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl cursor-pointer hover:bg-gray-50 transition-all group shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 group-hover:bg-gray-300 transition-colors">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                      </div>
                      <span className="text-[10px] font-black text-gray-400 group-hover:text-gray-600 uppercase tracking-widest">Upload from Gallery</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                <select 
                  value={newProductData.category}
                  onChange={e => setNewProductData({...newProductData, category: e.target.value})}
                  className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-none outline-none font-bold focus:ring-2 focus:ring-indigo-100 appearance-none"
                >
                  <option value="">Select Category...</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
           </div>

           <div className="pt-8 mt-2 border-t border-gray-50 flex gap-4">
              <button onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }} className="flex-1 py-4 rounded-xl font-bold text-gray-400 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleSaveProduct} className="flex-[2] bg-indigo-600 text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">Save Product</button>
           </div>
        </div>
      </div>
    );
  };

  const renderDispatchModal = () => {
    if (!showDispatchModal) return null;
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[700] flex items-center justify-center p-6 animate-fadeIn">
        <div className="bg-white rounded-[32px] w-full max-w-lg p-8 shadow-2xl overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-black text-gray-900">Dispatch Order</h3>
            <button onClick={() => setShowDispatchModal(false)} className="text-gray-400 hover:text-red-500 transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
          <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-2 no-scrollbar">
             <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Courier</label><div className="flex gap-3">{(['Pathao', 'SteadFast'] as const).map(c => (<button key={c} onClick={() => setDispatchFormData({...dispatchFormData, courier: c})} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all border-2 ${dispatchFormData.courier === c ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'}`}>{c}</button>))}</div></div>
             <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Recipient Name</label><input value={dispatchFormData.recipientName} onChange={e => setDispatchFormData({...dispatchFormData, recipientName: e.target.value})} className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold text-sm border-none outline-none focus:ring-2 focus:ring-indigo-100" /></div><div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone</label><input value={dispatchFormData.phone} onChange={e => setDispatchFormData({...dispatchFormData, phone: e.target.value})} className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold text-sm border-none outline-none focus:ring-2 focus:ring-indigo-100" /></div></div>
             <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Delivery Address</label><textarea rows={3} value={dispatchFormData.address} onChange={e => setDispatchFormData({...dispatchFormData, address: e.target.value})} className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold text-sm border-none outline-none focus:ring-2 focus:ring-indigo-100 resize-none" /></div>
             <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">COD Amount</label><input type="number" value={dispatchFormData.codAmount} onChange={e => setDispatchFormData({...dispatchFormData, codAmount: Number(e.target.value)})} className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold text-sm border-none outline-none focus:ring-2 focus:ring-indigo-100" /></div><div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Weight (KG)</label><input type="number" step="0.1" value={dispatchFormData.weight} onChange={e => setDispatchFormData({...dispatchFormData, weight: Number(e.target.value)})} className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold text-sm border-none outline-none focus:ring-2 focus:ring-indigo-100" /></div></div>
             <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Parcel Note</label><input value={dispatchFormData.note} onChange={e => setDispatchFormData({...dispatchFormData, note: e.target.value})} className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold text-sm border-none outline-none focus:ring-2 focus:ring-indigo-100" /></div>
          </div>
          <div className="pt-8 mt-2 border-t border-gray-50 flex gap-4"><button onClick={() => setShowDispatchModal(false)} className="flex-1 py-4 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-colors">Cancel</button><button onClick={processDispatch} disabled={!!processingOrderId} className="flex-[2] bg-indigo-600 text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50">{processingOrderId ? 'Sending...' : 'Confirm Shipment'}</button></div>
        </div>
      </div>
    );
  };

  const renderCourierDispatch = () => {
    const readyOrders = localOrders.filter(o => !o.courierTrackingId && o.orderStatus !== 'Cancelled' && o.orderStatus !== 'Delivered');

    return (
      <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm animate-fadeIn">
        <div className="flex justify-between items-center mb-10">
          <div>
             <h3 className="text-2xl font-black text-[#111827]">Dispatch Center</h3>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Pending shipments</p>
          </div>
          <div className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl font-bold text-xs">
            {readyOrders.length} Pending
          </div>
        </div>
        
        {readyOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
            </div>
            <p className="font-bold">All orders have been dispatched!</p>
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-50">
                  <th className="pb-6">ORDER INFO</th>
                  <th className="pb-6">DESTINATION</th>
                  <th className="pb-6">PAYMENT</th>
                  <th className="pb-6 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {readyOrders.map(order => (
                  <tr key={order.id} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="py-6">
                      <div className="font-black text-gray-900">#{order.id}</div>
                      <div className="text-[10px] text-gray-400 font-bold">{new Date(order.timestamp).toLocaleDateString()}</div>
                    </td>
                    <td className="py-6">
                      <div className="font-bold text-gray-900">{order.customerName}</div>
                      <div className="text-[10px] text-gray-400 max-w-[200px] truncate">{order.customerAddress}</div>
                    </td>
                    <td className="py-6">
                      <div className="font-black text-indigo-600">TK {order.totalPrice.toLocaleString()}</div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${order.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="py-6 text-right">
                       <button 
                         onClick={() => openDispatchModal(order)} 
                         className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-700 shadow-lg transition-all active:scale-95"
                       >
                         Create Shipment
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderCourierSetup = () => {
    const isPathao = activeCourierConfig === 'pathao';
    const settings = isPathao ? courierSettings?.pathao : courierSettings?.steadfast;
    
    return (
      <div className="max-w-4xl space-y-10 animate-fadeIn">
        <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-10"><h3 className="text-2xl font-black">Courier Integration Setup</h3><div className="flex gap-2 bg-gray-50 p-1 rounded-xl">{(['pathao', 'steadfast'] as const).map(type => (<button key={type} onClick={() => setActiveCourierConfig(type)} className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeCourierConfig === type ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>{type}</button>))}</div></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3"><label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Environment Mode</label><select value={settings?.mode || 'Live'} onChange={e => { const newVal = e.target.value as any; if (isPathao) onUpdateCourierSettings?.({...courierSettings!, pathao: {...courierSettings!.pathao, mode: newVal}}); else onUpdateCourierSettings?.({...courierSettings!, steadfast: {...courierSettings!.steadfast, mode: newVal}}); }} className="w-full px-6 py-4.5 bg-gray-50 rounded-2xl border-none outline-none font-bold focus:ring-2 focus:ring-indigo-100 appearance-none"><option value="Live">Production</option><option value="Sandbox">Sandbox</option></select></div>
            <div className="space-y-3"><label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Status</label><button onClick={() => { const newVal = !settings?.enabled; if (isPathao) onUpdateCourierSettings?.({...courierSettings!, pathao: {...courierSettings!.pathao, enabled: newVal}}); else onUpdateCourierSettings?.({...courierSettings!, steadfast: {...courierSettings!.steadfast, enabled: newVal}}); }} className={`w-full px-6 py-4.5 rounded-2xl font-bold border transition-all flex items-center justify-between ${settings?.enabled ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-gray-50 border-transparent text-gray-400'}`}><span>{settings?.enabled ? 'Active' : 'Disabled'}</span><div className={`w-10 h-6 rounded-full relative transition-colors ${settings?.enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings?.enabled ? 'left-5' : 'left-1'}`} /></div></button></div>
            <div className="space-y-3 md:col-span-2"><label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">API Base URL</label><input value={settings?.baseUrl || ''} onChange={e => { const newVal = e.target.value; if (isPathao) onUpdateCourierSettings?.({...courierSettings!, pathao: {...courierSettings!.pathao, baseUrl: newVal}}); else onUpdateCourierSettings?.({...courierSettings!, steadfast: {...courierSettings!.steadfast, baseUrl: newVal}}); }} className="w-full px-6 py-4.5 bg-gray-50 rounded-2xl border-none outline-none font-bold focus:ring-2 focus:ring-indigo-100" /></div>
            {isPathao ? (<><div className="space-y-3"><label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Client ID</label><input value={courierSettings?.pathao.clientId} onChange={e => onUpdateCourierSettings?.({...courierSettings!, pathao: {...courierSettings!.pathao, clientId: e.target.value}})} className="w-full px-6 py-4.5 bg-gray-50 rounded-2xl border-none outline-none font-bold" /></div><div className="space-y-3"><label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Client Secret</label><input type="password" value={courierSettings?.pathao.clientSecret} onChange={e => onUpdateCourierSettings?.({...courierSettings!, pathao: {...courierSettings!.pathao, clientSecret: e.target.value}})} className="w-full px-6 py-4.5 bg-gray-50 rounded-2xl border-none outline-none font-bold" /></div><div className="space-y-3"><label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Username</label><input value={courierSettings?.pathao.username} onChange={e => onUpdateCourierSettings?.({...courierSettings!, pathao: {...courierSettings!.pathao, username: e.target.value}})} className="w-full px-6 py-4.5 bg-gray-50 rounded-2xl border-none outline-none font-bold" /></div><div className="space-y-3"><label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Password</label><input type="password" value={courierSettings?.pathao.password} onChange={e => onUpdateCourierSettings?.({...courierSettings!, pathao: {...courierSettings!.pathao, password: e.target.value}})} className="w-full px-6 py-4.5 bg-gray-50 rounded-2xl border-none outline-none font-bold" /></div><div className="space-y-3 md:col-span-2"><label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Store ID</label><input value={courierSettings?.pathao.storeId} onChange={e => onUpdateCourierSettings?.({...courierSettings!, pathao: {...courierSettings!.pathao, storeId: e.target.value}})} className="w-full px-6 py-4.5 bg-gray-50 rounded-2xl border-none outline-none font-bold" /></div></>) : (<><div className="space-y-3 md:col-span-2"><label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">API Key</label><input value={courierSettings?.steadfast.apiKey} onChange={e => onUpdateCourierSettings?.({...courierSettings!, steadfast: {...courierSettings!.steadfast, apiKey: e.target.value}})} className="w-full px-6 py-4.5 bg-gray-50 rounded-2xl border-none outline-none font-bold" /></div><div className="space-y-3 md:col-span-2"><label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Secret Key</label><input type="password" value={courierSettings?.steadfast.secretKey} onChange={e => onUpdateCourierSettings?.({...courierSettings!, steadfast: {...courierSettings!.steadfast, secretKey: e.target.value}})} className="w-full px-6 py-4.5 bg-gray-50 rounded-2xl border-none outline-none font-bold" /></div></>)}
          </div>
          <div className="flex gap-4 mt-10">
            <button onClick={() => handleVerifyCourierConnection(activeCourierConfig === 'pathao' ? 'Pathao' : 'SteadFast')} disabled={isVerifyingCourier !== null} className="px-8 bg-indigo-50 text-indigo-600 py-5 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-indigo-100 transition-all">{isVerifyingCourier ? 'Testing...' : 'Test Connection'}</button>
            <button className="flex-grow bg-indigo-600 text-white py-5 rounded-[24px] font-black text-lg shadow-xl hover:bg-indigo-700 transition-all">Save Configuration</button>
          </div>
        </div>
      </div>
    );
  };

  const renderPixelSetup = () => {
    const settings = pixelSettings || { pixelId: '', appId: '', accessToken: '', testEventCode: '', currency: 'BDT', status: 'Inactive' };
    const updateSetting = (key: keyof PixelSettings, val: any) => { if (onUpdatePixelSettings) onUpdatePixelSettings({ ...settings, [key]: val }); };
    return (
      <div className="max-w-4xl space-y-10 animate-fadeIn">
        <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start mb-10"><div><h3 className="text-2xl font-black text-gray-900">Meta Pixel & CAPI</h3><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Advanced Tracking Configuration</p></div><div className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest ${settings.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>{settings.status}</div></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-3"><label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Pixel ID</label><input value={settings.pixelId} onChange={e => updateSetting('pixelId', e.target.value)} className="w-full px-6 py-4.5 bg-gray-50 rounded-2xl border-none outline-none font-bold focus:ring-2 focus:ring-indigo-100" placeholder="e.g. 1234567890" /></div>
             <div className="space-y-3"><label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Currency</label><input value={settings.currency} onChange={e => updateSetting('currency', e.target.value)} className="w-full px-6 py-4.5 bg-gray-50 rounded-2xl border-none outline-none font-bold focus:ring-2 focus:ring-indigo-100" /></div>
             <div className="space-y-3 md:col-span-2"><label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Conversion API Access Token</label><textarea rows={3} value={settings.accessToken} onChange={e => updateSetting('accessToken', e.target.value)} className="w-full px-6 py-4.5 bg-gray-50 rounded-2xl border-none outline-none font-bold focus:ring-2 focus:ring-indigo-100 resize-none text-xs font-mono" placeholder="EAAG..." /></div>
             <div className="space-y-3"><label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Test Event Code</label><input value={settings.testEventCode} onChange={e => updateSetting('testEventCode', e.target.value)} className="w-full px-6 py-4.5 bg-gray-50 rounded-2xl border-none outline-none font-bold focus:ring-2 focus:ring-indigo-100" placeholder="TEST12345" /></div>
          </div>
          <div className="flex gap-4 mt-10"><button onClick={handlePixelConnect} className="flex-grow bg-[#1877F2] text-white py-5 rounded-[24px] font-black text-lg shadow-xl shadow-blue-100 hover:bg-[#166fe5] transition-all">{settings.status === 'Active' ? 'Update Configuration' : 'Connect Pixel'}</button></div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#F8F9FB] overflow-hidden font-sans">
      <aside className={`bg-[#111827] text-white transition-all duration-300 flex flex-col ${isSidebarCollapsed ? 'w-20' : 'w-72'}`}>
        <div className="p-8 flex items-center gap-4"><div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-xl flex-shrink-0">D</div>{!isSidebarCollapsed && <span className="text-xl font-black tracking-tighter">Dataflow</span>}</div>
        <nav className="flex-grow px-4 space-y-2">
          {[
            { id: 'dashboard', label: 'Overview', icon: '📊' },
            { id: 'products', label: 'Inventory', icon: '📦' },
            { id: 'categories', label: 'Categories', icon: '🗂️' },
            { id: 'orders', label: 'Sales Management', icon: '🛍️' },
            { id: 'dispatch', label: 'Dispatch Center', icon: '🚚' },
            { id: 'courier_setup', label: 'Courier Setup', icon: '🔌' },
            { id: 'pixel', label: 'Pixel Setup', icon: '🎯' },
            { id: 'settings', label: 'System Settings', icon: '⚙️' }
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${activeTab === item.id ? 'bg-white/10 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <span className="text-xl">{item.icon}</span>{!isSidebarCollapsed && <span className="font-bold text-sm tracking-tight">{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/5"><button onClick={onLogout} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-red-400 hover:bg-red-400/10 transition-all font-bold text-sm">🚪 {!isSidebarCollapsed && 'Sign Out'}</button></div>
      </aside>
      <main className="flex-grow flex flex-col min-w-0">
        {renderHeader()}
        <div className="flex-grow overflow-y-auto p-10 no-scrollbar">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'products' && renderProductOptions()}
          {activeTab === 'categories' && renderCategories()}
          {activeTab === 'orders' && renderOrders()}
          {activeTab === 'dispatch' && renderCourierDispatch()}
          {activeTab === 'courier_setup' && renderCourierSetup()}
          {activeTab === 'pixel' && renderPixelSetup()}
        </div>
      </main>
      
      {toast && (
        <div className={`fixed bottom-10 right-10 px-8 py-4 rounded-2xl shadow-2xl z-[1000] animate-fadeIn ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          <p className="font-black text-sm uppercase tracking-widest">{toast.message}</p>
        </div>
      )}
      
      {renderDispatchModal()}
      {renderProductModal()}
      {renderCategoryModal()}
      
      {viewingOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[600] flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white rounded-[40px] w-full max-w-2xl p-10 shadow-2xl relative overflow-hidden">
            <button onClick={() => setViewingOrder(null)} className="absolute top-8 right-8 text-gray-400 hover:text-gray-900 transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
            <div className="mb-10"><h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Order Information</h2><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">INVOICE #{viewingOrder.id}</p></div>
             <div className="grid grid-cols-2 gap-8 mb-10">
                <div><p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Customer</p><h4 className="font-bold text-gray-900">{viewingOrder.customerName}</h4><p className="text-sm text-gray-500">{viewingOrder.customerPhone}</p></div>
                <div><p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Shipping Point</p><p className="text-sm text-gray-900 leading-relaxed">{viewingOrder.customerAddress}, {viewingOrder.customerLocation}</p></div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-6 mb-10">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Cart Snapshot</p>
                <div className="space-y-4 max-h-48 overflow-y-auto pr-2 no-scrollbar">
                  {viewingOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-lg bg-white overflow-hidden border border-gray-100"><img src={item.product.images[0]} className="w-full h-full object-cover" alt="" /></div><div><p className="text-sm font-bold text-gray-900">{item.product.name}</p><p className="text-[10px] text-gray-400 font-bold uppercase">Qty: {item.quantity}</p></div></div><span className="text-sm font-black text-gray-900">TK {(item.product.price * item.quantity).toLocaleString()}</span></div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-end border-t border-gray-100 pt-8">
                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p><span className="px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600">{viewingOrder.paymentStatus}</span></div>
                <div className="text-right"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Due</p><h3 className="text-4xl font-black text-indigo-600 tracking-tighter">TK {viewingOrder.totalPrice.toLocaleString()}</h3></div>
              </div>
          </div>
        </div>
      )}
      
      <style>{`.py-4\.5 { padding-top: 1.125rem; padding-bottom: 1.125rem; }`}</style>
    </div>
  );
};

export default AdminPanel;
