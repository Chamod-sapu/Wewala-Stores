import type { Database, Json, OrderStatus, PaymentMethod, DiscountType, UserRole } from './database.types';

// Row types extracted from Database
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type Category = Database['public']['Tables']['categories']['Row'];
export type CategoryInsert = Database['public']['Tables']['categories']['Insert'];
export type CategoryUpdate = Database['public']['Tables']['categories']['Update'];

export type Product = Database['public']['Tables']['products']['Row'];
export type ProductInsert = Database['public']['Tables']['products']['Insert'];
export type ProductUpdate = Database['public']['Tables']['products']['Update'];

export type ProductImage = Database['public']['Tables']['product_images']['Row'];
export type ProductImageInsert = Database['public']['Tables']['product_images']['Insert'];
export type ProductImageUpdate = Database['public']['Tables']['product_images']['Update'];

export type Address = Database['public']['Tables']['addresses']['Row'];
export type AddressInsert = Database['public']['Tables']['addresses']['Insert'];
export type AddressUpdate = Database['public']['Tables']['addresses']['Update'];

export type Coupon = Database['public']['Tables']['coupons']['Row'];
export type CouponInsert = Database['public']['Tables']['coupons']['Insert'];
export type CouponUpdate = Database['public']['Tables']['coupons']['Update'];

export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderInsert = Database['public']['Tables']['orders']['Insert'];
export type OrderUpdate = Database['public']['Tables']['orders']['Update'];

export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type OrderItemInsert = Database['public']['Tables']['order_items']['Insert'];
export type OrderItemUpdate = Database['public']['Tables']['order_items']['Update'];

export type Payment = Database['public']['Tables']['payments']['Row'];
export type PaymentInsert = Database['public']['Tables']['payments']['Insert'];
export type PaymentUpdate = Database['public']['Tables']['payments']['Update'];

export type Review = Database['public']['Tables']['reviews']['Row'];
export type ReviewInsert = Database['public']['Tables']['reviews']['Insert'];
export type ReviewUpdate = Database['public']['Tables']['reviews']['Update'];

export type WishlistItem = Database['public']['Tables']['wishlist']['Row'];
export type WishlistItemInsert = Database['public']['Tables']['wishlist']['Insert'];

export type CartItem = Database['public']['Tables']['cart_items']['Row'];
export type CartItemInsert = Database['public']['Tables']['cart_items']['Insert'];
export type CartItemUpdate = Database['public']['Tables']['cart_items']['Update'];

export type ContactMessage = Database['public']['Tables']['contact_messages']['Row'];
export type ContactMessageInsert = Database['public']['Tables']['contact_messages']['Insert'];
export type ContactMessageUpdate = Database['public']['Tables']['contact_messages']['Update'];

export type InventoryMovement = Database['public']['Tables']['inventory_movements']['Row'];
export type InventoryMovementInsert = Database['public']['Tables']['inventory_movements']['Insert'];

// Composite & Domain Types
export interface ProductWithImages extends Product {
  images: ProductImage[];
  category?: Category | null;
}

export interface CartItemWithProduct extends CartItem {
  product: Product & {
    images?: ProductImage[];
  };
}

export interface OrderWithDetails extends Order {
  items: (OrderItem & {
    product?: Product | null;
  })[];
  payments?: Payment[];
  profile?: Profile | null;
}

export interface ReviewWithProfile extends Review {
  profile?: Pick<Profile, 'full_name' | 'avatar_url'> | null;
}

export interface UserWithStats extends Profile {
  orders_count?: number;
  total_spent?: number;
  completed_orders?: number;
  pending_orders?: number;
  cancelled_orders?: number;
  addresses_count?: number;
  last_order_at?: string | null;
}

// Shipping Address Data Transfer Object
export interface ShippingAddressDTO {
  recipient_name: string;
  phone: string;
  street_address: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
}

// Checkout RPC Parameters
export interface PlaceOrderItemDTO {
  product_id: string;
  quantity: number;
}

export interface PlaceOrderParams {
  items: PlaceOrderItemDTO[];
  shipping_address: ShippingAddressDTO;
  payment_method: PaymentMethod;
  coupon_code?: string | null;
}

export {
  OrderStatus,
  PaymentMethod,
  DiscountType,
  UserRole,
  Json
};

