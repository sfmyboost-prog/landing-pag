
export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviewCount: number;
  description: string;
  images: string[];
  colors: string[];
  sizes: string[];
  productId: string;
  deliveryRegions: string[];
  category: string;
  isMain?: boolean;
  isActive?: boolean;
  stock: number;
  discountPercentage?: number;
  purchaseCost: number;
  internalPrice: number; // "Our Price"
  hasSizes?: boolean;
  hasColors?: boolean;
}

export interface Category {
  id: string;
  name: string;
  isActive: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'Admin' | 'Customer';
  status: 'Active' | 'Banned';
  createdAt: Date;
}

export interface CourierSettings {
  pathao: {
    clientId: string;
    clientSecret: string;
    storeId: string;
    username: string;
    password: string;
  };
  steadfast: {
    apiKey: string;
    secretKey: string;
    merchantId: string;
  };
}

export interface PixelSettings {
  pixelId: string;
  appId: string;
  accessToken: string;
  testEventCode: string;
  status: 'Inactive' | 'Connecting' | 'Active';
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerLocation: string;
  customerCourierPreference?: 'Pathao' | 'SteadFast';
  items: CartItem[];
  totalPrice: number;
  paymentStatus: 'Paid' | 'Pending' | 'Cancel';
  orderStatus: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  timestamp: Date;
  courierName?: 'Pathao' | 'SteadFast';
  courierTrackingId?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize: string;
  selectedColor: string;
}

export interface StoreSettings {
  storeName: string;
  logoUrl: string;
  currency: string;
  taxPercentage: number;
  shippingFee: number;
}

export type ViewState = 'LANDING' | 'DETAIL' | 'ADMIN' | 'USER';
