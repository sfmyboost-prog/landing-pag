
import React, { useState, useCallback, useEffect } from 'react';
import { ViewState, Product, CartItem, Order, User, StoreSettings, CourierSettings, Category, PixelSettings } from './types';
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
  const [view, setInternalView] = useState<ViewState>('LANDING');
  const [isLoading, setIsLoading] = useState(false);
  
  // Helper to trigger smooth loading transitions
  const triggerLoading = useCallback(async (minDuration = 800) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, minDuration));
    // We don't set false here immediately; usually we wait for the action to complete
    // but for simple nav, we can return a promise that resolves when "ready"
    return () => setTimeout(() => setIsLoading(false), 200); // smooth fade out
  }, []);

  // Navigation Helper with History Support and Loading Effect
  const setView = useCallback(async (newView: ViewState) => {
    if (newView === view) return;
    
    // Start Loading
    const stopLoading = await triggerLoading(800);
    
    setInternalView(currentView => {
      if (currentView !== newView) {
        window.history.pushState({ view: newView }, '');
        return newView;
      }
      return currentView;
    });

    // Stop Loading
    stopLoading();
  }, [triggerLoading, view]);

  // Handle Browser Back Button
  useEffect(() => {
    // Ensure initial state exists
    if (!window.history.state) {
      window.history.replaceState({ view: 'LANDING' }, '');
    }

    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.view) {
        setInternalView(event.state.view);
      } else {
        // Fallback if state is missing (e.g. external link return)
        setInternalView('LANDING');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
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
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);

  // Initial Data Fetch
  useEffect(() => {
    const fetchData = async () => {
      const [p, c, o, u, cs, ps] = await Promise.all([
        api.getProducts(),
        Promise.resolve([
          { id: '1', name: 'Apparel', isActive: true },
          { id: '2', name: 'Footwear', isActive: true },
          { id: '3', name: 'Accessories', isActive: true },
          { id: '4', name: 'Bags', isActive: true }
        ]),
        api.getOrders(),
        api.getUsers(),
        api.getCourierSettings(),
        api.getPixelSettings()
      ]);
      setProducts(p);
      setCategories(c);
      setOrders(o);
      setUsers(u);
      setCourierSettings(cs);
      setPixelSettings(ps);

      // Initialize Pixel Tracking if active
      if (ps.status === 'Active' && ps.pixelId) {
        PixelService.initializeBrowserPixel(ps.pixelId);
      }
    };
    fetchData();
  }, [view]);

  const mainProduct = products.find(p => p.isMain) || products[0];

  const handleProductClick = useCallback(async (product: Product) => {
    const stopLoading = await triggerLoading(1000);
    
    const directItem: CartItem = {
      product,
      quantity: 1,
      selectedSize: product.sizes[0] || 'M',
      selectedColor: product.colors[0] || '#000'
    };
    setCart([directItem]);
    
    // Navigate manually to avoid double loading
    setInternalView('USER');
    window.history.pushState({ view: 'USER' }, '');
    
    // Tracking AddToCart
    PixelService.trackEvent('AddToCart', {
      value: product.price,
      content_ids: [product.id],
      content_type: 'product'
    }, pixelSettings);

    stopLoading();
  }, [pixelSettings, triggerLoading]);

  const handleOrderNow = async (item: CartItem | Product) => {
    const stopLoading = await triggerLoading(1200);

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
    
    setInternalView('USER');
    window.history.pushState({ view: 'USER' }, '');
    
    // Tracking InitiateCheckout
    const product = 'id' in item ? item : item.product;
    PixelService.trackEvent('InitiateCheckout', {
      value: product.price,
      content_ids: [product.id],
      content_type: 'product'
    }, pixelSettings);

    stopLoading();
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
    
    const stopLoading = await triggerLoading(2000); // Longer delay for "processing"

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
    
    // Universal Pixel Purchase Tracking
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

  // Admin and Data Actions don't necessarily need the big full-screen loader
  // as they are typically quicker or have local feedback. 
  // We keep the overlay for major view shifts.

  const updateProduct = async (updatedProduct: Product) => {
    await api.saveProduct(updatedProduct);
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const addProduct = async (newProduct: Product) => {
    await api.saveProduct(newProduct);
    setProducts(prev => [newProduct, ...prev]);
  };

  const deleteProduct = async (id: string) => {
    await api.deleteProduct(id);
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const updateOrder = async (updatedOrder: Order) => {
    await api.updateOrder(updatedOrder);
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
  };

  const updateUser = async (updatedUser: User) => {
    await api.updateUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const handleAdminLogout = async () => {
    const stopLoading = await triggerLoading(500);
    setIsAdminAuthenticated(false);
    setInternalView('LANDING'); // Skip standard setView to control flow manually
    window.history.pushState({ view: 'LANDING' }, '');
    stopLoading();
  };

  const handleUpdateCourierSettings = async (settings: CourierSettings) => {
    await api.saveCourierSettings(settings);
    setCourierSettings(settings);
  };

  const handleUpdatePixelSettings = async (settings: PixelSettings) => {
    await api.savePixelSettings(settings);
    setPixelSettings(settings);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FB] relative overflow-x-hidden">
      {/* Global Loading Overlay */}
      <LoadingOverlay isVisible={isLoading} />

      {isCelebrating && (
        <div className="fixed inset-0 pointer-events-none z-[300] flex justify-between animate-glowPulse">
          <div className="w-2 h-full bg-gradient-to-b from-indigo-500 via-purple-500 to-indigo-500 blur-md shadow-[0_0_20px_rgba(99,102,241,0.8)]"></div>
          <div className="w-2 h-full bg-gradient-to-b from-indigo-500 via-purple-500 to-indigo-500 blur-md shadow-[0_0_20px_rgba(99,102,241,0.8)]"></div>
        </div>
      )}

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
            <AdminLogin onLoginSuccess={() => setIsAdminAuthenticated(true)} onBack={() => setView('LANDING')} />
          ) : (
            <AdminPanel 
              products={products} 
              categories={categories}
              orders={orders}
              users={users}
              storeSettings={storeSettings}
              courierSettings={courierSettings}
              pixelSettings={pixelSettings}
              onUpdate={updateProduct} 
              onAdd={addProduct} 
              onDelete={deleteProduct}
              onUpdateOrder={updateOrder}
              onUpdateUser={updateUser}
              onUpdateSettings={setStoreSettings}
              onUpdateCourierSettings={handleUpdateCourierSettings}
              onUpdatePixelSettings={handleUpdatePixelSettings}
              onAddCategory={(cat) => setCategories([...categories, { id: Math.random().toString(36).substr(2, 9), name: cat.name || 'New Category', isActive: cat.isActive ?? true }])}
              onDeleteCategory={(catId) => setCategories(categories.filter(c => c.id !== catId))}
              onUpdateCategory={(updatedCat) => setCategories(categories.map(c => c.id === updatedCat.id ? updatedCat : c))}
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
            onViewProduct={setSelectedProduct}
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
