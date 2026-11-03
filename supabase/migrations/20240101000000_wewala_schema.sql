-- ==============================================================================
-- WEWALA STORES - SUPABASE E-COMMERCE DATABASE SCHEMA MIGRATION
-- Migration: 20240101000000_wewala_schema.sql
-- Description: Complete schema for backend-only Supabase e-commerce:
--              Profiles, Categories, Products, Images, Addresses, Orders,
--              Order Items, Payments, Reviews, Wishlist, Cart, Coupons,
--              Contact Messages, Inventory Movements, Functions, RLS, RPC,
--              and Storage Buckets.
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. ENUMS & DOMAINS
-- ==============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE public.order_status AS ENUM (
      'pending',
      'paid',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'refunded'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_type') THEN
    CREATE TYPE public.payment_method_type AS ENUM (
      'card',
      'cod'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discount_type') THEN
    CREATE TYPE public.discount_type AS ENUM (
      'percentage',
      'fixed'
    );
  END IF;
END $$;

-- ==============================================================================
-- 2. TABLE DEFINITIONS
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 2.1 Profiles Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('customer', 'admin')) DEFAULT 'customer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for role lookup
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Trigger to auto-create profile on user signup in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    phone = COALESCE(NULLIF(EXCLUDED.phone, ''), public.profiles.phone),
    updated_at = timezone('utc'::text, now());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 2.2 Categories Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON public.categories(is_active);

-- ------------------------------------------------------------------------------
-- 2.3 Products Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  compare_at_price NUMERIC(10, 2) CHECK (compare_at_price IS NULL OR compare_at_price >= price),
  sku TEXT UNIQUE,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);

-- ------------------------------------------------------------------------------
-- 2.4 Product Images Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_sort ON public.product_images(product_id, sort_order ASC);

-- ------------------------------------------------------------------------------
-- 2.5 Addresses Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  street_address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Sri Lanka',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_addresses_user ON public.addresses(user_id);

-- ------------------------------------------------------------------------------
-- 2.6 Coupons Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type public.discount_type NOT NULL,
  discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value > 0),
  min_order_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
  max_discount NUMERIC(10, 2) CHECK (max_discount IS NULL OR max_discount >= 0),
  expires_at TIMESTAMPTZ,
  usage_limit INTEGER CHECK (usage_limit IS NULL OR usage_limit > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);

-- ------------------------------------------------------------------------------
-- 2.7 Orders Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status public.order_status NOT NULL DEFAULT 'pending',
  payment_method public.payment_method_type NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  shipping NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (shipping >= 0),
  discount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
  shipping_address JSONB NOT NULL,
  coupon_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- ------------------------------------------------------------------------------
-- 2.8 Order Items Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  name_snapshot TEXT NOT NULL,
  price_snapshot NUMERIC(10, 2) NOT NULL CHECK (price_snapshot >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items(product_id);

-- ------------------------------------------------------------------------------
-- 2.9 Payments Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'LKR',
  provider TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'pending',
  transaction_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);

-- ------------------------------------------------------------------------------
-- 2.10 Reviews Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_user_product_review UNIQUE (product_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON public.reviews(is_approved);

-- ------------------------------------------------------------------------------
-- 2.11 Wishlist Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_user_wishlist_product UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_user ON public.wishlist(user_id);

-- ------------------------------------------------------------------------------
-- 2.12 Cart Items Table (Customer Cart Sync)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_user_cart_product UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_user ON public.cart_items(user_id);

-- ------------------------------------------------------------------------------
-- 2.13 Contact Messages Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_is_read ON public.contact_messages(is_read);

-- ------------------------------------------------------------------------------
-- 2.14 Inventory Movements Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_order ON public.inventory_movements(order_id);

-- ==============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3.1 Profiles Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view own profile or admin can view all"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own profile (excluding role escalation) or admin can update all"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (
    public.is_admin() OR (
      auth.uid() = id AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    )
  );

CREATE POLICY "Admin can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "Admin can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 3.2 Categories Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Active categories are viewable by everyone, admins can view all"
  ON public.categories FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins have full access to categories"
  ON public.categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 3.3 Products Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Active products are viewable by everyone, admins can view all"
  ON public.products FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins have full access to products"
  ON public.products FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 3.4 Product Images Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Images of active products are viewable by everyone, admins can view all"
  ON public.product_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_images.product_id
        AND (p.is_active = true OR public.is_admin())
    )
  );

CREATE POLICY "Admins have full access to product images"
  ON public.product_images FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 3.5 Addresses Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view own addresses or admin can view all"
  ON public.addresses FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can insert own addresses"
  ON public.addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can update own addresses or admin can update all"
  ON public.addresses FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can delete own addresses or admin can delete all"
  ON public.addresses FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 3.6 Coupons Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Active non-expired coupons can be viewed by authenticated users"
  ON public.coupons FOR SELECT
  USING (
    (is_active = true AND (expires_at IS NULL OR expires_at > timezone('utc'::text, now())))
    OR public.is_admin()
  );

CREATE POLICY "Admins have full access to coupons"
  ON public.coupons FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 3.7 Orders Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view own orders, admins can view all"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can create orders (or via place_order rpc)"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete orders"
  ON public.orders FOR DELETE
  USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 3.8 Order Items Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view items in their own orders, admins can view all"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (o.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Admins have full write access to order items"
  ON public.order_items FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 3.9 Payments Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view payments for their own orders, admins can view all"
  ON public.payments FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = payments.order_id
        AND (o.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Admins have full access to payments"
  ON public.payments FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 3.10 Reviews Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Approved reviews are public; unapproved viewable by owner or admin"
  ON public.reviews FOR SELECT
  USING (
    is_approved = true
    OR auth.uid() = user_id
    OR public.is_admin()
  );

CREATE POLICY "Authenticated users can submit a review"
  ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND is_approved = false
  );

CREATE POLICY "Users can update their unapproved reviews or admin can moderate"
  ON public.reviews FOR UPDATE
  USING (
    (auth.uid() = user_id AND is_approved = false)
    OR public.is_admin()
  )
  WITH CHECK (
    (auth.uid() = user_id AND is_approved = false)
    OR public.is_admin()
  );

CREATE POLICY "Users can delete own review or admin can delete any"
  ON public.reviews FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 3.11 Wishlist Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view own wishlist items, admins can view all"
  ON public.wishlist FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can add items to own wishlist"
  ON public.wishlist FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can remove items from own wishlist"
  ON public.wishlist FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 3.12 Cart Items Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can manage only their own cart items, admins can view all"
  ON public.cart_items FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can insert into own cart"
  ON public.cart_items FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can update own cart items"
  ON public.cart_items FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can delete from own cart"
  ON public.cart_items FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 3.13 Contact Messages Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Anyone can submit a contact message"
  ON public.contact_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins have full access to contact messages"
  ON public.contact_messages FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 3.14 Inventory Movements Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Admins have full access to inventory movements"
  ON public.inventory_movements FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ==============================================================================
-- 4. RPC: place_order
-- ==============================================================================
-- Atomic checkout transaction:
--  1. Validates authenticated user.
--  2. Validates inputs (items array non-empty, payment_method valid).
--  3. Locks product rows (FOR UPDATE) to prevent race conditions.
--  4. Validates stock availability.
--  5. Decrements stock and inserts inventory_movements records.
--  6. Calculates subtotal from live product prices.
--  7. Validates coupon code and applies discount if applicable.
--  8. Calculates shipping rate (free above 5000, else 350).
--  9. Creates order record.
-- 10. Inserts order_items records snapshotting name and price.
-- 11. Clears purchased items from customer's cart.
-- 12. Returns the newly created order ID.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.place_order(
  items JSONB,
  shipping_address JSONB,
  payment_method TEXT,
  coupon_code TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_order_id UUID;
  v_subtotal NUMERIC(10, 2) := 0.00;
  v_discount NUMERIC(10, 2) := 0.00;
  v_shipping NUMERIC(10, 2) := 350.00; -- Standard delivery fee in LKR
  v_total NUMERIC(10, 2) := 0.00;
  v_item RECORD;
  v_product RECORD;
  v_coupon RECORD;
  v_calculated_discount NUMERIC(10, 2) := 0.00;
  v_qty INTEGER;
  v_prod_id UUID;
  v_payment_method_enum public.payment_method_type;
BEGIN
  -- 1. Ensure user is authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: User must be signed in to place an order.';
  END IF;

  -- 2. Validate payment method
  BEGIN
    v_payment_method_enum := payment_method::public.payment_method_type;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid payment method: "%". Must be "card" or "cod".', payment_method;
  END;

  -- 3. Validate items payload
  IF items IS NULL OR jsonb_array_length(items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item.';
  END IF;

  -- 4. Validate shipping address payload
  IF shipping_address IS NULL OR jsonb_typeof(shipping_address) != 'object' THEN
    RAISE EXCEPTION 'A valid shipping_address object is required.';
  END IF;

  -- 5. Iterate through items, lock product rows, validate stock, compute subtotal
  FOR v_item IN SELECT * FROM jsonb_to_recordset(items) AS x(product_id UUID, quantity INTEGER)
  LOOP
    v_prod_id := v_item.product_id;
    v_qty := v_item.quantity;

    IF v_prod_id IS NULL THEN
      RAISE EXCEPTION 'Invalid item: product_id cannot be null.';
    END IF;

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid item quantity for product %: quantity must be greater than 0.', v_prod_id;
    END IF;

    -- Select product and lock row FOR UPDATE to prevent concurrency race conditions
    SELECT id, name, price, stock, is_active
    INTO v_product
    FROM public.products
    WHERE id = v_prod_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product with ID % does not exist.', v_prod_id;
    END IF;

    IF NOT v_product.is_active THEN
      RAISE EXCEPTION 'Product "%" is no longer available.', v_product.name;
    END IF;

    IF v_product.stock < v_qty THEN
      RAISE EXCEPTION 'Insufficient stock for "%". Available: %, requested: %.',
        v_product.name, v_product.stock, v_qty;
    END IF;

    -- Accumulate subtotal using current store price snapshot
    v_subtotal := v_subtotal + (v_product.price * v_qty);
  END LOOP;

  -- 6. Validate and apply coupon if provided
  IF coupon_code IS NOT NULL AND trim(coupon_code) <> '' THEN
    SELECT *
    INTO v_coupon
    FROM public.coupons
    WHERE UPPER(code) = UPPER(trim(coupon_code))
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > timezone('utc'::text, now()))
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Coupon code "%" is invalid or expired.', coupon_code;
    END IF;

    IF v_coupon.usage_limit IS NOT NULL AND v_coupon.used_count >= v_coupon.usage_limit THEN
      RAISE EXCEPTION 'Coupon code "%" has reached its usage limit.', coupon_code;
    END IF;

    IF v_subtotal < v_coupon.min_order_amount THEN
      RAISE EXCEPTION 'Coupon "%" requires a minimum order amount of % (current subtotal: %).',
        coupon_code, v_coupon.min_order_amount, v_subtotal;
    END IF;

    IF v_coupon.discount_type = 'percentage' THEN
      v_calculated_discount := ROUND((v_subtotal * (v_coupon.discount_value / 100.0)), 2);
      IF v_coupon.max_discount IS NOT NULL AND v_calculated_discount > v_coupon.max_discount THEN
        v_calculated_discount := v_coupon.max_discount;
      END IF;
    ELSE -- 'fixed'
      v_calculated_discount := v_coupon.discount_value;
    END IF;

    -- Ensure discount does not exceed subtotal
    IF v_calculated_discount > v_subtotal THEN
      v_calculated_discount := v_subtotal;
    END IF;

    v_discount := v_calculated_discount;

    -- Increment coupon usage
    UPDATE public.coupons
    SET used_count = used_count + 1
    WHERE id = v_coupon.id;
  END IF;

  -- 7. Calculate Shipping (Free shipping for orders over 5,000 LKR)
  IF v_subtotal >= 5000.00 THEN
    v_shipping := 0.00;
  END IF;

  v_total := v_subtotal + v_shipping - v_discount;
  IF v_total < 0 THEN
    v_total := 0;
  END IF;

  -- 8. Create the order
  INSERT INTO public.orders (
    user_id,
    status,
    payment_method,
    payment_status,
    subtotal,
    shipping,
    discount,
    total,
    shipping_address,
    coupon_code
  )
  VALUES (
    v_user_id,
    'pending',
    v_payment_method_enum,
    'pending',
    v_subtotal,
    v_shipping,
    v_discount,
    v_total,
    shipping_address,
    coupon_code
  )
  RETURNING id INTO v_order_id;

  -- 9. Decrement stock, write inventory movements, and insert order items
  FOR v_item IN SELECT * FROM jsonb_to_recordset(items) AS x(product_id UUID, quantity INTEGER)
  LOOP
    v_prod_id := v_item.product_id;
    v_qty := v_item.quantity;

    SELECT id, name, price
    INTO v_product
    FROM public.products
    WHERE id = v_prod_id;

    -- Decrement stock
    UPDATE public.products
    SET stock = stock - v_qty,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_prod_id;

    -- Record inventory movement
    INSERT INTO public.inventory_movements (
      product_id,
      change,
      reason,
      order_id,
      created_by
    )
    VALUES (
      v_prod_id,
      -v_qty,
      'order_placement',
      v_order_id,
      v_user_id
    );

    -- Insert order item snapshot
    INSERT INTO public.order_items (
      order_id,
      product_id,
      name_snapshot,
      price_snapshot,
      quantity
    )
    VALUES (
      v_order_id,
      v_prod_id,
      v_product.name,
      v_product.price,
      v_qty
    );

    -- Clean up cart items for this user
    DELETE FROM public.cart_items
    WHERE user_id = v_user_id
      AND product_id = v_prod_id;
  END LOOP;

  -- 10. Return created order UUID
  RETURN v_order_id;
END;
$$;


-- ==============================================================================
-- 5. STORAGE BUCKET: product-images
-- ==============================================================================

-- Create bucket for product images if it does not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/avif'];

-- Storage bucket RLS Policies
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
CREATE POLICY "Public can view product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
CREATE POLICY "Admins can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
CREATE POLICY "Admins can update product images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
CREATE POLICY "Admins can delete product images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND public.is_admin());

