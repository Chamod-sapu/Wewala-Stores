export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentMethod = 'card' | 'cod';

export type DiscountType = 'percentage' | 'fixed';

export type UserRole = 'customer' | 'admin';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          role: UserRole;
          email: string | null;
          is_disabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          email?: string | null;
          is_disabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          email?: string | null;
          is_disabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          price: number;
          compare_at_price: number | null;
          sku: string | null;
          stock: number;
          low_stock_threshold: number;
          category_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          price: number;
          compare_at_price?: number | null;
          sku?: string | null;
          stock?: number;
          low_stock_threshold?: number;
          category_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          price?: number;
          compare_at_price?: number | null;
          sku?: string | null;
          stock?: number;
          low_stock_threshold?: number;
          category_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          }
        ];
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          url: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          url: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          url?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      addresses: {
        Row: {
          id: string;
          user_id: string;
          recipient_name: string;
          phone: string;
          street_address: string;
          city: string;
          state: string | null;
          postal_code: string;
          country: string;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          recipient_name: string;
          phone: string;
          street_address: string;
          city: string;
          state?: string | null;
          postal_code: string;
          country?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          recipient_name?: string;
          phone?: string;
          street_address?: string;
          city?: string;
          state?: string | null;
          postal_code?: string;
          country?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      coupons: {
        Row: {
          id: string;
          code: string;
          discount_type: DiscountType;
          discount_value: number;
          min_order_amount: number;
          max_discount: number | null;
          expires_at: string | null;
          usage_limit: number | null;
          used_count: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          discount_type: DiscountType;
          discount_value: number;
          min_order_amount?: number;
          max_discount?: number | null;
          expires_at?: string | null;
          usage_limit?: number | null;
          used_count?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          discount_type?: DiscountType;
          discount_value?: number;
          min_order_amount?: number;
          max_discount?: number | null;
          expires_at?: string | null;
          usage_limit?: number | null;
          used_count?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          user_id: string | null;
          status: OrderStatus;
          payment_method: PaymentMethod;
          payment_status: string;
          subtotal: number;
          shipping: number;
          discount: number;
          total: number;
          shipping_address: Json;
          coupon_code: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          status?: OrderStatus;
          payment_method: PaymentMethod;
          payment_status?: string;
          subtotal?: number;
          shipping?: number;
          discount?: number;
          total: number;
          shipping_address: Json;
          coupon_code?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          status?: OrderStatus;
          payment_method?: PaymentMethod;
          payment_status?: string;
          subtotal?: number;
          shipping?: number;
          discount?: number;
          total?: number;
          shipping_address?: Json;
          coupon_code?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          name_snapshot: string;
          price_snapshot: number;
          quantity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          name_snapshot: string;
          price_snapshot: number;
          quantity: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          name_snapshot?: string;
          price_snapshot?: number;
          quantity?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      payments: {
        Row: {
          id: string;
          order_id: string;
          user_id: string | null;
          amount: number;
          currency: string;
          provider: string;
          status: string;
          transaction_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          user_id?: string | null;
          amount: number;
          currency?: string;
          provider?: string;
          status?: string;
          transaction_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          user_id?: string | null;
          amount?: number;
          currency?: string;
          provider?: string;
          status?: string;
          transaction_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          }
        ];
      };
      reviews: {
        Row: {
          id: string;
          product_id: string;
          user_id: string;
          rating: number;
          comment: string | null;
          is_approved: boolean;
          status?: 'pending' | 'approved' | 'hidden';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          user_id: string;
          rating: number;
          comment?: string | null;
          is_approved?: boolean;
          status?: 'pending' | 'approved' | 'hidden';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          user_id?: string;
          rating?: number;
          comment?: string | null;
          is_approved?: boolean;
          status?: 'pending' | 'approved' | 'hidden';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      wishlist: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wishlist_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wishlist_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      cart_items: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          quantity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          quantity: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      contact_messages: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          subject: string | null;
          message: string;
          is_read: boolean;
          status: 'unread' | 'read' | 'resolved';
          resolved_at: string | null;
          admin_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone?: string | null;
          subject?: string | null;
          message: string;
          is_read?: boolean;
          status?: 'unread' | 'read' | 'resolved';
          resolved_at?: string | null;
          admin_notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          subject?: string | null;
          message?: string;
          is_read?: boolean;
          status?: 'unread' | 'read' | 'resolved';
          resolved_at?: string | null;
          admin_notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      inventory_movements: {
        Row: {
          id: string;
          product_id: string;
          change: number;
          reason: string;
          order_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          change: number;
          reason: string;
          order_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          change?: number;
          reason?: string;
          order_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_movements_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      place_order: {
        Args: {
          coupon_code?: string | null;
          items: Json;
          payment_method: string;
          shipping_address: Json;
        };
        Returns: string;
      };
      cancel_order: {
        Args: {
          p_order_id: string;
        };
        Returns: Json;
      };
      process_card_payment: {
        Args: {
          p_order_id: string;
          p_payment_method?: string;
          p_transaction_id?: string | null;
          p_card_brand?: string;
          p_last4?: string;
          p_cardholder_name?: string | null;
          p_provider?: string;
          p_metadata?: Json;
        };
        Returns: Json;
      };
      get_dashboard_kpis: {
        Args: Record<PropertyKey, never>;
        Returns: {
          today_revenue: number;
          today_orders: number;
          new_customers_today: number;
          pending_orders: number;
          low_stock_count: number;
        };
      };
      get_revenue_chart: {
        Args: {
          p_days?: number;
        };
        Returns: {
          sale_date: string;
          revenue: number;
          order_count: number;
        }[];
      };
      get_orders_by_status: {
        Args: Record<PropertyKey, never>;
        Returns: {
          status: string;
          order_count: number;
          total_amount: number;
        }[];
      };
      get_top_selling_products: {
        Args: {
          p_limit?: number;
        };
        Returns: {
          product_id: string;
          product_name: string;
          units_sold: number;
          total_revenue: number;
        }[];
      };
      admin_update_order_status: {
        Args: {
          p_order_id: string;
          p_status: OrderStatus;
          p_reason?: string | null;
        };
        Returns: {
          success: boolean;
          order_id: string;
          old_status: OrderStatus;
          new_status: OrderStatus;
          restocked: boolean;
        };
      };
      admin_bulk_update_orders: {
        Args: {
          p_order_ids: string[];
          p_status: OrderStatus;
          p_reason?: string | null;
        };
        Returns: {
          success: boolean;
          updated_count: number;
          status: OrderStatus;
        };
      };
      get_sales_analytics: {
        Args: {
          p_start_date?: string;
          p_end_date?: string;
        };
        Returns: {
          gross_revenue: number;
          net_revenue: number;
          orders_count: number;
          average_order_value: number;
          refunds_count: number;
          refunds_total: number;
          discounts_total: number;
          shipping_total: number;
        };
      };
      get_sales_timeline: {
        Args: {
          p_start_date?: string;
          p_end_date?: string;
        };
        Returns: {
          sale_date: string;
          revenue: number;
          order_count: number;
        }[];
      };
      get_sales_by_category_breakdown: {
        Args: {
          p_start_date?: string;
          p_end_date?: string;
        };
        Returns: {
          category_id: string;
          category_name: string;
          units_sold: number;
          total_revenue: number;
        }[];
      };
      get_sales_by_payment_breakdown: {
        Args: {
          p_start_date?: string;
          p_end_date?: string;
        };
        Returns: {
          payment_method: string;
          order_count: number;
          total_revenue: number;
        }[];
      };
      get_sales_top_products_list: {
        Args: {
          p_start_date?: string;
          p_end_date?: string;
          p_limit?: number;
        };
        Returns: {
          product_id: string;
          product_name: string;
          sku: string | null;
          category_name: string;
          units_sold: number;
          total_revenue: number;
        }[];
      };
      admin_moderate_reviews: {
        Args: {
          p_review_ids: string[];
          p_action: 'approve' | 'hide' | 'delete' | 'pending';
        };
        Returns: {
          success: boolean;
          action: string;
          affected_count: number;
        };
      };
      get_product_review_stats: {
        Args: Record<PropertyKey, never>;
        Returns: {
          product_id: string;
          product_name: string;
          product_sku: string | null;
          thumbnail_url: string | null;
          total_reviews: number;
          approved_reviews: number;
          pending_reviews: number;
          hidden_reviews: number;
          average_rating: number;
          count_5_star: number;
          count_4_star: number;
          count_3_star: number;
          count_2_star: number;
          count_1_star: number;
        }[];
      };
      admin_update_user_role: {
        Args: {
          p_user_id: string;
          p_new_role: 'admin' | 'customer';
        };
        Returns: {
          success: boolean;
          user_id: string;
          role: string;
        };
      };
      admin_toggle_user_status: {
        Args: {
          p_user_id: string;
          p_is_disabled: boolean;
        };
        Returns: {
          success: boolean;
          user_id: string;
          is_disabled: boolean;
        };
      };
      admin_get_user_stats: {
        Args: {
          p_user_id: string;
        };
        Returns: {
          user_id: string;
          total_spent: number;
          total_orders: number;
          completed_orders: number;
          pending_orders: number;
          cancelled_orders: number;
          addresses_count: number;
          last_order_at: string | null;
        };
      };
      admin_moderate_contact_messages: {
        Args: {
          p_message_ids: string[];
          p_action: 'unread' | 'read' | 'resolved' | 'delete';
          p_admin_notes?: string;
        };
        Returns: {
          success: boolean;
          action: string;
          affected_count: number;
        };
      };
    };
    Enums: {
      order_status: OrderStatus;
      payment_method_type: PaymentMethod;
      discount_type: DiscountType;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
