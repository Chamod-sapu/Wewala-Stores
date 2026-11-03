import type { DiscountType } from './database.types';
/**
 * Format a number as local currency (e.g. "Rs. 1,250.00")
 */
export declare function formatPrice(amount: number | null | undefined): string;
/**
 * Calculates discount amount based on type and value, respecting maximum limits.
 */
export declare function calculateDiscount(subtotal: number, discountType: DiscountType | 'percentage' | 'fixed', discountValue: number, maxDiscount?: number | null): number;
/**
 * Calculates shipping fee. Free shipping if subtotal meets or exceeds threshold.
 */
export declare function calculateShipping(subtotal: number, threshold?: number, standardFee?: number): number;
/**
 * Calculates complete order summary totals from items and coupon.
 */
export declare function calculateOrderTotals(items: {
    price: number;
    quantity: number;
}[], coupon?: {
    discountType: DiscountType | 'percentage' | 'fixed';
    discountValue: number;
    minOrderAmount?: number;
    maxDiscount?: number | null;
} | null): {
    subtotal: number;
    shipping: number;
    discount: number;
    total: number;
    itemCount: number;
};
//# sourceMappingURL=utils.d.ts.map