
import React, { useState, useCallback, useEffect } from 'react';
import { ViewState, Product, CartItem, Order, User, StoreSettings, CourierSettings, Category, PixelSettings, TwoFactorSettings } from './types';
import { api } from './BackendAPI';
import { PixelService } from './PixelService';
import Navbar from './components/Navbar';
import ProductLanding from './components/ProductLanding';
import ProductDetailView from './components/ProductDetailView';
import AdminPanel from './components/AdminPanel';
import AdminLogin from './components/AdminLogin';
import UserPanel from './components/UserPanel';
import LoadingOverlay from './components/LoadingOverlay';

const App: React.FC = () => {
  // --- Routing & Session Logic ---

  // Determine initial view based on URL Query Params
  const getInitialView = (): ViewState => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    
    if (viewParam === 'admin') return 'ADMIN';
    if (viewParam === 'cart') return 'USER';
    if (params.get('product_id')) return 'DETAIL';
    return 'LANDING';
  };

  const [view, setInternalView] = useState<ViewState>(getInitialView);
  const [isLoading, setIsLoading] = useState(false);
  
  // Persist Admin Session via LocalStorage
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return localStorage.getItem('elite_admin_session') === 'true';
  });

  // Helper to trigger smooth loading transitions
  const triggerLoading = useCallback(async (minDuration = 800) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, minDuration));
    return () => setTimeout(() => setIsLoading(false), 200);
  }, []);

  // Navigation Helper with History Support and Routing
  const setView = useCallback(async (newView: ViewState, productId?: string) => {
    if (newView === view && !productId) return;
    
    const stopLoading = await triggerLoading(800);
    
    // Construct new relative URL with Search Params to be safe in all environments (including blob/iframes)
    const url = new URL(window.location.href);
    
    if (newView === 'ADMIN') {
      url.searchParams.set('view', 'admin');
      url.searchParams.delete('product_id');
    } else if (newView === 'USER') {
      url.searchParams.set('view', 'cart');
      url.searchParams.delete('product_id');
    } else if (newView === 'DETAIL' && productId) {
      url.searchParams.delete('view');
      url.searchParams.set('product_id', productId);
    } else {
      url.searchParams.delete('view');
      url.searchParams.delete('product_id');
    }

    setInternalView(newView);
    
    try {
      // Use pathname + search to preserve the current environment's base path
      const newRelativePath = `${window.location.pathname}?${url.searchParams.toString()}`;
      window.history.pushState({ view: newView, productId }, '', newRelativePath);
    } catch (e) {
      console.warn('Navigation state update failed (likely restricted environment):', e);
    }

    stopLoading();
  }, [triggerLoading, view]);

  // Handle Browser Back/Forward Buttons
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Re-evaluate view based on URL when user navigates history
      const nextView = getInitialView();
      setInternalView(nextView);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isCelebrating, setIsCelebrating] = useState(false);
  
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    storeName: 'Amar Bazari',
    logoUrl: 'A',
    currency: 'BDT',
    taxPercentage: 0,
    shippingFee: 0
  });

  const [courierSettings, setCourierSettings] = useState<CourierSettings>({
    pathao: { clientId: '', clientSecret: '', storeId: '', username: '', password: '' },
    steadfast: { apiKey: '', secretKey: '', merchantId: '' }
  });

  const [pixelSettings, setPixelSettings] = useState<PixelSettings>({
    pixelId: '',
    appId: '',
    accessToken: '',
    testEventCode: '',
    currency: 'BDT',
    status: 'Inactive'
  });

  const [twoFactorSettings, setTwoFactorSettings] = useState<TwoFactorSettings>({
    enabled: false,
    secret: ''
  });
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);

  // Hydrate Selected Product from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pId = params.get('product_id');
    if (pId && products.length > 0) {
      const found = products.find(p => p.id === pId);
      if (found) setSelectedProduct(found);
    }
  }, [products]);

  // Initial Data Fetch & Realtime Subscriptions
  useEffect(() => {
    const fetchData = async () => {
      const [p, c, o, u, cs, ps, tfa] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
        api.getOrders(),
        api.getUsers(),
        api.getCourierSettings(),
        api.getPixelSettings(),
        api.getTwoFactorSettings()
      ]);
      setProducts(p);
      setCategories(c);
      setOrders(o);
      setUsers(u);
      setCourierSettings(cs);
      setPixelSettings(ps);
      setTwoFactorSettings(tfa);

      if (ps.status === 'Active' && ps.pixelId) {
        PixelService.initializeBrowserPixel(ps.pixelId);
      }
    };
    fetchData();

    const unsubscribe = api.subscribe((dataType, data) => {
      if (dataType === 'products') {
        setProducts([...data]);
      } else if (dataType === 'orders') {
        setOrders([...data]);
      } else if (dataType === 'users') {
        setUsers([...data]);
      } else if (dataType === 'categories') {
        setCategories([...data]);
      }
    });

    return () => unsubscribe();
  }, []);

  const mainProduct = products.find(p => p.isMain) || products[0];

  const handleProductClick = useCallback(async (product: Product) => {
    const directItem: CartItem = {
      product,
      quantity: 1,
      selectedSize: product.sizes[0] || 'M',
      selectedColor: product.colors[0] || '#000'
    };
    setCart([directItem]);
    
    // Navigate using setView to ensure safe URL updates
    setView('USER');
    
    PixelService.trackEvent('AddToCart', {
      value: product.price,
      content_ids: [product.id],
      content_type: 'product'
    }, pixelSettings);
  }, [pixelSettings, setView]);

  const handleOrderNow = async (item: CartItem | Product) => {
    if ('id' in item) {
      const directItem: CartItem = {
        product: item,
        quantity: 1,
        selectedSize: item.sizes[0] || 'M',
        selectedColor: item.colors[0] || '#000'
      };
      setCart([directItem]);
    } else {
      setCart([item]);
    }
    
    // Navigate using setView to ensure safe URL updates
    setView('USER');
    
    const product = 'id' in item ? item : item.product;
    PixelService.trackEvent('InitiateCheckout', {
      value: product.price,
      content_ids: [product.id],
      content_type: 'product'
    }, pixelSettings);
  };

  const updateCartItem = (index: number, updates: Partial<CartItem>) => {
    setCart(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => setCart([]);

  const placeOrder = async (details: { name: string; email: string; phone: string; address: string; location: string; zipCode: string; notes: string; courier: 'Pathao' | 'SteadFast' | '' }) => {
    if (cart.length === 0) return;
    
    const stopLoading = await triggerLoading(2000);

    const totalPrice = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
    
    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    const orderId = `${datePart}-${randomPart}`;

    const newOrder: Order = {
      id: orderId,
      customerName: details.name,
      customerEmail: details.email,
      customerPhone: details.phone,
      customerAddress: details.address,
      customerLocation: details.location,
      customerZipCode: details.zipCode,
      customerCourierPreference: details.courier as 'Pathao' | 'SteadFast',
      customerNotes: details.notes,
      items: [...cart],
      totalPrice,
      paymentStatus: 'Paid',
      orderStatus: 'Pending',
      timestamp: new Date()
    };
    
    await api.createOrder(newOrder);
    setOrders(prev => [newOrder, ...prev]);
    PixelService.trackPurchase(newOrder, pixelSettings);
    
    clearCart();
    stopLoading();
  };

  const handleCloseSuccess = () => {
    setView('LANDING');
    setIsCelebrating(true);
    setTimeout(() => {
      setIsCelebrating(false);
    }, 2000);
  };

  const updateProduct = async (updatedProduct: Product) => {
    await api.saveProduct(updatedProduct);
  };

  const addProduct = async (newProduct: Product) => {
    await api.saveProduct(newProduct);
  };

  const deleteProduct = async (id: string) => {
    await api.deleteProduct(id);
  };

  const updateOrder = async (updatedOrder: Order) => {
    await api.updateOrder(updatedOrder);
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
  };

  const updateUser = async (updatedUser: User) => {
    await api.updateUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const handleAdminLoginSuccess = () => {
    localStorage.setItem('elite_admin_session', 'true');
    setIsAdminAuthenticated(true);
  };

  const handleAdminLogout = async () => {
    // Explicitly set view to LANDING using helper
    localStorage.removeItem('elite_admin_session');
    setIsAdminAuthenticated(false);
    setView('LANDING');
  };

  const handleUpdateCourierSettings = async (settings: CourierSettings) => {
    await api.saveCourierSettings(settings);
    setCourierSettings(settings);
  };

  const handleUpdatePixelSettings = async (settings: PixelSettings) => {
    await api.savePixelSettings(settings);
    setPixelSettings(settings);
  };

  const handleUpdateTwoFactorSettings = async (settings: TwoFactorSettings) => {
    await api.saveTwoFactorSettings(settings);
    setTwoFactorSettings(settings);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FB] relative overflow-x-hidden">
      <LoadingOverlay isVisible={isLoading} />

      {isCelebrating && (
        <div className="fixed inset-0 pointer-events-none z-[300] flex justify-between animate-glowPulse">
          <div className="w-2 h-full bg-gradient-to-b from-indigo-500 via-purple-500 to-indigo-500 blur-md shadow-[0_0_20px_rgba(99,102,241,0.8)]"></div>
          <div className="w-2 h-full bg-gradient-to-b from-indigo-500 via-purple-500 to-indigo-500 blur-md shadow-[0_0_20px_rgba(99,102,241,0.8)]"></div>
        </div>
      )}

      {/* Only show Navbar if not in Admin View */}
      {view !== 'ADMIN' && <Navbar currentView={view} setView={setView} cartCount={cart.length} />}
      
      <main className={`flex-grow ${view !== 'ADMIN' ? 'pt-16' : ''}`}>
        {view === 'LANDING' && products.length > 0 && (
          <ProductLanding 
            mainProduct={mainProduct} 
            otherProducts={products.filter(p => p.id !== mainProduct.id)}
            onProductClick={handleProductClick}
            onOrderNow={handleOrderNow}
          />
        )}
        
        {view === 'DETAIL' && selectedProduct && (
          <ProductDetailView 
            product={selectedProduct} 
            onBack={() => setView('LANDING')}
            onOrderNow={handleOrderNow}
            onToggleWishlist={(p) => setWishlist(prev => prev.some(x => x.id === p.id) ? prev.filter(x => x.id !== p.id) : [...prev, p])}
            isWishlisted={wishlist.some(p => p.id === selectedProduct.id)}
          />
        )}

        {view === 'ADMIN' && (
          !isAdminAuthenticated ? (
            <AdminLogin onLoginSuccess={handleAdminLoginSuccess} onBack={() => setView('LANDING')} />
          ) : (
            <AdminPanel 
              products={products} 
              categories={categories}
              orders={orders}
              users={users}
              storeSettings={storeSettings}
              courierSettings={courierSettings}
              pixelSettings={pixelSettings}
              twoFactorSettings={twoFactorSettings}
              onUpdate={updateProduct} 
              onAdd={addProduct} 
              onDelete={deleteProduct}
              onUpdateOrder={updateOrder}
              onUpdateUser={updateUser}
              onUpdateSettings={setStoreSettings}
              onUpdateCourierSettings={handleUpdateCourierSettings}
              onUpdatePixelSettings={handleUpdatePixelSettings}
              onUpdateTwoFactorSettings={handleUpdateTwoFactorSettings}
              onAddCategory={(cat) => api.saveCategory({ ...cat, id: Math.random().toString(36).substr(2, 9), isActive: cat.isActive ?? true } as Category)}
              onDeleteCategory={(catId) => api.deleteCategory(catId)}
              onUpdateCategory={(updatedCat) => api.saveCategory(updatedCat)}
              onLogout={handleAdminLogout}
            />
          )
        )}

        {view === 'USER' && (
          <UserPanel 
            cart={cart} 
            users={users}
            orders={orders}
            wishlist={wishlist}
            onViewProduct={(p) => { setSelectedProduct(p); setView('DETAIL', p.id); }}
            onPlaceOrder={placeOrder}
            onUpdateCartItem={updateCartItem}
            onRemoveFromCart={removeFromCart}
            onCloseSuccess={handleCloseSuccess}
            onBack={() => setView('LANDING')}
          />
        )}
      </main>

      {view !== 'ADMIN' && (
        <footer className="bg-gray-900 text-white py-12 px-6 mt-12">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Amar Bazari</h3>
              <p className="text-gray-400 text-sm">Curated premium selections for the modern lifestyle in Bangladesh.</p>
            </div>
          </div>
        </footer>
      )}

      <style>{`
        @keyframes glowPulse {
          0% { opacity: 0; }
          25% { opacity: 1; }
          75% { opacity: 1; }
          100% { opacity: 0; }
        }
        .animate-glowPulse {
          animation: glowPulse 2s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;
