-- ==============================================================================
-- Migration: Admin Order Management & Restock RPCs
-- ==============================================================================

-- 1. Atomic admin_update_order_status RPC
-- Updates order status, automatically restocks inventory if cancelled/refunded,
-- and records audit logs into inventory_movements.
CREATE OR REPLACE FUNCTION public.admin_update_order_status(
  p_order_id UUID,
  p_status public.order_status,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_order RECORD;
  v_item RECORD;
  v_old_status public.order_status;
  v_restocked BOOLEAN := FALSE;
BEGIN
  v_admin_id := auth.uid();
  
  -- Check admin permission
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only administrators can update order status via this RPC.';
  END IF;

  -- Lock order row FOR UPDATE
  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  v_old_status := v_order.status;

  -- If status is already the target status, return early
  IF v_old_status = p_status THEN
    RETURN jsonb_build_object(
      'success', true,
      'order_id', p_order_id,
      'old_status', v_old_status,
      'new_status', p_status,
      'restocked', false
    );
  END IF;

  -- If transitioning to cancelled or refunded, and was not previously cancelled/refunded, restock items
  IF p_status IN ('cancelled', 'refunded') AND v_old_status NOT IN ('cancelled', 'refunded') THEN
    FOR v_item IN
      SELECT product_id, quantity
      FROM public.order_items
      WHERE order_id = p_order_id AND product_id IS NOT NULL
    LOOP
      -- Restock product stock
      UPDATE public.products
      SET stock = stock + v_item.quantity,
          updated_at = timezone('utc'::text, now())
      WHERE id = v_item.product_id;

      -- Record audit log in inventory_movements
      INSERT INTO public.inventory_movements (
        product_id,
        change,
        reason,
        order_id,
        created_by
      )
      VALUES (
        v_item.product_id,
        v_item.quantity,
        CASE 
          WHEN p_status = 'cancelled' THEN 'Order Cancelled' || COALESCE(': ' || p_reason, '')
          ELSE 'Order Refunded' || COALESCE(': ' || p_reason, '')
        END,
        p_order_id,
        v_admin_id
      );
    END LOOP;
    v_restocked := TRUE;
  END IF;

  -- Update order status and synchronize payment_status
  UPDATE public.orders
  SET 
    status = p_status,
    payment_status = CASE 
      WHEN p_status = 'paid' THEN 'paid'
      WHEN p_status = 'refunded' THEN 'refunded'
      ELSE payment_status
    END,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'old_status', v_old_status,
    'new_status', p_status,
    'restocked', v_restocked
  );
END;
$$;

-- 2. Bulk update orders RPC
CREATE OR REPLACE FUNCTION public.admin_bulk_update_orders(
  p_order_ids UUID[],
  p_status public.order_status,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_updated_count INTEGER := 0;
  v_result JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only administrators can bulk update orders.';
  END IF;

  FOREACH v_id IN ARRAY p_order_ids
  LOOP
    v_result := public.admin_update_order_status(v_id, p_status, p_reason);
    v_updated_count := v_updated_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_updated_count,
    'status', p_status
  );
END;
$$;

