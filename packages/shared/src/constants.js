export const ORDER_STATUSES = {
    pending: { label: 'Pending', color: 'amber' },
    paid: { label: 'Paid', color: 'blue' },
    processing: { label: 'Processing', color: 'indigo' },
    shipped: { label: 'Shipped', color: 'purple' },
    delivered: { label: 'Delivered', color: 'emerald' },
    cancelled: { label: 'Cancelled', color: 'red' },
    refunded: { label: 'Refunded', color: 'gray' },
};
export const PAYMENT_METHODS = {
    card: {
        label: 'Credit / Debit Card',
        description: 'Pay securely using Visa, MasterCard, or online bank card.',
    },
    cod: {
        label: 'Cash on Delivery (COD)',
        description: 'Pay cash when your package arrives at your doorstep.',
    },
};
export const DISCOUNT_TYPES = {
    percentage: 'Percentage (%)',
    fixed: 'Fixed Amount (LKR)',
};
export const STORE_CONFIG = {
    name: 'Wewala Stores',
    tagline: 'Premium Goods & Groceries Delivered Across Sri Lanka',
    contactEmail: 'support@wewala.com',
    contactPhone: '+94 11 285 4321',
    currency: 'LKR',
    currencySymbol: 'Rs.',
    defaultShippingFee: 350.0,
    freeShippingThreshold: 5000.0,
    defaultCountry: 'Sri Lanka',
};
export const STORAGE_BUCKETS = {
    PRODUCT_IMAGES: 'product-images',
    AVATARS: 'avatars',
};
