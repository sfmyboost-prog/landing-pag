
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

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('LANDING');
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

  const handleProductClick = useCallback((product: Product) => {
    const directItem: CartItem = {
      product,
      quantity: 1,
      selectedSize: product.sizes[0] || 'M',
      selectedColor: product.colors[0] || '#000'
    };
    setCart([directItem]);
    setView('USER');
    
    // Tracking AddToCart
    PixelService.trackEvent('AddToCart', {
      value: product.price,
      content_ids: [product.id],
      content_type: 'product'
    }, pixelSettings);
  }, [pixelSettings]);

  const handleOrderNow = (item: CartItem | Product) => {
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
    setView('USER');
    
    // Tracking InitiateCheckout
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

  const handleAdminLogout = () => {
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

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FB] relative overflow-x-hidden">
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
              onAddCategory={(catName) => setCategories([...categories, { id: Math.random().toString(36).substr(2, 9), name: catName, isActive: true }])}
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
