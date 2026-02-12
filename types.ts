
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
}

export interface User {
  id: string;
  name: string;
  email: string;
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

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerLocation: string;
  items: CartItem[];
  totalPrice: number;
  status: 'Paid' | 'Pending' | 'Cancel' | 'Processing';
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
