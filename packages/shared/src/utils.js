import { STORE_CONFIG } from './constants';
/**
 * Format a number as local currency (e.g. "Rs. 1,250.00")
 */
export function formatPrice(amount) {
    const num = Number(amount || 0);
    return `${STORE_CONFIG.currencySymbol} ${num.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}
/**
 * Calculates discount amount based on type and value, respecting maximum limits.
 */
export function calculateDiscount(subtotal, discountType, discountValue, maxDiscount) {
    if (subtotal <= 0 || discountValue <= 0)
        return 0;
    let discount = 0;
    if (discountType === 'percentage') {
        discount = (subtotal * discountValue) / 100;
    }
    else {
        discount = discountValue;
    }
    if (maxDiscount !== undefined && maxDiscount !== null && maxDiscount > 0) {
        discount = Math.min(discount, maxDiscount);
    }
    // Discount cannot exceed subtotal
    return Math.min(discount, subtotal);
}
/**
 * Calculates shipping fee. Free shipping if subtotal meets or exceeds threshold.
 */
export function calculateShipping(subtotal, threshold = STORE_CONFIG.freeShippingThreshold, standardFee = STORE_CONFIG.defaultShippingFee) {
    if (subtotal <= 0)
        return 0;
    return subtotal >= threshold ? 0 : standardFee;
}
/**
 * Calculates complete order summary totals from items and coupon.
 */
export function calculateOrderTotals(items, coupon) {
    const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
    const itemCount = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    let discount = 0;
    if (coupon && (!coupon.minOrderAmount || subtotal >= coupon.minOrderAmount)) {
        discount = calculateDiscount(subtotal, coupon.discountType, coupon.discountValue, coupon.maxDiscount);
    }
    const shipping = calculateShipping(subtotal);
    const total = Math.max(0, subtotal + shipping - discount);
    return {
        subtotal,
        shipping,
        discount,
        total,
        itemCount,
    };
}
/**
 * Determines whether an order should be displayed in the admin panel / dashboard.
 * - For Card payments ('card', 'stripe', 'payhere'), only orders with completed
 *   payment ('paid') are shown in the admin panel. Orders with pending/failed card payment are hidden.
 * - For Cash on Delivery ('cod') or other payment methods, the order is displayed immediately.
 */
export function isOrderVisibleInAdmin(order) {
    if (!order)
        return false;
    const method = (order.payment_method || '').toLowerCase().trim();
    if (method === 'card' || method === 'stripe' || method === 'payhere') {
        return (order.payment_status || '').toLowerCase().trim() === 'paid';
    }
    return true;
}
