
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

interface Product {
  id: number;
  title: string;
  price: number;
  image: string;
  is_visible: boolean;
}

const SupabaseProductGrid: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        // Fetch products where is_visible is true
        // Selecting * to ensure we get all fields, then mapping strictly in the UI
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_visible', true);

        if (error) {
          throw error;
        }

        if (data) {
          setProducts(data);
        }
      } catch (err: any) {
        console.error('Error fetching Supabase products:', err);
        setError(err.message || 'Failed to fetch products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className="w-full py-20 bg-white border-t border-gray-50 flex justify-center items-center">
        <div className="flex flex-col items-center gap-4">
           <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
           <p className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">Loading Collection...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full py-16 bg-white border-t border-gray-50 flex justify-center items-center text-center px-4">
        <div className="max-w-md bg-red-50 p-6 rounded-2xl">
          <p className="text-red-600 font-bold mb-2">Unable to load products</p>
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null; 
  }

  return (
    <section className="py-16 md:py-24 bg-white border-t border-gray-50">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="mb-12 text-center md:text-left animate-fadeIn">
           <span className="text-indigo-600 font-black tracking-widest uppercase text-xs mb-2 block">Exclusive Drops</span>
           <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Live from Supabase</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10 md:gap-x-8 md:gap-y-12">
          {products.map((product) => (
            <div key={product.id} className="group cursor-pointer flex flex-col gap-4 animate-fadeIn">
              {/* Image Card */}
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[24px] bg-gray-100 shadow-sm transition-all duration-500 hover:shadow-xl hover:shadow-indigo-100/50">
                <img
                  src={product.image || 'https://via.placeholder.com/400x600?text=No+Image'}
                  alt={product.title}
                  className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="lazy"
                />
                
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Floating Action Button */}
                <button className="absolute bottom-4 right-4 bg-white text-gray-900 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transform translate-y-16 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-75 hover:bg-black hover:text-white hover:scale-110">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                </button>
              </div>
              
              {/* Product Info */}
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1 leading-tight">
                  {product.title}
                </h3>
                <p className="text-gray-500 font-bold text-sm tracking-wide">
                  TK {product.price ? product.price.toLocaleString() : '0'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SupabaseProductGrid;
