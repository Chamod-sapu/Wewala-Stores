import { describe, it, expect } from 'vitest';
import { formatPrice, calculateDiscount, calculateShipping, calculateOrderTotals, isOrderVisibleInAdmin, } from './utils';
import { STORE_CONFIG } from './constants';
describe('Shared Utilities', () => {
    describe('formatPrice', () => {
        it('formats positive numbers with currency symbol and 2 decimal places', () => {
            expect(formatPrice(1250)).toBe('Rs. 1,250.00');
            expect(formatPrice(99.9)).toBe('Rs. 99.90');
            expect(formatPrice(5432100.5)).toBe('Rs. 5,432,100.50');
        });
        it('handles zero, negative, or undefined gracefully', () => {
            expect(formatPrice(0)).toBe('Rs. 0.00');
            expect(formatPrice(null)).toBe('Rs. 0.00');
            expect(formatPrice(undefined)).toBe('Rs. 0.00');
        });
    });
    describe('calculateDiscount', () => {
        it('calculates percentage discounts correctly', () => {
            // 10% of 2000 = 200
            expect(calculateDiscount(2000, 'percentage', 10)).toBe(200);
            // 25% of 1000 = 250
            expect(calculateDiscount(1000, 'percentage', 25)).toBe(250);
        });
        it('respects maxDiscount ceiling for percentage discounts', () => {
            // 50% of 10000 is 5000, but capped at 1500
            expect(calculateDiscount(10000, 'percentage', 50, 1500)).toBe(1500);
            // When calculated discount is below cap, use calculated discount
            expect(calculateDiscount(2000, 'percentage', 10, 1000)).toBe(200);
        });
        it('calculates fixed amount discounts correctly', () => {
            // Flat 500 off
            expect(calculateDiscount(3000, 'fixed', 500)).toBe(500);
        });
        it('caps fixed discount so it never exceeds subtotal', () => {
            // Flat 1000 off a 400 subtotal should be capped at 400
            expect(calculateDiscount(400, 'fixed', 1000)).toBe(400);
        });
        it('returns 0 if subtotal or discountValue is zero or negative', () => {
            expect(calculateDiscount(0, 'percentage', 20)).toBe(0);
            expect(calculateDiscount(1000, 'percentage', 0)).toBe(0);
            expect(calculateDiscount(-500, 'fixed', 200)).toBe(0);
        });
    });
    describe('calculateShipping', () => {
        it('returns default shipping fee when below free shipping threshold', () => {
            // Below 5000 threshold
            expect(calculateShipping(2500)).toBe(STORE_CONFIG.defaultShippingFee);
            expect(calculateShipping(4999)).toBe(STORE_CONFIG.defaultShippingFee);
        });
        it('returns 0 (free shipping) when subtotal meets or exceeds threshold', () => {
            expect(calculateShipping(5000)).toBe(0);
            expect(calculateShipping(8500)).toBe(0);
        });
        it('returns 0 for empty order (subtotal <= 0)', () => {
            expect(calculateShipping(0)).toBe(0);
        });
    });
    describe('calculateOrderTotals', () => {
        it('calculates totals accurately without coupon', () => {
            const items = [
                { price: 1000, quantity: 2 }, // 2000
                { price: 500, quantity: 1 }, // 500
            ];
            const result = calculateOrderTotals(items);
            expect(result.subtotal).toBe(2500);
            expect(result.itemCount).toBe(3);
            expect(result.shipping).toBe(STORE_CONFIG.defaultShippingFee);
            expect(result.discount).toBe(0);
            expect(result.total).toBe(2500 + STORE_CONFIG.defaultShippingFee);
        });
        it('applies percentage coupon with free shipping when qualifying', () => {
            const items = [
                { price: 3000, quantity: 2 }, // 6000 subtotal -> qualifies for free shipping
            ];
            const coupon = {
                discountType: 'percentage',
                discountValue: 10, // 10% of 6000 = 600
                minOrderAmount: 2000,
            };
            const result = calculateOrderTotals(items, coupon);
            expect(result.subtotal).toBe(6000);
            expect(result.shipping).toBe(0); // Free shipping!
            expect(result.discount).toBe(600);
            expect(result.total).toBe(5400); // 6000 + 0 - 600
        });
        it('does not apply coupon if subtotal is below minOrderAmount', () => {
            const items = [{ price: 1000, quantity: 1 }];
            const coupon = {
                discountType: 'fixed',
                discountValue: 300,
                minOrderAmount: 2500,
            };
            const result = calculateOrderTotals(items, coupon);
            expect(result.subtotal).toBe(1000);
            expect(result.discount).toBe(0);
            expect(result.shipping).toBe(STORE_CONFIG.defaultShippingFee);
            expect(result.total).toBe(1000 + STORE_CONFIG.defaultShippingFee);
        });
    });
    describe('isOrderVisibleInAdmin', () => {
        it('shows Cash on Delivery (COD) orders regardless of payment status', () => {
            expect(isOrderVisibleInAdmin({ payment_method: 'cod', payment_status: 'pending' })).toBe(true);
            expect(isOrderVisibleInAdmin({ payment_method: 'cod', payment_status: 'paid' })).toBe(true);
            expect(isOrderVisibleInAdmin({ payment_method: 'cod', payment_status: 'unpaid' })).toBe(true);
        });
        it('hides Card orders when payment is pending or not paid', () => {
            expect(isOrderVisibleInAdmin({ payment_method: 'card', payment_status: 'pending' })).toBe(false);
            expect(isOrderVisibleInAdmin({ payment_method: 'card', payment_status: 'failed' })).toBe(false);
            expect(isOrderVisibleInAdmin({ payment_method: 'card', payment_status: 'processing' })).toBe(false);
            expect(isOrderVisibleInAdmin({ payment_method: 'card', payment_status: '' })).toBe(false);
            expect(isOrderVisibleInAdmin({ payment_method: 'card', payment_status: null })).toBe(false);
        });
        it('shows Card orders only when payment_status is paid', () => {
            expect(isOrderVisibleInAdmin({ payment_method: 'card', payment_status: 'paid' })).toBe(true);
            expect(isOrderVisibleInAdmin({ payment_method: 'CARD', payment_status: 'PAID' })).toBe(true);
            expect(isOrderVisibleInAdmin({ payment_method: 'stripe', payment_status: 'paid' })).toBe(true);
            expect(isOrderVisibleInAdmin({ payment_method: 'payhere', payment_status: 'paid' })).toBe(true);
        });
        it('hides Stripe and PayHere orders when payment is pending', () => {
            expect(isOrderVisibleInAdmin({ payment_method: 'stripe', payment_status: 'pending' })).toBe(false);
            expect(isOrderVisibleInAdmin({ payment_method: 'payhere', payment_status: 'pending' })).toBe(false);
        });
        it('handles falsy or missing input gracefully', () => {
            expect(isOrderVisibleInAdmin(null)).toBe(false);
            expect(isOrderVisibleInAdmin(undefined)).toBe(false);
        });
    });
});
