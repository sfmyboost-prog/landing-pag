
import { Product, Category, Order, User, StoreSettings, CourierSettings, PixelSettings, TwoFactorSettings } from './types';
import { INITIAL_PRODUCTS } from './constants';
import { supabase } from './supabaseClient';

interface Database {
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

const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: 'Amar Bazari',
  logoUrl: 'A',
  currency: 'BDT',
  taxPercentage: 0,
  shippingFee: 60,
  whatsappNumber: '+8801604783479',
  whatsappOrderLink: 'https://wa.me/8801604783479'
};

const DEFAULT_COURIER_SETTINGS: CourierSettings = {
  pathao: { clientId: '', clientSecret: '', storeId: '', username: '', password: '' },
  steadfast: { apiKey: '', secretKey: '', merchantId: '' }
};

const DEFAULT_PIXEL_SETTINGS: PixelSettings = {
  pixelId: '',
  appId: '',
  accessToken: '',
  testEventCode: '',
  currency: 'BDT',
  status: 'Inactive'
};

const DEFAULT_TWO_FACTOR_SETTINGS: TwoFactorSettings = {
  enabled: false,
  secret: ''
};

// Mappers for Supabase (snake_case DB <-> camelCase App)
const mapSupabaseToOrder = (row: any): Order => {
  // Handle new schema (first_name, last_name) or old schema (customer_name)
  const fullName = row.first_name 
    ? `${row.first_name} ${row.last_name || ''}`.trim()
    : (row.customer_name || '');

  return {
    id: row.id,
    customerName: fullName,
    customerEmail: row.email || row.customer_email || '',
    customerPhone: row.phone || row.customer_phone || '',
    customerAddress: row.street_address || row.customer_address || '',
    customerLocation: row.city || row.customer_location || '',
    customerZipCode: row.zip_code || row.customer_zip_code || '',
    customerCourierPreference: row.customer_courier_preference as any,
    items: row.items || [], // Assumes JSON column 'items' is used
    totalPrice: Number(row.total_amount || row.total_price) || 0,
    paymentStatus: row.payment_status as any,
    orderStatus: row.order_status as any,
    timestamp: row.created_at ? new Date(row.created_at) : new Date(),
    courierName: row.courier_name as any,
    courierTrackingId: row.courier_tracking_id,
    customerNotes: row.customer_notes
  };
};

const mapOrderToSupabase = (order: Order): any => {
  // Split name for new columns, keeping backward compatibility if needed
  const nameParts = order.customerName.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Generate product name summary string
  const productNameSummary = order.items.map(i => `${i.product.name} (x${i.quantity})`).join(', ');

  return {
    id: order.id,
    
    // New Schema Fields
    first_name: firstName,
    last_name: lastName,
    email: order.customerEmail,
    phone: order.customerPhone,
    street_address: order.customerAddress,
    city: order.customerLocation,
    zip_code: order.customerZipCode,
    product_name: productNameSummary,
    total_amount: order.totalPrice,
    
    // Maintain complex items structure in JSON column
    items: order.items,
    
    // App status fields
    payment_status: order.paymentStatus,
    order_status: order.orderStatus,
    created_at: order.timestamp.toISOString(),
    
    // Courier info
    courier_name: order.courierName,
    courier_tracking_id: order.courierTrackingId,
    customer_notes: order.customerNotes,

    // Legacy fields for backward compatibility if table wasn't fully migrated (Optional)
    customer_name: order.customerName,
  };
};

class BackendAPI {
  private db: Database;
  private listeners: ((type: string, data: any) => void)[] = [];

  constructor() {
    const saved = localStorage.getItem('elite_db');
    if (saved) {
      try {
        this.db = JSON.parse(saved);

        // --- DATA SYNC ---
        // Force update products with IDs from INITIAL_PRODUCTS to use the latest data from constants.ts
        this.db.products = this.db.products.map(p => {
          const fresh = INITIAL_PRODUCTS.find(ip => ip.id === p.id);
          if (fresh) {
             return { 
               ...fresh, 
               stock: p.stock,
               isActive: p.isActive,
               isMain: p.isMain 
             };
          }
          return p;
        });

        // Ensure defaults for new fields if loading from old DB structure
        if (!this.db.categories) this.db.categories = [];
        if (!this.db.storeSettings) this.db.storeSettings = DEFAULT_STORE_SETTINGS;
        if (!this.db.courierSettings) this.db.courierSettings = DEFAULT_COURIER_SETTINGS;
        if (!this.db.pixelSettings) this.db.pixelSettings = DEFAULT_PIXEL_SETTINGS;
        if (!this.db.twoFactorSettings) this.db.twoFactorSettings = DEFAULT_TWO_FACTOR_SETTINGS;
        if (!this.db.notifications) this.db.notifications = [];
        
        this.save();
      } catch (e) {
        this.db = this.initializeDb();
      }
    } else {
      this.db = this.initializeDb();
      this.save();
    }

    // Initialize Realtime Subscription
    this.initRealtime();
  }

  private initRealtime() {
    supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        this.handleRealtimeEvent(payload);
      })
      .subscribe();
  }

  private handleRealtimeEvent(payload: any) {
    if (payload.eventType === 'INSERT') {
       const newOrder = mapSupabaseToOrder(payload.new);
       // Avoid duplicates if we already added it via optimistic update
       const exists = this.db.orders.find(o => o.id === newOrder.id);
       if (!exists) {
          this.db.orders.unshift(newOrder);
          // Sort to ensure order
          this.db.orders.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          this.save();
          this.notify('orders', this.db.orders);
          
          // Add Notification for new remote orders
          const notif = {
              id: Date.now().toString(),
              title: 'New Order Received',
              message: `Order #${newOrder.id} from ${newOrder.customerName} - TK${newOrder.totalPrice}`,
              timestamp: new Date(),
              read: false
          };
          this.db.notifications.unshift(notif);
          this.notify('notifications', this.db.notifications);
       }
    } else if (payload.eventType === 'UPDATE') {
       const updatedOrder = mapSupabaseToOrder(payload.new);
       const index = this.db.orders.findIndex(o => o.id === updatedOrder.id);
       if (index !== -1) {
          this.db.orders[index] = updatedOrder;
          this.save();
          this.notify('orders', this.db.orders);
       }
    }
  }

  private initializeDb(): Database {
    return {
      products: INITIAL_PRODUCTS,
      categories: [
         { id: '1', name: 'Natural Soap', isActive: true },
         { id: '2', name: 'Hair Care', isActive: true }
      ],
      orders: [],
      users: [
        { id: '1', name: 'Admin User', email: 'admin@dataflow.com', role: 'Admin', status: 'Active', createdAt: new Date() },
        { id: '2', name: 'Demo Customer', email: 'customer@demo.com', role: 'Customer', status: 'Active', createdAt: new Date() }
      ],
      storeSettings: DEFAULT_STORE_SETTINGS,
      courierSettings: DEFAULT_COURIER_SETTINGS,
      pixelSettings: DEFAULT_PIXEL_SETTINGS,
      twoFactorSettings: DEFAULT_TWO_FACTOR_SETTINGS,
      notifications: []
    };
  }

  private save() {
    localStorage.setItem('elite_db', JSON.stringify(this.db));
  }

  private notify(type: string, data: any) {
    this.listeners.forEach(l => l(type, data));
  }

  subscribe(listener: (type: string, data: any) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Products
  async getProducts(): Promise<Product[]> { return [...this.db.products]; }
  async saveProduct(product: Product): Promise<void> {
    const idx = this.db.products.findIndex(p => p.id === product.id);
    if (idx >= 0) {
      this.db.products[idx] = product;
    } else {
      this.db.products.push(product);
    }
    this.save();
    this.notify('products', this.db.products);
  }
  async deleteProduct(id: string): Promise<void> {
    this.db.products = this.db.products.filter(p => p.id !== id);
    this.save();
    this.notify('products', this.db.products);
  }

  // Categories
  async getCategories(): Promise<Category[]> { return [...this.db.categories]; }
  async saveCategory(category: Category): Promise<void> {
    const idx = this.db.categories.findIndex(c => c.id === category.id);
    if (idx >= 0) {
      this.db.categories[idx] = category;
    } else {
      this.db.categories.push(category);
    }
    this.save();
    this.notify('categories', this.db.categories);
  }
  async deleteCategory(id: string): Promise<void> {
    this.db.categories = this.db.categories.filter(c => c.id !== id);
    this.save();
    this.notify('categories', this.db.categories);
  }

  // Orders - Connected to Supabase
  async getOrders(): Promise<Order[]> { 
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase getOrders Error:', error);
        return [...this.db.orders];
      }

      if (data) {
        this.db.orders = data.map(mapSupabaseToOrder);
        this.save();
        this.notify('orders', this.db.orders);
      }
    } catch (err) {
      console.error('Supabase Connection Error:', err);
    }
    return [...this.db.orders]; 
  }

  async createOrder(order: Order): Promise<void> {
    // Optimistic Update
    this.db.orders.unshift(order);
    this.save();
    this.notify('orders', this.db.orders);
    
    // Add Notification
    const notif = {
        id: Date.now().toString(),
        title: 'New Order Received',
        message: `Order #${order.id} from ${order.customerName} - TK${order.totalPrice}`,
        timestamp: new Date(),
        read: false
    };
    this.db.notifications.unshift(notif);
    this.notify('notifications', this.db.notifications);

    // Sync to Supabase
    try {
      const payload = mapOrderToSupabase(order);
      const { error } = await supabase.from('orders').insert([payload]);
      
      if (error) throw error;
      
    } catch (err) {
      console.error('Supabase Create Exception:', err);
      // Rollback optimistic update on failure
      this.db.orders = this.db.orders.filter(o => o.id !== order.id);
      this.save();
      this.notify('orders', this.db.orders);
      // Re-throw so UI knows it failed
      throw err;
    }
  }

  async updateOrder(order: Order): Promise<void> {
    const idx = this.db.orders.findIndex(o => o.id === order.id);
    if (idx >= 0) {
      this.db.orders[idx] = order;
      this.save();
      this.notify('orders', this.db.orders);
    }

    // Sync to Supabase
    try {
      const payload = mapOrderToSupabase(order);
      // Remove created_at from update payload to rely on existing timestamp or avoid conflict
      const { created_at, ...updateData } = payload;
      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', order.id);

      if (error) {
        console.error('Supabase Update Order Error:', error);
      }
    } catch (err) {
      console.error('Supabase Update Exception:', err);
    }
  }

  // Users
  async getUsers(): Promise<User[]> { return [...this.db.users]; }
  async updateUser(user: User): Promise<void> {
    const idx = this.db.users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      this.db.users[idx] = user;
      this.save();
      this.notify('users', this.db.users);
    }
  }

  // Settings
  async getStoreSettings(): Promise<StoreSettings> { return { ...this.db.storeSettings }; }
  async saveStoreSettings(settings: StoreSettings): Promise<void> {
    this.db.storeSettings = settings;
    this.save();
  }

  async getCourierSettings(): Promise<CourierSettings> { return { ...this.db.courierSettings }; }
  async saveCourierSettings(settings: CourierSettings): Promise<void> {
    this.db.courierSettings = settings;
    this.save();
  }

  async getPixelSettings(): Promise<PixelSettings> { return { ...this.db.pixelSettings }; }
  async savePixelSettings(settings: PixelSettings): Promise<void> {
    this.db.pixelSettings = settings;
    this.save();
  }

  async getTwoFactorSettings(): Promise<TwoFactorSettings> { return { ...this.db.twoFactorSettings }; }
  async saveTwoFactorSettings(settings: TwoFactorSettings): Promise<void> {
    this.db.twoFactorSettings = settings;
    this.save();
  }

  // Notifications
  async getNotifications(): Promise<any[]> { return [...this.db.notifications]; }
  async markNotificationsAsRead(): Promise<void> {
    this.db.notifications = this.db.notifications.map(n => ({ ...n, read: true }));
    this.save();
    this.notify('notifications', this.db.notifications);
  }

  // Dashboard Metrics
  async getDashboardMetrics() {
     const orders = this.db.orders;
     const totalEarnings = orders.reduce((acc, o) => acc + (o.paymentStatus === 'Paid' || o.paymentStatus === 'Pending' ? o.totalPrice : 0), 0);
     const totalOrders = orders.length;
     const customers = new Set(orders.map(o => o.customerEmail)).size;
     
     // Calculate Profit (Revenue - Purchase Cost)
     const totalProfit = orders.reduce((acc, o) => {
        if (o.orderStatus === 'Cancelled') return acc;
        const cost = o.items.reduce((sum, item) => sum + (item.product.purchaseCost * item.quantity), 0);
        return acc + (o.totalPrice - cost);
     }, 0);

     // Recent Orders
     const recentOrders = orders.slice(0, 5);

     // Top Sales
     const productSales: {[key: string]: any} = {};
     orders.forEach(o => {
         if (o.orderStatus === 'Cancelled') return;
         o.items.forEach(item => {
             if (!productSales[item.product.id]) {
                 productSales[item.product.id] = { ...item.product, totalSold: 0 };
             }
             productSales[item.product.id].totalSold += item.quantity;
         });
     });
     const topSales = Object.values(productSales).sort((a: any, b: any) => b.totalSold - a.totalSold).slice(0, 5);

     // Location Data
     const locationData: {[key: string]: number} = {};
     orders.forEach(o => {
         const loc = o.customerLocation || 'Unknown';
         locationData[loc] = (locationData[loc] || 0) + 1;
     });

     // Monthly Revenue (Simple estimation based on timestamp)
     const revenueSeries = Array(12).fill(0);
     const orderSeries = Array(12).fill(0);
     orders.forEach(o => {
         const date = new Date(o.timestamp);
         // Filter for current year if needed, but for simplicity taking all
         const month = date.getMonth();
         if (month >= 0 && month < 12) {
             revenueSeries[month] += o.totalPrice;
             orderSeries[month] += 1;
         }
     });

     return {
         totalEarnings,
         totalOrders,
         customers,
         totalProfit,
         growth: 12, // Placeholder
         recentOrders,
         topSales,
         locationData,
         revenueSeries,
         orderSeries,
         salesSource: { website: 70, social: 20, store: 10 }
     };
  }
}

export const api = new BackendAPI();
