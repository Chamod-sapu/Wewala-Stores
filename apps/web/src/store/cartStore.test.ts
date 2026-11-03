import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCartStore, AppliedCoupon } from './cartStore';
import { STORE_CONFIG } from '@wewala/shared';

// Mock Supabase to avoid network calls during unit testing
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }),
  },
}));

describe('useCartStore', () => {
  beforeEach(() => {
    // Reset state before each test
    useCartStore.setState({
      items: [],
      isOpen: false,
      coupon: null,
      isSyncing: false,
    });
  });

  it('starts with an empty cart and closed drawer', () => {
    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
    expect(state.isOpen).toBe(false);
    expect(state.coupon).toBeNull();
    expect(state.subtotal()).toBe(0);
    expect(state.totalItems()).toBe(0);
    expect(state.shippingFee()).toBe(0);
    expect(state.total()).toBe(0);
  });

  it('adds a new product to the cart and calculates item totals', () => {
    const { addItem, subtotal, totalItems } = useCartStore.getState();

    addItem({
      id: 'item-1',
      productId: 'prod-101',
      name: 'Pure Ceylon Black Tea 500g',
      price: 1200,
      stock: 10,
      imageUrl: '/images/tea.jpg',
      quantity: 2,
    });

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(2);
    expect(totalItems()).toBe(2);
    expect(subtotal()).toBe(2400);
  });

  it('caps quantity to product stock limit when adding items', () => {
    const { addItem } = useCartStore.getState();

    addItem({
      id: 'item-2',
      productId: 'prod-102',
      name: 'Organic Spices Jar',
      price: 800,
      stock: 3, // only 3 in stock
      imageUrl: null,
      quantity: 5, // request 5
    });

    const state = useCartStore.getState();
    expect(state.items[0].quantity).toBe(3); // capped at stock 3
  });

  it('increments quantity when adding the same item repeatedly', () => {
    const { addItem } = useCartStore.getState();

    const product = {
      id: 'item-1',
      productId: 'prod-101',
      name: 'Ceylon Tea',
      price: 1000,
      stock: 10,
      imageUrl: null,
    };

    addItem({ ...product, quantity: 2 });
    addItem({ ...product, quantity: 3 });

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(5);
  });

  it('updates quantity directly and caps at stock', () => {
    const { addItem, updateQuantity } = useCartStore.getState();

    addItem({
      id: 'item-1',
      productId: 'prod-101',
      name: 'Ceylon Tea',
      price: 1000,
      stock: 5,
      imageUrl: null,
      quantity: 2,
    });

    // Update to 4 (within stock)
    updateQuantity('prod-101', 4);
    expect(useCartStore.getState().items[0].quantity).toBe(4);

    // Update to 10 (exceeds stock) -> capped at 5
    updateQuantity('prod-101', 10);
    expect(useCartStore.getState().items[0].quantity).toBe(5);
  });

  it('removes item when quantity updated to 0 or negative', () => {
    const { addItem, updateQuantity } = useCartStore.getState();

    addItem({
      id: 'item-1',
      productId: 'prod-101',
      name: 'Ceylon Tea',
      price: 1000,
      stock: 5,
      imageUrl: null,
      quantity: 2,
    });

    updateQuantity('prod-101', 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('removes product by productId via removeItem', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem({
      id: 'item-1',
      productId: 'prod-101',
      name: 'Ceylon Tea',
      price: 1000,
      stock: 5,
      imageUrl: null,
      quantity: 2,
    });

    addItem({
      id: 'item-2',
      productId: 'prod-102',
      name: 'Coffee',
      price: 1500,
      stock: 5,
      imageUrl: null,
      quantity: 1,
    });

    expect(useCartStore.getState().items).toHaveLength(2);
    removeItem('prod-101');
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].productId).toBe('prod-102');
  });

  it('calculates shipping correctly based on free shipping threshold', () => {
    const { addItem, shippingFee, subtotal } = useCartStore.getState();

    // Order of 2000 (below 5000 threshold)
    addItem({
      id: 'item-1',
      productId: 'prod-1',
      name: 'Tea',
      price: 2000,
      stock: 10,
      imageUrl: null,
      quantity: 1,
    });

    expect(subtotal()).toBe(2000);
    expect(shippingFee()).toBe(STORE_CONFIG.defaultShippingFee);

    // Add more to exceed 5000 threshold
    addItem({
      id: 'item-2',
      productId: 'prod-2',
      name: 'Rice Bag',
      price: 3500,
      stock: 10,
      imageUrl: null,
      quantity: 1,
    });

    expect(subtotal()).toBe(5500);
    expect(shippingFee()).toBe(0); // Free shipping!
  });

  it('applies percentage coupon and validates minimum order requirement', () => {
    const { addItem, applyCoupon, discountAmount, total } = useCartStore.getState();

    addItem({
      id: 'item-1',
      productId: 'prod-1',
      name: 'Tea',
      price: 2000,
      stock: 10,
      imageUrl: null,
      quantity: 1,
    });

    const coupon: AppliedCoupon = {
      code: 'BIGSAVINGS',
      discountType: 'percentage',
      discountValue: 15, // 15% off
      minOrderAmount: 3000, // requires 3000
      maxDiscount: null,
    };

    // Subtotal is 2000, below 3000 requirement
    const failureResult = applyCoupon(coupon);
    expect(failureResult.success).toBe(false);
    expect(useCartStore.getState().coupon).toBeNull();

    // Add more to reach 4000
    addItem({
      id: 'item-2',
      productId: 'prod-2',
      name: 'Tea 2',
      price: 2000,
      stock: 10,
      imageUrl: null,
      quantity: 1,
    });

    // Subtotal is now 4000
    const successResult = applyCoupon(coupon);
    expect(successResult.success).toBe(true);
    expect(useCartStore.getState().coupon).toEqual(coupon);

    // 15% of 4000 = 600
    expect(discountAmount()).toBe(600);
    // Total = 4000 subtotal + 350 shipping - 600 discount = 3750
    expect(total()).toBe(4000 + STORE_CONFIG.defaultShippingFee - 600);
  });

  it('removes applied coupon and restores totals', () => {
    const { addItem, applyCoupon, removeCoupon, discountAmount } = useCartStore.getState();

    addItem({
      id: 'item-1',
      productId: 'prod-1',
      name: 'Tea',
      price: 5000,
      stock: 10,
      imageUrl: null,
      quantity: 1,
    });

    applyCoupon({
      code: 'FLAT500',
      discountType: 'fixed',
      discountValue: 500,
      minOrderAmount: 2000,
      maxDiscount: null,
    });

    expect(discountAmount()).toBe(500);
    removeCoupon();
    expect(useCartStore.getState().coupon).toBeNull();
    expect(discountAmount()).toBe(0);
  });

  it('clears all items and coupon when clearCart is called', () => {
    const { addItem, applyCoupon, clearCart } = useCartStore.getState();

    addItem({
      id: 'item-1',
      productId: 'prod-1',
      name: 'Tea',
      price: 6000,
      stock: 10,
      imageUrl: null,
      quantity: 1,
    });

    applyCoupon({
      code: 'SAVE10',
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: 1000,
      maxDiscount: null,
    });

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().coupon).not.toBeNull();

    clearCart();

    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().coupon).toBeNull();
    expect(useCartStore.getState().total()).toBe(0);
  });
});

