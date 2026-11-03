import type { OrderStatus, PaymentMethod, DiscountType } from './database.types';
export declare const ORDER_STATUSES: Record<OrderStatus, {
    label: string;
    color: string;
}>;
export declare const PAYMENT_METHODS: Record<PaymentMethod, {
    label: string;
    description: string;
}>;
export declare const DISCOUNT_TYPES: Record<DiscountType, string>;
export declare const STORE_CONFIG: {
    readonly name: "Wewala Stores";
    readonly tagline: "Premium Goods & Groceries Delivered Across Sri Lanka";
    readonly contactEmail: "support@wewala.com";
    readonly contactPhone: "+94 11 285 4321";
    readonly currency: "LKR";
    readonly currencySymbol: "Rs.";
    readonly defaultShippingFee: 350;
    readonly freeShippingThreshold: 5000;
    readonly defaultCountry: "Sri Lanka";
};
export declare const STORAGE_BUCKETS: {
    readonly PRODUCT_IMAGES: "product-images";
    readonly AVATARS: "avatars";
};
//# sourceMappingURL=constants.d.ts.map