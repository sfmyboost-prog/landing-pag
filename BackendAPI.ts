
import { Product, Order, User, Category, StoreSettings, CourierSettings, PixelSettings, TwoFactorSettings } from './types';
import { INITIAL_PRODUCTS } from './constants';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

// Updated Key to ensure new Shampoo product is loaded
const DB_KEY = 'elite_commerce_db_clean_v4';

// Supabase Configuration from User
const SUPABASE_URL = 'https://yubfgiermqfsysbyqemx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_CxQ-7cF6Zkrkgi30ENUZ2A_Mpx1zg8f';

interface DB {
  products: Product[];
  categories: Category[];
  orders: Order[];
  users: User[];
  storeSettings: StoreSettings;
  courierSettings: CourierSettings;
  pixelSettings: PixelSettings;
  twoFactorSettings: TwoFactorSettings;
  notifications: any[];
}

const DEFAULT_DB: DB = {
  products: INITIAL_PRODUCTS,
  categories: [
    { id: '1', name: 'Apparel', isActive: true },
    { id: '2', name: 'Footwear', isActive: true },
    { id: '3', name: 'Accessories', isActive: true },
    { id: '4', name: 'Bags', isActive: true }
  ],
  orders: [],
  users: [
    { id: '1', name: 'Kristin Watson', email: 'kristin@dataflow.com', phone: '+8801700000000', role: 'Admin', status: 'Active', createdAt: new Date() }
  ],
  storeSettings: {
    storeName: 'Amar Bazari',
    logoUrl: 'A',
    currency: 'BDT',
    taxPercentage: 0,
    shippingFee: 0
  },
  courierSettings: {
    pathao: { clientId: '', clientSecret: '', storeId: '', username: '', password: '' },
    steadfast: { 
      apiKey: 'vs85kwjkj45wlwz4ffwygt44hhwjsb4p', 
      secretKey: '9tlar1jybm0rf7fbtpyncd6t', 
      merchantId: '1901313' 
    }
  },
  pixelSettings: {
    pixelId: '',
    appId: '',
    accessToken: '',
    testEventCode: '',
    currency: 'BDT',
    status: 'Inactive'
  },
  twoFactorSettings: {
    enabled: false,
    secret: 'JBSWY3DPEHPK3PXP' // Default placeholder secret (base32)
  },
  notifications: []
};

type DataChangeListener = (dataType: 'orders' | 'products' | 'users' | 'notifications' | 'categories', data: any) => void;

class BackendAPI {
  private db: DB;
  private supabase: SupabaseClient;
  private listeners: DataChangeListener[] = [];
  private realtimeChannel: RealtimeChannel | null = null;

  constructor() {
    const stored = localStorage.getItem(DB_KEY);
    this.db = stored ? JSON.parse(stored) : DEFAULT_DB;
    // Ensure dates are parsed correctly from JSON
    if (this.db.orders) {
      this.db.orders = this.db.orders.map(o => ({...o, timestamp: new Date(o.timestamp)}));
    }
    if (this.db.users) {
      this.db.users = this.db.users.map(u => ({...u, createdAt: new Date(u.createdAt)}));
    }

    if (!stored) this.save();
    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    this.initializeRealtime();
    this.syncInitialData();
  }

  private save() {
    localStorage.setItem(DB_KEY, JSON.stringify(this.db));
  }

  private async syncInitialData() {
    try {
      // Sync Products
      const { data: pData } = await this.supabase.from('products').select('*');
      if (pData && pData.length > 0) {
        this.db.products = pData.map(row => this.mapSupabaseProduct(row));
        this.notifyListeners('products', this.db.products);
      }
      
      // Sync Categories
      const { data: cData } = await this.supabase.from('categories').select('*');
      if (cData && cData.length > 0) {
        this.db.categories = cData.map(row => ({ id: row.id, name: row.name, isActive: row.is_active }));
        this.notifyListeners('categories', this.db.categories);
      }
      
      this.save();
    } catch (e) {
      console.warn('Initial sync failed, using local data', e);
    }
  }

  // --- Realtime Engine ---

  private initializeRealtime() {
    if (this.realtimeChannel) return;

    this.realtimeChannel = this.supabase
      .channel('db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('[Realtime] Order Update:', payload);
          if (payload.eventType === 'INSERT') {
            const newOrder = this.mapSupabaseOrder(payload.new);
            if (!this.db.orders.some(o => o.id === newOrder.id)) {
                this.db.orders.unshift(newOrder);
                this.notifyListeners('orders', this.db.orders);
                this.addNotification({
                  id: Date.now(),
                  title: 'New Order Received',
                  message: `Order #${newOrder.id} placed by ${newOrder.customerName}`,
                  timestamp: new Date(),
                  read: false,
                  type: 'order'
                });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = this.mapSupabaseOrder(payload.new);
            const idx = this.db.orders.findIndex(o => o.id === updatedOrder.id);
            if (idx > -1) {
              this.db.orders[idx] = updatedOrder;
              this.notifyListeners('orders', this.db.orders);
            }
          }
          this.save();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          console.log('[Realtime] Product Update:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
             const product = this.mapSupabaseProduct(payload.new);
             const idx = this.db.products.findIndex(p => p.id === product.id);
             if (idx > -1) this.db.products[idx] = product;
             else this.db.products.push(product);
          } else if (payload.eventType === 'DELETE') {
             this.db.products = this.db.products.filter(p => p.id !== payload.old.id);
          }
          this.save();
          this.notifyListeners('products', this.db.products);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        (payload) => {
          console.log('[Realtime] Category Update:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
             const cat = { id: payload.new.id, name: payload.new.name, isActive: payload.new.is_active };
             const idx = this.db.categories.findIndex(c => c.id === cat.id);
             if (idx > -1) this.db.categories[idx] = cat;
             else this.db.categories.push(cat);
          } else if (payload.eventType === 'DELETE') {
             this.db.categories = this.db.categories.filter(c => c.id !== payload.old.id);
          }
          this.save();
          this.notifyListeners('categories', this.db.categories);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Connected to Supabase');
        }
      });
  }

  public subscribe(listener: DataChangeListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(dataType: 'orders' | 'products' | 'users' | 'notifications' | 'categories', data: any) {
    this.listeners.forEach(l => l(dataType, data));
  }

  private addNotification(notification: any) {
    this.db.notifications.unshift(notification);
    this.save();
    this.notifyListeners('notifications', this.db.notifications);
  }

  // --- Data Mapping ---

  private mapSupabaseOrder(row: any): Order {
    return {
      id: row.id,
      customerName: row.customer_name,
      customerEmail: row.email,
      customerPhone: row.phone,
      customerAddress: row.street_address,
      customerLocation: row.location,
      customerZipCode: row.zip_code,
      customerCourierPreference: row.courier_preference,
      customerNotes: row.notes,
      items: row.items || [],
      totalPrice: row.total_amount,
      paymentStatus: row.payment_status,
      orderStatus: row.order_status,
      timestamp: new Date(row.date_time),
      courierName: row.courier_name,
      courierTrackingId: row.courier_tracking_id
    };
  }

  private mapSupabaseProduct(row: any): Product {
    return {
      id: row.id,
      name: row.name,
      price: row.price,
      originalPrice: row.original_price,
      rating: row.rating,
      reviewCount: row.review_count,
      description: row.description,
      shortDescription: row.short_description,
      images: row.images || [],
      colors: row.colors || [],
      sizes: row.sizes || [],
      productId: row.product_id,
      deliveryRegions: row.delivery_regions || [],
      category: row.category,
      isMain: row.is_main,
      isActive: row.is_active,
      stock: row.stock,
      discountPercentage: row.discount_percentage,
      purchaseCost: row.purchase_cost,
      internalPrice: row.internal_price,
      hasSizes: row.has_sizes,
      hasColors: row.has_colors
    };
  }

  private mapProductToRow(product: Product): any {
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      original_price: product.originalPrice,
      rating: product.rating,
      review_count: product.reviewCount,
      description: product.description,
      short_description: product.shortDescription,
      images: product.images,
      colors: product.colors,
      sizes: product.sizes,
      product_id: product.productId,
      delivery_regions: product.deliveryRegions,
      category: product.category,
      is_main: product.isMain,
      is_active: product.isActive,
      stock: product.stock,
      discount_percentage: product.discountPercentage,
      purchase_cost: product.purchaseCost,
      internal_price: product.internalPrice,
      has_sizes: product.hasSizes,
      has_colors: product.hasColors
    };
  }

  // --- CRUD Operations ---

  async clearSystemData(): Promise<void> {
    this.db.orders = [];
    this.db.notifications = [];
    this.save();
    this.notifyListeners('orders', []);
    this.notifyListeners('notifications', []);
  }

  async getProducts(): Promise<Product[]> {
    return [...this.db.products];
  }

  async saveProduct(product: Product): Promise<Product> {
    const idx = this.db.products.findIndex(p => p.id === product.id);
    if (idx > -1) this.db.products[idx] = product;
    else this.db.products.push(product);
    this.save();
    this.notifyListeners('products', this.db.products);

    try {
        await this.supabase.from('products').upsert(this.mapProductToRow(product));
    } catch (e) {
        console.error('Supabase Product Sync Failed:', e);
    }

    return product;
  }

  async deleteProduct(id: string): Promise<void> {
    this.db.products = this.db.products.filter(p => p.id !== id);
    this.save();
    this.notifyListeners('products', this.db.products);

    try {
        await this.supabase.from('products').delete().eq('id', id);
    } catch (e) {
        console.error('Supabase Product Delete Failed:', e);
    }
  }

  async getCategories(): Promise<Category[]> {
    return [...this.db.categories];
  }

  async saveCategory(category: Category): Promise<Category> {
    const idx = this.db.categories.findIndex(c => c.id === category.id);
    if (idx > -1) this.db.categories[idx] = category;
    else this.db.categories.push(category);
    this.save();
    this.notifyListeners('categories', this.db.categories);

    try {
      await this.supabase.from('categories').upsert({
        id: category.id,
        name: category.name,
        is_active: category.isActive
      });
    } catch (e) { console.error(e); }
    return category;
  }

  async deleteCategory(id: string): Promise<void> {
    this.db.categories = this.db.categories.filter(c => c.id !== id);
    this.save();
    this.notifyListeners('categories', this.db.categories);

    try {
      await this.supabase.from('categories').delete().eq('id', id);
    } catch (e) { console.error(e); }
  }

  async getOrders(forceRefresh = false): Promise<Order[]> {
    return [...this.db.orders];
  }

  async createOrder(order: Order): Promise<Order> {
    // Optimistic Update
    this.db.orders.unshift(order);
    this.addNotification({
      id: Date.now(),
      title: 'New Order Received',
      message: `Order #${order.id} placed by ${order.customerName}`,
      timestamp: new Date(),
      read: false,
      type: 'order'
    });
    this.save();
    this.notifyListeners('orders', this.db.orders);

    try {
      const { error } = await this.supabase
        .from('orders')
        .insert([{
          id: order.id,
          customer_name: order.customerName,
          email: order.customerEmail,
          phone: order.customerPhone,
          street_address: order.customerAddress,
          location: order.customerLocation,
          zip_code: order.customerZipCode,
          items: order.items,
          total_amount: order.totalPrice,
          payment_status: order.paymentStatus,
          order_status: order.orderStatus,
          courier_preference: order.customerCourierPreference,
          notes: order.customerNotes,
          date_time: order.timestamp.toISOString()
        }]);

      if (error) throw error;
    } catch (err) {
      console.error('Supabase Sync Failed (Order saved locally):', err);
    }
    return order;
  }

  async updateOrder(order: Order): Promise<Order> {
    const idx = this.db.orders.findIndex(o => o.id === order.id);
    if (idx > -1) {
      this.db.orders[idx] = order;
      this.save();
      this.notifyListeners('orders', this.db.orders);
    }

    try {
      const { error } = await this.supabase
        .from('orders')
        .update({
          payment_status: order.paymentStatus,
          order_status: order.orderStatus,
          courier_name: order.courierName,
          courier_tracking_id: order.courierTrackingId,
          notes: order.customerNotes
        })
        .eq('id', order.id);

      if (error) throw error;
    } catch (err) {
      console.error('Supabase Sync Failed (Update saved locally):', err);
    }
    return order;
  }

  async getUsers(): Promise<User[]> {
    return [...this.db.users];
  }

  async updateUser(user: User): Promise<User> {
    const idx = this.db.users.findIndex(u => u.id === user.id);
    if (idx > -1) {
      this.db.users[idx] = user;
      this.save();
      this.notifyListeners('users', this.db.users);
    }
    return user;
  }

  async getNotifications(): Promise<any[]> {
    return [...this.db.notifications];
  }

  async markNotificationsAsRead(): Promise<void> {
    this.db.notifications.forEach(n => n.read = true);
    this.save();
    this.notifyListeners('notifications', this.db.notifications);
  }

  async getCourierSettings(): Promise<CourierSettings> {
    return { ...this.db.courierSettings };
  }

  async saveCourierSettings(settings: CourierSettings): Promise<void> {
    this.db.courierSettings = settings;
    this.save();
  }

  async getPixelSettings(): Promise<PixelSettings> {
    return { ...this.db.pixelSettings };
  }

  async savePixelSettings(settings: PixelSettings): Promise<void> {
    this.db.pixelSettings = settings;
    this.save();
  }

  async getTwoFactorSettings(): Promise<TwoFactorSettings> {
    return { ...this.db.twoFactorSettings };
  }

  async saveTwoFactorSettings(settings: TwoFactorSettings): Promise<void> {
    this.db.twoFactorSettings = settings;
    this.save();
  }

  // --- Metrics Calculation Engine ---

  async getDashboardMetrics(yearOffset: number = 0) {
    const orders = this.db.orders;
    const products = this.db.products;
    const users = this.db.users;

    const currentYear = new Date().getFullYear() + yearOffset;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const activeOrders = orders.filter(o => o.orderStatus !== 'Cancelled');
    const paidOrActiveOrders = activeOrders; 

    // 1. Total Earnings
    const earningsCurrent = paidOrActiveOrders
      .filter(o => new Date(o.timestamp).getFullYear() === currentYear)
      .reduce((acc, o) => acc + o.totalPrice, 0);

    // 2. Monthly Revenue Data
    const monthlyRevenue = Array(12).fill(0);
    const monthlyOrders = Array(12).fill(0);
    const lastYearRevenue = Array(12).fill(0);

    orders.forEach(o => {
      const date = new Date(o.timestamp);
      const month = date.getMonth();
      const isActive = o.orderStatus !== 'Cancelled';
      
      if (date.getFullYear() === currentYear) {
        if (isActive) {
          monthlyRevenue[month] += o.totalPrice;
        }
        monthlyOrders[month] += 1;
      } else if (date.getFullYear() === currentYear - 1 && isActive) {
        lastYearRevenue[month] += o.totalPrice;
      }
    });

    // 3. Growth
    const thisMonthRevenue = paidOrActiveOrders
      .filter(o => new Date(o.timestamp) >= startOfMonth)
      .reduce((acc, o) => acc + o.totalPrice, 0);
    
    const lastMonthRevenue = paidOrActiveOrders
      .filter(o => new Date(o.timestamp) >= startOfLastMonth && new Date(o.timestamp) <= endOfLastMonth)
      .reduce((acc, o) => acc + o.totalPrice, 0);

    const growth = lastMonthRevenue > 0 
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : (thisMonthRevenue > 0 ? 100 : 0);

    // 4. Total Profit
    const totalProfit = paidOrActiveOrders
      .filter(o => new Date(o.timestamp).getFullYear() === currentYear)
      .reduce((acc, order) => {
        const orderCost = order.items.reduce((sum, item) => {
            const cost = item.product.purchaseCost || 0;
            return sum + (cost * item.quantity);
        }, 0);
        return acc + (order.totalPrice - orderCost);
      }, 0);

    // 5. Top Selling Products
    const productSales: Record<string, number> = {};
    activeOrders.forEach(o => {
      o.items.forEach(item => {
        productSales[item.product.id] = (productSales[item.product.id] || 0) + item.quantity;
      });
    });

    const topSales = products
      .map(p => ({
        ...p,
        totalSold: productSales[p.id] || 0
      }))
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5);

    // 6. Customer Geography
    const locationData: Record<string, number> = {};
    orders.forEach(o => {
      const loc = o.customerLocation || 'Dhaka';
      locationData[loc] = (locationData[loc] || 0) + 1;
    });
    
    // 7. Sales Source
    const salesSource = {
      website: orders.filter(o => o.items.length > 0).length,
      store: 0,
      social: orders.filter(o => o.customerNotes?.toLowerCase().includes('fb') || o.customerNotes?.toLowerCase().includes('insta')).length
    };
    salesSource.website = salesSource.website - salesSource.social;

    // 8. Unique Customers (Revised to not count Admin)
    const uniqueCustomers = new Set<string>();
    users.filter(u => u.role === 'Customer').forEach(u => { if (u.phone) uniqueCustomers.add(u.phone); });
    orders.forEach(o => { if (o.customerPhone) uniqueCustomers.add(o.customerPhone); });

    return {
      totalEarnings: earningsCurrent,
      totalOrders: orders.length,
      customers: uniqueCustomers.size,
      totalProfit: totalProfit,
      growth: parseFloat(growth.toFixed(1)),
      revenueSeries: monthlyRevenue,
      orderSeries: monthlyOrders,
      lastYearRevenueSeries: lastYearRevenue,
      topSales,
      recentOrders: orders.slice(0, 10),
      currentYear,
      locationData,
      salesSource
    };
  }
}

export const api = new BackendAPI();
