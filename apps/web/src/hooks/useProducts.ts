import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Category, ProductWithImages, ReviewWithProfile } from '@wewala/shared';

// Fallback seed categories if database is empty or not yet populated
export const FALLBACK_CATEGORIES: Category[] = [
  {
    id: '11111111-1111-1111-1111-111111111001',
    name: 'Grocery & Daily Staples',
    slug: 'grocery-staples',
    description: 'Essential grains, lentils, cold-pressed oils, and authentic Sri Lankan spices.',
    image_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '11111111-1111-1111-1111-111111111002',
    name: 'Fresh Farm Produce',
    slug: 'fresh-farm-produce',
    description: 'Fresh organic fruits and vegetables harvested directly from local cultivators.',
    image_url: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '11111111-1111-1111-1111-111111111003',
    name: 'Ceylon Teas & Beverages',
    slug: 'ceylon-teas-beverages',
    description: 'World-renowned high-grown Ceylon black teas, artisan green teas, and king coconut water.',
    image_url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Fallback sample products
export const FALLBACK_PRODUCTS: ProductWithImages[] = [
  {
    id: '22222222-2222-2222-2222-222222222001',
    name: 'Premium Keeri Samba Rice 5kg',
    slug: 'premium-keeri-samba-rice-5kg',
    description: 'Naturally aromatic, small grain premium Sri Lankan Keeri Samba rice. Polished and double-cleaned for everyday aromatic meals.',
    price: 1450.0,
    compare_at_price: 1600.0,
    sku: 'STAPLE-RICE-KS-5KG',
    stock: 50,
    low_stock_threshold: 10,
    category_id: '11111111-1111-1111-1111-111111111001',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    images: [
      {
        id: 'img-1',
        product_id: '22222222-2222-2222-2222-222222222001',
        url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
        sort_order: 0,
        created_at: '2024-01-01T00:00:00Z',
      },
    ],
  },
  {
    id: '22222222-2222-2222-2222-222222222002',
    name: 'Red Split Lentils (Mysore Dhal) 1kg',
    slug: 'red-split-lentils-dhal-1kg',
    description: 'Protein-rich, quick-cooking split red lentils. Ideal for traditional creamy parippu curry and wholesome soups.',
    price: 420.0,
    compare_at_price: 480.0,
    sku: 'STAPLE-DHAL-RED-1KG',
    stock: 80,
    low_stock_threshold: 15,
    category_id: '11111111-1111-1111-1111-111111111001',
    is_active: true,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    images: [
      {
        id: 'img-2',
        product_id: '22222222-2222-2222-2222-222222222002',
        url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
        sort_order: 0,
        created_at: '2024-01-02T00:00:00Z',
      },
    ],
  },
  {
    id: '22222222-2222-2222-2222-222222222003',
    name: 'Cold-Pressed Pure Coconut Oil 1L',
    slug: 'cold-pressed-pure-coconut-oil-1l',
    description: '100% pure cold-pressed coconut oil extracted from fresh sun-dried coconuts. Perfect for high-heat cooking and baking.',
    price: 950.0,
    compare_at_price: 1050.0,
    sku: 'STAPLE-OIL-COC-1L',
    stock: 35,
    low_stock_threshold: 5,
    category_id: '11111111-1111-1111-1111-111111111001',
    is_active: true,
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
    images: [
      {
        id: 'img-3',
        product_id: '22222222-2222-2222-2222-222222222003',
        url: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=800&q=80',
        sort_order: 0,
        created_at: '2024-01-03T00:00:00Z',
      },
    ],
  },
  {
    id: '22222222-2222-2222-2222-222222222005',
    name: 'Farm Fresh Cavendish Bananas 1kg',
    slug: 'farm-fresh-cavendish-bananas-1kg',
    description: 'Naturally ripened, sweet and creamy organic Cavendish bananas packed with natural potassium.',
    price: 280.0,
    compare_at_price: 330.0,
    sku: 'PROD-BAN-CAV-1KG',
    stock: 30,
    low_stock_threshold: 8,
    category_id: '11111111-1111-1111-1111-111111111002',
    is_active: true,
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-05T00:00:00Z',
    images: [
      {
        id: 'img-5',
        product_id: '22222222-2222-2222-2222-222222222005',
        url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=800&q=80',
        sort_order: 0,
        created_at: '2024-01-05T00:00:00Z',
      },
    ],
  },
  {
    id: '22222222-2222-2222-2222-222222222006',
    name: 'Crisp Green Bell Peppers 500g',
    slug: 'crisp-green-bell-peppers-500g',
    description: 'Juicy, crunchy greenhouse-grown green capsicums. Ideal for salads, stir-fries, and spicy devilled dishes.',
    price: 320.0,
    compare_at_price: 380.0,
    sku: 'PROD-VEG-CAP-500G',
    stock: 25,
    low_stock_threshold: 5,
    category_id: '11111111-1111-1111-1111-111111111002',
    is_active: true,
    created_at: '2024-01-06T00:00:00Z',
    updated_at: '2024-01-06T00:00:00Z',
    images: [
      {
        id: 'img-6',
        product_id: '22222222-2222-2222-2222-222222222006',
        url: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&w=800&q=80',
        sort_order: 0,
        created_at: '2024-01-06T00:00:00Z',
      },
    ],
  },
  {
    id: '22222222-2222-2222-2222-222222222007',
    name: 'Vine-Ripened Red Tomatoes 1kg',
    slug: 'vine-ripened-red-tomatoes-1kg',
    description: 'Locally harvested, plump and juicy red tomatoes. Rich in lycopene and perfect for curries, salads, and fresh salsa.',
    price: 460.0,
    compare_at_price: 520.0,
    sku: 'PROD-VEG-TOM-1KG',
    stock: 40,
    low_stock_threshold: 6,
    category_id: '11111111-1111-1111-1111-111111111002',
    is_active: true,
    created_at: '2024-01-07T00:00:00Z',
    updated_at: '2024-01-07T00:00:00Z',
    images: [
      {
        id: 'img-7',
        product_id: '22222222-2222-2222-2222-222222222007',
        url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80',
        sort_order: 0,
        created_at: '2024-01-07T00:00:00Z',
      },
    ],
  },
  {
    id: '22222222-2222-2222-2222-222222222009',
    name: 'Ceylon High-Grown BOPF Black Tea 400g',
    slug: 'ceylon-high-grown-bopf-black-tea-400g',
    description: 'Strong, rich, and brisk single-origin Ceylon broken orange pekoe fannings from the central highlands. Delicious with milk or lemon.',
    price: 850.0,
    compare_at_price: 950.0,
    sku: 'BEV-TEA-BOPF-400G',
    stock: 55,
    low_stock_threshold: 10,
    category_id: '11111111-1111-1111-1111-111111111003',
    is_active: true,
    created_at: '2024-01-09T00:00:00Z',
    updated_at: '2024-01-09T00:00:00Z',
    images: [
      {
        id: 'img-9',
        product_id: '22222222-2222-2222-2222-222222222009',
        url: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=800&q=80',
        sort_order: 0,
        created_at: '2024-01-09T00:00:00Z',
      },
    ],
  },
  {
    id: '22222222-2222-2222-2222-222222222010',
    name: 'Nuwara Eliya Pure Green Tea (100g Tin)',
    slug: 'nuwara-eliya-pure-green-tea-100g',
    description: 'Delicate, floral, and packed with antioxidants. Hand-plucked tender green tea leaves in an airtight collector tin.',
    price: 1200.0,
    compare_at_price: 1380.0,
    sku: 'BEV-TEA-GRN-100G',
    stock: 25,
    low_stock_threshold: 5,
    category_id: '11111111-1111-1111-1111-111111111003',
    is_active: true,
    created_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-01-10T00:00:00Z',
    images: [
      {
        id: 'img-10',
        product_id: '22222222-2222-2222-2222-222222222010',
        url: 'https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?auto=format&fit=crop&w=800&q=80',
        sort_order: 0,
        created_at: '2024-01-10T00:00:00Z',
      },
    ],
  },
  {
    id: '22222222-2222-2222-2222-222222222012',
    name: 'Natural King Coconut Water 330ml Glass Bottle',
    slug: 'natural-king-coconut-water-330ml',
    description: 'Pure, unadulterated Thambili (King Coconut) water bottled fresh. Nature’s greatest isotonic electrolyte drink.',
    price: 250.0,
    compare_at_price: 290.0,
    sku: 'BEV-THB-WAT-330ML',
    stock: 90,
    low_stock_threshold: 15,
    category_id: '11111111-1111-1111-1111-111111111003',
    is_active: true,
    created_at: '2024-01-12T00:00:00Z',
    updated_at: '2024-01-12T00:00:00Z',
    images: [
      {
        id: 'img-12',
        product_id: '22222222-2222-2222-2222-222222222012',
        url: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=800&q=80',
        sort_order: 0,
        created_at: '2024-01-12T00:00:00Z',
      },
    ],
  },
];

export interface ProductFilters {
  search?: string;
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'newest' | 'price-asc' | 'price-desc' | 'name-asc';
  page?: number;
  pageSize?: number;
}

// 1. Fetch categories
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async (): Promise<Category[]> => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        if (data && data.length > 0) return data as Category[];
        return FALLBACK_CATEGORIES;
      } catch (err) {
        console.warn('Using fallback categories:', err);
        return FALLBACK_CATEGORIES;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

// 2. Fetch products with filter, search, sort, and pagination
export function useProducts(filters: ProductFilters) {
  const {
    search = '',
    categorySlug = '',
    minPrice,
    maxPrice,
    sortBy = 'newest',
    page = 1,
    pageSize = 8,
  } = filters;

  return useQuery({
    queryKey: ['products', { search, categorySlug, minPrice, maxPrice, sortBy, page, pageSize }],
    queryFn: async () => {
      try {
        // Base query with exact count
        let query = supabase
          .from('products')
          .select('*, product_images(*), categories(*)', { count: 'exact' })
          .eq('is_active', true);

        // Search filter
        if (search.trim()) {
          query = query.or(`name.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`);
        }

        // Category filter (if passed by slug, we resolve category id or filter)
        if (categorySlug && categorySlug !== 'all') {
          const { data: cat } = await supabase
            .from('categories')
            .select('id')
            .eq('slug', categorySlug)
            .maybeSingle();

          if (cat?.id) {
            query = query.eq('category_id', cat.id);
          }
        }

        // Price range
        if (minPrice !== undefined && minPrice > 0) {
          query = query.gte('price', minPrice);
        }
        if (maxPrice !== undefined && maxPrice > 0) {
          query = query.lte('price', maxPrice);
        }

        // Sorting
        switch (sortBy) {
          case 'price-asc':
            query = query.order('price', { ascending: true });
            break;
          case 'price-desc':
            query = query.order('price', { ascending: false });
            break;
          case 'name-asc':
            query = query.order('name', { ascending: true });
            break;
          case 'newest':
          default:
            query = query.order('created_at', { ascending: false });
            break;
        }

        // Pagination
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        const { data, count, error } = await query;
        if (error) throw error;

        if (data && data.length > 0) {
          const formatted: ProductWithImages[] = data.map((item: any) => ({
            ...item,
            images: item.product_images || [],
            category: item.categories || null,
          }));

          return {
            products: formatted,
            totalCount: count ?? formatted.length,
            totalPages: Math.ceil((count ?? formatted.length) / pageSize),
            isFallback: false,
          };
        }

        // Fallback filter if database returns empty
        let local = [...FALLBACK_PRODUCTS];
        if (search.trim()) {
          const s = search.toLowerCase();
          local = local.filter((p) => p.name.toLowerCase().includes(s) || p.description?.toLowerCase().includes(s));
        }
        if (categorySlug && categorySlug !== 'all') {
          const targetCat = FALLBACK_CATEGORIES.find((c) => c.slug === categorySlug);
          if (targetCat) {
            local = local.filter((p) => p.category_id === targetCat.id);
          }
        }
        if (minPrice !== undefined) local = local.filter((p) => p.price >= minPrice);
        if (maxPrice !== undefined) local = local.filter((p) => p.price <= maxPrice);

        if (sortBy === 'price-asc') local.sort((a, b) => a.price - b.price);
        if (sortBy === 'price-desc') local.sort((a, b) => b.price - a.price);
        if (sortBy === 'name-asc') local.sort((a, b) => a.name.localeCompare(b.name));

        const paginated = local.slice(from, from + pageSize);
        return {
          products: paginated,
          totalCount: local.length,
          totalPages: Math.ceil(local.length / pageSize),
          isFallback: true,
        };
      } catch (err) {
        console.warn('Supabase query error, using local fallback:', err);
        return {
          products: FALLBACK_PRODUCTS.slice(0, pageSize),
          totalCount: FALLBACK_PRODUCTS.length,
          totalPages: Math.ceil(FALLBACK_PRODUCTS.length / pageSize),
          isFallback: true,
        };
      }
    },
    staleTime: 60 * 1000,
  });
}

// 3. Featured products for Home page
export function useFeaturedProducts() {
  return useQuery({
    queryKey: ['featured-products'],
    queryFn: async (): Promise<ProductWithImages[]> => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*, product_images(*), categories(*)')
          .eq('is_active', true)
          .order('price', { ascending: false })
          .limit(8);

        if (error) throw error;
        if (data && data.length > 0) {
          return data.map((item: any) => ({
            ...item,
            images: item.product_images || [],
            category: item.categories || null,
          }));
        }
        return FALLBACK_PRODUCTS.slice(0, 8);
      } catch (e) {
        return FALLBACK_PRODUCTS.slice(0, 8);
      }
    },
    staleTime: 2 * 60 * 1000,
  });
}

// 4. New arrivals for Home page
export function useNewArrivals() {
  return useQuery({
    queryKey: ['new-arrivals'],
    queryFn: async (): Promise<ProductWithImages[]> => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*, product_images(*), categories(*)')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(4);

        if (error) throw error;
        if (data && data.length > 0) {
          return data.map((item: any) => ({
            ...item,
            images: item.product_images || [],
            category: item.categories || null,
          }));
        }
        return FALLBACK_PRODUCTS.slice(0, 4);
      } catch (e) {
        return FALLBACK_PRODUCTS.slice(0, 4);
      }
    },
    staleTime: 2 * 60 * 1000,
  });
}

// 5. Single product by slug
export function useProductBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['product', slug],
    enabled: Boolean(slug),
    queryFn: async (): Promise<ProductWithImages> => {
      if (!slug) throw new Error('Product slug is required');

      try {
        const { data, error } = await supabase
          .from('products')
          .select('*, product_images(*), categories(*)')
          .eq('slug', slug)
          .eq('is_active', true)
          .single();

        if (error) throw error;
        if (data) {
          return {
            ...(data as any),
            images: (data as any).product_images || [],
            category: (data as any).categories || null,
          };
        }
      } catch (e) {
        console.warn('Supabase fetch failed for slug, checking fallback:', e);
      }

      // Check fallback
      const found = FALLBACK_PRODUCTS.find((p) => p.slug === slug);
      if (found) return found;

      throw new Error(`Product not found for slug "${slug}"`);
    },
    staleTime: 60 * 1000,
  });
}

// 6. Related products in the same category
export function useRelatedProducts(categoryId: string | null | undefined, currentProductId: string | undefined) {
  return useQuery({
    queryKey: ['related-products', categoryId, currentProductId],
    enabled: Boolean(categoryId),
    queryFn: async (): Promise<ProductWithImages[]> => {
      if (!categoryId) return [];

      try {
        const { data, error } = await supabase
          .from('products')
          .select('*, product_images(*), categories(*)')
          .eq('category_id', categoryId)
          .neq('id', currentProductId || '')
          .eq('is_active', true)
          .limit(4);

        if (error) throw error;
        if (data && data.length > 0) {
          return data.map((item: any) => ({
            ...item,
            images: item.product_images || [],
            category: item.categories || null,
          }));
        }
      } catch (e) {
        console.warn('Related products fallback:', e);
      }

      return FALLBACK_PRODUCTS.filter((p) => p.id !== currentProductId).slice(0, 4);
    },
    staleTime: 2 * 60 * 1000,
  });
}

// 7. Product reviews with user profile info
export function useProductReviews(productId: string | undefined) {
  return useQuery({
    queryKey: ['reviews', productId],
    enabled: Boolean(productId),
    queryFn: async (): Promise<ReviewWithProfile[]> => {
      if (!productId) return [];

      try {
        const { data, error } = await supabase
          .from('reviews')
          .select('*, profiles(full_name, avatar_url)')
          .eq('product_id', productId)
          .eq('is_approved', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) {
          return data.map((r: any) => ({
            ...r,
            profile: r.profiles || null,
          }));
        }
      } catch (e) {
        console.warn('Reviews fetch failed:', e);
      }

      return [];
    },
    staleTime: 60 * 1000,
  });
}

// 8. Check if authenticated user has purchased this item
export function useHasPurchasedProduct(productId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['has-purchased', user?.id, productId],
    enabled: Boolean(user?.id && productId),
    queryFn: async (): Promise<boolean> => {
      if (!user?.id || !productId) return false;

      try {
        const { data, error } = await supabase
          .from('order_items')
          .select('id, orders!inner(user_id, status)')
          .eq('product_id', productId)
          .eq('orders.user_id', user.id);

        if (error) {
          console.warn('Error checking purchase history:', error);
          return false;
        }

        return Boolean(data && data.length > 0);
      } catch (e) {
        console.warn('Failed purchase check:', e);
        return false;
      }
    },
    staleTime: 60 * 1000,
  });
}

// 9. Mutation to submit a review
export function useSubmitReview(productId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ rating, comment }: { rating: number; comment: string }) => {
      if (!user?.id) throw new Error('You must be signed in to submit a review.');

      const { data, error } = await supabase.from('reviews').insert({
        product_id: productId,
        user_id: user.id,
        rating,
        comment,
        is_approved: false, // Pending admin approval per RLS
      }).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
    },
  });
}

