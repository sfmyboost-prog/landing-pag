
import { Product, Order, User, Category, StoreSettings, CourierSettings, PixelSettings } from './types';
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
    currency: 'USD',
    taxPercentage: 10,
    shippingFee: 0
  },
  courierSettings: {
    pathao: { clientId: '', clientSecret: '', storeId: '', username: '', password: '' },
    steadfast: { apiKey: '', secretKey: '', merchantId: '' }
  },
  pixelSettings: {
    pixelId: '',
    appId: '',
    accessToken: '',
    testEventCode: '',
    status: 'Inactive'
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

      if (error) throw error;
      
      const mappedOrders: Order[] = (data || []).map(row => ({
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
    } catch (err) {
      console.warn('Supabase fetch failed:', err);
      return [...this.db.orders];
    }
  }

  async createOrder(order: Order): Promise<Order> {
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

      this.db.orders.unshift(order);
      this.db.notifications.unshift({
        id: Date.now(),
        title: 'New Order Received',
        message: `Order #${order.id} placed by ${order.customerName}`,
        timestamp: new Date(),
        read: false
      });
      this.save();
      return order;
    } catch (err) {
      console.error('Failed to sync to Supabase:', err);
      this.db.orders.unshift(order);
      this.save();
      return order;
    }
  }

  async updateOrder(order: Order): Promise<Order> {
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

      const idx = this.db.orders.findIndex(o => o.id === order.id);
      if (idx > -1) {
        this.db.orders[idx] = order;
        this.save();
      }
      return order;
    } catch (err) {
      console.error('Update failed:', err);
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

  async getDashboardMetrics(yearOffset: number = 0) {
    const orders = await this.getOrders();
    const products = this.db.products;
    const users = this.db.users;

    const totalEarnings = orders
      .filter(o => o.paymentStatus === 'Paid')
      .reduce((acc, o) => acc + o.totalPrice, 0);

    const activeCustomers = new Set(orders.map(o => o.customerEmail)).size || users.length;
    
    const monthlyRevenue = Array(12).fill(0);
    const monthlyOrders = Array(12).fill(0);
    const targetYear = new Date().getFullYear() + yearOffset;

    orders.forEach(o => {
      const date = new Date(o.timestamp);
      if (date.getFullYear() === targetYear) {
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

    const locationData = orders.reduce((acc: any, o) => {
      const loc = o.customerLocation || 'Unknown';
      acc[loc] = (acc[loc] || 0) + 1;
      return acc;
    }, {});

    return {
      totalEarnings,
      totalOrders: orders.length,
      customers: activeCustomers,
      balance: totalEarnings * 0.92,
      revenueSeries: monthlyRevenue,
      orderSeries: monthlyOrders,
      topSales,
      locationData,
      currentYear: targetYear
    };
  }
}

export const api = new BackendAPI();
