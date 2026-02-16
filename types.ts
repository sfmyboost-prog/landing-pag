
export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviewCount: number;
  description: string;
  shortDescription?: string;
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
    baseUrl?: string;
    enabled?: boolean;
    mode?: 'Sandbox' | 'Live';
  };
  steadfast: {
    apiKey: string;
    secretKey: string;
    merchantId: string;
    baseUrl?: string;
    enabled?: boolean;
    mode?: 'Sandbox' | 'Live';
  };
}

export interface PixelSettings {
  pixelId: string;
  appId: string;
  accessToken: string;
  testEventCode: string;
  currency: string;
  status: 'Inactive' | 'Connecting' | 'Active';
}

export interface TwoFactorSettings {
  enabled: boolean;
  secret: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerLocation: string;
  customerZipCode: string;
  customerCourierPreference?: 'Pathao' | 'SteadFast';
  items: CartItem[];
  totalPrice: number;
  paymentStatus: 'Paid' | 'Pending' | 'Cancel';
  orderStatus: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  timestamp: Date;
  courierName?: 'Pathao' | 'SteadFast';
  courierTrackingId?: string;
  customerNotes?: string;
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
  whatsappNumber?: string;
  whatsappOrderLink?: string;
}

export type ViewState = 'LANDING' | 'DETAIL' | 'ADMIN' | 'USER';

export interface AdminPanelProps {
  products: Product[];
  categories: Category[];
  orders: Order[];
  users: User[];
  storeSettings: StoreSettings;
  courierSettings?: CourierSettings;
  pixelSettings?: PixelSettings;
  twoFactorSettings?: TwoFactorSettings;
  onUpdate: (p: Product) => void;
  onAdd: (p: Product) => void;
  onDelete: (id: string) => void;
  onUpdateOrder: (o: Order) => void;
  onUpdateUser: (u: User) => void;
  onUpdateSettings: (s: StoreSettings) => void;
  onUpdateCourierSettings?: (s: CourierSettings) => void;
  onUpdatePixelSettings?: (s: PixelSettings) => void;
  onUpdateTwoFactorSettings?: (s: TwoFactorSettings) => void;
  onAddCategory: (cat: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
  onUpdateCategory?: (cat: Category) => void;
  onLogout: () => void;
}
