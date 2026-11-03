import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { STORE_CONFIG } from '@wewala/shared';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
  stock: number;
  sku?: string | null;
}

export interface AppliedCoupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number | null;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  coupon: AppliedCoupon | null;
  isSyncing: boolean;

  // Cart item controls
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;

  // Drawer controls
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;

  // Coupon controls
  applyCoupon: (coupon: AppliedCoupon) => { success: boolean; message: string };
  removeCoupon: () => void;

  // Totals calculations
  subtotal: () => number;
  shippingFee: () => number;
  discountAmount: () => number;
  total: () => number;
  totalItems: () => number;

  // Supabase user sync
  syncWithUser: (userId: string | null | undefined) => Promise<void>;
}

// Background sync helper to Supabase cart_items table
async function syncRemoteItem(userId: string | undefined, productId: string, quantity: number) {
  if (!userId) return;
  try {
    if (quantity > 0) {
      await supabase.from('cart_items').upsert(
        {
          user_id: userId,
          product_id: productId,
          quantity,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,product_id' }
      );
    } else {
      await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);
    }
  } catch (err) {
    console.warn('Cart sync item failed:', err);
  }
}

async function removeRemoteItem(userId: string | undefined, productId: string) {
  if (!userId) return;
  try {
    await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);
  } catch (err) {
    console.warn('Cart delete item failed:', err);
  }
}

async function clearRemoteCart(userId: string | undefined) {
  if (!userId) return;
  try {
    await supabase.from('cart_items').delete().eq('user_id', userId);
  } catch (err) {
    console.warn('Cart clear failed:', err);
  }
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      coupon: null,
      isSyncing: false,

      addItem: (item) => {
        const qtyToAdd = item.quantity && item.quantity > 0 ? item.quantity : 1;
        let targetQty = qtyToAdd;

        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId);
          if (existing) {
            targetQty = Math.min(item.stock, existing.quantity + qtyToAdd);
            return {
              items: state.items.map((i) =>
                i.productId === item.productId ? { ...i, quantity: targetQty } : i
              ),
            };
          }

          targetQty = Math.min(item.stock, qtyToAdd);
          return {
            items: [...state.items, { ...item, quantity: targetQty }],
          };
        });

        // Background sync to Supabase if session active
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user?.id) {
            syncRemoteItem(session.user.id, item.productId, targetQty);
          }
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }));

        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user?.id) {
            removeRemoteItem(session.user.id, productId);
          }
        });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        let updatedQty = quantity;

        set((state) => {
          const item = state.items.find((i) => i.productId === productId);
          if (!item) return state;

          updatedQty = Math.min(item.stock, quantity);

          return {
            items: state.items.map((i) =>
              i.productId === productId ? { ...i, quantity: updatedQty } : i
            ),
          };
        });

        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user?.id) {
            syncRemoteItem(session.user.id, productId, updatedQty);
          }
        });
      },

      clearCart: () => {
        set({ items: [], coupon: null });
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user?.id) {
            clearRemoteCart(session.user.id);
          }
        });
      },

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),

      applyCoupon: (newCoupon: AppliedCoupon) => {
        const sub = get().subtotal();
        if (sub < newCoupon.minOrderAmount) {
          return {
            success: false,
            message: `Coupon requires a minimum order of ${STORE_CONFIG.currencySymbol} ${newCoupon.minOrderAmount.toLocaleString()}`,
          };
        }

        set({ coupon: newCoupon });
        return {
          success: true,
          message: `Coupon "${newCoupon.code}" applied successfully!`,
        };
      },

      removeCoupon: () => set({ coupon: null }),

      subtotal: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      shippingFee: () => {
        const sub = get().subtotal();
        if (sub === 0 || sub >= STORE_CONFIG.freeShippingThreshold) {
          return 0;
        }
        return STORE_CONFIG.defaultShippingFee;
      },

      discountAmount: () => {
        const { coupon } = get();
        const sub = get().subtotal();
        if (!coupon || sub === 0) return 0;

        // Verify min order amount still valid
        if (sub < coupon.minOrderAmount) {
          return 0;
        }

        let disc = 0;
        if (coupon.discountType === 'percentage') {
          disc = Math.round((sub * (coupon.discountValue / 100)) * 100) / 100;
          if (coupon.maxDiscount !== null && disc > coupon.maxDiscount) {
            disc = coupon.maxDiscount;
          }
        } else {
          disc = coupon.discountValue;
        }

        return Math.min(sub, disc);
      },

      total: () => {
        const sub = get().subtotal();
        const ship = get().shippingFee();
        const disc = get().discountAmount();
        return Math.max(0, sub + ship - disc);
      },

      totalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      // Bidirectional sync on user login: pulls remote and merges with local cart
      syncWithUser: async (userId: string | null | undefined) => {
        if (!userId) return;
        set({ isSyncing: true });

        try {
          // 1. Fetch remote items from Supabase cart_items joined with products
          const { data: remoteData, error } = await supabase
            .from('cart_items')
            .select('product_id, quantity, products(*, product_images(*))')
            .eq('user_id', userId);

          if (error) {
            console.warn('Failed to fetch remote cart items:', error);
            set({ isSyncing: false });
            return;
          }

          const localItems = get().items;
          const mergedMap = new Map<string, CartItem>();

          // Add remote items to map
          if (remoteData && remoteData.length > 0) {
            for (const r of remoteData) {
              const p = r.products as any;
              if (p && p.is_active) {
                const img = p.product_images?.[0]?.url || null;
                mergedMap.set(r.product_id, {
                  id: p.id,
                  productId: p.id,
                  name: p.name,
                  price: p.price,
                  imageUrl: img,
                  quantity: Math.min(p.stock, r.quantity),
                  stock: p.stock,
                  sku: p.sku,
                });
              }
            }
          }

          // Merge local items: keep highest quantity, cap at stock
          for (const l of localItems) {
            const existing = mergedMap.get(l.productId);
            if (existing) {
              const combinedQty = Math.min(existing.stock, Math.max(existing.quantity, l.quantity));
              mergedMap.set(l.productId, { ...existing, quantity: combinedQty });
            } else {
              mergedMap.set(l.productId, l);
            }
          }

          const mergedItems = Array.from(mergedMap.values());
          set({ items: mergedItems, isSyncing: false });

          // Push merged result back to Supabase
          for (const item of mergedItems) {
            await syncRemoteItem(userId, item.productId, item.quantity);
          }
        } catch (err) {
          console.warn('Cart sync error:', err);
          set({ isSyncing: false });
        }
      },
    }),
    {
      name: 'wewala-cart-storage',
      partialize: (s) => ({
        items: s.items,
        coupon: s.coupon,
      }),
    }
  )
);
