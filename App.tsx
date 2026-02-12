
import React, { useState, useCallback } from 'react';
import { ViewState, Product, CartItem, Order, User, StoreSettings, CourierSettings } from './types';
import { INITIAL_PRODUCTS } from './constants';
import Navbar from './components/Navbar';
import ProductLanding from './components/ProductLanding';
import ProductDetailView from './components/ProductDetailView';
import AdminPanel from './components/AdminPanel';
import AdminLogin from './components/AdminLogin';
import UserPanel from './components/UserPanel';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('LANDING');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState<string[]>(['Apparel', 'Footwear', 'Accessories', 'Bags']);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([
    { id: '1', name: 'Kristin Watson', email: 'kristin@dataflow.com', role: 'Admin', status: 'Active', createdAt: new Date() },
    { id: '2', name: 'Leslie Alexander', email: 'leslie@example.com', role: 'Customer', status: 'Active', createdAt: new Date() }
  ]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    storeName: 'Dataflow Ecommerce',
    logoUrl: 'D',
    currency: 'USD',
    taxPercentage: 10,
    shippingFee: 0
  });

  const [courierSettings, setCourierSettings] = useState<CourierSettings>({
    pathao: { clientId: '', clientSecret: '', storeId: '', username: '', password: '' },
    steadfast: { apiKey: '', secretKey: '', merchantId: '' }
  });
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);

  const mainProduct = products.find(p => p.isMain) || products[0];

  const handleProductClick = useCallback((product: Product) => {
    setSelectedProduct(product);
    setView('DETAIL');
  }, []);

  const addToCart = (item: CartItem) => {
    setCart(prev => [...prev, item]);
  };

  const clearCart = () => setCart([]);

  const placeOrder = (details: { name: string; email: string; phone: string; address: string; location: string }) => {
    if (cart.length === 0) return;
    const totalPrice = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
    const newOrder: Order = {
      id: Math.floor(1000 + Math.random() * 9000).toString(),
      customerName: details.name,
      customerEmail: details.email,
      customerPhone: details.phone,
      customerAddress: details.address,
      customerLocation: details.location,
      items: [...cart],
      totalPrice,
      status: 'Paid',
      orderStatus: 'Pending',
      timestamp: new Date()
    };
    setOrders(prev => [newOrder, ...prev]);
    clearCart();
    alert('Order placed successfully!');
  };

  const updateProduct = (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const addProduct = (newProduct: Product) => {
    setProducts(prev => [newProduct, ...prev]);
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const updateOrder = (updatedOrder: Order) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
  };

  const addOrder = (newOrder: Order) => {
    setOrders(prev => [newOrder, ...prev]);
  };

  const updateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    setView('LANDING');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FB]">
      {view !== 'ADMIN' && <Navbar currentView={view} setView={setView} cartCount={cart.length} />}
      
      <main className={`flex-grow ${view !== 'ADMIN' ? 'pt-16' : ''}`}>
        {view === 'LANDING' && (
          <ProductLanding 
            mainProduct={mainProduct} 
            otherProducts={products.filter(p => p.id !== mainProduct.id)}
            onProductClick={handleProductClick}
          />
        )}
        
        {view === 'DETAIL' && selectedProduct && (
          <ProductDetailView 
            product={selectedProduct} 
            onBack={() => setView('LANDING')}
            onAddToCart={addToCart}
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
              onUpdate={updateProduct} 
              onAdd={addProduct} 
              onDelete={deleteProduct}
              onUpdateOrder={updateOrder}
              onAddOrder={addOrder}
              onUpdateUser={updateUser}
              onUpdateSettings={setStoreSettings}
              onAddCategory={(cat) => setCategories([...categories, cat])}
              onDeleteCategory={(cat) => setCategories(categories.filter(c => c !== cat))}
              onLogout={handleAdminLogout}
            />
          )
        )}

        {view === 'USER' && (
          <UserPanel 
            cart={cart} 
            wishlist={wishlist}
            onViewProduct={handleProductClick}
            onPlaceOrder={placeOrder}
          />
        )}
      </main>

      {view !== 'ADMIN' && (
        <footer className="bg-gray-900 text-white py-12 px-6 mt-12">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">EliteCommerce</h3>
              <p className="text-gray-400 text-sm">Curated premium selections for the modern elite.</p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;
