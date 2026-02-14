
import { Product, Order, User, Category, StoreSettings, CourierSettings, PixelSettings, TwoFactorSettings } from './types';
import { INITIAL_PRODUCTS } from './constants';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DB_KEY = 'elite_commerce_db';

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
    { id: '1', name: 'Kristin Watson', email: 'kristin@dataflow.com', phone: '+8801700000000', role: 'Admin', status: 'Active', createdAt: new Date() },
    { id: '2', name: 'Leslie Alexander', email: 'leslie@example.com', phone: '+8801912345678', role: 'Customer', status: 'Active', createdAt: new Date() }
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
    status: 'Inactive'
  },
  twoFactorSettings: {
    enabled: false,
    secret: 'JBSWY3DPEHPK3PXP' // Default placeholder secret (base32)
  },
  notifications: []
};

class BackendAPI {
  private db: DB;
  private supabase: SupabaseClient;

  constructor() {
    const stored = localStorage.getItem(DB_KEY);
    this.db = stored ? JSON.parse(stored) : DEFAULT_DB;
    if (!stored) this.save();
    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }

  private save() {
    localStorage.setItem(DB_KEY, JSON.stringify(this.db));
  }

  async clearSystemData(): Promise<void> {
    this.db.orders = [];
    this.db.notifications = [];
    this.save();
  }

  async getProducts(): Promise<Product[]> {
    return [...this.db.products];
  }

  async saveProduct(product: Product): Promise<Product> {
    const idx = this.db.products.findIndex(p => p.id === product.id);
    if (idx > -1) this.db.products[idx] = product;
    else this.db.products.push(product);
    this.save();
    return product;
  }

  async deleteProduct(id: string): Promise<void> {
    this.db.products = this.db.products.filter(p => p.id !== id);
    this.save();
  }

  async getOrders(): Promise<Order[]> {
    try {
      const { data, error } = await this.supabase
        .from('orders')
        .select('*')
        .order('date_time', { ascending: false });

      if (error) {
        if (error.code === '401' || error.message.includes('API key')) {
          console.error('Supabase Auth Error: Invalid API Key. Falling back to local storage.');
        } else {
          throw error;
        }
      }
      
      if (data) {
        const mappedOrders: Order[] = data.map(row => ({
          id: row.id,
          customerName: row.customer_name,
          customerEmail: row.email,
          customerPhone: row.phone,
          customerAddress: row.street_address,
          customerLocation: row.location,
          customerZipCode: row.zip_code,
          customerCourierPreference: row.courier_preference,
          items: row.items,
          totalPrice: row.total_amount,
          paymentStatus: row.payment_status,
          orderStatus: row.order_status,
          timestamp: new Date(row.date_time),
          courierName: row.courier_name,
          courierTrackingId: row.courier_tracking_id
        }));

        this.db.orders = mappedOrders;
        this.save();
        return mappedOrders;
      }
      
      return [...this.db.orders];
    } catch (err) {
      console.warn('Supabase fetch failed:', err);
      return [...this.db.orders];
    }
  }

  async createOrder(order: Order): Promise<Order> {
    // Add to local immediately for responsiveness
    this.db.orders.unshift(order);
    this.db.notifications.unshift({
      id: Date.now(),
      title: 'New Order Received',
      message: `Order #${order.id} placed by ${order.customerName}`,
      timestamp: new Date(),
      read: false
    });
    this.save();

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
          date_time: order.timestamp.toISOString()
        }]);

      if (error) throw error;
      return order;
    } catch (err) {
      console.error('Supabase Sync Failed (Order saved locally):', err);
      return order;
    }
  }

  async updateOrder(order: Order): Promise<Order> {
    const idx = this.db.orders.findIndex(o => o.id === order.id);
    if (idx > -1) {
      this.db.orders[idx] = order;
      this.save();
    }

    try {
      const { error } = await this.supabase
        .from('orders')
        .update({
          payment_status: order.paymentStatus,
          order_status: order.orderStatus,
          courier_name: order.courierName,
          courier_tracking_id: order.courierTrackingId
        })
        .eq('id', order.id);

      if (error) throw error;
      return order;
    } catch (err) {
      console.error('Supabase Sync Failed (Update saved locally):', err);
      return order;
    }
  }

  async getUsers(): Promise<User[]> {
    return [...this.db.users];
  }

  async updateUser(user: User): Promise<User> {
    const idx = this.db.users.findIndex(u => u.id === user.id);
    if (idx > -1) {
      this.db.users[idx] = user;
      this.save();
    }
    return user;
  }

  async getNotifications(): Promise<any[]> {
    return [...this.db.notifications];
  }

  async markNotificationsAsRead(): Promise<void> {
    this.db.notifications.forEach(n => n.read = true);
    this.save();
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

  async getDashboardMetrics(yearOffset: number = 0) {
    const orders = this.db.orders;
    const products = this.db.products;
    const users = this.db.users;

    const currentYear = new Date().getFullYear() + yearOffset;

    const earningsCurrent = orders
      .filter(o => o.paymentStatus === 'Paid' && new Date(o.timestamp).getFullYear() === currentYear)
      .reduce((acc, o) => acc + o.totalPrice, 0);

    const totalProfit = orders
      .filter(o => o.paymentStatus === 'Paid' && new Date(o.timestamp).getFullYear() === currentYear)
      .reduce((acc, o) => {
        const orderProfit = o.items.reduce((s, it) => {
          return s + ((it.product.price - (it.product.purchaseCost || 0)) * it.quantity);
        }, 0);
        return acc + orderProfit;
      }, 0);

    const activeCustomers = new Set(orders.map(o => o.customerEmail)).size || users.length;
    
    const monthlyRevenue = Array(12).fill(0);
    const monthlyOrders = Array(12).fill(0);

    orders.forEach(o => {
      const date = new Date(o.timestamp);
      if (date.getFullYear() === currentYear) {
        const month = date.getMonth();
        monthlyRevenue[month] += o.totalPrice;
        monthlyOrders[month] += 1;
      }
    });

    const topSales = products
      .map(p => {
        const count = orders.reduce((acc, o) => {
          return acc + o.items.filter(it => it.product.id === p.id).reduce((s, i) => s + i.quantity, 0);
        }, 0);
        return { p, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return {
      totalEarnings: earningsCurrent,
      totalOrders: orders.length,
      customers: activeCustomers,
      totalProfit: totalProfit,
      growth: 1.56,
      revenueSeries: monthlyRevenue,
      orderSeries: monthlyOrders,
      topSales,
      recentOrders: orders.slice(0, 10),
      currentYear
    };
  }
}

export const api = new BackendAPI();