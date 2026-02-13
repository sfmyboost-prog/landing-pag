
import { Product, Order, User, Category, StoreSettings, CourierSettings, PixelSettings } from './types';
import { INITIAL_PRODUCTS } from './constants';

const DB_KEY = 'elite_commerce_db';

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
    storeName: 'Dataflow Ecommerce',
    logoUrl: 'D',
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

  constructor() {
    const stored = localStorage.getItem(DB_KEY);
    this.db = stored ? JSON.parse(stored) : DEFAULT_DB;
    if (!stored) this.save();
  }

  private save() {
    localStorage.setItem(DB_KEY, JSON.stringify(this.db));
  }

  // --- Products ---
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

  // --- Orders ---
  async getOrders(): Promise<Order[]> {
    return [...this.db.orders];
  }

  async createOrder(order: Order): Promise<Order> {
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
  }

  async updateOrder(order: Order): Promise<Order> {
    const idx = this.db.orders.findIndex(o => o.id === order.id);
    if (idx > -1) {
      this.db.orders[idx] = order;
      this.save();
    }
    return order;
  }

  // --- Users ---
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

  // --- Notifications ---
  async getNotifications(): Promise<any[]> {
    return [...this.db.notifications];
  }

  async markNotificationsAsRead(): Promise<void> {
    this.db.notifications.forEach(n => n.read = true);
    this.save();
  }

  // --- Metrics ---
  async getDashboardMetrics(yearOffset: number = 0) {
    const orders = this.db.orders;
    const products = this.db.products;
    const users = this.db.users;

    const totalEarnings = orders
      .filter(o => o.paymentStatus === 'Paid')
      .reduce((acc, o) => acc + o.totalPrice, 0);

    const activeCustomers = new Set(orders.map(o => o.customerEmail)).size || users.length;
    
    // Group sales for charts
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
      balance: totalEarnings * 0.92, // 92% of earnings after simulated fees
      revenueSeries: monthlyRevenue,
      orderSeries: monthlyOrders,
      topSales,
      locationData,
      currentYear: targetYear
    };
  }
}

export const api = new BackendAPI();
