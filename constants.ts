
import { Product } from './types';

// NOTE: Please rename your uploaded images to 'lansy-front.jpg', 'lansy-side.jpg', and 'lansy-hand.jpg'
// and place them in your project's 'public/images/' directory.

const COMMON_DESCRIPTION = `🌿 Naturer Shampoo Bar 🌿 

✨ প্রাকৃতিক যত্নে চুল হোক আরও শক্ত, ঘন ও প্রাণবন্ত ✨ 

চুল পড়া, খুশকি, রুক্ষতা আর নিস্তেজ চুলে বিরক্ত? এবার প্রাকৃতিক সমাধান নিয়ে হাজির Amar Bazari Shampoo Bar—যা আপনার চুল ও স্কাল্পকে দেবে গভীর যত্ন 🌱 

🌱 এই শ্যাম্পু বারের প্রধান উপাদান 
✔ Cacumen Biotae 
✔ Usman Grass 
✔ প্রাকৃতিক ভেষজ এক্সট্র্যাক্ট 

👉 কেমিক্যাল শ্যাম্পুর ক্ষতি থেকে মুক্তি পেতে ভেষজ শ্যাম্পু বারের দারুণ বিকল্প। 

💚 গুণাগুণ ও উপকারিতা 
✔ চুল পড়া কমাতে সাহায্য করে 
✔ খুশকি ও স্কাল্পের ময়লা পরিষ্কার করে 
✔ চুলের গোড়া মজবুত করে 
✔ চুল নরম, মসৃণ ও উজ্জ্বল করে 
✔ রুক্ষ ও ড্যামেজড চুলে পুষ্টি জোগায় 
✔ প্রাকৃতিক উপাদানে তৈরি, নিয়মিত ব্যবহারে নিরাপদ 
✔ পুরুষ ও নারী—সবার জন্য উপযোগী 

🧴 কিভাবে ব্যবহার করবেন 
1️⃣ চুল ভালোভাবে ভিজিয়ে নিন 
2️⃣ শ্যাম্পু বারটি হাতে বা সরাসরি চুলে ঘষে ফেনা তৈরি করুন 
3️⃣ ১–২ মিনিট হালকা করে স্কাল্প ম্যাসাজ করুন 
4️⃣ পরিষ্কার পানি দিয়ে ধুয়ে ফেলুন 
5️⃣ সপ্তাহে ২–৩ বার ব্যবহার করলে ভালো ফল পাবেন 

🌿 কেন এই Shampoo Bar ব্যবহার করবেন? 
✔ লিকুইড শ্যাম্পুর চেয়ে দীর্ঘদিন ব্যবহারযোগ্য 
✔ কম কেমিক্যাল, বেশি প্রাকৃতিক যত্ন 
✔ ভ্রমণে বহন করা সহজ 
✔ পরিবেশবান্ধব 

✨ আজই ব্যবহার শুরু করুন, নিজের চুলেই দেখুন পার্থক্য! 

📦 সীমিত স্টক—এখনই অর্ডার করুন!`;

const PRODUCT_IMAGES = [
  'https://i.imgur.com/zK0EYEt.jpeg',
  'https://i.imgur.com/PjpzfPF.jpeg',
  'https://i.imgur.com/gLCZTwk.jpeg'
];

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
    images: PRODUCT_IMAGES,
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
    images: PRODUCT_IMAGES,
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
    images: PRODUCT_IMAGES,
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
    images: PRODUCT_IMAGES,
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
