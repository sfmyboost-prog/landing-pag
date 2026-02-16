
import { Product } from './types';

// NOTE: Please rename your uploaded images to 'lansy-front.jpg', 'lansy-side.jpg', and 'lansy-hand.jpg'
// and place them in your project's 'public/images/' directory.

const COMMON_DESCRIPTION = `Lansy Nature Shampoo Bar.
Main Ingredients: Cacumen Biotae, Isatis Indigotica.
Features: Expert Craftsmanship, Ancient Techniques.
Security: 7Roots Verified Authentic.

A premium herbal shampoo bar formulated with traditional ingredients for scalp health and hair vitality.`;

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    name: "Nature Shampoo Bar - Single Box",
    price: 650.00,
    originalPrice: 850.00,
    rating: 5.0,
    reviewCount: 12,
    description: COMMON_DESCRIPTION,
    shortDescription: "Cacumen Biotae & Isatis Indigotica",
    images: [
      '/images/lansy-front.jpg', // Main front view (Triangle soap in box)
      '/images/lansy-hand.jpg',  // Hand holding bar
      '/images/lansy-side.jpg'   // Side view / Seal detail
    ],
    colors: ['#2E8B57'],
    sizes: ['Standard'],
    productId: '#LANSY-NATURE-001',
    deliveryRegions: ['Nationwide'],
    category: 'Natural Soap',
    isMain: true,
    isActive: true,
    stock: 50,
    purchaseCost: 300.00,
    internalPrice: 650.00,
    hasSizes: false,
    hasColors: false
  },
  {
    id: '2',
    name: "Nature Shampoo Bar - Unboxed",
    price: 650.00,
    originalPrice: 850.00,
    rating: 5.0,
    reviewCount: 8,
    description: COMMON_DESCRIPTION,
    shortDescription: "Expert Craftsmanship",
    images: [
      '/images/lansy-hand.jpg',
      '/images/lansy-front.jpg',
      '/images/lansy-side.jpg'
    ],
    colors: ['#2E8B57'],
    sizes: ['Standard'],
    productId: '#LANSY-NATURE-002',
    deliveryRegions: ['Nationwide'],
    category: 'Natural Soap',
    isMain: false,
    isActive: true,
    stock: 45,
    purchaseCost: 300.00,
    internalPrice: 650.00,
    hasSizes: false,
    hasColors: false
  },
  {
    id: '3',
    name: "Nature Shampoo Bar - Bundle",
    price: 650.00,
    originalPrice: 850.00,
    rating: 4.8,
    reviewCount: 15,
    description: COMMON_DESCRIPTION,
    shortDescription: "Ancient Techniques",
    images: [
      '/images/lansy-side.jpg',
      '/images/lansy-front.jpg',
      '/images/lansy-hand.jpg'
    ],
    colors: ['#2E8B57'],
    sizes: ['Standard'],
    productId: '#LANSY-NATURE-003',
    deliveryRegions: ['Nationwide'],
    category: 'Natural Soap',
    isMain: false,
    isActive: true,
    stock: 60,
    purchaseCost: 300.00,
    internalPrice: 650.00,
    hasSizes: false,
    hasColors: false
  },
  {
    id: '4',
    name: "Nature Shampoo Bar - Verified",
    price: 650.00,
    originalPrice: 850.00,
    rating: 5.0,
    reviewCount: 5,
    description: COMMON_DESCRIPTION,
    shortDescription: "7Roots Verified",
    images: [
      '/images/lansy-side.jpg',
      '/images/lansy-front.jpg',
      '/images/lansy-hand.jpg'
    ],
    colors: ['#2E8B57'],
    sizes: ['Standard'],
    productId: '#LANSY-NATURE-004',
    deliveryRegions: ['Nationwide'],
    category: 'Natural Soap',
    isMain: false,
    isActive: true,
    stock: 30,
    purchaseCost: 300.00,
    internalPrice: 650.00,
    hasSizes: false,
    hasColors: false
  }
];
