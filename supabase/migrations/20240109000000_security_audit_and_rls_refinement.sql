-- ==============================================================================
-- 20240109000000_security_audit_and_rls_refinement.sql
-- Security Audit & RLS Refinement:
-- 1. Profiles: allow public read of profiles for customer reviews and orders
-- 2. Coupons: allow public read of active/valid coupons for checkout validation
-- 3. Composite Performance Indexes: accelerate frequent joins and multi-column queries
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Profiles RLS Refinement
-- ------------------------------------------------------------------------------

-- Drop old restrictive select policy
DROP POLICY IF EXISTS "Users can view own profile or admin can view all" ON public.profiles;
DROP POLICY IF EXISTS "Public profile fields viewable by all users" ON public.profiles;

-- Allow all authenticated and anon users to view public profile info (required for product review authors)
CREATE POLICY "Public profile fields viewable by all users"
  ON public.profiles FOR SELECT
  USING (true);

-- Ensure non-admins cannot change their role or is_disabled status
DROP POLICY IF EXISTS "Users can update own profile (excluding role escalation) or admin can update all" ON public.profiles;

CREATE POLICY "Users can update own profile (excluding role escalation) or admin can update all"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (
    public.is_admin() OR (
      auth.uid() = id 
      AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
      AND is_disabled = (SELECT p.is_disabled FROM public.profiles p WHERE p.id = auth.uid())
    )
  );

-- ------------------------------------------------------------------------------
-- 2. Coupons RLS Refinement
-- ------------------------------------------------------------------------------

-- Ensure active coupons can be read for validation by customers and anon
DROP POLICY IF EXISTS "Active coupons are viewable by everyone, admins can view all" ON public.coupons;

CREATE POLICY "Active coupons are viewable by everyone, admins can view all"
  ON public.coupons FOR SELECT
  USING (
    (is_active = true AND (expires_at IS NULL OR expires_at > timezone('utc'::text, now())))
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 3. Composite Performance Indexes (Prevent N+1 Slow Scans)
-- ------------------------------------------------------------------------------

-- Reviews by product and approval status (used on every product page)
CREATE INDEX IF NOT EXISTS idx_reviews_product_approved 
  ON public.reviews(product_id, is_approved) 
  WHERE is_approved = true;

-- Orders by user sorted by creation date (used in customer dashboard & user drawer)
CREATE INDEX IF NOT EXISTS idx_orders_user_created 
  ON public.orders(user_id, created_at DESC);

-- Products active status filtered by category (used in category navigation)
CREATE INDEX IF NOT EXISTS idx_products_category_active 
  ON public.products(category_id, is_active);

-- Contact messages chronological index for admin inbox
CREATE INDEX IF NOT EXISTS idx_contact_messages_created 
  ON public.contact_messages(created_at DESC);

