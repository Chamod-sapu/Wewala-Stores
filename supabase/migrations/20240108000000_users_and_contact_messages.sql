-- ==============================================================================
-- 20240108000000_users_and_contact_messages.sql
-- Users Module Enhancements:
-- 1. Profiles email, is_disabled status, RBAC role management
-- 2. Contact messages status ('unread', 'read', 'resolved'), resolved_at, admin_notes
-- 3. Stored procedures for role change, account disable/enable, contact moderation
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Profiles Enhancements
-- ------------------------------------------------------------------------------

-- Add email column if missing
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Add is_disabled flag if missing
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN NOT NULL DEFAULT false;

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_disabled ON public.profiles(is_disabled);

-- Backfill profile emails from auth.users where possible
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    UPDATE public.profiles p
    SET email = u.email
    FROM auth.users u
    WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');
  END IF;
END $$;

-- Update handle_new_user() trigger to also capture email & is_disabled
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, avatar_url, role, email, is_disabled)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    NEW.email,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    phone = COALESCE(NULLIF(EXCLUDED.phone, ''), public.profiles.phone),
    updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

-- Refine profiles UPDATE policy to strictly guard role and is_disabled
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
-- 2. User Administration RPCs
-- ------------------------------------------------------------------------------

-- Admin RPC: Promote or Demote User Role
CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  p_user_id UUID,
  p_new_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_role TEXT;
  v_other_admins_count INT;
BEGIN
  -- 1. Must be admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.';
  END IF;

  -- 2. Validate role
  IF p_new_role NOT IN ('admin', 'customer') THEN
    RAISE EXCEPTION 'Invalid role: %. Permitted roles are "admin" or "customer".', p_new_role;
  END IF;

  -- 3. Prevent self-demotion
  IF p_user_id = auth.uid() AND p_new_role <> 'admin' THEN
    RAISE EXCEPTION 'Administrators cannot demote their own account.';
  END IF;

  -- 4. Check current role of target user
  SELECT role INTO v_current_role FROM public.profiles WHERE id = p_user_id;
  IF v_current_role IS NULL THEN
    RAISE EXCEPTION 'User profile not found.';
  END IF;

  -- 5. If demoting an admin, ensure at least one active admin remains
  IF v_current_role = 'admin' AND p_new_role = 'customer' THEN
    SELECT COUNT(*) INTO v_other_admins_count
    FROM public.profiles
    WHERE role = 'admin' AND id <> p_user_id AND is_disabled = false;

    IF v_other_admins_count < 1 THEN
      RAISE EXCEPTION 'Cannot demote the last remaining active administrator.';
    END IF;
  END IF;

  -- 6. Perform update
  UPDATE public.profiles
  SET 
    role = p_new_role,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'role', p_new_role
  );
END;
$$;

-- Admin RPC: Enable or Disable User Account
CREATE OR REPLACE FUNCTION public.admin_toggle_user_status(
  p_user_id UUID,
  p_is_disabled BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_role TEXT;
  v_other_admins_count INT;
BEGIN
  -- 1. Must be admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.';
  END IF;

  -- 2. Prevent self-disabling
  IF p_user_id = auth.uid() AND p_is_disabled = true THEN
    RAISE EXCEPTION 'Administrators cannot disable their own account.';
  END IF;

  -- 3. Check target role
  SELECT role INTO v_target_role FROM public.profiles WHERE id = p_user_id;
  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'User profile not found.';
  END IF;

  -- 4. If disabling an admin, ensure at least one other active admin remains
  IF v_target_role = 'admin' AND p_is_disabled = true THEN
    SELECT COUNT(*) INTO v_other_admins_count
    FROM public.profiles
    WHERE role = 'admin' AND id <> p_user_id AND is_disabled = false;

    IF v_other_admins_count < 1 THEN
      RAISE EXCEPTION 'Cannot disable the last remaining active administrator.';
    END IF;
  END IF;

  -- 5. Update user profile status
  UPDATE public.profiles
  SET 
    is_disabled = p_is_disabled,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'is_disabled', p_is_disabled
  );
END;
$$;

-- Admin RPC: Aggregate User Stats (Lifetime spend, orders count, addresses count)
CREATE OR REPLACE FUNCTION public.admin_get_user_stats(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_spent NUMERIC;
  v_total_orders INT;
  v_completed_orders INT;
  v_pending_orders INT;
  v_cancelled_orders INT;
  v_addresses_count INT;
  v_last_order_at TIMESTAMPTZ;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.';
  END IF;

  -- Calculate order metrics
  SELECT 
    COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN total ELSE 0 END), 0),
    COUNT(*),
    COUNT(*) FILTER (WHERE status IN ('delivered', 'paid', 'completed')),
    COUNT(*) FILTER (WHERE status IN ('pending', 'processing', 'shipped')),
    COUNT(*) FILTER (WHERE status = 'cancelled'),
    MAX(created_at)
  INTO 
    v_total_spent,
    v_total_orders,
    v_completed_orders,
    v_pending_orders,
    v_cancelled_orders,
    v_last_order_at
  FROM public.orders
  WHERE user_id = p_user_id;

  -- Addresses count
  SELECT COUNT(*)
  INTO v_addresses_count
  FROM public.addresses
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'user_id', p_user_id,
    'total_spent', v_total_spent,
    'total_orders', v_total_orders,
    'completed_orders', v_completed_orders,
    'pending_orders', v_pending_orders,
    'cancelled_orders', v_cancelled_orders,
    'addresses_count', v_addresses_count,
    'last_order_at', v_last_order_at
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. Contact Messages Enhancements & Moderation
-- ------------------------------------------------------------------------------

-- Add status column with check constraint
ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('unread', 'read', 'resolved')) DEFAULT 'unread';

-- Add resolved_at and admin_notes
ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Backfill status from is_read
UPDATE public.contact_messages
SET status = CASE WHEN is_read THEN 'read' ELSE 'unread' END
WHERE status IS NULL;

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON public.contact_messages(status);

-- Admin RPC: Moderate Contact Messages (Single or Bulk)
CREATE OR REPLACE FUNCTION public.admin_moderate_contact_messages(
  p_message_ids UUID[],
  p_action TEXT,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_count INT := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.';
  END IF;

  IF p_action NOT IN ('unread', 'read', 'resolved', 'delete') THEN
    RAISE EXCEPTION 'Invalid action: %. Must be "unread", "read", "resolved", or "delete".', p_action;
  END IF;

  IF p_action = 'delete' THEN
    DELETE FROM public.contact_messages
    WHERE id = ANY(p_message_ids);
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  ELSE
    UPDATE public.contact_messages
    SET
      status = p_action,
      is_read = (p_action IN ('read', 'resolved')),
      resolved_at = CASE WHEN p_action = 'resolved' THEN timezone('utc'::text, now()) ELSE NULL END,
      admin_notes = COALESCE(p_admin_notes, admin_notes)
    WHERE id = ANY(p_message_ids);
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'action', p_action,
    'affected_count', v_updated_count
  );
END;
$$;

